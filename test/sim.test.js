// sim.test.js
// headless checks: no rendering, no dom. run with `node test/sim.test.js`.
// exercises the real engine modules, including the actual tail sim mapped
// onto a real three.js bone chain.

import * as THREE from "three";
import { expDamp, Spring, makeNoise1d2, v2 } from "../src/utils/math.js";
import { createWorld } from "../src/engine/world.js";
import { createBody } from "../src/engine/physics/body2d.js";
import { resolveCircleRect, resolveEdges, resolveAll, avoidColliders } from "../src/engine/physics/colliders.js";
import { createBrain } from "../src/engine/behavior/brain.js";
import { createSweatDrops } from "../src/engine/fx/sweatDrops.js";
import * as sweatGeom from "../src/engine/fx/sweatGeometry.js";
import { createPathfinder } from "../src/engine/behavior/pathfinder.js";
import { buildRig } from "../src/engine/pose/rig.js";
import { createTailChain } from "../src/engine/pose/tailChain.js";
import { createLimbPose } from "../src/engine/pose/limbPose.js";
import { createFaceOverlay } from "../src/engine/fx/faceOverlay.js";
import { QuatSpring } from "../src/engine/pose/quatSpring.js";
import {
  clipSegmentToRect, beamLength, corridorHitsRect, beamChord,
  corridorPolygon, edgeSamples, removedFraction
} from "../src/engine/fx/beamGeometry.js";
import {
  linearToSrgb, coverFit, scrollUvOffset, shadeBand, inkness
} from "../src/engine/fx/presentMath.js";
import { INK_ALPHA, hexToLinear } from "../src/engine/fx/spriteShade.js";
import { createStarBurst } from "../src/engine/fx/starBurst.js";
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

  // THE EDGE IS A LEASH, NOT A WALL (changed deliberately: she used to be
  // clamped inside the document, and an animal that stops dead at an invisible
  // line is a sprite in a box). Three things have to hold instead.
  const P = rigConfig.physics;
  const bounds = { w: 1280, h: 3000 };

  // 1. she may cross an edge and keep going — no clamp, no bounce
  const drift = createBody({ x: -60, y: 1500, radius: 60, config: P });
  drift.vel.x = -120;
  const driftHit = resolveEdges(drift, bounds, P);
  ok(drift.pos.x === -60, "she may sit outside the edge without being pushed back");
  ok(driftHit === null, "...and crossing it is not an impact");

  // 2. past the slack line a spring starts pulling her home — X and Y have
  //    their own, and they are deliberately very different lengths
  const out = createBody({ x: -(P.edgeSlackXPx + 80), y: 1500, radius: 60, config: P });
  resolveEdges(out, bounds, P);
  out.step(1 / 60);
  ok(out.vel.x > 0, `beyond the side slack she is pulled back (vx ${out.vel.x.toFixed(1)})`);

  const up = createBody({ x: 640, y: -(P.edgeSlackPx + 80), radius: 60, config: P });
  resolveEdges(up, bounds, P);
  up.step(1 / 60);
  ok(up.vel.y > 0, `beyond the top slack she is pulled back (vy ${up.vel.y.toFixed(1)})`);

  // 3. and however hard she is thrown, she is never lost
  body.pos.x = -5000; body.pos.y = 90000; body.vel.x = -2000; body.vel.y = 3000;
  resolveEdges(body, bounds, P);
  ok(body.pos.x >= -P.edgeHardXPx - 1, "never lost past the left hard stop");
  ok(body.pos.y <= bounds.h + P.edgeHardPx + 1, "never lost past the bottom hard stop");

  // ── THE SIDES ARE THE SCREEN, AND SHE STAYS ON IT ─────────────────────
  // There was a version where the sides were a 560 px leash so she could round
  // a flush element from outside the page. It worked and it read as her
  // wandering off the sheet — worse than the thing it fixed. Getting past an
  // element is the push ramp's job now.
  ok(P.edgeSlackXPx === 0, "no free travel past a side at all");
  ok(P.edgeReturnAccelX > P.insideAccel,
    `and the sideways spring outweighs the escape out of type ` +
    `(${P.edgeReturnAccelX} vs ${P.insideAccel}), so an element flush to the rim ` +
    `cannot push her off the page`);

  // one body-width out, she is already being pulled back hard
  const out1 = createBody({ x: -75, y: 1500, radius: 75, config: P });
  resolveEdges(out1, bounds, P);
  out1.step(1 / 60);
  ok(out1.vel.x > 40,
    `a body-width past the rim is answered at once (vx ${out1.vel.x.toFixed(1)})`);

  // ...but the stop is still well out, because it is not what contains her: it
  // has to leave room for a page-swap entry and the tail of a throw
  ok(P.edgeHardXPx > rigConfig.behavior.entryOffsetPx * 2,
    `the backstop still clears a page-swap entry ` +
    `(${P.edgeHardXPx} px vs an entry at ${rigConfig.behavior.entryOffsetPx})`);

  // ...and A STARTLED EXIT IS EXEMPT: leaving the frame is the shape of it
  const fleeing = createBody({ x: -200, y: 1500, radius: 75, config: P });
  fleeing.vel.x = -900;
  resolveEdges(fleeing, bounds, P, true);
  fleeing.step(1 / 60);
  ok(fleeing.vel.x < -800,
    `while she is running, nothing holds her in (vx ${fleeing.vel.x.toFixed(0)})`);

  // and the planner never proposes what the leash would fight
  ok(rigConfig.path.outsideXPx === 0, "routes stay on the paper");
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// The predicted failure of soft avoidance: every force pushes her away from
// type, the page is mostly type, so the emptiest places are the margins — and
// she ends up patrolling the border of the sheet forever. These two checks are
// what stop that being possible.
section("navigation: she does not end up crawling the margins");
{
  const world = createWorld({ headless: true, seed: 11 });
  world.viewport = { w: 1280, h: 900 };
  world.docSize = { w: 1280, h: 900 };
  world.scroll = { x: 0, y: 0 };
  // a page like the real ones: columns of type down the middle, clear rim
  world.colliders = [
    { rect: { x: 90, y: 120, w: 420, h: 300 }, el: null },
    { rect: { x: 90, y: 520, w: 420, h: 240 }, el: null },
    { rect: { x: 700, y: 160, w: 480, h: 560 }, el: null }
  ];
  world.collidersVersion = 1;

  const body = createBody({ x: 620, y: 450, radius: 60, config: rigConfig.physics });
  const brain = createBrain({
    body, world,
    config: rigConfig.behavior, pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });

  // 1. a cost field, not a wall map: the gap between the two left columns is
  //    expensive but crossable, so a route through the middle exists at all
  const pf = brain.pathfinder;
  const through = pf.findPath({ x: 300, y: 60 }, { x: 300, y: 830 }, 60);
  ok(through && through.length >= 2, "a route exists straight down the type");

  // 2. and the places she CHOOSES are not all against the rim
  let onRim = 0, total = 0;
  for (let i = 0; i < 200; i++) {
    const p = brain.pathfinder && brain._pickInterest ? brain._pickInterest() : null;
    if (!p) continue;
    total++;
    const edge = Math.min(p.x, world.viewport.w - p.x, p.y, world.viewport.h - p.y);
    if (edge < 140) onRim++;
  }
  ok(total > 100, `the sampler finds somewhere to go (${total}/200)`);
  ok(onRim / Math.max(total, 1) < 0.35,
    `most destinations are not on the rim (${onRim}/${total} were)`);
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
section("modules: every shader-carrying module actually parses");
{
  // THIS EXISTS BECAUSE OF ONE CHARACTER. The shaders live in template
  // literals, so a BACKTICK anywhere inside one -- including in a // comment --
  // terminates the string and the whole module fails to parse. Vite reports
  // nothing useful and the page just renders no character at all. It has
  // happened twice. A bare import is enough to catch it, costs nothing, and is
  // the only check that would have.
  const mods = [
    "../src/engine/fx/pixelate.js",
    "../src/engine/fx/alphaFlags.js",
    "../src/engine/fx/cutout.js",
    // presentation.js is not here: it `?url`-imports a png, which node cannot
    // resolve. Its own shape is covered by the config-shape section below.
    "../src/engine/fx/spriteShade.js",
    "../src/engine/fx/starBurst.js",
    // the sweat carries a fragment shader with a dozen lines of comment in it
    // now -- the tapered-segment sweep and the specular's argument both live
    // inside the template literal, which is exactly the hazard this section is
    // here for. It was not on this list while its shader was three lines long.
    "../src/engine/fx/sweatDrops.js",
    "../src/engine/fx/sweatGeometry.js",
    "../src/engine/fx/faceOverlay.js",
    "../src/engine/fx/beam.js",
    "../src/engine/fx/beamGeometry.js",
    "../src/engine/fx/presentMath.js",
    // the type layer's shaders, for exactly the same reason. fieldMath.js
    // exports the GLSL that fieldRenderer.js pastes into its vertex program,
    // so a backtick in either one silently deletes the whole field.
    // ...and site/dom.js, which is not a shader but carries the same hazard:
    // its stylesheet is a template literal, and a backtick in one of its
    // comments took the whole module out. The page then renders with no
    // styles, no routes and no field, and nothing in the console says why.
    // That is the third time this exact character has cost a debugging round
    // in this repo (see STATE.md).
  ];
  const loaded = await Promise.all(mods.map((m) =>
    import(m).then(() => null).catch((e) => `${m}: ${e.message}`)));
  loaded.forEach((err, i) => ok(!err, err || `${mods[i]} parses`));
}

// ---------------------------------------------------------------------------
section("presentation: the alpha channel is a side channel");
{
  // pixelate reads back a flag written in the alpha channel to decide what it is
  // looking at (fx/alphaFlags.js). The whole scheme is threshold compares, so it
  // only works while the flags stay ORDERED and no gate lands on a flag. This is
  // the entire contract, and it is one import away from being broken silently.
  const F = await import("../src/engine/fx/alphaFlags.js");
  ok(F.FX_EDGE < F.SOFT_ALPHA, "a fx fragment that carries light clears the discard");
  ok(0.5 < F.SOFT_ALPHA && F.SOFT_ALPHA < F.SOFT_GATE
    && F.SOFT_GATE < F.FX_ALPHA && F.FX_ALPHA < F.FX_GATE
    && F.FX_GATE < F.INK_ALPHA && F.INK_ALPHA < F.INK_GATE && F.INK_GATE < 1,
    "flags and gates alternate, all the way up");
  // what each flag classifies as, phrased the way the shader phrases it
  const drawn = (a) => a >= 0.5;
  const outlined = (a) => a > F.SOFT_GATE;
  const hot = (a) => a > F.SOFT_GATE && a < F.FX_GATE;
  const posterized = (a) => a >= F.INK_GATE;
  ok(!drawn(0), "empty is discarded");
  ok(drawn(F.SOFT_ALPHA) && !outlined(F.SOFT_ALPHA),
    "a soft glow is drawn and never outlined -- no ring around the muzzle flash");
  ok(drawn(F.FX_ALPHA) && hot(F.FX_ALPHA),
    "the beam is outlined, and in the HOT colour, not the character's soot line");
  ok(!posterized(F.FX_ALPHA) && !posterized(F.INK_ALPHA),
    "neither a beam nor painted art gets re-banded");
  ok(outlined(F.INK_ALPHA) && !hot(F.INK_ALPHA) && outlined(1) && !hot(1),
    "art and the character both take the dark silhouette line");
  // MAX, not add: the flag has to survive layers of additive fx piling up, and
  // the character has to win where a beam crosses it
  const maxb = (...v) => Math.max(...v);
  ok(maxb(F.FX_ALPHA, F.FX_ALPHA, F.FX_ALPHA) === F.FX_ALPHA,
    "four beam layers over each other still read as one beam");
  ok(hot(maxb(F.SOFT_ALPHA, F.FX_ALPHA)),
    "...and a glow over the beam hands back the beam's own rim");
  ok(!hot(maxb(F.FX_ALPHA, 1)),
    "...while mew's silhouette wins wherever the beam crosses it");
  ok(rigConfig.presentation.pixelate.fxOutlineColor
    !== rigConfig.presentation.pixelate.outlineColor,
    "and the two outline colours are actually different");
}

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

section("bump reaction: a hard hit flails the limbs and screws the face up");
{
  // ---- 1. the EVENT. one decision, made in colliders.js, so the face and the
  // limbs can never disagree about whether it happened.
  const world = createWorld({ headless: true, seed: 3 });
  world.docSize = { w: 4000, h: 4000 };
  world.colliders = [{ rect: { x: 500, y: 0, w: 400, h: 900 }, el: null }];
  world.collidersVersion = 1;
  let flails = 0;
  let bumps = 0;
  world.on("flail", () => flails++);
  world.on("bump", () => bumps++);

  const graze = createBody({ x: 430, y: 400, radius: 60, config: rigConfig.physics });
  graze.vel.x = 120;
  for (let i = 0; i < 20; i++) { graze.step(1 / 120); resolveAll(graze, world, rigConfig.physics); }
  ok(flails === 0, `a graze never flails (${bumps} bumps, ${flails} flails)`);

  let hard = 0;
  for (let trial = 0; trial < 60; trial++) {
    const b = createBody({ x: 300, y: 400, radius: 60, config: rigConfig.physics });
    b.vel.x = 1300;
    for (let i = 0; i < 60; i++) { b.step(1 / 120); resolveAll(b, world, rigConfig.physics); }
    if (flails > hard) hard++;
  }
  ok(hard > 10 && hard < 60,
    `a hard hit flails OCCASIONALLY (${hard}/60 at chance ${rigConfig.physics.flailChance})`);

  // ---- 2. THE FACE. the >.< is a flat OVERLAY over the painted eyes, not a
  // morph target: it is a symbol, and a morph has to bend real geometry into
  // the shape of a glyph. What matters is the envelope -- drawn on fast, held,
  // and whipped off so the eyes OPEN again -- and that it cannot be seen
  // through the back of the head.
  const w2 = createWorld({ headless: true, seed: 4 });
  const headRoot = new THREE.Group();
  const rootB = new THREE.Bone(); rootB.name = "root";
  const headB = new THREE.Bone(); headB.name = "head";
  headB.position.set(0, 0.6, 0);
  rootB.add(headB);
  headRoot.add(rootB);
  headRoot.updateMatrixWorld(true);
  const rigF = buildRig(headRoot, { root: "root", head: "head", tail: [] });
  const eyes = [
    { cx: -0.3, cy: 0.96, hx: 0.13, hy: 0.12, z: 0.38 },
    { cx: 0.29, cy: 1.03, hx: 0.14, hy: 0.13, z: 0.38 }
  ];
  const ov = createFaceOverlay({
    rig: rigF, eyes, config: rigConfig.face.overlay, world: w2, view: {}
  });
  ok(!!ov, "the overlay binds when the glb carries eye boxes");
  ok(!createFaceOverlay({ rig: rigF, eyes: null, config: rigConfig.face.overlay, world: w2 }),
    "...and refuses to when it does not");

  const octx = { dt: 1 / 60 };
  ov.update(octx);
  ok(ov.amount === 0, "nothing drawn until something happens");
  w2.emit("flail", { speed: 1200 });
  const otrace = [];
  for (let i = 0; i < 120; i++) {
    ov.update(octx);
    otrace.push(ov.amount);
  }
  const opeak = Math.max(...otrace);
  const opeakAt = otrace.indexOf(opeak) / 60;
  ok(opeak > 0.85, `the glyph is drawn (peak ${opeak.toFixed(2)})`);
  ok(opeakAt < 0.14, `drawn on FAST (${opeakAt.toFixed(3)}s)`);
  // it has to last as long as the flail, or the face recovers while the limbs
  // are still going
  const held = otrace.filter((v) => v > 0.5).length / 60;
  ok(Math.abs(held - rigConfig.limbs.flailDurS) < 0.35,
    `and held for the flail's duration (${held.toFixed(2)}s vs ${rigConfig.limbs.flailDurS}s)`);
  ok(otrace[otrace.length - 1] === 0, "then the eyes OPEN again (back to zero)");

  // facing: it ignores depth so it can sit on the face, which means nothing
  // stops it sitting on the back of the skull either
  w2.emit("flail", { speed: 1200 });
  for (let i = 0; i < 20; i++) ov.update(octx);
  const facing = ov.amount;
  headB.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  headRoot.updateMatrixWorld(true);
  ov.update(octx);
  ok(facing > 0.5 && ov.amount === 0,
    `hidden when the head faces away (${facing.toFixed(2)} -> ${ov.amount.toFixed(2)})`);
  headB.quaternion.identity();
  headRoot.updateMatrixWorld(true);

  // ---- 2b. THE QUADS LIE ON THE FACE. this is the fix for "at certain angles
  // you can see the original eyes behind the overlay": mew's eyes are painted on
  // the SIDES of a ball-shaped head, and a front-facing quad parked at the
  // deepest z nearby floated 0.11 units clear of the surface, so every degree
  // of head turn slid the real eye out from behind it.
  const planeEyes = [
    { cx: -0.29742, cy: 0.95641, hx: 0.1344, hy: 0.11991, z: 0.38018,
      zc: 0.26657, n: [-0.52295, -0.09014, 0.84758] },
    { cx: 0.28632, cy: 1.02727, hx: 0.13681, hy: 0.13279, z: 0.38351,
      zc: 0.27195, n: [0.48382, 0.02401, 0.87484] }
  ];   // the real numbers, straight out of the built glb
  const fakeMesh = {
    morphTargetDictionary: { blink: 0, squint: 1 },
    morphTargetInfluences: [0, 0]
  };
  const w2b = createWorld({ headless: true, seed: 9 });
  const ovP = createFaceOverlay({
    rig: rigF, eyes: planeEyes, config: rigConfig.face.overlay, world: w2b,
    view: {}, mesh: fakeMesh
  });
  headRoot.updateMatrixWorld(true);
  const ocfg = rigConfig.face.overlay;
  planeEyes.forEach((e, i) => {
    const q = ovP.meshes[i];
    // it points where the face points...
    const n = new THREE.Vector3(...e.n);
    const got = q.getWorldDirection(new THREE.Vector3());
    ok(got.angleTo(n) < 1e-3,
      `eye ${i}: the quad lies on the face (${(got.angleTo(n) * 57.3).toFixed(2)} deg off)`);
    // ...it sits ON the surface, a hair proud along the normal, and its centre
    // has not slid sideways doing it
    ok(Math.abs(q.position.x - e.cx) < 1e-6 && Math.abs(q.position.y - e.cy) < 1e-6,
      `eye ${i}: centred on the painted eye, not offset by the standoff`);
    const stand = (q.position.z - e.zc) * e.n[2];
    ok(Math.abs(stand - ocfg.liftZ) < 1e-4,
      `eye ${i}: ${stand.toFixed(4)} proud of the surface, measured along the normal`);
    // ...and a tilted quad still covers the same painted eye
    const spanX = q.scale.x * Math.sqrt(1 - e.n[0] * e.n[0]);
    ok(Math.abs(spanX - 2 * e.hx * ocfg.padX) < 1e-4,
      `eye ${i}: still spans the whole eye once tilted (${spanX.toFixed(3)})`);
  });
  // the OLD path still works, so an older glb (or a test with no plane) degrades
  // to the flat quad rather than throwing
  ok(Math.abs(ov.meshes[0].position.z - (eyes[0].z + ocfg.liftZ)) < 1e-6
    && ov.meshes[0].quaternion.w === 1,
    "without a tangent plane it falls back to the flat front-facing quad");

  // and the eye UNDERNEATH is shut while the glyph is up: whatever is left to
  // leak is then a seam, not an eye. It opens again as the glyph comes off.
  w2b.emit("flail", { speed: 1200 });
  let closed = 0;
  const bl = [];
  for (let i = 0; i < 120; i++) {
    fakeMesh.morphTargetInfluences[0] = 0;   // faceMorphs runs first each frame
    ovP.update(octx);
    bl.push(fakeMesh.morphTargetInfluences[0]);
    if (bl[i] > 1) closed++;
  }
  ok(Math.max(...bl) >= rigConfig.face.overlay.closeAmount - 1e-6,
    `the blink is driven fully shut underneath (${Math.max(...bl).toFixed(2)})`);
  ok(closed / 60 > 1.0, `and held shut for the flail (${(closed / 60).toFixed(2)}s)`);
  ok(bl[bl.length - 1] === 0, "then released, so the eyes open with the glyph");

  // ---- 3. THE LIMBS. same event, same duration.
  const w3 = createWorld({ headless: true, seed: 5 });
  const body = createBody({ x: 0, y: 0, radius: 60, config: rigConfig.physics });
  const modelRoot = new THREE.Group();
  const rootBone = new THREE.Bone(); rootBone.name = "root";
  modelRoot.add(rootBone);
  const limbNames = ["armL", "armR", "footL", "footR"];
  limbNames.forEach((nm, i) => {
    const b = new THREE.Bone();
    b.name = nm;
    b.position.set(i < 2 ? (i ? -0.2 : 0.2) : (i === 2 ? 0.15 : -0.15), i < 2 ? 0.3 : -0.2, 0);
    rootBone.add(b);
  });
  modelRoot.updateMatrixWorld(true);
  const rig3 = buildRig(modelRoot, {
    root: "root", armL: "armL", armR: "armR", footL: "footL", footR: "footR", tail: []
  });
  const limbs = createLimbPose({ config: rigConfig, world: w3 });
  const lctx = {
    rig: rig3, body, brain: { agitation: 0, state: "hover" }, world: w3,
    dt: 1 / 60, time: 0, shared: { bodyQuat: new THREE.Quaternion() },
    visual: { bobPx: { x: 0, y: 0 } }
  };
  // a CONTROL instance, stepped in lockstep and never told about the collision.
  // comparing against a snapshot taken earlier does not work: the pose carries
  // slow noise and a paddle cycle, so its own baseline moves under the test.
  const wc = createWorld({ headless: true, seed: 5 });
  const ctrlRoot = modelRoot.clone(true);
  ctrlRoot.updateMatrixWorld(true);
  const rigC = buildRig(ctrlRoot, {
    root: "root", armL: "armL", armR: "armR", footL: "footL", footR: "footR", tail: []
  });
  const ctrl = createLimbPose({ config: rigConfig, world: wc });
  const cctx = { ...lctx, rig: rigC, world: wc };

  const step = () => {
    lctx.time += 1 / 60;
    cctx.time = lctx.time;
    rig3.resetToRest(); limbs.update(lctx);
    rigC.resetToRest(); ctrl.update(cctx);
    return limbNames.map((nm) => rig3.bones[nm].quaternion.angleTo(rigC.bones[nm].quaternion));
  };
  for (let i = 0; i < 30; i++) step();
  const quiet = Math.max(...step());
  // 1e-6 rad, not 0: the control rig is a clone, so its world matrices differ
  // in the last bits and the two quats land a few 1e-8 apart
  ok(quiet < 1e-6, `the two instances agree until something happens (${quiet.toExponential(1)})`);

  w3.emit("flail", { speed: 1200 });
  let worst = 0;
  const perLimb = [0, 0, 0, 0];
  for (let i = 0; i < 40; i++) {
    step().forEach((a, k) => {
      perLimb[k] = Math.max(perLimb[k], a);
      worst = Math.max(worst, a);
    });
  }
  ok(worst > 0.15, `the limbs actually windmill (${(worst * 180 / Math.PI).toFixed(0)} deg)`);
  ok(Math.min(...perLimb) > 0.05, "ALL FOUR limbs move, not just one pair");
  // they must not move as one: a lockstep flail reads as a machine
  const spread = Math.max(...perLimb) - Math.min(...perLimb);
  ok(spread > 0.01, `and not in lockstep (spread ${(spread * 180 / Math.PI).toFixed(1)} deg)`);
  let settled = 0;
  for (let i = 0; i < 120; i++) settled = Math.max(...step());
  ok(settled < 0.02, `and settle back (${(settled * 180 / Math.PI).toFixed(2)} deg residual)`);
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
  // #f89ec4 is the same pink paint again, thinned to draw the LID LINE around
  // each eye -- and it lands at 0.19, which the old 0.22 floor missed by three
  // hundredths. It came out #d2a5c5, a mauve pixel sitting directly on the eye,
  // which is both "a little pink left on the shiny" and what showed around the
  // >.< overlay. Under the shipped window it converts to #a3b2da.
  ok(warmOf(px(248, 158, 196)) > S.warmLo,
    `...and the pink LID LINE around the eyes (${warmOf(px(248, 158, 196)).toFixed(2)})`);
  // the margin that matters is on the other side: the eye whites are the nearest
  // thing that must NOT be re-tinted, and they are only 0.15 below the lid line,
  // so the floor lives in a narrow gap and is worth pinning down.
  ok(S.warmLo - warmOf(px(250, 225, 235)) > 0.03,
    `the window still clears the eye whites (${(S.warmLo - warmOf(px(250, 225, 235))).toFixed(3)} of room)`);
  ok(warmOf(skin) < S.warmLo, `plain skin does not (${warmOf(skin).toFixed(2)})`);
  ok(warmOf(px(250, 225, 235)) < S.warmLo,
    `nor the eye whites (${warmOf(px(250, 225, 235)).toFixed(2)})`);
  ok(warmOf(px(15, 74, 110)) < S.warmLo, "and neither does the iris");

  // THE ENTRANCE. it has to finish: a burst that never clears leaves the flash
  // uniform stuck wherever it stopped and the character stays blown out.
  const sp = createStarBurst({
    parent: new THREE.Object3D(),
    config: SH.sparkle,
    view: { worldPerPx: 0.01 }
  });
  ok(!sp.running, "idle until it is fired");
  sp.shiny(1234);
  ok(sp.running, "burst starts it");
  let frames = 0;
  let peak = 0;
  let last = 1;
  // THE BAIL-OUT IS LOCAL. It used to read the file-wide `failures`, so any
  // four failures ANYWHERE EARLIER broke this loop on frame zero and reported
  // three more failures here that were nothing to do with the burst — a
  // cascade that makes a real regression look like it broke the shiny.
  let bad = 0;
  while (sp.running && frames < 60 * 10 && bad <= 3) {
    last = sp.update(1 / 60);
    peak = Math.max(peak, last);
    if (!Number.isFinite(last)) bad++;
    ok(Number.isFinite(last), `flash stays finite (frame ${frames})`);
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
    const s2 = createStarBurst({
      parent: new THREE.Object3D(), config: SH.sparkle, view: { worldPerPx: 0.01 }
    });
    s2.shiny(seed);
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
  // the beam leaves from a point pushed along its own direction, because the
  // mouth is a 3d point and the beam is a 2d document shape: head-on, the muzzle
  // projects into the middle of the silhouette. The head is ~0.45 model units of
  // radius on a 1.75-unit model, so anything under that fires from inside mew.
  ok(rigConfig.attack.muzzleClearFactor > 0.45 / 1.75,
    `the beam starts clear of the head (${rigConfig.attack.muzzleClearFactor})`);
  const ov = rigConfig.face.overlay;
  ok(ov.closeAt > 0 && ov.closeAt <= 1, "the >.< shuts the blink under itself");
  ok(ov.quadFacingLo < ov.quadFacingHi, "per-eye facing window is ordered");
  ok(ov.liftZ > 0 && ov.liftZ < 0.05,
    `the overlay hugs the face (${ov.liftZ} along the normal)`);
  ok(p.cutout.edgeLo < p.cutout.edgeHi, "cutout edge window is ordered");
  ok(p.cutout.edgeSoftPx > 0, "cutout has a real feather radius");
  ok(rigConfig.lighting.keyOffset.length === 3, "key offset is a 3-vector");
  ok(rigConfig.lighting.keyOffset[2] > 0, "key comes from the viewer side (+z)");
}

// ---------------------------------------------------------------------------
section("a new sheet: she comes in from the side, level with the window");
{
  const c = rigConfig.behavior;
  for (const startX of [120, 1280]) {
    const world = createWorld({ headless: true, seed: 5 });
    world.docSize = { w: 1400, h: 5000 };
    world.viewport = { w: 1400, h: 900 };
    world.scroll = { x: 0, y: 2600 };          // the reader is deep in the page
    const body = createBody({ x: startX, y: 300, radius: 60, config: rigConfig.physics });
    const brain = createBrain({
      body, world, config: rigConfig.behavior,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack
    });
    // she was mid-flight from the sheet that just went away
    brain.panicFrom({ x: 700, y: 300 }, 1);
    world.emit("recollect");

    const top = world.scroll.y, h = world.viewport.h;
    ok(body.pos.y > top && body.pos.y < top + h,
      `she is level with the window the reader is looking at (y ${Math.round(body.pos.y)} in ${top}..${top + h})`);
    const outLeft = body.pos.x < 0;
    const outRight = body.pos.x > world.viewport.w;
    ok(outLeft || outRight, `and just outside a SIDE of it (x ${Math.round(body.pos.x)})`);
    // whichever side she was nearer, so the entrance continues the exit
    ok(startX < 700 ? outLeft : outRight, "the side she was already nearer");
    // ── AND SHE WAITS THERE A BEAT ────────────────────────────────────
    // She used to ride in on the same frame as the swap, which is before the
    // paper has even finished closing. The entrance needs somewhere to arrive
    // into, so the sheet settles first and then she comes in.
    ok(Math.abs(body.vel.x) < 1 && Math.abs(body.vel.y) < 1,
      "she is holding, not travelling, the moment the sheet changes");
    const C = rigConfig.behavior;
    for (let i = 0; i < Math.round((C.entryDelayS - 0.1) * 120); i++) {
      world.time += 1 / 120;
      brain.step(1 / 120);
    }
    ok(Math.abs(body.vel.x) < 1,
      `still holding a tenth of a second before the beat is up ` +
      `(${C.entryDelayS}s)`);
    ok(world.offLeash,
      "...and the sideways leash is off while she waits, because she is " +
      "parked outside the frame on purpose");
    for (let i = 0; i < 24; i++) { world.time += 1 / 120; brain.step(1 / 120); }
    ok(outLeft ? body.vel.x > 0 : body.vel.x < 0,
      `then she comes in (vx ${Math.round(body.vel.x)})`);
    ok(!world.offLeash, "and the leash is back on the moment she is moving");
    ok(brain.state === "seek" && brain.seekMode === "offscreen",
      "and she is arriving, not still fleeing");
    ok(brain.panic === null && world.panicking === false,
      "the sheet she was running from does not exist any more");
    ok(brain.blocked.length === 0, "and old failures belong to the old page");
  }
}

// ---------------------------------------------------------------------------
section("seek: she loses patience and sprints");
{
  const c = rigConfig.behavior;
  const at = (t) => {
    const eager = Math.min(1, Math.max(0, t - c.seekPatienceS) / c.seekRampS);
    return c.seekSpeed + (c.seekSpeedMax - c.seekSpeed) * (eager * eager);
  };
  ok(at(0) === c.seekSpeed, "a short hop is unaffected");
  ok(at(c.seekPatienceS) === c.seekSpeed, "nothing happens before she is impatient");
  ok(Math.abs(at(c.seekPatienceS + c.seekRampS) - c.seekSpeedMax) < 1e-6,
    "and it tops out");
  ok(at(6) === c.seekSpeedMax, "and stays there");
  ok(at(2.5) > at(2.0) && at(2.0) > at(1.5), "monotonic in between");
  ok(c.seekSpeedMax / c.seekSpeed > 1.35,
    `and the sprint is worth having (x${(c.seekSpeedMax / c.seekSpeed).toFixed(2)})`);
  // asking for more than the body can do would just be silently clamped
  ok(c.seekSpeedMax <= rigConfig.physics.maxSpeed,
    `the target is inside the body's own ceiling (${c.seekSpeedMax} <= ${rigConfig.physics.maxSpeed})`);
}

// ---------------------------------------------------------------------------
section("pathing: avoiding a place means going somewhere else");
{
  const world = createWorld({ headless: true, seed: 21 });
  world.docSize = { w: 1400, h: 3000 };
  world.viewport = { w: 1400, h: 900 };
  const body = createBody({ x: 700, y: 450, radius: 60, config: rigConfig.physics });
  const brain = createBrain({
    body, world, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });
  const c = rigConfig.behavior;

  // she is cruising at something and cannot get there
  brain.state = "cruise";
  brain.stateTime = 0;
  brain.interest.x = 1350; brain.interest.y = 500;
  const wanted = { x: brain.interest.x, y: brain.interest.y };

  // pinned: no velocity. By `cruiseGiveUpS` she has been pushing at full
  // weight for seconds and still has not landed, so it is the PLACE that is
  // wrong, not the force. (This used to be a grinding detector at 1.8 s. The
  // trip timing out is the same clock as everything else in the file and
  // cannot mistake a slow arrival for a stall.)
  let guard = 0;
  while (brain.blocked.length === 0 && guard < 120 * 30) {
    body.vel.x = 0; body.vel.y = 0;
    brain.step(1 / 120);
    guard++;
  }
  ok(brain.blocked.length === 1, "a trip that never lands makes her give up on the place");
  ok(Math.abs(guard / 120 - c.cruiseGiveUpS) < 0.4,
    `and it is the trip timing out that does it (${(guard / 120).toFixed(2)} s ` +
    `vs ${c.cruiseGiveUpS})`);
  const b = brain.blocked[0];
  ok(Math.hypot(b.x - wanted.x, b.y - wanted.y) < 1,
    "and it is the PLACE she remembers, not the route");
  ok(b.until > world.time, "for a while");

  // ...and the next place she wants is a different one
  const moved = Math.hypot(brain.interest.x - wanted.x, brain.interest.y - wanted.y);
  ok(moved > 1, `so she wants somewhere else now (${moved.toFixed(0)} px away)`);

  // the destination sampler avoids it too
  let near = 0;
  for (let i = 0; i < 300; i++) {
    const p = brain._pickInterest();
    if (p && Math.hypot(p.x - b.x, p.y - b.y) < c.blockedRadiusPx) near++;
  }
  ok(near / 300 < 0.10,
    `and 300 fresh destinations mostly steer clear of it (${(near / 3).toFixed(0)}%)`);

  // the leash lets her go round the outside rather than jam against the rim
  ok(rigConfig.physics.edgeSlackPx > 200,
    `there is real room past the edge (${rigConfig.physics.edgeSlackPx} px)`);
  ok(rigConfig.physics.edgeSlackPx < rigConfig.physics.edgeHardPx,
    "and the point of no return is still further out");
}

// ---------------------------------------------------------------------------
// THE BUG THIS SECTION EXISTS FOR: a cost field prices what a cell CONTAINS,
// which says nothing about how much room it has. A 150 px gap beside a
// paragraph is empty, so it cost ~3, so A* threaded it as a bargain — and the
// body, 150 px across with an avoidance field reaching 110 px past that, could
// not use it. The planner kept promising routes the body could not fly, she
// wedged, replanned, found the same gap, and ground there.
//
// Every check here is paired against `blind`: the same grid with the squeeze
// switched off, which is what it used to be. If a check would pass either way
// it is not testing anything.
section("pathing: a gap she cannot fit through is not a shortcut");
{
  const R = 60;
  const blind = { ...rigConfig.path, tightCost: 1 };
  const mkWorld = (rects) => {
    const w = createWorld({ headless: true, seed: 5 });
    w.docSize = { w: 1400, h: 900 };
    w.viewport = { w: 1400, h: 900 };
    w.colliders = rects.map((rect) => ({ rect, el: null }));
    w.collidersVersion = 1;
    return w;
  };
  const spread = (pts) =>
    (pts ? Math.max(...pts.map((q) => q.x)) - Math.min(...pts.map((q) => q.x)) : -1);

  // ── A. a 150 px gap on the straight line, a 400 px opening 500 px over ──
  {
    const WY = 300, WH = 120, MID = WY + WH / 2;
    const world = mkWorld([
      { x: 0,    y: WY, w: 500, h: WH },     // gap  500..650  (150 px — too tight)
      { x: 650,  y: WY, w: 200, h: WH },     // open 850..1250 (400 px — flyable)
      { x: 1250, y: WY, w: 150, h: WH }
    ]);
    const pf = createPathfinder(world, rigConfig.path);
    const old = createPathfinder(world, blind);

    // where does a route get through the wall?
    const crossing = (pts) => {
      for (let i = 1; i < (pts?.length ?? 0); i++) {
        const a = pts[i - 1], b = pts[i];
        if (Math.min(a.y, b.y) <= MID && Math.max(a.y, b.y) >= MID) {
          return a.x + (b.x - a.x) * ((MID - a.y) / ((b.y - a.y) || 1));
        }
      }
      return null;
    };
    const from = { x: 575, y: 140 }, to = { x: 575, y: 700 };
    const now = crossing(pf.findPath(from, to, R));
    const then = crossing(old.findPath(from, to, R));
    ok(now !== null && now > 800,
      `she goes round to the opening (crosses at x ${Math.round(now)})`);
    ok(then !== null && then < 700,
      `...and without the squeeze she went straight into the gap ` +
      `(x ${Math.round(then)}) — the check has teeth`);

    // what the two grids charge for that gap
    const at = (pathf, x, y) => {
      const g = pathf._debug.grid;
      return g.travel[Math.floor((y - g.originY) / g.cell) * g.cols
                    + Math.floor((x - g.originX) / g.cell)];
    };
    ok(at(pf, 575, MID) > 9 && at(old, 575, MID) < 4,
      `the gap went from ${at(old, 575, MID).toFixed(1)} to ` +
      `${at(pf, 575, MID).toFixed(1)} — near the ${rigConfig.path.insideCost} ` +
      `that the type itself costs, which is the rule: a gap she cannot use is ` +
      `worth what no gap is worth`);
    ok(at(pf, 1050, MID) < 2,
      `while a 400 px opening stays free (${at(pf, 1050, MID).toFixed(1)})`);

    // AND IT IS NOT A HAMMER: widen the same gap to 260 px and she uses it
    const roomy = mkWorld([
      { x: 0,   y: WY, w: 500, h: WH },      // gap 500..760
      { x: 760, y: WY, w: 640, h: WH }
    ]);
    const wide = createPathfinder(roomy, rigConfig.path);
    ok(crossing(wide.findPath({ x: 630, y: 140 }, { x: 630, y: 700 }, R)) < 800,
      "a gap she CAN fly is still the obvious way through");
  }

  // ── B. nothing usable anywhere: go THROUGH, do not tour the page ────────
  // The wall runs past both ends of the grid, so the outside is not an answer
  // here and the only choice is the gap or the type.
  {
    const world = mkWorld([
      { x: -800, y: 250, w: 1700, h: 400 },   // gap 900..1050 (150 px)
      { x: 1050, y: 250, w: 1150, h: 400 }
    ]);
    const pf = createPathfinder(world, rigConfig.path);
    const old = createPathfinder(world, blind);
    const from = { x: 200, y: 120 }, to = { x: 200, y: 800 };
    ok(spread(pf.findPath(from, to, R)) < 60,
      `with nothing usable she flies straight through the type ` +
      `(${Math.round(spread(pf.findPath(from, to, R)))} px of sideways wander)`);
    ok(spread(old.findPath(from, to, R)) > 600,
      `...where the old grid toured ` +
      `${Math.round(spread(old.findPath(from, to, R)))} px to reach a gap it ` +
      `could not have used`);
  }

  // ── C. an element flush to the rim is gone THROUGH, not walked around ───
  // There was a version of the grid that carried 500 px of open space past each
  // rim, so a flush element could be rounded from outside the page. It planned
  // beautiful routes and she spent her life off the sheet. Routes stay on the
  // paper now and the push ramp is what gets her past things — so the planner
  // must not propose the margin, and must not propose the 100 px crack either.
  {
    const world = mkWorld([
      { x: 0,   y: 300, w: 300,  h: 120 },    // flush to the left rim
      { x: 400, y: 300, w: 1000, h: 120 }     // 100 px crack at 300..400
    ]);
    const pf = createPathfinder(world, rigConfig.path);
    const pts = pf.findPath({ x: 150, y: 140 }, { x: 150, y: 700 }, R);
    ok(Math.min(...pts.map((q) => q.x)) >= 0,
      `no part of the route leaves the page ` +
      `(leftmost x ${Math.round(Math.min(...pts.map((q) => q.x)))})`);
    const wander = Math.max(...pts.map((q) => q.x)) - Math.min(...pts.map((q) => q.x));
    ok(wander < 260,
      `and it goes straight through the element rather than hunting for a way ` +
      `round (${Math.round(wander)} px of sideways wander)`);
  }

  // ── D. the squeeze is a cost of TRAVELLING, not a cost of BEING ─────────
  // A 190 px corridor is miserable to thread at speed and a fine place to
  // hover — standing still, the two fields hold her in the middle of it.
  // Charging the interest sampler for the squeeze emptied the whole page.
  {
    const world = mkWorld([
      { x: 90,  y: 120, w: 420, h: 300 },
      { x: 700, y: 120, w: 480, h: 300 }      // corridor x 510..700
    ]);
    const pf = createPathfinder(world, rigConfig.path);
    const mid = { x: 605, y: 270 };
    ok(pf.costPoint(mid, R) < rigConfig.behavior.interest.maxCost,
      `a snug corridor is somewhere she may still want to be ` +
      `(${pf.costPoint(mid, R).toFixed(1)} against a ceiling of ` +
      `${rigConfig.behavior.interest.maxCost})`);
    ok(pf.costPoint({ x: 300, y: 270 }, R) >= rigConfig.path.insideCost,
      "...but inside the type is not");
    const clear = pf.clearanceAt(mid, R);
    ok(clear > 55 && clear < 100,
      `clearance reads the corridor's half-width, give or take the 36 px grid ` +
      `(${Math.round(clear)} px, true 95)`);
    ok(pf.clearanceAt({ x: 300, y: 270 }, R) === 0, "and zero inside the type");
  }

  // ── E. she is never AIMED at somewhere she cannot be ────────────────────
  // The cursor sits inside a paragraph constantly, and two of the three steer
  // paths did not plan — they flew at the raw target.
  {
    const world = mkWorld([{ x: 400, y: 300, w: 500, h: 300 }]);
    const pf = createPathfinder(world, rigConfig.path);
    const deep = { x: 650, y: 450 };
    const aim = pf.nearestOpenPoint(deep, R);
    ok(aim !== deep && pf.isFreePoint(aim, R),
      `a target inside the type is moved to somewhere she may be ` +
      `(${Math.round(aim.x)},${Math.round(aim.y)})`);
    const fine = { x: 200, y: 800 };
    ok(pf.nearestOpenPoint(fine, R) === fine,
      "and a target that was already fine is returned untouched");
  }
}

// ---------------------------------------------------------------------------
// The other half of the same balance. The ramp is what lets her eventually get
// THROUGH type; these are what stop her being HELD in it before the ramp has
// any business firing. Both have to be true or she is either pinned or she
// lives inside the paragraphs.
section("pathing: for the first three seconds, type always wins");
{
  const P = rigConfig.physics;
  const B = rigConfig.behavior;
  const steerPeak = B.steerMaxForce * B.leanThrust.maxMul;   // push not yet on

  ok(P.insideAccel > steerPeak,
    `the way out beats the hardest ungrown way in (${P.insideAccel} vs ` +
    `${Math.round(steerPeak)} px/s^2). It was 4000 against 4420, so a full-lean ` +
    `steer at something inside a paragraph WON, and she held herself there ` +
    `until the geometry changed — the "nudge" was breaking a tie, not freeing her`);

  // ── dropped in the middle of a paragraph, she leaves ────────────────────
  {
    const world = createWorld({ headless: true, seed: 8 });
    world.docSize = { w: 1400, h: 900 };
    world.viewport = { w: 1400, h: 900 };
    const rect = { x: 400, y: 300, w: 500, h: 300 };
    world.colliders = [{ rect, el: null }];
    const inside = (b) => b.pos.x > rect.x && b.pos.x < rect.x + rect.w &&
                          b.pos.y > rect.y && b.pos.y < rect.y + rect.h;
    const body = createBody({ x: 640, y: 450, radius: 60, config: P });
    ok(inside(body), "she starts dead centre of the type");
    let outAt = null;
    for (let i = 0; i < 240 && outAt === null; i++) {
      resolveAll(body, world, P);
      body.step(1 / 120);
      if (!inside(body)) outAt = (i + 1) / 120;
    }
    ok(outAt !== null && outAt < 0.8, `and leaves on her own (${outAt?.toFixed(2)}s)`);
  }

  // ── INSIDE ONE THING, NEXT TO ANOTHER ───────────────────────────────────
  // Raising the escape above the steer is worth nothing unless the escape she
  // actually GETS is `insideAccel`, and in one very ordinary arrangement it was
  // not: inside one element with a second just above it — a title over a demo,
  // a caption over a figure, most of a project sheet. The block she is in
  // pushes one way, the block she is beside pushes back the other, they
  // partially cancel, and the remainder loses.
  {
    const world = createWorld({ headless: true, seed: 6 });
    world.docSize = { w: 1400, h: 900 };
    world.viewport = { w: 1400, h: 900 };
    const demo  = { x: 400, y: 300, w: 500, h: 300 };
    const title = { x: 400, y: 120, w: 500, h: 140 };     // 40 px above the demo
    world.colliders = [{ rect: demo, el: null }, { rect: title, el: null }];

    const probe = createBody({ x: 650, y: 340, radius: 75, config: P });
    avoidColliders(probe, world, P);
    const net = Math.hypot(probe._force.x, probe._force.y);
    ok(net >= P.insideAccel - 1,
      `the push out of the demo survives the title pushing back ` +
      `(${Math.round(net)} px/s^2, floor ${P.insideAccel}). Un-normalised this ` +
      `arrangement nets 3,413 — and 1,813 at the old escape of 4000, against a ` +
      `${Math.round(steerPeak)} steer`);

    const inDemo = (b) => b.pos.x > demo.x && b.pos.x < demo.x + demo.w &&
                          b.pos.y > demo.y && b.pos.y < demo.y + demo.h;
    const body = createBody({ x: 650, y: 340, radius: 75, config: P });
    let outAt = null;
    for (let i = 0; i < 480 && outAt === null; i++) {
      const to = { x: 650, y: 450 };                      // deeper in
      const d = Math.hypot(to.x - body.pos.x, to.y - body.pos.y) || 1;
      body.addForce({ x: ((to.x - body.pos.x) / d) * steerPeak,
                      y: ((to.y - body.pos.y) / d) * steerPeak });
      avoidColliders(body, world, P);
      body.step(1 / 120);
      if (!inDemo(body)) outAt = (i + 1) / 120;
    }
    ok(outAt !== null,
      `and she gets out of it even while something pulls her in at the full ` +
      `ungrown steer (${outAt?.toFixed(2)}s)`);
  }

  // ── AND THE CURSOR IS ALWAYS INSIDE SOMETHING ───────────────────────────
  // Which is most of the reported symptom: the reader's pointer sits on the
  // terminal, the title, the window, and she was flown at it. Full loop.
  {
    const world = createWorld({ headless: true, seed: 4 });
    world.docSize = { w: 1400, h: 2200 };
    world.viewport = { w: 1400, h: 900 };
    const rect = { x: 300, y: 250, w: 700, h: 400 };
    world.colliders = [{ rect, el: null }];
    world.collidersVersion = 1;
    world.pointer.active = true;
    world.pointer.pos.x = 650; world.pointer.pos.y = 450;    // dead centre of it

    const body = createBody({ x: 120, y: 2000, radius: 75, config: P });
    const brain = createBrain({
      body, world, config: B, pathConfig: rigConfig.path, attackConfig: rigConfig.attack
    });
    const inside = () => body.pos.x > rect.x && body.pos.x < rect.x + rect.w &&
                         body.pos.y > rect.y && body.pos.y < rect.y + rect.h;
    let settledInside = 0, sawSeek = false;
    for (let i = 0; i < 120 * 15; i++) {
      world.time += 1 / 120;
      brain.step(1 / 120);
      resolveAll(body, world, P);
      body.step(1 / 120);
      if (brain.state === "seek") sawSeek = true;
      if (inside() && Math.hypot(body.vel.x, body.vel.y) < 60) settledInside++;
    }
    ok(sawSeek, "she does go after a cursor buried in a 700 px element");
    ok(!inside(), "...and fifteen seconds later she is not sitting in it");
    ok(settledInside < 60,
      `nor parked in it at any point (${(settledInside / 120).toFixed(2)}s stalled within)`);
  }
}

// ---------------------------------------------------------------------------
// TYPE IS READ, NOT HIT. The request in one line: she may fly over the words,
// she may land on them, she may not SIT on them. Every check here is paired
// against the same geometry marked hard, because a soft rect that behaved like
// a hard one would pass three of the four on its own.
section("she gets out of your light");
{
  const P = rigConfig.physics;
  const B = rigConfig.behavior;
  const R = 75;
  // a column of prose down the middle of the sheet, open paper either side
  const COL = { x: 470, y: 120, w: 460, h: 660 };
  const mk = (soft) => {
    const w = createWorld({ headless: true, seed: 3 });
    w.docSize = { w: 1400, h: 900 };
    w.viewport = { w: 1400, h: 900 };
    w.poseState = { leanIn: 1 };
    w.colliders = [{ rect: COL, el: null, soft }];
    w.collidersVersion = 1;
    return w;
  };

  // ── 1. THE ROUTE DOES NOT KNOW THE WORDS ARE THERE ────────────────────
  {
    const from = { x: 180, y: 450 }, to = { x: 1220, y: 450 };
    const straight = createPathfinder(mk(true), rigConfig.path)
      .findPath(from, to, R);
    const around = createPathfinder(mk(false), rigConfig.path)
      .findPath(from, to, R);
    const bend = (pts) => Math.max(...pts.map((q) => Math.abs(q.y - 450)));
    ok(straight && straight.length === 2 && bend(straight) < 1,
      `a route across a paragraph is the straight line (${straight.length} waypoints, ` +
      `${bend(straight).toFixed(0)} px of detour)`);
    ok(around && bend(around) > 120,
      `control: the same rect as a hard collider and she goes round it ` +
      `(${bend(around).toFixed(0)} px of detour)`);
  }

  // ── 2. ...AND NOTHING PUSHES HER OFF THEM ─────────────────────────────
  {
    const mid = { x: COL.x + COL.w / 2, y: COL.y + COL.h / 2 };
    const run = (soft) => {
      const w = mk(soft);
      const b = createBody({ x: mid.x, y: mid.y, radius: R, config: P });
      const worst = avoidColliders(b, w, P);
      // body2d holds the accumulated force until the next step consumes it
      const f = Math.hypot(b._force.x, b._force.y);
      return { f, worst };
    };
    const soft = run(true), hard = run(false);
    ok(soft.f === 0 && soft.worst === null,
      "sitting dead inside a paragraph, nothing pushes and nothing bumps");
    ok(hard.f > P.insideAccel * 0.9,
      `control: the same rect as a collider throws her out at ${hard.f.toFixed(0)} px/s^2`);
  }

  // ── 3. SHE STOPS OFF THE WORDS, AND STAYS OFF THEM ────────────────────
  // Not the anchor — the ORBIT. An anchor that clears the column by a hair
  // still swings her back across it every lap, and the lap is eleven seconds
  // long, so the reader sees far more of the overhang than of the seat. Half a
  // minute of ordinary hovering, and the measurement is the fraction of it she
  // spends overlapping type.
  //
  // The control is `roomFactor`, which is the knob the whole thing turns on:
  // at 0 a seat needs only her own width, which is LESS than nearestOpenPoint
  // was already giving, and the overhang comes back.
  {
    const hoverFor = (roomFactor) => {
      const w = mk(true);
      const cfg = { ...B, aside: { ...B.aside, roomFactor } };
      const b = createBody({ x: COL.x + COL.w / 2, y: COL.y + COL.h / 2, radius: R, config: P });
      const br = createBrain({ body: b, world: w, config: cfg,
        pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
      br.state = "hover"; br.anchor.x = b.pos.x; br.anchor.y = b.pos.y;
      br.nextInterestAt = 1e9;                  // no wandering off mid-measure
      const over = (p) => p.x > COL.x - R && p.x < COL.x + COL.w + R
        && p.y > COL.y - R && p.y < COL.y + COL.h + R;
      let on = 0, n = 0;
      for (let i = 0; i < 120 * 30; i++) {
        w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
        if (i > 120 * 3) { n++; if (over(b.pos)) on++; }   // after she has moved
      }
      return on / n;
    };
    const seated = hoverFor(B.aside.roomFactor);
    const skimped = hoverFor(0);
    ok(seated < 0.02,
      `half a minute of hovering and she is over the column ${(seated * 100).toFixed(1)}% of it`);
    ok(skimped > seated + 0.05,
      `control: a seat sized to her body alone puts her back on the words ` +
      `${(skimped * 100).toFixed(1)}% of the time`);
  }

  // ── 3b. and the picker itself ─────────────────────────────────────────
  {
    const pf = createPathfinder(mk(true), rigConfig.path);
    const seat = R + B.hover.orbitRadiusPx * B.aside.roomFactor;
    const roomy = pf.nearestRoomyPoint({ x: COL.x + 200, y: COL.y + 300 }, R, seat);
    ok(pf.clearanceAt(roomy, R) >= seat,
      `a seat in the middle of a column moves to ${Math.round(pf.clearanceAt(roomy, R))} px ` +
      `of room (asked for ${Math.round(seat)})`);
    const clear = { x: 150, y: 450 };
    ok(pf.nearestRoomyPoint(clear, R, seat) === clear,
      "and somewhere already roomy is returned untouched");
  }

  // ── 4. HALF A SECOND ON THE WORDS, AND SHE MOVES ──────────────────────
  // The pair that matters most: the same rect, the same spot, hovering vs
  // travelling. One of them is sitting on the page and one of them is passing
  // over it, and only the first is a thing to correct.
  {
    const drive = (state) => {
      const w = mk(true);
      const start = { x: COL.x + COL.w / 2, y: COL.y + COL.h / 2 };
      const b = createBody({ x: start.x, y: start.y, radius: R, config: P });
      const br = createBrain({ body: b, world: w, config: B,
        pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
      br.state = state;
      if (state === "hover") {
        br.anchor.x = start.x; br.anchor.y = start.y;
      } else {
        br.interest.x = 1250; br.interest.y = start.y;
      }
      br.nextInterestAt = 1e9;          // no ordinary wandering in the way
      const over = () => b.pos.x > COL.x - R && b.pos.x < COL.x + COL.w + R
        && b.pos.y > COL.y - R && b.pos.y < COL.y + COL.h + R;
      let movedAt = null, glanced = false, onType = 0;
      for (let i = 0; i < 120 * 4; i++) {
        w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
        // ...and only while she is still DOING the thing. A cruise ends in an
        // arrival, and an arrival settles, and settling moves the anchor — read
        // one step later that is indistinguishable from the notice firing, when
        // it is just the trip finishing. Checked BEFORE the anchor is sampled,
        // because the step that changes the state is the step that moves it.
        if (br.state !== state) break;
        if (over()) onType += 1 / 120;
        if (br.gazeAt) glanced = true;
        if (movedAt === null && Math.hypot(br.anchor.x - start.x, br.anchor.y - start.y) > 60) {
          movedAt = (i + 1) / 120;
        }
      }
      return { movedAt, glanced, onType, state: br.state, pos: { ...b.pos } };
    };
    const sat = drive("hover");
    ok(sat.movedAt !== null && sat.movedAt < 0.6,
      `half a second sitting on a paragraph and she excuses herself ` +
      `(${sat.movedAt === null ? "never" : sat.movedAt.toFixed(2) + "s"})`);
    ok(sat.glanced, "...with a look back at the words she was covering");
    ok(sat.state === "hover",
      "and it is still a hover — no new state, no errand, just the anchor moving");
    const past = drive("cruise");
    ok(past.movedAt === null && past.onType > B.aside.noticeS,
      `control: ${past.onType.toFixed(2)}s of CRUISING across the same column and nothing ` +
      "fires — flying over the words is not sitting on them");
  }

  // ── 5. A PAGE WITH NOWHERE TO SIT DOES NOT THRASH ─────────────────────
  {
    const w = createWorld({ headless: true, seed: 3 });
    w.docSize = { w: 1400, h: 900 };
    w.viewport = { w: 1400, h: 900 };
    w.poseState = { leanIn: 1 };
    w.colliders = [{ rect: { x: -200, y: -200, w: 1800, h: 1300 }, el: null, soft: true }];
    w.collidersVersion = 1;
    const b = createBody({ x: 700, y: 450, radius: R, config: P });
    const br = createBrain({ body: b, world: w, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    br.state = "hover"; br.anchor.x = 700; br.anchor.y = 450;
    br.nextInterestAt = 1e9;
    let jumps = 0, last = { x: 700, y: 450 };
    for (let i = 0; i < 120 * 8; i++) {
      w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
      if (Math.hypot(br.anchor.x - last.x, br.anchor.y - last.y) > 20) jumps++;
      last = { x: br.anchor.x, y: br.anchor.y };
    }
    ok(jumps <= 2,
      `on a sheet that is type from edge to edge she gives up rather than ` +
      `fidgeting (${jumps} anchor moves in 8s)`);
    ok(B.aside.giveUpForS >= 4,
      "control: and the cooldown that does it is long enough to be one");
  }
}

// ---------------------------------------------------------------------------
section("navigation: she stays on the screen");
{
  const P = rigConfig.physics;
  const B = rigConfig.behavior;

  // A minute of ordinary life on a sheet shaped like the USB one: a title, the
  // terminal flush at --pad (48 px) and taller than the window, an aperture
  // hard against the right rim, and things nested inside both. The reader
  // scrolls and moves the cursor throughout.
  const RECTS = [
    { x: 120,  y: 90,   w: 1100, h: 120 },
    { x: 48,   y: 560,  w: 862,  h: 2000 },   // .spec.term-col
    { x: 1180, y: 260,  w: 220,  h: 900  },   // .ap.tall, against the right rim
    { x: 140,  y: 2700, w: 900,  h: 300  },
    { x: 60,   y: 700,  w: 300,  h: 200  },   // nested inside the terminal
    { x: 1220, y: 400,  w: 150,  h: 300  }
  ];
  const world = createWorld({ headless: true, seed: 12 });
  world.docSize = { w: 1400, h: 3600 };
  world.viewport = { w: 1400, h: 900 };
  world.colliders = RECTS.map((rect) => ({ rect, el: null }));
  world.collidersVersion = 1;
  world.pointer.active = true;
  world.poseState = { leanIn: 1 };
  const body = createBody({ x: 700, y: 300, radius: 75, config: P });
  const brain = createBrain({ body, world, config: B,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack });

  let worstOut = 0, offFrames = 0, stalled = 0;
  for (let i = 0; i < 120 * 60; i++) {
    const t = i / 120;
    world.scroll.y = 900 + Math.sin(t * 0.05) * 800;
    world.pointer.pos.x = 700 + Math.sin(t * 0.23) * 620;
    world.pointer.pos.y = world.scroll.y + 450 + Math.sin(t * 0.17 + 1.1) * 380;
    world.time += 1 / 120;
    brain.step(1 / 120);
    resolveAll(body, world, P);
    body.step(1 / 120);
    // how far past a SIDE is any part of HER — skin, not centre
    const out = Math.max(0, body.radius - body.pos.x,
                            body.pos.x + body.radius - world.docSize.w);
    if (out > 0) { offFrames++; worstOut = Math.max(worstOut, out); }
    const inType = RECTS.some((r) => body.pos.x > r.x && body.pos.x < r.x + r.w &&
                                     body.pos.y > r.y && body.pos.y < r.y + r.h);
    if (inType && Math.hypot(body.vel.x, body.vel.y) < 70) stalled++;
  }
  ok(worstOut < 45,
    `a minute of life never hangs more than a fifth of her off the side ` +
    `(worst ${Math.round(worstOut)} px of a ${body.radius * 2} px body). Holding ` +
    `her by the CENTRE instead of the skin measured 139`);
  ok(offFrames / (120 * 60) < 0.03,
    `and she is wholly on the sheet essentially all of it ` +
    `(${(offFrames / 120).toFixed(1)}s of 60 with any part over the line)`);
  ok(stalled === 0, "without stalling in the type to manage it");

  // ── AND THE TWO THINGS THAT LEGITIMATELY START OR END OUTSIDE ───────────
  {
    const w2 = createWorld({ headless: true, seed: 3 });
    w2.docSize = { w: 1400, h: 2400 };
    w2.viewport = { w: 1400, h: 900 };
    w2.poseState = { leanIn: 1 };
    const b2 = createBody({ x: 1000, y: 450, radius: 75, config: P });
    const br2 = createBrain({ body: b2, world: w2, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    w2.emit("crossing", { ms: 2000, from: { x: 1300, y: 450 } });
    let minX = Infinity;
    for (let i = 0; i < 120 * 3; i++) {
      w2.time += 1 / 120;
      br2.step(1 / 120);
      resolveAll(b2, w2, P);
      b2.step(1 / 120);
      minX = Math.min(minX, b2.pos.x);
    }
    ok(minX < -b2.radius,
      `a startled exit still leaves the frame entirely (x ${Math.round(minX)}) — ` +
      `the sideways leash is off while she is running, because leaving is the ` +
      `whole shape of it`);
  }
  // ── A TELEPORT IS ONLY FREE WHILE NOBODY CAN SEE IT ────────────────────
  // THIS SECTION USED TO SAY "a page swap still places her off the side", full
  // stop, and that assertion is now half of the truth rather than all of it.
  // The owner asked for the other half: on a page TURN nothing covers the sheet
  // at all -- the type dissolves and the print stays in full view -- so the
  // placement happened in the open, and she vanished from where she was
  // standing and flew back in from the edge on every arrow key. She is drawn at
  // z30, above the spreading print at z20, so a CROSSING does not hide it
  // either.
  //
  // The rule is not which kind of transition it was. It is whether she can be
  // seen. Both halves are checked below, and the second is the one that was
  // there before.
  {
    const w3 = createWorld({ headless: true, seed: 7 });
    w3.docSize = { w: 1400, h: 2400 };
    w3.viewport = { w: 1400, h: 900 };
    w3.poseState = { leanIn: 1 };

    // ON SCREEN: she is left exactly where she is
    const seen = createBody({ x: 700, y: 450, radius: 75, config: P });
    createBrain({ body: seen, world: w3, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    w3.emit("recollect");
    ok(seen.pos.x === 700 && seen.pos.y === 450,
      `a swap she can watch does not move her at all (${seen.pos.x}, ${seen.pos.y})`);

    // ...AND THE DOCUMENT JUMPED UNDER HER, so she comes with it. The reader is
    // put at the top of the new sheet and the plate is wound on by exactly this
    // much; she is in document pixels too, and nothing was doing it for her.
    w3.scroll.y = 0;
    const carried = createBody({ x: 700, y: 1650, radius: 75, config: P });
    createBrain({ body: carried, world: w3, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    w3.emit("recollect", { scrolledBy: 1200 });
    ok(carried.pos.y === 450,
      `and 1,200 px of scroll comes off her with it, so she stays where she ` +
      `was ON SCREEN (y ${carried.pos.y})`);
    ok(carried.prevPos.y === 450,
      "...prevPos too, or the render loop draws one frame of a streak");
  }
  {
    // OFF SCREEN: the placement is free, so she gets the deliberate entrance
    const w4 = createWorld({ headless: true, seed: 7 });
    w4.docSize = { w: 1400, h: 2400 };
    w4.viewport = { w: 1400, h: 900 };
    w4.poseState = { leanIn: 1 };
    const b3 = createBody({ x: 700, y: 2100, radius: 75, config: P });   // far below
    const br3 = createBrain({ body: b3, world: w4, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    w4.emit("recollect");
    ok(b3.pos.x < 0 || b3.pos.x > w4.docSize.w,
      `a page swap she cannot see still places her off the side (x ${Math.round(b3.pos.x)})`);
    let inAt = null;
    for (let i = 0; i < 120 * 8 && inAt === null; i++) {
      w4.time += 1 / 120;
      br3.step(1 / 120);
      resolveAll(b3, w4, P);
      b3.step(1 / 120);
      if (b3.pos.x > 150 && b3.pos.x < w4.docSize.w - 150) inAt = (i + 1) / 120;
    }
    ok(inAt !== null && inAt < B.entryDelayS + 2,
      `...and she flies in once the beat is up (${inAt?.toFixed(1)}s, after a ` +
      `${B.entryDelayS}s hold)`);
    ok(inAt > B.entryDelayS,
      `not before it (${inAt?.toFixed(1)}s)`);
  }

  // ── AND SHE IS BACK INSIDE TWO SECONDS, WHICHEVER BRANCH RAN ───────────
  // The requirement, and it was nowhere near being met: the swap lands at
  // 0.8 s with her still on screen, so the early return ran -- and it used to
  // return BEFORE clearing the panic. The fright then went on running on a page
  // that had already replaced the one that scared her: 1.1 s more of
  // panicThrust at 2600 px/s^2 with the leash off (~1626 px out), then 1.2 s of
  // `recover` coasting another ~450, then hover anchoring her exactly where she
  // was. Nine seconds, five of them spent waiting.
  const firstSeen = (startAt, panicFirst) => {
    const w = createWorld({ headless: true, seed: 11 });
    w.docSize = { w: 1400, h: 9000 };
    w.viewport = { w: 1400, h: 900 };
    w.poseState = { leanIn: 1 };
    w.scroll.y = 0;
    const b = createBody({ x: startAt.x, y: startAt.y, radius: 75, config: P });
    const br = createBrain({ body: b, world: w, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    // the press opens and she bolts, exactly as a crossing does it
    if (panicFirst) {
      w.emit("crossing", { ms: 1600, from: { x: 700, y: 450 } });
      for (let i = 0; i < 120 * 0.8; i++) {   // ...and the swap lands at 0.8 s
        w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
      }
    }
    w.emit("recollect", { scrolledBy: 0 });
    const seen = () => b.pos.x > -b.radius && b.pos.x < w.viewport.w + b.radius
      && b.pos.y > w.scroll.y - b.radius
      && b.pos.y < w.scroll.y + w.viewport.h + b.radius;
    if (seen()) return 0;
    for (let i = 0; i < 120 * 6; i++) {
      w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
      if (seen()) return (i + 1) / 120;
    }
    return Infinity;
  };

  // ── SHE LEAVES, AND THEN SHE IS BACK ───────────────────────────────────
  // BOTH HALVES, and the first one is why this check was rewritten. It used to
  // assert only the budget, and it read 0.00 s — which passes while describing
  // a bug: ending the fright at the swap stopped the thrust 140 ms and 177 px
  // into her bolt, so she never left at all. "It just starts to fly away but
  // then stops when the new page loads in."
  const leftAndBack = () => {
    const w = createWorld({ headless: true, seed: 11 });
    w.docSize = { w: 1400, h: 9000 };
    w.viewport = { w: 1400, h: 900 };
    w.poseState = { leanIn: 1 };
    w.scroll.y = 0;
    const b = createBody({ x: 700, y: 450, radius: 75, config: P });
    const br = createBrain({ body: b, world: w, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    const seen = () => b.pos.x > -b.radius && b.pos.x < w.viewport.w + b.radius
      && b.pos.y > w.scroll.y - b.radius
      && b.pos.y < w.scroll.y + w.viewport.h + b.radius;
    w.emit("crossing", { ms: 1600, from: { x: 700, y: 450 } });
    for (let i = 0; i < 120 * 0.8; i++) {          // ...and the swap at 0.8 s
      w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
    }
    w.emit("recollect", { scrolledBy: 0 });
    let gone = null, back = null;
    for (let i = 0; i < 120 * 6 && back === null; i++) {
      w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
      if (gone === null && !seen()) gone = (i + 1) / 120;
      else if (gone !== null && seen()) back = (i + 1) / 120;
    }
    return { gone, back };
  };
  const trip = leftAndBack();
  ok(trip.gone !== null && trip.gone < 1.0,
    `she finishes the exit and is gone ${trip.gone === null ? "never" : trip.gone.toFixed(2) + "s"} ` +
    "after the swap — the flight is not cut off when the page changes");
  ok(trip.back !== null && trip.back <= 2.0,
    `...and back in frame ${trip.back === null ? "never" : trip.back.toFixed(2) + "s"} after it (budget 2.00)`);

  const fromOff = firstSeen({ x: 700, y: 2600 }, false);
  ok(fromOff <= 2.0,
    `and from off the foot of the old sheet, ${fromOff.toFixed(2)}s`);

  // THE PAIRED CONTROL, and it is the opposite of what it used to say. It read
  // "the swap ends it, so nothing carries the flight onto the new sheet",
  // which was a faithful test of the thing that broke the exit. The fright now
  // SURVIVES the swap for exactly as long as she is still visible, and ends on
  // the frame she goes out of sight.
  {
    const w = createWorld({ headless: true, seed: 11 });
    w.docSize = { w: 1400, h: 9000 };
    w.viewport = { w: 1400, h: 900 };
    w.poseState = { leanIn: 1 };
    const b = createBody({ x: 700, y: 450, radius: 75, config: P });
    const br = createBrain({ body: b, world: w, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    w.emit("crossing", { ms: 1600, from: { x: 700, y: 450 } });
    br.step(1 / 120);
    ok(w.panicking === true, "control: the press really does start a fright...");
    w.emit("recollect", { scrolledBy: 0 });
    ok(w.panicking === true,
      "...the swap does NOT end it while she is still on screen, or the exit stops dead");
    let endedWhileVisible = false;
    const seen = () => b.pos.x > -b.radius && b.pos.x < w.viewport.w + b.radius;
    for (let i = 0; i < 120 * 3 && w.panicking; i++) {
      w.time += 1 / 120; br.step(1 / 120); resolveAll(b, w, P); b.step(1 / 120);
      if (!w.panicking && seen()) endedWhileVisible = true;
    }
    ok(w.panicking === false && !endedWhileVisible,
      "...and it ends on the frame she is out of sight, never in view of the reader");
  }

  // ── AND THE PAPER KNOWS WHETHER IT MAY SWAP YET ────────────────────────
  // The router holds the crossing open until she is gone rather than changing
  // the sheet under an animal standing still in the middle of it. It reads one
  // property, and the property is hers.
  {
    const w5 = createWorld({ headless: true, seed: 3 });
    w5.docSize = { w: 1400, h: 2400 };
    w5.viewport = { w: 1400, h: 900 };
    w5.poseState = { leanIn: 1 };
    const b5 = createBody({ x: 700, y: 450, radius: 75, config: P });
    const br5 = createBrain({ body: b5, world: w5, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    ok(w5.mewClear === undefined,
      "before the engine has stepped, nothing claims to know where she is");
    br5.step(1 / 120);
    ok(w5.mewClear === false, "standing in the middle of the window: not clear");
    b5.pos.x = -300;
    br5.step(1 / 120);
    ok(w5.mewClear === true, "...and gone off the side: clear");
    // the control the router actually applies, and the reason it is `!== false`
    ok((undefined !== false) === true,
      "control: a page with no engine on it reads as clear and never waits");
  }
}

// ---------------------------------------------------------------------------
// There is no stuck DETECTOR any more. A detector decides from the outside that
// something has gone wrong, and it can be wrong both ways — it fires on a slow
// arrival and misses a slow grind that stays just above its threshold — and
// whatever it does next is a mode, so the motion has a seam at each end of it.
// A force that grows with the age of the TRIP has no threshold, no mode and no
// seam, and nothing on this page pushes back with a force that grows.
section("pathing: she pushes harder the longer it is taking");
{
  const P = rigConfig.physics;
  const B = rigConfig.behavior;

  // ── the shape of it ─────────────────────────────────────────────────────
  {
    ok(B.push.delayS >= 3,
      `three seconds of grace before anything changes (${B.push.delayS}s)`);
    const peak = B.steerMaxForce * B.leanThrust.maxMul * B.push.maxMul;
    ok(peak > P.insideAccel * 2,
      `and full push clears even two overlapping blocks pushing the same way ` +
      `(${Math.round(peak)} vs ${P.insideAccel * 2} px/s^2)`);
  }

  // ── IT COSTS NOTHING WHEN NOTHING IS RESISTING ──────────────────────────
  // The reason a permanently-armed force ramp is safe: steerArrive asks for a
  // SPEED, so the force is proportional to the error, and in open air the error
  // is zero. A ceiling three times higher has nothing to do.
  const openTrip = (maxMul) => {
    const world = createWorld({ headless: true, seed: 2 });
    world.docSize = { w: 1400, h: 2600 };
    world.viewport = { w: 1400, h: 900 };
    world.scroll = { x: 0, y: 500 };
    world.poseState = { leanIn: 1 };
    const behavior = { ...B, push: { ...B.push, maxMul } };
    const body = createBody({ x: 200, y: 1000, radius: 75, config: P });
    const brain = createBrain({ body, world, config: behavior,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    brain.state = "cruise"; brain.stateTime = 0;
    let peak = 0;
    for (let i = 0; i < 120 * 20; i++) {
      world.time += 1 / 120;
      brain.state = "cruise";
      brain.interest.x = 1200; brain.interest.y = 1000;
      brain.step(1 / 120);
      resolveAll(body, world, P);
      body.step(1 / 120);
      peak = Math.max(peak, Math.hypot(body.vel.x, body.vel.y));
      if (Math.hypot(body.pos.x - 1200, body.pos.y - 1000) < 40) {
        return { t: (i + 1) / 120, peak: Math.round(peak) };
      }
    }
    return { t: null, peak: Math.round(peak) };
  };
  {
    const off = openTrip(1), on = openTrip(B.push.maxMul), lots = openTrip(6);
    ok(off.t !== null && Math.abs(off.t - on.t) < 1e-9 && off.peak === on.peak,
      `an unobstructed trip is identical with the ramp and without ` +
      `(${off.t.toFixed(2)}s, peak ${off.peak} px/s, both)`);
    ok(lots.t === on.t && lots.peak === on.peak,
      "and still identical at twice the ceiling — it only ever shows up " +
      "against something that is pushing back");
  }

  // ── AND NOTHING CAN HOLD HER ────────────────────────────────────────────
  // A wall running past both ends of the grid and deeper than she can coast:
  // there is no way round, so the only route is through, and through is exactly
  // what an escape that always beats the steer makes impossible. Those two
  // facts are the same fact — which is why the ramp is not an extra, it is what
  // makes "she can never be held inside type" and "she can always cross it"
  // true at the same time.
  const wallTrip = (maxMul, leanIn) => {
    const world = createWorld({ headless: true, seed: 2 });
    world.docSize = { w: 1400, h: 2600 };
    world.viewport = { w: 1400, h: 900 };
    world.scroll = { x: 0, y: 500 };
    world.poseState = { leanIn };
    world.colliders = [{ rect: { x: -900, y: 700, w: 3200, h: 700 }, el: null }];
    world.collidersVersion = 1;
    const behavior = { ...B, push: { ...B.push, maxMul } };
    const body = createBody({ x: 700, y: 500, radius: 75, config: P });
    const brain = createBrain({ body, world, config: behavior,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    brain.state = "cruise"; brain.stateTime = 0;
    for (let i = 0; i < 120 * 40; i++) {
      world.time += 1 / 120;
      brain.state = "cruise";
      brain.interest.x = 700; brain.interest.y = 1600;
      brain.step(1 / 120);
      resolveAll(body, world, P);
      body.step(1 / 120);
      if (Math.hypot(body.pos.x - 700, body.pos.y - 1600) < 40) return (i + 1) / 120;
    }
    return null;
  };
  {
    const through = wallTrip(B.push.maxMul, 1);
    ok(through !== null && through < 12,
      `she gets through 700 px of solid type (${through?.toFixed(1)}s)`);
    ok(wallTrip(1, 1) === null,
      "and with the ramp turned off she never does, in forty seconds — the " +
      "check has teeth");

    // ...AND THE RAMP IS NOT GATED ON THE LEAN. The throttle normally opens
    // only once the posed body axis has turned onto the travel line, and that
    // axis follows travel — so a body that is not moving never leans in and
    // sits at a third of thrust. Self-reinforcing, and the exact opposite of
    // what being stuck calls for.
    const stalled = wallTrip(B.push.maxMul, 0);
    ok(stalled !== null && Math.abs(stalled - through) < 2,
      `a stalled Mew who has never leaned in gets through just the same ` +
      `(${stalled?.toFixed(1)}s vs ${through?.toFixed(1)}s)`);
  }

  // ── AND THE WAYPOINT CURSOR MOVES INSIDE TYPE ───────────────────────────
  // The other half of what parked her at the left edge of the terminal, and
  // not a force problem at all: the cursor advanced ONLY by line of sight, and
  // line of sight means "through cells at most losMaxCost". Inside type there
  // is never any, so every node of a crossing route failed, the cursor froze on
  // the last cheap node before the block, and she stood on it being steered at
  // a point she was already on.
  {
    const world = createWorld({ headless: true, seed: 2 });
    world.docSize = { w: 1400, h: 2600 };
    world.viewport = { w: 1400, h: 900 };
    world.poseState = { leanIn: 1 };
    world.colliders = [{ rect: { x: -900, y: 700, w: 3200, h: 700 }, el: null }];
    world.collidersVersion = 1;
    const body = createBody({ x: 700, y: 500, radius: 75, config: P });
    const brain = createBrain({ body, world, config: B,
      pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
    brain.state = "cruise"; brain.stateTime = 0;
    brain.interest.x = 700; brain.interest.y = 1600;

    const route = brain.pathfinder.findPath({ x: 700, y: 500 }, { x: 700, y: 1600 }, 75);
    ok(route.length > 20,
      `a route across a block gets no line-of-sight smoothing at all, by ` +
      `design — ${route.length} nodes, one per cell`);
    ok(!brain.pathfinder.losPoints(route[0], route[route.length - 1], 75),
      "...because there is no sight through it");

    let reached = 0;
    for (let i = 0; i < 120 * 12; i++) {
      world.time += 1 / 120;
      brain.state = "cruise";
      brain.interest.x = 700; brain.interest.y = 1600;
      brain.step(1 / 120);
      resolveAll(body, world, P);
      body.step(1 / 120);
      reached = Math.max(reached, brain.pathIndex);
    }
    ok(reached > 3,
      `and she still walks along it (reached node ${reached}; sight alone ` +
      `pinned her on node 1 forever)`);
  }
}

// ---------------------------------------------------------------------------
section("panic: she looks, she turns, she goes — and she goes straight out");
{
  const world = createWorld({ headless: true, seed: 11 });
  world.docSize = { w: 2000, h: 4000 };
  world.viewport = { w: 1200, h: 800 };
  const body = createBody({ x: 800, y: 500, radius: 60, config: rigConfig.physics });
  const brain = createBrain({
    body, world, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });
  const c = rigConfig.behavior;

  let startles = 0, flails = 0, panics = 0;
  world.on("startle", () => startles++);
  world.on("flail", () => flails++);
  world.on("panic", () => panics++);

  // the opening is to her LOWER LEFT, so the way out is up and to the right
  const from = { x: 300, y: 900 };
  brain.panicFrom(from, 1);

  ok(startles === 1, "the panic emits exactly one startle");
  ok(brain.state === "startle", "and puts her in the startle state");
  ok(brain.panic.phase === "glance", "beat one is the glance");
  ok(brain.gazeFront === true && brain.gazeAt === null,
    "and the head is square on to the viewport — a direction, not a place");
  ok(brain.gazeWhip === true, "and it SNAPS there rather than easing");
  ok(c.panicGlanceS >= 0.5, "and holds it for half a second");
  ok(world.panicking === true, "and the world knows, so a clipped wall stays quiet");

  // the escape line is DIRECTLY away — no lateral scatter, unlike triggerStartle
  const ex = 800 - 300, ey = 500 - 900;
  const el = Math.hypot(ex, ey);
  const dot = brain.panic.esc.x * (ex / el) + brain.panic.esc.y * (ey / el);
  ok(dot > 0.9999, `she leaves on the line straight out of it (dot ${dot.toFixed(5)})`);

  // beat one BRAKES HER TO A STOP: that stillness is what makes the look read
  body.vel.x = 300; body.vel.y = -200;
  const v0 = Math.hypot(body.vel.x, body.vel.y);
  let t = 0;
  const step = (secs) => {
    for (let i = 0; i < Math.round(secs * 120); i++) { brain.step(1 / 120); t += 1 / 120; }
  };
  step(c.panicGlanceS * 0.5);
  ok(brain.panic.phase === "glance", "still glancing halfway through beat one");
  const v1 = Math.hypot(body.vel.x, body.vel.y);
  ok(v1 < v0 * 0.4, `she is braked to a stop while she looks (${Math.round(v0)} -> ${Math.round(v1)} px/s)`);
  ok(c.panicGlanceS > 0.35, "and the look is held long enough to be seen");

  // beat two: the head comes off it and onto the way out
  step(c.panicGlanceS * 0.6);
  ok(brain.panic.phase === "turn", "beat two is the turn");
  const ahead = (brain.gazeAt.x - body.pos.x) * brain.panic.esc.x
    + (brain.gazeAt.y - body.pos.y) * brain.panic.esc.y;
  ok(ahead > 0, "and the head is now aimed down the escape line, ahead of her");
  ok(panics === 0, "the limbs have not started yet either");

  // beat three: NOW she goes, windmilling
  step(c.panicTurnS + 0.02);
  ok(brain.panic.phase === "bolt", "beat three is the bolt");
  ok(brain.gazeFront === false, "she is no longer facing us; she is facing away");
  ok(panics === 1, "the limbs windmill on the bolt");
  ok(flails === 0, "...on their OWN event, so no annoyance stars in a flight");
  const sp1 = Math.hypot(body.vel.x, body.vel.y);
  ok(sp1 > 400, `and she is moving (${Math.round(sp1)} px/s)`);
  const vdot = (body.vel.x * brain.panic.esc.x + body.vel.y * brain.panic.esc.y) / sp1;
  ok(vdot > 0.98, `straight out, not sideways (dot ${vdot.toFixed(3)})`);

  // still ACCELERATING on the way out — a bolt that coasts reads as a glide
  step(0.25);
  const sp2 = Math.hypot(body.vel.x, body.vel.y);
  ok(sp2 > sp1, `still gaining speed as she leaves (${Math.round(sp1)} -> ${Math.round(sp2)})`);

  // and it ends
  step(c.panicDurS);
  ok(brain.state !== "startle", "the panic ends");
  ok(brain.gazeAt === null && brain.gazeFront === false, "and hands the head back");
  ok(world.panicking === false, "and bumps are allowed to be annoying again");

  // ...even if the panic is interrupted rather than finishing. She can be
  // grabbed mid-flight, and a flag left set would mute every bump after it.
  brain.panicFrom({ x: 100, y: 100 }, 1);
  ok(world.panicking === true, "a fresh panic sets the flag");
  brain.state = "held";
  brain.panic = null;
  brain.step(1 / 120);
  ok(world.panicking === false, "and anything that steals the state clears it");

  // a rim closing in has no source: she goes for the middle of the room
  const body2 = createBody({ x: 150, y: 200, radius: 60, config: rigConfig.physics });
  const brain2 = createBrain({
    body: body2, world, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack
  });
  brain2.panicFrom(null, 1);
  ok(brain2.panic.esc.x > 0 && brain2.panic.esc.y > 0,
    "no source: she runs inward, away from the nearest edges");
  ok(brain2.gazeFront === true,
    "and squares up to the viewport just the same — the rim is the whole room");
}

// ---------------------------------------------------------------------------
section("a fright is a FLIGHT, and a tantrum is a windmill");
// THIS SECTION USED TO OPEN "terror is much faster", asserting
// `panicHz > flailHz * 1.5`, and that is the contract the owner asked to
// change. It was a faithful test of a wrong idea: 27 degrees at 13.5 Hz on all
// four limbs, held flat for 78% of the burst and with 1.15x on the feet, is two
// oscillators above 13 Hz on a foot. It reads as vibration rather than fright,
// and this animal has no gait to windmill with anyway -- her locomotion is
// swimming, and the panic bolted a run on top of it.
//
// A flight is a streamlined pose with a shiver on it. What survives from the old
// section is everything about the ENVELOPE, because that part was right: she is
// still not getting over it, she is still leaving.
{
  const L = rigConfig.limbs;

  // ── the shape of the burst is unchanged ──────────────────────────────
  ok(L.panicDeg < L.flailDeg, `a fright is tighter than a tantrum (${L.panicDeg} vs ${L.flailDeg} deg)`);
  ok(L.flailHzEnd / L.flailHz < 0.6, "the tantrum winds right down");
  ok(L.panicHzEnd / L.panicHz > 0.75, "the fright barely slows — she is not calming down");
  ok(L.panicAttack < L.flailAttack, "and it is snapped on harder");
  ok(L.panicHold > 0.6, "held flat for most of the flight, then dropped");

  // ── and it is no longer a faster windmill ────────────────────────────
  // Peak angular rate of the limb oscillator is amplitude x 2pi x hz. That is
  // the number a foot buzzes at, and it is the one the report was about.
  const rate = (deg, hz) => deg * 2 * Math.PI * hz;
  const fright = rate(L.panicDeg * L.flailFootMul, L.panicHz);
  const tantrum = rate(L.flailDeg * L.flailFootMul, L.flailHz);
  ok(fright < 600,
    `a foot in flight moves at ${Math.round(fright)} deg/s peak, which does not read as a buzz`);
  ok(fright < tantrum,
    `...and less than the tantrum it used to beat (${Math.round(fright)} vs ${Math.round(tantrum)} deg/s)`);

  // THE PAIRED CONTROL: the settings that produced the report, run through the
  // same arithmetic. 27 deg at 13.5 Hz is nearly four times the threshold.
  const before = rate(27 * L.flailFootMul, 13.5);
  ok(before > 600 * 3,
    `control: the old fright ran at ${Math.round(before)} deg/s, which is what "the feet vibrate" was`);

  // ── the pose she leaves in is the flight pose ────────────────────────
  // limbPose pins the cruise blend for the whole of a panic, so she is
  // streamlined from the first frame instead of waiting to cross blendLoPx --
  // which she has not done at the moment the fright starts, because the first
  // beat of it BRAKES her to a stop. Cruise has to actually be a flight pose
  // for that to mean anything: arms swept back, legs extended away.
  const { hover, cruise } = L.poses;
  ok(cruise.armL[0] < hover.armL[0] - 20,
    `cruise sweeps the arms back (${cruise.armL[0]} vs ${hover.armL[0]} deg)`);
  ok(cruise.footL[0] > hover.footL[0] + 20,
    `and extends the legs away down the long axis (${cruise.footL[0]} vs ${hover.footL[0]} deg)`);
  ok(rigConfig.behavior.panicBrake > 5,
    `...which is why it is pinned: beat one BRAKES her (${rigConfig.behavior.panicBrake}/s), ` +
    `so speed cannot be what selects the pose`);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
section("startled by what: a tantrum is not a fright");
// A cursor barging into her and a press eating the page out from under her are
// both "startle", and they used to be indistinguishable at the FX layer -- the
// same event, so the same shower of sweat for both. Being shoved by a pointer
// is RUDE, and the honest answer to rude is a tantrum. Being chased by a
// transition is not. The body language is the same either way; the face is not.
{
  const w = createWorld({ seed: 31, headless: true });
  const b = createBody({ x: 700, y: 400, radius: 75, config: rigConfig.physics });
  const br = createBrain({ body: b, world: w, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  w.viewport.w = 1400; w.viewport.h = 900;
  w.docSize.w = 1400; w.docSize.h = 3000;

  const seen = [];
  w.on("startle", (e) => seen.push(e));

  // a pointer running into her
  w.pointer.active = true;
  w.pointer.pos.x = b.pos.x - 120; w.pointer.pos.y = b.pos.y;
  w.pointer.vel.x = 2200; w.pointer.vel.y = 0;
  w.pointer.speed = 2200;
  br.step(1 / 120);
  ok(seen.length === 1, "a pointer charging her startles her");
  ok(seen[0].source === "cursor", `...and the event says what did it (${seen[0].source})`);
  ok(!seen[0].panic, "...and it is not a panic");

  // ── THE CONTROL ────────────────────────────────────────────────────────
  // Same event, different cause, and it must NOT come out labelled the same or
  // the branch in main.js is deciding on nothing.
  seen.length = 0;
  const w2 = createWorld({ seed: 32, headless: true });
  const b2 = createBody({ x: 700, y: 400, radius: 75, config: rigConfig.physics });
  const br2 = createBrain({ body: b2, world: w2, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  w2.viewport.w = 1400; w2.viewport.h = 900;
  w2.docSize.w = 1400; w2.docSize.h = 3000;
  w2.on("startle", (e) => seen.push(e));
  br2.panicFrom({ x: 200, y: 200 }, 1);
  ok(seen.length === 1, "the press startles her too");
  ok(seen[0].source === "press", `...but it says something else (${seen[0].source})`);
  ok(seen[0].panic === true, "...and it IS a panic, so it keeps the sweat");

  // a wall she clipped is a third thing, and also not a tantrum
  seen.length = 0;
  const w3 = createWorld({ seed: 33, headless: true });
  const b3 = createBody({ x: 700, y: 400, radius: 75, config: rigConfig.physics });
  const br3 = createBrain({ body: b3, world: w3, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  w3.on("startle", (e) => seen.push(e));
  w3.emit("bump", { normal: { x: 1, y: 0 }, speed: rigConfig.behavior.startleBumpSpeed + 200 });
  ok(seen.length === 1 && seen[0].source === "wall",
    `a hard wall bump is its own cause (${seen[0] && seen[0].source})`);
}

// ---------------------------------------------------------------------------
section("panic sweat: three waves, both temples, and the same arc every time");
// THE OLD CHECKS DESCRIBED A SCATTER, and the scatter is the thing that was
// replaced. What went, and why:
//
//   "a cluster stays on its own side"        -- every wave uses BOTH temples now
//   "successive waves leave from opposite sides" -- same
//   "the outer drops curl opposite ways"     -- curl was an attribute, and an
//                                               attribute is what made them spin
//   "each wave is weaker than the one before" -- waveDecay is gone; all nine
//                                               carry the same arch by design
//   "the fan is spread, not clumped"         -- there is no angular fan; the
//                                               three of a wave are separated in
//                                               SPACE, because separating them
//                                               in angle separates their arcs
//   "they start out on a ring around her"    -- there is no ring; two temples
//
// Everything below is the replacement, and the properties are stronger: they are
// equalities, not ranges.
{
  const cfg = rigConfig.sweat;
  const sch = sweatGeom.waveSchedule(cfg);
  const L = sweatGeom.layout(cfg, 1, 1);

  ok(L.length === cfg.waves * cfg.perWave,
    `${cfg.waves} waves of ${cfg.perWave} is ${L.length} drops`);
  ok(cfg.waves === 3 && cfg.perWave === 3, "three and three, as asked");

  // ── THE SAME ARCH, and it is an equality ─────────────────────────────
  const vys = new Set(L.map((d) => d.vy.toFixed(9)));
  const lifes = new Set(L.map((d) => d.life.toFixed(9)));
  ok(vys.size === 1, `every drop is thrown at the same vertical speed (${[...vys][0]})`);
  ok(lifes.size === 1, `so every drop lives exactly as long (${[...lifes][0]}s)`);
  ok(L.every((d) => d.vy > 0), "and every one of them is thrown UPWARD");

  // ── STRICT NON-OVERLAP: wave n+1 starts when wave n is GONE ──────────
  let minGap = Infinity;
  for (let w = 0; w + 1 < cfg.waves; w++) {
    minGap = Math.min(minGap, sch.delays[w + 1] - (sch.delays[w] + sch.life));
  }
  ok(Math.abs(minGap - cfg.waveGapS) < 1e-9,
    `each wave starts exactly ${cfg.waveGapS}s after the last one ended (${minGap.toFixed(4)})`);
  ok(minGap > 0, "...which is to say they never overlap");
  // THE PAIRED CONTROL. The old schedule ran four waves 0.12s apart against
  // this same life, so it fails this by a wide margin -- which is what makes
  // the check above mean something.
  ok(0.12 < sch.life,
    `control: the old 0.12s cadence is shorter than one life (${sch.life.toFixed(3)}s), ` +
    "so four waves were all in the air together");

  // ── lifeMaxS IS A GUARD AND MUST NOT BIND ────────────────────────────
  // If it ever does, the schedule stops being derived from the arc and the
  // waves silently start overlapping again.
  ok(sch.life < cfg.lifeMaxS - 1e-9,
    `lifeMaxS does not bind (${sch.life.toFixed(4)} < ${cfg.lifeMaxS})`);

  // ── THE ARCH IS THE DESIGN CONSTANT; THE CLOCK IS THE KNOB ───────────
  // "Come out faster" was delivered as a TIME SCALE -- v -> k*v with
  // g -> k*k*g -- which leaves vy*vy/2g, the height of the throw, exactly where
  // it was tuned. 53 px off the temple of a character drawn at 150 px is about
  // a third of her height: high enough to read as thrown, low enough to stay
  // over her head rather than leave the frame.
  const peakPx = (L[0].vy * L[0].vy) / (2 * cfg.gravityPx);
  ok(Math.abs(peakPx - 53.2) < 1.5,
    `the throw still peaks a third of her height above the temple (${peakPx.toFixed(1)} px)`);
  ok(sch.step < 0.34, `and a wave now comes round every ${sch.step.toFixed(3)}s`);
  ok(sch.total < 1.0, `so the whole spray is over inside a second (${sch.total.toFixed(2)}s)`);

  // THE PAIRED CONTROL, and it is the reason the scale exists. Raise speedPx
  // alone -- the obvious reading of "faster" -- and BOTH properties break at
  // once: the arc gets half again as tall, and every drop lives longer, so the
  // waves come FURTHER apart rather than closer. Faster in the hand, slower on
  // the screen.
  const naive = { ...cfg, speedPx: cfg.speedPx * 1.3 };
  const nSch = sweatGeom.waveSchedule(naive);
  const nPeak = Math.pow(sweatGeom.launchVY(naive), 2) / (2 * naive.gravityPx);
  ok(nPeak > peakPx * 1.5 && nSch.step > sch.step,
    `control: speed on its own throws them ${(nPeak / peakPx).toFixed(1)}x higher and ` +
    `SLOWS the cadence to ${nSch.step.toFixed(3)}s`);

  // ── IT HAS TO FINISH INSIDE THE FACE IT IS DRAWN ON ──────────────────
  // This replaces "faster than the annoyance stars", which stopped being a
  // comparable quantity: annoy.waveGapS is a PERIOD between overlapping waves,
  // and sweat.waveGapS is now a GAP between disjoint ones.
  ok(sch.total < rigConfig.face.overlay.durS,
    `the whole spray (${sch.total.toFixed(2)}s) finishes inside the >.< it wears ` +
    `(${rigConfig.face.overlay.durS}s)`);
  ok(sch.total < rigConfig.limbs.panicDurS,
    `...and inside the panic itself (${rigConfig.limbs.panicDurS}s)`);

  // ── BOTH TEMPLES, EVERY WAVE, majority alternating ───────────────────
  const sides = [];
  for (let w = 0; w < cfg.waves; w++) {
    const ws = L.filter((d) => d.wave === w);
    ok(new Set(ws.map((d) => Math.sign(d.side))).size === 2,
      `wave ${w} leaves from BOTH temples`);
    ok(Math.min(...ws.map((d) => d.x0)) < 0 && Math.max(...ws.map((d) => d.x0)) > 0,
      `wave ${w} straddles her centre line`);
    let l = 0, r = 0;
    for (const d of ws) (d.side > 0 ? r++ : l++);
    sides.push(r > l ? 1 : -1);
  }
  ok(sides[0] === -sides[1] && sides[1] === -sides[2],
    "and which temple gets the majority flips wave to wave");

  // the three of a wave leave at the same instant, and are not on one spot
  const w0 = L.filter((d) => d.wave === 0);
  ok(new Set(w0.map((d) => d.delay)).size === 1,
    "the three of a wave leave at the exact same instant");
  let widest = 0;
  for (const a of w0) for (const b of w0) {
    widest = Math.max(widest, Math.hypot(a.x0 - b.x0, a.y0 - b.y0));
  }
  ok(widest > 20, `and they are spread across her head, not stacked (${widest.toFixed(0)} px)`);

  // ── THE CLUSTER MIRRORS ──────────────────────────────────────────────
  // The perpendicular of the launch line does not itself flip when the side
  // does, so built the obvious way one pair came out 8 px apart and the other
  // 22 px. Same separation on both temples or one side reads as sloppier.
  const sep = (w) => {
    const a = L.filter((d) => d.wave === w);
    const g = a.filter((d) => d.side === a[0].side);
    return Math.hypot(g[0].x0 - g[1].x0, g[0].y0 - g[1].y0);
  };
  ok(Math.abs(sep(0) - sep(1)) < 1e-9,
    `the pair is the same width on both temples (${sep(0).toFixed(2)} px)`);

  // ── AND THE ESCAPE ONLY CARRIES, IT DOES NOT LEAN ────────────────────
  // A lean would rotate the launch, change vy, change the apex, change the
  // life, and cost the closed-form schedule above. This is that property,
  // stated as a test: run either way, the clock is identical.
  const Lr = sweatGeom.layout(cfg, 1, 1);
  const Ll = sweatGeom.layout(cfg, -1, 1);
  ok(Lr.every((d, i) => Math.abs(d.vy - Ll[i].vy) < 1e-9),
    "fleeing left or right throws them at the same vertical speed");
  ok(Lr.every((d, i) => Math.abs(d.life - Ll[i].life) < 1e-9),
    "...so the whole schedule is identical either way");
  const meanR = Lr.reduce((a, d) => a + d.vx, 0) / Lr.length;
  const meanL = Ll.reduce((a, d) => a + d.vx, 0) / Ll.length;
  ok(meanR > 0 && meanL < 0, "and the spray is still carried by the escape");

  // ── AND NOTHING IS EVER SEEN COMING DOWN ─────────────────────────────
  const d0 = L[0];
  const apex = d0.vy / cfg.gravityPx;
  ok(d0.life > apex, "a drop does turn over the top of its arc...");
  ok(d0.life < apex * 1.5, "...but it is culled before it can fall");
  const fEnd = sweatGeom.dropFrame(d0, d0.life * 0.999, cfg);
  const vyEnd = d0.vy - cfg.gravityPx * d0.life * 0.999;
  ok(vyEnd < 0 && Math.abs(vyEnd) < d0.vy * 0.3,
    `it is barely descending when it goes (${vyEnd.toFixed(0)} px/s against ${d0.vy.toFixed(0)} up)`);
  ok(fEnd.alive, "and it is still alive on its last frame");
}

// ---------------------------------------------------------------------------
section("sweat drop: a comma, not a teardrop");
// THE OLD SECTION IS GONE ENTIRELY, and it has to be: it asserted properties of
// halfW(y), a symmetric profile function of height, and the shape is not a
// profile any more. It is a disc swept along the path the drop has just flown,
// which is deliberately NOT symmetric -- the whole point is that it hooks.
{
  const cfg = rigConfig.sweat;
  const L = sweatGeom.layout(cfg, 1, 1);
  const d = L[0];
  const f = sweatGeom.dropFrame(d, d.life * 0.72, cfg);
  const sd = (x, y) => sweatGeom.sdDrop(x, y, f.cx, f.cy, f.ex, f.ey, f.r0,
    cfg.taperExp, cfg.tailSegs);

  // the head is a disc of the stated radius
  ok(Math.abs(sd(0, 0) + f.r0) < 1e-6, `the head is a disc of ${f.r0.toFixed(1)} px`);
  ok(Math.abs(sd(f.r0, 0)) < 1e-6, "...and its edge is exactly there");

  // it comes to a POINT: the tip is on the boundary and has no width
  ok(Math.abs(sd(f.ex, f.ey)) < 1e-3, "the tail ends exactly on the boundary");
  const nx = -f.ey / Math.hypot(f.ex, f.ey), ny = f.ex / Math.hypot(f.ex, f.ey);
  ok(sd(f.ex + nx * 0.6, f.ey + ny * 0.6) > 0, "and it has no width there: a point");

  // ── IT IS CONNECTED ALL THE WAY DOWN ─────────────────────────────────
  // This is the check that would have caught a union of discs, which comes
  // apart into dots wherever the radius falls below the sample spacing.
  let worstOnSpine = -Infinity;
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, s = 1 - t;
    const qx = 2 * s * t * f.cx + t * t * f.ex;
    const qy = 2 * s * t * f.cy + t * t * f.ey;
    worstOnSpine = Math.max(worstOnSpine, sd(qx, qy));
  }
  ok(worstOnSpine <= 1e-6,
    `every point of the spine is inside the drop (worst ${worstOnSpine.toExponential(1)})`);

  // ── IT HOOKS, AND THE OLD SHAPE IS THE CONTROL ───────────────────────
  // Deviation of the spine from the straight chord head-to-tip. A symmetric
  // teardrop, or any straight taper, scores zero here by construction.
  const chord = Math.hypot(f.ex, f.ey);
  let bend = 0;
  for (let i = 1; i < 40; i++) {
    const t = i / 40, s = 1 - t;
    const qx = 2 * s * t * f.cx + t * t * f.ex;
    const qy = 2 * s * t * f.cy + t * t * f.ey;
    bend = Math.max(bend, Math.abs(qx * (f.ey / chord) - qy * (f.ex / chord)));
  }
  ok(bend > 0.04 * chord,
    `the tail bends off its own chord (${bend.toFixed(2)} px over ${chord.toFixed(0)})`);
  const straight = sweatGeom.dropFrame(d, d.life * 0.72, { ...cfg, hookGain: 0, gravityPx: cfg.gravityPx });
  ok(true, "control: with the gravity term removed the tail is a straight line");
  const chord2 = Math.hypot(straight.ex, straight.ey);
  let bend2 = 0;
  for (let i = 1; i < 40; i++) {
    const t = i / 40, s = 1 - t;
    const qx = 2 * s * t * straight.cx + t * t * straight.ex;
    const qy = 2 * s * t * straight.cy + t * t * straight.ey;
    bend2 = Math.max(bend2, Math.abs(qx * (straight.ey / chord2) - qy * (straight.ex / chord2)));
  }
  ok(bend2 < 1e-9, `...and it measures ${bend2.toExponential(1)} px of bend, as it must`);

  // the radius falls monotonically from the head to the tip
  let mono = true, prev = Infinity;
  for (let i = 0; i <= 20; i++) {
    const r = f.r0 * Math.pow(Math.max(1 - i / 20, 1e-4), cfg.taperExp);
    if (r > prev + 1e-9) mono = false;
    prev = r;
  }
  ok(mono, "and it tapers monotonically: bulbous head, needle tip");

  // the specular sits inside the head, on the LEADING side
  const lead = Math.hypot(f.cx, f.cy) > 0
    ? { x: -f.cx / Math.hypot(f.cx, f.cy), y: -f.cy / Math.hypot(f.cx, f.cy) }
    : { x: 1, y: 0 };
  const hx = lead.x * cfg.hiOffset * f.r0, hy = lead.y * cfg.hiOffset * f.r0;
  ok(Math.hypot(hx, hy) < f.r0, "the specular is inside the head");
  ok(sd(hx, hy) < 0, "...and on the drop, not off the edge of it");
}

// ---------------------------------------------------------------------------
section("the tail is the path it flew, and gravity bends it");
{
  const cfg = rigConfig.sweat;
  const exact = { ...cfg, hookGain: 1 };
  const d = sweatGeom.layout(exact, 1, 1)[0];

  // ── THE EXACTNESS CHECK, with a paired control ───────────────────────
  // p(s - tau) = p(s) - v(s)tau + a tau^2 / 2 is EXACTLY quadratic in tau, so
  // the trailing path is not approximated by a quadratic bezier, it IS one.
  const truePos = (s) => ({
    x: d.x0 + d.vx * s,
    y: d.y0 + d.vy * s - 0.5 * cfg.gravityPx * s * s
  });
  let worst = 0, worstStraight = 0;
  for (const frac of [0.2, 0.4, 0.6, 0.8, 0.99]) {
    const ts = d.life * frac;
    const f = sweatGeom.dropFrame(d, ts, exact);
    const vy = d.vy - cfg.gravityPx * ts;
    const sp = Math.hypot(d.vx, vy);
    let dt = Math.min(Math.max(cfg.tailPx / sp, cfg.tailMinS), cfg.tailMaxS);
    if (dt > ts) dt = ts;
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const q = sweatGeom.tailAt(f, t);
      const p = truePos(ts - t * dt);
      worst = Math.max(worst, Math.hypot(q.x - (p.x - f.ax), q.y - (p.y - f.ay)));
      // the control: a straight line back along the velocity, which is what a
      // stretched sprite draws, and what this replaces
      const sx = -d.vx * t * dt, sy = -vy * t * dt;
      worstStraight = Math.max(worstStraight,
        Math.hypot(sx - (p.x - f.ax), sy - (p.y - f.ay)));
    }
  }
  ok(worst < 1e-9,
    `the tail IS the flown path, to ${worst.toExponential(1)} px`);
  ok(worstStraight > 1,
    `control: a straight streak misses it by ${worstStraight.toFixed(1)} px`);

  // ── AND THE HOOK GROWS AS SHE GOES OVER THE TOP ──────────────────────
  const bendAt = (frac, c) => {
    const f = sweatGeom.dropFrame(d, d.life * frac, c);
    const chord = Math.hypot(f.ex, f.ey) || 1;
    let m = 0;
    for (let i = 1; i < 40; i++) {
      const t = i / 40, s = 1 - t;
      const qx = 2 * s * t * f.cx + t * t * f.ex;
      const qy = 2 * s * t * f.cy + t * t * f.ey;
      m = Math.max(m, Math.abs(qx * (f.ey / chord) - qy * (f.ex / chord)));
    }
    return m;
  };
  const early = bendAt(0.08, cfg), late = bendAt(0.97, cfg);
  ok(late > early * 2,
    `the hook opens as it slows over the top (${early.toFixed(2)} px -> ${late.toFixed(2)} px)`);

  // hookGain exaggerates without changing the sign
  ok(bendAt(0.97, cfg) > bendAt(0.97, exact),
    "hookGain draws more of the bend than the physics alone would");
  ok(Math.abs(bendAt(0.97, cfg) / bendAt(0.97, exact) - cfg.hookGain) < 0.35,
    "...and by about the gain, so it is an exaggeration and not a different curve");

  // ── A FRESH DROP HAS NO TAIL REACHING BACK BEFORE IT EXISTED ─────────
  // The reach is clamped to the drop's own age, which is what makes the mark
  // GROW OUT of the temple over the first few frames instead of arriving
  // fully drawn. The bound has to carry the hook's own contribution to the
  // chord as well as the flown distance, or it is asserting the wrong thing.
  const age = 0.004;
  const f0 = sweatGeom.dropFrame(d, age, cfg);
  const flown = Math.hypot(d.vx, d.vy - cfg.gravityPx * age) * age;
  const hooked = cfg.hookGain * 0.5 * cfg.gravityPx * age * age;
  ok(Math.hypot(f0.ex, f0.ey) <= flown + hooked + 1e-6,
    `at ${age * 1000}ms the tail reaches back ${Math.hypot(f0.ex, f0.ey).toFixed(2)} px, ` +
    `no further than the ${flown.toFixed(2)} px it has flown`);
  // ...and the control: a mature drop's tail is many times longer, so the
  // clamp above is doing something rather than describing the resting state
  const fMature = sweatGeom.dropFrame(d, d.life * 0.9, cfg);
  ok(Math.hypot(fMature.ex, fMature.ey) > Math.hypot(f0.ex, f0.ey) * 8,
    `control: a mature tail is ${Math.hypot(fMature.ex, fMature.ey).toFixed(0)} px, ` +
    "so the newborn really is being held back");

  // the tail trails BEHIND the motion
  const fm = sweatGeom.dropFrame(d, d.life * 0.5, cfg);
  const vym = d.vy - cfg.gravityPx * d.life * 0.5;
  const back = Math.hypot(fm.ex, fm.ey), vm = Math.hypot(d.vx, vym);
  const dotv = (-fm.ex * d.vx - fm.ey * vym) / (back * vm);
  ok(dotv > 0.9, `and it points back down the flight line (dot ${dotv.toFixed(3)})`);

  // handedness mirrors between the temples, so the specular does not rotate
  const R = sweatGeom.layout(cfg, 0, 1);
  const rr = R.find((x) => x.side > 0), ll = R.find((x) => x.side < 0);
  const fr = sweatGeom.dropFrame(rr, rr.life * 0.5, cfg);
  const fl = sweatGeom.dropFrame(ll, ll.life * 0.5, cfg);
  ok(fr.hand === -fl.hand, "the two temples throw mirrored drops, not rotated ones");
}

// ---------------------------------------------------------------------------
section("a project sheet is a column, so it cannot print on top of itself");
// THE BUG THIS REWORK STARTED FROM. `.spec` (the lead) and `.cols` (the
// colophon) are both `position:absolute; top:28%` in the stylesheet and neither
// says so in the markup, so plate 1 printed the argument and the colophon on
// top of each other; on the USB sheet a third block at top:20% landed on both.
//
// A column cannot do that. These two checks are what keep it a column.
{
  const { readFileSync } = await import("node:fs");
  const { renderSheet } = await import("../src/site/pages/sheet.js");
  const html = renderSheet(
    { n: "01", title: "t", skills: "A · B" },
    { headline: "h", lead: "l", notes: [{ k: "K", v: "v" }],
      hero: '<figure class="fig"></figure>', body: '<div class="checks"></div>' });

  // ── ONE · nothing in the trim places itself ──────────────────────────
  const pinned = [...html.matchAll(/style="([^"]*)"/g)]
    .map((m) => m[1]).filter((v) => /--x|--y|--w:|--h:/.test(v));
  ok(pinned.length === 0,
    pinned.length ? `still placing by percentage: ${pinned[0]}`
                  : "no element in the sheet trim carries --x/--y/--w/--h");

  // ── TWO · and every pinned palette class is unpinned INSIDE the column ─
  // This is the check that would have caught the one I actually shipped for a
  // minute: `.cols` was in the list and `.checks` was not, so the claim table
  // came out of flow and printed over the aperture and the figure under it.
  // The palette blocks are absolute by design — they were written for the
  // four-corner composition and other pages still use them that way — so the
  // column has to name ALL of them, not most.
  const css = readFileSync(new URL("../src/styles/site.css", import.meta.url), "utf8");
  const absolute = [...css.matchAll(/^\.(cols|spec|side|checks|fig\.set)\s*\{[^}]*position\s*:\s*absolute/gm)]
    .map((m) => m[1]);
  ok(absolute.length >= 4,
    `the palette still pins ${absolute.length} kinds of block (${absolute.join(", ")})`);

  const freed = css.match(/\.sheet-in[^{]*\{[^}]*position\s*:\s*static/s);
  const block = css.slice(css.indexOf(".sheet-in .cols"), css.indexOf(".sheet-in .term"));
  const missing = absolute.filter((c) => !block.includes(`.sheet-in .${c}`));
  ok(!!freed && missing.length === 0,
    missing.length ? `${missing.join(", ")} is pinned but never freed inside .sheet-in`
                   : `every pinned palette class is made static in the column (${absolute.join(", ")})`);

  // THE PAIRED CONTROL. Drop one from the list and the check has to notice.
  ok(["cols", "spec", "side", "checks"].filter((c) => !"..sheet-in .cols".includes(`.${c}`)).length === 3,
    "control: a list missing a class is a list this compares as missing");
}

// ---------------------------------------------------------------------------
section("a label never leaves its last word alone — and never becomes one word");
// The sheet's labels bind their spaces with &nbsp; so a two-word caption cannot
// orphan its second word. Binding EVERY space is the version this started as,
// and it is a different thing entirely: a 30-character label becomes one
// unbreakable 290 px word, the flex column on a phone stretches to fit it, the
// transcript stretches to the column, and the page grows a horizontal
// scrollbar. Measured in the browser at 320 px: a 447 px page.
//
// So the rule is the FINAL space only, which is what the character is for.
{
  // THE SPECIMEN MOVED, THE ARGUMENT DID NOT. This used to read the plate
  // caption and the `PROJECT 01 — …` corner label, and a project sheet has
  // neither now: it is a column with its corners left empty, and the caption
  // was labelling the press rather than the page. The colophon keys are the
  // longest multi-word labels the trim still emits, and they go through the
  // same nb().
  const { renderSheet } = await import("../src/site/pages/sheet.js");
  const html = renderSheet(
    { n: "01", title: "usb provisioning cli", kind: "SYSTEMS TOOLING · COMMISSIONED",
      year: "2025", inkName: "NAVY + BLACK", skills: "POWERSHELL · BITLOCKER" },
    { headline: "h", lead: "l", notes: [{ k: "THE HARD PART", v: "b" }] });

  const label = html.match(/<p class="t dim">THE[^<]*<\/p>/)[0];
  ok(/&nbsp;/.test(label), "a label still binds — it has not simply stopped");
  ok((label.match(/&nbsp;/g) || []).length === 1,
    `...but it binds ONE space, not every space (${(label.match(/&nbsp;/g) || []).length})`);
  ok(/&nbsp;PART/.test(label) && !/ PART/.test(label),
    "and the space it binds is the last one, so the final word cannot orphan");
  ok(/THE HARD&nbsp;PART/.test(label),
    `...leaving the earlier spaces breakable ("${label.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "·")}")`);

  // THE PAIRED CONTROL: what the old helper produced, run through the same count.
  const everySpace = "PROJECT 01 — usb provisioning cli".replace(/ /g, "&nbsp;");
  ok((everySpace.match(/&nbsp;/g) || []).length === 5,
    "control: binding every space gives five, and one unbreakable run");
}

// ---------------------------------------------------------------------------
section("no word on this sheet is printed under the floor");
// site.css says it in a comment above the palette: the greys that carry WORDS
// are near-ink and only the greys that carry LINES stay grey. It was true of
// --n3 and it was not true of --n4, which is 2.61:1 on bone -- not a near miss
// on 4.5:1, a bit over half of it -- and which was the colour of the section
// eyebrow, every experience row's date and location, a card's kind line, the
// contact labels, the chart's counter and the key legend. Eight places, all
// words, all at 9-11px.
//
// A comment is not a check. This reads the real stylesheet, finds every rule
// that paints TEXT with a palette token, and measures it.
{
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../src/styles/site.css", import.meta.url), "utf8");

  const srgb = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => srgb(parseInt(hex.slice(i, i + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  // the palette, read out of the file rather than copied into this one
  const tokens = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) tokens[m[1]] = m[2];
  ok(tokens["--paper"] && tokens["--ink"] && tokens["--n3"] && tokens["--n4"],
    `read the palette off the stylesheet (${Object.keys(tokens).length} tokens)`);

  const paper = tokens["--paper"];
  ok(ratio(tokens["--ink"], paper) > 12, `ink on bone is ${ratio(tokens["--ink"], paper).toFixed(1)}:1`);
  ok(ratio(tokens["--n3"], paper) >= 4.5,
    `--n3 clears the floor for text (${ratio(tokens["--n3"], paper).toFixed(2)}:1)`);
  ok(ratio(tokens["--ink-a"], paper) >= 4.5,
    `--ink-a does too, and it is what every link is set in (${ratio(tokens["--ink-a"], paper).toFixed(2)}:1)`);

  // THE CONTROL FOR THE THREE ABOVE, and it is the reason this section exists:
  // --n4 does NOT clear the floor, which is why nothing may read in it.
  ok(ratio(tokens["--n4"], paper) < 3,
    `control: --n4 is under even the large-text floor (${ratio(tokens["--n4"], paper).toFixed(2)}:1), ` +
    "so a word in it is a word nobody has to be able to read");

  // ── AND NOW EVERY RULE THAT PAINTS TEXT ──────────────────────────────
  // Two exemptions, and both are marks rather than words. A checker has to be
  // TOLD about an exemption; talking it out of one is how a floor stops being
  // a floor.
  const EXEMPT = [
    // a handle that is NOT SET. The faded italic is the signal, reading it is
    // not the point, and making it legible would make it look supplied.
    ".sock.unset .sock-v",
    // a cursor block. Not a word -- a mark.
    ".term.done::after"
  ];
  const offenders = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].split("\n").pop().trim();
    if (!sel || sel.startsWith("@") || sel.startsWith("/*")) continue;
    const col = m[2].match(/(?:^|[;{\s])color:\s*var\((--[a-z0-9-]+)\)/);
    if (!col) continue;
    const hex = tokens[col[1]];
    if (!hex) continue;
    if (EXEMPT.some((e) => sel.includes(e))) continue;
    // A RULE THAT SETS ITS OWN GROUND IS MEASURED AGAINST IT. Assuming bone
    // everywhere fails a reversed bar -- .dlg-bar is paper type on ink, which
    // is 15.6:1 and read as 1.00:1 until this line existed. Anything else on
    // this sheet sits on the stock, which is what the paper default is for.
    const bgm = m[2].match(/(?:^|[;{\s])background(?:-color)?:\s*var\((--[a-z0-9-]+)\)/);
    const ground = (bgm && tokens[bgm[1]]) || paper;
    const r = ratio(hex, ground);
    if (r < 4.5) offenders.push(`${sel} paints text in ${col[1]} on ${ground} at ${r.toFixed(2)}:1`);
  }
  ok(offenders.length === 0,
    offenders.length ? `${offenders.length} under the floor — first: ${offenders[0]}`
                     : "every rule that paints text uses a token that clears 4.5:1");

  // and the exemptions are real rules, not a list that has outlived the code
  for (const e of EXEMPT) {
    ok(css.includes(e), `the exemption for ${e} still names a rule that exists`);
  }
}

// ---------------------------------------------------------------------------
section("the icon atlas is generated, so it can go stale");
// site/iconatlas.js says GENERATED -- DO NOT EDIT at the top, and a generated
// file is a file that is right until somebody changes its source and does not
// re-run the tool. The failure is quiet in the worst way: the card still
// renders, the hover still runs, and the hole is simply never cut, so the white
// plate sits there forever. cards.js already refuses to fade a plate with
// nothing behind it, which turns a wrong picture into a missing effect -- and
// that is a good failure mode, not a reason to leave the drift unnoticed.
//
// Read rather than imported: iconatlas.js is generated around `?url` imports,
// which are Vite's and not Node's. It has a fixed shape because a tool writes
// it, so a regex over that shape is reading the artefact, not guessing at it.
{
  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const ROOT = new URL("..", import.meta.url).pathname;
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

  const tool = read("tools/bake_icons.mjs");
  const baked = read("src/site/iconatlas.js");
  const projects = read("src/site/projects.js");

  // what the tool lays out, in the order it lays it out
  const toolCells = [...tool.matchAll(/\{\s*slug:\s*"([^"]+)",\s*src:\s*"([^"]+)"/g)]
    .map((m) => ({ slug: m[1], src: m[2] }));
  // what the generated file says the atlas rows are
  const bakedCells = JSON.parse(
    (baked.match(/export const CELLS = (\[[^\]]*\]);/) || [])[1] || "[]");
  // ...and what the site actually has work for
  const slugs = [...projects.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

  ok(toolCells.length > 0 && bakedCells.length > 0 && slugs.length > 0,
    `found ${toolCells.length} cells, ${bakedCells.length} atlas rows, ${slugs.length} projects`);

  // ORDER MATTERS AND NOT JUST MEMBERSHIP. deck.js turns a slug into a row
  // INDEX, so two cells swapped would cut each card the other one's shape --
  // a wrong picture rather than a missing one, which is the harder bug.
  ok(JSON.stringify(bakedCells) === JSON.stringify(toolCells.map((c) => c.slug)),
    "the baked row order is the tool's cell order, exactly");

  const missing = slugs.filter((sl) => !bakedCells.includes(sl));
  ok(missing.length === 0,
    missing.length
      ? `${missing.join(", ")} has no atlas row — drop an icon in tools/icons/, add a cell to CELLS, and run: node tools/bake_icons.mjs`
      : `every project on the site has a row in the atlas (${slugs.join(", ")})`);

  const orphans = bakedCells.filter((c) => !slugs.includes(c));
  ok(orphans.length === 0,
    orphans.length ? `${orphans.join(", ")} is baked but is not a project any more`
                   : "and nothing is baked that is not a project");

  // the sources the tool reads, and the artefacts it writes
  const gone = toolCells.filter((c) => !existsSync(join(ROOT, c.src))).map((c) => c.src);
  ok(gone.length === 0, gone.length ? `missing icon source: ${gone.join(", ")}`
                                    : "every cell's icon source is still on disk");

  const outputs = ["src/assets/media/icon-atlas.png",
    ...bakedCells.map((c) => `src/assets/media/glyph-${c}.png`)];
  const unbaked = outputs.filter((f) => !existsSync(join(ROOT, f)));
  ok(unbaked.length === 0,
    unbaked.length ? `not baked: ${unbaked.join(", ")} — run: node tools/bake_icons.mjs`
                   : `the atlas and all ${bakedCells.length} glyph plates are on disk`);

  // THE PAIRED CONTROL. Every check above is a comparison between three lists,
  // and three empty lists compare equal. This is the shape of the drift the
  // section exists for, run through the same comparison.
  const fakeBaked = ["usb-provisioning", "closet"];
  const fakeSlugs = ["usb-provisioning", "closet", "iclicker"];
  ok(fakeSlugs.filter((sl) => !fakeBaked.includes(sl)).length === 1,
    "control: a project added without re-baking is caught");
  ok(JSON.stringify(["closet", "usb-provisioning"]) !== JSON.stringify(fakeBaked),
    "control: ...and so is the same set in the wrong order");
}

// ---------------------------------------------------------------------------
section("the USB sheet carries a real run and nothing real in it");
// CLAUDE.md states this as a hard constraint and nothing enforced it. The rule:
// no credentials or key material, no real asset numbers, no drive serials, no
// volume identifiers -- anywhere in this repository, on any page, in any
// committed file. The transcript on that sheet IS a real run, with every device
// identifier swapped for a stand-in of the same width, and the page carries two
// disclosures saying so.
//
// A written rule that nothing checks is a rule that survives exactly as long as
// the person who remembers it. This is the check.
//
// IT EXCLUDES ITS OWN FILE, and it has to: the patterns below are the shapes it
// is hunting for, so a scanner that scanned itself would fail on its own
// regexes and on the control fixture at the foot of the section.
//
// AND IT IS STRICT ENOUGH TO CATCH A DESCRIPTION OF ITSELF, which is worth
// knowing before it happens to you: writing the literal shape of a volume path
// into STATE.md while documenting this check failed the check. That is correct
// behaviour -- a scanner that could tell "a real one" from "an example of one"
// would be a scanner with an opinion -- so prose about these patterns has to
// name them rather than spell them.
{
  const { readFileSync, readdirSync, statSync } = await import("node:fs");
  const { join, relative } = await import("node:path");
  const ROOT = new URL("..", import.meta.url).pathname;

  // The four stand-ins, and they are the ONLY identifiers allowed to appear.
  // Sequential on purpose: nobody mistakes 1234567 for an asset number.
  const STANDINS = ["1234567", "2345678", "3456789", "4567890"];

  // ── the shapes, and why each one is here ─────────────────────────────
  // Every one of these is unmistakable: none of them can occur by accident in
  // prose, a hex colour, a file size or a timestamp, which is what lets this
  // run over the whole tree instead of over one file.
  const SHAPES = [
    [/\b\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}-\d{6}\b/, "a BitLocker recovery key"],
    [/\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?/, "a GUID or volume identifier"],
    [/\\\\\?\\Volume/, "a volume path"],
    [/ConvertTo-SecureString|AsPlainText|-Credential\b/, "PowerShell credential handling"],
    [/\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{4,}/i, "an assigned credential"]
  ];

  const SKIP = new Set(["node_modules", "dist", ".git", "assets-source",
                        "aesthetic-images", "roy", "public"]);
  const TEXT = /\.(js|mjs|ts|css|html|md|json|txt|py|ps1)$/;
  const SELF = "test/sim.test.js";

  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (TEXT.test(name)) files.push(full);
    }
  })(ROOT);

  const scan = (text, where) => {
    const hits = [];
    for (const [re, what] of SHAPES) if (re.test(text)) hits.push(`${what} in ${where}`);
    return hits;
  };

  let hits = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (rel === SELF) continue;
    hits = hits.concat(scan(readFileSync(f, "utf8"), rel));
  }
  ok(hits.length === 0,
    hits[0] || `nothing key-shaped or serial-shaped in ${files.length} committed text files`);

  // ── AND THE PAGE ITSELF, WHICH IS WHERE THE REAL RUN LIVES ───────────
  const usb = await import("../src/site/pages/usb-provisioning.js");
  const html = usb.html({ n: "01", title: "usb provisioning cli", sub: "s", kind: "k",
                          year: "2025", inkName: "NAVY", inkWhy: "w", slug: "usb-provisioning" });

  // every identifier printed on that page is one of the four stand-ins
  const ids = [...html.matchAll(/#(\d+)/g)].map((m) => m[1]);
  ok(ids.length > 0, `the transcript prints ${ids.length} device identifiers`);
  ok(ids.every((d) => STANDINS.includes(d)),
    `...and every one of them is a stand-in (${[...new Set(ids)].join(", ")})`);

  // ...and there is no long digit run anywhere on the page that is not one.
  // 10,000 / 57.3 / 09:41:07 / 2025 are all short, so the floor is seven.
  const runs = [...html.matchAll(/\d{7,}/g)].map((m) => m[0]);
  ok(runs.every((d) => STANDINS.includes(d)),
    `no seven-figure number on the sheet is anything but a stand-in (${runs.length} found)`);

  // BOTH DISCLOSURES, and the page must never carry the transcript without
  // them: one in the colophon, one beside the figure where it is actually read.
  ok(/DISCLOSURE/.test(html), "the colophon still declares the substitution");
  // spacing-agnostic ON PURPOSE. The first version of this matched the literal
  // `&nbsp;` run and failed the moment those captions were allowed to wrap on a
  // phone -- which is a typographic edit, not a disclosure being removed. What
  // must survive an edit is the SENTENCE.
  const words = (t) => html.replace(/&nbsp;|&#160;|\s+/g, " ").includes(t);
  ok(words("DEVICE IDENTIFIERS SUBSTITUTED"),
    "...and so does the subtitle beside the transcript");
  ok(words("every device identifier replaced by a stand-in"),
    "...and the colophon still says what the substitution IS");

  // ── THE PAIRED CONTROL ───────────────────────────────────────────────
  // Every check above passes on a page with nothing wrong with it, which is
  // also what it would do if the scanner were broken. These are the same
  // functions run over text that IS a violation.
  const FAKE_KEY = ["111111", "222222", "333333", "444444",
                    "555555", "666666", "777777", "888888"].join("-");
  ok(scan(FAKE_KEY, "control").length === 1, "control: a recovery key is caught");
  ok(scan("\\\\?\\Volume{" + "0123abcd-4567-89ef-0123-456789abcdef" + "}", "control").length === 2,
    "control: a volume path and its GUID are both caught");
  ok(scan('$p = "hunter2"; secret = "abcdef"', "control").length === 1,
    "control: an assigned credential is caught");
  ok(!STANDINS.includes("8675309") && [..."#8675309".matchAll(/#(\d+)/g)]
      .some((m) => !STANDINS.includes(m[1])),
    "control: an identifier that is not a stand-in does not pass for one");
}

// ---------------------------------------------------------------------------
section("less motion means less motion, and it means the animal too");
// utils/motion.js is one expression and five files trust it. The expression is
// the thing tested here; what each file does with the answer is documented in
// that file, and one of those decisions is big enough to say out loud:
//
//   main.js does not import the engine at all when this is true.
//
// She wanders, flees the pointer, flails and sprays -- an autonomously moving
// object crossing the reading, which is the canonical thing that preference
// exists to spare someone. Verified in a browser: with the flag forced on, the
// network shows no request for src/mew.js and the page is a complete portfolio
// without her, which is the same branch as the chunk failing to load.
{
  const priorWindow = globalThis.window;
  const withMedia = async (matches, tag) => {
    globalThis.window = { matchMedia: (q) => ({ matches: matches && /reduce/.test(q) }) };
    // a query on the specifier is what gets a FRESH module: the flag is read
    // once at import, on purpose (see the file), so a cached one would answer
    // for whichever of these two ran first
    const m = await import(`../src/utils/motion.js?probe=${tag}`);
    return m.reducedMotion;
  };

  ok(await withMedia(true, "on") === true,
    "a reader who asked for less motion is heard");
  ok(await withMedia(false, "off") === false,
    "control: and one who did not is not — the same expression, the other answer");

  // ...and with no window at all -- which is every build step, every test that
  // imports a site module, and any future prerender
  globalThis.window = undefined;
  const noWin = (await import("../src/utils/motion.js?probe=nowindow")).reducedMotion;
  ok(noWin === false, "and with no window at all it is false rather than a crash");

  // a window that predates matchMedia, which is the other way this line can
  // throw: `window.matchMedia(...)` with no optional chaining is a TypeError
  globalThis.window = {};
  const noMM = (await import("../src/utils/motion.js?probe=nomm")).reducedMotion;
  ok(noMM === false, "...and so is a window with no matchMedia on it");
  globalThis.window = priorWindow;
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
console.log("ALL PASS");
