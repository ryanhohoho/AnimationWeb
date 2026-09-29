// bake_photos.mjs — THE PHOTOS CARD'S PICTURES, STRAIGHT OFF A PHONE
//
//   npm run photos                       # photos-source/{reel,photography} -> the folders
//   node tools/bake_photos.mjs --dry     # say what it would do, write nothing
//   node tools/bake_photos.mjs --prune   # also remove pictures whose original is gone
//   node tools/bake_photos.mjs --restore # bring back pictures you removed on purpose
//   node tools/bake_photos.mjs --all     # re-encode everything
//
// Drop pictures into photos-source/reel/ (the small prints in the margins of the
// card) or photos-source/photography/ (the block in the middle), exactly as they
// come off the iPhone -- HEIC, JPEG, PNG, ProRAW -- and run this.
//
// IT WRITES PICTURES AND NOTHING ELSE. The site reads src/assets/photos/reel/
// and src/assets/photos/photography/ as they are (site/photoassets.js is a
// glob, not a list), so there is no code here to keep in step: a picture
// deleted from a folder is gone from the page, one added is on it. Nothing is
// generated, nothing is imported by name, and nothing breaks when a file is
// missing. The tool exists only because a browser cannot show a HEIC.
//
// You do not need the tool at all for a picture that is already a WebP, JPEG
// or PNG a browser can show: copy it into the folder. Name it
// `<name>_<width>x<height>.webp` if you can (the page learns a picture's shape
// from its name, so nothing moves when it arrives); without that it is taken
// as 3:4 until the browser has read it.
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
//   4. Its shape and how light it is are put in the name:
//        <id>_<width>x<height>_l<0-100>_<long edge>.webp
//      The page lays itself out from the shape; from the lightness it puts the
//      bright pictures where it wants something large.
//
// Long edges: 640 / 1280 / 2048 for both, and 320 as well for the reel (its
// prints in the margins are ~100 px wide, and there are fifty of them: 320 is
// what makes that page light). Never upscaled.
//
// WHAT IT KEEPS AND WHAT IT LEAVES. A picture already made is kept (its outputs
// are newer than the original). A picture you REMOVED from the site's folder
// while its original is still in photos-source/ is not made again: that is what
// photos-source/.baked is for -- the tool remembers what it has made, and
// an original it remembers with no picture is one you took out. --restore
// brings those back; deleting the original is the other way to be rid of it.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, unlinkSync, readFileSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "photos-source");
const OUT = join(ROOT, "src", "assets", "photos");
const LEDGER = join(SRC, ".baked");
const SETS = { reel: [320, 640, 1280, 2048], photography: [640, 1280, 2048] };
const QUALITY = { 320: 78, 640: 80, 1280: 80, 2048: 80 };
const TAKE = new Set([".heic", ".heif", ".jpg", ".jpeg", ".png", ".dng", ".tif", ".tiff", ".webp"]);
const SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc";
const args = new Set(process.argv.slice(2));
const dry = args.has("--dry"), prune = args.has("--prune"), restore = args.has("--restore"), all = args.has("--all");

