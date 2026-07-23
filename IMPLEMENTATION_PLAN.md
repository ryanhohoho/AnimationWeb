# AnimationWeb Implementation Plan

Portfolio site with a floating low-poly Mew-like character, procedurally animated in Three.js. Character moves on a 2D plane (viewport X/Y, no depth translation) but rotates freely in 3D. Physics-driven, bumps into page content, reacts to the cursor.

## Locked decisions

| Decision | Choice |
|---|---|
| Stack | Vite + Three.js, vanilla ES modules, no framework |
| Movement space | DOCUMENT coordinates (v2). Scrolling never drags the character; render = doc pos minus scrollY |
| Colliders | DOM elements marked `data-collider` + document bounds. A* pathfinding routes around them |
| Interactions | Glance at cursor, dodge fast cursor, poke on click. Seek the cursor when > ~half a page away (v2) |
| Locomotion model | SEA OTTER swimming / mew flight (v3): LONG AXIS aligns to travel head-first (streamlined dive), belly-in banking on curved paths, spine-to-tail undulation, tail streams straight behind at speed. This is the core motion reference |
| Loop-de-loop | A flown circle (v3): flourish state steers velocity through 2π; belly faces the circle center via curvature banking. Never an in-place spin |
| Click interaction | PETTING -> hyper beam (v3): clean click charges 1.5s (brace folds head-first onto the cursor axis from `braceStartS`), then a stationary beam permanently disintegrates elements (canvas mask carving; cinders removed by owner decision). Press + drag = carry, release = fling (v3.4) |
| Model | Custom procedural low-poly Mew (original mew.glb DISREGARDED: broken skin, no tail bones) |
| Presentation | SWAPPABLE PASS (v3.6), picked by `rigConfig.presentation.mode`: `"pixelate"` retro sprite (low-res, nearest upscale, luma-banded shades, dark outline), `"cutout"` Mew as a hole in the page onto a stationary png/gif, or `"none"` raw 3D. All behind one interface (fx/presentation.js). Purely visual; animation untouched. Character material/aesthetic details beyond this remain the owner's |
| Lighting | `rigConfig.lighting`: ambient-dominant pink-family hemisphere + a viewer-relative key re-aimed from the camera at the character each frame. Target look is bright pastel pink and flat/sticker-like, not a moody 3D render |
| Visual testing | Owner tests in his own browser and reports back. Claude verifies headlessly (tests + motion dumps) |
| Future model swap | Must require edits to `src/config/rigConfig.js` only |

## Hard constraints (from project owner)

1. Motion must look natural, never stiff. If it looks wrong, find the underlying cause. No surface-level parameter fiddling to mask structural problems. Recognize when an issue actually is surface-level before tuning.
2. Tail flows with weight/muscle, driven by body velocity. Never flails.
3. Head/tail behave like a curious creature. Head can look at cursor.
4. Character floats/idles when not traveling. Idle includes drift and tail motion.
5. Hands/feet placement during flight follows the mid-flight Mew reference (arms tucked under chest, feet trailing behind).
6. Code comments: relaxed tone, full lowercase (except abbreviations). Never rewrite whole files when editing, patch the existing file.

## Status

- [x] `tools/build_mew.py`: Blender headless script builds mesh + rig + weights + GLB (+ eye geometry)
- [x] `src/assets/mew.glb` / `public/models/mew.glb`: 20 joints, all weights normalized (verified)
- [x] v1: full engine (physics, behavior, all pose layers), 400+ headless checks, browser-verified (wander, dodge, poke, tail flow)
- [x] v2: document-space movement, A* pathfinding, cursor-seek/offscreen-return, sea-otter free orientation + undulation
- [x] v3.5: retro pixel-art presentation pass
- [x] v3.6: color-space fix (linear->sRGB encode in the blit; luma-banded posterization), lighting rework (flat pastel pink, viewer-relative key), `cutout` presentation pass + mode toggle
- [x] v3.7: model rebuilt from scratch (all-quad procedural pipeline, no Blender), painted-eye texture + UVs, blink/squint/smile morphs, faceMorphs layer
- [ ] Owner feedback rounds on motion feel and the new silhouette

## Model asset spec (already built, for reference)

