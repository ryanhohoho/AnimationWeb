// words.js
// text -> coverage bitmap -> slots -> glyphs. Bible 4.1, and the four
// legibility rules of bible 4.4 ENFORCED IN CODE with a VOICE fallback.
//
// "A heading is ASSEMBLED out of hundreds of smaller glyphs that were doing
// something else a second ago." So a word is not drawn; it is a set of CELLS
// that the field already owns, each given a target density and a target glyph.
// Nothing is added to the page to make a word appear -- which is why words do
// not fade in over the background: they are made of it (bible 1.1).
//
// -- the four rules, and how each one is actually checked --------------------
//   1. MASS, NOT OUTLINE      the raster is filled, and rule 2 is what stops
//                             a filled letterform from reading as an outline
//                             at grid resolution
//   2. CONTRAST, NOT INK      the densest glyph is 0.337 ink and an overstruck
//                             cell ~0.56, so a stem can never be dark in
//                             absolute terms. What reads is the RATIO: the
//                             counters and the surround are driven to
//                             legibility.counterInkMax, roughly 6:1 against
//                             the stem. Thin them too gently and the word
//                             turns to mud -- THAT is the failure mode, not a
//                             pale stem. A stem is still a RUN of at least two
//                             cells (measured off the raster: the shortest
//                             horizontal run in the word's middle band, where
//                             stems actually live), never a one-cell outline.
//   3. SIZE IN ROWS           seven rows of cap height to be legible, nine to
//                             be comfortable. Checked in rows, not in pixels
//   4. ONE CLEAR COUNTER      flood-fill the background on the CELL grid; any
//                             component that cannot reach the border is a
//                             counter. Compare the count against what the
//                             string implies.
//
// A word that fails any of them at the current breakpoint returns
// `{ ok: false, reason }` and the caller renders it as VOICE with a warning.
// DO NOT SHIP AN ILLEGIBLE HEADING -- and do not fight the rules either; they
// are what sets the minimum ASCII type size, and the design is meant to be
// built around that.
//
// -- emboldening is not cheating -------------------------------------------
// It is mostly moot at the 4 x 7 base cell (bible 3.6): a nine-row heading is
// a 90 px font, whose 700-weight stem is 13 px, which is already 3.2 cells. It
// earns its keep at the coarse end of the ladder, where a non-retina display
// runs 8 x 14 cells and the same heading's stem is 1.6 of them. Rather than
// failing every heading that lands short, the raster is EMBOLDENED with
// strokeText -- a true outline expansion in the vector domain, before
// rasterizing, which is what a bitmap font's bold has always been. It is
// measured and iterated, and if it cannot reach two cells without closing a
// counter, the word still falls back to VOICE.

import { siteConfig } from "../config/siteConfig.js";
import { createMatcher } from "./match.js";
import { axisMaxOf } from "./atlas.js";

const W = siteConfig.words;
const L = siteConfig.legibility;
const M = siteConfig.motion;
const OS = siteConfig.field.overstrike;
const DIMS = siteConfig.ramp.shapeDims;

// the six sampling discs, in NORMALIZED cell coordinates, in the order the v6
// array is documented in. MIRRORS tools/glyphatlas.py's DISC_X / DISC_Y /
// DISC_RX / DISC_RY exactly -- if those move, these move, or a word's vector
// and a glyph's vector stop being in the same space and the nearest-neighbour
// silently returns nonsense.
const DISCS = [
  // [cx, cy] : top-left, top-right, mid-left, mid-right, bottom-left, bottom-right
  [0.25, 1 / 12], [0.75, 3 / 12],
  [0.25, 5 / 12], [0.75, 7 / 12],
  [0.25, 9 / 12], [0.75, 11 / 12]
];
const DISC_RX = 0.30;
const DISC_RY = 0.5 / 6;

// one cached offscreen canvas for the whole session (bible 4.1: "one small 2D
// canvas, cached"). Allocating one per word per layout is how a route swap
// starts costing tens of megabytes.
let _canvas = null;
let _ctx = null;
function scratchCanvas(w, h) {
  if (!_canvas) {
    _canvas = typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(w, h)
      : document.createElement("canvas");
  }
  if (_canvas.width !== w || _canvas.height !== h) {
    _canvas.width = w;
    _canvas.height = h;
    _ctx = null;
  }
  if (!_ctx) _ctx = _canvas.getContext("2d", { willReadFrequently: true, alpha: true });
  return { canvas: _canvas, ctx: _ctx };
}

