// pages/deck.js — THE THREE CARDS THAT ARE NOT THE SUMMARY
//
// One file rather than three, and that is a judgement about substance: these are
// one-screen cards whose renderers are a dozen lines each, sharing one shell and
// one stagger. Three files would be three headers explaining the same thing. The
// project SHEETS still get a file each, because they are long documents with
// arguments in them; a card is a list.
//
// The summary card is not here. It ships as markup inside index.html so the very
// first paint of the site needs no JavaScript at all, and the router captures it
// once as the home template — one copy, no drift. That property is worth more on
// the landing page than tidiness is.
//
// THE STAGGER IS --i, AND IT COSTS NOTHING.
// Every element that should arrive in sequence carries `style="--i:n"`, and one
// CSS rule turns that into an animation-delay. Replacing #doc re-inserts these
// nodes, and a CSS animation on a freshly inserted node runs on its own — so the
// entrance replays on every navigation with no JS driving it, and there is no
// per-element bookkeeping to get out of step with the markup.

import { EXPERIENCE, SOCIALS } from "../content.js";
import { PROJECTS } from "../projects.js";
import { glyphUrl } from "../iconatlas.js";
import { cardStill, cardVideo } from "../content.js";

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** the shared shell. An eyebrow, a heading, and the thing itself. */
function shell(id, node, hour, eyebrow, heading, body) {
  return `<section class="plate deckpage" id="${id}" data-node="${node}">
  <div class="corner tr deck-hour"><p class="t dim">${esc(node)}</p><p class="t">${esc(hour)}</p></div>
  <div class="deck-in">
    <!-- ONE SMALL ROUND CUT, ABOVE EVERYTHING ELSE ON THE CARD.
         Without a hole a card is all paper, and the night walking across the
         deck -- 19:00 on the summary to a quarter past midnight here -- would
         be something the code does that nobody can ever see.

         It is a CIRCLE, which nothing else on this sheet is: every other
         die-cut is a rectangle because a die-cut is a rectangle, and the one
         exception reads as a lens rather than as a window. It sits above the
         section's own name because that is where a lens belongs -- you look
         through it first, and then you read.

         A hairline ring is drawn on the DOM side, over the cut, so the circle
         still reads on the cards where the sky is at its palest. Same argument
         as the registration ticks on every other aperture: a hole can be very
         nearly the colour of the paper, and a control that vanishes is not a
         control. -->
    <span class="ap deck-hole" data-ap data-round style="--i:0"></span>
    <p class="t dim eye" style="--i:1">${esc(eyebrow)}</p>
    ${heading ? `<h1 class="d sm deck-h" style="--i:2">${esc(heading)}</h1>` : ""}
    ${body}
  </div>
</section>`;
}

// ── 02 · EXPERIENCE ─────────────────────────────────────────────────────────
function experience() {
  const rows = EXPERIENCE.map((e, i) => `
      <li class="row" style="--i:${i + 3}">
        <div class="row-head">
          <span class="row-org">${esc(e.org)}</span>
          <span class="t dim row-role">${esc(e.role)}</span>
          <span class="t dim row-loc">${esc(e.loc)}</span>
        </div>
        <p class="t dim row-when">${esc(e.when)}</p>
        <p class="t body row-what">${esc(e.what)}</p>
      </li>`).join("");
  return shell("p-experience", "02", "20:50", "EXPERIENCE", "Where I've worked",
    `<ol class="rows">${rows}\n    </ol>`);
}

// ── 03 · PROJECTS ───────────────────────────────────────────────────────────
// THE CARD IS A PIECE OF PAPER WITH A HOLE IN IT, like everything else here.
//
// Four nested elements, and each one is load-bearing:
//
//   .pcard-media  the frame. Fixed aspect, so the punched mask can never shear.
//   .pcard-cut    the punch. Carries the two-layer mask that removes the icon's
//                 shape from the picture, so the SHEET shows through it.
//   .pcard-zoom   the picture. This is the only thing that scales on hover -
//                 the cut and the hole stay exactly where they were measured, so
//                 the expansion never forces a layout read on a pointer event.
//                 It is also the gate's own thesis: the hole does not move, the
//                 plate behind it advances.
//   .pcard-glyph  the white icon at rest, sitting ON the punch and filling it.
//                 Fades out as the sky fades in, and both are driven by one
//                 tween in cards.js so they cannot disagree.
//
// The kind line is TWO spans, `kind` and `year`, rather than one string joined
// with a dot: each is its own field in projects.js, and the editor (editor/)
// can only write a word back to the one string it came from.
//
// data-icon-ap gives the deck the cell to cut; data-cross-from tells the router
// to open the crossing from here. They are on the same span as the glyph is
// centred over, so the hole, the punch, the white plate and the origin of the
// transition are one rectangle by construction.
function projects() {
  const cards = PROJECTS.map((p, i) => {
    const still = cardStill(p.slug), vid = cardVideo(p.slug), glyph = glyphUrl(p.slug);
    const media = `
          <span class="pcard-media"${glyph ? ` style="--glyph:url(${glyph})"` : ""}>
            <span class="pcard-cut">
              <span class="pcard-zoom">
                ${still ? `<img class="pcard-still" src="${still}" alt="" loading="lazy" decoding="async" />` : ""}
                ${vid ? `<video class="pcard-vid" src="${vid}" muted loop playsinline preload="none"></video>` : ""}
              </span>
            </span>
            ${glyph ? `<img class="pcard-glyph" src="${glyph}" alt="" aria-hidden="true" />` : ""}
            <span class="pcard-ap" data-icon-ap="${esc(p.slug)}" data-cross-from></span>
          </span>`;
    return `
      <li style="--i:${i + 3}">
        <a class="pcard" href="/projects/${esc(p.slug)}" data-route data-slug="${esc(p.slug)}"
           aria-label="Open ${esc(p.title)} — ${esc(p.sub)}">${media}
          <span class="pcard-meta">
            <span class="pcard-title">${esc(p.title)}</span>
            <span class="t dim pcard-kind"><span>${esc(p.kind)}</span> · <span>${esc(p.year)}</span></span>
            <span class="t body pcard-line">${esc(p.line)}</span>
          </span>
        </a>
      </li>`;
  }).join("");
  return shell("p-projects", "03", "22:45", "PROJECTS", "What I've built",
    `<ul data-e="cards-0frh" class="cards">${cards}\n    </ul>`);
}

// ── 04 · CONTACT ────────────────────────────────────────────────────────────
// No heading, on purpose: there is nothing to introduce. A label, a value, and
// a way to reach it.
function contact() {
  const rows = SOCIALS.map((sIt, i) => `
      <li class="sock${sIt.placeholder ? " unset" : ""}" style="--i:${i + 3}">
        <a class="sock-a" href="${esc(sIt.url)}"${/^https?:/.test(sIt.url) ? ` target="_blank" rel="noopener noreferrer"` : ""}>
          <span class="t dim sock-k">${esc(sIt.label)}</span>
          <span class="sock-v">${esc(sIt.shown)}</span>
          <span class="sock-arrow" aria-hidden="true">→</span>
        </a>
      </li>`).join("");
  return shell("p-contact", "04", "00:15", "CONTACT", "",
    `<ul class="socks">${rows}\n    </ul>
    <p class="t dim back-hint" style="--i:6"><a class="link" href="/" data-route>← back to the start</a></p>`);
}

const PAGES = { experience, projects, contact };

/** @param name one of the deck route names other than "home" */
export function renderDeckPage(name) {
  const f = PAGES[name];
  return f ? f() : "";
}