Blender 3.6 headless, exported glTF y-up. Character faces +Z in three.js, +Y up. Height ~1.56 units. Tail extends behind (-Z), arc length 1.68.

Joint hierarchy:
```
root
├─ spine ─ chest ─ neck ─ head ─ ear.L, ear.R
│           ├─ arm.L ─ hand.L
│           └─ arm.R ─ hand.R
├─ foot.L, foot.R          (no leg bones, per design)
└─ tail.001 ... tail.007   (chain, connected)
```
Weights: deterministic per part island. Body graded root→spine→chest by height. Ears blend into head at base. Arms blend into chest at shoulder. Tail verts smoothstep-blended between 2 nearest chain bones by arc-length parameter. Rebuild with `blender -b --python tools/build_mew.py -- --out public/models/mew.glb`.

## Architecture

```
index.html                  demo portfolio page, sections marked data-collider
src/
  main.js                   boot: renderer, GLB load, rig build, loop wiring
  config/rigConfig.js       bone role map + ALL tuning constants (single source)
  engine/
    loop.js                 fixed-step accumulator (120 Hz sim), render interpolation
    world.js                shared state + event bus (pointer, scroll, viewport, colliders)
    physics/body2d.js       point-mass: integrate, drag, impulses, max speed
    physics/colliders.js    DOM rect measure (document space), circle vs rect resolve
    behavior/brain.js       FSM: hover / cruise / seek / startle / recover + path following
    behavior/pathfinder.js  document occupancy grid + A* + line-of-sight smoothing
    pose/quatSpring.js      damped rotational spring (angular velocity state)
    fx/beamGeometry.js      pure beam math: clipping, corridors (headless)
    fx/destruction.js       canvas alpha-mask damage on dom elements, permanent
    fx/beam.js              charge glow + layered additive beam planes
    fx/presentation.js      picks the presentation pass from config.mode,
                            one shared interface for main.js
    fx/presentMath.js       pure: linear->sRGB curve (+GLSL mirror), cover-fit
    fx/pixelate.js          retro sprite pass: low-res target, nearest upscale,
                            sRGB encode, luma-banded posterize, alpha-edge
                            outline, optional grid snap
    fx/cutout.js            silhouette-as-a-window pass: scene alpha masks a
                            stationary png/gif sampled in screen space
    pose/rig.js             load-time: bones by role, capture rest quats/positions
    pose/poser.js           per-render-frame: run pose layers in fixed order
    pose/bodyPose.js        orientation from velocity (yaw/bank/pitch), breathing, squash
    pose/limbPose.js        arm/hand/foot pose targets blended by state + speed
    pose/headLook.js        cursor look-at, saccades, curiosity noise
    pose/earSprings.js      ears react to head angular velocity, startle flatten
    pose/tailChain.js       particle chain sim -> bone quaternions
    utils/math.js           expDamp, damped springs, noise1d, clamp, tanh soft limit, quat helpers
test/
  sim.test.js               headless loop tests (node, no rendering)
tools/
  build_mew.py              model pipeline (done)
```

### Frame pipeline

1. `loop.js` accumulates real dt, clamps spikes (max 100 ms), steps sim at fixed `1/120 s`:
   brain.step → body2d.step → colliders.resolve (emits `bump` events)
2. Render frame: interpolate body position between last two sim states, then pose layers in order:
   bodyPose → limbPose → headLook → earSprings → tailChain
3. tailChain runs its own substeps inside the render frame using the same fixed-dt accumulator pattern (stability).

### Coordinate mapping

Perspective camera (fov 35°), character locked to plane z=0. `worldPerPx = 2 * tan(fov/2) * camDist / viewportHeightPx`. All physics in viewport px; conversion only at render. Canvas is a full-viewport `position: fixed` overlay, `pointer-events: none` (click detection via manual raycast on document listeners).

### Module contracts (build to these so phases integrate)

