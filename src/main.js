// main.js
// boot: renderer, model load, rig build, system wiring, the loop.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import mewUrl from "./assets/mew.glb?url";

import { rigConfig } from "./config/rigConfig.js";
import { siteConfig } from "./config/siteConfig.js";
import { createWorld } from "./engine/world.js";
import { createLoop } from "./engine/loop.js";
import { createBody } from "./engine/physics/body2d.js";
import { createColliderTracker, resolveAll } from "./engine/physics/colliders.js";
import { createBrain } from "./engine/behavior/brain.js";
import { buildRig } from "./engine/pose/rig.js";
import { createPoser } from "./engine/pose/poser.js";
import { createBodyPose } from "./engine/pose/bodyPose.js";
import { createLimbPose } from "./engine/pose/limbPose.js";
import { createHeadLook } from "./engine/pose/headLook.js";
import { createEarSprings } from "./engine/pose/earSprings.js";
import { createTailChain } from "./engine/pose/tailChain.js";
import { createFaceMorphs } from "./engine/pose/faceMorphs.js";
import { createBeamFx } from "./engine/fx/beam.js";
import { beamLength } from "./engine/fx/beamGeometry.js";
import { createPresentation } from "./engine/fx/presentation.js";
import { applySpriteShade } from "./engine/fx/spriteShade.js";
import { createStarBurst } from "./engine/fx/starBurst.js";
import { createFaceOverlay } from "./engine/fx/faceOverlay.js";
import { lerp } from "./utils/math.js";
import { createRouter, ROUTES } from "./site/router.js";
import { createMap } from "./site/map.js";
import { createStage, PANEL_ATTR, EXIT_ATTR } from "./site/stage.js";
import { createTransit } from "./site/transit.js";
import { createScope } from "./utils/lifecycle.js";
import { createField } from "./type/field.js";
import { gridDims, dprFor } from "./type/grid.js";
import { createWordBuilder } from "./type/words.js";
import {
  renderRoute, renderNav, injectStyles, asciiElements, fallbackToVoice,
  restoreAscii, docRect, inkRect, VOICE_CLASS, ASCII_ATTR
} from "./site/dom.js";
import rampTable from "./assets/ramp.json";
import atlasUrl from "./assets/ramp.png?url";

// ONE canvas for the whole session (index.html explains the layer contract).
// It is never recreated -- not on navigation, not on resize -- because every
// WebGLRenderer that gets thrown away leaks a GPU context that the browser will
// only reclaim by killing an older one.
const canvas = document.getElementById("stage");
// the document starts with its text painted normally, so a browser with no JS
// or no WebGL shows a plain readable page. We only take painting over once we
// know we can actually paint.
document.body.classList.remove("no-paint");
const world = createWorld({ seed: 20260719 });

// ONE lifecycle scope for everything the SITE owns, as opposed to everything
// mew owns. Every listener, timer, observer and GPU object the type layer
// allocates is registered into it, so a teardown is one dispose() and
// renderer.info.memory can be asserted back to baseline rather than eyeballed.
// IMPLEMENTATION_PLAN.md section 6. Nothing below calls addEventListener.
const siteScope = createScope("site");

// SPA routing: swaps #route-outlet's children and emits "route" on the world
// bus. never touches #stage, never re-creates the renderer -- see
// src/site/router.js's header comment and DESIGN_BIBLE.md §7.1.
// dom.js is phase 4's replacement for renderContent.js: same content data, but
// its h1 and its nav links carry the ASCII opt-in and the type scale bible 4.4
// rule 2 demands. router.js took `render` as an injection point precisely so
// this swap is one argument and nothing inside the router changes.
injectStyles(siteScope);

// THE PLANE (bible 7.1a). Three small pieces, and each of them is ignorant of
// the other two's job:
//   siteMap    integer cells and a modulus. The ONLY thing that knows which way
//              a navigation travels, and it does not know what a panel is.
//   stage      the DOM half: one transformed element, panels at map cells.
//   transit    a clock that drives the beat table. Owns no DOM and no GL.
const siteMap = createMap();
const stage = createStage({
  outlet: document.getElementById("route-outlet"),
  scope: siteScope,
  buildNav: renderNav,
  routes: ROUTES,
  getViewport: () => ({ w: window.innerWidth, h: window.innerHeight })
});

// the route we are LEAVING. The router's own currentRoute has already been
// replaced by the time the "route" event fires, and the delta needs the one
// before it.
let fromRouteId = null;
// ...and whether the arriving panel's words are still waiting for the 900 ms
// beat. Held from the click until onGather, so a destination that mounts
// instantly does not start assembling instantly.
let gatherHeld = false;
// ...and the panel each mounted route sits on, so the field can be told which
// panel's rects it is being handed.
let currentPanelCell = [0, 0];

const transit = createTransit({
  scope: siteScope,
  onCamera: (x, y) => {
    if (field) field.setCamera(x, y);
    stage.setCamera(x, y);
  },
  onMigrate: (dx, dy, t01, amp) => { if (field) field.setTransit(dx, dy, t01, amp); },
  onGather: () => {
    // 900 ms: the beat table's GATHER. The destination has been mounted and
    // measured since t=0 -- it had to be, the field stamps its words into the
    // texture long before the camera gets there -- and this is the moment they
    // are allowed to start forming.
    gatherHeld = false;
    if (field) { refreshWords(); field.releaseWords(); }
  },
  onArrive: () => {
    // the panel that left is gone, so its rects go with it -- otherwise fifty
    // navigations accumulate fifty pages' worth of presence on nine panels and
    // the whole map fills in with crowd.
    const leaving = stage.panel && stage.cellOf(stage.panel);
    stage.settle();
    if (field && leaving) refreshWords();
  }
});

