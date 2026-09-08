// colliders.js
// dom rects as physics obstacles + viewport edges. measurement is browser-only;
// resolution is pure math and runs headless (tests inject rects directly).

import { v2 } from "../../utils/math.js";

// --- measurement (browser) ---------------------------------------------------

// ── WHAT SHE IS ASKED TO SIT OFF ────────────────────────────────────────────
// Two kinds of rectangle, one list.
//
//   HARD  `[data-collider]`. A physical obstacle: it steers her, it can bump
//         her, and routes go round it. Nothing on this site carries it.
//   SOFT  every block of type and every picture. It is something to READ, so
//         it exerts no force at all and no route knows it exists — she flies
//         straight over it. All it does is make a cell an expensive place to
//         STOP. See pathfinder.js, which has had the two grids for this since
//         before there was anything to put in them.
//
// The soft set is found rather than declared, because a class list naming this
// site's own vocabulary (.t, .d, .fig, .check, .tab, .cols) is stale the next
// time a sheet is written, and `data-collider` on every paragraph is markup
// carrying engine state. The test is generic: an element with words of its
// own, or a picture.
//
// TWO THINGS ARE DELIBERATELY NOT IN IT.
//   The apertures. `.ap` is an empty span — no text, no image — so it fails the
//   test on its own, and that is the right answer rather than an oversight: a
//   die-cut is a rectangle of sky, and the one unprinted thing on the page
//   resting in it is the best place she can be.
//   #chrome. A fixed element's DOCUMENT rectangle moves with the scroll, and
//   this list is remeasured twice a second — it would lag by whatever the
//   reader just did. The nav is small, at the rim, and much less disturbing to
//   sit on than prose.
// A BOX THAT PAINTS ITS OWN CONTENT rather than laying out text children. The
// text walk cannot see any of these: an <img> has no text nodes, and neither
// does a console that types itself into a child div a character at a time.
//
// `[data-term]` is here on exactly the same grounds as <canvas>, and it is not
// a class list creeping in by the back door — it is the one element on the site
// that is a RENDERED SURFACE made of type. Without it the collector missed
// 1056x504 of transcript, the largest single block of words on any page, and
// she was free to sit in the middle of it. It cannot be found by watching for
// the lines to arrive, either: `collect()` runs on a route swap and a resize,
// the typewriter changes nothing's box but its own, and a MutationObserver
// firing on 3,240 keystrokes to rediscover a box that was the same size the
// whole time is a lot of work to learn nothing. The container is the answer,
// and the container is there from the first frame.
const MEDIA = "img, video, svg, canvas, picture, [data-term]";
/** words of its own — a text node with something in it, directly inside */
function hasOwnText(el) {
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 3 && n.nodeValue.trim().length > 1) return true;
  }
  return false;
}

/**
 * @param world the shared world
 * @param scope the page's lifecycle scope. Optional, because the tests build a
 *   tracker without one — but utils/lifecycle.js is explicit that a leak needs
 *   a named OWNER rather than vigilance, and an observer is one of the four
 *   classes it exists to own. The tracker is built once at boot and lives as
 *   long as the page, so this has never leaked anything; it is registered so
 *   that the day something tears the engine down, it does not start.
 */
