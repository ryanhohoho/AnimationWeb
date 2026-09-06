// router.test.mjs — does the WEATHER step when the sheet is swapped?
//
// Drives the REAL router against a hand-rolled DOM that models the one thing
// that matters here: replacing #doc with a SHORTER page clamps window.scrollY
// on the spot. Then watches the sky coordinate at the top of the viewport,
// frame by frame, straight through the swap. A step in it is the jump.
//
// run: npm test (or node --import ./test/viteStubRegister.mjs test/router.test.mjs)

const VH = 900, VW = 1400;
// The four deck cards are one screen each now; a project sheet is still a long
// document. That asymmetry IS the bug this file exists for -- landing on a much
// shorter page is what makes the browser clamp the scroll on the spot.
const HEIGHT = {
  home: 1000, experience: 1000, projects: 2200, contact: 1000, project: 9000
};

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
    // the deck cards each carry their own plate id, so the markup says which
    // page arrived without the harness having to be told separately
    page = v === HOME_MARK ? "home"
      : v.includes('id="p-experience"') ? "experience"
      : v.includes('id="p-projects"') ? "projects"
      : v.includes('id="p-contact"') ? "contact"
      : "project";
    scrollY = Math.min(scrollY, maxScroll());   // <- the browser does this, here
  },
  // runFade writes both of these every frame
  classList: { add() {}, remove() {} },
  style: {}
};

globalThis.document = {
  title: "",
  body: { classList: { add() {}, remove() {} } },
  documentElement: { clientWidth: VW, get scrollHeight() { return HEIGHT[page]; } },
  getElementById: () => docEl,
  // No band, no icon aperture and no explicit crossing target in this fixture:
  // the point of the harness is the swap arithmetic, and leaving these empty
  // exercises the fallbacks (paper closes all the way, largest aperture wins)
  // rather than a hand-placed happy path.
  querySelector: (sel) => (sel.includes("cross-target") ? null : ap),
  querySelectorAll: (sel) =>
    (sel.includes("band") || sel.includes("icon-ap") || sel.includes("cross-target")
      ? [] : [ap]),
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
globalThis.clearTimeout = () => {};

let sky = 0, skyRamp = 0, frameNo = 0, coverAfter = 0;
let shifts = [];
// WHICH DRIVE RAN, observed rather than inferred. Timing would be a proxy and a
// bad one; setCrossing is only ever called by the opening, so a move that never
// touches it is a fade and a move that does is a crossing. That is the whole
// transition matrix, checkable in one number.
let crossCalls = 0;
const deck = {
  get sky() { return sky; },
  get skyRamp() { return skyRamp; },
  setSky(v, r) { sky = v; if (r !== undefined) skyRamp = r; },
  setSkyRamp(v) { skyRamp = v; },
  setInk() {}, setEatInk() {}, bind() {}, setCrossing() { crossCalls++; },
  // added when the icons became holes. Both are no-ops here: this file is about
  // what the ROUTER does to the sky across a swap, and neither call touches it.
  setMaskHole() { return false; }, setAltInk() {},
  // recorded, because "the die-cuts leave with the page" is a claim about a
  // sequence of numbers and not about a final state
  setDocShift(dx, fade) { shifts.push({ dx: dx || 0, fade: fade === undefined ? 1 : fade }); },
  get crossCovered() { return frameNo >= coverAfter; }
};

const { createRouter, RAMP } = await import("../src/site/router.js");
const router = createRouter({ deck, world: { emit() {} }, onPage() {} });

/** pump n frames at 60 Hz, recording where the top of the viewport sits in the
    SKY's own coordinates: doc position + however far the plate is wound on. */
function pump(n, log) {
  for (let i = 0; i < n; i++) {
    clock += 1000 / 60;
    frameNo++;
    const due = pending; pending = [];
    for (const fn of due) fn(clock);
    // `top` is where the top of the window sits in the WEATHER's coordinates;
    // `night` is where it sits in the TIME's. They are two different offsets
    // with opposite needs (see uSky / uSkyRamp in pressgl.js) and the second one
    // is what this rebuild changed, so it has to be watched as closely.
    log?.push({ f: frameNo, scrollY, sky, skyRamp,
                top: scrollY + sky, night: scrollY + skyRamp, page });
  }
}

let failures = 0;
function ok(cond, msg) { if (!cond) { failures++; console.error("  FAIL:", msg); } else console.log("  ok:", msg); }

/** biggest one-frame step in the sky coordinate, ignoring the reader's own
    scrolling (there is none here — nobody scrolls during a crossing) */
function worstStep(rec, key = "top") {
  let worst = 0, at = null;
  for (let i = 1; i < rec.length; i++) {
    const d = Math.abs(rec[i][key] - rec[i - 1][key]);
    if (d > worst) { worst = d; at = rec[i].f; }
  }
  return { worst, at };
}
const snap = () => ({ f: frameNo, scrollY, sky, skyRamp,
                      top: scrollY + sky, night: scrollY + skyRamp, page });

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
  console.log(`   home holds at most ${maxScroll()} px, so the browser clamped 7000 -> ${scrollY}`);
  console.log(`   landed on ${page}, scrollY ${scrollY}, sky ${sky}`);
  ok(worst < 1, `weather does not step coming home from the foot (worst ${worst.toFixed(1)} px at frame ${at})`);
}

