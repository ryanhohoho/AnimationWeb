# IMPLEMENTATION PLAN — the ASCII portfolio

Companion to `DESIGN_BIBLE.md` (the look, pinned to numbers) and `HANDOFF.md`
(the Mew engine, its history and its paid-for pitfalls). The Mew rig's own plan
is archived at `IMPLEMENTATION_PLAN_MEW.md`; it is finished.

**If this plan and the design bible disagree, the bible wins.**

---

## 0. Where the repo already is

Done in the handoff pass, before any of the phases below:

- **The placeholder site is deleted.** `index.html` is now a documented
  scaffold that establishes the layer contract: `#doc` (real, transparent,
  accessible DOM = layout + a11y) under `#stage` (one canvas = paint). The old
  pink/lavender cards, nav, hero and footer are gone.
- **`src/engine/fx/destruction.js` is deleted.** The beam no longer carves DOM
  elements. `main.js` now computes only the beam's reach with the pure, already
  tested `beamGeometry.beamLength`, and leaves an explicit seam for phase 5.
- The canvas id moved `#mew-canvas` → `#stage`, and `main.js` clears the
  `no-paint` fallback class once WebGL is confirmed.
- `npm test` → **661/661**. `python3 tools/check_mew.py` → all pass. Mew still
  flies, blinks, flails and fires on a bare page. Verified in-browser.

**Do not touch `src/engine/**` except where a phase says so.** It is calibrated,
it is tested, and `HANDOFF.md` lists what it cost to get there.

---

## 1. Target module layout

New code is additive. Nothing below reaches into the rig.

```
src/
  main.js                boot; owns THE renderer, THE rAF, the dispose registry
  config/
    rigConfig.js         Mew. unchanged, except presentation.mode gains "ascii"
    siteConfig.js    NEW every tunable from the design bible, and nothing else
  engine/                Mew. unchanged (one addition: world.off, see 2.1)
  type/              NEW the ASCII layer
    grid.js              the lattice: breakpoints, cell size, doc<->cell maps
    atlas.js             loads the baked atlas texture + ramp table
    match.js             6-D nearest neighbour + quantized cache  (PURE)
    field.js             cell store, awake set, DRIFT/GATHER/SCATTER/SETTLE
    fieldRenderer.js     instanced draw: 2 calls (opaque cells, inverted cells)
    words.js             text -> coverage bitmap -> slots               (PURE-ish)
    portrait.js          baked frame playback
  site/              NEW
    router.js            SPA routes, prefetch, same-document view transitions
    content/*.js         page content as DATA (not markup)
    dom.js               builds the semantic DOM from content data
  utils/
    math.js              unchanged. Spring / expDamp / noise are reused as-is
    lifecycle.js     NEW the disposal registry (see §6)
tools/
  glyphatlas.py      NEW bakes the atlas PNG + ramp JSON + 6-D vectors
  portrait.py        NEW video/photo -> packed delta-encoded cell frames
  check_type.py      NEW the gate for the above, in the spirit of check_mew.py
test/
  sim.test.js          existing, 661 checks. must stay green at every phase
  type.test.js     NEW headless: grid, match, field physics, leak assertions
```

---

## 2. Phases

Each phase states its **deliverable**, its **acceptance test**, and whether it
is **serial** (one agent holding the whole picture) or **parallel** (safe to
delegate). Model assignment lives in `DELEGATION.md`, not here.

### Phase 0 — Foundations · SERIAL

1. `src/config/siteConfig.js` — transcribe every number in the design bible.
   Grid breakpoints, colours, ramp names, all four motion verbs' rates, the
   performance budget, the fringe rule. Same commenting culture as
   `rigConfig.js`: say *why* a number is that number.
2. `src/utils/lifecycle.js` — the disposal registry (§6).
3. **Fix `world.on()`**: it currently has no `off()`. In a single-page life that
   is harmless; in an SPA every route swap adds listeners that are never
   removed, and they hold closures over dead DOM. Add `off(type, fn)`, make
   `on()` return an unsubscribe function, and add `once()`. Update
   `test/sim.test.js` to assert a removed listener stops firing and that the
   listener map does not grow across 1000 subscribe/unsubscribe cycles.
4. `src/type/grid.js` — pure. Viewport → cell size → grid dims → doc↔cell maps.

