// transit.js
// THE BEAT TABLE FROM BIBLE 7.1a, and the ordering IS the effect.
//
//   t (ms)      what
//   0           pushState; the destination DOM mounts at its panel. NOTHING HAS
//               VISIBLY HAPPENED YET.
//   0 -> 180    MIGRATE begins, staggered, the crowd peels away. The departing
//               page's words dissolve back into the field as they go.
//   140         THE CAMERA STARTS -- deliberately late, and this is what makes
//               it read as FOLLOWING rather than as the page sliding.
//   140 -> 1240 the pan, on cubic-bezier(0.42, 0, 0.12, 1).
//   ~900        the migrate bump falls; the crowd decelerates AHEAD of the
//               camera.
//   ~1150       the camera arrives and settles.
//   900 -> ...  GATHER: the destination's words condense (bible 4.3). The
//               heading finishes last, which is what makes arrival feel like
//               arrival.
//
// -- what this module is and is not ----------------------------------------
// It is a SCHEDULE and nothing else. It owns no DOM, no GL, no route state and
// NO CLOCK OF ITS OWN: the render loop ticks it, and it decides what the numbers
// are at that instant. Every one of those numbers is a knob in
// siteConfig.transit, and the only way that stays true is if this file never
// decides anything else.
//
// It does not own a requestAnimationFrame either, and that is deliberate: this
// site has exactly one loop, and a second one is a second thing to throttle,
// govern and keep in step. It also makes the whole transit testable -- tick it
// with a synthetic time and it plays out exactly as it would in wall clock.
//
// THERE IS NO TRANSIT STATE IN THE FIELD. The whole verb is (direction, t01,
// amplitude), so a second navigation on top of a first is a new set of four
// floats and nothing has to be unwound -- which is why `start` can simply
// abandon a running transit.

import { siteConfig } from "../config/siteConfig.js";
import { panDurationMs, cubicBezier } from "./map.js";

const T = siteConfig.transit;

/** does the visitor want the decorative half of this at all? */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * createTransit({ scope, onCamera, onMigrate, onArrive, onGather, reduced })
 *
 * `onCamera(x, y)`      the camera's map px, every frame of the pan
 * `onMigrate(dx, dy, t01, amp)` the MIGRATE uniform, every frame of the surge
 * `onGather()`          fired once, at gatherStartMs: hand the destination's
 *                       words to the field so they start assembling
 * `onArrive()`          fired once, when everything is over: drop the panel
 *                       that left
 */
export function createTransit({ scope, onCamera, onMigrate, onGather, onArrive,
                                reduced = prefersReducedMotion } = {}) {
  const ease = cubicBezier(...T.cameraEase);
  let run = null;          // the transit in flight, or null

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  function stop() {
    if (run && run.cancel) run.cancel();
    run = null;
  }

  /**
   * start a transit from `from` (map px) travelling `delta` panels.
   *
   * `viewport` is the panel size, so the distance in px is delta x viewport --
   * a panel is exactly one screen (bible 7.1a) and that is the only place that
   * assumption is used.
   */
  function start({ from, delta, viewport }) {
    stop();

    const dx = delta[0] * viewport.w;
    const dy = delta[1] * viewport.h;
    const to = { x: from.x + dx, y: from.y + dy };
    const moving = dx !== 0 || dy !== 0;

    // A 404, a re-click, or a route with no map cell: there is nowhere to go,
    // so there is no transit. The page still swaps, the URL still changes, and
    // the words still gather -- which is the right behaviour and falls out of
    // the delta being [0,0] rather than out of a special case.
    if (!moving) {
      onCamera && onCamera(to.x, to.y);
      onMigrate && onMigrate(1, 0, 0, 0);
      onGather && onGather();
      onArrive && onArrive();
      return { duration: 0 };
    }

    // REDUCED MOTION: THE CAMERA JUMPS (bible 7.1a). The pan is decorative --
    // the DOM swap, the URL and the focus order are identical either way, and
    // nothing about the page's meaning lives in the movement.
    const isReduced = reduced();
    if (isReduced) {
      onCamera && onCamera(to.x, to.y);
      onMigrate && onMigrate(1, 0, 0, 0);
      onGather && onGather();
      // ...and the words cross-fade over reducedCrossfadeMs instead. The gather
      // itself does the fading; this is only when the panel that left may go,
      // and it runs on the SAME clock as everything else rather than on a timer
      // of its own.
      run = { t0: null, step: (t) => {
        if (t >= T.reducedCrossfadeMs) { onArrive && onArrive(); run = null; }
      } };
      return { duration: T.reducedCrossfadeMs, reduced: true };
    }

    const panMs = panDurationMs(delta);
    // the unit travel direction, and the CROWD GOES THE OTHER WAY. The camera
    // moves +delta across the plane, so the world moves -delta past the viewer
    // -- and the crowd is part of the world.
    const len = Math.hypot(dx, dy) || 1;
    const dirX = -dx / len;
    const dirY = -dy / len;
    const amp = T.migrateAmpCells * viewport.cellPx;

    const total = Math.max(T.cameraDelayMs + panMs, T.migrateMs, T.gatherStartMs);
    let gathered = false;

    // ONE CLOCK FOR THE WHOLE SITE. This used to own a requestAnimationFrame of
    // its own, and it should not: the render loop already runs every frame and
    // a second rAF is a second thing that can be throttled, paused or governed
    // out of step with the first. The loop calls tick(); this only decides what
    // the numbers are.
    const step = (t) => {

      // 0 -> migrateMs: the crowd. Ahead of the camera, because it started
      // cameraDelayMs earlier and peaks earlier still.
      const m01 = Math.min(1, t / T.migrateMs);
      onMigrate && onMigrate(dirX, dirY, m01, m01 >= 1 ? 0 : amp);

      // cameraDelayMs -> +panMs: the camera, chasing.
      const c01 = Math.min(1, Math.max(0, (t - T.cameraDelayMs) / panMs));
      const e = ease(c01);
      onCamera && onCamera(from.x + dx * e, from.y + dy * e);

      if (!gathered && t >= T.gatherStartMs) {
        gathered = true;
        onGather && onGather();
      }

      if (t >= total) {
        // land EXACTLY on the destination. A pan that ends a third of a pixel
        // short leaves the lattice half a cell off its own grid for the rest of
        // the session, and every later navigation inherits it.
        onCamera && onCamera(to.x, to.y);
        onMigrate && onMigrate(dirX, dirY, 0, 0);
        if (!gathered) onGather && onGather();
        onArrive && onArrive();
        run = null;
      }
    };

    // t0 is set by the FIRST TICK, not here: the clock that matters is the
    // render loop's, and it may be a synthetic one.
    run = { t0: null, step };
    step(0);                                   // the t=0 row of the beat table
    if (scope) scope.add(stop);
    return { duration: total, panMs };
  }

  return {
    start,
    stop,
    /**
     * advance the transit in flight. Called once per frame by the render loop,
     * which is the only clock on this site.
     */
    tick(nowMs) {
      if (!run || !run.step) return;
      const t = nowMs === undefined ? now() : nowMs;
      if (run.t0 === null) run.t0 = t;
      run.step(t - run.t0);
    },
    get running() { return !!run; }
  };
}

export default createTransit;
