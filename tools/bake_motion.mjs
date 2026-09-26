// bake_motion.mjs — THE MOTION-GRAPHICS PAGE'S VIDEO, FROM THE PIECE'S OWN RENDERS
//
//   node tools/bake_motion.mjs --renders <dir> [--only <id> | --card] [--crf 27] [--dry]
//
// The page (pages/motion-graphics.js) shows "let me be a flower"
// (../VisualAudialExperience) as every one of its scenes and as the whole of it.
// Nothing here is recorded off a screen: the piece renders itself offline, frame
// by frame, with its score rendered by an OfflineAudioContext, and this tool only
// cuts and encodes what it rendered. HOW those renders were made -- in a scratch
// copy of that project, never in the project itself -- is tools/motion/README.md,
// and the script that made them is tools/motion/sandbox_takes.js.
//
// <dir> holds four renders at 1080x2340 / 30 fps:
//   film-full.mp4                      the piece as it is, words and all
//   frames_clean/  audio_clean.wav     the piece with no words (story beats are cut from this)
//   frames_montage/ audio_montage.wav  each devices-montage scene alone, at take length
//   frames_flower/ audio_flower.wav    each cut of "A flower." alone, held at its moment
// and tools/motion/scenes.json says which stretch of which render each scene is.
//
// WHAT COMES OUT, in src/assets/motion/:
//   <id>.mp4       720x1560 H.264 + AAC, a keyframe every HALF SECOND (-g 15).
//                  The viewer scrubs, and a seek decodes from the keyframe before
//                  it: at 15 frames that is instant everywhere, where the
//                  encoder's default (250) is a visible stall per step.
//   <id>.webp      the poster: the frame the viewer shows before the clip has a
//                  frame of its own, and what reduced motion sees
//   sheet.mp4      THE CONTACT SHEET, one video. Every scene's cell, playing at
//                  once, is ONE decoder: ~53 videos on a page is 53 decoders, and
//                  phones refuse to run more than a handful. Each cell is a
//                  2.5 s stretch from the middle of its scene played forward and
//                  then back (a boomerang), so every cell loops without a seam
//                  on one shared 5 s period. The page draws each visible cell out
//                  of it (motionSheet.js).
//   sheet.webp     the sheet's first frame, for the moment before it plays
//   src/site/motionassets.js   GENERATED: urls, durations, the sheet's grid.
//
// ffmpeg-static is the only I/O, exactly as in the other bake tools.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "assets", "motion");
const GEN = join(ROOT, "src", "site", "motionassets.js");
const MAN = JSON.parse(readFileSync(join(ROOT, "tools", "motion", "scenes.json"), "utf8"));
const FPS = MAN.fps;

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const RENDERS = arg("--renders", null);
const ONLY = arg("--only", null);
const CRF = Number(arg("--crf", 27));
const DRY = args.includes("--dry");
if (!RENDERS) { console.error("usage: node tools/bake_motion.mjs --renders <dir>"); process.exit(1); }

// ── THE FRAME ──────────────────────────────────────────────────────────────
// 720 x 1560 is the stage's 9:19.5 at two thirds: a phone shows it edge to edge
// at about its own pixel density, and a desktop shows it at most ~900 px tall.
const W = 720, H = 1560;
// the sheet's cells: 9:19.5 again, 9 across
const CW = 200, CH = 434, COLS = 9;
const LOOP_HALF = 2.5;           // seconds forward, then the same back

const run = (a) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...a],
  { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 26 });
const kb = (f) => (statSync(f).size / 1024).toFixed(0);

/** the ffmpeg inputs for one stretch of one render: video [0], audio [1] */
function inputs(s) {
  const dur = s.to - s.from;
  if (s.src === "film") {
    const f = join(RENDERS, "film-full.mp4");
    return [["-ss", String(s.from), "-t", String(dur), "-i", f,
             "-ss", String(s.from), "-t", String(dur), "-i", f], dur, "1:a:0"];
  }
  const start = Math.round(s.from * FPS);
  const n = Math.round(dur * FPS);
  return [["-framerate", String(FPS), "-start_number", String(start),
           "-i", join(RENDERS, `frames_${s.src}`, "%06d.jpg"),
           "-ss", String(s.from), "-t", String(n / FPS), "-i", join(RENDERS, `audio_${s.src}.wav`),
           "-frames:v", String(n)], n / FPS, "1:a:0"];
}

