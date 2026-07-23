// tail_turn_dump.js  (diagnostic visual)
// runs the SAME hard-turn scenario twice -- once with the base cone effectively
// OFF (old behaviour) and once with the shipped value -- and dumps the tail
// centerline (screen x/y) plus the body's rigid base direction at matched
// instants, so tools/plot_turn.py can draw a before/after filmstrip.

import * as THREE from "three";
import { writeFileSync } from "node:fs";
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

const glb = await loadGlbHeadless(new URL("../src/assets/mew.glb", import.meta.url));

function run(rootLimitDeg) {
  const cfg = JSON.parse(JSON.stringify(rigConfig));
  cfg.tail.rootAngleLimitDeg = rootLimitDeg;
  const world = createWorld({ headless: true, seed: 321 });
  world.viewport = { w: 1280, h: 800, dpr: 1 };
  world.docSize = { w: 1280, h: 2400 };
  world.colliders = [];
  world.collidersVersion = 1;

  const model = glb.scene.clone(true);
  const rig = buildRig(model, cfg.boneRoles);
  const view = { worldPerPx: 0.01, modelScale: (150 * 0.01) / rig.height, toWorldX: (p) => p, toWorldY: (p) => p };
  const body = createBody({ x: 640, y: 400, radius: 60, config: cfg.physics });
  const brain = createBrain({ body, world, config: cfg.behavior, pathConfig: cfg.path, attackConfig: cfg.attack });
  const ctx = {
    rig, body, brain, world, view, dt: 0, time: 0,
    shared: { bodyQuat: new THREE.Quaternion(), swimPhase: 0, swimAlign: 0, headYawRate: 0, headPitchRate: 0 },
    visual: { bobPx: { x: 0, y: 0 } }
  };
  const tail = createTailChain({ config: cfg, world });
  const poser = createPoser(ctx, [
    createBodyPose({ config: cfg, world, squashGroup: new THREE.Group() }),
    createLimbPose({ config: cfg, world }),
    createHeadLook({ config: cfg, world }),
    createEarSprings({ config: cfg, world }),
    tail
  ]);
  const rootRestInv = rig.rest.get(rig.bones.root).charQuat.clone().invert();
  const _rq = new THREE.Quaternion();
  const _bd = new THREE.Vector3();

  const DT = 1 / 120;
  const maxV = cfg.physics.maxSpeed;
  const frames = [];
  // sample a window spanning one hard reversal, once things are moving
  const START = Math.round(6.0 * 120), END = Math.round(6.5 * 120), EVERY = 8;
  for (let step = 0; step <= END; step++) {
    const t = step * DT;
    world.time = t;
    const w = 7.0, snap = Math.sin(t * 0.7) > 0 ? 1 : -1, dir = w * snap * t;
    body.vel.x = Math.cos(dir) * maxV; body.vel.y = Math.sin(dir) * maxV;
    body.accel.x = -Math.sin(dir) * maxV * w; body.accel.y = Math.cos(dir) * maxV * w;
    body.pos.x = 640; body.pos.y = 400;   // hold in place; only orientation turns
    brain.agitation = 1;
    ctx.time = t;
    poser.update(DT, t);
    if (step >= START && (step - START) % EVERY === 0) {
      const P = tail.getParticles();
      const center = P.map((p) => [ +p.p.x.toFixed(4), +p.p.y.toFixed(4), +p.p.z.toFixed(4) ]);
      rig.charQuatOf(rig.bones.root, _rq).multiply(rootRestInv);
      _bd.copy(rig.tailRest.dirs[0]).applyQuaternion(_rq).normalize();
      frames.push({ t: +t.toFixed(3), center, base: P[0].p.toArray().map((v)=>+v.toFixed(4)),
        rigid: [ +_bd.x.toFixed(4), +_bd.y.toFixed(4), +_bd.z.toFixed(4) ] });
    }
  }
  return frames;
}

const out = { off: run(179), on: run(rigConfig.tail.rootAngleLimitDeg), onLimit: rigConfig.tail.rootAngleLimitDeg };
writeFileSync(new URL("../turn_dump.json", import.meta.url), JSON.stringify(out));
console.log(`dumped ${out.on.length} matched frames per config (off vs ${out.onLimit} deg)`);
