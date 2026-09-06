// sweatDrops.js
// 汗マーク — the panic sweat, thrown off in three waves.
//
// WHAT THE SYMBOL MEANS, AND WHY THIS IS THE VIOLENT VERSION
// ----------------------------------------------------------
// The sweat mark is one glyph with a range, set by how many there are and
// whether they are falling or flying:
//
//   ONE, hanging at the temple      bewildered, embarrassed, lost for words
//   ONE, small, on the cheek        apprehensive, flustered, tense
//   MANY, dripping                  shocked, frozen in fear
//   MANY, FLUNG OFF                 absolute panic -- the whole body flinched
//
// This is the last one. It is not a drip; it is what comes off an animal that
// has been startled hard enough to move before it has finished looking. So the
// drops LEAVE, and none of them is ever seen falling: a drop that arcs over and
// comes down reads as weight, which is a slow idea. Each is culled just past the
// top of its arc, still travelling.
//
// WHAT WAS WRONG WITH THE ONE BEFORE THIS, since all three faults had one cause
// -------------------------------------------------------------------------
// 1. THEY SPUN. The quad carried a rotation attribute recomputed from the
//    instantaneous velocity every frame, plus a randomly-signed curl handedness.
//    That is not a tuning problem: as long as the shape is defined in the drop's
//    own frame and then turned, which way it hooks on screen is an attribute.
//    There is no rotation anywhere in this file. The tail direction lives in the
//    geometry, and a drop with no orientation cannot spin.
// 2. THEY ALL WENT AT ONCE. Four waves 0.12 s apart against a life three times
//    longer meant twelve drops in the air together: a cloud, not three throws.
// 3. THEY WERE FIVE TEXELS LONG. fx/pixelate.js renders at 1/4 resolution, so
//    the old 20 px drop was five texels, with two specular dots of ONE texel
//    each inside it. The teardrop profile, the keyline and both speculars were
//    solved exactly and then thrown away by the pass that draws them. Everything
//    here is sized in texels first.
//
// THE SHAPE IS A SWEEP, AND THE HOOK IS FREE
// -------------------------------------------
// A disc at the head, swept along the bezier of the path the drop has JUST
// FLOWN, with the radius falling to nothing at the tip. There is no hook term
// and no bend parameter: the curve IS the hook, and it is curved because the
// flight was. Under a closed-form ballistic the trailing path is exactly a
// quadratic bezier -- see fx/sweatGeometry.js, which owns all of that maths and
// is testable without a GPU.
//
// Built like the annoyance stars it arrives with (fx/starBurst.js): instanced
// billboards, the silhouette solved in the fragment shader, no texture, written
// at INK_ALPHA so the pixelate pass treats them as art and the outline pass
// gives them the character's own dark border.

import * as THREE from "three";
import { mulberry32 } from "../../utils/math.js";
import { INK_ALPHA } from "./spriteShade.js";
import { waveSchedule, layout, dropFrame } from "./sweatGeometry.js";

