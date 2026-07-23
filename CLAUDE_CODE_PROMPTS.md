# Claude Code Delegation Prompts

> **v2 NOTE:** phases 1-5 below were executed in the Cowork session. The engine now
> also has document-space movement, `behavior/pathfinder.js` (grid A*), a cursor-seek
> state, and sea-otter free orientation via `pose/quatSpring.js`. For any NEW session,
> read IMPLEMENTATION_PLAN.md first — it reflects v2. Use these prompts as templates
> for future changes, not as a build order.

Copy-paste one prompt per session. Every prompt assumes the session starts in
`N:\Desktop\Importants\CodingProjects\AnimationWeb`. Run phases in order; Phase 4 only
needs Phase 1 done (it builds against the module contracts, not the physics internals).
Phases 2 and 3 can run as parallel sessions if you accept a small merge step.

Model guidance:
- **Sonnet, medium effort**: scaffolding, config, tests. Well-specified, low ambiguity.
- **Opus, medium-high effort**: physics/behavior correctness work.
- **Fable, high effort**: the tail/secondary-motion system and final naturalness passes. This is taste + subtle math, the hardest 20%.

---

## Phase 1 — Scaffold (Sonnet, medium effort)

```
Read IMPLEMENTATION_PLAN.md fully before writing anything. Build milestone M1 only.

Create the Vite + Three.js project exactly per the Architecture section: package.json
(three, vite, vite-plugin-singlefile), vite.config.js with a `build:single` script,
index.html demo portfolio page (hero, about, three project cards, footer; mark the
cards and hero with data-collider), src/main.js, src/config/rigConfig.js,
src/engine/world.js, src/engine/loop.js, src/engine/pose/rig.js, src/utils stubs.

Requirements:
- Load public/models/mew.glb (exists already, 20 joints). rigConfig.js maps semantic
  roles to bone names per the plan's rig hierarchy. rig.js resolves roles to bones and
  captures rest pose (quats, positions, tail world dirs/points). Log a clear error
  listing missing roles if names don't resolve.
- Full-viewport fixed canvas overlay, pointer-events none, transparent background,
  perspective camera fov 35 at z distance such that the character is ~140px tall on
  screen (see plan's coordinate mapping formula). Character centered, facing camera.
- loop.js implements the fixed-step accumulator (120 Hz) with render interpolation
  hooks per the plan, wired but with a placeholder sim step.
- Handle resize + devicePixelRatio.
- MeshBasicMaterial-style flat look is fine. NO shaders, NO postprocessing, no OrbitControls.

Constraints: all new code comments in relaxed full-lowercase tone. Plain ES modules,
no TypeScript, no frameworks. Verify with `npm run dev` and `npm run build:single`
(single self-contained html in dist/ that works over file://, GLB inlined). Done when
the model renders centered and a `window.__AW__` debug handle exposes { rig, world, loop }.
```

## Phase 2 — Physics core (Opus, medium effort)

```
Read IMPLEMENTATION_PLAN.md fully (especially "Physics", "Module contracts", and
"Animation math requirements" 1-2). Phase 1 scaffold exists; do not restructure it.
Build milestone M2: src/engine/physics/body2d.js, src/engine/physics/colliders.js,
utils/math.js (expDamp, critically damped spring, seeded value noise1d, softLimit),
and wire the sim step into loop.js.

Follow the plan's specs exactly: point mass with linear+small quadratic drag, impulse
API, 120 Hz fixed step; DOM colliders from [data-collider] measured scroll-aware and
cached; circle vs rounded-rect resolve with restitution 0.35, tangential damp 0.9,
scroll relative-velocity shove; viewport edge rounded-rect; 'bump' events on the world
bus with normal and impact speed.

Also write test/sim.test.js covering plan Testing items 1, 2, 5 (node script, no DOM:
abstract collider rects so tests can inject them; run with `node test/sim.test.js`).

Character position drives the mesh via the existing render interpolation hook. Add a
temporary debug force (slow noise drift) so motion is visible; flag it clearly for
Phase 3 removal. Comments relaxed lowercase. Edit existing files, never regenerate them.
Done when: character drifts, bounces off page cards and edges, scroll shoves it
naturally, and the tests pass.
```

## Phase 3 — Behavior brain (Opus, medium-high effort)

