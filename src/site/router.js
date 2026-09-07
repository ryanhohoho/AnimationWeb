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

import { PROJECTS, bySlug } from "./projects.js";
import { renderProject, renderNotFound, renderDeckPage } from "./pages.js";


// ── THE DECK ─────────────────────────────────────────────────────────────────
// Four cards, in reading order, and the order is an argument: who this is, what
// he has done, what he has made, how to reach him. A hiring manager reads it in
// that order or reads the first card and leaves, and either is a complete visit.
//
// Project sheets are NOT on the deck. They hang off card three, which is why
// they get a back arrow and the deck cards do not.
export const DECK = ["home", "experience", "projects", "contact"];
export const PATH = {
  home: "/", experience: "/experience", projects: "/projects", contact: "/contact"
};

// ── AND WHAT TIME IT IS ON EACH ──────────────────────────────────────────────
// The sheet used to be one tall document and the night fell as you scrolled it:
// 19:00 at the top, 01:00 at the foot, the labels on the old four sections. Four
// one-screen cards have no scroll to fall through, so the whole site would sit
// at last light forever.
//
// So the time becomes a property of the CARD instead of a property of how far
// you have read, and it walks the same 19:00-to-01:00 the sheet always did.
// uSkyRamp is a document-pixel offset measured against REF_H = 4000, so an hour
// is 4000/6 px. Home stays at exactly 0, which is what it has always been.
//
// These are ABSOLUTE, and that is the whole point: the documented failure of
// uSkyRamp is that HOLDING it accumulates, so every navigation starts further
// into the night than the last and a few clicks strand the site at 01:00. A
// fixed per-page value cannot accumulate. It is the same discipline as before -
// every trip settles on a known number - with the number no longer always zero.
const HOUR = 4000 / 6;
export const RAMP = {
  home:       0,             // 19:00  - unchanged from the sheet it came from
  experience: Math.round(HOUR * 1.8),   // ~20:50
  projects:   Math.round(HOUR * 3.75),  // ~22:45
  contact:    Math.round(HOUR * 5.25),  // ~00:15
  // a project sheet is still a tall document and still walks its own night
  // down its own length, exactly as it does today
  project:    0,
  404:        0
};

// ── AND WHAT EACH CARD IS, FOR THE PAGES NOBODY LANDS ON FIRST ──────────────
// One document that swaps its own contents has ONE <meta name="description">,
// written for the summary, and it stays that way through every navigation. That
// is invisible to a reader and it is the whole of what a link preview and a
// search result quote -- so a shared /projects/closet advertised the front page.
//
// Kept short and kept TRUE, which is the same rule the labels on the sheet
// follow. A project sheet does not appear here at all: it already has a written
// one-sentence summary in projects.js, read by anyone deciding which of three to
// open, and a second one would be a second thing to keep in step.
const DESC = {
  home: "Ryan Ho — systems developer. Undocumented file formats, hardware " +
        "automation, and a procedurally animated Mew loose on the page.",
  experience: "Where Ryan Ho has worked: systems and tooling for the RCMP, and " +
        "computer science and biology at UBC.",
  projects: "Three pieces of work — a commissioned provisioning and engraving " +
        "pipeline, an outfit engine with a learned judge, and a case study of a " +
        "standardised attendance system.",
  contact: "How to reach Ryan Ho.",
  404: "Nothing was pulled here."
};