**Acceptance:** `type.test.js` proves cell size is integer at every breakpoint,
that `cellToDoc(docToCell(p)) ` round-trips within one cell, and that the grid
never exceeds 24 000 cells at any viewport up to 2560 px. `sim.test.js` green.

### Phase 1 — The glyph atlas pipeline · PARALLEL

`tools/glyphatlas.py`. Renders IBM Plex Mono at 3 weights × the ramp set into a
single 2048² R8 PNG, and emits `src/assets/ramp.json`:

```json
{ "cell": [7,12], "atlas": [2048,2048], "glyphs": [
  { "ch": "J", "w": 600, "uv": [..], "cov": 0.41, "v6": [..6 floats..] }, ... ] }
```

`v6` is the 6-D shape vector: coverage under six staggered sampling discs
(top-L, top-R, mid-L, mid-R, bottom-L, bottom-R), each dimension normalised so
its max across the set is 1. This is what makes the field look *drawn* rather
than halftoned — see design bible §3.4.

**Acceptance** (`tools/check_type.py`): every ramp glyph present; coverage
spans ≥ 0.02 to ≥ 0.55; no two glyphs closer than `epsilon` in 6-D at the same
weight (confusables are wasted table space); atlas ≤ 2048² and ≤ 1.5 MB;
renders a contact sheet to `tools/preview/ramp.png` so a regression is visible.

### Phase 2 — Matching · PARALLEL

`src/type/match.js`, pure and headless. Nearest neighbour in 6-D with a
quantized cache (5 bits/axis, packed to one integer key). Must be a **numeric
mirror** of the Python, the same way `fx/presentMath.js` mirrors its shaders.

**Acceptance:** for 500 random vectors, JS and Python pick the same glyph ≥ 99%
of the time and are never more than one rank apart. Cache hit rate > 90% on a
real image. Lookup ≤ 0.5 µs warm.

### Phase 3 — The field · SERIAL · this is the heart

**Read design bible §7.3 first — it was rewritten after benchmarking and it
replaces an earlier CPU-simulated design.** The field is a **pure function**
evaluated in the vertex shader. There is no integration loop, no awake set, no
sleeping predicate and no per-frame buffer upload; that machinery does not need
to exist. Measured on an M2 Max, this is 18× less CPU than the CPU-driven
version for a pixel-identical result, and it stops scaling with cell count
altogether.

`src/type/field.js` + `fieldRenderer.js` + `fieldMath.js`.

- One `InstancedBufferGeometry`, one quad. Instances cover the **viewport plus a
  two-cell margin**, not the document.
- Per-cell content — home, seed, candidate glyph ids, word id, slot position,
  distance to nearest word slot — lives in a **data texture indexed by document
  grid coordinate**, read in the vertex shader (WebGL2 guarantees ≥ 16 vertex
  texture units; the target machine reports 16). Written on layout/route change
  only, via `texSubImage2D` over the changed region. A long page therefore costs
  nothing extra, and scrolling is one uniform.
- **Two draw calls total**: opaque cells, then inverted cells.
- All four verbs are closed form and live in the vertex shader:
  `DRIFT = noise(seed, t)`; `GATHER = falloff(|home − pointer|)` blended with the
  slot position; `SCATTER+SETTLE = impulse · τ · e^(−kτ)`, the critically damped
  impulse response, with a per-cell phase offset from the seed so cells arrive
  at different times; glyph re-roll = `hash(seed, floor(t/period + phase))`.
