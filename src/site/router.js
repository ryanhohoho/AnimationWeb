// router.js
// SPA router over the History API, for a site whose WebGL canvas and glyph
// atlas must persist for the entire session (bible §7.1, plan phase 6).
//
// THE CANVAS AND THE RENDERER ARE NEVER RE-CREATED. this file never touches
// #stage, never touches src/type/**, never constructs a WebGLRenderer. all it
// does is swap #route-outlet's children and emit a "route" event on the world
// bus -- the type layer (phase 4, not built yet) subscribes to that event and
// re-targets its own GATHER; this module has no idea it exists.
//
// -- the "exactly one dispose()" contract ----------------------------------
// every route gets its OWN child lifecycle scope (src/utils/lifecycle.js),
// created fresh in navigate() and disposed exactly once, right there, before
// the new one is created. the "route" event carries that fresh scope in its
// payload specifically so a future subscriber (the type layer, or anything
// else that reacts to a route change) can register its own listeners/timers
// into it and get torn down on the SAME beat as everything else the route
// owns, rather than inventing its own teardown story:
//
//   world.on("route", ({ scope }) => {
//     scope.listen(someEl, "click", handler);   // dies with this route, never before
//   });
//
// -- why DOM access is guarded, not assumed ---------------------------------
// every window/document/history touch below is behind hasDom(). that is not
// defensive programming for its own sake: it is what lets the route-matching,
// prefetch-cache and scroll-target logic run headless in test/type.test.js,
// the same way world.js runs headless via `headless: true`. the DOM-touching
// half (start(), the real click/pointerenter/popstate wiring) can only be
// exercised in a browser -- see the manual procedure in test/type.test.js.

import { createScope } from "../utils/lifecycle.js";
import { renderRoute, renderNav } from "./renderContent.js";

const SITE_TITLE = "Ryan Ho";

// the four real routes (plan phase 6: "stub the four routes"). loaders are
// literal `import()` calls so Vite code-splits one chunk per route -- that is
// what "prefetched on idle / on hover" is prefetching.
export const ROUTES = [
  { id: "who-am-i", path: "/", navLabel: "who am i", load: () => import("./content/who-am-i.js") },
  { id: "projects", path: "/projects", navLabel: "projects", load: () => import("./content/projects.js") },
  { id: "case-studies", path: "/case-studies", navLabel: "case studies", load: () => import("./content/case-studies.js") },
  { id: "my-journey", path: "/my-journey", navLabel: "my journey", load: () => import("./content/my-journey.js") }
];

// not in ROUTES on purpose (renderNav skips anything without a navLabel
// anyway, but keeping it out of the table is what stops matchRoute from ever
// resolving a real path to it).
export const NOT_FOUND_ROUTE = { id: "not-found", path: null, navLabel: null, load: () => import("./content/not-found.js") };

// ---------------------------------------------------------------------------
// pure helpers -- no window, no document. these are what test/type.test.js
// exercises directly.
// ---------------------------------------------------------------------------

