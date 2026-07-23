# HANDOFF — AnimationWeb continuation context

For any Claude Code session continuing this project. Read this FIRST, then
IMPLEMENTATION_PLAN.md (kept current, full specs). CLAUDE_CODE_PROMPTS.md has
phase-prompt templates. This file carries the context that lived in the
original Cowork chat: history, conventions, pitfalls already paid for, and the
owner's standards.

## What this is

Portfolio site (Vite + Three.js, vanilla ESM) with a procedurally animated
low-poly Mew floating around the page. No keyframes anywhere: physics,
springs, and noise drive everything. Currently at v3.7. All 498 headless
checks pass (`node test/sim.test.js`), and `python3 tools/check_model.py`
reports the model clean.

## Owner's working rules (non-negotiable)

1. Naturalness is the acceptance bar. If motion looks stiff or wrong, find the
   STRUCTURAL cause (wrong stiffness model, wrong reference frame, missing
   follow-through, geometry too small to read). Do not mask symptoms with
   parameter fiddling. Recognize when an issue actually is surface-level
   before tuning.
2. The owner tests visually in his own browser (`npm run dev`, localhost:5173)
   and gives feedback. Do NOT browser-test each change; verify headlessly
   (tests + `node test/dump_motion.js` -> `python3 tools/render_motion.py`).
3. Character aesthetics (eye style, colors) are the owner's call. The v3.7
   rebuild of the mesh/rig was explicitly commissioned; the face is PAINTED
   into src/assets/mew_face.png for him to restyle. Do not redesign the
   silhouette or repaint the face unasked.
4. Comments: relaxed tone, full lowercase (except abbreviations). Never
   regenerate whole files when a patch will do.
5. All tuning constants live in `src/config/rigConfig.js`. A future custom
   model must swap in by editing rigConfig only (bone role map). Never
   hardcode bone names or magic numbers in engine files.
6. Everything frame-rate independent: `expDamp`, `Spring`, `QuatSpring`
   (src/utils/math.js, src/engine/pose/quatSpring.js). Raw per-frame lerps are
   banned. Sim runs at fixed 120 Hz (loop.js); pose layers run per render
   frame with their own substepping where needed.
7. FX work: one-time cost at event time, zero or near-zero per-frame cost.
   Pure math goes in headless-testable modules (pattern: fx/beamGeometry.js).

## Architecture map (src/)

- `main.js` — boot, view mapping (doc px <-> world), doc-anchored fx group,
  mouth anchor (Object3D parented inside the head bone), event wiring.
- `config/rigConfig.js` — bone roles + ALL tuning. Read it top to bottom.
- `engine/world.js` — shared state + event bus. Pointer/colliders in DOCUMENT
  coords. `world.poseState.leanIn` is written by bodyPose, read by brain.
- `engine/loop.js` — fixed-step accumulator + render interpolation.
- `engine/physics/body2d.js` — point mass (doc px). `colliders.js` — DOM rects
  (doc space) + document bounds, bump events, `recollect` listener.
- `engine/behavior/pathfinder.js` — doc-wide occupancy grid, A* (no corner
  cuts), LOS smoothing, nearest-free fallback. Rebuilds on collidersVersion.
- `engine/behavior/brain.js` — FSM: hover / cruise / seek / flourish /
  startle / recover / charge / fire. Steering, lean-gated thrust, whiskers,
  orbital idle drift, pet->beam flow, `moveIntent`, `gazeHoldUntil`.
- `engine/pose/rig.js` — resolves bone roles, captures rest pose, char-frame
  helpers (`charQuatOf`, `applyCharDelta`). `poser.js` — resets all bones to
  rest each frame, runs layers in order: bodyPose -> limbPose -> headLook ->
  earSprings -> tailChain -> faceMorphs (order matters; tail reads final
  parent transforms).
- `engine/pose/bodyPose.js` — THE core. Long-axis (head-first) travel
  alignment via QuatSpring, intent-driven lean-in, wandering roll about the
  long axis (side-profile anchor, turn-triggered half-spin flips), belly-in
  banking from path curvature (this carves loops), spine undulation shared
  via `shared.swimPhase`, charge rock-back, fire brace (body snaps onto the
  beam axis), breathing, bob, squash. Exports `shared.bodyQuat`,
  `shared.swimAlign`, `shared.trailDir`, `world.poseState.leanIn`.
