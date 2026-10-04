// shake.js — is the hand holding her shaking her?
//
// Pure: positions and times in, a yes out. The brain feeds it the hand while
// she is held (brain.js, "held"); test/sim.test.js feeds it synthetic hands.
//
// A SHAKE IS COUNTED IN REVERSALS, not in speed. Speed alone cannot tell a
// shake from a throw -- a fling is the fastest thing a hand does to her, and it
// goes one way. What a shake has that nothing else has is the hand coming
// BACK, again and again, quickly. So each stroke is followed along its own
// direction until the hand has come back from its furthest point by a margin;
// that turning point is a reversal, and it counts only if the stroke it ended
// was long enough (not a tremor) and quick enough (not steering). Enough of
// them inside a short window is a shake.
//
// Measured along the STROKE's own direction rather than along x or y, so a
// diagonal shake counts exactly like a horizontal one, and a vigorous stir in
// circles counts too (each half-turn comes back along the line it set out on),
// which is what stirring her violently ought to do.
//
// Lengths are in units of `r`, her radius, so one set of numbers serves a
// 96 px animal on a phone and a 150 px one on the laptop.

/**
 * @param cfg  rigConfig.behavior.fling.shake
 * @returns {{ step(x, y, t, r): boolean, reset(): void }}
 *          step() is true on the one step a shake is recognised
 */
export function createShake(cfg) {
  let anchor = null;     // where the current stroke set out from, and when
  let dir = null;        // its direction, once it has one
  let far = 0;           // the furthest it has got along that direction
  let ext = null;        // ...and where and when that was: the turning point
  let flips = [];        // the times of the reversals that counted
  let lastFire = -Infinity;

  const reset = () => { anchor = null; dir = null; far = 0; ext = null; flips = []; };

  function step(x, y, t, r) {
    if (!anchor) { anchor = { x, y, t }; ext = { x, y, t }; return false; }
    if (!dir) {
      const dx = x - anchor.x, dy = y - anchor.y, d = Math.hypot(dx, dy);
      // a hand resting on her has not started a stroke: the clock of the first
      // one starts when the hand leaves, not when it pressed
      if (d < cfg.backR * r) { anchor.t = t; return false; }
      dir = { x: dx / d, y: dy / d };
      far = d;
      ext = { x, y, t };
      return false;
    }
    const proj = (x - anchor.x) * dir.x + (y - anchor.y) * dir.y;
    if (proj > far) { far = proj; ext = { x, y, t }; return false; }
    if (far - proj < cfg.backR * r) return false;

    // the hand has come back: a reversal, if the stroke it ends was a shake's
    const good = far >= cfg.strokeR * r && ext.t - anchor.t <= cfg.strokeMaxS;
    if (good) flips.push(ext.t); else flips = [];
    // the next stroke sets out from the turning point, the way the hand is going
    anchor = ext;
    const dx = x - ext.x, dy = y - ext.y, d = Math.hypot(dx, dy) || 1;
    dir = { x: dx / d, y: dy / d };
    far = (x - anchor.x) * dir.x + (y - anchor.y) * dir.y;
    ext = { x, y, t };
    flips = flips.filter((ft) => t - ft <= cfg.windowS);
    if (flips.length >= cfg.reversals && t - lastFire >= cfg.againS) {
      lastFire = t;
      flips = [];
      return true;
    }
    return false;
  }

  return { step, reset };
}
