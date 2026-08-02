# DELEGATION — who builds what, and the exact prompt to paste

Read alongside `IMPLEMENTATION_PLAN.md`. This file is operational: it is not
part of the spec, it is instructions for you.

---

## The rule behind the assignments

Delegate work whose acceptance test is **objective** (a number, a diff, a
passing assertion). Keep work whose acceptance test is **"does it look right"**
on one continuous Opus thread.

That is not caution about model capability. It is that a shared aesthetic cannot
be reconstructed from a document by three agents independently — they will each
make a locally reasonable call and the results will not sit together. Cohesion
is the thing you said you care most about, so it gets the single-owner
treatment.

## Assignment table

| Prompt | Phase | Model | Effort | Why |
|---|---|---|---|---|
| **A** | 0 — Foundations | **Opus** | high | Touches the calibrated engine (`world.off`) and writes the config every later phase reads. Cheap to get right, expensive to get wrong. |
| **B** | 1 + 2 — Atlas + matcher | **Sonnet** | high | Pure, measurable, cross-checkable Python↔JS. Coupled, so one session. |
| **C** | 3 + 4 + 5 — Field, words, beam | **Opus** | xhigh | The heart. One unbroken thread, one aesthetic. Let it compact rather than splitting it. |
| **D** | 6 — Router + transitions | **Sonnet** | high | Well-understood problem, objective leak tests, disjoint files. |
| **E** | 7 — Portrait pipeline | **Sonnet** then **Opus** | high | Sonnet builds the tooling (measurable); Opus does the look pass. |
| **F** | 8 + 9 — ASCII Mew, content, perf | **Opus** | high | Judgement calls throughout. |

**Haiku**: only for mechanical file shuffling if you ever need it. Nothing in
this project qualifies — don't force it.

## Order of operations

```
A  (alone, must finish first — everything reads siteConfig.js)
│
├── B ──┐
│       └──> C  (needs B's ramp.json + match.js)
└── D ──┘        (D is independent; run it any time after A)
                 C ──> E(look) ──> F
```

**Run A, then B, then C sequentially.** D can run in parallel with B if you want
the wall-clock — put it in its own git worktree (`git worktree add ../aw-router`)
so it cannot collide on `main.js`. Honestly: unless you are in a hurry,
sequential is less merge pain and the total token cost is the same.

**After every session**: run `npm test` and `python3 tools/check_mew.py`. If
`sim.test.js` drops below 661, the rig has been disturbed — stop and revert.

---

# PROMPT A — Phase 0, Foundations · Opus, high effort

```
Read DESIGN_BIBLE.md, then IMPLEMENTATION_PLAN.md, then HANDOFF.md (skim the
architecture map and read the pitfalls section in full). They are in the repo
root.

Implement Phase 0 only. Four deliverables:

1. src/config/siteConfig.js — transcribe every number in the design bible into
   one config module: grid breakpoints and cell sizes (§3.1), colours (§3.3),
   ramp family membership (§3.4), the four motion verbs' rates (§5), the
   performance budget (§7.3), the fringe rule. Follow rigConfig.js's commenting
   culture exactly: relaxed tone, lowercase, and every number says WHY it is
   that number, citing the bible section. This file is the single source of
   truth for the look; nothing downstream may hardcode a constant.

2. src/utils/lifecycle.js — createScope() returning
   { signal, add, addTimer, addRaf, dispose }. One AbortController per scope so
   a single abort() removes every listener. Tracks timers, rAF ids, observers
   and arbitrary disposables. dispose() is idempotent. See plan §6.

3. Fix src/engine/world.js: on() has no off(). Add off(type, fn), make on()
   return an unsubscribe function, add once(). This is a real leak once the site
   is an SPA — route swaps accumulate listeners holding closures over dead DOM.
   Keep the existing on()/emit() call sites working unchanged.

4. src/type/grid.js — pure, no DOM. viewport -> cell size (integer, quantized by
   the bible's breakpoint table, never interpolated) -> grid dims -> doc<->cell
   maps.

Add test/type.test.js in the same style as test/sim.test.js (plain node, ok()
assertions, section() headers, prints "N/N checks passed"). Assert: cell size is
an integer at every breakpoint; cellToDoc(docToCell(p)) round-trips within one
cell; the grid never exceeds 24000 cells up to a 2560px viewport; a removed bus
listener stops firing; the listener map does not grow across 1000
subscribe/unsubscribe cycles; a disposed scope has zero pending timers and rAFs.
Add "npm run test:type" to package.json and make "npm test" run both suites.

Do not touch anything else in src/engine/**. Do not build any rendering. Do not
add dependencies.

When done: run npm test and python3 tools/check_mew.py, and report both counts.
sim.test.js must still be 661+ green.
```