- Per-frame CPU is: update ~10 uniforms (time, pointer, up to 4 active hit
  events, Mew's position, per-word resolve amounts) and issue one draw. Nothing
  else. **Zero bytes uploaded per frame.**
- Domain-warped density so the page has weather (bible §4.2) — precomputed into
  the cell data texture at layout time, not evaluated per frame.
- **`src/type/fieldMath.js` is the JS mirror** of every analytic function in the
  shader, exactly as `fx/presentMath.js` mirrors its GLSL and `fx/beamGeometry.js`
  mirrors the beam. The shader is required to match it. This is the entire
  debugging and testing story for GLSL-resident motion, and it is not optional.

**Acceptance:** measured with `tools/bench/field-bench.html` methodology —
at 17 000+ cells, per-frame field CPU **< 0.1 ms** and **0 bytes uploaded**;
`renderer.info.memory` flat across 60 s; `renderer.info.render.calls` for the
field is exactly 2; frame rate is the display's native rate with headroom to
spare. Mean coverage lands in 12–22%. `type.test.js` proves the JS mirror is
frame-rate independent and matches known values. Visual: a still frame,
greyscale, thumbnail — is it a good texture?

> **Do not reintroduce per-frame CPU work over cells.** If a behaviour seems to
> need it, first check whether it has a closed form — all four verbs did,
> because they were specified as overdamped and non-interacting. If something
> genuinely needs state, give it its own tiny buffer of *active* cells rather
> than putting the whole field back on the CPU.

### Phase 4 — Words, GATHER, links · SERIAL

`src/type/words.js` + the resolve behaviour + `site/dom.js`.

- text → coverage bitmap (one cached offscreen 2D canvas) → slots
- the four legibility rules from bible §4.4, **enforced in code**: assert
  minimum stem width 2 cells and at least one bare counter cell, and fall back
  to VOICE rendering with a console warning when a word cannot satisfy them at
  the current breakpoint
- GATHER driven by pointer distance *and* by `:focus-visible` on the real link
- semantic DOM built from content data; `color: transparent`, never
  `aria-hidden`, never `visibility: hidden`

**Acceptance:** every nav word resolves legibly at all five breakpoints
(screenshot matrix). Keyboard tab order works and focus resolves the word.
Screen-reader pass: the page reads as an ordinary document.

### Phase 5 — Beam displacement · SERIAL · small

Subscribe the field to `beamFire`. SCATTER + SETTLE per bible §6.4. Also wire
the soft clearing Mew pushes through the field (§6.5) — one distance test in
the pass that already runs.

**Acceptance:** firing across a dense heading displaces and fully restores it;
after 4 s every cell is asleep again and the awake set is empty. No state
persists — fire twice in the same place and the second is identical to the
first.

### Phase 6 — Router and transitions · PARALLEL (tightly specified)

`src/site/router.js`. SPA, History API, one persistent canvas.

- route modules code-split and prefetched on `requestIdleCallback` + on link
  `pointerenter`
- same-document View Transitions API for the DOM layer, with a no-op fallback
- **the canvas never re-initialises**; a route change is a GATHER re-target
- scroll restoration, `popstate`, deep links, 404

**Acceptance:** navigating between all routes 50 times leaves
`renderer.info.memory` flat, the world's listener map at its initial size, and
zero detached DOM nodes in a heap snapshot. No white flash, no font reflow.

### Phase 7 — Portrait · PARALLEL tooling, SERIAL look pass

`tools/portrait.py` (video/photo → delta-encoded packed frames) and
`src/type/portrait.js` (playback at 12 fps).

**Acceptance:** ≤ 200 KB for ~4 s; decode cost < 0.2 ms/frame; the still frame
holds up against `future-refs/another-reference.jpg` at thumbnail size.

*Blocked on you supplying the clip. Everything else can proceed without it —
build against a placeholder portrait and swap the asset in.*

### Phase 8 — ASCII Mew pass · SERIAL · optional, deferred

`src/engine/fx/asciiPass.js` implementing the existing presentation interface
(`pixelRatio / snapPx / resize / render / dispose`), plus
`presentation.asciiPass` config. Flip with `presentation.mode: "ascii"`.

**Build it, wire it, leave it off.** Bible §7.2 explains the toggle; the whole
change must remain one string in `rigConfig.js`.

### Phases R1–R3 — the revision pass · SERIAL · do these before phase 9

Phases 0–7 shipped and the site runs. Three things came back from looking at it,
and all three are **spec defects, not implementation defects** — the bible said
what got built. It has been rewritten; these phases bring the code to it.

What went wrong, and where the fix now lives:

| Symptom | Root cause | Fixed by |
|---|---|---|
| Headings are black rectangles with letters knocked out | old bible §4.4 rule 1: "a stem is a solid run of SOLID/**INVERT** cells", plus `field.invert.slotDensityAbove: 0.86` | bible §3.4a — darks come from **OVERSTRIKE**, inversion quarantined to the portrait |
| Headings are gigantic (166 px against 15 px body — 11×) | old rules 2+4 demanded a 2-cell stem and a bare counter out of a 7 px cell, which forces an ~80–130 px cap height | bible §3.6 — size in **rows**, and a finer 4×7 base cell. 63 px, ≈3.9× body |
| The cloud is uniform texture everywhere | §4.2 specified weather but not composition | bible §4.2 — `density = weather × presence(distance to content)`, baked at layout |
| The navigation is invisible until you sweep the cursor | §4.3 made the pointer *summon* words | bible §4.3 — words **self-assemble** on route settle; hover is now a modulation (§4.3a) |
| Route changes do not feel like one place | §7.1 called it "a GATHER re-target" | bible §7.1a — the site is a **torus of panels** and navigation is a camera pan |

Evidence to look at before starting: `tools/preview/heading_modes.png` renders
the shipped treatment (A) against the proposed one (D) using the real baked
ramp. D is the target.

#### R1 — the type render fix · the look

1. **Delete inverted cells from the field and from words.** Remove
   `field.invert.slotDensityAbove`; keep the register available for the portrait
   only, behind `portrait.allowInvert`.
2. **Add OVERSTRIKE** (bible §3.4a): a second glyph struck into the same cell at
   `+0.34 cell` across and `+0.10 cell` down, weight 600, chosen by the same
   density lookup. It is a **second instanced draw that replaces the inverted
   draw**, so the draw-call budget is unchanged at 3.
3. **Counters and surround thin to ≤ 0.06 effective ink** (rule 2). This, not
   stem darkness, is what makes the word readable. Currently far too gentle.
4. **Base cell 7×12 → 4×7**, with the device-pixel floor
   `cellW = max(base, ceil(8 / dpr))`. Re-derive the breakpoint table and the
   overflow ladder around the new base. The baked atlas does **not** need
   re-baking: it is stored at 56×96 per glyph and sampled down, and 4/7 = 0.571
   is within the aspect tolerance the ladder already accepts.
5. **The type scale from bible §3.6**: VOICE body 16 px, nav links 7 rows, h1
   9 rows. Delete the `min(13vw, cell-w × 26)` sizing in `src/site/dom.js`.
6. **Layout-anchored presence** (bible §4.2): a soft field peaked over the DOM's
   content rects, ~18-cell falloff, multiplied into resting density and baked
   into the cell data texture at layout.

**Acceptance:** no inverted cell anywhere outside the portrait — assert it in
`type.test.js` and count it in a dev lint. `PROJECTS` at h1 measures ≤ 520 px
wide at the 1512 px breakpoint. 35–55% of the viewport is below 0.04 effective
ink at rest. The greyscale-thumbnail squint test (bible §4.4 rule 5) passes for
every nav label at all five breakpoints. Field CPU and upload budgets from
phase 3 are unchanged — none of this adds per-frame work.

#### R2 — self-assembly and hover

1. **Words assemble on route settle**, not on pointer approach (bible §4.3):
   `assembleS` 2.6 s, per-cell stagger 0.9 s from the frozen seed, outside-in by
   distance to the word's centre, then they *stay*. GATHER is unchanged — only
   its trigger moves. `:focus-visible` forces instant full assembly.
2. **Hover as modulation** (bible §4.3a): sharpen, shiver, fringe, breath — four
   effects on one spring, per word, from the existing per-word uniform array.
   The shiver is the one place the glyph re-roll rate is allowed to spike.
3. Retire `gatherRadiusPx` as the primary mechanism. It survives only as the
   pointer's *local* influence on the field, which is a separate, smaller thing.

**Acceptance:** load any route, touch nothing, and every ASCII word is fully
formed within 3 s. Hover changes contrast, re-roll rate and fringe but never
colour-swaps. Keyboard tab reaches every link and focus assembles its word.
Chromatic cells stay inside the 4% budget with three words hovered in sequence.

#### R3 — the spatial map and the transit

1. **`siteConfig.map`**: routes → integer lattice cells, plus an extent per axis.
   Shortest-signed-delta-modulo-extent gives the wrap-around behaviour with no
   special cases (bible §7.1a). Adding a page is one line.
2. **The cell data texture covers the whole map** and is sampled `REPEAT` on both
   axes, so the torus costs nothing. At 4×7 on a 1512 px viewport a 3×3 map is
   ~1134×423 texels ≈ 1.9 MB. WebGL2 permits `REPEAT` on non-power-of-two.
3. **Generalise the field's scroll offset to a 2D camera.** A pan and a scroll
   are the same operation; do not build a second mechanism.
4. **MIGRATE** (bible §5): analytic, seeded stagger, one bump curve, along the
   travel direction. Two new uniforms total — `uTransit` (dir.xy, t01, amp) and
   the 2D camera.
5. **The panel stage**: source and destination DOM both mounted during transit,
   positioned by *visual* offset (source + delta, not the destination's canonical
   cell, or the wrap will teleport), the stage moved by one composited
   `translate3d`.
6. **Timing exactly as the table in bible §7.1a.** The camera starts 140 ms
   *after* the crowd, on `cubic-bezier(0.42, 0, 0.12, 1)`, duration
   `base × |delta|^0.6`.
7. **Mew takes a small impulse** opposite the travel direction as the pan starts,
   then catches up. She does not pan.
8. `prefers-reduced-motion`: camera jumps, words cross-fade in 240 ms.

**Acceptance:** clicking any link changes the URL immediately and shows no load,
no flash and no remount. W→E travels left; N→S travels up; home is one step from
everywhere. Moving a route's map cell in config changes the direction travelled
and nothing else. 50 navigations leave `renderer.info.memory` flat and the
listener map at baseline (plan §6 still applies). Back/forward reverse the pan.

### Phase 9 — Content, polish, performance · SERIAL

Real copy for WHO AM I / PROJECTS / CASE STUDIES / MY JOURNEY. Reduced-motion
path and its on-page toggle. The device matrix (§5). Final pass against the
bible's §9 acceptance test.

---

## 3. Dependency order

```
Phase 0 ──┬─> Phase 1 ──> Phase 2 ──┐
          │                          ├─> Phase 3 ──> Phase 4 ──┬─> Phase 5
          └─> Phase 6 (independent) ─┘                          ├─> Phase 7
                                                                │
   [0–7 SHIPPED] ──> R1 ──> R2 ──> R3 ──> Phase 9 <─────────────┘
                                          Phase 8 (any time after 3)
```

R1 → R2 → R3 is strictly serial: R2's assembly needs R1's readable words to be
worth looking at, and R3's transit needs R2's assembly as its arrival beat.

Phases 1, 2 and 6 can run concurrently with each other. Everything from 3
onward is one continuous thread, because from there on the acceptance test is
"does it look right", and that judgement does not parallelise.

---

## 4. Performance strategy

The budget is in the design bible §7.3, and it is backed by a measurement, not
an estimate — `tools/bench/field-bench.html` runs the three candidate
architectures head to head with GPU timer queries. Re-run it on any machine
before trusting a number here. (Note: its `fps` figures are meaningless inside
an automated preview pane, which throttles `requestAnimationFrame`; `cpuMs`,
`gpuMs` and the upload rate are the real outputs.)

The techniques that meet it:

1. **The field is a pure function in the vertex shader.** This is the one that
   matters; everything else is a rounding error next to it. Zero per-frame CPU
   over cells, zero per-frame upload, and the cost stops scaling with cell
   count. See phase 3 and bible §7.3.
2. **Render at the display's native rate.** Capping to 30/60 was in the earlier
   draft and is now wrong: it saves a fraction of a percent, and 60-into-120 on
   a ProMotion panel with a moving character is visible judder. Frames are
   reclaimed only on `document.hidden` (stop), after 45 s idle (30 fps), and by
   the degradation ladder.
3. **Two draw calls** for the whole type layer, instanced.
4. **The atlas is uploaded once** and sampled `NEAREST` — no mip chain, no
   anisotropy, no filtering cost, and no blur (which would ruin the look
   anyway).
5. **DPR capped at 2**, and at 1.5 when the grid exceeds 20 000 cells.
6. **`visibilitychange` → full stop.** No rAF while hidden.
7. **Adaptive degradation**: sample frame time over a 2 s window; if the p90
   exceeds 22 ms, step down in this order — DPR → drift off → glyph re-roll
   rate halved → 30 fps locked. Never step down glyph *quality*; a coarser
   field still looks designed, a badly matched one looks broken.
8. **Mew is untouched.** Her sim is already fixed-step and her pass already
   renders at quarter resolution.

Measure on the real thing, not on a desktop: Chrome DevTools 4× CPU throttle
plus a WebGL power-preference of `low-power` approximates a mid-range phone
well enough to catch the gross errors.

---

## 5. Device matrix (phase 9 gate)

| Device class | Target | Must hold |
|---|---|---|
| Desktop, discrete GPU | 60 fps interacting | everything on |
| Desktop, integrated (2018-era) | 60 interacting / 30 idle | everything on |
| iPhone 11 / Pixel 5 class | 30 idle, 60 on gather | DPR 2, full grid |
| Low-end Android (4 GB, 2019) | 30 locked | DPR 1.5, drift may degrade |
| 5-minute soak, any phone | no thermal step-down | battery graph flat |

---

## 6. Memory-leak protocol

You asked for every possible leak closed. There are six classes and each needs a
named owner, not vigilance.

**`src/utils/lifecycle.js`** provides one `createScope()` returning
`{ signal, add, addTimer, addRaf, dispose }`. Every subsystem takes a scope and
registers into it. Route teardown calls `dispose()` once. Nothing anywhere calls
`addEventListener` directly.

| # | Class | Owner | Test |
|---|---|---|---|
| 1 | **GPU objects** — geometry, material, texture, render target, and the shader program a material holds | every module's `dispose()`; `renderer.info.memory` is the ground truth | navigate 50×, assert `memory.geometries` and `memory.textures` return to baseline |
| 2 | **DOM listeners** | `scope.signal` — one `AbortController` per scope, `{ signal }` on every listener, one `abort()` removes all | count listeners before/after 50 route swaps |
| 3 | **rAF and timers** | `scope.addRaf` / `addTimer` | assert zero pending after dispose |
| 4 | **Observers** — Resize / Intersection / Mutation | registered in scope, `disconnect()` on dispose | as #2 |
| 5 | **Bus subscriptions** — `world.on` today has **no `off`** and this is a real leak in an SPA | phase 0 fix; `on()` returns an unsubscribe, registered in scope | assert the listener map size is constant across 1000 cycles |
| 6 | **Closures over detached DOM** — `colliders.js` holds element references in `world.colliders`, and the type layer will hold slot→element maps | clear both on route teardown; prefer `WeakRef` for anything that outlives a route | heap snapshot after 50 swaps: zero detached nodes |

Two further rules, because they are what actually bites:

- **The renderer, the scene, the camera and the atlas are created exactly once**
  and are never owned by a route. If a module can be created per route, it must
  take a scope.
- **`renderer.info` is asserted in CI**, not eyeballed. A leak that only shows
  up after 50 navigations will never be caught by looking.

---

## 7. Testing strategy

Same shape as the Mew work, which is why that work held up.

- **`test/type.test.js`** — headless, no DOM, no GL. Grid maths, the 6-D
  matcher, the field's physics integration (frame-rate independence: 60 steps at
  1/60 must equal 1 step at 1, as `sim.test.js` already asserts for `expDamp`),
  the sleeping predicate, word slot generation, and the leak assertions that can
  run without a browser.
