// dump_motion.js
// headless motion capture: runs the full engine (physics + brain + all pose
// layers) against the real glb in node, skins the mesh on the cpu, and dumps
// frames to json for tools/render_motion.py to draw. lets motion quality be
// judged without a browser.

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

const glbPath = new URL("../src/assets/mew.glb", import.meta.url);

// the glb embeds the painted face png, which three's loader cannot decode in
// node -- glbHeadless strips the material side and keeps the geometry/skin
loadGlbHeadless(glbPath).then(run, (err) => {
  console.error("parse failed", err);
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

  // scene graph mirrors main.js: root group > holder (scale + pivot)
  const characterRoot = new THREE.Group();
  const holder = new THREE.Group();
  characterRoot.add(holder);
  holder.add(gltf.scene);
  const scscene = new THREE.Scene();
  scscene_add(scscene, characterRoot);

  const rig = buildRig(gltf.scene, cfg.boneRoles);

  const view = { worldPerPx: 0, modelScale: 0 };
  view.worldPerPx = (2 * Math.tan((cfg.sizing.fovDeg * Math.PI) / 360) * cfg.sizing.camDistance) / world.viewport.h;
  view.modelScale = (cfg.sizing.characterHeightPx * view.worldPerPx) / rig.height;
  holder.scale.setScalar(view.modelScale);
  const pivotY = rig.bounds.min.y + rig.height * cfg.sizing.pivotFactor;
  holder.position.y = -pivotY * view.modelScale;

  const body = createBody({ x: 900, y: 300, radius: cfg.sizing.characterHeightPx * cfg.sizing.radiusFactor, config: cfg.physics });
  const brain = createBrain({ body, world, config: cfg.behavior, pathConfig: cfg.path, attackConfig: cfg.attack });

  const ctxBase = {
    rig, body, brain, world, view, dt: 0, time: 0,
    shared: {
      bodyQuat: new THREE.Quaternion(),
      swimPhase: 0, swimAlign: 0,
      headYawRate: 0, headPitchRate: 0
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

  // find skinned meshes for cpu skinning
  const skinned = [];
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });

  const toWorldX = (px) => (px - world.viewport.w / 2) * view.worldPerPx;
  const toWorldY = (px) => (world.viewport.h / 2 - px) * view.worldPerPx;

  // --- scripted scenario -----------------------------------------------------
  // 0-4s idle hover; 4-8s cursor circles nearby (glance); 8s fast swipe ->
  // dodge; 12s cursor parks 1800px down the document -> seek must pathfind
  // through the collider field; then idle at the destination
  const SIM_DT = 1 / 120;
  const FPS = 30;
  const DURATION = 26;
  const frames = [];
  const metrics = { t: [], tipX: [], tipY: [], tipZ: [], headYaw: [], bodyYaw: [], posX: [], posY: [] };

  let simTime = 0;
  let nextSample = 0;

  const pointer = world.pointer;
  function scriptPointer(t) {
    if (t < 4) { pointer.active = false; return; }
    pointer.active = true;
    if (t < 8) {
      // gentle circles ~200px from the character
      const a = t * 1.2;
      setPointer(body.pos.x - 230 + Math.cos(a) * 60, body.pos.y + 40 + Math.sin(a) * 60, t);
    } else if (t < 8.35) {
      // fast swipe straight at the character
      const k = (t - 8) / 0.35;
      const sx = body.pos.x - 500 + k * 520;
      setPointer(sx, body.pos.y, t);
    } else if (t > 12) {
      // the user scrolled down (viewport now 1500..2300) and parked the
      // cursor there: seek + pathfinding must bring the character down
      world.scroll.y = 1500;
      setPointer(640, 2100, t);
    }
  }
  let lastPX = null, lastPY = null;
  function setPointer(x, y, t) {
    const dt = SIM_DT;
    if (lastPX === null) { lastPX = x; lastPY = y; } // first event: no velocity smear
    pointer.vel.x = (x - lastPX) / dt * 0.5 + pointer.vel.x * 0.5;
    pointer.vel.y = (y - lastPY) / dt * 0.5 + pointer.vel.y * 0.5;
    pointer.speed = Math.hypot(pointer.vel.x, pointer.vel.y);
    pointer.pos.x = x; pointer.pos.y = y;
    pointer.lastMoveAt = t;
    lastPX = x; lastPY = y;
  }

  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();

  while (simTime < DURATION) {
    simTime += SIM_DT;
    world.time = simTime;
    scriptPointer(simTime);
    brain.step(SIM_DT);
    body.step(SIM_DT);
    resolveAll(body, world, cfg.physics);

    if (simTime >= nextSample) {
      nextSample += 1 / FPS;
      // render-frame equivalent
      characterRoot.position.set(toWorldX(body.pos.x + ctxBase.visual.bobPx.x), toWorldY(body.pos.y + ctxBase.visual.bobPx.y), 0);
      poser.update(1 / FPS, simTime);
      characterRoot.updateMatrixWorld(true);

      // cpu linear blend skinning at a decimated vertex set
      const verts = [];
      for (const mesh of skinned) {
        mesh.skeleton.update();
        const geo = mesh.geometry;
        const pos = geo.attributes.position;
        const sIdx = geo.attributes.skinIndex;
        const sWt = geo.attributes.skinWeight;
        const bindInv = mesh.bindMatrixInverse;
        const bones = mesh.skeleton.bones;
        const bmats = mesh.skeleton.boneMatrices;
        const step = 3; // decimate for file size; silhouette survives
        for (let i = 0; i < pos.count; i += step) {
          _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
          let x = 0, y = 0, z = 0;
          for (let j = 0; j < 4; j++) {
            const w = sWt.getComponent(i, j);
            if (w === 0) continue;
            _m.fromArray(bmats, sIdx.getComponent(i, j) * 16);
            const p = _v.clone().applyMatrix4(_m);
            x += p.x * w; y += p.y * w; z += p.z * w;
          }
          const wp = new THREE.Vector3(x, y, z)
            .applyMatrix4(bindInv)
            .applyMatrix4(mesh.matrixWorld);
          verts.push([+wp.x.toFixed(3), +wp.y.toFixed(3), +wp.z.toFixed(3)]);
        }
      }

      // skeleton keypoints so poses stay legible in small renders
      const kp = (b) => {
        const p = new THREE.Vector3();
        b.getWorldPosition(p);
        return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)];
      };
      const B = rig.bones;
      const skel = {
        spine: [B.root, ...B.spine, B.neck, B.head].map(kp),
        tail: [...B.tail.map(kp)],
        armL: [B.armL, B.handL].filter(Boolean).map(kp),
        armR: [B.armR, B.handR].filter(Boolean).map(kp),
        earL: B.earL ? [kp(B.head), kp(B.earL)] : [],
        earR: B.earR ? [kp(B.head), kp(B.earR)] : [],
        feet: [B.footL, B.footR].filter(Boolean).map(kp)
      };

      const tip = new THREE.Vector3();
      rig.bones.tail[rig.bones.tail.length - 1].getWorldPosition(tip);
      frames.push({
        t: +simTime.toFixed(3),
        state: brain.state,
        agit: +brain.agitation.toFixed(3),
        pointer: pointer.active ? [pointer.pos.x, pointer.pos.y] : null,
        bodyPx: [Math.round(body.pos.x), Math.round(body.pos.y)],
        skel,
        verts
      });
      metrics.t.push(+simTime.toFixed(3));
      metrics.tipX.push(+tip.x.toFixed(4));
      metrics.tipY.push(+tip.y.toFixed(4));
      metrics.tipZ.push(+tip.z.toFixed(4));
      metrics.headYaw.push(+(ctxBase.shared.headYawRate || 0).toFixed(4));
      const be = new THREE.Euler().setFromQuaternion(ctxBase.shared.bodyQuat, "YXZ");
      metrics.bodyYaw.push(+be.y.toFixed(4));
      metrics.posX.push(Math.round(body.pos.x));
      metrics.posY.push(Math.round(body.pos.y));
    }
  }

  writeFileSync(new URL("../motion_dump.json", import.meta.url),
    JSON.stringify({ viewport: world.viewport, docSize: world.docSize, colliders: world.colliders.map(c => c.rect), frames, metrics }));
  console.log(`dumped ${frames.length} frames, final state=${brain.state} pos=(${body.pos.x | 0},${body.pos.y | 0})`);
}

function scscene_add(scene, obj) {
  scene.add(obj);
}