/** free the cached canvas. Route teardown calls this through the scope. */
export function disposeScratch() {
  if (_canvas) {
    _canvas.width = 1;
    _canvas.height = 1;
  }
  _canvas = null;
  _ctx = null;
}

// ---------------------------------------------------------------------------
// the pure half: everything below takes arrays and returns arrays, so the four
// rules are unit-testable without a browser (test/type.test.js drives them
// from hand-built bitmaps).
// ---------------------------------------------------------------------------

/**
 * per-cell coverage and 6-D shape vector, measured off a raster whose pixel
 * grid is `sub` samples per CSS px.
 *
 * `alpha` is a Uint8ClampedArray of the raster's alpha channel, row-major,
 * `rw` wide. Each cell covers cellW*sub by cellH*sub samples, which is what
 * puts the discs at the same relative size the atlas measured them at.
 */
export function measureCells(alpha, rw, rh, cols, rows, sw, sh, opts = {}) {
  // `stride`/`offset` let this read a canvas ImageData's alpha channel IN
  // PLACE. Copying it out first is one extra pass over four and a half million
  // bytes for the heading alone, and the emboldening search runs the whole
  // measurement more than once.
  const stride = opts.stride || 1;
  const offset = opts.offset || 0;
  const withShape = opts.shape !== false;

  const cov = new Float32Array(cols * rows);
  const v6 = withShape ? new Float32Array(cols * rows * DIMS) : null;

  // disc masks, once: the geometry is identical for every cell, only the ink
  // under it changes (same reasoning as glyphatlas.py's build_disc_masks).
  // Stored as (dx, dy) pairs rather than flat indices, so sampling a disc is
  // an add per sample instead of a divide and a modulo.
  const masks = DISCS.map(([dcx, dcy]) => {
    const pts = [];
    for (let y = 0; y < sh; y++) {
      const ny = (y + 0.5) / sh;
      for (let x = 0; x < sw; x++) {
        const nx = (x + 0.5) / sw;
        const a = (nx - dcx) / DISC_RX;
        const b = (ny - dcy) / DISC_RY;
        if (a * a + b * b <= 1) { pts.push(x, y); }
      }
    }
    return pts;
  });

  for (let cy = 0; cy < rows; cy++) {
    const py0 = cy * sh;
    const yMax = Math.min(sh, rh - py0);
    for (let cx = 0; cx < cols; cx++) {
      const ci = cy * cols + cx;
      const px0 = cx * sw;
      const xMax = Math.min(sw, rw - px0);
      let sum = 0;
      for (let y = 0; y < yMax; y++) {
        let p = ((py0 + y) * rw + px0) * stride + offset;
        for (let x = 0; x < xMax; x++, p += stride) sum += alpha[p];
      }
      cov[ci] = sum / (sw * sh * 255);
      if (!withShape) continue;
      for (let d = 0; d < DIMS; d++) {
        const pts = masks[d];
        let ms = 0;
        let n = 0;
        for (let k = 0; k < pts.length; k += 2) {
          const mx = px0 + pts[k];
          const my = py0 + pts[k + 1];
          if (mx >= rw || my >= rh) continue;
          ms += alpha[(my * rw + mx) * stride + offset];
          n++;
        }
        v6[ci * DIMS + d] = n ? ms / (n * 255) : 0;
      }
    }
  }
  return { cov, v6 };
}

/**
 * RULE 2 -- the shortest stem, in cells.
 *
 * Measured in the MIDDLE BAND of the word's ink only. Every letterform is thin
 * at its extremes -- the top of an O, the apex of an A -- so a true global
 * minimum measures the curve, not the stem, and would fail every round letter
 * ever drawn. Stems live in the middle.
 */
