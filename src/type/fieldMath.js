// fieldMath.js
// THE JS MIRROR OF THE FIELD'S SHADER, and the reason GLSL-resident motion is
// debuggable at all here. Same contract as fx/presentMath.js and
// fx/beamGeometry.js: every analytic function the vertex shader evaluates
// exists in this file first, in plain JS, unit-tested headlessly -- and the
// shader is REQUIRED to match it. The GLSL is exported from here too, as
// strings, so the two live in one file and cannot drift apart in a rebase.
//
// Read DESIGN_BIBLE.md 7.3 before changing anything here. The field is a PURE
// FUNCTION of (cell identity, absolute time, a handful of globals). There is no
// integration loop, no awake set, no sleeping predicate and no per-frame buffer
// upload -- and the reason all four motion verbs fit in a pure function is that
// bible 5 specified them as overdamped and non-interacting in the first place.
//
// Two rules for anything added below:
//
//   1. IT MUST BE A FUNCTION OF ABSOLUTE TIME, never of dt. Not "for
//      performance" -- it is what makes the whole thing testable: evaluating at
//      t is identical however you got to t, so a test can jump straight there
//      and there is no such thing as a frame-rate-dependent bug to look for.
//   2. IT MUST BE FLOAT32-HONEST. GLSL highp is IEEE-754 single precision and
//      JS doubles are not, so every step that a hash depends on goes through
//      Math.fround (see f32/hash below). Without that the two diverge in the
//      third decimal and every "the shader matches the mirror" check becomes a
//      tolerance argument.
//
// PURE: no dom, no three.js, no window. It runs in test/type.test.js.

import { siteConfig } from "../config/siteConfig.js";

const M = siteConfig.motion;
const F = siteConfig.field;

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// float32 arithmetic, because the other half of this file is a shader
//
// Math.fround after every operation is what makes hash11 below produce the same
// bits in JS that it produces in GLSL highp. It is not free, and it is only
// applied inside the hash chain -- the smooth functions (falloffs, the impulse
// response) are continuous, so a double-vs-float difference there is a rounding
// error you cannot see. In a hash it is the entire output.
// ---------------------------------------------------------------------------

const f32 = Math.fround;

/** GLSL fract(): x - floor(x). Note this is NOT JS's % for negative x. */
export function fract(x) {
  return x - Math.floor(x);
}

export function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** GLSL mix(). */
export function mix(a, b, t) {
  return a + (b - a) * t;
}