export function createRouter({ scope, deck, world, onPage }) {
  const doc = document.getElementById("doc");
  const metaDesc = document.querySelector('meta[name="description"]');
  const metaOgDesc = document.querySelector('meta[property="og:description"]');
  const metaOgTitle = document.querySelector('meta[property="og:title"]');
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The home markup ships in index.html so the first paint needs no JS. Capture
  // it once and it is the home template forever after -- one copy, no drift.
  const homeHTML = doc.innerHTML;
  let busy = false;
  // ── WHICH NAVIGATION IS THE LIVE ONE ─────────────────────────────────────
  // A watchdog is armed for a move and fires long after that move has finished
  // -- CROSS_MS * 3 is 4.8 s against a 1.6 s crossing. It used to clear the
  // eating unconditionally when it fired, so a dead navigation reached forward
  // and wiped whatever crossing happened to be running at that instant: one
  // frame with nothing covering the window, the page visible through the
  // middle of a transition, and then covered again on the very next frame.
  //
  // MEASURED, deterministically, on one shared clock for rAF and setTimeout:
  // a return armed its watchdog at t=3167, a fresh crossing started at t=6334,
  // and at t=7167 the dead return's timer cleared it and the next frame put it
  // straight back. That is the flicker, and it needs a couple of navigations
  // inside about five seconds to show up -- which is why it was intermittent.
  //
  // So a watchdog now only speaks for its own move. The timer is cleared when
  // the move ends normally, AND the generation is checked when it fires, which
  // are belt and braces on purpose: clearTimeout alone would be enough if
  // nothing could ever be dropped, and this is not a place to find out.
  let nav = 0;

  const routeOf = (path) => {
    // strip the trailing slash FIRST. Without it "/projects/" matches neither
    // the list nor the detail pattern and 404s, which is a URL a browser will
    // produce on its own.
    const p = (path || "/").replace(/\/+$/, "") || "/";
    if (p === "/") return { name: "home" };
    if (p === "/experience") return { name: "experience" };
    if (p === "/projects") return { name: "projects" };
    if (p === "/contact") return { name: "contact" };
    const m = p.match(/^\/projects\/([a-z0-9-]+)$/i);
    const pr = m && bySlug(m[1]);
    return pr ? { name: "project", project: pr } : { name: "404", path };
  };

  /** the time of night this sheet settles at */
  const rampOf = (r) => RAMP[r?.name] ?? 0;

  function render(route) {
    if (route.name === "home") {
      return { html: homeHTML, title: "RYAN HO", desc: DESC.home, ink: null, inkA: null };
    }
    if (DECK.includes(route.name)) {
      return { html: renderDeckPage(route.name), title: `${route.name} — RYAN HO`,
               desc: DESC[route.name], ink: null, inkA: null };
    }
    if (route.name === "project") {
      return {
        html: renderProject(route.project),
        title: `${route.project.title} — RYAN HO`,
        // the card's own sentence, already written and already read by anyone
        // choosing between the three
        desc: route.project.line,
        ink: route.project.ink,
        inkA: route.project.inkA
      };
    }
    return { html: renderNotFound(route.path), title: "not printed — RYAN HO",
             desc: DESC[404], ink: null };
  }

  // which sheet is on screen right now. The return dissolve needs it to know
  // whose colours the clouds should be — declared AFTER routeOf, because a
  // const is in its temporal dead zone until its own line runs and calling it
  // above would throw at construction.
  let current = routeOf(location.pathname);

  function commit(route, { carry = true } = {}) {
    current = route;
    const { html, title, desc, ink, inkA } = render(route);
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
    // the description travels with the title, or a shared inner page quotes the
    // front page. og:title too: a scraper that runs JS reads the property, and
    // one that does not gets the summary's, which is the right default
    if (metaDesc && desc) metaDesc.setAttribute("content", desc);
    if (metaOgDesc && desc) metaOgDesc.setAttribute("content", desc);
    if (metaOgTitle) metaOgTitle.setAttribute("content", title);
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
    // ── AND THE CONTINUITY TERM IS NOT A CHOICE ──────────────────────────
    // Before the swap the reader's eye is at (leftAt + k) with ramp R, so the
    // shader's numerator is leftAt + k + R. After scrollTo(0) the eye is at k,
    // so the numerator can only stay put if the new ramp is R + leftAt. That is
    // this line, it has always been this line, and it is right. Where each page
    // SETTLES is a separate question, answered by rampOf() in the retreat.
    //
    // It is skipped on a fade, because a fade does not cover the sheet: #doc
    // goes to zero and the print behind it stays in full view, so winding the
    // weather on there is a visible pan of the whole sky. runFade owns the ramp
    // on that path and the weather does not move at all.
    if (carry) deck.setSky(deck.sky + leftAt, deck.skyRamp + leftAt);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    deck.setInk(inkA, ink);
    // nothing on the new page is under the pointer yet
    deck.setMaskHole(null);
    deck.bind();
    world?.emit("recollect");
    onPage?.(route);

    // ── AND SAY SO ────────────────────────────────────────────────────────
    // This is one document that swaps its own contents, so a navigation is
    // silent: the URL changes, the title changes, and a screen reader is told
    // neither because no page load happened. A polite live region says what
    // arrived, and focus moves onto the new page so the next Tab starts there
    // instead of back at the browser chrome.
    //
    // preventScroll, because the commit has just put the reader at the top of
    // the sheet on purpose and a focus scroll would fight it. It happens while
    // the crossing still covers the window, so nothing of it is seen.
    announce(route);
    try { doc.focus({ preventScroll: true }); } catch { doc.focus?.(); }
  }

  const sayEl = typeof document.getElementById === "function"
    ? document.getElementById("say") : null;
  function announce(route) {
    if (!sayEl) return;
    const name = route?.name === "project"
      ? route.project.title
      : route?.name === "home" ? "summary" : route?.name || "page";
    // the region is re-read only when its text CHANGES, and two visits to the
    // same card would otherwise be silent the second time
    sayEl.textContent = "";
    sayEl.textContent = `${name} — page loaded`;
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
  const CROSS_MS   = 1600;   // total length. Still the slowest thing on the
                             // site, and it used to be 4000 - which was right
                             // when the crossing WAS the site and wrong now that
                             // it is the punctuation between four cards someone
                             // is skimming. Four seconds is a thing you sit
                             // through; 1.6 is a thing you go through.
  const FADE_OUT   = 300;    // a page turn, not a journey: Roy's numbers, and
  const FADE_IN    = 500;    // they are good numbers. Out is quicker than in
                             // because leaving should feel decided and arriving
                             // should feel like it settles.
  const FADE_DX    = 30;     // px, on X only. No Y, no scale.
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
  const RETURN_MS  = 1000;   // the whole trip home. Quicker than the way in:
                             // you already know where you are going.
  const MIN_OUT    = 0.55;   // never swap before this much of the outward half
                             // has run, even if the opening covers early
  const SWAP_AT    = 0.56;   // WHEN the sheet underneath is replaced. The
                             // opening reaches the corners at 0.50, so swapping
                             // exactly there does it the instant coverage is
                             // only just complete; a little past guarantees the
                             // window is fully enveloped and nothing of the
                             // change can be glimpsed at the edges.

  // ── WHICH MOVE IS THIS ───────────────────────────────────────────────────
  // There used to be one boolean here - "am I going home from a project" - and
  // one boolean is exactly enough when there are two kinds of page. There are
  // now two kinds of MOVE, and they mean different things:
  //
  //   a FADE is turning a page. You are in the same place, reading the next
  //   thing. Nothing about the sheet changes except the words on it.
  //
  //   a CROSSING is going somewhere. The paper opens and you go through it.
  //
  // So: stepping off the deck into a project crosses, and coming back crosses.
  // The first step of the deck, home -> experience, also crosses - once - because
  // that is where the reader is taught what the window in the middle of the
  // summary is FOR. Every later step is a page turn, because by then they know,
  // and a four-second event between two lists of text is a toll booth.
  //
  // Moving between two project sheets fades: they are siblings, and an opening
  // that eats the screen to show you the next of the same kind is a lie about
  // the distance travelled.
  function transitionFor(from, to) {
    const f = from?.name, t = to.name;
    if (f === "projects" && t === "project") return "cross";
    if (f === "project" && t === "projects") return "return";
    if (f === "project" && t === "project") return "fade";
    if (t === "project") return "cross";           // a deep link from anywhere
    if (f === "project") return "return";
    const fi = DECK.indexOf(f), ti = DECK.indexOf(t);
    if (fi < 0 || ti < 0 || fi === ti) return "fade";
    if (fi === 0 && ti === 1) return "cross";      // out through the summary window
    if (fi === 1 && ti === 0) return "return";     // and back into it
    return "fade";
  }

  /** the VIEWPORT centre and radius of the hole a link belongs to */
  function holeOf(a) {
    // THE CARD NAMES ITS OWN STARTING POINT. A project card is a picture with
    // that project's icon cut through the middle of it, and the icon is the
    // thing the reader was actually looking at when they clicked - so that is
    // where the paper opens. Falling back to "the first aperture in this plate"
    // would start the crossing at whatever hole happened to be declared first,
    // which on a card sheet is a different card.
    const el = a?.querySelector?.("[data-cross-from]")
            || a?.closest("[data-cross-from]")
            || a?.closest(".plate")?.querySelector("[data-ap]");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2 + window.scrollY,     // DOCUMENT space
      r: Math.min(r.width, r.height) * START_FRAC,
      fixed: el.hasAttribute("data-fixed")
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
    // AN EXPLICIT TARGET IS NOT A CANDIDATE, IT IS THE ANSWER. The back arrow on
    // a project sheet is small, so the largest-area search below would never
    // pick it - and the whole point of the arrow is that the paper closes back
    // into the thing you are about to press. It also does not scroll, so the
    // flag has to travel with it: the deck subtracts the scroll from a document
    // centre every frame, which would slide a fixed target off its own arrow the
    // moment the reader moved.
    const t = document.querySelector("[data-cross-target]");
    if (t) {
      const r = t.getBoundingClientRect();
      if (r.width >= 8 && r.height >= 8) {
        return {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2 + window.scrollY,
          r: Math.min(r.width, r.height) * END_FRAC,
          fixed: t.hasAttribute("data-fixed")
        };
      }
    }
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
  function runReturn(ms, rampTarget, onSwap, onDone) {
    const half = ms / 2;
    const here = firstHole()
      || { x: window.innerWidth / 2, y: window.scrollY + window.innerHeight / 2, r: 40 };
    let phaseStart = performance.now(), swapped = false, rampAtSwap = 0;
    const state = { out: true, dir: 1, t: 0, cx: here.x, cy: here.y, fixed: !!here.fixed,
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
          state.fixed = !!(dest && dest.fixed);
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
        // ...AND IT SETTLES ON THE PAGE'S OWN TIME, NOT ON ZERO.
        // Zero was never a time. It was the top of the only long sheet there
        // used to be, and with four one-screen cards there is no scroll left to
        // walk the night down, so each card carries an hour of its own and the
        // retreat eases onto it. Nothing accumulates - the target is absolute -
        // which is the property the uSkyRamp comment defends.
        if (SKY_SETTLE) {
          const e = Math.min(1, state.t);
          deck.setSkyRamp(rampTarget + (rampAtSwap - rampTarget) * (1 - e));
        }
        if (state.t >= 1) {
          deck.setCrossing(null);
          if (SKY_SETTLE) deck.setSkyRamp(rampTarget);
          onDone?.();
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── A PAGE TURN ──────────────────────────────────────────────────────────
  // No shader, no opening, nothing eaten: the words leave, the words arrive, and
  // the sheet they sit on never moves. That is the correct picture of stepping
  // from one card of the deck to the next, and it is the reason the crossing
  // still means something when it does happen.
  //
  // Driven on rAF rather than on setTimeout, for two reasons. It has to be able
  // to tween the sky ramp per frame, and the router harness stubs setTimeout out
  // entirely so the watchdogs cannot fire inside a check - a timer-driven fade
  // would simply never run under test, and this is the one path where the night
  // moves with nothing covering it.
  function runFade(rampTarget, onSwap, onDone) {
    const t0 = performance.now();
    const ramp0 = deck.skyRamp;
    let swapped = false;
    // easeOutExpo, near enough to cubic-bezier(0.16, 1, 0.3, 1) to be the same
    // move: almost all of the distance in the first third, then a long settle
    const ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    // THE NIGHT GETS A DIFFERENT CURVE, and it has to. easeOutExpo is violently
    // front-loaded -- 17% of the whole distance in its first frame -- which is
    // exactly what you want for something ARRIVING and exactly wrong for a
    // change of brightness happening in full view: measured, the first frame of
    // a fade moved the sky by 228 px of ramp, a visible flinch. Smoothstep eases
    // at both ends, so the largest single frame is about a sixth of that.
    const glide = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    // ...and it runs across the WHOLE fade rather than per half, so the swap in
    // the middle is not a seam in it
    const TOTAL = FADE_OUT + FADE_IN;

    const setDoc = (o, dx) => {
      // inline, and with the transition explicitly off: #doc carries a 900 ms
      // opacity transition in the stylesheet, which would otherwise fight a
      // 300 ms tween and win
      doc.style.transition = "none";
      doc.style.opacity = String(o);
      doc.style.transform = dx ? `translate3d(${dx}px,0,0)` : "";
      // ── AND THE HOLES GO WITH IT ─────────────────────────────────────
      // A die-cut is a rectangle of the DOCUMENT held in a shader uniform, so
      // it does not know the page is moving. Left alone it sits perfectly
      // still and perfectly opaque while the type slides thirty pixels out
      // from under it and dissolves -- the aperture hanging in the air with
      // nothing around it, which is the one thing about a page turn that
      // looked wrong. The same two numbers, handed to the sheet.
      deck.setDocShift(dx, o);
    };

    const tick = (now) => {
      const e = now - t0;
      if (!swapped) {
        const t = Math.min(1, e / FADE_OUT);
        const k = ease(t);
        setDoc(1 - t, -FADE_DX * k);
        // THE NIGHT MOVES ACROSS THE WHOLE FADE, not at the swap. A fade does
        // not cover the sheet, so a step in the ramp would be plainly seen -
        // but it is a change of BRIGHTNESS with no motion in it, so spread over
        // 800 ms it is invisible. The weather does not move at all here; that
        // one is a pan, and a pan across a fade is the rubber-band glide.
        if (SKY_SETTLE) deck.setSkyRamp(ramp0 + (rampTarget - ramp0) * glide(e / TOTAL));
        if (t >= 1) {
          swapped = true;
          onSwap();
          setDoc(0, FADE_DX);
        }
      } else {
        const t = Math.min(1, (e - FADE_OUT) / FADE_IN);
        const k = ease(t);
        setDoc(k, FADE_DX * (1 - k));
        if (SKY_SETTLE) deck.setSkyRamp(ramp0 + (rampTarget - ramp0) * glide(e / TOTAL));
        if (t >= 1) {
          doc.style.transition = "";
          doc.style.opacity = "";
          doc.style.transform = "";
          deck.setDocShift(0, 1);
          if (SKY_SETTLE) deck.setSkyRamp(rampTarget);
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
  function runCrossing(from, ms, rampTarget, onSwap, onDone) {
    const t0 = performance.now();
    const half = ms / 2;
    let dir = 1, phaseStart = t0, rFull = from.r, swapped = false, rampAtSwap = 0;
    const state = { dir: 1, t: 0, cx: from.x, cy: from.y, r0: from.r, fixed: !!from.fixed,
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
          state.fixed = !!(dest && dest.fixed);
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
        // eases onto the DESTINATION's own hour - see the same note in runReturn
        if (SKY_SETTLE) {
          const e = Math.min(1, state.t);
          deck.setSkyRamp(rampTarget + (rampAtSwap - rampTarget) * (1 - e));
        }
        if (state.t >= 1) {
          deck.setCrossing(null);
          if (SKY_SETTLE) deck.setSkyRamp(rampTarget);
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

    // WHICH MOVE, AND WHERE IT SETTLES, decided once and read from here down.
    const mode = transitionFor(current, route);
    const rampTarget = rampOf(route);

    if (reduced) {
      // no tween to carry the ramp, so it is set outright - and no carry either,
      // because there is no covered moment to hide a wound-on plate behind
      deck.setDocShift(0, 1);
      commit(route, { carry: false });
      deck.setSkyRamp(rampTarget);
      return;
    }

    busy = true;
    const gen = ++nav;
    let wd = 0;
    // whatever ended the last move -- its own last frame, or a watchdog --
    // this one starts on a page that is where it says it is
    deck.setDocShift(0, 1);
    document.body.classList.add("crossing");   // the type goes first

    // THE PAGE MUST COME BACK. `crossing` holds #doc at opacity 0, so anything
    // that can throw between adding it and removing it can leave the site
    // permanently blank -- and a page that renders one project's markup badly
    // is a bug, while a page that renders nothing at all is a dead site. The
    // finally is the difference, and the watchdog covers the case where the
    // rAF never runs at all (a tab backgrounded mid-crossing).
    let landed = false;
    const land = (opts) => {
      if (landed) return;
      landed = true;
      try {
        commit(route, opts);
      } catch (err) {
        console.error("[router] page failed to commit", err);
      } finally {
        document.body.classList.remove("crossing");
        busy = false;
      }
    };

    /** the drive finished on its own, so its watchdog has nothing left to say */
    const settle = () => { if (wd) { clearTimeout(wd); wd = 0; } };
    /** ...and if it fires anyway, it may only speak for its own navigation */
    const guard = (fn) => () => { if (gen === nav) fn(); };

    // ── GOING BACK IS NOT GOING IN ───────────────────────────────────────
    // Leaving for the home sheet dissolves rather than opens: four groups of
    // cloud, each covering more of the window than the last. It needs no click
    // point, so every "back" link works the same wherever it sits, and it needs
    // no colour match at the far end because the screen is full when the page
    // changes underneath it.
    // IT EATS IN THE COLOURS OF THE SHEET IT IS OPENING ONTO, both directions.
    // That used to be two branches saying it two different ways; it is one rule.
    // A deck card has no pair of its own, and null is what the press reads as
    // its own defaults.
    const destProject = route.name === "project" ? route.project : null;
    deck.setEatInk(destProject?.inkA || null, destProject?.ink || null);

    // ── A PAGE TURN ──────────────────────────────────────────────────────
    // No opening, and NO "crossing" on the bus: she is not being displaced, the
    // words are. A startle here would have her fleeing every arrow key.
    if (mode === "fade") {
      const turn = () => { settle(); land({ carry: false }); };
      runFade(rampTarget, turn, turn);
      wd = setTimeout(guard(turn), (FADE_OUT + FADE_IN) * 4);   // watchdog
      return;
    }

    if (mode === "return") {
      // IT EATS IN THE COLOURS OF THE SHEET IT IS OPENING ONTO, which coming
      // home means the home sheet's own pair — null, which the press reads as
      // its defaults. It used to eat in the colours of the page being LEFT,
      // which is the wrong end of the journey: the whole second half of this is
      // the opening retreating into the home window, and it was arriving there
      // still wearing the project's ink.
      // SHE SEES IT COMING. Closing in from the rim, so there is no one place
      // it comes from: from: null sends her at the middle of the room, which
      // is the same rule (go where it is furthest away) applied to an edge.
      world?.emit("crossing", { ms: RETURN_MS, from: null });
      runReturn(RETURN_MS, rampTarget, land, () => { settle(); land(); });
      wd = setTimeout(guard(() => { land(); deck.setCrossing(null); }), RETURN_MS * 4);
      return;
    }

    // THE EATING IS ALREADY THE PROJECT'S COLOUR. Its inks are set before the
    // first frame of it, so the opening spreads in the pair of the sheet it is
    // opening onto and the midpoint has no colour change in it at all.
    const from = source || firstHole()
      || { x: window.innerWidth / 2, y: window.innerHeight / 2 + window.scrollY, r: 40 };
    // she is on the sheet, so a plate change happens TO her — and this one has
    // a definite source, so she leaves on the line straight out of it
    world?.emit("crossing", { ms: CROSS_MS, from: { x: from.x, y: from.y } });
    runCrossing(from, CROSS_MS, rampTarget, land, () => { settle(); land(); });
    wd = setTimeout(guard(() => { land(); deck.setCrossing(null); }), CROSS_MS * 3);
  }

  // ── THE ARROW KEYS ───────────────────────────────────────────────────────
  // The deck is a deck, so it reads like one. No wrap: an end is an end, and
  // silently looping from the last card back to the first is how a reader loses
  // track of whether they have seen everything. On a project sheet the same two
  // keys step between projects instead, because that is the list you are in.
  //
  // Down/Right and Up/Left both work, and so do Space and Enter going forward -
  // whichever key someone reaches for on a thing that looks like slides.
  function step(d) {
    if (current?.name === "project") {
      const j = PROJECTS.indexOf(current.project) + d;
      if (j < 0 || j >= PROJECTS.length) return false;
      go(`/projects/${PROJECTS[j].slug}`);
      return true;
    }
    const i = DECK.indexOf(current?.name);
    if (i < 0) return false;
    const j = i + d;
    if (j < 0 || j >= DECK.length) return false;
    go(PATH[DECK[j]]);
    return true;
  }

  // ── THE SWIPE ────────────────────────────────────────────────────────────
  // A phone has no arrow keys, and until this the only way through the deck was
  // two small circles. A horizontal drag is what a thumb reaches for on
  // something that presents itself as cards, so it drives the same step() the
  // keyboard does -- same order, same ends, no wrap.
  //
  // IT NEVER CALLS preventDefault, and that is the whole design. Setting
  // touch-action or swallowing the move would take vertical scrolling away from
  // a page that genuinely scrolls, so instead this only WATCHES: the browser
  // keeps the gesture, and a drag that turns out to be mostly sideways is read
  // as an intent afterwards. The 1.5 ratio is what separates "sideways" from "a
  // slightly untidy scroll".
  //
  // Touch only. A mouse drag is a selection, and a trackpad's momentum would
  // fire this on every flick.
  const SWIPE_MIN = 56;      // px of travel before it counts as anything
  const SWIPE_RATIO = 1.5;   // ...and how much more sideways than vertical
  const SWIPE_MAX_MS = 700;  // a slow drag is a scroll that wandered
  let sw = null;

  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || !e.isPrimary) { sw = null; return; }
    // a sideways-scrolling box owns its own horizontal drags -- the terminal
    // transcript on a project sheet is 87 columns wide and scrolls
    if (e.target?.closest?.("[data-noswipe], .term")) { sw = null; return; }
    sw = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  }, { passive: true, signal: scope?.signal });

  const endSwipe = (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    const dt = performance.now() - sw.t;
    sw = null;
    if (dt > SWIPE_MAX_MS) return;
    if (Math.abs(dx) < SWIPE_MIN) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
    // drag the page leftward to bring the next card on, the way a thumb expects
    step(dx < 0 ? 1 : -1);
  };
  window.addEventListener("pointerup", endSwipe, { passive: true, signal: scope?.signal });
  window.addEventListener("pointercancel", () => { sw = null; }, { passive: true, signal: scope?.signal });

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    // never steal a key from something being typed into
    if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName || "")) return;
    let d = 0;
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "Enter") d = 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") d = -1;
    else if (e.key === "Escape" && current?.name === "project") {
      e.preventDefault(); go("/projects"); return;
    }
    if (!d) return;
    // Enter and Space belong to a focused link or button first
    if ((e.key === " " || e.key === "Enter") && t?.closest?.("a,button")) return;
    if (step(d)) e.preventDefault();
  }, { signal: scope?.signal });

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
  // the hour is a property of the page, so it is set on arrival too - a deep
  // link to /contact should open at a quarter past midnight, not at last light
  deck.setSkyRamp(rampOf(first));
  if (first.name !== "home") commit(first, { carry: false });
  else onPage?.(first);

  return { go, get route() { return routeOf(location.pathname); } };
}
