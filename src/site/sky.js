// sky.js — THE PLATE
//
// One picture. A sky, from last light at the top of the document to full night
// at the bottom, printed in TWO INKS on the same bone paper as everything else.
// It is rendered once, into an offscreen canvas, and then never touched again.
//
// WHY IT IS A PRINT AND NOT AN EFFECT
// -----------------------------------
// The three grounds before this one were live: a per-frame function you could
// watch running. That is why they read as vibe-coded -- a visible mathematical
// function has no craft in it, only arithmetic. A print has craft in it because
// the craft is in the SEPARATION and the SCREEN, and those are decisions.
//
// So this file does what a two-colour press does, in order:
//
//   1. FORM      build a continuous-tone sky: an atmosphere ramp, a warm bloom
//                where the sun just went down, and clouds with real lighting --
//                lit on the side that faces the light, dark inside their own
//                mass. This is the step v2's dithered sky skipped, which is
//                exactly why it "did not look like a sky."
//   2. SEPARATE  split that one grey image into two ink densities. Cerulean
//                carries the atmosphere. Orange carries the last warm light at
//                the top AND, at high density, the shadow at the bottom --
//                because overprinted, the two inks make night. Two inks is his
//                poster rule; night falling out of their overprint is the
//                reason the rule is worth keeping.
//   3. SCREEN    halftone each separation on its own rotated grid -- 45 deg for
//                cerulean, 15 deg for orange, one ruling for both, so they
//                form rosettes instead of moire. Dot AREA tracks density, which
//                is what a real screen does and what keeps tone readable at low
//                resolution. Dither destroys tone; a screen preserves it.
//   4. REGISTER  offset the orange plate by about a pixel. Nothing else in this
//                file says "a person made this" as loudly as a misregistration.
//
// COST
// ----
// The whole thing is a still image, so the steady-state cost of the ground is
// ZERO. Not "cheap" -- zero. It cannot stutter, cannot heat a phone, and cannot
// get worse on an old machine; the only thing an old machine changes is how
// long the print takes to come out.
//
// It comes out progressively, top to bottom, on a per-frame time budget. That
// is not a loading trick bolted on -- it is the cheapest correct way to spend
// ~300ms of pixel work without dropping a frame, and it happens to look like a
// print developing, which is the honest picture of what it is.

import { PALETTE } from "./palette.js";

// ── ink ────────────────────────────────────────────────────────────────────
// BOTH INKS ARE THE ANIMAL'S. Measured off her shipped sprites through the
// real light rig: she renders at OKLCh hue 241 when she comes up shiny and 345
// the rest of the time. Ink A is hue 243 and ink B is hue 345 — the sky is the
// blue she turns, and the last warm light is the pink she usually is.
//
// What was here before was a hue 267 ultramarine and a hue 41 orange: 24 and 56
// degrees off her. That is the worst possible distance — far enough to be
// different colours, close enough to read as HERS rendered wrong. Overprinted,
// these two land on a deep navy-plum, which is the night at the foot of the
// page and the same family as her own outline.
// bone, from site/palette.js -- the one place both presses read it. This is
// the reference press and it prints once per call, so it takes a snapshot.

const toBytes = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const PAPER = toBytes(PALETTE.paper);
// THE INK IS NOT THE COLOUR THAT COMES OUT, and that is the whole point of
// pre-compensating it. A halftone over bone drifts toward the paper as coverage
// drops: an ink at her exact hue printed at h 191-226 across the range the sky
// actually uses, i.e. a TEAL, because most of a sky is a light tint and a light
// tint is mostly paper. Matching the ink hex only ever matched the densest
// corner of the picture.
//
// So the inks are pushed the other way. Ink A is h 246 in the can and prints at
// h 229-240 — centred on her 234. Ink B is h 330 in the can, a frank magenta,
// and prints at h 334-345 — centred on her 343. Swatch them and they look
// wrong; print them and they are her.
//
// Measured on screen, not modelled: she is #99D9FD shiny and #F7A8D8 base.
const INK_A = toBytes(PALETTE.homeInkA); // prints as her shiny (palette.js)
const INK_B = toBytes(PALETTE.homeInkB); // prints as her base — the light

