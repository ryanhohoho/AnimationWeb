// pose_frames.js
// full-resolution skinned snapshots of the REAL engine, for eyeballing how the
// model actually deforms. dump_motion.js decimates the mesh (silhouette only,
// document-wide plots); this keeps every vertex at a handful of chosen moments
// so tools/render_poses.py can draw the character big enough to judge the face,
// the feet and the tail.
//
//   node test/pose_frames.js && python3 tools/render_poses.py

import * as THREE from "three";
import { writeFileSync } from "node:fs";
import { loadGlbHeadless } from "./glbHeadless.js";

import { rigConfig } from "../src/config/rigConfig.js";
import { createWorld } from "../src/engine/world.js";
import { createBody } from "../src/engine/physics/body2d.js";
import { resolveAll } from "../src/engine/physics/colliders.js";
import { createBrain } from "../src/engine/behavior/brain.js";
import { buildRig } from "../src/engine/pose/rig.js";
import { createPoser } from "../src/engine/pose/poser.js";
import { createBodyPose } from "../src/engine/pose/bodyPose.js";
import { createLimbPose } from "../src/engine/pose/limbPose.js";
import { createHeadLook } from "../src/engine/pose/headLook.js";
import { createEarSprings } from "../src/engine/pose/earSprings.js";
import { createTailChain } from "../src/engine/pose/tailChain.js";

const SIM_DT = 1 / 120;
// moments worth looking at: settled idle, mid glance, the startle whip, full
// cruise (streamlined, limbs swept), the arrival loop, and settled again
const SHOTS = [2.0, 6.5, 8.6, 10.2, 13.5, 16.0, 19.0, 24.0];

loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url)).then(run, (e) => {
  console.error(e);
  process.exit(1);
});

function run(gltf) {
  const cfg = rigConfig;
  const world = createWorld({ headless: true, seed: 99 });
  world.viewport.w = 1280;
  world.viewport.h = 800;
  world.docSize = { w: 1280, h: 2400 };
  world.colliders = [
    { rect: { x: 80, y: 470, w: 420, h: 250 }, el: null },
    { rect: { x: 250, y: 1100, w: 800, h: 180 }, el: null },
    { rect: { x: 0, y: 1650, w: 700, h: 160 }, el: null }
  ];
  world.collidersVersion = 1;

  const characterRoot = new THREE.Group();
  const holder = new THREE.Group();
  characterRoot.add(holder);
  holder.add(gltf.scene);
  new THREE.Scene().add(characterRoot);

  const rig = buildRig(gltf.scene, cfg.boneRoles);
  const view = { worldPerPx: 0, modelScale: 1 };
  view.worldPerPx =
    (2 * Math.tan((cfg.sizing.fovDeg * Math.PI) / 360) * cfg.sizing.camDistance) /
    world.viewport.h;
  const body = createBody({
    x: 900, y: 300,
    radius: cfg.sizing.characterHeightPx * cfg.sizing.radiusFactor,
    config: cfg.physics
  });
  const brain = createBrain({
    body, world, config: cfg.behavior,
    pathConfig: cfg.path, attackConfig: cfg.attack
  });
  const ctxBase = {
    rig, body, brain, world, view, dt: 0, time: 0,
    shared: {
      bodyQuat: new THREE.Quaternion(),
      swimPhase: 0, swimAlign: 0, headYawRate: 0, headPitchRate: 0
    },
    visual: { bobPx: { x: 0, y: 0 } }
  };
  const poser = createPoser(ctxBase, [
    createBodyPose({ config: cfg, world, squashGroup: null }),
    createLimbPose({ config: cfg, world }),
    createHeadLook({ config: cfg, world }),
    createEarSprings({ config: cfg, world }),
    createTailChain({ config: cfg, world })
  ]);

  const skinned = [];
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
  const mesh = skinned[0];
  const index = Array.from(mesh.geometry.index.array);

  const pointer = world.pointer;
  let lastPX = null, lastPY = null;
  const setPointer = (x, y, t) => {
    if (lastPX === null) { lastPX = x; lastPY = y; }
    pointer.vel.x = ((x - lastPX) / SIM_DT) * 0.5 + pointer.vel.x * 0.5;
    pointer.vel.y = ((y - lastPY) / SIM_DT) * 0.5 + pointer.vel.y * 0.5;
    pointer.speed = Math.hypot(pointer.vel.x, pointer.vel.y);
    pointer.pos.x = x; pointer.pos.y = y;
    pointer.lastMoveAt = t;
    lastPX = x; lastPY = y;
  };
  function scriptPointer(t) {
    if (t < 4) { pointer.active = false; return; }
    pointer.active = true;
    if (t < 8) {
      const a = t * 1.2;
      setPointer(body.pos.x - 230 + Math.cos(a) * 60, body.pos.y + 40 + Math.sin(a) * 60, t);
    } else if (t < 8.35) {
      setPointer(body.pos.x - 500 + ((t - 8) / 0.35) * 520, body.pos.y, t);
    } else if (t > 12) {
      world.scroll.y = 1500;
      setPointer(640, 2100, t);
    }
  }

  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const out = [];
  let simTime = 0;
  let shot = 0;

  while (shot < SHOTS.length && simTime < 40) {
    simTime += SIM_DT;
    world.time = simTime;
    scriptPointer(simTime);
    brain.step(SIM_DT);
    body.step(SIM_DT);
    resolveAll(body, world, cfg.physics);
    poser.update(SIM_DT, simTime);

    if (simTime >= SHOTS[shot]) {
      shot++;
      mesh.skeleton.update();
      // skin in the MODEL's own space (bindMatrix/bindMatrixInverse only, no
      // world matrix): the point is the deformation, not where on the page it is
      const geo = mesh.geometry;
      const pos = geo.attributes.position;
      const sIdx = geo.attributes.skinIndex;
      const sWt = geo.attributes.skinWeight;
      const bmats = mesh.skeleton.boneMatrices;
      const verts = new Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
        let x = 0, y = 0, z = 0;
        for (let j = 0; j < 4; j++) {
          const w = sWt.getComponent(i, j);
          if (w === 0) continue;
          _m.fromArray(bmats, sIdx.getComponent(i, j) * 16);
          const p = _v.clone().applyMatrix4(_m);
          x += p.x * w; y += p.y * w; z += p.z * w;
        }
        const wp = new THREE.Vector3(x, y, z).applyMatrix4(mesh.bindMatrixInverse);
        verts[i] = [+wp.x.toFixed(4), +wp.y.toFixed(4), +wp.z.toFixed(4)];
      }
      out.push({ t: +simTime.toFixed(2), state: brain.state, verts });
      console.log(`  t=${simTime.toFixed(2)} ${brain.state}`);
    }
  }

  writeFileSync(new URL("../pose_frames.json", import.meta.url),
    JSON.stringify({ index, frames: out }));
  console.log(`wrote pose_frames.json (${out.length} frames, ${out[0].verts.length} verts)`);
}