createRouter({
  world,
  outlet: document.getElementById("route-outlet"),
  render: renderRoute,
  buildNav: renderNav,
  /**
   * WHERE A ROUTE'S DOM LANDS ON THE PLANE, and the whole of R3's choreography
   * hangs off these few lines.
   *
   * The delta comes out of the map's modulus and nothing here knows what it
   * means -- there is no "if we are going west" anywhere. The destination panel
   * is mounted at `current + delta`, its VISUAL cell, and NOT at its canonical
   * map cell: on a wrapping navigation those differ, and mounting at the
   * canonical cell makes the stage travel the long way round while the camera
   * takes the short one, which tears the page in half.
   */
  mount: (host, node, route, { initial } = {}) => {
    if (initial) {
      // A DEEP LINK STARTS WHEREVER ITS OWN PANEL IS, with no transit at all.
      // The visual cell is set BEFORE the mount, not after: a panel is placed
      // when it is created, so seeding the plane afterwards would leave the
      // first page sitting at [0,0] with the camera looking somewhere else --
      // and every later delta would be measured from the wrong place.
      stage.setVisualCell(siteMap.cellOf(route.id) || [0, 0]);
    }
    const delta = initial ? [0, 0] : siteMap.delta(fromRouteId, route.id);
    const { cell } = stage.mount(node, route, delta);
    currentPanelCell = cell;

    if (initial) {
      const at = { x: cell[0] * window.innerWidth, y: cell[1] * window.innerHeight };
      if (field) field.setCamera(at.x, at.y);
      stage.setCamera(at.x, at.y);
    } else {
      // MEW DOES NOT PAN (bible 7.1a). She is a creature, not scenery, and she
      // stays with the viewer -- she just takes a small shove AWAY from the
      // travel direction as the world starts moving, and catches up on her own.
      // One emit, and the rig's existing physics does the rest.
      const len = Math.hypot(delta[0], delta[1]);
      if (len > 0) {
        world.emit("transit", {
          dir: { x: delta[0] / len, y: delta[1] / len },
          impulse: siteConfig.transit.mewImpulsePxPerS
        });
      }
      gatherHeld = true;
      const from = field ? field.camera : { x: 0, y: 0 };
      // measure BOTH panels now, on the same tick as the click: the one leaving
      // starts dissolving, the one arriving is stamped into the texture and
      // held. Nothing is visible yet -- that is the t=0 row of the beat table.
      if (field) scheduleWordRefresh();
      transit.start({
        from, delta,
        viewport: {
          w: window.innerWidth, h: window.innerHeight,
          cellPx: field && field.grid ? field.grid.cell.w : 4
        }
      });
    }
    fromRouteId = route.id;
  }
}).start();

// --- three setup -------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setClearColor(0x000000, 0);
// THE CANVAS IS CLEARED EXACTLY ONCE PER FRAME, BY US. There are now two
// things painting into it -- the type field underneath, mew's presentation
// pass on top -- and three's autoClear would have the second wipe the first.
// The presentation pass still clears its own render target explicitly, so
// nothing about mew changes.
renderer.autoClear = false;

const scene = new THREE.Scene();
const cfg = rigConfig;
const camera = new THREE.PerspectiveCamera(cfg.sizing.fovDeg, 1, 0.1, 100);
camera.position.set(0, 0, cfg.sizing.camDistance);

// light rig (see cfg.lighting). mostly ambient for a flat sticker read, with
// a pink-family fill so the shadow side never drifts purple.
const lit = cfg.lighting;
scene.add(new THREE.HemisphereLight(
  new THREE.Color(lit.skyColor),
  new THREE.Color(lit.groundColor),
  lit.ambientIntensity
));
const key = new THREE.DirectionalLight(new THREE.Color(lit.keyColor), lit.keyIntensity);
scene.add(key);
scene.add(key.target);

// character group hierarchy:
// characterRoot (position px->world) > squashGroup (impact scale) > holder (model scale + pivot)
const characterRoot = new THREE.Group();
const squashGroup = new THREE.Group();
const holder = new THREE.Group();
characterRoot.add(squashGroup);
squashGroup.add(holder);
scene.add(characterRoot);

// viewer-relative key light. "toward the viewer" is the camera->character ray,
// which changes across the screen under a perspective camera, so re-aiming it
// each frame keeps the lit face pointed at the user wherever mew is. with a
// DIRECTIONAL light only the direction matters, so this is a handful of vector
// ops per frame and nothing more.
const _keyDir = new THREE.Vector3();
const _toViewer = new THREE.Vector3();
const KEY_DIST = 10;
function aimKey() {
  const [ox, oy, oz] = lit.keyOffset;
  if (lit.followCharacter) {
    _toViewer.copy(camera.position).sub(characterRoot.position).normalize();
  } else {
    _toViewer.set(0, 0, 1);
  }
  // view-space offset -> world: camera is unrotated, so right/up are x/y
  _keyDir.set(ox, oy, 0).addScaledVector(_toViewer, oz).normalize();
  key.target.position.copy(characterRoot.position);
  key.position.copy(characterRoot.position).addScaledVector(_keyDir, KEY_DIST);
}
aimKey();

// doc-anchored fx group: children are authored in DOCUMENT pixels and this
// group's transform maps them into world space, compensating scroll each
// frame. the beam and cinders stay nailed to the page while it scrolls.
const docFxGroup = new THREE.Group();
scene.add(docFxGroup);

