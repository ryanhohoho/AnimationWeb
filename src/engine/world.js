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
      lastMoveAt: -Infinity
    },
    scroll: { y: 0, vel: 0 },
    colliders: [],          // [{ rect: {x, y, w, h}, el }] in DOCUMENT coords
    collidersVersion: 0,    // bumped on every remeasure so consumers can rebuild
    // written by the pose side each render frame, read by the brain's thrust
    // gating: how much the posed body axis agrees with the intended direction
    poseState: { leanIn: 0 },
    time: 0,
    random: mulberry32(seed),

    // -- event bus -------------------------------------------------------
    _listeners: new Map(),
    on(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(fn);
    },
    emit(type, payload) {
      const fns = this._listeners.get(type);
      if (fns) for (const fn of fns) fn(payload);
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
    // document coords, same space the body lives in
    world.emit("pointerdown", { x: e.clientX, y: e.clientY + window.scrollY });
  }, { passive: true });

  window.addEventListener("pointerup", (e) => {
    world.emit("pointerup", { x: e.clientX, y: e.clientY + window.scrollY });
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
