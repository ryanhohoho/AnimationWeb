// deck.js — THE MASK
//
// The sheet is one fixed canvas behind the page (site/pressgl.js). It paints
// the paper, the print, and every hole cut in the paper, in a single pass —
// so this file no longer prints anything itself. What it does:
//
//   1. Measure where the holes are, in DOCUMENT coordinates, and hand them to
//      the sheet. A hole is a rectangle of the document, so it stays put on the
//      page while the page scrolls under the window: registration by
//      construction, with nothing maintained per frame.
//   2. Redraw only when something has actually changed — a scroll, a tick of
//      the cloud loop, Mew moving, an ink change, a resize, a new page.
//   3. Slide and fade the die-cuts with the page during a turn, so an aperture
//      leaves with the type it is cut around.
//   4. Run any OTHER press the page needs off a per-frame time budget, so two
//      printers can never add up to a dropped frame.
//   5. Measure the numbers the colophon prints, off the real renderer.
//
// WHAT CHANGED, AND WHAT IT COST
// ------------------------------
// There used to be a document-tall offscreen plate rendered pixel by pixel in
// JavaScript (~300 ms), one 2D canvas per hole blitting its own rectangle out
// of it, a separate canvas per moving hole, and a full reprint whenever the
// second ink changed. All of that is gone. In exchange, scrolling is no longer
// free: it used to cost EXACTLY zero because every hole was a static bitmap
// already sitting at its document position, and it now costs one shader pass.

import { createPress } from "./sky.js";
import { createSheetPress } from "./pressgl.js";
import { loadSkyClip, hasSkyClip } from "./skyclip.js";
import { loadIconAtlas, hasIconAtlas, cellUV } from "./iconatlas.js";

const BUDGET_MS = 5;
// ── WHAT TIME IT IS ON A SKY BUTTON ─────────────────────────────────────────
// A die-cut shows the print at ITS OWN document position, and that rule is what
// makes a hole a hole rather than a spotlight. A sky BUTTON is not a hole -- it
// is a disc of print painted over the page -- so the rule does not bind, and
// following it was actively wrong: pinned to the top of a sheet the control sat
// where the plate is at its very brightest, and a white arrow on it was
// invisible. Measured at scroll 0: mean 228,224,224 against bone paper at
// 239,237,230.
//
// So it prints at a fixed hour instead: 2,640 px down pressgl's REF_H of 4,000,
// which is v = 0.66, about 22:40, and measures mean 82,135,174. The WEATHER is
// still the weather where the button actually is, so it drifts and lives; only
// the time of day is held. It is also the right meaning -- the control is a
// window onto where you are GOING, and where you are going is the work.
const SKY_BTN_DEPTH = 2640;
const LOOP_S = 16;        // seconds for one pass of the clip. The source is
                          // ten, so this is about 0.6x speed: weather, not
                          // time-lapse.
const FPS = 20;           // the cloud loop's own rate. A printed animation is
                          // shot on twos or fours; 60 fps of halftone boils.