// THE IDENTITY SYSTEM.
// Cerulean is the constant: it is the site's ink and it is the air in every
// plate ever pulled here. The SECOND ink is what a piece of work is allowed to
// own. One process, one shared colour, one variable -- which is a system rather
// than a palette, and it is the only reason four differently-coloured frames can
// sit on a sheet whose whole discipline is "one or two inks".
const hexToInk = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];

// screen: one ruling, two angles 30 deg apart (the classic minimum for rosette)
const RULING = 5.2;               // px per halftone cell
const ANG_A = 45 * Math.PI / 180;
const ANG_B = 15 * Math.PI / 180;
const REG_X = 1.0, REG_Y = -0.7;  // the orange plate is off register, on purpose

// form: the field is sampled once per FIELD_PX and interpolated up. Six pixels
// is finer than the screen can resolve anyway, so nothing is lost by it and the
// expensive half of the render gets ~30x cheaper.
export const FIELD_PX = 6;

// the sun is off the top-right corner and already below the edge. Never
// centred -- every photograph he keeps is off-centre.
const SUN_U = 0.72, SUN_V = -0.06;

// ── noise ──────────────────────────────────────────────────────────────────

function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) * 2.3283064365386963e-10;
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, oct) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f);
    n += amp; amp *= 0.5; f *= 2.03;
  }
  return s / n;
}

// Domain-warped fbm. ONE level of warp, and a modest one: it is what makes a
// cloud edge BILLOW instead of fizz. Stacking warps -- which is the tempting
// thing, because the shader galleries all do it -- turns the field into
// marbling, and marbling is not weather. This number was pulled down from 2.6
// to 0.85 for exactly that reason.
function cloudField(x, y) {
  const q1 = fbm(x, y, 2);
  const q2 = fbm(x + 3.7, y + 1.9, 2);
  return fbm(x + 0.85 * q1, y + 0.85 * q2, 5);
}

