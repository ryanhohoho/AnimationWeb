// bake_motion.mjs — THE MOTION-GRAPHICS PAGE'S VIDEO
//
//   node tools/bake_motion.mjs --renders <dir> [--only <id>[,<id>…]] [--crf 27] [--dry]
//   node tools/bake_motion.mjs --add <video> --id <id> [--from <s> --to <s>]
//   node tools/bake_motion.mjs --sheet
//   node tools/bake_motion.mjs --renders <dir> --card
//
// TWO STAGES, and the second needs nothing but this repository.
//
// 1 · A WORK'S CLIP. Each work on the page (pages/motion-graphics.js) is one
//     clip and one poster in src/assets/motion/, cut from wherever
//     tools/motion/scenes.json says: a stretch of one of the renders of "let me
//     be a flower" (--renders, made in a scratch copy of ../VisualAudialExperience,
//     never in it -- tools/motion/README.md), or any video file (--add, for a
//     work that is just a video). Nothing is recorded off a screen: the piece
//     renders itself offline, frame by frame, score and all.
//
// 2 · THE CONTACT SHEET (--sheet, and after every stage 1). Every tile on the
//     page that plays -- the featured wall, the scatter, the film -- plays out of
//     ONE video, because fifty <video> elements are fifty decoders and a phone
//     runs a handful. The sheet is cut from the clips stage 1 wrote, so adding
//     a work never needs the renders again. Which works get a tile is read off
//     site/motion.js (its "top" and "mix" works, and the film); the flower's
//     run shows its posters and one live clip instead (site/motionBloom.js).
//
// WHAT COMES OUT, in src/assets/motion/:
//   <id>.mp4       720x1560 H.264 + AAC, a keyframe every HALF SECOND (-g 15).
//                  The viewer scrubs, and a seek decodes from the keyframe before
//                  it: at 15 frames that is instant everywhere, where the
//                  encoder's default (250) is a visible stall per step.
//   <id>.webp      the poster: the frame the viewer shows before the clip has a
//                  frame of its own, and what reduced motion sees
//   sheet.mp4      every tile, 2.5 s from the middle of its clip played forward
//                  and then back (a boomerang), so every tile loops without a
//                  seam on one shared 5 s period
//   sheet.webp     the sheet's first frame, for the moment before it plays
//   src/site/motionassets.js   GENERATED: urls, durations, the sheet's grid.
//
// ffmpeg-static is the only I/O, exactly as in the other bake tools.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "assets", "motion");
const GEN = join(ROOT, "src", "site", "motionassets.js");
const MANIFEST = join(ROOT, "tools", "motion", "scenes.json");
const MAN = JSON.parse(readFileSync(MANIFEST, "utf8"));
const FPS = MAN.fps;

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const RENDERS = arg("--renders", null);
const ONLY = arg("--only", null)?.split(",") ?? null;
const ADD = arg("--add", null);
const CRF = Number(arg("--crf", 27));
const DRY = args.includes("--dry");
const SHEET_ONLY = args.includes("--sheet");
if (!RENDERS && !ADD && !SHEET_ONLY) {
  console.error("usage: node tools/bake_motion.mjs --renders <dir> | --add <video> --id <id> | --sheet   (see the head of this file)");
  process.exit(1);
}

// ── THE FRAME ──────────────────────────────────────────────────────────────
// 720 x 1560 is the stage's 9:19.5 at two thirds: a phone shows it edge to edge
// at about its own pixel density, and a desktop shows it at most ~900 px tall.
const W = 720, H = 1560;
// the sheet's tiles: 9:19.5 again. 240 wide because the featured wall draws a
// tile up to ~300 css px across; 8 across keeps the sheet's width under 2048,
// which is the widest a phone's hardware decoder is dependably given
const CW = 240, CH = 520, COLS = 8;
const LOOP_HALF = 2.5;           // seconds forward, then the same back

const run = (a) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...a],
  { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 26 });
const kb = (f) => (statSync(f).size / 1024).toFixed(0);

/** a clip's length, from its frames: the container's duration counts the audio's priming too */
function framesOf(file) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"], { encoding: "utf8" });
  const m = [...(r.stderr || "").matchAll(/frame=\s*(\d+)/g)].pop();
  if (!m) throw new Error(`could not count the frames of ${file}`);
  return Number(m[1]);
}

