// glowField.js — THE BACKLIGHT'S MATHS, AND NOTHING ELSE
//
// FIG. 2's backlight is a reconstruction of the light Apple Intelligence runs
// round the edge of an iPhone when Siri is listening, turned inside out: on the
// phone the light lives on the glass and falls inward, here it lives behind a
// window on the page and falls OUTWARD onto the paper.
//
// This file is the whole model, pure and headless. site/glow.js is the WebGL
// that draws it, and its fragment shader is a line-for-line twin of `shadeAt`
// below -- the two are checked against each other on the GPU, the way the
// sweat's sdDrop is (STATE.md says how). Anything that decides what a pixel
// looks like lives here first.
//
// ── WHAT THE REAL ONE DOES, AND WHERE EACH PART OF THIS CAME FROM ─────────
// Apple publishes no API and no source for it. What there is, is a set of
// careful public reconstructions, and they agree on four things:
//
//   1. IT DOES NOT SPIN. The obvious build -- an angular gradient on a rotating
//      clock -- is the one every write-up names as the version that looks
//      cheap. The canonical SwiftUI reconstruction re-randomises the POSITIONS
//      of six colour stops every half second and eases each change over a full
//      second, so the easings overlap and keep retargeting: bands of colour
//      grow, shrink and slide into each other, and nothing ever goes round. The
//      higher-fidelity builds do the same thing per pixel. Here it is six soft
//      blobs of colour on the perimeter, each wandering on its own clock and
//      swelling on another, mixed together wherever they overlap.
//
//   2. IT HAS DEPTH. Four stacked strokes of the same gradient: a crisp core,
//      two blooms, and a faint wash (6/9/11/15 pt wide, blurred 0/4/12/15 pt,
//      on a phone). The depth is what separates light from a coloured border.
//      Here they are four analytic bands with the same ratios, so there is no
//      blur to recompute: the falloff IS the formula.
//
//   3. IT HAS NO SEAM AND NO CORNERS. The two tells of a fake are a visible
//      join where the gradient wraps and a glow that cuts across the corner of
//      the shape it hugs. The position round the frame here is ARC LENGTH, and
//      every distance along it is taken the short way round, so the loop has
//      no start; the distance outward is a true signed distance to the rounded
//      rectangle the window actually is.
//
//   4. IT ARRIVES FROM SOMEWHERE. Pressing the side button sends the light in
//      from that side of the screen, rather than fading it up everywhere at
//      once. On this page the interface is uncovered from the RIGHT as the
//      terminal wipes away, so that is where the light starts, and it spreads
//      round the frame as the reader scrolls -- the scroll is the side button.
//
// The palette is the one those reconstructions sampled from Apple's own
// material. It is a DEFAULT: the six colours are CSS tokens (`--glow-1`..`-6`
// in styles/site.css) and the editor changes them.

export const GLOW_TOKENS = ["--glow-1", "--glow-2", "--glow-3", "--glow-4", "--glow-5", "--glow-6"];

/** Apple Intelligence's six, in the order the reconstructions list them. */
export const APPLE_GLOW = ["#BC82F3", "#F5B9EA", "#8D9FFF", "#FF6778", "#FFBA71", "#C686FF"];

/**
 * The same light, in colours that hold up on white paper.
 *
 * Apple's six were sampled off the phone, where the light is EMITTED and sits
 * over whatever the screen is showing -- often something dark, against which a
 * pale pink is bright. On this page the light falls on white, and a colour
 * cannot be brighter than the paper it lands on, so the palest of the six
 * tint the paper rather than light it. These are Apple's system colours at
 * full chroma, in the same order of hue: blue, indigo, purple, magenta, a
 * pink-red and orange. They are what the figure's first backlight was built
 * from, and the editor offers them as the other preset.
 */
export const VIVID_GLOW = ["#0A84FF", "#5E5CE6", "#BF5AF2", "#E845C4", "#FF375F", "#FF9F0A"];