function updateDocFxGroup() {
  const wpp = view.worldPerPx;
  docFxGroup.scale.set(wpp, -wpp, 1);
  docFxGroup.position.set(
    (-world.viewport.w / 2) * wpp,
    (world.viewport.h / 2 + window.scrollY) * wpp,
    0
  );
}

// view mapping shared with pose layers
const view = {
  worldPerPx: 0.01,
  modelScale: 1,
  toWorldX: (px) => (px - world.viewport.w / 2) * view.worldPerPx,
  toWorldY: (px) => (world.viewport.h / 2 - px) * view.worldPerPx
};

// presentation pass -- pixelate / cutout / none, picked by
// cfg.presentation.mode. purely visual, one common interface (see fx/presentation.js)
const present = createPresentation({ renderer, config: cfg.presentation });

// SHINY. rolled once per page load, like an encounter. deliberately NOT on the
// world's seeded rng: that is seeded so the wander is reproducible for the
// headless tests, and a reproducible shiny roll would mean every load is the
// same one. ?shiny=1 / ?shiny=0 overrides it for previewing.
const shinyParam = new URLSearchParams(location.search).get("shiny");
const isShiny = shinyParam === null
  ? Math.random() < cfg.shiny.chance
  : shinyParam !== "0";

// the type field's own dpr rule (bible 7.3: capped at 2, and at 1.5 once the
// grid is dense). It lives in type/grid.js because it is a fact about the
// lattice; this is just the binding to the live viewport.
function fieldDpr() {
  const g = gridDims(Math.max(world.viewport.w, 1), Math.max(world.viewport.h, 1));
  return dprFor(g.cells, world.viewport.dpr);
}

function updateViewport() {
  const { dpr } = world.viewport;
  // A ZERO-HEIGHT VIEWPORT IS REACHABLE and it poisons everything downstream:
  // worldPerPx divides by it, fitModel multiplies the model's scale by that, and
  // an Infinity in a scale matrix turns into NaN the first time it meets a zero.
  // The whole scene graph then renders as nothing, permanently, because nothing
  // recomputes it until the next resize. It happens on a collapsed container and
  // on some programmatic resizes, and it costs one clamp to make impossible.
  const w = Math.max(world.viewport.w, 1);
  const h = Math.max(world.viewport.h, 1);
  // THE CANVAS RESOLUTION IS NOW THE MAX OF WHAT ITS TWO CLIENTS WANT.
  //
  // present.pixelRatio() was the whole answer while mew was the only thing
  // painting: the pixelate pass renders her into a small offscreen target and
  // upscales it with NEAREST, so drawing the canvas at dpr 2 would only have
  // resampled the same texels. The type field is the opposite -- it draws
  // 7x12 css-px cells out of a 56x96 atlas cell, point-sampled, and at dpr 1
  // that is one atlas texel in eight and the glyphs come apart (bible 7.3
  // budgets the field at dpr 2 explicitly, and its measurement is quoted at
  // 3024x1964).
  //
  // Taking the max costs one fullscreen blit at the higher resolution and
  // changes nothing about how mew is RENDERED -- her target is sized from css
  // px and is untouched. It does make her upscale crisper on a retina display,
  // because the NEAREST upscale now lands on real device pixels instead of
  // being bilinear-stretched by the browser afterwards, which is the look the
  // pixelate pass was going for in the first place.
  renderer.setPixelRatio(Math.max(present.pixelRatio(dpr), fieldDpr()));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  view.worldPerPx = (2 * Math.tan((cfg.sizing.fovDeg * Math.PI) / 360) * cfg.sizing.camDistance) / h;
  present.resize(w, h);
}
updateViewport();
world.on("resize", () => {
  updateViewport();
  fitModel();
});

// --- physics + behavior ------------------------------------------------------

// body lives in DOCUMENT coordinates: scrolling never drags it around
const body = createBody({
  x: world.viewport.w * 0.72,
  y: window.scrollY + world.viewport.h * 0.4,
  radius: 60,
  config: cfg.physics
});
createColliderTracker(world);
const brain = createBrain({
  body, world,
  config: cfg.behavior, pathConfig: cfg.path, attackConfig: cfg.attack
});

// --- the ascii type field ----------------------------------------------------
let field = null;
const wordBuilder = createWordBuilder({ ramp: rampTable });
siteScope.add(wordBuilder.dispose);

/**
 * measure every element that opted in to ASCII, turn each into slots, and hand
 * the set to the field. Runs on route change and on resize -- never per frame.
 *
 * A word that cannot satisfy bible 4.4 at this breakpoint falls back to VOICE
 * and says why. That is the whole risk-register mitigation for "ASCII headings
 * are illegible at mobile sizes", and it is why it is a code path rather than
 * a note in a document.
 */
// THE TWO HALVES OF A FIRST PAINT RACE EACH OTHER, and neither can be made to
// win. The route's DOM arrives when a dynamic import resolves; the field
// arrives when a PNG is fetched and decoded. Whichever is second is the one
// that has to do the measuring, so both of them just say "words are dirty" and
// the flag decides.
let wordsDirty = true;

/** the CSS text-transform the browser actually applied, applied to a string. */
function transformText(s, transform) {
  if (transform === "uppercase") return s.toUpperCase();
  if (transform === "lowercase") return s.toLowerCase();
  if (transform === "capitalize") return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return s;
}

function scheduleWordRefresh() {
  wordsDirty = true;
  siteScope.addTimer(() => { if (field && field.grid) refreshWords(); }, 0);
}

