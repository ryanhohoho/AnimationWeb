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
//
// WHY THAT WAS NOT ENOUGH
// -----------------------
// A cost field prices what a cell CONTAINS. It said nothing about how much room
// a cell has, and the two are not the same thing: a 40 px crack between a
// paragraph and the rim is empty, so it cost 1, so A* threaded it as a bargain
// shortcut. The body then could not use it. She is 150 px across and the
// avoidance field reaches 110 px past that, so in any gap under ~370 px the
// push off one side and the push off the other point at each other and sum to a
// standstill — a stable well a few pixels wide, not a corridor. The planner kept
// promising routes the body could not fly.
//
// So the grid measures CLEARANCE as well, and charges for the squeeze. A gap she
// cannot fit through is priced exactly as dear as the type itself — because it
// is worth the same to her: nothing. That one number does both halves of the
// rule without a special case for either. Where a roomier gap exists nearby, it
// is cheaper and A* takes it. Where every gap is tight, every route costs the
// same per cell, so the shortest wins and the shortest is straight through.
//
// THE SQUEEZE IS A COST OF TRAVELLING, NOT A COST OF BEING. There are two grids
// now and the difference between them is the whole point. A 190 px corridor is
// a miserable thing to thread at speed and a perfectly pleasant place to hover:
// standing still in it, the two avoidance fields hold her in the middle of it,
// which is exactly where she wanted to be. So `travel` carries the squeeze and
// A* and the line-of-sight smoothing read it, while `cost` stays what it always
// was — what a cell CONTAINS — and the interest sampler and every destination
// test read that. Charging the sampler for the squeeze emptied the page: she
// would not choose anywhere that was not a hall.
//
// AND THE GRID DOES NOT STOP AT THE PAGE. It carries `outsideXPx` of open space
// past the left and right rims, because she is allowed out there now. An
// element flush to the edge used to have a crack beside it and nothing else;
// now it has a whole margin to be rounded through, and the route around the
// outside is a real route rather than a wall the planner had to pretend into a
// gap.

