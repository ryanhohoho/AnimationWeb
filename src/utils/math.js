// math.js
// frame-rate independent motion primitives. everything animated in this project
// flows through these -- raw per-frame lerps are banned (see IMPLEMENTATION_PLAN.md)

export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// exponential damp toward a target. rate is "how many times per second the
// remaining distance shrinks by e". identical result at any frame rate.
export function expDamp(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}

// soft limit: behaves linearly near zero, saturates smoothly at +/- limit.
// used instead of hard clamps so springs never slam into a wall.
export function softLimit(x, limit) {
  return limit * Math.tanh(x / limit);
}

// critically damped spring (zeta = 1 default). tracks velocity, so targets can
// jump and the value eases with natural overshoot/settle. semi-implicit euler.
export class Spring {
  constructor(value = 0, omega = 6, zeta = 1) {
    this.x = value;
    this.v = 0;
    this.omega = omega;
    this.zeta = zeta;
  }
  step(target, dt) {
    // substep long frames so stiff springs stay stable
    const maxDt = 1 / 60;
    while (dt > 1e-6) {
      const h = Math.min(dt, maxDt);
      this.v += (this.omega * this.omega * (target - this.x) - 2 * this.zeta * this.omega * this.v) * h;
      this.x += this.v * h;
      dt -= h;
    }
    return this.x;
  }
  reset(value) {
    this.x = value;
    this.v = 0;
  }
}

// deterministic rng (mulberry32). every random choice in the sim pulls from a
// seeded stream so headless tests are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// smooth 1d value noise in [-1, 1]. hash lattice + cubic interp. cheap and
// continuous, which is what idle motion needs (bare sines look robotic).
export function makeNoise1d(seed = 1) {
  const hash = (i) => {
    let h = Math.imul(i ^ seed, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296 * 2 - 1;
  };
  return function (t) {
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * (3 - 2 * f);
    return lerp(hash(i), hash(i + 1), u);
  };
}

// two detuned octaves; irrational ratio keeps it from ever visibly looping
export function makeNoise1d2(seed = 1) {
  const n1 = makeNoise1d(seed);
  const n2 = makeNoise1d(seed ^ 0x5f356495);
  return (t) => n1(t) * 0.72 + n2(t * 2.618 + 13.7) * 0.28;
}

// --- tiny vec2 kit (plain objects, physics runs headless without three) ---

export const v2 = {
  make: (x = 0, y = 0) => ({ x, y }),
  copy: (o, a) => { o.x = a.x; o.y = a.y; return o; },
  set: (o, x, y) => { o.x = x; o.y = y; return o; },
  add: (o, a, b) => { o.x = a.x + b.x; o.y = a.y + b.y; return o; },
  sub: (o, a, b) => { o.x = a.x - b.x; o.y = a.y - b.y; return o; },
  scale: (o, a, s) => { o.x = a.x * s; o.y = a.y * s; return o; },
  addScaled: (o, a, b, s) => { o.x = a.x + b.x * s; o.y = a.y + b.y * s; return o; },
  dot: (a, b) => a.x * b.x + a.y * b.y,
  len: (a) => Math.hypot(a.x, a.y),
  norm: (o, a) => {
    const l = Math.hypot(a.x, a.y) || 1;
    o.x = a.x / l; o.y = a.y / l; return o;
  },
  clampLen: (o, a, max) => {
    const l = Math.hypot(a.x, a.y);
    if (l > max && l > 0) { o.x = a.x * (max / l); o.y = a.y * (max / l); }
    else { o.x = a.x; o.y = a.y; }
    return o;
  }
};
