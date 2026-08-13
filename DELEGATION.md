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
| **G** | R1 — type render fix | **Opus** | xhigh | The look. This is the one that decides whether the site is beautiful. |
| **H** | R2 — self-assembly + hover | **Opus** | high | Judgement, and it inherits G's calibration. |
| **I** | R3 — spatial map + transit | **Opus** | xhigh | New architecture plus a choreographed sequence. Not delegable to a cheaper tier. |
| **F** | 8 + 9 — ASCII Mew, content, perf | **Opus** | high | Judgement calls throughout. Run **after** G/H/I. |

**Haiku**: only for mechanical file shuffling if you ever need it. Nothing in
this project qualifies — don't force it.

## Order of operations

```
A  (alone, must finish first — everything reads siteConfig.js)
│
├── B ──┐
│       └──> C  (needs B's ramp.json + match.js)
└── D ──┘        (D is independent; run it any time after A)
                 C ──> E(look)

[A–E DONE]  ──>  G  ──>  H  ──>  I  ──>  F
                 the revision pass. strictly serial: H inherits G's
                 calibration, and I's arrival beat IS H's assembly.
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

PHASE 3 — src/type/fieldMath.js, field.js, fieldRenderer.js.

READ DESIGN_BIBLE.md §7.3 CAREFULLY. It was rewritten after benchmarking three
architectures head to head (tools/bench/field-bench.html, results in the bible).
THE FIELD IS A PURE FUNCTION OF (cell identity, absolute time, a few globals),
EVALUATED IN THE VERTEX SHADER. There is no integration loop, no awake set, no
sleeping predicate, and no per-frame buffer upload — that machinery must not
exist. Measured: 18x less CPU than the CPU-driven version for a pixel-identical
result, and the cost stops scaling with cell count.

One InstancedBufferGeometry, one quad. Instances cover the VIEWPORT plus a
two-cell margin, not the document. Per-cell content (home, seed, candidate glyph
ids, word id, slot position, distance to nearest slot, resting density) lives in
a data texture indexed by DOCUMENT grid coordinate and is read in the vertex
shader — WebGL2 guarantees at least 16 vertex texture units and the target
machine reports 16. That texture is written on layout and route change only, via
texSubImage2D over the changed region. Scrolling is one uniform. EXACTLY TWO
draw calls: opaque cells, then inverted cells.

All four verbs are closed form, in the vertex shader:
  DRIFT           noise(seed, t)
  GATHER          falloff(|home - pointer|) blended toward the slot position
  SCATTER+SETTLE  impulse * tau * exp(-k*tau), the critically damped impulse
                  response, tau = t - tHit, with a per-cell phase offset from
                  the seed so cells arrive at different times
  glyph re-roll   hash(seed, floor(t/period + phase))
Per frame the CPU writes about ten uniforms (time, pointer, up to four active
hit events, mew's position, per-word resolve amounts) and issues one draw. ZERO
BYTES UPLOADED PER FRAME.

The resting density must follow a domain-warped noise field so the page has
weather (bible §4.2) — uniform random characters look like static and are the
most common way this aesthetic fails. Precompute it into the cell data texture
at layout time; do not evaluate it per frame.

src/type/fieldMath.js is the JS MIRROR of every analytic function in the shader,
exactly as src/engine/fx/presentMath.js mirrors its GLSL and
src/engine/fx/beamGeometry.js mirrors the beam. The shader is required to match
it. This is the whole testing and debugging story for GLSL-resident motion and
it is not optional — write it first, test it, then port it into the shader.

Render at the display's native rate. Do NOT cap to 30 or 60: the saving is a
fraction of a percent of a 120 Hz budget and 60-into-120 on a ProMotion panel
with a moving character is visible judder. Frames are reclaimed only on
document.hidden, after 45s of no input, and by the degradation ladder.

If some behaviour seems to need per-frame CPU work over cells, first check
whether it has a closed form — all four verbs did, because they were specified
as overdamped and non-interacting. If something genuinely needs state, give it
its own small buffer of ACTIVE cells; do not put the whole field back on the CPU.

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

Extend test/type.test.js against fieldMath.js: every verb is a pure function of
absolute time, so evaluating at t is identical however you got there (this
replaces the old frame-rate-independence test and is strictly stronger); the
impulse response decays to under 0.1% by the settle duration; firing the same
hit twice gives bit-identical output; word slot generation and the legibility
assertions from bible §4.4.

Verify in the browser yourself — do not ask the user to check. Use the preview
tools, take screenshots, and apply the bible's §9 test: greyscale, thumbnail, is
it a good poster? Then measure, with tools/bench/field-bench.html as the
methodology: field CPU under 0.1 ms/frame at 17000+ cells, 0 bytes uploaded per
frame, renderer.info.render.calls for the field exactly 2, renderer.info.memory
flat over 60 seconds. Note that fps readings inside an automated preview pane
are meaningless (rAF is throttled when the pane is not fronted) — trust cpuMs,
gpuMs and the upload rate.

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

---

# THE REVISION PASS — run G, then H, then I, strictly in order

Phases 0–7 shipped and the site runs. Three things came back from looking at it,
and all three were **spec defects**: the design bible said what got built. The
bible has been rewritten (§2 reference table, §3.4a, §3.6, §4.2, §4.3, §4.3a,
§4.4, §5, §7.1a, §8) and `IMPLEMENTATION_PLAN.md` has phases R1–R3. These three
prompts bring the code to it.

**Do not run these in parallel.** Each inherits the previous one's calibration.

---

# PROMPT G — R1, the type render fix · Opus, xhigh effort

```
Look at tools/preview/heading_modes.png FIRST, before reading anything. It
renders one word five ways with the project's real baked ramp. A is what the
site currently ships. D is the target. That single image is the brief.

