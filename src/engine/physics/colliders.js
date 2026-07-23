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

// keeps the body inside the DOCUMENT (movement space), not the viewport
export function resolveEdges(body, bounds, cfg) {
  const inset = cfg.edgeInset;
  const r = body.radius;
  let hit = null;
  const e = cfg.edgeRestitution;

  if (body.pos.x < inset + r) {
    body.pos.x = inset + r;
    if (body.vel.x < 0) { hit = { nx: 1, ny: 0, impact: -body.vel.x }; body.vel.x *= -e; }
  } else if (body.pos.x > bounds.w - inset - r) {
    body.pos.x = bounds.w - inset - r;
    if (body.vel.x > 0) { hit = { nx: -1, ny: 0, impact: body.vel.x }; body.vel.x *= -e; }
  }
  if (body.pos.y < inset + r) {
    body.pos.y = inset + r;
    if (body.vel.y < 0) { hit = { nx: 0, ny: 1, impact: -body.vel.y }; body.vel.y *= -e; }
  } else if (body.pos.y > bounds.h - inset - r) {
    body.pos.y = bounds.h - inset - r;
    if (body.vel.y > 0) { hit = { nx: 0, ny: -1, impact: body.vel.y }; body.vel.y *= -e; }
  }
  return hit;
}

// run the full pass; emits 'bump' events through the world bus.
// everything is in document space now, so scrolling moves nothing here.
export function resolveAll(body, world, cfg) {
  let strongest = null;

  for (const c of world.colliders) {
    const hit = resolveCircleRect(body, c.rect, cfg);
    if (hit && (!strongest || hit.impact > strongest.impact)) strongest = hit;
  }
  const edgeHit = resolveEdges(body, world.docSize, cfg);
  if (edgeHit && (!strongest || edgeHit.impact > strongest.impact)) strongest = edgeHit;

  if (strongest && strongest.impact > cfg.bumpEventMinSpeed) {
    world.emit("bump", { normal: { x: strongest.nx, y: strongest.ny }, speed: strongest.impact });
  }
  return strongest;
}