- `engine/pose/headLook.js` — saccadic cursor gaze in the body frame, flight
  base pitch (face leads), gaze freeze during fire + `gazeHoldAfterS`, charge
  rock, fire jerk, micro-drift + head roll (anti-stiffness).
- `engine/pose/limbPose.js` — hover/cruise pose blend (fire forces cruise),
  follow-through (feet loosest), foot flutter locked to swim wave.
- `engine/pose/earSprings.js` — underdamped ear springs, twitches, flatten.
- `engine/pose/faceMorphs.js` (v3.7) — drives the head's morph targets. Random
  blinks (fast close / slower open, occasional double), plus squint+smile from
  the brain's state, agitation and speed. Runs LAST in the poser (it touches
  morphTargetInfluences, not bones, so order is free). All knobs in
  `rigConfig.face`; `enabled: false` freezes the neutral face.
- `engine/pose/tailChain.js` — verlet particle chain. The traveling wave is
  CIRCULARLY POLARISED (`tail.waveSwirl`): a second force component on the
  binormal, a quarter cycle out of phase, so the bending plane rotates down the
  chain and the tail coils rather than buckling flat in one plane. Plus an
  explicit anti-fold nudge past `unfoldStart`, and NON-ADJACENT self-separation
  (`selfSepMul`) so the chain physically cannot lie back through itself. Length,
  angle and separation constraints all relax inside the same iteration loop --
  the angle limit used to run once after the length loop, so a hard bend only
  ever got one softened pass at it. Also: shape memory toward the
  rest s-curl, morphing to a straight trail at flight alignment
  (`shared.trailDir` overrides direction during the beam brace), traveling
  wave phase-locked to `shared.swimPhase`, distance + soft angle constraints,
  bone mapping via swing quats with persistent smoothing. Two more constraints:
  a BASE CONE (`rootAngleLimitDeg`/`rootAngleSoftness`) holds the first segment
  inside a cone of the body-carried rest direction so a fast turn can't fling
  the root ~180 deg onto its own length (shape memory alone gets outrun); and
  SCROLL COMPENSATION -- the sim integrates in three's scene space, which bakes
  in -scrollY (main.js is doc-anchored), so each frame it rigidly shifts every
  particle by the anchor's scroll delta (keyed off `world.scroll.y`), or the
  page drags the tail. body physics live in doc space and never feel scroll.
- `engine/fx/beamGeometry.js` — pure beam math (headless-tested).
  `destruction.js` — canvas alpha-mask carving on DOM elements (permanent,
  accumulates, drops colliders > 50% destroyed). `beam.js` — layered additive
  beam + charge glow (reads `getMouthDoc`).
- `engine/fx/presentation.js` (v3.6) — PRESENTATION PASS SELECTOR. Reads
  `rigConfig.presentation.mode` (`"pixelate"` | `"cutout"` | `"none"`) and
  returns one common interface so main.js never branches on the look:
  `pixelRatio(dpr)`, `snapPx()`, `resize(w,h)`, `render(scene, camera, {dt,
  scrollY})`, `dispose()`. Overlay asset filenames map to Vite `?url` imports
  here. Adding a third look = one new module + one entry.
- `engine/fx/pixelate.js` — the RETRO look: the whole scene renders into a
  low-res target (viewport / `pixelSize`), then one fullscreen shader upscales
  with NearestFilter, encodes linear->sRGB, lifts the shadows (`shadeLift`),
  posterizes into `colorLevels` sprite bands, and draws a dark silhouette
  outline from alpha edges (4-neighbor test). CHEAPER than direct rendering.
  `snapToGrid` quantizes only the RENDER position to the texel grid (sprite
  crawl); physics and animation are untouched. `bandLuma: true` bands
  BRIGHTNESS and rescales the chroma, so the hue survives quantization —
  banding r/g/b separately rounds the channels apart and neutralizes the pink
  (that was half of the "it looks purple" bug).