Then read DESIGN_BIBLE.md sections 2, 3.4, 3.4a, 3.6, 4.2, 4.4 and 8 — all of
them are new or rewritten — and IMPLEMENTATION_PLAN.md phase R1.

Context you need: the site's headings currently render as BLACK RECTANGLES with
letters knocked out of them, at 166 px against 15 px body copy. Both were caused
by the bible's original wording, not by a coding mistake, so do not go looking
for a bug — implement the new spec.

Six changes:

1. DELETE INVERTED CELLS from the field and from every word. Remove
   field.invert.slotDensityAbove from src/config/siteConfig.js and every code
   path that reads it. Keep the register available for the portrait ONLY, behind
   a new portrait.allowInvert flag.

2. ADD OVERSTRIKE (bible 3.4a). The darkest two stops are made by striking a
   SECOND glyph into the same cell, offset +0.34 cell across and +0.10 cell
   down, weight 600, picked by the same density lookup. This is where the darks
   come from now, and it is the owner's own opening brief ("overlapping text in
   order to bring out some darks"). Implement it as a second instanced draw that
   REPLACES the inverted-cell draw, so the draw-call budget stays at 3.

3. THIN THE COUNTERS HARD. Counters and the immediate surround of a word go to
   0.06 effective ink or below. The densest glyph in the ramp is 0.337, so a
   stem can never be dark in absolute terms -- the word reads by CONTRAST, and
   the current thinning is far too gentle. This is the single most important
   number in this phase.

4. BASE CELL 7x12 -> 4x7, with a device-pixel floor:
   cellW = max(base, ceil(8 / dpr)), so retina gets 4 CSS px and non-retina 8.
   Re-derive the breakpoint table and the overflow ladder in siteConfig around
   the new base. The atlas does NOT need re-baking (it is stored at 56x96 per
   glyph and sampled down; 4/7 = 0.571 is inside the aspect tolerance the ladder
   already accepts). Check the cell budget still holds -- it will, the ceiling is
   120 000.

