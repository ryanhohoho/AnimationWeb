// tail_scroll.js  (pass/fail gate for the scroll-drag bug)
// the tail must NOT be dragged by page scrolling. main.js renders the character
// doc-anchored -- it bakes -scrollY into the character's scene position -- so
// the tail's world-space anchor translates when the user scrolls. the particles
// persist across frames, so without compensation they lag the anchor and the
// tail visibly trails the page.
//
// this runs the SAME scenario twice, in lockstep, one scrolling and one not,
// and asserts the tail's shape relative to its base matches frame for frame.
// it used to freeze every input and compare against a single settled shape,
// which only worked while the tail was motionless with a frozen swimPhase --
// the strand has its own slow sway now (tailChain.js), so a still tail is not
// something that exists any more and that test measured the sway, not scroll.

import * as THREE from "three";
import { loadGlbHeadless } from "./glbHeadless.js";
import { rigConfig } from "../src/config/rigConfig.js";
import { createWorld } from "../src/engine/world.js";
import { buildRig } from "../src/engine/pose/rig.js";
import { createTailChain } from "../src/engine/pose/tailChain.js";

const gltf = await loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url));
const cfg = rigConfig;

// scene graph mirrors main.js: characterRoot > holder > model
const model = gltf.scene;
const characterRoot = new THREE.Group();
const holder = new THREE.Group();
characterRoot.add(holder);
holder.add(model);
const scene = new THREE.Scene();
scene.add(characterRoot);

const world0 = createWorld({ headless: true, seed: 11 });
world0.viewport = { w: 1280, h: 800, dpr: 1 };
const rig = buildRig(model, cfg.boneRoles);
const view = { worldPerPx: 0, modelScale: 0 };
view.worldPerPx = (2 * Math.tan((cfg.sizing.fovDeg * Math.PI) / 360) * cfg.sizing.camDistance) / world0.viewport.h;
view.modelScale = (cfg.sizing.characterHeightPx * view.worldPerPx) / rig.height;
holder.scale.setScalar(view.modelScale);
holder.position.y = -(rig.bounds.min.y + rig.height * cfg.sizing.pivotFactor) * view.modelScale;

// body sits still in DOCUMENT space; only scroll changes between the two runs
const bodyPosX = 640;
const bodyPosY = 500;
const toWorldX = (px) => (px - world0.viewport.w / 2) * view.worldPerPx;
const toWorldY = (px) => (world0.viewport.h / 2 - px) * view.worldPerPx;

const DT = 1 / 60;
const SETTLE = 240;
const RAMP = 80;            // 25 px/frame ~ a fast flick
const HOLD = 120;

function run(scrolling) {
  const world = createWorld({ headless: true, seed: 11 });
  world.viewport = { w: 1280, h: 800, dpr: 1 };
  world.docSize = { w: 1280, h: 4000 };
  world.colliders = [];
  world.collidersVersion = 1;
  world.scroll.y = 0;
  const body = { pos: { x: bodyPosX, y: bodyPosY }, vel: { x: 0, y: 0 }, accel: { x: 0, y: 0 } };
  const brain = { agitation: 0, state: "hover" };
  const ctx = {
    rig, body, brain, world, view, dt: DT, time: 0,
    shared: { bodyQuat: new THREE.Quaternion(), swimPhase: 0, swimAlign: 0 },
    visual: { bobPx: { x: 0, y: 0 } }
  };
  const tail = createTailChain({ config: cfg, world });
  const shapes = [];
  let anchor0 = null;
  let anchorEnd = null;

  for (let i = 0; i < SETTLE + RAMP + HOLD; i++) {
    if (scrolling && i >= SETTLE && i < SETTLE + RAMP) world.scroll.y += 25;
    characterRoot.position.set(toWorldX(bodyPosX), toWorldY(bodyPosY - world.scroll.y), 0);
    characterRoot.updateMatrixWorld(true);
    rig.resetToRest();
    ctx.time += DT;
    tail.update(ctx);
    const P = tail.getParticles();
    if (i === SETTLE - 1) anchor0 = P[0].p.clone();
    if (i >= SETTLE) shapes.push(P.map((p) => p.p.clone().sub(P[0].p)));
    anchorEnd = P[0].p.clone();
  }
  return { shapes, anchorMoved: anchorEnd.distanceTo(anchor0) };
}

const still = run(false);
const scrolled = run(true);

let worst = 0;
for (let f = 0; f < still.shapes.length; f++) {
  const a = still.shapes[f];
  const b = scrolled.shapes[f];
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, a[i].distanceTo(b[i]));
}

const meanSeg = rig.tailRest.lens.reduce((x, y) => x + y, 0) / rig.tailRest.lens.length * view.modelScale;
const TOL = meanSeg * 0.02;       // 2% of a segment = imperceptible
const movedEnough = scrolled.anchorMoved > meanSeg * 5;
const pass = movedEnough && worst < TOL;

console.log(`SCROLL-INVARIANCE
  anchorMoved  ${scrolled.anchorMoved.toFixed(3)} world units  (${(scrolled.anchorMoved / meanSeg).toFixed(1)} x segment)
  worstDev     ${worst.toExponential(2)} world units  (tol ${TOL.toExponential(2)})
  ${pass ? "PASS" : "FAIL"}${movedEnough ? "" : "  [anchor did not move -- test invalid]"}`);
process.exit(pass ? 0 : 1);
