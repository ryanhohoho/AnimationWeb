// faceOverlay.js
// the >.< face, drawn ON the eyes rather than sculpted into them.
//
// WHY AN OVERLAY AND NOT A MORPH TARGET
// -------------------------------------
// a >.< is a SYMBOL. It is not what a face does, it is what a cartoonist draws
// instead of what a face does -- the same vocabulary as the sweat drop, the
// anger cross and the spiral eye (manga iconography; see HANDOFF for the
// sources). A morph target has to bend real geometry into the shape of a glyph,
// which on a twenty-pixel face is both harder to author and less legible than
// simply drawing the glyph. The first version of this did exactly that -- a
// `wince` target that closed the lids onto a sloped line -- and it worked, and
// it still read as "eyes shut at an angle" rather than ">.<".
//
// So: two quads, one per eye, living in the HEAD BONE's frame so they ride
// every head turn for free. Each one paints over the painted eye with the skin
// colour and stamps a chevron on top. When the flail ends they simply stop
// drawing and the eyes are back -- there is no state to unwind.
//
// WHERE THE EYES ARE comes out of the glb (`mesh.userData.eyes`), measured by
// tools/facemorph.py off the same ink mask the blink is built from. Repaint the
// eyes, rebuild, and the overlay follows them; nothing here hard-codes a
// position.
//
// THE QUADS LIE ON THE FACE, they do not float in front of it. Mew's eyes are
// not on the front of the head -- they are on the sides of a ball, on facets
// tilted about 31 degrees outward, and the surface under one eye falls away by
// 0.22 units across the eye's own width. A front-facing quad at the eye's
// deepest nearby z sat 0.11 units proud of the surface it was covering, and
// every degree the head turned slid the painted eye out from behind it: that is
// the "you can see the original eyes at certain angles". So the builder ships a
// tangent PLANE per eye -- surface point plus outward normal -- and each quad is
// laid on it and stretched so it still spans the same x/y footprint despite
// being tilted. Standoff is now a couple of hundredths along the normal, and the
// parallax that goes with it is a couple of hundredths too.
//
// AND THE EYE UNDERNEATH IS SHUT. belt and braces, and it is free: the blink
// morph already exists and already closes these exact eyes onto a line, so the
// overlay drives it to full while it is up. Whatever is left to leak is a
// one-pixel seam rather than an eye. It relaxes as the glyph is whipped off,
// which is the eyes OPENING again -- the thing the owner asked for.
//
// FACING, twice. The quads have depth testing off, so they always draw over the
// face -- which is right up until the head turns away, at which point they would
// draw over the BACK of the skull. So (a) the whole thing fades out by how
// squarely the head faces the camera, and (b) each quad ALSO fades by its own
// normal, so the eye on the far side of a turned head goes round the side of the
// skull instead of sitting on top of the muzzle. Both are a dot product.

import * as THREE from "three";
import { INK_ALPHA } from "./spriteShade.js";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;                       // -1..1 across the quad
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// the chevron is an SDF so it stays crisp at any size: distance to the two
// arms of a V, thresholded. Drawn into a patch of skin that hides the painted
// eye underneath.
const FRAG = /* glsl */ `
  uniform vec3  patchColor;
  uniform vec3  inkColor;
  uniform float dir;        // +1 draws >, -1 draws <
  uniform float amount;     // 0..1, how far the glyph is drawn on
  uniform float thick;
  uniform float inkAlpha;
  varying vec2 vUv;

  // distance to a segment
  float seg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    if (amount <= 0.001) discard;
    // the patch that covers the painted eye. squared-off corners would show as
    // a sticker, so this is a superellipse following the eye's own oval.
    // (NOT named patch -- that is a RESERVED WORD in GLSL ES, and the shader
    // then silently fails to compile, which shows up as nothing being drawn.)
    vec2 q = abs(vUv);
    float oval = length(vec2(pow(q.x, 2.2), pow(q.y, 2.2)));
    if (oval > 1.0) discard;

    // the glyph, opening AWAY from the nose so the pair reads as >  <
    vec2 p = vec2(vUv.x * dir, vUv.y);
    float d = min(seg(p, vec2(-0.55, 0.72), vec2(0.5, 0.0)),
                  seg(p, vec2(-0.55, -0.72), vec2(0.5, 0.0)));
    // it is DRAWN ON, tip first, so the glyph appears rather than fades in --
    // a fade reads as a dissolve, and a symbol should snap
    float grow = smoothstep(0.55 - amount * 1.55, -0.15 - amount * 0.2, p.x);
    float on = step(d, thick) * grow;
    vec3 col = mix(patchColor, inkColor, on);
    gl_FragColor = vec4(col, inkAlpha);
  }
`;

/**
 * @param rig     the built rig (needs bones.head and the rest pose)
 * @param eyes    mesh.userData.eyes from the glb, one per painted eye:
 *                {cx, cy, hx, hy, z} and, on a current build, the tangent plane
 *                {zc, n:[x,y,z]}. Without the plane it degrades to the old
 *                front-facing quad at `z`.
 * @param mesh    the skinned mesh, so the blink can be shut underneath. Optional.
 */
