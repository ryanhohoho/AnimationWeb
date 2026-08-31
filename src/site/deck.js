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
//   3. Keep Mew's hole following her. It is now the same kind of object as
//      every other hole and carries the same moving weather, which the previous
//      build could not do at any price.
//   4. Run any OTHER press the page needs — the gate's three project plates,
//      which are still JS stills — off a per-frame time budget so two printers
//      can never add up to a dropped frame.
//   5. Measure the numbers the colophon prints, off the real renderer.
//
// WHAT CHANGED, AND WHAT IT COST
// ------------------------------
// There used to be a document-tall offscreen plate rendered pixel by pixel in
// JavaScript (~300 ms), one 2D canvas per hole blitting its own rectangle out
// of it, a separate canvas for Mew's halo, and a full reprint whenever the
// second ink changed. All of that is gone. In exchange, scrolling is no longer
// free: it used to cost EXACTLY zero because every hole was a static bitmap
// already sitting at its document position, and it now costs one shader pass.

import { createPress } from "./sky.js";
import { createSheetPress } from "./pressgl.js";
import { loadSkyClip, hasSkyClip } from "./skyclip.js";

const BUDGET_MS = 5;
const LOOP_S = 16;        // seconds for one pass of the clip. The source is
                          // ten, so this is about 0.6x speed: weather, not
                          // time-lapse.
const FPS = 20;           // the cloud loop's own rate. A printed animation is
                          // shot on twos or fours; 60 fps of halftone boils.

export function createDeck({ scope, haloPx = 200 }) {
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
  let haloMode = "print";
  let halo = null;          // { x, y, r } in viewport pixels
  let sky = 0;              // the WEATHER's offset — held for good
  let skyRamp = 0;          // the TIME's offset — eased back after a crossing
  let cross = null;         // { dir, t, cx, cy, r0, rFull, rEnd, mess } in DOC space
  let crossCovered = false;
  let xCrossLast = null;    // the last computed opening, for the checks
  let clip = null;
  let clipSettled = !hasSkyClip;

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
    pw = document.documentElement.clientWidth;
    ph = Math.max(document.documentElement.scrollHeight, window.innerHeight);
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
      const cy = cyDoc - sy;

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
        inkA, inkB, alt, eat, holes, halo, f, sky, skyRamp, cross: xCross, overlay: true
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
      inkA, inkB, alt, eat, holes, halo, f, sky, skyRamp,
      cross: xCross
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

  // ── Mew's hole ───────────────────────────────────────────────────────────
  // Called from the render loop with her VIEWPORT position. One uniform, and
  // the redraw it triggers is the same one the cloud loop was going to do
  // anyway most frames. No layout is read and nothing reflows.
  function setHalo(x, y) {
    if (haloMode === "none") { halo = null; return; }
    const r = haloPx / 2;
    const nx = Math.round(x), ny = Math.round(y);
    if (halo && halo.x === nx && halo.y === ny) return;
    halo = { x: nx, y: ny, r };
    dirty = true;
    kick();
  }

  function setHaloMode(mode) {
    if (mode === haloMode) return;
    haloMode = mode;
    if (mode === "none") halo = null;
    dirty = true;
    kick();
  }

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
    setHalo,
    setHaloMode,
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
        aps, holes, jobs, pw, ph, raf, halo, clipSettled,
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