/**
 * MAP PX FROM A CLIENT RECT (bible 7.1a).
 *
 * Everything the field stamps -- word slots, presence, clearings -- lives in
 * MAP coordinates now, because the texture covers the whole map. A panel's DOM
 * sits at `panelCell x viewport` inside the stage and the stage is translated by
 * -camera, so a client rect plus the camera is the map position, and the two
 * terms move in opposite directions by exactly the same amount during a pan.
 * That is what makes this stable while the camera is mid-flight: the sum does
 * not change, so a word measured at t=0 of a transit stamps into the same map
 * cells it will occupy when the camera arrives.
 *
 * It has to be the UNSNAPPED camera. The field snaps its own copy to whole
 * cells for the lattice (bible 3.1), and using the snapped one here would put
 * the words up to a cell away from where the DOM actually is.
 */
function toMap(r, panel) {
  if (!panel) return r;
  // RELATIVE TO THE PANEL'S WRAPPED ORIGIN, not to the camera.
  //
  // Adding the camera gives the VISUAL map position, which is unbounded -- the
  // camera walks off the west edge and keeps going, so a panel's visual cell
  // can be [-2, 0] or [5, -3]. The texture covers exactly one map, so those
  // coordinates index nothing and every rect lands outside the grid: presence
  // collapses to its floor and the whole page washes out. (It did. The panel
  // went from 7.1% mean ink to 2.4%.)
  //
  // A panel is exactly one viewport, so measuring INSIDE it and adding the
  // wrapped origin is exact, always in range, and does not depend on where the
  // camera happens to be mid-pan.
  const ex = siteConfig.map.extent;
  const wx = ((panel.cell[0] % ex[0]) + ex[0]) % ex[0];
  const wy = ((panel.cell[1] % ex[1]) + ex[1]) % ex[1];
  const box = panel.el.getBoundingClientRect();
  return {
    x: wx * window.innerWidth + (r.x - box.x),
    y: wy * window.innerHeight + (r.y - box.y),
    w: r.w, h: r.h
  };
}

/** the panels currently on the plane, and the map cell each one sits at. */
function mountedPanels() {
  return [...document.querySelectorAll(`#doc [${PANEL_ATTR}]`)].map((el) => ({
    el,
    cell: [Number(el.dataset.cellX) || 0, Number(el.dataset.cellY) || 0],
    exiting: el.hasAttribute(EXIT_ATTR)
  }));
}

function refreshWords() {
  if (!field || !field.grid) return;
  wordsDirty = false;

  // EVERY PANEL ON THE PLANE, not "the document". During a transit there are
  // two mounted -- the one leaving and the one arriving -- and the field holds
  // both sets of words at once. That is what lets the departing page's words
  // dissolve back into the crowd while the arriving page's condense out of it,
  // which is the whole of bible 7.1a's 0-180 and 900-2400 beats.
  const panels = mountedPanels();
  const words = [];

  for (const panel of panels) {
    const els = asciiElements(panel.el);

    // EVERY ELEMENT GOES BACK TO ASCII SIZE BEFORE ANYTHING IS MEASURED.
    //
    // The fallback is otherwise self-perpetuating, and silently: a word that
    // failed at a narrow breakpoint is now laid out at VOICE's 15 px, so the
    // next layout measures a 10 px cap height, fails the minimum immediately,
    // and leaves it as VOICE -- on a screen where it would have been perfectly
    // legible. Widening the window could never bring a word back.
    for (const el of els) restoreAscii(el);

    // ...and if any of them do fall back, the page reflows underneath the ones
    // that did not, so their rects have to be taken again. Two passes at most,
    // and the second only happens when something actually failed.
    let built = buildPass(els, panel);
    if (built.failed) built = buildPass(built.survivors, panel);
    words.push(...built.words);

    // ...then tell the field where THIS PANEL's content is. Two things come out
    // of the same measurement:
    //   * PRESENCE (bible 4.2) -- every content box, so the resting density can
    //     be `weather x presence` and the margins can be genuinely bare paper
    //     rather than more of the same texture.
    //   * the VOICE clearings -- the plain-ink blocks specifically, which the
    //     field thins under so they can be read.
    // After the words, because a word that failed bible 4.4 has just become
    // VOICE and counts as both.
    field.setLayoutRects(panel.cell, {
      content: contentRects(panel.el, panel),
      voice: voiceRects(panel.el, panel)
    });
  }

  field.setWords(words);
}

/**
 * measure and build every candidate once. Returns the words that worked, the
 * elements still in the running, and whether anything fell back (which is what
 * says the layout moved and the whole thing needs one more pass).
 */
