// motionSheet.js — EVERY SCENE PLAYING AT ONCE, ON ONE DECODER
//
// The contact sheet on the motion-graphics page has a cell for every scene, and
// every cell plays. Fifty-odd <video> elements would be fifty-odd decoders: a
// desktop grinds and a phone simply refuses (iOS will run a handful of video
// elements at once and leaves the rest on their posters). So the cells are
// baked into ONE video, a grid of 200x434 tiles on a shared 5-second loop
// (tools/bake_motion.mjs, sheet.mp4), and each cell is a small canvas that the
// right tile is copied into.
//
// IT ONLY SPENDS WHAT IS SEEN. A cell draws only while it is on screen
// (IntersectionObserver), the video only plays while at least one cell is, and
// a copy happens only when the video has a NEW frame to give
// (requestVideoFrameCallback, where it exists; rAF otherwise). With the sheet
// scrolled away, or the viewer covering it, the cost is zero.
//
// Reduced motion: the sheet is the still (sheet.webp), drawn once, and nothing
// plays until the reader opens a scene and presses play.

import { SHEET } from "./motionassets.js";
import { reducedMotion } from "../utils/motion.js";

export function mountSheet(scope, root, { ambient } = {}) {
  const cvs = [...root.querySelectorAll("canvas.mg-cv")];
  const cells = cvs.map((cv) => ({ cv, ctx: cv.getContext("2d"), n: Number(cv.dataset.cell), on: false }));
  let paused = false;          // the viewer is covering the page

  const video = document.createElement("video");
  video.muted = true; video.loop = true; video.playsInline = true;
  video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
  video.preload = reducedMotion ? "none" : "auto";
  video.setAttribute("aria-hidden", "true");
  video.className = "mg-sheet-src";
  if (!reducedMotion) video.src = SHEET.video;
  root.append(video);

  const still = new Image();
  still.decoding = "async";
  still.src = SHEET.still;

  // the backing store: the cell's own size at the device's density, but never
  // more than the tile it is copied from, which is all the detail there is
  function size(c) {
    const r = c.cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.min(SHEET.cw, Math.round(r.width * dpr)));
    const h = Math.max(1, Math.round(w * SHEET.ch / SHEET.cw));
    if (c.cv.width !== w || c.cv.height !== h) { c.cv.width = w; c.cv.height = h; c.drawn = false; }
  }

  function draw(c, src) {
    if (c.n < 0) return;
    const sx = (c.n % SHEET.cols) * SHEET.cw, sy = Math.floor(c.n / SHEET.cols) * SHEET.ch;
    // the still is the first frame at the same grid, so the same arithmetic
    const k = src === still ? still.naturalWidth / (SHEET.cols * SHEET.cw) : 1;
    try { c.ctx.drawImage(src, sx * k, sy * k, SHEET.cw * k, SHEET.ch * k, 0, 0, c.cv.width, c.cv.height); c.drawn = true; }
    catch { /* not decodable yet */ }
  }

  const live = () => !reducedMotion && !paused && video.readyState >= 2;
  function paint() {
    for (const c of cells) if (c.on) { if (live()) draw(c, video); else if (!c.drawn && still.complete) draw(c, still); }
  }

  // one frame loop, only while something is on screen and the video is going
  let loopId = 0, useVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
  function frame() {
    loopId = 0;
    paint();
    schedule();
  }
  function schedule() {
    if (loopId || !cells.some((c) => c.on) || !live() || video.paused) return;
    loopId = useVFC ? video.requestVideoFrameCallback(frame) : requestAnimationFrame(frame);
  }
  function unschedule() {
    if (!loopId) return;
    if (useVFC) video.cancelVideoFrameCallback(loopId); else cancelAnimationFrame(loopId);
    loopId = 0;
  }

  function update() {
    const any = cells.some((c) => c.on);
    if (reducedMotion) { paint(); return; }
    if (any && !paused && !document.hidden) video.play().catch(() => {});
    else video.pause();
    paint();
    schedule();
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = cells.find((x) => x.cv === e.target);
      if (!c) continue;
      c.on = e.isIntersecting;
      if (c.on) { size(c); if (!live() && !c.drawn && still.complete) draw(c, still); }
    }
    update();
  }, { rootMargin: "120px 0px" });
  cells.forEach((c) => io.observe(c.cv));

  still.addEventListener("load", paint, { once: true });
  video.addEventListener("playing", () => { unschedule(); schedule(); });
  video.addEventListener("loadeddata", paint);
  const vis = () => update();
  document.addEventListener("visibilitychange", vis);
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { cells.forEach((c) => c.on && size(c)); paint(); }, 150); };
  window.addEventListener("resize", onResize);

  // ── THE GROUND FOLLOWS THE EYE ───────────────────────────────────────
  // The page's ground (motionAmbient.js) is whichever scene the reader is on:
  // the one under the pointer, or else the one crossing the middle of the
  // screen as they scroll (a thin band in the middle, watched by an observer,
  // so nothing on the scroll path reads layout), or else the film.
  const filmCv = root.querySelector('[data-scene="film"] canvas');
  let hovered = null, centred = null;
  const ground = () => ambient?.setSource(hovered || centred || filmCv);
  const mid = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) centred = e.target;
      else if (centred === e.target) centred = null;
    }
    ground();
  }, { rootMargin: "-46% 0px -46% 0px" });
  cvs.forEach((cv) => mid.observe(cv));
  const over = (e) => {
    const a = e.target.closest?.(".mg-cell-a canvas, .mg-cell-a");
    const cv = a?.matches?.("canvas") ? a : a?.querySelector?.("canvas");
    if (cv && cv !== hovered) { hovered = cv; ground(); }
  };
  const out = (e) => {
    if (hovered && !e.relatedTarget?.closest?.(".mg-cell-a")) { hovered = null; ground(); }
  };
  root.addEventListener("pointerover", over);
  root.addEventListener("pointerout", out);
  ground();

  scope?.add(() => {
    mid.disconnect();
    root.removeEventListener("pointerover", over);
    root.removeEventListener("pointerout", out);
    io.disconnect(); unschedule(); clearTimeout(rt);
    document.removeEventListener("visibilitychange", vis);
    window.removeEventListener("resize", onResize);
    video.pause(); video.removeAttribute("src"); video.load(); video.remove();
  });

  return {
    /** the viewer is up (true) or down: nothing under it needs to play */
    cover(on) { paused = on; update(); if (!on) ground(); },
    /** a cell's canvas, for the viewer to fly out of and back into */
    cellOf(id) { return root.querySelector(`[data-scene="${CSS.escape(id)}"] .mg-frame-cut`); },
    /** the current picture of a cell, so the viewer's first frame matches it */
    canvasOf(id) { return root.querySelector(`[data-scene="${CSS.escape(id)}"] canvas`); }
  };
}
