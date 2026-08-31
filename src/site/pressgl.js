// pressgl.js — THE WHOLE SHEET, ON THE GPU
//
// One canvas, fixed to the viewport, sitting behind everything. It paints the
// paper AND the print AND every hole cut in the paper, in one pass:
//
//     outside every hole   ->  paper
//     inside a hole        ->  the two-ink riso print, at that DOCUMENT position
//
// WHY THIS SHAPE, AND NOT THE ONE BEFORE IT
// -----------------------------------------
// The previous build gave each hole its own canvas and its own WebGL context,
// and cut the still print out of a document-tall offscreen plate. That worked
// and it was a pile of machinery: a 300 ms CPU press, N contexts, a separate
// canvas for Mew's halo that could only ever show a STILL print because it
// followed her to arbitrary positions, and a reprint every time the second ink
// changed.
//
// Painting the paper in the shader collapses all of it. The paper is not a DOM
// layer with holes masked out of it — masks with many rectangles are a
// compositing problem and behave differently in every browser. It is simply
// what this shader outputs where the fragment is not inside a hole. So:
//
//   · one context instead of N, and no offscreen plate at all
//   · Mew's halo is just another hole, at her viewport position, and therefore
//     carries MOVING weather like every other hole — which the old build
//     could not do at any price
//   · changing the second ink is a uniform, not a 300 ms reprint, so moving
//     between project sheets is instant
//   · type still never sits on tone: outside a hole the output is flat paper,
//     exactly as before
//
// WHAT IT COSTS
// -------------
// One draw call and one full-viewport pass of a cheap fragment program. It runs
// only when something has actually changed — a scroll, a tick of the cloud
// loop, Mew moving, an ink change — and not at all when the page is idle or
// hidden. The trade against the old build is honest and worth naming: scrolling
// used to cost EXACTLY zero, because every hole was a static bitmap already
// sitting at its document position. Now a scroll costs one pass.

const HOLES_MAX = 12;

// How far down one continuous plate 01:00 is. Every sheet on the site is a cut
// from the SAME plate rather than its own 19:00-to-01:00 run, which is what
// makes the sky continuous when a crossing keeps the reader's scroll offset.
// The home sheet is about 3,600 tall, so it reaches roughly 22:30 at its foot;
// the project sheets are taller and reach night partway down.
const REF_H = 4000;

const VERT_300 = `#version 300 es
void main() {
  // one oversized triangle, no buffers: three vertices addressed by index
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const VERT_100 = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// The body of the press, shared by both GLSL versions. Only the texture call
// and the output variable differ, so those are injected.
const BODY = `
uniform sampler2D uDens;
uniform vec2  uTex;        // the density sheet's size in texels
uniform float uFrames;
uniform float uF;

uniform vec2  uRes;        // the viewport
uniform float uScroll;     // how far down the document it is
uniform vec2  uPlate;      // the whole document
// ONE PLATE, AND EVERY SHEET IS A CUT FROM IT.
// The night used to run 19:00 to 01:00 over whatever height THIS document
// happened to be, so the same document position was a different time of night
// on a different page — and with the scroll offset now kept across a crossing,
// that was the last thing still stepping at the swap. The ramp is measured
// against a fixed reference instead: absolute position down one continuous
// plate. A short sheet is simply a shorter cut of it, and a long one spends
// longer at the dark end.
uniform float uRefH;
// HOW FAR THE PLATE HAS BEEN WOUND ON, in document px — and it is TWO numbers,
// because the two things it moves have opposite needs.
//
//   uSky      the WEATHER. Held for good, never wound back. The cloud field is
//             periodic (foldV repeats and mirrors every viewport), so winding it
//             on forever costs nothing and never drifts out of range — and any
//             attempt to return it to zero is a visible pan of the whole sky,
//             which is what the rubber-band glide was.
//
//   uSkyRamp  the TIME OF NIGHT. This one cannot be held: it is absolute, so
//             every navigation would start further into the night than the last
//             and a few clicks in the site would be permanently at 01:00. It
//             eases back to zero across the retreat instead — a change of
//             brightness with no motion in it, which is nearly invisible where a
//             pan is not.
uniform float uSky;
uniform float uSkyRamp;
uniform float uBand;       // one screen — the clip repeats on this pitch
uniform vec3  uInkA;
uniform vec3  uInkB;
// ONE HOLE MAY BE PULLED IN A DIFFERENT PAIR. The gate on the home sheet is a
// window onto a PROJECT, so it prints in that project's inks while the sheet
// around it stays in the sheet's own — which is the whole identity system said
// in one rectangle. Only one alternate pair is ever needed, because the gate
// only ever shows one project at a time.
uniform vec3  uInkA2;
uniform vec3  uInkB2;
uniform int   uAltHole;    // index of the hole using the alternate pair, or -1
uniform float uIdentity;
uniform float uRuling;