export function minStemCells(cov, cols, rows, stemT = W.stemCoverage,
                             quantile = W.stemQuantile) {
  let top = rows;
  let bot = -1;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (cov[cy * cols + cx] >= stemT) { if (cy < top) top = cy; if (cy > bot) bot = cy; break; }
    }
  }
  if (bot < top) return 0;
  const h = bot - top + 1;
  const y0 = top + Math.floor(h * 0.25);
  const y1 = top + Math.ceil(h * 0.75);

  // A LOW QUANTILE OF THE STROKE WIDTHS, not the single narrowest run, and
  // this is a reading of rule 2 rather than a softening of it. What rule 1 and
  // rule 2 are jointly forbidding is a letter drawn as a ONE-CELL OUTLINE:
  // "a stem is a solid run of SOLID/INVERT cells". They are not forbidding the
  // one row where a bowl runs horizontal and clips a single cell, which every
  // round letter has and which no amount of emboldening removes -- it just
  // moves. Judging on the true minimum measures that artefact, reports a
  // one-cell stem for a heading whose strokes are three cells wide, and sends
  // every word on the page to VOICE.
  const runs = [];
  for (let cy = y0; cy <= y1 && cy < rows; cy++) {
    let run = 0;
    for (let cx = 0; cx <= cols; cx++) {
      const on = cx < cols && cov[cy * cols + cx] >= stemT;
      if (on) run++;
      else if (run > 0) { runs.push(run); run = 0; }
    }
  }
  if (!runs.length) return 0;
  runs.sort((a, b) => a - b);
  return runs[Math.min(runs.length - 1, Math.floor(runs.length * quantile))];
}

/**
 * the shortest stem in RASTER samples, i.e. with sub-cell precision.
 *
 * The cell-grid measurement above is the RULE (bible 4.4 rule 2 is stated in
 * cells and checked in cells). This one is the CONTROL SIGNAL: it is what says
 * how much emboldening a word actually needs. Deciding that from the quantized
 * measurement means the only information available is "at least one cell short",
 * so the correction is a whole cell -- and a stem that was 1.9 cells wide comes
 * back at 3, which closes every counter in the word and fails rule 4 instead.
 * That was the first version, and it rejected three of five nav words.
 */
export function minStemSamples(alpha, rw, rh, thresh = 128, stride = 1, offset = 0,
                               quantile = W.stemQuantile) {
  const at = (x, y) => alpha[(y * rw + x) * stride + offset];
  let top = rh;
  let bot = -1;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (at(x, y) >= thresh) { if (y < top) top = y; if (y > bot) bot = y; break; }
    }
  }
  if (bot < top) return 0;
  const h = bot - top + 1;
  const y0 = top + Math.floor(h * 0.3);
  const y1 = top + Math.ceil(h * 0.7);

  // A LOW QUANTILE, NOT THE MINIMUM. At sub-cell resolution the true minimum
  // run is always about one sample: every curve has a row where it is tangent
  // to the horizontal and leaves a one-pixel antialiased sliver behind. Taking
  // it literally reports a half-pixel stem for a 190 px heading, which makes
  // the emboldening ask for the entire target width and close every counter in
  // the word -- rule 2 destroying rule 4 over a measurement artefact.
  //
  // The cell-grid measurement (minStemCells, which is the actual RULE) does not
  // have this problem because a sliver cannot fill 55% of a cell. This is only
  // the control signal, and it wants the same robustness.
  const runs = [];
  for (let y = y0; y <= y1 && y < rh; y++) {
    let run = 0;
    for (let x = 0; x <= rw; x++) {
      const on = x < rw && at(x, y) >= thresh;
      if (on) run++;
      else if (run > 0) { runs.push(run); run = 0; }
    }
  }
  if (!runs.length) return 0;
  runs.sort((a, b) => a - b);
  return runs[Math.min(runs.length - 1, Math.floor(runs.length * quantile))];
}

/**
 * RULE 4 -- count the enclosed bare regions on the CELL grid.
 *
 * Flood the background from the border; anything not reached is a counter. It
 * has to be counted on the cell grid and not on the raster, because the
 * question is not "does this letter have a hole" (it does, it is an O) but
 * "does the hole survive being quantized to 7x12 cells", which is the entire
 * risk bible 4.4 rule 4 is about.
 */