- `engine/fx/cutout.js` (v3.6) — MEW AS A HOLE IN THE PAGE. The scene renders
  to a full-res MSAA target and only its ALPHA is used, as a stencil: inside
  the silhouette a stationary picture (png, or an animated gif via
  `<img>` -> canvas -> CanvasTexture at `gifFps`) is sampled in SCREEN space
  and cover-fitted; outside, the fragment discards so the site shows through.
  Because the picture is sampled in screen uv it never moves with the
  character — Mew swims across a still image and reveals it in its own shape.
  `scrollWithPage` re-pins the picture to the document instead. Edges are
  feathered by box-blurring the alpha then `smoothstep(edgeLo, edgeHi)`.
  NOTE: everything three renders contributes alpha, so the hyper beam carves a
  beam-shaped window too. If that is unwanted, hide `docFxGroup` for the mask
  render or put the fx on their own layer.
- `engine/fx/presentMath.js` — pure, headless-tested math shared by both
  passes: the exact linear->sRGB transfer curve (plus its GLSL mirror),
  cover-fit, scroll uv offset. Same pattern as beamGeometry.js.

## Hard-won pitfalls (do not rediscover these)

- three's GLTFLoader SANITIZES node names: "ear.L" -> "earL", "tail.001" ->
  "tail001". rigConfig uses sanitized names.
- InstancedMesh: set `frustumCulled = false`. The bounding volume sits at the
  fx-group origin (page top-left), which is almost always off camera —
  instances silently vanish otherwise.
- Bones are reset to rest EVERY frame by poser. Any cross-frame smoothing must
  keep its own state (see tailChain `smoothed`), never smooth on
  bone.quaternion directly.
- Root-relative quats: always work with the rotation DELTA from rest
  (`charQuatOf(bone) * restCharQuat^-1`), never raw quats — rest orientations
  are non-identity.
- Anything mounted to a bone (like the mouth anchor) should be a real
  Object3D child of the bone, placed once in bone-local space. Do not
  reconstruct bone-relative positions per frame with quaternion algebra.
- The seek goal is LATCHED per seek (cursor vs offscreen). Re-electing every
  step lets two goals fight and freeze the character at the trigger shell.
- Loop-de-loop must be a FLOWN circle bigger than the body (radius from
  speed), or it reads as a sideways dodge.
- The site is light-themed: additive glows wash out on white. Cinders use
  bright saturated colors with normal blending; fades go TOWARD the page tone.
- Headless dump scenarios must keep the scripted cursor inside the scripted
  viewport (real cursors always are); violating this creates fake behavior
  bugs.
- The doc-anchored fx group has scale.y = -worldPerPx (reflection). Materials
  there need DoubleSide.
- SCROLL DRAGS THE TAIL (paid for once). The character is rendered doc-anchored:
  main.js bakes `-scrollY` into `characterRoot.position` every frame. The tail
  is the ONLY system that integrates persisted positions in scene space, so
  scrolling translates its anchor while the verlet particles lag -> the tail
  trails the page. Body physics live in doc space and are immune, which is the
  tell. Fix lives in `tailChain` (rigidly shift all particles by the anchor's
  scroll delta each frame); do NOT try to fix it by moving the camera or the
  render mapping. `test/tail_scroll.js` is the regression gate.
- THE TAIL FLOPPING/FOLDING WHEN TURNING FAST was the first segment swinging
  free of the body: the angle limit only coupled segment-to-segment (loop starts
  at i=2), so nothing tied the base to the body's tail-root direction. Shape
  memory is a soft spring and a hard turn (~840 deg/s) outruns it -- the base
  lagged to ~177 deg (nearly backward), which reads as a flop and folds in
  projection. The existing probe missed it because it only measures neighbour
  bend (stayed 39 deg). The base cone (see tailChain) caps it; `test/tail_turn.js`
  reports the base-vs-body angle the probe lacks. When a tail issue is about
  where the WHOLE tail points, measure base-vs-body, not segment-vs-segment.
