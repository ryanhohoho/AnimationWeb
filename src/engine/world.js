// world.js
// shared state every system reads: viewport, pointer, scroll, colliders,
// plus a tiny event bus. no three.js here -- this file runs headless in tests.

import { expDamp, mulberry32 } from "../utils/math.js";

export function createWorld({ seed = 1337, headless = false } = {}) {
  const world = {
    viewport: { w: 1280, h: 800, dpr: 1 },
    docSize: { w: 1280, h: 800 },   // full document extent; movement space
    pointer: {
      pos: { x: -9999, y: -9999 },  // DOCUMENT coords
      client: { x: -9999, y: -9999 },
      vel: { x: 0, y: 0 },          // from hand motion (client deltas)
      speed: 0,
      active: false,       // becomes true on first real pointer event
      lastMoveAt: -Infinity,
      type: "mouse"        // the last press's pointerType: a finger is judged
                           // differently from a mouse (behavior.fling)
    },
    scroll: { y: 0, vel: 0 },
    colliders: [],          // [{ rect: {x, y, w, h}, el }] in DOCUMENT coords
    collidersVersion: 0,    // bumped on every remeasure so consumers can rebuild
    panicking: false,       // the flight, see brain.panicFrom
    // ── THE HAND IS ON HER ────────────────────────────────────────────────
    // Published for the same reason `panicking` is: something outside the
    // engine has to know. The router's swipe watches every touch drag on the
    // page and reads a mostly-sideways one as "next card" — and a fling is a
    // mostly-sideways touch drag. On a phone, throwing her sideways navigated
    // away from the page you threw her on. There is no element to check
    // against, because she is a WebGL context and the grab is a window
    // listener, so the flag is the only thing that can answer it.
    grabbing: false,
    offLeash: false,        // ...and the two moments when being off the page is
                            // the POINT: that flight, and the beat she waits
                            // outside the frame before entering a new sheet.
                            // Written by the brain, read by resolveEdges.
    // written by the pose side each render frame, read by the brain's thrust
    // gating: how much the posed body axis agrees with the intended direction
    poseState: { leanIn: 0 },
    time: 0,
    random: mulberry32(seed),
    // ...and the seed itself, so a subsystem that needs randomness of its own
    // can derive a PRIVATE stream instead of drawing from this one. `random` is
    // shared, so every draw from it changes what the next consumer sees — which
    // is fine until two of them want to be compared independently. The tail's
    // gesture scheduler is the first that did (engine/pose/tailChain.js).
    seed,

    // -- event bus -------------------------------------------------------
    // on() RETURNS AN UNSUBSCRIBE, and there is an off(). this used to be
    // add-only, which is harmless in a single-page life and a real leak the
    // moment the site is an SPA: every route swap adds listeners that are
    // never removed, and each one holds a closure over dom that is already
    // detached.
    // existing call sites ignore the return value and keep working unchanged.
    _listeners: new Map(),
    on(type, fn) {
      let fns = this._listeners.get(type);
      if (!fns) { fns = []; this._listeners.set(type, fns); }
      fns.push(fn);
      return () => this.off(type, fn);
    },
    off(type, fn) {
      const fns = this._listeners.get(type);
      if (!fns) return;
      const i = fns.indexOf(fn);
      if (i >= 0) fns.splice(i, 1);
      // THE KEY GOES TOO once the last listener leaves. otherwise the arrays
      // stay empty but the MAP keeps growing one entry per event type forever,
      // which is the same leak wearing a smaller hat.
      if (fns.length === 0) this._listeners.delete(type);
    },
    once(type, fn) {
      const un = this.on(type, function wrapper(payload) {
        un();
        fn(payload);
      });
      return un;
    },
    emit(type, payload) {
      const fns = this._listeners.get(type);
      if (!fns) return;
      // iterate a SNAPSHOT: once() unsubscribes itself from inside the loop,
      // and a handler is allowed to subscribe another, either of which would
      // otherwise mutate the array being walked. the copy is one tiny array on
      // an event that fires per input, never per frame.
      for (const fn of fns.slice()) fn(payload);
    }
  };

  if (!headless) attachBrowser(world);
  return world;
}

