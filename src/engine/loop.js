// loop.js
// fixed-step simulation (120 hz) with render interpolation. the sim never sees
// a variable dt, which is half the battle for stable, repeatable motion.

export const SIM_DT = 1 / 120;
const MAX_FRAME_DT = 0.1; // clamp tab-switch spikes so the sim never explodes

export function createLoop({ simStep, renderFrame }) {
  let acc = 0;
  let last = -1;
  let running = false;
  let rafId = 0;

  function frame(nowMs) {
    if (!running) return;
    const now = nowMs / 1000;
    if (last < 0) last = now;
    let dt = Math.min(now - last, MAX_FRAME_DT);
    last = now;

    acc += dt;
    while (acc >= SIM_DT) {
      simStep(SIM_DT);
      acc -= SIM_DT;
    }
    // alpha in [0,1): how far we are between the last two sim states
    renderFrame(dt, acc / SIM_DT);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = -1;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    // headless driver for tests: advances sim time without raf or rendering
    advance(seconds, dtOverride = SIM_DT) {
      let t = 0;
      while (t < seconds) {
        simStep(dtOverride);
        t += dtOverride;
      }
    }
  };
}
