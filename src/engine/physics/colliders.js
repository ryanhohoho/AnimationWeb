// colliders.js
// dom rects as physics obstacles + viewport edges. measurement is browser-only;
// resolution is pure math and runs headless (tests inject rects directly).

import { v2 } from "../../utils/math.js";

// --- measurement (browser) ---------------------------------------------------

export function createColliderTracker(world) {
  let els = [];
  let dirty = true;
  let rafPending = false;

  function collect() {
    els = Array.from(document.querySelectorAll("[data-collider]"));
  }

  function measure() {
    // document coords: stable under scroll, only layout changes matter
    const sy = window.scrollY;
    const next = els.map((el) => {
      const r = el.getBoundingClientRect();
      return { rect: { x: r.left, y: r.top + sy, w: r.width, h: r.height }, el };
    }).filter((c) => c.rect.w > 4 && c.rect.h > 4);
    // only bump the version when geometry actually changed (pathfinder rebuilds on it)
    const changed = next.length !== world.colliders.length || next.some((c, i) => {
      const o = world.colliders[i]?.rect;
      return !o || Math.abs(o.x - c.rect.x) > 1 || Math.abs(o.y - c.rect.y) > 1 ||
        Math.abs(o.w - c.rect.w) > 1 || Math.abs(o.h - c.rect.h) > 1;
    });
    world.colliders = next;
    if (changed) world.collidersVersion++;
    dirty = false;
  }

  function requestMeasure() {
    dirty = true;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (dirty) measure();
    });
  }

  world.on("resize", () => { collect(); requestMeasure(); });
  // beam destruction can delete colliders outright
  world.on("recollect", () => { collect(); requestMeasure(); });
  // catch layout shifts that don't fire resize (fonts, images, content)
  setInterval(() => requestMeasure(), 500);

  collect();
  measure();
  return { requestMeasure };
}

// --- resolution (headless-safe) ----------------------------------------------

// circle vs axis-aligned rect with restitution + tangential damping.
// colliderVel lets scrolling content shove the character (relative velocity).
export function resolveCircleRect(body, rect, cfg, colliderVel = { x: 0, y: 0 }, out = null) {
  const cx = Math.max(rect.x, Math.min(body.pos.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(body.pos.y, rect.y + rect.h));
  let dx = body.pos.x - cx;
  let dy = body.pos.y - cy;
  let dist = Math.hypot(dx, dy);

  let nx, ny, pen;
  if (dist > 1e-6) {
    if (dist >= body.radius) return null;
    nx = dx / dist;
    ny = dy / dist;
    pen = body.radius - dist;
  } else {
    // center inside the rect: push out along the shallowest axis
    const left = body.pos.x - rect.x;
    const right = rect.x + rect.w - body.pos.x;
    const top = body.pos.y - rect.y;
    const bottom = rect.y + rect.h - body.pos.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) { nx = -1; ny = 0; pen = left + body.radius; }
    else if (m === right) { nx = 1; ny = 0; pen = right + body.radius; }
    else if (m === top) { nx = 0; ny = -1; pen = top + body.radius; }
    else { nx = 0; ny = 1; pen = bottom + body.radius; }
  }

  // positional correction
  body.pos.x += nx * pen;
  body.pos.y += ny * pen;

  // velocity response on the relative velocity
  const rvx = body.vel.x - colliderVel.x;
  const rvy = body.vel.y - colliderVel.y;
  const vn = rvx * nx + rvy * ny;
  let impact = 0;
  if (vn < 0) {
    impact = -vn;
    const vtX = rvx - vn * nx;
    const vtY = rvy - vn * ny;
    body.vel.x = colliderVel.x + vtX * cfg.tangentDamp - vn * cfg.restitution * nx;
    body.vel.y = colliderVel.y + vtY * cfg.tangentDamp - vn * cfg.restitution * ny;
  }
  if (out) { out.nx = nx; out.ny = ny; out.impact = impact; }
  return { nx, ny, impact };
}

// ── THE EDGE IS A LEASH, NOT A WALL ─────────────────────────────────────────
// She may cross it. An animal that stops dead at an invisible line is a sprite
// in a box, and the whole point of her is that she is loose on the page.
//
// So: `edgeSlackPx` of free travel past the edge, then a spring that grows the
// further out she goes, and a hard stop only at `edgeHardPx` — which exists
// purely so a fling can never lose her somewhere unreachable. The brain's own
// offscreen-return already flies her back; this only has to make sure that
// return is always possible.
export function resolveEdges(body, bounds, cfg) {
  const slack = cfg.edgeSlackPx;
  const hard = cfg.edgeHardPx;
  const k = cfg.edgeReturnAccel;
  let hit = null;

  // one axis at a time: over = how far past the slack line she is
  const pull = (p, lo, hi) => {
    if (p < lo) return lo - p;
    if (p > hi) return -(p - hi);
    return 0;
  };
  const ox = pull(body.pos.x, -slack, bounds.w + slack);
  const oy = pull(body.pos.y, -slack, bounds.h + slack);
  if (ox || oy) {
    // the spring stiffens with distance, so drifting out is gentle and being
    // thrown out is firmly answered
    const soft = Math.min(1, Math.hypot(ox, oy) / Math.max(1, hard - slack));
    body.addForce({ x: Math.sign(ox) * k * soft, y: Math.sign(oy) * k * soft });
  }

  // the point of no return
  const clampAxis = (p, lo, hi) => (p < lo ? lo : p > hi ? hi : p);
  const cx = clampAxis(body.pos.x, -hard, bounds.w + hard);
  const cy = clampAxis(body.pos.y, -hard, bounds.h + hard);
  if (cx !== body.pos.x) {
    const impact = Math.abs(body.vel.x);
    hit = { nx: Math.sign(cx - body.pos.x), ny: 0, impact };
    body.pos.x = cx;
    body.vel.x *= -cfg.edgeRestitution;
  }
  if (cy !== body.pos.y) {
    const impact = Math.abs(body.vel.y);
    if (!hit || impact > hit.impact) hit = { nx: 0, ny: Math.sign(cy - body.pos.y), impact };
    body.pos.y = cy;
    body.vel.y *= -cfg.edgeRestitution;
  }
  return hit;
}