/** GLSL smoothstep(). Returns 0 below e0, 1 above e1, C1 continuous at both. */
export function smoothstep(e0, e1, x) {
  if (e1 === e0) return x < e0 ? 0 : 1;
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// FROZEN RANDOMNESS (bible 3.5)
//
// "Every random choice on this site is a stable hash of the cell's identity,
// not a per-frame roll. This is the difference between cryptic and noisy."
//
// The Dave Hoskins style fract-multiply hash: no sin(), because sin's precision
// is implementation-defined across GPUs and a field seeded through it looks
// subtly different on different hardware. Every line is fround'ed so this is
// literally the same arithmetic the shader does.
// ---------------------------------------------------------------------------

/** one float in -> one float out, in [0,1). */
export function hash11(p) {
  let x = f32(fract(f32(p * 0.1031)));
  x = f32(x * f32(x + 33.33));
  x = f32(x * f32(x + x));
  return fract(x);
}

/** two floats in -> one float out, in [0,1). */
export function hash21(x, y) {
  let px = f32(fract(f32(x * 0.1031)));
  let py = f32(fract(f32(y * 0.1030)));
  const d = f32(px * f32(py + 33.33) + py * f32(px + 33.33));
  let r = f32(d + 33.33);
  r = f32(r * r);
  return fract(r);
}

/**
 * the per-cell seed, from the cell's DOCUMENT grid coordinate.
 *
 * Document coordinate, not viewport coordinate, and not instance index: that is
 * what lets a cell keep its identity across a scroll and across a route swap,
 * which is the entire mechanism behind the transition in bible 7.1. Scroll the
 * page and a cell's drift phase does not change, because its identity did not.
 */
export function cellSeed(cx, cy) {
  return hash21(cx + 0.5, cy + 0.5);
}

// ---------------------------------------------------------------------------
// VALUE NOISE + fbm + THE DOMAIN WARP  (bible 4.2, "the page has weather")
//
// This is the one part of the file that never runs per frame: the resting
// density is precomputed into the cell data texture at layout time (plan phase
// 3). It lives here anyway because it is analytic, because it is the thing most
// likely to be wrong in a way only a test can see, and because "uniform random
// characters look like static and are the most common way this aesthetic fails"
// is the single highest-likelihood entry in the risk register.
// ---------------------------------------------------------------------------

/**
 * 2-D value noise on the integer lattice, smoothstep-interpolated.
 *
 * `px`/`py` OPTIONALLY WRAP THE LATTICE, which is what makes the weather TILE
 * (bible 7.1a). The plane is a torus, so the cell one step west of the map's
 * west edge is the map's east edge -- and if the noise does not agree, that
 * seam is a hard vertical discontinuity in the resting density, one column
 * wide, running the full height of the map. It is very visible: you pan across
 * it every time a navigation wraps, which is exactly the navigation the torus
 * exists to make possible.
 *
 * Wrapping the four lattice CORNERS is all it takes, and it costs two modulos.
 */
export function valueNoise2(x, y, px = 0, py = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const wx = px > 0 ? (n) => ((n % px) + px) % px : (n) => n;
  const wy = py > 0 ? (n) => ((n % py) + py) % py : (n) => n;
  const x0 = wx(ix);
  const x1 = wx(ix + 1);
  const y0 = wy(iy);
  const y1 = wy(iy + 1);
  const a = hash21(x0, y0);
  const b = hash21(x1, y0);
  const c = hash21(x0, y1);
  const d = hash21(x1, y1);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

/**
 * fractal sum of value noise. Returns roughly [0,1].
 *
 * `px`/`py` are the BASE octave's lattice period. Each octave doubles the
 * frequency AND the period together, so every octave tiles over the same span
 * of input and therefore so does the sum. That only works exactly while the
 * lacunarity is an integer -- it is 2, and weatherFor below asserts it rather
 * than assuming it, because a fractional lacunarity would put the seam back
 * without anything failing.
 */
export function fbm2(x, y, octaves = F.weather.octaves,
                     lacunarity = F.weather.lacunarity, gain = F.weather.gain,
                     px = 0, py = 0) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let fx = x;
  let fy = y;
  let ox = px;
  let oy = py;
  for (let i = 0; i < octaves; i++) {
    // the per-octave offset stops the octaves from sharing lattice lines, which
    // otherwise leaves a faint grid in the result -- and a faint grid on a
    // field that is itself a grid reads as moire, not as weather. A constant
    // offset does not disturb the tiling: shifting a periodic function leaves
    // it periodic.
    sum += amp * valueNoise2(fx + i * 17.13, fy - i * 9.71, ox, oy);
    norm += amp;
    amp *= gain;
    fx *= lacunarity;
    fy *= lacunarity;
    ox *= lacunarity;
    oy *= lacunarity;
  }
  return sum / norm;
}

/**
 * THE WEATHER: domain-warped fbm over DOCUMENT cell coordinates, in [0,1].
 *
 * The warp is what turns fbm into weather. Plain fbm reads as clouds -- soft,
 * isotropic, everywhere the same. Displacing the sample point by a second noise
 * field shears those clouds into DRIFTS: long banks of dense text with clearings
 * torn between them, which is what bible 4.2 asks for at a scale of 20-40 cells
 * and what the Otaku poster actually does.
 *
 * `cx, cy` are document cell indices, so the weather is nailed to the document
 * and scrolls with it rather than swimming under the page.
 */
export function weatherAt(cx, cy, cfg = F.weather) {
  return weatherFor(null, cfg)(cx, cy);
}

/**
 * THE WEATHER, BOUND TO A MAP SO IT TILES (bible 7.1a).
 *
 * `size` is the map's cell dimensions, `{ cols, rows }`, or null for the old
 * unbounded behaviour. Returns `(cx, cy) -> [0,1]`.
 *
 * -- how the tiling is made exact, and why the scale moves a little ----------
 * For the noise to wrap it has to complete a whole number of lattice cells
 * across the map, and the authored scale almost never does: at the 4 x 7 base
 * cell a 3 x 3 map is 1134 x 423 cells, and the 30-cell weather scale puts 37.8
 * lattice cells across it. So the scale is SNAPPED to the nearest whole number
 * of lattice cells per axis -- 38 across and 14 down, here -- which moves the
 * weather scale by about 1% and makes it a fraction of a percent anisotropic.
 * Both are invisible at a 20-40 cell drift. The seam is not.
 *
 * The warp field gets the same treatment. A displacement that is itself
 * periodic over the map leaves the composition periodic, so the drifts wrap
 * with their shapes intact rather than being cut off at the edge.
 */
export function weatherFor(size, cfg = F.weather) {
  const warpScale = 1 / Math.max(1e-6, cfg.warpScaleCells);
  const driftScale = 1 / Math.max(1e-6, mix(F.weatherCellsMin, F.weatherCellsMax, 0.5));

  if (!size || !(size.cols > 0) || !(size.rows > 0)) {
    return (cx, cy) => {
      const wx = fbm2(cx * warpScale + 41.7, cy * warpScale - 13.2, 2) - 0.5;
      const wy = fbm2(cx * warpScale - 27.4, cy * warpScale + 61.9, 2) - 0.5;
      const px = (cx + wx * cfg.warpCells * 2) * driftScale;
      const py = (cy + wy * cfg.warpCells * 2) * driftScale;
      return clamp01(fbm2(px, py, cfg.octaves));
    };
  }

  // an integer lacunarity is what lets every octave tile over the same span.
  if (!Number.isInteger(cfg.lacunarity)) {
    throw new Error(
      `weatherFor: lacunarity must be an integer for the weather to tile ` +
      `across the map (got ${cfg.lacunarity}); see bible 7.1a.`);
  }

  // snap each scale so a whole number of lattice cells spans the map.
  const snap = (span, scale) => Math.max(1, Math.round(span * scale)) / span;
  const dsx = snap(size.cols, driftScale);
  const dsy = snap(size.rows, driftScale);
  const wsx = snap(size.cols, warpScale);
  const wsy = snap(size.rows, warpScale);
  // ...and the lattice periods those imply, which are integers by construction.
  const dpx = Math.round(size.cols * dsx);
  const dpy = Math.round(size.rows * dsy);
  const wpx = Math.round(size.cols * wsx);
  const wpy = Math.round(size.rows * wsy);

  return (cx, cy) => {
    const wx = fbm2(cx * wsx + 41.7, cy * wsy - 13.2, 2, cfg.lacunarity, cfg.gain, wpx, wpy) - 0.5;
    const wy = fbm2(cx * wsx - 27.4, cy * wsy + 61.9, 2, cfg.lacunarity, cfg.gain, wpx, wpy) - 0.5;
    // THE WARP IS APPLIED IN CELLS AND THEN SCALED, so the displacement is
    // periodic in the same span the base field is -- which is what keeps the
    // composition periodic rather than merely nearly so.
    const px = (cx + wx * cfg.warpCells * 2) * dsx;
    const py = (cy + wy * cfg.warpCells * 2) * dsy;
    return clamp01(fbm2(px, py, cfg.octaves, cfg.lacunarity, cfg.gain, dpx, dpy));
  };
}

/**
 * the weather remapped through a CONTRAST WINDOW, which is the knob the
 * coverage calibration below turns. Kept separate from weatherAt so the
 * expensive part (the fbm) can be sampled once and re-mapped cheaply during
 * the bisection.
 *
 * A WINDOW AND NOT A GAMMA, and this is the difference between the page having
 * weather and the page being static.
 *
 * fbm is roughly gaussian: raised to any power it is still a hump around its
 * middle, so every cell lands in the midtones and the whole page comes out one
 * even grey with a bit of wobble in it. That is precisely bible 8's "uniform
 * random characters with no density structure", and at a 7 px cell it is worse
 * than it sounds -- the tonal difference between density 0.10 and 0.25 is a
 * full stop against a colon, which nobody can see.
 *
 * A narrow smoothstep window instead pushes most of the field to BARE PAPER
 * and the crests to SOLID, with the midtones living only in the transition
 * bands. Which is exactly the Otaku poster's logic in bible 2: "darks are solid
 * runs of one repeated dense glyph, midtones are sparse fringes, lights are
 * isolated punctuation on bare paper." Value comes from mass and sparsity, not
 * from a grey ramp.
 */
export function shapeDensity(w, lo, width = F.weather.contrastWidth) {
  return smoothstep(lo, lo + width, w);
}

/**
 * CALIBRATE THE WEATHER TO A MEASURED MEAN INK COVERAGE (bible 4.2: 12-22%).
 *
 * `coverageOf(density)` is what the ramp actually gives you at that density --
 * the ink fraction of the glyph the LUT would pick, which for this atlas tops
 * out at 0.34 and is nowhere near linear in density. That is exactly why this
 * is a bisection over measured values rather than a gamma somebody chose by
 * eye: the relationship between "how dark I asked for" and "how much ink landed"
 * is a property of the baked table, and it changes whenever the table does.
 *
 * Monotone in gamma (a bigger gamma darkens nothing and lightens everything),
 * so bisection is exact rather than merely convergent.
 */
export function calibrateWindow(samples, coverageOf, target, cfg = F.weather,
                                opts = {}) {
  // `struckOf(i)` MUST reflect the real OVERSTRIKE policy, not the config
  // threshold. The contrast window deliberately saturates the crests at 1.0, so
  // "density >= 0.72" is true of every crest cell there is -- while the field
  // only ever strikes the darkest few per cent of them (bible 3.4a: the last
  // two stops). Calibrating against the threshold therefore credits the page
  // with 0.56 ink per crest cell instead of 0.3, and the bisection compensates
  // by lightening everything: the inverted-cell version of this mistake
  // measured a 15% page and shipped a 9% one, outside bible 4.2's band at the
  // wrong end.
  //
  // PRESENCE IS DELIBERATELY NOT IN HERE, and that is the whole design of
  // bible 4.2's two-factor density:
  //
  //     density = weather(warpedNoise)  x  presence(distance to content)
  //
  // The window belongs to the WEATHER. What it calibrates is "how dark is the
  // crowd", and the crowd is exactly where presence is 1 -- so a bisection run
  // as if the page were fully present lands the crowd on target by
  // construction, and the margins are empty afterwards because presence says
  // so, not because the calibration was talked into it.
  //
  // Two things went wrong when presence WAS in here, and both are worth
  // recording because both look like reasonable ideas:
  //
  //   * FLAT, over every cell: with half the page deliberately emptied, no
  //     window position can lift the mean back to 15%, so the bisection runs
  //     off its own end, returns windowMin, and every present cell saturates
  //     at density 1.0. Measured: content at 28% ink with no structure left in
  //     it -- bible 8's wall-to-wall texture wearing the margins as an alibi.
  //   * WEIGHTED by presence: closer, but it makes the window a function of
  //     the LAYOUT, and the layout is measured after the first lattice is
  //     built. The window then depends on when the DOM happened to be ready --
  //     and a resize during a route change calibrated against a page whose
  //     rects were all still zero, which produced a window of -0.2 and a field
  //     that was uniformly, evenly blank.
  //
  // So the mean the bisection targets is a property of the weather and of the
  // ramp, and of nothing else. Bible 4.2's other number -- 35-55% of the
  // viewport near-bare -- is then delivered entirely by presence, which is the
  // factor that was introduced to deliver it.
  const struckOf = opts.struckOf || null;
  const meanCov = (lo) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const d = shapeDensity(samples[i], lo, cfg.contrastWidth);
      sum += coverageOf(d, struckOf ? struckOf(i) : undefined);
    }
    return sum / Math.max(1, samples.length);
  };
  // sliding the window UP lightens the page, so the mean is monotone
  // DECREASING in lo -- which is what makes this an exact bisection rather
  // than a hopeful one.
  let lo = cfg.windowMin;
  let hi = cfg.windowMax;
  if (meanCov(lo) < target) return lo;   // target unreachable: closest end,
  if (meanCov(hi) > target) return hi;   // never a converged lie
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) * 0.5;
    if (meanCov(mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

// ---------------------------------------------------------------------------
// PRESENCE (bible 4.2) -- the second factor of resting density.
//
//     density = weather(warpedNoise)  x  presence(distance to the page's content)
//
// WEATHER ALONE IS NOT COMPOSITION, and the first build proved it. Noise that
// is statistically identical everywhere covers the viewport corner to corner
// with an even grey -- "the cloud is a field pattern everywhere on the screen"
// -- while every reference in future-refs/ has large, confident, deliberate
// EMPTY PAPER in it. The Otaku poster is more than half bare.
//
// So the crowd gathers where the page has something to say and thins to paper
// where it does not. It is computed ONCE AT LAYOUT from the DOM's own rects,
// which is what makes it automatically correct on every breakpoint and every
// route -- a hand-placed void can disagree with the layout; this one cannot.
//
// Pure, and separate from the DOM on purpose: it takes rects in CELL space and
// returns an array, so the acceptance number in bible 4.2 (35-55% of the
// viewport near-bare) is something a headless test can assert.
// ---------------------------------------------------------------------------

/**
 * presenceField(cols, rows, rects, cfg) -> Float32Array(cols*rows), 0..1
 *
 * `rects` are { x0, y0, x1, y1 } in CELL coordinates, half-open, already in the
 * document grid's own space. Cells inside any rect (grown by `padCells`) are at
 * full presence; everything else falls off over `falloffCells` to `floor`.
 *
 * The distance is a two-pass CHAMFER transform, which is O(cells) and gives a
 * Euclidean distance to within about 2% -- far inside what an 18-cell soft
 * falloff can express. The obvious alternative, testing every cell against
 * every rect, is O(cells x rects) and on a long page with thirty paragraphs
 * that is real time at every layout.
 */
export function presenceField(cols, rows, rects, cfg = F.presence) {
  const n = cols * rows;
  const out = new Float32Array(n);
  const floor = cfg.floor;

  // NO CONTENT MEANS NO COMPOSITION TO ANCHOR TO, and the honest answer then is
  // a full field rather than a blank page: an empty route, or a first paint
  // before the DOM has been measured, must not flash a bare sheet.
  if (!rects || !rects.length) { out.fill(1); return out; }

  const INF = 1e9;
  const d = new Float32Array(n).fill(INF);
  const pad = cfg.padCells;
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x0 - pad));
    const y0 = Math.max(0, Math.floor(r.y0 - pad));
    const x1 = Math.min(cols - 1, Math.ceil(r.x1 + pad));
    const y1 = Math.min(rows - 1, Math.ceil(r.y1 + pad));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) d[cy * cols + cx] = 0;
    }
  }

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

  // smoothstep, not linear: the falloff has to be C1 at both ends or the edge
  // of the halo is a visible contour line through the field, which reads as a
  // box around the paragraph -- exactly the "panel laid over the page" the
  // whole mechanism exists to avoid.
  for (let i = 0; i < n; i++) {
    out[i] = floor + (1 - floor) * (1 - smoothstep(0, cfg.falloffCells, d[i]));
  }
  return out;
}