export function createColliderTracker(world, scope) {
  let els = [];
  let dirty = true;
  let rafPending = false;

  function collect() {
    els = Array.from(document.querySelectorAll("[data-collider]"))
      .map((el) => ({ el, soft: false }));
    const doc = document.getElementById("doc");
    if (!doc) return;
    // OUTERMOST WINS. A <p> holding an <em> matches twice, and the inner rect
    // is inside the outer one, so it is pure work for no coverage. Document
    // order means an ancestor is always seen first.
    const chosen = new Set();
    for (const el of doc.querySelectorAll("*")) {
      // NOT aria-hidden. That attribute is about the screen reader, and the
      // biggest block of type on this site is inside one: the terminal
      // transcript types itself into `<div data-lines aria-hidden="true">`
      // because the accessible copy of it is the `<pre class="sr">` next door.
      // Skipping it would leave a 1056x504 hole in the middle of the sheet that
      // she is free to sit in. Visually hidden things are excluded by their
      // rectangle instead — `.sr` measures 1x1 and does not survive the filter.
      if (!hasOwnText(el) && !el.matches(MEDIA)) continue;
      let covered = false;
      for (let a = el.parentElement; a && a !== doc; a = a.parentElement) {
        if (chosen.has(a)) { covered = true; break; }
      }
      if (covered) continue;
      chosen.add(el);
      els.push({ el, soft: true });
      if (els.length >= 400) break;   // a sheet is not a spreadsheet
    }
    watch();
  }

  function measure() {
    // document coords: stable under scroll, only layout changes matter
    const sy = window.scrollY;
    // ── AND THE TURN COMES OFF FIRST ─────────────────────────────────────
    // `recollect` fires while #doc still carries the page turn's inline
    // transform, and this measurement is on the next frame — well inside it.
    // getBoundingClientRect INCLUDES a transform, so every rect on a freshly
    // turned sheet would be baked 30 px sideways for the life of the page.
    // Exactly the aperture bug (site/deck.js), and the same fix: take it off
    // for the length of the measurement, and only when there is one to take.
    const docEl = document.getElementById("doc");
    const heldTf = docEl && docEl.style.transform;
    if (heldTf) docEl.style.transform = "";
    const next = els.map(({ el, soft }) => {
      const r = el.getBoundingClientRect();
      return { rect: { x: r.left, y: r.top + sy, w: r.width, h: r.height }, el, soft };
    }).filter((c) => c.rect.w > 4 && c.rect.h > 4);
    if (heldTf) docEl.style.transform = heldTf;
    // only bump the version when geometry actually changed (pathfinder rebuilds on it)
    const changed = next.length !== world.colliders.length || next.some((c, i) => {
      const o = world.colliders[i]?.rect;
      return !o || world.colliders[i].soft !== c.soft ||
        Math.abs(o.x - c.rect.x) > 1 || Math.abs(o.y - c.rect.y) > 1 ||
        Math.abs(o.w - c.rect.w) > 1 || Math.abs(o.h - c.rect.h) > 1;
    });
    world.colliders = next;
    if (changed) world.collidersVersion++;
    dirty = false;
  }

  function requestMeasure() {
    dirty = true;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (dirty) measure();
    });
  }

  // ── A REMEASURE IS A REACTION, NOT A POLL ────────────────────────────────
  // This was `setInterval(requestMeasure, 500)`, and while `[data-collider]`
  // was on nothing that cost nothing: the list was empty and the tick did no
  // work at all. It reads every block of type on the page now, so the same
  // interval is a forced layout twice a second, for the life of the tab, on a
  // page where nothing is moving. Measured at 0.4 ms a pass on a 1400 px sheet
  // — small, permanent, and avoidable.
  //
  // A ResizeObserver is strictly better than the poll it replaces, not merely
  // cheaper. The interval's comment named three things — fonts, images,
  // content — and all three are box changes, so all three fire this; and they
  // fire WHEN THEY HAPPEN rather than up to half a second later, which is half
  // a second of her sitting on type that has already moved. Idle costs nothing.
  //
  // #doc catches anything that reflows the page. The collected elements are
  // observed too, for a block that changes shape without changing the page's
  // own height. A transform is not a resize, so the card hover — which scales
  // a picture inside a fixed frame — cannot reach this: nothing on a hover
  // path may read layout, and this stays off that path.
  const ro = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => requestMeasure())
    : null;
  if (ro) scope?.add(ro);          // runDisposable() calls disconnect()
  // ...and if there is no ResizeObserver there is still the poll it replaced,
  // because being right on an old browser matters more than being tidy on it.
  let pollId = 0;
  if (!ro) {
    pollId = scope
      ? scope.addInterval(() => requestMeasure(), 500)
      : setInterval(() => requestMeasure(), 500);
  }

  function watch() {
    if (!ro) return;
    ro.disconnect();
    const doc = document.getElementById("doc");
    if (doc) ro.observe(doc);
    for (const { el } of els) ro.observe(el);
  }

  world.on("resize", () => { collect(); requestMeasure(); });
  // beam destruction can delete colliders outright
  world.on("recollect", () => { collect(); requestMeasure(); });

  collect();
  measure();
  return {
    requestMeasure,
    // for a caller with no scope. Idempotent, like every other dispose here.
    dispose() {
      ro?.disconnect();
      if (pollId) { clearInterval(pollId); pollId = 0; }
    }
  };
}