// ── TEXT IS SOMETHING TO AVOID, NOT SOMETHING TO HIT ────────────────────────
// Nothing on the page stops her any more. Navigation used to be a sequence of
// small collisions — she would clip the corner of a paragraph, get shoved,
// re-plan, clip the next one — and the sum of that reads as a bug rather than
// as an animal.
//
// Two fields replace it, and they are deliberately SHORT-RANGED. A long-range
// repulsion from every block of type is a potential field whose minimum is the
// margin of the page, and she would spend her life crawling around the outside
// edge. These only speak up when she is close enough that it is about to
// matter.
//
//   AVOID   near a surface: a push away that falls off to nothing by
//           `avoidRangePx`. It steers her around a paragraph she is passing.
//   ESCAPE  centre inside a rect: a firm push toward the nearest way OUT,
//           summed across every rect she is inside — so a stack of paragraphs
//           resolves toward the gap between them rather than deeper in.
//
// Returns the hardest overlap this pass, for the bump reaction.
export function avoidColliders(body, world, cfg) {
  const range = cfg.avoidRangePx;
  const r = body.radius;
  let fx = 0, fy = 0;
  let inside = 0;
  let worst = null;

  for (const c of world.colliders) {
    const rect = c.rect;
    const nx0 = Math.max(rect.x, Math.min(body.pos.x, rect.x + rect.w));
    const ny0 = Math.max(rect.y, Math.min(body.pos.y, rect.y + rect.h));
    const dx = body.pos.x - nx0;
    const dy = body.pos.y - ny0;
    const d = Math.hypot(dx, dy);

    if (d > 1e-6) {
      if (d >= r + range) continue;
      // outside, but close: steer away, hardest at the surface
      const t = 1 - Math.max(0, d - r) / range;
      const g = cfg.avoidAccel * t * t;
      fx += (dx / d) * g;
      fy += (dy / d) * g;
      if (d < r) {
        const vn = (body.vel.x * dx + body.vel.y * dy) / d;
        if (!worst || -vn > worst.impact) worst = { nx: dx / d, ny: dy / d, impact: -vn };
      }
      continue;
    }

    // centre is inside this rect: out along the shallowest wall
    inside++;
    const left = body.pos.x - rect.x;
    const right = rect.x + rect.w - body.pos.x;
    const top = body.pos.y - rect.y;
    const bottom = rect.y + rect.h - body.pos.y;
    const m = Math.min(left, right, top, bottom);
    let ex = 0, ey = 0;
    if (m === left) ex = -1;
    else if (m === right) ex = 1;
    else if (m === top) ey = -1;
    else ey = 1;
    fx += ex * cfg.insideAccel;
    fy += ey * cfg.insideAccel;
    const speed = Math.hypot(body.vel.x, body.vel.y);
    if (!worst || speed > worst.impact) worst = { nx: ex, ny: ey, impact: speed };
  }

  // A SADDLE IS A TRAP. Dead centre of a symmetric block, or between two that
  // cancel, the escape sums to zero and she would sit inside the type forever.
  // The nudge is derived from her own position rather than drawn from the
  // world's rng, because the rng is seeded and shared and a draw here would
  // desync every other consumer of it.
  if (inside && Math.hypot(fx, fy) < cfg.insideAccel * 0.25) {
    const a = (body.pos.x * 0.013 + body.pos.y * 0.017) % (Math.PI * 2);
    fx += Math.cos(a) * cfg.insideAccel;
    fy += Math.sin(a) * cfg.insideAccel;
  }

  if (fx || fy) body.addForce({ x: fx, y: fy });
  return worst;
}

// run the full pass; emits 'bump' (and, on a hard one, 'flail') through the
// world bus.
// everything is in document space now, so scrolling moves nothing here.
export function resolveAll(body, world, cfg) {
  let strongest = avoidColliders(body, world, cfg);
  const overlapping = !!strongest;

  const edgeHit = resolveEdges(body, world.docSize, cfg);
  if (edgeHit && (!strongest || edgeHit.impact > strongest.impact)) strongest = edgeHit;

  // A BUMP IS NOW AN EVENT, NOT A CONSEQUENCE.
  // Drifting through a paragraph must never react, or navigation is a stutter
  // of little collisions again. Being FLUNG into one still should: that is the
  // user doing something to her, and the >.< is the answer to it. So the
  // reaction fires on the rising edge of a fast overlap — once on the way in,
  // never again while she is passing through.
  const wasIn = body._overlapping === true;
  body._overlapping = overlapping;
  const fresh = overlapping && !wasIn;
  if (!(fresh || edgeHit)) return strongest;

  if (strongest && strongest.impact > cfg.bumpEventMinSpeed) {
    world.emit("bump", { normal: { x: strongest.nx, y: strongest.ny }, speed: strongest.impact });
    // A REALLY HARD ONE gets its own event: limbs flail, face screws up into
    // >.< . The roll lives HERE, once, rather than in each pose layer, so the
    // face and the limbs can never disagree about whether it happened -- two
    // independent rolls off the same seeded rng would consume different values
    // and desync, which reads as a bug rather than a reaction.
    if (strongest.impact > cfg.flailMinSpeed && world.random() < cfg.flailChance) {
      world.emit("flail", { speed: strongest.impact });
    }
  }
  return strongest;
}
