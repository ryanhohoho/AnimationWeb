// homeLinks.js — THE THREE WAYS TO REACH HIM, UNDER THE HOME BIO
//
// LinkedIn, GitHub and email, each a glyph in ink inside a hairline square
// (index.html, by instruction 2026-10-04). Pointed at, the ink clears and the
// same glyph becomes a window onto the sky: the hole is the project cards'
// icon (deck.js, kind "icon"), a canvas masked to the glyph and faded by
// --open, so there is nothing new in the press for it.
//
// WHY THE INK HAS TO GO, and not simply have the sky laid over it: the sky is
// a print, mostly paper with dots on it, so a glyph of sky over a glyph of ink
// reads as ink with a few pale dots -- the hole would be invisible. The ink
// leaves a beat AHEAD of the sky arriving (the 1.15, as on the cards), so there
// is never a frame of both.
//
// ONE HOLE, ONE TWEEN, as on the projects card and for the same reason
// (cards.js): the deck keeps exactly one open icon, so two tweens would fight
// over it. The home sheet's own pair is null, which the deck reads as its
// defaults: these are the site's links, not a project's.
//
// Nothing here reads layout: the holes were measured at bind(), and a hover
// writes two numbers.

import { reducedMotion } from "../utils/motion.js";

const TWEEN_MS = reducedMotion ? 0 : 200;

export function mountHomeLinks({ scope, deck }) {
  const recs = [...document.querySelectorAll("#doc .hs-a")].map((a) => ({
    a, ap: a.querySelector("[data-icon-ap]"), glyph: a.querySelector(".hs-g")
  })).filter((r) => r.ap);
  if (!recs.length || !deck) return;

  let active = null, amt = 0, want = 0, raf = 0, last = 0;
  const paint = () => {
    if (!active) { deck.setMaskHole(null); return; }
    const took = deck.setMaskHole(amt > 0 ? active.ap : null, amt);
    // the ink only leaves if there is a sky to take its place (no press yet:
    // a slow network, no WebGL) -- otherwise the glyph would just vanish
    if (active.glyph) active.glyph.style.opacity = took ? String(Math.max(0, 1 - amt * 1.15)) : "";
  };
  const tick = (now) => {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const d = TWEEN_MS ? (1000 / TWEEN_MS) * dt : 1;
    amt = want > amt ? Math.min(want, amt + d) : Math.max(want, amt - d);
    paint();
    if (amt !== want) { raf = requestAnimationFrame(tick); return; }
    last = 0;
    if (amt === 0 && active) { if (active.glyph) active.glyph.style.opacity = ""; active = null; deck.setMaskHole(null); }
  };
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const open = (r) => {
    // handing over is instant on the way out: the old hole is gone the moment
    // the new one takes it, so its ink comes straight back
    if (active && active !== r) { if (active.glyph) active.glyph.style.opacity = ""; amt = 0; }
    active = r; want = 1; kick();
  };
  const close = (r) => { if (active === r) { want = 0; kick(); } };

  const sig = scope?.signal;
  for (const r of recs) {
    // a mouse, not a finger: a tap latches a hover until the next tap, and a
    // tap on these leaves the page anyway
    r.a.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") open(r); }, { signal: sig });
    r.a.addEventListener("pointerleave", () => close(r), { signal: sig });
    r.a.addEventListener("focus", () => open(r), { signal: sig });
    r.a.addEventListener("blur", () => close(r), { signal: sig });
  }
  scope?.add(() => {
    if (raf) cancelAnimationFrame(raf);
    for (const r of recs) if (r.glyph) r.glyph.style.opacity = "";
    deck.setMaskHole(null);
  });
}
