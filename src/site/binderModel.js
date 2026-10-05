// binderModel.js — THE BINDER AS NUMBERS: WHAT LIES WHERE, AND HOW A PAGE BENDS
//
// Pure, no three.js, so it is checked in node (test/sim.test.js). binder.js
// draws exactly what this says.
//
// THE BINDER, from the photographs: each one is ONE SIDE of a nine-pocket
// sheet, in file order, so sheet s carries photograph 2s on its front and
// 2s+1 on its back. A sheet with no photograph on a side shows empty pockets.
//
// ITS STATE IS ONE INTEGER, `pos`:
//   0          closed: the cover lies over the pages
//   1          the cover is open; sheet 0 lies on the right, face up
//   k (>= 1)   k-1 sheets have been turned to the left
//   S + 1      every sheet is on the left: the last page's back, and the
//              inside of the back cover
// Turning forward is pos + 1, back is pos - 1, and the ends are ends.

/** how many sheets a set of n photographs fills (at least one, so a binder
    with nothing in it yet still has a page of empty pockets) */
export const sheetsFor = (n) => Math.max(1, Math.ceil(n / 2));
/** the last position: every sheet turned */
export const lastPos = (S) => S + 1;
export const clampPos = (p, S) => Math.max(0, Math.min(lastPos(S), Math.round(p)));

/** where everything should lie at `pos`: the cover's angle and each sheet's,
    0 lying to the right and PI lying to the left (both turn about the spine) */
export function targets(pos, S) {
  const p = clampPos(pos, S);
  return {
    cover: p > 0 ? Math.PI : 0,
    sheets: Array.from({ length: S }, (_, s) => (s < p - 1 ? Math.PI : 0))
  };
}

/** which photograph is on each side of sheet s: an index into the sides
    (pagesFor), or -1 for none. `sides` is that list, or its length. */
export function sidesOf(s, sides) {
  const n = typeof sides === "number" ? sides : sides.length;
  const has = (k) => k < n && (typeof sides === "number" || sides[k] != null);
  return { front: has(2 * s) ? 2 * s : -1, back: has(2 * s + 1) ? 2 * s + 1 : -1 };
}

/** the sheets whose pictures could be seen at `pos`, give or take a turn: the
    only ones worth a texture. Two either side of the open spread. */
export function sheetsNear(pos, S) {
  const t = Math.max(0, clampPos(pos, S) - 1);
  const out = [];
  for (let s = t - 2; s <= t + 1; s++) if (s >= 0 && s < S) out.push(s);
  return out;
}

/**
 * Where a sheet lies in the stack, as a height above the boards. Unturned
 * sheets stack on the right with the NEXT one to read on top (the lowest
 * index); turned sheets stack on the left with the LAST one turned on top.
 * While it turns, a sheet's height runs from the one to the other.
 */
export function stackZ(s, angle, S, base, dz) {
  const right = base + (S - s) * dz;
  const left = base + (s + 1) * dz;
  const f = Math.max(0, Math.min(1, angle / Math.PI));
  return right + (left - right) * f;
}

/**
 * A sheet's curve, seen edge on: `n + 1` points from the ring to the free edge,
 * as [x, z] pairs, for a sheet of length W turned to `angle` with the free edge
 * lagging by `lag` radians (positive while turning to the left, negative back).
 * The lag grows along the sheet (a stiff sleeve leans, it does not curl at the
 * ring) and the curve is integrated, so the sheet keeps its length exactly
 * however it bends. No point may go under the board it lies on.
 */
export function sheetCurve(angle, lag, W, n = 12) {
  const pts = [[0, 0]];
  let x = 0, z = 0;
  const ds = W / n;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const phi = Math.max(0, Math.min(Math.PI, angle - lag * Math.pow(f, 1.3)));
    x += Math.cos(phi) * ds;
    z += Math.sin(phi) * ds;
    pts.push([x, z]);
  }
  return pts;
}

/**
 * THE RINGS RIDE ON THE SPINE (owner's note, 2026-10-04: "the cards should be
 * centred at the middle of the spine"). They were first bolted to the back
 * board a little right of its hinge, so open, both pages sat right of the
 * spine and the left one lay across it. Now they stand on the spine's middle,
 * the way an O-ring binder's do: closed, the spine stands up and they point
 * into the binder; open, it lies flat between the boards and they stand up
 * from its middle, so the spread is a mirror image about it.
 *
 * `spineAngle` is the spine's turn as the cover opens (c, 0 closed .. 1 open):
 * it stands while the cover lifts and lies down as it comes over. `ringX` is
 * where the rings' middle is along the binder at that angle, D the spine's
 * width, with x = 0 the back board's hinge.
 */
export const spineAngle = (c) => Math.PI / 2 + (Math.PI / 2) * Math.max(0, Math.min(1, (c - 0.35) / 0.65));
export const ringX = (sig, D) => (D / 2) * Math.cos(sig);

/**
 * A sleeve hung on the rings: its curve (sheetCurve) from a point `gap` out
 * from the rings' middle along its own first direction -- the strip with the
 * holes in it, which the rings pass through -- so it turns ABOUT the rings and
 * lies at the same distance from them on either side. [x, z] pairs, x along
 * the binder, from `hx` (ringX).
 */
export function sleeveAt(angle, lag, W, n, hx, gap) {
  const a = Math.max(0, Math.min(Math.PI, angle));
  const ox = hx + gap * Math.cos(a), oz = gap * Math.sin(a);
  return sheetCurve(angle, lag, W, n).map(([x, z]) => [ox + x, oz + z]);
}

/** how far the free edge lags at a point of a turn: nothing at either end,
    most in the middle -- the sleeve is pulled, then catches up */
export const lagAt = (progress, bend, dir) => bend * Math.sin(Math.PI * Math.max(0, Math.min(1, progress))) * Math.sign(dir || 0);

/** an ease for a turn: slow off the rest, slow onto the other side */
export const easeTurn = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** the closed binder's depth: enough for its sheets and its rings */
export const spineDepth = (S, dz, min) => Math.max(min, S * dz + 0.05);

/**
 * THE PHOTOGRAPHS AS SIDES OF SHEETS: [front of sheet 0, back of sheet 0,
 * front of sheet 1, ...], with null for a side that has no photograph.
 *
 * By default the folder's order IS the pairing (owner's choice, 2026-10-04):
 * photograph 1 is a front, 2 its back, 3 the next front. A name may also say
 * which side it is -- `img-0412-front`, `img-0412-back`, `07_back` -- and then
 * that one is put on that side of its own sheet whatever its neighbours are
 * (a front alone leaves its back as pockets; a back alone, its front). Names
 * are compared as people read them, so 2 comes before 10.
 */
const SIDE = /^(.*?)[-_ ](front|back)$/i;
export function pagesFor(list) {
  const items = (list || []).map((p) => {
    const m = SIDE.exec(p.id);
    return { p, base: m ? m[1] : p.id, side: m ? (m[2].toLowerCase() === "front" ? 0 : 1) : -1 };
  }).sort((a, b) => a.base.localeCompare(b.base, undefined, { numeric: true }) || a.side - b.side);
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.side < 0) { out.push(it.p); continue; }
    // a named side starts a sheet of its own (its front first)
    if (out.length % 2) out.push(null);
    if (it.side === 0) {
      out.push(it.p);
      const nx = items[i + 1];
      if (nx && nx.side === 1 && nx.base === it.base) { out.push(nx.p); i++; } else out.push(null);
    } else out.push(null, it.p);
  }
  if (out.length % 2) out.push(null);
  return out;
}
