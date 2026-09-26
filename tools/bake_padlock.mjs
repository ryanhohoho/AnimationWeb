// bake_padlock.mjs — the confidential project's icon, from its grid
//
//   node tools/bake_padlock.mjs      -> tools/icons/icon-rcmp-encryption.png
//   node tools/bake_icons.mjs        -> then into the atlas, like every icon
//
// The drawing is src/site/padlock.js (PADLOCK); this renders it the way the
// motion page's flower icon was made: white cells on black, square, with a
// margin, at 32 px a cell so bake_icons has a clean edge to threshold.

import { writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";
import { PADLOCK } from "../src/site/padlock.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CELL = 32, SIDE = 640;
const gw = PADLOCK[0].length, gh = PADLOCK.length;
const ox = Math.round((SIDE - gw * CELL) / 2), oy = Math.round((SIDE - gh * CELL) / 2);
const px = Buffer.alloc(SIDE * SIDE);
PADLOCK.forEach((row, y) => [...row].forEach((c, x) => {
  if (c !== "X") return;
  for (let j = 0; j < CELL; j++) px.fill(255, (oy + y * CELL + j) * SIDE + ox + x * CELL, (oy + y * CELL + j) * SIDE + ox + (x + 1) * CELL);
}));
const pgm = join(tmpdir(), `padlock_${process.pid}.pgm`);
writeFileSync(pgm, Buffer.concat([Buffer.from(`P5\n${SIDE} ${SIDE}\n255\n`), px]));
const out = join(ROOT, "tools", "icons", "icon-rcmp-encryption.png");
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", pgm, "-y", out]);
rmSync(pgm);
console.log(`wrote ${out}`);
