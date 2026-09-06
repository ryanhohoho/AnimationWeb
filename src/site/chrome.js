// chrome.js — THE PART OF THE PAGE THAT DOES NOT TURN
//
// The counter, the dots, the progress rule, the mobile arrows and the back
// arrow. All of it lives OUTSIDE #doc, which is the whole reason it exists as
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
  const prog = root.querySelector("[data-prog]");
  const dots = [...root.querySelectorAll("[data-dot]")];
  const prev = root.querySelector("[data-prev]");
  const next = root.querySelector("[data-next]");
  const back = root.querySelector("[data-back]");

  const pad = (v) => String(v).padStart(2, "0");

  function setPage(route) {
    const name = route?.name;
    const onDeck = DECK.indexOf(name);
    const proj = name === "project" ? PROJECTS.indexOf(route.project) : -1;
    const isProject = proj >= 0;

    root.classList.toggle("on-project", isProject);
    // the sheets indent their top-left cluster to make room for the back
    // control, which is why this is on the BODY and not on the chrome
    document.body.classList.toggle("on-project", isProject);

    // ── the counter and the rule ────────────────────────────────────────
    // On a project sheet they count PROJECTS, because that is the list the
    // reader is actually inside. A deck position of "03 / 04" while you are two
    // levels down it is a number about somewhere you are not.
    const i = isProject ? proj : Math.max(0, onDeck);
    const n = isProject ? PROJECTS.length : DECK.length;
    if (count) count.textContent = `${pad(i + 1)} / ${pad(n)}`;
    if (prog) prog.style.width = `${((i + 1) / n) * 100}%`;

    for (const d of dots) {
      const k = d.getAttribute("data-dot");
      d.classList.toggle("on", !isProject && k === name);
      // a project sheet hangs off card three, so that is the one still lit
      d.classList.toggle("under", isProject && k === "projects");
      if (!isProject && k === name) d.setAttribute("aria-current", "page");
      else d.removeAttribute("aria-current");
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

    // ── the back arrow ──────────────────────────────────────────────────
    // Fixed to the window and cut straight out of the paper: it is the same kind
    // of object as every other hole on the sheet, and it prints in the HOME
    // sheet's own pair rather than this project's -- because it is a window onto
    // where you are going, not onto where you are. Passing no inks is what asks
    // for that pair; the press reads null as its defaults.
    // REVEAL IT, THEN MEASURE IT. In that order, and the order is a bug already
    // paid for once: commit() calls deck.bind() before onPage, so the control is
    // still hidden when the deck takes its measurements -- and a hidden element
    // has no rectangle, so it was skipped and its sky was never drawn. One extra
    // layout read per navigation, on a path that already does several; it is the
    // hover path that must never measure, not this one.
    if (back) {
      const was = back.hidden;
      back.hidden = !isProject;
      if (isProject || !was) deck?.remeasure();
    }
  }

  return { setPage };
}