uniform vec4  uHoles[${HOLES_MAX}];   // x, y, w, h — in DOCUMENT pixels
uniform int   uHoleCount;
uniform vec3  uHalo;        // x, y, radius — VIEWPORT px. r = 0 is off.
// THE CROSSING, as a place rather than a level: xy = where the opening is
// centred (VIEWPORT px), z = its radius, w = how ragged the edge is. z <= 0 is
// off. The paper is EATEN OUTWARD from the hole you clicked, and on the far
// side it closes back in from the edges onto the new sheet's own hole.
uniform vec4  uCross;
// A SECOND OPENING, for the retreat. The new sheet arrives fully covered and
// the paper closes back into TWO places at once — the plate's own window, and
// the band at the foot of it — so every part of the screen has somewhere to
// go. With one target the paper had to sweep across the whole window to reach
// it, which looks like a wipe rather than like paper closing.
uniform vec4  uCross2;
// ── GOING BACK IS THE SAME OPENING, RUN THE OTHER WAY ROUND ──────────────
// There is no second mechanism for the return. It eats INWARD from the edges
// of the window rather than outward from a hole, and that is this same
// boundary with the paper on the other side of it: an island of page shrinking
// while the print closes in from every edge.
//
// 0 = eat inside uCross, which is a hole opening out of the sheet.
// 1 = eat outside it.
uniform float uEatOut;
// AND THE EATING HAS ITS OWN PAIR. It used to borrow the gate's, which is fine
// going IN — a project sheet has no gate to argue with — and wrong coming back,
// because the home sheet does: the moment the page committed, the gate claimed
// those two uniforms for its own preview and the opening changed colour
// underneath itself. Two more uniforms is the whole fix.
uniform vec3  uEatA;
uniform vec3  uEatB;
// AND ITS OWN IDENTITY, which is the other half of matching a sheet and the
// part that was making the return look wrong. Identity is how much second ink
// goes onto the lit cloud tops — it is what makes a pair read as a COLOUR
// rather than as a darkness — and the home sheet runs at ZERO while every
// project sheet runs at one. The eating had 1.0 hard-coded, so coming home it
// laid rose the home sheet does not lay, and arrived visibly more saturated
// than the page it was resolving into. It is a property of the destination, so
// it travels with the pair.
uniform float uEatIdn;
uniform float uOverlay;    // 1 = draw ONLY the eating, with alpha, for the
                           //     layer that sits above the type

// bone. Must match --paper in styles/site.css and PAPER in site/sky.js — the
// shader paints the stock, so a mismatch is a visible seam between the page
// and its own background.
const vec3  PAPER = vec3(0.93725, 0.92941, 0.90196);   // #EFEDE6
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
const float ANG_A = 0.78539816;   // 45 deg
const float ANG_B = 0.26179939;   // 15 deg
const vec2  REG   = vec2(1.0, -0.7);
const float FIELD_PX = 6.0;
const float SUN_U = 0.72, SUN_V = -0.06;
const float TAU = 6.2831853;

