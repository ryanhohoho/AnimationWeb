// sim.test.js
// headless checks: no rendering, no dom. run with `node test/sim.test.js`.
// exercises the real engine modules, including the actual tail sim mapped
// onto a real three.js bone chain.

import * as THREE from "three";
import { expDamp, Spring, makeNoise1d2, v2 } from "../src/utils/math.js";
import { createWorld } from "../src/engine/world.js";
import { createBody } from "../src/engine/physics/body2d.js";
import { resolveCircleRect, resolveEdges, resolveAll } from "../src/engine/physics/colliders.js";
import { createBrain } from "../src/engine/behavior/brain.js";
import { createPathfinder } from "../src/engine/behavior/pathfinder.js";
import { buildRig } from "../src/engine/pose/rig.js";
import { createTailChain } from "../src/engine/pose/tailChain.js";
import { QuatSpring } from "../src/engine/pose/quatSpring.js";
import {
  clipSegmentToRect, beamLength, corridorHitsRect, beamChord,
  corridorPolygon, edgeSamples, removedFraction
} from "../src/engine/fx/beamGeometry.js";
import {
  linearToSrgb, coverFit, scrollUvOffset, shadeBand, inkness
} from "../src/engine/fx/presentMath.js";
import { INK_ALPHA, hexToLinear } from "../src/engine/fx/spriteShade.js";
import { createShinySparkle } from "../src/engine/fx/shinySparkle.js";
import { mulberry32 } from "../src/utils/math.js";
import { rigConfig } from "../src/config/rigConfig.js";

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    console.error("  FAIL:", msg);
  }
}
function section(name) {
  console.log("\n==", name);
}
const finite = (x) => Number.isFinite(x);

// ---------------------------------------------------------------------------
section("math: frame-rate independence of expDamp");
{
  // stepping n times at dt/n must equal one step at dt
  let a = 10;
  for (let i = 0; i < 60; i++) a = expDamp(a, 2, 4, 1 / 60);
  const b = expDamp(10, 2, 4, 1);
  ok(Math.abs(a - b) < 1e-9, `expDamp path-independent (${a} vs ${b})`);

  const s1 = new Spring(0, 8, 1);
  const s2 = new Spring(0, 8, 1);
  for (let i = 0; i < 300; i++) s1.step(1, 1 / 300);
  for (let i = 0; i < 30; i++) s2.step(1, 1 / 30);
  ok(Math.abs(s1.x - s2.x) < 0.05, `spring consistent across rates (${s1.x.toFixed(4)} vs ${s2.x.toFixed(4)})`);
}

// ---------------------------------------------------------------------------
section("physics: drag bounds energy, no nan");
{
  const body = createBody({ x: 500, y: 400, radius: 60, config: rigConfig.physics });
  body.vel.x = 800; body.vel.y = -500;
  let prevSpeed = v2.len(body.vel);
  let monotone = true;
  for (let i = 0; i < 600; i++) {
    body.step(1 / 120);
    const s = v2.len(body.vel);
    if (s > prevSpeed + 1e-9) monotone = false;
    prevSpeed = s;
  }
  ok(monotone, "speed never grows with no forces");
  ok(prevSpeed < 10, `drag settles the body (final speed ${prevSpeed.toFixed(2)})`);
  ok(finite(body.pos.x) && finite(body.pos.y), "positions finite");
}

