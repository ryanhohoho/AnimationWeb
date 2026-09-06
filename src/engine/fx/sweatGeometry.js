// sweatGeometry.js
// pure math for the panic sweat: the wave schedule, the launch layout, and the
// bezier of the path each drop has just flown. no dom, no three, no state --
// headless-testable, the same shape as fx/beamGeometry.js.
//
// EVERYTHING HERE IS IN MATHS COORDINATES: pixels, +y UP. The GL module flips
// nothing; the character's fx group is already the right way up.
//
// WHY THE TAIL IS EXACTLY A QUADRATIC BEZIER, WHICH IS THE WHOLE TRICK
// --------------------------------------------------------------------
// Under the closed-form ballistic solution p(s) = p0 + v0*s + a*s*s/2, the path
// the drop has ALREADY FLOWN, looked back over a window of tau, is
//
//     p(s - tau) = p(s) - v(s)*tau + a*tau*tau/2
//
// which is exactly quadratic in tau. So the trailing path is not APPROXIMATED
// by a quadratic bezier -- it IS one. Matching
// Q(t) = (1-t)^2 A + 2(1-t)t C + t^2 E with t = tau/dt gives
//
//     A = p(s)                    the head, leading
//     C = A - v*dt/2              from Q'(0) = -v*dt
//     E = A - v*dt + a*dt*dt/2    the tip
//
// Two multiplies and an add each. The tail hooks the way gravity bent the
// flight because it IS the gravity term, and the hook grows as the drop slows
// over the top of its arc -- which is the "bent by gravity" the drawn mark has,
// obtained for nothing rather than dialled in.

const D2R = Math.PI / 180;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * The launch speed's vertical component. Every drop has the same one, and that
 * is load-bearing: it is what makes every life identical, which is what makes
 * the wave schedule closed-form.
 */
export function launchVY(cfg) {
  return cfg.speedPx * Math.sin(cfg.elevDeg * D2R);
}

/**
 * How long one drop lives: to the top of its arc, a shade past it.
 *
 * NOTHING IS EVER SEEN COMING DOWN. A drop that arcs over and falls reads as
 * weight, which is a slow idea, and this spray is the opposite of slow. The
 * overshoot is small on purpose -- just enough that you register it turning.
 *
 * lifeMaxS is a GUARD, not a design knob. If it ever binds, the schedule below
 * stops being derived from the arc and the waves silently start overlapping.
 * There is a check for that.
 */
export function dropLife(cfg) {
  const apex = launchVY(cfg) / cfg.gravityPx;
  return Math.min(cfg.lifeMaxS, apex * cfg.apexOvershoot);
}

/**
 * WAVE N+1 LEAVES WHEN WAVE N IS GONE, plus a breath. Not a period -- a gap.
 *
 * The old build ran four waves 0.12 s apart against a life three times longer,
 * so all twelve were in the air together and it read as a cloud coming off her
 * rather than as three throws. Boom, boom, boom is three separate events, and
 * an event needs the stage clear before the next one starts.
 *
 * @returns { life, step, delays: number[], total }
 */
export function waveSchedule(cfg) {
  const life = dropLife(cfg);
  const step = life + cfg.waveGapS;
  const delays = [];
  for (let w = 0; w < cfg.waves; w++) delays.push(w * step);
  return { life, step, delays, total: (cfg.waves - 1) * step + life };
}

/**
 * The launches, all of them, in one go.
 *
 * BOTH TEMPLES EVERY WAVE. Two drops from one side and one from the other, and
 * the majority flips wave to wave -- so a burst is never symmetrical enough to
 * read as a machine and never one-sided enough to read as a leak.
 *
 * THE THREE OF A WAVE ARE SEPARATED IN SPACE, NOT IN ANGLE. Rotating a drop's
 * velocity to fan it out is changing its arc, and then they are no longer
 * carrying the same arch. Offsetting the spawn point instead leaves all three
 * arcs congruent -- two translates and a mirror -- and they still do not read
 * as copies, because you are seeing the same curve at three different phases.
 *
 * @param escX  the escape direction's x, -1..1. Her flight carries the spray.
 * @param startSide  +1 or -1: which temple gets two in the first wave.
 * @returns [{ wave, side, x0, y0, vx, vy, delay, life }]
 */
