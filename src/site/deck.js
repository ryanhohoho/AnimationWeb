// deck.js — THE MASK
//
// The sheet is paper with holes cut in it, and through every hole the same
// continuous sky (site/pressgl.js). What this file does:
//
//   1. Find the holes -- every [data-ap] die-cut, every project icon
//      ([data-icon-ap]) and every sky control ([data-sky]) -- and give each one
//      a canvas of its OWN, inside the element.
//   2. Print each hole's piece of the sky into that canvas: one small pass of
//      the press, limited to the hole's own size, copied across in the same
//      task. Only holes on screen, only when something changed -- a tick of the
//      cloud loop, an ink, a hover, a new page. NOT on a scroll: what a hole
//      shows depends on where it is on the PAGE, not on where the page is.
//   3. Run the crossing -- the paper eaten away from a hole, the one thing that
//      covers the whole window -- on the full-screen canvas, and nothing else.
//   4. Run any OTHER press the page needs off a per-frame time budget, so two
//      printers can never add up to a dropped frame.
//   5. Measure the numbers the colophon prints, off the real renderer.
//
// WHY EVERY HOLE DRAWS ITSELF (2026-09-27, by instruction)
// ---------------------------------------------------------
// Every hole used to be cut in ONE full-screen canvas behind the page, which
// was redrawn with the scroll offset on the next animation frame. The page
// scrolls on the compositor, at once; the canvas followed a frame or more
// later -- so on a fast scroll or a browser zoom every hole visibly slid off
// the element it was cut in, and a project icon, which was three things from
// two systems (a CSS punch in the picture, the sky in the canvas under it, a
// white plate on top), never quite agreed with itself. The owner asked why
// the sky could not simply sit IN the frame, on top, and it can: a canvas that
// is part of the element moves with the element by construction, at every
// scroll speed and every zoom, and there is nothing left to keep in step.
// It is also cheaper: a scroll costs nothing again, as it did when every hole
// was a static bitmap, and only the pixels inside holes are ever printed.
//
// THE PLATE IS THE OWNER'S WINDOW. Positions are handed to the press in design
// pixels (styles/designPx.js) measured from the left of the page sheet, and it
// prints at the design pixel's zoom -- so a hole shows the same weather on a
// 27" monitor as on the laptop, only larger, and the dots grow with the page.

