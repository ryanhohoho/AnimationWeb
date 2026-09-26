// credits.mjs — THE PIECE'S CREDITS, PER SCENE, FOR THE MOTION-GRAPHICS PAGE
//
//   node tools/motion/credits.mjs <path to VisualAudialExperience/CREDITS.md>
//
// "let me be a flower" is built out of archival and CC-licensed media, and a
// CC BY / BY-SA licence asks for its credit to travel with the work wherever the
// work is published. The page publishes it, so the page carries the credits:
// all of them in a folded colophon, and in the viewer each scene names the
// sources it is made of.
//
// CREDITS.md is the one list and it lives in that project; this reads it rather
// than copying it by hand, so a re-run brings the page back in step. What this
// file adds is the one thing CREDITS.md does not say in a form a program can
// read: which of the page's scenes each row is IN. That is the RULES table below,
// matched against each row's "used in" column, in order, first match wins, and a
// row that says "same" takes the scenes of the row above it.
//
// Rows that OPEN with "(no longer in the cut)" or "(unused fallback" are
// skipped: they are not in anything this page shows.
//
// Writes src/site/motioncredits.js (GENERATED).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = process.argv[2];
if (!src) { console.error("usage: node tools/motion/credits.mjs <CREDITS.md>"); process.exit(1); }
const md = readFileSync(src, "utf8");

const FLOWER = Array.from({ length: 21 }, (_, i) => `flower-${String(i + 1).padStart(2, "0")}`);
const PHOTO_CUTS = ["flower-01", "flower-02", "flower-03", "flower-04", "flower-06", "flower-08",
  "flower-10", "flower-11", "flower-13", "flower-15", "flower-17", "flower-19", "flower-21"];   // the cuts that are the photograph
const MONTAGE = ["wings", "credits", "turn", "tower", "providence", "particles", "chrome", "moire", "topo", "radar",
  "poster", "pool", "desktop", "angels"];

// [pattern on "used in" (lower case), scene ids]. First match wins.
const RULES = [
  // the rows that span several scenes come first, or a narrower rule below takes them
  [/god's voice, cut off/, ["watch", "world", "like", ...MONTAGE, "lonely"]],
  [/"we live\." \/ \(remembered/, ["factory", "lonely"]],
  [/"and with eyes like mine" \/ "so we made company\."/, ["like", "company", "moire", "angels"]],
  [/"a flower\."|bloom montage/, [...PHOTO_CUTS, "watch", "particles", "poster"]],
  // the Earth is also the radar's disc and a poster tile; the whale's close-up is a poster tile too
  [/^"a world\." \(the earth\)/, ["world", "radar", "poster"]],
  [/^"a world\."/, ["world"]],
  [/grew lonely/, ["whale"]],
  [/a tile in the poster/, ["poster"]],
  [/^"watch"/, ["watch"]],
  [/petal arrangement of the daisy/, ["company"]],
  [/iron filings|^"they took my devices"$|^"called them science\."$/, ["poster"]],
  [/"but despite their complexes"/, ["topo"]],
  [/"i never once expected/, ["providence"]],
  [/"they would stare back\."/, ["gaze", "company"]],
  [/^"we live\."/, ["factory"]],
  [/^"we disagree\."/, ["boxers"]],
  [/^"we end\."/, ["poppies"]],
  [/devices montage: wings/, ["wings", "angels"]],
  [/the sky, tiled|turn in the sky/, ["firmament", "turn"]],
  [/radio telescope/, ["tower"]],
  [/^the angels/, ["angels"]],
  [/^the pool and "my world"/, ["pool", "desktop"]],
  [/^the pool/, ["pool"]],
  [/^"we survive\."/, ["undercroft"]],
  // sound
  [/narrator's typing/, []],                         // the takes carry no words, so no keys: the film only
  [/the loneliest whale/, ["whale"]],
  [/"so he made company\." \(the empty hall\)/, ["alone"]],
  [/the hallway \/ the empty hall/, ["hallway", "alone"]],
  [/"we were lonely\." \(the flower's motif/, ["lonely"]],
  [/"we built above his heavens\."/, ["towers"]],
  [/^"we were lonely\."$/, ["lonely"]],
];

const cells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
const plain = (s) => s.replace(/\*/g, "").replace(/`/g, "");
const link = (s) => { const m = s.match(/\((https?:[^)]+)\)/); return m ? m[1] : null; };

const out = [];
let section = null, last = [];
for (const line of md.split("\n")) {
  const h = line.match(/^## (.+)/);
  if (h) { section = h[1].trim(); continue; }
  if (!line.startsWith("| ") || /^\|\s*(Used in|---)/.test(line)) continue;
  const c = cells(line);
  if (c.length < 5) continue;
  const used = c[0];
  // skipped only when the row itself says so up front: the X-ray row mentions
  // a scene of its own that is no longer in the cut, and is still a poster tile
  if (/^\((no longer in the cut|unused fallback)/i.test(used)) continue;
  const u = used.toLowerCase();
  let ids = null;
  if (/^same\b/.test(u)) ids = last;
  else for (const [re, list] of RULES) if (re.test(u)) { ids = list; break; }
  if (!ids) { console.warn("no rule for:", used.slice(0, 90)); ids = []; }
  last = ids;
  // the whale's close-up is also a tile on the poster (CREDITS.md says so in prose, under the table)
  if (/48771144812/.test(c[1])) ids = [...ids, "poster"];
  out.push({ kind: section === "Sound" ? "sound" : "image", used: plain(used), work: plain(c[1]),
    author: plain(c[2]), licence: plain(c[3]), url: link(c[4]), in: ids });
}

writeFileSync(join(ROOT, "src", "site", "motioncredits.js"),
`// motioncredits.js — GENERATED by tools/motion/credits.mjs from the piece's own
// CREDITS.md. DO NOT EDIT: fix CREDITS.md (or the rules in the tool) and re-run.
// \`in\` lists the scenes of the motion-graphics page a source appears in; the
// full film carries every one of them.
export const CREDITS = ${JSON.stringify(out, null, 1)};

`);
console.log(`${out.length} rows -> src/site/motioncredits.js`);