export function countCounters(cov, cols, rows, bareT = W.slotCoverageMin,
                              minCells = L.minCounterCells) {
  const bare = new Uint8Array(cols * rows);
  for (let i = 0; i < cov.length; i++) bare[i] = cov[i] < bareT ? 1 : 0;

  const seen = new Uint8Array(cols * rows);
  const stack = [];
  // flood from every border cell that is bare -- that is the OUTSIDE
  for (let cx = 0; cx < cols; cx++) {
    if (bare[cx]) stack.push(cx);
    if (bare[(rows - 1) * cols + cx]) stack.push((rows - 1) * cols + cx);
  }
  for (let cy = 0; cy < rows; cy++) {
    if (bare[cy * cols]) stack.push(cy * cols);
    if (bare[cy * cols + cols - 1]) stack.push(cy * cols + cols - 1);
  }
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !bare[i]) continue;
    seen[i] = 1;
    const cx = i % cols;
    const cy = (i / cols) | 0;
    if (cx > 0) stack.push(i - 1);
    if (cx < cols - 1) stack.push(i + 1);
    if (cy > 0) stack.push(i - cols);
    if (cy < rows - 1) stack.push(i + cols);
  }

  // whatever bare cells are left are enclosed. Group them; each group of at
  // least minCells is one clear counter.
  let counters = 0;
  const done = new Uint8Array(cols * rows);
  for (let i = 0; i < bare.length; i++) {
    if (!bare[i] || seen[i] || done[i]) continue;
    let size = 0;
    const st = [i];
    while (st.length) {
      const j = st.pop();
      if (done[j] || !bare[j] || seen[j]) continue;
      done[j] = 1;
      size++;
      const cx = j % cols;
      const cy = (j / cols) | 0;
      if (cx > 0) st.push(j - 1);
      if (cx < cols - 1) st.push(j + 1);
      if (cy > 0) st.push(j - cols);
      if (cy < rows - 1) st.push(j + cols);
    }
    if (size >= minCells) counters++;
  }
  return counters;
}

/** how many counters the STRING implies, from the tables in siteConfig.words. */
export function expectedCounters(text) {
  let n = 0;
  for (const ch of text) {
    if (W.twoCounterChars.includes(ch)) n += 2;
    else if (W.counterChars.includes(ch)) n += 1;
  }
  return n;
}

/**
 * THE ASSEMBLY ORDER (bible 4.3): "outside-in by distance to the word's own
 * centre, so the silhouette resolves before the interior detail, which is what
 * makes it read as condensation rather than as a wipe."
 *
 * Writes `order` onto every cell -- 0 at the word's far edge, which starts
 * first, and 1 at its centre, which starts last -- and returns the centre and
 * reach in DOCUMENT px, which is what the BREATH in bible 4.3a pushes away
 * from.
 *
 * Measured in document px and NOT in cells, because the lattice is anisotropic
 * (4 x 7): a wavefront that is round in cell space is an ellipse on the screen,
 * and on a word thirty cells tall and three hundred wide that difference is the
 * entire shape of the gesture.
 *
 * The centre is the bounding box's, not the ink centroid's. A centroid drifts
 * toward whichever end of the word carries more mass, and what the eye is
 * reading during an assembly is the silhouette -- which is the box.
 */
export function assemblyOrder(cells, cell) {
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (const c of cells) {
    const x = (c.cx + 0.5) * cell.w;
    const y = (c.cy + 0.5) * cell.h;
    if (x < mnx) mnx = x;
    if (x > mxx) mxx = x;
    if (y < mny) mny = y;
    if (y > mxy) mxy = y;
  }
  const centre = { x: (mnx + mxx) * 0.5, y: (mny + mxy) * 0.5 };
  let radiusPx = 1e-6;
  for (const c of cells) {
    c.order = Math.hypot((c.cx + 0.5) * cell.w - centre.x,
                         (c.cy + 0.5) * cell.h - centre.y);
    if (c.order > radiusPx) radiusPx = c.order;
  }
  // ...normalized and INVERTED. That single subtraction is the whole
  // "outside-in": the farthest cell is at 0 and goes first.
  for (const c of cells) c.order = 1 - c.order / radiusPx;
  return { centre, radiusPx };
}