const VERT = /* glsl */ `
  attribute vec3 iPos;    // head position, offset from the character, view units
  attribute vec4 iAttr;   // x half-extent px, y bulb radius px, z alive, w hand
  attribute vec4 iTail;   // bezier control and tip, px, relative to the head
  uniform   float wpp;    // world units per screen pixel
  varying   vec2  vP;
  varying   vec4  vTail;
  varying   vec2  vRH;
  void main() {
    // THE QUAD IS SQUARE, AXIS-ALIGNED AND CENTRED ON THE HEAD, sized on the
    // cpu to hold the tail whichever way it points. An oriented box would be
    // maybe 40% tighter, and orienting it is exactly what used to put a rotation
    // on the drop. At a quarter resolution the whole spray is about four
    // thousand texels either way, so the tighter box buys nothing and costs the
    // one attribute that was making them spin.
    float hw = iAttr.x * step(0.5, iAttr.z);
    vP    = position.xy * 2.0 * hw;      // PlaneGeometry(1,1) spans -0.5..0.5
    vTail = iTail;
    vRH   = vec2(iAttr.y, iAttr.w);
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
    mv.xy += vP * wpp;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = (cfg) => /* glsl */ `
  uniform vec3  bodyColor;
  uniform vec3  hiColor;
  uniform float taperExp;
  uniform vec4  hiShape;   // x offset along the lead, y semi-axis along,
                           // z semi-axis across (both in bulb radii), w tilt rad
  uniform float inkAlpha;
  varying vec2  vP;
  varying vec4  vTail;
  varying vec2  vRH;

  // EXACT distance to a tapered segment: the circle at a with radius ra swept to
  // the circle at b with radius rb. Written in the segment's own frame, because
  // that is where the argument is readable -- the external tangent of the two
  // circles is the line x*sc + y*cc = ra there, so the middle case is one dot
  // product and the two ends are the circles themselves.
  //
  // It degenerates correctly when one circle swallows the other: sc clamps to 1,
  // cc falls to 0, every fragment lands in the first case, which is the larger
  // circle. The tip needs that, because the last segment is a cone to a point
  // and the one before it is barely longer than its own radius.
  float sdTaper(vec2 p, vec2 a, vec2 b, float ra, float rb) {
    vec2  ba = b - a;
    float l  = max(length(ba), 1e-4);
    vec2  u  = ba / l;
    vec2  pa = p - a;
    vec2  q  = vec2(dot(pa, u), abs(pa.y * u.x - pa.x * u.y));
    float sc = clamp((ra - rb) / l, -1.0, 1.0);
    float cc = sqrt(max(0.0, 1.0 - sc * sc));
    float k  = q.x * cc - q.y * sc;
    if (k < 0.0)    return length(q) - ra;
    if (k > l * cc) return length(q - vec2(l, 0.0)) - rb;
    return q.x * sc + q.y * cc - ra;
  }

  // the sweep. A union of DISCS was the obvious first version and it is wrong
  // twice: it scallops along the spine, and near the tip -- where the radius
  // falls below the sample spacing -- it comes apart into a dotted line.
  float sdDrop(vec2 p, vec2 c, vec2 e, float r0) {
    float d  = length(p) - r0;
    vec2  pv = vec2(0.0);
    float rp = r0;
    for (int i = 1; i <= ${cfg.tailSegs}; i++) {
      float t = float(i) * ${(1 / cfg.tailSegs).toFixed(8)};
      float s = 1.0 - t;
      vec2  q = (2.0 * s * t) * c + (t * t) * e;
      float r = r0 * pow(max(s, 1e-4), taperExp);
      d  = min(d, sdTaper(p, pv, q, rp, r));
      pv = q; rp = r;
    }
    return d;
  }

  void main() {
    float r0 = vRH.x;
    vec2  c  = vTail.xy;
    vec2  e  = vTail.zw;

    // HARD EDGE, ON PURPOSE, AND fwidth WOULD BREAK THE FRAME.
    // The alpha channel here is a CLASSIFIER, not a coverage (fx/alphaFlags.js):
    // pixelate discards under 0.5 and switches the outline colour at 0.65. An
    // antialiased edge writing inkAlpha * coverage lands on FX_ALPHA to within a
    // rounding error somewhere in its fringe, and every drop would be rimmed in
    // the hyper beam's hot outline. This is not a tuning question, it is a
    // protocol violation -- and the pixelate pass rings the silhouette for free
    // anyway, which is where the drawn mark's border comes from.
    if (sdDrop(vP, c, e, r0) > 0.0) discard;

    vec3 col = bodyColor;

    // THE SPECULAR sits in the fat of the head, pushed toward the LEADING edge
    // -- the side with no tail on it -- and tilted off the axis so the head does
    // not read as a symmetric bead. The leading direction is free: it is the way
    // the tail is not, and the first control point is exactly minus half the
    // velocity times the tail time, so -c normalised IS the heading.
    vec2 n = (dot(c, c) > 1e-6) ? normalize(-c) : vec2(1.0, 0.0);
    vec2 m = vec2(-n.y, n.x);
    vec2 h = vP - n * (hiShape.x * r0);
    float ca = cos(hiShape.w * vRH.y);
    float sa = sin(hiShape.w * vRH.y);
    vec2 g = vec2(dot(h, n), dot(h, m));
    g = vec2(g.x * ca - g.y * sa, g.x * sa + g.y * ca);
    g /= vec2(max(hiShape.y * r0, 1e-3), max(hiShape.z * r0, 1e-3));
    if (dot(g, g) < 1.0) col = hiColor;

    gl_FragColor = vec4(col, inkAlpha);
  }
