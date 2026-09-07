// chrome.js — THE PART OF THE PAGE THAT DOES NOT TURN
//
// The counter, the stitch chart, the mobile arrows and the two exit discs --
// back, and home. All of it lives OUTSIDE #doc, which is the whole reason it exists as
// its own thing: #doc is replaced wholesale on every navigation, so anything
// inside it is destroyed and rebuilt, and navigation furniture that flickers
// once per move is worse than none.
//
// It also means the chrome is static markup in index.html and this file only
// ever updates state. The first paint therefore has a working navigation before
// a single module has loaded, which is the same argument that keeps the summary
// card in index.html.
//
// IT NAVIGATES BY data-route, NOT BY CALLING THE ROUTER.
// Every control here is a real <a href>. The router already delegates clicks on
// a[data-route] from the document, so the chrome needs no reference to it, works
// under a middle click and a right click like any other link, and is a correct
// page for a reader with no JavaScript at all. The only thing this file writes
// is which href the two mobile arrows currently point at.

import { DECK, PATH } from "./router.js";
import { PROJECTS } from "./projects.js";

export function createChrome({ scope, deck }) {
  const root = document.getElementById("chrome");
  if (!root) return { setPage() {} };

  const count = root.querySelector("[data-count]");
  const dots = [...root.querySelectorAll("[data-dot]")];
  const prev = root.querySelector("[data-prev]");
  const next = root.querySelector("[data-next]");
  const back = root.querySelector("[data-back]");
  const home = root.querySelector("[data-home]");

  const pad = (v) => String(v).padStart(2, "0");

  function setPage(route) {
    const name = route?.name;
    const onDeck = DECK.indexOf(name);
    const proj = name === "project" ? PROJECTS.indexOf(route.project) : -1;
    const isProject = proj >= 0;

    root.classList.toggle("on-project", isProject);
    // the sheets indent their top-left cluster to make room for the discs, and
    // home stands aside for the back arrow -- both are rules about the PAGE, so
    // the flag goes on the body and not on the chrome
    document.body.classList.toggle("on-project", isProject);

    // ── THE CHART ALWAYS COUNTS THE DECK ────────────────────────────────
    // Four cells, always, even two levels down -- because the chart is the whole
    // piece and a stitch chart that changed size as you moved through it would
    // not be a chart. A project sheet is not a fifth card, it is somewhere
    // INSIDE card three, so card three is worked and doubled and the legend says
    // which of the three you are on. That is one sentence about one place,
    // rather than two numbers about two.
    const here = Math.max(0, onDeck < 0 && isProject ? DECK.indexOf("projects") : onDeck);
    for (let k = 0; k < dots.length; k++) {
      const d = dots[k];
      const cur = isProject ? k === DECK.indexOf("projects") : k === here;
      d.classList.toggle("on", cur);
      // stitches behind you stay worked, in a faded thread: a chart fills in
      d.classList.toggle("done", k < here && !cur);
      // ...and the one you are standing INSIDE is doubled
      d.classList.toggle("deep", cur && isProject);
      if (cur) d.setAttribute("aria-current", "page");
      else d.removeAttribute("aria-current");
    }
    if (count) {
      count.textContent = isProject
        ? `${pad(here + 1)} / ${pad(DECK.length)} — ${pad(proj + 1)} of ${pad(PROJECTS.length)}`
        : `${pad(here + 1)} / ${pad(DECK.length)}`;
    }

    // ── the mobile arrows ───────────────────────────────────────────────
    // There are no arrow keys on a phone, so these are the only way through the
    // deck there. On a project sheet they step between projects and the back
    // arrow is what leaves, which is the same shape the keyboard has.
    const stepTo = (d) => {
      if (isProject) {
        const j = proj + d;
        return (j >= 0 && j < PROJECTS.length) ? `/projects/${PROJECTS[j].slug}` : null;
      }
      const j = (onDeck < 0 ? 0 : onDeck) + d;
      return (j >= 0 && j < DECK.length) ? PATH[DECK[j]] : null;
    };
    for (const [el, d] of [[prev, -1], [next, 1]]) {
      if (!el) continue;
      const href = stepTo(d);
      // an end is an end: the control stays visible and goes inert, so the
      // reader can SEE that they have reached one rather than pressing into
      // nothing and wondering whether it is broken
      if (href) { el.setAttribute("href", href); el.removeAttribute("aria-disabled"); }
      else { el.removeAttribute("href"); el.setAttribute("aria-disabled", "true"); }
    }

    // ── THE TWO DISCS ───────────────────────────────────────────────────
    // Both are fixed to the window and both are a small circle of sky, printed
    // in the HOME sheet's own pair rather than in whichever sheet they happen to
    // be standing on -- because a disc is a window onto where you are GOING, not
    // onto where you are, and a control that belongs to the site should not
    // change colour with the page. Passing no inks is what asks for that pair;
    // the press reads null as its defaults.
    //
    // HOME IS ON EVERY PAGE BUT ITS OWN. The chart in the other corner has
    // always linked to it, and that was the answer to a different question: a
    // chart says where you are in a piece, and it is read as a position rather
    // than as a way out. A visible exit is a different object, and the deck
    // needed one -- three of the four cards had no way back to the start but the
    // arrow keys, and a project sheet had one that only went up a level.
    //
    // It is hidden on the summary itself rather than shown inert, because a
    // control that leads where you already are is furniture, not navigation.
    //
    // REVEAL, THEN MEASURE, and the order is a bug already paid for once:
    // commit() calls deck.bind() before onPage, so a control still hidden when
    // the deck takes its measurements has no rectangle at all -- it is skipped
    // and its sky is never drawn. One extra layout read per navigation, on a
    // path that already does several; it is the hover path that must never
    // measure, not this one.
    //
    // AND ONE REMEASURE FOR BOTH. They are both fixed and both change on the
    // same route, so asking twice would do the same full pass twice.
    let moved = false;
    for (const [el, want] of [[back, isProject], [home, name !== "home"]]) {
      if (!el) continue;
      if (el.hidden !== !want) { el.hidden = !want; moved = true; }
    }
    // home also SHIFTS when the back arrow appears beside it (body.on-project),
    // which is a new rectangle without a hidden flag changing -- so a project
    // page always remeasures whether or not anything was revealed
    if (moved || isProject) deck?.remeasure();
  }

  return { setPage };
}