5. THE TYPE SCALE from bible 3.6: VOICE body 16 px, ascii nav links 7 rows of
   cap height, ascii h1 9 rows. DELETE the `min(13vw, calc(var(--cell-w) * 26))`
   sizing in src/site/dom.js and derive font-size from capRows x cellHeight.

6. LAYOUT-ANCHORED PRESENCE (bible 4.2). Resting density becomes
   weather(noise) x presence(distance to the page's content rects), falloff
   ~18 cells, computed ONCE at layout from the DOM's own getBoundingClientRect
   and baked into the cell data texture. Right now the cloud is statistically
   identical across the whole viewport, which reads as wall-to-wall texture; the
   references all have large confident areas of bare paper.

ACCEPTANCE. Assert in test/type.test.js that no inverted cell can be produced
outside the portrait. "PROJECTS" as an h1 measures at most 520 px wide at a
1512 px viewport. 35-55% of the viewport sits below 0.04 effective ink at rest.
Apply bible 4.4 rule 5 yourself: screenshot each nav label, greyscale it, scale
to 25%, and confirm it still reads -- if it becomes a grey bar, the counters are
not cleared hard enough. Field CPU and upload budgets from phase 3 must be
unchanged; none of this adds per-frame work.

Verify in the browser yourself with screenshots at all five breakpoints. Do not
ask the owner to check. Report npm test, check_type.py and check_mew.py.
```

---

# PROMPT H — R2, self-assembly and hover · Opus, high effort

```
Read DESIGN_BIBLE.md 4.3 and 4.3a (both new) and IMPLEMENTATION_PLAN.md phase
R2. Prompt G must be finished and merged first.

The problem being fixed: words currently only appear where the pointer is near
them, so a visitor who does not sweep the cursor across a field of characters
never discovers the site has navigation at all. That was the bible's original
design and it was wrong.

1. WORDS ASSEMBLE ON ROUTE SETTLE, not on pointer approach. assembleS 2.6 s,
   per-cell stagger 0.9 s taken from the cell's existing frozen seed, ordered
   outside-in by distance to the word's own centre so the silhouette resolves
   before the interior. Then they STAY assembled -- the field around them keeps
   drifting and re-rolling, so a formed word is a crowd holding a formation, not
   a static image. The GATHER verb itself does not change; only its trigger.
   :focus-visible on a real DOM link forces its word to full assembly instantly.

2. HOVER BECOMES A MODULATION of an already-assembled word (bible 4.3a). Four
   things on one ~180 ms spring, per word, driven from the per-word uniform array
   that already exists:
     - SHARPEN: stem density +15%, counters thinned harder. Contrast rises.
     - SHIVER: glyph re-roll rate x8 for 250 ms, then decays. The word
       reconsiders itself and settles.
     - FRINGE: a one-cell chromatic ghost on the stems' leading edge. This is
       the one hover allowed to spend chromatic ink, and it must stay inside the
       4% budget in bible 3.3.
     - BREATH: stem cells drift outward by at most 0.35 cell and back.
   No colour swap, no underline, no scale. Off-hover everything relaxes on the
   same spring; nothing snaps.

3. gatherRadiusPx stops being the primary mechanism. It survives only as the
   pointer's small local influence on the surrounding field.

ACCEPTANCE. Load any route, touch nothing: every ascii word is fully formed
within 3 s. Keyboard tab reaches every link and focus assembles its word. Hover
three words in sequence and the chromatic cell count stays under 4%. Verify in
the browser with screenshots and a short screen recording of one word assembling.
Report npm test, check_type.py, check_mew.py.
```

---

# PROMPT I — R3, the spatial map and the transit · Opus, xhigh effort

```
Read DESIGN_BIBLE.md 7.1a (new, the whole section including the beat table) and
5 (the MIGRATE verb), then IMPLEMENTATION_PLAN.md phase R3. Prompts G and H must
be finished first.

THE IDEA: the site is not a stack of documents, it is one continuous plane, and
navigating is moving a camera across it. The crowd of characters is the same
crowd the whole time and it walks with you. Reference for the feel:
noomoagency.com, where you cannot tell a navigation happened except that the URL
changed.

1. src/config/siteConfig.js gains `map`: routes -> integer lattice cells, plus a
   per-axis extent. Home at [0,0], who-am-i [0,-1], projects [1,0],
   case-studies [0,1], my-journey [-1,0]. THE PLANE IS A TORUS: travel takes the
   shortest signed delta modulo the extent,
     delta = ((b - a + E/2) mod E) - E/2
   which makes West -> East travel LEFT and arrive from the far side, and
   North -> South travel up. That is the requested behaviour and it must fall
   out of the modulus, NOT out of special cases. Adding a page must be one line
   and moving a page must be two numbers; nothing else in the system may know
   that a compass direction exists.

2. The cell data texture covers the WHOLE map and is sampled REPEAT on both
   axes, so the wrap-around is literally texture wrapping. WebGL2 allows REPEAT
   on non-power-of-two. At 4x7 cells on a 1512 px viewport a 3x3 map is about
   1134x423 texels, ~1.9 MB. Budget it and assert it.

3. GENERALISE THE FIELD'S SCROLL OFFSET INTO A 2D CAMERA. A pan and a scroll are
   the same operation and the field already recycles cells at the viewport edge
   -- do not build a second mechanism alongside it.

4. MIGRATE, the fifth verb: analytic, in the vertex shader like the other four,
   a seeded per-cell stagger over one bump curve along the travel direction.
   Two new uniforms total: uTransit (dir.xy, t01, amp) and the 2D camera.

5. THE PANEL STAGE: source and destination DOM are both mounted during the
   transit, positioned by VISUAL offset (source + delta), NOT by the
   destination's canonical map cell -- get that wrong and a wrapped navigation
   teleports. The stage moves with one composited translate3d.

6. TIMING EXACTLY AS THE TABLE IN BIBLE 7.1a. The ordering is the entire effect:
   the crowd leads and the camera chases.
     t=0      pushState; destination DOM mounts; nothing visible yet
     0-180    MIGRATE begins, staggered, crowd peels away
     140      camera starts -- DELIBERATELY LATE, this is what makes it read as
              following -- on cubic-bezier(0.42, 0, 0.12, 1)
     ~900     migrate bump falls, crowd decelerates ahead of the camera
     ~1150    camera arrives and settles
     900-2400 destination words GATHER (prompt H's assembly). The heading
              finishes last, which is what makes arrival feel like arrival.
   Every number is a config knob.

7. Mew does NOT pan -- she is a creature, not scenery. She takes a small impulse
   opposite the travel direction as the pan starts and then catches up. One
   world.emit + body.addImpulse.

8. prefers-reduced-motion: the camera jumps and the words cross-fade over 240 ms.
   The DOM swap, the URL and the focus order are identical either way.

ONE SCREEN PER PAGE is assumed: a panel is exactly one viewport, so North is
always one screen up. Long copy goes in a bounded internal scroll region inside
a panel, or gets its own map cell. Flag it to the owner if any current content
cannot live that way.

ACCEPTANCE. Clicking any link changes the URL immediately with no load, no
flash, no remount. W->E travels left; N->S travels up; home is one step from
everywhere. Change a route's map cell in config and confirm the travel direction
changes and NOTHING else does. Back/forward reverse the pan. 50 navigations
leave renderer.info.memory flat and the world listener map at baseline (plan
section 6 still applies in full). Verify in the browser yourself with a screen
recording of one full transit. Report npm test, check_type.py, check_mew.py.
```

---

## After every session

```bash
npm test && python3 tools/check_mew.py && python3 tools/check_type.py
```

If `sim.test.js` is below 661 checks, the rig has been disturbed — revert and
find out why before continuing.