`;

const D2R = Math.PI / 180;

/**
 * @param parent  an Object3D carrying POSITION ONLY, so px stay px
 * @param config  rigConfig.sweat
 * @param view    the shared view mapping, for worldPerPx
 */
export function createSweatDrops({ parent, config, view }) {
  const cfg = config;
  const total = cfg.waves * cfg.perWave;

  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.attributes.position = quad.attributes.position;
  geo.instanceCount = 0;

  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3);
  const iAttr = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
  const iTail = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
  geo.setAttribute("iPos", iPos);
  geo.setAttribute("iAttr", iAttr);
  geo.setAttribute("iTail", iTail);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      bodyColor: { value: new THREE.Color(cfg.bodyColor) },
      hiColor: { value: new THREE.Color(cfg.hiColor) },
      taperExp: { value: cfg.taperExp },
      hiShape: {
        value: new THREE.Vector4(cfg.hiOffset, cfg.hiAlong, cfg.hiAcross,
          cfg.hiTiltDeg * D2R)
      },
      wpp: { value: 1 },
      inkAlpha: { value: INK_ALPHA }
    },
    vertexShader: VERT,
    fragmentShader: FRAG(cfg),
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;         // the bounding volume is a zero-size quad
  mesh.renderOrder = 11;              // over the stars, which are over the body
  mesh.visible = false;
  parent.add(mesh);

  let P = [];                         // the launches, from sweatGeometry
  let t = 0;
  let running = false;
  let span = 0;

  /**
   * @param dx,dy the direction she is FLEEING, screen terms with +y UP
   * @param power 0..1, how hard she was startled
   * @param seed  picks which temple leads. It is the only thing left that is
   *              random: the arcs themselves are a designed constant now.
   */
  function burst(dx, dy, power = 1, seed = 1) {
    const rnd = mulberry32(seed >>> 0);
    const len = Math.hypot(dx, dy) || 1;
    const escX = dx / len;
    P = layout(cfg, escX, rnd() < 0.5 ? -1 : 1);
    span = waveSchedule(cfg).total;
    t = 0;
    running = true;
    mesh.visible = true;
    geo.instanceCount = P.length;
    // nothing is alive on frame zero except wave one; the rest hold at zero
    for (let i = 0; i < P.length; i++) iAttr.array[i * 4 + 2] = 0;
    iAttr.needsUpdate = true;
    return P.length;
  }

  function update(dt) {
    if (!running) return;
    t += dt;
    // sized in CHARACTER pixels, so it shrinks with her on a narrow screen.
    // The fallback keeps the headless checks, which hand in a bare
    // { worldPerPx: 1 }, working unchanged.
    const wpp = view.fxPerPx ?? view.worldPerPx;
    mat.uniforms.wpp.value = wpp;

    for (let i = 0; i < P.length; i++) {
      const d = P[i];
      const f = dropFrame(d, t - d.delay, cfg);
      const j = i * 3, k = i * 4;
      if (!f.alive) { iAttr.array[k + 2] = 0; continue; }
      iPos.array[j] = f.ax * wpp;
      iPos.array[j + 1] = f.ay * wpp;
      iPos.array[j + 2] = cfg.zOffset;
      iAttr.array[k] = f.half;
      iAttr.array[k + 1] = f.r0;
      iAttr.array[k + 2] = 1;
      iAttr.array[k + 3] = f.hand;
      iTail.array[k] = f.cx;
      iTail.array[k + 1] = f.cy;
      iTail.array[k + 2] = f.ex;
      iTail.array[k + 3] = f.ey;
    }
    iPos.needsUpdate = true;
    iAttr.needsUpdate = true;
    iTail.needsUpdate = true;

    // THE SPAN IS KNOWN BEFORE THE FIRST FRAME. Every drop has the same life and
    // the waves are laid end to end, so when the spray ends is arithmetic rather
    // than a poll over nine particles.
    if (t >= span) {
      running = false;
      mesh.visible = false;
      geo.instanceCount = 0;
    }
  }

  return {
    burst,
    update,
    get running() { return running; },
    /** live launch state, for the tests */
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