---

# PROMPT B — Phases 1 + 2, Glyph atlas and matcher · Sonnet, high effort

```
Read DESIGN_BIBLE.md §3.4 and §4.1 first, then IMPLEMENTATION_PLAN.md phases 1
and 2. Look at tools/rig_mew.py and tools/check_mew.py to match the house style
for tooling, and at src/engine/fx/presentMath.js for how this repo mirrors a
Python/GLSL computation in tested JS.

Deliver three things.

1. tools/glyphatlas.py — renders IBM Plex Mono (download the SIL OFL TTFs into
   tools/fonts/ if not present) at weights 200/400/600, for the ramp glyph set
   defined in src/config/siteConfig.js, into a single R8 PNG atlas of at most
   2048x2048, and emits src/assets/ramp.json:
     { "cell":[w,h], "atlas":[W,H], "glyphs":[
        {"ch":"J","w":600,"uv":[u0,v0,u1,v1],"cov":0.41,"v6":[6 floats]}, ...]}
   cov is ink coverage 0..1. v6 is the 6-D shape vector: coverage measured under
   six staggered sampling discs (top-left, top-right, mid-left, mid-right,
   bottom-left, bottom-right), staggered vertically so they cover the cell
   without overlapping much, each dimension normalised so its max across the
   whole set is 1.0. Supersample the coverage measurement — this table is
   measured, not estimated, and everything downstream inherits its accuracy.

2. tools/check_type.py — the asset gate, in the exact spirit of check_mew.py
   (named checks, ok/fail lines, an "ALL CHECKS PASS" summary, and preview PNGs
   written to tools/preview/). Assert: every ramp glyph is present at every
   weight; coverage spans at least 0.02..0.55; no two glyphs at the same weight
   are closer than 0.04 in 6-D (confusables waste table space and make the
   matcher noisy); atlas <= 2048^2 and <= 1.5 MB; the atlas has no glyph
   bleeding across its cell bounds. Write tools/preview/ramp.png as a contact
   sheet sorted by coverage, and tools/preview/ramp_test.png showing a
   greyscale gradient rendered through the ramp.

3. src/type/match.js — pure, headless, no DOM. Nearest neighbour in 6-D over the
   ramp table, with a quantized cache (5 bits per axis packed into one integer
   key). Must be a numeric mirror of the Python. Export the matcher plus a
   cacheStats() for tests.

Extend test/type.test.js: for 500 pseudorandom 6-D vectors (seeded, using
mulberry32 from src/utils/math.js) the JS matcher and a small Python reference
dump must pick the same glyph at least 99% of the time and never differ by more
than one rank; cache hit rate above 90% on a real gradient; a warm lookup under
0.5us. Commit the Python reference dump as a fixture so the test stays headless.

Do not touch src/engine/**, src/main.js, or index.html. Do not add npm
dependencies (Python-side, pillow and numpy are already available).

When done: run npm test, python3 tools/check_type.py and python3
tools/check_mew.py, and report all three.
```

---

# PROMPT C — Phases 3 + 4 + 5, The field · Opus, xhigh effort