// ── THE FOUR BANDS ─────────────────────────────────────────────────────────
// Each is a Gaussian falloff outward from the window's edge: `sigma` in CSS px
// at the reference width, `weight` its share of the light. The ratios follow
// the phone's stack -- a core about a third the width of the widest band, each
// band softer and fainter than the one inside it -- scaled up for a window on a
// page, where the light has room to fall rather than being cut off by a bezel.
export const BANDS = [
  { sigma: 2.4, weight: 0.95 },   // the core: the edge of the screen, lit
  { sigma: 7.5, weight: 0.55 },   // the first bloom
  { sigma: 19, weight: 0.3 },     // the second
  { sigma: 44, weight: 0.15 }     // the wash on the paper
];

/** The frame's width the bands above were set at, in CSS px (1440x900). */
export const REF_WIDTH = 938;

/**
 * How far past the window the canvas reaches, in CSS px, on every side.
 *
 * It has to be far enough that the wash is GONE before the canvas stops: a
 * glow that is still one level above zero at the canvas edge draws a faint
 * rectangle round the whole figure. There is a check that it is below one
 * 8-bit step there at the largest band scale.
 */
export const MARGIN = 150;

/** How much the light carries in total, before it saturates. */
export const GAIN = 1.6;

/**
 * The bands' scale for a window of this width.
 *
 * Proportional, so a phone's small figure gets a small glow rather than one
 * wider than its own margins -- but clamped at both ends: below about half
 * size the core would go under a pixel, and above the reference the wash would
 * start to run out of canvas.
 */
export function bandScale(frameWidth) {
  return clamp(frameWidth / REF_WIDTH, 0.55, 1.1);
}

// ── THE SIX BLOBS, IN TIME ─────────────────────────────────────────────────
// For each: two wander frequencies with their phases, and a swell frequency
// with its phase, in radians per second. Chosen incommensurate -- no two share
// a ratio a reader could see repeat -- and spread between periods of about two
// and six seconds, which is the tempo of the reconstruction's half-second
// retargets once their one-second easings have smeared them together.
const MOTION = [
  [1.13, 0.0, 2.71, 1.9, 1.57, 0.4],
  [1.61, 2.3, 2.23, 0.7, 1.19, 2.8],
  [1.37, 4.1, 3.07, 2.6, 1.83, 1.3],
  [1.89, 1.2, 2.47, 4.4, 1.41, 3.9],
  [1.21, 3.3, 2.93, 5.2, 1.73, 0.9],
  [1.73, 5.0, 2.39, 3.1, 1.29, 4.7]
];

/** How far each blob wanders from its place, in perimeters, on each clock. */
const WANDER = [0.085, 0.045];

/** The blobs' half-width in perimeters, and how much they swell about it. */
const WIDTH = 0.078;
const SWELL = 0.4;

/**
 * One full lap of slow drift, in seconds.
 *
 * The light does travel -- watch the phone and the warm end moves round -- but
 * slowly enough that it reads as the blobs' own wandering carrying them, not
 * as a wheel. At twenty-odd seconds a lap it is below the pace at which a
 * rotation is perceived AS rotation.
 */
const DRIFT_LAP = 26;

/**
 * Where the six blobs are, and how wide, at time `t` in seconds.
 *
 * Centres are in perimeters from the right-hand midpoint, clockwise, and may
 * be any real number: everything downstream takes them modulo one.
 */
export function blobsAt(t) {
  const centre = new Array(6);
  const width = new Array(6);
  const drift = t / DRIFT_LAP;
  for (let i = 0; i < 6; i++) {
    const [w1, p1, w2, p2, w3, p3] = MOTION[i];
    centre[i] = i / 6 + drift + WANDER[0] * Math.sin(w1 * t + p1) + WANDER[1] * Math.sin(w2 * t + p2);
    width[i] = WIDTH * (1 + SWELL * Math.sin(w3 * t + p3));
  }
  return { centre, width };
}

/**
 * The light breathing: a slow swell in how much there is, and in how far it
 * falls. The reconstructions that looked most like the phone all had it;
 * without it the glow reads as a lit border rather than as light.
 */
export function breathAt(t) {
  return {
    gain: 1 + 0.06 * Math.sin(0.9 * t) + 0.03 * Math.sin(2.3 * t + 1.1),
    reach: 1 + 0.045 * Math.sin(0.9 * t + 0.6)
  };
}