```js
// world.js
world = {
  viewport: { w, h, dpr },
  pointer:  { pos, vel, speed, active },        // px, px/s, smoothed
  scroll:   { y, vel },                          // px, px/s
  colliders: [ { rect: {x,y,w,h}, el } ],        // viewport-space px
  events:   tiny bus: on(type, fn), emit(type, payload)
             // 'bump' {normal:{x,y}, speed}, 'startle' {dir, intensity}, 'poke' {point}
}
// body2d.js
body = { pos, vel, radius, addForce(f), addImpulse(i), step(dt) }
// brain.js
brain = { state: 'hover'|'cruise'|'startle'|'recover', agitation: 0..1, step(dt) }
// rig.js
rig = { bones: { root, spine, chest, neck, head, earL, earR,
                 armL, handL, armR, handR, footL, footR, tail: [7] },
        rest:  { quats, positions, tailDirsWorld, tailPointsWorld } }
// pose layer signature
layer.update(ctx)  // ctx = { rig, body, brain, world, dt, time }
```

## Animation math requirements (anti-stiffness rules)

These are structural. Violating them is what makes motion stiff.

1. Never `lerp(a, b, 0.1)` per frame. Frame-rate independent only:
   `expDamp(current, target, rate, dt) = target + (current-target) * exp(-rate*dt)`
   or a critically damped spring (tracks velocity, gives overshoot/settle):
   ```
   // semi-implicit critically damped spring
   v += (omega^2 * (target - x) - 2 * omega * v) * dt;  x += v * dt
   ```