/** a source file's running time, off the container: for --add's default --to */
function durationOf(file) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = (r.stderr || "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) throw new Error(`could not read the length of ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// ── STAGE 1 · A WORK'S CLIP ────────────────────────────────────────────────

/** the ffmpeg inputs for one work's stretch of its source: video [0], audio [1] */
function inputs(s) {
  const dur = s.to - s.from;
  if (s.src === "film" || s.src === "file") {
    const f = s.src === "film" ? join(RENDERS, "film-full.mp4") : resolve(ROOT, s.file);
    return [["-ss", String(s.from), "-t", String(dur), "-i", f,
             "-ss", String(s.from), "-t", String(dur), "-i", f], dur, "1:a:0?"];
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
    // cover, not stretch: a video that is not 9:19.5 (--add) is cropped to it
    "-vf", `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fps=${FPS},format=yuv420p`,
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
  return mp4;
}

// the poster: the clip's middle frame (the film's: the whale, close), or the
// second scenes.json names as its "poster" (a work whose middle is a white
// flash or a torn frame), walked down a quality ladder to 70 KB. Cut from the CLIP just written, so a work
// from a file and a work from a render get the same treatment.
function poster(s, mp4) {
  const webp = join(OUT, `${s.id}.webp`);
  const at = (s.id === "film" ? 38.9 : s.poster ?? framesOf(mp4) / FPS / 2).toFixed(3);
  for (const q of [80, 72, 64, 56, 48]) {
    run(["-ss", at, "-i", mp4, "-frames:v", "1",
      "-vf", `scale=540:1170:flags=lanczos`, "-c:v", "libwebp", "-q:v", String(q), "-y", webp]);
    if (statSync(webp).size <= 70 * 1024) break;
  }
  return webp;
}

function bake(s) {
  const mp4 = clip(s);
  const webp = poster(s, mp4);
  console.log(`${s.id.padEnd(12)} ${(framesOf(mp4) / FPS).toFixed(2).padStart(6)} s  ${kb(mp4).padStart(6)} KB mp4  ${kb(webp).padStart(4)} KB poster`);
}

// ── THE PROJECTS CARD ─────────────────────────────────────────────────────
// The card on the projects deck is 16:10 like its two siblings (a 960x600
// still, a 6-second 640x400 hover clip at 24 fps, content.js reads them by
// name), and the piece is 9:19.5, so the card is a BAND of one work: the pool,
// across the Windows Photo Viewer, where the rhino passes through and is
// x-rayed to the skeleton inside it. Chosen by the owner (the pool rhino).
const CARD = { src: "montage", still: 90.5, clip: [88.5, 6], band: [1060, 675] };   // band: [top y, height] at 1080 wide
function card() {
  const media = join(ROOT, "src", "assets", "media");
  const start = Math.round(CARD.clip[0] * FPS), n = Math.round(CARD.clip[1] * FPS);
  const seq = join(RENDERS, `frames_${CARD.src}`, "%06d.jpg");
  const crop = `crop=1080:${CARD.band[1]}:0:${CARD.band[0]}`;
  const webp = join(media, "card-motion-graphics.webp"), mp4 = join(media, "card-motion-graphics.mp4");
  run(["-framerate", String(FPS), "-start_number", String(Math.round(CARD.still * FPS)), "-i", seq,
    "-frames:v", "1", "-vf", `${crop},scale=960:600:flags=lanczos`, "-c:v", "libwebp", "-q:v", "72", "-y", webp]);
  run(["-framerate", String(FPS), "-start_number", String(start), "-i", seq,
    "-frames:v", String(n), "-vf", `${crop},scale=640:400:flags=lanczos,fps=24,format=yuv420p`,
    "-c:v", "libx264", "-profile:v", "main", "-crf", "28", "-maxrate", "700k", "-bufsize", "1400k",
    "-an", "-movflags", "+faststart", "-y", mp4]);
  console.log(`card         ${kb(webp)} KB still, ${kb(mp4)} KB clip`);
}

// ── STAGE 2 · THE CONTACT SHEET, AND THE TABLE ────────────────────────────

// one tile: 2.5 s from the middle of the work's clip, forward then reversed
function tile(id, dur, tmp) {
  const out = join(tmp, `${id}.mp4`);
  const mid = id === "film" ? 38.9 : dur / 2;
  const len = Math.min(LOOP_HALF, dur);
  const from = Math.max(0, Math.min(dur - len, mid - len / 2));
  run(["-ss", from.toFixed(3), "-t", String(len), "-i", join(OUT, `${id}.mp4`),
    "-filter_complex", `[0:v]scale=${CW}:${CH}:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,fps=${FPS}[o]`,
    "-map", "[o]", "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", "-y", out]);
  return out;
}

async function sheet() {
  const { WORKS, FILM } = await import(pathToFileURL(join(ROOT, "src", "site", "motion.js")).href + `?t=${Date.now()}`);
  const baked = MAN.scenes.map((s) => s.id).filter((id) => existsSync(join(OUT, `${id}.mp4`)) && existsSync(join(OUT, `${id}.webp`)));
  const named = new Set([FILM.id, ...WORKS.map((w) => w.id)]);
  const unnamed = baked.filter((id) => !named.has(id)), missing = [...named].filter((id) => !baked.includes(id));
  if (unnamed.length) console.warn(`baked but not on the page (add a line to src/site/motion.js): ${unnamed.join(", ")}`);
  if (missing.length) { console.error(`on the page but not baked: ${missing.join(", ")}`); process.exit(1); }

  // the tiles: the film, then every work that plays in a tile, in page order
  const tiles = [FILM.id, ...WORKS.filter((w) => w.on.some((p) => p === "top" || p === "mix")).map((w) => w.id)];
  const dur = Object.fromEntries(baked.map((id) => [id, framesOf(join(OUT, `${id}.mp4`)) / FPS]));
  const tmp = join(tmpdir(), `bake_motion_${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const cells = tiles.map((id) => tile(id, dur[id], tmp));
  const n = cells.length, R = Math.ceil(n / COLS);
  const layout = cells.map((_, i) => `${(i % COLS) * CW}_${Math.floor(i / COLS) * CH}`).join("|");
  const out = join(OUT, "sheet.mp4");
  // the grid's empty cells stay black; pad makes the canvas whole
  run([...cells.flatMap((c) => ["-i", c]), "-filter_complex",
    `${cells.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${n}:layout=${layout}:fill=black,` +
    `pad=${COLS * CW}:${R * CH}:0:0:black,format=yuv420p[o]`,
    "-map", "[o]", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", String(CRF + 1),
    "-maxrate", "6000k", "-bufsize", "12000k", "-g", String(FPS), "-an", "-movflags", "+faststart", "-y", out]);
  run(["-i", out, "-frames:v", "1", "-c:v", "libwebp", "-q:v", "70", "-y", join(OUT, "sheet.webp")]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`sheet        ${n} tiles, ${COLS}x${R} of ${CW}x${CH}  ${kb(out)} KB`);

  let total = 0;
  for (const id of baked) total += statSync(join(OUT, `${id}.mp4`)).size + statSync(join(OUT, `${id}.webp`)).size;
  total += statSync(out).size + statSync(join(OUT, "sheet.webp")).size;
  console.log(`total        ${(total / 1048576).toFixed(1)} MB`);

  const cellOf = new Map(tiles.map((id, i) => [id, i]));
  const lines = baked.map((id, i) => `import v${i} from "../assets/motion/${id}.mp4?url";\n` +
    `import p${i} from "../assets/motion/${id}.webp?url";`).join("\n");
  const table = baked.map((id, i) => `  ${JSON.stringify(id)}: { video: v${i}, poster: p${i}, dur: ${dur[id].toFixed(3)}, cell: ${cellOf.has(id) ? cellOf.get(id) : -1} }`).join(",\n");
  writeFileSync(GEN, `// motionassets.js — GENERATED by tools/bake_motion.mjs. DO NOT EDIT.
// Every work's clip and poster, keyed by the ids in tools/motion/scenes.json,
// and its tile on the contact sheet (-1: it has no tile, it is only shown in
// the flower's run). The WORDS for each work, and where it is shown, live in
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
}

// ── WHAT THIS RUN DOES ────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });

if (args.includes("--card")) {
  if (!RENDERS) { console.error("--card needs --renders"); process.exit(1); }
  card(); process.exit(0);
}

if (ADD) {
  // A WORK THAT IS JUST A VIDEO: recorded into the manifest (so a later
  // --renders run re-cuts it the same way), baked, and the sheet rebuilt
  const id = arg("--id", null);
  if (!id || !/^[a-z0-9-]+$/.test(id)) { console.error("--add needs --id <lowercase-and-dashes>"); process.exit(1); }
  const file = resolve(ADD);
  if (!existsSync(file)) { console.error(`no such file: ${file}`); process.exit(1); }
  const from = Number(arg("--from", 0));
  const to = Number(arg("--to", durationOf(file)));
  const s = { id, src: "file", file: file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file, from, to };
  const at = MAN.scenes.findIndex((x) => x.id === id);
  if (at >= 0) MAN.scenes[at] = s; else MAN.scenes.push(s);
  writeFileSync(MANIFEST, JSON.stringify(MAN, null, 2).replace(/\{\n\s+("id"[^}]*?)\n\s+\}/g, (m, body) => `{ ${body.replace(/\n\s+/g, " ")} }`) + "\n");
  bake(s);
  await sheet();
  const { WORKS } = await import(pathToFileURL(join(ROOT, "src", "site", "motion.js")).href + `?t=${Date.now()}`);
  if (!WORKS.some((w) => w.id === id)) console.log(`\nnow add it to src/site/motion.js:\n  { id: "${id}", name: "…", on: ["mix"] },`);
  process.exit(0);
}

if (RENDERS) {
  for (const s of MAN.scenes) {
    if (ONLY && !ONLY.includes(s.id)) continue;
    if (DRY) { console.log(s.id, s.src, (s.to - s.from).toFixed(2)); continue; }
    bake(s);
  }
  if (DRY) process.exit(0);
  if (!ONLY) card();
}
await sheet();
