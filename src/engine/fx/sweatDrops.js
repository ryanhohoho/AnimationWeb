// sweatDrops.js
// 汗マーク — the panic sweat, thrown off in waves.
//
// WHAT THE SYMBOL ACTUALLY MEANS, AND WHY THIS ONE IS THE VIOLENT VERSION
// ----------------------------------------------------------------------
// The sweat mark is one glyph with a range, and the range is set by how many
// there are and whether they are falling or flying:
//
//   ONE, hanging at the temple      bewildered, embarrassed, lost for words
//   ONE, small, on the cheek        apprehensive, flustered, tense
//   MANY, dripping                  sweating profusely: shocked, frozen in fear
//   MANY, FLUNG OFF                 absolute panic — the whole body flinched
//
// This is the last one. It is not a drip; it is what comes off an animal that
// has just been startled hard enough to move before it has finished looking.
// So the drops LEAVE — fast, in a spray, several waves of them — and none of
// them is ever seen falling. That last part is the tell, and it is deliberate:
// a drop that arcs over and comes down reads as weight and gravity, which is a
// slow idea. Each one is culled just past the top of its arc, while it is still
// travelling, and another wave is already on its way out behind it.
//
// It is the same vocabulary as the >.< the wall-bump draws (fx/faceOverlay.js)
// — a thing a cartoonist draws INSTEAD of what a face does — and it is built
// the same way as the annoyance stars that go with it (fx/starBurst.js):
// instanced billboards, the shape solved in the fragment shader, no texture,
// written at INK_ALPHA so the pixelate pass treats them as art and the outline
// pass gives them the same dark border as the character.
//
// THE SHAPE IS SOLVED, NOT DRAWN. Half-width down the drop is
//
//     w(y) = sqrt(1 - y²) · sqrt((1 - y) / 2)
//
// which is exactly the teardrop and is two square roots. At the base the first
// factor goes as sqrt(1 + y), so the bottom is CIRCULAR; at the tip the two
// together go as (1 - y), so the top is a straight-sided POINT. Everything
// else about the drop — the dark keyline, the two white specular dots, the
// cyan body — is a band test on the same function, which is how the reference
// draws it and how it survives the low-res pass.
//
// THE TIP TRAILS. A flung droplet leads with its heavy round end and streams
// its point out behind, and it TURNS as it goes over the top of its arc. The
// quad's angle is recomputed from the instantaneous velocity every frame, so
// the drop rotates through its own flight for free, and it stretches along
// that axis by how fast it is going.

import * as THREE from "three";
import { mulberry32 } from "../../utils/math.js";
import { INK_ALPHA } from "./spriteShade.js";

