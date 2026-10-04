// beamShape.js
// the hyper beam's SHAPE and its CLOCK, as pure maths. no dom, no three -- the
// same pattern as beamGeometry.js and sweatGeometry.js, so every number the
// shaders lean on can be checked headless.
//
// THREE THINGS READ THIS FILE, and they have to agree to the pixel:
//
//   fx/beam.js        the beam itself, drawn in mew's canvas above the page
//   site/pressgl.js   the paper burning away under it, drawn on the sheet below
//                     the words (its GLSL `beamEnv` is a TRANSCRIPTION of
//                     envelope() below -- change one, change the other)
//   fx/beam.js again  the stars, scheduled off the charge and the shot
//
// THE ENVELOPE. The old beam was a constant-width bar. Every reference the owner
// gave (cmzw's frames, regidrago, genesect) leaves the mouth as a POINT and opens
// like the nose of a bullet: fast at first, then nearly parallel. That curve is
// x/(1+x) -- a rectangular hyperbola, which near the origin is a parabola lying
// on its side and far away is flat -- raised to a power under 1 to round the
// nose. "Not too parabolic" is the owner's brief, so it saturates within about
// one beam-width of the muzzle and then only spreads a little (`spread`), the
// way a beam seen in slight perspective widens toward the viewer.

/** half-width MULTIPLIER at distance s (px) from the muzzle. 0 < root <= m. */
export function envelope(s, W, c) {
  const d = s > 0 ? s : 0;
  const x = d / Math.max(1e-6, c.flare * W);
  const k = Math.pow(x / (1 + x), c.power);
  return (c.root + (1 - c.root) * k) * (1 + c.spread * d / Math.max(1e-6, W));
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
// overshoot and settle: the beam ARRIVES too wide and snaps to size, which is
// the anime "punch" -- a constant ease reads as something inflating.
const easeOutBack = (t, s = 1.9) => {
  const x = clamp01(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};

/** a stable pseudo-random number in [0,1) from an integer-ish key */
export function hash1(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * THE FIRE, as a function of time since the shot. Same three beats and the same
 * durations as before (cfg.expandS / sustainS / fadeS, which the brain also
 * reads to know when the shot is over) -- only what happens inside them is new.
 *
 *   headK    how far the front has travelled, 0..1 of the beam's length
 *   widthK   the width multiplier (overshoot on arrival, a boil while held,
 *            thinning to the core as it goes)
 *   alpha    overall presence
 *   breakup  0 solid .. 1 torn into streaks (the dissipation)
 *   open     how far the paper under it has burned, 0..1 (heals in the fade)
 *   shell    the parabolic sheath line, which only exists at the moment of the
 *            shot -- it is the shockwave of the eruption, not part of the beam
 *   boil     which DRAWING this is. Hand-drawn fx are on twos: the edges hold
 *            still for a frame of film and then jump, and that step is most of
 *            what keeps a procedural beam from reading as a running function
 *   done
 */
export function fireTimeline(t, cfg) {
  const { expandS, sustainS, fadeS } = cfg;
  const L = cfg.look;
  const boil = Math.floor(Math.max(0, t) * (cfg.boilFps || 12));
  const end = expandS + sustainS + fadeS;
  if (t >= end) {
    return { headK: 1, widthK: 0, alpha: 0, breakup: 1, open: 0, shell: 0, boil, done: true };
  }
  const headK = easeOutCubic(t / expandS);
  // the vibration while held is a choice between a few drawings, not a sine:
  // a sine is a machine breathing, a pick from three is an animator's cycle
  const jitter = (hash1(boil * 1.7 + 3) - 0.5) * 2 * L.boilWidth;
  let widthK, alpha = 1, breakup = 0;
  if (t < expandS) {
    widthK = L.introWidth + (1 - L.introWidth) * easeOutBack(t / expandS, L.overshoot);
  } else if (t < expandS + sustainS) {
    const s = (t - expandS) / sustainS;
    // the arrival's overshoot rings down over the first fifth of the hold
    widthK = 1 + jitter + L.ringDown * Math.exp(-s * 9) * Math.cos(s * 31);
  } else {
    const f = (t - expandS - sustainS) / fadeS;
    widthK = (1 + jitter * (1 - f)) * (1 - L.fadeThin * easeInOut(f));
    breakup = easeInOut(f);
    alpha = 1 - Math.pow(clamp01(f), 3);
  }
  // THE PAPER BURNS BEHIND THE BEAM, not with it: it opens over openS after the
  // shot, keeps creeping outward while the beam is held (the edge is still
  // being eaten), and heals across the fade -- inside the same timing, by the
  // owner's choice, so the page is whole again the instant the beam is gone.
  const E = cfg.erosion;
  let open;
  if (t < expandS + sustainS) {
    open = easeOutCubic(t / E.openS) * (1 + E.creep * clamp01((t - E.openS) / sustainS));
  } else {
    const f = (t - expandS - sustainS) / fadeS;
    open = (1 + E.creep) * (1 - easeInOut(f));
  }
  const shell = Math.max(0, 1 - t / L.shellS);
  return { headK, widthK, alpha, breakup, open, shell, boil, done: false };
}

/**
 * THE CHARGE, as a function of time since the press. chargeS is the brain's
 * own number.
 *
 *   ball     the gathering orb, 0..1
 *   crackle  how hard the lightning is working, 0..1
 *   boil     which drawing the edges are on (on twos, like the fire's)
 */
export function chargeTimeline(t, cfg) {
  const C = cfg.charge;
  const k = clamp01(t / cfg.chargeS);
  return {
    ball: easeOutCubic(k) * (0.35 + 0.65 * k),
    crackle: clamp01((t - C.crackleFromS) / Math.max(1e-6, cfg.chargeS - C.crackleFromS)),
    boil: Math.floor(Math.max(0, t) * (cfg.boilFps || 12))
  };
}

/**
 * A JAGGED PATH from a to b by midpoint displacement -- the classic lightning
 * construction: halve every segment and push the new point sideways by an
 * amount that halves with each generation, so the bolt is rough at every scale
 * the eye can resolve and never noisy at the scale it cannot.
 *
 * @returns flat [x0,y0, x1,y1, ...] with 2^depth + 1 points
 */
export function jaggedPath(rng, ax, ay, bx, by, depth, rough) {
  let pts = [ax, ay, bx, by];
  let amp = Math.hypot(bx - ax, by - ay) * rough;
  for (let d = 0; d < depth; d++) {
    const next = [pts[0], pts[1]];
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3];
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const off = (rng() - 0.5) * 2 * amp;
      next.push((x0 + x1) / 2 - (dy / len) * off, (y0 + y1) / 2 + (dx / len) * off, x1, y1);
    }
    pts = next;
    amp *= 0.5;
  }
  return pts;
}

/**
 * AN ARC THAT WRAPS THE BEAM. The yellow bolts in cmzw's frames coil round the
 * beam as it travels; seen side-on a coil is a curve that crosses from one
 * edge to the other and back, so that is what this draws: a sine across the
 * beam, roughened, in the BEAM's frame (s along, r across). The caller turns it
 * into document px.
 */
export function wrapArc(rng, s0, len, halfW, turns, depth) {
  const n = 1 << depth;
  const phase = rng() * Math.PI * 2;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const s = s0 + len * u;
    // the arc reaches past the edge -- it is IN FRONT of the beam -- and is
    // pinched at its two ends so it starts and stops on the surface
    const reach = halfW * (1.05 + 0.25 * rng()) * Math.sin(Math.PI * u);
    const r = reach * Math.sin(phase + u * turns * Math.PI * 2) + (rng() - 0.5) * halfW * 0.35;
    out.push(s + (rng() - 0.5) * len / n * 0.8, r);
  }
  return out;
}