```
Read IMPLEMENTATION_PLAN.md fully (especially "Behavior (brain.js)" and the hard
constraints). Phases 1-2 exist; build milestone M3: src/engine/behavior/brain.js,
pointer tracking in world.js (pos, smoothed vel, speed, active flag), poke raycast
(document-level click listener, ray vs character bound sphere in screen space).

Implement the FSM exactly per plan: hover / cruise / startle / recover, interest-point
selection with collider rejection sampling, seek-with-arrive steering, the three
startle triggers with the plan's thresholds, agitation scalar with exp decay, poke
impulse + torque note for pose layers. Remove Phase 2's debug drift force.

Extend test/sim.test.js with plan Testing item 6 (unit-test the startle predicate and
interest-point rejection). Keep everything frame-rate independent (expDamp/springs from
utils/math.js only, no raw per-frame lerps). Comments relaxed lowercase. Edit existing
files, never regenerate. Done when: character wanders between whitespace spots, dodges
a fast cursor swipe, reacts to click with a shove, calms down over ~3 s, tests pass.
```

## Phase 4 — Secondary motion (Fable, high effort) — the centerpiece

```
Read IMPLEMENTATION_PLAN.md fully. The sections "Animation math requirements",
"Tail", "Head look", "Ears", "Limbs", and "Body pose" are your spec; the hard
constraints section is the acceptance bar. Phase 1 exists (rig.js gives bones by role
+ rest pose); physics/behavior may or may not be merged yet — code only against the
documented module contracts (ctx = { rig, body, brain, world, dt, time }) and provide
harmless fallbacks if brain is absent (agitation 0, state 'hover').

Build milestone M4: pose/poser.js (layer ordering), pose/bodyPose.js, pose/limbPose.js,
pose/headLook.js, pose/earSprings.js, pose/tailChain.js.

Non-negotiables from the project owner:
- Tail must read as having weight and muscle: particle chain with shape-memory toward
  the rest S-curve, traveling-wave idle, follow-through from body acceleration. Flailing
  or per-bone synchronized sines = failure.
- Head looks at the cursor like a curious creature (saccade gating, prediction,
  curiosity wander when the cursor is idle) — not servo tracking.
- Hover idle: the whole character keeps living (bob, breath, limb drift) at tiny amplitudes.
- Cruise pose per the mid-flight reference: arms tucked under chest, feet trailing.
- Everything frame-rate independent; springs and expDamp only; soft limits via tanh.

Add plan Testing items 3-4 to test/sim.test.js (tail segment integrity, jerk metric,
run headless with a scripted body trajectory). If motion looks stiff in review, diagnose
the structural cause (stiffness model, phasing, missing follow-through) before touching
any constant. Comments relaxed lowercase. Edit existing files, never regenerate.
Done when tests pass and a manual check of idle, cruise, glance, dodge, poke each
shows smooth, weighted, curious motion.
```

## Phase 5 — Verification + polish (Fable, high effort; Sonnet fine if only cleanup remains)

```
Read IMPLEMENTATION_PLAN.md fully. All engine phases are merged. Build milestones M5-M6.

1. `npm run build:single`, open dist over file://, and review every scenario on the
   plan's Visual checklist (idle, cruise+arrive, glance, dodge, poke, scroll shove,
   bump). Record what looks wrong and fix at the cause level per the hard constraints.
2. Verify frame pacing: no hitches on scroll (collider measurement must be rAF-throttled),
   steady CPU, no GC churn from per-frame allocations in the sim path (reuse vectors).
3. Sweep for raw lerps, hard clamps, per-frame allocation, dead code. Run test/sim.test.js.
4. Write README.md: setup, scripts, architecture pointer, and the model-swap guide from
   the plan. Confirm swapping rigConfig bone names is truly the only edit needed for a
   new model (grep for hardcoded bone names outside rigConfig — any hit is a bug to fix).

Comments relaxed lowercase. Edit existing files, never regenerate them.
```

## Phase 6 template — FX / interaction changes (Fable or Opus, high effort)

```
Read IMPLEMENTATION_PLAN.md fully, especially "Hyper beam system", "Body pose",
and "Behavior". The engine is live and verified; you are modifying, not
rebuilding. Scope: <describe the change, e.g. new attack type / new flourish>.

Rules: pure math goes in a headless-testable module (pattern: fx/beamGeometry.js),
dom/three work stays in fx/ modules wired through world bus events, all tuning
constants go in src/config/rigConfig.js, everything frame-rate independent, and
one-time costs at event time rather than per-frame work. Add checks to
test/sim.test.js and keep `node test/sim.test.js` green. Comments relaxed
lowercase. Edit existing files, never regenerate them. Do not touch character
aesthetics; the owner handles the look.
```

## Optional — Model changes (Sonnet, medium effort, needs Blender installed locally)

```
Read IMPLEMENTATION_PLAN.md ("Model asset spec") and tools/build_mew.py. Adjust
<describe change: proportions / pose / poly count> in the script's proportions section,
rebuild with: blender -b --python tools/build_mew.py -- --out public/models/mew.glb
then verify: all weight sums == 1, joint list unchanged (or update rigConfig to match),
and the site still loads. Do not edit the GLB directly; the script is the source of truth.
```
