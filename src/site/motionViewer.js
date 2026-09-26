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
  const groundIn = () => { if (ground && ground.parentNode !== el) el.prepend(ground); };
  const groundOut = () => { if (ground && groundHome && ground.parentNode !== groundHome) { groundHome.prepend(ground); ground.style.opacity = ""; } };
  const groundFade = (a) => { if (ground) ground.style.opacity = a >= 1 ? "" : String(a); };
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
  const slots = [...el.querySelectorAll(".mgv-slot")];
  const slot = (k) => slots[k + 1];
  const scrub = $(".mgv-scrub"), fill = $(".mgv-fill"), head = $(".mgv-head"), ticks = $(".mgv-ticks");
  const title = $(".mgv-title"), snd = $(".mgv-snd");
  const uis = [...el.querySelectorAll(".mgv-ui, .mgv-side, .mgv-close")];

  const video = document.createElement("video");
  video.className = "mgv-video";
  video.playsInline = true; video.setAttribute("playsinline", "");
  video.loop = true; video.muted = true; video.preload = "auto";

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
    for (const k of [-1, 0, 1]) {
      Object.assign(slot(k).style, { left: `${x + k * (w + box.gap)}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    }
    el.style.setProperty("--fx", `${x}px`); el.style.setProperty("--fw", `${w}px`);
    el.style.setProperty("--fy", `${y}px`); el.style.setProperty("--fh", `${h}px`);
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
    video.classList.remove("ready");
    if (video.parentNode !== cur) cur.append(video);
    if (video.getAttribute("src") !== c.video) { video.src = c.video; video.currentTime = 0; }
    video.muted = muted;
    playing = autoplay && !reducedMotion;
    if (playing) video.play().catch(() => { playing = false; stateClass(); });
    else video.pause();
    stateClass();
    // the ground takes the poster at once and the picture as soon as it plays
    ambient?.setSource(cur.querySelector("img"));
  }
  video.addEventListener("loadeddata", () => { video.classList.add("ready"); if (open) ambient?.setSource(video); });
  video.addEventListener("seeked", () => video.classList.add("ready"));

  // ── THE BAR ───────────────────────────────────────────────────────────
  let seekTo = null, seeking = false;
  function seek(t) {
    const c = clipOf(i);
    t = clamp(t, 0, c.dur - 1 / FPS);
    seekTo = t;
    if (!seeking) { seeking = true; video.currentTime = t; }
    readout(t);
  }
  video.addEventListener("seeked", () => {
    seeking = false;
    if (seekTo !== null && Math.abs(video.currentTime - seekTo) > 1e-3) { seeking = true; video.currentTime = seekTo; }
    else seekTo = null;
  });
  const frameAt = (t) => Math.min(Math.round(clipOf(i).dur * FPS) - 1, Math.floor(t * FPS + 1e-3));
  function readout(t = video.currentTime) {
    const c = clipOf(i);
    if (!c) return;
    const p = clamp(t / c.dur, 0, 1);
    fill.style.transform = `scaleX(${p})`;
    head.style.left = `${p * 100}%`;
    scrub.setAttribute("aria-valuenow", String(frameAt(t)));
  }
  function stateClass() { el.classList.toggle("is-paused", !playing); }
  function setPlaying(on) {
    playing = on;
    if (on) video.play().catch(() => {}); else video.pause();
    stateClass();
  }
  function stepFrames(n) {
    if (playing) setPlaying(false);
    const base = seekTo ?? video.currentTime;
    seek((frameAt(base) + n + .5) / FPS);
  }

  // the bar follows the picture, frame by frame, only while open
  let rid = 0;
  const vfc = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
  function tick() {
    rid = 0;
    if (!open) return;
    if (seekTo === null) readout();
    rid = vfc ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  }

  scrub.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    scrub.setPointerCapture(e.pointerId);
    setPlaying(false);
    el.classList.add("is-scrubbing");
    const r = scrub.getBoundingClientRect();
    const at = (x) => seek(clamp((x - r.left) / r.width, 0, 1) * clipOf(i).dur);
    at(e.clientX);
    const move = (ev) => at(ev.clientX);
    const up = () => {
      scrub.removeEventListener("pointermove", move); scrub.removeEventListener("pointerup", up); scrub.removeEventListener("pointercancel", up);
      el.classList.remove("is-scrubbing");
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
  let wheelAcc = 0;
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!open || busy) return;
    const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    wheelAcc += d;
    const n = Math.trunc(wheelAcc / 6);
    if (n) { wheelAcc -= n * 6; stepFrames(n); }
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
    el.hidden = false;
    groundIn();
    layout(); fillSlots(); describe(); load(true);
    if (at) seek(at);
    history.replaceState(history.state, "", `${location.pathname}#${id}`);
    const r = rectOf(id);
    const cur = slot(0);
    track.style.transform = "";
    const done = () => {
      busy = false; cur.style.transform = ""; bg.style.opacity = ""; setUI(1);
      cover(true);
      el.focus?.({ preventScroll: true });
    };
    el.tabIndex = -1;
    if (instant || !r || !OPEN_MS) { done(); } else {
      setUI(0);
      cur.animate([{ transform: over(r) }, { transform: "none" }], { duration: OPEN_MS, easing: EASE }).finished.then(done, done);
      bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE });
      ground?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE });
    }
    cancelAnimationFrame(rid); tick();
  }

  function close(fromTransform = "none", fromBg = 1) {
    if (!open) return;
    busy = true;
    cover(false);
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
      video.pause(); cur.style.transform = ""; bg.style.opacity = "";
      el.hidden = true; setUI(1);
      groundOut();
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
    ground?.animate([{ opacity: fromBg }, { opacity: 0 }], { duration: OPEN_MS, easing: EASE, fill: "forwards" })
      .finished.then(() => ground.getAnimations().forEach((a) => a.cancel()), () => {});
  }

  // ── PAGING ───────────────────────────────────────────────────────────
  function go(k, { fromX = 0 } = {}) {
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
      i = k; track.style.transform = ""; busy = false;
      el.classList.remove("is-paging");
      fillSlots(); describe(); load(true);
      history.replaceState(history.state, "", `${location.pathname}#${ids[i]}`);
      list.reveal(ids[i]);
    };
    if (!neighbour || !PAGE_MS) { settle(); return; }
    busy = true;
    el.classList.add("is-paging");
    video.pause();
    track.animate([{ transform: `translateX(${fromX}px)` }, { transform: `translateX(${-d * (box.w + box.gap)}px)` }],
      { duration: PAGE_MS, easing: EASE, fill: "forwards" })
      .finished.then(() => { track.getAnimations().forEach((a) => a.cancel()); settle(); }, settle);
  }

  // ── THE HAND ─────────────────────────────────────────────────────────
  let g = null;
  el.addEventListener("pointerdown", (e) => {
    if (!open || busy || e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.target.closest("button, .mgv-scrub, a")) return;
    g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, x: 0, y: 0, last: [] };
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    g.x = dx; g.y = dy;
    g.last.push([performance.now(), e.clientX, e.clientY]); if (g.last.length > 6) g.last.shift();
    if (!g.mode) {
      if (Math.hypot(dx, dy) < 8) return;
      g.mode = Math.abs(dx) > Math.abs(dy) ? "page" : "lift";
      if (g.mode === "lift") { setUI(0); cover(false); }
      else el.classList.add("is-paging");
    }
    if (g.mode === "page") {
      // past either end it pulls, rather than moving freely: there is nothing there
      const atEnd = (dx > 0 && i === 0) || (dx < 0 && i === ids.length - 1);
      track.style.transform = `translateX(${atEnd ? dx / 3 : dx}px)`;
    } else {
      // how far it has left the middle is how small it is and how much of the
      // page shows through: Photos scales on the drag's distance, not its side
      const dist = Math.hypot(dx, dy);
      const k = clamp(dist / (window.innerHeight * .9), 0, 1);
      slot(0).style.transform = `translate(${dx}px, ${dy}px) scale(${1 - .45 * k})`;
      bg.style.opacity = String(1 - k);
      groundFade(1 - k);
    }
  });
  const release = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const s = g; g = null;
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
      bg.style.opacity = ""; groundFade(1); setUI(1); cover(true);
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
    if (e.pointerType && e.pointerType !== "mouse") return;   // touch is handled above
    if (e.target.closest(".mgv-slot")) setPlaying(!playing);
    else if (!e.target.closest(".mgv-ui")) close();
  });
  function soundState() {
    video.muted = muted;
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
    if (vfc && rid) video.cancelVideoFrameCallback(rid); else cancelAnimationFrame(rid);
    video.pause(); video.removeAttribute("src"); video.load();
    groundOut();
    el.remove();
    if (location.hash) history.replaceState(history.state, "", location.pathname);
  });

  return { open: openAt, close };
}
