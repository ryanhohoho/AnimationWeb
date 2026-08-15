// bake_sky.mjs — TURN A CLOUD CLIP INTO A DENSITY SHEET
//
// The site does not ship the clip. A 1080p mp4 is 63 MB, and the page would
// have to decode and seek it on load to get anything out of it — for a picture
// that ends up sampled once every six pixels.
//
// What ships instead is a single greyscale sprite sheet: N frames of the clip,
// stacked, at the resolution the field grid actually reads. 120 KB, one image
// request, no video decoder, and it works identically on every browser.
//
// The sheet is not a picture of the sky. It is the DENSITY FIELD — where there
// is cloud and how much — which is handed to the press (sky.js `opts.dens`) in
// place of the procedural noise. The night ramp, the sun, the cloud lighting,
// the two-ink separation and the screen are all still the sheet's own.
//
//   node tools/bake_sky.mjs <clip> [frames] [width]
//
// Frames are taken at an even spacing across the whole clip, so the step from
// the last frame back to the first is the same size as every other step — which
// is what makes the loop close, PROVIDED the source itself loops. Check that
// first: the wrap error should be small next to one sampled step.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ffmpeg from "ffmpeg-static";

const [, , clip, framesArg, widthArg] = process.argv;
if (!clip) {
  console.error("usage: node tools/bake_sky.mjs <clip> [frames=20] [width=320]");
  process.exit(1);
}
const FRAMES = Number(framesArg || 20);
const WIDTH = Number(widthArg || 320);
const OUT = resolve("src/assets/media/sky-field.webp");

// ffmpeg prints the duration on stderr and exits non-zero when given no output
// file, so the "error" IS the answer here.
function duration(file) {
  let text = "";
  try {
    text = execFileSync(ffmpeg, ["-hide_banner", "-i", file],
      { stdio: ["ignore", "pipe", "pipe"] }).toString();
  } catch (e) {
    text = String(e.stderr || "");
  }
  const m = text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}

const T = duration(clip);
if (!T) { console.error("could not read the clip's duration"); process.exit(1); }

const fps = FRAMES / T;
mkdirSync(dirname(OUT), { recursive: true });

execFileSync(ffmpeg, [
  "-hide_banner", "-loglevel", "error",
  "-i", clip,
  "-vf", `fps=${fps},scale=${WIDTH}:-1,format=gray,tile=1x${FRAMES}`,
  "-frames:v", "1", "-q:v", "80", "-y", OUT
]);

if (!existsSync(OUT)) { console.error("nothing was written"); process.exit(1); }
console.log(`${OUT}\n  ${FRAMES} frames of ${WIDTH}px across ${T.toFixed(2)}s`);
console.log("  set FRAMES in src/site/skyclip.js to match if you changed it");
