// bake_captures.mjs — REFERENCE ART, CUT DOWN TO FIGURE SIZE
//
//   node tools/bake_captures.mjs [--only <id>] [--dry]
//
// The three project sheets carry figures. Their real captures — a screen
// recording of the provisioning tool, a generated engraver tray, the poll as a
// student sees it — do not exist yet, so what ships is art out of
// aesthetic-images/, the reference folder RYAN.txt was distilled from.
//
// STAND-INS, AND THE SHEETS DO NOT CLAIM OTHERWISE. Every id here is prefixed
// `stand-`, and none of them is captioned. A figcaption reading
// "FIG. 1 — THE HUB, MID-RUN" over somebody else's poster would be the first
// false label on a site whose whole discipline is that every label is true. A
// picture with no caption claims nothing; the moment a real capture lands under
// its own id, media.js picks that instead and the caption comes with it.
//
// THEY ARE NOT CROPPED. The owner asked for the images whole, so the only
// operations here are SCALE and ENCODE — nothing is reframed and nothing is
// recoloured. That is also why each figure carries its source's own aspect
// ratio rather than a house one: `object-fit: cover` inside `.fig-in` crops to
// fill, so handing it the true ratio is what guarantees nothing is cut off.
// The tool prints each ratio; paste it into the sheet.
//
// ffmpeg-static is the only image I/O, exactly as in bake_sky.mjs and
// bake_icons.mjs. No new dependency: ffmpeg decodes anything and writes
// anything, and every decision in between lives in the manifest below rather
// than in somebody's shell history.

import { execFileSync } from "node:child_process";
import { statSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "aesthetic-images");
const OUT = join(ROOT, "src", "assets", "media");

// ── THE MANIFEST ───────────────────────────────────────────────────────────
// One entry per figure. `w` is the emitted width; height follows the source.
// A `clip` makes it motion: [start seconds, duration seconds].
const SHEET = [
  // usb-provisioning · NAVY + BLACK
  //
  // NO HERO ON THIS SHEET. It had one -- a rectangular block of sky lifted out
  // of a landscape, which is the literal subject of this whole site -- and it
  // was removed rather than replaced: that plate now carries two REAL figures,
  // a played transcript and a running interface, and a piece of reference
  // artwork standing above them was the least true thing on the page in the
  // most prominent slot. The entry is left here rather than deleted because
  // the source still exists and this is the only record of which image it was:
  //
  //   { id: "stand-usb-hero", w: 1400, src: "698128379785451550.jpg" },
  //
  // Put that line back and re-run to bring it back.
  { id: "stand-usb-side", w: 900,
    src: "698128379785715134_ASCII GRAPHIC DESIGN.png" },

  // (closet · TWO GREYS was here: the project was scrapped on 2026-09-25 and its
  // slot went to the motion-graphics page, whose media is baked by
  // tools/bake_motion.mjs rather than by this tool.)

  // iclicker · BLUE + TEAL
  { id: "stand-iclicker-hero", w: 1400,
    src: "698128379785451480.jpg" },
  { id: "stand-iclicker-side", w: 640, fps: 20, clip: [1.5, 6.0],
    src: "698128379785542584.mp4" }
];

// ── THE BUDGET, ENFORCED ───────────────────────────────────────────────────
// The card set is the precedent: six assets, ~1.7 MB. A figure is a glance, not
// a film. The tool EXITS NON-ZERO over a ceiling rather than printing a warning
// nobody reads — bake_sky.mjs already exits non-zero when it writes nothing.
const CAP = { still: 140 * 1024, motion: 500 * 1024, poster: 60 * 1024 };
const SET_CAP = 2.0 * 1024 * 1024;

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const dry = args.includes("--dry");

const run = (a) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...a],
  { maxBuffer: 1 << 28 });

/** width, height and duration of a source, straight off ffmpeg's own report */
function probe(file) {
  let out = "";
  try {
    execFileSync(ffmpeg, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    out = String(e.stderr || "");
  }
  const dim = out.match(/,\s(\d{2,5})x(\d{2,5})[\s,]/);
  if (!dim) throw new Error(`${file}: could not read dimensions`);
  return { w: +dim[1], h: +dim[2] };
}

mkdirSync(OUT, { recursive: true });
let total = 0, over = [];

for (const it of SHEET) {
  if (only && it.id !== only) continue;
  const src = join(SRC, it.src);
  if (!existsSync(src)) {
    console.error(`  MISSING  ${it.src}`);
    over.push(it.id);
    continue;
  }
  const d = probe(src);
  // -2 keeps the height even, which h264 requires and webp does not mind
  const scale = `scale=${it.w}:-2:flags=lanczos`;
  const ratio = (d.w / d.h).toFixed(4);
  const shape = `${d.w}x${d.h}`;

  if (dry) {
    console.log(`  ${it.id.padEnd(22)} ${shape.padStart(10)}  ratio ${ratio}  <- ${it.src}`);
    continue;
  }

  if (it.clip) {
    const mp4 = join(OUT, `${it.id}.mp4`);
    run(["-ss", String(it.clip[0]), "-t", String(it.clip[1]), "-i", src, "-an",
      "-vf", `${scale},fps=${it.fps || 20}`,
      "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
      "-crf", "30", "-movflags", "+faststart", "-y", mp4]);
    // A POSTER, ALWAYS. Two problems at once: the flash before preload
    // resolves, and paper — a <video> with no poster prints blank, and the
    // print stylesheet on this site is a load-bearing feature.
    const post = join(OUT, `${it.id}-still.webp`);
    run(["-ss", String(it.clip[0] + 0.4), "-i", src, "-vf", scale,
      "-frames:v", "1", "-c:v", "libwebp", "-q:v", "76", "-y", post]);
    const a = statSync(mp4).size, b = statSync(post).size;
    total += a + b;
    if (a > CAP.motion) over.push(`${it.id}.mp4 ${(a / 1024) | 0}KB`);
    if (b > CAP.poster) over.push(`${it.id}-still.webp ${(b / 1024) | 0}KB`);
    console.log(`  ${it.id.padEnd(22)} ratio ${ratio}  mp4 ${(a / 1024) | 0}KB  poster ${(b / 1024) | 0}KB`);
  } else {
    // THE CEILING IS THE INPUT AND THE QUALITY IS DERIVED. Hand-picking a
    // `-q:v` per image is how a budget becomes a suggestion: the dense
    // technical ones came out at 166 and 183 KB against a 140 KB ceiling on the
    // same setting that put the others at 71. Walk the quality down until it
    // fits, and print which rung it landed on so an image that needed the
    // bottom of the ladder is visible rather than silent.
    const webp = join(OUT, `${it.id}.webp`);
    let a = 0, q = 0;
    for (q of [78, 70, 62, 54, 46]) {
      run(["-i", src, "-vf", scale, "-frames:v", "1",
        "-c:v", "libwebp", "-q:v", String(q), "-y", webp]);
      a = statSync(webp).size;
      if (a <= CAP.still) break;
    }
    total += a;
    if (a > CAP.still) over.push(`${it.id}.webp ${(a / 1024) | 0}KB`);
    console.log(`  ${it.id.padEnd(22)} ratio ${ratio}  webp ${(a / 1024) | 0}KB  q${q}`);
  }
}

if (dry) process.exit(0);
console.log(`\n  set total ${(total / 1024) | 0} KB of ${(SET_CAP / 1024) | 0} KB`);
if (total > SET_CAP) over.push(`the set, ${(total / 1024) | 0}KB`);
if (over.length) {
  console.error(`\n  OVER BUDGET: ${over.join(", ")}`);
  process.exit(1);
}