import { createPress } from "./sky.js";
import { reducedMotion } from "../utils/motion.js";
import { createSheetPress } from "./pressgl.js";
import { loadSkyClip, hasSkyClip } from "./skyclip.js";

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
// A HELD FRAME FOR A READER WHO ASKED FOR LESS MOTION. The weather is slow and
// low-contrast, but it is continuous background movement behind every word on
// the page, which is exactly the thing. Held, the sheet is a PRINT -- which is
// what it is claiming to be anyway, so nothing about it reads as switched off.
// Frame 0 rather than a chosen one: every frame of this clip is a sky, and
// picking a favourite would be a constant nobody could defend.
const STILL_F = 0;

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

  // ── THE HOLES ──────────────────────────────────────────────────────────
  // { el, cv, ctx, kind, fixed, box, seen }. kind is "ap" (a die-cut), "icon"
  // (a project's glyph, sky only while it is open) or "sky" (a control that is
  // a disc of print, held at a fixed hour). box is the canvas's rectangle in
  // real document px, or in the viewport for a fixed one. Keyed on the
  // ELEMENT everywhere a caller names one: records are rebuilt on every bind.
  let holes = [];
  let alt = null;           // { el, inkA, inkB } -- the gate: one die-cut in a project's pair
  let mask = null;          // { rec, amt, inkA, inkB } -- the one open icon
  let eat = null;           // { inkA, inkB } -- what a CROSSING prints in; null = the home pair
  let inkA = null;          // the plate's first ink;  null = the home sheet's
  let inkB = null;          // the plate's second ink; null = the home sheet's
  let pw = 0, ph = 0;       // the document, real px
  let k = 1;                // real px per design px
  let stageX = 0, stageW = 0;   // the page sheet's left edge and width, real px
  // the page turn slides and fades #doc; the holes are IN #doc now, so they
  // travel with it for free. Kept for the API and the checks.
  let docDX = 0, docFade = 1;
  let sky = 0;              // the WEATHER's offset -- held for good, design px
  let skyRamp = 0;          // the TIME's offset -- eased back after a crossing
  let cross = null;         // { dir, t, cx, cy, r0, rFull, rEnd, mess } in DOC space
  let crossCovered = false;
  let xCrossLast = null;    // the last computed opening, for the checks
  // THE HYPER BEAM'S BURN (engine/fx/beam.js hands it over every frame while
  // the beam is out). Real document px as it arrives; converted to the plate's
  // design px at draw time, like every hole. While it is set the full-screen
  // sheet is shown -- it is what paints the paper -- exactly as for a crossing.
  let burn = null;
  let burnAt = 0;           // when it was last handed over (performance.now)
  let burnDirty = false;
  let clip = null;
  let clipSettled = !hasSkyClip;

  let raf = 0;
  let dirty = true;
  let lastScroll = -1;
  let lastF = -1;
  let t0 = 0;
  let onScreen = true;
  let current = null;
  let io = null;            // which plate is being read (the hash on the summary)
  let seeing = null;        // which holes are on screen

  // other presses queued by the page (the gate). Same clock, same budget.
  const jobs = [];

  // ── geometry ─────────────────────────────────────────────────────────────
  // Measured once per layout, never per frame and never on a scroll.
  function measure() {
    // ── MEASURE THE PAGE WHERE IT LIVES, NOT WHERE IT IS STANDING ────────
    // A page turn slides #doc sideways with an inline transform, and commit()
    // -- and therefore bind() -- runs while it is still on the element.
    // getBoundingClientRect includes a transform, so every hole was once
    // measured 30 px left of where it lives, for the life of the page. The
    // transform comes off for the length of the measurement.
    const docEl = document.getElementById("doc");
    const heldTf = docEl?.style.transform || "";
    if (heldTf) docEl.style.transform = "";
    try {
      measureNow();
    } finally {
      if (heldTf) docEl.style.transform = heldTf;
    }
  }

  function measureNow() {
    const sy = window.scrollY;
    // the design pixel is the root's font-size over 16 (site.css), and the
    // plate starts where the page sheet does -- the paper beyond a sheet on a
    // wide screen is not part of the composition
    k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
    const pr = document.querySelector("#doc .plate")?.getBoundingClientRect();
    pw = document.documentElement.clientWidth;
    ph = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    stageX = pr ? pr.left : 0;
    stageW = pr && pr.width > 0 ? pr.width : pw;
    for (const q of holes) {
      // THE CANVAS'S rectangle, not the element's: a lens has a hairline ring
      // outside its canvas, and the print must fill the canvas exactly.
      const r = q.cv.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { q.box = null; continue; }
      q.box = { x: r.left, y: r.top + (q.fixed ? 0 : sy), w: r.width, h: r.height };
      const cw = Math.max(1, Math.round(r.width)), ch = Math.max(1, Math.round(r.height));
      if (q.cv.width !== cw || q.cv.height !== ch) { q.cv.width = cw; q.cv.height = ch; }
    }
    dirty = true;
  }

  // ── the sheet ────────────────────────────────────────────────────────────
  function ensure() {
    if (sheet || !canvas || !clip) return sheet;
    sheet = createSheetPress(canvas, clip.sheet, clip.frames);
    if (!sheet) return null;
    canvas.classList.add("on");
    return sheet;
  }

  // ONE HOLE, PRINTED INTO ITS OWN CANVAS. The press draws the hole's piece of
  // the plate into the top-left corner of the full-screen canvas's buffer,
  // scissored to that corner, and it is copied straight across. The copy must
  // be in the SAME task as the draw: preserveDrawingBuffer is false, so the
  // buffer is gone once the compositor has had it. A hole bigger than the
  // window is printed in window-sized tiles.
  //
  // TWO ORIGINS, AND THEY ARE NOT THE SAME ONE. gl.scissor counts from the
  // BOTTOM, drawImage from the TOP -- the corner is (0, h - sh) to the one and
  // (0, 0) to the other. Measured once already: the flipped value for both
  // reads a band the compositor has cleared, a fully transparent square.
  function printHole(q, docY, o) {
    const { w, h } = o;
    const cw = q.cv.width, ch = q.cv.height;
    const hole = [{ x: (q.box.x - stageX) / k, y: docY / k, w: q.box.w / k, h: q.box.h / k }];
    for (let ty = 0; ty < ch; ty += h) {
      for (let tx = 0; tx < cw; tx += w) {
        const sw = Math.min(w, cw - tx), sh = Math.min(h, ch - ty);
        sheet.draw({
          w, h, zoom: k, origin: { x: q.box.x - stageX + tx, y: docY + ty },
          plate: o.plate, bandPx: o.band,
          inkA: o.pair ? null : o.inkA, inkB: o.pair ? null : o.inkB,
          alt: o.pair ? { index: 0, inkA: o.pair.inkA, inkB: o.pair.inkB } : null,
          eat: null, holes: hole, f: o.f, sky, skyRamp: o.ramp,
          cross: null, mask: null, roundHole: -1, holeDX: 0, holeFade: 1,
          scissor: { x: 0, y: h - sh, w: sw, h: sh }
        });
        q.ctx.drawImage(canvas, 0, 0, sw, sh, tx, ty, sw, sh);
      }
    }
  }

  // holesToo: false repaints ONLY the sheet. The burn changes every frame for a
  // second and a half and the holes do not; they still reprint on their own
  // reasons (the cloud tick, a scroll, a change), which the caller passes in.
  function paint(now, scrollOverride, holesToo = true) {
    if (!ensure()) return false;
    const w = window.innerWidth, h = window.innerHeight;
    // THE WEATHER CLOCK IS ABSOLUTE. Wall-clock modulo the loop length cannot
    // restart, so nothing that resets -- a page commit, the tab coming back --
    // can make the sky jump.
    const f = reducedMotion ? STILL_F
      : (((now / 1000) / LOOP_S) * clip.frames) % clip.frames;
    const sy = scrollOverride ?? window.scrollY;
    const plate = { w: stageW / k, h: ph / k };
    const band = h / k;

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

    // ── EVERY HOLE ON SCREEN PRINTS ITSELF ───────────────────────────────
    for (const q of holesToo ? holes : []) {
      if (!q.box || !q.seen) continue;
      // an icon is white at rest: it has sky only while it is open
      const open = mask && mask.rec === q;
      if (q.kind === "icon" && !open) continue;
      const docY = q.fixed ? q.box.y + sy : q.box.y;
      // A SKY CONTROL PRINTS AT A FIXED HOUR, 2,640 px down the plate, wherever
      // it stands (SKY_BTN_DEPTH says why); every other hole at the sheet's own.
      const ramp = q.kind === "sky" ? SKY_BTN_DEPTH - docY / k : skyRamp;
      // A control belongs to the site, so it is the home pair; an open icon is
      // a window onto its project, so it is that project's; the gate likewise.
      const pair = q.kind === "sky" ? null
        : open && mask.inkA ? { inkA: mask.inkA, inkB: mask.inkB }
        : alt && alt.el === q.el ? alt : null;
      printHole(q, docY, { w, h, f, plate, band, ramp, pair,
        inkA: q.kind === "sky" ? null : inkA, inkB: q.kind === "sky" ? null : inkB });
    }

    // ── THE CROSSING, AND ONLY THE CROSSING, IS THE WHOLE WINDOW ─────────
    // The eating must be able to cover the TYPE, so it is printed twice: once
    // as an overlay (print where the paper is eaten, transparent elsewhere)
    // blitted above the words, and once as the sheet under them. No holes in
    // either: the holes print themselves, above the sheet, and the same weather
    // at the same place means the opening grows out of one without a seam.
    // At rest the sheet would be bare paper, which the page already is, so it
    // is hidden rather than drawn -- and its buffer, which the hole passes
    // above have just used as scratch, is never shown.
    const origin = { x: -stageX, y: sy };
    // the burn, in the plate's design px (pressgl.js: doc = (vp + origin)/zoom,
    // so a real document point is (x - stageX, y) / k)
    const burnU = burn && burn.open > 0 ? {
      x: (burn.x - stageX) / k, y: burn.y / k, dx: burn.dx, dy: burn.dy,
      reach: burn.reach / k, width: burn.width / k, open: burn.open,
      seed: burn.seed, env: burn.env, widthMul: burn.widthMul, muzzleMul: burn.muzzleMul
    } : null;
    if (xCross || burnU) {
      if (eatCtx && xCross) {
        if (eatEl.width !== w || eatEl.height !== h) { eatEl.width = w; eatEl.height = h; }
        sheet.draw({
          w, h, scrollY: sy, origin, zoom: k, plate, bandPx: band,
          inkA, inkB, alt: null, eat, holes: [], f, sky, skyRamp, cross: xCross,
          mask: null, overlay: true, holeDX: 0, holeFade: 1, roundHole: -1
        });
        eatCtx.clearRect(0, 0, w, h);
        eatCtx.drawImage(canvas, 0, 0);
        eatEl.classList.add("on");
      }
      sheet.draw({
        w, h, scrollY: sy, origin, zoom: k, plate, bandPx: band,
        inkA, inkB, alt: null, eat, holes: [], f, sky, skyRamp,
        cross: xCross, mask: null, holeDX: 0, holeFade: 1, roundHole: -1,
        burn: burnU
      });
      canvas.style.visibility = "";
      // a burn with no crossing leaves the eating layer as it was: off
      if (!xCross && eatCtx && eatEl.classList.contains("on")) {
        eatEl.classList.remove("on");
        eatCtx.clearRect(0, 0, eatEl.width, eatEl.height);
      }
    } else {
      canvas.style.visibility = "hidden";
      if (eatCtx && eatEl.classList.contains("on")) {
        eatEl.classList.remove("on");
        eatCtx.clearRect(0, 0, eatEl.width, eatEl.height);
      }
    }
    lastScroll = sy;
    lastF = f;
    return true;
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
    // A SCROLL MOVES NOTHING THAT IS PRINTED -- except a hole that is fixed to
    // the window (its place on the plate changes as the page passes under it)
    // and the crossing, which is mounted to the document.
    const moved = window.scrollY !== lastScroll
      && (!!cross || !!burn || holes.some((q) => q.fixed && q.seen && q.box));
    // a burn nobody has updated for a while belongs to a beam that stopped
    // being drawn (she fell asleep mid-shot, the tab went away): let it go
    if (burn && performance.now() - burnAt > 400) { burn = null; dirty = true; }
    // ...and with the weather held there is no tick, so the deck only ever
    // repaints for a real change
    const ticked = !reducedMotion &&
      Math.abs(f - lastF) >= (clip ? clip.frames / (LOOP_S * FPS) : 1);

    if (onScreen && (dirty || moved || ticked || burnDirty)) {
      if (paint(now, undefined, dirty || moved || ticked)) { dirty = false; burnDirty = false; }
    }
    if (onScreen || jobs.length || burn) raf = requestAnimationFrame(tick);
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
      for (const q of holes) if (q.kind === "ap" && q.box) open += q.box.w * q.box.h;
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
    seeing?.disconnect();
    // before measure(): a stale record would hold a hole open on the old page
    mask = null;
    // ...and a burn belongs to the page it was fired at
    burn = null;
    alt = null;
    holes = [];
    const take = (el, kind, fixed) => {
      // the canvas is the element's own, first child, under its ticks and its
      // ring (both drawn above it); a remount reuses the one already there
      let cv = el.querySelector(":scope > canvas.hole-cv");
      if (!cv) {
        cv = document.createElement("canvas");
        cv.className = "hole-cv";
        cv.setAttribute("aria-hidden", "true");
        el.prepend(cv);
      }
      holes.push({ el, cv, ctx: cv.getContext("2d"), kind, fixed, box: null, seen: true });
    };
    for (const el of document.querySelectorAll("[data-ap]")) {
      el.classList.add("on");
      take(el, "ap", el.hasAttribute("data-fixed"));
    }
    for (const el of document.querySelectorAll("[data-icon-ap]")) take(el, "icon", el.hasAttribute("data-fixed"));
    for (const el of document.querySelectorAll("[data-sky]")) take(el, "sky", true);

    // ONLY WHAT IS ON SCREEN PRINTS. Every hole starts as seen, so nothing
    // waits a frame for the observer's first answer; the answer then turns
    // off the ones that are not, and turns a hole back on as it comes in, a
    // little early, so it is printed before it is visible.
    seeing = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const q = holes.find((x) => x.el === e.target);
        if (q) q.seen = e.isIntersecting;
      }
      dirty = true; kick();
    }, { rootMargin: "160px 0px" });
    holes.forEach((q) => seeing.observe(q.el));

    const plates = [...document.querySelectorAll(".plate")];
    if (plates.length) {
      // One observer, no scroll handler for this.
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

  // ── nothing runs while the page is not on screen ─────────────────────────
  const onVis = () => {
    onScreen = !document.hidden;
    if (onScreen) { t0 = 0; dirty = true; kick(); }
  };
  document.addEventListener("visibilitychange", onVis, { signal: scope?.signal });

  // A scroll may need a redraw (a fixed hole, a crossing): the loop decides.
  window.addEventListener("scroll", kick, { passive: true, signal: scope?.signal });

  // A resize or a zoom moves nothing out of place any more -- every canvas is
  // CSS-sized inside its element -- so this only re-prints them at their new
  // size, and can afford to wait for the window to stop moving.
  let debounce = 0;
  window.addEventListener("resize", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { measure(); reportNumbers(); kick(); }, 120);
  }, { passive: true, signal: scope?.signal });

  scope?.add(() => {
    io?.disconnect();
    seeing?.disconnect();
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(debounce);
    sheet?.dispose();
  });

  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); reportNumbers(); kick(); });
  bind();

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const api = {
    get current() { return current; },
    /** the design pixel, real px per design px, for anyone handing the deck a
        length that was measured on the page (the router's scroll carry) */
    get scale() { return k; },
    /**
     * The page turn's offset and opacity. The holes are inside #doc now and
     * travel with it on their own; this is kept so the router's contract does
     * not change, and for the checks.
     */
    setDocShift(dx, fade) {
      docDX = dx || 0;
      docFade = fade === undefined || fade === null ? 1 : clamp01(fade);
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
    /** Wind the plate on, in DESIGN px (divide a page measurement by scale). */
    setSky(v, ramp) {
      sky = v;
      if (ramp !== undefined) skyRamp = ramp;
      dirty = true; kick();
    },
    setSkyRamp(v) { skyRamp = v; dirty = true; kick(); },
    get sky() { return sky; },
    get skyRamp() { return skyRamp; },
    /** true once the opening genuinely covers the window, ragged edge and all */
    get crossCovered() { return crossCovered; },
    /** the weather, for any other press on the page that wants the same sky */
    get clip() { return clip; },
    /** THE CROSSING'S OWN PAIR. Pass null for the home sheet's. */
    setEatInk(a, b) {
      eat = (a || b) ? { inkA: a || null, inkB: b || null } : null;
      dirty = true; kick();
    },
    /**
     * THE ONE OPEN ICON. A project icon is white at rest; pointing at its card
     * opens it, and its own canvas -- masked to the glyph in CSS, laid over the
     * picture -- prints that project's sky. `--open` on the element is how far
     * (site.css fades the canvas by it). Only one at a time, so only one
     * project's second ink is ever on the sheet. Pass null, or 0, to close.
     *
     * @returns true if the sky can really be shown (the press exists); false
     *          means the caller should leave its white plate up.
     */
    setMaskHole(el, amt = 1, hInkA = null, hInkB = null) {
      if (!el) {
        if (mask) { mask.rec.el.style.removeProperty("--open"); mask = null; dirty = true; kick(); }
        return false;
      }
      const rec = holes.find((q) => q.el === el && q.kind === "icon");
      if (!rec) return false;
      const a = clamp01(amt);
      if (mask && mask.rec !== rec) mask.rec.el.style.removeProperty("--open");
      mask = a > 0 ? { rec, amt: a, inkA: hInkA, inkB: hInkB } : null;
      if (a > 0) rec.el.style.setProperty("--open", String(a));
      else rec.el.style.removeProperty("--open");
      dirty = true; kick();
      return !!sheet;
    },
    /** an icon's box, for anything that needs to aim at one without reading
        layout of its own */
    iconBox(el) {
      const rec = holes.find((q) => q.el === el && q.kind === "icon");
      return rec?.box ? { ...rec.box, fixed: rec.fixed } : null;
    },
    /**
     * THE HYPER BEAM'S BURN: where the paper has been eaten away under the
     * beam (engine/fx/beam.js, every frame while it is out). Real document px:
     * {x, y, dx, dy, reach, width, open, seed, env, widthMul, muzzleMul}.
     * null ends it, and the next paint hides the sheet again.
     */
    setBeamBurn(b) {
      if (!b) {
        if (burn) { burn = null; dirty = true; kick(); }
        return;
      }
      burn = b;
      burnAt = performance.now();
      burnDirty = true;
      kick();
    },
    /** The gate: one die-cut printed in a project's own pair. */
    setAltInk(el, a, b) {
      const rec = holes.find((q) => q.el === el);
      alt = rec && a ? { el, inkA: a, inkB: b } : null;
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
        holes, mask, jobs, pw, ph, k, stageX, raf, docDX, docFade, clipSettled,
        gpu: !!sheet, webgl2: sheet?.webgl2, cross: xCrossLast, crossCovered, burn,
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
