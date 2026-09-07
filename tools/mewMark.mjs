// mewMark.mjs — the 32x32 Mew, and a PNG writer for it.
//
// Shared by bake_favicon.mjs (the tab mark) and bake_og.mjs (the link card),
// because they are the same drawing at two sizes and a second copy of a grid is
// a second grid that can drift.
//
// WHY THERE IS A GRID HERE AND NOT AN IMAGE PIPELINE
// --------------------------------------------------
// The source is src/assets/media/"mew icon.png": a 1024 px white silhouette on
// black, and NOT an integer upscale of anything -- the best power-of-two grid
// scores 0.81 on uniformity, which is a resample, not a sprite. So there is no
// original lattice to recover, and the 32x32 below IS the decision: her
// bounding box, centred in a square, majority-voted at a 0.30 threshold so the
// tail's one-cell strokes survive instead of dropping out.
//
// It lives here as text because that makes the mark editable by anyone with a
// keyboard and re-bakeable with no image library at all. Node's zlib is the
// only dependency and the PNG writer is thirty lines.

import { deflateSync } from "node:zlib";

// the site's own two, from src/styles/site.css
export const INK   = [0x00, 0x5A, 0x7D];   // --ink-a, the cerulean
export const PAPER = [0xEF, 0xED, 0xE6];   // --paper, the bone

// 32x32. '#' is HER, '.' is sky.
const GRID = `
................................
......................###.......
.....................####.......
....................####........
...................#####........
...................####.........
..................####..........
........##........##............
......####.......##.............
....######.......#..............
...########......#..............
###########.......##............
############.......#####........
.###########............##......
.############.............##....
..###########...............#...
..##########..........#......#..
...######............##.......#.
......####......##...##.......#.
......#######..###..###........#
.....########..###..###........#
...##########..##..###.........#
...##############..###.........#
......#######.#######.........##
.......######.#######.........#.
.......###.##.#######.........#.
........##########...........#..
.........######.#...........#...
..........###.###..........#....
................##.......##.....
..................#######.......
................................
`.trim().split("\n");

export const N = GRID.length;
/** is this cell HER? */
export const on = (x, y) => GRID[y][x] === "#";

/**
 * The mark as a truecolour PNG. No alpha: it is opaque by design, and both
 * callers want a filled square rather than a cut-out.
 * @param scale  cells to pixels
 * @param fg     her colour
 * @param bg     the ground
 */
export function markPng(scale, fg = PAPER, bg = INK) {
  const S = N * scale;
  const raw = Buffer.alloc(S * (S * 3 + 1));
  for (let y = 0; y < S; y++) {
    const row = y * (S * 3 + 1);
    raw[row] = 0;                                   // filter: none
    for (let x = 0; x < S; x++) {
      raw.set(on((x / scale) | 0, (y / scale) | 0) ? fg : bg, row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 2;                          // 8-bit, truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/** the mark as an svg: one rect for the ground, one path of merged runs.
    Runs rather than a rect per cell -- 213 cells become 71 segments, and a
    path is one element the renderer fills in a single go. */
export function markSvg(fg = PAPER, bg = INK) {
  const seg = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      if (!on(x, y)) { x++; continue; }
      let w = 0;
      while (x + w < N && on(x + w, y)) w++;
      seg.push(`M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  }
  const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">
<rect width="${N}" height="${N}" fill="${hex(bg)}"/>
<path fill="${hex(fg)}" d="${seg.join("")}"/>
</svg>
`;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

const TAB = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return c ^ 0xFFFFFFFF;
}
