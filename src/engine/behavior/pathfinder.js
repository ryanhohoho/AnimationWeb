// pathfinder.js
// coarse COST grid over the whole document + a* + line-of-sight smoothing.
// pure math, runs headless.
//
// WHY A COST FIELD AND NOT A WALL MAP
// -----------------------------------
// This used to be occupancy: a cell was blocked or it was not, obstacles were
// inflated by the body radius, and A* would take any detour at all rather than
// cross one. That is correct when the obstacles are walls. These obstacles are
// PARAGRAPHS, they cover most of the page, and nothing collides with them any
// more — so a wall map has exactly one consequence: the only routes left run
// around the outside of the sheet, and she crawls the margins forever.
//
// Crossing type is expensive instead. She goes around whenever around is
// remotely reasonable, and cuts through when the alternative is absurd.

export function createPathfinder(world, cfg) {
  const cell = cfg.cellPx;
  let cols = 0, rows = 0;
  let cost = null;
  let builtVersion = -1;
  let builtRadius = 0;

  function build(radius) {
    cols = Math.max(1, Math.ceil(world.docSize.w / cell));
    rows = Math.max(1, Math.ceil(world.docSize.h / cell));
    cost = new Float32Array(cols * rows).fill(1);
    const inflate = radius * 0.5 + cfg.padPx;
    const ring = cfg.nearCells;
    for (const c of world.colliders) {
      const r = c.rect;
      const x0 = Math.floor((r.x - inflate) / cell);
      const y0 = Math.floor((r.y - inflate) / cell);
      const x1 = Math.floor((r.x + r.w + inflate) / cell);
      const y1 = Math.floor((r.y + r.h + inflate) / cell);
      // the graded ring first, so the solid core overwrites it rather than the
      // other way round
      for (let y = y0 - ring; y <= y1 + ring; y++) {
        if (y < 0 || y >= rows) continue;
        for (let x = x0 - ring; x <= x1 + ring; x++) {
          if (x < 0 || x >= cols) continue;
          const out = Math.max(x0 - x, x - x1, y0 - y, y - y1);
          const v = out <= 0
            ? cfg.insideCost
            : 1 + (cfg.nearCost - 1) * (1 - (out - 1) / ring);
          const i = y * cols + x;
          if (v > cost[i]) cost[i] = v;
        }
      }
    }
    builtVersion = world.collidersVersion;
    builtRadius = radius;
  }

  function ensure(radius) {
    if (!cost || builtVersion !== world.collidersVersion || Math.abs(builtRadius - radius) > 2) {
      build(radius);
    }
  }

  const toCell = (p) => ({
    x: Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell))),
    y: Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)))
  });
  const toWorld = (c) => ({ x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell });
  const inGrid = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  const costAt = (x, y) => (inGrid(x, y) ? cost[y * cols + x] : cfg.insideCost);
  /** cheap enough to fly a straight line through, or to aim at */
  const isFree = (x, y) => inGrid(x, y) && cost[y * cols + x] <= cfg.losMaxCost;
  const isOpen = (x, y) => inGrid(x, y) && cost[y * cols + x] <= cfg.openMaxCost;

  // nearest genuinely open cell (for targets that landed inside type)
  function nearestFree(c) {
    if (isOpen(c.x, c.y)) return c;
    for (let ring = 1; ring < Math.max(cols, rows); ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          if (isOpen(c.x + dx, c.y + dy)) return { x: c.x + dx, y: c.y + dy };
        }
      }
    }
    return null;
  }
  // A START inside type is normal now — she can be sitting in a paragraph. It
  // must never fail to plan, so it only has to be somewhere on the grid.
  const clampCell = (c) => ({
    x: Math.min(cols - 1, Math.max(0, c.x)),
    y: Math.min(rows - 1, Math.max(0, c.y))
  });

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
    // the start is wherever she IS, type or not; only the goal has to be open
    const start = clampCell(toCell(from));
    const goal = nearestFree(toCell(to));
    if (!goal) return null;

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
          if (!inGrid(nx, ny)) continue;
          const ni = ny * cols + nx;
          if (closed.has(ni)) continue;
          // the step LENGTH times what that cell charges to be in
          const step = (dx === 0 || dy === 0) ? 1 : Math.SQRT2;
          const g = gScore.get(ci) + step * costAt(nx, ny);
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
    // walk to the real target if it's in an open cell (grid centers are coarse)
    if (isOpen(toCell(to).x, toCell(to).y)) {
      pts[pts.length - 1] = { x: to.x, y: to.y };
    }
    return pts;
  }

  /** open enough to be a destination */
  function isFreePoint(p, radius) {
    ensure(radius);
    const c = toCell(p);
    return isOpen(c.x, c.y);
  }

  /** what a point charges to be in — the interest sampler scores on this */
  function costPoint(p, radius) {
    ensure(radius);
    const c = toCell(p);
    return costAt(c.x, c.y);
  }

  return {
    findPath, losPoints, isFreePoint, costPoint,
    _debug: { build, get grid() { return { cols, rows, cost }; } }
  };
}
