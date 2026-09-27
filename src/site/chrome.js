// chrome.js — THE PART OF THE PAGE THAT DOES NOT TURN
//
// The nav bar, and nothing else now (2026-09-25). It lives OUTSIDE #doc, which
// is the whole reason it exists as its own thing: #doc is replaced wholesale on
// every navigation, so anything inside it is destroyed and rebuilt, and
// navigation furniture that flickers once per move is worse than none.
//
// Before the bar, this file drove five things: two sky discs (home, and back to
// the work), a cross-stitch chart with a counter, the phone's arrow buttons and
// a pair of keycaps with a legend. The bar replaced all of them by instruction.
// The arrow keys and the swipe still turn the deck (router.js); they are simply
// no longer advertised.
//
// IT NAVIGATES BY data-route, NOT BY CALLING THE ROUTER.
// Every control is a real <a href>. The router already delegates clicks on
// a[data-route] from the document, so the bar needs no reference to it, works
// under a middle click and a right click like any other link, and is a correct
// page for a reader with no JavaScript at all. This file writes two things:
// which of the four is the page the reader is on, and whether the bar is out
// of the way.
//
// IT GETS OUT OF THE WAY (2026-09-26). The bar lost its box -- it is a hairline
// over the card names now -- so a long page scrolling up under it would run its
// words through them. It slides away while the reader scrolls DOWN (they are
// reading) and comes back the moment they scroll UP (they are looking for
// something) or reach the top: the pattern every long-form reading site uses.
// A little hysteresis on each side, so a trackpad's jitter does not flap it.

import { DECK } from "./router.js";

export function createChrome({ scope } = {}) {
  const root = document.getElementById("chrome");
  if (!root) return { setPage() {} };
  const links = [...root.querySelectorAll("[data-nav]")];

  function setPage(route) {
    const name = route?.name;
    // A PROJECT SHEET IS INSIDE CARD THREE, so the bar marks Projects there --
    // as where you are, not as the page you are on: `location` rather than
    // `page`, because the link goes to the card and not to this sheet. Off the
    // deck (a 404) nothing is marked, because the reader is not in the piece.
    const here = name === "project" ? "projects" : DECK.includes(name) ? name : null;
    for (const a of links) {
      const on = a.dataset.nav === here;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", name === "project" ? "location" : "page");
      else a.removeAttribute("aria-current");
    }
    document.body.classList.toggle("on-project", name === "project");
    document.body.classList.toggle("off-deck", !here);
    // a new page starts with the bar showing
    lastY = window.scrollY; acc = 0; away(false);
  }

  // ── OUT OF THE WAY ─────────────────────────────────────────────────────
  // One read of scrollY per frame, from the scroll event: nothing here reads
  // layout, and the bar moves on the compositor (a transform).
  const bar = root.querySelector?.(".topnav") ?? null;
  const TOP = 48, HIDE = 24, SHOW = 10;
  let lastY = window.scrollY, acc = 0, rid = 0, isAway = false;
  function away(on) {
    if (on === isAway || !bar) return;
    isAway = on;
    bar.classList.toggle("is-away", on);
  }
  function check() {
    rid = 0;
    const y = window.scrollY, d = y - lastY;
    lastY = y;
    if (y < TOP) { acc = 0; away(false); return; }
    // accumulate travel in one direction; a change of direction starts over
    acc = d > 0 ? Math.max(0, acc) + d : d < 0 ? Math.min(0, acc) + d : acc;
    if (acc > HIDE) away(true);
    else if (acc < -SHOW) away(false);
  }
  const onScroll = () => { if (!rid) rid = requestAnimationFrame(check); };
  window.addEventListener("scroll", onScroll, { passive: true });
  scope?.add?.(() => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rid); });

  return { setPage, scope };
}
