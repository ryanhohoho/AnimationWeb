// fieldRenderer.js
// the GPU half of the type field: one InstancedBufferGeometry, one quad, and
// EXACTLY TWO DRAW CALLS -- every cell once, then the OVERSTRUCK cells a second
// time (bible 3.4a, 7.3).
//
// THE SECOND DRAW USED TO BE THE INVERTED PASS, and that is what put black
// rectangles on the headings. There is no glyph in a monospace font that fills
// a cell -- the baked ramp's densest is 0.337 ink -- so "we need darker" led
// straight to a solid block with a letter knocked out of it, and a field of
// those is a stencil, not type made of type. Inversion is quarantined to the
// portrait (bible 3.4a); the darks come from OVERSTRIKE: a second glyph struck
// into the same cell at +0.34 cell across and +0.10 down, at the heavy weight,
// chosen by the same density lookup. Two impressions at ~0.33 compose to ~0.56
// effective ink, the cell stays unmistakably made of letters, and the artefact
// is a typewriter double-strike -- the same misregistered-print world the
// chromatic fringe in 3.3 lives in.
//
// It replaces the inverted draw one for one, so the budget is unchanged at 3.
//
// Read DESIGN_BIBLE.md 7.3 before touching this. The field is a PURE FUNCTION
// of (cell identity, absolute time, a handful of globals), evaluated in the
// VERTEX SHADER. Per frame the CPU writes about ten uniforms and issues one
// renderer.render(). ZERO BYTES ARE UPLOADED PER FRAME. If you find yourself
// adding a per-frame loop over cells here, stop: all four verbs in bible 5 have
// closed forms (that is why they were specified as overdamped and
// non-interacting), and they all live in fieldMath.js already.
//
// -- what lives where ------------------------------------------------------
//   fieldMath.js      every analytic function, in JS, tested. THE SOURCE.
//                     Its GLSL mirror is exported from the same file and
//                     pasted into the shader below. The shader must match it.
//   field.js          the model: grid, cell data, words, hits. No GPU objects.
//   this file         every GPU object, and nothing else. One dispose() takes
//                     the lot, which is leak class 1 in the plan's section 6.
//
// -- the data texture ------------------------------------------------------
// Per-cell content is indexed by DOCUMENT grid coordinate and read in the
// vertex shader (WebGL2 guarantees >= 16 vertex texture units; this uses four).
// It is written on layout and route change ONLY, via texSubImage2D over the
// changed region. Instances therefore only have to cover the VIEWPORT plus a
// two-cell margin, so a long page costs nothing extra and scrolling is one
// uniform.
//
//   texA.r  seed          frozen per-cell randomness (bible 3.5)
//   texA.g  restDensity   weather x presence, baked at layout (bible 4.2)
//   texA.b  slotDensity   target density inside a word, 0 = not a slot
//   texA.a  flags         fringe(2) | strikeRest(1) | slotStrike(1) | wordId(4)
//   texB.r  slotOffsetX   sub-cell letterform alignment, signed, +/- half a cell
//   texB.g  slotOffsetY
//   texB.b  thin          how much a nearby word eats this cell (bible 4.3)
//   texB.a  slotGlyph     the 6-D matched glyph for this slot (bible 4.1)
//
// -- COLOUR SPACE, and this one has already cost a round trip once on the mew
// side (HANDOFF.md). three only injects the linear->sRGB encode into materials
// it builds itself, and never into a RawShaderMaterial. So every colour here is
// carried as RAW sRGB BYTES (see srgbTriple) and written straight to the
// default framebuffer. Do NOT wrap these in THREE.Color: colour management
// would decode them to linear on the way in and nothing would decode them back.

import * as THREE from "three";
import { siteConfig } from "../config/siteConfig.js";
import { GLSL_FIELD_MATH } from "./fieldMath.js";

const M = siteConfig.motion;
const F = siteConfig.field;
const W = siteConfig.words;
const B = siteConfig.budget;

