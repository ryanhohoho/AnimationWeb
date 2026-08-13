// field.js
// the MODEL half of the type field: the lattice, the per-cell content, the word
// registry, the live hits, and the ten-or-so uniforms that get written per
// frame. It owns no GPU objects at all -- fieldRenderer.js owns every one of
// those -- and it holds no per-cell state that changes over time.
//
// THERE IS NO INTEGRATION LOOP IN THIS FILE, no awake set, no sleeping
// predicate and no per-frame buffer upload, and none of that machinery needs to
// exist (bible 7.3). The four verbs are closed forms in the vertex shader; what
// is left on the CPU is: advance a clock, copy a pointer position, expDamp a
// handful of per-word resolve floats, and issue one draw.
//
// The per-cell content -- seed, resting density, fringe ink, word slots -- is
// built once at layout and rewritten only when the layout or the route changes.
// Everything in buildCellData below runs at most a few times in a session.

import { siteConfig } from "../config/siteConfig.js";
import { createGrid } from "./grid.js";
import {
  cellSeed, weatherAt, weatherFor, shapeDensity, calibrateWindow, clamp01,
  smoothstep, peakDisplacementPx, presenceField, shiverEnvelope
} from "./fieldMath.js";
import { mod } from "../site/map.js";
import { buildRampLut, makeCoverageOf, densityForCoverage, loadAtlasImage } from "./atlas.js";
import { leadingEdgeGhosts } from "./words.js";
import { createFieldRenderer } from "./fieldRenderer.js";
import { expDamp } from "../utils/math.js";

const F = siteConfig.field;
const M = siteConfig.motion;
const W = siteConfig.words;
const L = siteConfig.legibility;
const FR = siteConfig.fringe;
const LOAD = siteConfig.load;
const OS = siteConfig.field.overstrike;
const AS = siteConfig.motion.assemble;
const HV = siteConfig.motion.hover;
const MAP = siteConfig.map;
const B = siteConfig.budget;

// the flag byte in texA.a. See fieldRenderer.js's header for the full layout.
// THE TWO STRIKE BITS USED TO BE INVERT BITS. Inverted cells are banned from
// the field and from every word (bible 3.4a, 8) -- the darks are overstrike
// now, and it occupies the same two bits and the same second draw call.
export const FLAG_FRINGE_A = 1;
export const FLAG_FRINGE_B = 2;
// ...and the third value the two fringe bits can hold, which was spare until
// R2 needed it. A cell marked this way is the one-cell chromatic ghost on the
// leading edge of a hovered word's stem (bible 4.3a effect 3). It is baked at
// stamp time rather than found in the shader for two reasons: the neighbour
// test is a CPU loop over a few hundred cells instead of a texelFetch on every
// vertex of every frame, and the 4% chromatic budget in bible 3.3 can only be
// asserted by something that can count.
export const FLAG_FRINGE_GHOST = 3;
export const FLAG_STRIKE_REST = 4;
export const FLAG_SLOT_STRIKE = 8;
export const FLAG_WORD_SHIFT = 16;

const u8 = (x) => Math.max(0, Math.min(255, Math.round(x * 255)));

/**
 * THE PER-CELL CONTENT, for the whole document grid. Pure, so the acceptance
 * numbers in bible 4.2 (mean ink 12-22%, and 35-55% of the viewport near-bare)
 * and bible 3.3 (chromatic cells <= 4%) are things a test can assert rather
 * than things somebody has to squint at.
 *
 * Returns { a, b, window, stats } where a/b are the two RGBA8 planes.
 *
 * `opts.presence` is bible 4.2's second factor: a Float32Array of cols*rows,
 * from fieldMath.presenceField. Absent, the page is uniformly present, which
 * is the pre-R1 behaviour and is only correct before the DOM has been measured.
 */
