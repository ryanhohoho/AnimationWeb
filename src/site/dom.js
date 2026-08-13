// dom.js
// content DATA -> semantic DOM, with the ASCII layer's hooks on it.
//
// This is phase 4's replacement for renderContent.js, and router.js already
// takes it as an injected `render` -- which is why swapping it in touches
// exactly one line of main.js and nothing in the router.
//
// -- the contract, and it is not negotiable (bible 7.1) ---------------------
// The DOM is the LAYOUT ENGINE and the ACCESSIBILITY LAYER. The canvas paints
// what it means. So every element built here is a real heading, paragraph,
// link or list item:
//
//   * text is `color: transparent`. NEVER `aria-hidden`, NEVER
//     `visibility: hidden`, never a zero size, never moved off screen. It
//     reflows, it measures, it takes focus, it selects with the cursor, and a
//     screen reader reads the page as an ordinary document.
//   * links are real <a href> elements. Right-click-open-in-new-tab works,
//     :focus-visible works, and the browser's own focus order is the focus
//     order -- we never reimplement any of it.
//
// -- which elements become ASCII -------------------------------------------
// Only the ones big enough to survive bible 4.4's rules: the h1 and the nav
// links, both set at poster scale for exactly that reason. Everything else --
// body copy, list items, section headings at reading size -- is VOICE (bible
// 3.2), real ink text in IBM Plex Mono, and it EXISTS SO THE EYE HAS SOMEWHERE
// TO REST. A page where literally everything is a crowd is exhausting.
//
// An element opts in with `data-ascii`, and KEEPS THE OPT-IN FOR EVER. If
// words.js decides it cannot be made legible at the current breakpoint, the
// element gains the VOICE class instead -- one class, applied by the same code
// path that measures, and removed again the moment a wider window makes the
// word work.

import { siteConfig } from "../config/siteConfig.js";
import { stageCss } from "./stage.js";

export const ASCII_ATTR = "data-ascii";
export const VOICE_CLASS = "voice";

/**
 * every element opted in to ASCII rendering, in document order.
 *
 * THE OPT-IN IS PERMANENT; ONLY THE OUTCOME CHANGES. `data-ascii` says "this
 * element wants to be made of the field"; the VOICE class says "it could not
 * be, at this breakpoint". Removing the attribute on failure -- which is what
 * this did first -- makes the fallback one-way: a heading that could not make
 * a 2-cell stem in a narrow window stays plain text forever after, including
 * once the window is dragged wide enough for it to work. Every layout
 * re-decides, from scratch.
 */
export function asciiElements(root = document) {
  return [...root.querySelectorAll(`[${ASCII_ATTR}]`)];
}

/**
 * an element falls back to VOICE. Loud, because an illegible heading that
 * silently disappeared is worse than one that never tried.
 */
export function fallbackToVoice(el, reason) {
  if (!el.classList.contains(VOICE_CLASS)) {
    console.warn(`[type] "${(el.textContent || "").slice(0, 40)}" falls back to VOICE: ${reason}`);
  }
  el.classList.add(VOICE_CLASS);
}

/** ...and back again, when a wider breakpoint makes the word legible. */
export function restoreAscii(el) {
  el.classList.remove(VOICE_CLASS);
}

/** the document-space rect of an element, which is the space the field works in. */
export function docRect(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
}

/**
 * the document-space rect of an element's INK, not of its box.
 *
 * A block element's box is as wide as its container, so an h1 reading
 * WHO AM I reports 1177 px on a 1512 px viewport while its letters occupy 430.
 * Two things downstream care, and both were wrong with the box:
 *
 *   * PRESENCE (bible 4.2) is anchored to where the page has something to say.
 *     Anchored to boxes instead, a single heading claims the full width of the
 *     viewport and the composition quietly flattens back toward the
 *     wall-to-wall texture presence exists to fix.
 *   * the word raster is allocated at the rect's size, so a full-width box
 *     rasterizes two and a half times the pixels the word needs, on every
 *     layout.
 *
 * A Range over the element's own contents measures the line boxes, which is
 * exactly the ink. For a wrapped paragraph that is still the full column, and
 * correctly so -- the text really is that wide.
 */
export function inkRect(el) {
  if (!el.firstChild) return docRect(el);
  const range = document.createRange();
  range.selectNodeContents(el);
  const r = range.getBoundingClientRect();
  range.detach?.();
  if (!r || r.width < 1 || r.height < 1) return docRect(el);
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
}

// ---------------------------------------------------------------------------

/** one <article> per route: an <h1> at poster scale, then VOICE sections. */
export function renderRoute(content) {
  const article = document.createElement("article");
  article.className = "route";

  const h1 = document.createElement("h1");
  h1.textContent = content.title;
  h1.setAttribute(ASCII_ATTR, "heading");
  article.appendChild(h1);

  for (const section of content.sections || []) {
    if (section.heading) {
      const h2 = document.createElement("h2");
      h2.textContent = section.heading;
      // h2s are set at reading size, so they are VOICE by construction rather
      // than by a failed measurement -- see bible 4.4 rule 2's minimum size.
      h2.classList.add(VOICE_CLASS);
      article.appendChild(h2);
    }
    for (const line of section.body || []) {
      const p = document.createElement("p");
      p.className = VOICE_CLASS;
      p.textContent = line;
      article.appendChild(p);
    }
    if (section.list && section.list.length) {
      const ul = document.createElement("ul");
      ul.className = VOICE_CLASS;
      for (const item of section.list) {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      }
      article.appendChild(ul);
    }
  }
  return article;
}