function clip(s) {
  const mp4 = join(OUT, `${s.id}.mp4`);
  const [inp, dur, a] = inputs(s);
  // a 20 ms fade at each end: a cut in the middle of a sustained note clicks
  run([...inp, "-map", "0:v:0", "-map", a,
    "-vf", `scale=${W}:${H}:flags=lanczos,format=yuv420p`,
    "-af", `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, dur - 0.05).toFixed(3)}:d=0.05`,
    "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", String(CRF),
    // CAPPED, not pure CRF. The piece is grain and dither and per-frame noise
    // by design, and at a constant quality the noisiest scene (the wings, their
    // colour noise re-rolled every frame) came out at 13.7 MB for 8 s -- a
    // seventh of the whole budget. The cap is what makes the budget a budget.
    "-maxrate", s.id === "film" ? "1800k" : "2000k", "-bufsize", "4000k",
    "-g", String(s.id === "film" ? FPS : FPS / 2), "-keyint_min", String(FPS / 2), "-sc_threshold", "0",
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-movflags", "+faststart", "-shortest", "-y", mp4]);
  return { mp4, dur };
}

// the poster: the scene's middle frame, walked down a quality ladder to 70 KB
function poster(s, dur) {
  const webp = join(OUT, `${s.id}.webp`);
  const [inp] = inputs(s);
  const at = (s.id === "film" ? 38.9 : dur / 2).toFixed(3);   // the film's: the whale, close
  for (const q of [80, 72, 64, 56, 48]) {
    run([...inp.slice(0, inp.indexOf("-i") + 2), "-ss", at, "-frames:v", "1",
      "-vf", `scale=540:1170:flags=lanczos`, "-c:v", "libwebp", "-q:v", String(q), "-y", webp]);
    if (statSync(webp).size <= 70 * 1024) break;
  }
  return webp;
}

// one cell of the sheet: 2.5 s from the middle, forward then reversed
function cell(s, dur, tmp) {
  const out = join(tmp, `${s.id}.mp4`);
  const mid = s.id === "film" ? 38.9 : dur / 2;
  const from = Math.max(0, Math.min(dur - LOOP_HALF, mid - LOOP_HALF / 2));
  const [inp] = inputs(s);
  const v = inp.slice(0, inp.indexOf("-i") + 2);
  run([...v, "-ss", from.toFixed(3), "-t", String(LOOP_HALF),
    "-filter_complex", `[0:v]scale=${CW}:${CH}:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,fps=${FPS}[o]`,
    "-map", "[o]", "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", "-y", out]);
  return out;
}

// ── THE PROJECTS CARD ─────────────────────────────────────────────────────
// The card on the projects deck is 16:10 like its two siblings (a 960x600
// still, a 6-second 640x400 hover clip at 24 fps, content.js reads them by
// name), and the piece is 9:19.5, so the card is a BAND of one scene: the pool,
// across the Windows Photo Viewer, where the rhino passes through and is
// x-rayed to the skeleton inside it. Chosen by the owner (the pool rhino).
const CARD = { src: "montage", still: 90.5, clip: [88.5, 6], band: [1060, 675] };   // band: [top y, height] at 1080 wide
function card() {
  const media = join(ROOT, "src", "assets", "media");
  const start = Math.round(CARD.clip[0] * FPS), n = Math.round(CARD.clip[1] * FPS);
  const seq = ["-framerate", String(FPS), "-i", join(RENDERS, `frames_${CARD.src}`, "%06d.jpg")];
  const crop = `crop=1080:${CARD.band[1]}:0:${CARD.band[0]}`;
  const webp = join(media, "card-motion-graphics.webp"), mp4 = join(media, "card-motion-graphics.mp4");
  run(["-framerate", String(FPS), "-start_number", String(Math.round(CARD.still * FPS)), "-i", join(RENDERS, `frames_${CARD.src}`, "%06d.jpg"),
    "-frames:v", "1", "-vf", `${crop},scale=960:600:flags=lanczos`, "-c:v", "libwebp", "-q:v", "72", "-y", webp]);
  run(["-framerate", String(FPS), "-start_number", String(start), ...seq.slice(2),
    "-frames:v", String(n), "-vf", `${crop},scale=640:400:flags=lanczos,fps=24,format=yuv420p`,
    "-c:v", "libx264", "-profile:v", "main", "-crf", "28", "-maxrate", "700k", "-bufsize", "1400k",
    "-an", "-movflags", "+faststart", "-y", mp4]);
  console.log(`card         ${kb(webp)} KB still, ${kb(mp4)} KB clip`);
}
if (args.includes("--card")) { card(); process.exit(0); }

mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), `bake_motion_${process.pid}`);
mkdirSync(tmp, { recursive: true });
const rows = [];
let total = 0;
for (const s of MAN.scenes) {
  if (ONLY && s.id !== ONLY) continue;
  if (DRY) { console.log(s.id, s.src, (s.to - s.from).toFixed(2)); continue; }
  const { mp4, dur } = clip(s);
  const webp = poster(s, dur);
  total += statSync(mp4).size + statSync(webp).size;
  rows.push({ s, dur, cell: ONLY ? null : cell(s, dur, tmp) });
  console.log(`${s.id.padEnd(12)} ${dur.toFixed(2).padStart(6)} s  ${kb(mp4).padStart(6)} KB mp4  ${kb(webp).padStart(4)} KB poster`);
}
if (DRY || ONLY) process.exit(0);
card();

