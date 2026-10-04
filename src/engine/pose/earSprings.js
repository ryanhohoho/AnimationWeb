// earSprings.js
// ears as underdamped springs: they lag behind head turns (follow-through),
// twitch at random intervals, and flatten back when startled.

import * as THREE from "three";
import { Spring, clamp } from "../../utils/math.js";

const D2R = Math.PI / 180;

export function createEarSprings({ config, world }) {
  const cfg = config.ears;

  function makeEar(sign) {
    return {
      sign,
      sx: new Spring(0, cfg.omega, cfg.zeta),  // flatten/perk axis
      sz: new Spring(0, cfg.omega, cfg.zeta),  // side tilt
      nextTwitchAt: 1 + world.random() * cfg.twitchMeanS * 2
    };
  }
  const ears = { earL: makeEar(1), earR: makeEar(-1) };

  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();
  const _qi = new THREE.Quaternion();

  return {
    update(ctx) {
      const { rig, brain, dt, time } = ctx;

      // follow-through from head angular velocity (rad/s from the look springs)
      const followX = clamp((ctx.shared.headPitchRate || 0) * cfg.followGain, -0.4, 0.4);
      const followZ = clamp(-(ctx.shared.headYawRate || 0) * cfg.followGain, -0.4, 0.4);

      // startle flattens both ears back, fast in, slow out via agitation decay
      const flatten = brain.agitation * cfg.startleFlattenDeg * D2R;
      // ...and her own blast presses them flat and FLAPS them: the gust moves
      // the spring's target, and the springs are underdamped, so each gust
      // leaves a flap behind it (behavior/wind.js)
      const wind = world.wind;
      const W = config.attack && config.attack.wind;
      let windX = 0, windZ = 0;
      if (wind && W) {
        const wk = Math.min(wind.k, 1.3);
        windX = wk * (W.earFlattenDeg + W.earGustDeg * wind.gust) * D2R;
        windZ = wk * W.earGustDeg * 0.6 * D2R * wind.cross;
      }

      for (const key of ["earL", "earR"]) {
        const bone = rig.bones[key];
        if (!bone) continue;
        const ear = ears[key];

        // poisson-ish twitches: velocity kicks, not target jumps, so the
        // spring shapes the whole motion
        if (time >= ear.nextTwitchAt && brain.agitation < 0.5) {
          const kick = cfg.twitchAmpDeg * D2R * (0.5 + world.random());
          ear.sx.v += (world.random() < 0.5 ? -1 : 1) * kick * cfg.omega;
          ear.sz.v += (world.random() < 0.5 ? -1 : 1) * kick * cfg.omega * 0.5;
          ear.nextTwitchAt = time + cfg.twitchMeanS * (0.35 + world.random() * 1.6);
        }

        const x = ear.sx.step(flatten + followX + windX, dt);
        const z = ear.sz.step(followZ * ear.sign + windZ * ear.sign, dt);
        _e.set(x, 0, z, "XYZ");
        // body-frame application so twitches stay ear-relative at any roll
        const bq = ctx.shared.bodyQuat;
        _q.setFromEuler(_e).premultiply(bq).multiply(_qi.copy(bq).invert());
        rig.applyCharDelta(bone, _q);
      }
    }
  };
}
