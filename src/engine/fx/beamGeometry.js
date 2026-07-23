// beamGeometry.js
// pure math for the hyper beam: beam-frame transforms, rect intersection,
// jagged corridor polygons for the destruction masks, and edge sampling for
// cinders. no dom, no three -- fully headless-testable.

// liang-barsky: clip segment a->b to an axis-aligned rect.
// returns [t0, t1] parameters along the segment, or null if no overlap.
export function clipSegmentToRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  const edges = [
    [-dx, ax - rect.x],
    [dx, rect.x + rect.w - ax],
    [-dy, ay - rect.y],
    [dy, rect.y + rect.h - ay]
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [t0, t1];
}

// how far the beam travels before leaving the document (plus padding)
export function beamLength(origin, dir, docSize, pad = 150) {
  const far = 200000;
  const hit = clipSegmentToRect(
    origin.x, origin.y,
    origin.x + dir.x * far, origin.y + dir.y * far,
    { x: -pad, y: -pad, w: docSize.w + 2 * pad, h: docSize.h + 2 * pad }
  );
  return hit ? hit[1] * far + pad : pad;
}

// does the beam corridor (width 2*halfW, length len) touch the rect at all?
// conservative test in the beam frame.
export function corridorHitsRect(rect, origin, dir, halfW, len) {
  const px = -dir.y;
  const py = dir.x;
  let tMin = Infinity, tMax = -Infinity, sMin = Infinity, sMax = -Infinity;
  for (const [cx, cy] of [
    [rect.x, rect.y], [rect.x + rect.w, rect.y],
    [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]
  ]) {
    const rx = cx - origin.x;
    const ry = cy - origin.y;
    const t = rx * dir.x + ry * dir.y;
    const s = rx * px + ry * py;
    tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
    sMin = Math.min(sMin, s); sMax = Math.max(sMax, s);
  }
  return tMax > 0 && tMin < len && sMin < halfW && sMax > -halfW;
}

// the beam centerline clipped to the rect: chord length + entry/exit points.
// null when the centerline itself misses (corridor may still graze edges).
export function beamChord(rect, origin, dir, len) {
  const hit = clipSegmentToRect(
    origin.x, origin.y,
    origin.x + dir.x * len, origin.y + dir.y * len,
    rect
  );
  if (!hit) return null;
  const [t0, t1] = hit;
  return {
    t0: t0 * len,
    t1: t1 * len,
    length: (t1 - t0) * len
  };
}

// jagged corridor polygon in DOCUMENT coords: a strip along the beam with
// noisy edges, covering [tStart, tEnd] of the centerline. rng is a seeded
// unit-random function so damage is deterministic per fire.
export function corridorPolygon(origin, dir, halfW, tStart, tEnd, jag, rng, step = 16) {
  const px = -dir.y;
  const py = dir.x;
  const n = Math.max(2, Math.ceil((tEnd - tStart) / step));
  const sideA = [];
  const sideB = [];
  for (let i = 0; i <= n; i++) {
    const t = tStart + (tEnd - tStart) * (i / n);
    const cx = origin.x + dir.x * t;
    const cy = origin.y + dir.y * t;
    const ja = halfW + (rng() - 0.35) * jag;
    const jb = halfW + (rng() - 0.35) * jag;
    sideA.push([cx + px * ja, cy + py * ja]);
    sideB.push([cx - px * jb, cy - py * jb]);
  }
  return sideA.concat(sideB.reverse());
}

// points along the corridor's two edges inside the rect, for cinder spawns.
// each sample: position + outward normal (away from the beam center).
export function edgeSamples(rect, origin, dir, halfW, len, spacing = 18) {
  const chord = beamChord(rect, origin, dir, len);
  if (!chord) return [];
  const px = -dir.y;
  const py = dir.x;
  const out = [];
  const count = Math.max(1, Math.floor(chord.length / spacing));
  for (let i = 0; i <= count; i++) {
    const t = chord.t0 + (chord.length * i) / count;
    const cx = origin.x + dir.x * t;
    const cy = origin.y + dir.y * t;
    for (const side of [1, -1]) {
      const x = cx + px * halfW * side;
      const y = cy + py * halfW * side;
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        out.push({ x, y, nx: px * side, ny: py * side });
      }
    }
  }
  return out;
}

// removed-area estimate: chord length * corridor width over the rect area
export function removedFraction(rect, origin, dir, halfW, len) {
  const chord = beamChord(rect, origin, dir, len);
  if (!chord) return 0;
  const area = rect.w * rect.h;
  if (area <= 0) return 0;
  return Math.min(1, (chord.length * 2 * halfW) / area);
}
