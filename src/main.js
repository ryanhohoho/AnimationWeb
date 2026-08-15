// main.js
// boot: renderer, model load, rig build, system wiring, the loop.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import mewUrl from "./assets/mew.glb?url";

import { rigConfig } from "./config/rigConfig.js";
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
import { createScope } from "./utils/lifecycle.js";
import { createDeck } from "./site/deck.js";
import { createGate } from "./site/gate.js";
import { createRouter } from "./site/router.js";
import { mountPage } from "./site/pages.js";
import "./styles/site.css";

// ONE canvas for the whole session (index.html explains the layer contract).
// It is never recreated -- not on navigation, not on resize -- because every
// WebGLRenderer that gets thrown away leaks a GPU context that the browser will
// only reclaim by killing an older one.
const canvas = document.getElementById("stage");
const world = createWorld({ seed: 20260719 });

// --- the site ----------------------------------------------------------------
// THE SHEET GOES UP FIRST, before the model is even requested. Type on bone
// paper is already the whole picture, so the page is finished and readable from
// the first frame; the print develops into it and mew arrives into a room that
// already exists, rather than the page waiting on a 400 KB glb to look like
// anything at all.
const siteScope = createScope("site");
const deck = createDeck({
  scope: siteScope,
  // her hole is half again her own height: big enough to read as a cut she is
  // carrying, small enough that it never becomes a spotlight following a cursor
  haloPx: Math.round(rigConfig.sizing.characterHeightPx * 1.5)
});

// ROUTING WITHOUT NAVIGATION. Mew is a live WebGL context with physics and a
// brain; a real page load would kill her and start a new one, and she has to
// still be there on the other side. So the SHEET changes and the window does
// not. Every page gets its own scope, disposed the moment the next one is
// committed -- that is the whole leak story for navigation (utils/lifecycle.js).
let pageScope = null;
siteScope.add(() => pageScope?.dispose());
createRouter({
  scope: siteScope,
  deck,
  world,
  onPage(route) {
    pageScope?.dispose();
    pageScope = createScope("page");
    createGate({ scope: pageScope, deck });   // only the home sheet has one
    mountPage(route, { scope: pageScope, deck });
  }
});
document.body.classList.remove("pre");

// --- three setup -------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setClearColor(0x000000, 0);

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
  // each pass decides what resolution it wants to be fed
  renderer.setPixelRatio(present.pixelRatio(dpr));
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
    // THE BEAM DOES NOT TOUCH THE SHEET. fx/destruction.js -- which carved
    // permanent alpha masks into DOM elements -- is long deleted, and nothing
    // in this build reacts to the shot: the print is a still image and the type
    // is on paper. All that is left here is how far the shot reaches, which is
    // pure geometry (see DESIGN.md).
    beamFx.fire(origin, dir, beamLength(origin, dir, world.docSize));
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

  // debug handle for devtools + automated checks
  window.__AW__ = {
    rig, world, body, brain, view, poser, face, faceOv, skinned, shade,
    sparkle, isShiny, THREE, mouthDoc, beamOriginDoc
  };
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

// --- loop --------------------------------------------------------------------

let simTime = 0;
// the dipole's axis, held between frames so a stationary mew keeps her
// orientation instead of spinning on velocity noise

const loop = createLoop({
  simStep(dt) {
    simTime += dt;
    world.tick(dt);
    brain.step(dt);
    body.step(dt);
    resolveAll(body, world, cfg.physics);
  },
  renderFrame(dt, alpha) {
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
    // the hole she carries. Viewport coords, same as her own render position,
    // so it can never drift off her -- and it early-outs on whole pixels, so a
    // stationary mew costs nothing.
    deck?.setHalo(px, py);
    aimKey();
    updateDocFxGroup();
    // the sparkle drives the material flash: one clock, so the stars and the
    // blow-out can never drift apart
    if (sparkle && sparkle.running) shadeFx.setFlash(sparkle.update(dt));
    if (beamFx) beamFx.update(dt, simTime);
    present.render(scene, camera, { dt, scrollY: window.scrollY });
  }
});