/**
 * the persistent nav, built ONCE by router.start() and never rebuilt on
 * navigation -- only its aria-current is touched. Its links are ASCII: bible
 * 6.3 says a link's word is dormant in the field until approached, and
 * approaching it is what GATHER is for.
 */
export function renderNav(routes) {
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "primary");
  const ul = document.createElement("ul");
  for (const route of routes) {
    if (!route.navLabel) continue;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = route.path;
    a.textContent = route.navLabel;
    a.setAttribute(ASCII_ATTR, "link");
    li.appendChild(a);
    ul.appendChild(li);
  }
  nav.appendChild(ul);
  return nav;
}

/**
 * the styles the ASCII layer needs, injected once. They live here rather than
 * in index.html because they are a consequence of THIS module's decisions
 * (which elements are ASCII, which are VOICE) and would go stale the moment
 * that changed.
 *
 * The type scale is the one thing here that is a LOOK decision rather than a
 * mechanism, and it is set by bible 3.6 rather than by taste: size is a ROW
 * COUNT times the cell height, seven rows to be legible and nine to be
 * comfortable. It used to be min(13vw, cell-w * 26), which produced a 166 px
 * heading against 15 px body -- eleven times the body, i.e. a billboard.
 */
export function injectStyles(scope) {
  const id = "type-layer-styles";
  if (document.getElementById(id)) return;
  const css = `
    :root {
      --paper: ${siteConfig.color.paper};
      --ink: ${siteConfig.color.ink};
    }
    /* THE PLANE, not a document (bible 7.1a). #doc is the WINDOW onto it, so it
       is exactly the viewport and it clips -- the plane is nine screens wide and
       the browser must not offer to scroll around it.

       IT HAS TO BE GIVEN A SIZE. Every panel inside the stage is absolutely
       positioned, so #doc's content height is zero; left in the flow with
       overflow hidden it clips to a zero-height box and every piece of REAL
       INK on the page disappears. The ascii still painted -- that is the canvas,
       a different layer -- so the page looked almost right and had lost all its
       VOICE text, which is the one thing on it that is actually readable
       (bible 3.2).

       The panels carry their own padding: a padded #doc would offset every
       panel on the map by the same amount and the camera would be half a gutter
       out at every cell. */
    #doc { position: fixed; inset: 0; z-index: 1; overflow: hidden; }
    ${stageCss()}
    #doc nav ul, #doc ul.${VOICE_CLASS} { list-style: none; }
    /* the nav is a STACK, not a row, and that is a consequence of the type
       scale below rather than a taste: four words this size do not sit on one
       line, and wrapping them puts arbitrary breaks in the most important
       navigation on the site. Stacked, it reads as the constructivist,
       editorial register of the architectural reference in bible 2 -- runs of
       text along the grid axes, defining the page. */
    #doc nav ul { display: flex; flex-direction: column; }
    #doc nav { margin: 0 0 7vmin; }

    /* ASCII: transparent, but present. It reflows, measures, focuses, selects
       and reads. The canvas paints it.

       The :not(.voice) is what makes the fallback reversible -- an element that
       failed bible 4.4 at this breakpoint keeps its opt-in and simply stops
       being styled as ASCII, so a wider window can hand it back. */
    #doc [${ASCII_ATTR}]:not(.${VOICE_CLASS}) {
      color: transparent;
      font-family: ${siteConfig.words.rasterFamily};
      font-weight: ${siteConfig.words.rasterWeight};
      line-height: 1.02;
      letter-spacing: -0.01em;
      /* LOWERCASE, and the row scale below is unchanged by it -- which is a
         claim that had to be MEASURED, because the arithmetic points the other
         way and the obvious fix is the wrong one.

         Bible 4.4 rule 3 counts rows of CAP height, and lowercase draws at the
         x-height: 0.547 em against a 0.729 em cap for the rendered stack, so a
         nav label sized from 7 cap rows puts 5.5 rows of actual letterform on
         the screen. That reads as a rule 3 failure. It is not: rule 3 is
         quoting the classic 5x7 bitmap floor, where the SEVEN rows run
         ascender-to-baseline and lowercase sits in about five of them. 5.5
         rows of x-height with ascenders reaching seven IS that proportion.

         What lowercase genuinely broke was rule FOUR -- the counters, which are
         three quarters the size at the same cell -- and the fix is
         words.slotCoverageMin, where the problem actually is. Re-deriving the
         scale from x-height instead would have looked more principled and would
         have put the h1 at 115 px, 7.2x the body: most of the way back to the
         billboard that bible 3.6 exists to stop. Rule 5 is the arbiter, and
         every label that stays ASCII survives the squint at all five
         breakpoints. */
      text-transform: lowercase;
      margin: 0;
    }
    /* THE TYPE SCALE IS MEASURED IN ROWS (bible 3.6), and this replaced
       min(13vw, cell-w * 26).

       That formula produced a 166 px heading against 15 px body copy --
       ELEVEN TIMES the body, which is not a heading, it is a billboard. It
       came out of the old rules 2 and 4 demanding a two-cell stem AND a bare
       counter out of a 7 px cell, and the only cap height that satisfies both
       is 80-130 px. The cell is 4 x 7 now and the size follows from a row
       count instead:

           cap height (px) = capRows x cellHeight
           font-size  (px) = cap height / capHeightRatio

       Seven rows to be legible, nine to be comfortable. At the base cell that
       is 49 px and 63 px of cap, i.e. 3.1x and 3.9x the 16 px body -- and a 2x
       ratio simply is not reachable, because 2x is a 22 px cap and nobody can
       draw a letter in three rows.

       --cell-h is published by field.js at every layout, so this tracks the
       breakpoint AND the device-pixel floor by itself. That is the whole
       reason it is not in viewport units: the 1600 px breakpoint used to fail
       because the cell stepped 7 -> 8 while a clamped vw font size did not,
       and three of four nav words fell out of ASCII on a WIDER screen.

       NEVER PUT A BACKTICK IN HERE. This css lives in a template literal, so a
       backtick anywhere inside it -- including in this comment -- terminates
       the string and the whole module fails to parse. The page then renders
       with no styles, no routes and no field, and the console says nothing
       useful. HANDOFF.md records this costing two rounds on the GLSL side; it
       has now cost a third here. sim.test.js imports this file for that reason. */
    #doc h1[${ASCII_ATTR}]:not(.${VOICE_CLASS}) {
      font-size: calc(var(--cell-h, 7px) * ${siteConfig.type.h1CapRows} / ${siteConfig.type.capHeightRatio});
      margin: 0 0 5vmin;
    }
    #doc a[${ASCII_ATTR}]:not(.${VOICE_CLASS}) {
      font-size: calc(var(--cell-h, 7px) * ${siteConfig.type.linkCapRows} / ${siteConfig.type.capHeightRatio});
      text-decoration: none; display: inline-block;
    }
    /* THE NARROW RULE, and it is a reading of bible 4.4 rule 3 rather than a
       transcription of it. Nine rows at the base cell puts CASE STUDIES at
       648 px, which does not fit a phone -- and a heading the browser wrapped
       cannot be rasterized as one line at all, so words.js sends it to VOICE.
       Rule 3 says seven rows is legible, so a narrow screen gets the legible
       size rather than nothing at all. Below seven rows there is no smaller
       ascii option and VOICE is the answer, which is bible 4.4's own
       conclusion and the thing it says to design around rather than fight. */
    @media (max-width: ${siteConfig.type.narrowMaxWidth}px) {
      #doc h1[${ASCII_ATTR}]:not(.${VOICE_CLASS}) {
        font-size: calc(var(--cell-h, 7px) * ${siteConfig.type.h1CapRowsNarrow} / ${siteConfig.type.capHeightRatio});
      }
    }
    /* a word that fell back is VOICE like any other: reading size, real ink,
       and it keeps the underline that says it is a link. */
    #doc h1[${ASCII_ATTR}].${VOICE_CLASS} { font-size: 26px; letter-spacing: 0.02em; margin: 0 0 4vmin; }
    #doc a[${ASCII_ATTR}].${VOICE_CLASS} { font-size: ${siteConfig.type.bodyPx}px; letter-spacing: 0.06em; }

    /* VOICE (bible 3.2): real ink, rendered normally, so the eye has somewhere
       to rest. The rare piece of plain text is what makes the crowds read as
       deliberate. */
    #doc .${VOICE_CLASS}, #doc .${VOICE_CLASS} * {
      color: var(--ink);
      font-family: ${siteConfig.words.rasterFamily};
      font-weight: ${siteConfig.type.voiceWeight};
    }
    #doc p.${VOICE_CLASS} { font-size: ${siteConfig.type.bodyPx}px; line-height: 1.7; max-width: 34em; margin: 0 0 1.2em; }
    #doc h2.${VOICE_CLASS} { font-size: ${siteConfig.type.bodyPx}px; letter-spacing: 0.14em; text-transform: uppercase; margin: 3em 0 1em; }
    #doc ul.${VOICE_CLASS} { font-size: ${siteConfig.type.bodyPx}px; line-height: 1.7; margin: 0 0 1.2em; }

    /* keyboard focus must stay visible: the canvas cannot know about it in
       time, and GATHER resolving the word is a paint, not an affordance. */
    #doc a:focus-visible { outline: 2px solid var(--ink); outline-offset: 6px; }
  `;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  if (scope) scope.add(() => style.remove());
}

export default {
  renderRoute, renderNav, injectStyles, asciiElements, fallbackToVoice, docRect, inkRect
};