// ONE PASS OF THE CLIP PER SCREEN, MIRRORED.
// Stretching one 16:9 frame over a document-tall plate means a hole sees only a
// thin horizontal strip of the source, and in a flythrough that strip swings
// from solid overcast to clear air in a second — measured, on the title plate:
// 97% cloud at one moment of the loop, 0% four frames later. Repeating per
// screen gives every hole a whole frame of sky. Alternate passes are MIRRORED,
// so the repeat has no seam: clouds have no up or down at this scale, and a
// fold is invisible where a butt join would be an edge across the sheet.
float foldV(float y) {
  float t = mod(y / max(uBand, 1.0), 2.0);
  return 1.0 - abs(1.0 - t);
}
// WHICH WAY UP THIS PASS IS. On a mirrored pass the field runs backwards, so a
// vertical gradient measured in it points the opposite way — and the shading
// reads that gradient to decide which side of a cloud the sun is on. Left
// uncorrected the lit and shadowed faces swap over at every fold and print a
// dead straight line the full width of the sheet. Behind a small die-cut that
// almost never lands where you can see it; across the whole window it is the
// first thing you see.
float foldS(float y) { return mod(y / max(uBand, 1.0), 2.0) < 1.0 ? 1.0 : -1.0; }

// BOTH COMPONENTS CLAMP. x always did; y did not, and the frames are stacked
// one above the other in the sheet, so a lookup a hair past the top of frame f
// silently returned frame f-1. Nothing reads past an edge except the gradient
// the shading is built on — which is exactly at the edges — so what it produced
// was a hard dark line along the top and bottom of every band.
// AND THE INTERPOLATION IS SMOOTHED. The sheet is 320 texels across and about
// a hundred usable rows per frame; over a full window that is four times
// magnification one way and eight the other. Bilinear filtering between texels
// that far apart is a grid of flat triangles, and every edge cut through it
// picks up the diamonds and star points of that grid. Curving the blend weights
// with a smoothstep before the fetch makes the reconstruction continuous in its
// slope as well as its value, so a cloud edge bulges and hooks the way a cloud
// does. One fetch still, four multiplies more.
float slice(vec2 uv, float f) {
  vec2 t = vec2(clamp(uv.x, 0.0, 1.0), (f + clamp(uv.y, 0.0, 1.0)) / uFrames);
  vec2 q = t * uTex - 0.5;
  vec2 i = floor(q);
  vec2 w = fract(q);
  w = w * w * (3.0 - 2.0 * w);
  return TEX(uDens, (i + w + 0.5) / uTex).r;
}

// The sheet holds twenty moments of a ten-second clip. Reading a fractional
// position between two of them is what turns twenty stills into continuous
// motion, and it is two texture fetches — the cheapest thing a GPU does.
float densF(vec2 uv, float fr) {
  float f0 = floor(fr);
  float a = slice(uv, mod(f0, uFrames));
  float b = slice(uv, mod(f0 + 1.0, uFrames));
  return mix(a, b, fr - f0);
}
float dens(vec2 uv) { return densF(uv, uF); }

float rad(float d) { return sqrt(d) * (0.5642 + 0.1429 * d * d * d); }

float screenDot(float d, vec2 pos, float ang) {
  if (d <= 0.001) return 0.0;
  float c = cos(ang), s = sin(ang);
  vec2 p = vec2(pos.x * c + pos.y * s, -pos.x * s + pos.y * c) / uRuling;
  vec2 e = fract(p) - 0.5;
  // the one-pixel soft edge is dot gain, and it stops the screen aliasing
  return clamp((rad(d) - length(e)) * uRuling + 0.5, 0.0, 1.0);
}

