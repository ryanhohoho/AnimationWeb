// gate.js — THE GATE
//
// The work does not sit in a grid and it does not sit in a carousel. It runs
// through a GATE: one hole in the sheet, fixed, with the plates advancing behind
// it one at a time — which is what a projector is, and "PROJECTOR / EDEN" is one
// of the posters this whole sheet is descended from (RYAN.txt V).
//
// Why a gate and not four windows side by side:
//   · four windows is a grid, and a grid gives every project the same weight and
//     asks you to compare them. A gate gives you one at a time and asks you to
//     look at it.
//   · the sheet's rule is one or two inks. Each project owns a different second
//     ink (projects.js). Four at once would break the rule; one at a time keeps
//     it, and turns the colour into the thing that changes.
//   · a hole that things pass through is the same object as the rest of the
//     page. Nothing new had to be invented to hold the work.
//
// Nothing here draws. The hole is the sheet's; the advance bar is one scaleX on
// the compositor; the only thing that changes between projects is which pair of
// inks that hole is pulled in.

import { PROJECTS } from "./projects.js";

const DWELL_MS = 6200;      // long enough to read the caption without waiting

export function createGate({ scope, deck }) {
  const root = document.querySelector("[data-gate]");
  if (!root) return null;

  const bar = document.querySelector("[data-advance]");
  const stops = [...document.querySelectorAll("[data-stop]")];
  const out = {
    n: document.querySelector("[data-fr-n]"),
    title: document.querySelector("[data-fr-title]"),
    kind: document.querySelector("[data-fr-kind]"),
    open: document.querySelector("[data-fr-open]"),
    open2: document.querySelector("[data-fr-open2]")
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0;
  let timer = 0;
  let held = false;          // pointer or focus is on the gate
  let onScreen = false;

  // ── the plate ────────────────────────────────────────────────────────────
  // There is no plate any more, and that is the point. The gate used to hold
  // three offscreen JS presses — three still bitmaps in three inks, which by
  // the time the sheet itself was live and moving had become the only dead
  // thing on the page, and in the wrong colours besides.
  //
  // It is now simply a HOLE, like every other hole, cut by the sheet's own
  // shader — except that this one is pulled in the project's pair rather than
  // the sheet's. Same weather, same lattice, same clock, zero extra work, and
  // it can never drift out of step with the page it is a window onto.
  function pressAll() {
    const p = PROJECTS[i];
    deck.setAltInk(root, p.inkA, p.ink);
  }

  // ── the caption ──────────────────────────────────────────────────────────
  function show(k, instant = false) {
    i = ((k % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;
    const p = PROJECTS[i];

    if (out.n) out.n.textContent = p.n;
    if (out.title) out.title.textContent = p.title;
    // A NUMBER, A NAME, AND WHAT KIND OF THING IT IS.
    // The description, the ink and the argument all used to be printed here.
    // They are gone on purpose: a paragraph at the gate is a paragraph read
    // standing in the doorway, and every one of those sentences reads better
    // on the sheet it belongs to.
    if (out.kind) out.kind.textContent = `${p.kind} · ${p.year}`;
    // the title IS the link; only its href changes, never its contents
    if (out.open) out.open.setAttribute("href", `/projects/${p.slug}`);
    if (out.open2) out.open2.setAttribute("href", `/projects/${p.slug}`);
    root.setAttribute("href", `/projects/${p.slug}`);
    root.setAttribute("aria-label", `Open ${p.title} — ${p.sub}`);
    stops.forEach((s, k2) => s.classList.toggle("on", k2 === i));
    deck.setAltInk(root, p.inkA, p.ink);   // the window changes colour, not content
    restart();
  }

  // ── the advance ──────────────────────────────────────────────────────────
  // The hairline under the gate fills over the dwell. It is there because the
  // gate moves on its own, and a thing that moves on its own without warning is
  // a thing that took the page away from you.
  function restart() {
    clearTimeout(timer);
    if (bar) {
      bar.style.transition = "none";
      bar.style.transform = "scaleX(0)";
      // force the reset to land before the fill starts
      void bar.offsetWidth;
    }
    if (!onScreen || held || reduced) return;
    if (bar) {
      bar.style.transition = `transform ${DWELL_MS}ms linear`;
      bar.style.transform = "scaleX(1)";
    }
    timer = setTimeout(() => show(i + 1), DWELL_MS);
  }

  const hold = (on) => { held = on; restart(); };
  const opts = { signal: scope?.signal };
  root.addEventListener("pointerenter", () => hold(true), opts);
  root.addEventListener("pointerleave", () => hold(false), opts);
  root.addEventListener("focusin", () => hold(true), opts);
  root.addEventListener("focusout", () => hold(false), opts);

  stops.forEach((s, k) => {
    s.addEventListener("click", (e) => { e.preventDefault(); show(k); }, opts);
  });

  // nothing advances, and no timer exists, while the gate is off screen
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) { pressAll(); restart(); } else clearTimeout(timer);
  }, { threshold: 0.25 });
  io.observe(root);
  scope?.add(() => { io.disconnect(); clearTimeout(timer); });

  let debounce = 0;
  window.addEventListener("resize", () => {
    clearTimeout(debounce);
    debounce = setTimeout(pressAll, 300);
  }, { passive: true, signal: scope?.signal });
  scope?.add(() => clearTimeout(debounce));

  show(0, true);
  pressAll();

  return {
    get index() { return i; },
    get project() { return PROJECTS[i]; },
    show
  };
}