// ---------------------------------------------------------------------------
// VERB 1 -- DRIFT (bible 5)
//
// "Cell wanders +/-1 cell on a low-frequency NOISE FIELD (~0.15 Hz)."
//
// THE WORD THAT MATTERS IN THAT SENTENCE IS "FIELD", and getting it wrong
// wrecks the whole look. The first version here gave every cell its own phase
// and its own rate, which is a perfectly good way to make seventeen thousand
// things move independently -- and it destroys the lattice, because at any
// instant every cell is somewhere different in its own wander and no two
// neighbours line up. A page whose glyphs do not sit in columns is not a field
// of type; it is bible 8's static, and no amount of density structure
// underneath will read through it.
//
// Sampled from a SPATIALLY SMOOTH field instead, neighbours drift TOGETHER: the
// lattice stays locally intact and the whole sheet undulates, which is the
// "breathing" in bible 5's feel column. Two plane waves at incommensurate
// angles and rates make that field in closed form for a handful of sin() calls
// -- no lattice noise, nothing to sample, nothing to store.
//
// On top of it sits a small per-cell GRAIN from the frozen seed, so the sheet
// is not a rigid plate. Coherent plus grain sums to wanderCells.
// ---------------------------------------------------------------------------

/**
 * drift displacement in PIXELS. Returns [dx, dy].
 *
 * `cx, cy` are DOCUMENT cell indices -- the coherent field is a function of
 * where the cell is, so it scrolls with the page rather than swimming under it.
 * `cellW/cellH` are the cell size, so the excursion is authored in CELLS
 * (motion.drift.wanderCells) and lands in px wherever the breakpoint puts it.
 */
