// brain.js
// decision layer: hover / cruise / seek / startle / recover.
// cruise and seek both navigate along pathfinder routes so the character
// weaves around page elements instead of plowing into them. seek fires when
// the cursor is over half a page away (or the character is lost offscreen)
// and brings it back into view.

import { v2, makeNoise1d2, clamp, smoothstep } from "../../utils/math.js";
import { createPathfinder } from "./pathfinder.js";

export function createBrain({ body, world, config, pathConfig, attackConfig }) {
  const cfg = config;
  const atk = attackConfig;
  const nx = makeNoise1d2(Math.floor(world.random() * 1e9));
  const ny = makeNoise1d2(Math.floor(world.random() * 1e9));
  const pathfinder = createPathfinder(world, pathConfig);

  const brain = {
    state: "hover",
    agitation: 0,
    stateTime: 0,
    anchor: v2.make(body.pos.x, body.pos.y),
    interest: v2.make(body.pos.x, body.pos.y),
    nextInterestAt: 0,
    startleUntil: 0,
    offscreenSince: null,
    seekMode: null,       // "cursor" | "offscreen", latched for the whole seek
    flourish: null,       // { heading0, sign, speed, durationS } while looping
    held: null,           // { pending, downX, downY, offX, offY } while grabbed
    beamCooldownUntil: -Infinity,
    gazeHoldUntil: -Infinity,   // headLook freezes the stare until this time
    moveIntent: v2.make(0, 0),  // unit heading the brain WANTS (doc coords);
                                // bodyPose leans onto it before speed exists
    orbit: { theta: 0, dir: 1, nextFlipAt: 0 },
    path: null,          // [{x, y}] doc coords, current route
    pathIndex: 0,
    pathTarget: v2.make(0, 0),
    lastPlanAt: -10,
    stuckTime: 0,
    step,
    triggerStartle,
    startlePredicate,
    pathfinder            // exposed for tests + debugging
  };

  world.on("bump", (e) => {
    if (e.speed > cfg.startleBumpSpeed) {
      triggerStartle({ x: e.normal.x, y: e.normal.y }, 0.8);
    } else {
      brain.agitation = clamp(brain.agitation + e.speed / 2500, 0, 1);
    }
    // a bump means the current route failed; replan next step
    brain.path = null;
  });

  // petting: a clean click (press without dragging) starts the hyper beam
  // charge. no bounce, no startle -- it plants itself and powers up
  function tryPet() {
    if (!atk) return;
    if (brain.state === "charge" || brain.state === "fire") return;
    if (world.time < brain.beamCooldownUntil) return;
    brain.state = "charge";
    brain.stateTime = 0;
    brain.path = null;
    brain.flourish = null;
    world.emit("beamCharge", {});
  }
  world.on("pet", tryPet);

  // grab & fling: press on mew and drag to carry it around; release throws
  // it with the hand's velocity. a press that never moves resolves to a pet
  world.on("mewdown", (e) => {
    if (brain.state === "charge" || brain.state === "fire") return;
    brain.state = "held";
    brain.stateTime = 0;
    brain.path = null;
    brain.flourish = null;
    brain.held = {
      pending: true,
      downX: e.point.x,
      downY: e.point.y,
      offX: body.pos.x - e.point.x,
      offY: body.pos.y - e.point.y
    };
  });

  world.on("pointerup", () => {
    if (brain.state !== "held") return;
    const h = brain.held;
    brain.held = null;
    if (h.pending) {
      // never dragged: it was a pet
      brain.state = "hover";
      brain.stateTime = 0;
      v2.copy(brain.anchor, body.pos);
      tryPet();
      return;
    }
    // throw: hand velocity becomes mew velocity
    const f = cfg.fling;
    const fv = v2.clampLen(v2.make(),
      v2.scale(v2.make(), world.pointer.vel, f.flingGain), f.flingMaxPx);
    v2.copy(body.vel, fv);
    brain.agitation = clamp(brain.agitation + 0.3, 0, 1);
    brain.state = "flung";
    brain.stateTime = 0;
  });

  world.on("docresize", () => { brain.path = null; });

  function startlePredicate(pointer, charPos) {
    if (!pointer.active) return false;
    if (pointer.speed < cfg.startleCursorSpeed) return false;
    const toChar = v2.sub(v2.make(), charPos, pointer.pos);
    const dist = v2.len(toChar);
    if (dist > cfg.startleDistance) return false;
    const closing = v2.dot(pointer.vel, v2.norm(v2.make(), toChar));
    return closing > cfg.startleClosingSpeed;
  }

  function triggerStartle(awayDir, intensity) {
    if (brain.state === "startle") return;
    brain.state = "startle";
    brain.stateTime = 0;
    brain.path = null;
    brain.agitation = clamp(brain.agitation + intensity, 0, 1);
    brain.startleUntil = cfg.startleDurMinS + world.random() * (cfg.startleDurMaxS - cfg.startleDurMinS);
    const lateral = world.random() < 0.5 ? -1 : 1;
    const esc = v2.norm(v2.make(), v2.make(
      awayDir.x * 0.75 - awayDir.y * 0.25 * lateral,
      awayDir.y * 0.75 + awayDir.x * 0.25 * lateral
    ));
    body.addImpulse(v2.scale(v2.make(), esc, cfg.startleImpulse * (0.6 + 0.4 * intensity)));
    world.emit("startle", { dir: esc, intensity });
  }

  // ------------------------------------------------------------------
  // seek entry: cursor far away, or character lost offscreen. the chosen
  // goal provider is LATCHED for the whole seek so the two goals can never
  // fight each other mid-flight (that flip-flop freezes the character).
  // ------------------------------------------------------------------
  function seekEntry() {
    const vp = world.viewport;
    const p = world.pointer;
    if (p.active) {
      const dist = Math.hypot(p.pos.x - body.pos.x, p.pos.y - body.pos.y);
      const trigger = cfg.seekTriggerFactor * Math.max(vp.w, vp.h);
      if (dist > trigger) return "cursor";
    }
    const sy = world.scroll.y;
    const off = body.pos.y < sy - 40 || body.pos.y > sy + vp.h + 40;
    if (off) {
      if (brain.offscreenSince === null) brain.offscreenSince = world.time;
      if (world.time - brain.offscreenSince > cfg.offscreenReturnS) return "offscreen";
    } else {
      brain.offscreenSince = null;
    }
    return null;
  }

  // live goal for the latched mode
  function seekGoal(mode) {
    const vp = world.viewport;
    if (mode === "cursor" && world.pointer.active) {
      return { x: world.pointer.pos.x, y: world.pointer.pos.y - cfg.seekHoverAbovePx };
    }
    // offscreen return (also the fallback if the pointer vanished): the
    // middle of whatever the user is currently looking at
    return { x: vp.w * 0.5, y: world.scroll.y + vp.h * 0.45 };
  }

  function seekDone(mode) {
    if (mode === "cursor" && world.pointer.active) {
      const g = seekGoal(mode);
      return Math.hypot(g.x - body.pos.x, g.y - body.pos.y) < cfg.seekStopPx;
    }
    // offscreen mode: done when comfortably back inside the viewport band
    const sy = world.scroll.y;
    return body.pos.y > sy + 120 && body.pos.y < sy + world.viewport.h - 120;
  }

  // ------------------------------------------------------------------
  // path following: replan when stale, steer at the furthest visible waypoint
  // ------------------------------------------------------------------
  function followPath(target, speed, dt) {
    const needPlan =
      !brain.path ||
      world.time - brain.lastPlanAt > pathConfig.replanMaxS ||
      Math.hypot(target.x - brain.pathTarget.x, target.y - brain.pathTarget.y) > pathConfig.targetMoveReplanPx;

    if (needPlan && world.time - brain.lastPlanAt > pathConfig.replanMinS) {
      brain.path = pathfinder.findPath(body.pos, target, body.radius);
      brain.pathIndex = 0;
      v2.copy(brain.pathTarget, target);
      brain.lastPlanAt = world.time;
    }
    if (!brain.path || brain.path.length === 0) {
      // no route (rare): fall back to direct arrive-seek
      steerArrive(target, speed, dt);
      return Math.hypot(target.x - body.pos.x, target.y - body.pos.y);
    }

    // advance the waypoint index to the furthest node we can see
    while (
      brain.pathIndex < brain.path.length - 1 &&
      pathfinder.losPoints(body.pos, brain.path[brain.pathIndex + 1], body.radius)
    ) {
      brain.pathIndex++;
    }
    const wp = brain.path[brain.pathIndex];
    const last = brain.pathIndex === brain.path.length - 1;
    steerArrive(wp, speed, dt, last);

    // stuck detection: pinned against something the grid missed
    const sp = Math.hypot(body.vel.x, body.vel.y);
    brain.stuckTime = sp < 40 ? brain.stuckTime + dt : 0;
    if (brain.stuckTime > 1.2) {
      brain.path = null;
      brain.stuckTime = 0;
    }
    return Math.hypot(target.x - body.pos.x, target.y - body.pos.y);
  }

  const tmpF = v2.make();

  function steerArrive(point, speed, dt, arrive = true) {
    const to = v2.sub(v2.make(), point, body.pos);
    const dist = v2.len(to);
    const dir = v2.norm(v2.make(), to);
    v2.copy(brain.moveIntent, dir);
    const speedTarget = arrive ? speed * smoothstep(20, cfg.arriveRadius, dist) : speed;
    const desired = v2.scale(v2.make(), dir, speedTarget);
    // anime acceleration: weak thrust until the body has visibly leaned onto
    // the travel line (poseState.leanIn comes from the actual posed axis),
    // then the throttle opens hard and keeps pulling to top speed
    const lt = cfg.leanThrust;
    const lean = world.poseState ? world.poseState.leanIn : 1;
    const mul = lt.minMul + (lt.maxMul - lt.minMul) * smoothstep(lt.leanLo, lt.leanHi, lean);
    const steer = v2.set(tmpF,
      (desired.x - body.vel.x) * cfg.steerGain * mul,
      (desired.y - body.vel.y) * cfg.steerGain * mul);
    body.addForce(v2.clampLen(steer, steer, cfg.steerMaxForce * mul));
  }

  // light repulsion near collider surfaces: catches spring overshoot before
  // it becomes a bump. only active while traveling.
  function avoidWhiskers() {
    const range = cfg.avoidDistPx;
    for (const c of world.colliders) {
      const r = c.rect;
      const cx = Math.max(r.x, Math.min(body.pos.x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(body.pos.y, r.y + r.h));
      const dx = body.pos.x - cx;
      const dy = body.pos.y - cy;
      const d = Math.hypot(dx, dy);
      if (d > 1e-6 && d < body.radius + range) {
        const f = cfg.avoidGain * (1 - (d - body.radius) / range);
        body.addForce(v2.set(tmpF, (dx / d) * f, (dy / d) * f));
      }
    }
  }

  function pickInterest() {
    const vp = world.viewport;
    const m = cfg.margin;
    // sample inside the currently visible band so it stays with the user
    const y0 = world.scroll.y + m;
    const y1 = Math.min(world.scroll.y + vp.h, world.docSize.h) - m;
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      const p = v2.make(m + world.random() * (vp.w - 2 * m), y0 + world.random() * Math.max(y1 - y0, 1));
      if (!pathfinder.isFreePoint(p, body.radius)) continue;
      const d = v2.len(v2.sub(v2.make(), p, body.pos));
      const score = -Math.abs(d - 500) + world.random() * 120;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  function scheduleNextInterest() {
    brain.nextInterestAt = world.time + cfg.interestMinS + world.random() * (cfg.interestMaxS - cfg.interestMinS);
  }
  scheduleNextInterest();

  function maybeFlourish(chance) {
    const speed = Math.hypot(body.vel.x, body.vel.y);
    if (speed < cfg.flourish.minSpeed) return false;
    if (world.random() >= chance) return false;
    // accelerate INTO the loop and size the circle from the entry speed:
    // faster arrivals make crisper, bigger loops. duration follows from
    // geometry so it always reads as flying a circle
    const loopSpeed = Math.max(speed * cfg.flourish.speedMul, cfg.flourish.speed);
    const radius = clamp(loopSpeed * 0.165, cfg.flourish.radiusPx * 0.85, cfg.flourish.maxRadiusPx);
    brain.state = "flourish";
    brain.stateTime = 0;
    brain.path = null;
    brain.flourish = {
      heading0: Math.atan2(body.vel.y, body.vel.x),
      sign: world.random() < 0.5 ? -1 : 1,
      speed: loopSpeed,
      durationS: (2 * Math.PI * radius) / loopSpeed
    };
    return true;
  }

  function step(dt) {
    brain.stateTime += dt;
    brain.agitation *= Math.exp(-dt / cfg.agitationTau);
    v2.set(brain.moveIntent, 0, 0); // travel states re-assert it every step

    const busy = brain.state === "startle" || brain.state === "charge" ||
      brain.state === "fire" || brain.state === "flourish" ||
      brain.state === "held" || brain.state === "flung";
    if (!busy && startlePredicate(world.pointer, body.pos)) {
      const away = v2.norm(v2.make(), v2.sub(v2.make(), body.pos, world.pointer.pos));
      triggerStartle(away, 1.0);
    }

    // seek preempts hover/cruise (never an active startle)
    if (brain.state === "hover" || brain.state === "cruise") {
      const mode = seekEntry();
      if (mode) {
        brain.state = "seek";
        brain.seekMode = mode;
        brain.stateTime = 0;
        brain.path = null;
      }
    }

    switch (brain.state) {
      case "hover": {
        // buoyant idle: follow a slowly evolving ORBIT around the anchor --
        // circular trails with wandering radius/speed and a small epicycle,
        // occasionally reversing direction. the controller is near-critical,
        // so all the character comes from the round path itself
        const h = cfg.hover;
        const o = brain.orbit;
        if (world.time >= o.nextFlipAt) {
          o.dir = -o.dir;
          o.nextFlipAt = world.time + h.dirFlipMeanS * (0.5 + world.random());
        }
        const slow = world.time * 0.11;
        const omega = h.omegaRad * (1 + nx(slow) * h.omegaVar) * o.dir
          * (1 + brain.agitation * 0.7);
        o.theta += omega * dt;
        const r = h.orbitRadiusPx * (1 + ny(slow + 9.4) * h.radiusVar);
        const e = r * h.epicycle;
        const tx = brain.anchor.x + Math.cos(o.theta) * r + Math.cos(o.theta * 2.3 + 1.2) * e;
        const ty = brain.anchor.y + Math.sin(o.theta) * r * 0.8 + Math.sin(o.theta * 2.3) * e;
        body.addForce(v2.set(tmpF,
          (tx - body.pos.x) * h.posGain - body.vel.x * h.velDamp,
          (ty - body.pos.y) * h.posGain - body.vel.y * h.velDamp));
        if (world.time >= brain.nextInterestAt) {
          const p = pickInterest();
          if (p) {
            v2.copy(brain.interest, p);
            brain.state = "cruise";
            brain.stateTime = 0;
            brain.path = null;
          } else {
            scheduleNextInterest();
          }
        }
        break;
      }
      case "cruise": {
        const dist = followPath(brain.interest, cfg.cruiseSpeed, dt);
        avoidWhiskers();
        // rare spontaneous loop mid-flight
        if (maybeFlourish(cfg.flourish.cruiseChancePerS * dt)) break;
        if (dist < 26 || brain.stateTime > 14) {
          // arriving with real speed can end in a celebratory loop too
          if (!maybeFlourish(cfg.flourish.chanceOnArrive * 0.8)) {
            v2.copy(brain.anchor, body.pos);
            brain.state = "hover";
            brain.stateTime = 0;
            scheduleNextInterest();
          }
        }
        break;
      }
      case "seek": {
        followPath(seekGoal(brain.seekMode), cfg.seekSpeed, dt);
        avoidWhiskers();
        // arrived (with hysteresis vs the entry trigger): maybe celebrate
        // with a loop-de-loop, else settle and hover
        if (seekDone(brain.seekMode) || brain.stateTime > 30) {
          brain.offscreenSince = null;
          if (!maybeFlourish(cfg.flourish.chanceOnArrive)) {
            v2.copy(brain.anchor, body.pos);
            brain.state = "hover";
            brain.stateTime = 0;
            scheduleNextInterest();
          }
        }
        break;
      }
      case "flourish": {
        // fly a quick full circle: the velocity heading sweeps 2pi over the
        // duration, and the strong steering supplies the centripetal force.
        // orientation follows velocity, so the body carves the loop with the
        // belly toward the center (curvature banking in bodyPose)
        const f = brain.flourish;
        const theta = f.heading0 + f.sign * 2 * Math.PI * (brain.stateTime / f.durationS);
        v2.set(brain.moveIntent, Math.cos(theta), Math.sin(theta));
        const steer = v2.set(tmpF,
          (Math.cos(theta) * f.speed - body.vel.x) * cfg.steerGain * 3,
          (Math.sin(theta) * f.speed - body.vel.y) * cfg.steerGain * 3);
        body.addForce(v2.clampLen(steer, steer, cfg.flourish.steerCap));
        avoidWhiskers(); // loops don't pathfind; at least shy off walls
        if (brain.stateTime >= f.durationS) {
          brain.flourish = null;
          v2.copy(brain.anchor, body.pos);
          brain.state = "hover";
          brain.stateTime = 0;
          scheduleNextInterest();
        }
        break;
      }
      case "charge": {
        // plant and power up: hard braking, eyes locked on the cursor
        const damp = 1 / (1 + 6 * dt);
        body.vel.x *= damp;
        body.vel.y *= damp;
        if (brain.stateTime >= atk.chargeS) {
          // fire toward where the cursor is RIGHT NOW; the beam then stays put
          const p = world.pointer;
          const d = v2.make(p.pos.x - body.pos.x, p.pos.y - body.pos.y);
          if (v2.len(d) < 1) d.x = 1;
          v2.norm(d, d);
          world.emit("beamFire", { dir: d });
          body.addImpulse(v2.scale(v2.make(), d, -atk.recoil));
          brain.agitation = Math.min(brain.agitation + 0.35, 1);
          brain.state = "fire";
          brain.stateTime = 0;
          // keep staring down the beam until a beat after it dissipates
          brain.gazeHoldUntil = world.time + atk.expandS + atk.sustainS + atk.fadeS + atk.gazeHoldAfterS;
        }
        break;
      }
      case "fire": {
        const damp = 1 / (1 + 2.5 * dt);
        body.vel.x *= damp;
        body.vel.y *= damp;
        if (brain.stateTime >= atk.expandS + atk.sustainS + atk.fadeS) {
          brain.beamCooldownUntil = world.time + atk.cooldownS;
          v2.copy(brain.anchor, body.pos);
          brain.state = "hover";
          brain.stateTime = 0;
          scheduleNextInterest();
        }
        break;
      }
      case "held": {
        // carried: snappy spring to the hand with a touch of lag, dangling.
        // collisions still resolve, so it can be dragged along surfaces
        const h = brain.held;
        if (!h) { brain.state = "hover"; break; }
        if (h.pending) {
          const moved = Math.hypot(world.pointer.pos.x - h.downX, world.pointer.pos.y - h.downY);
          if (moved > cfg.fling.grabThresholdPx) {
            h.pending = false;
            brain.agitation = clamp(brain.agitation + 0.2, 0, 1);
          }
        }
        const fhx = (world.pointer.pos.x + h.offX - body.pos.x) * cfg.fling.holdGain
          - body.vel.x * cfg.fling.holdDamp;
        const fhy = (world.pointer.pos.y + h.offY - body.pos.y) * cfg.fling.holdGain
          - body.vel.y * cfg.fling.holdDamp;
        body.addForce(v2.set(tmpF, fhx, fhy));
        break;
      }
      case "flung": {
        // ballistic ride: no steering, just physics until it slows, then a
        // possible celebratory loop, else settle where it ended up
        const sp = Math.hypot(body.vel.x, body.vel.y);
        if (sp < cfg.fling.settleSpeedPx || brain.stateTime > 4) {
          if (!maybeFlourish(cfg.fling.loopChance)) {
            v2.copy(brain.anchor, body.pos);
            brain.state = "hover";
            brain.stateTime = 0;
            scheduleNextInterest();
          }
        }
        break;
      }
      case "startle": {
        if (brain.stateTime >= brain.startleUntil) {
          brain.state = "recover";
          brain.stateTime = 0;
        }
        break;
      }
      case "recover": {
        const damp = 1 / (1 + 1.5 * dt);
        body.vel.x *= damp;
        body.vel.y *= damp;
        if (brain.stateTime > 1.2) {
          v2.copy(brain.anchor, body.pos);
          brain.state = "hover";
          brain.stateTime = 0;
          scheduleNextInterest();
        }
        break;
      }
    }
  }

  return brain;
}