/** "#F4F2EC" -> [0.957, 0.949, 0.925] as RAW sRGB. See the header. */
export function srgbTriple(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

// ---------------------------------------------------------------------------
// the shader
// ---------------------------------------------------------------------------

const VERT = /* glsl */ `
precision highp float;
precision highp int;

in vec2 position;      // unit quad corner, 0..1
in vec2 aCell;         // this instance's cell, in VIEWPORT cells incl. margin

uniform vec2  uCellPx;        // cell size in css px
uniform vec2  uViewportPx;
uniform vec2  uCellOrigin;    // MAP cell index of instance (0,0)
// THE CAMERA (bible 7.1a), in map px, snapped to whole cells. This is the
// scroll offset generalised to two axes -- a pan and a scroll are the same
// operation, and there is one mechanism here, not two.
uniform vec2  uCameraPx;
uniform float uTime;          // ABSOLUTE seconds. never a dt
// MIGRATE (bible 5): dir.xy (unit, in map space), t01 through the verb, and the
// peak displacement in px. Four floats for the whole fifth verb.
uniform vec4  uTransit;

uniform vec2  uPointerDoc;
uniform float uGatherRadius;
uniform float uGatherInner;
uniform vec4  uMew;           // x, y (doc px), body radius, enabled

uniform vec4  uHits[HIT_COUNT];     // ox, oy, tHit, strength
uniform vec4  uHitDirs[HIT_COUNT];  // dirx, diry, len, unused
// PER-WORD STATE (bible 4.3, 4.3a), and it is the whole of what the CPU knows
// about a word: x = assembly progress 0..1, y = the hover spring, z = the
// shiver envelope. One uniform write per frame for the entire page.
uniform vec3  uWordState[WORD_COUNT];
// ...and where each word IS: xy = its centre in document px, z = 1/reach.
// Written at LAYOUT only. The BREATH pushes away from it.
uniform vec3  uWordBox[WORD_COUNT];

uniform float uLoadScale;     // the inhale (bible 6.1), 1 = at rest
// THE DEGRADATION LADDER'S ONLY FOOTHOLD IN HERE (plan section 4.7): x scales
// the drift amplitude, y scales the re-roll interval. Written when the ladder
// steps and at no other time -- which is why they are uniforms and every other
// tunable in this shader is a #define.
uniform vec2  uDegrade;
uniform float uMaxCov;        // the ramp's densest glyph
uniform float uBuckets;
uniform float uVariants;
uniform float uStrikeRow;     // the heavy weight row, for the second impression
// the density that lands on legibility.counterInkMax of effective ink, solved
// once against the measured coverage curve (bible 4.4 rule 2). This is what a
// counter is driven to.
uniform float uCounterDensity;
uniform vec2  uDataSize;      // cell data texture dims, in cells

uniform sampler2D uCellA;
uniform sampler2D uCellB;
uniform sampler2D uLut;
uniform sampler2D uGlyphUv;

uniform vec3 uInk;
uniform vec3 uFringeA;
uniform vec3 uFringeB;

out vec2 vUv;
out vec3 vColor;

${GLSL_FIELD_MATH}

void degenerate() {
  // one vertex outside the clip volume on every corner: the primitive is
  // discarded before rasterization, which is the cheapest possible way to say
  // "this cell is not in this pass".
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vUv = vec2(0.0);
  vColor = vec3(0.0);
}

void main() {
  // THE MAP CELL, and it is UNBOUNDED (bible 7.1a). The plane is a torus, so
  // there is no such thing as an out-of-range cell any more -- the camera walks
  // off the west edge and keeps going, and the cell index just goes negative.
  //
  // THE WRAP IS LITERALLY TEXTURE WRAPPING. The cell data texture covers the
  // whole map and is sampled REPEAT on both axes, so cell -1 reads the east
  // panel's texels with no branch, no modulo and no special case anywhere in
  // this shader. That is the entire cost of the torus.
  //
  // texture() and not texelFetch(): texelFetch ignores the wrap mode by
  // definition -- it is an unfiltered fetch at an absolute texel -- so the one
  // line that makes the torus work would silently do nothing. The +0.5 lands
  // dead centre of the texel, and the sampler is NEAREST, so this is exactly a
  // fetch that happens to respect REPEAT.
  vec2 dc = aCell + uCellOrigin;
  vec2 duv = (dc + 0.5) / uDataSize;

  vec4 A = texture(uCellA, duv);
  vec4 Bd = texture(uCellB, duv);

  float seed = A.r;
  float restD = A.g;
  float slotD = A.b;

  // the flags byte, unpacked. UNORM8 comes back as n/255, so scaling by 255
  // and rounding recovers the integer exactly.
  float fb = floor(A.a * 255.0 + 0.5);
  float fringeKind  = mod(fb, 4.0);
  float strikeRest  = mod(floor(fb / 4.0), 2.0);
  float slotStrike  = mod(floor(fb / 8.0), 2.0);
  float wordId      = floor(fb / 16.0);

  vec2 home = dc * uCellPx;

  // -- GATHER, TRIGGERED BY THE ROUTE (bible 4.3) --------------------------
  // THE POINTER IS NOT IN HERE ANY MORE, and that is R2's entire point. A word
  // used to resolve because the cursor was near it, which meant a visitor who
  // never swept the mouse across a field of characters never found out the site
  // had navigation. Words assemble on their own now, and then they stay.
  vec3 ws = vec3(0.0);      // assembly progress, hover spring, shiver envelope
  vec3 wbox = vec3(0.0);    // the word's centre in doc px, and 1/reach
  if (wordId > 0.5) {
    int wi = int(wordId) - 1;
    ws = uWordState[wi];
    wbox = uWordBox[wi];
  }

  // texB.b IS TWO CHANNELS SHARING ONE BYTE, split here and read nowhere else:
  // a ring cell carries how hard the word thins it, a SLOT cell carries its
  // place in the assembly stagger. A slot is never in its own ring, so the two
  // meanings can never both be wanted by the same cell -- which is what buys
  // self-assembly for zero extra bytes per cell (see field.js's stampWord).
  float hasSlot = step(0.001, slotD);
  float thin  = hasSlot > 0.5 ? 0.0 : Bd.b;
  float order = hasSlot > 0.5 ? Bd.b : 0.0;

  // one word clock, one per-cell delay: mostly the cell's distance to the
  // word's own centre, the rest its frozen seed, so the SILHOUETTE resolves
  // before the interior and it reads as condensation rather than as a wipe.
  float resolve = wordId > 0.5
    ? assembleResolve(ws.x, order, seed, ASSEMBLE_STAGGER, ASSEMBLE_ORDER_W) * REST_RESOLVE
    : 0.0;
  float hover  = ws.y;
  float shiver = ws.z;
  // the ghost is the one hover that may spend chromatic ink (bible 4.3a).
  // Which cells are ghosts is baked at layout; all the shader does is fade.
  float ghost = fringeKind > 2.5 ? hover : 0.0;

  // WHAT IS LEFT OF THE POINTER: a small local influence on the surrounding
  // FIELD (bible 4.3), and no word reads it. The crowd under the cursor calms
  // and firms up a little; that is all it does now.
  float pf = gatherFalloff(distance(home, uPointerDoc), uGatherRadius, uGatherInner);

  // -- density -------------------------------------------------------------
  // at full resolve a slot is at its slot density and everything around the
  // word has THINNED (the word ate them), which is what makes it read as
  // emergence rather than as an overlay.
  //
  // THE THINNING IS A CLEARING, NOT A PERCENTAGE (bible 4.4 rule 2), and this
  // is the single most important line in the treatment. A stem tops out at
  // ~0.56 effective ink, so a letterform can only be read by the RATIO between
  // stem and counter -- roughly 6:1. Scaling the resting density instead means
  // a counter sitting on a dark drift stays dark and the word turns to mud.
  // Mixing toward an ABSOLUTE cap means a counter is near-bare wherever it
  // happens to land.
  //
  // HOVER EFFECT 1, SHARPEN (bible 4.3a): the stems go up ~15% and the counters
  // are cut further still, so the RATIO -- which is the only thing that makes
  // the letter readable -- goes from about 6:1 to about 11:1. That is the whole
  // of "the letterform tightens", and it is why hover needs no colour swap.
  float stemD    = min(1.0, slotD * (1.0 + hover * SHARPEN_GAIN));
  float counterD = uCounterDensity * (1.0 - hover * COUNTER_CUT);
  float thinned  = mix(restD, min(restD, counterD), thin * THIN_AMOUNT);
  float density  = mix(restD, mix(thinned, stemD, hasSlot), resolve);
  // the pointer firms up the crowd it is over. MULTIPLICATIVE, never additive:
  // an additive lift invents ink in the bare margins, and the margins are
  // 35-55% of the viewport by design (bible 4.2).
  density *= 1.0 + pf * POINTER_LIFT * (1.0 - resolve);
  // ...and a ghost cell is never allowed to be invisible. It sits at the
  // counter level -- a whisper -- but a whisper that is actually there.
  density = max(density, ghost * uCounterDensity);

  // -- position ------------------------------------------------------------
  vec2 pos = home;
  // DRIFT, suppressed as the cell agrees to line up -- and settling further
  // under the pointer, which is the only thing in the field that reads as a
  // response to the mouse at all.
  // ...and a fully assembled word KEEPS A TENTH OF IT (bible 4.3: "a formed
  // word is a crowd holding a formation, not a static image"). The density goes
  // all the way to the slot -- anything less leaks resting weather into the
  // counters and rule 2 collapses -- so the aliveness has to live here, in the
  // motion, which is the only place it costs nothing and damages nothing.
  pos += fieldDrift(seed, uTime, dc, uCellPx,
                    DRIFT_HZ, DRIFT_RATIO, DRIFT_RATE_JITTER, DRIFT_WAVE_CELLS,
                    DRIFT_COHERENT, DRIFT_GRAIN,
                    DRIFT_WANDER * uDegrade.x)
         * (1.0 - resolve * (1.0 - HOLD_DRIFT)) * (1.0 - pf * POINTER_CALM);
  // sub-cell letterform alignment
  pos += (Bd.rg * 2.0 - 1.0) * SLOT_OFFSET_MAX * uCellPx * resolve;

  // -- MIGRATE (bible 5, 7.1a) --------------------------------------------
  // "The whole crowd surges along the travel direction, staggered by seed,
  // AHEAD of the camera. A flock taking off."
  //
  // EVERY cell, word slots included -- which is what makes the departing page's
  // words dissolve back into the field as they go rather than sitting still
  // while the crowd around them leaves. Four uniforms and one bump: there is no
  // migrate state anywhere, so a second navigation on top of a first is just a
  // new t01 and nothing has to be unwound.
  if (uTransit.w > 0.0) {
    pos += uTransit.xy * uTransit.w *
           migrateBump(seed, uTransit.z, MIGRATE_STAGGER, MIGRATE_PEAK);
  }

  // HOVER EFFECT 4, BREATH (bible 4.3a): stem cells drift outward from the
  // word's own centre by at most breathCells, and back. OUTWARD, so the word
  // swells rather than sliding -- a slide is a hover state moving the thing you
  // are trying to click on. A raised cosine, so arriving on a word starts the
  // breath from zero displacement and nothing jumps.
  if (hover > 0.001 && hasSlot > 0.5 && slotD >= HOVER_STEM_D) {
    vec2 outward = home + uCellPx * 0.5 - wbox.xy;
    float l = max(1e-4, length(outward));
    float br = 0.5 - 0.5 * cos(6.28318530718 * BREATH_HZ * uTime + wordId * 1.7);
    pos += (outward / l) * uCellPx * BREATH_CELLS * br * hover;
  }

  // -- SCATTER + SETTLE (bible 6.4) ---------------------------------------
  // one closed form for both verbs, so there is no state to persist and
  // nothing to reset: fire twice in the same place and the second is
  // identical to the first.
  float spin = 0.0;
  float struck = 0.0;
  for (int i = 0; i < HIT_COUNT; i++) {
    vec4 h = uHits[i];
    if (h.w <= 0.0) continue;
    vec4 hd = uHitDirs[i];
    vec2 rel = home - h.xy;
    float along = dot(rel, hd.xy);
    if (along < 0.0 || along > hd.z) continue;
    float across = rel.x * -hd.y + rel.y * hd.x;
    float wAcross = 1.0 - smoothstep(0.0, CORRIDOR_HALF, abs(across));
    if (wAcross <= 0.0) continue;
    float wAlong = 1.0 - MUZZLE_FALLOFF * clamp(along / max(1e-6, hd.z), 0.0, 1.0);
    // THE PER-CELL ARRIVAL OFFSET, one subtraction, and it is the whole
    // "cells arrive at slightly different times" clause of bible 6.4.
    float tau = uTime - h.z - seed * ARRIVAL_SPREAD;
    float env = impulseResponse(tau, SETTLE_K);
    if (env <= 0.0) continue;

    float amp = h.w * wAcross * wAlong * env;
    // mostly along the beam NORMAL, with a smaller shove down the beam. A cell
    // exactly on the axis has no side to be blown to, so it takes one from its
    // seed rather than from normalize() of a zero vector.
    float side = across == 0.0 ? (seed < 0.5 ? -1.0 : 1.0) : sign(across);
    vec2 n = vec2(-hd.y, hd.x) * side;
    vec2 u = mix(n, hd.xy, AXIAL_FRACTION);
    pos += normalize(u) * amp;
    float hitAmount = clamp(wAcross * wAlong * env, 0.0, 1.0);
    struck = max(struck, hitAmount);
    spin += (seed - 0.5) * 2.0 * TUMBLE_RAD * clamp(wAcross * env, 0.0, 1.0);
  }
  // struck = smudged: the ink weight goes briefly heavier
  density += struck * SMUDGE;

  // -- MEW'S CLEARING (bible 6.5) -----------------------------------------
  if (uMew.w > 0.5) {
    vec3 mw = mewClearing(home, uMew.xy, uMew.z, MEW_REACH, uCellPx, MEW_PUSH, MEW_THIN);
    pos += mw.xy;
    density *= (1.0 - mw.z);
  }

  // the load inhale (bible 6.1): near-bare -> rest. No spinner, ever.
  density = clamp(density * uLoadScale, 0.0, 1.0);

  // -- which pass is this cell in? ----------------------------------------
  // A CELL IS EITHER STRUCK OR IT IS NOT, so this is the one discrete switch
  // in the field -- but the THRESHOLD is per-cell, from the frozen seed, so a
  // word gathers its darks one cell at a time rather than snapping into them
  // on one frame. A shared threshold is a binary in-range/out-of-range snap
  // across the whole word, which is the exact thing bible 4.3 says the falloff
  // must never be. The same number decides when the cell crosses to its 6-D
  // matched glyph, so one cell changes register once, not twice.
  float crossAt = 0.35 + 0.4 * hash11(seed * 19.7 + 1.3);

  // HOVER EFFECT 2, SHIVER (bible 4.3a): "the word visibly reconsiders itself
  // and settles". Pushing the cell back BELOW its own crossover is what makes a
  // spiked re-roll rate visible at all -- an assembled cell is pinned to its
  // 6-D matched slot glyph and has nothing left to re-roll. So for 250 ms the
  // cell returns to the density LUT, churns at the spiked rate, and then
  // re-crosses as the envelope decays: each cell at its OWN frozen threshold,
  // so the word re-forms one cell at a time rather than snapping back.
  //
  // The DENSITY is untouched by this. The word never stops being legible while
  // it is doing it -- only which letters it is made of changes.
  float glyphResolve = resolve - shiver * SHIVER_UNSETTLE;
  float strikeFlag = mix(strikeRest, slotStrike, step(crossAt, glyphResolve));

  // OVERSTRIKE_PASS is an int define, so it is compared as one -- GLSL ES has
  // no implicit int/float conversion and will not compare the two.
  //
  // The two passes are NOT a partition, and that is the difference from the
  // inverted version. Every cell is drawn in pass 0; the struck ones are drawn
  // AGAIN in pass 1, offset, at the heavy weight. That is what "a second glyph
  // struck into the same cell" means -- an inverted cell replaced its glyph,
  // an overstruck one adds to it.
#if OVERSTRIKE_PASS > 0
  if (strikeFlag < 0.5) { degenerate(); return; }
#endif

  // a cell whose glyph would be blank is not worth 84 fragments
  if (density * uMaxCov < 0.005) { degenerate(); return; }

  // -- glyph ---------------------------------------------------------------
  float bucket = clamp(floor(density * uBuckets), 0.0, uBuckets - 1.0);
  // the shiver spikes the RE-ROLL RATE by shortening the mean interval, which
  // the closed form takes without any state to keep: shorten it and the cell is
  // simply further along its own sequence. Nothing has to remember it happened.
  float rerollMean = REROLL_MEAN_S * uDegrade.y / mix(1.0, SHIVER_RATE, shiver);
  int variant = int(variantAt(seed, uTime, uVariants,
                              rerollMean, REROLL_RATE_JITTER, REROLL_JITTER));
#if OVERSTRIKE_PASS > 0
  // THE SECOND IMPRESSION IS ALWAYS THE HEAVY WEIGHT (bible 3.4a). This
  // register exists to be dark; letting it jitter down to 200 would produce
  // cells that are overstruck and yet lighter than their unstruck neighbours.
  float row = uStrikeRow;
  // ...and a DIFFERENT glyph from the one underneath, on the SAME re-roll
  // clock. Same bucket, so the tone is right either way; the next channel
  // along, so the two impressions are two letterforms rather than one
  // letterform with a drop shadow. Giving the strike its own clock instead
  // doubles the churn in the darkest cells on the page, which is the one place
  // bible 3.5's anti-strobe rule can least afford it.
  variant = int(mod(float(variant) + 1.0, uVariants));
#else
  float row = weightRow(seed);
#endif
  vec4 lutTexel = texelFetch(uLut, ivec2(int(bucket), int(row)), 0);
  float gid = floor(lutTexel[variant] * 255.0 + 0.5);

  // A RESOLVING CELL CROSSES OVER TO ITS 6-D MATCHED SLOT GLYPH, and it does
  // so at its OWN resolve level (bible 4.1 step 3 wants the directional match;
  // a shared threshold would make the whole word snap on one frame). The
  // per-cell threshold turns that snap into a dissolve for the price of one
  // hash.
  // A slot glyph of 0 is the sentinel for "use the density LUT": glyph 0 is
  // the space at the lightest weight and can never be a real slot.
  //
  // THE STRIKE NEVER TAKES THE SLOT GLYPH. Bible 3.4a says both impressions
  // are "chosen by the same density lookup", and there is a reason beyond
  // obedience: the slot glyph is picked for the DIRECTION of the letterform
  // passing through the cell, so using it twice would draw the same character
  // twice and the cell would read as bold rather than as struck.
#if OVERSTRIKE_PASS == 0
  float slotGid = floor(Bd.a * 255.0 + 0.5);
  if (hasSlot > 0.5 && slotGid > 0.5 && glyphResolve > crossAt) gid = slotGid;
#endif

  vec4 guv = texelFetch(uGlyphUv, ivec2(int(gid), 0), 0);
  vUv = mix(guv.xy, guv.zw, position);

  // -- colour --------------------------------------------------------------
  // CHROMATIC INK IS MISREGISTRATION, NEVER FILL (bible 3.3). Which ink a cell
  // gets is baked at layout time as a stable function of cell index, so the
  // fringe cannot crawl; the 4% budget is enforced there too. The one place it
  // is allowed to spike is a beam strike, and that is over in a second.
  vec3 col = uInk;
  if (fringeKind > 2.5) {
    // HOVER EFFECT 3, THE FRINGE (bible 4.3a): the one hover that may spend
    // chromatic ink -- a one-cell ghost on the leading edge of a stem, which is
    // "what makes a hovered word feel PRINTED rather than lit". It fades in on
    // the same spring as the other three and is gone when the pointer leaves,
    // so a page nobody is pointing at spends none of the 4% budget on it.
    vec3 fr = hash11(seed * 71.3) < 0.5 ? uFringeA : uFringeB;
    col = mix(uInk, fr, ghost * FRINGE_WEIGHT);
  } else if (fringeKind > 0.5) {
    vec3 fr = fringeKind < 1.5 ? uFringeA : uFringeB;
    col = mix(uInk, fr, FRINGE_WEIGHT);
  }
  if (struck > 0.15) {
    vec3 fr = hash11(seed * 71.3) < 0.5 ? uFringeA : uFringeB;
    col = mix(col, fr, clamp(struck, 0.0, 1.0) * FRINGE_WEIGHT);
  }
  vColor = col;

  // -- to the screen -------------------------------------------------------
#if OVERSTRIKE_PASS > 0
  // THE OFFSET, and it is the whole artefact (bible 3.4a): a third of a cell
  // across and a tenth down. Across is the big one because a monospace cell is
  // taller than wide, so a third of the width is a smaller absolute move than
  // a third of the height would be -- it reads as a slipped impression rather
  // than as two separate characters sharing a cell.
  pos += vec2(OVERSTRIKE_X, OVERSTRIKE_Y) * uCellPx;
#endif
  vec2 half_ = uCellPx * 0.5;
  vec2 corner = (position - 0.5) * uCellPx;
  if (spin != 0.0) {
    float s = sin(spin), c = cos(spin);
    corner = vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
  }
  vec2 screen = pos + half_ + corner - uCameraPx;
  vec2 ndc = screen / uViewportPx * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uAtlas;
// NO PAPER COLOUR IN HERE, and its absence is load-bearing. An inverted cell is
// made by filling the quad with ink and knocking the glyph out of it in paper;
// a fragment shader with no paper colour cannot draw one whatever the rest of
// the pipeline believes. test/type.test.js asserts this file never gets it back.

in vec2 vUv;
in vec3 vColor;
out vec4 fragColor;

void main() {
  float a = texture(uAtlas, vUv).r;
  // DENSITY IS THE MEDIUM (bible 1.2). A glyph is ink or it is not; lightness
  // comes from picking a lighter glyph, NEVER from fading one to grey.
  //
  // BOTH PASSES ARE IDENTICAL HERE, and that is the point. The overstrike pass
  // draws a glyph exactly like the opaque one -- same ink, same threshold, no
  // block, no knockout, nothing that could put a rectangle on the page. The
  // only thing that makes it dark is that there are now two of them in the
  // cell. The inverted version of this file had a branch right here that
  // painted a solid ink block and knocked the glyph out of it in paper, and
  // that branch IS the black rectangles.
  if (a < 0.5) discard;
  fragColor = vec4(vColor, 1.0);
}
`;

// ---------------------------------------------------------------------------

function dataTexture(data, w, h, format, type, wrap = THREE.ClampToEdgeWrapping) {
  const t = new THREE.DataTexture(data, w, h, format, type);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.wrapS = wrap;
  t.wrapT = wrap;
  t.generateMipmaps = false;
  // R8 rows are not 4-byte aligned at every width, and the default unpack
  // alignment of 4 shears the atlas by a pixel per row when they are not.
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

/**
 * createFieldRenderer({ atlasImage, ramp, lut, scope })
 *
 * Owns every GPU object the type layer has. `scope` is a lifecycle scope
 * (src/utils/lifecycle.js) -- everything allocated here is registered into it,
 * so one dispose() at the end takes all of it and renderer.info.memory returns
 * to baseline. Nothing in this file calls addEventListener.
 */
export function createFieldRenderer({ atlasImage, ramp, lut, scope }) {
  const ink = srgbTriple(siteConfig.color.ink);
  const fringeA = srgbTriple(siteConfig.color.fringeA);
  const fringeB = srgbTriple(siteConfig.color.fringeB);
  // THE PAPER COLOUR IS NOT A UNIFORM ANY MORE. It existed for exactly one
  // thing -- painting the knockout inside an inverted cell -- and inversion is
  // gone from the field (bible 3.4a). The page's paper is the CSS background;
  // nothing this shader draws is ever paper-coloured, which is precisely what
  // makes a black rectangle unreachable.

  // ---- textures ----------------------------------------------------------
  const atlasTex = dataTexture(atlasImage.data, atlasImage.width, atlasImage.height,
                               THREE.RedFormat, THREE.UnsignedByteType);
  const lutTex = dataTexture(lut.data, lut.buckets, lut.rows,
                             THREE.RGBAFormat, THREE.UnsignedByteType);

  const uvTable = new Float32Array(ramp.glyphs.length * 4);
  for (let i = 0; i < ramp.glyphs.length; i++) {
    const g = ramp.glyphs[i];
    uvTable[i * 4] = g.uv[0];
    uvTable[i * 4 + 1] = g.uv[1];
    uvTable[i * 4 + 2] = g.uv[2];
    uvTable[i * 4 + 3] = g.uv[3];
  }
  const uvTex = dataTexture(uvTable, ramp.glyphs.length, 1,
                            THREE.RGBAFormat, THREE.FloatType);

  // THE CELL DATA TEXTURES COVER THE WHOLE MAP AND WRAP (bible 7.1a), and the
  // wrap mode is the entire implementation of the torus. Walking off the west
  // edge samples the east panel's texels; there is no branch, no modulo and no
  // special case in the shader, and a bigger map gets the same behaviour free.
  //
  // WebGL2 permits REPEAT on a non-power-of-two texture, which WebGL1 did not --
  // this is one of the two places the site's WebGL2 requirement is load-bearing
  // rather than incidental.
  //
  // (re)allocated by setDataSize when the lattice changes. They start at 1x1 so
  // the material always has something bound.
  const CELL_WRAP = THREE.RepeatWrapping;
  let cellA = dataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType, CELL_WRAP);
  let cellB = dataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType, CELL_WRAP);

  // ---- uniforms ----------------------------------------------------------
  // shared by both materials, so the two draws can never disagree about the
  // world -- and so "write ten uniforms" is literally ten writes, not twenty.
  const HITS = M.scatter.maxActive;
  const WORDS = W.maxWords;
  const uniforms = {
    uCellPx: { value: new THREE.Vector2(7, 12) },
    uViewportPx: { value: new THREE.Vector2(1, 1) },
    uCellOrigin: { value: new THREE.Vector2(0, 0) },
    uCameraPx: { value: new THREE.Vector2(0, 0) },
    uTransit: { value: new THREE.Vector4(1, 0, 0, 0) },
    uTime: { value: 0 },
    uPointerDoc: { value: new THREE.Vector2(-99999, -99999) },
    uGatherRadius: { value: M.gather.radiusPx },
    uGatherInner: { value: M.gather.innerFraction },
    uMew: { value: new THREE.Vector4(0, 0, 60, 0) },
    uHits: { value: Array.from({ length: HITS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uHitDirs: { value: Array.from({ length: HITS }, () => new THREE.Vector4(1, 0, 0, 0)) },
    // FLAT Float32Arrays for the two vec3 arrays, not arrays of Vector3:
    // three's uniform flattener passes a numeric array straight through to
    // gl.uniform3fv, so this is one upload of 3*WORDS floats with nothing
    // allocated per frame -- which is the whole reason the per-word state is
    // three floats and not an object graph.
    uWordState: { value: new Float32Array(WORDS * 3) },
    uWordBox: { value: new Float32Array(WORDS * 3) },
    uLoadScale: { value: 1 },
    uDegrade: { value: new THREE.Vector2(1, 1) },
    uMaxCov: { value: lut.maxCov },
    uBuckets: { value: lut.buckets },
    uVariants: { value: lut.variants },
    uStrikeRow: { value: Math.max(0, lut.rows - 1) },
    // overwritten by field.js once it has solved the counter cap against the
    // measured coverage curve. 0 until then, i.e. a counter is bare paper,
    // which is the safe direction to be wrong in.
    uCounterDensity: { value: 0 },
    uDataSize: { value: new THREE.Vector2(1, 1) },
    uCellA: { value: cellA },
    uCellB: { value: cellB },
    uLut: { value: lutTex },
    uGlyphUv: { value: uvTex },
    uAtlas: { value: atlasTex },
    uInk: { value: new THREE.Vector3(...ink) },
    uFringeA: { value: new THREE.Vector3(...fringeA) },
    uFringeB: { value: new THREE.Vector3(...fringeB) }
  };

  // every tunable that is CONSTANT for the session goes in as a #define rather
  // than a uniform: it keeps the per-frame uniform count honest (bible 7.3's
  // budget is "about ten uniform writes"), and it lets the compiler fold them.
  const defines = (overstrike) => ({
    HIT_COUNT: HITS,
    WORD_COUNT: WORDS,
    OVERSTRIKE_PASS: overstrike ? 1 : 0,
    OVERSTRIKE_X: F.overstrike.offsetCellsX.toFixed(6),
    OVERSTRIKE_Y: F.overstrike.offsetCellsY.toFixed(6),
    DRIFT_HZ: M.drift.hz.toFixed(6),
    DRIFT_RATIO: M.drift.hzRatio.toFixed(6),
    DRIFT_RATE_JITTER: M.drift.rateJitter.toFixed(6),
    DRIFT_WAVE_CELLS: M.drift.waveCells.toFixed(6),
    DRIFT_COHERENT: M.drift.coherentCells.toFixed(6),
    DRIFT_GRAIN: M.drift.grainCells.toFixed(6),
    DRIFT_WANDER: M.drift.wanderCells.toFixed(6),
    REROLL_MEAN_S: M.drift.glyphRerollMeanS.toFixed(6),
    REROLL_RATE_JITTER: M.drift.rerollRateJitter.toFixed(6),
    REROLL_JITTER: M.drift.rerollJitter.toFixed(6),
    SLOT_OFFSET_MAX: M.gather.slotOffsetMaxCells.toFixed(6),
    THIN_AMOUNT: M.gather.thinAmount.toFixed(6),
    // SELF-ASSEMBLY (bible 4.3). The stagger is carried as a FRACTION of the
    // duration rather than in seconds, because that is the form the per-cell
    // maths wants and converting it here means the shader never sees a clock it
    // could disagree with the CPU about.
    ASSEMBLE_STAGGER: (M.assemble.staggerS / M.assemble.durationS).toFixed(6),
    ASSEMBLE_ORDER_W: M.assemble.orderWeight.toFixed(6),
    REST_RESOLVE: M.assemble.restResolve.toFixed(6),
    HOLD_DRIFT: M.assemble.holdDrift.toFixed(6),
    // HOVER (bible 4.3a), all four effects
    SHARPEN_GAIN: M.hover.sharpenGain.toFixed(6),
    COUNTER_CUT: M.hover.counterCut.toFixed(6),
    SHIVER_RATE: M.hover.shiverRate.toFixed(6),
    SHIVER_UNSETTLE: M.hover.shiverUnsettle.toFixed(6),
    HOVER_STEM_D: M.hover.fringeStemDensity.toFixed(6),
    BREATH_CELLS: M.hover.breathCells.toFixed(6),
    BREATH_HZ: M.hover.breathHz.toFixed(6),
    // ...and what is left of the pointer (bible 4.3)
    POINTER_LIFT: M.gather.pointerLift.toFixed(6),
    POINTER_CALM: M.gather.pointerCalm.toFixed(6),
    // MIGRATE (bible 5, 7.1a), the fifth verb
    MIGRATE_STAGGER: siteConfig.transit.migrateStagger.toFixed(6),
    MIGRATE_PEAK: siteConfig.transit.migratePeak.toFixed(6),
    CORRIDOR_HALF: M.scatter.corridorHalfWidthPx.toFixed(6),
    MUZZLE_FALLOFF: M.scatter.muzzleFalloff.toFixed(6),
    AXIAL_FRACTION: M.scatter.axialFraction.toFixed(6),
    TUMBLE_RAD: M.scatter.tumbleRad.toFixed(6),
    SMUDGE: M.scatter.smudge.toFixed(6),
    ARRIVAL_SPREAD: M.scatter.arrivalSpreadS.toFixed(6),
    SETTLE_K: M.settle.impulseRate.toFixed(6),
    MEW_REACH: F.mewClearRadii.toFixed(6),
    MEW_PUSH: F.mewPushCells.toFixed(6),
    MEW_THIN: F.mewThin.toFixed(6),
    FRINGE_WEIGHT: siteConfig.fringe.weightScale.toFixed(6)
  });

  const makeMaterial = (overstrike) => new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms,
    defines: defines(overstrike),
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: false,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide   // the spin can turn a quad inside out
  });

  const matOpaque = makeMaterial(false);
  const matOverstrike = makeMaterial(true);

  // ---- geometry ----------------------------------------------------------
  // one quad. Six vertices rather than four plus an index buffer: at one
  // geometry for the whole page the two extra vertices are free, and it keeps
  // the instanced path in three off its indexed branch.
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    0, 0, 1, 0, 0, 1,
    0, 1, 1, 0, 1, 1
  ]), 2));
  // the position attribute is 2-component (this shader writes clip space
  // itself and never needs a z), and three's bounding-volume maths assumes 3 --
  // it reads past the end of every vertex and computes a NaN radius. Handing it
  // an infinite sphere up front means it never tries: nothing here is ever
  // culled or raycast anyway (see frustumCulled below).
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-Infinity, -Infinity, -Infinity),
    new THREE.Vector3(Infinity, Infinity, Infinity)
  );
  geometry.computeBoundingSphere = () => {};
  geometry.computeBoundingBox = () => {};
  let cellAttr = null;
  let maxInstances = 0;
  // has anything rendered with the cell textures yet? see writeRegion.
  let uploaded = false;

  const meshOpaque = new THREE.Mesh(geometry, matOpaque);
  const meshOverstrike = new THREE.Mesh(geometry, matOverstrike);
  // FRUSTUM CULLING OFF, both of them. The bounding volume of an instanced
  // geometry sits at the geometry's own origin, which here is the page's top
  // left corner and almost always off camera -- the instances silently vanish
  // otherwise. Paid for once already on the mew side (HANDOFF.md).
  meshOpaque.frustumCulled = false;
  meshOverstrike.frustumCulled = false;
  // the base impression first, then the strike on top of it: two draws, in
  // that order, every frame. The order is not cosmetic -- the strike is the
  // SECOND pass of a two-colour print, and it lands on top.
  meshOpaque.renderOrder = 0;
  meshOverstrike.renderOrder = 1;

  const scene = new THREE.Scene();
  scene.add(meshOpaque);
  scene.add(meshOverstrike);
  const camera = new THREE.Camera();   // the shader writes clip space directly

  // ---- lifecycle ---------------------------------------------------------
  const api = {
    uniforms,
    scene,
    camera,

    /**
     * (re)allocate the instance grid for a viewport. Instances cover the
     * VIEWPORT plus budget.instanceMarginCells on every side -- never the
     * document (bible 7.3). The margin is what stops a cell that has drifted
     * or been blown in from the edge from popping.
     */
    setViewport(viewportW, viewportH, cell) {
      uniforms.uViewportPx.value.set(viewportW, viewportH);
      uniforms.uCellPx.value.set(cell.w, cell.h);
      const m = B.instanceMarginCells;
      const cols = Math.ceil(viewportW / cell.w) + m * 2;
      const rows = Math.ceil(viewportH / cell.h) + m * 2;
      const n = cols * rows;
      if (n > maxInstances) {
        // grow with headroom so a slow drag-resize is not one buffer
        // reallocation per pixel.
        maxInstances = Math.ceil(n * 1.25);
        const arr = new Float32Array(maxInstances * 2);
        if (cellAttr) geometry.deleteAttribute("aCell");
        cellAttr = new THREE.InstancedBufferAttribute(arr, 2);
        // it is written on resize and never again -- the whole point of the
        // analytic field is that this buffer is untouched per frame.
        cellAttr.setUsage(THREE.StaticDrawUsage);
        geometry.setAttribute("aCell", cellAttr);
      }
      const arr = cellAttr.array;
      for (let y = 0, i = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++, i++) {
          arr[i * 2] = x;
          arr[i * 2 + 1] = y;
        }
      }
      cellAttr.needsUpdate = true;
      geometry.instanceCount = n;
      return { cols, rows, instances: n };
    },

    /** (re)allocate the document-grid data textures. Layout change only. */
    setDataSize(cols, rows, dataA, dataB) {
      cellA.dispose();
      cellB.dispose();
      cellA = dataTexture(dataA, cols, rows, THREE.RGBAFormat, THREE.UnsignedByteType, CELL_WRAP);
      cellB = dataTexture(dataB, cols, rows, THREE.RGBAFormat, THREE.UnsignedByteType, CELL_WRAP);
      uniforms.uCellA.value = cellA;
      uniforms.uCellB.value = cellB;
      uniforms.uDataSize.value.set(cols, rows);
      // brand new textures: back to "nothing on the GPU yet"
      uploaded = false;
    },

    /** the whole texture again. Layout change only -- never per frame. */
    uploadAll() {
      cellA.needsUpdate = true;
      cellB.needsUpdate = true;
    },

    /**
     * texSubImage2D over just the changed region -- what a route change costs.
     * `patchA/patchB` are Uint8Arrays of w*h*4 covering the rect at (x, y).
     *
     * three does this through copyTextureToTexture, which is texSubImage2D
     * underneath. The scratch textures are transient and disposed immediately:
     * a route swap that leaked one texture per navigation is exactly the leak
     * class 1 the plan's section 6 asks to be able to assert away.
     */
    writeRegion(renderer, x, y, w, h, patchA, patchB) {
      if (w <= 0 || h <= 0) return;
      // BEFORE THE FIRST DRAW THERE IS NOTHING TO PATCH. The cell textures do
      // not exist on the GPU until something renders with them, and a
      // texSubImage2D into a texture that has never been uploaded is a write
      // into nothing -- which is exactly what it looked like: the CPU arrays
      // held the words, every uniform was right, and the page showed no words
      // at all until something forced a full upload.
      //
      // It is also the case where a partial upload buys nothing: the whole
      // texture is going up on first use regardless. So say so, and let the
      // ordinary needsUpdate path do it.
      if (!uploaded) { api.uploadAll(); return; }
      const srcA = dataTexture(patchA, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
      const srcB = dataTexture(patchB, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
      const at = new THREE.Vector2(x, y);
      try {
        renderer.copyTextureToTexture(srcA, cellA, null, at);
        renderer.copyTextureToTexture(srcB, cellB, null, at);
      } catch (e) {
        // a partial upload is an optimization, never a correctness
        // requirement. If three's signature moves under us, fall back to the
        // full upload rather than silently rendering stale cells.
        console.warn("[type] partial cell upload failed, falling back to full", e);
        api.uploadAll();
      }
      srcA.dispose();
      srcB.dispose();
    },

    /**
     * EXACTLY TWO DRAW CALLS. One renderer.render() over a scene holding two
     * meshes; three resets renderer.info at the top of every render(), so
     * reading renderer.info.render.calls straight after this returns the
     * field's own count and nothing else -- which is how the acceptance test
     * gets to assert 2 rather than eyeball it.
     */
    render(renderer) {
      renderer.render(scene, camera);
      uploaded = true;
    },

    dispose() {
      geometry.dispose();
      matOpaque.dispose();
      matOverstrike.dispose();
      atlasTex.dispose();
      lutTex.dispose();
      uvTex.dispose();
      cellA.dispose();
      cellB.dispose();
      scene.remove(meshOpaque);
      scene.remove(meshOverstrike);
    }
  };

  if (scope) scope.add(api.dispose);
  return api;
}

export default createFieldRenderer;