```
Read DESIGN_BIBLE.md in full — all of it, twice if it helps — then
IMPLEMENTATION_PLAN.md phases 3, 4 and 5, then HANDOFF.md's pitfalls section.
You are building the heart of this site and you own its look. If the plan and
the bible ever disagree, the bible wins.

Build, in this order, as one continuous piece of work:

PHASE 3 — src/type/field.js and src/type/fieldRenderer.js.
One InstancedBufferGeometry, one quad, per-instance attributes (cell xy, glyph
index, weight, ink index, inverted flag). EXACTLY TWO draw calls for the whole
type layer: opaque cells, then inverted cells. Implement cell sleeping — a cell
at rest is not integrated and its buffer slice is not re-uploaded; wake on
disturbance, sleep below the thresholds in the plan, partial uploads via
addUpdateRange over the awake span. Implement DRIFT with a per-cell Poisson
glyph re-roll (mean 2.5s) and frozen per-cell randomness (bible §3.5). The
resting density must follow a domain-warped noise field so the page has weather
(§4.2) — uniform random characters look like static and are the most common way
this aesthetic fails. Adaptive frame pacing: 30fps idle, 60fps while the awake
set is non-empty.

PHASE 4 — src/type/words.js, the GATHER behaviour, src/site/dom.js.
Text -> coverage bitmap (one cached offscreen 2D canvas) -> slots -> glyphs via
match.js. ENFORCE the four legibility rules in bible §4.4 in code: minimum stem
width of 2 cells, at least one bare counter cell in closed letters, mass not
outline, thinned surroundings. When a word cannot satisfy them at the current
breakpoint, fall back to VOICE rendering and warn — do not ship an illegible
heading. GATHER is driven by pointer distance AND by :focus-visible on the real
DOM link, resolves outside-in, and its falloff is continuous, never binary. The
semantic DOM is real, transparent text: never aria-hidden, never
visibility:hidden.

PHASE 5 — beam displacement. Subscribe the field to the world's "beamFire"
event (it already carries a document-space origin, direction and length; see
src/main.js). SCATTER + SETTLE per bible §6.4: non-destructive, nothing
persists, cells settle overdamped over ~2s arriving at slightly different times.
Also add the soft clearing Mew pushes through the field (§6.5) — one distance
test inside the pass that already runs.

Everything must take a lifecycle scope (src/utils/lifecycle.js) and dispose
cleanly. Nothing calls addEventListener directly. Read every constant from
src/config/siteConfig.js; hardcode nothing.

Extend test/type.test.js: frame-rate independence of the field's integration
(60 steps at 1/60 equals 1 step at 1, the way sim.test.js already asserts for
expDamp); the sleeping predicate; word slot generation and the legibility
assertions; that firing the beam twice in the same place gives identical
results; that after 4s the awake set is empty.

Verify in the browser yourself — do not ask the user to check. Use the preview
tools, take screenshots, and apply the bible's §9 test: greyscale, thumbnail, is
it a good poster? Also confirm renderer.info.render.calls for the field is
exactly 2 and renderer.info.memory is flat over 60 seconds.

Do not touch src/engine/** except to subscribe to events. Mew's look does not
change in this phase.

When done: npm test, python3 tools/check_mew.py, python3 tools/check_type.py,
plus screenshots at the five breakpoints.
```

---

# PROMPT D — Phase 6, Router and transitions · Sonnet, high effort

```
Read IMPLEMENTATION_PLAN.md phase 6 and section 6 (the memory-leak protocol),
plus DESIGN_BIBLE.md §7.1. Read index.html — its comment block is the layer
contract and it is binding.

Build src/site/router.js: an SPA router over the History API for a site whose
WebGL canvas must persist for the entire session.

Requirements:
- Route modules are code-split and prefetched on requestIdleCallback and again
  on link pointerenter, so content is resident before the click.
- Same-document View Transitions API for the DOM layer, with a silent no-op
  fallback where unsupported. Never a cross-document navigation: it would
  destroy the WebGL context, drop the glyph atlas and reload the character.
- THE CANVAS AND THE RENDERER ARE NEVER RE-CREATED. A route change swaps the
  semantic DOM and emits a "route" event on the world bus; the type layer
  re-targets. Do not touch the type layer or the canvas yourself.
- Handle popstate, deep links, scroll restoration and a 404 route.
- Every listener, timer, observer and subscription goes through a lifecycle
  scope (src/utils/lifecycle.js). Route teardown calls dispose() exactly once.

Content lives as DATA in src/site/content/*.js — plain exported objects with a
title, a nav label and sections. No markup strings, no markdown pipeline, no CMS.
Stub the four routes (who-am-i, projects, case-studies, my-journey) with
placeholder copy clearly marked as placeholder.

Extend test/type.test.js with the leak assertions that can run headlessly, and
add a documented manual procedure for the ones that cannot: navigate all routes
50 times, then assert renderer.info.memory is at baseline, the world's listener
map is at its initial size, and a heap snapshot shows zero detached DOM nodes.

Do not touch src/engine/**, src/type/**, or the rig config.

When done: npm test and python3 tools/check_mew.py, and report the leak numbers.
```

