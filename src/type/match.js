// match.js
// nearest neighbour in 6-D over the baked ramp table (tools/glyphatlas.py's
// src/assets/ramp.json), with a quantized cache: 5 bits per axis
// (siteConfig.ramp.cacheBitsPerAxis) packed into one integer key, so a
// repeated cell -- and DRIFT/GATHER produce a LOT of repeats, since frozen
// randomness (bible 3.5) means the same cell asks for nearly the same vector
// over and over -- is O(1) after its first miss.
//
// PURE: no dom, no three.js, no fetch, no import of ramp.json. the table is
// passed in by the caller (atlas.js in the browser, fs.readFileSync in a
// test) via createMatcher(ramp); this module only does the math, the same
// split fx/presentMath.js uses to stay headless-testable.
//
// NUMERIC MIRROR: tools/glyphatlas.py's own confusable-distance check
// (tools/check_type.py) and tools/gen_match_fixture.py's python reference
// ranking use the identical rule this file does -- plain euclidean distance
// over v6, scanning the glyph array in its own stored order, first
// STRICTLY-smaller distance wins ties. that iteration order is what makes
// the js and python picks reproducible against each other for the same
// table (test/type.test.js's 500-vector cross-check).

import { siteConfig } from "../config/siteConfig.js";

const DEFAULT_BITS = siteConfig.ramp.cacheBitsPerAxis;
const DIMS = siteConfig.ramp.shapeDims;

/** clamp-and-round one axis into [0, 2^bits - 1]. */
function quantizeAxis(v, levels) {
  const q = Math.round(v * levels);
  if (q < 0) return 0;
  if (q > levels) return levels;
  return q;
}

/**
 * pack a 6-D vector into one integer cache key, `bits` per axis. with the
 * default 5 bits x 6 axes that is 30 bits -- comfortably inside the range
 * where `<<`/`|` behave as plain integer ops (no sign-bit surprises, no
 * float precision loss), so the key is just a Number, not a BigInt.
 */
export function quantizeKey(v6, bits = DEFAULT_BITS) {
  const levels = (1 << bits) - 1;
  let key = 0;
  for (let i = 0; i < DIMS; i++) {
    key = (key << bits) | quantizeAxis(v6[i], levels);
  }
  return key >>> 0;
}

/**
 * brute-force nearest neighbour, no cache. exported on its own because the
 * cache is an optimization, not the algorithm -- tests and the python
 * cross-check both want the uncached answer.
 */
export function nearestGlyph(v6, glyphs) {
  let bestIdx = -1;
  let bestDist2 = Infinity;
  for (let i = 0; i < glyphs.length; i++) {
    const g6 = glyphs[i].v6;
    let d2 = 0;
    for (let k = 0; k < DIMS; k++) {
      const d = v6[k] - g6[k];
      d2 += d * d;
    }
    if (d2 < bestDist2) {          // strict <: first-encountered wins ties
      bestDist2 = d2;
      bestIdx = i;
    }
  }
  const g = glyphs[bestIdx];
  return { idx: bestIdx, ch: g.ch, w: g.w, dist: Math.sqrt(bestDist2) };
}

/**
 * createMatcher(ramp) -> { match, cacheStats, clearCache, glyphs }
 *
 * `ramp` is the parsed ramp.json ({ cell, atlas, glyphs: [{ch,w,uv,cov,v6}] }).
 * `match(v6)` returns { idx, ch, w, dist } -- dist is the EXACT match's
 * distance even on a cache hit, since the cached value already carries it.
 */
export function createMatcher(ramp, { bitsPerAxis = DEFAULT_BITS } = {}) {
  const glyphs = ramp.glyphs;
  const cache = new Map();
  let hits = 0;
  let misses = 0;

  function match(v6) {
    const key = quantizeKey(v6, bitsPerAxis);
    const cached = cache.get(key);
    if (cached !== undefined) {
      hits++;
      return cached;
    }
    misses++;
    const result = nearestGlyph(v6, glyphs);
    cache.set(key, result);
    return result;
  }

  function cacheStats() {
    const total = hits + misses;
    return { hits, misses, size: cache.size, hitRate: total ? hits / total : 0 };
  }

  function clearCache() {
    cache.clear();
    hits = 0;
    misses = 0;
  }

  return { match, cacheStats, clearCache, glyphs, bitsPerAxis };
}

export default createMatcher;