- COLOR SPACE (this one cost a "why is Mew dark purple" round trip): three only
  applies the output sRGB encode when it renders to the DEFAULT framebuffer,
  and it never injects the encode into a raw ShaderMaterial. Any pass that
  renders the scene into a WebGLRenderTarget and blits it with a custom shader
  must call `linearToSrgb` itself, or the linear lighting result lands in an
  sRGB canvas untouched and every mid tone comes out roughly 25-30% too dark
  and hue-shifted. Do NOT "fix" this by setting `rt.texture.colorSpace =
  SRGBColorSpace`: three then allocates SRGB8_ALPHA8 and the GPU silently
  decodes back to linear on sample, so you end up exactly where you started.
- Posterizing r/g/b independently drags hues around (channels round apart).
  Band luminance and rescale the color instead if hue matters.
- The light rig is in `rigConfig.lighting`, NOT in main.js. The hemisphere
  ground color is the shadow-side hue: keep it in the character's color family
  (a grey-purple ground is what dirtied the pink). `ambientIntensity` vs
  `keyIntensity` is the flatness/volume dial.
- A DIRECTIONAL light's position is meaningless on its own — only
  (position - target.position) matters. Making one "follow" the character
  requires moving the TARGET too, which is what `aimKey()` in main.js does.
- MODEL PIPELINE pitfalls, all paid for once:
  - Extracting a socket ring and THEN opening another socket rots the first
    ring's indices (vertex removal renumbers). Rings live in `mesh.rings` and
    are remapped by `remove_vertices` for exactly this reason.
  - Removing a k×k block of quads orphans its (k-1)² interior vertices. Clean
    them up at removal time, not in a sweep at the end.
  - Building tube ring frames from a fixed world axis (`cross(dir, +z)`)
    collapses wherever the curve turns parallel to that axis — the tail does,
    twice, and became a flat ribbon. Use `transport_frames` (rotation-minimising).
  - Two 3×3 ear sockets on a res-6 head share the centre column and push those
    vertices to valence 6. 2×2 sockets with a flared first ring read just as
    broad and stay regular.
  - `preview_model.project()` flips Y for screen space, which flips the sign of
    the 2D cross product. Culling `area > 0` renders the FAR side of the model,
    which looks plausible on a symmetric character — the tell was the painted
    eyes appearing in the back view. Keep `area < 0`.
  - three's GLTFLoader cannot decode an embedded PNG in node (`self.URL`,
    `createImageBitmap`). `test/glbHeadless.js` strips images/textures from the
    JSON chunk before parsing so the headless harness still works.
  - A morph built from a SPHERICAL falloff fades out exactly where the vertex
    has furthest to travel: the blink came out a 4% twitch. Lids need a lateral
    (x,z) falloff times a near-flat vertical band.
  - UV ORIGIN: glTF puts (0,0) at the image's TOP-LEFT with v increasing
    DOWNWARD, and GLTFLoader sets `flipY = false`. Painting the atlas with the
    OpenGL v-up convention puts the face on the wrong half and the model
    renders faceless. Worse, preview_model sampled with the same flipped
    convention, so the two mistakes cancelled and the preview looked perfect.
    `check_model.py` now asserts the eye/swatch texels using the glTF
    convention explicitly — that is the guard, keep it.
  - Sampling a catmull curve by its PARAMETER bunches rings wherever control
    points sit close together (the tail socket is 0.03 from tail.001, which
    produced duplicate vertices). Resample by ARC LENGTH.
  - THE TAIL "FOLDING INTO ITSELF" WAS A PROJECTION ARTEFACT, not physics.
    v1's rest curve had an x spread of 0.04 over its whole length -- effectively
    planar in Y-Z. Seen from the front that arc is edge-on and projects into a
    hairpin, while in 3D the strands were ~1.8 segment-lengths apart (measure it
    with `node test/tail_probe.js`). The fix was authoring a genuinely 3D curve
    (`_TAIL_SHAPE` in build_mew.py sweeps out in +x as it goes back and up).
    Before blaming the sim, check whether the thing you are looking at is just
    depth collapsing.
  - A symmetric ear taper narrows from BOTH sides and reads as a cone stuck on
    the skull. `ear_outer_bias` slides each ring outward as it narrows so the
    outer edge stays straight and continues the head's silhouette.

