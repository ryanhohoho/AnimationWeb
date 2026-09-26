// scale.js — the arithmetic of a resize, with no DOM
//
// Shared by the canvas (editor/client/canvas.js) and the test suite, which
// checks it headless. Everything here is in the page's own CSS pixels.
//
// A HANDLE asks for a factor per axis: the east edge moved `dx` on a box `w0`
// wide is (w0 + dx) / w0, the west edge is (w0 - dx) / w0. A PROPORTIONAL
// scale needs one factor, and it is the axis the handle actually moves -- a
// side handle's own axis, or, on a corner, whichever axis the pointer has
// pulled further from 1. That is what makes a corner drag follow the cursor
// rather than lag behind it on the axis you are not watching.
//
// The FIXED POINT of a resize is the edge or corner opposite the handle; on a
// side handle the other axis is pinned at its start (left or top), which is
// predictable and is what a column of text wants.

export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const MIN = 0.05;   // nothing is ever scaled to nothing, or turned inside out

/** the factor per axis a handle drag asks for */
export function factors(h, dx, dy, w0, h0) {
  const sx = h.includes("e") ? (w0 + dx) / w0 : h.includes("w") ? (w0 - dx) / w0 : 1;
  const sy = h.includes("s") ? (h0 + dy) / h0 : h.includes("n") ? (h0 - dy) / h0 : 1;
  return { sx: Math.max(MIN, sx), sy: Math.max(MIN, sy) };
}

/** one factor for a proportional scale */
export function uniform(h, sx, sy) {
  if (h === "e" || h === "w") return sx;
  if (h === "n" || h === "s") return sy;
  return Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
}

/** where the fixed point sits in a box, as fractions of its width and height */
export function anchorOf(h) {
  return [h.includes("w") ? 1 : 0, h.includes("n") ? 1 : 0];
}

/** a rect, scaled about the point (ax, ay) */
export function mapRect(r, ax, ay, sx, sy) {
  return { left: ax + (r.left - ax) * sx, top: ay + (r.top - ay) * sy, width: r.width * sx, height: r.height * sy };
}

/** the smallest rect holding all of them */
export function union(rects) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const x of rects) {
    l = Math.min(l, x.left); t = Math.min(t, x.top);
    r = Math.max(r, x.left + x.width); b = Math.max(b, x.top + x.height);
  }
  return { left: l, top: t, width: r - l, height: b - t, right: r, bottom: b };
}

/** does a rect meet the marquee at all */
export const meets = (a, m) => a.left < m.left + m.width && a.left + a.width > m.left &&
  a.top < m.top + m.height && a.top + a.height > m.top;

/**
 * The type a text block carries, scaled by s: its size, its box (so the lines
 * break in the same places), and its spacing where the spacing is in pixels
 * (in em or unitless it follows the size by itself). The leading is written
 * as a ratio of the size, which is exactly what it computes to now and keeps
 * computing to at any size -- a pixel leading left behind would crush the
 * lines together as the size grows.
 *
 * THE BOX GETS A HAIR OF ROOM. Type does not scale exactly linearly (glyph
 * advances are rounded at each size), and a block that was shrink-wrapped to
 * its words has no slack at all -- MEASURED: at x1.44 a one-line label needed
 * 49.09 px in a box scaled to exactly 49, and broke onto two lines. Half a
 * percent and a pixel covers it, and is far too little to pull a word up from
 * the next line.
 */
export function scaleText({ fs0, w0, ls0, lh0 }, s) {
  const out = { "font-size": `${round(fs0 * s)}px`, width: `${Math.ceil(w0 * s * 1.005) + 1}px`, "max-width": "none" };
  if (ls0 && /px$/.test(ls0)) out["letter-spacing"] = `${round(parseFloat(ls0) * s)}px`;
  if (lh0 && fs0) out["line-height"] = String(round(lh0 / fs0, 4));
  return out;
}

export const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