/**
 * THE HOVER FRINGE's cells (bible 4.3a effect 3): "a one-cell ghost on the
 * stems' leading edge".
 *
 * LEADING EDGE IS THE -X FLANK, and that is not arbitrary. The overstrike in
 * bible 3.4a slips the second impression +0.34 cell to the RIGHT, so the left
 * flank of a stem is the sliver a plate that failed to register leaves bare.
 * The hover ghost is the same printing error the resting fringe is (bible 3.3),
 * told about a word instead of about a drift.
 *
 * Returns the cell coordinates only. Whether each one is really eligible -- it
 * has to already belong to this word, or it would have no hover spring to fade
 * with -- is field.js's business, because only field.js knows the lattice.
 * Pure and separate so the 4% chromatic budget is something a test can count.
 */
export function leadingEdgeGhosts(cells, stemDensity = siteConfig.motion.hover.fringeStemDensity,
                                  ghostMax = siteConfig.motion.hover.fringeGhostMax) {
  const at = new Map();
  for (const c of cells) at.set(`${c.cx},${c.cy}`, c.density);
  const out = [];
  for (const c of cells) {
    if (c.density < stemDensity) continue;
    // still inside the stem: the cell to the left is dense too, so this is not
    // the edge of anything.
    if ((at.get(`${c.cx - 1},${c.cy}`) ?? 0) >= ghostMax) continue;
    out.push({ cx: c.cx - 1, cy: c.cy });
  }
  return out;
}

/**
 * the thinned ring around a word (bible 4.3: "the surrounding cells have
 * thinned -- the word ate them"). A chamfer distance transform over the word's
 * bounding box grown by the ring radius; two passes, O(cells).
 */
export function buildRing(slotSet, cols, rows, radiusCells = M.gather.thinRadiusCells,
                          plateauCells = M.gather.thinPlateauCells) {
  const INF = 1e9;
  const d = new Float32Array(cols * rows).fill(INF);
  for (const i of slotSet) d[i] = 0;
  // forward
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      let v = d[i];
      if (cx > 0) v = Math.min(v, d[i - 1] + 1);
      if (cy > 0) v = Math.min(v, d[i - cols] + 1);
      if (cx > 0 && cy > 0) v = Math.min(v, d[i - cols - 1] + 1.414);
      if (cx < cols - 1 && cy > 0) v = Math.min(v, d[i - cols + 1] + 1.414);
      d[i] = v;
    }
  }
  // backward
  for (let cy = rows - 1; cy >= 0; cy--) {
    for (let cx = cols - 1; cx >= 0; cx--) {
      const i = cy * cols + cx;
      let v = d[i];
      if (cx < cols - 1) v = Math.min(v, d[i + 1] + 1);
      if (cy < rows - 1) v = Math.min(v, d[i + cols] + 1);
      if (cx < cols - 1 && cy < rows - 1) v = Math.min(v, d[i + cols + 1] + 1.414);
      if (cx > 0 && cy < rows - 1) v = Math.min(v, d[i + cols - 1] + 1.414);
      d[i] = v;
    }
  }
  const ring = [];
  const span = Math.max(1e-6, radiusCells - plateauCells);
  for (let i = 0; i < d.length; i++) {
    // strictly INSIDE the radius: a cell exactly at it thins by zero, and a
    // ring entry that does nothing is a texture write and an upload for no
    // reason.
    if (d[i] <= 0 || d[i] >= radiusCells) continue;
    // A PLATEAU, THEN A FALLOFF -- and the plateau is what makes the word
    // readable (bible 4.4 rule 2).
    //
    // A pure linear falloff from the word's edge was the first version, and it
    // is exactly the "far too gentle" thinning that turns a word to mud: a
    // COUNTER is a bare region one or two cells across in the middle of a
    // letter, so its centre is barely a cell from a stem and a falloff that
    // starts decaying immediately only ever half-clears it. Inside the plateau
    // the cell is driven all the way to the counter cap; outside it, a linear
    // return to nothing, which is what stops the word having a visible box
    // around it.
    ring.push({ i, thin: d[i] <= plateauCells ? 1 : 1 - (d[i] - plateauCells) / span });
  }
  return ring;
}

