// mew.js
// THE ANIMAL: renderer, model load, rig build, the pose stack, the fx, the loop.
//
// Split out of main.js so that three.js is a SEPARATE CHUNK. The site -- the
// press, the type, the routing, the arrow keys, the swipe -- is three-free and
// interactive before this is even requested; she arrives into a room that
// already exists. If this chunk never loads, the page is unchanged except that
// there is no mew on it.
//
// Everything shared with the site comes in through bootMew's argument, so there
// is exactly one world, one deck and one lifecycle scope on the page.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import mewUrl from "./assets/mew.glb?url";

import { rigConfig } from "./config/rigConfig.js";
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
import { createSweatDrops } from "./engine/fx/sweatDrops.js";
import { createFaceOverlay } from "./engine/fx/faceOverlay.js";
import { lerp } from "./utils/math.js";

/**
 * @param world  the shared world -- one bus, one pointer, one scroll
 * @param deck   the press, already up and printing
 * @param scope  the site scope, so the renderer dies with the page
 * @param enter  the reader has already navigated before this booted (they
 *               arrived on a project sheet, where she is not): come in from the
 *               side like on any new sheet, instead of appearing mid-window
 */
export function bootMew({ world, deck, scope, enter = false }) {
  // ONE canvas for the whole session (index.html explains the layer contract).
  // It is never recreated -- not on navigation, not on resize -- because every
  // WebGLRenderer that gets thrown away leaks a GPU context that the browser
  // will only reclaim by killing an older one.
  const canvas = document.getElementById("stage");
  if (!canvas) return;

  // she dies with the page. One renderer for the session, so this only ever runs
  // on teardown -- but a WebGLRenderer that is dropped without dispose() leaks a
  // GPU context the browser will only reclaim by killing an older one, and this
  // module is now loaded asynchronously, which is exactly the shape of thing that
  // gets loaded twice by a hot reload.
  scope?.add(() => {
    try { loop?.stop?.(); } catch { /* never started */ }
    try { renderer.dispose(); } catch { /* already gone */ }
  });

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
    // what an effect pinned to the CHARACTER converts with. Equal to worldPerPx on
    // a wide window and smaller on a narrow one, because she is smaller there --
    // see characterPx(). Kept separate so that anything measured against the PAGE
    // still uses worldPerPx and does not shrink with her.
    fxPerPx: 0.01,
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
  createColliderTracker(world, scope);
  const brain = createBrain({
    body, world,
    config: cfg.behavior, pathConfig: cfg.path, attackConfig: cfg.attack
  });
  if (enter) {
    // off the window first, so the entrance is the teleport it assumes it is
    body.pos.x = -10 * body.radius;
    body.prevPos.x = body.pos.x;
    brain.enterFromSide();
  }

  // ── SHE IS ONLY ON HOME ──────────────────────────────────────────────────
  // By instruction (2026-09-26; before that, 2026-09-25, the four cards):
  // every other page is something to read, and she stays out of its way.
  // Nothing new had to be written for the leaving or the coming back, because
  // both already exist. Leaving Home is always a crossing, and the
  // crossing already sends her out of the window and holds the swap until she
  // is gone (router.js, mewIsClear). Coming BACK, the swap's `recollect` finds
  // her off screen and gives her the side entrance, the same one every new
  // sheet gets.
  //
  // So all this does is stop the clock while she is away, and only once she is
  // out of sight: `sleep` is a wish, and it is granted by the first frame on
  // which world.mewClear is true. Stopped means stopped -- no sim, no draw, no
  // GPU -- and the canvas is hidden (a class, not an inline style: the editor hides
  // her with the inline one, and waking must not overrule it) so nothing she left behind (a spark, the
  // tail of a beam) hangs over the work. world.time stops with her, so every
  // timer in the brain resumes exactly where it was.
  let asleep = false;
  let wantSleep = false;
  world.on("mewsleep", (e) => {
    wantSleep = !!(e && e.sleep);
    if (!wantSleep && asleep) {
      asleep = false;
      canvas.classList.remove("asleep");
      if (rig) loop.start();
    }
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
      const lead = characterPx() * cfg.attack.muzzleClearFactor;
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
    // ANNOYANCE STARS on a hard collision. The panic flails the same limbs and
    // gets none of this: it is a separate event for exactly that reason.
    world.on("flail", () => sparkle.annoy((Math.random() * 0xffffffff) >>> 0));

    // PANIC SWEAT, off the same root for the same reason
    sweat = createSweatDrops({ parent: characterRoot, config: cfg.sweat, view });

    // ── TWO WAYS TO BE STARTLED, AND THEY DO NOT LOOK THE SAME ──────────────
    // A cursor barging into her is RUDE, and the honest response to rude is a
    // tantrum: gold annoyance stars and the >.< face, which is exactly what a
    // hard collision already gets. A press eating the page out from under her, or
    // a wall she clipped at speed, is not something to be cross AT -- that is
    // fright, and fright sweats.
    //
    // The stars are fired directly rather than by emitting `flail`, and that is
    // deliberate: colliders.js suppresses `flail` while world.panicking precisely
    // so a panicking mew clipping the furniture does not throw a tantrum in the
    // middle of a flight that is supposed to read as fear. Borrowing the event
    // would walk straight around that guard. The >.< comes from the overlay's own
    // subscription to `startle`, so it lands on both.
    world.on("startle", (e) => {
      if (e.source === "cursor") {
        sparkle.annoy((Math.random() * 0xffffffff) >>> 0);
        return;
      }
      // the drops go off around the ESCAPE, and screen y runs down while this
      // spray is built in maths coordinates, so the sign flips on the way in
      sweat.burst(e.dir.x, -e.dir.y, e.intensity ?? 1,
        (Math.random() * 0xffffffff) >>> 0);
    });
    limbFx = limbs;

    // debug handle for devtools + automated checks
    window.__AW__ = {
      rig, world, body, brain, view, poser, face, faceOv, skinned, shade,
      sparkle, sweat, isShiny, THREE, mouthDoc, beamOriginDoc
    };
    loop.start();
  }, undefined, (err) => console.error("[mew] failed to load model:", err));

  let beamFx = null;
  let sparkle = null;
  let sweat = null;
  let shadeFx = null;
  let limbFx = null;

  /**
   * HOW BIG SHE IS ON THIS SCREEN. Linear between the two named widths, and it is
   * one function so that her model, her physics circle, her muzzle clearance and
   * every effect pinned to her all read the same number. Anything sized from her
   * and NOT from this would keep the proportions of a character twice as big the
   * moment the window narrowed.
   */
  function characterPx() {
    const z = cfg.sizing;
    // measured in DESIGN pixels (styles/designPx.js): the page above the tablet
    // breakpoint is the owner's 1512 px window scaled to fit, and she is sized
    // against that page -- a 27" monitor made the page 1.5x and left her at
    // her laptop size. The factor is read off the root, whose font-size is
    // 16 design px (1 at and below the tablet breakpoint, where it is 16px).
    const k = designScale();
    const w = Math.max(1, world.viewport.w / k);
    const t = Math.min(1, Math.max(0, (w - z.narrowAtPx) / Math.max(1, z.wideAtPx - z.narrowAtPx)));
    return (z.narrowHeightPx + (z.characterHeightPx - z.narrowHeightPx) * t) * k;
  }
  function designScale() {
    if (typeof document === "undefined" || typeof getComputedStyle !== "function") return 1;
    return parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
  }

  function fitModel() {
    if (!rig) return;
    const px = characterPx();
    const s = (px * view.worldPerPx) / rig.height;
    view.modelScale = s;
    // EVERY EFFECT PINNED TO HER SCALES WITH HER, through one number. The fx
    // modules size themselves in "character pixels" -- the sweat's temples, the
    // stars' ring -- and convert with this instead of worldPerPx, so a spray
    // tuned against a 150 px animal is still on her temples at 96.
    view.fxPerPx = view.worldPerPx * (px / cfg.sizing.characterHeightPx);
    holder.scale.setScalar(s);
    // pivot: physics point sits at the body center, not the feet
    const pivotY = rig.bounds.min.y + rig.height * cfg.sizing.pivotFactor;
    holder.position.y = -pivotY * s;
    body.radius = px * cfg.sizing.radiusFactor;
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
      if (wantSleep && !asleep && world.mewClear !== false) {
        asleep = true;
        loop.stop();
        canvas.classList.add("asleep");
        return;
      }
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
      // ...on a BUMP. Not on a flight: 5.5 px at 19 Hz is the other half of an
      // impact, and there is no impact in leaving.
      if (limbFx && limbFx.flail > 0.001 && !limbFx.panicking) {
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
      // SHE NO LONGER CARRIES A HOLE. She used to open a soft-edged aperture
      // wherever she went, which was the right idea on a single tall sheet where
      // she was the only thing moving. On a deck of four cards she reads better
      // as herself, unaccompanied -- and the hole she carried was the one thing
      // on the page dirtying the sheet on every pixel of her movement, so the
      // deck now genuinely idles when nothing is happening.
      aimKey();
      updateDocFxGroup();
      // the sparkle drives the material flash: one clock, so the stars and the
      // blow-out can never drift apart
      if (sparkle && sparkle.running) shadeFx.setFlash(sparkle.update(dt));
      if (sweat && sweat.running) sweat.update(dt);
      if (beamFx) beamFx.update(dt, simTime);
      present.render(scene, camera, { dt, scrollY: window.scrollY });
    }
  });
}
