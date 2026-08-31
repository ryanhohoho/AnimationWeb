// router.test.mjs — does the WEATHER step when the sheet is swapped?
//
// Drives the REAL router against a hand-rolled DOM that models the one thing
// that matters here: replacing #doc with a SHORTER page clamps window.scrollY
// on the spot. Then watches the sky coordinate at the top of the viewport,
// frame by frame, straight through the swap. A step in it is the jump.
//
// run: npm test (or node --import ./test/viteStubRegister.mjs test/router.test.mjs)

const VH = 900, VW = 1400;
const HEIGHT = { home: 3600, project: 9000 };  // STATE.md: home ~3600, projects taller

let page = "home";
let scrollY = 0;
const maxScroll = () => Math.max(0, HEIGHT[page] - VH);

const HOME_MARK = "<!--home-->";

const ap = {
  classList: { add() {}, remove() {} },
  closest: () => null,
  getBoundingClientRect: () => ({
    left: 200, width: 600, top: 300 - scrollY, height: 400,
    bottom: 700 - scrollY, right: 800
  })
};

const docEl = {
  _html: HOME_MARK,
  get innerHTML() { return this._html; },
  set innerHTML(v) {
    this._html = v;
    page = v === HOME_MARK ? "home" : "project";
    scrollY = Math.min(scrollY, maxScroll());   // <- the browser does this, here
  }
};

globalThis.document = {
  title: "",
  body: { classList: { add() {}, remove() {} } },
  documentElement: { clientWidth: VW, get scrollHeight() { return HEIGHT[page]; } },
  getElementById: () => docEl,
  querySelectorAll: (sel) => (sel.includes("band") ? [] : [ap]),
  addEventListener: () => {}
};
// NOTHING FIRES `scroll` HERE, and that is the point: the browser dispatches it
// asynchronously, so anything reading a cached scroll offset during the swap
// reads the old one.
globalThis.window = {
  innerWidth: VW, innerHeight: VH, devicePixelRatio: 1,
  get scrollY() { return scrollY; },
  scrollTo: (o) => { scrollY = Math.min(o.top ?? 0, maxScroll()); },
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {}
};
globalThis.location = { pathname: "/", hash: "" };
globalThis.history = {
  state: null,
  pushState(s, _t, p) { this.state = s; location.pathname = p; },
  replaceState(s) { this.state = s; }
};
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };

let clock = 0;
globalThis.performance = { now: () => clock };
let pending = [];
globalThis.requestAnimationFrame = (fn) => { pending.push(fn); return pending.length; };
globalThis.setTimeout = () => 0;   // the watchdogs must not fire inside a check

let sky = 0, skyRamp = 0, frameNo = 0, coverAfter = 0;
const deck = {
  get sky() { return sky; },
  get skyRamp() { return skyRamp; },
  setSky(v, r) { sky = v; if (r !== undefined) skyRamp = r; },
  setSkyRamp(v) { skyRamp = v; },
  setInk() {}, setEatInk() {}, bind() {}, setCrossing() {},
  get crossCovered() { return frameNo >= coverAfter; }
};

const { createRouter } = await import("../src/site/router.js");
const router = createRouter({ deck, world: { emit() {} }, onPage() {} });

/** pump n frames at 60 Hz, recording where the top of the viewport sits in the
    SKY's own coordinates: doc position + however far the plate is wound on. */
function pump(n, log) {
  for (let i = 0; i < n; i++) {
    clock += 1000 / 60;
    frameNo++;
    const due = pending; pending = [];
    for (const fn of due) fn(clock);
    log?.push({ f: frameNo, scrollY, sky, top: scrollY + sky, page });
  }
}

let failures = 0;
function ok(cond, msg) { if (!cond) { failures++; console.error("  FAIL:", msg); } else console.log("  ok:", msg); }

/** biggest one-frame step in the sky coordinate, ignoring the reader's own
    scrolling (there is none here — nobody scrolls during a crossing) */
function worstStep(rec) {
  let worst = 0, at = null;
  for (let i = 1; i < rec.length; i++) {
    const d = Math.abs(rec[i].top - rec[i - 1].top);
    if (d > worst) { worst = d; at = rec[i].f; }
  }
  return { worst, at };
}