function buildPass(els, panel) {
  const words = [];
  const survivors = [];
  let failed = false;
  for (const el of els) {
    // THE INK BOX, NOT THE ELEMENT BOX. An h1 is a block, so its box is as
    // wide as the column -- 1177 px for a word whose letters occupy 430 -- and
    // rasterizing that costs two and a half times the pixels for nothing.
    //
    // ...and in MAP px, because the cell texture covers the whole plane now.
    const rect = toMap(inkRect(el), panel);
    if (rect.w < 1 || rect.h < 1) continue;
    const cs = getComputedStyle(el);
    const fontSizePx = parseFloat(cs.fontSize) || 16;
    // RASTERIZE WHAT THE BROWSER LAID OUT, not what is in the DOM. textContent
    // is the untransformed string; the element is set in lowercase, and the
    // coverage bitmap has to be of the same glyphs the layout measured or the
    // painted word and the focusable link stop being the same word.
    const spec = { text: transformText(el.textContent.trim(), cs.textTransform), rect, fontSizePx };
    const res = wordBuilder.build(spec, field.grid);
    if (!res.ok) { fallbackToVoice(el, res.reason); failed = true; continue; }
    survivors.push(el);
    // EVERY WORD ASSEMBLES, LINK OR HEADING (bible 4.3). A link's word used to
    // be dormant in the field until the pointer approached it, and that is the
    // thing R2 exists to undo: it made the navigation a puzzle, and most
    // visitors never solved it. The heading and the links now run the same
    // clock from the same trigger -- the route settling.
    words.push({
      el, cells: res.cells, ring: res.ring,
      centre: res.centre, radiusPx: res.radiusPx,
      // A WORD ON THE PANEL THAT IS LEAVING DISSOLVES BACK INTO THE FIELD as
      // the crowd carries it off (bible 7.1a's 0-180 beat). Same clock as the
      // assembly, run backwards -- there is no separate exit animation, because
      // there does not need to be one.
      exiting: !!(panel && panel.exiting),
      // ...and an arriving word waits for the 900 ms beat before it starts.
      held: gatherHeld && !(panel && panel.exiting),
      // re-measured from the live DOM at the new breakpoint, which is the only
      // honest way to do it: the browser owns layout, we own paint.
      rebuild(grid) {
        const r = toMap(inkRect(el), panel);
        const again = wordBuilder.build({ text: spec.text, rect: r, fontSizePx: parseFloat(getComputedStyle(el).fontSize) || 16 }, grid);
        if (again.ok) {
          this.cells = again.cells;
          this.ring = again.ring;
          this.centre = again.centre;
          this.radiusPx = again.radiusPx;
          restoreAscii(el);
        } else fallbackToVoice(el, again.reason);
      }
    });
  }
  return { words, survivors, failed };
}

/**
 * the document-px rects of every VOICE block, merged per element. Only blocks
 * that actually contain text: an empty wrapper would clear a hole in the field
 * for nothing.
 */
function voiceRects(root, panel) {
  const out = [];
  for (const el of root.querySelectorAll(`.${VOICE_CLASS}`)) {
    if (!el.textContent.trim()) continue;
    const r = toMap(inkRect(el), panel);
    if (r.w < 4 || r.h < 4) continue;
    out.push(r);
  }
  return out;
}

/**
 * PRESENCE RECTS (bible 4.2): the document-px box of every LEAF element that
 * carries text -- ascii or voice, it makes no difference here. This is what
 * the resting density is anchored to, so the crowd gathers where the page has
 * something to say and thins to bare paper where it does not.
 *
 * LEAVES ONLY, and that is the whole subtlety. Taking every element would take
 * the <article> and the <nav> too, and an article's box is the union of
 * everything inside it including the gaps -- so presence would be 1.0 over the
 * entire column and the mechanism would quietly do nothing at all. It is the
 * SPACES BETWEEN the blocks that the composition is made of.
 */
function contentRects(root, panel) {
  const out = [];
  for (const el of root.querySelectorAll("h1, h2, p, li, a[href], figure, img")) {
    if (!el.textContent.trim() && el.tagName !== "IMG") continue;
    const r = toMap(inkRect(el), panel);
    if (r.w < 4 || r.h < 4) continue;
    out.push(r);
  }
  return out;
}

// :focus-visible on the real DOM link forces its word to FULL assembly
// instantly (bible 4.3) -- keyboard users get the same page, without having to
// sit out the condensation. focusin rather than focus because focus does not
// bubble; :focus-visible is asked of the element so a mouse click does not
// jump a word that is already assembling perfectly well on its own.
siteScope.listen(document, "focusin", (e) => {
  if (!field || !e.target.matches) return;
  if (e.target.matches(":focus-visible")) field.setWordFocus(e.target, true);
});

// HOVER (bible 4.3a): a modulation of an already-assembled word. LINKS ONLY,
// and that is a real distinction rather than an oversight -- an h1 is a block,
// so its box runs the full width of the column (1177 px for 427 px of letters)
// and pointing anywhere on that line would sharpen a heading the cursor is
// nowhere near. A link's box is inline and tight to its own ink, so hovering it
// means what it looks like it means.
//
// pointerover/pointerout rather than enter/leave: enter and leave do not
// bubble, and delegating from the document is what keeps this working across
// route swaps without re-binding anything.
const hoverTarget = (e) => (e.target && e.target.closest
  ? e.target.closest(`a[${ASCII_ATTR}]`) : null);
siteScope.listen(document, "pointerover", (e) => {
  const el = hoverTarget(e);
  if (field && el) field.setWordHover(el, true);
});
siteScope.listen(document, "pointerout", (e) => {
  const el = hoverTarget(e);
  // relatedTarget still inside the same link is the cursor crossing between
  // child nodes, not leaving. Without this the spring re-triggers mid-word.
  if (!field || !el) return;
  if (e.relatedTarget && el.contains(e.relatedTarget)) return;
  field.setWordHover(el, false);
});

// a route change is a GATHER re-target, not a reload (bible 7.1): the cells
// keep their identity and re-agree into the new page's words.
world.on("route", () => {
  // A TIMER, NOT A rAF. The new DOM has to be laid out before it can be
  // measured, and rAF is the usual way to wait a beat for that -- but rAF does
  // not fire while document.hidden, which is true in an automated preview pane
  // and true in any background tab, and a route change that only takes effect
  // when the tab is visible is a route change that silently did not happen.
  // A zero timer fires either way, and docRect's getBoundingClientRect forces
  // layout itself.
  scheduleWordRefresh();
});