// A much slower field that decides WHERE there is weather at all. Without it
// the sky is uniformly cloudy everywhere, which is the one thing a sky never
// is: most of a sky is air. This is the emptiness rule applied inside the
// picture rather than only to the sheet around it.
function bankField(x, y) {
  return fbm(x * 0.55 + 11.3, y * 0.55 + 7.1, 2);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function smooth01(x, a, b) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// ── the press ──────────────────────────────────────────────────────────────

/**
 * Build a printer for a w x h plate. Returns { canvas, step, done, progress }.
 * step(budgetMs) does as much work as fits in the budget and returns progress
 * in 0..1. Nothing is allocated per call.
 *
 * bandPx is the height of one plate of the sheet -- one viewport. The picture
 * is COMPOSED TO THE SHEET IT IS PRINTED ON: cloud coverage runs on a cycle of
 * exactly that height, so every plate has weather across its middle, where its
 * aperture is. Without it, whether a given hole lands on cloud or on empty air
 * is luck, and half of them came up empty -- an aperture full of flat tone
 * reads as a colour swatch rather than as a picture.
 */
export function createPress(w, h, bandPx = 0, opts = {}) {
  // the second ink, and which slice of the night this plate is cut from.
  // v0/v1 map this plate's own height onto a range of the full 19:00 -> 01:00
  // run, so a 380 px frame can be pulled at 22:40 without being 4400 px tall.
  const INK_2 = opts.inkB ? hexToInk(opts.inkB) : INK_B;
  const v0 = opts.v0 ?? 0;
  const v1 = opts.v1 ?? 1;
  // IDENTITY. On the sheet's own print the second ink is strictly the light and
  // the shadow, which is correct for a sky and useless for telling four
  // projects apart: it lands almost entirely where cerulean is already
  // solid, and two complementary inks overprinted make grey, not identity.
  // A project's frame therefore also puts its ink on the lit cloud tops, where
  // cerulean is sparse and the paper is still showing -- the one place a
  // second ink can be seen AS a colour rather than as a darkness.
  const idGain = opts.identity ?? 0;
  // Same night, same process, different weather. Four frames pulled from one
  // field with one seed would be one photograph recoloured four times, which is
  // not a system, it is a swatch book.
  const seedX = (opts.seed || 0) * 137.13;
  const seedY = (opts.seed || 0) * 71.77;
  // A PRESS SHOULD PRINT WHATEVER IT IS GIVEN. `tone(u,v) -> 0..1` replaces the
  // sky model with any other continuous-tone image, and the separation and the
  // screen carry on exactly as before -- so a project's diagrams come off the
  // same press as the sheet they sit on, and look it. That is the whole reason
  // the figures on a project page belong to this site rather than to a slide
  // deck: one process, different subjects.
  const tone = typeof opts.tone === "function" ? opts.tone : null;
  // WEATHER FROM SOMEWHERE ELSE.
  // `dens(u,v) -> 0..1` replaces the noise field, and ONLY the noise field.
  // Everything the sky does with that field — the coverage threshold, the
  // gradient lighting on the cloud tops, the night ramp, the sun, the
  // separation, the screen — carries on untouched. So a photographed sky comes
  // out as THIS sky with real weather in it, rather than as a video with a
  // halftone laid over the top. See site/skyclip.js.
  const dfn = typeof opts.dens === "function" ? opts.dens : null;
  // Line art dies at a 5.2 px ruling. A finer screen keeps a diagram legible
  // and still reads as print.
  const ruling = opts.ruling || RULING;
  // A ZERO-WIDTH PLATE IS REACHABLE -- a collapsed container, a transient
  // resize, a hidden tab measured mid-layout -- and it poisons everything
  // downstream: createImageData(0, n) throws, and the throw happens inside a
  // rAF callback where nothing catches it, so the press dies silently and the
  // sheet never opens. Same class of bug as the viewport clamp in main.js.
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));

  // ── A WINDOW ONTO A LARGER PLATE ─────────────────────────────────────────
  // An aperture is a rectangle OF the sheet's print, and the sheet's print is
  // document-sized. Printing that rectangle as its own little plate gives a
  // different picture entirely: the cloud scale, the sun, the night ramp and the
  // halftone lattice are all functions of position on the WHOLE plate, not of
  // position in the hole. `win` says "you are printing rectangle (x,y,w,h) of a
  // PW x PH plate", so a small press produces exactly the pixels the big one
  // would have produced there — which is what makes an animated aperture a
  // continuation of the still print rather than a second, differently-shaped
  // picture that appears in its place.
  //
  // The origin has to be a multiple of FIELD_PX. The field is sampled on a grid
  // of that pitch; an origin off the grid lands the samples between the master's
  // and the interpolation comes out subtly different. Callers snap it.
  const win = opts.win || null;
  const ox = win ? Math.round(win.x) : 0;
  const oy = win ? Math.round(win.y) : 0;
  const PW = win ? Math.max(1, Math.round(win.W)) : w;
  const PH = win ? Math.max(1, Math.round(win.H)) : h;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });

  // paper first, so a plate that has not developed yet is still the right
  // colour rather than black
  ctx.fillStyle = `rgb(${PAPER[0]},${PAPER[1]},${PAPER[2]})`;
  ctx.fillRect(0, 0, w, h);

  // field grid, one sample per FIELD_PX, with a one-cell apron so the gradient
  // pass can read neighbours without bounds checks
  // FOUR CELLS OF APRON, NOT THREE.
  // Phase 3's bilinear reaches one cell past the last pixel, and the gradient in
  // phase 2 wants a neighbour beyond THAT. With three, the last cell the screen
  // actually reads sat on the grid's edge and got a clamped, half-width
  // gradient — so a plate's far edge was lit differently from its middle, and a
  // window of a plate disagreed with the plate. One extra ring of cells costs
  // about 1% of the field pass and makes a window pixel-exact against the
  // master, which is the property the whole animation rests on.
  const gw = Math.ceil(w / FIELD_PX) + 4;
  const gh = Math.ceil(h / FIELD_PX) + 4;
  const dens = new Float32Array(gw * gh);   // cloud density
  const inkA = new Float32Array(gw * gh);   // cerulean density
  const inkB = new Float32Array(gw * gh);   // orange density

  // every one of these is a property of the PLATE, not of this window of it
  const aspect = PW / PH;
  // CLOUD SCALE, in pixels rather than in normalised coordinates.
  //
  // ANISO squeezes the field vertically so one cloud comes out about four times
  // wider than it is tall -- what perspective does to a deck of cloud seen from
  // underneath, and the difference between a dusk sky and ink dropped in water.
  // An isotropic field gives vertical streaks.
  //
  // The scale has to be anchored to PIXELS, not to u/v. Deriving the vertical
  // frequency from the aspect ratio works on a 1400 x 4400 desktop plate and
  // falls apart on a 390 x 4220 phone, where the aspect is 10:1 and the same
  // expression puts a cloud every 29 px -- the window fills with horizontal
  // stripes. Clamped feature width keeps a phone's aperture showing roughly the
  // same number of clouds as a laptop's.
  const ANISO = 3.9;
  const FEAT_W = Math.max(230, Math.min(420, PW * 0.30));
  const CX = PW / FEAT_W, CY = PH / (FEAT_W / ANISO);

  // ── phase 1: density ─────────────────────────────────────────────────────
  let p1y = 0;
  function phase1(deadline) {
    if (tone) { p1y = gh; return true; }   // no weather to compute
    while (p1y < gh) {
      const v = ((p1y - 1) * FIELD_PX + oy) / PH;
      const row = p1y * gw;   // density is sampled in the plate's own space
      for (let gx = 0; gx < gw; gx++) {
        const u = ((gx - 1) * FIELD_PX + ox) / PW;
        if (dfn) { dens[row + gx] = dfn(u, v); continue; }
        const cx = u * CX + seedX, cy = v * CY + seedY;
        // weather times where-there-is-weather
        dens[row + gx] = cloudField(cx, cy) * (0.82 + 0.36 * bankField(cx, cy));
      }
      p1y++;
      if ((p1y & 7) === 0 && performance.now() > deadline) return false;
    }
    return true;
  }

  // ── phase 2: light, tone, separation ─────────────────────────────────────
  // One pass over the grid. The cloud's lighting comes from the GRADIENT of the
  // density field, which is free here because the neighbours are already in the
  // array -- a slope rising toward the sun catches the light, a slope falling
  // away from it is in shadow. That is a real (if cheap) shading model, and it
  // is the difference between clouds with form and a grey stain.
  // THE WHOLE GRID, INCLUDING THE APRON RING.
  // This used to run 1..gh-2 and 1..gw-2, because the gradient wants a neighbour
  // on every side. But phase 3's bilinear reaches one cell PAST the last filled
  // column and row, so it was mixing in a zero there: the right and bottom edges
  // of every plate faded off toward paper. Invisible on a document-sized plate
  // whose edges are off screen anyway — very visible the moment a plate is a
  // 360 px window with a die-cut edge. So the ring is filled too, with the
  // gradient clamped at the border. A one-sided difference in the apron, which
  // is off-plate, is not worth a branch in the inner loop it would otherwise buy.
  let p2y = 0;
  function phase2(deadline) {
    while (p2y < gh) {
      const vLocal = ((p2y - 1) * FIELD_PX + oy) / PH;
      const v = v0 + vLocal * (v1 - v0);       // position in the whole night
      const row = p2y * gw;

      // TIME, and it is the same axis as the scroll: the top of the plate is
      // 19:00 and the bottom is 01:00, so the page darkens as you descend. You
      // are going down toward a light that is going out. Every colour decision
      // below hangs off this one number.
      const t = smooth01(v, 0.02, 1.02);
      const day = 1 - t;
      // The clear-sky ramp. Shaped rather than linear so the top eighth stays
      // near paper -- plate 00's aperture lives there and has type beside it,
      // and a picture that starts at full tone would shout over the type.
      // The floor is 0.13 rather than 0.06, and that is not timidity: below
      // about 0.1 the ink curve saturates and cloud and sky both print at ~95%
      // cerulean, so the bottom of the sheet loses all its structure and
      // goes to a slab. 0.13 keeps the horizon readable as weather.
      const L0 = 0.93 - 0.80 * Math.pow(t, 0.85);
      // one cloud band per plate, crossing at 42% down -- where the apertures
      // are (see the note on bandPx)
      const band = bandPx > 0
        ? 0.055 * Math.cos(((vLocal * PH) / bandPx - 0.42) * 6.2831853)
        : 0;

      if (tone) {
        // A FIGURE. Cerulean still carries the darkness; the second ink
        // carries the shadows and a light tint of the project's own colour, so
        // a diagram is a duotone of itself rather than a grey photocopy.
        for (let gx = 0; gx < gw; gx++) {
          const i = row + gx;
          const u = ((gx - 1) * FIELD_PX + ox) / PW;
          const L = clamp01(tone(u, vLocal));
          inkA[i] = clamp01(Math.pow(1 - L, 1.06)) * 0.985;
          inkB[i] = clamp01(smooth01(1 - L, 0.42, 1.0) * 0.92 + idGain * 0.20 * L * L);
        }
        p2y++;
        if ((p2y & 15) === 0 && performance.now() > deadline) return false;
        continue;
      }

      // neighbour rows for the gradient, clamped at the top and bottom of the grid
      const rowUp = (p2y > 0 ? p2y - 1 : 0) * gw;
      const rowDn = (p2y < gh - 1 ? p2y + 1 : gh - 1) * gw;

      for (let gx = 0; gx < gw; gx++) {
        const i = row + gx;
        const u = ((gx - 1) * FIELD_PX + ox) / PW;

        // the sun, just gone, off the top-right corner. Never centred.
        const dx = (u - SUN_U) * aspect, dy = v - SUN_V;
        const sun = Math.exp(-Math.sqrt(dx * dx + dy * dy) * 2.2);

        let L = L0 + 0.06 * sun * day;
        let a = 0, lit = 0;

        // Clouds thin toward the bottom -- by 01:00 there is very little left
        // with anything to catch.
        const cov = 0.478 + 0.075 * v - band;
        const d = dens[i];
        if (d > cov) {
          a = smooth01(d, cov, cov + 0.115);
          let sx = SUN_U - u, sy = SUN_V - v;
          const sl = Math.hypot(sx, sy) || 1; sx /= sl; sy /= sl;
          const gxD = dens[row + (gx < gw - 1 ? gx + 1 : gx)]
                    - dens[row + (gx > 0 ? gx - 1 : gx)];
          const gyD = dens[rowDn + gx] - dens[rowUp + gx];
          // A cloud's surface normal points AWAY from its own dense interior,
          // so it is -grad that faces outward and the dot product has to be
          // negated. With the sign the other way round the deck is lit from
          // underneath, which is the single most obviously wrong thing a sky
          // can do. Polarised rather than linear, because a print has lit tops
          // and dark undersides and not a smooth ramp between them.
          lit = smooth01(0.5 - (gxD * sx + gyD * sy) * 13, 0.16, 0.86);
          // A cloud is lit RELATIVE to the sky behind it, never absolutely.
          // Tie it to L0 and it can no longer go black at dusk or glow at 1 AM
          // -- which is the whole reason the first pass looked like oil on
          // water instead of weather.
          const cl = L0 * (0.38 + 1.02 * lit);
          L = L * (1 - a) + cl * a;
        }
        L = clamp01(L);

        // ── SEPARATION ───────────────────────────────────────────────────
        // Cerulean is simply the absence of light: it is the air.
        inkA[i] = clamp01(Math.pow(1 - L, 1.08)) * 0.985;
        // Orange does two jobs, which is what a second plate is for.
        //   near the top   the last warm light -- the bloom itself, and the
        //                  edges of clouds that are still catching it. Laid
        //                  sparsely on bone it reads as glow, not as colour.
        //   near the bottom the shadow. Where both plates run solid their
        //                  overprint lands on a deep plum-black, and that is
        //                  the night at the foot of the page.
        const glow = 0.13 * Math.pow(sun, 1.9) * day * L
                   + 0.30 * a * lit * Math.pow(day, 1.4) * Math.sqrt(sun);
        const shadow = smooth01(1 - L, 0.62, 1.0) * 0.52;   // see pressgl.js
        const identity = idGain * (0.40 * a * lit + 0.10 * L * L);
        inkB[i] = clamp01(glow + shadow + identity);
      }
      p2y++;
      if ((p2y & 15) === 0 && performance.now() > deadline) return false;
    }
    return true;
  }

  // A window's origin must sit on the field grid, or its samples land between
  // the master's and the two renders disagree. Callers snap it; say so loudly if
  // one does not, because the symptom is a subtle mismatch nobody would trace.
  if (win && ((ox % FIELD_PX) !== 0 || (oy % FIELD_PX) !== 0)) {
    console.warn(`sky: window origin ${ox},${oy} is off the ${FIELD_PX}px field grid`);
  }

  // ── phase 3: screen ──────────────────────────────────────────────────────
  const cosA = Math.cos(ANG_A), sinA = Math.sin(ANG_A);
  const cosB = Math.cos(ANG_B), sinB = Math.sin(ANG_B);
  const invR = 1 / ruling;
  // DOT RADIUS, and it is the one number in this file that has a right answer.
  // A dot covering fraction d of a square cell has radius sqrt(d/pi) = 0.5642
  // sqrt(d) -- true until d = 0.785, where neighbouring dots touch. Past that
  // they overlap, and the radius has to run on to the cell's half-diagonal
  // (0.7071) for the last of the paper to close up. The cubic ramps between the
  // two and is exact at both ends.
  //
  // Using 0.7071 across the whole range -- which is the obvious thing to write,
  // and what this file did first -- lays down (0.7071/0.5642)^2 = 1.57x the ink
  // the separation asked for. Every tone came out over-inked and the warm
  // highlights printed as slabs of solid orange.
  const rad = (d) => Math.sqrt(d) * (0.5642 + 0.1429 * d * d * d);
  const BAND = 96;
  let p3y = 0;
  let band = null;

  function phase3(deadline) {
    while (p3y < h) {
      const y1 = Math.min(h, p3y + BAND);
      const bh = y1 - p3y;
      if (bh < 1) { p3y = h; break; }
      if (!band || band.height !== bh) band = ctx.createImageData(w, bh);
      const px = band.data;
      let o = 0;

      for (let y = p3y; y < y1; y++) {
        // hoist everything that only depends on the row
        const fy = (y + 1.5 * FIELD_PX) / FIELD_PX;   // +1 apron, +0.5 sample centre
        const gy0 = fy | 0, ty = fy - gy0;
        const r0 = gy0 * gw, r1 = r0 + gw;
        // rotation, hoisted: u = x cos + y sin, v = -x sin + y cos. Both axes
        // must be present in both terms or the two coordinates end up
        // correlated and the screen collapses from dots into stripes.
        //
        // THE LATTICE IS IN DOCUMENT SPACE. A window of the plate has to sit on
        // the same grid of dots as the plate — otherwise every animated aperture
        // would carry its own screen, starting at its own top-left corner, and
        // the sheet would stop being one printed thing.
        const yAbs = y + oy;
        const ya = yAbs * sinA, yb = yAbs * cosA;
        const yc = (yAbs + REG_Y) * sinB, yd = (yAbs + REG_Y) * cosB;

        for (let x = 0; x < w; x++, o += 4) {
          const xAbs = x + ox;
          const fx = (x + 1.5 * FIELD_PX) / FIELD_PX;
          const gx0 = fx | 0, tx = fx - gx0;
          const i00 = r0 + gx0, i10 = r1 + gx0;

          // bilinear both separations off the field grid
          const a0 = inkA[i00] + (inkA[i00 + 1] - inkA[i00]) * tx;
          const a1 = inkA[i10] + (inkA[i10 + 1] - inkA[i10]) * tx;
          const dA = a0 + (a1 - a0) * ty;
          const b0 = inkB[i00] + (inkB[i00 + 1] - inkB[i00]) * tx;
          const b1 = inkB[i10] + (inkB[i10 + 1] - inkB[i10]) * tx;
          const dB = b0 + (b1 - b0) * ty;

          // paper is the default and most of the plate is close to it, so the
          // early-out here is doing real work rather than guarding a rarity
          if (dA < 0.004 && dB < 0.004) {
            px[o] = PAPER[0]; px[o + 1] = PAPER[1]; px[o + 2] = PAPER[2]; px[o + 3] = 255;
            continue;
          }

          let cA = 0;
          if (dA > 0.001) {
            const u = (xAbs * cosA + ya) * invR, v = (-xAbs * sinA + yb) * invR;
            const eu = u - Math.floor(u) - 0.5, ev = v - Math.floor(v) - 0.5;
            const R = rad(dA);
            // one-pixel soft edge: dot gain, and it stops the screen aliasing
            cA = clamp01((R - Math.sqrt(eu * eu + ev * ev)) * ruling + 0.5);
          }
          let cB = 0;
          if (dB > 0.001) {
            const xb = xAbs + REG_X;
            const u = (xb * cosB + yc) * invR, v = (-xb * sinB + yd) * invR;
            const eu = u - Math.floor(u) - 0.5, ev = v - Math.floor(v) - 0.5;
            const R = rad(dB);
            cB = clamp01((R - Math.sqrt(eu * eu + ev * ev)) * ruling + 0.5);
          }

          // ink on paper is subtractive: each plate multiplies what is under it
          const mA0 = 1 - cA + cA * (INK_A[0] / 255);
          const mA1 = 1 - cA + cA * (INK_A[1] / 255);
          const mA2 = 1 - cA + cA * (INK_A[2] / 255);
          const mB0 = 1 - cB + cB * (INK_2[0] / 255);
          const mB1 = 1 - cB + cB * (INK_2[1] / 255);
          const mB2 = 1 - cB + cB * (INK_2[2] / 255);
          px[o] = PAPER[0] * mA0 * mB0;
          px[o + 1] = PAPER[1] * mA1 * mB1;
          px[o + 2] = PAPER[2] * mA2 * mB2;
          px[o + 3] = 255;
        }
      }
      ctx.putImageData(band, 0, p3y);
      p3y = y1;
      if (performance.now() > deadline) return false;
    }
    return true;
  }

  let phase = 1;
  function step(budgetMs = 6) {
    if (phase > 3) return 1;
    const deadline = performance.now() + budgetMs;
    if (phase === 1 && phase1(deadline)) phase = 2;
    if (phase === 2 && performance.now() < deadline && phase2(deadline)) phase = 3;
    if (phase === 3 && performance.now() < deadline && phase3(deadline)) phase = 4;
    return progress();
  }

  function progress() {
    if (phase > 3) return 1;
    // weights are the measured share of total work, so the develop reads as
    // linear instead of stalling at 40%
    if (phase === 1) return 0.42 * (p1y / gh);
    if (phase === 2) return 0.42 + 0.13 * (p2y / gh);
    return 0.55 + 0.45 * (p3y / h);
  }

  return {
    canvas,
    step,
    progress,
    get done() { return phase > 3; },
    /** how far down the plate the screen has printed, in px. Apertures above
        this line hold finished ink and can be cut. */
    get scanY() { return phase > 3 ? h : phase < 3 ? 0 : p3y; },
    /** Mean coverage of each plate, 0..1. The colophon prints these, so the
        numbers on the page are measured off the render rather than asserted. */
    coverage() {
      let a = 0, b = 0, n = 0;
      for (let i = 0; i < inkA.length; i += 5) { a += inkA[i]; b += inkB[i]; n++; }
      return { a: a / n, b: b / n };
    }
  };
}
