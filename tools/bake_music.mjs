// bake_music.mjs — THE ABOUT CARD'S ALBUM COVERS, FROM SPOTIFY LINKS
//
//   npm run music                    # src/site/music.js -> src/assets/music/
//   node tools/bake_music.mjs --all  # fetch every cover again
//   node tools/bake_music.mjs --dry  # say what it would do, write nothing
//
// src/site/music.js is a hand-written list of Spotify links. For each one this
// asks Spotify's public oEmbed endpoint (no account, no key) for the album's
// name and cover, takes the 640 px cover where Spotify has one (the oEmbed
// thumbnail is 300 px; the 640 is the same image id with a different size
// code), and writes
//
//   src/assets/music/<id>.webp     480 px, the wheel's largest cover is ~190
//                                  design px, so 480 holds a 2.5x screen
//   src/assets/music/albums.json   { "<id>": { "title": "...", "released": "YYYY-MM-DD" } }
//
// The release date is not in the oEmbed answer, so it is read from the
// album's own public page, the music:release_date tag in its head (the one a
// link preview reads). The wheel orders the albums by it (music.js, byRelease).
//
// Both are GENERATED: the page reads them through a glob, so a cover that is
// missing is a blank sleeve, not an error. A cover already made is kept.
// Covers whose album has left music.js are removed.
//
// The links are read out of music.js as TEXT, not imported: that module is the
// page's, and it uses import.meta.glob, which only exists inside Vite.
//
// It exits non-zero if any link could not be fetched, rather than printing a
// warning nobody reads.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIST = join(ROOT, "src", "site", "music.js");
const OUT = join(ROOT, "src", "assets", "music");
const NAMES = join(OUT, "albums.json");
const EDGE = 480;
const args = new Set(process.argv.slice(2));
const dry = args.has("--dry"), all = args.has("--all");

// the same pattern as spotifyId() in music.js
const LINK = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(album|track|playlist|artist)\/([A-Za-z0-9]{10,40})/;
// only the lines that are entries: a commented-out example is not an album
const src = readFileSync(LIST, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const items = [...src.matchAll(/spotify\s*:\s*["'`]([^"'`]+)["'`]/g)]
  .map((m) => LINK.exec(m[1])).filter(Boolean).map((m) => ({ kind: m[1], id: m[2] }));

const names = existsSync(NAMES) ? JSON.parse(readFileSync(NAMES, "utf8")) : {};
if (!dry) mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), `bake-music-${process.pid}`);
mkdirSync(tmp, { recursive: true });

const failed = [];
let made = 0, kept = 0;
// the album's release date, from its public page's music:release_date tag
async function released(it) {
  const res = await fetch(`https://open.spotify.com/${it.kind}/${it.id}`, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`album page answered ${res.status}`);
  const m = /music:release_date"\s+content="(\d{4}(?:-\d{2}(?:-\d{2})?)?)"/.exec(await res.text());
  if (!m) throw new Error("no release date on the album page");
  return m[1];
}

for (const it of items) {
  const file = join(OUT, `${it.id}.webp`);
  if (!all && existsSync(file) && names[it.id]) {
    // made before dates were kept: fetch only the date
    if (!names[it.id].released && !dry) {
      try { names[it.id].released = await released(it); } catch (e) { failed.push(`${it.kind}/${it.id}: ${e.message}`); }
    }
    kept++; continue;
  }
  if (dry) { console.log(`fetch  ${it.kind}/${it.id}`); made++; continue; }
  try {
    const page = `https://open.spotify.com/${it.kind}/${it.id}`;
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(page)}`);
    if (!res.ok) throw new Error(`oEmbed answered ${res.status}`);
    const o = await res.json();
    if (!o.thumbnail_url) throw new Error("no cover in the answer");
    // 00001e02 is Spotify's 300 px size code and b273 its 640: same picture
    const big = o.thumbnail_url.replace("00001e02", "0000b273");
    let img = await fetch(big);
    if (!img.ok) img = await fetch(o.thumbnail_url);
    if (!img.ok) throw new Error(`cover answered ${img.status}`);
    const raw = join(tmp, `${it.id}.jpg`);
    writeFileSync(raw, Buffer.from(await img.arrayBuffer()));
    execFileSync(ffmpeg, ["-y", "-v", "error", "-i", raw, "-map_metadata", "-1",
      "-vf", `scale='min(${EDGE},iw)':-2:flags=lanczos`, "-c:v", "libwebp", "-quality", "82", file]);
    names[it.id] = { title: String(o.title || ""), released: await released(it) };
    made++;
    console.log(`made   ${it.id}  ${names[it.id].title}`);
  } catch (e) {
    failed.push(`${it.kind}/${it.id}: ${e.message}`);
  }
}

// the folder follows the list
const want = new Set(items.map((i) => i.id));
for (const f of existsSync(OUT) ? readdirSync(OUT) : []) {
  const id = f.endsWith(".webp") ? f.slice(0, -5) : null;
  if (id && !want.has(id)) { if (!dry) unlinkSync(join(OUT, f)); console.log(`${dry ? "would remove" : "removed"}  ${id}`); }
}
for (const id of Object.keys(names)) if (!want.has(id)) delete names[id];
if (!dry) writeFileSync(NAMES, JSON.stringify(names, null, 1) + "\n");
try { execFileSync("rm", ["-rf", tmp]); } catch { /* temp */ }

console.log(dry ? "(dry run, nothing written)" : `music: ${made} made, ${kept} kept -> src/assets/music/`);
if (failed.length) {
  for (const f of failed) console.error(`FAILED ${f}`);
  process.exit(1);
}