// --- resolution (headless-safe) ----------------------------------------------

// circle vs axis-aligned rect with restitution + tangential damping.
// colliderVel lets scrolling content shove the character (relative velocity).
export function resolveCircleRect(body, rect, cfg, colliderVel = { x: 0, y: 0 }, out = null) {
  const cx = Math.max(rect.x, Math.min(body.pos.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(body.pos.y, rect.y + rect.h));
  let dx = body.pos.x - cx;
  let dy = body.pos.y - cy;
  let dist = Math.hypot(dx, dy);

  let nx, ny, pen;
  if (dist > 1e-6) {
    if (dist >= body.radius) return null;
    nx = dx / dist;
    ny = dy / dist;
    pen = body.radius - dist;
  } else {
    // center inside the rect: push out along the shallowest axis
    const left = body.pos.x - rect.x;
    const right = rect.x + rect.w - body.pos.x;
    const top = body.pos.y - rect.y;
    const bottom = rect.y + rect.h - body.pos.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) { nx = -1; ny = 0; pen = left + body.radius; }
    else if (m === right) { nx = 1; ny = 0; pen = right + body.radius; }
    else if (m === top) { nx = 0; ny = -1; pen = top + body.radius; }
    else { nx = 0; ny = 1; pen = bottom + body.radius; }
  }

  // positional correction
  body.pos.x += nx * pen;
  body.pos.y += ny * pen;

  // velocity response on the relative velocity
  const rvx = body.vel.x - colliderVel.x;
  const rvy = body.vel.y - colliderVel.y;
  const vn = rvx * nx + rvy * ny;
  let impact = 0;
  if (vn < 0) {
    impact = -vn;
    const vtX = rvx - vn * nx;
    const vtY = rvy - vn * ny;
    body.vel.x = colliderVel.x + vtX * cfg.tangentDamp - vn * cfg.restitution * nx;
    body.vel.y = colliderVel.y + vtY * cfg.tangentDamp - vn * cfg.restitution * ny;
  }
  if (out) { out.nx = nx; out.ny = ny; out.impact = impact; }
  return { nx, ny, impact };
}

