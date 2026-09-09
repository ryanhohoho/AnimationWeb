// starBurst.js
// four-pointed stars, for the two moments that call for them: the SHINY
// entrance (ported from the games) and the ANNOYANCE stars a hard collision
// knocks out of mew.
//
// WHAT THE GAMES ACTUALLY DO (sources recorded in the comments below)
// -------------------------------------------------------
// Bulbapedia's one-line definition is the whole brief: a Shiny Pokémon "is
// surrounded by a FLASH OF STARS OR LIGHT, which is accompanied by a pinging
// sound effect." Per generation, the documented shape of it is:
//
//   Gen II-V   a burst of small star sparkles around the sprite
//   Gen VI     "white stars appear around the Pokémon"
//   Gen VII    "a large golden star appears in front of the Pokémon"
//   Gen VIII   two variants chosen by the personality value -- STARS (15/16)
//              or SQUARES (1/16, "glistening"). the probabilities are inverted
//              in raids and wild encounters because of a bug
//   Gen IX     plays on entering battle only, not in the overworld
//
// so the effect here is built out of those four documented beats, in order:
//
//   1. FLASH        the character blows out to white for ~0.2 s
//                   (fx/spriteShade.js owns this half -- it has to happen
//                   inside the material or the painted eyes stay dark through
//                   a flash that is supposed to wash out the whole sprite)
//   2. RING BURST   white stars around the character, thrown outward on an
//                   ease-out and popping as they go            [Gen II-VI]
//   3. HERO STAR    one large golden star in front, held longer  [Gen VII]
//   4. RISING MOTES a few stragglers drifting up and twinkling
//
// TWO SHAPES, AND THEY ARE NOT THE SAME REFERENCE.
//
// THE TWINKLE IS AN ASTROID, |x|^(2/3) + |y|^(2/3) <= 1. That is exactly the
// four-pointed sparkle with concave sides that the shiny sprites use, it is one
// line of maths, and it needs no texture -- which matters here because the whole
// scene goes through a low-res pixelate pass and any sprite sheet would be
// resampled to mush on the way. The SHINY entrance is all twinkles.
//
// THE ANNOYANCE STAR IS A REGULAR FIVE-POINTED STAR, because that is what the
// vocabulary actually is: a knocked-loose star is the Kirby/manga star, five
// points with straight edges and a fat body, not a sparkle. On the astroid the
// four arms are long, thin and CONCAVE, and at the spin rate these carry that
// reads as a little yellow spikeball rather than a star -- which is the report.
//
// It is a fold-and-halfplane test, exact and branchless. Fold the plane into
// one 72-degree wedge, and inside that wedge the whole boundary is the single
// straight edge from the tip (radius 1) to the waist (radius `starWaist`). A
// point is inside if it is on the origin side of that edge, which is one dot
// product against the edge's un-normalised normal -- no divisions, no atan per
// edge, and the ratio comes out of the config rather than out of a texture.
//
// `starWaist` is the whole character of the shape. 0.382 (1/phi^2) is the
// pentagram-sharp star; the game stars are much plumper than that and the
// points are short. 0.52 is measured off the reference: the waist sits a
// little over half way out, so the body reads round and the points read as
// points rather than as spikes.
//
// THE STARS ARE NOT FADED OUT, THEY ARE SCALED OUT. Sprites do not have alpha
// ramps; a pixel-art twinkle pops in, holds and shrinks away. Alpha is used
// only to cull, so every star that is on screen is fully solid -- and it is
// written at INK_ALPHA, so pixelate treats it as art: no posterizing a white
// star into a grey one, but it still counts as solid for the outline pass and
// picks up the same dark border as the character.

import * as THREE from "three";
import { mulberry32 } from "../../utils/math.js";
import { INK_ALPHA } from "./spriteShade.js";

