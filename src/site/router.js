// router.js — GOING THROUGH THE HOLE
//
// This is a single document that changes what is printed on it. Not because an
// SPA is fashionable, but because Mew is a live WebGL context with physics and
// a brain, and a real navigation would kill her and start a new one. She has to
// still be there on the other side -- which means the sheet has to be the thing
// that changes, not the window.
//
// THE TRANSITION
// --------------
// You do not slide to another page. You go THROUGH the hole you clicked.
//
// The die-cut OPENS. The hole grows until the paper is gone and there is
// nothing left but print; on the other side the next sheet's paper closes back
// in around its own holes. And as it opens the SCREEN coarsens, so the halftone
// stops being a texture and becomes countable marks before resolving back into
// weather.
//
// That is not a flourish. It is RYAN.txt III, the thing under every reference he
// keeps: AN INVISIBLE CONTINUOUS THING MADE VISIBLE BY MANY SMALL DISCRETE
// IDENTICAL MARKS. The whole site is built out of that idea; this is the one
// moment where you get to fall into it.
//
// Cost: nothing. A hole was already a rectangle in a uniform and the ruling was
// already a uniform, so the crossing is two numbers animating on a shader that
// was going to run this frame regardless.

import { bySlug } from "./projects.js";
import { renderProject, renderNotFound } from "./pages.js";