// THE PRESS: the print, at a position on the document.
vec3 printAt(vec2 px, vec3 inkA, vec3 inkB, float idn) {
  float u = px.x / uPlate.x;
  float v = clamp((px.y + uSkyRamp) / uRefH, 0.0, 1.0);
  float bandPh = uBand > 0.0 ? (px.y + uSky) / uBand : 0.0;
  vec2  fuv = vec2(u, foldV(px.y + uSky));
  float fs  = foldS(px.y + uSky);
  float aspect = uPlate.x / uRefH;

  float t = smoothstep(0.02, 1.02, v);
  float day = 1.0 - t;
  float L0 = 0.93 - 0.80 * pow(t, 0.85);
  float band = uBand > 0.0 ? 0.055 * cos((bandPh - 0.42) * TAU) : 0.0;

  float sun = exp(-length(vec2((u - SUN_U) * aspect, v - SUN_V)) * 2.2);
  float L = L0 + 0.06 * sun * day;
  float a = 0.0, lit = 0.0;

  float cov = 0.478 + 0.075 * v - band;
  float d = dens(fuv);
  if (d > cov) {
    a = smoothstep(cov, cov + 0.115, d);
    vec2 sdir = normalize(vec2(SUN_U - u, SUN_V - v));
    vec2 e = vec2(FIELD_PX / uPlate.x, FIELD_PX / max(uBand, 1.0));
    // the surface normal points AWAY from the cloud's own dense interior, so
    // it is -grad that faces outward and the dot product is negated
    float gx = dens(fuv + vec2(e.x, 0.0)) - dens(fuv - vec2(e.x, 0.0));
    float gy = (dens(fuv + vec2(0.0, e.y)) - dens(fuv - vec2(0.0, e.y))) * fs;
    lit = smoothstep(0.16, 0.86, 0.5 - dot(vec2(gx, gy), sdir) * 13.0);
    L = mix(L, L0 * (0.38 + 1.02 * lit), a);
  }
  L = clamp(L, 0.0, 1.0);

  float dA = clamp(pow(1.0 - L, 1.08), 0.0, 1.0) * 0.985;
  float glow = 0.13 * pow(sun, 1.9) * day * L
             + 0.30 * a * lit * pow(day, 1.4) * sqrt(sun);
  // THE SHADOW IS MOSTLY THE BLUE'S JOB NOW.
  // Ink B does double duty: the glow at the top of the page and the shadow at
  // the bottom. That worked when it was an orange, which reads as a warm dark.
  // It is a ROSE now, so at 0.90 the whole middle of the sheet went pink and
  // the sky stopped being a sky. At 0.52 the rose is the LIGHT, ink A carries
  // the dark, and the two still overprint to a plum-navy night at the foot.
  float shadow = smoothstep(0.62, 1.0, 1.0 - L) * 0.52;
  // IDENTITY TRAVELS WITH THE INK PAIR, not with the page.
  // A project sheet puts its second ink on the lit cloud tops as well as in the
  // shadows — that is what makes the ink read as a COLOUR rather than as a
  // darkness. The home sheet does not. So while the gate was drawing a project's
  // pair with the HOME sheet's identity of zero, the preview was laying
  // measurably less second ink than the page it is a window onto, and the two
  // did not match. It is a property of the pair now.
  float ident = idn * (0.40 * a * lit + 0.10 * L * L);
  float dB = clamp(glow + shadow + ident, 0.0, 1.0);

  // ink on paper is subtractive: each plate multiplies what is under it
  float cA = screenDot(dA, px, ANG_A);
  float cB = screenDot(dB, px + REG, ANG_B);
  return PAPER * mix(vec3(1.0), inkA, cA) * mix(vec3(1.0), inkB, cB);
}

