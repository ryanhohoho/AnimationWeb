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
//   jitter    the rattlesnake number. the tip's position RELATIVE TO ITS OWN
//             BASE (so flying in a circle does not count as the tail moving),
//             minus a CENTRED 0.15 s average of itself, rms, in segments. that
//             is exactly "how much fast wobble is there", in units you can see:
//             a tail being driven by a travelling wave carries a tenth of a
//             segment or more of it, a tail that only follows carries almost
//             none. measuring a frequency instead is a trap -- <|a|^2>/<|v|^2>
//             is dominated by whatever tiny high-frequency content exists and
//             happily reported 4 Hz for a tail whose joints were moving less
//             than a degree. the average has to be centred, too: a one-sided
//             running average LAGS, and its lag alone reads as jitter of
//             amplitude * omega * tau -- which on a 3.6 s sway is most of the
//             number.
//   swing     ...and the amplitude it is riding on: peak tip excursion, same
//             units. jitter/swing is the signal-to-noise of the motion.
//
//   node test/tail_probe.js            # the violent scenario
//   node test/tail_probe.js --calm     # ...and the one the owner actually sees
//   node test/tail_probe.js --wire     # the DFTL velocity correction off

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

// --wire turns the DFTL velocity correction off, which is the single thing that
// separates follow-the-leader from a wire: without it every parent keeps the
// momentum it spent dragging its child into place. this is the A/B that shows
// what the correction is buying, and it is also the one knob that can make this
// solver look bad, so it is worth being able to see.
// --calm PINS THE BODY: no brain, no shoves, no pointer, no agitation, the
// anchor bolted in place. that is the only way `jitter` means anything -- with
// the body flying around, the tail's shape legitimately changes fast because it
// is following, and follow-through and rattle become the same number. pinned,
// the ONLY thing that can move the tail is the tail.
// --fly is a SMOOTH CRUISE: the body flown around a big circle at cruise speed
// with the brain off, so the only thing that can put a kink in the tail is the
// tail solver. this is the "it rattles while flying" scenario -- the violent
// run below is deliberately unfair and hides small artefacts under big ones,
// and --calm never moves at all, so neither of them could see it.
const FLY = process.argv.includes("--fly");
const CALM = process.argv.includes("--calm");
const WIRE = process.argv.includes("--wire");
if (WIRE) {
  rigConfig.tail.ftlDamp = 0;
  rigConfig.tail.swaySwirl = 0;
}

const gltf = await loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url));
const cfg = rigConfig;
const world = createWorld({ headless: true, seed: 4242 });
world.viewport = { w: 1280, h: 800, dpr: 1 };
world.docSize = { w: 1280, h: 2400 };
world.colliders = [];
world.collidersVersion = 1;

// THE MODEL HAS TO BE PLACED IN A MOVING SCENE NODE, exactly like main.js does.
// Without this the character rotates on the spot forever and the tail sim never
// sees the body TRANSLATE at all -- which silently made every "flying" number
// this probe ever printed a measurement of a scenario that does not exist on the
// site, and hid the path-following behaviour completely (the recorded track was
// a single point).
const model = gltf.scene;
const scene = new THREE.Scene();
const characterRoot = new THREE.Group();
const squashGroup = new THREE.Group();
const holder = new THREE.Group();
characterRoot.add(squashGroup);
squashGroup.add(holder);
holder.add(model);
scene.add(characterRoot);
const rig = buildRig(model, cfg.boneRoles);
const view = { worldPerPx: 0, modelScale: 0, toWorldX: null, toWorldY: null };
view.worldPerPx = (2 * Math.tan((cfg.sizing.fovDeg * Math.PI) / 360)
  * cfg.sizing.camDistance) / world.viewport.h;
view.modelScale = (cfg.sizing.characterHeightPx * view.worldPerPx) / rig.height;
view.toWorldX = (px) => (px - world.viewport.w / 2) * view.worldPerPx;
view.toWorldY = (px) => (world.viewport.h / 2 - px) * view.worldPerPx;
holder.scale.setScalar(view.modelScale);
holder.position.y = -(rig.bounds.min.y + rig.height * cfg.sizing.pivotFactor)
  * view.modelScale;
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
  createBodyPose({ config: cfg, world, squashGroup }),
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
const bendAll = [];
let jitter2 = 0;
let jitterN = 0;
let swing = 0;
const tipRel = new THREE.Vector3();
const tipSmooth = new THREE.Vector3();
const tipMean = new THREE.Vector3();
const tipHist = [];
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();
const n1 = new THREE.Vector3();
const n2 = new THREE.Vector3();