// ── THE SHEET ─────────────────────────────────────────────────────────────
// xstack lays the cells on one canvas in reading order, the order of the film
const n = rows.length, R = Math.ceil(n / COLS);
const layout = rows.map((_, i) => `${(i % COLS) * CW}_${Math.floor(i / COLS) * CH}`).join("|");
const sheet = join(OUT, "sheet.mp4");
const sheetIn = rows.flatMap((r) => ["-i", r.cell]);
// the grid's empty cells stay black; pad makes the canvas whole
run([...sheetIn, "-filter_complex",
  `${rows.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${n}:layout=${layout}:fill=black,` +
  `pad=${COLS * CW}:${R * CH}:0:0:black,format=yuv420p[o]`,
  "-map", "[o]", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", String(CRF + 1),
  "-maxrate", "6000k", "-bufsize", "12000k", "-g", String(FPS), "-an", "-movflags", "+faststart", "-y", sheet]);
run(["-i", sheet, "-frames:v", "1", "-c:v", "libwebp", "-q:v", "70", "-y", join(OUT, "sheet.webp")]);
total += statSync(sheet).size + statSync(join(OUT, "sheet.webp")).size;
rmSync(tmp, { recursive: true, force: true });
console.log(`sheet        ${COLS}x${R} cells of ${CW}x${CH}  ${kb(sheet)} KB`);
console.log(`total        ${(total / 1048576).toFixed(1)} MB`);

// ── THE GENERATED MODULE ──────────────────────────────────────────────────
const lines = rows.map((r, i) => `import v${i} from "../assets/motion/${r.s.id}.mp4?url";\n` +
  `import p${i} from "../assets/motion/${r.s.id}.webp?url";`).join("\n");
const table = rows.map((r, i) => `  ${JSON.stringify(r.s.id)}: { video: v${i}, poster: p${i}, dur: ${r.dur.toFixed(3)}, cell: ${i} }`).join(",\n");
writeFileSync(GEN, `// motionassets.js — GENERATED by tools/bake_motion.mjs. DO NOT EDIT.
// The scenes' video, posters and their cells on the contact sheet, keyed by the
// ids in tools/motion/scenes.json. The WORDS for each scene live in
// site/motion.js, which is hand-written (and edited by the editor).
${lines}
import sheet from "../assets/motion/sheet.mp4?url";
import sheetStill from "../assets/motion/sheet.webp?url";

export const SHEET = { video: sheet, still: sheetStill, cols: ${COLS}, rows: ${R}, cw: ${CW}, ch: ${CH}, period: ${2 * LOOP_HALF} };
export const CLIPS = {
${table}
};
`);
console.log("wrote src/site/motionassets.js");
