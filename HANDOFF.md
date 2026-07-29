# HANDOFF — AnimationWeb continuation context

For any Claude Code session continuing this project. Read this FIRST, then
IMPLEMENTATION_PLAN.md (kept current, full specs). CLAUDE_CODE_PROMPTS.md has
phase-prompt templates. This file carries the context that lived in the
original Cowork chat: history, conventions, pitfalls already paid for, and the
owner's standards.

## What this is

Portfolio site (Vite + Three.js, vanilla ESM) with a procedurally animated
low-poly Mew floating around the page. No keyframes anywhere: physics,
springs, and noise drive everything. Currently at v4.3 (the meshy character,
every limb cut into its own shell, flat-pink skin with the face baked back on,
a tail deleted and regrown out of the butt as a follow-the-leader strand, sprite
shading that bands the light and leaves the painted eyes alone, and a 1-in-3
SHINY roll with the games' entrance animation). All headless checks pass
(`node test/sim.test.js`), and `python3 tools/check_mew.py` reports the model
clean.

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
- `engine/pose/limbPose.js` (v4.4 also owns THE FLAIL: on the `flail` event all
  four limbs windmill for 1.5 s, a fast oscillation added on top of the pose
  with a per-limb phase offset — lockstep reads as a machine, not panic — and a
  rate that WINDS DOWN over the burst, `flailHz` → `flailHzEnd`, which is most
  of what sells it as an animal rather than an effect. The phase is integrated,
  not evaluated: multiplying `time` by a falling frequency makes it jump
  backwards. It exposes `.flail` so main.js can shake the RENDER position on the
  same envelope, and the `>.<` overlay and the annoyance stars run to the same
  1.5 s so all three finish together.) — hover/cruise pose blend (fire forces cruise),
  follow-through, foot flutter locked to the swim wave, arms sculling on the
  same clock at `armPaddleRatio` of its rate. No hand roles: each arm is one
  rigid piece hinged at the armpit. EVERY INPUT IS SMOOTHED, because this layer
  writes straight onto the bones with no spring of its own — `body.accel` is the
  RAW physics acceleration and jumps by thousands of px/s² the instant a
  collider is hit, and it was reaching the feet through
  `followGain * footFollowMul` into a ±0.5 rad clamp: up to 66° of foot swing in
  one frame. That was the "feet snap at weird angles" report. The bump handler
  also used to set the flinch spring's POSITION, which is a teleport; an impulse
  belongs on the velocity (`flinchKick`), as earSprings does for its twitches.
- `engine/pose/earSprings.js` — underdamped ear springs, twitches, flatten.
- `engine/pose/faceMorphs.js` — drives the head's morph targets. Live again on
  v4: `tools/facemorph.py` builds `blink`, `squint` and `wince` (no `smile` —
  mew has no painted mouth to curve, and the layer skips a missing target).
  The `>.<` face is NOT one of them — see `engine/fx/faceOverlay.js`.
  Random
  blinks (fast close / slower open, occasional double), plus squint+smile from
  the brain's state, agitation and speed. Runs LAST in the poser (it touches
  morphTargetInfluences, not bones, so order is free). All knobs in
  `rigConfig.face`; `enabled: false` freezes the neutral face.