// ---------------------------------------------------------------------------
section("physics: collision resolution leaves no penetration, adds no energy");
{
  const body = createBody({ x: 0, y: 0, radius: 50, config: rigConfig.physics });
  const rect = { x: 100, y: -200, w: 200, h: 400 };
  for (let trial = 0; trial < 200; trial++) {
    body.pos.x = 60 + trial; body.pos.y = -150 + trial * 1.5;
    body.vel.x = 400; body.vel.y = 120;
    const before = v2.len(body.vel);
    resolveCircleRect(body, rect, rigConfig.physics);
    // check penetration cleared
    const cx = Math.max(rect.x, Math.min(body.pos.x, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(body.pos.y, rect.y + rect.h));
    const dist = Math.hypot(body.pos.x - cx, body.pos.y - cy);
    ok(dist >= body.radius - 1, `penetration cleared (trial ${trial}, dist ${dist.toFixed(1)})`);
    ok(v2.len(body.vel) <= before + 1e-6, `no energy gained (trial ${trial})`);
    if (failures > 3) break;
  }

  // document bounds keep the body inside at any speed
  body.pos.x = -500; body.pos.y = 9000; body.vel.x = -2000; body.vel.y = 3000;
  resolveEdges(body, { w: 1280, h: 3000 }, rigConfig.physics);
  ok(body.pos.x >= rigConfig.physics.edgeInset + body.radius - 1, "clamped to left doc edge");
  ok(body.pos.y <= 3000 - rigConfig.physics.edgeInset - body.radius + 1, "clamped to bottom doc edge");
}

// ---------------------------------------------------------------------------
section("pathfinder: routes around obstacles, snaps blocked targets");
{
  const world = createWorld({ headless: true, seed: 5 });
  world.docSize = { w: 1280, h: 2000 };
  // a wall with a gap on the right
  world.colliders = [
    { rect: { x: 0, y: 500, w: 1000, h: 120 }, el: null },
    { rect: { x: 300, y: 900, w: 700, h: 200 }, el: null }
  ];
  world.collidersVersion = 1;
  const pf = createPathfinder(world, rigConfig.path);
  const R = 60;

  const path = pf.findPath({ x: 200, y: 200 }, { x: 200, y: 1600 }, R);
  ok(path && path.length >= 2, `path found (${path ? path.length : 0} waypoints)`);
  if (path) {
    // every consecutive pair must have grid line-of-sight (i.e. no wall cross)
    let clean = true;
    for (let i = 1; i < path.length; i++) {
      if (!pf.losPoints(path[i - 1], path[i], R)) clean = false;
    }
    ok(clean, "smoothed path segments all have line of sight");
    // it must route through the gap on the right of the first wall
    const crossing = path.find((p) => p.y > 480 && p.y < 740);
    ok(!crossing || crossing.x > 1000 - R, "route uses the gap, not the wall");
  }

  // target buried inside an obstacle snaps to a reachable free point
  const p2 = pf.findPath({ x: 200, y: 200 }, { x: 500, y: 950 }, R);
  ok(p2 !== null, "blocked target still yields a path to nearest free spot");
  ok(pf.isFreePoint(p2[p2.length - 1], R), "fallback endpoint is in free space");
}

// ---------------------------------------------------------------------------
section("quat spring: converges, stays finite, frame-rate consistent");
{
  const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 2.7, -0.6));
  const a = new QuatSpring(6, 1);
  const b = new QuatSpring(6, 1);
  for (let i = 0; i < 600; i++) a.step(target, 1 / 120);
  for (let i = 0; i < 150; i++) b.step(target, 1 / 30);
  ok(Math.abs(a.q.dot(target)) > 0.999, `converges at 120hz (dot=${a.q.dot(target).toFixed(4)})`);
  ok(Math.abs(b.q.dot(target)) > 0.995, `converges at 30hz (dot=${b.q.dot(target).toFixed(4)})`);
  ok([a.q.x, a.q.y, a.q.z, a.q.w, a.w.x].every(Number.isFinite), "state finite");
  // near-antipodal target must not explode
  const c = new QuatSpring(6, 1);
  const flip = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 0.999, 0));
  for (let i = 0; i < 600; i++) c.step(flip, 1 / 120);
  ok(Math.abs(c.q.dot(flip)) > 0.99, "handles ~180 degree turns");
}

