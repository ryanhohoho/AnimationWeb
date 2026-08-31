// lifecycle.js
// the disposal registry. every subsystem
// takes a scope and registers into it, route teardown calls dispose() once,
// and NOTHING anywhere calls addEventListener directly.
//
// the point is that a leak needs a named OWNER, not vigilance. six classes of
// leak, and this file owns four of them outright (listeners, timers, rAF,
// observers). gpu objects and detached-dom closures still need each module's
// own dispose(), but they register it here so there is one call at the end.
//
// pure: no dom, no three.js. it runs headless in test/type.test.js, which is
// the only way the "zero pending after dispose" assertion can be cheap enough
// to run on every commit.

// rAF only exists in a browser. headless we fall back to a timer at roughly
// 60 Hz -- not because anyone wants to animate in node, but because a scope
// that throws the moment it is used outside a browser is a scope that never
// gets tested.
const RAF_FALLBACK_MS = 16;

function hasRaf() {
  return typeof globalThis.requestAnimationFrame === "function" &&
         typeof globalThis.cancelAnimationFrame === "function";
}

/**
 * createScope() -> { signal, add, addTimer, addInterval, addRaf, listen,
 *                    observe, dispose, disposed, pending }
 *
 * one AbortController per scope. every listener goes on with { signal }, so a
 * single abort() removes all of them at once -- no bookkeeping, no chance of
 * removeEventListener being called with a different function reference than
 * the one that went on (which is the classic way a "cleaned up" listener stays
 * put forever).
 */
export function createScope(name = "scope") {
  const ctl = new AbortController();

  // arbitrary teardown: functions, or objects carrying dispose / disconnect /
  // close / abort. three's geometries, materials and textures are the first
  // group; observers are the second.
  const disposables = new Set();
  const timers = new Set();     // setTimeout AND setInterval ids
  const intervals = new Set();  // ...but interval ids are cleared differently
  const rafs = new Set();

  let disposed = false;

  function assertLive(what) {
    // registering into a dead scope is always a bug: the thing being
    // registered will never be cleaned up, because the cleanup already ran.
    // loud, because silent is how this becomes a leak nobody can find.
    if (disposed) {
      throw new Error(`lifecycle: ${what} registered on a disposed ${name}`);
    }
  }

  const scope = {
    // pass this to every addEventListener, every fetch, every observer that
    // takes one. it is the whole mechanism.
    signal: ctl.signal,

    get disposed() { return disposed; },

    /**
     * what is still outstanding. the leak tests read this; production code
     * should not need it, but it costs nothing and a number you can assert on
     * is worth more than a comment promising there is nothing left.
     */
    get pending() {
      return {
        timers: timers.size + intervals.size,
        rafs: rafs.size,
        disposables: disposables.size
      };
    },

    /**
     * register arbitrary teardown. accepts a function, or anything with
     * dispose() / disconnect() / close() / abort() -- which covers three's gpu
     * objects, the three observer types, and a nested scope.
     * returns an "unregister" so a caller can hand back something it tore down
     * early, and the scope does not try to tear it down twice.
     */
    add(d) {
      assertLive("disposable");
      disposables.add(d);
      return () => disposables.delete(d);
    },

    /** setTimeout, tracked. cleared on dispose whether or not it has fired. */
    addTimer(fn, ms) {
      assertLive("timer");
      const id = setTimeout(() => {
        // drop it BEFORE running: a one-shot that has fired is not pending,
        // and if fn throws we still must not leave a stale id behind.
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    },

    /** setInterval, tracked. never self-clears -- only dispose stops it. */
    addInterval(fn, ms) {
      assertLive("interval");
      const id = setInterval(fn, ms);
      intervals.add(id);
      return id;
    },

    /**
     * one rAF callback, tracked. NOT a loop: main.js owns THE rAF for the
     * whole site (plan section 1), and this is for the one-shot "do it after
     * layout has settled" case. a caller that re-arms from inside fn gets a
     * loop, and gets it correctly, because the old id is dropped before fn
     * runs and the new one is registered by the re-arm.
     */
    addRaf(fn) {
      assertLive("raf");
      let id;
      const run = (t) => {
        rafs.delete(id);
        fn(t);
      };
      id = hasRaf() ? globalThis.requestAnimationFrame(run)
                    : setTimeout(() => run(nowMs()), RAF_FALLBACK_MS);
      rafs.add(id);
      return id;
    },

    /**
     * the reason nothing calls addEventListener directly. same signature,
     * with the scope's signal folded in.
     */
    listen(target, type, fn, opts = {}) {
      assertLive("listener");
      target.addEventListener(type, fn, { ...opts, signal: ctl.signal });
      // no unregister returned: abort() is the removal path, and handing back
      // a second one invites the mismatched-reference bug this exists to kill.
    },

    /**
     * Resize / Intersection / Mutation observers. observe once, disconnect on
     * dispose. they do not take a signal, which is exactly why they need to be
     * named here rather than trusted to a comment.
     */
    observe(observer, target, opts) {
      assertLive("observer");
      if (target) observer.observe(target, opts);
      disposables.add(observer);
      return observer;
    },

    /**
     * a child scope, disposed with its parent. useful when a route owns a
     * component that can also be torn down on its own.
     */
    child(childName = `${name}.child`) {
      assertLive("child scope");
      const c = createScope(childName);
      disposables.add(c);
      return c;
    },

    /**
     * IDEMPOTENT. calling it twice is not an error and does nothing the second
     * time -- route teardown races and double-unmounts are normal, and a
     * dispose that throws on the second call turns a harmless race into a
     * broken navigation.
     */
    dispose() {
      if (disposed) return;
      disposed = true;

      // listeners first: one abort takes every one of them, plus anything
      // else that was handed the signal.
      ctl.abort();

      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const id of intervals) clearInterval(id);
      intervals.clear();

      for (const id of rafs) {
        if (hasRaf()) globalThis.cancelAnimationFrame(id);
        else clearTimeout(id);
      }
      rafs.clear();

      // teardown runs in REVERSE registration order, the way a stack unwinds:
      // things registered later tend to depend on things registered earlier.
      const list = [...disposables].reverse();
      disposables.clear();
      for (const d of list) runDisposable(d);
    }
  };

  return scope;
}

function runDisposable(d) {
  try {
    if (typeof d === "function") { d(); return; }
    if (!d) return;
    if (typeof d.dispose === "function") { d.dispose(); return; }
    if (typeof d.disconnect === "function") { d.disconnect(); return; }
    if (typeof d.close === "function") { d.close(); return; }
    if (typeof d.abort === "function") { d.abort(); return; }
  } catch (e) {
    // one module's broken teardown must not strand every module registered
    // after it. that is the whole reason this is wrapped.
    console.error("lifecycle: disposable threw during dispose", e);
  }
}

function nowMs() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

export default createScope;