const VERT = /* glsl */ `
  attribute vec3 iPos;      // offset from the character, in view space units
  attribute vec4 iAttr;     // x rotation, y size, z alive, w gold mix
  attribute float iFive;    // 0 a twinkle, 1 a five-pointed star
  varying vec2 vP;
  varying float vGold;
  varying float vFive;
  void main() {
    vP = position.xy * 2.0;                       // the quad spans -1..1
    vGold = iAttr.w;
    vFive = iFive;
    float c = cos(iAttr.x);
    float s = sin(iAttr.x);
    vec2 q = mat2(c, -s, s, c) * position.xy * (iAttr.y * step(0.5, iAttr.z));
    // billboard: offset in VIEW space, so a star never turns edge-on
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
    mv.xy += q;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 coreColor;
  uniform vec3 edgeColor;
  uniform vec3 goldColor;
  uniform float inkAlpha;
  uniform float starWaist;      // inner radius of the five-pointed star, 0..1
  uniform float starCore;       // ...and where its bright core ends
  varying vec2 vP;
  varying float vGold;
  varying float vFive;

  // FIVE POINTS, FOLDED INTO ONE WEDGE. seg is the 72 degrees between tips;
  // folding by it leaves an angle measured from the nearest tip, and in there
  // the boundary is the single straight edge tip -> waist. Un-normalised
  // normal, so both sides of the test scale together and there is no divide.
  float fivePoint(vec2 p) {
    float seg = 1.25663706;                       // 2*pi/5
    float h   = 0.62831853;                       // half of it: tip to waist
    float a = abs(mod(atan(p.x, p.y) + seg * 0.5, seg) - seg * 0.5);
    vec2 q = vec2(cos(a), sin(a)) * length(p);    // folded, tip along +x
    float nx = starWaist * sin(h);
    float ny = 1.0 - starWaist * cos(h);
    return (q.x * nx + q.y * ny) / nx;            // 0 at the centre, 1 on the edge
  }

  void main() {
    // Both fields are normalised the same way -- 0 in the middle, 1 on the
    // outline -- so the core threshold below is one number for both shapes and
    // the two-tone never has to be re-tuned per shape.
    float d = vFive > 0.5
      ? fivePoint(vP)
      : pow(abs(vP.x), 0.6667) + pow(abs(vP.y), 0.6667);
    if (d > 1.0) discard;
    // a hard two-tone: bright core, tinted arms. no gradient -- this is a
    // sprite, and the pixelate pass would quantize a gradient anyway.
    // The threshold differs per shape only so that the core covers the SAME
    // fraction of the sprite in both -- see rigConfig, starCore.
    float core = vFive > 0.5 ? starCore : 0.42;
    vec3 tint = mix(edgeColor, goldColor, vGold);
    gl_FragColor = vec4(d < core ? coreColor : tint, inkAlpha);
  }
`;

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
// pop: 0 -> 1 -> 0, biased so the star reaches full size early and lingers
const pop = (t) => Math.sin(Math.pow(Math.min(Math.max(t, 0), 1), 0.65) * Math.PI);

/**
 * @param parent  Object3D the burst hangs off (the character root: position
 *                only, no rotation or scale, so px sizes stay px sizes)
 * @param view    the shared view mapping, for worldPerPx
 */
