// grid.js
// the lattice. viewport -> cell size -> grid dims -> doc<->cell maps.
//
// PURE. no dom, no three.js, no window: every entry point takes numbers and
// returns numbers, which is why the whole thing is checkable in
// test/type.test.js without a browser. that matters more here than anywhere
// else on the site, because bible 3.1 -- one global lattice, everything lands
// on it -- is most of what will make the page feel designed rather than
// assembled, and "everything" is a lot of call sites to get wrong.
//
// every constant comes from siteConfig.js. there are none in this file.

import { siteConfig } from "../config/siteConfig.js";

const G = siteConfig.grid;
const B = siteConfig.budget;

/**
 * the cell size the BREAKPOINT TABLE asks for at this viewport width.
 * quantized, integer, never interpolated (bible 3.1) -- a glyph on a half
 * pixel is blurry, and a field of them reads as a filter instead of as type.
 * bands are stored minWidth-descending, so the first match wins.
 */
export function cellForWidth(viewportW) {
  const w = Math.max(1, viewportW | 0);
  for (const band of G.breakpoints) {
    if (w >= band.minWidth) return { w: band.cell.w, h: band.cell.h };
  }
  // unreachable: the last band is minWidth 0. belt and braces, because a
  // missing cell size downstream is a divide by undefined.
  const last = G.breakpoints[G.breakpoints.length - 1].cell;
  return { w: last.w, h: last.h };
}

/** where a cell size sits on the overflow ladder, or -1 if it is not on it. */
function ladderIndexOf(cell) {
  return G.cellLadder.findIndex((c) => c.w === cell.w && c.h === cell.h);
}

/** cols x rows for a given viewport and cell, before any budget check. */
function dimsFor(viewportW, viewportH, cell) {
  // CLAMP TO 1. a zero-height viewport is reachable from a collapsed
  // container and from some programmatic resizes, and on the mew side it
  // poisons the entire scene graph with NaN (see HANDOFF.md, first pitfall).
  // here it would give a zero-row grid, which is merely an invisible page --
  // still not something to find out about in a browser.
  const w = Math.max(1, viewportW | 0);
  const h = Math.max(1, viewportH | 0);
  const round = G.roundUp ? Math.ceil : Math.floor;
  const cols = Math.max(1, round(w / cell.w));
  // the spare row is for the whole-cell scroll snap: at any moment up to one
  // cell of real scroll is unaccounted for, and without it the bottom edge
  // comes up short by that much.
  const rows = Math.max(1, round(h / cell.h) + G.overscanRows);
  return { cols, rows, cells: cols * rows };
}

/**
 * the smallest CSS cell width that clears the device-pixel floor (bible 3.6).
 * A 4 px cell on a DPR-1 display is 4 device pixels and turns to mush.
 */
export function minCellWidthFor(dpr) {
  return Math.ceil(G.minDeviceCellW / Math.max(0.5, dpr || 1));
}

/**
 * the cell size actually used at this viewport: the breakpoint table's answer,
 * stepped UP the ladder until it clears BOTH the device-pixel floor and the
 * cell budget.
 *
 * Two things push it up and they push the same way:
 *
 *   * THE DEVICE-PIXEL FLOOR (bible 3.6). The base cell is 4 CSS px, which is
 *     8 device pixels on the retina screens it was designed for and 4 on
 *     anything else. `minDeviceCellW` is the floor; a DPR-1 display therefore
 *     runs the whole lattice one or two rungs coarser, and -- because the type
 *     scale is measured in ROWS of that cell -- its type comes out larger.
 *     That is the honest consequence, and bible 3.6's own table states it.
 *   * THE CELL BUDGET. A 2560-wide display at 4x7 wants ~132 000 cells, over
 *     the ceiling. A big display gets a COARSER lattice, never a fractional
 *     one: the quantization rule holds all the way up.
 *
 * `dpr` defaults to 2 because that is the screen the base cell is authored
 * for -- the bible's breakpoint table IS the retina table, and defaulting to 1
 * would quietly return a different table than the one it prints.
 */
export function cellForViewport(viewportW, viewportH, dpr = 2) {
  const base = cellForWidth(viewportW);
  let i = ladderIndexOf(base);
  if (i < 0) return base;   // a bespoke cell size opts out of the ladder

  const minW = minCellWidthFor(dpr);
  let cell = G.cellLadder[i];
  while (i < G.cellLadder.length - 1 &&
         (cell.w < minW || dimsFor(viewportW, viewportH, cell).cells > B.maxCells)) {
    cell = G.cellLadder[++i];
  }
  return { w: cell.w, h: cell.h };
}