void main() {
  // gl_FragCoord counts up from the bottom; a sheet of paper counts down from
  // the top. Everything below is in the paper's coordinates.
  vec2 vp  = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 doc = vec2(vp.x, vp.y + uScroll);

  // THE DIE-CUTS. A hole is a rectangle of the document, so a hole stays put on
  // the page while the page scrolls under the window — registration by
  // construction, exactly as when each hole was its own bitmap.
  float open = 0.0;
  int hit = -1;
  for (int i = 0; i < ${HOLES_MAX}; i++) {
    if (i >= uHoleCount) break;
    vec4 h = uHoles[i];
    vec2 q = doc - h.xy;
    if (q.x >= 0.0 && q.y >= 0.0 && q.x < h.z && q.y < h.w) { open = 1.0; hit = i; break; }
  }

  // MEW'S HOLE. She is the one thing that can open the sheet without a die, so
  // she carries a soft-edged hole with her — and because it is cut by the same
  // shader from the same field, it shows the same MOVING weather as every other
  // hole, registered to the same document position.
  if (uHalo.z > 0.0) {
    float soft = 1.0 - smoothstep(uHalo.z * 0.42, uHalo.z, distance(vp, uHalo.xy));
    open = max(open, soft);
  }

  // THE CROSSING. Not a rectangle that grows and not a level that fades: an
  // opening that spreads. Its edge is chewed by the WEATHER ITSELF — the same
  // density field the sky is made of, sampled here to push the boundary in and
  // out — so the paper is eaten away rather than wiped, and no two crossings
  // tear along the same line.
  // EATING INWARD STAYS ON AT RADIUS ZERO. A positive radius means "there is an
  // opening"
  // when the paper is on the outside, and it means the exact opposite when the
  // paper is the island: r = 0 is not "no crossing", it is "the page is
  // completely gone". Guarding on it switched the whole thing off for the one
  // frame the island vanished, and the entire window flashed the page — which
  // is the jitter in the middle of the return.
  float eaten = 0.0;
  if (uCross.z > 0.0 || uCross2.z > 0.0 || uEatOut > 0.5) {
    vec2 cfuv = vec2(doc.x / uPlate.x, foldV(doc.y));
    float mess = (dens(cfuv) - 0.5) * 2.2;
    // INSIDE THE BOUNDARY, OR OUTSIDE IT. Same ragged edge, chewed by the same
    // weather; the only difference is which side of it the paper is on. When the
    // paper is the island the radius is allowed to go NEGATIVE — it has to, or
    // the edge's inward bite punches a hole through a screen that is supposed to
    // be solid — so this branch never tests it for being positive.
    if (uEatOut > 0.5) {
      float d1 = distance(vp, uCross.xy) + mess * uCross.w;
      eaten = max(eaten, smoothstep(uCross.z - uCross.w, uCross.z, d1));
    } else {
      if (uCross.z > 0.0) {
        float d1 = distance(vp, uCross.xy) + mess * uCross.w;
        eaten = max(eaten, 1.0 - smoothstep(uCross.z - uCross.w, uCross.z, d1));
      }
      if (uCross2.z > 0.0) {
        float d2 = distance(vp, uCross2.xy) + mess * uCross2.w;
        eaten = max(eaten, 1.0 - smoothstep(uCross2.z - uCross2.w, uCross2.z, d2));
      }
    }
    open = max(open, eaten);
  }

  // ── THE OVERLAY PASS ─────────────────────────────────────────────────
  // The eating has to be able to cover the TYPE, and the type sits above the
  // sheet. So during a crossing the same shader is run a second time in this
  // mode — print where the paper has been eaten, fully transparent everywhere
  // else — and that result is blitted to a layer above the words. The page
  // itself no longer fades out; it is covered.
  if (uOverlay > 0.5) {
    if (eaten <= 0.002) { OUT = vec4(0.0); return; }
    OUT = vec4(printAt(doc, uEatA, uEatB, uEatIdn) * eaten, eaten);   // premultiplied
    return;
  }

  if (open <= 0.0) { OUT = vec4(PAPER, 1.0); return; }

  // The gate prints in the project it is a window onto — and so does the
  // CROSSING, from its very first frame. It used to eat outward in the home
  // sheet's own pink and blue and only become the project's colours at the
  // swap, which put a colour change right in the middle of the one moment that
  // is supposed to have nothing visible happening in it.
  bool gate = (hit == uAltHole && uAltHole >= 0);
  bool eat = eaten > 0.02;
  vec3 iA = eat ? uEatA : (gate ? uInkA2 : uInkA);
  vec3 iB = eat ? uEatB : (gate ? uInkB2 : uInkB);
  float idn = eat ? uEatIdn : (gate ? 1.0 : uIdentity);
  OUT = vec4(mix(PAPER, printAt(doc, iA, iB, idn), open), 1.0);
}`;

const FRAG_300 = `#version 300 es
precision highp float;
out vec4 fragColor;
${BODY.replace(/TEX\(/g, "texture(").replace(/\bOUT\b/g, "fragColor")}`;

const FRAG_100 = `precision highp float;
${BODY.replace(/TEX\(/g, "texture2D(").replace(/\bOUT\b/g, "gl_FragColor")}`;

const hex = (h) => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255
];
// The HOME sheet's pair. A project sheet replaces BOTH of them now — its sky
// is its own, not a recolour of hers (site/projects.js).
const SKY  = [0x1a / 255, 0x71 / 255, 0xaf / 255];   // #1A71AF, prints h~234
const ROSE = [0xcb / 255, 0x64 / 255, 0xc4 / 255];   // #CB64C4, prints h~343

/**
 * Attach the press to a canvas. Returns null only if there is no WebGL at all,
 * in which case nothing on this page renders anyway — Mew is a WebGL context
 * too — so there is no half-working state to design for.
 */
export function createSheetPress(canvas, sheet, frames) {
  const opts = {
    alpha: true, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: "low-power"
  };
  let gl = canvas.getContext("webgl2", opts);
  const two = !!gl;
  if (!gl) gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  if (!gl) return null;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("sheet shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, two ? VERT_300 : VERT_100);
  const fs = compile(gl.FRAGMENT_SHADER, two ? FRAG_300 : FRAG_100);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("sheet shader link:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  gl.deleteShader(vs); gl.deleteShader(fs);

  // WebGL1 has no gl_VertexID, so it gets a three-vertex buffer instead
  if (!two) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  const U = {};
  for (const n of ["uDens", "uTex", "uFrames", "uF", "uRes", "uScroll", "uPlate", "uRefH", "uSky", "uSkyRamp", "uBand",
                   "uInkA", "uInkB", "uInkA2", "uInkB2", "uAltHole", "uOverlay", "uIdentity", "uRuling", "uHoles", "uHoleCount", "uHalo", "uCross", "uCross2", "uEatOut", "uEatA", "uEatB", "uEatIdn"]) {
    U[n] = gl.getUniformLocation(prog, n);
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  if (two) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, sheet.width, sheet.height, 0,
                  gl.RED, gl.UNSIGNED_BYTE, sheet.data);
  } else {
    // WebGL1 has no single-channel format that filters, so the density goes in
    // as luminance. Same one byte per texel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, sheet.width, sheet.height, 0,
                  gl.LUMINANCE, gl.UNSIGNED_BYTE, sheet.data);
  }
  gl.uniform1i(U.uDens, 0);
  gl.uniform2f(U.uTex, sheet.width, sheet.height);
  gl.uniform1f(U.uFrames, frames);
  gl.uniform1f(U.uRuling, 5.2);

  const rects = new Float32Array(HOLES_MAX * 4);
  let vw = 0, vh = 0;

  /**
   * @param holes  [{x,y,w,h}] in DOCUMENT pixels
   * @param halo   {x,y,r} in VIEWPORT pixels, or null
   * @param f      position in the cloud loop, fractional
   */
  function draw({ w, h, scrollY, plate, bandPx, inkA, inkB, alt, holes, halo, f, ruling, cross, eat, overlay, sky, skyRamp }) {
    if (w < 2 || h < 2) return false;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      vw = w; vh = h;
      gl.viewport(0, 0, w, h);
    } else if (vw !== w || vh !== h) {
      vw = w; vh = h;
      gl.viewport(0, 0, w, h);
    }

    const n = Math.min(holes.length, HOLES_MAX);
    for (let i = 0; i < n; i++) {
      const b = holes[i];
      rects[i * 4] = b.x; rects[i * 4 + 1] = b.y;
      rects[i * 4 + 2] = b.w; rects[i * 4 + 3] = b.h;
    }
    gl.uniform4fv(U.uHoles, rects);
    gl.uniform1i(U.uHoleCount, n);
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uScroll, scrollY);
    gl.uniform2f(U.uPlate, plate.w, plate.h);
    gl.uniform1f(U.uRefH, REF_H);
    gl.uniform1f(U.uSky, sky || 0);
    gl.uniform1f(U.uSkyRamp, skyRamp || 0);
    gl.uniform1f(U.uBand, bandPx || 0);
    gl.uniform1f(U.uF, f);
    // THE SCREEN ITSELF COARSENS DURING A CROSSING.
    // The ruling is FIXED. It is a property of the paper, so it never moves and
    // never grows — a growing dot is exactly what makes a halftone read as a
    // zoomed bitmap. Kept as a parameter only because the figures on a project
    // sheet are screened finer than the sky.
    // the marks are countable, and they resolve back into weather on the other
    // side. Scaling an image up only makes a big blurry image; growing the dots
    // in place is the thing the whole sheet is about.
    gl.uniform1f(U.uRuling, ruling || 5.2);
    if (cross) gl.uniform4f(U.uCross, cross.x, cross.y, cross.r, cross.feather);
    else gl.uniform4f(U.uCross, 0, 0, 0, 0);
    // the retreat's second target — the band at the foot of the sheet
    const c2 = cross && cross.second;
    if (c2) gl.uniform4f(U.uCross2, c2.x, c2.y, c2.r, c2.feather);
    else gl.uniform4f(U.uCross2, 0, 0, 0, 0);
    // which side of the opening the paper is on, and what it prints in
    gl.uniform1f(U.uEatOut, cross && cross.out ? 1 : 0);
    const ea = eat?.inkA ? hex(eat.inkA) : SKY;
    const eb = eat?.inkB ? hex(eat.inkB) : ROSE;
    gl.uniform3f(U.uEatA, ea[0], ea[1], ea[2]);
    gl.uniform3f(U.uEatB, eb[0], eb[1], eb[2]);
    // ...matched to the destination the same way the page's own is (below)
    gl.uniform1f(U.uEatIdn, eat?.inkB ? 1 : 0);
    gl.uniform1f(U.uIdentity, inkB ? 1 : 0);
    const ia = inkA ? hex(inkA) : SKY;
    gl.uniform3f(U.uInkA, ia[0], ia[1], ia[2]);
    const ink = inkB ? hex(inkB) : ROSE;
    gl.uniform3f(U.uInkB, ink[0], ink[1], ink[2]);
    const a2 = alt?.inkA ? hex(alt.inkA) : SKY;
    const b2 = alt?.inkB ? hex(alt.inkB) : ROSE;
    gl.uniform3f(U.uInkA2, a2[0], a2[1], a2[2]);
    gl.uniform3f(U.uInkB2, b2[0], b2[1], b2[2]);
    gl.uniform1i(U.uAltHole, alt && alt.index >= 0 ? alt.index : -1);
    if (halo) gl.uniform3f(U.uHalo, halo.x, halo.y, halo.r);
    else gl.uniform3f(U.uHalo, 0, 0, 0);

    gl.uniform1f(U.uOverlay, overlay ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  return {
    draw,
    webgl2: two,
    maxHoles: HOLES_MAX,
    dispose() {
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  };
}