// ---------------------------------------------------------------------------
// WHICH MOVE IS THIS? — the transition matrix, observed
//
// There are two kinds of move on this site and picking the wrong one is not a
// cosmetic bug: a four-second opening between two lists of text is a toll
// booth, and a page turn where the reader expected to go THROUGH something
// loses the one moment the whole sheet is built around.
//
// EVERY ONE OF THESE IS PAIRED. `cross > 0` and `cross === 0` are the same
// assertion read two ways, so neither can pass by accident — a router that
// always crossed would fail the fades and a router that never crossed would
// fail the crossings.
console.log("\n== the transition matrix: which pairs cross, and which just turn");
{
  const move = (from, to) => {
    location.pathname = from;
    history.state = { path: from };
    router.go(from, { push: false });
    coverAfter = frameNo + 20;
    pump(160);
    crossCalls = 0;
    coverAfter = frameNo + 20;
    router.go(to);
    pump(160);
    return crossCalls;
  };

  ok(move("/", "/experience") > 0,
    "summary -> experience OPENS (it is where the window is explained)");
  ok(move("/experience", "/") > 0,
    "experience -> summary closes back into that same window");
  ok(move("/experience", "/projects") === 0,
    "experience -> projects just TURNS (adjacent cards of one deck)");
  ok(move("/projects", "/contact") === 0,
    "projects -> contact just turns");
  ok(move("/contact", "/projects") === 0,
    "...and turns back the other way");
  ok(move("/projects", "/projects/closet") > 0,
    "projects -> a project OPENS, out of the icon that was clicked");
  ok(move("/projects/closet", "/projects") > 0,
    "a project -> projects closes back");
  ok(move("/projects/closet", "/projects/iclicker") === 0,
    "project -> project turns: they are siblings, not a journey");
}

// ---------------------------------------------------------------------------
// THE NIGHT, which is the thing this rebuild actually changed.
//
// The sheet used to be one tall document and the time of night fell as you
// scrolled it. Four one-screen cards have no scroll to fall through, so the hour
// became a property of the CARD — and that moved uSkyRamp from "always settles
// on zero" to "settles on a different number every time", which is exactly the
// shape of the bug the original file was written to catch.
//
// `night` is scrollY + skyRamp: where the top of the window sits in the plate's
// own time. The shader divides it by REF_H, so a step in it is a step in
// brightness across the whole screen.
console.log("\n== the night: a card arrives at its own hour, without flinching");
{
  location.pathname = "/"; history.state = { path: "/" };
  router.go("/", { push: false });
  coverAfter = frameNo + 20; pump(160);

  // ── ACROSS A FADE, WITH NOTHING COVERING IT ────────────────────────────
  // This is the case the old suite structurally could not see: on a crossing
  // the screen is full of print when the numbers move, so a step is invisible
  // and untestable. A fade takes #doc to zero and leaves the SHEET in full view,
  // so every pixel of this one is on screen while it happens.
  router.go("/experience"); coverAfter = frameNo + 20; pump(160);
  const rec = [snap()];
  const sky0 = sky;
  router.go("/projects");
  pump(160, rec);

  const nightStep = worstStep(rec, "night");
  const total = Math.abs(RAMP.projects - RAMP.experience);
  console.log(`   ${RAMP.experience} -> ${RAMP.projects} (${total} px of ramp), ` +
              `worst single frame ${nightStep.worst.toFixed(1)} px`);

  ok(page === "projects", "the fade actually landed on the projects card");
  ok(Math.abs(skyRamp - RAMP.projects) < 1,
    `it settles on the card's own hour (${skyRamp.toFixed(0)}, wanted ${RAMP.projects})`);

  // THE PAIRED CONTROL. A step at the swap — which is what setting the ramp in
  // commit() would do, and what the first version of this did — moves the whole
  // distance in ONE frame. So the threshold has to be far below that or it is
  // not measuring anything: 60 px of ramp is 1.5% of REF_H, and the naive
  // version is 1300.
  ok(nightStep.worst < 60,
    `and glides there rather than stepping (worst ${nightStep.worst.toFixed(1)} px, ` +
    `a step at the swap would be ${total})`);
  ok(total > 500,
    `control: the two cards really are hours apart, so the check above had ` +
    `something to catch (${total} px)`);

  // ── AND THE WEATHER DOES NOT MOVE AT ALL ON A FADE ─────────────────────
  // uSky is a PAN of the entire sky. Behind a full screen of print that is
  // free; across a fade it is the rubber-band glide the comments warn about, so
  // commit() is told not to carry it. Two offsets, opposite needs, one move.
  ok(sky === sky0,
    `the weather is untouched by a page turn (${sky0} -> ${sky})`);
}

