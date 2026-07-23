// tail_scroll.js  (pass/fail gate for the scroll-drag bug)
// the tail must NOT be dragged by page scrolling. main.js renders the character
// doc-anchored -- it bakes -scrollY into the character's scene position -- so
// the tail's world-space anchor translates when the user scrolls. the verlet
// particles persist across frames, so without compensation they lag the anchor
// and the tail visibly trails the page. this harness reproduces that exact
// setup (a characterRoot whose y subtracts scrollY, like main.js) and asserts
// the tail's SHAPE relative to its base is invariant under a large scroll, even
// though the anchor itself moves a long way.

import * as THREE from "three";
import { loadGlbHeadless } from "./glbHeadless.js";
import { rigConfig } from "../src/config/rigConfig.js";
import { createWorld } from "../src/engine/world.js";
import { buildRig } from "../src/engine/pose/rig.js";
import { createTailChain } from "../src/engine/pose/tailChain.js";

const gltf = await loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url));
const cfg = rigConfig;
const world = createWorld({ headless: true, seed: 11 });
world.viewport = { w: 1280, h: 800, dpr: 1 };
world.docSize = { w: 1280, h: 4000 };
world.colliders = [];
world.collidersVersion = 1;
world.scroll.y = 0;

// scene graph mirrors main.js: characterRoot > holder > model
const model = gltf.scene;
const characterRoot = new THREE.Group();
const holder = new THREE.Group();
characterRoot.add(holder);
holder.add(model);
const scene = new THREE.Scene();
scene.add(characterRoot);

const rig = buildRig(model, cfg.boneRoles);
const view = { worldPerPx: 0, modelScale: 0 };
view.worldPerPx = (2 * Math.tan((cfg.sizing.fovDeg * Math.PI) / 360) * cfg.sizing.camDistance) / world.viewport.h;
view.modelScale = (cfg.sizing.characterHeightPx * view.worldPerPx) / rig.height;
holder.scale.setScalar(view.modelScale);
holder.position.y = -(rig.bounds.min.y + rig.height * cfg.sizing.pivotFactor) * view.modelScale;

// body sits still in DOCUMENT space; only scroll will change
const bodyPosX = 640;
const bodyPosY = 500;
const toWorldX = (px) => (px - world.viewport.w / 2) * view.worldPerPx;
const toWorldY = (px) => (world.viewport.h / 2 - px) * view.worldPerPx;

const body = { pos: { x: bodyPosX, y: bodyPosY }, vel: { x: 0, y: 0 }, accel: { x: 0, y: 0 } };
const brain = { agitation: 0, state: "hover" };
const ctx = {
  rig, body, brain, world, view, dt: 0, time: 0,
  // frozen inputs so the ONLY moving variable is scroll
  shared: { bodyQuat: new THREE.Quaternion(), swimPhase: 0, swimAlign: 0 },
  visual: { bobPx: { x: 0, y: 0 } }
};
const tail = createTailChain({ config: cfg, world });

const DT = 1 / 60;
function frame() {
  // render-frame equivalent of main.js: doc position minus live scroll
  characterRoot.position.set(toWorldX(bodyPosX), toWorldY(bodyPosY - world.scroll.y), 0);
  characterRoot.updateMatrixWorld(true);
  rig.resetToRest();
  ctx.dt = DT;
  ctx.time += DT;
  tail.update(ctx);
}

function relShape() {
  // particle positions relative to the pinned base = the tail's actual shape
  const P = tail.getParticles();
  return P.map((p) => p.p.clone().sub(P[0].p));
}
function maxDev(aArr, bArr) {
  let m = 0;
  for (let i = 0; i < aArr.length; i++) m = Math.max(m, aArr[i].distanceTo(bArr[i]));
  return m;
}

// settle at scroll 0
for (let i = 0; i < 240; i++) frame();
const rest = relShape();
const anchor0 = tail.getParticles()[0].p.clone();

// ramp the scroll hard (0 -> 2000px over 80 frames), then hold. track the worst
// shape deviation at EVERY frame -- this catches transient drag, not just the end
let worst = 0;
for (let i = 0; i < 80; i++) {
  world.scroll.y += 25;           // 25 px/frame ~ a fast flick
  frame();
  worst = Math.max(worst, maxDev(rest, relShape()));
}
for (let i = 0; i < 120; i++) {   // hold and let anything settle back
  frame();
  worst = Math.max(worst, maxDev(rest, relShape()));
}

const anchorMoved = tail.getParticles()[0].p.distanceTo(anchor0);
const meanSeg = rig.tailRest.lens.reduce((a, b) => a + b, 0) / rig.tailRest.lens.length * view.modelScale;

// the anchor must have really moved (else the test proves nothing), and the
// tail shape must stay put through all of it
const TOL = meanSeg * 0.02;       // 2% of a segment = imperceptible
const movedEnough = anchorMoved > meanSeg * 5;
const pass = movedEnough && worst < TOL;

console.log(`SCROLL-INVARIANCE
  anchorMoved  ${anchorMoved.toFixed(3)} world units  (${(anchorMoved / meanSeg).toFixed(1)} x segment)
  worstDev     ${worst.toExponential(2)} world units  (tol ${TOL.toExponential(2)})
  ${pass ? "PASS" : "FAIL"}${movedEnough ? "" : "  [anchor did not move -- test invalid]"}`);
process.exit(pass ? 0 : 1);