/**
 * The still the reader gets under prefers-reduced-motion: one moment of the
 * field, chosen because every colour is on show in it and none is crowded out.
 */
export const STILL_T = 3.7;

// ── THE ENTRY ──────────────────────────────────────────────────────────────
/** The soft edge of the light's leading front, in perimeters. */
export const FRONT = 0.12;

/**
 * How far round the frame the light has reached, each way from where it
 * starts, at progress `p` through the track.
 *
 * It must cover the WHOLE loop by the time the wipe ends at p = 1, and "the
 * whole loop" is half a perimeter each way PLUS the soft front, or the far
 * side stays dark through the part of the track where the interface is alone.
 */
export function reachAt(p) {
  return (0.5 + FRONT) * smoothstep(0.02, 1, p);
}

/** 1 where the light has arrived, 0 where it has not, soft between. */
export function litAt(u, reach) {
  return 1 - smoothstep(reach - FRONT, reach, circDist(u, 0));
}

/**
 * A brighter band at the leading edge of the light as it travels, the way the
 * phone's arrives as a wave rather than as a dimmer. Gone once the loop is
 * closed: a standing bright line on a finished frame would be a defect.
 *
 * It is a GAIN on the rim's light, not light of its own. The first version
 * added it straight to the total, which has no falloff outward at all -- so
 * at the front's position it shone at every distance from the window, and the
 * entry drew a faint ray from the edge of the frame to the edge of the canvas.
 * A check on the bands alone could not see that; the check now runs on whole
 * pixels at the canvas edge, at every point of the track.
 */
export function waveAt(u, reach) {
  const closing = 1 - smoothstep(0.5, 0.5 + FRONT, reach);
  const x = (circDist(u, 0) - (reach - FRONT * 0.5)) / 0.045;
  return 0.35 * closing * Math.exp(-x * x);
}

// ── GEOMETRY ───────────────────────────────────────────────────────────────
/**
 * Signed distance from a point to a rounded rectangle, in the same units.
 * Positive outside. `(qx, qy)` is relative to the rectangle's centre, `(bx,
 * by)` its half extents, `r` its corner radius.
 */
export function sdRoundRect(qx, qy, bx, by, r) {
  const dx = Math.abs(qx) - bx + r;
  const dy = Math.abs(qy) - by + r;
  const out = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return out + Math.min(Math.max(dx, dy), 0) - r;
}

/**
 * Where a point sits round a rounded rectangle, as a fraction of its
 * perimeter: 0 at the middle of the right-hand side, increasing clockwise on
 * screen (y down), 1 back at the start.
 *
 * ARC LENGTH, NOT ANGLE. An angular gradient -- what every quick build uses --
 * measures round the centre, so on a window 1.49 times wider than it is tall a
 * colour band on a long side comes out half again as long as the same band on a
 * short side, and every band visibly squeezes through the corners. Measured
 * along the edge, a band is the same length wherever it is.
 *
 * The nearest point on the boundary is found by clamping to the rectangle of
 * the corner CENTRES: a rounded rectangle is that rectangle grown by the
 * radius, so whatever side of it the point clamps against is the side it is
 * nearest. Each corner then reads its own angle in its own frame, which keeps
 * every angle in [0, pi/2] and keeps atan off the branch cut at pi.
 */
export function perimeterU(qx, qy, bx, by, r) {
  const hx = bx - r, hy = by - r;
  const cx = clamp(qx, -hx, hx), cy = clamp(qy, -hy, hy);
  const q = (Math.PI / 2) * r;
  const P = 4 * hx + 4 * hy + 2 * Math.PI * r;
  const R = cx === hx, L = cx === -hx, B = cy === hy, T = cy === -hy;
  const dx = qx - cx, dy = qy - cy;
  let s;
  if (R && !T && !B) s = cy >= 0 ? cy : P + cy;                          // right side
  else if (B && !L && !R) s = hy + q + (hx - cx);                         // bottom
  else if (L && !T && !B) s = hy + 2 * q + 2 * hx + (hy - cy);            // left side
  else if (T && !L && !R) s = 3 * hy + 3 * q + 2 * hx + (cx + hx);        // top
  else if (R && B) s = hy + r * Math.atan2(dy, dx);                       // bottom right
  else if (L && B) s = hy + q + 2 * hx + r * Math.atan2(-dx, dy);         // bottom left
  else if (L && T) s = 3 * hy + 2 * q + 2 * hx + r * Math.atan2(-dy, -dx); // top left
  else if (R && T) s = 3 * hy + 3 * q + 4 * hx + r * Math.atan2(dx, -dy);  // top right
  else s = 0; // strictly inside the corner-centre rectangle: behind the window
  return s / P;
}