export function buildCellData(cols, rows, coverageOf, opts = {}) {
  const n = cols * rows;
  const a = new Uint8Array(n * 4);
  const b = new Uint8Array(n * 4);
  const density = new Float32Array(n);
  // THE WEATHER IS CACHED BY THE CALLER (R3). It is three domain-warped fbm
  // lookups per cell, and the cell texture now covers the WHOLE MAP -- half a
  // million cells at the base cell size (bible 7.1a). Recomputing it every time
  // a panel's presence changes would put a third of a second of fbm on the main
  // thread at the exact moment of a click. So a navigation reuses this array and
  // only re-derives the density from it.
  const weather = opts.weather && opts.weather.length === n
    ? opts.weather
    : (() => {
        const w = new Float32Array(n);
        const at = opts.weatherAt || weatherAt;
        for (let cy = 0, i = 0; cy < rows; cy++) {
          for (let cx = 0; cx < cols; cx++, i++) w[i] = at(cx, cy);
        }
        return w;
      })();
  const presence = opts.presence && opts.presence.length === n
    ? opts.presence
    : new Float32Array(n).fill(1);

  // CALIBRATE AGAINST MEASURED INK, not against an eyeballed curve. What
  // "density 0.6" costs in ink is a property of the baked ramp -- whose
  // densest glyph is only a third of a cell -- and it changes whenever the
  // ramp does. A stratified sample keeps this at a few thousand evaluations
  // however big the document is.
  const stride = Math.max(1, Math.floor(n / F.weather.calibrateSamples));
  const sample = [];
  for (let i = 0; i < n; i += stride) sample.push(weather[i]);
  // the sample's own OVERSTRIKE cut, so the bisection below is measuring the
  // page that will actually be built rather than a much darker imaginary one.
  // Ranked on the WEATHER alone here, for the same reason the bisection sees
  // the weather alone: presence is applied after, and letting it into the
  // calibration makes the page's tone depend on when the DOM was measured.
  const sortedSample = Float32Array.from(sample).sort();
  const strikeCut = sortedSample[Math.floor((1 - OS.restMaxFraction) * (sortedSample.length - 1))];
  const window = opts.window ?? calibrateWindow(
    sample, coverageOf, F.weather.coverageTarget, F.weather,
    { struckOf: (i) => sample[i] >= strikeCut }
  );

  // DENSITY = WEATHER x PRESENCE (bible 4.2). Weather gives the page its
  // drifts and clearings; presence gives it a COMPOSITION -- the crowd gathers
  // where the page has something to say and thins to bare paper where it does
  // not. Noise alone is statistically identical everywhere and covers the
  // viewport corner to corner with an even grey, which is what the first build
  // shipped.
  for (let i = 0; i < n; i++) density[i] = shapeDensity(weather[i], window) * presence[i];

  // OVERSTRUCK CELLS ARE A COUNT, not a threshold (bible 3.4a: the last two
  // stops). A threshold cannot hold the budget on its own -- the contrast
  // window deliberately pushes the crests to exactly 1.0, so a test like
  // "density >= 0.72" catches every crest cell there is. So: take the darkest
  // restMaxFraction of the page and no more, and require them to clear the
  // floor as well.
  const strikeBudget = Math.floor(n * OS.restMaxFraction);
  const strikeOf = new Uint8Array(n);
  let strikeCount = 0;
  if (strikeBudget > 0) {
    const order = [];
    for (let i = 0; i < n; i++) if (density[i] >= OS.restDensityAbove) order.push(i);
    // RANKED ON weather x presence, NOT ON THE SHAPED DENSITY. The contrast
    // window saturates every crest at exactly 1.0, so ranking on density is
    // ranking a field of ties -- and any tie-break scatters the survivors as
    // isolated specks through the dark banks. Both factors underneath are
    // smooth, so ranking on their product puts the struck cells in CONTIGUOUS
    // PATCHES at the crests that sit over content, which is what "the last two
    // stops" means. Two stops, not two hundred freckles.
    order.sort((p, q) => (weather[q] * presence[q]) - (weather[p] * presence[p]));
    for (let k = 0; k < order.length && strikeCount < strikeBudget; k++) {
      strikeOf[order[k]] = 1;
      strikeCount++;
    }
  }

  // THE FRINGE (bible 3.3), and it is a HARD BUDGET.
  // "when a cell's density exceeds threshold and a 4-neighbour is at least
  // delta lighter, that lighter neighbour may be painted in a fringe ink."
  //
  // Measured on EFFECTIVE INK, not on density -- see siteConfig's fringe block
  // for why, and for what it means: the whisper lands on the edges of the
  // OVERSTRUCK masses, which is where a two-colour print that did not register
  // shows its error. Which ink a cell gets is a stable function of the cell
  // INDEX, so the fringe cannot crawl. Candidates carry their contrast and are
  // then CUT to 4% by keeping the strongest: the budget is the rule, not an
  // aspiration, and the risk register says the moment this drifts into an
  // accent colour the look is dead.
  const candidates = [];
  const ink = new Float32Array(n);
  for (let i = 0; i < n; i++) ink[i] = coverageOf(density[i], strikeOf[i] === 1);
  const at = (cx, cy) => ink[cy * cols + cx];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const d = at(cx, cy);
      if (d <= FR.threshold) continue;
      const o = FR.offsetCells;
      const neighbours = [[cx - o, cy], [cx + o, cy], [cx, cy - o], [cx, cy + o]];
      for (const [nx, ny] of neighbours) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nd = at(nx, ny);
        if (d - nd >= FR.delta) candidates.push({ i: ny * cols + nx, contrast: d - nd });
      }
    }
  }
  candidates.sort((p, q) => q.contrast - p.contrast);
  const fringeCap = Math.floor(n * FR.maxCellFraction);
  const fringeOf = new Uint8Array(n);
  let fringeCount = 0;
  for (const c of candidates) {
    if (fringeCount >= fringeCap) break;
    if (fringeOf[c.i]) continue;
    // stable function of the cell index, never of the frame
    fringeOf[c.i] = (c.i * 2654435761 % 2 === 0) ? FLAG_FRINGE_A : FLAG_FRINGE_B;
    fringeCount++;
  }

  let inkSum = 0;
  for (let cy = 0, i = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++, i++) {
      const d = density[i];
      const struck = strikeOf[i] === 1;
      a[i * 4] = u8(cellSeed(cx, cy));
      a[i * 4 + 1] = u8(d);
      a[i * 4 + 2] = 0;                                  // slotDensity: no word yet
      // a cell that IS the dense mass does not also wear the ghost of its own
      // edge -- the fringe is the misregistered SECOND impression, one cell
      // off, and painting it on the mass itself would just be coloured type.
      a[i * 4 + 3] = (struck ? FLAG_STRIKE_REST : fringeOf[i]);
      b[i * 4] = 128;                                    // slotOffset 0
      b[i * 4 + 1] = 128;
      b[i * 4 + 2] = 0;                                  // thin
      b[i * 4 + 3] = 0;                                  // slotGlyph
      inkSum += ink[i];
    }
  }

  // NEAR-BARE IS MEASURED IN INK, AND OVER THE VIEWPORT (bible 4.2's budget:
  // "35-55% of the viewport should be near-bare paper (< 0.04 effective ink)
  // at rest"). It used to be counted as `density <= 0.001` over the whole
  // document, which is a different question with a different answer: a cell at
  // density 0.02 carries no visible mark and was being counted as inked, and a
  // long page's lower reaches are not the composition anyone is looking at.
  const bareOver = (fromRow, toRow) => {
    let bare = 0;
    let count = 0;
    for (let i = fromRow * cols; i < Math.min(n, toRow * cols); i++) {
      if (ink[i] < F.presence.bareInkMax) bare++;
      count++;
    }
    return count ? bare / count : 0;
  };
  const viewportRows = Math.min(rows, opts.viewportRows || rows);

  return {
    a, b, window, weather,
    stats: {
      cells: n,
      meanCoverage: inkSum / n,
      fringeFraction: fringeCount / n,
      overstrikeFraction: strikeCount / n,
      bareFraction: bareOver(0, rows),
      // ...and the one the acceptance test actually names
      viewportBareFraction: bareOver(0, viewportRows),
      window
    }
  };
}

/**
 * the density scale that would put the page at `target` mean ink. Used once,
 * for the LOAD inhale (bible 6.1): the page opens near-bare at 4% and inhales
 * to rest over ~900 ms. Bisection, because ink is not linear in density.
 */
export function solveLoadScale(densitySample, coverageOf, target) {
  const meanAt = (s) => {
    let sum = 0;
    for (const d of densitySample) sum += coverageOf(clamp01(d * s));
    return sum / densitySample.length;
  };
  let lo = 0;
  let hi = 1;
  if (meanAt(hi) <= target) return 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) * 0.5;
    if (meanAt(mid) > target) hi = mid;
    else lo = mid;
  }
  return (lo + hi) * 0.5;
}

// ---------------------------------------------------------------------------