// webfont metrics move the words: re-measure once when they settle. Harmless
// if the FIELD family is never loaded as a webfont (bible 3.2 says it is not),
// because then this resolves immediately and measures the same fallback the
// coverage bitmap is rasterized with.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => scheduleWordRefresh());
}
// a resize changes the breakpoint, the cell size and every word's rect, so the
// lattice is rebuilt (field.layout, subscribed inside the field) and the words
// are re-measured off the newly laid-out DOM.
//
// ...and A PANEL IS EXACTLY ONE VIEWPORT (bible 7.1a), so every panel on the
// plane has to be re-placed and the camera re-derived from the panel it is
// looking at. Otherwise the map's spacing is still in the old viewport's units
// and "north is one screen up" quietly stops being true.
world.on("resize", () => {
  stage.relayout();
  const at = { x: currentPanelCell[0] * window.innerWidth,
               y: currentPanelCell[1] * window.innerHeight };
  if (field) field.setCamera(at.x, at.y);
  stage.setCamera(at.x, at.y);
  scheduleWordRefresh();
});

// MEW TAKES A SHOVE AS THE WORLD STARTS MOVING (bible 7.1a) and catches up on
// her own. She does not pan -- she is a creature, not scenery -- so this is the
// entire coupling between the transit and the rig: one impulse, opposite the
// travel direction, into the physics that was already there.
world.on("transit", ({ dir, impulse }) => {
  if (!rig || !dir) return;
  body.addImpulse({ x: -dir.x * impulse, y: -dir.y * impulse });
});

createField({
  renderer, world, scope: siteScope, atlasUrl, ramp: rampTable,
  // bible 6.5: the field knows about mew. Cells within ~1.5 body radii thin
  // slightly and drift away, so she pushes a soft clearing through the text as
  // she swims. A callback rather than a subscription because her position is
  // this file's business -- the type layer must not reach into src/engine.
  getMew: () => (rig ? { x: body.pos.x, y: body.pos.y, radius: body.radius } : null)
}).then((f) => {
  field = f;
  // THE CAMERA STARTS WHERE THE FIRST ROUTE IS (bible 7.1a). The router runs
  // before the atlas has decoded, so the initial mount had no field to tell --
  // it parked the stage and left the camera for whoever arrived second. This is
  // the same race the words go through, and the same answer.
  const at = { x: currentPanelCell[0] * window.innerWidth,
               y: currentPanelCell[1] * window.innerHeight };
  field.setCamera(at.x, at.y);
  stage.setCamera(at.x, at.y);
  if (wordsDirty) refreshWords();
  // `paintAt` is the verification hook, and it exists because a preview pane
  // reports document.hidden, which correctly stops the rAF (bible 7.3) and
  // therefore also stops anything that would have been worth looking at. It
  // draws ONE frame at an explicit absolute time -- which is possible at all
  // only because the field is a pure function of that time, and is the same
  // property the headless tests lean on.
  window.__AW__ = Object.assign(window.__AW__ || {}, {
    field, renderer, loop, siteScope, refreshWords,
    // the config itself, because half of what this hook exists for is
    // CALIBRATION -- sweeping a threshold across the real DOM at a real
    // breakpoint and watching what falls back. Doing that by editing the file
    // and reloading measures a different page every time.
    siteConfig,
    paintAt(t) {
      renderer.clear();
      transit.tick(t * 1000);
      field.update(1 / 60, t);
      field.render();
      const calls = renderer.info.render.calls;
      if (rig && poser) present.render(scene, camera, { dt: 1 / 60, scrollY: window.scrollY });
      return calls;
    }
  });
  // the page paints as soon as the FIELD is ready. mew's glb is a separate,
  // slower load and renderFrame already guards on her rig -- a page whose type
  // waits for a character to download is a loading screen with extra steps,
  // and bible 8 says no on sight.
  loop.start();
}).catch((err) => console.error("[type] field failed to start:", err));

// pressing on the character starts a grab: the brain resolves it into a PET
// (clean click -> hyper beam) or a DRAG (carry + fling on release).
// pointerdown events arrive in document coords.
world.on("pointerdown", (p) => {
  const d = Math.hypot(p.x - body.pos.x, p.y - body.pos.y);
  if (d < body.radius * 1.25) world.emit("mewdown", { point: { x: p.x, y: p.y } });
});

// --- model load --------------------------------------------------------------

let rig = null;
let poser = null;
let ctxBase = null;

