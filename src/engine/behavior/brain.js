// brain.js
// decision layer: hover / cruise / seek / startle / recover.
// cruise and seek both navigate along pathfinder routes so the character
// weaves around page elements instead of plowing into them. seek fires when
// the cursor is over half a page away (or the character is lost offscreen)
// and brings it back into view.

import { v2, makeNoise1d2, clamp, smoothstep } from "../../utils/math.js";
import { createPathfinder } from "./pathfinder.js";

export function createBrain({ body, world, config, pathConfig, attackConfig }) {
  const cfg = config;
  const atk = attackConfig;
  const nx = makeNoise1d2(Math.floor(world.random() * 1e9));
  const ny = makeNoise1d2(Math.floor(world.random() * 1e9));
  const pathfinder = createPathfinder(world, pathConfig);

  const brain = {
    state: "hover",
    agitation: 0,
    stateTime: 0,
    anchor: v2.make(body.pos.x, body.pos.y),
    interest: v2.make(body.pos.x, body.pos.y),
    nextInterestAt: 0,
    startleUntil: 0,
    offscreenSince: null,
    seekMode: null,       // "cursor" | "offscreen", latched for the whole seek
    flourish: null,       // { heading0, sign, speed, durationS } while looping
    held: null,           // { pending, downX, downY, offX, offY } while grabbed
    beamCooldownUntil: -Infinity,
    gazeHoldUntil: -Infinity,   // headLook freezes the stare until this time
    gazeAt: null,               // { x, y } doc coords the head is FORCED onto,
                                // overriding the cursor
    gazeFront: false,           // ...or square on to the viewport, which is the
                                // panic's first beat. A direction, not a place.
    gazeWhip: false,            // and both of the panic's head moves SNAP
    panic: null,                // { phase, from, esc } while fleeing the press
    moveIntent: v2.make(0, 0),  // unit heading the brain WANTS (doc coords);
                                // bodyPose leans onto it before speed exists
    orbit: { theta: 0, dir: 1, nextFlipAt: 0 },
    onTypeFor: 0,               // how long she has been SITTING on the words.
                                // Only ever ticks while hovering: flying over
                                // them is not sitting on them.
    asideGiveUpUntil: 0,        // ...and nowhere better was found, so stop
                                // looking for a bit
    asideGlanceUntil: 0,        // she is looking at the words she just vacated
    orbitCap: 1e9,              // how wide the lap may be at THIS anchor. Set
                                // with the anchor, not read per frame: it only
                                // changes when the anchor does.

    path: null,          // [{x, y}] doc coords, current route
    pathIndex: 0,
    pathTarget: v2.make(0, 0),
    lastPlanAt: -10,
    // WHERE SHE HAS ALREADY FAILED TO GET TO. Kept for a few seconds so the
    // next destination is a DIFFERENT one — see giveUp().
    blocked: [],
    returnWhenClear: 0,  // a sheet changed mid-flight: finish leaving, then
                         // come back. Closed in step(); see the recollect
                         // handler for why it is not closed at the swap
    enterAt: -Infinity,  // a new sheet holds her outside the frame until this
    entrySide: 0,        // ...and this is the way she comes in when it lifts
    step,
    triggerStartle,
    /** the side entrance, for an engine that boots after the reader has already
        moved (mew.js, `enter`): she was never on this page, so she arrives the
        way she arrives on every new sheet rather than appearing mid-window */
    enterFromSide: () => enterFromSide(),
    panicFrom,
    startlePredicate,
    pathfinder,           // exposed for tests + debugging
    /** the destination sampler, exposed so the margin-crawling check can run
        it a couple of hundred times without stepping the whole simulation */
    _pickInterest: () => pickInterest()
  };

  // THE PRESS IS OPENING. Not a bump and not the cursor: a thing the size of
  // the page, and the only sensible response to it is to leave.
  world.on("crossing", (e) => {
    brain.panicFrom(e && e.from ? e.from : null, 1);
  });

  // ── THE NEW SHEET: SHE COMES IN FROM THE SIDE ────────────────────────────
  // 'recollect' is the page having been swapped, and it fires at the one moment
  // in the whole transition when the window is completely covered — so this
  // teleport is free, and it is the only chance to place her deliberately.
  //
  // The problem it solves: she leaves the old sheet wherever the escape line
  // took her, and the reader then lands at the TOP of the new one. Her document
  // position is untouched by that, so she would wander back in from four
  // hundred pixels down a page nobody has scrolled to yet — appearing out of
  // the middle of the sheet, or not appearing at all.
  //
  // So her vertical position is put inside the viewport the reader is actually
  // looking at, and her horizontal position just outside it. She always enters
  // across a SIDE. Which side is whichever she is nearer, so the entrance
  // continues the way she went rather than contradicting it — and none of this
  // constrains the exit, which is still free to leave over the top.
  world.on("recollect", (e) => {
    // world.js re-measures the viewport and the scroll offset on this same
    // event, and it is subscribed before this one so it has already run. Both
    // are stale at the moment the router fires it — the swap, the scroll to the
    // top and the emit are one synchronous block, and `scroll` is async — and a
    // y measured against the old offset lands her off the bottom of the new
    // sheet, which is what stopped her entering from the side.
    const vp = world.viewport;

    // ── THE DOCUMENT JUMPED UNDER HER, SO SHE COMES WITH IT ──────────────
    // commit() puts the reader at the top of the new sheet and winds the plate
    // on by however far down the old one they were, so the SKY does not step.
    // Her position is in document pixels as well, and nothing was doing the
    // same for her — so on a long sheet she was left thousands of pixels below
    // a page nobody had scrolled to. Same offset, same reason, one line.
    const dy = e && e.scrolledBy ? e.scrolledBy : 0;
    if (dy) {
      body.pos.y -= dy;
      body.prevPos.y -= dy;
    }

    // a different page: anything the old one taught her about getting around is
    // void, whichever branch below runs
    brain.path = null;
    brain.blocked.length = 0;

    // ── A TELEPORT IS ONLY FREE WHILE NOBODY CAN SEE IT ─────────────────
    // The paragraph above this handler says the swap is "the one moment in the
    // whole transition when the window is completely covered", and for a
    // CROSSING that is nearly true — except she is drawn at z30, above the
    // spreading print at z20, so she is the one thing on the page that is NOT
    // covered by it. For a page TURN it is not true at all: a fade dissolves
    // the type and leaves the sheet in full view, so the teleport happened in
    // the open. She vanished from where she was standing and flew back in from
    // the edge, on every arrow key.
    //
    // So the test is not which kind of transition it was. It is whether she can
    // be seen.
    const r = body.radius || 0;
    const top = world.scroll.y;
    const onScreen = body.pos.x > -r && body.pos.x < vp.w + r
      && body.pos.y > top - r && body.pos.y < top + vp.h + r;

    if (onScreen && world.panicking) {
      // ── SHE IS MID-EXIT, AND THE EXIT IS THE POINT ───────────────────
      // The fright used to be cleared here, and that was wrong in a way that
      // took a report to see: the crossing swaps at 0.800 s and she does not
      // leave the ground until 0.66 s (a 0.50 s braked double-take, then a
      // 0.16 s whip), so at the swap she is about 140 ms and 177 px into her
      // bolt. Ending it there stops the thrust dead and she decelerates in
      // full view — "it just starts to fly away but then stops when the new
      // page loads in".
      //
      // The press is gone, but the flight is not finished. So the fright ends
      // when she is OUT OF SIGHT rather than when the page changes: the latch
      // below is closed in step() on the frame she clears the window, and she
      // comes straight back in from the side.
      //
      // This is not a return to the nine seconds. That was never the flight —
      // it was 1.1 s of thrust AFTER she was already gone, a 1.2 s coast, an
      // anchor holding her outside and a 4 s grace, and all four of those
      // stay fixed.
      brain.returnWhenClear = world.time + cfg.exitCapS;
      return;
    }

    // whatever she was running from is on a sheet that does not exist
    endFright();

    if (onScreen) {
      // a page TURN, which covers nothing: she is left exactly where she is and
      // carries on. She must not be left waiting in the wings while standing in
      // the middle of the page — enterAt freezes her until it lifts.
      brain.enterAt = -Infinity;
      brain.entrySide = 0;
      // the sheet under the anchor is a different sheet now, so what the lap
      // may be there is a different number
      sizeTheLap();
      return;
    }

    // off screen already: the placement is free, so she gets the entrance
    enterFromSide();
  });

  /** the fright, ended. Called on the frame the page changes if she was not
      flying, and otherwise on the frame she goes out of sight. */
  function endFright() {
    brain.panic = null;
    brain.gazeAt = null;
    brain.gazeFront = false;
    brain.gazeWhip = false;
    world.panicking = false;
    brain.startleUntil = 0;
    brain.returnWhenClear = 0;
    if (brain.state === "startle") { brain.state = "hover"; brain.stateTime = 0; }
  }

  /** Put her just outside the nearer side, level with the window the reader is
      actually looking at, and let her fly in after a beat. Only ever called
      while she is off screen, because a teleport is only free while nobody can
      see it. */
  function enterFromSide() {
    const vp = world.viewport;
    const side = body.pos.x < vp.w * 0.5 ? -1 : 1;
    body.pos.x = side < 0 ? -cfg.entryOffsetPx : vp.w + cfg.entryOffsetPx;
    body.pos.y = world.scroll.y + vp.h * (0.3 + world.random() * 0.4);
    // SHE DOES NOT RIDE IN ON THE SAME FRAME THE PAPER OPENS. A beat of empty
    // sheet first, and then she arrives — the entrance needs somewhere to
    // arrive INTO. She waits out there at a standstill; the kick is applied
    // when the wait lifts, in step().
    brain.enterAt = world.time + cfg.entryDelayS;
    brain.entrySide = side;
    body.vel.x = 0;
    body.vel.y = 0;
    // A TELEPORT IS NOT A MOVE. The render loop interpolates prevPos -> pos, so
    // leaving prevPos where she was draws one frame of her halfway between the
    // old sheet's position and the new one — a streak across the page on the
    // first frame of every arrival.
    v2.copy(body.prevPos, body.pos);
    brain.state = "seek";
    brain.seekMode = "offscreen";  // ...which aims at the middle of the window
    brain.stateTime = 0;
    brain.offscreenSince = null;
  }

  /** is no part of her inside the window? Published on the world every step so
      the router can hold the paper open until she is gone — see step(). */
  function clearOfWindow() {
    const vp = world.viewport, r = body.radius, sy = world.scroll.y;
    return body.pos.x + r < 0 || body.pos.x - r > vp.w
        || body.pos.y + r < sy || body.pos.y - r > sy + vp.h;
  }

  world.on("bump", (e) => {
    if (e.speed > cfg.startleBumpSpeed) {
      triggerStartle({ x: e.normal.x, y: e.normal.y }, 0.8, "wall");
    } else {
      brain.agitation = clamp(brain.agitation + e.speed / 2500, 0, 1);
    }
    // a bump means the current route failed; replan next step
    brain.path = null;
  });

  // petting: a clean click (press without dragging) starts the hyper beam
  // charge. no bounce, no startle -- it plants itself and powers up
  function tryPet() {
    if (!atk) return;
    if (brain.state === "charge" || brain.state === "fire") return;
    if (world.time < brain.beamCooldownUntil) return;
    brain.state = "charge";
    brain.stateTime = 0;
    brain.path = null;
    brain.flourish = null;
    world.emit("beamCharge", {});
  }
  world.on("pet", tryPet);

  // grab & fling: press on mew and drag to carry it around; release throws
  // it with the hand's velocity. a press that never moves resolves to a pet
  world.on("mewdown", (e) => {
    if (brain.state === "charge" || brain.state === "fire") return;
    // THE PAGE HAS TO KNOW, and it has to know NOW rather than at the next sim
    // step: world.js emits `pointerdown` from a window listener it registered
    // at construction, so this whole chain runs before the router's own
    // listener for the same event — which is exactly where the swipe decides
    // whether to start watching. A step later is a step too late.
    world.grabbing = true;
    brain.state = "held";
    brain.stateTime = 0;
    brain.path = null;
    brain.flourish = null;
    brain.held = {
      pending: true,
      downX: e.point.x,
      downY: e.point.y,
      offX: body.pos.x - e.point.x,
      offY: body.pos.y - e.point.y
    };
  });

  world.on("pointerup", () => {
    world.grabbing = false;
    if (brain.state !== "held") return;
    const h = brain.held;
    brain.held = null;
    if (h.pending) {
      // never dragged: it was a pet
      brain.state = "hover";
      brain.stateTime = 0;
      settle();
      tryPet();
      return;
    }
    // throw: hand velocity becomes mew velocity
    const f = cfg.fling;
    const fv = v2.clampLen(v2.make(),
      v2.scale(v2.make(), world.pointer.vel, f.flingGain), f.flingMaxPx);
    v2.copy(body.vel, fv);
    brain.agitation = clamp(brain.agitation + 0.3, 0, 1);
    brain.state = "flung";
    brain.stateTime = 0;
  });

  world.on("docresize", () => { brain.path = null; });

  function startlePredicate(pointer, charPos) {
    if (!pointer.active) return false;
    if (pointer.speed < cfg.startleCursorSpeed) return false;
    const toChar = v2.sub(v2.make(), charPos, pointer.pos);
    const dist = v2.len(toChar);
    if (dist > cfg.startleDistance) return false;
    const closing = v2.dot(pointer.vel, v2.norm(v2.make(), toChar));
    return closing > cfg.startleClosingSpeed;
  }

  /**
   * @param source WHAT STARTLED HER, and it is on the event because the answer
   *   changes what she does about it. A cursor that runs into her is a rude
   *   thing she can be cross with: the >.< face and a shower of gold. A wall she
   *   clipped, or a press eating the page out from under her, is not something
   *   to be cross AT -- that gets the sweat. Same three-beat body language
   *   either way; the difference is entirely in the face.
   */
  function triggerStartle(awayDir, intensity, source = "cursor") {
    if (brain.state === "startle") return;
    brain.state = "startle";
    brain.stateTime = 0;
    brain.path = null;
    brain.agitation = clamp(brain.agitation + intensity, 0, 1);
    brain.startleUntil = cfg.startleDurMinS + world.random() * (cfg.startleDurMaxS - cfg.startleDurMinS);
    const lateral = world.random() < 0.5 ? -1 : 1;
    const esc = v2.norm(v2.make(), v2.make(
      awayDir.x * 0.75 - awayDir.y * 0.25 * lateral,
      awayDir.y * 0.75 + awayDir.x * 0.25 * lateral
    ));
    body.addImpulse(v2.scale(v2.make(), esc, cfg.startleImpulse * (0.6 + 0.4 * intensity)));
    world.emit("startle", { dir: esc, intensity, source });
  }

  // ------------------------------------------------------------------
  // PANIC: the press is opening and she is not staying to watch.
  //
  // THREE BEATS, and the order is the whole performance. An animal that has
  // seen something does not leave in the same instant — it LOOKS, and the look
  // is what tells you it saw. Then it turns its head to where it is going,
  // which is what tells you it decided. Then it goes.
  //
  //   1. GLANCE    the head WHIPS SQUARE ON TO THE VIEWPORT and she stops dead.
  //   2. TURN      the head whips off it and onto the escape line.
  //   3. BOLT      the impulse lands on that beat, not before, and the limbs
  //                windmill the whole way out.
  //
  // WHY THE GLANCE KEPT NOT READING, twice. First it was too short. Then it was
  // long enough and STILL invisible, and the reason was that it was aimed at a
  // place: the look plane is six world units out, so an opening a few hundred
  // pixels away subtends almost nothing and the whole "glance" was two degrees.
  //
  // It is a DIRECTION now — square on to the viewport, perpendicular to it,
  // which is the largest head pose the rig has and cannot be mistaken for
  // anything else. She holds it for half a second. And she is BRAKED to a stop
  // for the whole of it: a head turning on a drifting body is a glance, a head
  // turning on a body that has stopped is a double-take. The stillness buys the
  // beat the time to be seen, and it is what an animal does anyway — everything
  // stops for the instant it takes to understand what it is looking at.
  //
  // Beat two stays short, because a head that turns AWAY slowly reads as
  // reluctance and this is fright.
  //
  // AND IT LEAVES BY THE SHORTEST LINE, not by a random side. triggerStartle
  // deliberately mixes a lateral component into its escape so a cursor-shy
  // animal scatters unpredictably; here the direction is not a matter of taste.
  // The press is coming out of one specific place and the way out is directly
  // opposite it.
  //
  // @param from   where the opening is, in DOC coords. Pass null when the press
  //               is closing in from every edge instead — then the way out is
  //               the middle, which is the same rule applied to a rim.
  function panicFrom(from, intensity = 1) {
    const vp = world.viewport;
    // ── ONE RULE: AWAY FROM WHATEVER IT IS ───────────────────────────────
    // ...and with no origin given, the middle of the screen is what she is
    // getting away from. This used to invert for that case — a rim closing in
    // has no one place it comes from, so the reasoning went, the far side of
    // the room is its middle and she should run INWARD. It reads wrong and it
    // is wrong.
    //
    // Wrong to look at: a return is the only transition where she was sent
    // ACROSS the reader's view. She rests off the type, which on these sheets
    // means near a margin, so "run at the centre" is a diagonal over the whole
    // window — while the identical press one card earlier (summary out to
    // experience, which has a real origin) sends her out by the nearest edge.
    // Same gesture, opposite reading, and the odd one out was the one with no
    // origin to point at.
    //
    // And wrong on the clock, which is the part that settles it: she has about
    // 0.28 s of flight before the sheet swaps and she has to be gone. Outward
    // from wherever she is standing is the SHORTEST way off the page by
    // construction; inward is the longest, because she has to cross the room
    // before she can start leaving it.
    const src = from || { x: vp.w * 0.5, y: world.scroll.y + vp.h * 0.5 };
    const ax = body.pos.x - src.x;
    const ay = body.pos.y - src.y;
    const len = Math.hypot(ax, ay);
    // dead centre of the opening is the one case with no "away" — break the tie
    // upward, which is where a startled thing goes anyway
    const esc = len > 1 ? { x: ax / len, y: ay / len } : { x: 0, y: -1 };

    brain.state = "startle";
    brain.stateTime = 0;
    brain.path = null;
    brain.agitation = clamp(brain.agitation + intensity, 0, 1);
    brain.startleUntil = cfg.panicDurS;
    brain.panic = { phase: "glance", esc };
    // square on to the viewport, and snapped there
    brain.gazeAt = null;
    brain.gazeFront = true;
    brain.gazeWhip = true;
    world.panicking = true;
    world.emit("startle", { dir: esc, intensity, panic: true, source: "press" });
  }

  // ------------------------------------------------------------------
  // seek entry: cursor far away, or character lost offscreen. the chosen
  // goal provider is LATCHED for the whole seek so the two goals can never
  // fight each other mid-flight (that flip-flop freezes the character).
  // ------------------------------------------------------------------
  function seekEntry() {
    const vp = world.viewport;
    const p = world.pointer;
    if (p.active) {
      const dist = Math.hypot(p.pos.x - body.pos.x, p.pos.y - body.pos.y);
      const trigger = cfg.seekTriggerFactor * Math.max(vp.w, vp.h);
      if (dist > trigger) return "cursor";
    }
    // ── LOST SIDEWAYS COUNTS TOO ─────────────────────────────────────────
    // This was a vertical test only, which was safe while the edge leash held
    // her within 240 px of the rim. It does not any more — the sides are a long
    // leash now precisely so she can round things through the outside — so
    // being far off to one side has to be a way of being lost as well, or the
    // one force that used to fetch her back is gone and nothing replaces it.
    // `offscreenReturnS` is 4 seconds, so a transit around the outside is well
    // within the grace and only genuinely sitting out there trips it.
    const sy = world.scroll.y;
    const off = body.pos.y < sy - 40 || body.pos.y > sy + vp.h + 40
      || body.pos.x < -cfg.offscreenSidePx || body.pos.x > vp.w + cfg.offscreenSidePx;
    if (off) {
      if (brain.offscreenSince === null) brain.offscreenSince = world.time;
      if (world.time - brain.offscreenSince > cfg.offscreenReturnS) return "offscreen";
    } else {
      brain.offscreenSince = null;
    }
    return null;
  }

  // live goal for the latched mode
  function seekGoal(mode) {
    const vp = world.viewport;
    if (mode === "cursor" && world.pointer.active) {
      // ...AND THE CURSOR IS USUALLY INSIDE SOMETHING. The reader's pointer sits
      // on the terminal, the title, the window. Sanitising this HERE rather than
      // only where she steers matters: `seekDone` measures against this goal, so
      // a raw goal buried in a 700 px element is a distance she can never close
      // and the seek never ends — she hangs at the boundary at sprint speed
      // instead of arriving and settling. Aim and arrival have to be the same
      // point or one of them is a lie.
      return pathfinder.nearestOpenPoint(
        { x: world.pointer.pos.x, y: world.pointer.pos.y - cfg.seekHoverAbovePx },
        body.radius);
    }
    // offscreen return (also the fallback if the pointer vanished): the
    // middle of whatever the user is currently looking at
    return { x: vp.w * 0.5, y: world.scroll.y + vp.h * 0.45 };
  }

  function seekDone(mode) {
    if (mode === "cursor" && world.pointer.active) {
      const g = seekGoal(mode);
      return Math.hypot(g.x - body.pos.x, g.y - body.pos.y) < cfg.seekStopPx;
    }
    // offscreen mode: done when comfortably back inside the window — BOTH ways.
    // On y alone this was satisfied the instant a new sheet placed her at the
    // side with her height already in the band, so the fly-in ended before it
    // started and she hovered off the edge instead of coming in.
    const sy = world.scroll.y;
    const vp = world.viewport;
    return body.pos.y > sy + 120 && body.pos.y < sy + vp.h - 120
      && body.pos.x > 120 && body.pos.x < vp.w - 120;
  }

  // ------------------------------------------------------------------
  // path following: replan when stale, steer at the furthest visible waypoint
  // ------------------------------------------------------------------
  function followPath(rawTarget, speed, dt) {
    // ── NEVER STEER AT SOMEWHERE SHE CANNOT BE ───────────────────────────
    // A* has always ended at the nearest open cell, so the planned route was
    // fine; the two branches that DO NOT plan — the barge and the no-route
    // fallback — flew at the raw target, and the cursor is very often inside a
    // paragraph, a title, or the terminal. She would fly in and hold there.
    //
    // The escape now out-pushes the steer (physics.insideAccel), so she can no
    // longer be pinned by it, but being ejected from something you are still
    // being aimed at is a shove, not navigation. Aim at the nearest place she
    // may actually be and the two stop arguing at all.
    // ...AND "SOMEWHERE SHE CANNOT BE" INCLUDES THE OTHER SIDE OF THE LEASH.
    // The sideways leash holds her BODY on the page — the line sits one radius
    // in (physics.edgeSlackXPx is 0) — so a destination nearer the rim than
    // that is one she can never arrive at. It used to be unreachable in theory
    // only, because with an empty grid every cell was open and the nearest open
    // cell was the target itself. Now that the type is in the grid, a sheet
    // with little open space leaves slivers of it against the rims, and
    // nearestOpenPoint hands one back: she pushes into the leash for the whole
    // cruise, times out, gives up, picks again, and resolves to the same
    // sliver. Pinned to the edge of the paper, for good.
    const target = pathfinder.nearestOpenPoint(rawTarget, body.radius, {
      min: body.radius,
      max: Math.max(body.radius, world.docSize.w - body.radius)
    });

    const needPlan =
      !brain.path ||
      world.time - brain.lastPlanAt > pathConfig.replanMaxS ||
      Math.hypot(target.x - brain.pathTarget.x, target.y - brain.pathTarget.y) > pathConfig.targetMoveReplanPx;

    if (needPlan && world.time - brain.lastPlanAt > pathConfig.replanMinS) {
      brain.path = pathfinder.findPath(body.pos, target, body.radius);
      brain.pathIndex = 0;
      v2.copy(brain.pathTarget, target);
      brain.lastPlanAt = world.time;
    }
    if (!brain.path || brain.path.length === 0) {
      // No route, or none yet — the replan gate holds her here for up to
      // `replanMinS` after a barge drops the old one. Fall back to a direct
      // arrive-seek, and keep COUNTING: having no plan while going nowhere is
      // the most stuck she ever is, and this branch used to be the one place
      // the wedge bookkeeping did not run, so a stall that landed in it stalled
      // forever.
      steerArrive(target, speed, dt);
      return Math.hypot(target.x - body.pos.x, target.y - body.pos.y);
    }

    // ── THE CURSOR MOVES ON WHEN SHE REACHES A NODE ──────────────────────
    // This used to advance ONLY by line of sight, and line of sight is defined
    // as "through cells at most `losMaxCost`" — which is the whole point of it,
    // because a shortcut that cuts a corner through a paragraph is not a
    // shortcut. But it made sight the only way forward, and inside expensive
    // terrain there is never any sight: every node of a route that crosses a
    // block of type fails the test, so the cursor froze on the last node before
    // the type and she sat on it, at zero speed, being steered at a point she
    // was already standing on. That is the thing on the USB sheet — parked
    // against the left edge of the terminal, which is exactly where the last
    // cheap node of a route through it is.
    //
    // So: reaching a node advances past it, unconditionally. Sight is what it
    // always was — an optimisation that skips AHEAD when the way is clear — and
    // no longer the only thing that can move her along a route she is already
    // committed to.
    while (
      brain.pathIndex < brain.path.length - 1 &&
      Math.hypot(brain.path[brain.pathIndex].x - body.pos.x,
                 brain.path[brain.pathIndex].y - body.pos.y) < pathConfig.reachedPx
    ) {
      brain.pathIndex++;
    }
    while (
      brain.pathIndex < brain.path.length - 1 &&
      pathfinder.losPoints(body.pos, brain.path[brain.pathIndex + 1], body.radius)
    ) {
      brain.pathIndex++;
    }
    const wp = brain.path[brain.pathIndex];
    const last = brain.pathIndex === brain.path.length - 1;
    steerArrive(wp, speed, dt, last);
    return Math.hypot(target.x - body.pos.x, target.y - body.pos.y);
  }

  const tmpF = v2.make();

  // ── SHE PUSHES HARDER THE LONGER IT IS TAKING ────────────────────────────
  // This replaces a grinding DETECTOR — "she has been under 40 px/s for 0.45 s,
  // therefore switch the avoidance off for 1.2 s" — and it is a better thing on
  // its own terms, not only a tidier one.
  //
  // A detector has to decide, from the outside, that something has gone wrong.
  // It can be wrong in both directions: it fires on a legitimate slow arrival,
  // and it misses a slow grind that never quite drops below the threshold. And
  // whatever it does next is a mode — she is barging or she is not — so there
  // is a seam in the motion at each end of it.
  //
  // A force that grows with time has no threshold, no mode and no seam. It is
  // measured from the moment the destination was ASSIGNED (which is exactly what
  // `stateTime` already is for a travel state), so it is a statement about the
  // TRIP rather than about any instant of it: three seconds of grace where
  // nothing changes at all, then she leans on it harder and harder until she is
  // through. Nothing can hold her indefinitely, because nothing on this page
  // pushes back with a force that grows.
  //
  // And it costs nothing when it is not needed, which is the part that makes it
  // safe to leave on: `steerArrive` asks for a SPEED, so the force is
  // proportional to how far she is from having it. In open air she reaches the
  // speed and the error goes to zero, so a ceiling three times higher changes
  // nothing whatsoever. It only ever shows up against something that is
  // resisting her.
  //
  // WHY IT IS NEEDED AT ALL, given the escape was just raised above the steer:
  // those two facts are the same fact. An escape that always beats the steer
  // means she can never be HELD inside type — and it also means she can never
  // CROSS a block wider than she can coast over, because she is ejected
  // sideways faster than she can be driven forward. The USB sheet's terminal is
  // ~860 px wide and taller than the window, sitting 48 px off the left rim
  // (`--pad`), so the crack beside it does not fit her and crossing it was not
  // possible either. The ramp is what makes both true at once: the escape wins
  // early, and she wins in the end.
  function pushMul() {
    const p = cfg.push;
    const t = (brain.stateTime - p.delayS) / Math.max(1e-3, p.rampS);
    if (t <= 0) return 1;
    const e = Math.min(1, t);
    return 1 + (p.maxMul - 1) * e * e;      // slow off the mark, then decisive
  }

  // ── SHE HOVERS SOMEWHERE SHE MAY BE ──────────────────────────────────────
  // Every settle in this file is "stop here and hover", and any of them can
  // stop inside a paragraph: a fling that ended in one, a beam fired from
  // inside one, a cruise that timed out mid-page, a pet released over the
  // terminal. The hover spring then holds her there for as long as she hovers,
  // arguing with the escape field the whole time — which reads as a creature
  // pressed into the type and pushing at it, and needs something to happen to
  // her before it stops. The anchor is a PLACE, so it has to be a real one.
  //
  // ── AND THE ANCHOR IS INSIDE THE WINDOW, ALWAYS ─────────────────────────
  // This used to say "off the page is left alone: the grid runs 500 px past the
  // rim and those cells are open, so being outside is not a thing that needs
  // correcting." The grid does not run past the rim any more -- path.outsideXPx
  // and outsideYPx are both 0 -- and nearestOpenPoint hands an off-page point
  // straight back, so hover orbited an anchor nobody could see and held her
  // there for the whole four-second grace.
  //
  // That is the "sometimes she hovers just outside the window" report, and it
  // is most of why coming back took so long. Clamping the anchor into the
  // visible band makes the hover orbit fetch her by itself: no new state, no
  // new mode, and it uses a force that is already running every frame.
  /** how much room an anchor needs so the whole ORBIT clears the type */
  function seatRoom() {
    return body.radius + cfg.hover.orbitRadiusPx * cfg.aside.roomFactor;
  }

  /** ...AND IF THE SEAT COULD NOT GIVE THAT MUCH, THE LAP GIVES WAY INSTEAD.
      Sized with the anchor rather than read per frame: it only changes when
      the anchor does, and the hover path is not a place to ask the grid
      anything sixty times a second. */
  function sizeTheLap() {
    const room = pathfinder.clearanceAt(brain.anchor, body.radius) - body.radius;
    brain.orbitCap = clamp(room, cfg.hover.orbitMinPx, cfg.hover.orbitRadiusPx);
  }

  function settle() {
    const vp = world.viewport, m = cfg.margin, sy = world.scroll.y;
    // ROOMY, NOT MERELY OPEN. `nearestOpenPoint` asks that a cell be cheap,
    // which on the placement grid means "not type" — and that is satisfied by a
    // gap she overhangs. The trip she just took ends here, so this is the
    // decision that makes her final position land off the words rather than
    // near them; the half-second notice below is the safety net for everything
    // that moves under her afterwards, not the mechanism.
    v2.copy(brain.anchor, pathfinder.nearestRoomyPoint(body.pos, body.radius, seatRoom()));
    brain.anchor.x = clamp(brain.anchor.x, m, Math.max(m, vp.w - m));
    brain.anchor.y = clamp(brain.anchor.y, sy + m, sy + Math.max(m, vp.h - m));
    sizeTheLap();
  }

  function steerArrive(point, speed, dt, arrive = true) {
    const to = v2.sub(v2.make(), point, body.pos);
    const dist = v2.len(to);
    const dir = v2.norm(v2.make(), to);
    v2.copy(brain.moveIntent, dir);
    const speedTarget = arrive ? speed * smoothstep(20, cfg.arriveRadius, dist) : speed;
    const desired = v2.scale(v2.make(), dir, speedTarget);
    // anime acceleration: weak thrust until the body has visibly leaned onto
    // the travel line (poseState.leanIn comes from the actual posed axis),
    // then the throttle opens hard and keeps pulling to top speed
    const lt = cfg.leanThrust;
    const lean = world.poseState ? world.poseState.leanIn : 1;
    const leanMul = lt.minMul + (lt.maxMul - lt.minMul) * smoothstep(lt.leanLo, lt.leanHi, lean);
    // ...AND THE RAMP IS NOT SUBJECT TO IT. The lean gate exists so she has to
    // turn onto a line before the throttle opens, and it is measured off the
    // POSED body axis — which follows travel. A body that is not travelling
    // never leans in, so a stalled Mew sits at `minMul`, a third of normal
    // thrust, which is the exact opposite of what being stuck calls for and is
    // self-reinforcing: too weak to move, so never leaning, so still too weak.
    // The ramp therefore blends the gate out as it comes on, and by full push
    // she is at the burst figure times the multiplier regardless of pose.
    const push = pushMul();
    const k = (push - 1) / Math.max(1e-3, cfg.push.maxMul - 1);     // 0 -> 1
    const mul = (leanMul + (lt.maxMul - leanMul) * k) * push;
    const steer = v2.set(tmpF,
      (desired.x - body.vel.x) * cfg.steerGain * mul,
      (desired.y - body.vel.y) * cfg.steerGain * mul);
    body.addForce(v2.clampLen(steer, steer, cfg.steerMaxForce * mul));
  }

  // Avoidance used to live here and run only while travelling. It is now part
  // of the physics pass (physics/colliders.js: avoidColliders), so it applies
  // in every state — including hovering, which is when she is most likely to
  // drift into a paragraph and just sit in it.

  // WHERE SHE DECIDES TO GO NEXT.
  //
  // This is the one place the whole avoidance scheme can go wrong. Everything
  // else pushes her AWAY from type, and on a page that is mostly type the
  // furthest thing from all of it is the margin — so the obvious version of
  // this sampler sends her to the edge of the sheet every time and she ends up
  // patrolling the border. The fix is not in the physics, it is here: openness
  // is one term among several, and sitting near an edge is explicitly a COST.
  /** abandon a destination she cannot reach, and remember it for a while */
  function giveUp(target) {
    brain.path = null;
    brain.blocked.push({ x: target.x, y: target.y, until: world.time + cfg.blockedForS });
    // keep the list short: only the last few failures are interesting
    while (brain.blocked.length > cfg.blockedMax) brain.blocked.shift();
    // and go and want something else. Hover re-picks on its own schedule; a
    // cruise has to be told, or it will simply keep walking at the same spot.
    if (brain.state === "cruise" || brain.state === "hover") {
      const next = pickInterest();
      if (next) v2.copy(brain.interest, next);
      brain.nextInterestAt = world.time
        + cfg.interestMinS + world.random() * (cfg.interestMaxS - cfg.interestMinS);
      brain.state = "cruise";
      brain.stateTime = 0;
    }
    // A SEEK NEVER GETS HERE. The cursor is not a place she may decline to go,
    // and it no longer needs a sideways shove to unstick it either — a seek that
    // is taking a while is simply pushing harder by then (pushMul).
  }

  /** how recently she failed to reach somewhere near here, 0..1 */
  function blockedNear(p) {
    let worst = 0;
    for (const b of brain.blocked) {
      if (b.until < world.time) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < cfg.blockedRadiusPx) {
        worst = Math.max(worst, 1 - d / cfg.blockedRadiusPx);
      }
    }
    return worst;
  }

  function pickInterest() {
    const vp = world.viewport;
    const m = cfg.margin;
    // sample inside the currently visible band so it stays with the user
    const y0 = world.scroll.y + m;
    const y1 = Math.min(world.scroll.y + vp.h, world.docSize.h) - m;
    const cx = vp.w * 0.5;
    const cy = world.scroll.y + vp.h * 0.5;
    let best = null;
    let bestScore = -Infinity;
    // ...AND A SECOND-BEST, for a sheet where nothing at all is cheap enough.
    // Before there was type in the grid every sample passed and this never
    // mattered; now a dense page can reject all thirty, and returning null
    // stops her CHOOSING anywhere — she hovers on the spot until the layout
    // changes. The least bad sample is a destination; nothing is not.
    let fallback = null, fallbackCost = Infinity;

    for (let i = 0; i < 30; i++) {
      const p = v2.make(m + world.random() * (vp.w - 2 * m), y0 + world.random() * Math.max(y1 - y0, 1));
      const c = pathfinder.costPoint(p, body.radius);
      if (c > cfg.interest.maxCost) {
        if (c < fallbackCost) { fallbackCost = c; fallback = p; }
        continue;
      }

      // a trip worth taking: neither next door nor across the document
      const d = v2.len(v2.sub(v2.make(), p, body.pos));
      let score = -Math.abs(d - cfg.interest.idealTripPx) * cfg.interest.tripWeight;

      // open space is nicer than a gap between two paragraphs, but only mildly
      score -= (c - 1) * cfg.interest.costWeight;

      // ...and the middle of the sheet is nicer than the rim of it. Without
      // this term she converges on the margins, because that is where the
      // emptiness is.
      const edge = Math.min(p.x, vp.w - p.x, p.y - world.scroll.y, world.scroll.y + vp.h - p.y);
      score -= Math.max(0, cfg.interest.edgeComfortPx - edge) * cfg.interest.edgeWeight;

      // gentle pull toward the centre of what the reader is looking at, so
      // she stays company rather than scenery
      score -= Math.hypot(p.x - cx, p.y - cy) * cfg.interest.centreWeight;

      // AND NOT WHERE SHE JUST FAILED. Heavily weighted rather than a hard
      // veto: if the only open space left is near a spot she gave up on, going
      // back is still better than standing still.
      score -= blockedNear(p) * cfg.interest.blockedWeight;

      score += world.random() * cfg.interest.jitter;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best || fallback;
  }

  function scheduleNextInterest() {
    brain.nextInterestAt = world.time + cfg.interestMinS + world.random() * (cfg.interestMaxS - cfg.interestMinS);
  }
  scheduleNextInterest();

  function maybeFlourish(chance) {
    const speed = Math.hypot(body.vel.x, body.vel.y);
    if (speed < cfg.flourish.minSpeed) return false;
    if (world.random() >= chance) return false;
    // accelerate INTO the loop and size the circle from the entry speed:
    // faster arrivals make crisper, bigger loops. duration follows from
    // geometry so it always reads as flying a circle
    const loopSpeed = Math.max(speed * cfg.flourish.speedMul, cfg.flourish.speed);
    const radius = clamp(loopSpeed * 0.165, cfg.flourish.radiusPx * 0.85, cfg.flourish.maxRadiusPx);
    brain.state = "flourish";
    brain.stateTime = 0;
    brain.path = null;
    brain.flourish = {
      heading0: Math.atan2(body.vel.y, body.vel.x),
      sign: world.random() < 0.5 ? -1 : 1,
      speed: loopSpeed,
      durationS: (2 * Math.PI * radius) / loopSpeed
    };
    return true;
  }

  function step(dt) {
    // ── HOW THE PAPER KNOWS TO WAIT ──────────────────────────────────────
    // The crossing may not swap the sheet before she has left the frame, or the
    // reader watches her stop existing. It is a property of HER, so it is
    // published here rather than asked for: the router reads `!== false`, so a
    // page whose engine never booted — a reduced-motion reader, a machine with
    // no WebGL, a chunk that failed — never waits for an animal it does not
    // have.
    world.mewClear = clearOfWindow();

    // ── AND THE EXIT IS FINISHED THE MOMENT SHE IS OUT OF SIGHT ──────────
    // Armed by `recollect` when the sheet changed while she was still flying.
    // The cap is the backstop: thrown into a corner, or an odd viewport, and
    // she is fetched back anyway rather than left out there.
    if (brain.returnWhenClear
        && (world.mewClear || world.time > brain.returnWhenClear)) {
      endFright();
      enterFromSide();
    }

    // The glance back at the words is the only gaze this file sets outside a
    // panic, so it is also the only one that has to put itself away. Never over
    // a panic's: that one owns the head for the whole flight and is cleared
    // with the flight.
    if (brain.asideGlanceUntil && world.time > brain.asideGlanceUntil) {
      brain.asideGlanceUntil = 0;
      if (!brain.panic) brain.gazeAt = null;
    }

    // ANY exit from the startle state clears the flag, not just the tidy one.
    // She can be grabbed mid-flight, and if that stole the state while
    // `panicking` was still set, every hard bump for the rest of the session
    // would silently skip its flail.
    // ...and the same for the hand. She can be startled out of a grab, or the
    // page can swap under one, and a flag that outlives its state is the bug
    // `panicking` already has a paragraph about.
    if (world.grabbing && brain.state !== "held") world.grabbing = false;

    if (world.panicking && (brain.state !== "startle" || !brain.panic)) {
      world.panicking = false;
      brain.gazeAt = null;
      brain.gazeFront = false;
      brain.gazeWhip = false;
    }
    // ── WAITING IN THE WINGS ─────────────────────────────────────────────
    // Between the page swap and her entrance. She is parked outside the frame,
    // so the sideways leash has to let go of her for it — same exemption a
    // startled exit uses, and for the same reason: being off the page is the
    // point rather than a failure. Nothing steers her and `stateTime` does not
    // run, so the seek she is about to start begins from zero.
    world.offLeash = world.panicking || world.time < brain.enterAt;
    if (world.time < brain.enterAt) {
      v2.set(brain.moveIntent, 0, 0);
      const still = 1 / (1 + 6 * dt);
      body.vel.x *= still;
      body.vel.y *= still;
      return;
    }
    if (brain.entrySide) {
      body.vel.x = -brain.entrySide * cfg.entrySpeed;
      body.vel.y = 0;
      brain.entrySide = 0;
    }

    brain.stateTime += dt;
    brain.agitation *= Math.exp(-dt / cfg.agitationTau);
    v2.set(brain.moveIntent, 0, 0); // travel states re-assert it every step

    const busy = brain.state === "startle" || brain.state === "charge" ||
      brain.state === "fire" || brain.state === "flourish" ||
      brain.state === "held" || brain.state === "flung";
    // ── A CURSOR ONLY SHOOS HER OFF THE WORDS (2026-10-04, by instruction) ──
    // A fast pointer used to send her flying wherever she was. Now it only
    // does when she is sitting ON type -- the same test the aside uses (her
    // circle overlapping a soft rect: clearance under her own radius) -- which
    // gives the gesture a meaning: the reader is brushing her off what they
    // are trying to read. In open paper she ignores it; her head already
    // follows the cursor, which is all the reaction open paper needs.
    if (!busy && startlePredicate(world.pointer, body.pos)
        && pathfinder.clearanceAt(body.pos, body.radius) < body.radius) {
      const away = v2.norm(v2.make(), v2.sub(v2.make(), body.pos, world.pointer.pos));
      triggerStartle(away, 1.0);
    }

    // seek preempts hover/cruise (never an active startle)
    if (brain.state === "hover" || brain.state === "cruise") {
      const mode = seekEntry();
      if (mode) {
        brain.state = "seek";
        brain.seekMode = mode;
        brain.stateTime = 0;
        brain.path = null;
      }
    }

    switch (brain.state) {
      case "hover": {
        // buoyant idle: follow a slowly evolving ORBIT around the anchor --
        // circular trails with wandering radius/speed and a small epicycle,
        // occasionally reversing direction. the controller is near-critical,
        // so all the character comes from the round path itself
        const h = cfg.hover;
        const o = brain.orbit;
        if (world.time >= o.nextFlipAt) {
          o.dir = -o.dir;
          o.nextFlipAt = world.time + h.dirFlipMeanS * (0.5 + world.random());
        }
        const slow = world.time * 0.11;
        const omega = h.omegaRad * (1 + nx(slow) * h.omegaVar) * o.dir
          * (1 + brain.agitation * 0.7);
        o.theta += omega * dt;
        const r = Math.min(h.orbitRadiusPx, brain.orbitCap)
          * (1 + ny(slow + 9.4) * h.radiusVar);
        const e = r * h.epicycle;
        const tx = brain.anchor.x + Math.cos(o.theta) * r + Math.cos(o.theta * 2.3 + 1.2) * e;
        const ty = brain.anchor.y + Math.sin(o.theta) * r * 0.8 + Math.sin(o.theta * 2.3) * e;
        body.addForce(v2.set(tmpF,
          (tx - body.pos.x) * h.posGain - body.vel.x * h.velDamp,
          (ty - body.pos.y) * h.posGain - body.vel.y * h.velDamp));
        // ── SHE NOTICES WHEN SHE IS IN THE WAY ───────────────────────────
        // Landing on a paragraph is allowed, and has to be: the alternative is
        // a page she is forbidden from, which is what the old hard colliders
        // were and why they read as furniture. She is simply not allowed to
        // STAY. Half a second is long enough that the move is a decision rather
        // than a flinch, and short enough that nobody reads a line through her.
        //
        // ONLY IN HOVER. Cruising over the words is not sitting on them, and a
        // route that had to break off halfway because it crossed a column is
        // exactly the avoidance this is written to not be.
        //
        // The trigger is her circle actually OVERLAPPING type (clearance under
        // her own radius); the seat she moves to needs the orbit's worth of
        // room on top of that. The gap between the two is the hysteresis, so
        // arriving somewhere cannot immediately re-trigger.
        const room = pathfinder.clearanceAt(body.pos, body.radius);
        if (room >= body.radius || world.time < brain.asideGiveUpUntil) {
          brain.onTypeFor = 0;
        } else if ((brain.onTypeFor += dt) >= cfg.aside.noticeS) {
          brain.onTypeFor = 0;
          const seat = pathfinder.nearestRoomyPoint(body.pos, body.radius, seatRoom());
          if (pathfinder.clearanceAt(seat, body.radius) > room + 1) {
            // ...and she looks at what she was sitting on as she slides off it.
            // A point, so the head keeps turning to hold it as she leaves —
            // which is the whole gesture, and it costs one assignment.
            brain.gazeAt = { x: body.pos.x, y: body.pos.y };
            brain.asideGlanceUntil = world.time + cfg.aside.glanceS;
            v2.set(brain.anchor, seat.x, seat.y);
            brain.anchor.x = clamp(brain.anchor.x, cfg.margin,
              Math.max(cfg.margin, world.viewport.w - cfg.margin));
            brain.anchor.y = clamp(brain.anchor.y, world.scroll.y + cfg.margin,
              world.scroll.y + Math.max(cfg.margin, world.viewport.h - cfg.margin));
            sizeTheLap();
            // NO NEW STATE, and no thrust either. The hover spring is
            // near-critical and already running; letting it fetch her comes out
            // as an unhurried scoot, which is the body language asked for. A
            // seek would have opened the throttle and read as an errand.
          } else {
            // nowhere better within reach — a phone, a full-bleed figure. Stop
            // searching the grid every half second for an answer that is not
            // there.
            brain.asideGiveUpUntil = world.time + cfg.aside.giveUpForS;
          }
        }

        if (world.time >= brain.nextInterestAt) {
          const p = pickInterest();
          if (p) {
            v2.copy(brain.interest, p);
            brain.state = "cruise";
            brain.stateTime = 0;
            brain.path = null;
          } else {
            scheduleNextInterest();
          }
        }
        break;
      }
      case "cruise": {
        const dist = followPath(brain.interest, cfg.cruiseSpeed, dt);
        // rare spontaneous loop mid-flight
        if (maybeFlourish(cfg.flourish.cruiseChancePerS * dt)) break;
        if (dist < 26) {
          // arriving with real speed can end in a celebratory loop too
          if (!maybeFlourish(cfg.flourish.chanceOnArrive * 0.8)) {
            settle();
            brain.state = "hover";
            brain.stateTime = 0;
            scheduleNextInterest();
          }
        } else if (brain.stateTime > cfg.cruiseGiveUpS) {
          // NOT ARRIVED, and by now she has been pushing at full weight for
          // seconds. Whatever is there is not a thing force solves, so it is
          // the PLACE that is wrong: abandon it, remember it, want something
          // else. This used to be driven by a grinding detector at 1.8 s; it is
          // the trip timing out now, which is the same clock as everything else
          // in this file and cannot mistake a slow arrival for a stall.
          giveUp(brain.interest);
        }
        break;
      }
      case "seek": {
        // SHE GETS IMPATIENT. A seek at one speed is fine across half a screen
        // and hopeless across a scrolled document: the reader flicks a thousand
        // pixels down the page and then watches her plod after them for the
        // best part of ten seconds. So the longer a seek has been running, the
        // faster she goes — it costs nothing on the short trips, where the ramp
        // barely starts, and turns the long ones into a dash.
        //
        // Ramped on the ELAPSED TIME rather than on the distance left, because
        // distance can grow (the reader is still moving) and a speed that fell
        // when the target ran away would be exactly the wrong response.
        const eager = Math.min(1, Math.max(0, brain.stateTime - cfg.seekPatienceS)
          / cfg.seekRampS);
        const speed = cfg.seekSpeed
          + (cfg.seekSpeedMax - cfg.seekSpeed) * (eager * eager);
        followPath(seekGoal(brain.seekMode), speed, dt);
        // arrived (with hysteresis vs the entry trigger): maybe celebrate
        // with a loop-de-loop, else settle and hover
        if (seekDone(brain.seekMode) || brain.stateTime > 30) {
          brain.offscreenSince = null;
          if (!maybeFlourish(cfg.flourish.chanceOnArrive)) {
            settle();
            brain.state = "hover";
            brain.stateTime = 0;
            scheduleNextInterest();
          }
        }
        break;
      }
      case "flourish": {
        // fly a quick full circle: the velocity heading sweeps 2pi over the
        // duration, and the strong steering supplies the centripetal force.
        // orientation follows velocity, so the body carves the loop with the
        // belly toward the center (curvature banking in bodyPose)
        const f = brain.flourish;
        const theta = f.heading0 + f.sign * 2 * Math.PI * (brain.stateTime / f.durationS);
        v2.set(brain.moveIntent, Math.cos(theta), Math.sin(theta));
        const steer = v2.set(tmpF,
          (Math.cos(theta) * f.speed - body.vel.x) * cfg.steerGain * 3,
          (Math.sin(theta) * f.speed - body.vel.y) * cfg.steerGain * 3);
        body.addForce(v2.clampLen(steer, steer, cfg.flourish.steerCap)); // loops don't pathfind; at least shy off walls
        if (brain.stateTime >= f.durationS) {
          brain.flourish = null;
          settle();
          brain.state = "hover";
          brain.stateTime = 0;
          scheduleNextInterest();
        }
        break;
      }
      case "charge": {
        // plant and power up: hard braking, eyes locked on the cursor
        const damp = 1 / (1 + 6 * dt);
        body.vel.x *= damp;
        body.vel.y *= damp;
        if (brain.stateTime >= atk.chargeS) {
          // fire toward where the cursor is RIGHT NOW; the beam then stays put
          const p = world.pointer;
          const d = v2.make(p.pos.x - body.pos.x, p.pos.y - body.pos.y);
          if (v2.len(d) < 1) d.x = 1;
          v2.norm(d, d);
          world.emit("beamFire", { dir: d });
          body.addImpulse(v2.scale(v2.make(), d, -atk.recoil));
          brain.agitation = Math.min(brain.agitation + 0.35, 1);
          brain.state = "fire";
          brain.stateTime = 0;
          // keep staring down the beam until a beat after it dissipates
          brain.gazeHoldUntil = world.time + atk.expandS + atk.sustainS + atk.fadeS + atk.gazeHoldAfterS;
        }
        break;
      }
      case "fire": {
        const damp = 1 / (1 + 2.5 * dt);
        body.vel.x *= damp;
        body.vel.y *= damp;
        if (brain.stateTime >= atk.expandS + atk.sustainS + atk.fadeS) {
          brain.beamCooldownUntil = world.time + atk.cooldownS;
          settle();
          brain.state = "hover";
          brain.stateTime = 0;
          scheduleNextInterest();
        }
        break;
      }
      case "held": {
        // carried: snappy spring to the hand with a touch of lag, dangling.
        // collisions still resolve, so it can be dragged along surfaces
        const h = brain.held;
        if (!h) { brain.state = "hover"; break; }
        if (h.pending) {
          const moved = Math.hypot(world.pointer.pos.x - h.downX, world.pointer.pos.y - h.downY);
          if (moved > cfg.fling.grabThresholdPx) {
            h.pending = false;
            brain.agitation = clamp(brain.agitation + 0.2, 0, 1);
          }
        }
        const fhx = (world.pointer.pos.x + h.offX - body.pos.x) * cfg.fling.holdGain
          - body.vel.x * cfg.fling.holdDamp;
        const fhy = (world.pointer.pos.y + h.offY - body.pos.y) * cfg.fling.holdGain
          - body.vel.y * cfg.fling.holdDamp;
        body.addForce(v2.set(tmpF, fhx, fhy));
        break;
      }
      case "flung": {
        // ballistic ride: no steering, just physics until it slows, then a
        // possible celebratory loop, else settle where it ended up
        const sp = Math.hypot(body.vel.x, body.vel.y);
        if (sp < cfg.fling.settleSpeedPx || brain.stateTime > 4) {
          if (!maybeFlourish(cfg.fling.loopChance)) {
            settle();
            brain.state = "hover";
            brain.stateTime = 0;
            scheduleNextInterest();
          }
        }
        break;
      }
      case "startle": {
        const pk = brain.panic;
        if (pk) {
          if (pk.phase === "glance") {
            // BRAKED, hard. Not zeroed — a velocity snapped to nothing is a
            // teleport and the follow-through layers read it as a collision.
            const brake = 1 / (1 + cfg.panicBrake * dt);
            body.vel.x *= brake;
            body.vel.y *= brake;
          }
          if (pk.phase === "glance" && brain.stateTime >= cfg.panicGlanceS) {
            // beat two: the head comes off the thing and onto the way out.
            // gazeAt is a POINT, so it is put a long way down the escape line
            // rather than a unit vector — the head aims at places, not at
            // directions, and this keeps it aiming at one as she travels.
            pk.phase = "turn";
            brain.gazeFront = false;
            brain.gazeAt = {
              x: body.pos.x + pk.esc.x * 900,
              y: body.pos.y + pk.esc.y * 900
            };
          } else if (pk.phase === "turn"
                     && brain.stateTime >= cfg.panicGlanceS + cfg.panicTurnS) {
            // beat three: NOW she goes, and the limbs go with her. The impulse
            // waits for the head so the two read as cause and effect instead of
            // happening together.
            pk.phase = "bolt";
            body.addImpulse(v2.scale(v2.make(), pk.esc, cfg.panicImpulse));
            world.emit("panic", { intensity: 1 });
          } else if (pk.phase === "bolt") {
            // and she keeps accelerating the whole way out, so she is still
            // gaining speed when she leaves the frame rather than coasting
            body.vel.x += pk.esc.x * cfg.panicThrust * dt;
            body.vel.y += pk.esc.y * cfg.panicThrust * dt;
            brain.gazeAt = {
              x: body.pos.x + pk.esc.x * 900,
              y: body.pos.y + pk.esc.y * 900
            };
          }
          v2.copy(brain.moveIntent, pk.esc);
        }
        if (brain.stateTime >= brain.startleUntil) {
          brain.state = "recover";
          brain.stateTime = 0;
          brain.panic = null;
          brain.gazeAt = null;
          brain.gazeFront = false;
          brain.gazeWhip = false;
          world.panicking = false;
        }
        break;
      }
      case "recover": {
        const damp = 1 / (1 + 1.5 * dt);
        body.vel.x *= damp;
        body.vel.y *= damp;
        if (brain.stateTime > 1.2) {
          settle();
          brain.state = "hover";
          brain.stateTime = 0;
          scheduleNextInterest();
        }
        break;
      }
    }
  }

  return brain;
}