/**
 * createField({ renderer, world, scope, atlasUrl, ramp, getMew })
 *
 * async because the atlas has to be decoded once. Everything after that is
 * synchronous and allocation-free per frame.
 *
 * `getMew()` returns { x, y, radius } in DOCUMENT px, or null. It is a callback
 * rather than a subscription because mew's position is main.js's business and
 * this module must not reach into src/engine (bible 6.5 is one distance test,
 * not a coupling).
 */
export async function createField({ renderer, world, scope, atlasUrl, ramp, getMew }) {
  const atlasImage = await loadAtlasImage(atlasUrl);
  const lut = buildRampLut(ramp);
  const coverageOf = makeCoverageOf(ramp, lut);
  const gpu = createFieldRenderer({ atlasImage, ramp, lut, scope });

  let grid = null;
  let data = null;          // { a, b, window, weather, stats }
  let dataCols = 0;         // the MAP's cell dims, not the document's (R3)
  let dataRows = 0;
  let panelCols = 0;        // ...and one panel's, which is one viewport
  let panelRows = 0;
  let viewportRows = 0;

  // THE COUNTER CAP (bible 4.4 rule 2), solved once against the measured
  // coverage curve. Counters and the immediate surround of a word are driven
  // to legibility.counterInkMax of effective ink -- near-bare, roughly 6:1
  // against a stem -- and this is the DENSITY that lands there. Stating the
  // rule in ink and solving for the density is the only honest direction:
  // what a density costs in ink is a property of the baked ramp.
  const counterDensity = densityForCoverage(coverageOf, L.counterInkMax);
  gpu.uniforms.uCounterDensity.value = counterDensity;
  // the LOAD inhale runs ONCE, ever (bible 6.1 -- it is how the page opens,
  // not a transition). A resize rebuilds the lattice and recomputes the
  // starting scale, and must not replay it: a page that inhales again every
  // time the window is dragged reads as a glitch.
  let loadState = "pending";   // pending -> running -> done
  let loadStartT = 0;
  let loadScale0 = 1;

  // THE ONLY FIELD STATE THE CPU CARRIES, and it is three floats per word
  // (bible 4.3, 4.3a). Index 0 of the uniform array is word id 1.
  //
  //   x  assembly progress   0..1, the word's own clock. Advanced by dt on
  //                          route settle and then left at 1 -- words STAY
  //                          assembled, which is the whole of R2.
  //   y  hover              0..1, one ~180 ms spring driving all four of
  //                          bible 4.3a's effects.
  //   z  shiver             0..1, the re-roll spike's envelope. Separate from
  //                          the spring because it peaks and decays WHILE the
  //                          hover is still held.
  const words = [];                              // { id, el, cells, ring, progress, ... }
  const state = gpu.uniforms.uWordState.value;   // Float32Array(3 * maxWords)
  const boxes = gpu.uniforms.uWordBox.value;     // Float32Array(3 * maxWords)

  // THE PANELS' RECTS, keyed by wrapped map cell (bible 7.1a). Each panel
  // contributes the boxes of everything it says -- `content` for presence
  // (bible 4.2) and `voice` for the clearings (bible 3.2) -- in MAP px.
  //
  // Kept per panel and not as one flat list, because only the mounted panels
  // have any DOM to measure. A panel nobody has visited yet has no rects and
  // gets presence's floor, which is exactly right: it is bare field until the
  // page that lives there arrives, and it arrives before the camera does.
  const panels = new Map();          // "cx,cy" -> { content: [], voice: [] }

  let hitCursor = 0;
  // the last absolute time update() saw. setWordHover needs a clock and is
  // called from a DOM event, which has no idea what the render loop's t is.
  let lastT = 0;

  // THE CAMERA (bible 7.1a), in MAP px: the map coordinate of the viewport's
  // top left. A PAN AND A SCROLL ARE THE SAME OPERATION -- this is the 2D
  // generalisation of the scroll offset the field already had, so panning
  // reuses the machinery that already recycles cells at the viewport edge
  // rather than standing a second mechanism next to it.
  const camera = { x: 0, y: 0 };

  /**
   * the map, in cells: extent x viewport, per axis. This is what the cell data
   * texture covers, and it is why the torus is free -- the texture is sampled
   * REPEAT, so walking off the west edge samples the east panel's texels and
   * the wrap-around is literally texture wrapping.
   */
  function mapDims(vw, vh, cell) {
    const panelCols = Math.max(1, Math.ceil(vw / cell.w));
    const panelRows = Math.max(1, Math.ceil(vh / cell.h));
    return {
      panelCols, panelRows,
      cols: panelCols * MAP.extent[0],
      rows: panelRows * MAP.extent[1]
    };
  }

  /** a wrapped-cell key for the panel map. */
  const panelKey = (cell) => `${mod(cell[0], MAP.extent[0])},${mod(cell[1], MAP.extent[1])}`;

  /**
   * the cell rect of a panel in the map texture, grown by the presence falloff.
   *
   * GROWN, because presence has an 18-cell reach and a panel's content sits
   * about that far from its own edge: clipping the field exactly at the panel
   * boundary would put a hard vertical band down every seam between two
   * panels. The margin is what lets a neighbour's crowd lean over the edge.
   */
  function panelRegion(cell, margin = F.presence.falloffCells) {
    const w = [mod(cell[0], MAP.extent[0]), mod(cell[1], MAP.extent[1])];
    const m = Math.ceil(margin);
    return {
      x0: Math.max(0, w[0] * panelCols - m),
      y0: Math.max(0, w[1] * panelRows - m),
      x1: Math.min(dataCols, (w[0] + 1) * panelCols + m),
      y1: Math.min(dataRows, (w[1] + 1) * panelRows + m)
    };
  }

  /**
   * presence over the whole map, from every panel that has been measured.
   *
   * Presence is a property of the LATTICE, so it is recomputed whenever the
   * cell size changes -- which is why the rects are kept in px and converted
   * here rather than stored in cells.
   */
  function presenceForMap() {
    const rects = [];
    for (const p of panels.values()) {
      for (const r of p.content) {
        rects.push({
          x0: r.x / grid.cell.w, y0: r.y / grid.cell.h,
          x1: (r.x + r.w) / grid.cell.w, y1: (r.y + r.h) / grid.cell.h
        });
      }
    }
    if (!rects.length) return null;
    return presenceField(dataCols, dataRows, rects);
  }

  function rebuild() {
    const vw = Math.max(1, world.viewport.w);
    const vh = Math.max(1, world.viewport.h);

    // A COLLAPSED VIEWPORT IS NOT A LAYOUT, and rebuilding for one poisons the
    // page. HANDOFF.md's first pitfall is the mew-side version of this (a
    // zero-height viewport NaNs the whole scene graph); here it is quieter and
    // just as bad. A one-cell grid has a two-sample weather histogram, so the
    // contrast window bisects against noise and comes out at its own end stop,
    // and every later rebuild reuses that window -- the page stays uniformly,
    // evenly blank long after the window is back to a real size. Seen for real
    // in a preview pane, which reports 0x0 for a beat after a reload.
    //
    // So: keep the lattice we have and wait for a real resize. There is always
    // another one coming -- a viewport this small is a transient by definition.
    if ((vw < 32 || vh < 32) && grid) return;

    grid = createGrid(vw, vh, world.viewport.dpr);

    // THE TEXTURE COVERS THE WHOLE MAP, not the document (bible 7.1a). At the
    // 4 x 7 base cell on a 1512 px viewport a 3 x 3 map is 1134 x 423 texels --
    // 1.92 MB per plane, two planes, uploaded on layout and never per frame.
    const dims = mapDims(vw, vh, grid.cell);
    panelCols = dims.panelCols;
    panelRows = dims.panelRows;
    dataCols = dims.cols;
    dataRows = dims.rows;

    const bytesPerPlane = dataCols * dataRows * 4;
    if (bytesPerPlane > B.maxMapTexelBytesPerPlane) {
      console.warn(
        `[type] the map's cell texture is ${(bytesPerPlane / 1048576).toFixed(1)} MB ` +
        `per plane (${dataCols}x${dataRows}), over budget.maxMapTexelBytesPerPlane. ` +
        "Either the map extent or the viewport has outgrown the budget; see " +
        "siteConfig.budget and bible 7.1a.");
    }

    // PUBLISH THE LATTICE TO CSS. The ASCII type scale is not a taste
    // decision: bible 4.4 rule 2 needs a stem two CELLS wide, and IBM Plex
    // Mono's 700-weight stem measures 0.144 of the font size, so the smallest
    // heading that can work is about 17 cells of font size -- a number that
    // changes when the breakpoint changes the cell. Sizing the type off the
    // cell in CSS is what keeps that relationship true at every breakpoint
    // instead of true at the one it was eyeballed on.
    if (typeof document !== "undefined") {
      const root = document.documentElement.style;
      root.setProperty("--cell-w", `${grid.cell.w}px`);
      root.setProperty("--cell-h", `${grid.cell.h}px`);
    }

    viewportRows = panelRows;
    // THE WEATHER TILES OVER THE MAP (bible 7.1a). Handed in bound to these
    // dims, so the cell one step west of the west edge agrees with the east
    // edge -- otherwise the torus has a hard seam down it that you pan across
    // on every wrapping navigation.
    data = buildCellData(dataCols, dataRows, coverageOf, {
      weatherAt: weatherFor({ cols: dataCols, rows: dataRows }),
      presence: presenceForMap(),
      viewportRows
    });
    gpu.setDataSize(dataCols, dataRows, data.a, data.b);
    gpu.setViewport(vw, vh, grid.cell);

    // the inhale's starting scale, from the same measured curve the gamma came
    // from -- so "4%" is 4% of ink, not 4% of a number that happens to be
    // called density.
    const sample = [];
    for (let i = 0; i < data.a.length; i += 4 * 97) sample.push(data.a[i + 1] / 255);
    loadScale0 = solveLoadScale(sample, coverageOf, LOAD.startCoverage);

    applyClearings();
    gpu.uploadAll();
    relayoutWords();
  }

  /**
   * THE FIELD THINS UNDER VOICE TEXT (bible 3.2, 4.3).
   *
   * VOICE is "small utility text that is not made of ASCII ... it exists so the
   * eye has somewhere to rest. A page where literally everything is a crowd is
   * exhausting." A paragraph set in real ink on top of a 15%-coverage field is
   * not somewhere to rest -- it is unreadable, which was plainly true at the
   * 900 px breakpoint before this existed.
   *
   * So the same mechanism a word uses on its surroundings is applied to the
   * blocks of plain text: the RESTING DENSITY itself is thinned under them,
   * with a soft margin so the clearing has an edge rather than a box. Written
   * into the cell data at layout time, so it costs nothing per frame -- and it
   * is the field agreeing to make room, not a panel laid over the top.
   */
  function applyClearings() {
    // NO uploadAll() IN HERE. It used to live at the bottom of this function,
    // which quietly made "there are no VOICE blocks on this route" mean "and
    // nothing gets uploaded either" -- so a page of nothing but a heading kept
    // whatever density the previous route left on the GPU. The callers upload.
    if (!data) return;
    const cw = grid.cell.w;
    const ch = grid.cell.h;
    const mx = F.voiceClearMarginCells;
    const clearings = [];
    for (const p of panels.values()) clearings.push(...p.voice);
    if (!clearings.length) return;
    for (const r of clearings) {
      // FLOOR/CEIL AFTER the margin, not before. The margin is fractional
      // (3.5 cells), so subtracting it from an already-floored index gives a
      // fractional loop counter -- and a fractional index into a typed array
      // reads undefined and writes nowhere, silently. The clearing simply did
      // not happen, except for the one rect whose corner landed on zero.
      const cx0 = Math.max(0, Math.floor(r.x / cw - mx));
      const cy0 = Math.max(0, Math.floor(r.y / ch - mx));
      const cx1 = Math.min(dataCols - 1, Math.ceil((r.x + r.w) / cw + mx));
      const cy1 = Math.min(dataRows - 1, Math.ceil((r.y + r.h) / ch + mx));
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          // distance OUTSIDE the rect, in cells: 0 inside, growing outward
          const dx = Math.max(r.x / cw - cx, 0, cx - (r.x + r.w) / cw);
          const dy = Math.max(r.y / ch - cy, 0, cy - (r.y + r.h) / ch);
          const d = Math.hypot(dx, dy);
          const a = 1 - smoothstep(0, mx, d);
          if (a <= 0) continue;
          const i = (cy * dataCols + cx) * 4;
          data.a[i + 1] = Math.round(data.a[i + 1] * (1 - a * F.voiceClearAmount));
          // a cleared cell is not one of the darkest two stops any more
          if (a > 0.5) data.a[i + 3] &= ~FLAG_STRIKE_REST;
        }
      }
    }
  }

  // -- words ---------------------------------------------------------------

  /**
   * write a word's slots and its thinned ring into the cell planes, then
   * texSubImage2D just that rectangle. This is the only write that happens
   * after layout, and it happens on a route change, a resize, or a focus --
   * never on a frame.
   */
  function stampWord(word) {
    if (!data) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const touch = (cx, cy) => {
      if (cx < x0) x0 = cx;
      if (cy < y0) y0 = cy;
      if (cx > x1) x1 = cx;
      if (cy > y1) y1 = cy;
    };

    // THE TORUS APPLIES ON THE CPU TOO. A word's thinned ring reaches twelve
    // cells past the letterform, so a word near a panel's edge spills over it --
    // and on a plane that wraps, the cells it spills onto are the far side's.
    // Clipping instead would leave a word at the map's edge with half a ring.
    const tx = (cx) => mod(cx, dataCols);
    const ty = (cy) => mod(cy, dataRows);

    for (const c of word.ring) {
      c.cx = tx(c.cx); c.cy = ty(c.cy);
      const i = c.cy * dataCols + c.cx;
      // a ring cell keeps its resting density and its own glyph; all it gains
      // is a word id (so it knows when to thin) and a thinning amount.
      data.a[i * 4 + 3] = (data.a[i * 4 + 3] & 0x0f) | (word.id * FLAG_WORD_SHIFT);
      data.b[i * 4 + 2] = u8(c.thin);
      touch(c.cx, c.cy);
    }
    for (const c of word.cells) {
      c.cx = tx(c.cx); c.cy = ty(c.cy);
      const i = c.cy * dataCols + c.cx;
      data.a[i * 4 + 2] = Math.max(1, u8(c.density));   // 0 means "not a slot"
      const low = (data.a[i * 4 + 3] & 0x03) | (c.strike ? FLAG_SLOT_STRIKE : 0) |
                  (data.a[i * 4 + 3] & FLAG_STRIKE_REST);
      data.a[i * 4 + 3] = low | (word.id * FLAG_WORD_SHIFT);
      data.b[i * 4] = u8(c.offX * 0.5 + 0.5);
      data.b[i * 4 + 1] = u8(c.offY * 0.5 + 0.5);
      // texB.b IS TWO CHANNELS SHARING ONE BYTE, and which one it is depends on
      // whether the cell is a slot -- so nothing downstream may read it without
      // asking that first (the shader splits it on hasSlot, loudly).
      //
      // A ring cell needs `thin`; a slot cell needs its place in the assembly
      // stagger. Neither ever needs the other: the thinning is what a word does
      // to the cells AROUND it, and a slot is not around itself. Sharing the
      // byte is what keeps the whole of bible 4.3's self-assembly at zero extra
      // bytes per cell and zero extra uploads.
      data.b[i * 4 + 2] = u8(c.order || 0);
      data.b[i * 4 + 3] = c.glyph & 0xff;
      touch(c.cx, c.cy);
    }

    // THE HOVER FRINGE (bible 4.3a effect 3): a one-cell chromatic ghost on the
    // leading edge of each stem, baked as the spare fringe value. The shader
    // only fades it in with the spring; which cells they are is decided here,
    // once, at layout.
    //
    // A ghost must land on a cell that ALREADY BELONGS TO THIS WORD, or it
    // would have no hover value to fade with and would sit there as permanent
    // coloured ink. In practice that is always a ring cell -- the ring reaches
    // twelve cells past the letterform -- but the check is cheap and the
    // failure it prevents is the one bible 3.3's risk register is about.
    let ghosts = 0;
    for (const g of leadingEdgeGhosts(word.cells)) {
      if (g.cx < 0 || g.cy < 0 || g.cx >= dataCols || g.cy >= dataRows) continue;
      const gi = g.cy * dataCols + g.cx;
      if (((data.a[gi * 4 + 3] / FLAG_WORD_SHIFT) | 0) !== word.id) continue;
      data.a[gi * 4 + 3] = (data.a[gi * 4 + 3] & ~0x03) | FLAG_FRINGE_GHOST;
      ghosts++;
      touch(g.cx, g.cy);
    }
    word.ghostCells = ghosts;

    if (x1 < x0) return;
    word.rect = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    // the same box in DOCUMENT PX, which is the space the pointer lives in.
    // Kept here rather than recomputed per frame: it changes on layout only.
    word.rectPx = {
      x0: x0 * grid.cell.w, y0: y0 * grid.cell.h,
      x1: (x1 + 1) * grid.cell.w, y1: (y1 + 1) * grid.cell.h
    };
    // the word's centre and reach, in document px, for the BREATH to push away
    // from (bible 4.3a effect 4). Written at LAYOUT, never per frame -- it is a
    // property of where the word is, and the word does not move.
    const wi = (word.id - 1) * 3;
    boxes[wi] = word.centre ? word.centre.x : (word.rectPx.x0 + word.rectPx.x1) * 0.5;
    boxes[wi + 1] = word.centre ? word.centre.y : (word.rectPx.y0 + word.rectPx.y1) * 0.5;
    boxes[wi + 2] = 1 / Math.max(1e-3, word.radiusPx || 1);
    uploadRect(word.rect);
  }

  /** clear a word out of the planes again, and upload just its rectangle. */
  function unstampWord(word) {
    if (!data || !word.rect) return;
    const { x, y, w, h } = word.rect;
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        const i = cy * dataCols + cx;
        data.a[i * 4 + 2] = 0;
        data.a[i * 4 + 3] &= 0x07;      // keep fringe + strikeRest, drop word/slot
        // ...EXCEPT a hover ghost, which is not a resting fringe cell at all --
        // it is a property of a word that is about to stop existing. Left
        // behind it would be a chromatic cell with no word to fade it in, i.e.
        // permanent coloured ink on bare paper, which is the one thing bible
        // 3.3's risk register says kills the look.
        if ((data.a[i * 4 + 3] & 0x03) === FLAG_FRINGE_GHOST) data.a[i * 4 + 3] &= ~0x03;
        data.b[i * 4] = 128;
        data.b[i * 4 + 1] = 128;
        data.b[i * 4 + 2] = 0;
        data.b[i * 4 + 3] = 0;
      }
    }
    uploadRect(word.rect);
    word.rect = null;
  }

  const patchA = { buf: null, len: 0 };
  const patchB = { buf: null, len: 0 };
  function uploadRect(rect) {
    const need = rect.w * rect.h * 4;
    if (!patchA.buf || patchA.buf.length < need) {
      patchA.buf = new Uint8Array(need);
      patchB.buf = new Uint8Array(need);
    }
    const pa = patchA.buf.subarray(0, need);
    const pb = patchB.buf.subarray(0, need);
    for (let r = 0; r < rect.h; r++) {
      const src = ((rect.y + r) * dataCols + rect.x) * 4;
      pa.set(data.a.subarray(src, src + rect.w * 4), r * rect.w * 4);
      pb.set(data.b.subarray(src, src + rect.w * 4), r * rect.w * 4);
    }
    gpu.writeRegion(renderer, rect.x, rect.y, rect.w, rect.h, pa, pb);
  }

  /**
   * rebuild the RESTING density from the weather, the presence field and the
   * VOICE clearings, without touching the lattice. Both of the things that
   * shape it are destructive to the density, so neither can be layered on top
   * of the other -- re-deriving from the weather is what makes the result
   * independent of the order they arrived in.
   *
   * Layout only. Never per frame, and never on a scroll.
   *
   * The WINDOW is deliberately NOT recalibrated here: the mean-ink bisection
   * belongs to the lattice, and re-solving it every time a route hands over a
   * new set of rects would make the whole page's tone twitch on navigation.
   */
  function refreshRestingDensity() {
    if (!data) return;
    // THE WEATHER IS REUSED, NOT RECOMPUTED. It is the expensive half and it is
    // a property of the lattice, not of the page: three domain-warped fbm
    // lookups over half a million cells. Rebuilding it on every navigation
    // would put a third of a second of noise on the main thread at the exact
    // moment of a click, which is the one moment the page must not stall.
    const fresh = buildCellData(dataCols, dataRows, coverageOf, {
      window: data.window,
      weather: data.weather,
      presence: presenceForMap(),
      viewportRows
    });
    data.a.set(fresh.a);
    data.stats = fresh.stats;
    applyClearings();
    gpu.uploadAll();
    relayoutWords();
  }

  function relayoutWords() {
    for (const w of words) {
      w.rect = null;
      if (w.rebuild) w.rebuild(grid);
      stampWord(w);
    }
  }

  // -- the public surface --------------------------------------------------

  const api = {
    get grid() { return grid; },
    get stats() { return data ? data.stats : null; },
    gpu,

    /**
     * the composition numbers FOR ONE PANEL (bible 4.2's 12-22% mean ink and
     * 35-55% near-bare).
     *
     * Panel-scoped since R3, and it has to be: the cell texture covers the
     * whole map now, so a whole-texture mean is an average over nine panels --
     * four of which nobody has visited yet and are deliberately bare. That
     * number is not about anything. What the bible's budgets are about is the
     * composition a visitor is actually looking at, which is one panel.
     */
    panelStats(cell) {
      if (!data) return null;
      const w = [mod(cell[0], MAP.extent[0]), mod(cell[1], MAP.extent[1])];
      const x0 = w[0] * panelCols;
      const y0 = w[1] * panelRows;
      let bare = 0;
      let inkSum = 0;
      let n = 0;
      for (let cy = y0; cy < Math.min(dataRows, y0 + panelRows); cy++) {
        for (let cx = x0; cx < Math.min(dataCols, x0 + panelCols); cx++) {
          const i = cy * dataCols + cx;
          const ink = coverageOf(data.a[i * 4 + 1] / 255,
                                 (data.a[i * 4 + 3] & FLAG_STRIKE_REST) !== 0);
          if (ink < F.presence.bareInkMax) bare++;
          inkSum += ink;
          n++;
        }
      }
      return n ? { cells: n, bareFraction: bare / n, meanCoverage: inkSum / n } : null;
    },

    /**
     * EVERY CELL CURRENTLY SPENDING CHROMATIC INK, counted -- the resting
     * fringe (bible 3.3) plus the hover ghosts (bible 4.3a effect 3), which is
     * the one hover allowed to spend any.
     *
     * This exists because "inside the 4% budget" is an acceptance criterion and
     * the only honest way to check one is to count it. A ghost is counted only
     * while its word's spring is actually up; a word nobody is pointing at
     * spends nothing however many ghost cells it has baked.
     */
    chromatic(cell) {
      if (!data) return { resting: 0, ghost: 0, fraction: 0, cells: 0 };
      // PANEL-SCOPED WHEN ASKED, and asking is what you want: bible 3.3's 4% is
      // about the ink on the page in front of you, and the cell texture now
      // covers nine panels. A map-wide fraction divides by nine and would report
      // a budget breach as comfortably inside it.
      let x0 = 0;
      let y0 = 0;
      let x1 = dataCols;
      let y1 = dataRows;
      if (cell) {
        x0 = mod(cell[0], MAP.extent[0]) * panelCols;
        y0 = mod(cell[1], MAP.extent[1]) * panelRows;
        x1 = Math.min(dataCols, x0 + panelCols);
        y1 = Math.min(dataRows, y0 + panelRows);
      }
      let n = 0;
      let resting = 0;
      for (let cy = y0; cy < y1; cy++) {
        for (let cx = x0; cx < x1; cx++, n++) {
          const k = data.a[(cy * dataCols + cx) * 4 + 3] & 0x03;
          if (k === FLAG_FRINGE_A || k === FLAG_FRINGE_B) resting++;
        }
      }
      let ghost = 0;
      for (const w of words) if (w.hover > 0.01) ghost += w.ghostCells || 0;
      return { resting, ghost, cells: n, fraction: (resting + ghost) / Math.max(1, n) };
    },

    /**
     * hand the field a set of words. Each carries the cells it covers, the
     * ring it thins, and a `rebuild(grid)` that recomputes both at a new
     * breakpoint. Replaces whatever was there (a route change), unstamping the
     * old ones first so no cell is left believing it belongs to a word that
     * no longer exists.
     */
    setWords(next) {
      // A WORD THAT IS ALREADY ON THE PAGE KEEPS ITS CLOCK, keyed by its own
      // element. This is called on a route change, on a resize, on the webfont
      // settling, and twice in a row whenever anything fell back to VOICE --
      // and only the FIRST of those is a route settle. Restarting the 2.6 s
      // assembly on a window drag would make the page look like it was
      // reloading every time it was resized.
      const carried = new Map();
      for (const w of words) carried.set(w.el, w);

      for (const w of words) unstampWord(w);
      words.length = 0;
      state.fill(0);
      boxes.fill(0);
      let id = 1;
      for (const w of next) {
        if (id > W.maxWords) {
          console.warn(`[type] more than ${W.maxWords} ascii words on screen; ` +
                       "the rest render as VOICE. See siteConfig.words.maxWords.");
          break;
        }
        w.id = id++;
        // EVERY WORD ASSEMBLES, and this is the R2 change in one line. There
        // used to be two resting levels here -- a heading condensed when its
        // route arrived, a link sat at ZERO until the pointer found it -- and
        // the second of those is what hid the navigation (bible 4.3). A link is
        // not a secret. Both now run the same clock from the same trigger.
        const prev = carried.get(w.el);
        // an arriving word starts at 0; one that has been on screen keeps its
        // clock, so a re-measure mid-transit does not restart anything.
        w.progress = prev ? prev.progress : (w.exiting ? 1 : 0);
        w.hover = prev ? prev.hover : 0;
        w.hovered = prev ? prev.hovered : false;
        w.hoverT0 = prev ? prev.hoverT0 : -1e9;
        w.shiver = 0;
        // ...and once a word has been released it stays released, even if the
        // layout is re-measured underneath it.
        if (prev && prev.held === false) w.held = false;
        words.push(w);
        stampWord(w);
      }
    },

    /**
     * the document-px rects of every VOICE block. Rebuilding the cell data
     * wipes them, so they are kept and re-applied by rebuild().
     */
    /**
     * WHERE THE PAGE'S CONTENT IS, in document px. Two lists, one rebuild:
     *
     *   `content` -- everything the page actually says: headings, VOICE
     *      blocks, the portrait. Resting density is
     *      `weather x presence(distance to these)` (bible 4.2), which is what
     *      gives the page confident empty margins instead of wall-to-wall
     *      texture. The crowd gathers where there is something to say.
     *   `voice` -- the blocks of PLAIN INK specifically. The field thins under
     *      those, so the eye has somewhere to rest (bible 3.2).
     *
     * They overlap on purpose and they do not fight: presence raises the
     * density AROUND a paragraph, the clearing empties the paragraph's own
     * box. Together that is the field agreeing to make room.
     *
     * ONE CALL, because both are destructive to the density and the whole
     * thing is re-derived from the weather either way -- taking them
     * separately meant two full rebuilds per layout and a result that
     * depended on which arrived last.
     */
    setLayoutRects(cell, { content, voice }) {
      panels.set(panelKey(cell), { content: content || [], voice: voice || [] });
      refreshRestingDensity();
    },

    /**
     * forget a panel's rects. A route that unmounts stops contributing presence
     * -- otherwise a fifty-navigation session accumulates fifty pages' worth of
     * boxes on nine panels and the whole map fills in with crowd.
     */
    clearLayoutRects(cell) {
      if (panels.delete(panelKey(cell))) refreshRestingDensity();
    },

    // -- THE CAMERA (bible 7.1a) --------------------------------------------

    /** the map px of the viewport's top left. */
    get camera() { return { x: camera.x, y: camera.y }; },

    /**
     * move the camera. A PAN AND A SCROLL ARE THE SAME OPERATION -- this is the
     * scroll offset the field already had, generalised to two axes, so the pan
     * reuses the cell recycling that was already there.
     *
     * Costs nothing: two floats, read by update() on the next frame. The cells
     * that come into view were always in the texture; they were just off screen.
     */
    setCamera(x, y) {
      camera.x = x;
      camera.y = y;
    },

    /** where the camera sits when it is looking straight at a panel. */
    panelCameraPx(cell) {
      const vw = Math.max(1, world.viewport.w);
      const vh = Math.max(1, world.viewport.h);
      return { x: cell[0] * vw, y: cell[1] * vh };
    },

    /**
     * MIGRATE (bible 5, 7.1a): the whole crowd surges along the travel
     * direction, staggered by seed, AHEAD of the camera, rising and falling on
     * one bump curve. A flock taking off.
     *
     * Four floats and nothing else. There is no migrate state, no awake set and
     * nothing to reset -- the verb is a closed form of (cell seed, t01), exactly
     * like the other four, so firing it twice gives a bit-identical result and
     * abandoning one half way through costs nothing.
     */
    setTransit(dirX, dirY, t01, ampPx) {
      gpu.uniforms.uTransit.value.set(dirX, dirY, t01, ampPx);
    },

    /**
     * :focus-visible on the real DOM link forces its word to FULL assembly
     * INSTANTLY (bible 4.3). Not a re-target, not a spring: a keyboard user
     * tabbing down a nav should not have to sit out 2.6 s of condensation per
     * link to find out where they are.
     *
     * One assignment, because the per-cell delays and the remaining span are
     * complementary by construction -- at progress 1 every cell of the word is
     * fully resolved. See fieldMath.assembleResolve.
     *
     * There is no un-focus branch. A word that has assembled STAYS assembled
     * (bible 4.3); taking it back apart when focus moves on would be the
     * pointer-summons behaviour again, wearing a keyboard.
     */
    setWordFocus(el, focused) {
      if (!focused) return;
      for (const w of words) if (w.el === el) w.progress = M.gather.focusResolve;
    },

    /**
     * the beat table's 900 ms pause is over (bible 7.1a): the destination's
     * words may start condensing. Everything mounted and not leaving is
     * released at once -- the per-cell stagger inside each word is what makes
     * the heading finish last, so nothing here needs to know about order.
     */
    releaseWords() {
      for (const w of words) w.held = false;
    },

    /**
     * HOVER (bible 4.3a): a modulation of a word that is ALREADY assembled --
     * sharpen, shiver, fringe, breath, four things on one ~180 ms spring.
     *
     * All that happens on the CPU is the spring's target and the shiver's start
     * time. The four effects themselves are closed forms in the vertex shader,
     * so hovering costs no per-frame work beyond the uniform write that was
     * already happening.
     */
    setWordHover(el, hovered) {
      for (const w of words) {
        if (w.el !== el || w.hovered === hovered) continue;
        w.hovered = hovered;
        // the shiver's clock starts on the RISING EDGE only. A pointerover that
        // is really the cursor crossing between two child nodes of the same
        // link must not make the word stutter.
        if (hovered) w.hoverT0 = lastT;
      }
    },

    /**
     * SCATTER (bible 6.4). Document-space origin, unit direction, reach.
     * Non-destructive and stateless: this writes four floats into a uniform
     * slot and never touches them again. Nothing has to be reset, and firing
     * the same shot twice gives a bit-identical result.
     */
    fire(origin, dir, length, tNow) {
      const i = hitCursor % M.scatter.maxActive;
      hitCursor++;
      const len = Math.hypot(dir.x, dir.y) || 1;
      // the uniform carries a PEAK DISPLACEMENT in px; the config authors a
      // velocity, as bible 5 does. See fieldMath.peakDisplacementPx.
      const peak = peakDisplacementPx(M.scatter.impulsePxPerS);
      gpu.uniforms.uHits.value[i].set(origin.x, origin.y, tNow, peak);
      gpu.uniforms.uHitDirs.value[i].set(dir.x / len, dir.y / len, length, 0);
    },

    /** the degradation ladder's two field-side rungs (plan section 4.7). */
    setDegrade(driftScale, rerollScale) {
      gpu.uniforms.uDegrade.value.set(driftScale, rerollScale);
    },

    /**
     * ONE FRAME. About ten uniform writes and one draw call. Nothing else --
     * no loop over cells, no buffer upload, no allocation.
     */
    update(dt, t) {
      if (!grid) return;
      const u = gpu.uniforms;
      u.uTime.value = t;

      // THE CAMERA, snapped to whole cells on BOTH axes (bible 3.1): a field
      // that slides sub-cell against its own lattice is the single fastest way
      // to make this look cheap. The page's own scroll folds straight into it
      // -- a pan and a scroll are the same operation, and there is exactly one
      // mechanism here rather than two that have to agree.
      const camX = Math.round((camera.x) / grid.cell.w) * grid.cell.w;
      const camY = Math.round((camera.y + world.scroll.y) / grid.cell.h) * grid.cell.h;
      u.uCameraPx.value.set(camX, camY);
      u.uCellOrigin.value.set(
        Math.round(camX / grid.cell.w) - B.instanceMarginCells,
        Math.round(camY / grid.cell.h) - B.instanceMarginCells
      );

      const p = world.pointer;
      if (p.active) u.uPointerDoc.value.set(p.pos.x, p.pos.y);

      const mew = getMew ? getMew() : null;
      if (mew) u.uMew.value.set(mew.x, mew.y, mew.radius, 1);
      else u.uMew.value.w = 0;

      // THE ONLY FIELD STATE THE CPU CARRIES: three floats per word, and none
      // of them is read from the pointer any more (bible 4.3).
      lastT = t;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];

        // 1. ASSEMBLY. A linear clock, advanced by dt, then LEFT AT 1 -- the
        //    word stays. Linear rather than expDamp because the stagger below
        //    it is authored in SECONDS: "0.9 s of stagger inside 2.6 s" is only
        //    true of the thing on screen if progress and wall-clock agree. The
        //    easing is per-cell, in assembleResolve, where it belongs.
        //
        //    ...AND IT RUNS BACKWARDS ON THE WAY OUT (bible 7.1a): a word on
        //    the panel that is leaving dissolves back into the field as the
        //    crowd carries it off. There is no separate exit animation, because
        //    the assembly reversed IS the exit -- the same per-cell stagger, so
        //    it comes apart from the inside out, which is the right way round.
        //
        //    `held` is the beat table's 900 ms pause: the destination's DOM is
        //    mounted and measured at t=0, but its words must not start forming
        //    until the camera is most of the way there.
        if (w.exiting) {
          w.progress = Math.max(0, w.progress - dt / (AS.durationS * AS.exitScale));
        } else if (!w.held && w.progress < 1) {
          w.progress = Math.min(1, w.progress + dt / AS.durationS);
        }

        // 2. HOVER, one spring, expDamp so it is frame-rate independent like
        //    everything else in the engine.
        w.hover = expDamp(w.hover, w.hovered ? 1 : 0, HV.rate, dt);

        // 3. SHIVER: hold, then decay -- and multiplied by the spring, so
        //    leaving a word mid-spike relaxes it instead of cutting it off.
        //    Nothing snaps (bible 4.3a).
        w.shiver = shiverEnvelope(t - w.hoverT0) * w.hover;

        // the RAW clock goes to the GPU. The per-cell stagger and the resting
        // level (assemble.restResolve) are both applied in the shader, because
        // both are per-cell decisions -- scaling here would flatten the stagger
        // into the level and neither would mean anything.
        const s = i * 3;
        state[s] = w.progress;
        state[s + 1] = w.hover;
        state[s + 2] = w.shiver;
      }

      // the inhale (bible 6.1): the page opens as a near-bare field at 4% ink
      // and breathes in to rest over ~900 ms. No spinner, ever. It ends, and
      // then costs nothing at all.
      if (loadState !== "done") {
        if (loadState === "pending") { loadState = "running"; loadStartT = t; }
        const k = clamp01((t - loadStartT) / (LOAD.inhaleMs / 1000));
        u.uLoadScale.value = loadScale0 + (1 - loadScale0) * (k * k * (3 - 2 * k));
        if (k >= 1) { loadState = "done"; u.uLoadScale.value = 1; }
      }
    },

    render() {
      gpu.render(renderer);
    },

    /** viewport or document size changed: rebuild the lattice and the content. */
    layout() {
      rebuild();
    }
  };

  rebuild();

  // -- subscriptions, all through the scope --------------------------------
  // world.on() returns an unsubscribe (phase 0's fix), and every one of them
  // is registered here, so a route teardown or a full dispose takes the lot.
  // Nothing in the type layer calls addEventListener directly.
  if (world && scope) {
    scope.add(world.on("resize", () => api.layout()));
    scope.add(world.on("docresize", () => api.layout()));

    // THE BEAM DISPLACES TYPE (bible 6.4). It replaces fx/destruction.js
    // outright: nothing is removed, no state persists, there is nothing to
    // reset. main.js re-emits the shot as "beamShot" because the brain's own
    // "beamFire" carries only a direction -- the document-space origin needs
    // the mouth anchor, which is a scene-graph object. Both names are accepted
    // so that if the origin ever moves into the engine's own event, this keeps
    // working with no change here.
    const onShot = (p) => {
      if (!p || !p.origin || !p.dir) return;
      api.fire(p.origin, p.dir, p.length ?? Math.max(world.docSize.w, world.docSize.h), world.time);
    };
    scope.add(world.on("beamShot", onShot));
    scope.add(world.on("beamFire", onShot));
  }

  return api;
}

export default createField;