new GLTFLoader().load(mewUrl, (gltf) => {
  const model = gltf.scene;
  holder.add(model);
  rig = buildRig(model, cfg.boneRoles);
  fitModel();
  // cut the light rig's smooth falloff into flat sprite sections, and take the
  // painted eyes and blush out of the shading entirely (fx/spriteShade.js)
  const shade = applySpriteShade(model, {
    config: cfg.presentation.spriteShade,
    skinHex: cfg.skinHex,
    blushHex: cfg.shiny.blushHex,
    renderer
  });
  shadeFx = shade;
  if (isShiny) {
    shade.setVariant(cfg.shiny);
    console.log("%c[mew] ✨ shiny!", "color:#4aa8d8;font-weight:bold");
  }

  ctxBase = {
    rig, body, brain, world, view,
    dt: 0, time: 0,
    shared: {
      bodyQuat: new THREE.Quaternion(),
      swimPhase: 0, swimAlign: 0,
      headYawRate: 0, headPitchRate: 0
    },
    visual: { bobPx: { x: 0, y: 0 } }
  };
  // the face morphs live on the skinned mesh, not on a bone
  let skinned = null;
  model.traverse((o) => {
    if (o.isSkinnedMesh && !skinned) skinned = o;
  });
  const face = cfg.face.enabled
    ? createFaceMorphs({ config: cfg, world, brain, body, mesh: skinned })
    : null;

  const limbs = createLimbPose({ config: cfg, world });
  // the >.< face: a flat overlay over the painted eyes, driven by the same
  // 'flail' event the limbs are (engine/fx/faceOverlay.js)
  const faceOv = createFaceOverlay({
    rig, eyes: skinned?.userData?.eyes, config: cfg.face.overlay, world, view,
    mesh: skinned
  });
  if (faceOv) {
    // the patch has to disappear into the face, so it is the LIT skin: the
    // shading's top band, which is what the front of the head is in every frame
    // the overlay can be seen at all
    const u = shade.uniforms;
    const t = u.spriteTint.value;
    const l = u.spriteLightTint.value;
    faceOv.setPatch([t.x * l.x, t.y * l.y, t.z * l.z]);
  }

  poser = createPoser(ctxBase, [
    createBodyPose({ config: cfg, world, squashGroup }),
    limbs,
    createHeadLook({ config: cfg, world }),
    createEarSprings({ config: cfg, world }),
    createTailChain({ config: cfg, world }),
    ...(face ? [face] : []),
    ...(faceOv ? [faceOv] : [])
  ]);

  // ---- hyper beam fx wiring ------------------------------------------
  // the mouth is a real Object3D parented INSIDE the head bone, placed once
  // at load. the scene graph carries it through every rotation exactly, so
  // the charge glow is clamped to the face by construction -- no per-frame
  // math to drift or lag.
  const mouthAnchor = new THREE.Object3D();
  {
    scene.updateMatrixWorld(true); // fitModel just changed scales
    const head = rig.bones.head;
    head.updateWorldMatrix(true, false);
    // desired mouth point in the model root's (char) frame at rest
    const headRest = rig.rest.get(head);
    const charPoint = headRest.charPos.clone()
      .add(new THREE.Vector3(...cfg.attack.mouthOffset));
    // convert char-frame point -> world -> head-bone local, then parent it
    const worldPoint = charPoint.applyMatrix4(rig.modelRoot.matrixWorld);
    head.worldToLocal(worldPoint);
    mouthAnchor.position.copy(worldPoint);
    head.add(mouthAnchor);
  }
  const _mw = new THREE.Vector3();
  function mouthDoc() {
    mouthAnchor.getWorldPosition(_mw);
    return {
      x: _mw.x / view.worldPerPx + world.viewport.w / 2,
      y: window.scrollY + world.viewport.h / 2 - _mw.y / view.worldPerPx
    };
  }
  // WHERE THE BEAM STARTS is not where the mouth is, and it cannot be.
  //
  // the mouth anchor is a 3d point on the muzzle; the beam is a 2d shape in
  // document space. Those only agree when mew happens to be side-on to the beam.
  // Fire while facing the camera and the muzzle projects to somewhere near the
  // MIDDLE of the head's silhouette, so the beam's root -- and the round muzzle
  // flash centred on it -- erupts from inside mew's face.
  //
  // so the beam leaves from a point pushed along its own direction, far enough
  // to clear the head from any angle (the head is ~0.45 model units of radius,
  // which is 0.26 of the character's height). The charge glow stays on the
  // mouth, where the energy should gather; only the shot moves.
  function beamOriginDoc(dir) {
    const m = mouthDoc();
    const lead = cfg.sizing.characterHeightPx * cfg.attack.muzzleClearFactor;
    return { x: m.x + dir.x * lead, y: m.y + dir.y * lead };
  }
  beamFx = createBeamFx({ docFxGroup, config: cfg.attack, getMouthDoc: mouthDoc });

  world.on("beamCharge", () => beamFx.startCharge());
  world.on("beamFire", ({ dir }) => {
    const origin = beamOriginDoc(dir);
    const reach = beamLength(origin, dir, world.docSize);
    // THE TYPE LAYER'S HOOK, and it has to be emitted from here rather than
    // subscribed straight off "beamFire": the brain emits only a DIRECTION,
    // because the document-space origin needs the mouth anchor, which is a
    // scene-graph object that lives in this file. So this re-emits the shot in
    // the space the field works in -- origin, unit direction, reach -- and the
    // field subscribes to that. Nothing in src/engine changes.
    world.emit("beamShot", { origin, dir, length: reach });
    // THE BEAM NO LONGER DESTROYS ANYTHING. fx/destruction.js -- which carved
    // permanent alpha masks into DOM elements -- is deleted; the beam now
    // DISPLACES the ASCII type field instead and the type drifts home
    // afterwards (DESIGN_BIBLE.md 6.4, IMPLEMENTATION_PLAN.md phase 5). All
    // that is left here is how far the shot reaches, which is pure geometry.
    // The type layer listens for "beamShot" above.
    beamFx.fire(origin, dir, reach);
  });

  // THE SPAWN. the sparkle hangs off characterRoot, which carries position and
  // nothing else, so the burst follows mew around without inheriting the body's
  // rotation or the model's scale and its sizes stay honest screen pixels.
  sparkle = createStarBurst({
    parent: characterRoot, config: cfg.shiny.sparkle, view
  });
  if (isShiny) sparkle.shiny((Math.random() * 0xffffffff) >>> 0);
  // ANNOYANCE STARS on a hard collision, same emitter
  world.on("flail", () => sparkle.annoy((Math.random() * 0xffffffff) >>> 0));
  limbFx = limbs;

  // debug handle for devtools + automated checks. `renderer` is exposed
  // specifically so the router's manual leak procedure (test/type.test.js)
  // can read renderer.info.memory from the console -- there is no other way
  // to get at it from outside this module.
  // ASSIGN, never replace: the type field publishes itself here too and this
  // callback is the slower of the two (a glb download against a png decode).
  window.__AW__ = Object.assign(window.__AW__ || {}, {
    rig, world, body, brain, view, poser, face, faceOv, skinned, shade,
    sparkle, isShiny, THREE, mouthDoc, beamOriginDoc, renderer
  });
  loop.start();
}, undefined, (err) => console.error("[mew] failed to load model:", err));