- `engine/pose/tailChain.js` (v4.2 — REWRITTEN AGAIN) — the tail as an
  INEXTENSIBLE STRAND: dynamic follow-the-leader over a posed rest curve. The
  tail is its own closed shell in the model and nothing else is weighted to its
  joints, so this file owns its motion outright.
  * WHY THE XPBD ROD WENT: it solved fine and still read as a RATTLESNAKE, for
    two reasons that had nothing to do with the integrator. (1) IT WAS DRIVEN,
    NOT FOLLOWING — a travelling-wave force pushed every particle at 1.5 Hz with
    a phase step of 0.72 rad/segment, which across ten segments is 6.5 rad, i.e.
    MORE THAN A FULL WAVELENGTH standing on the tail at all times; real tails
    carry a fraction of one. The force was also 4.5 units/s² against a gravity
    of 0.45 — ten gravities of buzz on a tip deliberately left free to whip.
    (2) THE HARD LIMITS RAN AS PROJECTIONS 720 TIMES A SECOND. A cone taking 55%
    of its excess per pass, at 2 passes × 360 substeps, is not a soft limit; it
    is a rigid one switching on and off as the body turns. That was the snap.
  * SO: THERE IS NO FORCING TERM AT ALL NOW. A tail flows because it FOLLOWS —
    the body moves, the strand lags, drag shapes the lag, the muscle poses it
    back. The idle motion is the REST CURVE swaying (`sway*`), which the strand
    then has to catch up with, so everything visible has inertia in it by
    construction.
  * DFTL (Müller, Kim & Chentanez 2012, *Fast Simulation of Inextensible Hair
    and Fur*): predict → pose → limit → follow-the-leader → corrected
    velocities. FTL walks root-to-tip putting each particle at exactly its rest
    length from its parent's ALREADY-CORRECTED position: one pass, O(n), exactly
    inextensible, unconditionally stable, no iteration count to tune. FTL cheats
    — moving a child adds momentum it never earned, which reads as wire — so the
    velocity update subtracts it back out, `v_i = (p_i - p_i_old)/h - s·d_(i+1)/h`
    with `s = ftlDamp`. `test/tail_probe.js --wire` is that knob at 0.
  * THE MUSCLE is a direction blend toward the posed rest curve, per segment, at
    a rate authored in Hz (`poseBaseHz` → `poseTipHz`). It is exponential, so it
    is exactly timestep independent — half the substeps gives the same tail,
    which "correct 55% per pass" never did. It runs inside the same root-to-tip
    walk as FTL, so it can never fight the length constraint.
  * THE SWAY AXIS IS THE SCREEN NORMAL, deliberately. Rotating a segment about a
    fixed BODY axis tilts it by the full angle only where the segment is
    perpendicular to that axis and by nothing where it is parallel — and this
    tail ends up pointing nearly straight up, so swaying about the body's up
    axis moved the tip by 0.05 of a segment. Invisible. This is a head-on sprite
    and bodyPose already turns the whole character in the screen plane; the
    secondary axis is perpendicular to the segment, a quarter phase behind, and
    supplies the depth.
  * ANISOTROPIC AERODYNAMIC DRAG (`dragNormal` ≈ 4.6× `dragTangential`) — kept.
    A slender body feels far more drag across its axis than along it, and that
    ratio is the entire reason real tails, ribbons and hair stream and flutter
    instead of just lagging. It is the only damping in the solver.
  * TAPERED MASS (`tipMassRatio`) — kept. Tails taper, so their linear density
    does; equal particle masses is why the old tip felt as heavy as the root.
  * `body.accel` IS LOW-PASSED before it reaches the follow-through term
    (`accelSmoothRate`). It is the raw physics acceleration and jumps by
    thousands of px/s² the frame a collider is hit — the same mistake that made
    the feet snap (see limbPose.js).
  * KEPT: the generous curvature clamp as a backstop, non-adjacent
    self-separation at a gap of THREE (a rod is a tube; points two segments
    apart are *supposed* to come close when it curves, and forcing them apart
    turns separation into a badly conditioned bend limit that fights the real
    one), `shared.trailDir` override during the beam brace, the teleport guard,
    the persistent bone-quat smoothing, and SCROLL COMPENSATION — the sim
    integrates in three's scene space, which bakes in -scrollY (main.js is
    doc-anchored), so each frame it rigidly shifts every particle by the
    anchor's scroll delta or the page drags the tail.
  * v4.3: THERE IS NO FLIGHT TARGET ANY MORE. `flightStraighten` used to
    collapse the whole target onto one straight trail line whenever mew was
    moving, and that was the in-flight rattle: a straight line has no memory of
    the turn, so on a heading change the stiff base snapped onto it while the
    soft tip lagged and the kink between them ran down the chain. In flight the
    tail now just carries its own rest curl and lags it, which IS the sweep. On
    `test/tail_probe.js --fly`: worst joint angle 53.5° → 23.8, tip jitter
    0.058 → 0.011 of a segment, torsion 20.4 → 7.3 °/joint.
  * v4.3: `targetLagRate` SMOOTHS the target's rotation. The socket sits 0.66
    world units from the rotation centre — half the tail's own length — so a
    hard reversal swings the target through most of a half-circle in a couple
    of frames. Lagging it makes that a sweep. A cruise is untouched (the target
    turns slowly there); on a realistic startle-and-chase it takes the worst
    joint angle from 66° to 37° and the jitter from 0.244 to 0.212.
    IT IS A LAG, NOT A RATE CAP, and the difference only shows under sustained
    rotation: with the flight straightening gone the target's rotation IS the
    body's, so CAPPING it decouples the tail outright — a 200 °/s cap left the
    tail 165° away from the body's ask, permanently, under tail_turn's 842 °/s
    spin. A lag settles to a fixed angle behind (62° there, which is what a
    trailing tail should do) and converges the moment the spin stops. Lower is
    not better: 6 /s pushes that offset to 88°, 4 /s to 177°.
  * v4.4: THE TAIL AIMS BEHIND THE MOTION. It used to hold its rest curl rigidly
    in the body's frame, so on screen it sat off to one side at all times like
    an accessory. Now ONE RIGID ROTATION of the whole curve about the screen
    normal turns its chord to point opposite the travel (`aim*`). Rigid is the
    entire point: a rigid rotation of a smooth curve is the same smooth curve,
    so unlike v4.2's per-segment `flightStraighten` there is no mechanism by
    which it can grow a kink — every segment turns by the identical angle and no
    two can be pulled apart. Cruise numbers are unchanged (23.8° worst angle,
    p99 23.5, zero folds); the tip jitter goes 0.010 → 0.028 of a segment, which
    is the tail swinging on purpose, still a third of what v4.2 had while doing
    nothing useful. `aimRate` is deliberately slow (2.6 /s): that is the "gently
    circle round" rate, and much above ~6 it starts to look like a snap.
  * A CHINESE-DRAGON PATH FOLLOWER WAS BUILT, MEASURED AND REMOVED. Recording
    the body's track and laying the tail along it is the textbook way to get
    flowing, circling motion, and here it measured three to thirty times WORSE
    than nothing: tip jitter 0.147 laying the tail on the track, 0.357 re-aiming
    only the track's curvature, against 0.011 for neither. The reason is
    specific to this character and worth knowing before anyone tries again — the
    socket orbits nearly a whole tail length when bodyPose swings the body onto
    a new heading, so a world-fixed track anchored to an orbiting socket fights
    itself, and re-aiming the track onto a direction that is itself rotating
    only moves the fight. Do not re-add it without re-running `--fly`.
  * The synthetic `VIOLENT` probe still reaches the curvature clamp (74°) and
    NOTHING in the material tuning moves it — drag, mass, muscle rate and
    accelCouple all leave it at 74/64. That is correct and not a defect: that
    scenario teleports the body's velocity by ±1500 px/s every 0.75 s, so the
    anchor itself translates a whole tail length in a fraction of a second and
    the strand is being dragged bodily, not shaped. The realistic run (same
    scenario minus the synthetic shoves) sits at 46°/33° p99.
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
- `engine/fx/spriteShade.js` (v4.2) — SPRITE SHADING, inside the character's own
  material (`onBeforeCompile` on the glTF's standard material, so skinning and
  morph targets keep working). It undoes the albedo the light rig multiplied in
  (`outgoingLight / diffuseColor`), cuts the incident light into `bands` flat
  sections, tints them (shadows COOL, lights WARM — a shadow that is only darker
  reads as dirt; the hue shift is what makes it read as light, and it is
  standard pixel-art practice), and multiplies the albedo back.
  * WHY NOT JUST POSTERIZE HARDER. The retro look used to be one posterize at
    the very end, over the finished picture. That bands the ART as well: the
    eyes are a decal a dozen pixels across, and quantizing their brightness
    alongside the skin then lifting the darks toward the light side
    (`shadeLift`) pulls a navy eye up toward the pink around it. It also makes
    the steps MOVE — banding the final image puts a step wherever the gradient
    happens to cross a threshold, so the terminator crawls across the face as
    the character turns. Banding the LIGHT puts the steps at fixed brightnesses.
  * INK. `inkness()` measures how far a texel is from `rigConfig.skinHex`; the
    eyes and the blush are art, not surface, so they are drawn FLAT (keeping
    only `inkShade` of the shading so they do not look pasted on) and the
    fragment writes an ALPHA FLAG on them (`INK_ALPHA`) so pixelate leaves them
    alone too.
  * `inkBoost` pushes ink back AWAY from the skin colour. An 880 px face island
    lands on ~20 px of a quarter-res target, so every eye pixel that reaches the
    screen is an AVERAGE of navy and pink — that averaging *is* the blur the
    owner reported, and no filtering setting undoes an average. Past ~1.8 the
    boost overshoots into cyan fringes.
  * THE LIGHT RIG HAD TO MOVE FOR THIS TO SHOW. `keyOffset` used to be nearly
    pure +z, a light sitting on the camera: every front-facing surface then has
    the same N·L, so cutting it into sections gives ONE section and the whole
    character reads as a flat silhouette. It is upper-left now, with ambient
    lowered to keep the overall level.