export function drift(seed, t, cx, cy, cellW, cellH, cfg = M.drift) {
  const amp = cfg.wanderCells;
  const k = TAU / Math.max(1e-6, cfg.waveCells);
  const w = TAU * cfg.hz;

  // two plane waves, deliberately at unrelated angles and rates so the field
  // never resolves into a visible stripe
  const a1 = cx * k * 0.86 + cy * k * 0.51 + t * w;
  const a2 = cx * k * -0.44 + cy * k * 0.90 - t * w * cfg.hzRatio;
  const co = cfg.coherentCells;
  let dx = (Math.sin(a1) * 0.62 + Math.cos(a2) * 0.38) * co;
  let dy = (Math.cos(a1 * 0.83) * 0.62 + Math.sin(a2 * 1.17) * 0.38) * co;

  // ...and the grain: per-cell, small, at its own rate so the sheet is cloth
  // rather than plate.
  const g = cfg.grainCells;
  if (g > 0) {
    const rate = 1 + (seed - 0.5) * 2 * cfg.rateJitter;
    dx += Math.sin(w * rate * t + seed * 61.7) * g;
    dy += Math.cos(w * rate * t + seed * 113.9) * g;
  }
  return [dx * amp * cellW, dy * amp * cellH];
}

// ---------------------------------------------------------------------------
// VERB 2 -- GATHER (bible 4.3, 5)
//
// "Radius-weighted lerp from drift home to word slot. Outside-in. The falloff
// is continuous -- never a binary in-range/out-of-range snap."
//
// THE TRIGGER MOVED IN R2 AND THE VERB DID NOT. "Outside-in" used to mean
// "outward from wherever the cursor is", which made a word's legibility a
// function of where the mouse happened to be -- and a page whose navigation
// only exists under the cursor is a page most people never find the navigation
// on (bible 4.3). It now means outward from the WORD'S OWN CENTRE, on a clock
// that starts when the route settles: same falloff, same continuity, no pointer.
// See assembleResolve below.
//
// gatherFalloff survives as the pointer's small local influence on the FIELD --
// it calms the drift and firms the crowd under the cursor, and touches no word.
// ---------------------------------------------------------------------------