// ---------------------------------------------------------------------------
section("behavior: seek triggers far away, releases with hysteresis");
{
  const world = createWorld({ headless: true, seed: 11 });
  world.viewport.w = 1280; world.viewport.h = 800;
  world.docSize = { w: 1280, h: 4000 };
  world.colliders = [];
  world.collidersVersion = 1;
  const body = createBody({ x: 640, y: 3600, radius: 60, config: rigConfig.physics });
  const brain = createBrain({ body, world, config: rigConfig.behavior, pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  // cursor near the top of the page, far beyond the trigger distance
  world.pointer.active = true;
  world.pointer.pos = { x: 640, y: 300 };
  world.pointer.lastMoveAt = 0;

  const dt = 1 / 120;
  let entered = false;
  for (let i = 0; i < 120 * 30; i++) {
    world.time += dt;
    brain.step(dt);
    body.step(dt);
    resolveAll(body, world, rigConfig.physics);
    if (brain.state === "seek") entered = true;
    if (entered && brain.state === "hover") break;
  }
  ok(entered, "entered seek when cursor was over half a page away");
  const dist = Math.hypot(world.pointer.pos.x - body.pos.x, world.pointer.pos.y - body.pos.y);
  ok(dist < rigConfig.behavior.seekTriggerFactor * 1280, `swam back near the cursor (dist=${dist.toFixed(0)})`);
  ok(brain.state === "hover", `settled to hover after arriving (state=${brain.state})`);
}

// ---------------------------------------------------------------------------
section("behavior: startle predicate thresholds");
{
  const world = createWorld({ headless: true });
  world.docSize = { w: 1280, h: 800 };
  const body = createBody({ x: 600, y: 400, radius: 60, config: rigConfig.physics });
  const brain = createBrain({ body, world, config: rigConfig.behavior, pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  const B = rigConfig.behavior;

  const mk = (speed, dist, closingFrac) => ({
    active: true,
    pos: { x: 600 - dist, y: 400 },
    vel: { x: speed * closingFrac, y: speed * Math.sqrt(Math.max(0, 1 - closingFrac * closingFrac)) },
    speed
  });
  ok(brain.startlePredicate(mk(B.startleCursorSpeed + 100, B.startleDistance - 50, 0.9), body.pos), "fast + close + closing triggers");
  ok(!brain.startlePredicate(mk(B.startleCursorSpeed - 200, B.startleDistance - 50, 0.9), body.pos), "slow cursor ignored");
  ok(!brain.startlePredicate(mk(B.startleCursorSpeed + 100, B.startleDistance + 100, 0.9), body.pos), "far cursor ignored");
  ok(!brain.startlePredicate(mk(B.startleCursorSpeed + 100, B.startleDistance - 50, 0.1), body.pos), "tangential swipe ignored");
}

// ---------------------------------------------------------------------------
section("behavior: 60s wander stays sane at multiple frame rates");
for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
  const world = createWorld({ headless: true, seed: 42 });
  world.viewport.w = 1280; world.viewport.h = 800;
  world.docSize = { w: 1280, h: 2400 };
  world.colliders = [{ rect: { x: 400, y: 250, w: 300, h: 180 }, el: null }];
  world.collidersVersion = 1;
  const body = createBody({ x: 900, y: 300, radius: 60, config: rigConfig.physics });
  const brain = createBrain({ body, world, config: rigConfig.behavior, pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  let bad = 0;
  const steps = Math.round(60 / dt);
  for (let i = 0; i < steps; i++) {
    world.time += dt;
    brain.step(dt);
    body.step(dt);
    resolveAll(body, world, rigConfig.physics);
    if (!finite(body.pos.x) || !finite(body.pos.y)) { bad++; break; }
    if (body.pos.x < -50 || body.pos.x > 1330 || body.pos.y < -50 || body.pos.y > 2450) bad++;
  }
  ok(bad === 0, `dt=${(1 / dt).toFixed(0)}hz: stayed in bounds, finite (${bad} violations)`);
  ok(brain.agitation >= 0 && brain.agitation <= 1, "agitation in [0,1]");
}

// ---------------------------------------------------------------------------
section("tail: integrity + smoothness on a real bone chain");
{
  // build a miniature rig that mirrors the real one's topology
  const modelRoot = new THREE.Group();
  const rootBone = new THREE.Bone(); rootBone.name = "root";
  rootBone.position.set(0, 0.5, 0);
  modelRoot.add(rootBone);
  let parent = rootBone;
  const N = 7;
  for (let i = 0; i < N; i++) {
    const b = new THREE.Bone();
    b.name = `tail.${String(i + 1).padStart(3, "0")}`;
    // chain curls back and up, like the real model
    b.position.set(0, i === 0 ? -0.1 : 0.05 * i, -0.22);
    parent.add(b);
    parent = b;
  }
  modelRoot.updateMatrixWorld(true);
  const rig = buildRig(modelRoot, { root: "root", tail: Array.from({ length: N }, (_, i) => `tail.${String(i + 1).padStart(3, "0")}`) });

  const world = createWorld({ headless: true, seed: 7 });
  const body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, accel: { x: 0, y: 0 } };
  const brain = { agitation: 0, state: "hover" };
  const view = { worldPerPx: 0.011, modelScale: 1 };
  const tailChain = createTailChain({ config: rigConfig, world });
  const ctx = { rig, body, brain, world, view, shared: {}, dt: 0, time: 0 };

  const dt = 1 / 60;
  const tipHist = [];
  let lenViolations = 0;
  let nanCount = 0;
  for (let i = 0; i < 600; i++) {
    ctx.time += dt;
    ctx.dt = dt;
    // scripted body motion: an aggressive lissajous sweep + accel readout
    const t = ctx.time;
    const nx = Math.sin(t * 1.7) * 2.2;
    const ny = Math.cos(t * 1.1) * 1.4;
    body.vel.x = (nx - modelRoot.position.x) * 300;
    body.vel.y = -(ny - modelRoot.position.y) * 300;
    body.accel.x = body.vel.x * 2;
    body.accel.y = body.vel.y * 2;
    modelRoot.position.x = nx;
    modelRoot.position.y = ny;

    rig.resetToRest();
    tailChain.update(ctx);

    const P = tailChain.getParticles();
    for (let k = 1; k < P.length; k++) {
      const rest = rig.tailRest.lens[k - 1] * view.modelScale;
      const d = P[k].p.distanceTo(P[k - 1].p);
      if (Math.abs(d - rest) / rest > 0.015) lenViolations++;
      if (!finite(P[k].p.x + P[k].p.y + P[k].p.z)) nanCount++;
    }
    tipHist.push(P[P.length - 1].p.clone());
  }
  ok(nanCount === 0, `tail particles finite (${nanCount} nan)`);
  ok(lenViolations === 0, `segment lengths within 1.5% of rest (${lenViolations} violations)`);

  // smoothness: tip should never jump discontinuously frame to frame
  let maxJump = 0;
  for (let i = 1; i < tipHist.length; i++) {
    maxJump = Math.max(maxJump, tipHist[i].distanceTo(tipHist[i - 1]));
  }
  ok(maxJump < 0.35, `tip motion continuous (max frame jump ${maxJump.toFixed(3)} world units)`);

  // bone quats finite
  let qBad = 0;
  for (const b of rig.bones.tail) {
    const q = b.quaternion;
    if (!finite(q.x + q.y + q.z + q.w)) qBad++;
  }
  ok(qBad === 0, "tail bone quaternions finite");
}

// ---------------------------------------------------------------------------
section("beam geometry: clipping, corridors, samples");
{
  const rect = { x: 100, y: 100, w: 200, h: 100 };
  // horizontal segment through the middle
  const hit = clipSegmentToRect(0, 150, 400, 150, rect);
  ok(hit && Math.abs(hit[0] - 0.25) < 1e-9 && Math.abs(hit[1] - 0.75) < 1e-9, "liang-barsky clips correctly");
  ok(clipSegmentToRect(0, 300, 400, 300, rect) === null, "miss returns null");

  const origin = { x: 0, y: 150 };
  const dir = { x: 1, y: 0 };
  ok(corridorHitsRect(rect, origin, dir, 40, 1000), "corridor hits centered rect");
  ok(!corridorHitsRect(rect, { x: 0, y: 400 }, dir, 40, 1000), "corridor misses distant rect");
  ok(corridorHitsRect(rect, { x: 0, y: 230 }, dir, 40, 1000), "corridor grazes edge within halfW");

  const chord = beamChord(rect, origin, dir, 1000);
  ok(chord && Math.abs(chord.length - 200) < 1e-6, `chord spans the rect (${chord && chord.length})`);
  const frac = removedFraction(rect, origin, dir, 40, 1000);
  ok(Math.abs(frac - (200 * 80) / 20000) < 1e-6, `removed fraction sane (${frac.toFixed(3)})`);

  const rng = mulberry32(7);
  const poly = corridorPolygon(origin, dir, 40, 50, 350, 10, rng);
  ok(poly.length >= 8, `jagged polygon has vertices (${poly.length})`);
  ok(poly.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), "polygon finite");

  const samples = edgeSamples(rect, origin, dir, 40, 1000);
  ok(samples.length > 5, `edge samples generated (${samples.length})`);
  ok(samples.every((s) => s.x >= rect.x && s.x <= rect.x + rect.w), "samples inside rect");

  const len = beamLength({ x: 640, y: 400 }, { x: 0, y: 1 }, { w: 1280, h: 3000 });
  ok(len > 2600 && len < 3200, `beam length reaches doc edge (${len.toFixed(0)})`);
}

// ---------------------------------------------------------------------------
section("behavior: pet -> charge -> fire -> hover, no bounce");
{
  const world = createWorld({ headless: true, seed: 3 });
  world.viewport.w = 1280; world.viewport.h = 800;
  world.docSize = { w: 1280, h: 800 };
  world.collidersVersion = 1;
  const body = createBody({ x: 600, y: 400, radius: 60, config: rigConfig.physics });
  const brain = createBrain({
    body, world, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });
  world.pointer.active = true;
  world.pointer.pos = { x: 900, y: 400 };
  world.pointer.lastMoveAt = 0;

  let fired = null;
  world.on("beamFire", (e) => { fired = e; });

  world.emit("pet", { point: { x: 600, y: 400 } });
  ok(brain.state === "charge", "pet starts the charge");
  const v0 = Math.hypot(body.vel.x, body.vel.y);
  ok(v0 < 1, `no poke bounce on pet (speed=${v0.toFixed(1)})`);

  const dt = 1 / 120;
  let maxSpeedDuringCharge = 0;
  while (brain.state === "charge") {
    world.time += dt;
    brain.step(dt);
    body.step(dt);
    // only measure while still charging: the state flip applies the recoil
    if (brain.state === "charge") {
      maxSpeedDuringCharge = Math.max(maxSpeedDuringCharge, Math.hypot(body.vel.x, body.vel.y));
    }
  }
  ok(fired !== null, "beamFire emitted after charge");
  ok(Math.abs(world.time - rigConfig.attack.chargeS) < 0.05, `charge lasts ~1.5s (${world.time.toFixed(2)})`);
  ok(fired && Math.abs(fired.dir.x - 1) < 0.01 && Math.abs(fired.dir.y) < 0.01, "beam aims at the cursor");
  ok(maxSpeedDuringCharge < 60, `stays planted while charging (max ${maxSpeedDuringCharge.toFixed(0)})`);
  ok(brain.state === "fire", "enters fire state");

  // recoil pushes away from the beam
  ok(body.vel.x < -100, `recoil opposite the beam (vx=${body.vel.x.toFixed(0)})`);

  while (brain.state === "fire") {
    world.time += dt;
    brain.step(dt);
    body.step(dt);
  }
  ok(brain.state === "hover", "settles to hover after firing");
  // cooldown: an immediate second pet is ignored
  world.emit("pet", { point: { x: 600, y: 400 } });
  ok(brain.state === "hover", "cooldown blocks immediate re-pet");
}

// ---------------------------------------------------------------------------
section("behavior: grab, drag, fling -- and click still pets");
{
  const world = createWorld({ headless: true, seed: 21 });
  world.viewport.w = 1280; world.viewport.h = 800;
  world.docSize = { w: 1280, h: 800 };
  world.collidersVersion = 1;
  const body = createBody({ x: 600, y: 400, radius: 60, config: rigConfig.physics });
  const brain = createBrain({
    body, world, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });
  world.pointer.active = true;
  world.pointer.pos = { x: 600, y: 400 };
  world.pointer.vel = { x: 0, y: 0 };
  world.pointer.lastMoveAt = 0;
  const dt = 1 / 120;

  // drag: press, move the hand, follow, release with velocity
  world.emit("mewdown", { point: { x: 600, y: 400 } });
  ok(brain.state === "held", "press grabs");
  for (let i = 0; i < 120; i++) {
    world.time += dt;
    world.pointer.pos.x = 600 + i * 4;   // hand sweeps right
    world.pointer.vel.x = 480;
    brain.step(dt);
    body.step(dt);
  }
  ok(brain.held && !brain.held.pending, "movement converts press to drag");
  ok(Math.abs(body.pos.x - world.pointer.pos.x) < 120,
    `carried near the hand (body ${body.pos.x.toFixed(0)} vs hand ${world.pointer.pos.x.toFixed(0)})`);
  world.pointer.vel = { x: 900, y: -300 };
  world.emit("pointerup", {});
  ok(brain.state === "flung", "release throws");
  const f = rigConfig.behavior.fling;
  ok(Math.abs(body.vel.x - 900 * f.flingGain) < 1 && Math.abs(body.vel.y + 300 * f.flingGain) < 1,
    `fling velocity = hand velocity * gain (${body.vel.x.toFixed(0)},${body.vel.y.toFixed(0)})`);
  // ride it out: a violent throw may bounce off a wall (startle -> recover)
  // or end in a loop; either way it must come back to a calm hover
  let guard = 120 * 25;
  while (brain.state !== "hover" && guard-- > 0) {
    world.time += dt;
    brain.step(dt);
    body.step(dt);
    resolveAll(body, world, rigConfig.physics);
  }
  ok(brain.state === "hover", `throw eventually settles to hover (${brain.state})`);
  ok(finite(body.pos.x + body.pos.y), "position finite after the ride");
  world.pointer.vel = { x: 0, y: 0 };
  world.emit("mewdown", { point: { x: body.pos.x, y: body.pos.y } });
  world.emit("pointerup", {});
  ok(brain.state === "charge", "clean click still starts the hyper beam charge");
}

// ---------------------------------------------------------------------------
section("behavior: flourish flies a full circle");
{
  const world = createWorld({ headless: true, seed: 8 });
  world.viewport.w = 1280; world.viewport.h = 800;
  world.docSize = { w: 1280, h: 800 };
  world.collidersVersion = 1;
  const body = createBody({ x: 400, y: 400, radius: 60, config: rigConfig.physics });
  const brain = createBrain({
    body, world, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });
  body.vel.x = 420;
  brain.state = "flourish";
  brain.stateTime = 0;
  const fcfg = rigConfig.behavior.flourish;
  brain.flourish = {
    heading0: 0, sign: 1, speed: fcfg.speed,
    durationS: (2 * Math.PI * fcfg.radiusPx) / fcfg.speed
  };

  const dt = 1 / 120;
  let headings = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  while (brain.state === "flourish") {
    world.time += dt;
    brain.step(dt);
    body.step(dt);
    headings.push(Math.atan2(body.vel.y, body.vel.x));
    minX = Math.min(minX, body.pos.x); maxX = Math.max(maxX, body.pos.x);
    minY = Math.min(minY, body.pos.y); maxY = Math.max(maxY, body.pos.y);
  }
  // the loop must be spatially bigger than the ~150px body or it reads as a
  // dodge; expect a circle in the ballpark of 2 * radiusPx
  ok(maxX - minX > 160 && maxY - minY > 160,
    `flown circle is body-sized+ (${(maxX - minX).toFixed(0)}x${(maxY - minY).toFixed(0)}px)`);
  // unwrap and measure total heading sweep
  let total = 0;
  for (let i = 1; i < headings.length; i++) {
    let d = headings[i] - headings[i - 1];
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    total += d;
  }
  ok(Math.abs(total) > Math.PI * 1.6, `velocity heading sweeps a near-full circle (${(total / Math.PI).toFixed(2)}pi)`);
  ok(brain.state === "hover", "flourish hands back to hover");
  ok(Number.isFinite(body.pos.x + body.pos.y), "position finite after loop");
}

// ---------------------------------------------------------------------------
section("presentation: linear -> sRGB transfer");
{
  ok(linearToSrgb(0) === 0, "black maps to black");
  ok(Math.abs(linearToSrgb(1) - 1) < 1e-9, "white maps to white");
  // the canonical checkpoint: linear 0.5 displays as sRGB ~0.7354
  ok(Math.abs(linearToSrgb(0.5) - 0.735357) < 1e-4, "linear 0.5 -> sRGB 0.7354");
  // the toe is the straight 12.92x segment
  ok(Math.abs(linearToSrgb(0.002) - 0.02584) < 1e-6, "toe segment is linear");
  // monotonic and always a BRIGHTENING for mid values -- this is the whole
  // point of the fix: without it every mid tone renders too dark
  let mono = true;
  for (let i = 1; i <= 200; i++) {
    const a = linearToSrgb((i - 1) / 200);
    const b = linearToSrgb(i / 200);
    if (b < a) mono = false;
    if (i > 1 && i < 200 && b <= (i / 200) - 1e-9) mono = false;
  }
  ok(mono, "monotonic, and lifts every mid tone above the raw linear value");
  ok(linearToSrgb(-0.4) === 0 && linearToSrgb(2) === 1, "clamps out-of-range input");
}

// ---------------------------------------------------------------------------
section("presentation: light rig lands on bright pastel pink");
{
  // an analytic mirror of three's lambert path (irradiance * albedo / PI),
  // used to pin the light rig numerically. it is a model, not a screenshot --
  // it catches "the shading is dark or purple" regressions, not fine tuning.
  const PI = Math.PI;
  // the model's ACTUAL albedo, read from the same rigConfig.skinHex the builder
  // bakes into the atlas. it used to be a hardcoded copy of the v3.7 pink, which
  // meant this test happily passed while the shipped model was a different
  // colour entirely -- it was checking a fiction.
  const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const albedo = [1, 3, 5].map((i) =>
    srgbToLin(parseInt(rigConfig.skinHex.slice(i, i + 2), 16) / 255));
  const L = rigConfig.lighting;
  const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const sky = lin(L.skyColor), ground = lin(L.groundColor), keyC = lin(L.keyColor);

  function shade(ny, ndotl) {
    const w = 0.5 * ny + 0.5; // hemisphere weight from dot(normal, up)
    const out = [];
    for (let i = 0; i < 3; i++) {
      const hemi = (ground[i] + (sky[i] - ground[i]) * w) * L.ambientIntensity;
      const kd = Math.max(0, ndotl) * keyC[i] * L.keyIntensity;
      out.push(((hemi + kd) * albedo[i]) / PI);
    }
    return out;
  }
  const toBytes = (c) => c.map((x) => Math.round(linearToSrgb(x) * 255));

  // surface facing the viewer, lit by the viewer-side key
  const front = toBytes(shade(0, 0.97));
  ok(front[0] > 235, `front reads bright (R=${front[0]})`);
  ok(front[0] > front[2] && front[2] > front[1], `front is pink, not purple (${front})`);
  ok(front[0] - front[1] > 25 && front[0] - front[1] < 90,
    `front keeps pastel saturation, not washed white (dR-G=${front[0] - front[1]})`);

  // the shadow side: must stay in the pink family and never go dim
  const back = toBytes(shade(-1, 0));
  ok(back[0] > 150, `shadow side stays light (R=${back[0]})`);
  ok(back[0] > back[2] && back[2] > back[1], `shadow side is pink, not purple (${back})`);
  ok(front[0] - back[0] < 100, "front-to-shadow contrast stays flat/sticker-like");

  // the old rig, drawn WITHOUT the sRGB encode -- the bug being fixed. the
  // ground color was a grey-purple and the linear result went straight to the
  // canvas, so it read dark and purple-leaning
  const oldSky = lin(0xfff4ff), oldGround = lin(0x8a7a9a);
  const oldLin = [0, 1, 2].map((i) => {
    const hemi = (oldGround[i] + (oldSky[i] - oldGround[i]) * 0.5) * 1.1;
    const kd = 0.766 * 1.4;
    return ((hemi + kd) * albedo[i]) / PI;
  });
  const oldBytes = oldLin.map((x) => Math.round(Math.min(1, x) * 255)); // no encode
  ok(oldBytes[0] < 160, `regression case really was dark (old R=${oldBytes[0]})`);
  ok(front[0] - oldBytes[0] > 70, "fixed pipeline is substantially brighter than the bug");
}

// ---------------------------------------------------------------------------
section("presentation: sprite shading cuts the light into flat sections");
{
  // the shipped look is NOT the raw light rig: engine/fx/spriteShade.js bands
  // the incident light into flat sections and draws the painted marks flat. the
  // section above pins the light rig; this pins what actually reaches the
  // screen, which is the thing the owner sees.
  const S = rigConfig.presentation.spriteShade;
  const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const skin = [1, 3, 5].map((i) =>
    srgbToLin(parseInt(rigConfig.skinHex.slice(i, i + 2), 16) / 255));
  const L = rigConfig.lighting;
  const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const sky = lin(L.skyColor), ground = lin(L.groundColor), keyC = lin(L.keyColor);

  // incident light only -- the albedo is divided back out in the shader
  function incident(ny, ndotl) {
    const w = 0.5 * ny + 0.5;
    return [0, 1, 2].map((i) => (
      (ground[i] + (sky[i] - ground[i]) * w) * L.ambientIntensity
      + Math.max(0, ndotl) * keyC[i] * L.keyIntensity) / Math.PI);
  }
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  function sprite(albedo, ny, ndotl) {
    const lum = luma(incident(ny, ndotl));
    const raw = Math.min(1, (Math.floor(lum * S.bands + 0.5) / S.bands) * S.shadeGain);
    const q = shadeBand(lum, S.bands, S.shadeFloor, S.shadeGain);
    const ink = inkness(albedo, skin, S.inkLo, S.inkHi);
    const out = [];
    for (let i = 0; i < 3; i++) {
      const tint = S.shadowTint[i] + (S.lightTint[i] - S.shadowTint[i]) * raw;
      const litC = albedo[i] * q * tint;
      const sharp = Math.min(1, Math.max(0,
        skin[i] + (albedo[i] - skin[i]) * S.inkBoost));
      const flat = sharp * (1 + (q - 1) * S.inkShade);
      out.push(litC + (flat - litC) * ink);
    }
    return out.map((x) => Math.round(linearToSrgb(x) * 255));
  }

  const front = sprite(skin, 0, 1);
  const shadow = sprite(skin, -0.6, 0);
  ok(front[0] > 235, `the lit section reads bright (R=${front[0]})`);
  ok(front[0] > front[2] && front[2] > front[1],
    `the lit section is pink, not purple (${front})`);
  ok(shadow[0] > 140, `the darkest section stays light (R=${shadow[0]})`);
  ok(shadow[0] > shadow[2] && shadow[2] > shadow[1],
    `the darkest section is still pink (${shadow})`);
  // the hue shift is the point: the shadow must be RELATIVELY cooler, not just
  // darker. compare blue-over-red between the two sections.
  ok(shadow[2] / shadow[0] > front[2] / front[0] + 0.02,
    `shadows shift cool (B/R ${(shadow[2] / shadow[0]).toFixed(3)} vs ${(front[2] / front[0]).toFixed(3)})`);

  // SECTIONS, not a gradient: sweep the surface and count distinct levels
  const levels = new Set();
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI;
    levels.add(sprite(skin, Math.cos(a), Math.cos(a))[0]);
  }
  ok(levels.size >= 3 && levels.size <= S.bands + 1,
    `the sweep lands on ${levels.size} flat sections (bands=${S.bands})`);

  // INK. these are measured off the shipped atlas, same as tools/retexture.py's
  // thresholds: the iris navy, the sclera white, and the blush.
  const px = (r, g, b) => [r, g, b].map((v) => srgbToLin(v / 255));
  const iris = px(15, 74, 110);
  const sclera = px(250, 225, 235);
  const blush = px(250, 106, 141);
  ok(inkness(skin, skin, S.inkLo, S.inkHi) === 0, "flat skin is not ink");
  for (const [nm, c] of [["iris", iris], ["sclera", sclera], ["blush", blush]]) {
    ok(inkness(c, skin, S.inkLo, S.inkHi) > 0.95, `the ${nm} reads as ink`);
  }
  // and the whole point: the eye may not be washed out by the shading. it has to
  // stay dark wherever the head is facing, including in the darkest section.
  const eyeLit = sprite(iris, 0, 1);
  const eyeDark = sprite(iris, -0.6, 0);
  ok(eyeLit[0] < 60 && eyeDark[0] < 60,
    `the iris stays dark in every section (${eyeLit[0]} / ${eyeDark[0]})`);
  ok(shadow[0] - eyeDark[0] > 100,
    `the eye keeps its contrast against the darkest skin (${shadow[0] - eyeDark[0]})`);
  ok(Math.abs(eyeLit[0] - eyeDark[0]) <= Math.abs(front[0] - shadow[0]) * S.inkShade + 4,
    "the light rig barely moves the ink");

  // the alpha flag has to survive the pixelate pass's own thresholds
  ok(INK_ALPHA > 0.5, "ink still counts as solid for the outline test");
  ok(INK_ALPHA < 1, "...but is distinguishable from shaded skin");
}

section("shiny: the games' colours and an entrance that ends");
{
  const SH = rigConfig.shiny;
  const S = rigConfig.presentation.spriteShade;
  ok(SH.chance > 0 && SH.chance < 1, `chance is a probability (${SH.chance})`);
  // PINNED TO THE GAMES. #9CDEFF is the dominant colour of shiny mew's Gen V
  // B/W sprite (28.9% of its opaque pixels, and the same sprite PokeAPI serves
  // by default); #7BACD5 is that palette's shade colour, which is what the
  // official artwork uses for the cheeks. these are measurements, not taste --
  // if someone "improves" them the shiny stops being the games' shiny.
  ok(SH.skinHex.toUpperCase() === "#9CDEFF", `body is the sprite's blue (${SH.skinHex})`);
  ok(SH.blushHex.toUpperCase() === "#7BACD5", `blush is its shade (${SH.blushHex})`);
  const shiny = hexToLinear(SH.skinHex);
  const skin = hexToLinear(rigConfig.skinHex);
  ok(shiny[2] > shiny[1] && shiny[1] > shiny[0], "shiny reads blue (B > G > R)");
  ok(skin[0] > skin[2] && skin[2] > skin[1], "...and the default still reads pink");

  // THE RE-ANCHOR must be an identity when nothing is being recoloured, or the
  // 2 in 3 loads that are NOT shiny would quietly shift colour.
  const reanchor = (a, ink, tint) => a.map((v, i) => v + (1 - ink) * (tint[i] - skin[i]));
  for (const ink of [0, 0.5, 1]) {
    const same = reanchor(skin, ink, skin);
    ok(same.every((v, i) => Math.abs(v - skin[i]) < 1e-12),
      `recolour is an identity at ink=${ink}`);
  }
  // ...and at ink 0 it lands exactly on the target, which is what stops the
  // antialiased edge of an eye keeping its pink halo on a blue body
  const edge = reanchor(skin, 0, shiny);
  ok(edge.every((v, i) => Math.abs(v - shiny[i]) < 1e-12),
    "a fully-skin texel recolours exactly onto the target");

  // THE WARM TEST IS NORMALISED BY BRIGHTNESS, and it has to be: an absolute
  // r-b catches the blush core and misses its own gradient, and a half-strength
  // blush texel -- which is what the mip chain actually samples over a face
  // twenty pixels wide -- then falls through both the re-anchor (it is fully
  // ink) and the warm test (it is pale). that was the last pink left on the
  // shiny. these are measured off the shipped atlas.
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const px = (r, g, b) => [r, g, b].map((v) => (v / 255 <= 0.04045
    ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4)));
  // the same pipeline the shader runs before the warm test: boost, then swap
  // the skin hiding in the texel for the shiny one
  const warmOf = (c) => {
    const d = Math.hypot(...c.map((v, i) => v - skin[i]));
    const t = Math.min(Math.max((d - S.inkLo) / (S.inkHi - S.inkLo), 0), 1);
    const ink = t * t * (3 - 2 * t);
    const sh = c.map((v, i) => Math.min(Math.max(
      skin[i] + (v - skin[i]) * S.inkBoost + (1 - ink) * (shiny[i] - skin[i]), 0), 1));
    return (sh[0] - sh[2]) / Math.max(luma(sh), 1e-3);
  };
  ok(warmOf(px(250, 106, 141)) > S.warmHi,
    `the blush clears the warm window (${warmOf(px(250, 106, 141)).toFixed(2)})`);
  ok(warmOf(px(218, 153, 189)) > S.warmLo,
    `...and so does a HALF-strength blush (${warmOf(px(218, 153, 189)).toFixed(2)})`);
  ok(warmOf(skin) < S.warmLo, `plain skin does not (${warmOf(skin).toFixed(2)})`);
  ok(warmOf(px(250, 225, 235)) < S.warmLo,
    `nor the eye whites (${warmOf(px(250, 225, 235)).toFixed(2)})`);
  ok(warmOf(px(15, 74, 110)) < S.warmLo, "and neither does the iris");

  // THE ENTRANCE. it has to finish: a burst that never clears leaves the flash
  // uniform stuck wherever it stopped and the character stays blown out.
  const sp = createShinySparkle({
    parent: new THREE.Object3D(),
    config: SH.sparkle,
    view: { worldPerPx: 0.01 }
  });
  ok(!sp.running, "idle until it is fired");
  sp.burst(1234);
  ok(sp.running, "burst starts it");
  let frames = 0;
  let peak = 0;
  let last = 1;
  while (sp.running && frames < 60 * 10) {
    last = sp.update(1 / 60);
    peak = Math.max(peak, last);
    ok(Number.isFinite(last), `flash stays finite (frame ${frames})`);
    if (failures > 3) break;
    frames++;
  }
  ok(!sp.running, `the burst ends (${(frames / 60).toFixed(2)}s)`);
  ok(frames / 60 < 3, "...and does not outstay a page load");
  ok(Math.abs(peak - SH.sparkle.flashPeak) < 0.05,
    `the flash peaks at flashPeak (${peak.toFixed(2)} vs ${SH.sparkle.flashPeak})`);
  ok(last === 0, "and returns to zero, so nothing is left blown out");
  // the same seed has to give the same burst, or a "why did that look odd"
  // report can never be reproduced
  const rerun = (seed) => {
    const s2 = createShinySparkle({
      parent: new THREE.Object3D(), config: SH.sparkle, view: { worldPerPx: 0.01 }
    });
    s2.burst(seed);
    const out = [];
    for (let i = 0; i < 40; i++) out.push(s2.update(1 / 60));
    return out.join(",");
  };
  ok(rerun(99) === rerun(99), "the same seed replays the same burst");
}

section("presentation: cutout overlay cover-fit + scroll");
{
  // square image into a wide viewport -> crop vertically, x untouched
  let s = coverFit(1600, 800, 1000, 1000);
  ok(Math.abs(s.x - 1) < 1e-9 && Math.abs(s.y - 0.5) < 1e-9, "tall-relative image crops in y");
  // wide image into a tall viewport -> crop horizontally
  s = coverFit(800, 1600, 1000, 500);
  ok(Math.abs(s.y - 1) < 1e-9 && Math.abs(s.x - 0.25) < 1e-9, "wide image crops in x");
  // matching aspects are a no-op
  s = coverFit(1200, 600, 800, 400);
  ok(Math.abs(s.x - 1) < 1e-9 && Math.abs(s.y - 1) < 1e-9, "matching aspect is identity");
  // the crop only ever shrinks the sampled window, never stretches past it
  s = coverFit(677, 344, 677, 344);
  ok(s.x <= 1 + 1e-9 && s.y <= 1 + 1e-9, "cover never samples outside the image");
  // zoom crops further in
  const z = coverFit(1000, 1000, 1000, 1000, 2);
  ok(Math.abs(z.x - 0.5) < 1e-9 && Math.abs(z.y - 0.5) < 1e-9, "zoom 2 halves the window");

  // document-pinned background: scrolling down slides the sampled window DOWN
  // the image, which is -v with a flipY texture
  ok(scrollUvOffset(0, 800, 1) === 0, "no scroll, no slide");
  ok(scrollUvOffset(800, 800, 1) === -1, "one viewport of scroll slides one window");
  ok(scrollUvOffset(400, 800, 0.5, 1) === -0.25, "slide scales with the cover window");
  ok(scrollUvOffset(800, 800, 1, 0.4) === -0.4, "parallax damps the slide");
  ok(scrollUvOffset(500, 0, 1) === 0, "degenerate viewport is safe");
}

// ---------------------------------------------------------------------------
section("presentation: config shape");
{
  const p = rigConfig.presentation;
  ok(["pixelate", "cutout", "none"].includes(p.mode), `mode is a known pass (${p.mode})`);
  ok(p.pixelate.pixelSize >= 1 && p.pixelate.colorLevels >= 2, "pixelate knobs sane");
  ok(p.pixelate.shadeLift >= 0 && p.pixelate.shadeLift <= 1, "shadeLift in 0..1");
  const sh = p.spriteShade;
  ok(sh.bands >= 2 && sh.bands <= 8, `sprite bands sane (${sh.bands})`);
  ok(sh.shadeFloor > 0 && sh.shadeFloor < 1, "shadeFloor in 0..1");
  ok(sh.inkLo < sh.inkHi, "ink ramp is ordered");
  ok(sh.shadowTint.length === 3 && sh.lightTint.length === 3, "tints are 3-vectors");
  ok(sh.inkBoost >= 1, "inkBoost never washes the marks toward the skin");
  ok(sh.warmLo < sh.warmHi, "warm window is ordered");
  const sk = rigConfig.shiny.sparkle;
  ok(sk.ringCount > 0 && sk.heroCount > 0, "the burst has a ring and a hero star");
  ok(sk.ringOuterPx > sk.ringInnerPx, "the ring travels outward");
  ok(sk.flashPeak > 0 && sk.flashPeak <= 1, "flashPeak in 0..1");
  ok(p.cutout.edgeLo < p.cutout.edgeHi, "cutout edge window is ordered");
  ok(p.cutout.edgeSoftPx > 0, "cutout has a real feather radius");
  ok(rigConfig.lighting.keyOffset.length === 3, "key offset is a 3-vector");
  ok(rigConfig.lighting.keyOffset[2] > 0, "key comes from the viewer side (+z)");
}

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
console.log("ALL PASS");