export function createDeck({ scope }) {
  const canvas = document.getElementById("sheet");
  const eatEl = document.getElementById("eat");
  const eatCtx = eatEl ? eatEl.getContext("2d") : null;
  let sheet = null;

  let aps = [];             // { el, box }  box is in document pixels
  let holes = [];           // the same boxes, flattened for the shader
  let alt = null;           // { index, inkA, inkB } — the gate's own pair
  let eat = null;           // { inkA, inkB } — what a CROSSING prints in, which
                            // is not the gate's business and must not be
                            // clobbered by it. null = the home sheet's pair.
  let inkA = null;          // the plate's FIRST ink;  null = the home sheet's
  let inkB = null;          // the plate's second ink; null = the home sheet's
  let pw = 0, ph = 0;       // the document
  let roundIndex = -1;      // the one aperture drawn as a circle, or -1
  // ── THE PAGE TURN MOVES THE HOLES TOO ────────────────────────────────────
  // A die-cut is a rectangle of the DOCUMENT held in a uniform, which is what
  // keeps it registered while the page scrolls under it -- and is exactly why it
  // used to sit perfectly still and perfectly opaque while a fade slid the type
  // thirty pixels out from under it and dissolved it. The router owns both
  // numbers during a turn and hands them here.
  let docDX = 0;            // px, the same offset #doc is carrying
  let docFade = 1;          // 0..1, the same opacity #doc is carrying
  let sky = 0;              // the WEATHER's offset — held for good
  let skyRamp = 0;          // the TIME's offset — eased back after a crossing
  let cross = null;         // { dir, t, cx, cy, r0, rFull, rEnd, mess } in DOC space
  let crossCovered = false;
  let xCrossLast = null;    // the last computed opening, for the checks
  let clip = null;
  let clipSettled = !hasSkyClip;
  // ── THE ONE MASKED HOLE ────────────────────────────────────────────────
  // Icons are measured into their own list rather than into aps/holes. If they
  // went in with everything else, all three project icons would be measured as
  // die-cuts and open as SQUARE sky windows at rest, which is the opposite of
  // the design: an icon is solid white until you point at it. They also must
  // not shift the flattened index setAltInk holds.
  let icons = [];           // { el, cell, fixed, box }
  let mask = null;          // { rec, amt } — at most one, see uMaskBox
  let atlas = null;         // the decoded glyph atlas
  let atlasUp = false;      // ...and whether the press has it yet
  // ── A CONTROL THAT IS MADE OF SKY, AND SITS ABOVE THE PAGE ───────────────
  // Every other hole is cut in #sheet, at z1, under the type. That is right for
  // a die-cut in a composition and impossible for a CONTROL: the back arrow on
  // a project sheet has to stay legible over whatever the page happens to put
  // beneath it, and no z-index can lift a hole out of a layer that is under the
  // words by construction.
  //
  // So its pixels are taken with an extra pass of the same press, limited by the
  // scissor to that one button's rectangle -- about three thousand fragments
  // against a million, which is nothing -- and blitted into a small 2D canvas
  // that lives up in the chrome. The circle is CSS: the canvas is square and
  // border-radius does the die.
  let skyBtns = [];         // { el, cv, ctx, box }  box in VIEWPORT px

  let raf = 0;
  let dirty = true;
  let lastScroll = -1;
  let lastF = -1;
  let t0 = 0;
  let onScreen = true;
  let current = null;
  let io = null;

  // other presses queued by the page (the gate). Same clock, same budget.
  const jobs = [];

  // ── geometry ─────────────────────────────────────────────────────────────
  // Measured once per layout, never per frame. A hole's document rectangle does
  // not change when you scroll — that is the entire reason this is cheap.
  function measure() {
    const sy = window.scrollY;
    holes = [];
    for (const a of aps) {
      const r = a.el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w < 2 || h < 2) { a.box = null; continue; }
      a.box = { x: Math.round(r.left), y: Math.round(r.top + sy), w, h };
      a.index = holes.length;
      holes.push(a.box);
    }
    if (sheet && holes.length > sheet.maxHoles) {
      console.warn(`deck: ${holes.length} holes, shader carries ${sheet.maxHoles}`);
    }
    // ── ICONS, AND THE ONES THAT DO NOT SCROLL ───────────────────────────
    // A fixed aperture — the back arrow on a project sheet — has a document
    // rectangle that changes on every scroll tick and a VIEWPORT rectangle that
    // never changes at all. So the viewport box is what gets stored, and paint()
    // adds the scroll it already has in hand. One addition per frame in place of
    // a getBoundingClientRect on the scroll path, which is the rule this whole
    // file is built on.
    // WHICH APERTURE IS THE ROUND ONE. Marked in the markup rather than
    // guessed from its proportions, because a square die-cut and a circle are
    // different intentions and only one of them should read as a lens.
    roundIndex = -1;
    for (const a of aps) {
      if (a.box && a.el.hasAttribute && a.el.hasAttribute("data-round")) {
        roundIndex = a.index;
        break;
      }
    }

    // the sky buttons: fixed, so like the fixed icons they are measured in the
    // viewport once and mounted to the document every frame
    skyBtns = [];
    for (const el of document.querySelectorAll("[data-sky]")) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cv = el.querySelector("canvas");
      if (!cv) continue;
      skyBtns.push({
        el, cv, ctx: cv.getContext("2d"),
        box: { x: Math.round(r.left), y: Math.round(r.top),
               w: Math.round(r.width), h: Math.round(r.height) }
      });
    }

    icons = [];
    for (const el of document.querySelectorAll("[data-icon-ap]")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const fixed = el.hasAttribute("data-fixed");
      icons.push({
        el, fixed,
        cell: el.getAttribute("data-icon-ap"),
        box: {
          x: Math.round(r.left),
          y: Math.round(r.top + (fixed ? 0 : sy)),
          w: Math.round(r.width), h: Math.round(r.height)
        }
      });
    }
    // ── THE MASK SURVIVES A REMEASURE, BY ELEMENT ────────────────────────
    // measure() builds a fresh record for every icon, so a mask holding the OLD
    // record matched nothing and was dropped -- silently, on every resize, font
    // load and remeasure. The back arrow on a project sheet vanished the moment
    // the window was touched, and a hover held through a resize lost its sky.
    // Re-finding by ELEMENT keeps the hole across a remeasure and still drops it
    // when the element itself has gone, which is the case this was written for.
    if (mask) {
      const again = icons.find((q) => q.el === mask.rec.el);
      mask = again ? { rec: again, amt: mask.amt } : null;
      if (!mask) alt = null;
    }

    pw = document.documentElement.clientWidth;
    ph = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    dirty = true;
  }

  // ── the sheet ────────────────────────────────────────────────────────────
  function ensure() {
    if (sheet || !canvas || !clip) return sheet;
    sheet = createSheetPress(canvas, clip.sheet, clip.frames);
    if (!sheet) return null;
    // the atlas may have landed before the press existed, and the press is not
    // built until the sky clip arrives — so whichever wins the race, the upload
    // happens here or in the loader, never in neither
    if (atlas && !atlasUp) atlasUp = !!sheet.setMaskTex(atlas);
    canvas.classList.add("on");
    return sheet;
  }

  function paint(now, scrollOverride) {
    if (!ensure()) return false;
    const w = window.innerWidth, h = window.innerHeight;
    // THE WEATHER CLOCK IS ABSOLUTE. It used to be measured from a `t0` set on
    // the first paint, which meant anything that reset it — a page commit, the
    // tab coming back — restarted the cloud loop from frame zero, and the sky
    // visibly jumped at exactly the moment a crossing was trying to hide that
    // nothing had happened. Wall-clock modulo the loop length cannot restart.
    const f = (((now / 1000) / LOOP_S) * clip.frames) % clip.frames;
    const sy = scrollOverride ?? window.scrollY;

    // ── THE CROSSING ─────────────────────────────────────────────────────
    // The paper is EATEN OUTWARD from the hole that was clicked until there is
    // nothing left but print, and then it closes back IN from the edges onto
    // the new sheet's own hole. One opening, moving and resizing; the sheet
    // underneath is swapped at the moment the opening is bigger than the
    // window, when there is nothing to see change.
    //
    // THE DOTS DO NOT MOVE AND DO NOT GROW. An earlier version ramped the
    // ruling up to 44 px through the middle, and it read as the whole picture
    // inflating — which is wrong twice over: the screen is a property of the
    // PAPER, so it must never move, and a growing dot is the one thing that
    // makes a halftone look like a zoomed bitmap. Only the COVERAGE spreads:
    // the same lattice, in the same place, revealed over more of the window.
    let xCross = null;
    crossCovered = false;
    if (cross) {
      // ── MOUNTED TO THE DOCUMENT, NOT THE WINDOW ────────────────────────
      // The opening is centred on the hole it came out of, in DOCUMENT
      // coordinates, so it stays on that hole when the page scrolls under it
      // instead of sliding around with the viewport. Same reason every other
      // hole is a document rectangle.
      const cx = cross.cx, cyDoc = cross.cy;
      // A FIXED TARGET DOES NOT SCROLL AWAY FROM ITSELF. The centre is normally
      // a document position, which is what keeps the opening on the hole you
      // clicked while the page moves under it. The back arrow on a project sheet
      // is the opposite case: it is pinned to the WINDOW, so subtracting the
      // scroll would slide the closing paper off the very thing it is closing
      // into, the moment the reader touched the wheel mid-return.
      const cy = cross.fixed ? cyDoc : cyDoc - sy;

      // WHAT IT WOULD TAKE TO COVER THE WINDOW, RIGHT NOW. Recomputed every
      // frame from the CURRENT scroll, so if the reader scrolls mid-crossing
      // the target moves and the opening simply keeps chasing it.
      const need = Math.max(
        Math.hypot(cx, cy), Math.hypot(w - cx, cy),
        Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));

      const bell = Math.sin(Math.PI * Math.min(1, cross.t));
      const feather = 24 + (cross.mess || 150) * Math.max(0.25, bell);
      // the ragged edge can bite back this far, so full coverage has to clear it
      const slack = feather * 1.6;

      let r;
      if (cross.out) {
        // ── EATING INWARD, WHICH IS THE RETURN ──────────────────────────
        // The number the shader gets is still one radius on one boundary. The
        // difference is that the paper is on the INSIDE of it now, so this is
        // the island of page still standing, shrinking from whatever covers
        // the window. Same easing as the way out, so the two halves of a round
        // trip are the same move mirrored.
        //
        // AND IT SHRINKS PAST ZERO, by the slack the ragged edge can bite. The
        // edge is chewed by the weather, which pushes the boundary inward as
        // well as outward; at radius zero that bite reaches through the middle
        // and opens a hole onto the page underneath, right at the moment the
        // screen is supposed to be solid. Measured: half a percent of the
        // window still showing at r = 0.01, and the whole of it at r = 0.
        const e = Math.pow(Math.min(1, cross.t), 1.45);
        const r0 = need + slack;
        r = r0 - (r0 + slack) * e;
      } else if (cross.dir > 0) {
        // OUT. It aims at whatever covering the window takes at this instant,
        // and if it has not got there by the time it was meant to, it stops
        // easing and starts accelerating — so a reader who scrolls away during
        // the crossing is caught up with rather than left behind.
        const e = Math.pow(Math.min(1, cross.t), 1.45);
        r = cross.r0 + (need + slack - cross.r0) * e;
        if (cross.t > 1) r += (need + slack) * 0.9 * (cross.t - 1) * (cross.t - 1);
      } else {
        const e = 1 - Math.pow(1 - Math.min(1, cross.t), 1.45);
        r = cross.rFull + (cross.rEnd - cross.rFull) * e;
      }
      // covered means the print has the whole window either way — the opening
      // past every corner, or the island shrunk far enough past nothing that
      // even the deepest inward bite of the ragged edge cannot reach through it
      crossCovered = cross.out ? r <= -feather * 1.15 : r >= need + slack;
      xCross = { x: cx, y: cy, r, feather, out: !!cross.out };

      // THE RETREAT CLOSES INTO TWO PLACES AT ONCE. The new sheet arrives fully
      // covered, and with a single target the paper had to sweep the whole
      // window to reach it — which reads as a wipe rather than as paper closing
      // back. A second opening over the band at the foot of the plate gives the
      // bottom of the screen somewhere of its own to retreat into.
      if (cross.dir < 0 && cross.second) {
        const s2 = cross.second;
        const cy2 = s2.cy - sy;
        const need2 = Math.max(
          Math.hypot(s2.cx, cy2), Math.hypot(w - s2.cx, cy2),
          Math.hypot(s2.cx, h - cy2), Math.hypot(w - s2.cx, h - cy2));
        const e2 = 1 - Math.pow(1 - Math.min(1, cross.t), 1.45);
        xCross.second = {
          x: s2.cx, y: cy2, feather,
          r: (need2 + slack) + (s2.rEnd - (need2 + slack)) * e2
        };
      }
      xCrossLast = xCross;
    }

    // ── THE MASKED HOLE ──────────────────────────────────────────────────
    // Document coordinates for the shader. A fixed icon was measured in the
    // viewport, so it is mounted to the document here, every frame, with the
    // scroll this function was already given.
    let xMask = null;
    if (mask && atlas) {
      const uv = cellUV(mask.rec.cell);
      const b = mask.rec.box;
      if (uv) {
        xMask = {
          x: b.x, y: mask.rec.fixed ? b.y + sy : b.y, w: b.w, h: b.h,
          u0: uv.u0, v0: uv.v0, du: uv.du, dv: uv.dv, amt: mask.amt
        };
      }
    }

    // ── THE SKY BUTTONS, FIRST ───────────────────────────────────────────
    // Before anything else, because this writes into the same drawing buffer the
    // sheet is displayed from: a scissored pass left as the buffer's final state
    // would put a wrongly-coloured patch on the page. The full pass at the foot
    // of this function overwrites it, which is why it has to be last.
    //
    // The blit must happen in the SAME task as its draw. preserveDrawingBuffer is
    // false, so the buffer is gone once the compositor has had it -- there can be
    // no await and no frame boundary between these two lines.
    for (const b of skyBtns) {
      if (b.cv.width !== b.box.w || b.cv.height !== b.box.h) {
        b.cv.width = b.box.w; b.cv.height = b.box.h;
      }
      const docBox = { x: b.box.x, y: b.box.y + sy, w: b.box.w, h: b.box.h };
      // uSkyRamp is an offset ADDED to the document position before the night
      // is read off it, so this puts the button at a chosen hour wherever on the
      // page it happens to be standing.
      const btnRamp = SKY_BTN_DEPTH - docBox.y;
      sheet.draw({
        w, h, scrollY: sy, plate: { w: pw, h: ph }, bandPx: h,
        // THE HOME SHEET'S PAIR, not this project's. It is a window onto where
        // you are GOING, and a control that belongs to the site rather than to
        // whichever sheet it is standing on should not change colour with it.
        inkA: null, inkB: null, alt: null, eat: null,
        holes: [docBox], f, sky, skyRamp: btnRamp,
        cross: null, mask: null, roundHole: -1, holeDX: 0, holeFade: 1,
        scissor: { x: b.box.x, y: h - (b.box.y + b.box.h), w: b.box.w, h: b.box.h }
      });
      // TWO ORIGINS, AND THEY ARE NOT THE SAME ONE. gl.scissor is in GL's
      // coordinates, which count up from the BOTTOM, so its y is
      // h - (top + height). drawImage reads the canvas as an IMAGE, which
      // counts down from the top, so its y is just the top. Using the flipped
      // value for both reads a band the compositor has already cleared --
      // measured: a fully transparent 56x56.
      b.ctx.clearRect(0, 0, b.box.w, b.box.h);
      b.ctx.drawImage(canvas, b.box.x, b.box.y, b.box.w, b.box.h,
                      0, 0, b.box.w, b.box.h);
    }

    // ── THE OVERLAY ──────────────────────────────────────────────────────
    // The eating must be able to cover the TYPE, and the type sits above the
    // sheet. So while a crossing runs, the shader is run twice: once in overlay
    // mode (print where the paper is eaten, transparent everywhere else) which
    // is blitted to a canvas ABOVE the words, and then once normally for the
    // sheet itself. Two draw calls and one blit, for four seconds, and only
    // then — the rest of the time this costs nothing.
    if (eatCtx && xCross) {
      if (eatEl.width !== w || eatEl.height !== h) { eatEl.width = w; eatEl.height = h; }
      sheet.draw({
        w, h, scrollY: sy, plate: { w: pw, h: ph }, bandPx: h,
        inkA, inkB, alt, eat, holes, f, sky, skyRamp, cross: xCross,
        mask: xMask, overlay: true,
        holeDX: docDX, holeFade: docFade, roundHole: roundIndex
      });
      eatCtx.clearRect(0, 0, w, h);
      eatCtx.drawImage(canvas, 0, 0);
      eatEl.classList.add("on");
    } else if (eatCtx && eatEl.classList.contains("on")) {
      eatEl.classList.remove("on");
      eatCtx.clearRect(0, 0, eatEl.width, eatEl.height);
    }

    const ok = sheet.draw({
      w, h, scrollY: sy,
      plate: { w: pw, h: ph }, bandPx: h,
      inkA, inkB, alt, eat, holes, f, sky, skyRamp,
      cross: xCross, mask: xMask,
      holeDX: docDX, holeFade: docFade, roundHole: roundIndex
    });
    lastScroll = sy;
    lastF = f;
    return ok;
  }

  function tick(now) {
    raf = 0;

    // the gate's stills get whatever is left of the budget
    while (jobs.length && jobs[0].done) jobs.shift();
    const j = jobs[0];
    if (j) {
      const deadline = performance.now() + BUDGET_MS;
      while (!j.press.done && performance.now() < deadline) j.press.step(1.5);
      if (j.press.done) {
        j.done = true;
        const finished = j.press;
        j.press = null;              // the deck lets go; the callback may keep it
        j.onDone?.(finished);
      }
    }

    // The cloud loop advances on its own clock, so a tick of it is a reason to
    // redraw even when nothing else moved.
    const f = t0 ? ((((now - t0) / 1000) / LOOP_S) * clip?.frames || 0) : 0;
    const moved = window.scrollY !== lastScroll;
    const ticked = Math.abs(f - lastF) >= (clip ? clip.frames / (LOOP_S * FPS) : 1);

    if (onScreen && (dirty || moved || ticked)) {
      if (paint(now)) dirty = false;
    }
    if (onScreen || jobs.length) raf = requestAnimationFrame(tick);
  }

  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  /** Queue a press the page owns. Runs on the deck's clock and budget. */
  function enqueue(p, onDone) {
    jobs.push({ press: p, onDone, done: false });
    kick();
    return p;
  }
  function clearJobs() { jobs.length = 0; }

  // ── the page's own numbers ───────────────────────────────────────────────
  // Anything the copy asserts about the print is measured off the renderer,
  // never typed in. Coverage comes from sky.js, which is the same separation
  // and the same screen the shader runs — kept here as the reference
  // implementation now that it no longer draws anything.
  function reportNumbers() {
    const slot = document.querySelector("[data-open]");
    if (slot && pw && ph) {
      let open = 0;
      for (const b of holes) open += b.w * b.h;
      slot.textContent = `${(100 - (open / (pw * ph)) * 100).toFixed(1)}%`;
    }
    for (const el of document.querySelectorAll("[data-at]")) {
      const host = el.closest(".plate");
      if (!host) continue;
      const y = Math.round(host.getBoundingClientRect().top + window.scrollY);
      el.textContent = `${y.toLocaleString("en-US")} / ${ph.toLocaleString("en-US")}`;
    }
    const ink = document.querySelector("[data-ink]");
    if (!ink || !pw || !ph) return;
    // A proxy plate at the document's own proportions. Coverage is a mean over
    // the whole sheet, so it does not need the sheet's resolution — 1/8 scale
    // is ~10 ms instead of ~300 and lands on the same number.
    const s = 8;
    const p = createPress(Math.round(pw / s), Math.round(ph / s), window.innerHeight / s, {
      ...(clip ? { dens: clip.sampler(0, ph / window.innerHeight) } : {}),
      ...(inkB ? { inkB, identity: 1 } : {})
    });
    enqueue(p, (done) => {
      const c = done.coverage();
      ink.textContent = `${(c.a * 100).toFixed(0)}% and ${(c.b * 100).toFixed(0)}%`;
    });
  }

  // ── binding to whatever page is currently in the DOM ─────────────────────
  function bind() {
    io?.disconnect();
    // before measure(), not after: a stale record would otherwise hold a hole
    // open at the previous page's coordinates for one frame
    mask = null;
    aps = [...document.querySelectorAll("[data-ap]")].map((el) => ({ el, box: null }));
    aps.forEach((a) => a.el.classList.add("on"));

    const plates = [...document.querySelectorAll(".plate")];
    if (plates.length) {
      // One observer, no scroll handler for this. Nothing here runs on scroll
      // except the redraw itself.
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || !e.target.id) continue;
          current = e.target.id;
          if (location.hash !== `#${current}` && location.pathname === "/") {
            history.replaceState(history.state, "", `#${current}`);
          }
        }
      }, { rootMargin: "-45% 0px -55% 0px", threshold: 0 });
      plates.forEach((p) => io.observe(p));
    }
    measure();
    reportNumbers();
    kick();
  }

  // ── the weather ──────────────────────────────────────────────────────────
  // One 120 KB image. Until it lands there is nothing to print, so the sheet
  // stays blank paper — which is a correct page, not a broken one.
  if (hasSkyClip) {
    Promise.race([
      loadSkyClip().catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 3000))
    ]).then((c) => { clip = c; clipSettled = true; dirty = true; measure(); reportNumbers(); kick(); });
  }

  // ── the glyphs ───────────────────────────────────────────────────────────
  // Same shape as the weather: one small image, decoded once, and the page is
  // correct without it — no atlas simply means the icons stay white, which is
  // their rest state anyway.
  if (hasIconAtlas) {
    Promise.race([
      loadIconAtlas().catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 3000))
    ]).then((a) => {
      // A GLYPH HOLE THAT NEVER ARRIVES IS AN INVISIBLE CONTROL. The back arrow
      // on a project sheet IS its shader hole and has no picture of its own, so
      // if the atlas does not land there is a clickable rectangle with nothing
      // in it. Saying so on the root element lets the stylesheet put a plain
      // arrow there instead: a degraded page rather than a broken one.
      if (!a) { document.documentElement.classList.add("no-glyphs"); return; }
      atlas = a;
      if (sheet && !atlasUp) atlasUp = !!sheet.setMaskTex(atlas);
      dirty = true; kick();
    });
  } else {
    document.documentElement.classList.add("no-glyphs");
  }

  // ── nothing runs while the page is not on screen ─────────────────────────
  const onVis = () => {
    onScreen = !document.hidden;
    if (onScreen) { t0 = 0; dirty = true; kick(); }
  };
  document.addEventListener("visibilitychange", onVis, { signal: scope?.signal });

  // A scroll is a redraw, so it needs a wake-up — but the redraw itself happens
  // in the rAF loop, and this handler reads nothing and writes nothing.
  window.addEventListener("scroll", kick, { passive: true, signal: scope?.signal });

  let debounce = 0;
  window.addEventListener("resize", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { measure(); reportNumbers(); kick(); }, 200);
  }, { passive: true, signal: scope?.signal });

  scope?.add(() => {
    io?.disconnect();
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(debounce);
    sheet?.dispose();
  });

  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); reportNumbers(); kick(); });
  bind();

  const api = {
    get current() { return current; },
    /**
     * THE APERTURES TRAVEL WITH THE PAGE. Called per frame by the fade, with
     * exactly the offset and opacity #doc is carrying, so a die-cut leaves and
     * arrives with the type it is cut around instead of hanging in the air
     * while the words slide out from under it.
     *
     * It does NOT touch the crossing: an opening has to be able to cover a
     * window that is halfway through fading, and it is not part of the page.
     */
    setDocShift(dx, fade) {
      const d = dx || 0;
      const f = fade === undefined || fade === null ? 1 : (fade < 0 ? 0 : fade > 1 ? 1 : fade);
      if (d === docDX && f === docFade) return;
      docDX = d; docFade = f;
      dirty = true; kick();
    },
    bind,
    enqueue,
    clearJobs,
    remeasure: () => { measure(); reportNumbers(); kick(); },
    /**
     * Drive the crossing. `t` runs 0 to 1 straight through the page swap;
     * `from` and `to` are the viewport centres the opening grows out of and
     * closes back onto, and `r0`/`r1` are the hole radii at each end.
     * Pass null to end it.
     */
    setCrossing(c) { cross = c; dirty = true; kick(); },
    /** Wind the plate on. The reader lands at the TOP of the new sheet and the
        sky is offset to compensate, so the weather does not teleport even
        though the viewport does. */
    setSky(v, ramp) {
      sky = v;
      if (ramp !== undefined) skyRamp = ramp;
      dirty = true; kick();
    },
    setSkyRamp(v) { skyRamp = v; dirty = true; kick(); },
    get sky() { return sky; },
    get skyRamp() { return skyRamp; },
    /** true once the opening genuinely covers the window, ragged edge and all.
        The page swap waits on THIS rather than on a clock, so it cannot happen
        early because the reader scrolled. */
    get crossCovered() { return crossCovered; },
    /** the weather, for any other press on the page that wants the same sky */
    get clip() { return clip; },
    /**
     * The second ink is now a uniform rather than a reprint, so moving between
     * project sheets costs one frame instead of 300 ms.
     */
    /** BOTH inks. A project sheet owns its whole sky now, not just the second
        plate: closet is greyscale, the CLI is navy and black, iClicker is blue
        and teal, and none of them is a recolour of the home sheet's pair. Two
        uniforms, no reprint. */
    /** The gate: one hole on the home sheet pulled in a project's own pair.
        Costs two uniforms and an index — no second press, no canvas, and it
        carries the same live weather as every other hole because it IS one. */
    /** THE CROSSING'S OWN PAIR, and it is its own for a reason. It used to ride
        the two uniforms the gate uses, on the grounds that they are never both
        wanted at once — which is true going in, where the destination has no
        gate, and false coming back, where the home sheet has one. The instant
        the page committed, the gate took those uniforms for its preview and the
        opening changed colour halfway through its own retreat.
        Pass null for the home sheet's pair. */
    setEatInk(a, b) {
      eat = (a || b) ? { inkA: a || null, inkB: b || null } : null;
      dirty = true; kick();
    },
    /**
     * THE ONE MASKED HOLE, and it mirrors setAltInk deliberately: look the
     * element up by identity, keep hold of it, and let paint() do the
     * arithmetic. The difference is that this keeps the RECORD rather than a
     * flattened index, because a masked hole is not in uHoles at all — it has
     * its own rectangle uniform, so it can never take a die-cut's slot and can
     * never end the hole loop early at zero alpha.
     *
     * There is exactly one because the shader has exactly one, which is the
     * same reason uAltHole is a single int: you may only ever see one project's
     * second ink at a time. Pass null, or an amount of 0, to close it.
     *
     * IT CARRIES THE INK PAIR AS WELL, and that is not a convenience -- it is
     * the identity rule enforced in one place. A masked hole is a window onto a
     * PROJECT, so it prints in that project's own sky; and because there can
     * only ever be one of them, only one project's second ink can be on the
     * sheet at a time. That is what lets three differently-coloured windows live
     * on a page whose whole discipline is one or two inks. The pair rides the
     * alternate uniforms the gate used to use, with the hole index at -1,
     * because no RECTANGLE wants them.
     *
     * @returns true if the hole was really taken. false means the atlas has not
     *          landed, and the caller should leave its own fallback showing.
     */
    setMaskHole(el, amt = 1, hInkA = null, hInkB = null) {
      if (!el) {
        if (mask || alt) { mask = null; alt = null; dirty = true; kick(); }
        return false;
      }
      const rec = icons.find((q) => q.el === el);
      if (!rec) return false;
      const a = amt < 0 ? 0 : amt > 1 ? 1 : amt;
      const nextAlt = (a > 0 && hInkA) ? { index: -1, inkA: hInkA, inkB: hInkB } : null;
      const same = mask && mask.rec === rec && mask.amt === a
        && !!alt === !!nextAlt
        && (!alt || !nextAlt || (alt.inkA === nextAlt.inkA && alt.inkB === nextAlt.inkB));
      if (same) return !!atlas;
      mask = a > 0 ? { rec, amt: a } : null;
      alt = nextAlt;
      dirty = true; kick();
      return !!atlas;
    },
    /** the icon boxes, for anything that needs to aim at one without reading
        layout of its own — the crossing does exactly this */
    iconBox(el) {
      const rec = icons.find((q) => q.el === el);
      return rec ? { ...rec.box, fixed: rec.fixed } : null;
    },
    setAltInk(el, a, b) {
      const rec = aps.find((q) => q.el === el);
      alt = rec && a ? { index: rec.index, inkA: a, inkB: b } : null;
      dirty = true; kick();
    },
    setInk(a, b) {
      const va = a || null, vb = b || null;
      if (va === inkA && vb === inkB) return;
      inkA = va; inkB = vb;
      dirty = true;
      kick();
    },
    // devtools + the automated checks
    get debug() {
      return {
        aps, holes, icons, mask, skyBtns, atlas: !!atlas, atlasUp, jobs, pw, ph, raf,
        roundIndex, docDX, docFade, clipSettled,
        gpu: !!sheet, webgl2: sheet?.webgl2, cross: xCrossLast, crossCovered,
        /** Draw one frame by hand. rAF is throttled to nothing in a hidden
            preview pane and the pane refuses to scroll at all, so the checks
            need both a clock and a scroll position they can set. */
        paint: (t = performance.now(), scrollY) => { t0 = t0 || t; return paint(t, scrollY); }
      };
    }
  };
  window.__DECK__ = api;
  return api;
}