export function createPathfinder(world, cfg) {
  const cell = cfg.cellPx;
  let cols = 0, rows = 0;
  let cost = null;           // what a cell CONTAINS — destinations read this
  let travel = null;         // ...plus the squeeze — A* and LOS read this
  let solid = null;          // raw type, uninflated — what clearance is measured to
  let clearPx = null;        // how much room each cell has, in px
  let originX = 0, originY = 0;
  let builtVersion = -1;
  let builtRadius = 0;

  function build(radius) {
    // the grid runs PAST the page on every side, because she does too
    originX = -cfg.outsideXPx;
    originY = -cfg.outsideYPx;
    cols = Math.max(1, Math.ceil((world.docSize.w + cfg.outsideXPx * 2) / cell));
    rows = Math.max(1, Math.ceil((world.docSize.h + cfg.outsideYPx * 2) / cell));
    const n = cols * rows;
    cost = new Float32Array(n).fill(1);
    solid = new Uint8Array(n);
    const inflate = radius * 0.5 + cfg.padPx;
    const ring = cfg.nearCells;
    const gx = (v) => Math.floor((v - originX) / cell);
    const gy = (v) => Math.floor((v - originY) / cell);
    for (const c of world.colliders) {
      const r = c.rect;
      const x0 = gx(r.x - inflate);
      const y0 = gy(r.y - inflate);
      const x1 = gx(r.x + r.w + inflate);
      const y1 = gy(r.y + r.h + inflate);
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
      // ...and the UNINFLATED rect, separately. Clearance has to be distance to
      // the real type: measuring it to the inflated core would fold the body
      // radius in twice and every threshold below would drift with `padPx`.
      const sx0 = Math.max(0, gx(r.x)), sx1 = Math.min(cols - 1, gx(r.x + r.w));
      const sy0 = Math.max(0, gy(r.y)), sy1 = Math.min(rows - 1, gy(r.y + r.h));
      for (let y = sy0; y <= sy1; y++) {
        for (let x = sx0; x <= sx1; x++) solid[y * cols + x] = 1;
      }
    }
    buildClearance();
    chargeForTheSqueeze(radius);
    builtVersion = world.collidersVersion;
    builtRadius = radius;
  }

  // ── HOW MUCH ROOM IS THERE HERE ─────────────────────────────────────────
  // Chamfer distance transform, 3-4 weights, two sweeps. Distance in cells to
  // the nearest cell of type, scaled to px. Off-grid counts as open, which is
  // correct: past the edge of the grid is further from the page still.
  function buildClearance() {
    const n = cols * rows;
    const INF = 1e9;
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = solid[i] ? 0 : INF;
    const put = (i, v) => { if (v < d[i]) d[i] = v; };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (d[i] === 0) continue;
        if (x > 0) put(i, d[i - 1] + 3);
        if (y > 0) {
          put(i, d[i - cols] + 3);
          if (x > 0) put(i, d[i - cols - 1] + 4);
          if (x < cols - 1) put(i, d[i - cols + 1] + 4);
        }
      }
    }
    for (let y = rows - 1; y >= 0; y--) {
      for (let x = cols - 1; x >= 0; x--) {
        const i = y * cols + x;
        if (d[i] === 0) continue;
        if (x < cols - 1) put(i, d[i + 1] + 3);
        if (y < rows - 1) {
          put(i, d[i + cols] + 3);
          if (x < cols - 1) put(i, d[i + cols + 1] + 4);
          if (x > 0) put(i, d[i + cols - 1] + 4);
        }
      }
    }
    clearPx = d;
    for (let i = 0; i < n; i++) clearPx[i] = (d[i] / 3) * cell;
  }

  // ── A GAP SHE CANNOT FIT THROUGH IS WORTH WHAT NO GAP IS WORTH ──────────
  // Both thresholds come off the body rather than being typed in, so they track
  // her size and the reach of the avoidance field she has to fly against:
  //
  //   at `fit`  (~her half-width)      she does not fit. Priced as type.
  //   at `ease` (fit + the avoid reach) nothing touches her. No surcharge.
  //
  // Squared in between, so a merely snug gap is only mildly discouraged and a
  // genuinely tight one is ruled out fast.
  function chargeForTheSqueeze(radius) {
    const fit = radius * cfg.tightFitFactor;
    const ease = fit + cfg.tightEasePx;
    const span = Math.max(1, ease - fit);
    travel = Float32Array.from(cost);
    for (let i = 0; i < cost.length; i++) {
      if (solid[i]) continue;
      const c = clearPx[i];
      if (c >= ease) continue;
      const t = Math.min(1, Math.max(0, (ease - c) / span));
      const v = 1 + (cfg.tightCost - 1) * t * t;
      if (v > travel[i]) travel[i] = v;
    }
  }

  function ensure(radius) {
    if (!cost || builtVersion !== world.collidersVersion || Math.abs(builtRadius - radius) > 2) {
      build(radius);
    }
  }

  const toCell = (p) => ({
    x: Math.min(cols - 1, Math.max(0, Math.floor((p.x - originX) / cell))),
    y: Math.min(rows - 1, Math.max(0, Math.floor((p.y - originY) / cell)))
  });
  const toWorld = (c) => ({ x: originX + (c.x + 0.5) * cell, y: originY + (c.y + 0.5) * cell });
  const inGrid = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  // A* and line of sight pay for the squeeze; everything about WHERE TO BE does
  // not — see the note at the top of the file.
  const costAt = (x, y) => (inGrid(x, y) ? travel[y * cols + x] : cfg.insideCost);
  /** cheap enough to fly a straight line through */
  const isFree = (x, y) => inGrid(x, y) && travel[y * cols + x] <= cfg.losMaxCost;
  /** open enough to want to be in */
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

  /** what a point charges to be IN — the interest sampler scores on this, so it
      is the placement cost, without the squeeze. See the note at the top. */
  function costPoint(p, radius) {
    ensure(radius);
    const c = toCell(p);
    return inGrid(c.x, c.y) ? cost[c.y * cols + c.x] : cfg.insideCost;
  }

  /** the nearest point she may actually BE, in world coords. Returns the point
      itself when it is already fine, so the common case allocates nothing new. */
  function nearestOpenPoint(p, radius) {
    ensure(radius);
    const c = toCell(p);
    if (isOpen(c.x, c.y)) return p;
    const f = nearestFree(c);
    return f ? toWorld(f) : p;
  }

  /** how much room a point has, in px — 0 inside type */
  function clearanceAt(p, radius) {
    ensure(radius);
    const c = toCell(p);
    return inGrid(c.x, c.y) ? clearPx[c.y * cols + c.x] : Infinity;
  }

  return {
    findPath, losPoints, isFreePoint, costPoint, clearanceAt, nearestOpenPoint,
    _debug: {
      build,
      get grid() { return { cols, rows, cost, travel, clearPx, solid, originX, originY, cell }; }
    }
  };
}