// ---------------------------------------------------------------------------
// the browser half: rasterize, then run everything above over it.
// ---------------------------------------------------------------------------

/**
 * createWordBuilder({ ramp }) -> { build, dispose }
 *
 * `build(spec, grid)` takes { text, rect (DOCUMENT px), fontSizePx, weight }
 * and returns either
 *   { ok: true, cells, ring, bbox }   ready for field.setWords, or
 *   { ok: false, reason }             caller renders VOICE and warns.
 */
export function createWordBuilder({ ramp }) {
  const matcher = createMatcher(ramp);
  const axisMax = axisMaxOf(ramp);

  function build(spec, grid) {
    const cell = grid.cell;
    const capHeight = spec.fontSizePx * siteConfig.type.capHeightRatio;
    // RULE 3 IS COUNTED IN ROWS, not in pixels (bible 4.4). A letterform needs
    // 7 rows of cap height to be legible -- the classic 5x7 bitmap floor plus
    // room for a counter -- and stating that as "44 px" was the same rule said
    // in the units of one particular cell size, which silently became a
    // different rule the moment the cell went 7x12 -> 4x7.
    const capRows = capHeight / cell.h;
    if (capRows < L.minCapRows) {
      return {
        ok: false,
        reason: `cap height ${capRows.toFixed(1)} rows < ${L.minCapRows} ` +
                `(${capHeight.toFixed(0)}px on a ${cell.h}px cell, bible 4.4 rule 3)`
      };
    }
    // A WRAPPED WORD CANNOT BE BUILT. The raster draws one line with fillText,
    // so an element the browser broke over two lines would be painted as a
    // single line floating in the middle of a two-line box -- the focusable
    // link and the word on the canvas would stop being the same word. Falling
    // back to VOICE is the honest answer, and it is what bible 4.4 says to do
    // when the technique does not fit the space.
    if (spec.rect.h > spec.fontSizePx * 1.6) {
      return {
        ok: false,
        reason: `wrapped onto more than one line (${spec.rect.h.toFixed(0)}px tall ` +
                `at ${spec.fontSizePx.toFixed(0)}px)`
      };
    }

    const cx0 = Math.floor(spec.rect.x / cell.w);
    const cy0 = Math.floor(spec.rect.y / cell.h);
    const cx1 = Math.ceil((spec.rect.x + spec.rect.w) / cell.w);
    const cy1 = Math.ceil((spec.rect.y + spec.rect.h) / cell.h);
    const cols = Math.max(1, cx1 - cx0);
    const rows = Math.max(1, cy1 - cy0);

    // samples per CSS px, dropped until the raster fits the budget.
    //
    // THIS IS THE COST OF A ROUTE CHANGE and it is worth being blunt about:
    // every measurement below is a pass over this raster, and the emboldening
    // search runs several. At 4x a full-bleed heading is 4.6 megapixels and one
    // pass costs ~90 ms -- five words then cost most of a second of blocked
    // main thread, which is a visible stall on every navigation. At 2x it is
    // 1.1 megapixels and the discs still cover enough samples for a stable
    // mean. Tone and shape do not measurably change; the stall does.
    let sub = W.subsample;
    while (sub > 1 && cols * cell.w * sub * rows * cell.h * sub > W.rasterMaxPixels) sub--;
    const sw = cell.w * sub;
    const sh = cell.h * sub;
    const rw = cols * sw;
    const rh = rows * sh;

    const { ctx } = scratchCanvas(rw, rh);
    const want = expectedCounters(spec.text);

    /**
     * rasterize once at a given emboldening and measure it.
     *
     * `shape` is false while the emboldening search is still hunting: the six
     * disc vectors are only needed for the glyph match on the raster that is
     * actually accepted, and they are half the cost of a measurement.
     */
    const rasterize = (bolden, shape = false) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, rw, rh);
      // doc px -> raster px. Anisotropic on purpose: the lattice is anisotropic
      // (cells are taller than wide), so the letterform is measured through the
      // same anisotropy the field will draw it with.
      ctx.setTransform(sub, 0, 0, sub, -cx0 * cell.w * sub, -cy0 * cell.h * sub);
      ctx.font = `${spec.weight || W.rasterWeight} ${spec.fontSizePx}px ${W.rasterFamily}`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#000";
      ctx.lineJoin = "round";
      const m = ctx.measureText(spec.text);
      const ascent = m.actualBoundingBoxAscent || spec.fontSizePx * 0.7;
      const descent = m.actualBoundingBoxDescent || spec.fontSizePx * 0.2;
      // centre the INK in the element's box. The DOM text is transparent and
      // nobody can compare the two, so matching the browser's exact baseline
      // buys nothing and costs a font-metrics dependency.
      const tx = spec.rect.x;
      const ty = spec.rect.y + (spec.rect.h - (ascent + descent)) / 2 + ascent;
      if (bolden > 0) {
        ctx.lineWidth = bolden;
        ctx.strokeText(spec.text, tx, ty);
      }
      ctx.fillText(spec.text, tx, ty);

      // read the alpha channel IN PLACE, stride 4. Copying it out first is an
      // extra pass over the whole raster for nothing.
      const img = ctx.getImageData(0, 0, rw, rh);
      const px = { stride: 4, offset: 3 };
      const measured = measureCells(img.data, rw, rh, cols, rows, sw, sh, { ...px, shape });
      return {
        bolden,
        cov: measured.cov,
        v6: measured.v6,
        stemPx: minStemSamples(img.data, rw, rh, 128, px.stride, px.offset) / sub,
        stem: minStemCells(measured.cov, cols, rows),
        counters: countCounters(measured.cov, cols, rows)
      };
    };

    // EMBOLDEN UNTIL THE STEMS ARE TWO CELLS WIDE, WITHOUT CLOSING A COUNTER.
    //
    // strokeText expands the outline in the VECTOR domain, so the letterform
    // keeps its shape (dilating the cell grid instead would square off every
    // curve at exactly the size where that is most visible). But it expands
    // inward as well as outward: it adds `lineWidth` to a stem and takes
    // `lineWidth` off a counter, so rules 2 and 4 pull in opposite directions
    // and the word is legible only in the window between them.
    //
    // Target slightly OVER two cells: the stem has to survive being quantized
    // at whatever phase it happens to land on, and a stem of exactly 14 px can
    // fall across three cells at 40% each and satisfy nobody.
    //
    // ONLY IF THE RULE HAS ACTUALLY FAILED, and that guard is new. Rule 2 is
    // stated and checked in CELLS (minStemCells); stemPx is only the control
    // signal that says how much to add. Emboldening whenever the control signal
    // dips below target -- which is what this did -- means emboldening words
    // whose stems already measure two cells, and every stroke of emboldening
    // comes straight off the counters.
    //
    // At 7 x 12 that was almost always academic: a 70 px heading's stem is
    // 10 px, which was 1.4 cells, so the rule genuinely failed and the bolding
    // was doing real work. At the 4 x 7 base (bible 3.6) the same stem is 2.5
    // cells and the rule PASSES -- while stemPx, a 0.2 quantile of run lengths
    // that deliberately under-reports on curves, still lands a pixel or two
    // short and asked for more. Measured on the nav labels at 375 px: it added
    // lineWidth 1.4 to a word that already passed, taking 1.4 px off a 10 px
    // counter, and the squint test in rule 5 came back as horizontal bars.
    // That is rule 2's own failure mode -- the word turned to mud -- caused by
    // rule 2's own enforcement.
    const targetPx = (L.minStemCells + W.stemQuantizeMargin) * cell.w;
    let bestBolden = 0;
    let probe = rasterize(0);
    if (probe.stem < L.minStemCells && probe.stemPx < targetPx) {
      const need = targetPx - probe.stemPx;
      const bold = rasterize(need);
      if (bold.counters >= want) {
        bestBolden = need;
        probe = bold;
      } else {
        // rule 4 lost: find the most emboldening the counters can survive.
        // Bisection, because both quantities are monotone in lineWidth. TWO
        // steps, not four -- each one is a full pass over the raster, and the
        // third halving moves the stem by well under a cell.
        let lo = 0;
        let hi = need;
        let keep = probe;
        for (let i = 0; i < 2; i++) {
          const mid = (lo + hi) / 2;
          const r = rasterize(mid);
          if (r.counters >= want) { keep = r; bestBolden = mid; lo = mid; } else hi = mid;
        }
        probe = keep;
      }
    }
    // ONE more pass, at the accepted emboldening, to get the 6-D vectors. The
    // search above never needed them, and they are half the cost of a
    // measurement.
    const best = rasterize(bestBolden, true);

    const cov = best.cov;
    const v6 = best.v6;
    if (best.stem < L.minStemCells) {
      return {
        ok: false,
        reason: `min stem ${best.stem} cells < ${L.minStemCells}; cannot embolden ` +
                `further without closing a counter (bible 4.4 rules 2 and 4)`
      };
    }
    const got = best.counters;
    if (got < want) {
      return { ok: false, reason: `${got}/${want} counters survived the grid (bible 4.4 rule 4)` };
    }

    // -- slots ------------------------------------------------------------
    const cells = [];
    const slotSet = [];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        const c = cov[i];
        if (c < W.slotCoverageMin) continue;
        slotSet.push(i);

        // RULE 1, mass not outline: the edge of a letterform gets a LIGHTER
        // register, never nothing. A gamma below 1 lifts the midtones so an
        // edge cell lands on a MID glyph rather than a near-space, which is
        // what stops a filled letter from reading as a fringed outline.
        const density = Math.min(1, Math.max(W.densityFloor, Math.pow(c, W.densityGamma)));
        // RULE 1: a stem is a run of dense glyphs at weight 600, OVERSTRUCK
        // where it needs to be darkest (bible 4.4, 3.4a) -- never an inverted
        // cell. The mass in the middle of a stroke gets the second impression;
        // the edge of the letterform keeps its single matched glyph, which is
        // what stops the word acquiring a hard outline.
        const strike = density >= OS.slotDensityAbove;

        // the 6-D match (bible 4.1 step 3): the local shape vector of the
        // letterform passing through this cell, normalized into the ramp
        // table's own space, then nearest neighbour. This is what makes a
        // stem's left edge pick a glyph with ink on its left.
        //
        // EVERY slot gets one, struck or not. The inverted version skipped the
        // match for its block cells, because a knockout has nothing to do with
        // the direction of a letterform it is standing inside; an overstruck
        // cell is still a glyph and still wants to point the right way. Only
        // the SECOND impression is chosen by density (bible 3.4a), and that
        // happens in the shader.
        const q = new Array(DIMS);
        for (let d = 0; d < DIMS; d++) q[d] = v6[i * DIMS + d] / (axisMax[d] || 1);
        const glyph = matcher.match(q).idx;

        cells.push({
          cx: cx0 + cx, cy: cy0 + cy,
          density, strike, glyph,
          // sub-cell alignment: nudge the glyph toward where the ink actually
          // is inside the cell, which is what keeps a stem edge from stepping.
          offX: 0, offY: 0,
          // ...and the cell's place in the assembly stagger, filled in below.
          order: 0
        });
      }
    }
    if (!cells.length) return { ok: false, reason: "no covered cells" };

    // the assembly order (bible 4.3), outside-in by distance to the word's own
    // centre. See assemblyOrder above for why it is measured in document px.
    const { centre, radiusPx } = assemblyOrder(cells, cell);

    const ring = buildRing(slotSet, cols, rows).map(({ i, thin }) => ({
      cx: cx0 + (i % cols), cy: cy0 + ((i / cols) | 0), thin
    }));

    return {
      ok: true, cells, ring,
      bbox: { cx: cx0, cy: cy0, cols, rows },
      // the assembly's origin and its reach, in DOCUMENT px. The field needs
      // both: the centre is what the BREATH pushes away from (bible 4.3a), and
      // the radius is what normalized the order above.
      centre, radiusPx,
      stem: best.stem, counters: got, bolden: best.bolden
    };
  }

  return { build, dispose: disposeScratch };
}

export default createWordBuilder;