/**
 * THE STARS AROUND THE ORIGIN. Which star, where, when and how big, for one
 * shot, decided once from a seed -- so the effect costs nothing to plan while
 * it plays, and the same seed is the same constellation (the checks use that).
 *
 * Times are relative to the SHOT (negative = during the charge's last beats).
 * Positions are in units of the character's height, around the muzzle, and
 * leaning forward along the beam: the stars are knocked loose by the eruption,
 * so they spray the way it goes and only a few fall behind.
 *
 * kind 0 a twinkle (short concave arms), 1 a flare (one long axis, the cross
 * of light that marks the origin in every reference)
 */
export function starSchedule(seed, cfg) {
  const S = cfg.stars;
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [];
  // the origin's own flare, first and biggest, on the shot itself
  out.push({ t0: -0.02, life: S.flareLife, fwd: 0, side: 0, size: S.flareSize, kind: 1, rot: 0 });
  for (let i = 0; i < S.count; i++) {
    const ang = (rng() - 0.5) * Math.PI * 2 * S.spread;   // around the beam axis
    const dist = S.minR + (S.maxR - S.minR) * Math.sqrt(rng());
    out.push({
      t0: S.fromS + (S.toS - S.fromS) * (i / Math.max(1, S.count - 1)) + (rng() - 0.5) * 0.06,
      life: S.life * (0.7 + 0.6 * rng()),
      fwd: Math.cos(ang) * dist + S.lead,
      side: Math.sin(ang) * dist,
      size: S.size * (0.55 + 0.9 * rng()),
      kind: rng() < S.flareShare ? 1 : 0,
      rot: rng() < 0.5 ? 0 : Math.PI / 4
    });
  }
  return out;
}

/**
 * THE ROW OF GLINTS ALONG THE PATH, in the place of the dashed guide line
 * (removed 2026-10-04, with the impact frames). Waves of small twinkles pop
 * outward from the muzzle, each a beat after the one before, a new wave every
 * waveS until the shot. Decided once per press from the same seed as the
 * origin's stars.
 *
 * Times are since the PRESS (the charge's own clock). `along` is 0..1 of the
 * row's reach down the aim; `side` is off the line, in character heights.
 * Every glint is over before the shot leaves, so the row hands over to the
 * beam rather than sitting on top of it.
 */
export function pathStarSchedule(seed, cfg) {
  const S = cfg.pathStars;
  let a = (seed ^ 0x9e3779b9) >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [];
  for (let w = 0; ; w++) {
    const t0w = S.fromS + w * S.waveS;
    if (t0w + S.life > cfg.chargeS) break;
    for (let i = 0; i < S.count; i++) {
      const t0 = t0w + i * S.stepS;
      if (t0 + S.life > cfg.chargeS) break;
      out.push({
        t0, life: S.life,
        along: (i + 0.6 + (rng() - 0.5) * 0.4) / S.count,
        side: (rng() - 0.5) * 2 * S.jitter,
        size: S.size * (0.7 + 0.6 * rng()),
        rot: rng() < 0.5 ? 0 : Math.PI / 4,
        kind: 0
      });
    }
  }
  return out;
}

/**
 * one star's scale at time t: pops in, holds, shrinks away. Sprites do not
 * have alpha ramps (starBurst.js makes the same argument), so presence is size.
 */
export function starScale(t, star) {
  const u = (t - star.t0) / star.life;
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.12) return easeOutBack(u / 0.12, 2.4);
  if (u < 0.55) return 1;
  return 1 - easeInOut((u - 0.55) / 0.45);
}
