// pathfinder.js
// coarse occupancy grid over the whole document + a* + line-of-sight smoothing.
// obstacles are dom collider rects inflated by the body radius, so any path the
// grid returns is one the physics circle can actually fly without bumping.
// pure math, runs headless.

export function createPathfinder(world, cfg) {
  const cell = cfg.cellPx;
  let cols = 0, rows = 0;
  let blocked = null;
  let builtVersion = -1;
  let builtRadius = 0;

  function build(radius) {
    cols = Math.max(1, Math.ceil(world.docSize.w / cell));
    rows = Math.max(1, Math.ceil(world.docSize.h / cell));
    blocked = new Uint8Array(cols * rows);
    const inflate = radius + cfg.padPx;
    for (const c of world.colliders) {
      const r = c.rect;
      const x0 = Math.max(0, Math.floor((r.x - inflate) / cell));
      const y0 = Math.max(0, Math.floor((r.y - inflate) / cell));
      const x1 = Math.min(cols - 1, Math.floor((r.x + r.w + inflate) / cell));
      const y1 = Math.min(rows - 1, Math.floor((r.y + r.h + inflate) / cell));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 1;
      }
    }
    builtVersion = world.collidersVersion;
    builtRadius = radius;
  }

  function ensure(radius) {
    if (!blocked || builtVersion !== world.collidersVersion || Math.abs(builtRadius - radius) > 2) {
      build(radius);
    }
  }

  const toCell = (p) => ({
    x: Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell))),
    y: Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)))
  });
  const toWorld = (c) => ({ x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell });
  const isFree = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !blocked[y * cols + x];

  // nearest free cell via expanding ring search (for targets inside obstacles)
  function nearestFree(c) {
    if (isFree(c.x, c.y)) return c;
    for (let ring = 1; ring < Math.max(cols, rows); ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          if (isFree(c.x + dx, c.y + dy)) return { x: c.x + dx, y: c.y + dy };
        }
      }
    }
    return null;
  }

  // supercover-ish line of sight on the grid
  function losCells(ax, ay, bx, by) {
    let x = ax, y = ay;
    const dx = Math.abs(bx - ax), dy = Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (!isFree(x, y)) return false;
      if (x === bx && y === by) return true;
      const e2 = 2 * err;
      // when the line passes exactly through a corner, check both neighbors
      if (e2 > -dy && e2 < dx) {
        if (!isFree(x + sx, y) && !isFree(x, y + sy)) return false;
      }
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  function losPoints(a, b, radius) {
    ensure(radius);
    const ca = toCell(a), cb = toCell(b);
    return losCells(ca.x, ca.y, cb.x, cb.y);
  }

  // 8-connected a* with corner-cut prevention
  function findPath(from, to, radius) {
    ensure(radius);
    let start = nearestFree(toCell(from));
    let goal = nearestFree(toCell(to));
    if (!start || !goal) return null;

    const idx = (c) => c.y * cols + c.x;
    const open = [];   // binary-ish: small grids, a sorted-insert array is fine
    const came = new Map();
    const gScore = new Map();
    const h = (c) => {
      const dx = Math.abs(c.x - goal.x), dy = Math.abs(c.y - goal.y);
      return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    gScore.set(idx(start), 0);
    open.push({ c: start, f: h(start) });
    const closed = new Set();
    let found = null;
    let guard = cols * rows * 4;

    while (open.length && guard-- > 0) {
      // pop lowest f
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0].c;
      const ci = idx(cur);
      if (closed.has(ci)) continue;
      closed.add(ci);
      if (cur.x === goal.x && cur.y === goal.y) { found = cur; break; }

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cur.x + dx, ny = cur.y + dy;
          if (!isFree(nx, ny)) continue;
          // no cutting corners diagonally past a blocked cell
          if (dx !== 0 && dy !== 0 && (!isFree(cur.x + dx, cur.y) || !isFree(cur.x, cur.y + dy))) continue;
          const ni = ny * cols + nx;
          if (closed.has(ni)) continue;
          const cost = (dx === 0 || dy === 0) ? 1 : Math.SQRT2;
          const g = gScore.get(ci) + cost;
          if (g < (gScore.get(ni) ?? Infinity)) {
            gScore.set(ni, g);
            came.set(ni, ci);
            open.push({ c: { x: nx, y: ny }, f: g + h({ x: nx, y: ny }) });
          }
        }
      }
    }
    if (!found) return null;

    // reconstruct
    const cells = [];
    let ci = idx(found);
    while (ci !== undefined) {
      cells.push({ x: ci % cols, y: Math.floor(ci / cols) });
      ci = came.get(ci);
    }
    cells.reverse();

    // greedy los smoothing: keep only waypoints we can't skip
    const pts = [];
    let anchor = 0;
    pts.push(toWorld(cells[0]));
    for (let i = 2; i < cells.length; i++) {
      if (!losCells(cells[anchor].x, cells[anchor].y, cells[i].x, cells[i].y)) {
        anchor = i - 1;
        pts.push(toWorld(cells[anchor]));
      }
    }
    pts.push(toWorld(cells[cells.length - 1]));
    // walk to the real target if it's in a free cell (grid centers are coarse)
    if (isFree(toCell(to).x, toCell(to).y)) {
      pts[pts.length - 1] = { x: to.x, y: to.y };
    }
    return pts;
  }

  function isFreePoint(p, radius) {
    ensure(radius);
    const c = toCell(p);
    return isFree(c.x, c.y);
  }

  return { findPath, losPoints, isFreePoint, _debug: { build, get grid() { return { cols, rows, blocked }; } } };
}
