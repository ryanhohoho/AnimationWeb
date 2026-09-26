// motionLayout.js — WHERE EACH TILE OF THE WALL GOES
//
// Pure: no DOM, no window. It takes the works in their order and their clips'
// lengths and returns columns of placed tiles. The page (motionPage.js) moves
// the tiles into those columns; the test suite checks the maths headless.
//
// THE WALL IS A BROKEN GRID (the editorial layout where columns are not
// aligned to one baseline): N columns, each starting at its own depth, each
// tile at its own width inside its column, pushed to the left, the middle or
// the right, with its own air above it. Three decisions make it read as
// composed rather than random:
//
//   · SIZE IS LENGTH. A tile's width is its clip's length, mapped linearly
//     from the shortest works (3 s) to the longest (13 s), so a long, developed
//     piece is simply bigger. Nothing else sets a size.
//   · ORDER IS PRIORITY. Each tile goes into whichever column is shortest so
//     far, so the first works written in site/motion.js land highest on the
//     page. It is the masonry rule, which keeps a skim's first screen for the
//     works the owner put first.
//   · THE SCATTER IS SEEDED. Alignment and air come from a fixed seed, so the
//     page is the same on every visit and every machine (a layout that moved
//     between visits would read as broken, not scattered) -- but adding a work
//     re-deals it, which is what a new work should do.
//
// EVERY LENGTH IS IN COLUMN WIDTHS, which is what makes this layout-free: CSS
// resolves a percentage margin or padding against the containing block's
// WIDTH, so `margin-top: calc(var(--dy) * 100%)` is dy column widths, and the
// estimate of each column's height below is exact up to the name labels,
// without the page measuring anything.

const ASPECT = 19.5 / 9;

/** a small seeded generator (mulberry32): the same seed, the same scatter */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a work's width in its column, from its clip's length */
export function widthFor(dur, { min = .6, max = 1, short = 3, long = 13 } = {}) {
  const k = Math.min(1, Math.max(0, (dur - short) / (long - short)));
  return min + (max - min) * k;
}

/**
 * @param items  [{ id, dur }] in priority order
 * @param o.cols    how many columns
 * @param o.seed    the scatter's seed
 * @param o.air     [lo, hi] air above a tile, in column widths
 * @param o.stagger how much deeper each column starts than the last, in column widths
 * @param o.label   the room a name label takes above its tile, in column widths (an estimate)
 * @returns {{ cols: Array<{ top, items: Array<{ id, w, x, dy }> }> }}
 */
export function lay(items, { cols = 3, seed = 1, air = [.08, .3], stagger = .22, label = .08, min, max } = {}) {
  const rnd = seeded(seed);
  // each column starts at its own depth: a fixed stair (col k starts k*stagger
  // lower) shuffled by the seed, so the first row is not a staircase either
  const tops = Array.from({ length: cols }, (_, k) => k * stagger);
  for (let k = tops.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [tops[k], tops[j]] = [tops[j], tops[k]]; }
  const out = tops.map((top) => ({ top, items: [], h: top }));
  let lastAlign = -1;
  for (const it of items) {
    // the shortest column takes it; a near-tie goes to the leftmost, so the
    // first row reads left to right
    let c = 0;
    for (let k = 1; k < out.length; k++) if (out[k].h < out[c].h - .05) c = k;
    const w = widthFor(it.dur, { min, max });
    // left, middle or right in its column -- never the same as the tile placed
    // just before it, so neighbours do not line up into a hidden grid
    let align = Math.floor(rnd() * 3);
    if (align === lastAlign) align = (align + 1 + Math.floor(rnd() * 2)) % 3;
    lastAlign = align;
    const x = (1 - w) * align / 2;
    const dy = air[0] + (air[1] - air[0]) * rnd();
    out[c].items.push({ id: it.id, w: round(w), x: round(x), dy: round(dy) });
    out[c].h += dy + label + w * ASPECT;
  }
  return { cols: out.map(({ top, items: its, h }) => ({ top: round(top), items: its, h: round(h) })) };
}

const round = (v) => Math.round(v * 1e4) / 1e4;