console.log("\n== the night settles correctly through a CROSSING too");
{
  location.pathname = "/projects"; history.state = { path: "/projects" };
  router.go("/projects", { push: false }); coverAfter = frameNo + 20; pump(160);

  const rec = [snap()];
  router.go("/projects/closet");
  coverAfter = frameNo + 20;
  pump(200, rec);
  ok(page === "project", "the crossing landed on the project sheet");
  ok(Math.abs(skyRamp - RAMP.project) < 1,
    `a project sheet walks its own night from the top (ramp ${skyRamp.toFixed(0)})`);
  const w = worstStep(rec, "top");
  ok(w.worst < 1,
    `and the weather still does not step going in (worst ${w.worst.toFixed(1)} px)`);

  const rec2 = [snap()];
  router.go("/projects");
  coverAfter = frameNo + 20;
  pump(200, rec2);
  ok(page === "projects", "and back out to the list");
  ok(Math.abs(skyRamp - RAMP.projects) < 1,
    `which is back at its own hour (${skyRamp.toFixed(0)}, wanted ${RAMP.projects})`);
  const w2 = worstStep(rec2, "top");
  ok(w2.worst < 1,
    `weather does not step coming back either (worst ${w2.worst.toFixed(1)} px)`);
}

// ---------------------------------------------------------------------------
// A DEAD NAVIGATION'S WATCHDOG MUST NOT WIPE A LIVE CROSSING.
//
// Every move arms a watchdog for the case where rAF stops entirely (a tab
// backgrounded mid-transition). It is armed for CROSS_MS * 3 = 4.8 s against a
// 1.6 s crossing, so it nearly always fires long after its own move is over --
// and it used to clear the eating unconditionally when it did. Two navigations
// inside about five seconds is enough for a finished move's timer to reach
// forward and clear the eating of a crossing that is still running: one frame
// with nothing covering the window, the page visible straight through the
// middle of a transition, and covered again on the very next frame.
//
// That is the intermittent flicker, and it needs BOTH clocks to see. Every
// other check in this file runs with setTimeout stubbed out precisely so the
// watchdogs cannot interfere; this one puts a real virtual timer queue on the
// SAME clock as rAF, which is the only way the interleaving exists at all.
console.log("\n== a finished navigation cannot clear a running one's crossing");
{
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let timers = [], timerId = 1;
  globalThis.setTimeout = (fn, ms) => {
    const id = timerId++;
    timers.push({ id, at: clock + (ms || 0), fn });
    return id;
  };
  globalThis.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); };

  // record every crossing the router hands the deck, so a clear can be told
  // apart from a finish: a legitimate null is the LAST thing a drive says.
  const seen = [];
  const realSetCrossing = deck.setCrossing;
  deck.setCrossing = (c) => { seen.push({ t: Math.round(clock), gone: c === null }); realSetCrossing.call(deck, c); };

  // pump, firing due timers before each frame the way a browser does
  const run = (n) => {
    for (let i = 0; i < n; i++) {
      clock += 1000 / 60;
      frameNo++;
      const due = timers.filter((t) => t.at <= clock);
      timers = timers.filter((t) => t.at > clock);
      for (const t of due) t.fn();
      const q = pending; pending = [];
      for (const fn of q) fn(clock);
    }
  };
  const nav = (p, frames) => { coverAfter = frameNo + 30; router.go(p); run(frames); };

  location.pathname = "/"; history.state = { path: "/" };
  router.go("/", { push: false }); run(120);
  seen.length = 0;

  // the exact spacing that reproduced it: a crossing, a return whose watchdog
  // is armed at ~3.2 s, then a fresh crossing running when 3.2 + 4.0 s lands
  nav("/experience", 130);
  run(60);
  nav("/", 130);
  run(60);
  nav("/experience", 200);
  run(200);

  // AN ILLEGITIMATE CLEAR IS A null WITH MORE CROSSING AFTER IT. A drive that
  // finished says null and stops; a drive that was wiped says null and then
  // carries on drawing, because its own next frame puts the opening straight
  // back. That gap is the frame you can see the page through.
  let wiped = 0, at = null;
  for (let i = 0; i < seen.length - 1; i++) {
    if (!seen[i].gone || seen[i + 1].gone) continue;
    if (seen[i + 1].t - seen[i].t < 60) { wiped++; at = seen[i].t; }
  }
  const nulls = seen.filter((e) => e.gone).length;

  ok(wiped === 0,
    `no crossing is cleared while it is still running (${wiped} wipes` +
    `${at === null ? "" : ` at ${at}ms`}, ${nulls} clears over 3 moves)`);
  // THE PAIRED CONTROL. Without it this passes for a router that never fires a
  // watchdog at all, so assert the timers really were armed and really did run:
  // three moves, three drives, three clears -- one each, at their own end.
  ok(nulls === 3,
    `...and each move still ends its own crossing exactly once (${nulls} of 3)`);

  deck.setCrossing = realSetCrossing;
  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
}