- **`tools/check_type.py`** — the asset gate. Atlas, ramp table, portrait pack.
  Writes preview PNGs so regressions are *visible*, exactly as `check_mew.py`
  does.
- **`test/sim.test.js`** — must stay at 661+ green through every phase. It is
  the tripwire that says the rig has been disturbed.
- **A screenshot matrix** at the five breakpoints for every route, checked
  against the bible's §9 poster test.

A shader-carrying module must be added to the "every module parses" list in
`sim.test.js`. That check exists because a backtick inside a GLSL comment
silently kills a whole module, twice. It will happen again.

---

## 8. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| ASCII headings are illegible at mobile sizes | **High** | Bible §4.4's four rules, enforced in code with a VOICE fallback. Decide the minimum ASCII type size in phase 4 and design around it rather than fighting it. |
| The field looks like static | High | Domain-warped density (§4.2) and frozen randomness (§3.5). Judge every build by the greyscale-thumbnail test. |
| Phones get hot | Medium | 30 fps idle + sleeping cells are worth more than every other optimisation combined. Soak-test from phase 3, not at the end. |
| Multi-agent aesthetic drift | Medium | Only phases 1, 2 and 6 are delegated, and all three have objective pass/fail. Everything where "does it look right" is the test stays on one thread. |
| The portrait clip arrives late | Medium | Placeholder asset; the pipeline is testable without the real clip. |
| Scope creep into a full CMS | Medium | Content is data in `src/site/content/*.js`. No CMS, no markdown pipeline, no build step beyond Vite. |
| Chromatic fringe drifts into "accent colour" | Low but fatal to the look | The 4% budget is a lint: count fringe cells per frame in dev and warn. |

---

## 9. Immediate next actions

1. **You**: pick the portrait clip (short, slow, near-loop — a blink or a head
   turn). Confirm the four nav labels. Confirm paper/ink hexes in bible §3.3.
2. **Next session**: `DELEGATION.md` → prompt A (phase 0), which unblocks
   everything.