export function createStarBurst({ parent, config, view }) {
  const cfg = config;
  const an = cfg.annoy;
  // one buffer, big enough for whichever burst wants more instances
  const total = Math.max(cfg.ringCount + cfg.heroCount + cfg.moteCount,
    an.waves * an.perWave);
  let active = 0;

  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.attributes.position = quad.attributes.position;
  geo.instanceCount = total;
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);
  const iAttr = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
  const iFive = new THREE.InstancedBufferAttribute(new Float32Array(total), 1);
  geo.setAttribute("iPos", iPos);
  geo.setAttribute("iAttr", iAttr);
  geo.setAttribute("iFive", iFive);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      coreColor: { value: new THREE.Color(cfg.coreColor) },
      edgeColor: { value: new THREE.Color(cfg.edgeColor) },
      goldColor: { value: new THREE.Color(cfg.goldColor) },
      inkAlpha: { value: INK_ALPHA },
      starWaist: { value: cfg.annoy.starWaist },
      starCore: { value: cfg.annoy.starCore }
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;         // the bounding volume is a zero-size quad
  mesh.renderOrder = 10;
  mesh.visible = false;
  parent.add(mesh);

  // per-star state, filled by burst()
  const P = [];
  for (let i = 0; i < total; i++) {
    P.push({
      kind: 0, ang: 0, r0: 0, r1: 0, size: 0, delay: 0, life: 1, spin: 0,
      gold: 0, vx: 0, vy: 0, x0: 0, y0: 0, five: 0
    });
  }
  let t = 0;
  let running = false;

  function shiny(seed = 1) {
    const rnd = mulberry32(seed >>> 0);
    let i = 0;
    // 1. THE RING. stars spread evenly around the character, jittered, thrown
    // outward. even spacing is what makes it read as "surrounded by"; pure
    // random angles clump and look like debris.
    for (let k = 0; k < cfg.ringCount; k++, i++) {
      const s = P[i];
      s.kind = 0;
      s.ang = (k / cfg.ringCount) * TAU + (rnd() - 0.5) * (TAU / cfg.ringCount) * 0.8;
      s.r0 = cfg.ringInnerPx * (0.7 + rnd() * 0.6);
      s.r1 = cfg.ringOuterPx * (0.75 + rnd() * 0.5);
      s.size = cfg.ringSizePx * (0.7 + rnd() * 0.7);
      s.delay = rnd() * cfg.ringStagger;
      s.life = cfg.ringLife * (0.8 + rnd() * 0.4);
      s.spin = (rnd() - 0.5) * 2.2;
      s.gold = 0;
      s.five = 0;
    }
    // 2. THE HERO STAR, gen VII's "large golden star in front of the Pokémon".
    // it sits near the middle, barely travels, and outlasts the ring.
    for (let k = 0; k < cfg.heroCount; k++, i++) {
      const s = P[i];
      s.kind = 1;
      s.ang = -Math.PI / 2 + (rnd() - 0.5) * 1.6;
      s.r0 = 0;
      s.r1 = cfg.heroDriftPx * (0.4 + rnd());
      s.size = cfg.heroSizePx * (k === 0 ? 1 : 0.62);
      s.delay = cfg.heroDelay * k;
      s.life = cfg.heroLife;
      s.spin = (rnd() - 0.5) * 0.7;
      s.gold = 1;
      s.five = 0;
    }
    // 3. STRAGGLERS drifting up and twinkling, so the burst has a tail instead
    // of stopping dead
    for (let k = 0; k < cfg.moteCount; k++, i++) {
      const s = P[i];
      s.kind = 2;
      s.ang = (rnd() - 0.5) * 1.1;
      s.r0 = (rnd() - 0.5) * cfg.ringOuterPx * 0.9;
      s.r1 = cfg.moteRisePx * (0.6 + rnd() * 0.8);
      s.size = cfg.moteSizePx * (0.6 + rnd() * 0.8);
      s.delay = cfg.ringStagger + rnd() * cfg.moteStagger;
      s.life = cfg.moteLife * (0.7 + rnd() * 0.6);
      s.spin = (rnd() - 0.5) * 3.0;
      s.gold = rnd() < 0.35 ? 1 : 0;
      s.five = 0;
    }
    active = cfg.ringCount + cfg.heroCount + cfg.moteCount;
    geo.instanceCount = active;
    t = 0;
    running = true;
    mesh.visible = true;
  }

  // -------------------------------------------------------------------------
  // ANNOYANCE STARS. The manga vocabulary for "that hurt": stars knocked loose
  // and seen circling the head. Mechanically they are the standard game-juice
  // impact burst -- a handful of particles thrown out on an upward-biased cone
  // with a randomised speed and lifetime, pulled back down by gravity so each
  // one draws an ARC, shrinking away at the end.
  //
  // Emitted in WAVES rather than all at once, because the flail lasts a second
  // and a half and a single burst at t=0 would be over before mew stopped
  // waving. Each wave is offset around the head so they do not stack up.
  // -------------------------------------------------------------------------
  // ── FOUR SIZES, NOT A SPREAD ──────────────────────────────────────────
  // The sizes are RUNGS rather than a uniform jitter, because that is what the
  // reference does: one big star and a few smaller ones, each a size you could
  // name, the way a sprite sheet holds four star sizes rather than a continuum.
  // A jitter also cannot be capped — the whole point of the ladder is that the
  // widest is a fixed ratio of the narrowest, and here that ratio is under
  // three, which is the brief.
  //
  // Weighted so the big one is the rare one. Uniform rungs would put a quarter
  // of fifteen stars at full size and the burst reads as one size again.
  const LADDER = an.sizeLadder;
  const WSUM = an.sizeWeights.reduce((a, b) => a + b, 0);
  function rung(u) {
    let acc = u * WSUM;
    for (let k = 0; k < LADDER.length; k++) {
      acc -= an.sizeWeights[k];
      if (acc <= 0) return LADDER[k];
    }
    return LADDER[LADDER.length - 1];
  }

  function annoy(seed = 1) {
    const rnd = mulberry32(seed >>> 0);
    let i = 0;
    for (let w = 0; w < an.waves; w++) {
      for (let k = 0; k < an.perWave; k++, i++) {
        const s = P[i];
        s.kind = 3;
        // spawn on a ring around the head, upper half
        const a = Math.PI * (0.15 + 0.7 * ((k + 0.5) / an.perWave))
          + (rnd() - 0.5) * 0.5;
        s.x0 = Math.cos(a) * an.originPx * (0.6 + rnd() * 0.8);
        s.y0 = an.originYPx + Math.sin(a) * an.originPx * 0.55;
        // thrown out and UP, then gravity does the rest
        const th = (rnd() - 0.5) * an.coneDeg * D2R;
        const sp = an.speedLoPx + rnd() * (an.speedHiPx - an.speedLoPx);
        s.vx = Math.sin(th) * sp + Math.cos(a) * sp * 0.35;
        s.vy = Math.cos(th) * sp;
        s.size = an.sizePx * rung(rnd());
        s.delay = w * an.waveGapS + rnd() * an.waveGapS * 0.6;
        s.life = an.lifeLoS + rnd() * (an.lifeHiS - an.lifeLoS);
        s.spin = (rnd() - 0.5) * 2.6;
        s.gold = 1;
        s.five = 1;
      }
    }
    active = i;
    geo.instanceCount = active;
    t = 0;
    running = true;
    mesh.visible = true;
  }

  function update(dt) {
    if (!running) return 0;
    t += dt;
    // sized in CHARACTER pixels, so it shrinks with her on a narrow screen.
    // The fallback keeps the headless checks, which hand in a bare
    // { worldPerPx: 1 }, working unchanged.
    const wpp = view.fxPerPx ?? view.worldPerPx;
    let done = true;
    for (let i = 0; i < active; i++) {
      const s = P[i];
      const u = (t - s.delay) / s.life;
      const j = i * 3;
      const k = i * 4;
      if (u < 0 || u > 1) {
        iAttr.array[k + 2] = 0;
        if (u < 0) done = false;
        continue;
      }
      done = false;
      const e = easeOut(u);
      let x;
      let y;
      if (s.kind === 3) {
        // BALLISTIC: closed form, so nothing accumulates and a dropped frame
        // cannot make a star drift off its arc
        const ts = t - s.delay;
        x = (s.x0 + s.vx * ts) * wpp;
        y = (s.y0 + s.vy * ts - 0.5 * an.gravityPx * ts * ts) * wpp;
      } else if (s.kind === 2) {
        x = s.r0 * wpp;
        y = (s.r1 * e + Math.sin(s.ang + u * 6.0) * cfg.moteWobblePx) * wpp;
      } else {
        const r = (s.r0 + (s.r1 - s.r0) * e) * wpp;
        x = Math.cos(s.ang) * r;
        y = Math.sin(s.ang) * r;
      }
      iPos.array[j] = x;
      iPos.array[j + 1] = y;
      iPos.array[j + 2] = cfg.zOffset;
      // TWINKLE: a size ripple on top of the pop, so the stars flicker the way
      // a sprite sheet does rather than sliding smoothly to zero
      const tw = 1 + cfg.twinkle * Math.sin(u * cfg.twinkleHz * TAU + i);
      iAttr.array[k] = s.spin * u * TAU * 0.5;
      iAttr.array[k + 1] = s.size * pop(u) * tw * wpp;
      iAttr.array[k + 2] = 1;
      iAttr.array[k + 3] = s.gold;
      iFive.array[i] = s.five;
    }
    iPos.needsUpdate = true;
    iAttr.needsUpdate = true;
    iFive.needsUpdate = true;
    if (done) {
      running = false;
      mesh.visible = false;
    }
    // the FLASH curve, handed back so the caller can drive the material: a
    // near-instant blow-out and a slower fall, which is how the games read.
    // only the shiny entrance flashes -- an annoyance burst is not an entrance.
    if (P[0].kind === 3) return 0;
    const f = t < cfg.flashUpS
      ? t / cfg.flashUpS
      : 1 - (t - cfg.flashUpS) / cfg.flashDownS;
    return Math.min(Math.max(f, 0), 1) * cfg.flashPeak;
  }

  return {
    shiny,
    annoy,
    update,
    get running() { return running; },
    /** what the burst is made of, for the checks. The shape flag and the size
        are the two things a report about "these look wrong" is ever about. */
    _debug: {
      get stars() {
        return P.slice(0, active).map((s) => ({ kind: s.kind, size: s.size, five: s.five }));
      }
    },
    dispose() {
      parent.remove(mesh);
      geo.dispose();
      quad.dispose();
      mat.dispose();
    }
  };
}
