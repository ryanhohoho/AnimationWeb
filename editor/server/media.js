// media.js — a picture or a clip, cut down the way the bake tools cut them
//
// When a figure or a card is replaced from the editor, the file that lands in
// src/assets/media/ is encoded exactly the way tools/bake_captures.mjs encodes
// one: ffmpeg-static only, WebP for a still with the quality walked DOWN a
// ladder until it fits its ceiling, H.264 + faststart and no audio for a clip,
// and a poster beside every clip -- because a <video> with no poster prints
// blank and flashes before it resolves (media.js on the site says why).
//
// THE SIZE IS THE SLOT'S, NOT THE UPLOAD'S. A replacement takes the width and
// frame rate of the file it replaces (never larger than its own source), so a
// 4K phone clip dropped on a card comes out a card, not a film. A brand-new
// figure gets the bake tool's hero width.
//
// Over budget is REPORTED, not refused: the bake tool exits non-zero because
// nobody reads a warning in a terminal, but here the warning is on screen in
// the save dialog, next to the thing it is about.

import { execFileSync } from "node:child_process";
import { statSync, existsSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

export const CAP = { still: 140 * 1024, motion: 500 * 1024, poster: 60 * 1024 };
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|gif)$/i;

const run = (a) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...a],
  { maxBuffer: 1 << 28 });

/** width, height, fps and duration, off ffmpeg's own report */
export function probe(file) {
  let out = "";
  try {
    execFileSync(ffmpeg, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) { out = String(e.stderr || ""); }
  const dim = out.match(/Video:.*?,\s(\d{2,5})x(\d{2,5})[\s,]/);
  const fps = out.match(/,\s([\d.]+)\sfps/);
  const dur = out.match(/Duration:\s(\d+):(\d+):([\d.]+)/);
  const seconds = dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + (+dur[3]) : 0;
  return {
    w: dim ? +dim[1] : 0, h: dim ? +dim[2] : 0,
    fps: fps ? +fps[1] : 0,
    seconds,
    // a webp still reports "Duration: N/A"; an animated gif is a clip
    video: VIDEO_EXT.test(file) || (seconds > 0.2 && !/\.(webp|png|jpe?g|avif)$/i.test(file))
  };
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/** a still, as WebP, walked down the quality ladder until it fits */
export function encodeStill(src, out, width, cap = CAP.still) {
  const d = probe(src);
  const w = even(Math.min(width || d.w, d.w || width));
  let size = 0, q = 0;
  for (q of [80, 72, 64, 56, 48]) {
    run(["-i", src, "-vf", `scale=${w}:-2:flags=lanczos`, "-frames:v", "1",
      "-c:v", "libwebp", "-q:v", String(q), "-y", out]);
    size = statSync(out).size;
    if (size <= cap) break;
  }
  return { file: out, bytes: size, over: size > cap, ratio: d.w / d.h, w, q };
}

/** a clip, as H.264, plus its poster */
export function encodeClip(src, out, poster, { width, fps, cap = CAP.motion } = {}) {
  const d = probe(src);
  const w = even(Math.min(width || d.w, d.w || width));
  const r = Math.min(fps || 24, d.fps || 24);
  let size = 0, crf = 0;
  for (crf of [28, 31, 34, 37]) {
    run(["-i", src, "-an", "-vf", `scale=${w}:-2:flags=lanczos,fps=${r}`,
      "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
      "-crf", String(crf), "-movflags", "+faststart", "-y", out]);
    size = statSync(out).size;
    if (size <= cap) break;
  }
  const at = Math.min(0.4, Math.max(0, d.seconds - 0.1));
  run(["-ss", String(at), "-i", src, "-vf", `scale=${w}:-2:flags=lanczos`,
    "-frames:v", "1", "-c:v", "libwebp", "-q:v", "76", "-y", poster]);
  const pb = statSync(poster).size;
  return { file: out, poster, bytes: size, posterBytes: pb, over: size > cap || pb > CAP.poster,
           ratio: d.w / d.h, w, fps: r, seconds: d.seconds, crf };
}

/** what the slot being replaced was, so the replacement can match it */
export function slotShape(file) {
  if (!file || !existsSync(file)) return null;
  const d = probe(file);
  return { w: d.w, fps: d.fps };
}