export function createRouter({ scope, deck, world, onPage }) {
  const doc = document.getElementById("doc");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The home markup ships in index.html so the first paint needs no JS. Capture
  // it once and it is the home template forever after -- one copy, no drift.
  const homeHTML = doc.innerHTML;
  let busy = false;

  const routeOf = (path) => {
    if (path === "/" || path === "") return { name: "home" };
    const m = path.match(/^\/projects\/([a-z0-9-]+)\/?$/i);
    const p = m && bySlug(m[1]);
    return p ? { name: "project", project: p } : { name: "404", path };
  };

  function render(route) {
    if (route.name === "home") return { html: homeHTML, title: "RYAN HO", ink: null, inkA: null };
    if (route.name === "project") {
      return {
        html: renderProject(route.project),
        title: `${route.project.title} — RYAN HO`,
        ink: route.project.ink,
        inkA: route.project.inkA
      };
    }
    return { html: renderNotFound(route.path), title: "not printed — RYAN HO", ink: null };
  }

  // which sheet is on screen right now. The return dissolve needs it to know
  // whose colours the clouds should be — declared AFTER routeOf, because a
  // const is in its temporal dead zone until its own line runs and calling it
  // above would throw at construction.
  let current = routeOf(location.pathname);

  function commit(route) {
    current = route;
    const { html, title, ink, inkA } = render(route);
    // ── READ THE OFFSET BEFORE THE SHEET CHANGES ─────────────────────────
    // How far down the OLD sheet the reader was is the number the plate winds
    // on by, and it is only knowable while the old sheet is still in the
    // document. Replacing #doc with a SHORTER page makes the browser clamp the
    // scroll position to the new maximum on the spot, so reading it afterwards
    // returns where the reader ended up rather than where they were.
    //
    // That never showed going IN — project sheets are taller than the home
    // sheet, so there is nothing to clamp against. Coming HOME it is the whole
    // bug: leave a long project 7,000 px down and the home sheet can only hold
    // ~2,700, so the plate wound on by 2,700 while the picture had been showing
    // 7,000, and 4,300 px of sky — nearly five bands of it — stepped in one
    // frame. Same fault as the original teleport, same fix, other direction.
    const leftAt = window.scrollY;
    doc.innerHTML = html;
    document.title = title;
    // ── THE READER LANDS AT THE TOP; THE PLATE WINDS ON ──────────────────
    // Keeping the reader's scroll offset made the sky continuous, but it also
    // dropped them into the middle of a sheet they had not read yet. The offset
    // moves to the PICTURE instead: the viewport goes to the top of the new
    // sheet, and the plate behind it is wound on by however far down the last
    // one they were, so the top of this sheet shows exactly the sky they were
    // already looking at. Only the picture moves — the die-cuts stay where the
    // layout put them.
    //
    // `behavior: "instant"` because `html { scroll-behavior: smooth }` would
    // otherwise animate this, and the animation outlives the closing paper.
    deck.setSky(deck.sky + leftAt, deck.skyRamp + leftAt);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    deck.setInk(inkA, ink);
    deck.bind();
    world?.emit("recollect");
    onPage?.(route);
  }

  // ── THE CROSSING ─────────────────────────────────────────────────────────
  // You do not slide to another page and you do not zoom into a picture of
  // one. The die-cut you clicked OPENS: the hole grows until the paper is gone
  // and there is nothing left but print, and on the other side the next
  // sheet's paper closes back in around its own holes.
  //
  // While it opens, the SCREEN coarsens — the ruling runs from 5.2 px up to
  // ~30, so the halftone stops being a texture and becomes countable marks,
  // and then resolves back into weather as the new sheet closes. That is
  // RYAN.txt III, and this is the first version of it that is honest: the dots
  // grow in place rather than being a bitmap scaled up.
  //
  // It costs nothing extra. A hole was already a rectangle in a uniform and
  // the ruling was already a uniform, so the whole transition is two numbers
  // animating on a shader that was going to run anyway.
  // ── CROSSING, TUNING ─────────────────────────────────────────────────────
  // Everything adjustable about the transition is these four numbers.
  const CROSS_MS   = 4000;   // total length. The slowest thing on the site.
  const START_FRAC = 0.22;   // where the eating begins, as a fraction of the
                             // clicked hole's SHORT side. It used to start at
                             // the hole's circumradius, which is bigger than
                             // the hole itself — so it began already outside
                             // the frame instead of inside it.
  const END_FRAC   = 0.30;   // and how small it closes down before the
                             // destination hole takes over
  const EDGE_MESS  = 150;    // how ragged the boundary is, in px
  const SKY_SETTLE = true;   // unwind the TIME OF NIGHT after a crossing. The
                             // weather is never unwound — see uSky in pressgl.js
  const RETURN_MS  = 2000;   // the whole trip home. Quicker than the way in:
                             // you already know where you are going.
  const MIN_OUT    = 0.55;   // never swap before this much of the outward half
                             // has run, even if the opening covers early
  const SWAP_AT    = 0.56;   // WHEN the sheet underneath is replaced. The
                             // opening reaches the corners at 0.50, so swapping
                             // exactly there does it the instant coverage is
                             // only just complete; a little past guarantees the
                             // window is fully enveloped and nothing of the
                             // change can be glimpsed at the edges.

  /** the VIEWPORT centre and radius of the hole a link belongs to */
  function holeOf(a) {
    const el = a?.closest("[data-gate]") || a?.closest(".plate")?.querySelector("[data-ap]");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2 + window.scrollY,     // DOCUMENT space
      r: Math.min(r.width, r.height) * START_FRAC
    };
  }

  /** The hole the paper closes back onto: the LARGEST aperture in the first
      screenful of the new sheet. "First in the DOM" picked whichever aperture
      happened to be declared first, which on these pages is a small one near
      the top — so the opening converged well above the window it should have
      landed in. */
  /** the full-bleed band at the foot of a sheet, if this one has one */
  function footerHole() {
    const els = [...document.querySelectorAll("[data-ap].band")];
    const el = els[els.length - 1];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2 + window.scrollY,
      r: Math.min(r.width, r.height) * END_FRAC
    };
  }

  function firstHole() {
    let best = null, bestArea = 0;
    for (const el of document.querySelectorAll("[data-ap]")) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.top > window.innerHeight || r.bottom < 0) continue;   // this screen only
      const area = r.width * r.height;
      if (area <= bestArea) continue;
      bestArea = area;
      best = {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2 + window.scrollY,   // DOCUMENT space
        r: Math.min(r.width, r.height) * END_FRAC
      };
    }
    return best;
  }

  /**
   * ONE continuous drive, 0 -> 1, straight through the swap.
   *
   * The version before this ran two separate crossings with the page change
   * wedged between them, which is why it looked goofy: two events with a
   * discontinuity in the middle and nothing for the eye to follow across it.
   * This is one opening that grows out of the hole you clicked, swallows the
   * window, and then closes back down onto the hole the new sheet has.
   */
  /**
   * THE RETURN — THE CROSSING RUN BACKWARDS.
   *
   * Going in, the paper opens at the window you clicked and the opening spreads
   * out to the edges. Coming out is that move mirrored: the print closes IN from
   * every edge until the page is gone, and then, on the home sheet, it retreats
   * into the window you came out of.
   *
   * Only the first half is new, and even that is the same boundary with the
   * paper on the other side of it (uEatOut in the shader). The second half is
   * literally the crossing's own retreat, unchanged — including the unwinding of
   * the night, which is why the home sheet stops getting darker every trip.
   *
   * There is no clicked point to work from, so the shrinking island of page is
   * centred on the window of the sheet being LEFT: you leave by the way you
   * came in.
   */
  function runReturn(onSwap, onDone) {
    const half = RETURN_MS / 2;
    const here = firstHole()
      || { x: window.innerWidth / 2, y: window.scrollY + window.innerHeight / 2, r: 40 };
    let phaseStart = performance.now(), swapped = false, rampAtSwap = 0;
    const state = { out: true, dir: 1, t: 0, cx: here.x, cy: here.y,
                    r0: 0, rFull: 0, rEnd: 0, second: null, mess: EDGE_MESS };

    const tick = (now) => {
      state.t = (now - phaseStart) / half;
      deck.setCrossing({ ...state });

      if (!swapped) {
        // the island of page is gone, so there is nothing to see change
        if (deck.crossCovered && state.t >= MIN_OUT) {
          swapped = true;
          onSwap();
          rampAtSwap = deck.skyRamp;
          // and from here it IS the crossing's retreat, onto the home window
          const dest = firstHole();
          state.out = false;
          state.dir = -1;
          state.cx = dest ? dest.x : window.innerWidth / 2;
          state.cy = dest ? dest.y : window.scrollY + window.innerHeight / 2;
          state.rEnd = dest ? dest.r : 0;
          const foot = footerHole();
          state.second = foot ? { cx: foot.x, cy: foot.y, rEnd: foot.r } : null;
          state.rFull = coverRadius(state.cx, state.cy) * 1.25;
          state.t = 0;
          phaseStart = now;
        }
      } else {
        // THE NIGHT UNWINDS HERE TOO, and it did not before. commit() winds the
        // plate on by the reader's scroll offset at every navigation; the
        // crossing eased that back across its retreat and the dissolve never
        // did, so every trip home left the sheet further into the night and a
        // few of them ran it to 01:00 for good.
        if (SKY_SETTLE) deck.setSkyRamp(rampAtSwap * (1 - Math.min(1, state.t)));
        if (state.t >= 1) {
          deck.setCrossing(null);
          if (SKY_SETTLE) deck.setSkyRamp(0);
          onDone?.();
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** what radius, centred here, reaches every corner of the window right now */
  function coverRadius(cx, cyDoc) {
    const w = window.innerWidth, h = window.innerHeight;
    const cy = cyDoc - window.scrollY;
    return Math.max(
      Math.hypot(cx, cy), Math.hypot(w - cx, cy),
      Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
  }

  /**
   * OUT until the window is genuinely covered, then swap, then back IN.
   *
   * The phase change is driven by COVERAGE, not by a clock. A timed midpoint is
   * only correct if the reader holds still: scroll during the crossing and the
   * opening — which is mounted to a document position — slides away with the
   * page, so a swap on schedule happens with half the window still showing.
   * The deck reports whether the opening actually covers the viewport, ragged
   * edge included, and the swap waits for that. If the reader has scrolled far
   * enough that it takes longer, it takes longer, and the growth accelerates.
   */
  function runCrossing(from, onSwap, onDone) {
    const t0 = performance.now();
    const half = CROSS_MS / 2;
    let dir = 1, phaseStart = t0, rFull = from.r, swapped = false, rampAtSwap = 0;
    const state = { dir: 1, t: 0, cx: from.x, cy: from.y, r0: from.r,
                    rFull: from.r, rEnd: from.r, second: null, mess: EDGE_MESS };

    const tick = (now) => {
      state.dir = dir;
      state.t = (now - phaseStart) / half;
      deck.setCrossing({ ...state });

      if (dir > 0) {
        // only when the window is actually full
        if (!swapped && deck.crossCovered && state.t >= MIN_OUT) {
          swapped = true;
          onSwap();
          rampAtSwap = deck.skyRamp;
          const dest = firstHole();
          // the new sheet arrives ALREADY COVERED, so nothing of it is seen
          // until the paper retreats — which is also what stops the sky
          // mismatching across the swap
          // WITH THE OFFSET KEPT, THERE MAY BE NO WINDOW ON SCREEN AT ALL —
          // the middle plates of a project sheet carry captures, not die-cuts.
          // Then the paper simply closes all the way, which is the correct
          // picture of that part of the page rather than a hole left hanging in
          // the middle of nothing.
          state.cx = dest ? dest.x : window.innerWidth / 2;
          state.cy = dest ? dest.y : window.scrollY + window.innerHeight / 2;
          state.rEnd = dest ? dest.r : 0;
          const foot = footerHole();
          state.second = foot ? { cx: foot.x, cy: foot.y, rEnd: foot.r } : null;
          rFull = coverRadius(state.cx, state.cy) * 1.25;
          state.rFull = rFull;
          dir = -1;
          phaseStart = now;
          state.t = 0;
        }
      } else {
        // UNWIND, while the paper is closing over it. The plate is wound on at
        // the swap so nothing jumps; left there, every sheet from then on would
        // start further into the night than the one before, and a few
        // navigations in the whole site would be permanently at 01:00. So it
        // eases back to this sheet's own sky across the retreat — a slow drift,
        // mostly behind closing paper, rather than a step.
        // Only the TIME unwinds. The weather stays where it was wound to —
        // returning it is a pan of the whole sky, and that pan was the
        // rubber-band glide.
        if (SKY_SETTLE) deck.setSkyRamp(rampAtSwap * (1 - Math.min(1, state.t)));
        if (state.t >= 1) {
          deck.setCrossing(null);
          if (SKY_SETTLE) deck.setSkyRamp(0);
          onDone?.();
          return;
        }
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  // ── navigation ───────────────────────────────────────────────────────────
  function go(path, { push = true, source = null } = {}) {
    if (busy) return;
    const route = routeOf(path);
    if (push) history.pushState({ path }, "", path);

    if (reduced) { commit(route); return; }

    busy = true;
    document.body.classList.add("crossing");   // the type goes first

    // THE PAGE MUST COME BACK. `crossing` holds #doc at opacity 0, so anything
    // that can throw between adding it and removing it can leave the site
    // permanently blank -- and a page that renders one project's markup badly
    // is a bug, while a page that renders nothing at all is a dead site. The
    // finally is the difference, and the watchdog covers the case where the
    // rAF never runs at all (a tab backgrounded mid-crossing).
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      try {
        commit(route);
      } catch (err) {
        console.error("[router] page failed to commit", err);
      } finally {
        document.body.classList.remove("crossing");
        busy = false;
      }
    };

    // ── GOING BACK IS NOT GOING IN ───────────────────────────────────────
    // Leaving for the home sheet dissolves rather than opens: four groups of
    // cloud, each covering more of the window than the last. It needs no click
    // point, so every "back" link works the same wherever it sits, and it needs
    // no colour match at the far end because the screen is full when the page
    // changes underneath it.
    const leaving = route.name === "home" && current?.name === "project";
    if (leaving) {
      // IT EATS IN THE COLOURS OF THE SHEET IT IS OPENING ONTO, which coming
      // home means the home sheet's own pair — null, which the press reads as
      // its defaults. It used to eat in the colours of the page being LEFT,
      // which is the wrong end of the journey: the whole second half of this is
      // the opening retreating into the home window, and it was arriving there
      // still wearing the project's ink.
      deck.setEatInk(null, null);
      // SHE SEES IT COMING. Closing in from the rim, so there is no one place
      // it comes from: `from: null` sends her at the middle of the room, which
      // is the same rule (go where it is furthest away) applied to an edge.
      world?.emit("crossing", { ms: RETURN_MS, from: null });
      runReturn(land, () => { land(); });
      setTimeout(() => { land(); deck.setCrossing(null); }, RETURN_MS * 4);  // watchdog
      return;
    }

    // THE EATING IS ALREADY THE PROJECT'S COLOUR. Its inks are set before the
    // first frame of it, so the opening spreads in the pair of the sheet it is
    // opening onto and the midpoint has no colour change in it at all.
    const dest = route.name === "project" ? route.project : null;
    deck.setEatInk(dest?.inkA || null, dest?.ink || null);

    const from = source || firstHole()
      || { x: window.innerWidth / 2, y: window.innerHeight / 2 + window.scrollY, r: 40 };
    // she is on the sheet, so a plate change happens TO her — and this one has
    // a definite source, so she leaves on the line straight out of it
    world?.emit("crossing", { ms: CROSS_MS, from: { x: from.x, y: from.y } });
    runCrossing(from, land, () => { land(); });
    setTimeout(() => { land(); deck.setCrossing(null); }, CROSS_MS * 3);  // watchdog
  }

  // The crossing starts AT the thing you clicked, so a link inside a hole opens
  // from that hole. Anything else opens from whatever hole the sheet has.
  function sourceFor(a) { return holeOf(a); }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[data-route]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    e.preventDefault();
    if (href === location.pathname) return;
    go(href, { source: sourceFor(a) });
  }, { signal: scope?.signal });

  window.addEventListener("popstate", () => {
    go(location.pathname, { push: false });
  }, { signal: scope?.signal });

  // a direct load of /projects/x still ships index.html, so paint the right
  // page immediately rather than showing the home sheet for a frame
  const first = routeOf(location.pathname);
  history.replaceState({ path: location.pathname }, "", location.pathname + location.hash);
  if (first.name !== "home") commit(first);
  else onPage?.(first);

  return { go, get route() { return routeOf(location.pathname); } };
}