// ── THE EDGE IS A LEASH, NOT A WALL ─────────────────────────────────────────
// She may cross it. An animal that stops dead at an invisible line is a sprite
// in a box, and the whole point of her is that she is loose on the page.
//
// So: `edgeSlackPx` of free travel past the edge, then a spring that grows the
// further out she goes, and a hard stop only at `edgeHardPx` — which exists
// purely so a fling can never lose her somewhere unreachable. The brain's own
// offscreen-return already flies her back; this only has to make sure that
// return is always possible.
//
// THE SIDES ARE NOT THE TOP AND BOTTOM, and they were the same number. They are
// different in both directions at once:
//
//   Y is the DOCUMENT. Thousands of pixels of real content, and she travels it
//     with the reader. `edgeSlackPx` of genuinely free drift past either end,
//     then a spring, then a stop — an animal that stops dead at an invisible
//     line is a sprite in a box.
//
//   X is the SCREEN, and she stays on it. There was a version of this where the
//     sides were a very long leash so she could round an element flush to the
//     rim by going outside the page; it worked, and it read as her wandering off
//     the sheet constantly, which is worse than the thing it fixed. Getting past
//     an element is the push ramp's job now (behavior.push) — she leans on it
//     until she is through, rather than walking round the outside of the paper.
//
//     So X has no free travel at all: the spring starts at the rim and reaches
//     full within `edgeRampXPx`, and full is FIRMER than the escape from inside
//     type, so an element sitting flush to the edge cannot push her off the
//     page. The stop is still well out, because it is not there to contain her
//     — it is there so a fling cannot lose her, and it has to leave room for the
//     two things that legitimately begin outside the frame: a page-swap entry
//     (behavior.entryOffsetPx) and the tail of a throw.
//
// `free` is the third case: she is RUNNING. A startled exit is supposed to leave
// the frame — that is the whole shape of it — so the leash is off while it lasts.
export function resolveEdges(body, bounds, cfg, free = false) {
  // ── THE Y BAND IS THE WINDOW, NOT THE DOCUMENT ───────────────────────────
  // `bounds` is world.docSize, whose h is the full scrollHeight -- so the only
  // vertical restoring force in the build sat at the top and bottom of the
  // WHOLE PAGE. On a project sheet that is thousands of pixels away, and she
  // could hang 1,500 px above or below the window with nothing pulling on her
  // at all. bounds.w IS innerWidth, which is exactly why a sideways exit always
  // self-corrected and a vertical one never did.
  //
  // The brain has always thought in these terms -- seekGoal aims at
  // `scroll.y + vp.h * 0.45` and the offscreen test is `scroll.y ± 40` -- so
  // this is the physics catching up with the behaviour, not a new idea.
  const y0 = bounds.top || 0;
  const yh = bounds.viewH || bounds.h;
  // ...AND IT LETS GO WHEN SHE IS SUPPOSED TO LEAVE. `slackY` was
  // `cfg.edgeSlackPx` unconditionally while only `slackX` answered to `free`,
  // which nobody noticed because this band never fired. The moment it can, it
  // would fight the startled exit that is meant to take her off the page.
  const slackY = free ? cfg.edgeHardPx : cfg.edgeSlackPx;
  const hardY = cfg.edgeHardPx;
  const hardX = cfg.edgeHardXPx ?? hardY;
  const rampX = cfg.edgeRampXPx ?? Math.max(1, hardX - slackY);
  // ── THE LINE IS DRAWN AT HER SKIN, NOT AT HER CENTRE ─────────────────────
  // Held at the rim by the centre, half of a 150 px animal is off the page, and
  // half of her hanging off the side is exactly what "she goes outside the
  // screen" describes. So the sideways line sits one radius in, and it is her
  // BODY that stops at the edge.
  const slackX = free
    ? cfg.edgeHardXPx
    : -(body.radius) + (cfg.edgeSlackXPx ?? slackY);
  const k = cfg.edgeReturnAccel;
  const kX = cfg.edgeReturnAccelX ?? k;
  let hit = null;

  // one axis at a time: over = how far past the slack line she is
  const pull = (p, lo, hi) => {
    if (p < lo) return lo - p;
    if (p > hi) return -(p - hi);
    return 0;
  };
  const ox = pull(body.pos.x, -slackX, bounds.w + slackX);   // slackX < 0 = inset
  const oy = pull(body.pos.y, y0 - slackY, y0 + yh + slackY);
  if (ox || oy) {
    // the spring stiffens with distance, so drifting out is gentle and being
    // thrown out is firmly answered. Per axis, because the two no longer agree
    // about how far out is far: one hypot against one span would have X's
    // 70 px ramp and Y's 280 px one setting each other's slope.
    const rx = Math.min(1, Math.abs(ox) / Math.max(1, rampX));
    const ry = Math.min(1, Math.abs(oy) / Math.max(1, hardY - slackY));
    body.addForce({ x: Math.sign(ox) * kX * rx, y: Math.sign(oy) * k * ry });
  }

  // the point of no return
  const clampAxis = (p, lo, hi) => (p < lo ? lo : p > hi ? hi : p);
  const cx = clampAxis(body.pos.x, -hardX, bounds.w + hardX);
  const cy = clampAxis(body.pos.y, y0 - hardY, y0 + yh + hardY);
  if (cx !== body.pos.x) {
    const impact = Math.abs(body.vel.x);
    hit = { nx: Math.sign(cx - body.pos.x), ny: 0, impact };
    body.pos.x = cx;
    body.vel.x *= -cfg.edgeRestitution;
  }
  if (cy !== body.pos.y) {
    const impact = Math.abs(body.vel.y);
    if (!hit || impact > hit.impact) hit = { nx: 0, ny: Math.sign(cy - body.pos.y), impact };
    body.pos.y = cy;
    body.vel.y *= -cfg.edgeRestitution;
  }
  return hit;
}

