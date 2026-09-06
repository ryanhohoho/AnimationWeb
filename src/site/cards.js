// cards.js — THE HOVER, AND THE ONE HOLE IT OPENS
//
// A project card is a picture with that project's icon cut clean through the
// middle of it. At rest the cut is filled by a white plate, so the icon reads as
// a solid white mark. Point at the card and the plate clears, the sheet's own
// sky shows through the shape underneath, and the picture starts moving.
//
// WHY ONLY ONE AT A TIME, AND WHY THAT IS NOT A COMPROMISE
// -------------------------------------------------------
// Three cards on screen, each wanting to print its own two inks, on a sheet
// whose entire discipline is one or two inks. Shown all at once that is six inks
// on one page and the identity system stops meaning anything -- the colour stops
// being the thing that CHANGES and becomes a thing that accumulates.
//
// So the sky is under the pointer and nowhere else. It is the same rule the gate
// enforced by showing one project at a time, moved from a timer to the reader's
// own attention, and it is why the shader needs exactly one masked hole and the
// deck needs exactly one record to track. The constraint and the design are the
// same decision.
//
// NOTHING HERE READS LAYOUT.
// The icon boxes were measured at bind(), and hover does not move them: the only
// thing that scales is .pcard-zoom, INSIDE the fixed cut. So a pointer event
// writes two numbers and never asks the browser a question -- which is the rule
// the whole deck is built on, and the reason the card grows by pushing its
// picture out rather than by growing its own box.

import { bySlug } from "./projects.js";

// 220 ms. Long enough to read as a dissolve rather than a switch, short enough
// that sweeping across three cards does not leave a trail of half-open holes.
const TWEEN_MS = 220;

// WHICH CARD THE READER LEFT BY. A project sheet's back arrow sends them to the
// list, and the paper should close back into the card they opened rather than
// into whichever one happens to be first. Module scope, because it is a fact
// about the session and not about either page.
let lastSlug = null;

export function mountCards({ scope, deck }) {
  const cards = [...document.querySelectorAll(".pcard")];
  if (!cards.length) return;

  // the crossing's landing target, set before the deck measures anything
  if (lastSlug) {
    for (const c of cards) {
      if (c.getAttribute("data-slug") !== lastSlug) continue;
      c.querySelector("[data-icon-ap]")?.setAttribute("data-cross-target", "");
    }
  }

  const recs = [];
  for (const card of cards) {
    const ap = card.querySelector("[data-icon-ap]");
    const p = bySlug(card.getAttribute("data-slug"));
    if (!ap || !p) continue;
    recs.push({
      card, ap, p,
      glyph: card.querySelector(".pcard-glyph"),
      vid: card.querySelector(".pcard-vid")
    });
    card.addEventListener("click", () => { lastSlug = p.slug; }, { signal: scope?.signal });
  }
  if (!recs.length) return;

  // ── ONE TWEEN FOR THE WHOLE PAGE ─────────────────────────────────────────
  // Not one per card. Two cards fading in opposite directions would each be
  // calling setMaskHole every frame and the last writer would win at random --
  // and worse, the losing card's fade-out would keep clearing the hole the
  // winner had just opened. There is one hole, so there is one tween that owns
  // it, and handing over is a single assignment.
  let active = null;      // the record the hole currently belongs to
  let amt = 0;            // 0..1, how open it is
  let want = 0;           // where the pointer says it should be
  let raf = 0, last = 0;

  const paint = () => {
    if (!active) { deck.setMaskHole(null); return; }
    // the plate clears slightly AHEAD of the sky arriving (the 1.15), so there
    // is never a frame with a white icon sitting on top of open sky
    if (active.glyph) active.glyph.style.opacity = String(Math.max(0, 1 - amt * 1.15));
    deck.setMaskHole(amt > 0 ? active.ap : null, amt, active.p.inkA, active.p.ink);
  };

  const tick = (now) => {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const d = (TWEEN_MS ? 1000 / TWEEN_MS : 1) * dt;
    if (want > amt) amt = Math.min(want, amt + d);
    else amt = Math.max(want, amt - d);
    paint();
    if (amt !== want) { raf = requestAnimationFrame(tick); return; }
    last = 0;
    if (amt === 0 && active) { active.glyph && (active.glyph.style.opacity = ""); active = null; deck.setMaskHole(null); }
  };
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };

  const open = (rec) => {
    if (active && active !== rec) {
      // HANDING OVER IS INSTANT ON THE WAY OUT. The old card's hole is gone the
      // moment the new one takes the uniform, so fading its white plate back in
      // would be drawing a dissolve that is not happening. Snap it.
      if (active.glyph) active.glyph.style.opacity = "";
      stopVid(active);
      amt = 0;
    }
    active = rec;
    want = 1;
    rec.vid?.play?.().catch(() => {});   // a blocked autoplay is not an error
    kick();
  };
  const close = (rec) => {
    if (active !== rec) return;
    want = 0;
    stopVid(rec);
    kick();
  };
  const stopVid = (rec) => {
    if (!rec.vid) return;
    rec.vid.pause();
    // back to frame one, so every hover starts the clip from its beginning and
    // the still you see at rest is always the same still
    try { rec.vid.currentTime = 0; } catch { /* not seekable yet */ }
  };

  for (const rec of recs) {
    const o = () => open(rec), c = () => close(rec);
    rec.card.addEventListener("pointerenter", o, { signal: scope?.signal });
    rec.card.addEventListener("pointerleave", c, { signal: scope?.signal });
    // keyboard reaches the card too: it is a link, and tabbing to it should show
    // the same thing pointing at it does
    rec.card.addEventListener("focus", o, { signal: scope?.signal });
    rec.card.addEventListener("blur", c, { signal: scope?.signal });
  }

  scope?.add(() => {
    if (raf) cancelAnimationFrame(raf);
    for (const rec of recs) stopVid(rec);
    deck.setMaskHole(null);
  });
}

/** which project the reader last opened, for the sheet they land back on */
export const lastOpenedSlug = () => lastSlug;
