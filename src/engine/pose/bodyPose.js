// bodyPose.js
// streamlined mew flight. at speed the LONG axis (head -> tail, rest +y)
// aligns to the travel direction with the head leading, like mew diving or an
// otter kicking through water. the belly rolls toward the camera on straights
// and toward the inside of the turn when the path curves hard (which is what
// makes the loop-de-loop read as flying a circle, not cartwheeling).
// idle keeps the gentle upright camera-facing float. orientation runs through
// a quaternion spring, so every transition has rotational inertia.

import * as THREE from "three";
import { Spring, softLimit, makeNoise1d2, smoothstep, clamp } from "../../utils/math.js";
import { QuatSpring } from "./quatSpring.js";

const D2R = Math.PI / 180;
const _F = new THREE.Vector3();
const _belly = new THREE.Vector3();
const _X = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _qFlight = new THREE.Quaternion();
const _qIdle = new THREE.Quaternion();
const _qTarget = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _delta = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _e = new THREE.Euler();
const _mR = new THREE.Matrix4();
const _mS = new THREE.Matrix4();
const _yAxis = new THREE.Vector3(0, 1, 0);

export function createBodyPose({ config, world, squashGroup }) {
  const cfg = config.body;
  const orient = new QuatSpring(cfg.orientOmega, cfg.orientZeta);
  const squashS = new Spring(1, cfg.squashOmega, cfg.squashZeta);
  const bobNX = makeNoise1d2(101);
  const bobNY = makeNoise1d2(202);
  const idleNoise = makeNoise1d2(303);

  // smoothed velocity for direction stability (raw vel jitters while hovering)
  const dirVel = { x: 0, y: 0 };
  let swimPhase = 0;
  let prevHeading = 0;
  let headingRate = 0;
  let squashTarget = 1;
  const squashAxis = new THREE.Vector3(1, 0, 0);

  // free roll about the long axis. phi = 0 is belly-to-camera; the anchor
  // sits at +/-90 (side profile) and wanders, and hard turns can flip the
  // side with a half-spin through belly-up or belly-down (turn-matched)
  const rcfg = cfg.roll;
  const rollS = new Spring(0, rcfg.omega, rcfg.zeta);
  const rollNoise = makeNoise1d2(707);
  let rollSide = world.random() < 0.5 ? -1 : 1;
  let rollTarget = rollSide * Math.PI / 2;
  let lastFlipAt = -10;
  rollS.reset ? rollS.reset(rollTarget) : (rollS.x = rollTarget);

  world.on("bump", (e) => {
    const amt = Math.min(e.speed / 900, 1);
    squashS.x = 1 - cfg.squashAmount * amt;
    squashS.v = 0;
    squashAxis.set(e.normal.x, -e.normal.y, 0).normalize();
  });

  // firing: the whole body snaps lengthwise onto the beam axis (head toward
  // the beam, tail streaming behind) while the recoil slides it backwards.
  // the brace begins in the last beat of the CHARGE (aimed at the live
  // cursor), so the pose is already set when the beam erupts
  const fireDir = new THREE.Vector3(1, 0, 0);
  const fireTrail = new THREE.Vector3(-1, 0, 0);
  world.on("beamFire", ({ dir }) => {
    fireDir.set(dir.x, -dir.y, 0).normalize();
    fireTrail.copy(fireDir).negate();
  });
  const _beamAxis = new THREE.Vector3();

  // alignment blend eased by its own spring so lean-in is a visible, smooth
  // phase (the brain waits for it before opening the throttle)
  const alignS = new Spring(0, cfg.alignOmega, 1);
  const _axisNow = new THREE.Vector3();

  return {
    update(ctx) {
      const { rig, body, brain, dt, time, view } = ctx;
      const maxV = config.physics.maxSpeed;

      // -- direction smoothing -------------------------------------------
      const k = 1 - Math.exp(-6 * dt);
      dirVel.x += (body.vel.x - dirVel.x) * k;
      dirVel.y += (body.vel.y - dirVel.y) * k;
      const speed = Math.hypot(dirVel.x, dirVel.y);
      const speedN = Math.min(speed / maxV, 1);
      const charging = brain.state === "charge";
      const firing = brain.state === "fire";

      // brace factor: starts braceStartS into the charge (aimed at the live
      // cursor), folds in over braceRampS, and holds through the whole fire
      let braceK = 0;
      if (charging) {
        const atk = config.attack;
        braceK = smoothstep(atk.braceStartS, atk.braceStartS + atk.braceRampS, brain.stateTime);
      } else if (firing) {
        braceK = 1;
      }
      if (braceK > 0) {
        if (firing) {
          _beamAxis.copy(fireDir);
        } else if (world.pointer.active) {
          // aim at where the beam WILL go: the live cursor
          _beamAxis.set(
            world.pointer.pos.x - body.pos.x,
            -(world.pointer.pos.y - body.pos.y), 0);
          if (_beamAxis.lengthSq() < 1) _beamAxis.set(1, 0, 0);
          _beamAxis.normalize();
        } else {
          _beamAxis.copy(fireDir);
        }
      }

      // alignment target: speed-based, but INTENT starts it early -- the body
      // leans onto the travel line while still slow, and only then does the
      // brain's lean-gated thrust open up
      const intent = brain.moveIntent && (brain.moveIntent.x !== 0 || brain.moveIntent.y !== 0);
      let alignTarget = smoothstep(cfg.alignLoPx, cfg.alignHiPx, speed);
      if (intent) alignTarget = Math.max(alignTarget, cfg.intentAlign);
      if (charging) alignTarget = braceK; // planted, then leaning onto the axis
      if (firing) alignTarget = 1;        // full-body brace on the beam axis
      const align = clamp(alignS.step(alignTarget, dt), 0, 1);

      // heading curvature: how fast the travel direction itself is rotating.
      // wrapped derivative, smoothed; drives the belly-in banking
      let curve = 0;
      if (speed > 40) {
        const heading = Math.atan2(-dirVel.y, dirVel.x);
        let dh = heading - prevHeading;
        if (dh > Math.PI) dh -= 2 * Math.PI;
        if (dh < -Math.PI) dh += 2 * Math.PI;
        prevHeading = heading;
        headingRate += (dh / Math.max(dt, 1e-4) - headingRate) * (1 - Math.exp(-8 * dt));
      } else {
        headingRate *= Math.exp(-4 * dt);
      }

      // -- idle orientation: upright, belly to camera, slight 3/4 yaw ------
      const calm = (1 - speedN) * (1 - brain.agitation * 0.6);
      let idleYaw = cfg.idleYawBiasDeg * D2R * calm + idleNoise(time * 0.11) * 0.12 * calm;
      if (charging && world.pointer.active) {
        // square up toward the cursor while powering up
        const dx = (world.pointer.pos.x - body.pos.x) * view.worldPerPx;
        idleYaw = softLimit(Math.atan2(dx, 6), 45 * D2R);
      }
      _qIdle.setFromAxisAngle(_yAxis, idleYaw);
      if (braceK > 0) {
        // head-first initiation: dip the head forward as the fold begins.
        // this also seeds the rotation path so a downward brace always folds
        // through the FRONT instead of spinning the long way behind
        _e.set(config.attack.braceDipRad * braceK, 0, 0, "XYZ");
        _qIdle.multiply(_delta.setFromEuler(_e));
      }

      // -- flight direction: the beam axis while bracing; otherwise intent
      // blending into realized velocity as speed builds
      if (braceK > 0) {
        _F.copy(_beamAxis);
      } else if (speed > 1 || intent) {
        const w = smoothstep(200, 500, speed);
        _F.set(0, 0, 0);
        if (intent) {
          _F.x += brain.moveIntent.x * (1 - w);
          _F.y += -brain.moveIntent.y * (1 - w);
        }
        if (speed > 1) {
          _F.x += (dirVel.x / speed) * (intent ? w : 1);
          _F.y += (-dirVel.y / speed) * (intent ? w : 1);
        }
        if (_F.lengthSq() < 1e-6) _F.set(0, 1, 0);
        _F.normalize();
      } else {
        _F.set(0, 1, 0);
      }
      // roll state: slow wander around the side-profile anchor, plus
      // turn-triggered side flips. FROZEN while bracing -- the beam pose is
      // muscled and deterministic, never at the mercy of the roll wander
      if (braceK === 0) {
        const anchor = rollSide * (rcfg.sideAnchorDeg * D2R)
          + rollNoise(time * rcfg.wanderHz * 2 * Math.PI) * rcfg.wanderAmp;
        let adiff = anchor - rollTarget;
        adiff -= Math.round(adiff / (2 * Math.PI)) * 2 * Math.PI;
        rollTarget += adiff; // track the nearest representation; spring eases it
        if (align > 0.35 && Math.abs(headingRate) > rcfg.flipHeadingRate &&
            time - lastFlipAt > rcfg.flipMinIntervalS &&
            world.random() < rcfg.flipChance) {
          rollSide *= -1;
          rollTarget += Math.sign(headingRate) * Math.PI; // half-spin with the turn
          lastFlipAt = time;
        }
      }
      const phi = rollS.step(rollTarget, dt);

      if (braceK > 0) {
        // deterministic beam belly: horizontal beam -> belly DOWN (side
        // profile), beam up -> belly to camera, beam down -> belly away
        const by = _F.y;
        _belly.set(0, -(1 - Math.abs(by)), Math.sign(by) * Math.abs(by));
        if (_belly.lengthSq() < 1e-6) _belly.set(0, -1, 0);
      } else {
        // belly = camera reference rolled around F by phi (side profile most
        // of the time), pulled toward the inside of hard turns (carves loops)
        curve = smoothstep(cfg.curveBellyLoRad, cfg.curveBellyHiRad, Math.abs(headingRate)) * align;
        const s = Math.sign(headingRate) || 1;
        _qRoll.setFromAxisAngle(_F, phi);
        _belly.set(0, 0, 1).applyQuaternion(_qRoll).multiplyScalar(1 - curve);
        _belly.x += -_F.y * s * curve;
        _belly.y += _F.x * s * curve;
      }
      // orthogonalize against F
      _belly.addScaledVector(_F, -_belly.dot(_F)).normalize();
      _X.crossVectors(_F, _belly); // right-handed: x = y-axis(F) cross z-axis(belly)
      _m.makeBasis(_X, _F, _belly);
      _qFlight.setFromRotationMatrix(_m);

      // -- blend + spring -------------------------------------------------
      _qTarget.copy(_qIdle).slerp(_qFlight, align);
      // muscle: the brace forces itself into position against everything else
      orient.omega = cfg.orientOmega * (1 + brain.agitation * 0.9) * (1 + curve * 0.8)
        * (1 + (config.attack.fireAlignOmegaMul - 1) * braceK);
      const q = orient.step(_qTarget, dt);
      rig.applyCharDelta(rig.bones.root, q);
      ctx.shared.bodyQuat.copy(q);
      ctx.shared.swimAlign = align;
      // tail streams BEHIND the beam through the whole brace (lead-in too),
      // not behind the recoil slide
      if (braceK > 0) fireTrail.copy(_beamAxis).negate();
      ctx.shared.trailDir = braceK > 0.3 ? fireTrail : null;

      // -- lean-in readout for the brain's thrust gating -------------------
      // how much the ACTUAL posed long axis agrees with the intended heading
      if (intent && !firing && !charging) {
        _axisNow.set(0, 1, 0).applyQuaternion(q);
        _axisNow.z = 0;
        const l = _axisNow.length();
        world.poseState.leanIn = l > 1e-4
          ? clamp((_axisNow.x * brain.moveIntent.x + _axisNow.y * -brain.moveIntent.y) / l, 0, 1)
          : 0;
      } else {
        world.poseState.leanIn = 0;
      }

      // -- swim undulation: a wave that travels spine -> tail -------------
      const und = cfg.undulation;
      const undAmp = und.ampDeg * D2R * align * (0.75 + 0.25 * idleNoise(time * 0.37))
        * (1 - braceK * 0.65); // the brace holds firm, only a shudder
      swimPhase += (und.freqBase + und.freqPerSpeed * speedN) * 2 * Math.PI * dt;
      ctx.shared.swimPhase = swimPhase;
      const chain = rig.bones.spine;
      for (let i = 0; i < chain.length; i++) {
        const a = undAmp * Math.sin(swimPhase - i * und.phaseStepRad);
        _e.set(a, 0, 0, "XYZ");
        _delta.setFromEuler(_e).premultiply(q).multiply(_qi.copy(q).invert());
        rig.applyCharDelta(chain[i], _delta);
      }

      // -- hover bob: idle only, fully gone in streamlined flight ---------
      const bobAmp = cfg.bobAmpPx * (0.5 + 0.5 * (1 - speedN)) * (1 - align)
        * (1 + brain.agitation * 0.5);
      ctx.visual.bobPx.x = bobNX(time * cfg.bobHz * 2 * Math.PI) * bobAmp;
      ctx.visual.bobPx.y = bobNY(time * cfg.bobHz * 2 * Math.PI + 7.3) * bobAmp;

      // -- breathing ------------------------------------------------------
      const chest = rig.bones.spine[rig.bones.spine.length - 1];
      if (chest) {
        const rate = cfg.breatheHz * (1 + brain.agitation * 0.9);
        const sc = 1 + Math.sin(time * rate * 2 * Math.PI) * cfg.breatheAmp;
        chest.scale.multiplyScalar(sc);
      }

      // -- charge body english: rock backwards + rising shiver -------------
      if (charging) {
        const prog = Math.min(brain.stateTime / config.attack.chargeS, 1);
        const tremble = 0.014 * Math.sin(time * 55) * prog;
        const rock = config.attack.chargeRockDeg * 0.6 * D2R * prog * prog;
        _e.set(-rock + tremble, 0, tremble * 0.6, "XYZ");
        _delta.setFromEuler(_e);
        rig.applyCharDelta(rig.bones.root, _delta);
      } else if (firing) {
        // sustained shudder while the beam pours out
        const tremble = 0.010 * Math.sin(time * 47);
        _e.set(tremble, 0, tremble * 0.5, "XYZ");
        _delta.setFromEuler(_e);
        rig.applyCharDelta(rig.bones.root, _delta);
      }

      // -- squash & stretch ----------------------------------------------
      const sq = squashS.step(squashTarget, dt);
      if (squashGroup) {
        const inv = 1 / Math.sqrt(Math.abs(sq) || 1);
        const angle = Math.atan2(squashAxis.y, squashAxis.x);
        _mR.makeRotationZ(angle);
        _mS.makeScale(sq, inv, inv);
        squashGroup.matrix.copy(_mR).multiply(_mS).multiply(_mR.clone().invert());
        squashGroup.matrixAutoUpdate = false;
      }
    }
  };
}