const VERT = /* glsl */ `
  attribute vec3 iPos;      // offset from the character, in view space units
  attribute vec4 iAttr;     // x rotation, y size, z alive, w stretch
  uniform vec2 xMap;        // x = half-span of the bent shape, y = its centre
  varying vec2 vP;
  void main() {
    // The quad spans -1..1 in the DROP'S OWN space, and the geometry under it
    // is stretched along the long axis — so the same solved shape is drawn
    // longer, and a fast drop is a streak while a slow one is a bead.
    //
    // vP must NOT be un-stretched to compensate. Dividing it by the stretch was
    // the first thing I tried and it quietly destroys the drop: it squeezes the
    // sampled y toward zero, the half-width profile stops varying across the
    // quad, and a shape whose width is constant in y is a RECTANGLE. Every drop
    // rendered as a teardrop sitting on a dark slab.
    // the sign of the stretch carries the CURL HANDEDNESS — mirroring the
    // sampled x flips which way the tip hooks, and costs nothing
    float st = abs(iAttr.w);
    vP = vec2(position.x * 2.0 * sign(iAttr.w), position.y * 2.0);
    // widened by the same half-span the fragment side maps through, so pixels
    // stay square however far the drop is bent
    vec2 local = position.xy * vec2(xMap.x, st) * (iAttr.y * step(0.5, iAttr.z));
    float c = cos(iAttr.x);
    float s = sin(iAttr.x);
    vec2 q = mat2(c, -s, s, c) * local;
    // billboard: offset in VIEW space, so a drop never turns edge-on
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
    mv.xy += q;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 bodyColor;
  uniform vec3 lineColor;
  uniform vec3 hiColor;
  uniform float keyline;      // dark border, as a fraction of the drop
  uniform float curve;        // how far the tip hooks over
  uniform vec2  xMap;         // x = half-span of the bent shape, y = its centre
  uniform float inkAlpha;
  varying vec2 vP;

  // half-width down the teardrop. 0.7698 is the profile's own maximum, so
  // dividing by it makes the drop fill the quad it is given.
  float halfW(float y) {
    float yy = clamp(y, -1.0, 1.0);
    return sqrt(max(0.0, 1.0 - yy * yy)) * sqrt(max(0.0, (1.0 - yy) * 0.5)) / 0.7698;
  }
  // AND THE DROP IS BENT. A straight teardrop is a raindrop; the one that gets
  // drawn on a panicking face is a COMMA — its point hooks over. The spine is
  // displaced by t² along the length, so the base stays put and all of the bend
  // gathers in the last third where the taper is, which is where a real flung
  // droplet's tail whips round.
  float spineAt(float y) {
    float t = (y + 1.0) * 0.5;          // 0 at the base, 1 at the point
    return curve * t * t;
  }
  // THE QUAD IS MAPPED ONTO THE SHAPE'S OWN BOUNDING BOX, which is what lets
  // the bend be large. The first version squeezed the sampled x by a fudge
  // factor to stop the curve running out of a square quad, and that squeeze is
  // precisely a flattening: the harder you bend it the more it gets compressed
  // back, so past a certain point turning the curve up did nothing visible at
  // all. The box is measured off the profile instead (in JS, once) and handed
  // in, so the shape always exactly fills the quad however far it hooks.
  float shapeX(float px) { return px * xMap.x + xMap.y; }
  bool inDrop(vec2 p) {
    return abs(p.y) <= 1.0 && abs(shapeX(p.x) - spineAt(p.y)) <= halfW(p.y);
  }

  void main() {
    if (!inDrop(vP)) discard;
    // the keyline is the SAME shape shrunk about its own middle rather than an
    // outline traced round it: one more evaluation of the profile, and it stays
    // an even weight all the way to the point, where a traced outline pinches
    const vec2 CEN = vec2(0.0, -0.18);
    vec2 q = (vP - CEN) / (1.0 - keyline) + CEN;
    vec3 col = lineColor;
    if (inDrop(q)) {
      col = bodyColor;
      // two specular dots in the fat of the drop, the big one trailing the
      // small one — the arrangement the reference uses, and the thing that
      // makes a flat cyan blob read as WET. They ride the SPINE, so they stay
      // in the body of the drop once it is bent.
      float sx = shapeX(vP.x) - spineAt(vP.y);
      if (length((vec2(sx, vP.y) - vec2(-0.24, -0.06)) / vec2(0.26, 0.34)) < 1.0) col = hiColor;
      if (length((vec2(sx, vP.y) - vec2(0.06, 0.30)) / vec2(0.10, 0.15)) < 1.0) col = hiColor;
    }
    gl_FragColor = vec4(col, inkAlpha);
  }
`;

const D2R = Math.PI / 180;


/**
 * @param parent  Object3D the spray hangs off (the character root: position
 *                only, no rotation or scale, so px sizes stay px sizes)
 * @param view    the shared view mapping, for worldPerPx
 */
