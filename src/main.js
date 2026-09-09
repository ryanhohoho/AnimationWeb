// main.js
// boot: THE SITE. Four cards, a press, and the routing between them.
//
// WHY THE ANIMAL IS NOT IN THIS FILE ANY MORE
// -------------------------------------------
// The comment below has always said the sheet goes up first, before the model is
// even requested -- and it was true of the ORDER and false of the download. Every
// line of this file, three.js included, had to arrive and parse before any of it
// ran, so "first" meant first of 900 KB rather than first of anything. On a phone
// that is the whole of the site's time to interactive spent on a character that
// is not needed to read it.
//
// So the engine is a dynamic import now (src/mew.js) and this file is what is
// left: the world, the press, the routing and the chrome, none of which touch
// three at all. The sheet, the type, the navigation, the arrow keys and the
// swipe are all live before the animal is asked for; she arrives into a room
// that already exists, which is what the paragraph below always meant.
//
// If the engine chunk fails or is blocked, the site is UNCHANGED except that
// there is no mew on it. That is a correct page, not a broken one.

import { createWorld } from "./engine/world.js";
import { reducedMotion } from "./utils/motion.js";
import { createScope } from "./utils/lifecycle.js";
import { createDeck } from "./site/deck.js";
import { createChrome } from "./site/chrome.js";
import { createRouter } from "./site/router.js";
import { mountPage } from "./site/pages.js";
import "./styles/site.css";

// ONE world for the page: one event bus, one pointer, one scroll. The engine
// chunk is handed this rather than making its own, so a swipe and a startle are
// reading the same numbers.
const world = createWorld({ seed: 20260719 });

// --- the site ----------------------------------------------------------------
// THE SHEET GOES UP FIRST, and now that the engine is its own chunk this is
// true of the download as well as of the order. Type on bone paper is already
// the whole picture, so the page is finished and readable from the first frame;
// the print develops into it and mew arrives into a room that already exists.
const siteScope = createScope("site");
const deck = createDeck({ scope: siteScope });

// ROUTING WITHOUT NAVIGATION. Mew is a live WebGL context with physics and a
// brain; a real page load would kill her and start a new one, and she has to
// still be there on the other side. So the SHEET changes and the window does
// not. Every page gets its own scope, disposed the moment the next one is
// committed -- that is the whole leak story for navigation (utils/lifecycle.js).
let pageScope = null;
siteScope.add(() => pageScope?.dispose());

// THE CHROME OUTLIVES EVERY PAGE, so it is built once on the site scope and only
// updated afterwards. It is the stitch chart, the phone bar and the back
// control -- all of which sit outside #doc precisely so that the wholesale swap
// below cannot destroy and rebuild them once per navigation.
const chrome = createChrome({ scope: siteScope, deck, world });

createRouter({
  scope: siteScope,
  deck,
  world,
  onPage(route) {
    pageScope?.dispose();
    pageScope = createScope("page");
    mountPage(route, { scope: pageScope, deck });
    // after mountPage: the cards clear the masked hole as they are disposed, and
    // on a project sheet the back arrow is the thing that claims it next
    chrome.setPage(route);
  }
});
document.body.classList.remove("pre");

// ── ON PAPER ───────────────────────────────────────────────────────────────
// The print stylesheet (styles/site.css, the last block) takes the press off
// the page and leaves the document. One thing CSS cannot do for it: the project
// cards' stills are loading="lazy", so a card below the fold has no image yet
// when the print starts. Every current browser does force lazy images to load
// before printing, and "every current browser" is not a guarantee -- this is
// four lines that runs only when somebody actually prints, and then never
// matters again because the attribute is gone.
window.addEventListener("beforeprint", () => {
  for (const img of document.querySelectorAll('img[loading="lazy"]')) {
    img.loading = "eager";
  }
}, { signal: siteScope?.signal });

// ── AND THE ANIMAL ARRIVES SECOND, which it now genuinely does ─────────────
// Not awaited, not blocking, and its failure is caught: the sheet does not need
// her to be a finished page.
//
// ...AND SHE DOES NOT ARRIVE AT ALL FOR A READER WHO ASKED FOR LESS MOTION.
// She wanders, flees the pointer, flails and sprays: an autonomously moving
// object crossing the reading, which is the canonical thing that preference
// exists to spare someone. The argument, and the still-mew alternative that was
// rejected, are in utils/motion.js. This is the same path as the chunk failing
// to load, which the paragraph at the top of this file says is a correct page —
// so it is a branch that was already tested by construction.
if (!reducedMotion) {
  import("./mew.js")
    .then((m) => m.bootMew({ world, deck, scope: siteScope }))
    .catch((err) => console.error("[mew] engine failed to boot:", err));
}