// ── TEXT IS SOMETHING TO AVOID, NOT SOMETHING TO HIT ────────────────────────
// Nothing on the page stops her any more. Navigation used to be a sequence of
// small collisions — she would clip the corner of a paragraph, get shoved,
// re-plan, clip the next one — and the sum of that reads as a bug rather than
// as an animal.
//
// Two fields replace it, and they are deliberately SHORT-RANGED. A long-range
// repulsion from every block of type is a potential field whose minimum is the
// margin of the page, and she would spend her life crawling around the outside
// edge. These only speak up when she is close enough that it is about to
// matter.
//
//   AVOID   near a surface: a push away that falls off to nothing by
//           `avoidRangePx`. It steers her around a paragraph she is passing.
//   ESCAPE  centre inside a rect: a firm push toward the nearest way OUT,
//           summed across every rect she is inside — so a stack of paragraphs
//           resolves toward the gap between them rather than deeper in.
//
// Returns the hardest overlap this pass, for the bump reaction.
export function avoidColliders(body, world, cfg) {
  const range = cfg.avoidRangePx;
  const r = body.radius;
  let fx = 0, fy = 0;
  let inside = 0;
  let worst = null;

  for (const c of world.colliders) {
    // TYPE PUSHES NOTHING. It is read, not hit: no steer around it, no escape
    // out of it, no bump, no flail. The old version of this behaviour was a
    // hard collision she leaned through after a second or two of ramping, and
    // the whole point of the soft rect is that there is nothing to lean
    // through — she passes over a paragraph exactly as if it were blank paper,
    // and the only thing that knows about it is where she chooses to stop.
    if (c.soft) continue;
    const rect = c.rect;
    const nx0 = Math.max(rect.x, Math.min(body.pos.x, rect.x + rect.w));
    const ny0 = Math.max(rect.y, Math.min(body.pos.y, rect.y + rect.h));
    const dx = body.pos.x - nx0;
    const dy = body.pos.y - ny0;
    const d = Math.hypot(dx, dy);

    if (d > 1e-6) {
      if (d >= r + range) continue;
      // outside, but close: steer away, hardest at the surface
      const t = 1 - Math.max(0, d - r) / range;
      const g = cfg.avoidAccel * t * t;
      fx += (dx / d) * g;
      fy += (dy / d) * g;
      if (d < r) {
        const vn = (body.vel.x * dx + body.vel.y * dy) / d;
        if (!worst || -vn > worst.impact) worst = { nx: dx / d, ny: dy / d, impact: -vn };
      }
      continue;
    }

    // ── CENTRE IS INSIDE THIS RECT: OUT ALONG THE SHALLOWEST WALL ────────
    // ...THAT LEADS ANYWHERE. The shallowest wall of an element sitting flush
    // to a rim is the one facing the rim, so the nearest way out of the USB
    // sheet's terminal is off the left of the page — and now that she is held
    // on the sheet, that is a push into the leash, which is a standstill by
    // construction. A way out that does not exist is not the shallowest way
    // out; it is not a way out. Second shallowest, then.
    inside++;
    const left = body.pos.x - rect.x;
    const right = rect.x + rect.w - body.pos.x;
    const top = body.pos.y - rect.y;
    const bottom = rect.y + rect.h - body.pos.y;
    const w = world.docSize?.w ?? Infinity;
    const ways = [
      { d: left,   ex: -1, ey: 0, ok: rect.x - r > 0 },
      { d: right,  ex: 1,  ey: 0, ok: rect.x + rect.w + r < w },
      { d: top,    ex: 0,  ey: -1, ok: true },      // Y is the document: there
      { d: bottom, ex: 0,  ey: 1,  ok: true }       // is always more of it
    ];
    let pick = null;
    for (const way of ways) if (way.ok && (!pick || way.d < pick.d)) pick = way;
    if (!pick) for (const way of ways) if (!pick || way.d < pick.d) pick = way;
    const ex = pick.ex, ey = pick.ey;
    fx += ex * cfg.insideAccel;
    fy += ey * cfg.insideAccel;
    const speed = Math.hypot(body.vel.x, body.vel.y);
    if (!worst || speed > worst.impact) worst = { nx: ex, ny: ey, impact: speed };
  }

  // ── INSIDE THE TYPE, THE WAY OUT IS ALWAYS A FULL PUSH ──────────────────
  // The invariant this enforces, and the reason it is worth enforcing in one
  // place: NOTHING MAY OUT-PUSH THE ESCAPE. A steer at full lean is
  // steerMaxForce x leanThrust.maxMul, and `insideAccel` is set above that on
  // purpose — but only the single-rect case actually delivered `insideAccel`.
  // Two rects that overlap, which on these pages is every figure inside a
  // plate and every caption inside a demo, each push toward their own nearest
  // wall, and those two directions can be anything from agreeing to opposite.
  // Partially cancelling left a net of a few hundred px/s^2, the steer won, and
  // she pressed into the overlap and stayed until something else moved her.
  //
  // A saddle — dead centre of a symmetric block, or two that cancel exactly —
  // is the same failure with the sum at zero, and used to be handled here on
  // its own with a threshold of a quarter of `insideAccel`. It is not a special
  // case; it is one end of a continuum, and the fix for the whole continuum is
  // to normalise. Keep whatever direction the sum found, and give it the full
  // magnitude.
  //
  // Only ever topped UP: two rects that agree still push twice as hard.
  if (inside) {
    const m = Math.hypot(fx, fy);
    if (m > 1e-3) {
      if (m < cfg.insideAccel) { const k = cfg.insideAccel / m; fx *= k; fy *= k; }
    } else {
      // no direction at all. Derived from her own position rather than drawn
      // from the world's rng, because the rng is seeded and shared and a draw
      // here would desync every other consumer of it.
      const a = (body.pos.x * 0.013 + body.pos.y * 0.017) % (Math.PI * 2);
      fx = Math.cos(a) * cfg.insideAccel;
      fy = Math.sin(a) * cfg.insideAccel;
    }
  }

  if (fx || fy) body.addForce({ x: fx, y: fy });
  return worst;
}

