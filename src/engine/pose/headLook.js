// headLook.js
// curious-creature gaze. the head aims at the cursor through saccade gating
// (notice -> turn) rather than servo tracking, predicts cursor motion a beat
// ahead, and wanders on its own when the cursor goes quiet.

import * as THREE from "three";
import { Spring, softLimit, makeNoise1d2, clamp } from "../../utils/math.js";

const D2R = Math.PI / 180;

export function createHeadLook({ config, world }) {
  const cfg = config.look;
  const yawS = new Spring(0, cfg.omegaCalm, 1);
  const pitchS = new Spring(0, cfg.omegaCalm, 1);
  const nYaw = makeNoise1d2(551);
  const nPitch = makeNoise1d2(552);
  const nMicroY = makeNoise1d2(553);
  const nMicroP = makeNoise1d2(554);
  const nRoll = makeNoise1d2(555);

  // the shot itself: a forward jerk of the head, springing back
  world.on("beamFire", () => {
    pitchS.v -= config.attack.fireJerkRad;
  });

  // saccade state: where the spring is currently told to aim, and a pending
  // retarget with a small human-ish delay
  let aimYaw = 0, aimPitch = 0;
  let pendingYaw = 0, pendingPitch = 0;
  let retargetAt = -1;

  // the cursor is treated as sitting on a glass pane in front of the character;
  // this converts screen offsets into believable partial head angles
  const LOOK_PLANE_DIST = 6; // world units in front of the character

  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();
  const _qInv = new THREE.Quaternion();
  const _dir = new THREE.Vector3();

  return {
    update(ctx) {
      const { rig, body, brain, dt, time, view } = ctx;
      const p = world.pointer;

      // after the shot, mew keeps staring down the beam: freeze the aim while
      // firing and for a beat afterwards, then resume tracking
      const gazeFrozen = brain.state === "fire" ||
        (brain.gazeHoldUntil !== undefined && world.time < brain.gazeHoldUntil);
      if (gazeFrozen) {
        applyAim(ctx, yawS.step(aimYaw, dt), pitchS.step(aimPitch, dt), 0.3);
        return;
      }

      // desired gaze DIRECTION in world space (unit vector)
      let curious;
      const cursorIdle = time - p.lastMoveAt > cfg.idleAfterS;

      if (p.active && !cursorIdle) {
        curious = true;
        // predict where the cursor is heading; heads aim at intent, not history
        const px = p.pos.x + p.vel.x * cfg.predictS - body.pos.x;
        const py = p.pos.y + p.vel.y * cfg.predictS - body.pos.y;
        _dir.set(px * view.worldPerPx, -py * view.worldPerPx, LOOK_PLANE_DIST).normalize();
      } else {
        curious = false;
        // curiosity wander around the body's own forward; while cruising the
        // undulating body already faces travel, so gaze rides along with it
        const t = time * cfg.curiosityHz * 2 * Math.PI;
        const amp = cfg.curiosityAmpDeg * D2R;
        const wy = nYaw(t) * amp;
        const wp = nPitch(t + 4.7) * amp * 0.6;
        _dir.set(Math.sin(wy), Math.sin(wp), Math.cos(wy) * Math.cos(wp)).normalize()
          .applyQuaternion(ctx.shared.bodyQuat);
      }

      // express the gaze in the BODY frame (works at any body orientation),
      // then soft-limit how far the neck can crane
      _qInv.copy(ctx.shared.bodyQuat).invert();
      _dir.applyQuaternion(_qInv);
      let relYaw = softLimit(Math.atan2(_dir.x, Math.max(_dir.z, -0.99)), cfg.yawLimitDeg * D2R);
      let relPitch = softLimit(Math.asin(clamp(_dir.y, -1, 1)), cfg.pitchLimitDeg * D2R);

      // saccade gating: only retarget after a threshold error + a short delay
      const errDeg = Math.max(
        Math.abs(relYaw - aimYaw),
        Math.abs(relPitch - aimPitch)
      ) / D2R;
      if (errDeg > cfg.saccadeThresholdDeg) {
        if (retargetAt < 0) {
          const delay = (cfg.saccadeMinMs + world.random() * (cfg.saccadeMaxMs - cfg.saccadeMinMs)) / 1000;
          retargetAt = time + delay;
          pendingYaw = relYaw;
          pendingPitch = relPitch;
        } else {
          // keep the pending target fresh while we wait
          pendingYaw = relYaw;
          pendingPitch = relPitch;
        }
      }
      if (retargetAt >= 0 && time >= retargetAt) {
        aimYaw = pendingYaw;
        aimPitch = pendingPitch;
        retargetAt = -1;
      }
      // small errors track continuously (smooth pursuit)
      if (errDeg <= cfg.saccadeThresholdDeg) {
        aimYaw = relYaw;
        aimPitch = relPitch;
      }

      // startle snaps attention: fast springs, no saccade delay.
      // charging does too: mew locks onto the cursor while powering up
      const locked = brain.state === "startle" || brain.state === "charge";
      const omega = locked || brain.agitation > 0.3 || curious ? cfg.omegaCurious : cfg.omegaCalm;
      yawS.omega = locked ? cfg.omegaCurious * 1.6 : omega;
      pitchS.omega = yawS.omega;
      if (locked) {
        aimYaw = relYaw;
        aimPitch = relPitch;
        retargetAt = -1;
      }

      applyAim(ctx, yawS.step(aimYaw, dt), pitchS.step(aimPitch, dt), 1);
    }
  };

  // shared output path: flight base pitch, charge rock-back, micro-motion,
  // head tilt, then neck/head split in the body frame
  function applyAim(ctx, y, x, microScale) {
    const { rig, brain, time } = ctx;

    // streamlined flight: the head lifts off the long axis so the FACE leads
    x += (ctx.shared.swimAlign || 0) * config.body.flightHeadPitchDeg * D2R;

    // charge-up: the head rocks back as the power builds
    if (brain.state === "charge") {
      const prog = Math.min(brain.stateTime / config.attack.chargeS, 1);
      x += config.attack.chargeRockDeg * D2R * prog * prog;
    }

    // ever-present micro-drift + slow curious tilt: a perfectly still head is
    // what reads as stiff. tiny, always on, damped while locked on
    const mt = time * cfg.microHz * 2 * Math.PI;
    y += nMicroY(mt) * cfg.microYawDeg * D2R * microScale;
    x += nMicroP(mt + 5.1) * cfg.microPitchDeg * D2R * microScale;
    const roll = nRoll(time * cfg.headRollHz * 2 * Math.PI) * cfg.headRollDeg * D2R * microScale;

    const share = cfg.neckShare;
    const bq = ctx.shared.bodyQuat;
    if (rig.bones.neck) {
      _e.set(-x * share, y * share, roll * share, "YXZ");
      _q.setFromEuler(_e).premultiply(bq).multiply(_qInv.copy(bq).invert());
      rig.applyCharDelta(rig.bones.neck, _q);
    }
    if (rig.bones.head) {
      _e.set(-x * (1 - share), y * (1 - share), roll * (1 - share), "YXZ");
      _q.setFromEuler(_e).premultiply(bq).multiply(_qInv.copy(bq).invert());
      rig.applyCharDelta(rig.bones.head, _q);
    }
    ctx.shared.headYawRate = yawS.v;
    ctx.shared.headPitchRate = pitchS.v;
  }
}
