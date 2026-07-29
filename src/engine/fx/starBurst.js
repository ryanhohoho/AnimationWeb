// starBurst.js
// four-pointed stars, for the two moments that call for them: the SHINY
// entrance (ported from the games) and the ANNOYANCE stars a hard collision
// knocks out of mew.
//
// WHAT THE GAMES ACTUALLY DO (see HANDOFF for the sources)
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
// THE SHAPE IS AN ASTROID, |x|^(2/3) + |y|^(2/3) <= 1. That is exactly the
// four-pointed twinkle with concave sides that the sprites use, it is one line
// of maths, and it needs no texture -- which matters here because the whole
// scene goes through a low-res pixelate pass and any sprite sheet would be
// resampled to mush on the way.
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
  varying vec2 vP;
  varying float vGold;
  void main() {
    vP = position.xy * 2.0;                       // the quad spans -1..1
    vGold = iAttr.w;
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
  varying vec2 vP;
  varying float vGold;
  void main() {
    // ASTROID: the four-pointed twinkle, concave sides, one line of maths
    float d = pow(abs(vP.x), 0.6667) + pow(abs(vP.y), 0.6667);
    if (d > 1.0) discard;
    // a hard two-tone: bright core, tinted arms. no gradient -- this is a
    // sprite, and the pixelate pass would quantize a gradient anyway
    vec3 tint = mix(edgeColor, goldColor, vGold);
    gl_FragColor = vec4(d < 0.42 ? coreColor : tint, inkAlpha);
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
  geo.setAttribute("iPos", iPos);
  geo.setAttribute("iAttr", iAttr);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      coreColor: { value: new THREE.Color(cfg.coreColor) },
      edgeColor: { value: new THREE.Color(cfg.edgeColor) },
      goldColor: { value: new THREE.Color(cfg.goldColor) },
      inkAlpha: { value: INK_ALPHA }
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
      gold: 0, vx: 0, vy: 0, x0: 0, y0: 0
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
        s.size = an.sizePx * (0.72 + rnd() * 0.56);
        s.delay = w * an.waveGapS + rnd() * an.waveGapS * 0.6;
        s.life = an.lifeLoS + rnd() * (an.lifeHiS - an.lifeLoS);
        s.spin = (rnd() - 0.5) * 2.6;
        s.gold = 1;
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
    const wpp = view.worldPerPx;
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
    }
    iPos.needsUpdate = true;
    iAttr.needsUpdate = true;
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
    dispose() {
      parent.remove(mesh);
      geo.dispose();
      quad.dispose();
      mat.dispose();
    }
  };
}