export function createFaceOverlay({ rig, eyes, config, world, view, mesh }) {
  const cfg = config;
  if (!rig?.bones?.head || !eyes || eyes.length < 2) return null;

  const head = rig.bones.head;
  const rest = rig.rest.get(head);
  if (!rest) return null;

  // a node whose children live in the MODEL's own coordinates even though it
  // hangs off the head bone: undo the head's rest transform once, and the eye
  // boxes can be used exactly as the builder measured them.
  const faceRoot = new THREE.Object3D();
  faceRoot.matrixAutoUpdate = false;
  faceRoot.matrix.compose(rest.charPos, rest.charQuat, new THREE.Vector3(1, 1, 1))
    .invert();
  head.add(faceRoot);

  const uniforms = [];
  const quads = [];
  const _ux = new THREE.Vector3();
  const _uy = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _basis = new THREE.Matrix4();
  for (const e of eyes) {
    const u = {
      patchColor: { value: new THREE.Color(0xffffff) },
      inkColor: { value: new THREE.Color(cfg.inkColor) },
      dir: { value: e.cx >= 0 ? -1 : 1 },     // both glyphs open away from the nose
      amount: { value: 0 },
      thick: { value: cfg.thickness },
      inkAlpha: { value: INK_ALPHA }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    // the tangent plane. `n` is the surface normal at the eye and `zc` the
    // surface's own depth there; without them (an older glb, or a synthetic eye
    // box in a test) this collapses to the flat front-facing quad it used to be.
    _n.set(...(e.n || [0, 0, 1]));
    if (_n.lengthSq() < 1e-6) _n.set(0, 0, 1);
    _n.normalize();
    // an in-plane basis anchored to WORLD X, so the glyph stays upright and the
    // pair still opens left/right however the facet is tilted
    _ux.set(1 - _n.x * _n.x, -_n.x * _n.y, -_n.x * _n.z).normalize();
    _uy.crossVectors(_n, _ux).normalize();
    _basis.makeBasis(_ux, _uy, _n);
    m.quaternion.setFromRotationMatrix(_basis);
    // standoff is measured along the NORMAL but applied along z, so the quad's
    // centre still lands on (cx, cy) instead of sliding toward the nose
    m.position.set(e.cx, e.cy, (e.zc ?? e.z) + cfg.liftZ / Math.max(_n.z, 0.2));
    // a tilted quad covers less x than it is wide, so widen it back out: it has
    // to hide the same painted eye either way
    m.scale.set(e.hx * 2 * cfg.padX / Math.max(_ux.x, 0.2),
      e.hy * 2 * cfg.padY / Math.max(_uy.y, 0.2), 1);
    m.renderOrder = 8;
    m.frustumCulled = false;
    m.visible = false;
    faceRoot.add(m);
    uniforms.push(u);
    quads.push(m);
  }

  let t = -1;
  let hit = 0;
  if (world) {
    world.on("flail", (e) => {
      t = 0;
      hit = Math.max(hit, Math.min(1, e.speed / cfg.fullSpeed));
    });
  }

  // the blink target closes these exact eyes onto a line -- see
  // tools/facemorph.py -- so the overlay can shut them underneath itself and
  // stop worrying about what might peek out. It runs after faceMorphs in the
  // pose stack, so this write is the last word for the frame.
  const infl = mesh?.morphTargetInfluences || null;
  const iBlink = mesh?.morphTargetDictionary?.blink ?? -1;

  const _fwd = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _qn = new THREE.Vector3();
  let shown = 0;
  const fade = (v, lo, hi) => Math.min(Math.max((v - lo) / (hi - lo), 0), 1);

  return {
    name: "faceOverlay",
    /** how strongly the glyph is drawn, 0..1 (exposed for the tests) */
    get amount() { return shown; },
    /** the quads themselves, so the tests can check where they ended up */
    get meshes() { return quads; },
    /** the flail envelope drives it; `skin` is the lit body colour to patch with */
    setPatch(rgb) {
      const d = cfg.patchDim;
      for (const u of uniforms) {
        u.patchColor.value.setRGB(rgb[0] * d, rgb[1] * d, rgb[2] * d);
      }
    },
    update(ctx) {
      const dt = ctx.dt;
      let amount = 0;
      if (t >= 0) {
        t += dt;
        const u = t / cfg.durS;
        amount = u < cfg.attack ? u / cfg.attack
          : (u > 1 - cfg.release ? Math.max(0, (1 - u) / cfg.release) : 1);
        if (t >= cfg.durS) {
          t = -1;
          hit = 0;
        }
      }
      amount *= hit;
      // FACING: the quads ignore depth so they can sit on top of the face, which
      // means nothing stops them sitting on top of the back of the head either.
      head.getWorldQuaternion(_q);
      _fwd.set(0, 0, 1).applyQuaternion(_q);
      amount *= fade(_fwd.z, cfg.facingLo, cfg.facingHi);
      shown = amount;
      // SHUT THE EYE UNDERNEATH while the glyph is up, and let it open again as
      // the glyph is whipped off. Never lower than what faceMorphs already asked
      // for, so an ordinary blink mid-flail still blinks.
      if (iBlink >= 0 && infl) {
        infl[iBlink] = Math.max(infl[iBlink],
          Math.min(amount / cfg.closeAt, 1) * cfg.closeAmount);
      }
      const on = amount > 0.001;
      for (let i = 0; i < quads.length; i++) {
        // ...and PER QUAD, by the facet the eye is painted on. On a turned head
        // the far eye is round the side of the skull, where a real painted eye
        // would be hidden by the muzzle -- but these ignore depth, so without
        // this it would sit on top of it instead.
        quads[i].getWorldDirection(_qn);
        const a = amount * fade(_qn.z, cfg.quadFacingLo, cfg.quadFacingHi);
        quads[i].visible = on && a > 0.001;
        uniforms[i].amount.value = a;
      }
    },
    dispose() {
      quads.forEach((m) => {
        faceRoot.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      head.remove(faceRoot);
    }
  };
}
