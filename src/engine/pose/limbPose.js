// limbPose.js
// arms and feet. two authored pose sets (hover / cruise, from the mid-flight
// reference) blended by speed, plus per-limb noise drift so nothing ever
// freezes, plus follow-through lag against body acceleration.
//
// v4 model: every limb is its OWN CLOSED SHELL weighted 100% to one joint
// (tools/meshsurgery.py), so nothing here can distort the body no matter how
// far it swings. that is what let the arms come off the head and back onto the
// chest, and what lets them have a real range instead of a token wobble.
//
// WHY EVERY INPUT IS SMOOTHED
// ---------------------------
// this layer writes its result straight onto the bones with no spring of its
// own, so any discontinuity on an input is a visible snap. two of them were:
//
//   * body.accel is the RAW acceleration out of the physics step. it jumps by
//     thousands of px/s^2 the instant a collider is hit or a steering force
//     changes, and it was going through followGain * footFollowMul (2.3) into a
//     +/-0.5 rad clamp -- up to 66 degrees of foot swing in a single frame.
//     that is the feet "snapping at weird angles".
//   * the bump handler set the flinch spring's POSITION, which is a teleport.
//     an impulse belongs on the velocity, as earSprings does for its twitches;
//     then the spring shapes the whole motion instead of starting mid-way.

import * as THREE from "three";
import { Spring, makeNoise1d2, smoothstep, clamp, expDamp } from "../../utils/math.js";

const D2R = Math.PI / 180;
// no hand joints on the v4 model -- each arm is one rigid piece hinged at the
// armpit, so there is nothing below the shoulder to pose.
const ROLES = ["armL", "armR", "footL", "footR"];

export function createLimbPose({ config, world }) {
  const cfg = config.limbs;
  const blendS = new Spring(0, cfg.blendOmega, 1);
  const startleS = new Spring(0, 9, 0.7);
  const flinchS = new Spring(0, 11, 0.55); // "ouch": quick tuck on a bump

  if (world) {
    world.on("bump", (e) => {
      // VELOCITY kick, not a position jump: an impulse should launch the spring,
      // not teleport it. setting .x directly put the tuck at full extent on the
      // first frame after a bump, which read as the limbs snapping.
      flinchS.v += Math.min(e.speed / 1400, 0.8) * cfg.flinchKick;
    });
  }

  // smoothed follow-through, one per axis. see the header: this is the fix for
  // the feet snapping, and it costs two expDamps a frame.
  let fxS = 0;
  let fzS = 0;

  // independent noise streams per limb and axis
  const noises = {};
  ROLES.forEach((r, i) => {
    noises[r] = [makeNoise1d2(900 + i * 3), makeNoise1d2(901 + i * 3), makeNoise1d2(902 + i * 3)];
  });

  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();
  const _qInv = new THREE.Quaternion();

  return {
    update(ctx) {
      const { rig, body, brain, dt, time } = ctx;
      const speed = Math.hypot(body.vel.x, body.vel.y);
      // the beam brace sweeps the limbs back like full flight
      const blendGoal = brain.state === "fire" ? 1
        : Math.max(smoothstep(cfg.blendLoPx, cfg.blendHiPx, speed), (ctx.shared.swimAlign || 0) * 0.85);
      const blend = blendS.step(blendGoal, dt);
      const startle = startleS.step(brain.state === "startle" ? 1 : 0, dt) + flinchS.step(0, dt);

      // follow-through: limbs trail the body's acceleration slightly.
      // screen y is down, so accel.y > 0 (accelerating downward) tips limbs up.
      // the clamp is on the RAW value and the result is then low-passed, so a
      // collision spike becomes a swing rather than a jump.
      const fxGoal = clamp(body.accel.y * cfg.followGain, -cfg.followClamp, cfg.followClamp);
      const fzGoal = clamp(-body.accel.x * cfg.followGain, -cfg.followClamp, cfg.followClamp);
      fxS = expDamp(fxS, fxGoal, cfg.followRate, dt);
      fzS = expDamp(fzS, fzGoal, cfg.followRate, dt);

      const swimPhase = ctx.shared.swimPhase || 0;
      const swimAlign = ctx.shared.swimAlign || 0;

      for (const role of ROLES) {
        const bone = rig.bones[role];
        if (!bone) continue;
        const hover = cfg.poses.hover[role];
        const cruise = cfg.poses.cruise[role];
        if (!hover || !cruise) continue;

        const isFoot = role.startsWith("foot");
        // feet have the loosest joints: hardest follow-through, extra wobble
        const followMul = isFoot ? cfg.footFollowMul : cfg.armFollowMul;
        const n = noises[role];
        const na = cfg.noiseAmpDeg * D2R * (1 + brain.agitation)
          * (isFoot ? cfg.footNoiseMul : cfg.armNoiseMul);
        const t = time * cfg.noiseHz * 2 * Math.PI;

        // startle tuck pulls limbs inward (mirror z for right-side limbs)
        const sideSign = role.endsWith("R") ? 1 : -1;
        const tuck = startle * cfg.startleTuckDeg * D2R;

        // feet kick along with the swim undulation, trailing the spine wave:
        // the flutter that makes fast flight look alive.
        // the ARMS paddle on the same clock but slower and out of phase, which
        // is what stops them reading as two bumps welded to the chest. they get
        // it at idle too (the feet only flutter when swimming) because a
        // floating creature sculls to hold station.
        let flutter = 0;
        if (isFoot) {
          flutter = Math.sin(swimPhase - cfg.footFlutterPhase + sideSign * 0.35)
            * cfg.footFlutterDeg * D2R * swimAlign;
        } else {
          const ph = swimPhase * cfg.armPaddleRatio - cfg.armPaddlePhase
            + sideSign * 0.9;
          flutter = Math.sin(ph) * cfg.armPaddleDeg * D2R * (0.45 + 0.55 * swimAlign);
        }

        _e.set(
          (hover[0] + (cruise[0] - hover[0]) * blend) * D2R + n[0](t) * na + fxS * followMul - tuck * 0.6 + flutter,
          (hover[1] + (cruise[1] - hover[1]) * blend) * D2R + n[1](t + 3.1) * na * 0.5,
          (hover[2] + (cruise[2] - hover[2]) * blend) * D2R + n[2](t + 6.2) * na + fzS * followMul + tuck * sideSign
            + (isFoot ? 0 : Math.cos(swimPhase * cfg.armPaddleRatio + sideSign * 0.9)
              * cfg.armPaddleDeg * 0.5 * D2R * sideSign),
          "XYZ"
        );
        // poses are authored in the body's frame: conjugate so the tuck still
        // tucks when the character is upside down mid-roll
        const bq = ctx.shared.bodyQuat;
        _q.setFromEuler(_e).premultiply(bq).multiply(_qInv.copy(bq).invert());
        rig.applyCharDelta(bone, _q);
      }
    }
  };
}