for (let step = 0; step < 120 * 45; step++) {
  const t = step * DT;
  // violent: cursor whipping around + periodic hard shoves + high agitation
  world.time = t;
  world.pointer.active = !CALM && !FLY;
  world.pointer.pos = {
    x: 640 + Math.cos(t * 2.7) * 520,
    y: 1200 + Math.sin(t * 3.9) * 440
  };
  world.pointer.speed = 2000;
  world.pointer.lastMoveAt = t;
  if (!CALM && !FLY && step % 90 === 0) {
    body.vel.x += (Math.sin(t * 11) > 0 ? 1 : -1) * 1500;
    body.vel.y += Math.cos(t * 7) * 1100;
    brain.agitation = 1;
  }
  if (FLY) {
    // a lazy figure-of-eight at cruise speed: smooth, but it reverses its turn
    // direction twice a lap, which is the "changing direction" the owner means
    const w = 0.55;
    const R = 420;
    body.pos.x = 640 + Math.sin(t * w) * R;
    body.pos.y = 1200 + Math.sin(t * w * 2) * R * 0.5;
    body.vel.x = Math.cos(t * w) * R * w;
    body.vel.y = Math.cos(t * w * 2) * R * w;
    body.accel.x = -Math.sin(t * w) * R * w * w;
    body.accel.y = -Math.sin(t * w * 2) * R * w * w * 2;
  } else if (!CALM) {
    brain.step(DT);
    body.step(DT);
  }
  ctx.time = t;
  characterRoot.position.set(view.toWorldX(body.pos.x), view.toWorldY(body.pos.y), 0);
  characterRoot.updateMatrixWorld(true);
  poser.update(DT, t);

  if (step < 240) continue;               // let it settle first
  const P = tailLayer.getParticles();
  if (!P) continue;
  // tip position RELATIVE TO ITS OWN BASE, so flying in a circle is not counted
  // as the tail moving, against a running average of itself
  tipRel.copy(P[P.length - 1].p).sub(P[0].p);
  tipHist.push(tipRel.clone());
  let meanLen = 0;
  for (let i = 1; i < P.length; i++) meanLen += P[i].p.distanceTo(P[i - 1].p);
  meanLen /= P.length - 1;

  for (let i = 2; i < P.length; i++) {
    a.copy(P[i - 1].p).sub(P[i - 2].p).normalize();
    b.copy(P[i].p).sub(P[i - 1].p).normalize();
    const ang = (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI;
    if (ang > maxBend) maxBend = ang;
    if (ang > 90) folds++;
    bendAll.push(ang);
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

// centred box filter, +/- 0.075 s
{
  const half = Math.round(0.075 / DT);
  for (let i = half; i < tipHist.length - half; i++) {
    tipSmooth.set(0, 0, 0);
    for (let k = -half; k <= half; k++) tipSmooth.add(tipHist[i + k]);
    tipSmooth.multiplyScalar(1 / (2 * half + 1));
    jitter2 += tipHist[i].distanceToSquared(tipSmooth);
    jitterN++;
  }
}
tipHist.forEach((p) => tipMean.add(p));
tipMean.multiplyScalar(1 / Math.max(tipHist.length, 1));
tipHist.forEach((p) => { swing = Math.max(swing, p.distanceTo(tipMean)); });
bendAll.sort((x, y) => x - y);
const bendMean = bendAll.reduce((x, y) => x + y, 0) / Math.max(bendAll.length, 1);
const bendP99 = bendAll[Math.floor(bendAll.length * 0.99)] || 0;
const meanSegFinal = rig.tailRest.lens.reduce((x, y) => x + y, 0)
  / rig.tailRest.lens.length * view.modelScale;

const label = `${CALM ? "CALM HOVER" : FLY ? "SMOOTH CRUISE" : "VIOLENT"}${WIRE ? " / WIRE (no DFTL correction)" : ""}`;
console.log(`${label}
  maxBend  ${maxBend.toFixed(1)} deg   (>90 = folded back on itself)
  folds    ${folds} joint-frames past 90 deg
  selfMin  ${selfMin.toFixed(2)} x segment  (<0.5 = lying on itself)
  torsion  ${(torsionSum / Math.max(torsionN, 1)).toFixed(1)} deg/joint  (0 = planar, high = helical)
  jitter   ${(Math.sqrt(jitter2 / Math.max(jitterN, 1)) / meanSegFinal).toFixed(3)} x segment rms  (>0.10 = rattling; only meaningful with --calm)
  swing    ${(swing / meanSegFinal).toFixed(2)} x segment peak tip excursion
  bend     mean ${bendMean.toFixed(1)} p99 ${bendP99.toFixed(1)} deg per joint  (a dragon has NO sharp angles)`);
