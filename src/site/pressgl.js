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
// ── THE RETURN, WHICH IS A DIFFERENT ANIMAL ──────────────────────────────
// Going back is not going in. Coming out of a hole only makes sense when there
// IS a hole you came out of; a "back" link is a word in a corner, and an
// opening spreading from it reads as a mistake.
//
// So the return is a DISSOLVE made of clouds. Four groups, each admitting more
// of the screen than the last, each fading in under the one before it has
// finished fading out, until the fourth is the whole window. Nothing about it
// depends on where the click was, so any link anywhere can use it.
//
// x = 0..1 through the dissolve, y = 1 while it is running.
uniform vec3  uPuff;   // x = 0..1 through it, y = running, z = its own frame
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
float slice(vec2 uv, float f) {
  float y = (f + clamp(uv.y, 0.0, 1.0)) / uFrames;
  return TEX(uDens, vec2(clamp(uv.x, 0.0, 1.0), y)).r;
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

// THE PRESS ITSELF, with every input it used to read off the page handed to it
// instead. Nothing here changed except where the numbers come from: the return
// dissolve needs the SAME press run at a different place in the field, at a
// different moment of the clip and at a different coverage threshold, and the
// only way to get that without a second copy of the press is to stop reading
// the position out of the global state.
//
//   px      where the halftone lattice is sampled — the screen is a property of
//           the PAPER, so this stays in document space whatever else moves
//   u, v    across the plate, and down it. v is the time of day.
//   bandPh  the coverage wobble's phase, in bands
//   fuv     where to read the cloud field. Both components already folded, so
//           an offset can be any size without running off the clip.
//   fs      +1 on an upright pass of the field, -1 on a mirrored one
//   fr      which moment of the clip
//   covB    added to the coverage threshold. Negative admits more cloud.
//   soft    how far above the threshold a cloud becomes solid. The sheet wants
//           0.115, which is dot gain and the reason its clouds have air in their
//           edges. The dissolve wants a tenth of that: it has to CLOSE, and a
//           cloud that only goes solid 0.115 above its own threshold leaves a
//           fifth of the window translucent no matter how many are stacked up.
//           A hard edge is also the right look for it — a cut shape rather than
//           a photograph of one.
//
// Returns the printed colour in .rgb and THE CLOUD MASK in .a — the press has
// always computed that mask, because it has to shade cloud differently from
// clear air. Handing it back is what makes the sky removable.
vec4 pressAt(vec2 px, float u, float v, float bandPh, vec2 fuv, float fs, float fr, float covB,
             float soft, vec3 inkA, vec3 inkB, float idn) {
  float aspect = uPlate.x / uRefH;

  float t = smoothstep(0.02, 1.02, v);
  float day = 1.0 - t;
  float L0 = 0.93 - 0.80 * pow(t, 0.85);
  float band = uBand > 0.0 ? 0.055 * cos((bandPh - 0.42) * TAU) : 0.0;

  float sun = exp(-length(vec2((u - SUN_U) * aspect, v - SUN_V)) * 2.2);
  float L = L0 + 0.06 * sun * day;
  float a = 0.0, lit = 0.0;

  float cov = 0.478 + 0.075 * v - band + covB;
  float d = densF(fuv, fr);
  if (d > cov) {
    a = smoothstep(cov, cov + soft, d);
    // THE SHADING KEEPS ITS OWN, WIDER RAMP. The mask is doing two jobs — it is
    // what this returns AND how much the cloud's own lighting replaces the open
    // sky's. Hardening it for the mask hardened the lighting too, and sixteen
    // hard-lit cuts laid over each other average out to a flat grey: all the
    // tone in the picture lives in that ramp. Identical when soft is 0.115, so
    // the sheet is untouched.
    float aL = soft >= 0.115 ? a : smoothstep(cov, cov + 0.115, d);
    vec2 sdir = normalize(vec2(SUN_U - u, SUN_V - v));
    vec2 e = vec2(FIELD_PX / uPlate.x, FIELD_PX / max(uBand, 1.0));
    // the surface normal points AWAY from the cloud's own dense interior, so
    // it is -grad that faces outward and the dot product is negated
    float gx = densF(fuv + vec2(e.x, 0.0), fr) - densF(fuv - vec2(e.x, 0.0), fr);
    float gy = (densF(fuv + vec2(0.0, e.y), fr) - densF(fuv - vec2(0.0, e.y), fr)) * fs;
    lit = smoothstep(0.16, 0.86, 0.5 - dot(vec2(gx, gy), sdir) * 13.0);
    L = mix(L, L0 * (0.38 + 1.02 * lit), aL);
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
  return vec4(PAPER * mix(vec3(1.0), inkA, cA) * mix(vec3(1.0), inkB, cB), a);
}

// the print, at a position on the document — the press reading the page
vec3 printAt(vec2 px, vec3 inkA, vec3 inkB, float idn) {
  float u = px.x / uPlate.x;
  float v = clamp((px.y + uSkyRamp) / uRefH, 0.0, 1.0);
  float bandPh = uBand > 0.0 ? (px.y + uSky) / uBand : 0.0;
  return pressAt(px, u, v, bandPh, vec2(u, foldV(px.y + uSky)), foldS(px.y + uSky),
                 uF, 0.0, 0.115, inkA, inkB, idn).rgb;
}

// ── THE RETURN DISSOLVE ──────────────────────────────────────────────────
// It is the sky, brought to the front with the sky taken out of it.
//
// Same clip, same press, same lattice, same inks as the sheet being left. The
// one thing that is different is what carries the alpha: pressAt returns the
// CLOUD MASK it needed anyway, and using that as the alpha keeps the cloud and
// drops the blue. What floats over the page is weather with nothing behind it.
//
// Two earlier attempts did not do this. The first pinned each layer to one row
// of the baked sheet, which is a photograph and never moved. The second grew
// its own noise so as not to look like the background sliding — which solved a
// problem that only existed because the first one was static, and threw away
// the press to do it.
//
// NOTHING HERE IS EVER SEMI-TRANSPARENT, AND NOTHING FADES.
// The version before this faded each wave up on an opacity envelope, and it
// read as exactly what it was: photographs cross-dissolving. Worse, the clip
// ALREADY has clouds forming and dissipating in it, so a fade laid over the top
// fought the thing it was imitating.
//
// So the envelope is gone and what animates is THE LEVEL THE CLOUD IS CUT AT.
// Lowering it makes the picture behave like weather — cloud appears where the
// field has just crossed the line, spreads at its own edges, joins up with its
// neighbours — and raising it again shrinks it back and takes it away. Every
// pixel is either cloud or nothing. The forming and dissipating is the clip's;
// the level only decides how much of it is above water.
//
// FOUR WAVES, AND THE DOUBLING IS IN THE COUNT: one cut of the field, then two,
// then four, then eight. Fifteen in total. Doing it by threshold instead was the
// obvious route and it does not work — the field's density is heaped up in the
// middle, so the levels that give 6%, 12% and 25% of the window are 0.685, 0.650
// and 0.617, which are near enough the same level to look like one wave
// breathing. Twice the cuts is twice the clouds however the field is heaped.
//
// None of them ever leaves: a wave that faded out again is what let coverage run
// backwards, and the clip provides plenty of coming and going by itself.
//
// AND THE LAST WAVE IS REAL CLOUD, not a lid. It used to be an opaque sheet of
// sky with cloud laid over it, which covered the window and looked like exactly
// that — a sky pulled across to hide the page changing. Fifteen overlapping cuts
// close the window on their own.
//
// Viewport space, so scrolling cannot get out from under it, and no centre, so
// any link anywhere dissolves the same way.

// the field mirrors every band vertically; this is the same trick sideways, so
// a layer can be offset horizontally without running into the clip's clamp
float foldU(float x) { float t = mod(x, 2.0); return 1.0 - abs(1.0 - t); }

// AND THE VERTICAL FOLD IS WINDOWED, for the dissolve only.
// The clip is not even down its own frame: measured off the baked sheet, mean
// density runs 108 across the whole top half and then climbs to 168 in the last
// quarter, which is the dense deck at the horizon. A mirror turns around at both
// ends, so the dense end meets itself and prints a hard dark stripe the full
// width of the sheet. In the background that happens once per viewport, where a
// die-cut is usually in the way; across a full-screen dissolve it happens twice
// with nothing in the way at all.
//
// Folding inside the top 0.60 of the frame instead of all of it puts the two
// turning points 13 levels apart rather than 60. The background keeps the whole
// frame — its stripe has always been there and is not this task.
float foldW(float y) { return 0.02 + foldV(y) * 0.60; }

// NO TIME OF DAY ON THE DISSOLVE. v is pinned, so there is no night ramp down
// the screen and no accumulation across navigations — these clouds belong to
// neither the sheet being left nor the one arrived at. Pinned to daylight
// rather than to nothing: it is still the press, so it still needs a v.
//
// AND PINNED NEAR THE TOP OF THE PLATE, at 0.10 rather than 0.30. Ten cuts of
// the field stack up a great deal more ink than the one the sheet lays, so at a
// middling time of day the dissolve came out far darker than any part of the
// sky it is standing in front of. The top of the plate is the open, light end;
// ten layers of it land where one layer of the middle does.
const float PUFF_V = 0.10;

// WHERE THE SMALL CLOUDS COME FROM, which is not where I first went looking.
//
// The obvious answer is to tile more of the field into the window — three
// frames across instead of one, so every cloud is a third the size. It does not
// work. The field MIRRORS at each repeat, and a mirror inside the window is a
// line of symmetry you can see: at 3.2 across, sixteen samples each folded
// twice and the screen came out a Rorschach card of butterflies. Squeezing x
// harder than y to fit more in is worse still — it is a 2:1 anamorphic squash,
// and it stands every cloud on end.
//
// The answer is the LEVEL, which was already there. Cut the field high and what
// is left above the line is not whole clouds shrunk down, it is their dense
// cores — small, separate, scattered wherever the weather happens to be thick.
// Sixteen of those from sixteen moments of the clip is a sky full of small
// clouds, at the clip's own scale, with no repeat anywhere in it.
//
// So the field is read one frame to one screen, and each sample is offset by a
// WHOLE number of frames in each direction. A whole number puts the mirror
// exactly on the window's edge, where it has always been and where it cannot be
// seen; anything else drags it into the middle of the picture. Four positions,
// sixteen moments.

// The level a wave starts at, which has to clear the field's measured maximum
// of 0.863 plus the 0.055 the coverage wobble can lend it — otherwise a wave
// begins with cloud already on the screen instead of with nothing.
const float PUFF_HI = 0.94;
// and the level everything ends at. 0.38 leaves about 42% of any one cut solid,
// which over sixteen of them closes the window to the last pixel.
const float PUFF_LO = 0.38;
// how far down a wave's own arrival takes it, as a fraction of that run. Half
// lands it at 0.66, the densest twentieth of the field — a scatter of small
// clouds rather than a bank of them.
const float PUFF_ARRIVE = 0.50;
const float PUFF_SOFT = 0.035;

// THE LATTICE IS VIEWPORT-LOCKED HERE, and only here. Everywhere else the
// screen belongs to the PAPER, so it is cut from document position and stays
// registered while the page scrolls under it. But this cloud is a sheet in
// FRONT of the page — its own paper — and it does not scroll. Leaving the
// lattice on the document made the dots crawl under stationary clouds when the
// reader scrolled mid-dissolve: 78% of the frame changing for a scroll the
// clouds themselves ignored.
//
// premultiplied: rgb is already scaled by a
vec4 puffAt(vec2 vp) {
  if (uPuff.y < 0.5) return vec4(0.0);
  float t = clamp(uPuff.x, 0.0, 1.0);
  float u = clamp(vp.x / uRes.x, 0.0, 1.0);
  vec3 acc = vec3(0.0);
  float accA = 0.0;
  for (int k = 0; k < 16; k++) {
    // THE DOUBLING IS IN THE TOTAL ON SCREEN, not in what each wave adds: two
    // cuts, then four, then eight, then sixteen. So the waves add 2, 2, 4 and 8
    // of them. Starting from one cut instead of two put the whole first wave at
    // the mercy of a single moment of the clip, and the clip has moments with
    // no cloud in them at all — the dissolve would begin with an empty screen
    // and stay that way for a third of its length.
    int gi = k < 2 ? 0 : (k < 4 ? 1 : (k < 8 ? 2 : 3));
    float g = float(gi);
    float fk = float(k);

    // THE LEVEL, IN TWO MOVEMENTS — and it took getting this wrong to see why
    // it has to be two.
    //
    // Overlapping cuts SATURATE. Two cuts covering a tenth each cover a fifth
    // between them; sixteen covering a tenth each cover four fifths, not
    // sixteen tenths. So a single level per wave cannot do both ends of this
    // job: set it sparse enough for the first wave to be a scatter of clouds
    // and sixteen of them still leave the window open, set it deep enough to
    // close and the first wave arrives as overcast.
    //
    //   ARRIVE  each wave cuts down to the same shallow level, a wave later
    //           than the one before. This is the doubling, and it is purely a
    //           count: two clouds, four, eight, sixteen.
    //   SETTLE  then every wave, all sixteen cuts of them, goes on down
    //           together. This is what closes the window, and it closes it as
    //           sixteen clouds all thickening at once — which is what an
    //           overcast sky actually is — rather than as one lid.
    //
    // The settle acts ON TOP OF what a wave has arrived at, rather than beside
    // it. Taking the greater of the two instead looks like the same thing and
    // is not: the settle then counts for nothing until it passes the arrival
    // level, so for two thirds of its run the screen held still and the whole
    // closure happened in the last fifth of the dissolve, all at once.
    float arrive = clamp((t - g * 0.16) / 0.30, 0.0, 1.0);
    // eased, because coverage is not linear in the level: a cut opens up fastest
    // just as it passes the field's middle, so a straight run at the level shut
    // the window at four fifths of the way through and left the last fifth with
    // nothing to do
    float settle = pow(clamp((t - 0.30) / 0.70, 0.0, 1.0), 1.75);
    float q = arrive * (PUFF_ARRIVE + (1.0 - PUFF_ARRIVE) * settle);
    if (q <= 0.001) continue;
    float th = mix(PUFF_HI, PUFF_LO, q);

    // TEN PLACES IN THE FIELD AND TEN MOMENTS IN THE LOOP, spread by the golden
    // ratio. Successive multiples of it fall about as evenly into a cycle as any
    // ten numbers can, which is what keeps the samples from agreeing with each
    // other — and samples that agree leave the same holes open, so the window
    // never closes however many of them there are.
    //
    // NOT wound on by uSky: the plate is wound on at the swap, which lands in
    // the middle of the dissolve, and the middle is when this cloud is all
    // there is to look at. It owes the page's weather no continuity.
    float ph = fract(fk * 0.6180339);
    float ix = mod(fk, 2.0);
    float iy = mod(floor(fk * 0.5), 2.0);
    float yo = vp.y + iy * uBand;
    float bandPh = uBand > 0.0 ? yo / uBand : 0.0;
    vec2 fuv = vec2(foldU(u + ix), foldW(yo));
    float fr = uPuff.z + uFrames * ph;

    // pressAt adds the page's own base coverage, so the level is handed to it
    // as the difference from that
    float covB = th - (0.478 + 0.075 * PUFF_V);
    vec4 pr = pressAt(vp, u, PUFF_V, bandPh, fuv, foldS(yo), fr, covB,
                      PUFF_SOFT, uInkA2, uInkB2, 1.0);

    // the mask IS the alpha. Nothing is scaled by an envelope.
    float a = pr.a;
    acc  = pr.rgb * a + acc * (1.0 - a);
    accA = a + accA * (1.0 - a);
  }
  return vec4(acc, accA);
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
  float eaten = 0.0;
  if (uCross.z > 0.0 || uCross2.z > 0.0) {
    vec2 cfuv = vec2(doc.x / uPlate.x, foldV(doc.y));
    float mess = (dens(cfuv) - 0.5) * 2.2;
    if (uCross.z > 0.0) {
      float d1 = distance(vp, uCross.xy) + mess * uCross.w;
      eaten = max(eaten, 1.0 - smoothstep(uCross.z - uCross.w, uCross.z, d1));
    }
    if (uCross2.z > 0.0) {
      float d2 = distance(vp, uCross2.xy) + mess * uCross2.w;
      eaten = max(eaten, 1.0 - smoothstep(uCross2.z - uCross2.w, uCross2.z, d2));
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
    // The dissolve is only ever an overlay — it is cloud in FRONT of the page,
    // not a hole in it, so it must not reach the sheet pass at all. It arrives
    // premultiplied already, which is what the four layers compositing over
    // each other produce.
    if (uPuff.y > 0.5) {
      vec4 pf = puffAt(vp);
      if (pf.a <= 0.002) { OUT = vec4(0.0); return; }
      OUT = pf;
      return;
    }
    if (eaten <= 0.002) { OUT = vec4(0.0); return; }
    OUT = vec4(printAt(doc, uInkA2, uInkB2, 1.0) * eaten, eaten);   // premultiplied
    return;
  }

  if (open <= 0.0) { OUT = vec4(PAPER, 1.0); return; }

  // The gate prints in the project it is a window onto — and so does the
  // CROSSING, from its very first frame. It used to eat outward in the home
  // sheet's own pink and blue and only become the project's colours at the
  // swap, which put a colour change right in the middle of the one moment that
  // is supposed to have nothing visible happening in it.
  bool alt = (hit == uAltHole && uAltHole >= 0) || eaten > 0.02;
  vec3 iA = alt ? uInkA2 : uInkA;
  vec3 iB = alt ? uInkB2 : uInkB;
  float idn = alt ? 1.0 : uIdentity;
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
  for (const n of ["uDens", "uFrames", "uF", "uRes", "uScroll", "uPlate", "uRefH", "uSky", "uSkyRamp", "uBand",
                   "uInkA", "uInkB", "uInkA2", "uInkB2", "uAltHole", "uOverlay", "uIdentity", "uRuling", "uHoles", "uHoleCount", "uHalo", "uCross", "uCross2", "uPuff"]) {
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
  gl.uniform1f(U.uFrames, frames);
  gl.uniform1f(U.uRuling, 5.2);

  const rects = new Float32Array(HOLES_MAX * 4);
  let vw = 0, vh = 0;

  /**
   * @param holes  [{x,y,w,h}] in DOCUMENT pixels
   * @param halo   {x,y,r} in VIEWPORT pixels, or null
   * @param f      position in the cloud loop, fractional
   */
  function draw({ w, h, scrollY, plate, bandPx, inkA, inkB, alt, holes, halo, f, ruling, cross, overlay, sky, skyRamp, puff }) {
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
    // the return dissolve
    gl.uniform3f(U.uPuff, puff ? puff.t : 0, puff ? 1 : 0, puff ? puff.f : 0);
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
