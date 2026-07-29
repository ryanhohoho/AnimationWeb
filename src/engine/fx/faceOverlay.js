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
// FACING. The quads have depth testing off, so they always draw over the face --
// which is right up until the head turns away, at which point they would draw
// over the BACK of the skull. So the whole thing fades out by how squarely the
// head is facing the camera, which is cheap and exact.

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
 * @param eyes    mesh.userData.eyes from the glb: [{cx, cy, hx, hy, z}, ...]
 */
export function createFaceOverlay({ rig, eyes, config, world, view }) {
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
    m.position.set(e.cx, e.cy, e.z + cfg.liftZ);
    m.scale.set(e.hx * 2 * cfg.padX, e.hy * 2 * cfg.padY, 1);
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

  const _fwd = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  let shown = 0;

  return {
    name: "faceOverlay",
    /** how strongly the glyph is drawn, 0..1 (exposed for the tests) */
    get amount() { return shown; },
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
      amount *= Math.min(Math.max((_fwd.z - cfg.facingLo)
        / (cfg.facingHi - cfg.facingLo), 0), 1);
      shown = amount;
      const on = amount > 0.001;
      for (let i = 0; i < quads.length; i++) {
        quads[i].visible = on;
        uniforms[i].amount.value = amount;
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