export function layout(cfg, escX, startSide) {
  const { life, delays } = waveSchedule(cfg);
  const e = cfg.elevDeg * D2R;
  const cos = Math.cos(e), sin = Math.sin(e);
  const carry = cfg.escapeCarryPx * clamp(escX, -1, 1);
  const out = [];

  for (let w = 0; w < cfg.waves; w++) {
    const major = w % 2 === 0 ? startSide : -startSide;
    const nMajor = Math.max(1, cfg.perWave - 1);
    for (let k = 0; k < cfg.perWave; k++) {
      // the majority temple takes all but one; the last drop crosses over
      const side = k < nMajor ? major : -major;
      // where this drop sits within its own cluster, -1..+1. The singleton is
      // centred on the launch line; the group straddles it.
      const rank = k < nMajor ? (nMajor > 1 ? (k / (nMajor - 1)) * 2 - 1 : 0) : 0;

      // THE CLUSTER MIRRORS, and it has to be built that way rather than fall
      // out of the arithmetic. The offset is computed for the RIGHT temple and
      // then flipped in x, because the perpendicular of the launch direction
      // does not itself mirror when the side does -- built the obvious way, the
      // right pair came out 8 px apart and the left pair 22 px apart, which
      // reads as one side being sloppier than the other.
      const ux = cos, uy = sin;                 // the right-hand launch line
      const px = -uy, py = ux;                  // ...and across it
      const offX = (px * rank * cfg.sideStepPx + ux * rank * cfg.sideOutPx) * side;
      const offY = py * rank * cfg.sideStepPx + uy * rank * cfg.sideOutPx;
      const x0 = side * cfg.templeXPx + offX;
      const y0 = cfg.templeYPx + offY;

      out.push({
        wave: w, side,
        x0, y0,
        // A CARRY AND NOT A LEAN. Leaning the launch angle into the escape
        // rotates the velocity, which changes vy, which changes the apex,
        // which changes the life -- and then the waves are no longer the same
        // length and the schedule above stops being closed-form. Adding to vx
        // alone leaves vy invariant, so the whole spray keeps one clock however
        // hard she is running.
        vx: side * cfg.speedPx * cos + carry,
        vy: cfg.speedPx * sin,
        delay: delays[w],
        life
      });
    }
  }
  return out;
}

/**
 * Where a drop is now, and the bezier of where it has just been.
 *
 * @param ts  seconds since THIS drop launched (not since the burst)
 * @returns { ax, ay, cx, cy, ex, ey, r0, half, hand, alive }
 *   ax/ay are px relative to the character; the rest are px relative to the
 *   head, which is what the shader wants and what makes the quad axis-aligned.
 */