/**
 * 1 at the pointer, 0 beyond `radius`, smooth at both ends. The inner plateau
 * is where the effect is at full strength before the cursor is exactly on a
 * cell, so the field's response to the mouse has no hard edge on it.
 */
export function gatherFalloff(dist, radius = M.gather.radiusPx, cfg = M.gather) {
  const inner = radius * cfg.innerFraction;
  return 1 - smoothstep(inner, radius, dist);
}

/**
 * how much a cell has resolved into its word.
 *
 * THE POINTER IS NOT IN HERE ANY MORE (bible 4.3, R2). It used to be
 * `max(wordResolve, gatherFalloff(pointerDist))`, which made a word's
 * legibility a function of where the mouse was -- and a page whose navigation
 * only exists under the cursor is a page most people never find the navigation
 * on. A cell resolves because its WORD is assembling; nothing else.
 *
 * `progress` is the word's own 0..1 assembly clock. `order` is the cell's place
 * in the stagger: 0 at the word's outer edge, 1 at its centre, so the silhouette
 * arrives before the interior detail. `seed` is the cell's frozen randomness,
 * which is what stops the wavefront being a clean geometric wipe.
 *
 * Every cell finishes by progress = 1 exactly, because the delay range and the
 * remaining span are complementary -- which is what makes ":focus-visible forces
 * full assembly instantly" a single assignment rather than a special case.
 */
export function assembleResolve(progress, order, seed, cfg = M.assemble) {
  const staggerFrac = clamp01(cfg.staggerS / Math.max(1e-6, cfg.durationS));
  const delay = staggerFrac * clamp01(mix(seed, order, cfg.orderWeight));
  const span = Math.max(1e-6, 1 - staggerFrac);
  const k = clamp01((progress - delay) / span);
  return k * k * (3 - 2 * k);
}

/**
 * MIGRATE (bible 5, 7.1a) -- THE FIFTH VERB.
 *
 * "The whole crowd surges along the travel direction, staggered by seed, ahead
 * of the camera. Rises and falls on one bump curve. A flock taking off."
 *
 * `t01` is the transit's own 0..1 clock; `seed` is the cell's frozen
 * randomness. Returns the displacement along the travel direction as a
 * fraction of the peak, in [0, 1].
 *
 * ONE BUMP, ASYMMETRIC: a quick take-off and a long settle, because that is
 * what a flock does and because the beat table needs the crowd to be
 * DECELERATING while the camera is still arriving (bible 7.1a: "~900 the bump
 * falls, the crowd decelerates ahead of the camera"). A symmetric bump puts the
 * crowd's peak at the same moment as the camera's and the two read as one
 * object sliding.
 *
 * Zero slope at both ends, so a cell leaves and returns without a kink -- and
 * exactly zero at t01 = 0 and 1, which is what makes abandoning a transit half
 * way through free. There is no migrate state anywhere: this is a closed form
 * of (seed, t01), like every other verb.
 */
export function migrateBump(seed, t01, cfg = siteConfig.transit) {
  const stagger = clamp01(cfg.migrateStagger);
  const span = Math.max(1e-6, 1 - stagger);
  const k = clamp01((t01 - clamp01(seed) * stagger) / span);
  const peak = clamp01(cfg.migratePeak);
  return smoothstep(0, peak, k) * (1 - smoothstep(peak, 1, k));
}

/**
 * THE SHIVER's envelope (bible 4.3a): flat for shiverHoldS, then exponential
 * decay. `tau` is seconds since the pointer arrived.
 *
 * Held rather than decaying from t=0 because "spikes to ~8x for 250 ms, then
 * decays back" is two phases, and a pure decay spends most of the 250 ms
 * already halfway home -- the word settles before it has finished reconsidering.
 */
export function shiverEnvelope(tau, cfg = M.hover) {
  if (tau <= 0) return 0;
  if (tau <= cfg.shiverHoldS) return 1;
  return Math.exp(-(tau - cfg.shiverHoldS) * cfg.shiverDecayRate);
}

// ---------------------------------------------------------------------------
// VERBS 3+4 -- SCATTER and SETTLE, as ONE function (bible 6.4, 7.3)
//
// "SCATTER + SETTLE is a critically damped impulse response,
//  displacement = impulse * tau * e^(-k*tau) where tau = t - tHit -- closed
//  form, and MORE faithful to the specified overdamped behaviour than an
//  integrator."
//
// Two things follow from it being one function rather than two states, and both
// are things the acceptance test asks for:
//
//   * NOTHING PERSISTS. There is no "struck" flag to clear, no awake set to
//     drain, no reset path. Fire twice in the same place and the second is
//     identical to the first, because the only inputs are the hit's own numbers
//     and the clock.
//   * IT ARRIVES AT ITS OWN TIME. Shifting tau by a per-cell fraction of a
//     second gives the outbound flick AND the settle a spread for free, which
//     is the "reassembles like sand rather than snapping back" in bible 6.4.
// ---------------------------------------------------------------------------

