// motionViewer.js — ONE SCENE AT A TIME, OPENED OUT OF ITS CELL
//
// The contact sheet shows every scene at once and small; this shows one of them
// as it was made to be seen, the height of the window (or the whole of a phone),
// with its sound, frame by frame if you want it.
//
// NOTHING ON IT BUT THE SCENE, ITS NAME AND ONE BAR, by instruction: no number,
// no next and previous, no readout -- and, on a computer, one drawn X in the
// top-left corner (2026-09-26), because a mouse has no swipe to close with.
// Everything else is done the way a hand already knows how to do it:
//
//   · THE SHARED-ELEMENT TRANSITION (FLIP, Paul Lewis; the View Transitions
//     API's "expanding card" is the same move). The frame grows out of the cell
//     that was pressed and shrinks back into the cell of whatever scene is
//     showing when it closes. Both are 9:19.5, so the scale is uniform.
//   · THE PHOTOS APP'S GESTURES, "exactly": on a touch screen a sideways swipe
//     pages to the neighbour; a drag that starts up or down PICKS THE SCENE UP --
//     it follows the finger in any direction and shrinks as it leaves the
//     middle, the page shows through behind it, and letting go flies it home
//     into its cell (far enough, or fast enough) or springs it back. A tap plays
//     or pauses.
//   · WITH A MOUSE, a chevron just beside each side of the frame is the way to
//     its neighbours, a click on the frame plays or pauses, and a click
//     anywhere else on the dark around it -- or the X, or Esc -- puts it back.
//     (The chevrons' targets used to be the whole of each side of the window,
//     which left nothing to click away on; a lightbox closes on its backdrop,
//     and that is the gesture people reach for.) The arrow keys page; , and .
//     step one frame.
//   · IT PAGES WITHIN WHAT IT WAS OPENED FROM, as Photos pages within an
//     album: a tile on the wall through the wall, the flower through its cuts
//     in order, and the film alone (motionPage.js hands it the lists).
//   · THE BAR, laid in the scene along its foot, steps FRAMES: drag it, or scroll -- a trackpad's two fingers or a
//     wheel -- anywhere over the viewer. The clips carry a keyframe every half
//     second so a seek never stalls (tools/bake_motion.mjs). On the film it
//     carries a tick where each of its stretches starts (motion.js, CUT). The
//     speaker at its end is the one other control: sound always starts off.
//
// The ground around the frame is the scene itself, spilled past its edges and
// dithered (site/motionAmbient.js), under a dark veil.
//
// It lives on <body>, not in #doc: #doc is a stacking context under the grain
// (z40) and under the chrome, and a viewer under a sheet of grain is a picture
// of a video rather than a video.

import { CLIPS } from "./motionassets.js";
import { CUT, FILM, WORKS } from "./motion.js";
import { reducedMotion } from "../utils/motion.js";

const FPS = 30;
const NAMES = new Map([[FILM.id, FILM.name], ...WORKS.map((w) => [w.id, w.name])]);
const EASE = "cubic-bezier(.2,.8,.2,1)";
const OPEN_MS = reducedMotion ? 0 : 380;
const PAGE_MS = reducedMotion ? 0 : 300;
const TURN_MS = reducedMotion ? 0 : 280;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const SPEAKER = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path class="on" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;
const CROSS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/></svg>`;
const CHEV = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? "M15 4.5 7.5 12 15 19.5" : "M9 4.5 16.5 12 9 19.5"}"/></svg>`;

