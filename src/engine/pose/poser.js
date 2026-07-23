// poser.js
// runs the pose layers in a fixed order every render frame. order matters:
// body orientation first (everything inherits it), tail last (it reads the
// final world transforms of its parents).

export function createPoser(ctxBase, layers) {
  return {
    layers,
    update(dt, time) {
      const ctx = ctxBase;
      ctx.dt = dt;
      ctx.time = time;
      ctx.rig.resetToRest();
      for (const layer of layers) layer.update(ctx);
    }
  };
}
