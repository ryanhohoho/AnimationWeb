// tail_probe.js
// measures whether the tail folds through itself. runs the REAL rig + tail sim
// headlessly through a deliberately violent scenario (hard direction flips,
// startles, high agitation) and reports:
//
//   maxBend   worst angle between consecutive segments, degrees. >90 is a fold.
//   selfMin   closest approach between NON-adjacent particles, as a fraction of
//             the mean segment length. below ~0.5 the tail is lying on itself.
//   torsion   mean |twist| of the bending plane along the chain, degrees per
//             joint. near 0 = planar (folds); high = helical (spirals).
//
//   node test/tail_probe.js            # current config
//   node test/tail_probe.js --flat     # waveSwirl/unfold off, i.e. the old behaviour

import * as THREE from "three";
import { loadGlbHeadless } from "./glbHeadless.js";
import { rigConfig } from "../src/config/rigConfig.js";
import { createWorld } from "../src/engine/world.js";
import { createBody } from "../src/engine/physics/body2d.js";
import { createBrain } from "../src/engine/behavior/brain.js";
import { buildRig } from "../src/engine/pose/rig.js";
import { createPoser } from "../src/engine/pose/poser.js";
import { createBodyPose } from "../src/engine/pose/bodyPose.js";
import { createLimbPose } from "../src/engine/pose/limbPose.js";
import { createHeadLook } from "../src/engine/pose/headLook.js";
import { createEarSprings } from "../src/engine/pose/earSprings.js";
import { createTailChain } from "../src/engine/pose/tailChain.js";

const FLAT = process.argv.includes("--flat");
if (FLAT) {
  rigConfig.tail.waveSwirl = 0;
  rigConfig.tail.unfoldSwirl = 0;
  rigConfig.tail.selfSepMul = 0;
  rigConfig.tail.angleSoftness = 0.25;
  rigConfig.tail.constraintIters = 3;
}

const gltf = await loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url));
const cfg = rigConfig;
const world = createWorld({ headless: true, seed: 4242 });
world.viewport = { w: 1280, h: 800, dpr: 1 };
world.docSize = { w: 1280, h: 2400 };
world.colliders = [];
world.collidersVersion = 1;

const model = gltf.scene;
const rig = buildRig(model, cfg.boneRoles);
const view = {
  worldPerPx: 0.01, modelScale: (150 * 0.01) / rig.height,
  toWorldX: (px) => px, toWorldY: (px) => px
};
const body = createBody({ x: 640, y: 1200, radius: 60, config: cfg.physics });
const brain = createBrain({
  body, world, config: cfg.behavior, pathConfig: cfg.path, attackConfig: cfg.attack
});
const ctx = {
  rig, body, brain, world, view, dt: 0, time: 0,
  shared: {
    bodyQuat: new THREE.Quaternion(), swimPhase: 0, swimAlign: 0,
    headYawRate: 0, headPitchRate: 0
  },
  visual: { bobPx: { x: 0, y: 0 } }
};
const tailLayer = createTailChain({ config: cfg, world });
const poser = createPoser(ctx, [
  createBodyPose({ config: cfg, world, squashGroup: new THREE.Group() }),
  createLimbPose({ config: cfg, world }),
  createHeadLook({ config: cfg, world }),
  createEarSprings({ config: cfg, world }),
  tailLayer
]);

const DT = 1 / 120;
let maxBend = 0;
let selfMin = Infinity;
let torsionSum = 0;
let torsionN = 0;
let folds = 0;
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();
const n1 = new THREE.Vector3();
const n2 = new THREE.Vector3();

for (let step = 0; step < 120 * 45; step++) {
  const t = step * DT;
  // violent: cursor whipping around + periodic hard shoves + high agitation
  world.time = t;
  world.pointer.active = true;
  world.pointer.pos = {
    x: 640 + Math.cos(t * 2.7) * 520,
    y: 1200 + Math.sin(t * 3.9) * 440
  };
  world.pointer.speed = 2000;
  world.pointer.lastMoveAt = t;
  if (step % 90 === 0) {
    body.vel.x += (Math.sin(t * 11) > 0 ? 1 : -1) * 1500;
    body.vel.y += Math.cos(t * 7) * 1100;
    brain.agitation = 1;
  }
  brain.step(DT);
  body.step(DT);
  ctx.time = t;
  poser.update(DT, t);

  if (step < 240) continue;               // let it settle first
  const P = tailLayer.getParticles();
  if (!P) continue;
  let meanLen = 0;
  for (let i = 1; i < P.length; i++) meanLen += P[i].p.distanceTo(P[i - 1].p);
  meanLen /= P.length - 1;

  for (let i = 2; i < P.length; i++) {
    a.copy(P[i - 1].p).sub(P[i - 2].p).normalize();
    b.copy(P[i].p).sub(P[i - 1].p).normalize();
    const ang = (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI;
    if (ang > maxBend) maxBend = ang;
    if (ang > 90) folds++;
    // twist of the bending plane between consecutive joints
    if (i >= 3) {
      c.copy(P[i - 2].p).sub(P[i - 3].p).normalize();
      n1.crossVectors(c, a);
      n2.crossVectors(a, b);
      if (n1.lengthSq() > 1e-8 && n2.lengthSq() > 1e-8) {
        n1.normalize(); n2.normalize();
        torsionSum += (Math.acos(Math.max(-1, Math.min(1, n1.dot(n2)))) * 180) / Math.PI;
        torsionN++;
      }
    }
  }
  for (let i = 0; i < P.length; i++) {
    for (let k = i + 2; k < P.length; k++) {
      selfMin = Math.min(selfMin, P[i].p.distanceTo(P[k].p) / meanLen);
    }
  }
}

const label = FLAT ? "FLAT (old planar wave)" : "SWIRL (current)";
console.log(`${label}
  maxBend  ${maxBend.toFixed(1)} deg   (>90 = folded back on itself)
  folds    ${folds} joint-frames past 90 deg
  selfMin  ${selfMin.toFixed(2)} x segment  (<0.5 = lying on itself)
  torsion  ${(torsionSum / Math.max(torsionN, 1)).toFixed(1)} deg/joint  (0 = planar, high = helical)`);