let beamFx = null;
let sparkle = null;
let shadeFx = null;
let limbFx = null;

function fitModel() {
  if (!rig) return;
  const s = (cfg.sizing.characterHeightPx * view.worldPerPx) / rig.height;
  view.modelScale = s;
  holder.scale.setScalar(s);
  // pivot: physics point sits at the body center, not the feet
  const pivotY = rig.bounds.min.y + rig.height * cfg.sizing.pivotFactor;
  holder.position.y = -pivotY * s;
  body.radius = cfg.sizing.characterHeightPx * cfg.sizing.radiusFactor;
}

// --- frames are reclaimed, never capped --------------------------------------
// bible 7.3, and it is a reversal of an earlier draft: RENDER AT THE DISPLAY'S
// NATIVE RATE. Capping to 60 on a 120 Hz ProMotion panel with a character
// always moving on it is visible judder, and it saves a fraction of a percent
// of an 8.33 ms budget that the field uses about 5% of. Frames come back only
// from:
//
//   (a) document.hidden        -- stop entirely. No rAF while nobody is looking.
//   (b) 45 s of no input       -- drop to 30. Nobody is watching closely.
//   (c) the degradation ladder -- weak hardware, measured, not guessed.
//
// createGovernor returns the predicate renderFrame asks before drawing.
function createGovernor() {
  const budget = siteConfig.budget;
  let idleSkip = 0;
  const win = [];
  let rung = 0;

  // the ladder, in the plan's order (section 4.7): dpr, then drift, then the
  // re-roll rate. Glyph QUALITY is never stepped down -- a coarser field still
  // looks designed, a badly matched one looks broken.
  const RUNGS = [
    () => {},
    () => renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.5)),
    () => field && field.setDegrade(0, 1),
    () => field && field.setDegrade(0, 2)
  ];

  siteScope.listen(document, "visibilitychange", () => {
    if (document.hidden) loop.stop();
    else loop.start();
  });
  // anything the user does counts as input. The field's own motion does not,
  // or the page would never be idle.
  const wake = () => { world.pointer.lastMoveAt = world.time; };
  for (const ev of ["pointermove", "pointerdown", "keydown", "wheel", "scroll"]) {
    siteScope.listen(window, ev, wake, { passive: true });
  }

  return function govern(dt) {
    if (budget.longIdleFps > 0 && world.time - world.pointer.lastMoveAt > budget.longIdleS) {
      idleSkip = (idleSkip + 1) % 2;
      if (idleSkip) return false;
    }
    win.push(dt * 1000);
    if (win.length >= 240) {
      win.sort((a, b) => a - b);
      const p90 = win[Math.floor(win.length * 0.9)];
      win.length = 0;
      if (p90 > 22 && rung < RUNGS.length - 1) {
        RUNGS[++rung]();
        console.warn(`[perf] frame p90 ${p90.toFixed(1)} ms -- degradation rung ${rung}`);
      }
    }
    return true;
  };
}

// --- loop --------------------------------------------------------------------

let simTime = 0;
let govern = null;

const loop = createLoop({
  simStep(dt) {
    simTime += dt;
    world.tick(dt);
    brain.step(dt);
    body.step(dt);
    resolveAll(body, world, cfg.physics);
  },
  renderFrame(dt, alpha) {
    if (!govern) govern = createGovernor();
    if (!govern(dt)) return;
    // ONE CLEAR PER FRAME, ours (see renderer.autoClear above). Then the field
    // underneath, then mew's pass composited on top of it -- her blit is
    // already `transparent` and discards its own background, so it lands over
    // the type rather than replacing it.
    renderer.clear();
    // the transit rides the ONE render loop -- see src/site/transit.js. It runs
    // before the field so the camera and the MIGRATE uniform are this frame's,
    // not last frame's.
    transit.tick(simTime * 1000);
    if (field) {
      field.update(dt, simTime);
      field.render();
    }
    if (!rig || !poser) return;
    // interpolate the fixed-step DOC position, then convert to viewport px by
    // subtracting the live scroll offset (native-smooth under scrolling)
    const ix = lerp(body.prevPos.x, body.pos.x, alpha);
    const iy = lerp(body.prevPos.y, body.pos.y, alpha) - window.scrollY;
    poser.update(dt, simTime);
    const bob = ctxBase.visual.bobPx;
    let px = ix + bob.x;
    let py = iy + bob.y;
    // THE SHAKE. the other half of a good impact: the whole character buzzes
    // on the flail's own envelope. It rides the RENDER position only, exactly
    // like the bob, so physics and collision never feel it.
    if (limbFx && limbFx.flail > 0.001) {
      const f = limbFx.flail * cfg.limbs.flailShakePx;
      const w = simTime * cfg.limbs.flailShakeHz * 2 * Math.PI;
      px += Math.sin(w) * f;
      py += Math.cos(w * 1.37) * f * 0.7;
    }
    const snap = present.snapPx();
    if (snap > 0) {
      // quantize the RENDER position to the texel grid: classic sprite crawl.
      // physics and animation are untouched
      px = Math.round(px / snap) * snap;
      py = Math.round(py / snap) * snap;
    }
    characterRoot.position.set(view.toWorldX(px), view.toWorldY(py), 0);
    aimKey();
    updateDocFxGroup();
    // the sparkle drives the material flash: one clock, so the stars and the
    // blow-out can never drift apart
    if (sparkle && sparkle.running) shadeFx.setFlash(sparkle.update(dt));
    if (beamFx) beamFx.update(dt, simTime);
    present.render(scene, camera, { dt, scrollY: window.scrollY });
  }
});
