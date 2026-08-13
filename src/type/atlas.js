// atlas.js
// the baked glyph atlas (tools/glyphatlas.py) turned into things the GPU can
// use: the R8 texture image, the per-glyph uv table, and THE DENSITY LUT.
//
// Split deliberately in two halves:
//
//   * everything above `loadAtlasImage` is PURE -- no dom, no three, no fetch.
//     it runs in test/type.test.js, which is the only reason the LUT (the piece
//     that decides what the page actually looks like) is checkable at all.
//   * `loadAtlasImage` is the one browser-only function, and it returns plain
//     pixels. fieldRenderer.js owns every GPU object; nothing here allocates
//     one, so nothing here can leak one.
//
// WHY A LUT AND NOT PER-CELL CANDIDATE IDS. The obvious design bakes each
// cell's chosen glyphs into the cell data texture. It cannot work, because a
// cell's tone is not fixed: it thins when a word eats it (bible 4.3), it thins
// when mew swims past (6.5), it darkens when the beam smudges it (6.4), and it
// changes outright when the cell resolves into a word slot. Baking candidates
// freezes the TONE as well as the choice. A LUT keyed on density leaves tone
// free and still costs one texel fetch.

import { siteConfig } from "../config/siteConfig.js";

const R = siteConfig.ramp;
const LUT = siteConfig.field.lut;

/** the weights the atlas was baked at, ascending. */
export function atlasWeights(ramp) {
  return [...new Set(ramp.glyphs.map((g) => g.w))].sort((a, b) => a - b);
}

/** the densest glyph in the table. This is the top of the tonal range, and it
 *  is only about a third of a fully inked cell -- which is why bible 3.4a's
 *  OVERSTRIKE register exists at all, and why the coverage calibration in
 *  fieldMath.calibrateWindow has to be a measurement rather than a guess. */
export function maxCoverage(ramp) {
  let m = 0;
  for (const g of ramp.glyphs) if (g.cov > m) m = g.cov;
  return m;
}