## Current motion design (v3.3)

- Idle: orbital drift (circular trails, wandering radius/speed, epicycle,
  rare direction flips) tracked by a near-critical PD. No random forces.
- Travel: brain sets `moveIntent`; body leans onto the line first (weak
  thrust, `leanThrust.minMul`), and once `poseState.leanIn` crosses ~0.9 the
  throttle opens (`maxMul`) and pulls toward maxSpeed 1400. Anime burst.
- Flight posture: long axis on the velocity line, head first, face leading
  (headLook base pitch), tail streaming with wave, feet fluttering, roll
  wandering around side-profile with turn-flips.
- Loops: on fast arrivals/sudden stops; accelerate into a circle sized from
  entry speed; belly faces the circle center via curvature banking.
- Beam: pet (clean click) -> 1.5s charge; the BRACE begins `braceStartS`
  (0.1s, owner-tunable) into the charge: head dips first (`braceDipRad`, which
  also forces downward braces to fold through the FRONT -- never the wrong-way
  180 spin), then the body folds lengthwise onto the live cursor axis with a
  deterministic beam-relative belly (horizontal beam -> belly down / side
  profile, beam up -> belly to camera, beam down -> belly away; roll wander is
  FROZEN while bracing). Fire: recoil slides it back along the axis, head
  jerks forward, tail streams behind the beam (trailDir override), gaze frozen
  until 0.5s after the beam fades. Beam stationary in doc space, disintegrates
  elements via canvas masks; holes become pathable. Cinder particles were
  REMOVED by owner decision (v3.4) -- do not reintroduce without asking.
- Grab & fling: pressing on mew grabs it ("held" state, snappy spring to the
  hand with lag + dangle); moving past `fling.grabThresholdPx` makes it a
  drag, releasing throws it with the hand velocity ("flung" ballistic state,
  may end in a loop or a wall-bump startle). A press that never moves resolves
  to the pet on release.

## Verification workflow

- `node test/sim.test.js` — 498 checks: math, physics, pathfinding, quat
  spring, seek/charge/fire/flourish state machines, tail integrity on a real
  bone chain, beam geometry, sRGB transfer, cutout cover-fit, and an analytic
  mirror of three's lambert path that pins the light rig to "bright pastel
  pink, low contrast" (catches dark/purple regressions headlessly).
- `node test/tail_probe.js [--flat]` — runs the real rig through a deliberately
  violent scenario and reports max bend, fold count, closest non-adjacent
  approach, and torsion (planar vs helical). `--flat` restores the old planar
  wave for an A/B. NOTE: measures only neighbour-to-neighbour bend, so it does
  NOT catch the tail pointing the wrong way as a whole — use tail_turn for that.
- `node test/tail_scroll.js` — PASS/FAIL gate for the scroll-drag bug: moves the
  anchor a long way via scroll and asserts the tail's shape stays invariant
  (exit 1 on regression).
- `node test/tail_turn.js` — diagnostic for fast turns: reports base-vs-body
  angle (the "flops on its length" number), peak turn rate, bend, folds.
  `node test/tail_turn_dump.js && python3 tools/plot_turn.py` draws a before/after
  filmstrip (base cone off vs on).
- Shader syntax can be checked headlessly by parsing the GLSL template
  literals with `@shaderfrog/glsl-parser` — it will not catch link errors, but
  it catches typos without a browser.
- `node test/dump_motion.js` -> `python3 tools/render_motion.py motion_dump.json out.png`
  — runs the FULL engine + real GLB headlessly through a scripted scenario,
  renders pose filmstrips + smoothness metrics (tail jerk, positions).
  Startle frames legitimately spike jerk (whip = intended).
- `python3 tools/check_model.py` — the MODEL gate: topology (all-quad,
  manifold, winding, valence, Euler), weight sanity (normalised, no orphans,
  single-hinge hands/feet, no weight cliff across the neck), morph coverage,
  rigConfig bone-role resolution, and a hard-pose deformation check. Writes
  turnaround/wireframe/weight/pose/expression renders to `tools/preview/`.