/**
 * the normalized critically damped impulse response: 0 at tau=0, peak of
 * exactly 1 at tau = 1/k, monotone decay after.
 *
 * Normalized deliberately, so this is a pure SHAPE and everything about it is
 * checkable without also having to know an amplitude. The amplitude comes from
 * peakDisplacementPx below.
 */
export function impulseResponse(tau, k = M.settle.impulseRate) {
  if (tau <= 0) return 0;
  return Math.E * k * tau * Math.exp(-k * tau);
}

/**
 * the peak excursion, in px, of a cell given a VELOCITY impulse in px/s.
 *
 * bible 5 authors the scatter as `scatterImpulse 900 px/s at the beam axis`,
 * which is a velocity: the raw response `v0 * tau * e^(-k*tau)` peaks at
 * `v0 / (k*e)`. Feeding 900 straight into the NORMALIZED response instead
 * means 900 px of travel -- cells leave the viewport, land on top of other
 * content, and the beam reads as the page falling apart rather than as type
 * being displaced. At k = 5.1167 the honest number is 65 px, about nine cells,
 * which is a shove you can see and a word you can still find afterwards.
 */
export function peakDisplacementPx(velocityPxPerS, k = M.settle.impulseRate) {
  return velocityPxPerS / (k * Math.E);
}

/**
 * what fraction of the peak is left at `tau`. The acceptance test is that this
 * is under motion.settle.residual by motion.settle.durationS -- i.e. that the
 * three config numbers are consistent, which is the only way durationS can be
 * changed without silently leaving cells wandering.
 */
export function settleResidual(tau, k = M.settle.impulseRate) {
  return impulseResponse(tau, k);
}

/**
 * the k that puts the response at `residual` of its peak by time T.
 * Solves z*e^(1-z) = residual for z = k*T by bisection. Exported so the test
 * can re-derive motion.settle.impulseRate rather than trusting the comment
 * next to it.
 */
export function solveImpulseRate(durationS, residual) {
  const f = (z) => z * Math.exp(1 - z);
  let lo = 1;
  let hi = 200;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) * 0.5;
    if (f(mid) > residual) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) * 0.5) / durationS;
}

/**
 * a hit's effect on one cell. Pure, closed form, no state.
 *
 *   hit  = { ox, oy, dx, dy, len, tHit, strength }   document space, dir unit
 *   home = the cell's home in document px
 *
 * Returns { dx, dy, smudge, spin } -- a displacement in px, a density bump
 * ("struck = smudged"), and a small rotation for the quad ("tumbles slightly").
 * All three ride the SAME envelope, so they begin and end together and there is
 * exactly one thing that has to reach zero for the hit to be over.
 */
export function scatterAt(hit, homeX, homeY, t, seed, cfg = M.scatter) {
  const relX = homeX - hit.ox;
  const relY = homeY - hit.oy;

  // along / across the corridor. dir is unit, so these are just projections.
  const along = relX * hit.dx + relY * hit.dy;
  const across = relX * -hit.dy + relY * hit.dx;

  // behind the muzzle, or past the end of the shot: untouched. Note the beam's
  // reach is already computed by fx/beamGeometry.beamLength in main.js, so this
  // agrees with what was actually drawn.
  if (along < 0 || along > hit.len) return ZERO_HIT;

  const wAcross = 1 - smoothstep(0, cfg.corridorHalfWidthPx, Math.abs(across));
  if (wAcross <= 0) return ZERO_HIT;
  const wAlong = 1 - cfg.muzzleFalloff * clamp01(along / Math.max(1e-6, hit.len));

  // THE PER-CELL ARRIVAL OFFSET. This is the whole "arriving at slightly
  // different times" clause, and it costs one subtraction.
  const tau = t - hit.tHit - seed * cfg.arrivalSpreadS;
  const env = impulseResponse(tau, M.settle.impulseRate);
  if (env <= 0) return ZERO_HIT;

  const amp = hit.strength * wAcross * wAlong * env;

  // the direction: mostly along the beam NORMAL (blown sideways out of the
  // corridor), with a smaller shove down the beam. A cell sitting exactly on
  // the axis has no side to be blown to, so it takes the sign from its seed
  // rather than from a normalize() of a zero vector.
  const side = across === 0 ? (seed < 0.5 ? -1 : 1) : Math.sign(across);
  const nx = -hit.dy * side;
  const ny = hit.dx * side;
  const ax = cfg.axialFraction;
  const ux = nx * (1 - ax) + hit.dx * ax;
  const uy = ny * (1 - ax) + hit.dy * ax;
  const ul = Math.hypot(ux, uy) || 1;

  return {
    dx: (ux / ul) * amp,
    dy: (uy / ul) * amp,
    // normalized 0..1 strike strength, for the smudge and the fringe spike
    hitAmount: clamp01(wAcross * wAlong * env),
    spin: (seed - 0.5) * 2 * cfg.tumbleRad * clamp01(wAcross * env)
  };
}

const ZERO_HIT = Object.freeze({ dx: 0, dy: 0, hitAmount: 0, spin: 0 });

// ---------------------------------------------------------------------------
// GLYPH RE-ROLL (bible 3.5, 5)
//
// "Glyph re-rolls on a per-cell Poisson timer, mean 2.5 s ... The apparent
// rapid change comes from thousands of cells each changing rarely -- never from
// any one cell flickering."
//
// A Poisson process has no closed form, but what the eye is actually reading is
// (a) cells not changing in lockstep and (b) a cell's own gaps not being
// identical. Both are closed form: the mean interval varies per cell, and each
// EVENT's time is jittered by a hash of (cell, event index).
//
// rerollJitter is held under 0.5 for a reason -- above it, event k+1 can be
// scheduled before event k, and a cell told to re-roll into the past flickers.
// ---------------------------------------------------------------------------

