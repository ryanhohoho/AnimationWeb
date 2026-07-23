// tail_turn.js  (diagnostic, not a pass/fail gate)
// drives the body through hard, fast turns and measures whether the tail keeps
// its ROOT anchored to the body or swings free "on its length". reports:
//
//   baseAng  max angle between the body-carried rigid base direction and the
//            actual first sim segment. this is the "turn on its length" number:
//            if the base can point 90 deg off the body, the whole tail flops.
//   rootRate max rotation rate of the body/root quat, deg/s (how fast it turns)
//   maxBend  worst consecutive-segment bend, deg (>90 = folded)
//   folds    joint-frames past 90 deg
//   selfMin  closest non-adjacent approach, x mean segment (<0.5 = on itself)

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

const gltf = await loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url));
const cfg = rigConfig;
const world = createWorld({ headless: true, seed: 321 });
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
const body = createBody({ x: 640, y: 400, radius: 60, config: cfg.physics });
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

const rootRestInv = rig.rest.get(rig.bones.root).charQuat.clone().invert();
const _rootQ = new THREE.Quaternion();
const _prevRootQ = new THREE.Quaternion();
const _rd = new THREE.Vector3();
const _sd = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();

const DT = 1 / 120;
const maxV = cfg.physics.maxSpeed;
let baseAng = 0, rootRate = 0, maxBend = 0, folds = 0, selfMin = Infinity;
let havePrev = false;

for (let step = 0; step < 120 * 40; step++) {
  const t = step * DT;
  world.time = t;
  // hard turning: velocity direction sweeps fast and periodically snaps the
  // other way, so the body is forced to keep whipping around
  const w = 7.0;                              // base angular sweep rate
  const snap = Math.sin(t * 0.7) > 0 ? 1 : -1; // reverse the sweep twice a cycle
  const dir = w * snap * t;
  body.vel.x = Math.cos(dir) * maxV;
  body.vel.y = Math.sin(dir) * maxV;
  body.accel.x = -Math.sin(dir) * maxV * w;
  body.accel.y = Math.cos(dir) * maxV * w;
  body.pos.x += body.vel.x * DT;
  body.pos.y += body.vel.y * DT;
  // keep it on-screen-ish so nothing clamps weirdly
  body.pos.x = 640 + ((body.pos.x - 640) % 400);
  body.pos.y = 400 + ((body.pos.y - 400) % 300);
  brain.agitation = 1;
  ctx.time = t;
  poser.update(DT, t);

  // the root delta the tail actually used this frame
  rig.charQuatOf(rig.bones.root, _rootQ).multiply(rootRestInv);
  if (havePrev) {
    const dq = _prevRootQ.angleTo(_rootQ);
    rootRate = Math.max(rootRate, (dq / DT) * 180 / Math.PI);
  }
  _prevRootQ.copy(_rootQ);
  havePrev = true;

  if (step < 240) continue;                  // settle
  const P = tailLayer.getParticles();
  if (!P) continue;

  // base-vs-body angle: rigid base direction (rest dir carried by the body)
  // vs the real first sim segment
  _rd.copy(rig.tailRest.dirs[0]).applyQuaternion(_rootQ).normalize();
  _sd.copy(P[1].p).sub(P[0].p).normalize();
  const ba = Math.acos(Math.max(-1, Math.min(1, _rd.dot(_sd)))) * 180 / Math.PI;
  if (ba > baseAng) baseAng = ba;

  let meanLen = 0;
  for (let i = 1; i < P.length; i++) meanLen += P[i].p.distanceTo(P[i - 1].p);
  meanLen /= P.length - 1;
  for (let i = 2; i < P.length; i++) {
    a.copy(P[i - 1].p).sub(P[i - 2].p).normalize();
    b.copy(P[i].p).sub(P[i - 1].p).normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI;
    if (ang > maxBend) maxBend = ang;
    if (ang > 90) folds++;
  }
  for (let i = 0; i < P.length; i++)
    for (let k = i + 2; k < P.length; k++)
      selfMin = Math.min(selfMin, P[i].p.distanceTo(P[k].p) / meanLen);
}

console.log(`FAST-TURN
  baseAng  ${baseAng.toFixed(1)} deg   (base segment vs body rigid dir; high = flops on its length)
  rootRate ${rootRate.toFixed(0)} deg/s (peak body turn rate)
  maxBend  ${maxBend.toFixed(1)} deg   (>90 = folded)
  folds    ${folds} joint-frames past 90 deg
  selfMin  ${selfMin.toFixed(2)} x segment  (<0.5 = lying on itself)`);