export function dropFrame(d, ts, cfg) {
  if (ts < 0 || ts > d.life) {
    return { ax: 0, ay: 0, cx: 0, cy: 0, ex: 0, ey: 0, r0: 0, half: 0, hand: 1, alive: false };
  }
  const g = cfg.gravityPx;
  const ax = d.x0 + d.vx * ts;
  const ay = d.y0 + d.vy * ts - 0.5 * g * ts * ts;
  const vx = d.vx;
  const vy = d.vy - g * ts;
  const sp = Math.max(1e-3, Math.hypot(vx, vy));

  // THE TAIL IS A DRAWN LENGTH, NOT A DURATION. A glyph has fixed proportions,
  // so what is fixed is how long the mark is; how far back in time that reaches
  // follows from how fast the drop happens to be going. And it is clamped to the
  // drop's own age, or a drop arrives already trailing a tail from before it
  // existed -- which instead makes it grow out of the temple over the first few
  // frames, the way the drawn one does.
  let dt = clamp(cfg.tailPx / sp, cfg.tailMinS, cfg.tailMaxS);
  if (dt > ts) dt = ts;

  const cx = -vx * dt * 0.5;
  const cy = -vy * dt * 0.5;
  // THE ONE PLACE THE DRAWING LIES ABOUT THE PHYSICS, and it lies in the
  // direction the physics already points. At hookGain 1 the bezier is exactly
  // the flown path, and the bend peaks at about 0.8 of a texel through the
  // presentation pass -- true, and invisible. The gain multiplies only the
  // gravity term, so the tail still leaves the head along the real reversed
  // velocity and only its far end is exaggerated.
  const ex = -vx * dt;
  const ey = -vy * dt - cfg.hookGain * 0.5 * g * dt * dt;

  const pop = clamp(ts / Math.max(1e-4, cfg.popInFrac * d.life), 0, 1);
  const grow = cfg.growFrom + (cfg.growTo - cfg.growFrom) *
    clamp(ts / Math.max(1e-4, cfg.holdFrac * d.life), 0, 1);
  const r0 = cfg.bulbPx * grow * pop;

  const half = Math.max(Math.abs(cx), Math.abs(cy), Math.abs(ex), Math.abs(ey)) + r0 + 1;
  // which way the tail curls away from the head, so the specular mirrors
  // between the two temples instead of rotating with the drop
  const cross = cx * ey - cy * ex;
  return { ax, ay, cx, cy, ex, ey, r0, half, hand: cross < 0 ? -1 : 1, alive: true };
}

// ── the silhouette, mirrored from the shader ────────────────────────────────
// These two are the JS twin of the GLSL in sweatDrops.js. They exist so the
// shape can be asserted without a GPU, which is the only way it has ever been
// checked -- and because the drop is now a swept distance field rather than a
// profile function, "is it the right shape" is a question about distances.

/**
 * Exact distance to a tapered segment: the circle at a with radius ra swept to
 * the circle at b with radius rb. Written in the segment's own frame, where the
 * external tangent of the two circles is one dot product.
 */
export function sdTaper(px, py, ax, ay, bx, by, ra, rb) {
  const bax = bx - ax, bay = by - ay;
  const l = Math.max(1e-4, Math.hypot(bax, bay));
  const ux = bax / l, uy = bay / l;
  const pax = px - ax, pay = py - ay;
  const qx = pax * ux + pay * uy;
  const qy = Math.abs(pay * ux - pax * uy);
  const sc = clamp((ra - rb) / l, -1, 1);
  const cc = Math.sqrt(Math.max(0, 1 - sc * sc));
  const k = qx * cc - qy * sc;
  if (k < 0) return Math.hypot(qx, qy) - ra;
  if (k > l * cc) return Math.hypot(qx - l, qy) - rb;
  return qx * sc + qy * cc - ra;
}

/**
 * The drop: a disc at the head, swept along the bezier of the path it has just
 * flown, with the radius falling to nothing at the tip. There is no separate
 * hook term and no bend parameter -- the curve IS the hook, and it is curved
 * because the flight was.
 *
 * A union of DISCS was the obvious first version and it is wrong twice: it
 * scallops along the spine, and near the tip, where the radius drops below the
 * sample spacing, it comes apart into a dotted line. A tapered segment cannot.
 */
export function sdDrop(px, py, cx, cy, ex, ey, r0, taperExp, segs) {
  let d = Math.hypot(px, py) - r0;
  let pvx = 0, pvy = 0, rp = r0;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const s = 1 - t;
    const qx = 2 * s * t * cx + t * t * ex;
    const qy = 2 * s * t * cy + t * t * ey;
    const r = r0 * Math.pow(Math.max(s, 1e-4), taperExp);
    d = Math.min(d, sdTaper(px, py, pvx, pvy, qx, qy, rp, r));
    pvx = qx; pvy = qy; rp = r;
  }
  return d;
}

/** the trailing bezier evaluated at t, for checking it against the real path */
export function tailAt(f, t) {
  const s = 1 - t;
  return {
    x: 2 * s * t * f.cx + t * t * f.ex,
    y: 2 * s * t * f.cy + t * t * f.ey
  };
}