/**
 * which re-roll slot a cell is in at time t. Monotone non-decreasing in t,
 * which is what makes the glyph stable between events.
 */
export function rerollSlot(seed, t, cfg = M.drift) {
  const period = cfg.glyphRerollMeanS *
    (1 + (hash11(seed * 313.7) - 0.5) * 2 * cfg.rerollRateJitter);
  const u = t / Math.max(1e-6, period) + seed * 7.13;
  const k = Math.floor(u);
  // the jittered boundary: event k actually fires at (k + j) where j is a
  // stable hash of the event itself, so a cell's gaps vary the way a Poisson
  // process's do without anything having to remember when the last one was.
  const j = hash21(seed * 977.0, k) * cfg.rerollJitter;
  return (u - k) < j ? k - 1 : k;
}

/**
 * which of the LUT's `variants` candidates this cell shows right now.
 * Frozen per (cell, slot): the same cell in the same slot is always the same
 * glyph, which is what makes the field cryptic instead of noisy.
 */
export function variantAt(seed, t, variants, cfg = M.drift) {
  const slot = rerollSlot(seed, t, cfg);
  return Math.min(variants - 1, Math.floor(hash21(seed * 131.7, slot + 0.5) * variants));
}

/**
 * the cell's weight row (0..2 = ExtraLight/Regular/SemiBold), frozen for the
 * lifetime of the cell -- bible 3.5 lists weight jitter alongside drift phase
 * as a frozen choice, not a re-rolled one. Biased to the middle so the page
 * has a dominant weight with variation in it, rather than three equal weights,
 * which reads as three different fonts.
 */
export function weightRow(seed, rows = 3) {
  const h = hash11(seed * 47.11 + 3.3);
  if (rows < 3) return Math.min(rows - 1, Math.floor(h * rows));
  if (h < 0.25) return 0;
  if (h < 0.75) return 1;
  return 2;
}

// ---------------------------------------------------------------------------
// MEW'S PRESENCE (bible 6.5)
//
// "Cells within ~1.5 body radii thin slightly and drift away from her, so she
// pushes a soft clearing through the text as she swims. Cheap -- it is one
// distance test in the same pass that already runs."
// ---------------------------------------------------------------------------

/**
 * Returns { push: [dx, dy] px, thin: 0..1 }. `radius` is mew's body radius in
 * document px; the clearing reaches field.mewClearRadii times that.
 */
export function mewClearing(homeX, homeY, mewX, mewY, radius, cfg = F) {
  const rx = homeX - mewX;
  const ry = homeY - mewY;
  const d = Math.hypot(rx, ry);
  const reach = radius * cfg.mewClearRadii;
  // smooth from the centre outward. Not 1 at d=0 and 0 at d=reach with a hard
  // edge: a clearing with a rim is a force field, and mew is not wearing one.
  const a = 1 - smoothstep(radius * 0.35, reach, d);
  if (a <= 0) return { push: [0, 0], thin: 0 };
  const inv = d > 1e-4 ? 1 / d : 0;
  const cell = cfg.mewPushCells;
  return {
    push: [rx * inv * a * cell, ry * inv * a * cell],
    thin: a * cfg.mewThin
  };
}

// ===========================================================================
// THE GLSL MIRROR
//
// Everything above, again, in GLSL ES 3.00. The tests pin the JS side; this is
// required to match it. Same pattern as fx/presentMath.js's GLSL_LINEAR_TO_SRGB
// and the shadeBand/inkness pair.
//
// NEVER PUT A BACKTICK IN A COMMENT IN HERE. These are template literals, so a
// backtick inside even a // comment terminates the string and the whole MODULE
// silently fails to parse -- Vite reports nothing useful and the page renders
// no field at all. It has happened twice on the mew side (see HANDOFF.md). The
// bare-import check in sim.test.js is the only thing that catches it.
// ===========================================================================

export const GLSL_HASH = /* glsl */ `
  float fract1(float x) { return x - floor(x); }

  // the mirror of hash11 / hash21 in fieldMath.js. no sin() anywhere: sin's
  // precision is implementation-defined and a field seeded through it looks
  // different on different GPUs.
  float hash11(float p) {
    float x = fract(p * 0.1031);
    x *= x + 33.33;
    x *= x + x;
    return fract(x);
  }
  float hash21(float xi, float yi) {
    float px = fract(xi * 0.1031);
    float py = fract(yi * 0.1030);
    float d = px * (py + 33.33) + py * (px + 33.33);
    float r = d + 33.33;
    r *= r;
    return fract(r);
  }
`;

export const GLSL_DRIFT = /* glsl */ `
  // DRIFT (bible 5): a spatially COHERENT field -- two plane waves over the
  // document cell coordinate -- plus a small per-cell grain. Mirror of drift().
  // Neighbours drift together, so the lattice survives; see the js side for
  // what happens when they do not.
  // NOTE: the coherent amount is called cohereAmt, not "coherent" -- that is a
  // reserved memory qualifier in GLSL ES 3.00 and the whole program fails to
  // compile with a syntax error pointing at the parameter list.
  vec2 fieldDrift(float seed, float t, vec2 dc, vec2 cell,
                  float hz, float hzRatio, float rateJitter,
                  float waveCells, float cohereAmt, float grain, float wander) {
    float k = 6.28318530718 / max(1e-6, waveCells);
    float w = 6.28318530718 * hz;
    float a1 = dc.x * k * 0.86 + dc.y * k * 0.51 + t * w;
    float a2 = dc.x * k * -0.44 + dc.y * k * 0.90 - t * w * hzRatio;
    vec2 d = vec2(sin(a1) * 0.62 + cos(a2) * 0.38,
                  cos(a1 * 0.83) * 0.62 + sin(a2 * 1.17) * 0.38) * cohereAmt;
    float rate = 1.0 + (seed - 0.5) * 2.0 * rateJitter;
    d += vec2(sin(w * rate * t + seed * 61.7),
              cos(w * rate * t + seed * 113.9)) * grain;
    return d * wander * cell;
  }
`;