/**
 * the whole lattice for a viewport: cell size, dims, and the pixel extent the
 * cells actually cover (which is >= the viewport, by design -- see roundUp).
 */
export function gridDims(viewportW, viewportH, dpr = 2) {
  const cell = cellForViewport(viewportW, viewportH, dpr);
  const d = dimsFor(viewportW, viewportH, cell);
  return {
    cell,
    cols: d.cols,
    rows: d.rows,
    cells: d.cells,
    coverPx: { w: d.cols * cell.w, h: d.rows * cell.h }
  };
}

// ---------------------------------------------------------------------------
// doc <-> cell
//
// THE ORIGIN IS THE DOCUMENT ORIGIN (bible 3.1), not the viewport's. that is
// what lets a cell keep its identity across a scroll and across a route swap,
// which is the entire mechanism behind the transition in bible 7.1: the cells
// re-agree into the new page's words rather than being rebuilt.
// ---------------------------------------------------------------------------

/** document px -> integer cell index. floor, so negatives behave. */
export function docToCell(x, y, cell) {
  return {
    cx: Math.floor(x / cell.w),
    cy: Math.floor(y / cell.h)
  };
}

/**
 * integer cell index -> document px, at the cell's CENTRE.
 *
 * the centre and not the corner, for two reasons: it is where a glyph wants to
 * be drawn, and it makes docToCell(cellToDoc(c)) exactly c for every c while
 * keeping cellToDoc(docToCell(p)) inside half a cell of p. a corner-based map
 * round-trips to the corner, which is a whole cell of drift in the worst case
 * and lands exactly on the boundary in the best -- the one place floor is
 * ambiguous.
 */
export function cellToDoc(cx, cy, cell) {
  return {
    x: (cx + 0.5) * cell.w,
    y: (cy + 0.5) * cell.h
  };
}

/** the cell's rect in document px: top-left corner plus the cell size. */
export function cellRect(cx, cy, cell) {
  return { x: cx * cell.w, y: cy * cell.h, w: cell.w, h: cell.h };
}

/** flat instance index for a cell inside a cols-wide grid, row-major. */
export function cellIndex(cx, cy, cols) {
  return cy * cols + cx;
}

/** ...and back. */
export function indexToCell(i, cols) {
  return { cx: i % cols, cy: Math.floor(i / cols) };
}

/**
 * scroll offset snapped to whole cells, for the field layer only.
 * bible 3.1: "a field that slides sub-cell against its own lattice is the
 * single fastest way to make this look cheap." the dom scrolls normally; only
 * the lattice is quantized.
 */
export function snapScroll(scrollY, cell) {
  if (!G.snapScrollToCells) return scrollY;
  return Math.round(scrollY / cell.h) * cell.h;
}

/**
 * device pixel ratio for a grid of this size (bible 7.3): capped at 2, and at
 * 1.5 once the grid passes denseCellCount. it lives here because it is a fact
 * about the lattice, not about the renderer.
 */
export function dprFor(cells, deviceDpr = 1) {
  const cap = cells > B.denseCellCount ? B.dprMaxDense : B.dprMax;
  return Math.min(deviceDpr || 1, cap);
}

/**
 * everything above, bound to one viewport. this is what the field layer holds.
 * it is a plain value object: rebuild it on resize rather than mutating it, so
 * nothing can be looking at half of an old lattice and half of a new one.
 */
export function createGrid(viewportW, viewportH, deviceDpr = 1) {
  // THE DEVICE RATIO CHOOSES THE CELL, not just the render resolution
  // (bible 3.6): the base cell is 4 CSS px and only a retina screen can carry
  // it. Passing it here is what makes a non-retina display step the whole
  // lattice -- and therefore the whole type scale -- one rung coarser.
  const g = gridDims(viewportW, viewportH, deviceDpr);
  const cell = g.cell;
  return Object.freeze({
    ...g,
    dpr: dprFor(g.cells, deviceDpr),
    docToCell: (x, y) => docToCell(x, y, cell),
    cellToDoc: (cx, cy) => cellToDoc(cx, cy, cell),
    cellRect: (cx, cy) => cellRect(cx, cy, cell),
    index: (cx, cy) => cellIndex(cx, cy, g.cols),
    fromIndex: (i) => indexToCell(i, g.cols),
    snapScroll: (y) => snapScroll(y, cell),
    // is this cell inside the lattice's own bounds? cells outside are legal
    // (the document is taller than the viewport) -- this asks about the
    // instanced buffer, not about the page.
    inBounds: (cx, cy) => cx >= 0 && cy >= 0 && cx < g.cols && cy < g.rows
  });
}