console.log("\n== going IN: home -> project, reader 1,200 px down the home sheet");
scrollY = 1200;
{
  coverAfter = frameNo + 40;
  const rec = [{ f: frameNo, scrollY, sky, top: scrollY + sky, page }];
  router.go("/projects/iclicker");
  pump(200, rec);
  const { worst, at } = worstStep(rec);
  console.log(`   landed on ${page}, scrollY ${scrollY}, sky ${sky}`);
  ok(worst < 1, `weather does not step going in (worst ${worst.toFixed(1)} px at frame ${at})`);
}

console.log("\n== coming HOME: reader 500 px down the project sheet");
{
  scrollY = 500;
  coverAfter = frameNo + 40;
  const rec = [{ f: frameNo, scrollY, sky, top: scrollY + sky, page }];
  router.go("/");
  pump(200, rec);
  const { worst, at } = worstStep(rec);
  console.log(`   landed on ${page}, scrollY ${scrollY}, sky ${sky}`);
  ok(worst < 1, `weather does not step coming home from 500 (worst ${worst.toFixed(1)} px at frame ${at})`);
}

console.log("\n== coming HOME from the FOOT of a long project (7,000 px down)");
{
  router.go("/projects/iclicker");
  coverAfter = frameNo + 40;
  pump(200);
  scrollY = 7000;
  coverAfter = frameNo + 40;
  const rec = [{ f: frameNo, scrollY, sky, top: scrollY + sky, page }];
  router.go("/");
  pump(200, rec);
  const { worst, at } = worstStep(rec);
  console.log(`   home holds at most ${maxScroll()} px, so the browser clamps 7000 -> ${Math.min(7000, 2700)}`);
  console.log(`   landed on ${page}, scrollY ${scrollY}, sky ${sky}`);
  ok(worst < 1, `weather does not step coming home from the foot (worst ${worst.toFixed(1)} px at frame ${at})`);
}

// ---------------------------------------------------------------------------
// SHE COMES IN FROM A SIDE, ON EVERY SWAP, IN BOTH DIRECTIONS.
//
// This needs the BROWSER half of world.js — the headless world has no
// listeners, so the sim suite cannot see this bug at all. The router swaps
// #doc, scrolls to the top and emits `recollect` in one synchronous block, and
// `scroll` is async, so a cached scroll offset is still the old sheet's at that
// instant. Her entry y is measured against it: `oldScroll + a bit` puts her
// hundreds of pixels down the new sheet, off the bottom of the window, and she
// wanders up from below instead of in from an edge.
console.log("\n== the swap puts her back at a SIDE of the new window");
{
  const { createWorld } = await import("../src/engine/world.js");
  const { createBody } = await import("../src/engine/physics/body2d.js");
  const { createBrain } = await import("../src/engine/behavior/brain.js");
  const { rigConfig } = await import("../src/config/rigConfig.js");

  const w = createWorld({ seed: 5 });          // NOT headless: the real listeners
  const b = createBody({ x: 700, y: 400, radius: 75, config: rigConfig.physics });
  const br = createBrain({ body: b, world: w, config: rigConfig.behavior,
    pathConfig: rigConfig.path, attackConfig: rigConfig.attack });
  const r2 = createRouter({ deck, world: w, onPage() {} });

  const check = (label, atScroll, go) => {
    scrollY = atScroll;
    w.scroll.y = atScroll;                     // as the async listener left it
    b.pos.x = 700; b.pos.y = atScroll + 400;
    coverAfter = frameNo + 40;
    r2.go(go);
    pump(200);
    // MEASURED AGAINST THE REAL SCROLL POSITION, not against world.scroll.y.
    // The whole bug is that the world's copy is stale during the swap, so
    // checking her against it is checking a stale thing against itself and
    // passes either way — which this check did, until it did not.
    const top = scrollY, bottom = scrollY + VH;
    ok(w.scroll.y === scrollY,
      `${label}: the world knows where the page actually is ` +
      `(world ${w.scroll.y}, browser ${scrollY})`);
    ok(b.pos.y > top && b.pos.y < bottom,
      `${label}: she is inside the window she lands in ` +
      `(y ${Math.round(b.pos.y)}, window ${top}..${bottom})`);
    ok(b.pos.x < 0 || b.pos.x > VW,
      `${label}: ...and outside a SIDE of it, so she enters across one ` +
      `(x ${Math.round(b.pos.x)} of 0..${VW})`);
  };

  check("home -> project", 1200, "/projects/iclicker");
  check("project -> home", 4800, "/");
}

console.log(failures ? `\n${failures} FAILED` : "\nall clear");
process.exit(failures ? 1 : 0);
