// bake_photos.mjs — THE PHOTOS CARD'S PICTURES, STRAIGHT OFF A PHONE
//
//   node tools/bake_photos.mjs           # photos-source/{reel,photography} -> the site
//   node tools/bake_photos.mjs --dry     # say what it would do, write nothing
//
// Drop pictures into photos-source/reel/ (the strip of life across the top of
// the card) or photos-source/photography/ (the work, hung below it), exactly
// as they come off the iPhone -- HEIC, JPEG, PNG, ProRAW -- and run this. It
// writes src/assets/photos/ and src/site/photoassets.js, which are generated;
// the source folder is ignored by git and never shipped.
//
// WHAT HAPPENS TO EACH ONE
//   1. sips (macOS's own image tool, so no new dependency) reads it: it is the
//      only thing here that decodes HEIC -- ffmpeg-static 6.0 cannot -- and it
//      converts the phone's Display P3 into sRGB, because ffmpeg ignores colour
//      profiles and a P3 picture read as sRGB comes out washed and flat.
//   2. ffmpeg turns it the right way up (it applies the EXIF orientation; a
//      phone stores every portrait sideways), scales it, and writes WebP.
//   3. EVERYTHING THE PHONE WROTE INTO THE FILE IS DROPPED: GPS position,
//      time, camera, lens, the lot. An iPhone puts where you were standing in
//      every picture it takes, and a portfolio is public. Checked: the output
//      carries no EXIF block at all (-map_metadata -1, and the WebP writer
//      never copies one).
//   4. A reel picture is also PRINTED -- see riso() below.
//
// Sizes are by the LONG edge, 640 / 1280 / 2048, never upscaled: 640 for the
// strip and the phone's column, 1280 for a desktop column, 2048 for the viewer
// on a large screen. The page picks with srcset.
//
// ORDER: newest first, by the date the picture was taken (sips reads it from
// the file) and then by name, which on an iPhone is the order they were shot.
// Rename or re-date a file to move it.
//
// It only encodes what changed (an output newer than its source is kept), and
// it removes the outputs of any picture that is no longer in the source
// folder, so the folder IS the list.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, unlinkSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "photos-source");
const OUT = join(ROOT, "src", "assets", "photos");
const MANIFEST = join(ROOT, "src", "site", "photoassets.js");
const SETS = ["reel", "photography"];
const EDGES = [640, 1280, 2048];
const QUALITY = 80;
const TAKE = new Set([".heic", ".heif", ".jpg", ".jpeg", ".png", ".dng", ".tif", ".tiff", ".webp"]);
const SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc";
const dry = process.argv.includes("--dry");

