// padlock.js — THE CONFIDENTIAL PROJECT'S MARK, DRAWN IN TEXT
//
// A padlock on a pixel grid, the same kind of drawing as the motion page's
// pixel flower: cells, no curves, no anti-aliasing. It is the one source for
// both places it appears -- the locked block on pages/rcmp-encryption.js
// (drawn inline as SVG rectangles, crisp at any size) and the project's icon
// (tools/icons/icon-rcmp-encryption.png, this grid at 32 px a cell, white on
// black, baked into the atlas by tools/bake_icons.mjs). Change it here, then
// `node tools/bake_padlock.mjs && node tools/bake_icons.mjs`.
//
// A two-cell shackle, because one cell vanishes at the size the icon is
// punched, and a keyhole with a round head and a stem, which is what reads
// as "lock" rather than "bag" at 24 px.

export const PADLOCK = [
  "....XXXXXX....",
  "...XXXXXXXX...",
  "..XXX....XXX..",
  "..XX......XX..",
  "..XX......XX..",
  "..XX......XX..",
  "XXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXX",
  "XXXXX....XXXXX",
  "XXXXX....XXXXX",
  "XXXXXX..XXXXXX",
  "XXXXXX..XXXXXX",
  "XXXXXX..XXXXXX",
  "XXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXX"
];

/** the grid as an inline SVG: one rect per run of filled cells in a row */
export function padlockSvg(cls = "") {
  const w = PADLOCK[0].length, h = PADLOCK.length;
  let rects = "";
  PADLOCK.forEach((row, y) => {
    for (const m of row.matchAll(/X+/g)) rects += `<rect x="${m.index}" y="${y}" width="${m[0].length}" height="1"/>`;
  });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}