export function createSweatDrops({ parent, config, view }) {
  const cfg = config;
  const total = cfg.waves * cfg.perWave;

  // THE BENT SHAPE'S BOUNDING BOX, measured off the same two functions the
  // shader solves. Sampled rather than derived: the extremes of
  // spine(y) +/- halfW(y) have no tidy closed form, and this runs once.
  let xLo = Infinity, xHi = -Infinity;
  for (let i = 0; i <= 512; i++) {
    const y = -1 + (2 * i) / 512;
    const t = (y + 1) * 0.5;
    const spine = cfg.curve * t * t;
    const w = Math.sqrt(Math.max(0, 1 - y * y))
      * Math.sqrt(Math.max(0, (1 - y) * 0.5)) / 0.7698;
    if (spine + w > xHi) xHi = spine + w;
    if (spine - w < xLo) xLo = spine - w;
  }
  const halfSpan = (xHi - xLo) * 0.5;
  const centre = (xHi + xLo) * 0.5;
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
      bodyColor: { value: new THREE.Color(cfg.bodyColor) },
      lineColor: { value: new THREE.Color(cfg.lineColor) },
      hiColor: { value: new THREE.Color(cfg.hiColor) },
      keyline: { value: cfg.keyline },
      curve: { value: cfg.curve },
      xMap: { value: new THREE.Vector2(halfSpan, centre) },
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
  mesh.renderOrder = 11;              // over the stars, which are over the body
  mesh.visible = false;
  parent.add(mesh);

  const P = [];
  for (let i = 0; i < total; i++) {
    P.push({ x0: 0, y0: 0, vx: 0, vy: 0, size: 0, delay: 0, life: 1, stretch: 1, curl: 1 });
  }
  let t = 0;
  let running = false;

  /**
   * Throw a spray.
   * @param dx,dy  the direction the character is FLEEING, in screen terms with
   *               +y up. The spray goes off around it — the drops are what is
   *               left behind by the flinch, so they trail the escape.
   * @param power  0..1, how hard it was startled
   */
  function burst(dx, dy, power = 1, seed = 1) {
    const rnd = mulberry32(seed >>> 0);
    const p = Math.min(Math.max(power, 0), 1);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;

    // TWO CLUSTERS, ONE EITHER SIDE OF THE HEAD, TAKING TURNS — and each one
    // fired like a SHOTGUN.
    //
    // The three of a cluster leave at the exact same instant, from points spread
    // around a circle centred on her, each flying straight out along its own
    // radius. That is what makes it read as coming OUT OF her rather than
    // appearing near her: the drops are already arranged on an expanding ring
    // the moment they exist, and their bulbous ends all point outward because
    // outward is the way each of them is going.
    //
    // No stagger inside a cluster. The three used to leave a few milliseconds
    // apart, and that reads as a trickle; a spray has to be simultaneous or it
    // is not a spray.
    const outward = Math.PI * 0.5 - cfg.sideSpreadDeg * D2R;   // up and out
    // ...carried by the escape. NEGATIVE: angles run counter-clockwise, so a
    // positive offset leans the spray the wrong way — against the flight.
    const lean = -ux * cfg.escapeLeanDeg * D2R;
    const minEl = cfg.minElevDeg * D2R;

    let i = 0;
    for (let w = 0; w < cfg.waves; w++) {
      const side = w % 2 === 0 ? 1 : -1;
      const decay = Math.pow(cfg.waveDecay, w);
      const centreAng = (side > 0 ? outward : Math.PI - outward) + lean;
      // ONE delay for the whole cluster: they go together or not at all
      const delay = w * cfg.waveGapS;

      for (let k = 0; k < cfg.perWave; k++, i++) {
        const s = P[i];
        // -0.5 .. 0.5 across the cluster
        const slot = cfg.perWave === 1 ? 0 : k / (cfg.perWave - 1) - 0.5;

        let ang = centreAng
          + side * slot * cfg.fanDeg * D2R
          + (rnd() - 0.5) * cfg.jitterDeg * D2R;
        // never below the horizontal: a drop that starts by falling is a drip,
        // the calm end of this glyph and the opposite of what is being drawn
        if (Math.sin(ang) < Math.sin(minEl)) {
          ang = Math.cos(ang) >= 0 ? 2 * minEl - ang
                                   : 2 * (Math.PI - minEl) - ang;
        }

        // ON THE RADIUS, and travelling straight down it
        const r = cfg.spawnRadiusPx * (0.88 + rnd() * 0.24);
        s.x0 = Math.cos(ang) * r;
        s.y0 = cfg.originYPx + Math.sin(ang) * r;

        const sp = (cfg.speedLoPx + rnd() * (cfg.speedHiPx - cfg.speedLoPx))
          * decay * (0.55 + 0.45 * p);
        s.vx = Math.cos(ang) * sp;
        s.vy = Math.sin(ang) * sp;
        s.size = cfg.sizePx * (0.82 + rnd() * 0.3) * decay;
        // the cluster SPLAYS: the drops on either side of it hook outward, so
        // three commas open like a hand rather than sitting parallel
        s.curl = slot === 0 ? (rnd() < 0.5 ? 1 : -1) : Math.sign(slot) * side;

        // CULLED AT THE TOP OF THE ARC. Time to apex is vy/g; a shade past it
        // is the whole of the life. Nothing is ever seen coming down.
        const apex = Math.max(0.001, s.vy) / cfg.gravityPx;
        s.life = Math.min(cfg.lifeMaxS, apex * cfg.apexOvershoot);
        s.delay = delay;
        s.stretch = 1;
      }
    }
    active = i;
    geo.instanceCount = active;
    t = 0;
    running = true;
    mesh.visible = true;
  }

  function update(dt) {
    if (!running) return;
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

      // BALLISTIC, CLOSED FORM: nothing accumulates, so a dropped frame cannot
      // shake a drop off its arc
      const ts = t - s.delay;
      const vy = s.vy - cfg.gravityPx * ts;
      iPos.array[j] = (s.x0 + s.vx * ts) * wpp;
      iPos.array[j + 1] = (s.y0 + s.vy * ts - 0.5 * cfg.gravityPx * ts * ts) * wpp;
      iPos.array[j + 2] = cfg.zOffset;

      // the tip streams out BEHIND the motion, and turns with it: local +y is
      // the point, and a rotation by (velocity angle + 90 deg) lays that axis
      // down the flight path pointing backwards
      iAttr.array[k] = Math.atan2(vy, s.vx) + Math.PI / 2;

      // IT GROWS AS IT GOES, and then it is gone. Scaled, not faded — these are
      // sprites, and an alpha ramp on a two-tone shape only makes it grey.
      //
      // The first version popped to full size and shrank away, which reads as
      // RECEDING: a thing getting smaller is a thing going into the distance,
      // and these are meant to be coming off her toward the viewer. Growing
      // through the flight reads as gaining instead, and it is also what the
      // drawn version does — the artist scales the drop up as it leaves so the
      // eye can follow it. The vanish is kept to the last tenth so it is a
      // disappearance rather than a shrink.
      const inS = Math.min(1, u / cfg.popInFrac);
      const grow = cfg.growFrom + (cfg.growTo - cfg.growFrom) * u;
      const outS = 1 - smooth01((u - cfg.holdFrac) / (1 - cfg.holdFrac));
      iAttr.array[k + 1] = s.size * inS * grow * outS * wpp;
      iAttr.array[k + 2] = 1;

      // and it STREAKS by how fast it is going, so the spray is longest at the
      // moment it leaves and beads up as it slows over the top
      const sp = Math.hypot(s.vx, vy);
      // sign carries the curl handedness; magnitude is the streak
      iAttr.array[k + 3] = s.curl * (1 + Math.min(cfg.stretchMax, sp / cfg.stretchPerPx));
    }
    iPos.needsUpdate = true;
    iAttr.needsUpdate = true;
    if (done) {
      running = false;
      mesh.visible = false;
    }
  }

  return {
    burst,
    update,
    get running() { return running; },
    /** live particle state, for the tests */
    get particles() { return P; },
    get mesh() { return mesh; },
    dispose() {
      parent.remove(mesh);
      geo.dispose();
      quad.dispose();
      mat.dispose();
    }
  };
}

function smooth01(x) {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
}