function attachBrowser(world) {
  const raw = { x: -9999, y: -9999, prevX: -9999, prevY: -9999 };

  function measureViewport() {
    world.viewport.w = window.innerWidth;
    world.viewport.h = window.innerHeight;
    world.viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
    world.docSize.w = window.innerWidth;
    world.docSize.h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
  }
  measureViewport();
  world.scroll.y = window.scrollY;

  window.addEventListener("resize", () => {
    measureViewport();
    world.emit("resize", world.viewport);
  });

  window.addEventListener("pointermove", (e) => {
    if (!world.pointer.active) {
      // first event: snap, don't smear velocity from the sentinel position
      raw.prevX = e.clientX;
      raw.prevY = e.clientY;
      world.pointer.active = true;
    }
    raw.x = e.clientX;
    raw.y = e.clientY;
    world.pointer.lastMoveAt = world.time;
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    // ── THE HAND IS WHERE IT PRESSED ─────────────────────────────────────
    // The pointer's position used to come from pointermove alone. A mouse
    // hovers, so by the time it presses the position is already right; a
    // FINGER does not: it arrives out of nowhere, and the first event it sends
    // is this one. So on a phone the press was measured against wherever the
    // LAST touch had been (or the -9999 sentinel, on the first touch of a
    // visit), the brain read that jump as the hand having moved, turned every
    // tap on her into a drag, and the hold spring pulled her toward the old
    // spot. Which is why a tap nudged her and never fired the beam.
    //
    // Snapped here, with prev = now, so the press itself contributes no
    // velocity either (a smear from the previous touch would read as a flick).
    raw.x = raw.prevX = e.clientX;
    raw.y = raw.prevY = e.clientY;
    world.pointer.active = true;
    world.pointer.type = e.pointerType || "mouse";
    world.pointer.client.x = e.clientX;
    world.pointer.client.y = e.clientY;
    world.pointer.pos.x = e.clientX;
    world.pointer.pos.y = e.clientY + window.scrollY;
    world.pointer.vel.x = 0;
    world.pointer.vel.y = 0;
    world.pointer.speed = 0;
    // document coords, same space the body lives in
    world.emit("pointerdown", { x: e.clientX, y: e.clientY + window.scrollY, type: world.pointer.type });
  }, { passive: true });

  window.addEventListener("pointerup", (e) => {
    world.emit("pointerup", { x: e.clientX, y: e.clientY + window.scrollY });
  }, { passive: true });
  // THE BROWSER TOOK THE GESTURE (a touch that became a scroll or a pinch):
  // there is no pointerup coming, and a grab left open would follow a hand
  // that is no longer reported. It lets go -- without the throw or the pet a
  // real release would mean, because nobody released anything.
  window.addEventListener("pointercancel", () => {
    world.emit("pointerup", { x: world.pointer.pos.x, y: world.pointer.pos.y, cancel: true });
  }, { passive: true });
  // a drag that leaves the window still has to let go
  window.addEventListener("blur", () => {
    world.emit("pointerup", { x: world.pointer.pos.x, y: world.pointer.pos.y });
  });

  window.addEventListener("scroll", () => {
    world.scroll.y = window.scrollY;
    world.emit("scrolled");
  }, { passive: true });

  let lastScrollY = window.scrollY;
  let docCheck = 0;

  // ── A NEW SHEET IS A NEW MEASUREMENT ──────────────────────────────────────
  // The router replaces #doc, scrolls to the top and emits `recollect` in ONE
  // synchronous block. `scroll` is an asynchronous event and the document-height
  // check only runs twice a second, so at the instant `recollect` fires:
  //
  //   world.scroll.y   is still however far down the OLD sheet the reader was
  //   world.docSize.h  is still the old sheet's height
  //
  // Anything that places her relative to "the window" in that moment places her
  // relative to a window that no longer exists. That is why she stopped
  // entering from the side after a page swap: the handler asks for a y inside
  // the viewport, gets `oldScroll + a bit`, and puts her hundreds or thousands
  // of pixels down the new sheet — off the bottom of it, so the fly-in comes up
  // from below instead of in from the edge.
  //
  // Subscribed HERE, at construction, so it runs before the brain's and the
  // collider tracker's handlers for the same event: the bus fires in
  // subscription order and createWorld runs before either of them.
  world.on("recollect", () => {
    measureViewport();
    world.scroll.y = window.scrollY;
    // and the jump to the top is not the reader scrolling — left alone, the
    // next tick sees the whole old offset as one frame's delta
    lastScrollY = window.scrollY;
    world.scroll.vel = 0;
  });

  // called once per sim step from the loop so pointer/scroll velocity is
  // smoothed with proper dt regardless of event timing
  world.tick = function (dt) {
    world.time += dt;
    if (world.pointer.active) {
      // velocity from CLIENT deltas: hand motion, not scroll motion
      const vx = (raw.x - raw.prevX) / dt;
      const vy = (raw.y - raw.prevY) / dt;
      raw.prevX = raw.x;
      raw.prevY = raw.y;
      world.pointer.vel.x = expDamp(world.pointer.vel.x, vx, 18, dt);
      world.pointer.vel.y = expDamp(world.pointer.vel.y, vy, 18, dt);
      world.pointer.client.x = raw.x;
      world.pointer.client.y = raw.y;
      world.pointer.pos.x = raw.x;
      world.pointer.pos.y = raw.y + window.scrollY;
      world.pointer.speed = Math.hypot(world.pointer.vel.x, world.pointer.vel.y);
    }
    const sv = (window.scrollY - lastScrollY) / dt;
    lastScrollY = window.scrollY;
    world.scroll.vel = expDamp(world.scroll.vel, sv, 14, dt);

    // document height can change as content loads; check twice a second
    docCheck += dt;
    if (docCheck > 0.5) {
      docCheck = 0;
      const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      if (h !== world.docSize.h) {
        world.docSize.h = h;
        world.emit("docresize");
      }
    }
  };
}