/** strip a trailing slash (except the root itself). "" -> "/". */
export function normalizePath(path) {
  if (!path) return "/";
  let p = path;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

/** exact match against the route table, or null (caller falls back to 404). */
export function matchRoute(path, routes) {
  const norm = normalizePath(path);
  return routes.find((r) => r.path === norm) || null;
}

/**
 * same-origin, left-click, unmodified, not a new-tab/download link? this is
 * the entire "should the router take this click" decision, pulled out as a
 * pure function so it is testable without a real MouseEvent/anchor.
 */
export function shouldIntercept({ button, metaKey, ctrlKey, shiftKey, altKey, target, download, rel, href, currentOrigin }) {
  if (button !== 0) return false;
  if (metaKey || ctrlKey || shiftKey || altKey) return false;
  if (target && target !== "" && target !== "_self") return false;
  if (download) return false;
  if (rel === "external") return false;
  let url;
  try { url = new URL(href, currentOrigin); } catch { return false; }
  if (url.origin !== currentOrigin) return false;
  return true;
}

/**
 * where to put the scroll bar after a route swap. popped+known beats a hash,
 * a hash beats resetting to the top. pure so the priority order is a unit
 * test, not a behaviour you have to click back-forward-back-forward to check.
 */
export function resolveScrollTarget({ popped, savedY, hash, hasHashElement }) {
  if (popped && typeof savedY === "number") return { type: "y", y: savedY };
  if (hash && hasHashElement) return { type: "hash", hash };
  return { type: "y", y: 0 };
}

function hasDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// ---------------------------------------------------------------------------
// the router
// ---------------------------------------------------------------------------

/**
 * createRouter({ world, outlet, routes, notFoundRoute, render, renderNav })
 *
 * `outlet` and the nav element are the only required DOM coupling, and both
 * are accessed only through .replaceChildren / .querySelectorAll / a couple
 * of attribute calls -- a plain stub object satisfies navigate() in tests.
 * `render` defaults to renderContent.js's renderRoute, and is an injection
 * point specifically so phase 4's word-slot-aware dom.js can be swapped in
 * without editing this file.
 */
export function createRouter({
  world,
  outlet,
  routes = ROUTES,
  notFoundRoute = NOT_FOUND_ROUTE,
  render = renderRoute,
  buildNav = renderNav,
  // WHERE THE RENDERED NODE GOES, and the only reason this is injectable is
  // bible 7.1a: the site is one continuous plane, so a route's DOM is not
  // "the contents of the outlet" any more -- it is a PANEL at a map cell, and
  // during a transit there are two of them mounted at once.
  //
  // The default is the plain swap, which is what keeps this file testable
  // headlessly and keeps the router ignorant of the map. It still does not know
  // that a compass direction exists.
  mount = (host, node) => host.replaceChildren(node),
  navEl: providedNav = null
} = {}) {
  if (!outlet) throw new Error("router: outlet is required");

  const scope = createScope("router");
  let navEl = null;
  let currentScope = null;
  let currentRoute = null;
  let hasNavigated = false;

  const prefetchCache = new Map();     // route id -> Promise<module>
  const scrollPositions = new Map();   // path -> scrollY, DOM-only

  function routeById(id) {
    if (id === notFoundRoute.id) return notFoundRoute;
    return routes.find((r) => r.id === id) || null;
  }

  /** dedup by id: a repeat call (idle sweep, then a hover) reuses the promise. */
  function prefetch(id) {
    if (prefetchCache.has(id)) return prefetchCache.get(id);
    const route = routeById(id);
    if (!route) return Promise.resolve(null);
    const p = route.load().catch((err) => {
      // don't cache a failure forever -- a flaky network deserves a retry on
      // the next hover, not a route that 404s for the rest of the session.
      prefetchCache.delete(id);
      throw err;
    });
    prefetchCache.set(id, p);
    return p;
  }

  async function loadContent(route) {
    const mod = await prefetch(route.id);
    return mod && "default" in mod ? mod.default : mod;
  }

  function updateNavActive(path) {
    // THE OUTLET, not one nav element: every panel carries its own nav now
    // (bible 7.1a), and during a transit there are two of them mounted. Marking
    // both is correct -- the one that is leaving is already aria-hidden, and the
    // one arriving needs to be right before the camera gets there.
    const host = navEl && navEl.querySelectorAll ? navEl : outlet;
    if (!host || !host.querySelectorAll) return;
    for (const a of host.querySelectorAll("a[href]")) {
      if (a.getAttribute("href") === path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }

  /**
   * the whole navigation. `initial` is the deep-link/first-paint call (no
   * history push, no scroll save -- there is nothing to leave yet); `popped`
   * is a back/forward call (no history push, scroll RESTORES instead of
   * resetting).
   */
  async function navigate(rawPath, { popped = false, initial = false } = {}) {
    const norm = normalizePath(rawPath);
    if (!initial && hasNavigated && currentRoute && currentRoute.path === norm && !popped) {
      return; // re-clicking the current link is a no-op, not a re-render
    }

    const matched = matchRoute(norm, routes);
    const route = matched || { ...notFoundRoute, path: norm };

    // record where we're leaving FROM, before anything about "here" changes
    if (hasDom() && !initial && currentRoute) {
      scrollPositions.set(currentRoute.path, window.scrollY);
    }

    const content = await loadContent(route);

    const swap = () => {
      // dispose the OUTGOING route's scope exactly once, then hand the
      // incoming route a fresh one before anything subscribes to "route".
      if (currentScope) currentScope.dispose();
      currentScope = scope.child(`route:${route.id}`);

      mount(outlet, render(content, route), route, { initial, popped });
      updateNavActive(matched ? norm : "");

      if (hasDom()) {
        document.title = content && content.title ? `${content.title} — ${SITE_TITLE}` : SITE_TITLE;
      }

      if (hasDom() && !initial && !popped) {
        history.pushState({ path: norm }, "", norm);
      }

      if (hasDom()) {
        const hash = window.location.hash;
        const hashId = hash ? hash.slice(1) : "";
        const hashEl = hashId ? document.getElementById(hashId) : null;
        const target = resolveScrollTarget({
          popped,
          savedY: scrollPositions.get(norm),
          hash,
          hasHashElement: !!hashEl
        });
        if (target.type === "hash") hashEl.scrollIntoView();
        else window.scrollTo(0, target.y);
      }

      currentRoute = { id: route.id, path: norm, navLabel: route.navLabel, title: content && content.title };
      hasNavigated = true;

      // the type layer's whole re-target hook. this file does not know, and
      // must not need to know, whether anything is listening.
      world.emit("route", {
        path: norm,
        id: route.id,
        title: currentRoute.title,
        navLabel: route.navLabel,
        notFound: !matched,
        scope: currentScope
      });
    };

    // SWAP SYNCHRONOUSLY. This used to run inside document.startViewTransition,
    // and R3 removed it: the transit in bible 7.1a IS the transition now, and
    // the two cannot both own the beat.
    //
    // A view transition snapshots the old DOM, swaps, and cross-fades -- which
    // on this site fades one set of transparent text into another (the canvas
    // paints the type, not the DOM), so it was never doing anything visible in
    // the first place. What it DID do was hold the swap for a frame and, when
    // superseded by a second click, reject with an InvalidStateError. The pan
    // needs the destination mounted and measurable on the same tick as the
    // click, because the field measures its words 900 ms before the camera
    // arrives.
    //
    // Same-document either way -- never a cross-document navigation, which
    // would tear down the WebGL context, drop the glyph atlas and reload mew
    // (bible 7.1).
    swap();
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const currentOrigin = window.location.origin;
    if (!shouldIntercept({
      button: e.button, metaKey: e.metaKey, ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey, altKey: e.altKey, target: a.target,
      download: a.hasAttribute("download"), rel: a.getAttribute("rel"),
      href: a.href, currentOrigin
    })) return;

    const url = new URL(a.href, currentOrigin);
    e.preventDefault();
    if (url.pathname === window.location.pathname && url.hash) {
      // same route, just an in-page anchor: this router owns route CHANGES,
      // not in-page scrolling. let the browser do its native hash behaviour.
      window.location.hash = url.hash;
      return;
    }
    navigate(url.pathname);
  }

  function onPointerEnter(e) {
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const currentOrigin = window.location.origin;
    let url;
    try { url = new URL(a.href, currentOrigin); } catch { return; }
    if (url.origin !== currentOrigin) return;
    const route = matchRoute(url.pathname, routes);
    if (route) prefetch(route.id);
  }

  function schedulePrefetchAll() {
    const run = () => { for (const r of routes) prefetch(r.id); };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run);
      // requestIdleCallback isn't a timer id addTimer can cancel, so it goes
      // in as a plain disposable -- scope.add() accepts any teardown fn.
      scope.add(() => { if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id); });
    } else {
      // no rIC (Safari): the fallback is a real timer, which the scope DOES
      // track and cancel on dispose.
      scope.addTimer(run, 1);
    }
  }

  function start() {
    if (!hasDom()) throw new Error("router.start() requires a DOM");
    if (typeof history.scrollRestoration === "string") {
      // we own scroll now (resolveScrollTarget); the browser's own guess
      // would fight it on every back/forward.
      history.scrollRestoration = "manual";
    }
    // THE NAV IS NOT CHROME ANY MORE (bible 7.1a). It used to be built once and
    // parked outside the outlet, which cannot work on a plane: a nav that does
    // not pan would have its words standing still while the crowd they are made
    // of walked away. It now lives inside each panel and is built by whatever
    // owns the panels. `navEl` survives only so updateNavActive has something
    // to point at, and it is handed in.
    if (!navEl && providedNav) navEl = providedNav;

    scope.listen(window, "popstate", () => navigate(window.location.pathname, { popped: true }));
    scope.listen(document, "click", onClick);
    // pointerenter does not bubble, but the CAPTURE phase still visits every
    // ancestor on the way down to whatever element the pointer actually
    // entered, so one delegated capture listener still catches every link.
    scope.listen(document, "pointerenter", onPointerEnter, { capture: true });

    schedulePrefetchAll();

    navigate(window.location.pathname + window.location.search, { initial: true });
  }

  function dispose() {
    if (currentScope) currentScope.dispose();
    currentScope = null;
    scope.dispose();
  }

  return {
    start,
    navigate,
    dispose,
    prefetch,
    get currentRoute() { return currentRoute; },
    routes
  };
}

export default createRouter;
