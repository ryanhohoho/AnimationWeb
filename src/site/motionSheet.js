// motionSheet.js — EVERY TILE PLAYING AT ONCE, ON ONE DECODER
//
// The motion-graphics page has a tile for every work on its wall, and every
// tile plays. Forty-odd <video> elements would be forty-odd decoders: a
// desktop grinds and a phone simply refuses (iOS will run a handful of video
// elements at once and leaves the rest on their posters). So the cells are
// baked into ONE video, a grid of 240x520 tiles on a shared 5-second loop
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
// plays until the reader opens a work and presses play.

import { SHEET, CLIPS } from "./motionassets.js";
import { reducedMotion } from "../utils/motion.js";

export function mountSheet(scope, root) {
  // a tile finds its place on the sheet by its work's id, so the page can lay
  // its tiles out in any order and the sheet never has to be re-baked for it
  const cvs = [...root.querySelectorAll("canvas.mg-cv")];
  const cells = cvs.map((cv) => {
    const id = cv.closest("[data-scene]")?.dataset.scene;
    return { cv, ctx: cv.getContext("2d"), n: CLIPS[id]?.cell ?? -1, on: false };
  });
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

  scope?.add(() => {
    io.disconnect(); unschedule(); clearTimeout(rt);
    document.removeEventListener("visibilitychange", vis);
    window.removeEventListener("resize", onResize);
    video.pause(); video.removeAttribute("src"); video.load(); video.remove();
  });

  return {
    /** the viewer is up (true) or down: nothing under it needs to play */
    cover(on) { paused = on; update(); }
  };
}