/** Distance between two positions on a loop of length 1, the short way. */
export function circDist(a, b) {
  const d = (((a - b) % 1) + 1) % 1;
  return Math.min(d, 1 - d);
}

/** The light's strength at distance `d` outside the edge, before saturation. */
export function profile(d, scale, reach = 1) {
  const x = Math.max(d, 0);
  let sum = 0;
  for (const b of BANDS) {
    const s = b.sigma * scale * reach;
    sum += b.weight * Math.exp(-(x * x) / (s * s));
  }
  return sum;
}

// ── COLOUR ─────────────────────────────────────────────────────────────────
/**
 * Mixing happens in LINEAR light, not in sRGB.
 *
 * These are lights overlapping, and light adds in linear space. Averaged in
 * sRGB, the midpoint between a coral and a periwinkle comes out a muddy grey-
 * mauve darker than either -- a dark seam wherever two blobs meet, which on a
 * glow is exactly where the eye goes. 2.2 rather than the piecewise curve:
 * the shader uses the same exponent, and the difference is below a step.
 */
export const toLinear = (c) => Math.pow(c, 2.2);
export const toSrgb = (c) => Math.pow(Math.max(c, 0), 1 / 2.2);

/** "#RRGGBB" or "#RGB" to linear [r, g, b], or null if it is not a colour. */
export function hexToLinear(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
  return [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
}

/**
 * The colour at a position round the frame, and how strongly the field is
 * there. Where blobs crowd together the light is brighter; in a gap between
 * them it dims -- but never to nothing, which on the phone it never does.
 */
export function colourAt(u, blobs, colours) {
  let r = 0, g = 0, b = 0, k = 0;
  for (let i = 0; i < 6; i++) {
    const x = circDist(u, blobs.centre[i]) / blobs.width[i];
    const w = Math.exp(-x * x);
    r += w * colours[i][0]; g += w * colours[i][1]; b += w * colours[i][2];
    k += w;
  }
  const n = Math.max(k, 1e-4);
  return { rgb: [r / n, g / n, b / n], strength: 0.7 + 0.3 * smoothstep(0.25, 1.1, k) };
}

/**
 * THE PIXEL. Premultiplied [r, g, b, a] in 0..1 for a point `(px, py)` in CSS
 * px measured from the canvas's top-left corner.
 *
 * The fragment shader in glow.js is this function, transcribed. Change one and
 * the GPU check in STATE.md will say so.
 *
 * @param s  { w, h, r, scale, reach, blobs, breath, colours }: the frame's
 *           size and corner radius, the band scale, how far the light has
 *           travelled, and the moment's blobs, breath and linear colours.
 */
export function shadeAt(px, py, s) {
  const qx = px - MARGIN - s.w / 2;
  const qy = py - MARGIN - s.h / 2;
  const bx = s.w / 2, by = s.h / 2;
  const d = sdRoundRect(qx, qy, bx, by, s.r);
  // Just inside the edge still counts, so the light runs under the window's
  // anti-aliased border instead of leaving a pale hairline between the two.
  if (d < -1.5) return [0, 0, 0, 0];
  const u = perimeterU(qx, qy, bx, by, s.r);
  const c = colourAt(u, s.blobs, s.colours);
  const light = profile(d, s.scale, s.breath.reach) * c.strength
    * (1 + waveAt(u, s.reach)) * s.breath.gain;
  const a = (1 - Math.exp(-GAIN * light)) * litAt(u, s.reach);
  return [toSrgb(c.rgb[0]) * a, toSrgb(c.rgb[1]) * a, toSrgb(c.rgb[2]) * a, a];
}

// ── small things ───────────────────────────────────────────────────────────
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
