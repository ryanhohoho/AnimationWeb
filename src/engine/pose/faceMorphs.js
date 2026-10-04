// faceMorphs.js
// drives the head's expression morph targets (blink / squint / smile).
//
// the eyes are PAINTED into the texture, not modelled, so an expression is
// just the face geometry squashing the painted eye -- which is why this is a
// handful of scalars and no extra draw calls.
//
// blinks fire on a poisson-ish timer with the occasional double blink, and
// mood (squint + smile) is driven by the brain's agitation/state so the face
// agrees with what the body is doing. everything is expDamp'd, so it stays
// frame-rate independent like the rest of the pose stack.

import { expDamp, clamp } from "../../utils/math.js";

export function createFaceMorphs({ config, world, brain, body, mesh }) {
  const cfg = config.face;
  const maxSpeed = config.physics.maxSpeed;
  const dict = mesh?.morphTargetDictionary || null;
  const infl = mesh?.morphTargetInfluences || null;
  if (!dict || !infl) return null;

  const iBlink = dict.blink ?? -1;
  const iSquint = dict.squint ?? -1;
  const iSmile = dict.smile ?? -1;

  let nextBlinkAt = cfg.blinkMinS;
  let blinkT = -1;          // -1 = not blinking, else seconds into the blink
  let queued = 0;           // extra blinks to run back to back
  let squint = 0;
  let smile = 0;


  function scheduleBlink(time, rnd) {
    const span = cfg.blinkMaxS - cfg.blinkMinS;
    nextBlinkAt = time + cfg.blinkMinS + rnd() * span;
  }

  return {
    name: "faceMorphs",
    // pose layers receive the shared ctx, not loose args (see poser.js)
    update(ctx) {
      const { dt, time } = ctx;
      const rnd = world.random;

      // ---- blink ------------------------------------------------------
      if (blinkT < 0 && time >= nextBlinkAt) {
        blinkT = 0;
        queued = rnd() < cfg.doubleBlinkChance ? 1 : 0;
      }
      let blink = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        const d = cfg.blinkDurS;
        // fast close, slower open -- a symmetric curve reads mechanical
        const t = blinkT / d;
        blink = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65);
        if (blinkT >= d) {
          blinkT = queued > 0 ? 0 : -1;
          if (queued > 0) queued--;
          else scheduleBlink(time, rnd);
        }
      }

      // ---- mood -------------------------------------------------------
      // startled/charging -> eyes wide (no squint). moving fast -> pleased
      const st = brain.state;
      const agit = clamp(brain.agitation, 0, 1);
      const spd = clamp(Math.hypot(body.vel.x, body.vel.y) / maxSpeed, 0, 1);
      const wide = st === "startle" || st === "charge" || st === "fire";
      const wantSquint = wide ? 0 : cfg.squintBase + cfg.squintPerSpeed * spd;
      const wantSmile = st === "startle" ? 0
        : cfg.smileBase + cfg.smilePerSpeed * spd;

      // narrowed against her own blast, whatever else she feels
      const wind = world.wind;
      const windSquint = wind && config.attack && config.attack.wind
        ? config.attack.wind.squint * Math.min(1, wind.k) : 0;
      squint = expDamp(squint, Math.max(wantSquint * (1 - agit), windSquint), cfg.moodRate, dt);
      smile = expDamp(smile, wantSmile * (1 - agit * 0.6), cfg.moodRate, dt);

      // a blink overrides the squint rather than stacking into a crease.
      // NOTE the >.< face is NOT here: it is a flat overlay drawn over the eyes
      // (engine/fx/faceOverlay.js), because it is a SYMBOL, not a deformation.
      // A morph that tries to draw one has to bend real geometry into the shape
      // of a glyph, which is both harder and less legible than just drawing the
      // glyph.
      if (iBlink >= 0) infl[iBlink] = clamp(blink * cfg.blinkAmount, 0, 1.4);
      if (iSquint >= 0) infl[iSquint] = clamp(squint * (1 - blink), 0, 1);
      if (iSmile >= 0) infl[iSmile] = clamp(smile, 0, 1);
    },

    // manual control, for scripted moments
    set(name, v) {
      const i = dict[name];
      if (i !== undefined) infl[i] = v;
    }
  };
}
