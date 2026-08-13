// map.js
// THE SITE IS A PLACE, NOT A STACK OF DOCUMENTS (bible 7.1a). Every route is a
// panel on one continuous plane; navigating is moving a camera across it.
//
// This module is the whole of that idea's arithmetic, and it is PURE -- no DOM,
// no GL, no config beyond the table it is handed. Everything downstream (the
// router, the field's camera, the panel stage, mew's impulse) reads a signed
// delta out of here and knows nothing else. In particular:
//
//   NOTHING ELSE IN THE SYSTEM KNOWS A COMPASS DIRECTION EXISTS.
//
// There is no "west", no "east", no "if we are going left" anywhere in the
// codebase. There is a table of integer cells and a modulus, and every
// direction the site can travel falls out of those two things. That is what
// makes "adding a page is one line, moving a page is two numbers" true rather
// than aspirational -- and it is why this file is worth its own module instead
// of six lines inlined into the router.
//
// -- the torus, and why it is not a special case ---------------------------
// The axes have an extent (3 x 3 for the shipped map) and travel takes the
// SHORTER SIGNED DELTA MODULO THAT EXTENT:
//
//     delta = ((b - a + E/2) mod E) - E/2
//
// West -> East is (-1) -> (+1): the direct route is +2, the wrapped route is
// -1, so you travel LEFT and arrive at East from the far side. North -> South
// goes up. Neither of those is written down anywhere; they are what the modulus
// does. A bigger map, a moved page, a fifth direction -- all free.

import { siteConfig } from "../config/siteConfig.js";

/**
 * a modulo that returns a NON-NEGATIVE result, which javascript's % does not:
 * -1 % 3 is -1, and every wrap-around bug in a torus starts there.
 */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * the shorter signed delta from a to b on an axis of extent E (bible 7.1a).
 *
 * Always lands in (-E/2, E/2]. For odd E the shift by E/2 is fractional and the
 * result is still exactly an integer, because the fractional parts cancel --
 * test/type.test.js pins that at every extent from 1 to 12 rather than trusting
 * it, because a half-cell delta would put the camera permanently between two
 * panels and nothing else in the system would notice.
 */
export function shortestDelta(a, b, extent) {
  if (!(extent > 0)) return b - a;
  return mod(b - a + extent / 2, extent) - extent / 2;
}

/**
 * ...on both axes at once. This is the ONLY function the rest of the site
 * calls to find out which way it is travelling.
 */
export function travelDelta(from, to, extent) {
  return [
    shortestDelta(from[0], to[0], extent[0]),
    shortestDelta(from[1], to[1], extent[1])
  ];
}

/** a cell brought back into [0, extent) on both axes, for indexing the map. */
export function wrapCell(cell, extent) {
  return [mod(cell[0], extent[0]), mod(cell[1], extent[1])];
}

/**
 * createMap(cfg) -> the map, validated.
 *
 * Validated at construction rather than trusted, because every failure mode
 * here is silent: two routes on one cell means one of them can never be
 * travelled to distinctly, and an extent smaller than the occupied span aliases
 * them without saying so. Both are one typo away and neither shows up as an
 * error -- the site just navigates somewhere slightly wrong forever.
 */
export function createMap(cfg = siteConfig.map) {
  const extent = [cfg.extent[0], cfg.extent[1]];
  const cells = new Map();
  const occupied = new Map();

  for (const [id, cell] of Object.entries(cfg.routes)) {
    if (!Array.isArray(cell) || cell.length !== 2 ||
        !Number.isInteger(cell[0]) || !Number.isInteger(cell[1])) {
      throw new Error(`map: "${id}" must be an integer [x, y], got ${JSON.stringify(cell)}`);
    }
    const w = wrapCell(cell, extent);
    const key = `${w[0]},${w[1]}`;
    if (occupied.has(key)) {
      throw new Error(
        `map: "${id}" and "${occupied.get(key)}" both land on cell ${key} once ` +
        `wrapped to extent ${extent}. Two routes on one panel can never be ` +
        "told apart -- widen map.extent or move one of them.");
    }
    occupied.set(key, id);
    cells.set(id, [cell[0], cell[1]]);
  }

  return {
    extent,
    /** the canonical (unwrapped) cell a route sits on, or null. */
    cellOf(id) {
      const c = cells.get(id);
      return c ? [c[0], c[1]] : null;
    },
    has(id) { return cells.has(id); },
    ids() { return [...cells.keys()]; },
    /**
     * the signed panel delta travelled going from route `fromId` to `toId`.
     * Returns [0, 0] for an unknown route on either end, which is the right
     * answer: a 404 has no place on the map, so the camera does not move and
     * the page simply changes under it.
     */
    delta(fromId, toId) {
      const a = cells.get(fromId);
      const b = cells.get(toId);
      if (!a || !b) return [0, 0];
      return travelDelta(a, b, extent);
    },
    /** ...and the same cell brought into [0, extent), for texture indexing. */
    wrap(cell) { return wrapCell(cell, extent); }
  };
}

/**
 * how long the camera takes to cross a delta of |d| panels (bible 7.1a):
 * `base x |delta|^0.6`, so a two-step move is longer but not twice as long.
 * Zero distance is zero time -- a 404 or a re-click must not sit through a
 * 1.1 s pan of nothing.
 */
export function panDurationMs(delta, cfg = siteConfig.transit) {
  const dist = Math.hypot(delta[0], delta[1]);
  if (dist <= 0) return 0;
  return cfg.cameraBaseMs * Math.pow(dist, cfg.cameraDistanceExponent);
}

/**
 * the cubic-bezier the bible authors the pan on, evaluated in js.
 *
 * The camera is a UNIFORM, not a CSS property, so it cannot be handed to the
 * compositor -- but the DOM panel stage travels on a real CSS transition, and
 * if the two curves disagree by even a little the type layer and the layout
 * layer visibly separate mid-pan. So both read these same four control points
 * and this function is what keeps the js side honest.
 *
 * Newton on x(t) with a bisection fallback: x is monotone in t for the control
 * points a css cubic-bezier permits, so it converges in a handful of steps, and
 * this runs once per frame of a transit rather than once per cell.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  return function ease(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    // newton stalled on a flat stretch: bisect, which cannot.
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v > x) hi = t; else lo = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

export default createMap;
