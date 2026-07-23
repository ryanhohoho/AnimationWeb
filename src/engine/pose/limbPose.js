// limbPose.js
// arms, hands, feet. two authored pose sets (hover / cruise, from the
// mid-flight reference) blended by speed, plus per-limb noise drift so
// nothing ever freezes, plus follow-through lag against body acceleration.

import * as THREE from "three";
import { Spring, makeNoise1d2, smoothstep, clamp } from "../../utils/math.js";

const D2R = Math.PI / 180;
const ROLES = ["armL", "armR", "handL", "handR", "footL", "footR"];

export function createLimbPose({ config, world }) {
  const cfg = config.limbs;
  const blendS = new Spring(0, cfg.blendOmega, 1);
  const startleS = new Spring(0, 9, 0.7);
  const flinchS = new Spring(0, 11, 0.55); // "ouch": quick tuck on a bump

  if (world) {
    world.on("bump", (e) => {
      flinchS.x += Math.min(e.speed / 1400, 0.8);
    });
  }

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
      // screen y is down, so accel.y > 0 (accelerating downward) tips limbs up
      const fx = clamp(body.accel.y * cfg.followGain, -0.5, 0.5);
      const fz = clamp(-body.accel.x * cfg.followGain, -0.5, 0.5);

      for (const role of ROLES) {
        const bone = rig.bones[role];
        if (!bone) continue;
        const hover = cfg.poses.hover[role];
        const cruise = cfg.poses.cruise[role];
        if (!hover || !cruise) continue;

        const isHand = role.startsWith("hand");
        const isFoot = role.startsWith("foot");
        // feet have the loosest joints: hardest follow-through, extra wobble
        const followMul = isHand ? cfg.handFollowMul : isFoot ? cfg.footFollowMul : 1;
        const n = noises[role];
        const na = cfg.noiseAmpDeg * D2R * (1 + brain.agitation) * (isFoot ? cfg.footNoiseMul : 1);
        const t = time * cfg.noiseHz * 2 * Math.PI;

        // startle tuck pulls limbs inward (mirror z for right-side limbs)
        const sideSign = role.endsWith("R") ? 1 : -1;
        const tuck = startle * cfg.startleTuckDeg * D2R;

        // feet kick along with the swim undulation, trailing the spine wave:
        // the flutter that makes fast flight look alive
        const flutter = isFoot
          ? Math.sin((ctx.shared.swimPhase || 0) - cfg.footFlutterPhase + sideSign * 0.35)
            * cfg.footFlutterDeg * D2R * (ctx.shared.swimAlign || 0)
          : 0;

        _e.set(
          (hover[0] + (cruise[0] - hover[0]) * blend) * D2R + n[0](t) * na + fx * followMul - tuck * 0.6 + flutter,
          (hover[1] + (cruise[1] - hover[1]) * blend) * D2R + n[1](t + 3.1) * na * 0.5,
          (hover[2] + (cruise[2] - hover[2]) * blend) * D2R + n[2](t + 6.2) * na + fz * followMul + tuck * sideSign,
          "XYZ"
        );
        // poses are authored in the body's frame: conjugate so the tuck still
        // tucks when the otter is upside down mid-roll
        const bq = ctx.shared.bodyQuat;
        _q.setFromEuler(_e).premultiply(bq).multiply(_qInv.copy(bq).invert());
        rig.applyCharDelta(bone, _q);
      }
    }
  };
}