// ── THE PRINT ─────────────────────────────────────────────────────────────
// The strip is printed until you look at it (the card's CSS brings the
// photograph up under the pointer). Printed with the SKY's own press, so it
// is the same object as the sheet it sits on, not a filter over a photo: the
// constants are pressgl.js's -- ink A on a 45 degree screen, ink B on 15, a
// 5.2 px ruling, plate B out of register by (1, -0.7), the same dot-radius
// curve -- and the inks are the home sheet's, from site/palette.js.
//
// What each plate carries is the sky's split too. Ink A is the dark (the
// sky's dA = (1 - L)^1.08); ink B is the shadow's share at 0.52 -- the two
// overprint to the sky's plum-navy night -- plus the picture's own WARMTH,
// so skin and lamplight print rose where the sky's glow would.
//
// Baked at twice the size the strip shows it (RISO_H), so the ruling here is
// doubled and the dots land on the screen at the sky's own pitch.
const RISO_H = 480;                  // 2 x the strip's 240 design px
const RULING = 5.2 * 2;
const ANG_A = Math.PI / 4, ANG_B = Math.PI / 12;
const REG = [1 * 2, -0.7 * 2];
const PALETTE = readFileSync(join(ROOT, "src", "site", "palette.js"), "utf8");
const hex = (name) => {
  const m = PALETTE.match(new RegExp(`${name}:\\s*"#([0-9A-Fa-f]{6})"`));
  if (!m) throw new Error(`palette.js has no ${name}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
};
const INK_A = hex("homeInkA"), INK_B = hex("homeInkB"), PAPER = hex("paper");
const rad = (d) => Math.sqrt(d) * (0.5642 + 0.1429 * d * d * d);
function dot(d, x, y, ang) {
  if (d <= 0.001) return 0;
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = (x * c + y * s) / RULING, py = (-x * s + y * c) / RULING;
  const ex = px - Math.floor(px) - 0.5, ey = py - Math.floor(py) - 0.5;
  return Math.min(1, Math.max(0, (rad(d) - Math.hypot(ex, ey)) * RULING + 0.5));
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function riso(rgb, w, h) {
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = rgb[i] / 255, g = rgb[i + 1] / 255, b = rgb[i + 2] / 255;
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const dA = Math.pow(1 - L, 1.08) * 0.985;
      const dB = Math.min(1, smooth(0.62, 1, 1 - L) * 0.52 + Math.max(0, r - b) * 0.55 * (1 - L * 0.6));
      const cA = dot(dA, x, y, ANG_A), cB = dot(dB, x + REG[0], y + REG[1], ANG_B);
      for (let k = 0; k < 3; k++) {
        out[i + k] = Math.round(255 * PAPER[k] * (1 + (INK_A[k] - 1) * cA) * (1 + (INK_B[k] - 1) * cB));
      }
    }
  }
  return out;
}

// ── THE TOOLS ────────────────────────────────────────────────────────────
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1 << 28, ...opts });
const sizeOf = (file) => {
  // ffmpeg prints the stream's size and exits non-zero with no output named
  let err = "";
  try { run(ffmpeg, ["-hide_banner", "-i", file]); } catch (e) { err = String(e.stderr); }
  const m = err.match(/Video:[^\n]*?(\d{2,5})x(\d{2,5})/);
  if (!m) throw new Error(`could not read the size of ${file}`);
  return [Number(m[1]), Number(m[2])];
};
const takenAt = (file) => {
  try {
    const m = String(run("sips", ["-g", "creation", file])).match(/creation:\s*(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  } catch {}
  return statSync(file).mtimeMs;
};
// a name for the web: the file's own name, lower case, nothing but letters,
// digits and dashes (an iPhone's IMG_4821 -> img-4821)
const idOf = (set, file) => `${set}-${basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

// ── THE RUN ──────────────────────────────────────────────────────────────
if (!dry) mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), `bake-photos-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const keep = new Set();
const lists = {};
let made = 0, kept = 0;

try {
  for (const set of SETS) {
    const dir = join(SRC, set);
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => TAKE.has(extname(f).toLowerCase()) && !f.startsWith(".")) : [];
    const items = files.map((f) => ({ file: join(dir, f), id: idOf(set, f) }));
    const seen = new Map();
    for (const it of items) {
      if (seen.has(it.id)) throw new Error(`${basename(it.file)} and ${basename(seen.get(it.id))} would both be called ${it.id}: rename one`);
      seen.set(it.id, it.file);
      it.at = takenAt(it.file);
    }
    items.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));

    lists[set] = [];
    for (const it of items) {
      const outs = EDGES.map((e) => join(OUT, `${it.id}-${e}.webp`));
      if (set === "reel") outs.push(join(OUT, `${it.id}-print.webp`));
      outs.forEach((o) => keep.add(basename(o)));
      const srcT = statSync(it.file).mtimeMs;
      const fresh = outs.every((o) => existsSync(o) && statSync(o).mtimeMs >= srcT);
      if (dry) { console.log(`${fresh ? "keep" : "make"}  ${it.id}`); lists[set].push({ id: it.id, w: 0, h: 0 }); continue; }

      if (!fresh) {
        // 1. sips: decode anything, into sRGB, as a JPEG ffmpeg can read.
        //    Capped at 4096 on the long edge first -- a 48 MP frame is 8064
        //    wide and nothing here needs more than half of it.
        //    (-Z only when it IS bigger: sips scales UP to the number as well)
        const mid = join(tmp, `${it.id}.jpg`);
        const dims = String(run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", it.file])).match(/\d+/g).slice(-2).map(Number);
        run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "best",
          ...(Math.max(...dims) > 4096 ? ["-Z", "4096"] : []),
          ...(existsSync(SRGB) ? ["-m", SRGB] : []), it.file, "--out", mid]);
        // 2 + 3. upright, scaled, and stripped
        for (const e of EDGES) {
          const fit = `scale='if(gte(iw,ih),min(${e},iw),-2)':'if(gte(iw,ih),-2,min(${e},ih))':flags=lanczos`;
          run(ffmpeg, ["-y", "-v", "error", "-i", mid, "-map_metadata", "-1", "-vf", fit,
            "-c:v", "libwebp", "-quality", String(QUALITY), "-compression_level", "6", join(OUT, `${it.id}-${e}.webp`)]);
        }
        // 4. the print, for the strip
        if (set === "reel") {
          const raw = join(tmp, `${it.id}.rgb`), prn = join(tmp, `${it.id}.print.rgb`);
          run(ffmpeg, ["-y", "-v", "error", "-i", mid, "-vf", `scale=-2:${RISO_H}:flags=lanczos`, "-f", "rawvideo", "-pix_fmt", "rgb24", raw]);
          const w = Math.round(readFileSync(raw).length / 3 / RISO_H);
          writeFileSync(prn, riso(readFileSync(raw), w, RISO_H));
          run(ffmpeg, ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${w}x${RISO_H}`, "-i", prn,
            "-map_metadata", "-1", "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6", join(OUT, `${it.id}-print.webp`)]);
        }
        made++;
      } else kept++;
      // the shape, from the LARGEST picture as written (the right way up):
      // the page works out every smaller one's width from it, for srcset
      const [w, h] = sizeOf(join(OUT, `${it.id}-${EDGES[EDGES.length - 1]}.webp`));
      lists[set].push({ id: it.id, w, h });
    }
  }

  if (!dry) {
    // the folder is the list: an output nobody asked for this time goes
    for (const f of readdirSync(OUT)) if (f.endsWith(".webp") && !keep.has(f)) unlinkSync(join(OUT, f));
    writeFileSync(MANIFEST, manifest(lists));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(dry ? "(dry run, nothing written)" : `photos: ${made} made, ${kept} kept -> src/assets/photos, src/site/photoassets.js`);

function manifest(lists) {
  const lines = [], imports = [];
  let n = 0;
  const entry = (set, p) => {
    const srcs = EDGES.map((e) => { const v = `i${n++}`; imports.push(`import ${v} from "../assets/photos/${p.id}-${e}.webp?url";`); return `${e}: ${v}`; });
    let print = "";
    if (set === "reel") { const v = `i${n++}`; imports.push(`import ${v} from "../assets/photos/${p.id}-print.webp?url";`); print = `, print: ${v}`; }
    return `  { id: "${p.id}", w: ${p.w}, h: ${p.h}, src: { ${srcs.join(", ")} }${print} }`;
  };
  for (const set of SETS) {
    lines.push(`export const ${set.toUpperCase()} = [\n${(lists[set] || []).map((p) => entry(set, p)).join(",\n")}\n];`);
  }
  return `// photoassets.js — GENERATED by tools/bake_photos.mjs. DO NOT EDIT.
// The photos card's pictures, newest first: w and h are the largest copy's
// size the right way up, src is one URL per long edge (${EDGES.join(" / ")}),
// and a reel picture also has its print. Add or remove pictures by adding or
// removing them in photos-source/ and running the tool again.
${imports.join("\n")}

${lines.join("\n\n")}
`;
}