---

# PROMPT E — Phase 7, Portrait · Sonnet for tooling, then Opus for the look

**E1 · Sonnet, high effort**

```
Read DESIGN_BIBLE.md §4.5 and IMPLEMENTATION_PLAN.md phase 7. Match the house
tooling style in tools/rig_mew.py.

Build tools/portrait.py: takes a still image or a short video/gif, and emits a
packed binary of ASCII cell frames using the ramp table from src/assets/ramp.json
and the same 6-D matching as tools/glyphatlas.py.

- delta-encode between frames (most cells do not change between adjacent frames)
- target 12 fps and at most 200 KB for roughly 4 seconds
- emit a companion JSON header (grid dims, frame count, fps, byte offsets)
- write tools/preview/portrait_*.png for the first, middle and last frames so a
  regression is visible

Build src/type/portrait.js: playback at 12 fps into the field's buffers, decode
cost under 0.2 ms per frame, taking a lifecycle scope and disposing cleanly.

Extend tools/check_type.py to gate the portrait pack: size, frame count, that
every referenced glyph exists in the ramp table, and that decoding frame N from
the deltas matches a full re-encode of frame N exactly.

Use any placeholder image for now; the real clip arrives later and must swap in
without a code change.
```

**E2 · Opus, high effort** — run after E1, and after the real clip exists.

```
Read DESIGN_BIBLE.md §4.5 (the airy register: another-reference.jpg, not the
Otaku poster) and look at future-refs/another-reference.jpg and
future-refs/slightly-colored-eyes-asciish.jpg.

Tune the portrait until it holds up at thumbnail size against those references.
This is a look pass: adjust the ramp weighting, contrast enhancement, the
chromatic fringe (bible §3.3 — one-cell offset, 4% budget, never a fill) and the
grid density for this element specifically. Verify in the browser with
screenshots at all five breakpoints.

Change tools/portrait.py and the config, not the runtime architecture.
```

---

# PROMPT F — Phases 8 + 9, ASCII Mew toggle, content, performance · Opus, high

```
Read DESIGN_BIBLE.md §7.2 and §7.3, and IMPLEMENTATION_PLAN.md phases 8 and 9
plus section 5 (the device matrix).

PHASE 8 — build src/engine/fx/asciiPass.js implementing the existing
presentation interface (pixelRatio / snapPx / resize / render / dispose — see
src/engine/fx/presentation.js), so that setting presentation.mode to "ascii" in
src/config/rigConfig.js renders Mew through the same glyph atlas as the type
field, at her own coarser cell size (start at 2x the field's). Reuse the image
-> cell -> glyph code from the portrait; do not write a second one. Add a
presentation.asciiPass config block.

BUILD IT, WIRE IT, AND LEAVE IT OFF (mode stays "pixelate"). The whole toggle
must remain one string in rigConfig.js, and say so in a comment there and in
HANDOFF.md.

PHASE 9 —
- Real content for the four routes, in src/site/content/*.js.
- The reduced-motion path: prefers-reduced-motion disables drift and glyph
  re-roll, turns GATHER into an instant cross-fade, and reduces beam scatter to
  a fade. Add an on-page toggle too, for shared devices.
- Work the device matrix in IMPLEMENTATION_PLAN.md §5. Implement the adaptive
  degradation ladder in plan §4.7 (DPR -> drift off -> re-roll halved -> 30fps
  locked) and never degrade glyph MATCH quality.
- Add a dev-only lint that counts chromatic cells per frame and warns above the
  4% budget (bible §3.3).
- Final pass against the bible's §9 acceptance test.

Update HANDOFF.md with everything learned, in its existing voice, including a
new pitfalls entry for anything that cost real time.

Verify in the browser yourself with screenshots. Report npm test, check_mew.py
and check_type.py.
```

---

## After every session

```bash
npm test && python3 tools/check_mew.py && python3 tools/check_type.py
```

If `sim.test.js` is below 661 checks, the rig has been disturbed — revert and
find out why before continuing.