function dist6(a, b) {
  let s = 0;
  for (let i = 0; i < 6; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

/**
 * buildRampLut(ramp) -> { data, buckets, variants, rows, weights, maxCov }
 *
 * `data` is a Uint8Array of buckets*rows*4 bytes, laid out as an RGBA8 texture
 * of width `buckets` and height `rows` (one row per weight). Each texel's four
 * channels are four glyph INDICES into ramp.glyphs, all at approximately the
 * bucket's target coverage. The shader picks a row from the cell's frozen
 * weight jitter and a channel from its re-roll slot, so:
 *
 *   * TONE is controlled entirely by the bucket, i.e. by the density field
 *   * TEXTURE is controlled by the row and channel, i.e. by frozen randomness
 *
 * and the two can never fight, which is what stops the field from strobing when
 * a glyph re-rolls (bible 3.5 -- a re-roll must change the character, not the
 * value, or the page flickers).
 *
 * The four candidates are NOT simply the four nearest in coverage. They are
 * chosen greedily to be as far apart in the 6-D shape space as the coverage
 * tolerance allows, so a re-roll visibly changes the glyph's silhouette rather
 * than swapping 'e' for 'o' (bible 3.4: pick for direction, not for luminance).
 */
export function buildRampLut(ramp, opts = {}) {
  const buckets = opts.buckets ?? LUT.buckets;
  const variants = opts.variants ?? LUT.variants;
  const weights = atlasWeights(ramp);
  const rows = weights.length;
  const maxCov = maxCoverage(ramp);
  const data = new Uint8Array(buckets * rows * 4);

  // THE TOLERANCE BAND, not a fixed candidate count -- see siteConfig's
  // field.lut.covTolRel. A fixed count picks the four NEAREST in coverage,
  // which at the sparse end of this ramp means the fourth is three times the
  // tone of the first, and a cell re-rolling between them changes VALUE rather
  // than character. That is bible 8's strobe on a slow clock.
  const tolRel = opts.covTolRel ?? LUT.covTolRel;
  const tolFloor = (opts.covTolFloorFrac ?? LUT.covTolFloorFrac) * maxCov;
  const poolCap = Math.max(variants, variants * 4);

  for (let r = 0; r < rows; r++) {
    const w = weights[r];
    const idxs = [];
    for (let i = 0; i < ramp.glyphs.length; i++) if (ramp.glyphs[i].w === w) idxs.push(i);

    for (let b = 0; b < buckets; b++) {
      const target = ((b + 0.5) / buckets) * maxCov;
      const tol = Math.max(tolFloor, tolRel * target);
      // nearest in coverage first, then cut to the tolerance band. The nearest
      // `variants` always survive even if they are outside it, because a bucket
      // with no candidates at all would fall back to glyph 0, which is SPACE --
      // holes punched in the darkest parts of the page.
      const ordered = idxs
        .slice()
        .sort((a, c) => Math.abs(ramp.glyphs[a].cov - target) - Math.abs(ramp.glyphs[c].cov - target));
      // TONE WINS OVER VARIETY, ALWAYS. If the band holds at least two
      // candidates, spread across them; if it holds fewer, take the single
      // nearest glyph and let the write below repeat it.
      //
      // Falling back to "the nearest few" instead is what the first version
      // did, and it is quietly disastrous: the farthest-point spread then goes
      // looking for the most 6-D-DIFFERENT members of that wider set, which
      // are exactly its densest ones. Bucket 0 at weight 600 -- bare paper --
      // came out averaging 6.8% ink, the tonal curve stopped being monotonic,
      // and both calibrations that bisect against it (the weather gamma and
      // the load inhale) converged on nonsense.
      const inBand = ordered.filter((i) => Math.abs(ramp.glyphs[i].cov - target) <= tol);
      const pool = inBand.length >= 2 ? inBand.slice(0, poolCap) : ordered.slice(0, 1);

      // ...then spread the chosen few across the shape space, farthest-point
      // style. The first pick is the closest in coverage, so the bucket's tone
      // is always anchored by an exact match and only the alternates wander.
      const chosen = [pool[0]];
      while (chosen.length < variants && chosen.length < pool.length) {
        let best = -1;
        let bestD = -1;
        for (const cand of pool) {
          if (chosen.includes(cand)) continue;
          let minD = Infinity;
          for (const c of chosen) {
            const d = dist6(ramp.glyphs[cand].v6, ramp.glyphs[c].v6);
            if (d < minD) minD = d;
          }
          if (minD > bestD) { bestD = minD; best = cand; }
        }
        if (best < 0) break;
        chosen.push(best);
      }
      // fewer candidates than channels is normal at both ends of the ramp, so
      // the four channels CYCLE the ones there are. Never padded with a zero:
      // glyph 0 is the space, and a zero in the darkest bucket punches holes
      // in the page.
      const o = (r * buckets + b) * 4;
      for (let k = 0; k < 4; k++) data[o + k] = chosen[k % chosen.length];
    }
  }

  return { data, buckets, variants, rows, weights, maxCov };
}

/**
 * the ink coverage a cell ACTUALLY lands on at a given density, averaged the
 * way the page averages it: over the weight rows at their real probabilities
 * (fieldMath.weightRow's 0.25 / 0.5 / 0.25 bias) and over the variants at
 * uniform probability.
 *
 * This is the function fieldMath.calibrateWindow bisects against, and it is why
 * the 12-22% band in bible 4.2 is a measurement here rather than a hope: it
 * knows that this ramp's densest glyph is 0.337 ink, that an OVERSTRUCK cell
 * composes two of them to ~0.56, and that the mapping between density and ink
 * is not remotely linear.
 */
export function makeCoverageOf(ramp, lut, opts = {}) {
  const strikeAbove = opts.overstrikeAbove ?? siteConfig.field.overstrike.restDensityAbove;
  const rowP = lut.rows === 3 ? [0.25, 0.5, 0.25] : new Array(lut.rows).fill(1 / lut.rows);
  // the OVERSTRIKE row: the heaviest weight the atlas was baked at, which is
  // the one the second strike always uses (bible 3.4a -- the register exists to
  // be dark, so it does not get to jitter down to 200).
  const strikeRow = lut.rows - 1;

  /** the averaged coverage of one bucket, at one weight row. */
  const rowCov = (b, r) => {
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const gi = lut.data[(r * lut.buckets + b) * 4 + k];
      sum += ramp.glyphs[gi] ? ramp.glyphs[gi].cov : 0;
    }
    return sum / 4;
  };

  /**
   * `overstruckOverride` exists because the field decides which cells are
   * struck by QUANTILE at layout time, not by the config threshold alone -- so
   * the caller sometimes knows better than this default does.
   */
  return function coverageOf(density, overstruckOverride) {
    const d = density < 0 ? 0 : density > 1 ? 1 : density;
    const b = Math.min(lut.buckets - 1, Math.max(0, Math.floor(d * lut.buckets)));
    let sum = 0;
    for (let r = 0; r < lut.rows; r++) sum += rowP[r] * rowCov(b, r);

    const struck = overstruckOverride === undefined ? d >= strikeAbove : overstruckOverride;
    if (!struck) return sum;

    // TWO GLYPHS IN ONE CELL, offset (bible 3.4a). They are drawn from the same
    // density lookup, so the second strike's ink is the same bucket read at the
    // heavy row -- and the two overlap, so the composite is a UNION rather than
    // a sum. Treating the two impressions as independent over the cell's area
    // gives a + b - a*b, which lands the ramp's densest cell at 0.337 struck
    // with 0.337 -> 0.560, exactly the "~0.5-0.55 effective ink" the bible
    // predicts. Summing instead would claim 0.67 and quietly over-report every
    // dark on the page, which is the number the weather calibration and the
    // near-bare budget are both measured against.
    const second = rowCov(b, strikeRow);
    return sum + second - sum * second;
  };
}

/**
 * the density that lands on a given EFFECTIVE INK, by bisection. The inverse of
 * coverageOf, which is monotone but has no closed form -- it is a lookup over a
 * baked table.
 *
 * This is what turns bible 4.4 rule 2's "counters go to <= 0.06 effective ink"
 * into a number the shader can mix toward. Stating the rule in ink and solving
 * for the density is the only honest direction: what a density COSTS in ink is
 * a property of the baked ramp and changes whenever the ramp does.
 */
export function densityForCoverage(coverageOf, targetInk, steps = 40) {
  if (coverageOf(0) >= targetInk) return 0;
  if (coverageOf(1) <= targetInk) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) * 0.5;
    if (coverageOf(mid) > targetInk) hi = mid;
    else lo = mid;
  }
  return (lo + hi) * 0.5;
}

