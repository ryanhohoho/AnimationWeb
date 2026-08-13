// stage.js
// THE PANEL STAGE (bible 7.1a): the DOM half of "the site is one continuous
// plane". Every route is a panel, absolutely positioned at its own map cell,
// and the whole stage rides on ONE composited translate3d that follows the
// field's camera.
//
// -- why panels are positioned by VISUAL offset and not by map cell ---------
// This is the single thing in R3 that is easy to get wrong and impossible to
// spot until it bites, so it is worth stating plainly.
//
// The plane is a torus. Travelling from my-journey [-1,0] to projects [+1,0]
// takes the SHORTER route, which is -1: you go left and arrive at projects from
// the far side. So during that transit the destination panel must be mounted at
// visual cell [-2,0] -- one step LEFT of where you are -- and NOT at its
// canonical [+1,0], which is two steps right.
//
// Mount it at its canonical cell and the stage has to travel +2 while the field
// travels -1, and the page tears itself in half. So the stage tracks an
// UNBOUNDED running visual cell: it starts wherever it starts and accumulates
// the signed delta on every navigation, and it is never reduced modulo the
// extent. The field wraps it when it indexes the texture; nothing else does.
//
// -- what stays mounted -----------------------------------------------------
// Both panels are live for the length of the transit -- that is what lets the
// departing page's words dissolve while the arriving page's assemble, and it is
// why the field sees both sets of elements at once. The outgoing panel is
// `inert` and `aria-hidden` the moment it starts leaving, so the tab order and
// the accessibility tree only ever contain one page.

import { siteConfig } from "../config/siteConfig.js";

export const PANEL_ATTR = "data-panel";
export const EXIT_ATTR = "data-panel-exiting";

const T = siteConfig.transit;

/**
 * createStage({ outlet, scope, buildNav, routes, viewport })
 *
 * `outlet` is the element the router already owns. Everything below lives
 * inside it, so the router's contract is unchanged: it hands over a rendered
 * node and this decides where on the plane it goes.
 */
export function createStage({ outlet, scope, buildNav, routes, getViewport }) {
  if (!outlet) throw new Error("stage: outlet is required");

  // ONE transformed element, so a pan is one composited layer move and not a
  // relayout. Everything inside it is absolutely positioned, which is also what
  // makes the panels overlap-free without any z-index bookkeeping.
  const stage = document.createElement("div");
  stage.className = "panel-stage";
  outlet.appendChild(stage);
  if (scope) scope.add(() => stage.remove());

  let currentPanel = null;
  let exitingPanel = null;
  // THE RUNNING VISUAL CELL. Unbounded on purpose -- see the header.
  let visualCell = [0, 0];

  /** a panel is exactly ONE VIEWPORT (bible 7.1a), positioned at its map cell. */
  function place(panel, cell) {
    const vp = getViewport();
    panel.style.left = `${cell[0] * vp.w}px`;
    panel.style.top = `${cell[1] * vp.h}px`;
    panel.style.width = `${vp.w}px`;
    panel.style.height = `${vp.h}px`;
    panel.dataset.cellX = String(cell[0]);
    panel.dataset.cellY = String(cell[1]);
  }

  function makePanel(node, route, cell) {
    const panel = document.createElement("section");
    panel.setAttribute(PANEL_ATTR, route.id);
    // EACH PANEL CARRIES ITS OWN NAV, and that is a consequence of the plane
    // rather than a duplication. A persistent nav outside the stage would not
    // pan -- so its words would sit still while the crowd they are made of
    // walked away, and the field would have to re-stamp them into new map cells
    // on every frame of the transit, which is a per-frame texture upload and the
    // one thing bible 7.3 forbids outright. Inside the panel it is just more of
    // the page, and it costs five elements.
    if (buildNav) panel.appendChild(buildNav(routes, route));
    panel.appendChild(node);
    place(panel, cell);
    return panel;
  }

  const api = {
    stage,
    get visualCell() { return [visualCell[0], visualCell[1]]; },
    get panel() { return currentPanel; },

    /**
     * put a route's DOM on the plane, `delta` panels from where we are.
     *
     * The OLD panel stays mounted and starts leaving; the caller settles the
     * stage when the transit is over. A delta of [0,0] -- the first paint, a
     * 404, a re-click -- replaces in place with no transit at all.
     */
    mount(node, route, delta = [0, 0]) {
      const moving = delta[0] !== 0 || delta[1] !== 0;
      const cell = [visualCell[0] + delta[0], visualCell[1] + delta[1]];

      if (exitingPanel) exitingPanel.remove();   // a second navigation mid-transit
      exitingPanel = moving ? currentPanel : null;
      if (!moving && currentPanel) currentPanel.remove();

      if (exitingPanel) {
        // OUT OF THE ACCESSIBILITY TREE THE MOMENT IT STARTS LEAVING. Both
        // panels are painted, but only one is a page: a screen reader or a Tab
        // press must never see two navs and two headings.
        exitingPanel.setAttribute(EXIT_ATTR, "true");
        exitingPanel.setAttribute("aria-hidden", "true");
        exitingPanel.inert = true;
      }

      const panel = makePanel(node, route, cell);
      stage.appendChild(panel);
      currentPanel = panel;
      visualCell = cell;
      return { panel, cell };
    },

    /** the transit is over: drop the panel that left. */
    settle() {
      if (exitingPanel) {
        exitingPanel.remove();
        exitingPanel = null;
      }
    },

    /**
     * the stage follows the camera. ONE transform, on one element, so this is a
     * composited move and never a relayout -- which is what lets the DOM keep
     * up with a field that is being redrawn from scratch every frame.
     */
    setCamera(x, y) {
      stage.style.transform = `translate3d(${-x}px, ${-y}px, 0)`;
    },

    /** re-place every mounted panel after a resize, since a panel IS a viewport. */
    relayout() {
      for (const p of stage.children) {
        place(p, [Number(p.dataset.cellX) || 0, Number(p.dataset.cellY) || 0]);
      }
    },

    /** the visual cell a panel element sits on, for the field's stamping. */
    cellOf(panel) {
      return [Number(panel.dataset.cellX) || 0, Number(panel.dataset.cellY) || 0];
    },

    /** seed the plane's origin without moving anything (deep links). */
    setVisualCell(cell) {
      visualCell = [cell[0], cell[1]];
    }
  };

  return api;
}

/** the stage's own CSS. Injected once, alongside dom.js's. */
export function stageCss() {
  return `
    /* THE PLANE. One transformed element; every panel is absolutely positioned
       on it, so a pan is one composited layer move.

       The stage is NOT clipped and the panels are NOT hidden when off screen:
       during a transit the destination is off to one side and has to be laid
       out and measurable, because the field measures its words the instant it
       mounts -- 900 ms before the camera gets there. #doc's own overflow is
       what stops the plane from giving the window scroll bars -- see dom.js,
       where #doc is sized to the viewport and clips. */
    .panel-stage { position: relative; transform: translate3d(0, 0, 0); }
    .panel-stage > [${PANEL_ATTR}] {
      position: absolute;
      padding: 5vmin 4vw;
      /* ONE SCREEN PER PAGE (bible 7.1a). A panel is exactly one viewport, so
         north is always one screen up. Copy that outgrows it scrolls INSIDE the
         panel rather than making the panel taller -- a taller panel would put
         the map's rows at different heights and "one screen up" would stop
         being true. */
      overflow-y: auto;
      overflow-x: hidden;
    }
    /* the outgoing panel is painted but is not a page any more. */
    .panel-stage > [${EXIT_ATTR}] { pointer-events: none; }
  `;
}

export default createStage;