- `python3 tools/build_mew.py` — rebuild the model after editing CFG or the
  face texture. Fast (<1s) and deterministic.
- `npm run build:single` — one-file dist for file:// checks.

NOTE: `npm run build` needs rollup's native binary for the host platform. If
node_modules was installed on a different OS it will fail with MODULE_NOT_FOUND
on `rollup/dist/native.js`; reinstall deps on the machine doing the build.

## Model / asset pipeline (v3.7 — rebuilt from scratch)

`tools/build_mew.py` — **pure Python + numpy, no Blender**. Builds geometry,
the 20-joint rig, weights, UVs, the painted face texture and the expression
morphs, and writes `src/assets/mew.glb` (+ copy in `public/models/`). Runs
anywhere, so every step is verifiable headlessly. The old Blender script is
kept at `tools/legacy/build_mew_blender_v1.py`; the v1 model and the original
Sketchfab file are at `tools/legacy/*.glb`.

- `tools/meshkit.py` — all-quad mesh toolkit: cube-spheres, socket openings,
  ring bridging, lofts, rounded caps, and the topology validator.
- `tools/glbtool.py` — minimal GLB read/write (incl. sparse accessors).
- `tools/preview_model.py` — software rasterizer turnarounds (`--wire`,
  `--tex`, `--morph blink=1`). No GL context needed.
- `tools/check_model.py` — the verification pass: topology, rig, weights,
  morphs, engine contract, plus quad-wireframe / weight-map / posed /
  expression renders into `tools/preview/`.

**Model design (v2 mesh).** Authored ALL QUADS; triangulated only at export,
then vertex-split for flat faceted normals. Five closed shells (trunk, 2
hands, 2 feet) — Euler +10, fully manifold, consistently outward, no vertex
outside valence 3-5. ~796 quads / 1592 tris, matching v1's budget.
Head/neck/body is one continuous surface (the neck is a real lofted tube
bridging sockets cut in the body and head cube-spheres), so the head deforms
smoothly instead of tearing. Ears extrude from 2x2 sockets on the head's top
face. Tail is a transported-frame tube welded into a socket on the body's back,
following the v1 joint curve, scaled 1.34x away from its base at the owner's
request. Because rig.js derives `tailRest` lens/dirs from the joint positions,
`tailChain` re-tunes itself with no code change. The last ~20% of the radius
profile is a hemisphere, so the tip is a real rounded bulb rather than a flat
coons cap.

**Rig.** Same 20 bone names as v1, so rigConfig needed no bone edits. Two
deliberate changes: the `head` bone now sits at the NECK TOP (y=0.80) so the
head swivels on the neck rather than spinning about its own centre, and
hands/feet are weighted 100% to a single joint each — they are genuinely
single-hinge parts, as the design calls for. Rest orientations are all
IDENTITY: every pose layer works in char-frame deltas, so identity rest
produces identical motion from a far simpler file (verified in rig.js's
`applyCharDelta` math).

**Eyes are painted, never modelled.** `src/assets/mew_face.png` is generated by
`paint_texture()` and embedded in the GLB. The head's front quads get a big
undistorted planar UV island; everything else samples one flat pink swatch.
UVs are stored per quad-CORNER, so the island border is a free UV seam. Edit
the PNG (or the function) and re-run the builder to restyle. The base pink is
sRGB 251,228,238 — exactly v1's linear albedo, so the light rig is unchanged.

**Expressions.** Three morph targets — `blink`, `squint`, `smile` — driven by
`engine/pose/faceMorphs.js` (auto-blink with double-blinks, mood from the
brain's state/agitation/speed; all knobs in `rigConfig.face`). Deltas are
built from spatial falloff FIELDS, not special topology, so they survive any
resolution change. Stored as glTF sparse accessors (~2 kB each instead of 55).

## Open ideas (owner-approved directions, not yet built)

Scorch decals on the page background along the beam path, WebAudio hooks
(charge whine, beam roar), drop-shadow blob under mew, rare idle easter eggs
(grooming, nap after long inactivity), `prefers-reduced-motion` mode, eye
blink via eye-geometry scaling once the final model lands. (Grab & fling is
DONE. Cinders were built and then removed by owner decision.)