- `engine/fx/pixelate.js` — the RETRO look: the whole scene renders into a
  low-res target (viewport / `pixelSize`), then one fullscreen shader upscales
  with NearestFilter, encodes linear->sRGB, lifts the shadows (`shadeLift`, now
  0 — spriteShade's `shadeFloor` does that job on the LIGHT instead), posterizes
  into `colorLevels` sprite bands, and draws a dark silhouette outline from
  alpha edges (4-neighbor test). CHEAPER than direct rendering. Texels carrying
  the ink alpha flag SKIP the lift and the posterize entirely. `snapToGrid`
  quantizes only the RENDER position to the texel grid (sprite crawl); physics
  and animation are untouched. `bandLuma: true` bands BRIGHTNESS and rescales
  the chroma, so the hue survives quantization — banding r/g/b separately rounds
  the channels apart and neutralizes the pink (that was half of the "it looks
  purple" bug).
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
- `engine/fx/presentMath.js` — pure, headless-tested math shared by the
  passes: the exact linear->sRGB transfer curve, the sprite `shadeBand` /
  `inkness` pair, cover-fit, scroll uv offset — each with its GLSL mirror
  alongside it. Same pattern as beamGeometry.js: the tests pin the JS side and
  the shader is required to match.

## Hard-won pitfalls (do not rediscover these)

- NEVER PUT A BACKTICK IN A GLSL COMMENT. The shaders live in template
  literals, so a backtick inside one -- even in a `// like this` comment --
  terminates the string and the whole MODULE fails to parse. Vite reports
  nothing useful and the page silently renders no character at all.
  `node -e "import('./src/...')"` finds it in a second; the browser console
  will not.
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
  bend (stayed 39 deg). The curvature clamp (see tailChain) caps it; `test/tail_turn.js`
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
    `tools/legacy/check_model.py` asserted the eye/swatch texels using the glTF
    convention explicitly. The v4 model ships meshy's own texture and uvs
    untouched, so the trap is dormant — but it comes straight back if anyone
    repaints the atlas.
  - Sampling a catmull curve by its PARAMETER bunches rings wherever control
    points sit close together (the tail socket is 0.03 from tail.001, which
    produced duplicate vertices). Resample by ARC LENGTH.
  - THE TAIL "FOLDING INTO ITSELF" WAS A PROJECTION ARTEFACT, not physics.
    v1's rest curve had an x spread of 0.04 over its whole length -- effectively
    planar in Y-Z. Seen from the front that arc is edge-on and projects into a
    hairpin, while in 3D the strands were ~1.8 segment-lengths apart (measure it
    with `node test/tail_probe.js`). The fix was authoring a genuinely 3D curve
    (`_TAIL_SHAPE` in the v3.7 builder sweeps out in +x as it goes back and up;
    `tools/tailbuild.py` authors the same kind of curve for v4.2, and for the
    same reason plus one more: seen head-on, a purely back-and-up tail is not
    just edge-on, it is BEHIND THE BODY and invisible).
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

- `node test/sim.test.js` — 606 checks: math, physics, pathfinding, quat
  spring, seek/charge/fire/flourish state machines, tail integrity on a real
  bone chain, beam geometry, sRGB transfer, cutout cover-fit, an analytic mirror
  of three's lambert path that pins the light rig to "bright pastel pink, low
  contrast", and a mirror of the SPRITE SHADING on top of it — flat sections,
  cool shadows, and the painted eyes surviving the filter at full contrast.
  (Both mirrors read `rigConfig.skinHex`, so they cannot drift from the atlas.)
  Plus a bare IMPORT of every shader-carrying module, which exists because of
  one character (see the backtick pitfall) and is the only check that would have
  caught it — twice.
  Plus the BUMP REACTION — that a graze never flails, that a hard hit flails
  only sometimes, that the `>.<` overlay is drawn on
  fast, held for the flail's own duration and then whipped off so the eyes OPEN,
  that it is hidden when the head faces away, and that all four limbs move, out of phase,
  and settle back (measured against a CONTROL instance stepped in lockstep: the
  pose carries slow noise and a paddle cycle, so its own baseline moves and a
  snapshot taken earlier is not a valid reference).
  Plus the SHINY: the two hexes are pinned to the sprite measurements, the
  recolour is asserted to be an identity when nothing is being recoloured, and
  the entrance is asserted to END — a burst that never clears leaves the flash
  uniform stuck wherever it stopped and the character stays blown out.
- `node test/tail_probe.js [--fly] [--calm] [--wire]` — runs the real rig through a
  deliberately violent scenario and reports max bend, fold count, closest
  non-adjacent approach, torsion (planar vs helical), tip JITTER and SWING.
  * `--calm` PINS THE BODY. That is the only mode where `jitter` means
    anything: with the body flying around, the tail's shape legitimately
    changes fast because it is following, and follow-through and rattle become
    the same number. Pinned, the only thing that can move the tail is the tail —
    currently 0.001 of a segment of jitter riding a 1.0-segment swing.
  * `jitter` is deviation from a CENTRED 0.15 s average, in segments. Measuring
    a frequency instead is a trap: `<|a|²>/<|v|²>` is dominated by whatever tiny
    high-frequency content exists and cheerfully reported 4 Hz for a tail whose
    joints were moving less than a degree. And the average must be centred — a
    one-sided one lags, and its lag alone reads as jitter of amplitude·ω·τ.
  * `--fly` is a SMOOTH CRUISE — a lazy figure-of-eight at cruise speed with the
    brain off, so the only thing that can put a kink in the tail is the tail.
    This is the scenario the "it rattles while flying" report lives in; the
    violent default is deliberately unfair and hides small artefacts under big
    ones, and `--calm` never moves at all.
  * `--wire` turns the DFTL velocity correction off, i.e. the one knob that
    separates follow-the-leader from wire.
  * THE PROBE PLACES THE MODEL IN A MOVING SCENE NODE, like main.js. It did not
    until v4.3, which meant the character rotated on the spot forever and the
    tail sim never saw the body TRANSLATE — so every "flying" number it had ever
    printed was measuring a scenario that does not exist on the site. If you add
    a scenario here, drive `characterRoot.position` or it measures nothing.
  NOTE: bend is neighbour-to-neighbour, so it does NOT catch the tail pointing
  the wrong way as a whole — use tail_turn for that.
- `node test/tail_scroll.js` — PASS/FAIL gate for the scroll-drag bug: runs the
  same scenario twice in lockstep, one scrolling and one not, and asserts the
  tail's shape matches frame for frame (exit 1 on regression). It used to freeze
  every input and compare against a single settled shape, which only worked
  while the tail was motionless — the strand has its own slow sway now, so a
  still tail is not something that exists any more.
- `node test/tail_turn.js` — diagnostic for fast turns: reports base-vs-body
  angle (the "flops on its length" number), peak turn rate, bend, folds.
  `node test/tail_turn_dump.js` dumps matched frames with the CURVATURE LIMIT off
  vs on. NOTE: under `flightStraighten` the tail streams behind the MOTION, not
  behind the body's rest pose, so in a scenario that spins the body through 360°
  the "deviation from the body-carried rest direction" columns legitimately
  reach 180°. That is the tail doing its job, not flopping.
- Shader syntax can be checked headlessly by parsing the GLSL template
  literals with `@shaderfrog/glsl-parser` — it will not catch link errors, but
  it catches typos without a browser.
- `node test/dump_motion.js` -> `python3 tools/render_motion.py motion_dump.json out.png`
  — runs the FULL engine + real GLB headlessly through a scripted scenario,
  renders pose filmstrips + smoothness metrics (tail jerk, positions).
  Startle frames legitimately spike jerk (whip = intended).
- `python3 tools/check_mew.py` — the MODEL gate. Weight sanity (normalised, ≤4
  influences, no orphans); SHELLS (each limb its own watertight shell, driving
  nothing on the body); the rigid-part contract (feet/arms/head keep their exact
  shape under a hard pose, measured as the residual after a best rigid fit); the
  ear twitch leaving the face untouched; the tail trailing backward and driving
  nothing but itself; the SKIN (most of the body samples one flat texel, and
  that texel is `rigConfig.skinHex`); the BLINK (closes the eye, is a pure
  vertical squash, never touches the crown or the back of the head); the TAIL
  leaving the body on the MIDLINE at the butt, sweeping up behind, and clearing
  the trunk's silhouette from the front; and the engine contract (roles resolve, `pivotFactor` matches the root joint,
  `radiusFactor` covers 90% of the body). Writes turnaround / rig / weights /
  pose / ears / blink renders to `tools/preview/`.
- `python3 tools/rig_mew.py` — rebuild the model from `mewNew.glb`.
  Deterministic, ~20 s (the texture bake is the slow part).
- `node test/pose_frames.js && python3 tools/render_poses.py` — full-resolution
  skinned snapshots straight out of the real engine. The one to look at when
  something "looks wrong" but the numbers pass.
- `?shiny=1` / `?shiny=0` on the dev URL forces the shiny roll on or off. The
  roll itself is `Math.random()`, deliberately NOT the world's seeded rng — that
  is seeded so the wander is reproducible for the headless tests, and a
  reproducible shiny would mean every load is the same one.
- `npm run build:single` — one-file dist for file:// checks.

NOTE: `npm run build` needs rollup's native binary for the host platform. If
node_modules was installed on a different OS it will fail with MODULE_NOT_FOUND
on `rollup/dist/native.js`; reinstall deps on the machine doing the build.

## Model / asset pipeline (v4.2 — the meshy mew, cut into shells)

The shipped character is a low-poly Mew generated in Meshy (`mewNew.glb`) and
rigged here. The v3.7 procedural builder is retired in `tools/legacy/` — see the
README there, which also records why `mewNew_split.glb` was deleted (its foot
split left 18 non-manifold edges).

**Build:** `python3 tools/rig_mew.py` — pure Python + numpy + scipy + Pillow,
about 20 s. Writes `src/assets/mew.glb` and a copy in `public/models/`, plus
`tools/joints.json` (an informational dump of the placed skeleton).
**Gate:** `python3 tools/check_mew.py` — reads the exported glb back and asserts
every property below, then writes `tools/preview/mew_*.png`.
**Motion:** `node test/pose_frames.js && python3 tools/render_poses.py` runs the
REAL engine and renders full-resolution skinned snapshots at chosen moments.
This is how deformation gets judged without a browser; `dump_motion.js`
decimates the mesh and only shows the path.

Five modules, in build order:

- `tools/mewparts.py` — loads the source into NORMALISED space (mirror plane at
  x = 0, soles at y = 0, height 1.75, face toward +z) and cuts it into
  anatomical parts. Only two cuts are things topology can answer: the TAIL (a
  real narrow waist) and the −x FOOT (already a loose shell in the source). The
  neck line is the narrowest cross-section BY PROMINENCE, measured by slicing
  triangles, not by counting vertices. The rest are hand-authored boxes, because
  this mesh has no waist there and is only roughly symmetric (the ear tips
  differ by 0.11 in height, the arm nubs by 0.11) so a symmetric fit does not
  converge either. The EAR field lives here too.
- `tools/meshsurgery.py` — **cuts every limb off into its own CLOSED shell.**
  This is the change everything else rests on. A limb that shares vertices with
  the body can only ever be a compromise: weight the shared ring to the limb and
  the body's surface gets dragged; weight it to the body and the limb's own base
  cannot move. That is why the arms "barely moved", why they had to be parented
  to the head, and why the tail could not be given real physics without the rump
  denting with it. After splitting, the two openings are coincident and would
  z-fight, so the body side is RECESSED along the socket axis and the limb side
  is EXTENDED into the recess: each limb ends up with a stub plug sitting in a
  shallow socket, both watertight, and it can swing a long way before anything
  is visible through the joint. Six shells: body, 2 arms, 2 feet, tail.
- `tools/tailbuild.py` — **deletes the meshy tail outright and grows a new one
  out of the butt.** The generated tail leaves the model's RIGHT HIP — the ring
  it is welded to sits at (0.60, 0.26, −0.16), a third of the body's width off
  the midline — and sweeps sideways to x = 1.48. v4.1 tried to rescue it by
  re-routing the tube along a new centreline (`tools/legacy/tailshape.py`),
  which fixed the DIRECTION but could not move the attachment: the tail still
  grew out of the hip and a chunk of it read as part of the body. It was also a
  lumpy tube — 53 vertices spread over 64 rings, some rings holding a single
  vertex — so bending it at all produced facets and pinches no solver can hide.
  So: the tail triangles are dropped, THE RING IS PULLED BACK ONTO THE HIP, the
  hole is capped with a shallow DOME (a flat lid reads as a chopped-off stump at
  any angle), the
  orphaned vertices are COMPACTED OUT (they still carry a part label otherwise,
  and `socket()` measured the trunk's height against tail vertices floating 1.4
  in the air and shot its ray out of the model's back), and a new tail is swept
  along an authored centreline with even rings, a smooth taper and the bulb tip
  the character is drawn with. It is a separate CLOSED shell that plugs into the
  body — no boolean, no shared vertices, nothing of it weighted to the trunk.
  * THE RING HAS TO BE PULLED IN FIRST, and v4.3 did not do it. Dropping the
    tail only removes triangles ALL of whose vertices are tail, so the ring of
    straddling triangles survives — and on this model that ring sits at
    x 0.55..0.65 while the trunk ends at 0.36. Capping there leaves a wedge
    sticking out of the rump a fifth of the body's width, which is exactly what
    "a chunk of the tail is still attached to the butt" was. The character is
    roughly mirror-symmetric and the LEFT hip is intact, so the right hip is
    rebuilt from its own mirror image: a ray inward at each ring vertex's own
    height and depth, and the vertex goes on the surface it hits. That
    reconstructs the hip out of the model's own geometry instead of guessing a
    shrink factor, and it only ever pulls vertices IN, never pushes them out.
  * The socket is FOUND, not hard-coded: a ray out of the trunk along
    `SOCKET_DIR`, taking the last surface it crosses.
  * THE CENTRELINE HAS TO SWEEP OUT TO THE SIDE. The camera looks at this
    character head-on down +z, so a tail that only goes backward and up is
    hidden behind the body every moment it is not flying — which is exactly what
    the first version of this file shipped: a beautiful tail nobody could see
    while mew was hovering. `check_mew.py` asserts it clears the trunk's
    silhouette.
- `tools/retexture.py` — **throws away meshy's uv set and bakes a new one.** The
  source atlas is 2048², every triangle its own island, scattered at random,
  with lighting baked in and the eyes cut across a dozen unrelated islands. Now:
  every non-face triangle has its three uvs pinned to ONE texel of flat colour
  (so the body is exactly one colour, no interpolation, no seams, no baked
  light — the light rig does all the shading, which is what it was tuned for),
  and the front of the head gets one clean planar island. The eyes and blush are
  transferred THROUGH THE GEOMETRY: for every pixel of the new island we know
  the surface point, hence the source triangle and its barycentrics, hence the
  source uv, hence the source texel. That is exact and does not care how
  shattered the old layout was. The baked face is then separated into skin /
  eye / blush, the skin is replaced with the flat colour, and the marks are
  composited back. THE EYE IS NOT ONLY BLUE: it carries a white sclera crescent
  and a white catchlight, and seeding the mask on blue alone left a pink bite
  out of each eye (hole-filling recovers the catchlight, which is enclosed, and
  cannot recover the crescent, which opens onto the eye's own boundary). The
  mask therefore grows from the blue seed through near-white pixels bounded by
  the CONVEX HULL of each eye's ink — on this bake the hull holds 39.5k pixels,
  30.1k blue, 9.4k near-white and 170 that are neither, so it fences the
  forehead and muzzle speculars out by construction. PROVENANCE is what makes this work: every triangle carries
  (source triangle, barycentrics of its corners) through surgery AND
  subdivision, so a vertex created by splitting a face triangle four ways still
  knows exactly where it came from. Result: **the glb went from 2.17 MB to
  374 kB.**
- `tools/facemorph.py` — blink and squint for a face whose eyes are PAINTED. An
  expression is the geometry squashing the painted eye; the uvs ride the
  vertices, so the art compresses with them. The face patch is subdivided twice
  first, because a blink needs rows of vertices to compress and the raw head has
  about four. Where the eyes are is not guessed: the retexture pass produced a
  pixel-exact mask of the eye ink, and the new atlas is a plain affine
  projection of the face, so the mask inverts straight back to model x/y.
  Repaint the eyes, rebuild, and the morph follows them.

**Rig: 21 joints (10 of them tail), and every weight is either exactly 1.0 or a
named blend.**

- **THE HEAD IS ONE RIGID PIECE.** Above the neck band it is 100% `head`; the
  face physically cannot shear. The `head` joint sits at the top of the neck so
  the head swivels on the neck rather than spinning about its own centre.
- **THE FEET NEVER CHANGE SHAPE.** Each is its own shell, 100% one joint.
- **ONE ARM BONE PER SIDE, hinged at the armpit, parented to the CHEST.** Free
  shells, so they can have a real range and their own sculling rhythm.
- **THE EARS ARE A GRADED FIELD, not a part.** Zero at the saddle between the
  ears, one at the tips. An ear hinged at its base drags the skull; this cannot,
  because the skull is not weighted to the ear joints at all. Turn
  `ears.twitchAmpDeg` up freely.
- **The tail** is a 10-joint chain with a two-bone linear blend along the arc (a
  gaussian around each joint leaves the weight bunched at the joints and slack
  between them, which reads as a lumpy bend).
- **THE ROOT JOINT IS THE ROTATION CENTRE AND MUST MATCH `sizing.pivotFactor`.**
  bodyPose spins the character about the root BONE while main.js parks
  `bounds.min.y + height*pivotFactor` on the physics point. When those were
  different heights (root at 15% of the model, pivot at 50%) turning upside down
  swung the head ~180 px away from a 63 px collision circle and most of the
  character clipped straight through the page. The builder puts the root at the
  model's own centre of area and prints the matching number; `check_mew.py`
  asserts they agree, and `radiusFactor` is sized off the measured reach.

**Things this mesh forced, that are worth knowing before touching it:**

- EVERYTHING RUNS ON A WELDED MESH and is exploded to flat-shaded triangles only
  at export. The source ships vertex-split for faceting — 1399 vertices for 1626
  corners — so on the raw index buffer almost every edge looks like a boundary
  edge and every topological operation returns nonsense.
- The mesh is NOT mirror-symmetric (rms 0.10 after the best mirror fit). Never
  mirror a measurement from one side to the other; measure each side. The one
  place symmetry IS forced is the blink, because per-eye extents made one eye
  shut a third of a blink before the other — which reads as a wink.
- Subdividing a patch must split its NEIGHBOURS conformally, and a neighbour can
  share one, two or three edges with the patch. Handling only the first leaves a
  midpoint dangling mid-edge: a t-junction, which is a real hole (it showed up
  as 25 boundary edges along the head).
- The head is most of the character and sits on almost no neck. `look
  .yawLimitDeg` and `body.flightHeadPitchDeg` had to come down (42 / 40, from
  55 / 58), and the neck handover band has to start low enough to begin at the
  actual narrow ring AND finish below the chin at y 0.83 — a short band high up
  concentrates the whole shear into one row of vertices and tears the collar
  (11% of body height on a 42° head turn).
- Judge rips by ABSOLUTE edge-length change, not by ratio. This mesh has 3 cm
  edges inside the armpit that read as "8× stretch" while moving a hair, and
  40 cm edges across the jaw that tear visibly at 1.5×.
- A morph's falloff is easy to get wrong TWICE. A spherical falloff centred on
  the eye fades out exactly where a lid vertex has furthest to travel, so the lid
  barely moves (v3.7 shipped a 4% twitch that way; the first attempt here
  shipped a 60% one). But you cannot simply not fade either — closing a lid means
  the surface above the eye really does slide down a whole eye-height, and if
  that reaches the forehead the skull visibly shrinks. The answer is: full travel
  inside the eye, then a linear return to zero over a short band just outside it.

**THE SKIN COLOUR IS `rigConfig.skinHex`, and only there.** `tools/rig_mew.py`
reads that hex out of `rigConfig.js` when it bakes the atlas, and
`test/sim.test.js` reads it as the albedo for the light-rig check, so the three
cannot drift. (That test used to hardcode a copy of the v3.7 pink and happily
passed while the shipped model was a different colour entirely.) To recolour
mew: change the hex, then rebuild.

## Open ideas (owner-approved directions, not yet built)

Scorch decals on the page background along the beam path, WebAudio hooks
(charge whine, beam roar), drop-shadow blob under mew, rare idle easter eggs
(grooming, nap after long inactivity), `prefers-reduced-motion` mode, eye
blink via eye-geometry scaling once the final model lands. (Grab & fling is
DONE. Cinders were built and then removed by owner decision.)