// ── THE TOOLS ────────────────────────────────────────────────────────────
const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1 << 28, ...opts });
const sizeOf = (file) => {
  // ffmpeg prints the stream's size and exits non-zero with no output named
  let err = "";
  try { run(ffmpeg, ["-hide_banner", "-i", file]); } catch (e) { err = String(e.stderr); }
  const m = err.match(/Video:[^\n]*?(\d{2,5})x(\d{2,5})/);
  if (!m) throw new Error(`could not read the size of ${file}`);
  return [Number(m[1]), Number(m[2])];
};
/** how light a picture is, 0 to 100: its average, in the same gamma the eye is shown it in */
const toneOf = (file) => {
  const b = run(ffmpeg, ["-v", "error", "-i", file, "-vf", "scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  return Math.round((0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]) / 2.55);
};
// a name for the web: the file's own name, lower case, nothing but letters,
// digits and dashes (an iPhone's IMG_4821 -> img-4821)
const idOf = (file) => basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const OUTNAME = /^(.+?)_(\d+)x(\d+)(?:_l\d+)?_(\d{3,4})\.webp$/;
/** the pictures already in a set's folder, by id -> [file names] */
function existing(dir) {
  const by = new Map();
  if (!existsSync(dir)) return by;
  for (const f of readdirSync(dir)) {
    const m = OUTNAME.exec(f) || /^(.+?)\.webp$/.exec(f);
    if (m) (by.get(m[1]) || by.set(m[1], []).get(m[1])).push(f);
  }
  return by;
}

// ── THE RUN ──────────────────────────────────────────────────────────────
const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : {};
const tmp = join(tmpdir(), `bake-photos-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const report = { made: 0, kept: 0, skipped: [], pruned: 0 };

try {
  for (const [set, edges] of Object.entries(SETS)) {
    const dir = join(SRC, set), out = join(OUT, set);
    if (!dry) mkdirSync(out, { recursive: true });
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => TAKE.has(extname(f).toLowerCase()) && !f.startsWith(".")) : [];
    const items = files.map((f) => ({ file: join(dir, f), id: idOf(f) }));
    const seen = new Map();
    for (const it of items) {
      if (seen.has(it.id)) throw new Error(`${basename(it.file)} and ${basename(seen.get(it.id))} would both be called ${it.id}: rename one`);
      seen.set(it.id, it.file);
    }
    const have = existing(out);
    const known = new Set(ledger[set] || []);

    for (const it of items) {
      const mine = have.get(it.id) || [];
      const srcT = statSync(it.file).mtimeMs;
      const complete = edges.every((e) => mine.some((f) => f.endsWith(`_${e}.webp`)));
      const fresh = complete && mine.every((f) => statSync(join(out, f)).mtimeMs >= srcT);
      if (!mine.length && known.has(it.id) && !restore && !all) { report.skipped.push(`${set}/${it.id}`); continue; }
      if (fresh && !all) { report.kept++; known.add(it.id); continue; }
      if (dry) { console.log(`make  ${set}/${it.id}`); report.made++; continue; }

      // 1. sips: decode anything, into sRGB, as a JPEG ffmpeg can read.
      //    Capped at 4096 on the long edge first -- a 48 MP frame is 8064
      //    wide and nothing here needs more than half of it.
      //    (-Z only when it IS bigger: sips scales UP to the number as well)
      const mid = join(tmp, `${set}-${it.id}.jpg`);
      const dims = String(run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", it.file])).match(/\d+/g).slice(-2).map(Number);
      run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "best",
        ...(Math.max(...dims) > 4096 ? ["-Z", "4096"] : []),
        ...(existsSync(SRGB) ? ["-m", SRGB] : []), it.file, "--out", mid]);
      // 2 + 3. upright, scaled, and stripped -- into the temp folder first: the
      // name needs the picture's real shape, which is only known once it is written
      const made = [];
      for (const e of edges) {
        const fit = `scale='if(gte(iw,ih),min(${e},iw),-2)':'if(gte(iw,ih),-2,min(${e},ih))':flags=lanczos`;
        const to = join(tmp, `${set}-${it.id}-${e}.webp`);
        run(ffmpeg, ["-y", "-v", "error", "-i", mid, "-map_metadata", "-1", "-vf", fit,
          "-c:v", "libwebp", "-quality", String(QUALITY[e]), "-compression_level", "6", to]);
        made.push([e, to]);
      }
      // 4. its shape (the largest copy, the right way up) and its lightness
      const [w, h] = sizeOf(made[made.length - 1][1]);
      const l = toneOf(made.find(([e]) => e === 640)?.[1] || made[0][1]);
      for (const f of mine) unlinkSync(join(out, f));                       // the old copies, whatever they were called
      for (const [e, from] of made) renameSync(from, join(out, `${it.id}_${w}x${h}_l${l}_${e}.webp`));
      known.add(it.id);
      report.made++;
    }

    // --prune: the folder follows the originals, as it used to
    if (prune) {
      for (const [id, fs] of have) {
        if (seen.has(id)) continue;
        for (const f of fs) { if (!dry) unlinkSync(join(out, f)); }
        report.pruned++;
        known.delete(id);
        console.log(`${dry ? "would remove" : "removed"}  ${set}/${id}`);
      }
    }
    ledger[set] = [...known].sort();
  }
  if (!dry) writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + "\n");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
for (const s of report.skipped) console.log(`skipped  ${s}  (removed from the site earlier; --restore brings it back)`);
console.log(dry ? "(dry run, nothing written)"
  : `photos: ${report.made} made, ${report.kept} kept${report.skipped.length ? `, ${report.skipped.length} skipped` : ""}${prune ? `, ${report.pruned} pruned` : ""} -> src/assets/photos/{reel,photography}`);