export const GLSL_GATHER = /* glsl */ `
  // GATHER (bible 4.3): continuous, never a binary in-range test. Mirror of
  // gatherFalloff(). This is the POINTER's small local influence on the field
  // now -- no word reads it (see assembleResolve).
  float gatherFalloff(float dist, float radius, float innerFraction) {
    return 1.0 - smoothstep(radius * innerFraction, radius, dist);
  }

  // SELF-ASSEMBLY (bible 4.3). Mirror of assembleResolve(). One word-level
  // clock, one per-cell delay, and the delay is mostly the cell's distance to
  // the word's own centre -- so the silhouette resolves before the interior.
  float assembleResolve(float progress, float order, float seed,
                        float staggerFrac, float orderWeight) {
    float delay = staggerFrac * clamp(mix(seed, order, orderWeight), 0.0, 1.0);
    float span = max(1e-6, 1.0 - staggerFrac);
    float k = clamp((progress - delay) / span, 0.0, 1.0);
    return k * k * (3.0 - 2.0 * k);
  }
`;

export const GLSL_MIGRATE = /* glsl */ `
  // MIGRATE (bible 5, 7.1a): one asymmetric bump, staggered by the cell's own
  // frozen seed, so the crowd PEELS AWAY rather than sliding as a sheet.
  // Mirror of migrateBump(). Exactly zero at both ends, which is what makes
  // abandoning a transit half way through cost nothing.
  float migrateBump(float seed, float t01, float stagger, float peak) {
    float span = max(1e-6, 1.0 - stagger);
    float k = clamp((t01 - clamp(seed, 0.0, 1.0) * stagger) / span, 0.0, 1.0);
    return smoothstep(0.0, peak, k) * (1.0 - smoothstep(peak, 1.0, k));
  }
`;

export const GLSL_IMPULSE = /* glsl */ `
  // SCATTER + SETTLE (bible 6.4, 7.3): the critically damped impulse response,
  // normalized to peak exactly 1.0 at tau = 1/k so the impulse uniform is a
  // peak displacement in px. Mirror of impulseResponse().
  float impulseResponse(float tau, float k) {
    if (tau <= 0.0) return 0.0;
    return 2.718281828 * k * tau * exp(-k * tau);
  }
`;

export const GLSL_REROLL = /* glsl */ `
  // GLYPH RE-ROLL (bible 3.5): per-cell interval, per-EVENT jitter, monotone.
  // Mirror of rerollSlot() / variantAt().
  float rerollSlot(float seed, float t, float meanS, float rateJitter, float jitter) {
    float period = max(1e-6, meanS * (1.0 + (hash11(seed * 313.7) - 0.5) * 2.0 * rateJitter));
    float u = t / period + seed * 7.13;
    float k = floor(u);
    float j = hash21(seed * 977.0, k) * jitter;
    return (u - k) < j ? k - 1.0 : k;
  }
  float variantAt(float seed, float t, float variants,
                  float meanS, float rateJitter, float jitter) {
    float slot = rerollSlot(seed, t, meanS, rateJitter, jitter);
    return min(variants - 1.0, floor(hash21(seed * 131.7, slot + 0.5) * variants));
  }
  // frozen weight row, biased to the middle. Mirror of weightRow().
  float weightRow(float seed) {
    float h = hash11(seed * 47.11 + 3.3);
    return h < 0.25 ? 0.0 : (h < 0.75 ? 1.0 : 2.0);
  }
`;

export const GLSL_MEW = /* glsl */ `
  // MEW'S CLEARING (bible 6.5): one distance test, in the pass that already
  // runs. Mirror of mewClearing(). Returns (pushX, pushY, thin).
  vec3 mewClearing(vec2 home, vec2 mew, float radius, float reachRadii,
                   vec2 cell, float pushCells, float thinAmount) {
    vec2 r = home - mew;
    float d = length(r);
    float a = 1.0 - smoothstep(radius * 0.35, radius * reachRadii, d);
    if (a <= 0.0) return vec3(0.0);
    vec2 dir = d > 1e-4 ? r / d : vec2(0.0);
    return vec3(dir * a * pushCells * cell, a * thinAmount);
  }
`;

/** every GLSL block above, in dependency order. */
export const GLSL_FIELD_MATH =
  GLSL_HASH + GLSL_DRIFT + GLSL_GATHER + GLSL_MIGRATE + GLSL_IMPULSE + GLSL_REROLL + GLSL_MEW;

export default {
  fract, clamp01, mix, smoothstep,
  hash11, hash21, cellSeed,
  valueNoise2, fbm2, weatherAt, shapeDensity, calibrateWindow,
  drift, gatherFalloff, assembleResolve, shiverEnvelope, migrateBump,
  weatherFor,
  impulseResponse, peakDisplacementPx, settleResidual, solveImpulseRate, scatterAt,
  rerollSlot, variantAt, weightRow, mewClearing,
  GLSL_FIELD_MATH
};