/**
 * the per-glyph uv table as a flat Float32Array of nGlyphs*4 (u0, v0, u1, v1),
 * for upload as an RGBA32F texture read in the vertex shader.
 *
 * Float, not RGBA8: this atlas is 928x980 with 56x96 cells, so a uv step is
 * about 1/16 of the texture and an 8-bit quantization of it would land the
 * sample up to two texels inside the neighbouring glyph's cell. The whole table
 * is 147 texels, so exactness is free.
 */
export function buildGlyphUvTable(ramp) {
  const n = ramp.glyphs.length;
  const uv = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const g = ramp.glyphs[i];
    uv[i * 4] = g.uv[0];
    uv[i * 4 + 1] = g.uv[1];
    uv[i * 4 + 2] = g.uv[2];
    uv[i * 4 + 3] = g.uv[3];
  }
  return uv;
}

/**
 * the axis normalisation the ramp table was built with (tools/glyphatlas.py
 * emits it). A 6-D vector measured fresh off a rasterized word has to be
 * divided by these before it can be compared with a glyph's v6, or the
 * nearest-neighbour is comparing two different spaces. Falls back to ones with
 * a loud warning rather than silently returning nonsense matches.
 */
export function axisMaxOf(ramp) {
  if (Array.isArray(ramp.axisMax) && ramp.axisMax.length === R.shapeDims) return ramp.axisMax;
  console.warn("[type] ramp.json has no axisMax -- re-run tools/glyphatlas.py. " +
               "word glyph matching will be wrong until you do.");
  return new Array(R.shapeDims).fill(1);
}

// ---------------------------------------------------------------------------
// the one browser-only function in this module.
// ---------------------------------------------------------------------------

/**
 * decode the baked PNG to a single-channel Uint8Array. NEAREST-sampled, no
 * mips, no anisotropy (bible 7.3) -- so all the GPU ever needs is the red
 * channel at native resolution, and a 2048-budget R8 upload is ~1 MB rather
 * than the 4 MB an RGBA decode would cost.
 */
export async function loadAtlasImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`atlas: failed to fetch ${url} (${res.status})`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  // READ THE DIMENSIONS BEFORE close(). An ImageBitmap that has been closed
  // reports width and height as 0, so anything derived from them afterwards --
  // the Uint8Array's length, the texture's size -- comes out empty, and an
  // empty R8 atlas renders a page on which every glyph is blank -- a bare sheet
  // of paper with no console error anywhere.
  const width = bmp.width;
  const height = bmp.height;
  const cv = document.createElement("canvas");
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  bmp.close();
  const red = new Uint8Array(width * height);
  for (let i = 0; i < red.length; i++) red[i] = rgba[i * 4];
  return { data: red, width, height };
}

export default {
  buildRampLut, makeCoverageOf, densityForCoverage, buildGlyphUvTable, axisMaxOf, loadAtlasImage
};