2. Springs everywhere a target changes discontinuously (look target, pose blend, squash).
3. Layered noise for idle, not bare sines: `noise1d(t*f1)*a1 + noise1d(t*f2)*a2` with irrational frequency ratios. Use a smooth value-noise (hash + cubic interp), seeded.
4. Follow-through and drag: hands/feet/ears lag body acceleration (spring on offset driven by `-accel * k`).
5. Anticipation: head yaw leads body yaw by ~150-250 ms (head look target includes velocity prediction; body orientation springs are slower than head's).
6. Asymmetric timing: startle attack fast (spring omega ~18), recovery slow (omega ~2.5).
7. Soft limits via `tanh(x/limit)*limit`, never hard clamps on angles that a spring feeds.
8. All idle amplitudes and frequencies scale with `brain.agitation` and inverse with speed (fast travel damps idle wiggle).

### Body pose (bodyPose.js) — sea otter locomotion (v2)

The body is FREE in 3D. Orientation runs through a quaternion damped spring
(`quatSpring.js`, tracks angular velocity → real rotational inertia, shortest-arc
turns, flips allowed). Never three clamped euler channels.

- Forward target: camera-facing (+ small yaw bias) at rest, blending to the full
  travel direction between `alignLoPx`..`alignHiPx` speed. Swimming sideways/down
  shows the body in profile, like an otter.
- Up hint: world up, switching to camera-facing when travel is near vertical
  (no gimbal snap).
- Roll about the long axis = bank (lateral accel + yaw rate, soft-limit ~55°) +
  lazy cruise corkscrew sine + occasional full 2π barrel roll (spring-unwound,
  random while cruising, 50% chance on dodges).
- Undulation: pitch wave traveling spine → tail (`swimPhase` shared with the
  tail sim so it's ONE continuous wave), amplitude scales with alignment.
- Breathing: chest scale 1 ± 0.016 at 0.22 Hz (rate * (1 + agitation)).
- Hover bob: root position offset, 2-octave noise, ±6 px.
- Squash: on bump event, scale along impact normal, one overshoot then settle.
- Pose layers (head/limbs/ears) apply their deltas conjugated by `shared.bodyQuat`
  so they stay body-relative at any orientation, including mid-roll.

### Tail (tailChain.js) — the centerpiece

Particle chain, NOT per-bone sine rotation (per-bone sines are the classic flail look).

- 8 particles: P0 pinned to tail attach point (root bone world position each frame), P1..P7 free. Rest lengths from rig rest pose.
- Verlet integration, drag ~2.5/s, tiny gravity (reads as weight), max velocity clamp.
- Shape memory: force pulling each particle toward the REST CURVE transformed into the character's current root frame. Stiffness ramps base→tip: 6.0 → 0.8 (this is the "muscle"). This keeps the S-curl identity while allowing flow.
- Idle traveling wave: force perpendicular to each segment, `sin(time*freq - index*phaseStep)`, phaseStep ~0.9 rad, amplitude scales with agitation and inverse speed. Traveling phase = flow; identical phase = flail. Never apply the wave as direct rotation.
- Velocity coupling: root motion enters through P0 pinning; additionally inject `-bodyAccel * dragCoeff` on all particles (follow-through when the body lunges).
- Constraints per substep: 3 iterations distance constraints, then soft angle limit between consecutive segments (~40°, blend back don't snap).
- Bone mapping: for tail bone k with rest world direction `rd_k` and sim direction `sd_k = normalize(P[k+1]-P[k])` (both in root-relative frame):
  `worldQuat_k = quatFromUnitVectors(rd_k, sd_k) * restWorldQuat_k`, then `local = parentWorld⁻¹ * worldQuat_k`. Apply with slight expDamp (rate ~30) to kill sub-pixel jitter.

### Head look (headLook.js)

- Look target: cursor position on the z=0 plane, plus `pointerVel * 0.12 s` prediction.
- Convert to yaw/pitch error in chest frame, soft-limit ±55° yaw, ±35° pitch.
- Saccade gating: when target moved > 8° from current aim, wait 80-200 ms (random), then retarget the spring. Spring omega ~7 while curious, ~3 when calm. This gives the "notice" feel instead of servo tracking.
- Cursor inactive > 3 s: curiosity mode. Aim wanders via noise between: page interest points (collider corners), travel direction, occasional slow blink-like ear/head dip. Weight toward travel direction while cruising.
- Neck takes 30% of the rotation, head 70%.

### Ears (earSprings.js)

- Each ear: 2D angular spring (omega ~14, zeta ~0.35, underdamped) driven by head angular velocity (follow-through) + noise micro-twitches (Poisson, mean interval 4 s, small amplitude).
- Startle: both ears flatten back (target offset), spring there fast, recover slow.

### Limbs (limbPose.js)

- Two pose sets (from mid-flight reference): HOVER (arms hang relaxed slightly forward, hands soft, feet dangle with slight outward splay) and CRUISE (arms tucked under chest, hands curled in, feet trailing back, toes pointed).
- Blend factor = smoothstep(speed, 120, 420 px/s), then spring (omega ~3) so transitions ease.
- Per-limb noise drift (independent seeds, ±4°, ~0.2 Hz) so limbs never freeze.
- Follow-through: limb targets offset by `-accel * k` through soft springs (hands lag more than feet).
- Startle: limbs pull inward briefly.

### Behavior (brain.js) — v2

- `hover`: drift around an anchor via noise force. Every 4-10 s pick an interest
  point sampled inside the CURRENT viewport band (doc coords), rejected if the
  pathfinder grid says it's blocked. → `cruise`.
- `cruise`: follow an A* route to the interest point (LOS-smoothed waypoints,
  seek-with-arrive at the last one). Replan if the route is stale, the target
  moved, a bump happened, or progress stalls > 1.2 s.
- `seek` (v2): entered when the cursor is farther than `seekTriggerFactor *
  max(vw, vh)` (~half a page), or the character has been offscreen > 4 s with no
  cursor guidance. The goal provider ("cursor" vs "offscreen" = viewport center)
  is LATCHED at entry — re-electing per step lets the goals fight and freeze the
  character at the trigger shell. Exits with hysteresis (`seekStopPx`, or safely
  inside the viewport band) → hover there.
- `startle`: same triggers as v1 (fast closing cursor / hard bump / poke).
  Impulse away + lateral randomness, agitation → 1. → `recover` → `hover`.
- Whisker avoidance: short-range repulsion from collider surfaces while
  traveling, so spring overshoot doesn't graze walls the path cleared.
- Ouch: bumps kick a flinch spring in limbPose (quick tuck) + squash + agitation.
- Agitation (0..1) is a global multiplier read by every pose layer.

### Pathfinding (pathfinder.js) — v2

Occupancy grid over the whole document (cell ~36 px), collider rects inflated by
body radius + pad. 8-connected A* with corner-cut prevention, then greedy
line-of-sight smoothing. Blocked start/goal snap to the nearest free cell.
Rebuilds lazily when `world.collidersVersion` bumps or the doc resizes.
Path following steers at the furthest waypoint with grid LOS from the body.

### Physics (body2d.js + colliders.js) — v2, document space

- Point mass m=1, radius ~66 px, linear drag 1.1/s, quadratic drag small, hard max speed 900 px/s. Position in DOCUMENT pixels.
- Document bounds: inset 20 px, restitution 0.4 (replaces viewport edges).
- DOM colliders: `getBoundingClientRect` + scrollY, cached in doc space, remeasured on resize + 500 ms interval (scroll does not move them in doc space). Circle vs rect: closest-point push-out, reflect e=0.35, tangential damp 0.9. `collidersVersion` bumps on real geometry changes so the pathfinder grid rebuilds.
- Scroll: the character keeps its document position while the viewport slides over it. No scroll shove (v1 behavior removed by design).

## Testing

### Headless (test/sim.test.js, plain node, no three.js rendering — import engine modules only; three math classes are fine)

0. v2 additions: pathfinder routes avoid walls and use gaps; blocked targets snap free; QuatSpring converges at 30/120 Hz and survives ~180° turns; seek triggers far away and settles with hysteresis.
1. No NaN/Infinity anywhere after 60 simulated seconds, multiple seeds.
2. Frame-rate independence: run at dt=1/30, 1/60, 1/144 with same seed; trajectories qualitatively bounded (positions stay in viewport, no divergence to invalid states).
3. Tail integrity: segment lengths within 1.5% of rest at all times; no NaN quats.
4. Smoothness: mean absolute jerk of head yaw and tail tip below threshold; no frame-to-frame angle jumps > 15° except during startle attack.
5. Collisions: after resolve, penetration < 1 px; energy does not grow (velocity magnitude bounded over time with forces disabled).
6. Startle triggers exactly on threshold crossings (unit-test the predicate).

### Visual

`npm run build:single` produces one self-contained HTML (vite-plugin-singlefile, GLB inlined base64). Open via file:// in Chrome, record short GIFs of: idle hover, cruise + arrive, cursor glance, fast-cursor dodge, click poke, scroll shove, collision bump. Judge against the constraint list. Iterate at the CAUSE level (wrong stiffness model, missing follow-through, phase alignment) not the symptom level.

## Milestones

- M1 Scaffold: vite runs, GLB loads, character renders centered, rig roles resolved from rigConfig, resize handled.
- M2 Physics: drifts, bounces off edges and a test collider, scroll shove works. Headless tests 1, 2, 5 pass.
- M3 Behavior: wanders between interest points, startle dodge + poke work. Test 6 passes.
- M4 Secondary motion: all pose layers on. Tests 3, 4 pass.
- M5 Verified naturalness: GIF review checklist all pass, demo portfolio page content in place.
- M6 Docs + polish: README, model-swap guide, code cleanup.

### Hyper beam system (v3)

- Flow: `pet` (click on mew) -> brain `charge` (1.5 s planted, gaze locked, shiver
  ramp, glow + spiral sparks at the mouth) -> `beamFire` event with the direction
  toward the cursor AT that moment -> `fire` (recoil impulse, beam envelope:
  0.12 s point-to-full expand, 0.95 s sustain, 0.4 s fade) -> hover + cooldown.
- Beam visuals (`fx/beam.js`): additive layered planes in doc space -- white
  core, across-width chroma gradient (magenta -> yellow -> white -> yellow ->
  cyan per the references), scrolling streak texture, outer glow, origin flare.
  Stationary in the document while scrolling (doc-anchored fx group).
- Destruction (`fx/destruction.js`): per-element canvas alpha masks, carved once
  at fire time (jagged corridor polygon + soft scorch passes + nibbles just
  outside the beam). GPU-composited afterwards: ZERO per-frame cost. Damage
  accumulates across fires and persists until refresh. Elements losing more
  than half their area drop their `data-collider` (grid rebuilds via
  `recollect`). Candidates: `[data-collider], nav, footer, h1-h3, p, img`,
  topmost-only.
- Cinders (`fx/cinders.js`): one InstancedMesh of falling shards spawned along
  the cut edges, colored from the element's background + embers.
- All geometry math lives in `fx/beamGeometry.js` and is headless-tested.

## Model swap guide (future custom model)

1. Export new GLB: y-up, facing +Z, all verts weighted, any joint names.
2. Drop into `public/models/`, update path in rigConfig.
3. Update role map bone names in `rigConfig.js` (tail array in base→tip order; arms/ears optional, layers skip missing roles).
4. Adjust `characterHeightPx` and collider radius if proportions differ. Nothing else should need edits — if it does, that is an engine bug per the swap constraint.