// run the full pass; emits 'bump' (and, on a hard one, 'flail') through the
// world bus.
// everything is in document space now, so scrolling moves nothing here.
export function resolveAll(body, world, cfg) {
  let strongest = avoidColliders(body, world, cfg);
  const overlapping = !!strongest;

  // ...and the sides let go when being off the page is the POINT rather than a
  // failure: a startled exit, and the beat she waits outside the frame before
  // entering a new sheet. The brain owns the flag; see its step().
  // the band she is held in is the WINDOW: as wide as the page, as tall as the
  // viewport, offset by wherever the reader has scrolled to
  const edgeHit = resolveEdges(body, {
    w: world.docSize.w, h: world.docSize.h,
    top: world.scroll.y, viewH: world.viewport.h
  }, cfg, !!world.offLeash);
  if (edgeHit && (!strongest || edgeHit.impact > strongest.impact)) strongest = edgeHit;

  // A BUMP IS NOW AN EVENT, NOT A CONSEQUENCE.
  // Drifting through a paragraph must never react, or navigation is a stutter
  // of little collisions again. Being FLUNG into one still should: that is the
  // user doing something to her, and the >.< is the answer to it. So the
  // reaction fires on the rising edge of a fast overlap — once on the way in,
  // never again while she is passing through.
  const wasIn = body._overlapping === true;
  body._overlapping = overlapping;
  const fresh = overlapping && !wasIn;
  if (!(fresh || edgeHit)) return strongest;

  if (strongest && strongest.impact > cfg.bumpEventMinSpeed) {
    world.emit("bump", { normal: { x: strongest.nx, y: strongest.ny }, speed: strongest.impact });
    // A REALLY HARD ONE gets its own event: limbs flail, face screws up into
    // >.< . The roll lives HERE, once, rather than in each pose layer, so the
    // face and the limbs can never disagree about whether it happened -- two
    // independent rolls off the same seeded rng would consume different values
    // and desync, which reads as a bug rather than a reaction.
    // NOT WHILE SHE IS ALREADY RUNNING FROM SOMETHING. A panicking mew crosses
    // the page at speed and clips whatever is in the way, and every one of those
    // was a hard enough impact to fire the tantrum: the >.< face and a shower of
    // gold annoyance stars, in the middle of a flight that is supposed to read as
    // fear. She is not annoyed at the furniture; she has not noticed it.
    if (!world.panicking
        && strongest.impact > cfg.flailMinSpeed && world.random() < cfg.flailChance) {
      world.emit("flail", { speed: strongest.impact });
    }
  }
  return strongest;
}
