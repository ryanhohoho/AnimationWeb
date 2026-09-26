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
// page for a reader with no JavaScript at all. The only thing this file writes
// is which of the four is the page the reader is on.

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
  }

  return { setPage, scope };
}
