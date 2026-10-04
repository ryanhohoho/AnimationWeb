// mewMark.mjs — the 32x32 Mew, and a PNG writer for it.
//
// The drawing itself is ICON.grid in src/site/identity.js (the editor's "Link &
// icon" tab paints it; the argument for the grid is beside it there). This is
// the node half: the tab mark as an svg of merged runs, and as an opaque PNG at
// any whole number of pixels to a cell. Node's zlib is the only dependency and
// the PNG writer is thirty lines.
//
// It used to be shared with tools/bake_og.mjs, which drew the link card with
// ffmpeg. The card is drawn in the editor now, from the same grid.

import { deflateSync } from "node:zlib";
import { ICON } from "../src/site/identity.js";

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// her colour and the ground's, from identity.js
export const PAPER = rgb(ICON.fg);
export const INK   = rgb(ICON.bg);
// a tab mark with no ground (ICON.clear): she stands on the tab strip itself
export const CLEAR = !!ICON.clear;

const GRID = ICON.grid;

export const N = GRID.length;
/** is this cell HER? */
export const on = (x, y) => GRID[y]?.[x] === "#";

/** a PNG in an .ico: one 32 px entry, which is all a browser asks /favicon.ico
    for. An ICO may carry a PNG as-is (Vista onwards, every browser since). */
export function icoOf(png, size = 32) {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head[6] = size; head[7] = size;                    // 0 would mean 256
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  return Buffer.concat([head, png]);
}

/**
 * The mark as a PNG: a filled square (truecolour), or her alone on nothing
 * (truecolour + alpha) when `clear`.
 * @param scale  cells to pixels
 * @param fg     her colour
 * @param bg     the ground
 * @param pad    pixels of ground round her, for a size that is not a whole
 *               number of cells (180 = 32 x 5 + 10 each side)
 * @param clear  no ground. Its pixels carry HER colour at zero alpha, not the
 *               ground's, so a browser smoothing the mark down to 16 px blends
 *               her edge toward clear rather than toward a colour nobody chose.
 */
export function markPng(scale, fg = PAPER, bg = INK, pad = 0, clear = CLEAR) {
  const S = N * scale + pad * 2;
  const C = clear ? 4 : 3;
  const raw = Buffer.alloc(S * (S * C + 1));
  const her = clear ? [...fg, 255] : fg, sky = clear ? [...fg, 0] : bg;
  for (let y = 0; y < S; y++) {
    const row = y * (S * C + 1);
    raw[row] = 0;                                   // filter: none
    for (let x = 0; x < S; x++) {
      const cx = x - pad, cy = y - pad;
      const in_ = cx >= 0 && cy >= 0 && cx < N * scale && cy < N * scale;
      raw.set(in_ && on((cx / scale) | 0, (cy / scale) | 0) ? her : sky, row + 1 + x * C);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = clear ? 6 : 2;              // 8-bit, truecolour (+ alpha)
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
export function markSvg(fg = PAPER, bg = INK, clear = CLEAR) {
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
${clear ? "" : `<rect width="${N}" height="${N}" fill="${hex(bg)}"/>\n`}<path fill="${hex(fg)}" d="${seg.join("")}"/>
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