// ---------------------------------------------------------------------------
// THE DIE-CUTS LEAVE WITH THE PAGE THEY ARE CUT IN.
//
// A hole is a rectangle of the DOCUMENT held in a shader uniform, which is what
// keeps it registered while the page scrolls under it -- and is exactly why it
// used to sit perfectly still and perfectly opaque while a turn slid the type
// thirty pixels out from under it and dissolved it. The aperture hung in the
// air with nothing around it, which was the one thing about a page turn that
// looked wrong.
//
// The router hands the deck the same two numbers #doc is carrying. This checks
// the SEQUENCE, because the resting state is the same either way: a router that
// never called it at all would still finish at (0, 1).
console.log("\n== an aperture travels with the type it is cut around");
{
  location.pathname = "/experience"; history.state = { path: "/experience" };
  router.go("/experience", { push: false });
  coverAfter = frameNo + 20; pump(160);

  shifts.length = 0;
  router.go("/projects");           // a FADE
  pump(160);

  const dxs = shifts.map((s) => s.dx);
  const fades = shifts.map((s) => s.fade);
  const minDx = Math.min(...dxs), maxDx = Math.max(...dxs), minFade = Math.min(...fades);
  const last = shifts[shifts.length - 1];

  ok(shifts.length > 20, `the turn drives the holes every frame (${shifts.length} writes)`);
  ok(minDx < -20, `they slide out with the page (${minDx.toFixed(1)} px)`);
  ok(maxDx > 20, `...and back in from the other side (+${maxDx.toFixed(1)} px)`);
  ok(minFade < 0.05, `and they fade with it (down to ${minFade.toFixed(3)})`);
  ok(last.dx === 0 && last.fade === 1,
    `and the page is left where it says it is (${last.dx}, ${last.fade})`);

  // ── THE PAIRED CONTROL ────────────────────────────────────────────────
  // A CROSSING must NOT do any of that. The opening has to be able to cover a
  // window that is halfway through fading, so the die-cuts stay put and stay
  // solid while it eats -- and #doc is not moved at all on that path. If this
  // ever starts shifting, the check above has stopped discriminating.
  location.pathname = "/"; history.state = { path: "/" };
  router.go("/", { push: false });
  coverAfter = frameNo + 20; pump(200);

  shifts.length = 0;
  router.go("/experience");         // a CROSSING
  coverAfter = frameNo + 20;
  pump(220);
  const moved = shifts.filter((s) => s.dx !== 0 || s.fade !== 1);
  ok(moved.length === 0,
    `control: a crossing never moves or fades a die-cut (${moved.length} of ${shifts.length})`);
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