export function mountViewer(scope, root, { lists, ambient, cover = () => {}, closed = () => {} }) {
  // THE GROUND COMES WITH THE SCENE. While a scene is open the page's ground
  // canvas is moved INTO the viewer (moving a canvas keeps its WebGL context),
  // so the frame stands in its own dithered light with nothing of the page
  // behind it; dragging the scene away fades it with the veil, and closing puts
  // it back under the page, still showing the same picture.
  const ground = root.querySelector(".mg-ground");
  const groundHome = ground?.parentNode;
  // ...EXCEPT ON A PHONE, where the frame covers the whole screen and the
  // ground is never seen while a scene is open. There it stays where it is,
  // under the page, and stops drawing (it holds its last picture): a
  // full-screen WebGL layer re-drawn from the playing video 24 times a second
  // behind an opaque frame was pure cost, and the part of it that showed --
  // behind a scene being swiped away -- is the page itself, which is what
  // Photos shows behind a photo too.
  const groundMoved = () => !!ground && ground.parentNode === el;
  const groundIn = () => {
    if (full) { ambient?.pause?.(); return; }
    if (ground && ground.parentNode !== el) el.prepend(ground);
  };
  const groundOut = () => {
    ambient?.resume?.();
    if (ground && groundHome && ground.parentNode !== groundHome) { groundHome.prepend(ground); ground.style.opacity = ""; }
  };
  const groundFade = (a) => { if (groundMoved()) ground.style.opacity = a >= 1 ? "" : String(a); };
  // the list the viewer was opened from, and the scene on show in it
  let list = lists.works, ids = list.ids;
  const listFor = (id, name) => (name && lists[name]?.ids.includes(id) ? lists[name]
    : Object.values(lists).find((l) => l?.ids.includes(id)) || null);
  let i = 0;                 // the scene on show
  let open = false;
  let full = false;          // a phone: the frame is the whole screen
  let box = null;            // the frame's rectangle, laid out for this window
  let playing = true;
  let muted = true;
  let busy = false;          // an animation owns the frame
  let turning = false;       // ...and it is a turn (a chevron or a key)

  // ── THE MARKUP ─────────────────────────────────────────────────────────
  const el = document.createElement("div");
  el.className = "mgv";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  // the router watches touch drags for its own sideways swipe; this one is ours
  el.setAttribute("data-noswipe", "");
  el.innerHTML = `
    <div class="mgv-bg"></div>
    <div class="mgv-track">
      ${[-1, 0, 1].map((k) => `<div class="mgv-slot" data-k="${k}"><img class="mgv-poster" alt="" decoding="async" /></div>`).join("")}
    </div>
    <button class="mgv-side" data-step="-1" aria-label="Previous scene">${CHEV(-1)}</button>
    <button class="mgv-side" data-step="1" aria-label="Next scene">${CHEV(1)}</button>
    <button class="mgv-close" aria-label="Close">${CROSS}</button>
    <p class="mgv-ui mgv-title"></p>
    <div class="mgv-ui mgv-bottom">
      <div class="mgv-bar">
        <div class="mgv-scrub" role="slider" tabindex="0" aria-label="Frame" aria-valuemin="0">
          <div class="mgv-rail"><div class="mgv-ticks"></div><span class="mgv-fill"></span><span class="mgv-head"></span></div>
        </div>
        <button class="mgv-snd is-muted" aria-label="Sound" aria-pressed="false">${SPEAKER}</button>
      </div>
    </div>`;
  document.body.append(el);

  const $ = (s) => el.querySelector(s);
  const bg = $(".mgv-bg"), track = $(".mgv-track");
  // the three frames, left to right. The ARRAY turns, not the pictures in it:
  // after a page the neighbour that slid in IS the middle frame, and only the
  // one that fell off the far side is given a new poster, out of sight. This
  // used to leave the frames where they were and re-point all three posters
  // at once, and a poster that has not decoded yet shows the picture it had --
  // so every page ended by flashing the scenes it had just left, in order,
  // from the side it had come from.
  let slots = [...el.querySelectorAll(".mgv-slot")];
  const slot = (k) => slots[k + 1];
  const scrub = $(".mgv-scrub"), fill = $(".mgv-fill"), head = $(".mgv-head"), ticks = $(".mgv-ticks");
  const title = $(".mgv-title"), snd = $(".mgv-snd");
  const uis = [...el.querySelectorAll(".mgv-ui, .mgv-side, .mgv-close")];

  // A FRESH <video> FOR EVERY SCENE, never one element whose src is swapped.
  // Swapping the source of a playing element is the path on which iOS Safari
  // kept decoding -- the clock ran, the bar moved -- while the layer on screen
  // stayed on the old picture until the loop came round. A new element gets a
  // new layer; the old one is emptied (src removed, load()) so its decoder is
  // released at once rather than whenever it is collected.
  let video = null;
  function makeVideo(src) {
    const v = document.createElement("video");
    v.className = "mgv-video";
    v.playsInline = true; v.setAttribute("playsinline", "");
    v.loop = true; v.muted = muted; v.preload = "auto";
    v.addEventListener("loadeddata", () => { if (v !== video) return; v.classList.add("ready"); if (open && !full) ambient?.setSource(v); });
    v.addEventListener("seeked", () => { if (v === video) onSeeked(); });
    v.src = src;
    return v;
  }
  function dropVideo(v) {
    if (!v) return;
    v.pause(); v.removeAttribute("src"); v.load(); v.remove();
  }

  // ── THE FRAME, LAID OUT ────────────────────────────────────────────────
  // Always 9:19.5, the stage's own shape. On a phone it COVERS the screen (a
  // modern iPhone is that shape already, give or take its toolbars); elsewhere
  // it is as tall as the window allows above the name and the bar.
  const ASPECT = 9 / 19.5;
  function layout() {
    const W = window.innerWidth, H = window.innerHeight;
    full = W <= 560 || (matchMedia("(pointer:coarse)").matches && W <= 860);
    el.classList.toggle("is-full", full);
    let w, h, x, y;
    if (full) {
      h = Math.max(H, W / ASPECT); w = h * ASPECT;
      if (w < W) { w = W; h = w / ASPECT; }
      x = (W - w) / 2; y = (H - h) / 2;
    } else {
      // the bar is in the scene now, so under the frame there is only its name
      const top = 24, bottom = 52;
      h = Math.max(200, H - top - bottom); w = h * ASPECT;
      x = (W - w) / 2; y = top;
    }
    box = { x, y, w, h, gap: full ? 12 : 36 };
    place();
    el.style.setProperty("--fx", `${x}px`); el.style.setProperty("--fw", `${w}px`);
    el.style.setProperty("--fy", `${y}px`); el.style.setProperty("--fh", `${h}px`);
  }

  function place() {
    const { x, y, w, h, gap } = box;
    slots.forEach((s, n) => {
      s.dataset.k = String(n - 1);
      Object.assign(s.style, { left: `${x + (n - 1) * (w + gap)}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    });
  }
  function rotate(d) {
    slots = d > 0 ? [slots[1], slots[2], slots[0]] : [slots[2], slots[0], slots[1]];
    place();
  }

  // ── WHAT IS ON SHOW ───────────────────────────────────────────────────
  const clipOf = (k) => CLIPS[ids[k]];
  function fillSlots() {
    for (const k of [-1, 0, 1]) {
      const c = clipOf(i + k);
      const img = slot(k).querySelector("img");
      slot(k).style.visibility = c ? "" : "hidden";
      if (c && img.getAttribute("src") !== c.poster) img.src = c.poster;
    }
    el.querySelectorAll(".mgv-side").forEach((b) => {
      const k = i + Number(b.dataset.step);
      b.disabled = k < 0 || k >= ids.length;
    });
  }

  function describe() {
    const id = ids[i], c = clipOf(i), name = NAMES.get(id) ?? id;
    title.textContent = name;
    el.setAttribute("aria-label", name);
    // the film's own cut: a tick where each of its stretches starts
    ticks.innerHTML = id === FILM.id ? CUT.map((x) => `<i style="left:${(100 * x[2] / c.dur).toFixed(3)}%"></i>`).join("") : "";
    scrub.setAttribute("aria-valuemax", String(Math.round(c.dur * FPS) - 1));
  }

  function load(autoplay) {
    const c = clipOf(i);
    const cur = slot(0);
    if (!video || video.getAttribute("src") !== c.video || video.parentNode !== cur) {
      dropVideo(video);
      want = null; asked = null; seeking = false;
      video = makeVideo(c.video);
      cur.append(video);
      if (vfc && open) { cancelTick(); tick(); }
    }
    video.muted = muted;
    playing = autoplay && !reducedMotion;
    if (playing) video.play().catch(() => { playing = false; stateClass(); });
    else video.pause();
    stateClass();
    // the ground takes the poster at once and the picture as soon as it plays
    // (not on a phone: there the frame covers the ground, see groundIn)
    if (!full) ambient?.setSource(cur.querySelector("img"));
  }

  // ── THE BAR ───────────────────────────────────────────────────────────
  // ONE SEEK IN FLIGHT, and the next one only if the reader has asked for a
  // DIFFERENT time since. This used to compare the video's currentTime with
  // the time asked for, and Safari lands a seek on the nearest time it can
  // present, which is not the number it was given -- so the comparison never
  // came true, and every scrub ended in a video seeking to the same moment
  // forever: frozen, the bar stuck, the decoder never resting (the page
  // running warm). `asked` is what was last handed to the element; `want` is
  // what the reader wants now. They are compared to each other, never to the
  // element, so it always terminates.
  let want = null, asked = null, seeking = false;
  function seek(t) {
    const c = clipOf(i);
    t = clamp(t, 0, c.dur - 1 / FPS);
    want = t;
    if (!seeking) { seeking = true; asked = t; video.currentTime = t; }
    readout(t);
  }
  function onSeeked() {
    video.classList.add("ready");
    seeking = false;
    if (want !== null && want !== asked) { seeking = true; asked = want; video.currentTime = want; }
    else want = null;
  }
  const frameAt = (t) => Math.min(Math.round(clipOf(i).dur * FPS) - 1, Math.floor(t * FPS + 1e-3));
  // transforms only, so a playing bar is compositor work and no layout: the
  // head rides a full-width carrier (a percentage translate is of the
  // element's own width, and the carrier's width is the rail's). The slider's
  // value is told to assistive tech a few times a second, not every frame.
  let told = 0;
  function readout(t = video?.currentTime ?? 0, force = false) {
    const c = clipOf(i);
    if (!c) return;
    const p = clamp(t / c.dur, 0, 1);
    fill.style.transform = `scaleX(${p})`;
    head.style.transform = `translateX(${(p * 100).toFixed(3)}%)`;
    const now = performance.now();
    if (force || !playing || now - told > 250) { told = now; scrub.setAttribute("aria-valuenow", String(frameAt(t))); }
  }
  function stateClass() { el.classList.toggle("is-paused", !playing); }
  function setPlaying(on) {
    playing = on;
    if (video) { if (on) video.play().catch(() => {}); else video.pause(); }
    stateClass();
  }
  function stepFrames(n) {
    if (playing) setPlaying(false);
    const base = want ?? video.currentTime;
    seek((frameAt(base) + n + .5) / FPS);
  }

  // the bar follows the picture, frame by frame, only while open. A frame
  // callback belongs to ONE element, so a new scene's video re-arms it.
  let rid = 0, ridOn = null;
  const vfc = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
  function cancelTick() {
    if (rid) { if (ridOn) ridOn.cancelVideoFrameCallback(rid); else cancelAnimationFrame(rid); }
    rid = 0; ridOn = null;
  }
  function tick() {
    rid = 0; ridOn = null;
    if (!open || !video) return;
    if (want === null) readout();
    if (vfc) { ridOn = video; rid = video.requestVideoFrameCallback(tick); }
    else rid = requestAnimationFrame(tick);
  }

  // SCRUBBING HOLDS THE PICTURE, AND LETTING GO GIVES IT BACK: a scene that was
  // playing when the bar was taken plays on from wherever it was left, the way
  // Photos does. (Stepping frames with , and . is a deliberate pause, and stays.)
  scrub.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    scrub.setPointerCapture(e.pointerId);
    const resume = playing || wheelResume;
    clearTimeout(wheelT); wheelResume = false;
    setPlaying(false);
    el.classList.add("is-scrubbing");
    const r = scrub.getBoundingClientRect();
    const at = (x) => seek(clamp((x - r.left) / r.width, 0, 1) * clipOf(i).dur);
    at(e.clientX);
    const move = (ev) => at(ev.clientX);
    const up = () => {
      scrub.removeEventListener("pointermove", move); scrub.removeEventListener("pointerup", up); scrub.removeEventListener("pointercancel", up);
      el.classList.remove("is-scrubbing");
      readout(want ?? video.currentTime, true);
      if (resume) setPlaying(true);
    };
    scrub.addEventListener("pointermove", move);
    scrub.addEventListener("pointerup", up);
    scrub.addEventListener("pointercancel", up);
  });
  scrub.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); stepFrames(e.key === "ArrowLeft" ? -1 : 1); }
  });

  // THE WHEEL SCRUBS, for a laptop's trackpad and a mouse's wheel alike. It is
  // taken off the page entirely while the viewer is up -- the page behind it
  // must not scroll -- and every 6 px of travel is one frame.
  // A scene that was playing plays on once the wheel has been still for a
  // moment, as it does after a drag on the bar.
  let wheelAcc = 0, wheelT = 0, wheelResume = false;
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!open || busy) return;
    const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    wheelAcc += d;
    const n = Math.trunc(wheelAcc / 6);
    if (!n) return;
    if (playing) wheelResume = true;
    wheelAcc -= n * 6;
    stepFrames(n);
    clearTimeout(wheelT);
    wheelT = setTimeout(() => { if (wheelResume && open) setPlaying(true); wheelResume = false; }, 450);
  }, { passive: false });
  el.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // ── OPENING AND CLOSING ──────────────────────────────────────────────
  const rectOf = (id) => list.cellOf(id)?.getBoundingClientRect() || null;
  const over = (r) => `translate(${r.left - box.x}px, ${r.top - box.y}px) scale(${r.width / box.w})`;
  const setUI = (a) => uis.forEach((u) => { u.style.opacity = a === 1 ? "" : String(a); });

  let returnFocus = null;
  function openAt(id, { from = null, at = 0, instant = false } = {}) {
    const l = listFor(id, from);
    if (!l || busy) return;
    list = l; ids = l.ids;
    i = ids.indexOf(id); open = true; busy = true;
    returnFocus = document.activeElement;
    // EVERYTHING UNDER IT STOPS FIRST, before the frame grows: the tiles'
    // video, their drawing, the flower's clip. It used to stop only once the
    // opening had finished, so the opening itself ran over a page still
    // decoding and painting forty tiles.
    cover(true);
    el.hidden = false;
    layout();
    groundIn();
    fillSlots(); describe(); load(true);
    if (at) seek(at);
    history.replaceState(history.state, "", `${location.pathname}#${id}`);
    const r = rectOf(id);
    const cur = slot(0);
    track.style.transform = "";
    const done = () => {
      busy = false; cur.style.transform = ""; bg.style.opacity = ""; setUI(1);
      el.focus?.({ preventScroll: true });
    };
    el.tabIndex = -1;
    if (instant || !r || !OPEN_MS) { done(); } else {
      setUI(0);
      cur.animate([{ transform: over(r) }, { transform: "none" }], { duration: OPEN_MS, easing: EASE }).finished.then(done, done);
      bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE });
      if (groundMoved()) ground.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE });
    }
    cancelTick(); tick();
  }

  function close(fromTransform = "none", fromBg = 1) {
    if (!open || turning) return;
    busy = true;
    const id = ids[i];
    // keep the cell it lands in on the screen, the way Photos keeps the grid
    // under a photo you paged through (the flower's frame is shown at that cut)
    list.reveal(id);
    const cell = list.cellOf(id);
    const r = rectOf(id);
    const cur = slot(0);
    setUI(0);
    const end = () => {
      open = false; busy = false;
      // the decoder is let go as soon as the scene is back in its tile; the
      // page under it starts again only now, once nothing is moving over it
      cancelTick(); dropVideo(video); video = null;
      cur.style.transform = ""; bg.style.opacity = "";
      el.hidden = true; setUI(1);
      groundOut();
      cover(false);
      muted = true; soundState();
      closed();
      history.replaceState(history.state, "", location.pathname);
      (cell?.closest("a") || returnFocus)?.focus?.({ preventScroll: true });
    };
    if (!r || !OPEN_MS) { end(); return; }
    cur.animate([{ transform: fromTransform }, { transform: over(r) }], { duration: OPEN_MS, easing: EASE, fill: "forwards" })
      .finished.then(() => { end(); cur.getAnimations().forEach((a) => a.cancel()); }, end);
    bg.animate([{ opacity: fromBg }, { opacity: 0 }], { duration: OPEN_MS, easing: EASE, fill: "forwards" })
      .finished.then(() => bg.getAnimations().forEach((a) => a.cancel()), () => {});
    if (groundMoved()) ground.animate([{ opacity: fromBg }, { opacity: 0 }], { duration: OPEN_MS, easing: EASE, fill: "forwards" })
      .finished.then(() => ground.getAnimations().forEach((a) => a.cancel()), () => {});
  }

  // ── PAGING ───────────────────────────────────────────────────────────
  // TWO MOVES, ONE FOR EACH HAND. A finger drags the strip, so the strip
  // follows it and the neighbour is where the finger left it, as in Photos.
  // A chevron or an arrow key has no drag to continue, and sliding the whole
  // strip for it swept the scene on the far side across the screen too:
  // three pictures going by for one step. There it is a TURN -- the scene
  // steps a little the way you went and fades, the next steps in from the
  // same side and fades up over it, and nothing else moves. Between the two
  // the ground shows through for a moment, already changing to the next
  // scene (it crossfades on its own), so the light moves before the picture.
  let queued = 0;            // a step asked for while a turn was running
  function go(k, { fromX = 0 } = {}) {
    if (busy && turning && !fromX && k !== i) { queued = Math.sign(k - i); return; }
    if (busy || k === i || k < 0 || k >= ids.length) {
      if (fromX) {
        track.style.transform = "";
        track.animate([{ transform: `translateX(${fromX}px)` }, { transform: "none" }], { duration: PAGE_MS, easing: EASE })
          .finished.then(() => el.classList.remove("is-paging"), () => el.classList.remove("is-paging"));
      }
      return;
    }
    const d = Math.sign(k - i);
    const neighbour = Math.abs(k - i) === 1;
    const settle = () => {
      i = k;
      if (neighbour) rotate(d);
      track.style.transform = ""; busy = false;
      el.classList.remove("is-paging");
      fillSlots(); describe(); load(true);
      history.replaceState(history.state, "", `${location.pathname}#${ids[i]}`);
      list.reveal(ids[i]);
      if (queued) { const q = queued; queued = 0; go(i + q); }
    };
    if (!neighbour || !PAGE_MS) { settle(); return; }
    busy = true;
    video?.pause();
    if (fromX) {
      el.classList.add("is-paging");
      track.animate([{ transform: `translateX(${fromX}px)` }, { transform: `translateX(${-d * (box.w + box.gap)}px)` }],
        { duration: PAGE_MS, easing: EASE, fill: "forwards" })
        .finished.then(() => { track.getAnimations().forEach((a) => a.cancel()); settle(); }, settle);
      return;
    }
    turn(d, settle);
  }

  function turn(d, settle) {
    const out = slot(0), inc = slot(d), img = inc.querySelector("img");
    const span = d * (box.w + box.gap);           // where the neighbour stands
    const step = d * Math.min(72, box.w * .14);   // how far each one moves
    turning = true;
    const run = () => {
      if (!open) { turning = false; busy = false; return; }
      el.classList.add("is-turning");
      inc.classList.add("is-in");
      if (!full) ambient?.setSource(img);
      const a = out.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-step}px)`, opacity: 0 }],
        { duration: TURN_MS * .8, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" });
      const b = inc.animate([{ transform: `translateX(${step - span}px)`, opacity: 0 }, { transform: `translateX(${-span}px)`, opacity: 1 }],
        { duration: TURN_MS, delay: TURN_MS * .12, easing: EASE, fill: "both" });
      const fin = () => {
        // in one go, so no frame sees it half done: the neighbour becomes the
        // middle frame where it already stands, then its animation is let go
        turning = false;
        inc.classList.remove("is-in"); el.classList.remove("is-turning");
        settle();
        a.cancel(); b.cancel();
      };
      Promise.all([a.finished, b.finished]).then(fin, fin);
    };
    // the picture coming in is decoded before it is shown: a hidden frame's
    // poster may never have been drawn, and an undecoded one shows as black
    // for a frame. Capped, so a slow disk never holds a click back for long.
    Promise.race([img?.decode?.() ?? null, new Promise((r) => setTimeout(r, 140))]).then(run, run);
  }

  // ── THE HAND ─────────────────────────────────────────────────────────
  let g = null;
  // A TOUCH IS ANSWERED ONCE. The browser follows a tap with a click, and
  // iOS Safari's click is a plain MouseEvent with no pointerType, so the
  // check below let it through: the tap paused the scene and its click
  // played it again in the same instant -- on a phone a tap never paused
  // anything. Any click that soon after a touch here is that touch's echo.
  let touchAt = -1e9;
  el.addEventListener("pointerdown", (e) => {
    if (!open || busy || e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.target.closest("button, .mgv-scrub, a")) return;
    g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, x: 0, y: 0, last: [] };
    el.setPointerCapture?.(e.pointerId);
  });
  // ONE WRITE PER FRAME. A phone reports touches at up to 120 Hz and a pointer
  // move can arrive several times between two frames; each used to write the
  // frame's transform and two opacities straight away. Now a move only records
  // where the finger is, and one animation frame applies the latest of them --
  // the pattern every smooth drag on the web is built on. Nothing here reads
  // layout, and all three properties are compositor-only.
  let dragRaf = 0;
  function applyDrag() {
    dragRaf = 0;
    if (!g || !g.mode) return;
    const dx = g.x, dy = g.y;
    if (g.mode === "page") {
      // past either end it pulls, rather than moving freely: there is nothing there
      const atEnd = (dx > 0 && i === 0) || (dx < 0 && i === ids.length - 1);
      track.style.transform = `translate3d(${atEnd ? dx / 3 : dx}px, 0, 0)`;
    } else {
      // how far it has left the middle is how small it is and how much of the
      // page shows through: Photos scales on the drag's distance, not its side
      const dist = Math.hypot(dx, dy);
      const k = clamp(dist / (window.innerHeight * .9), 0, 1);
      slot(0).style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${1 - .45 * k})`;
      bg.style.opacity = String(1 - k);
      groundFade(1 - k);
    }
  }
  el.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    g.x = dx; g.y = dy;
    g.last.push([performance.now(), e.clientX, e.clientY]); if (g.last.length > 6) g.last.shift();
    if (!g.mode) {
      if (Math.hypot(dx, dy) < 8) return;
      g.mode = Math.abs(dx) > Math.abs(dy) ? "page" : "lift";
      // THE PAGE UNDER A LIFTED SCENE STAYS STILL. Lifting used to start the
      // whole page again -- its video, forty tiles drawn every frame, the
      // flower's clip -- under a finger that was trying to move one frame
      // smoothly; on a phone that was the drag running at a few frames a
      // second. The tiles keep the picture they had, which is all that shows
      // behind a scene being swiped away; they play again once it has landed.
      if (g.mode === "lift") { setUI(0); el.classList.add("is-lifting"); }
      else el.classList.add("is-paging");
    }
    if (!dragRaf) dragRaf = requestAnimationFrame(applyDrag);
  });
  const release = (e) => {
    if (!g || e.pointerId !== g.id) return;
    // the last recorded position is where the finger left it
    if (dragRaf) { cancelAnimationFrame(dragRaf); applyDrag(); }
    const s = g; g = null;
    touchAt = performance.now();
    el.classList.remove("is-lifting");
    const pts = s.last, a = pts[0], b = pts[pts.length - 1];
    const dt = a && b ? Math.max(1, b[0] - a[0]) : 1;
    const vx = a && b ? (b[1] - a[1]) / dt : 0, vy = a && b ? (b[2] - a[2]) / dt : 0;
    if (!s.mode) {
      // a tap: play or pause, as a tap on a video in Photos does
      if (performance.now() - s.t0 < 350) setPlaying(!playing);
      return;
    }
    if (s.mode === "page") {
      const far = Math.abs(s.x) > box.w * .22 || Math.abs(vx) > .45;
      go(far ? i - Math.sign(s.x) : i, { fromX: s.x });
      return;
    }
    const dist = Math.hypot(s.x, s.y), speed = Math.hypot(vx, vy);
    const cur = slot(0);
    const from = cur.style.transform, fromBg = Number(bg.style.opacity || 1);
    if (dist > 90 || speed > .6) {
      cur.style.transform = "";
      close(from, fromBg);
    } else {
      cur.animate([{ transform: from }, { transform: "none" }], { duration: 260, easing: EASE }).finished.then(() => {}, () => {});
      cur.style.transform = "";
      bg.animate([{ opacity: fromBg }, { opacity: 1 }], { duration: 260, easing: EASE });
      bg.style.opacity = ""; groundFade(1); setUI(1);
    }
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);

  // the mouse
  el.addEventListener("click", (e) => {
    if (!open || busy) return;
    const b = e.target.closest("button");
    if (b) {
      if (b.classList.contains("mgv-close")) close();
      else if (b.classList.contains("mgv-snd")) { muted = !muted; soundState(); }
      else if (b.dataset.step) go(i + Number(b.dataset.step));
      return;
    }
    if ((e.pointerType && e.pointerType !== "mouse") || performance.now() - touchAt < 800) return;   // touch is handled above
    if (e.target.closest(".mgv-slot")) setPlaying(!playing);
    else if (!e.target.closest(".mgv-ui")) close();
  });
  function soundState() {
    if (video) video.muted = muted;
    snd.classList.toggle("is-muted", muted);
    snd.setAttribute("aria-pressed", String(!muted));
  }

  // the keys: heard on the DOCUMENT, before the router's window listener, and
  // prevented, so ← → step scenes here rather than projects
  const onKey = (e) => {
    if (!open || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    let used = true;
    if (k === "Escape") close();
    else if (k === "ArrowRight") go(i + 1);
    else if (k === "ArrowLeft") go(i - 1);
    else if (k === " " && !e.target.closest?.("button")) setPlaying(!playing);
    else if (k === ".") stepFrames(1);
    else if (k === ",") stepFrames(-1);
    else if (k === "m" || k === "M") { muted = !muted; soundState(); }
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  };
  document.addEventListener("keydown", onKey);

  // ── THE TILES, THE FLOWER AND THE TIMELINE OPEN IT ─────────────────────
  const onCell = (e) => {
    const a = e.target.closest("[data-scene]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openAt(a.dataset.scene, { from: a.closest("[data-list]")?.dataset.list, at: Number(a.dataset.filmAt || 0) });
  };
  root.addEventListener("click", onCell);

  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (open) layout(); }, 120); };
  window.addEventListener("resize", onResize);

  // a link to a scene (/projects/motion-graphics#pool) opens on it
  const first = decodeURIComponent(location.hash.slice(1));
  if (first && listFor(first)) setTimeout(() => openAt(first, { instant: true }), 0);
  const onHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || !listFor(id) || (open && ids[i] === id)) return;
    if (open && ids.includes(id)) go(ids.indexOf(id)); else if (!open) openAt(id);
  };
  window.addEventListener("hashchange", onHash);

  scope?.add(() => {
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("resize", onResize);
    root.removeEventListener("click", onCell);
    clearTimeout(rt);
    cancelTick(); dropVideo(video); video = null;
    clearTimeout(wheelT);
    if (dragRaf) cancelAnimationFrame(dragRaf);
    groundOut();
    el.remove();
    if (location.hash) history.replaceState(history.state, "", location.pathname);
  });

  return { open: openAt, close };
}
