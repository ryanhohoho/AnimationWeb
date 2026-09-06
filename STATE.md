# STATE — what this is, how it works, and what has already been paid for

Read `RYAN.txt` first, then this. `CLAUDE.md` is how to work here; `DESIGN.md`
is the argument for the look. This file is the system.

Last consolidated after the phone pass, the counter and the sweat rewrite.
Suite: **842 sim checks + the router harness** (`npm test`), build clean.

---

# 1 · The build

Two sheets and one animal: a **two-ink riso print of a sky** seen through
**die-cut apertures** in one continuous bone sheet, with **Mew** the only
unprinted thing on it.

The print is rendered once and never again. **Steady-state ground cost is zero.**
Type never sits on tone.

### It is a DECK now, not a scroll

Four cards, one screen each, read with the arrow keys:

**01 SUMMARY · 02 EXPERIENCE · 03 PROJECTS · 04 CONTACT**

with the three project sheets hanging off card 03 as long scrolling documents.

The reason is readability, and it came from the owner: the previous build was one
tall sheet with a projector gate on it, which is right for something you are
meant to look at and wrong for something a hiring manager is skimming to decide
whether to keep reading. A gate shows you one thing and moves on its own. A deck
lets someone get through the whole of it in four keypresses.

**The night still falls, but it is a property of the CARD.** It used to fall as
you scrolled one tall document — 19:00 at the top, 01:00 at the foot. Four
one-screen cards have no scroll to fall through, so each carries an absolute
`uSkyRamp` and the deck walks the same run: `0 / 1200 / 2500 / 3500`
(`RAMP` in `site/router.js`, an hour being `4000/6` px against `REF_H`). Home is
still exactly 0. A project sheet is a tall document again and walks its own night
from 0, as it always did.

Each card carries **one small round die-cut above its own name** so that night is
visible: without a hole a card is all paper, and the whole mechanic would be
something the code does that nobody can see. It is the only circle on the site --
every other die-cut is a rectangle because a die-cut is a rectangle -- so it
reads as a lens rather than as a window. `uRoundHole` is an index, not an array,
for the same reason `uAltHole` is: exactly one aperture on any sheet is round.

### The identity system

Cerulean is the constant — every plate is pulled in it and no project may own it.
A project owns its own **pair**: usb-provisioning/navy + black, closet/two greys,
iclicker/blue + teal.

Three differently-coloured windows can live on a one-or-two-ink sheet because
**only the icon under the pointer is open.** That was the gate's rule — one
project at a time — moved from a timer to the reader's own attention. It is also
why the shader needs exactly one masked hole and `uAltHole` can stay a single
int: the constraint and the design are the same decision.

### Routing

Real paths + History API, one document. Mew is a live WebGL context with physics
and a brain, so a real navigation would kill her: the SHEET changes, not the
window. Home markup ships in `index.html` and the router captures it once, so the
first paint needs no JS. Per-page `createScope()`; the commit is in a
`try/finally` with a watchdog, because a page that renders one project's markup
badly is a bug and a page that renders nothing is a dead site.

### Project sheets

`usb-provisioning`, `iclicker`, `closet` have their own sheets. Anything else
falls back to shared chrome plus a dialog saying it is **set, not printed** —
which is a real condition in a print shop, not a placeholder.

Each new page gets **its own concept, developed one at a time.** Do not brainstorm
the next before the current one is finished and polished.

---

# 2 · Architecture

### Two chunks, and why

`main.js` is **the site** — the world, the press, the routing, the chrome — and
it touches three.js nowhere. `src/mew.js` is **the animal**, and it is a dynamic
import. Verified against the built artefacts: three.js and GLTFLoader are
entirely absent from the 91 KB site chunk.

The old file said the sheet went up before the model was requested, which was
true of the ORDER and false of the download: 900 KB had to arrive and parse
before any of it ran. It is 92 KB now (41 gzipped) and the engine's 791 KB
follows without blocking. If that chunk never lands the site is unchanged except
that there is no mew on it — a correct page, not a broken one.

```
index.html            the summary card's markup + the canvas layers, in z order:
                        #sheet z1    the paper and every hole, one shader pass
                        #doc   z10   the type
                        #eat   z20   the transition, above the words
                        #stage z30   Mew (three.js)

src/main.js           boot: THE SITE. world, press, routing, chrome. No three.
src/mew.js            boot: THE ANIMAL. Dynamic import, so the site never waits
                      on it. bootMew({ world, deck, scope }) -- one world, one
                      deck and one scope on the page, shared through the call
src/config/rigConfig.js   EVERY tuning constant and the bone role map

src/engine/
  world.js            shared state: viewport, pointer, scroll, colliders, bus
  loop.js             fixed 120 Hz sim + render interpolation
  physics/body2d.js   Mew as a 2D point mass in document pixels
  physics/colliders.js  DOM rects as soft fields + the viewport leash
  behavior/brain.js   hover / cruise / seek / startle / flourish / held / flung
  behavior/pathfinder.js  cost grid + A* + line-of-sight smoothing
  pose/poser.js       runs the pose layers in a fixed order, every render frame
  pose/rig.js         resolves config roles to bones, captures the rest pose
  pose/bodyPose.js    streamlined flight: the long axis aligns to travel
  pose/headLook.js    gaze, saccade-gated
  pose/limbPose.js    arms and feet, two authored sets + the flail
  pose/earSprings.js  ears as underdamped springs (follow-through)
  pose/tailChain.js   the tail as an inextensible strand, follow-the-leader
  pose/faceMorphs.js  blink / squint / smile
  pose/quatSpring.js  damped rotational spring that tracks angular velocity
  fx/presentation.js  picks the presentation pass
  fx/cutout.js        Mew becomes a HOLE in the page
  fx/pixelate.js      the retro sprite pass
  fx/spriteShade.js   PBR -> flat sprite sections
  fx/starBurst.js     four-pointed stars: the shiny, and annoyance
  fx/sweatDrops.js    汗マーク — panic sweat, thrown in waves
  fx/beam.js + beamGeometry.js   the hyper beam (geometry is headless-testable)
  fx/faceOverlay.js   the >.< face, drawn ON the eyes
  fx/alphaFlags.js    the alpha channel used as a side channel
  fx/presentMath.js   pure maths for the presentation passes

src/site/
  pressgl.js          THE WHOLE SHEET ON THE GPU — paper, print, holes, halo
  deck.js             the mask: geometry, the crossing state, the two draws
  sky.js              the plate (the CPU press; still the reference impl)
  skyclip.js          the baked density sheet loader
  router.js           the crossing, the return, commit()
  projects.js         the work + the colour system
  content.js          the words: the bio, the roles, the socials, the card media
  chrome.js           the furniture that does NOT turn — the stitch chart, the
                      phone bar, the back control. Lives OUTSIDE #doc.
  cards.js            the card hover: one tween that owns the one masked hole
  iconatlas.js        GENERATED by tools/bake_icons.mjs — cell order + uv
  pages.js            shared chrome + the "set, not printed" state
  pages/deck.js       the three deck cards that are not the summary
  pages/sheet.js      the two-plate trim every project sheet is cut to
  pages/*.js          the three project sheets — words only, the trim is shared
  media.js            capture slots, filled by dropping files in assets/media/
  term.js             a recorded terminal session

src/utils/math.js     expDamp, Spring, v2, seeded rng — the motion primitives
src/utils/lifecycle.js  the disposal registry; every subsystem returns dispose()
```

---

# 3 · The print

**One full-viewport fragment shader** paints paper + print + holes + halo in a
single pass (`pressgl.js`, WebGL2 with a WebGL1 fallback). A hole is not a masked
DOM layer — a mask over a dozen rectangles behaves differently in every browser.
It is simply what the shader returns where the fragment is inside one, so a hole
stays registered to the page while the page scrolls under it.

**Two-ink riso simulation:** rotated halftone screens at 45° and 15°, ruling
5.2 px, dot radius `sqrt(d)·(0.5642 + 0.1429·d³)`.

### The chrome, and why some of it is not a hole

**The back control on a project sheet is a DISC OF SKY, not a hole.** It was an
arrow-shaped hole, which was the better idea and the wrong one: a hole is cut in
`#sheet` at z1, under the type, so every figure and paragraph the sheet laid over
it went straight on top of the control. No z-index fixes that — the pixels are in
a layer that is beneath the words by construction, and raising `#sheet` would
hide the page.

So its pixels are taken by an **extra scissored pass of the same press** and
blitted into a small 2D canvas up in the chrome (`deck.js`, `skyBtns`). About
three thousand fragments against a million. Three rules that were each a bug:

- **The scissored pass must run FIRST and the full pass LAST.** They share the
  drawing buffer the sheet is displayed from, so a scissored pass left as the
  final state puts a wrongly-coloured patch on the page.
- **`gl.scissor` counts from the BOTTOM, `drawImage` counts from the TOP.**
  Using the flipped value for both reads a band the compositor has already
  cleared: measured, a fully transparent 56×56.
- **It prints at a FIXED hour** (`SKY_BTN_DEPTH`, 2,640 px down `REF_H`), not at
  its own document position. A control pinned to the top of a sheet sits where
  the plate is brightest — measured at scroll 0: mean 228,224,224 against bone
  paper at 239,237,230, and a white arrow on it is invisible. The die-cut rule
  does not bind because this is not a cut.

### A hole that is a SHAPE

Every die-cut is an axis-aligned rectangle in `uHoles[12]`, because that is what
a die-cut is. Exactly one hole may instead be a **glyph**: a project's own icon,
cut through the card that advertises it, so what shows through is that project's
sky in the shape of the thing it is. On a project sheet the same mechanism is the
back arrow.

`uMask` (a greyscale atlas, unit 1) + `uMaskBox` (doc px) + `uMaskUV` (the cell)
+ `uMaskAmt` (the hover crossfade). Three things it is worth knowing:

- **It is NOT in `uHoles`.** That buys three things at once: it can never eat one
  of the twelve die-cut slots, it can never shift the flattened index `uAltHole`
  holds, and the hole loop can keep breaking on its first hit — a masked fragment
  inside the rectangle at zero alpha must not end the search, and a loop that
  both breaks early and evaluates a mask cannot do both. Indexing `uHoles` by a
  uniform int is also illegal in GLSL ES 1.00 (only constant-index-expressions
  may subscript a uniform array), so the WebGL1 path would not have compiled.
- **The rectangle test is arithmetic, not a branch.** An `if` around a texture
  fetch puts it in non-uniform control flow, where derivatives are undefined in
  ES 1.00. `step()` gives the same answer with the fetch unconditional.
- **Unit 1 must restore unit 0.** This file never called `activeTexture` and
  relied on the default; every path that touches the atlas now puts it back.

The atlas is baked by `tools/bake_icons.mjs` from source art in `tools/icons/`,
and it emits `src/site/iconatlas.js` — generated, so the cell order the shader
indexes and the image itself are one artefact written by one command.

**The weather** is a 20-frame greyscale sprite sheet (320×3600) baked from a cloud
clip by `tools/bake_sky.mjs`. `foldV` mirrors and repeats it every viewport down
the page, so the field is periodic and there is no bottom to run out of.
Reconstruction curves the bilinear weights before the fetch (smoothstep), which is
what removed the diamond artefacts at high magnification.

### The two offsets, which have opposite needs

| | held? | why |
|---|---|---|
| `uSky` — the WEATHER | **held for good** | the field is periodic, so winding it on forever costs nothing. Any attempt to return it is a pan of the entire sky — the "rubber-band" |
| `uSkyRamp` — the TIME of night | eased back over the retreat | absolute, so holding it accumulates into permanent night; unwinding is a change of BRIGHTNESS with no motion in it |

The night runs against a fixed `REF_H = 4000`, not the height of whatever document
happens to be loaded — otherwise the same document position is a different time of
night on a different page.

---

# 4 · The transitions

### There are TWO kinds of move now, and they mean different things

A **fade** is turning a page: you are in the same place, reading the next thing.
A **crossing** is going somewhere: the paper opens and you go through it.
`transitionFor(from, to)` in `site/router.js` is the whole matrix.

| move | what runs |
|---|---|
| `/` ↔ `/experience` | **crossing** — once, because this is where the reader is taught what the window in the middle of the summary is FOR |
| `/experience` ↔ `/projects` ↔ `/contact` | **fade** — by then they know, and a 1.6 s event between two lists of text is a toll booth |
| `/projects` ↔ `/projects/<slug>` | **crossing**, opening out of the ICON that was clicked |
| project ↔ project | **fade** — siblings, not a journey |

**The fade** is Roy Luo's numbers because they are good numbers: 300 ms out,
swap, 500 ms in, 30 px on X only, `cubic-bezier(0.16, 1, 0.3, 1)`. It is driven
on rAF, not `setTimeout` — it has to tween the sky ramp per frame, and the router
harness stubs `setTimeout` out entirely so a timer-driven fade would never run
under test. It emits **no** `crossing` on the bus: she should not flee a page
turn.

**And the die-cuts travel with it.** A hole is a document rectangle held in a
uniform, so it does not know the page is moving: left alone it sat perfectly
still and perfectly opaque while the type slid thirty pixels out from under it
and dissolved. `deck.setDocShift(dx, opacity)` is handed exactly the two numbers
`#doc` is carrying. `holeDX` is added when the rectangles are written (no uniform
of its own — they are rewritten every draw anyway) and `uHoleFade` multiplies
`open` for the die-cuts and the mask, **before** the crossing is folded in: an
opening has to be able to cover a window that is halfway through fading.

**A watchdog only speaks for its own move.** Every navigation arms one for
`CROSS_MS * 3` — 4.8 s against a 1.6 s crossing — and it used to clear the eating
unconditionally when it fired, so a finished navigation reached forward and wiped
whatever crossing was running at that instant: one frame with nothing covering
the window, the page visible through the middle of a transition, covered again on
the next frame. Reproduced deterministically on one clock shared by rAF and
`setTimeout` (a return armed at t=3167 wiped a crossing at t=7167). Cleared on
normal completion **and** guarded by a generation counter, which are belt and
braces on purpose.

**Going in** — the die-cut you clicked OPENS. One continuous drive, 0 → 1,
straight through the swap. `CROSS_MS = 1600`, down from 4000: four seconds was
right when the crossing WAS the site and wrong now that it is punctuation between
four cards someone is skimming.

**Coming home** — the same boundary with the paper on the other side of it
(`uEatOut`). `RETURN_MS = 1000`.

The phase change is driven by **coverage, not by a clock**. A timed midpoint is
only correct if the reader holds still.

Three things that were each a real bug:

- **The eat-out radius must shrink past zero.** The ragged edge bites INWARD, so
  at r≈0 it punches a hole. And the shader must not test the radius in that
  branch: `r > 0` means "there is an opening" when the paper is outside and the
  exact opposite when the paper is the island. Measured before: 0.5% of the window
  showing at r=0.01, **100% at r=0**. Now: worst coverage backstep 0.000% over 600
  samples.
- **The eating carries its own ink pair** (`uEatA`/`uEatB`/`uEatIdn`), separate
  from the gate's. It eats in the colours of the sheet it is opening ONTO.
- **Identity travels with the pair.** `uIdentity` adds second ink to the lit cloud
  tops; the home sheet runs it at 0 and every project sheet at 1. Hard-coding it
  laid rose the home sheet does not lay: **42,448 differing pixels, max delta 139.**
  Now 0 differing pixels, both directions. The ALTERNATE pair had the same bug
  one layer down — `idn` was hard-coded to 1.0 for the gate — which is wrong for
  the back arrow, deliberately pulled in the home sheet's pair at identity 0.
  `uAltIdn` now carries it, exactly as `uEatIdn` does.
- **The night settles on the page's own hour, not on zero.** Both retreats used
  to unwind `uSkyRamp` to 0. Zero was never a time; it was the top of the only
  long sheet there used to be. They ease onto `rampOf(route)` instead — still
  absolute, so still nothing accumulates.
- **`commit()`'s continuity term is NOT the place to set the hour.** Before the
  swap the eye is at `leftAt + k` with ramp R, so the numerator is
  `leftAt + k + R`; after `scrollTo(0)` it is at `k`, so it can only stay put if
  the new ramp is `R + leftAt`. That line is right and has always been right.
  What changed is where the retreat SETTLES. `commit()` also takes
  `{ carry: false }` on the fade path, because winding `uSky` is a pan of the
  whole sky and a pan across a fade — which does not cover the sheet — is the
  rubber-band glide.

---

# 5 · Mew

### Layers, in order

The poser runs pose layers in a fixed order every render frame, and **bones are
reset to rest first**. Body → head → limbs → ears → tail → face.

The sim is 120 Hz fixed-step with render interpolation; the sim never sees a
variable dt.

### Navigation — the current design

This went through five rounds. The end state is three ideas that only work
together:

**1. The grid prices what a cell CONTAINS and how much ROOM it has.**
Crossing type costs 12×, its halo 3×. On top of that a **squeeze surcharge** from
a chamfer distance transform: full price at about her half-width, nothing at
`radius + avoidRangePx`. A gap she cannot fit through is priced exactly as dear as
the type itself — so where a roomier gap exists nearby A* takes it, and where none
does every route costs the same per cell, the shortest wins, and the shortest is
straight through. No threshold, no "half a screen" test; the search does that
comparison itself, at every scale.

**The squeeze is a cost of TRAVELLING, not of BEING.** Two grids: `travel` carries
it (A* and line-of-sight), `cost` does not (destinations and the interest
sampler). A 190 px corridor is miserable to thread at speed and a fine place to
hover. Charging the sampler for it emptied the page — 0 of 200 samples.

**2. Nothing may hold her, and nothing may stop her.** These are the same fact
read two ways, and a static force cannot give both:

- `physics.insideAccel` (5600) **out-pushes the hardest steer** (2600 × 1.7 =
  4420), so she can never be pinned inside type. The escape is normalised, so
  what she actually gets IS that figure even when a neighbouring block is pushing
  back — measured un-normalised at 3,413 under a title, against a 4,420 steer.
  And the escape will not choose a wall whose far side is off the page.
- `behavior.push` (**delay 3 s, ramp 3.5 s, ×3.2**) grows the steer with the age
  of the destination, so she leans on an obstacle until she is through. It is
  **free when nothing resists** — `steerArrive` asks for a SPEED, so the force is
  proportional to the error, and an unobstructed trip is identical at ×1, ×3.2 and
  ×6 (2.15 s, peak 502 px/s). It is **not gated on the lean**, because a body that
  is not moving never leans in and would sit at a third of thrust.

There is no stuck DETECTOR. There used to be, and it was worse: it fires on a slow
arrival, misses a slow grind, and its response is a mode with a seam at each end.

**3. The waypoint cursor advances by ARRIVAL as well as by sight.** Line of sight
means "through cheap cells", which is the point of it — but that made sight the
only way forward, and inside expensive terrain there is never any. A route across
a block gets no smoothing at all (measured: 32 nodes, one per cell) and every one
failed the test, so the cursor froze on node 1 and she stood on the last cheap
node before the type. **That was the terminal block on the USB sheet.**

### The edges

| | Y (the DOCUMENT) | X (the SCREEN) |
|---|---|---|
| free travel | 240 px | **0** |
| spring | 1250, ramped over `hard − slack` | **12000**, at full within 40 px |
| stop | 520 | 420 — a backstop, not the boundary |
| measured at | her centre | **her skin** (one radius in) |

She stays on the sheet. There was a version with a 560 px side leash so she could
round a flush element from outside the page; it worked and it read as her
wandering off constantly. Getting past an element is the push ramp's job.

Held by the centre, half a 150 px animal hangs off the page: worst overhang went
**139 px → 29 px**, and time with any part over the line **13.7 s → 3.7 s** of
five minutes.

`world.offLeash` is the exemption, for the two moments where being off the page is
the POINT: a startled exit, and the beat she waits before entering a new sheet.

### The startle, and what kind of startle it was

`startle` carries a **source**, because the answer changes what she does about
it. A cursor barging into her is rude, and the honest answer to rude is a
tantrum: gold annoyance stars and the `>.<` face, which is what a hard collision
already gets. A press eating the page out from under her is not something to be
cross AT — that is fright, and fright sweats. Same body language either way; the
difference is entirely in the face.

The stars are fired **directly**, not by emitting `flail`: `colliders.js`
suppresses `flail` while `world.panicking`, precisely so a panicking mew clipping
the furniture does not throw a tantrum mid-flight, and borrowing the event would
walk straight around that guard.

The `>.<` now listens to `startle` as well as `flail`, taking the intensity as it
stands rather than dividing an impact speed it was never given — so the moment
she is most frightened is no longer the one moment her face does not show it.

Three beats. She whips **square on to the viewport** (a direction, not a place —
the look plane is six world units out, so a nearby window subtends about 2°), holds
0.5 s, then whips to the escape line and goes, directly away from the press. Arms
flail — a frightful rapid flail, distinct from the annoyed bump flail — and the
panic is its own event so no gold annoyance stars fire while she is running.

**Panic sweat** (`fx/sweatDrops.js` + `fx/sweatGeometry.js`). Rewritten. Three
faults, one cause: they spun in random directions, they all went at once, and
they were **five texels long**.

- The spin was an attribute. The quad carried a rotation recomputed from the
  instantaneous velocity every frame plus a randomly-signed curl handedness, and
  as long as the shape is defined in the drop's own frame and then turned, which
  way it hooks on screen is a variable. There is **no rotation in the file** now.
- The size was the quiet one. `fx/pixelate.js` renders at 1/4 resolution, so the
  old 20 px drop was five texels, with two specular dots of ONE texel each inside
  it. The profile, the keyline and both speculars were solved exactly and thrown
  away by the pass that draws them. Everything is sized in **texels** now.
- **The shape is a sweep and the hook is free.** A disc at the head swept along
  the bezier of the path the drop has JUST FLOWN, radius falling to nothing at
  the tip. No hook term: the curve IS the hook, and it is curved because the
  flight was. Under a closed-form ballistic,
  `p(s − τ) = p(s) − v(s)τ + ½aτ²` is exactly quadratic in τ, so the trailing
  path is not approximated by a quadratic bezier — **it is one**. Verified to
  2.8e-14 px.
- A union of DISCS was the obvious first sweep and is wrong twice: it scallops,
  and near the tip, where the radius falls below the sample spacing, it comes
  apart into a dotted line. Tapered segments (iq's round cone) cannot.
- **Antialiasing is forbidden here.** Alpha is a CLASSIFIER, not a coverage
  (`fx/alphaFlags.js`): pixelate discards under 0.5 and switches the outline
  colour at 0.65, so `INK_ALPHA × coverage` lands on `FX_ALPHA` somewhere in
  every fringe and the drops would be rimmed in the hyper beam's hot outline.
  `fwidth` is not a tuning question here, it is a protocol violation.
- **Three waves of three, and wave n+1 leaves when wave n is GONE.** The old
  build ran four waves 0.12 s apart against a life three times longer, so all
  twelve were in the air together. Both temples fire every wave, majority
  alternating, and the three of a wave are separated in SPACE — separating them
  in angle separates their arcs, and then they are not carrying the same arch.
- The escape is a **carry**, not a lean. Leaning rotates the launch, which
  changes `vy`, which changes the apex, which changes the life — and the
  closed-form schedule is gone. Total 1.168 s, inside `face.overlay.durS` and
  `limbs.panicDurS`; `lifeMaxS` is a guard that must not bind, and there is a
  check.
- The maths lives in `fx/sweatGeometry.js`, pure and headless, following
  `beamGeometry.js`. Its `sdDrop` is a twin of the GLSL, and the two were checked
  against each other on the GPU: **522 pixels, zero disagreement.**

### The entry

On `recollect` — the one frame where the window is fully covered, so the teleport
is free — she is placed just outside the nearer side, level with the viewport, and
**waits 2 s** before coming in. The sheet settles first; an entrance needs
somewhere to arrive into.

---

# 6 · Numbers already established — do not re-measure

- The print: ~300 ms at 1400×4400, ~190 ms at 390×4228, spread over ~50 frames at
  a 5 ms budget. Nine blits for the life of the page.
- Steady state: 0.016 ms/frame while Mew moves, 0.001 ms when still. Scrolling
  costs nothing — no listener, no parallax, no mask to move.
- A full-screen 2D canvas pass at ~1/5 res: ~0.9 ms median.
- 1,248 stroked segments solving a 7-source field: 0.1 ms. Canvas work was never
  the bottleneck.
- v1's lag came from per-frame CPU over a glyph field plus scroll listeners
  reading layout. **Never put layout reads in a scroll handler.**
- Physics: body radius 75 px (`characterHeightPx` 150 × `radiusFactor` 0.50),
  `maxSpeed` 1400, `avoidRangePx` 110. So she needs `75 + 110 = 185 px` of
  clearance to fly cleanly, i.e. a gap of ~370 px.

---

# 7 · Taste — accepted and rejected

### Accepted, keep

- **The type system:** IBM Plex Mono, weights 200 and 600 only. Big type thin,
  small type heavy. Two sizes, nothing in between. He named this himself.
- **Placement/coherence:** corners used, centre empty, tiny type, annotation
  register.
- **Purpose per element** — non-negotiable.
- The measured-not-chosen culture.
- **Mew**, untouched.

### Rejected, and the real reason

1. **ASCII text field** (v1) — unusably laggy, navigation hidden, headings 11×
   body size.
2. **Dithered procedural sky** (v2) — "incredibly incredibly busy", text
   unreadable. **But: "Out of your three implementations, I loved the dithered sky
   the most."**
3. **Iron-filing field lines** (v3) — "I do not like the field lines concept at
   all."
4. **The cloud-dissolve return transition** — five rebuilds, then abandoned by
   instruction. The clouds are not made to do that. The return is the crossing
   mirrored instead.

The reason is **not** "no generative grounds". Verbatim:

> Do not think that I purely do not like generative grounds. It is simply that the
> execution of all instances are very flawed and either lag or are visually
> unappealing/distracting.

> the field lines looked like no effort was made graphically and they are simply a
> mathematical function. No shaders, filters, aesthetics. They exist just because.
> There is no aesthetic purpose to them. Remember this philosophy for our
> development.

---

# 8 · Traps already paid for

## Shaders and colour

- **NEVER PUT A BACKTICK IN A GLSL COMMENT.** The shaders live in template
  literals, so one backtick — even inside `// like this` — terminates the string
  and the whole MODULE fails to parse. Vite reports nothing useful and the page
  renders no character at all. This has happened twice. `node -e "import('...')"`
  finds it in a second; the browser console will not. `grep -c '\x60'` for an odd
  count.
- **Colour space.** Three only applies the output sRGB encode when rendering to
  the DEFAULT framebuffer, and never injects it into a raw ShaderMaterial. Any
  pass that renders into a render target and blits it with a custom shader must
  call `linearToSrgb` itself, or every mid tone lands 25–30% too dark and
  hue-shifted. Do NOT "fix" it with `rt.texture.colorSpace = SRGBColorSpace`:
  three then allocates SRGB8_ALPHA8 and the GPU decodes back to linear on sample.
- **Posterising r/g/b independently drags hues around.** Band luminance and
  rescale the colour if hue matters.
- **A "pink pixel left on the shiny" is usually the same paint, thinned.** The
  cheek blush also draws the lid line at about half strength — 0.19 on the
  normalised warm metric against a 4.70 core. `shiny.warmLo` is 0.08; the eye
  whites (0.038) are on the other side of that gap. Sweep against the whole atlas
  AND its mip chain: 0.22 left 397 visibly pink texels.
- **A flat quad cannot cover art on a curved surface.** The `>.<` overlay floated
  0.11 units in front of an eye on a facet tilted 31°; the parallax at any oblique
  angle exceeded the pad. Fit a tangent plane and lay the quad on it.

## Three.js and the scene graph

- **A ZERO-HEIGHT VIEWPORT POISONS THE SCENE GRAPH PERMANENTLY.**
  `view.worldPerPx` divides by `viewport.h`; an Infinity in a scale matrix becomes
  NaN the first time it meets a zero, and nothing recomputes it until the next
  resize. The character, the mouth anchor and the beam origin all go NaN silently,
  with no console error. `updateViewport()` clamps to 1. **If Mew ever vanishes,
  check `holder.scale` first.**
- GLTFLoader **sanitises node names**: `ear.L` → `earL`. rigConfig uses sanitised
  names.
- **InstancedMesh: `frustumCulled = false`.** The bounding volume sits at the
  fx-group origin, almost always off camera — instances silently vanish otherwise.
- **Bones are reset to rest every frame** by the poser. Cross-frame smoothing keeps
  its own state (see tailChain `smoothed`); never smooth on `bone.quaternion`.
- **Root-relative quats:** always the rotation DELTA from rest
  (`charQuatOf(bone) * restCharQuat⁻¹`). Rest orientations are non-identity.
- Anything mounted to a bone should be a real `Object3D` child of it, placed once
  in bone-local space — not reconstructed per frame with quaternion algebra.
- **A DIRECTIONAL light's position is meaningless alone** — only
  `position − target.position` matters. Making one follow the character requires
  moving the TARGET too (`aimKey()` in main.js).
- The light rig is in `rigConfig.lighting`, NOT main.js. The hemisphere ground
  colour is the shadow-side hue: keep it in the character's family, or the pink
  dirties.
- The doc-anchored fx group has `scale.y = -worldPerPx` (a reflection). Materials
  there need `DoubleSide`.
- The site is light-themed: additive glows wash out on white. Use normal blending
  and fade TOWARD the page tone.

## The tail

- **SCROLL DRAGS THE TAIL.** main.js bakes `-scrollY` into the character's scene
  position, and the tail is the only system that integrates persisted positions in
  SCENE space — so scrolling translates its anchor while the verlet particles lag.
  Body physics live in doc space and are immune, which is the tell. Fixed inside
  `tailChain` by rigidly shifting all particles by the anchor's scroll delta. Do
  NOT try to fix it by moving the camera. `test/tail_scroll.js` is the gate.
- **Flopping on a fast turn was the first segment swinging free of the body.** The
  angle limit only coupled segment-to-segment, so nothing tied the base to the
  body's tail-root direction; at ~840°/s the base lagged to ~177°. The neighbour-
  bend probe stayed at 39° and missed it entirely. **When a tail issue is about
  where the WHOLE tail points, measure base-vs-body, not segment-vs-segment.**
- **"Folding into itself" was a projection artefact**, not physics. v1's rest curve
  had an x spread of 0.04 over its length — planar, so head-on it projects to a
  hairpin while in 3D the strands were ~1.8 segment-lengths apart. Before blaming
  the sim, check whether depth is just collapsing.

## Behaviour

- **The seek goal is LATCHED per seek** (cursor vs offscreen). Re-electing every
  step lets two goals fight and freezes her at the trigger shell.
- **Aim and arrival must be the same point.** `seekDone` measures against the seek
  goal, so a raw goal buried in a 700 px element is a distance she can never close:
  the seek never ends and she hangs at the boundary at sprint speed. Sanitise the
  goal itself, not just the steer target.
- **Every settle is "stop here and hover"** — and a fling that ended in a paragraph,
  a beam fired from inside one, or a cruise that timed out mid-page all anchor her
  in type. Anchors go through `nearestOpenPoint`.
- A loop-de-loop must be a FLOWN circle bigger than the body, or it reads as a
  sideways dodge.
- Headless scenarios must keep the scripted cursor inside the scripted viewport —
  real ones always are, and violating it manufactures fake behaviour bugs.

## The phone

- **`100lvh` is the height with the toolbars RETRACTED**, so on an iPhone with
  them showing every card was ~140 px taller than the screen and "one card, one
  screen" quietly stopped being true. Deck cards use `100svh` on narrow, which is
  just as STABLE — `dvh` tracks the toolbar, and a resize remeasures every
  aperture on the page.
- **A tap latches every `:hover` rule** until you tap something else: the card
  stayed lifted, the video stayed playing, the contact row stayed indented. Every
  hover rule is behind `@media (hover:hover)`; the `:focus-visible` half is left
  unguarded, because a keyboard is a keyboard on any device.
- **A fixed bar over a scrolling page hides the last line of every card**, and
  "scroll further" is not an answer when that line is a link. `.plate` and
  `.deckpage` reserve `--bar` at narrow widths.
- **The swipe never calls `preventDefault`.** Taking the gesture would take
  vertical scrolling with it. It only watches, and reads a drag that turned out
  to be mostly sideways (1.5× more horizontal than vertical, over 56 px, under
  700 ms, `pointerType === "touch"`) as an intent afterwards.
- **She is sized for the screen she is on.** 150 px is 12% of a desktop window
  and 38% of a phone, and with her colliders gone she simply sat on the words.
  `characterPx()` in main.js is the single source; **anything pinned to her must
  convert with `view.fxPerPx`, not `worldPerPx`**, or a spray tuned against a
  150 px animal keeps its proportions at 96.

## The deck, the icons and the masked hole

- **A CSS percentage is two different lengths.** `--icon: clamp(64px, 26%, 116px)`
  with `width:var(--icon); height:var(--icon)` resolves the width against the
  box's WIDTH and the height against its HEIGHT — so a 4:3 card rendered a
  **92x69** icon out of a square drawing, and the mask punched the same
  rectangle. Drive the height from `aspect-ratio`, and use `mask-size:
  var(--icon) auto` so the plate's own 1:1 supplies the second number.
- **`measure()` rebuilds every icon record, so never hold one across it.** The
  masked hole was keyed on record identity and was therefore dropped silently on
  every resize, font load and remeasure — the back arrow vanished the moment the
  window was touched. Re-find by ELEMENT; that still drops it correctly when the
  element itself has gone.
- **A hidden element has no rectangle, so it is never measured.** `commit()`
  calls `deck.bind()` before `onPage`, so the chrome was unhiding the back
  control AFTER the deck had taken its measurements. Reveal, remeasure, then cut.
- **An entrance animation is geometry, and `measure()` runs inside `commit()`.**
  `ul.cards` matched `.deck-in > *` and each `li` matched `.cards > li`, so the
  two `translate3d(-30px)` COMPOSED — and the deck measured every icon while they
  were still at the `from` keyframe. Measured live: holes at x=223 against icons
  at x=283, sixty pixels out for the life of the page, and nothing on a deck card
  ever remeasures. Containers no longer animate, and **anything carrying an
  aperture fades but does not move**.
- **`:not()` takes its argument's specificity.** `.ap:not(.icon)` is (0,2,0), so
  a bare `.deck-hole` at (0,1,0) lost to the narrow rule that turns every
  aperture into a full-width block, and the round lens became a porthole. Same
  trap as `.t.body` (two classes) beating every single-class `max-width`
  override, and `.d.sm` beating the ≤560 `.d` rule.
- **`aspect-ratio` does not resolve on a column flex item with `height:auto`** —
  measured, a 2 px dot. Where a token holds only px and vw, naming BOTH axes is
  exact, because a viewport unit is the same length on both; that is the opposite
  of the percentage rule above, and for the opposite reason.
- **`.t.body` has two classes.** Any single-class override of its `max-width:30ch`
  loses on specificity, and every paragraph on the deck came out as a 30ch
  ribbon. Match the specificity (`.t.body.row-what`); do not widen `.t.body`,
  which is set for the annotation column on a project sheet.
- **A hole shows the print at ITS OWN document position, so a fixed control at
  the top of a sheet is nearly invisible** — measured, at scroll 0: 2.5% ink
  coverage, which reads as dust rather than as an arrow. That is correct
  behaviour, not a bug, so the fix is the one this sheet has always used for a
  pale cut: **registration ticks**. Do not bias the hole's sample position; a
  hole showing the print from somewhere else is a spotlight, not a cut.
- **Anything in `src/assets/media/` is bundled whether or not it is imported**,
  because `media.js` globs it eagerly. Icon SOURCE art there cost 590 KB of
  unused JPEG per build; it lives in `tools/icons/` now.
- **Two of the icon files were JPEGs named `.png`.** `media.js` ranks capture
  slots by EXTENSION, so it would have believed the name.
- **Polarity by MAJORITY tone, not by the border.** The obvious detector — sample
  the frame edge, that is the background — gets `usb-provisioning` exactly
  backwards: its corners sit outside the squircle and are white, so a border test
  inverts and destroys the drawing. What is true of all three is that most of the
  frame is dark and the mark is light.

## The page swap

- **`window.scrollY` must be read BEFORE `#doc` is replaced.** A shorter page
  clamps the scroll on the spot, so a value read afterwards is where the reader
  ENDED UP, not where they were. Only bites coming home, because project sheets
  are taller: measured **4,300 px of sky stepping in one frame.**
- **`world.scroll.y` and `world.docSize` are stale at `recollect`.** The swap, the
  scroll to the top and the emit are one synchronous block and `scroll` is async.
  world.js re-measures on that event, subscribed first. Measured before: her entry
  y landed 794 px and 4,201 px below the window.
- **A teleport must copy `prevPos`**, or the render interpolation draws one frame
  of a streak.

## Model pipeline

- Extracting a socket ring and THEN opening another rots the first ring's indices
  (vertex removal renumbers). Rings live in `mesh.rings` and are remapped by
  `remove_vertices` for exactly this reason.
- Removing a k×k block of quads orphans its (k−1)² interior vertices. Clean them
  at removal time.
- Building tube ring frames from a fixed world axis (`cross(dir, +z)`) collapses
  wherever the curve turns parallel to it — the tail does, twice, and became a flat
  ribbon. Use rotation-minimising `transport_frames`.
- **UV ORIGIN:** glTF puts (0,0) at the image's TOP-LEFT with v increasing
  DOWNWARD, and GLTFLoader sets `flipY = false`. Painting with the OpenGL v-up
  convention puts the face on the wrong half — and `preview_model` sampled with the
  same flipped convention, so the two mistakes cancelled and the preview looked
  perfect. Dormant while the model ships meshy's own texture; it returns the moment
  anyone repaints the atlas.
- `preview_model.project()` flips Y, which flips the sign of the 2D cross product.
  Culling `area > 0` renders the FAR side — plausible on a symmetric character, and
  the tell was the painted eyes appearing in the back view. Keep `area < 0`.
- Three's GLTFLoader cannot decode an embedded PNG in node. `test/glbHeadless.js`
  strips images/textures from the JSON chunk first.
- Sampling a catmull curve by PARAMETER bunches rings where control points sit
  close together. Resample by ARC LENGTH.
- A morph built from a SPHERICAL falloff fades out exactly where the vertex has
  furthest to travel — the blink came out a 4% twitch. Lids need a lateral falloff
  times a near-flat vertical band.

## Harness

- **The Browser pane reports `innerWidth: 0` and `document.hidden: true`.** rAF
  never runs; live screenshots of transitions are impossible. Measure with scratch
  canvases and `readPixels`, or `window.__DECK__.debug.paint(t, scrollY)`.
- Headless Chrome via `--screenshot --virtual-time-budget` **hangs** on this page
  (Mew's rAF never idles). Do not bother.
- The pane also does not repaint reliably once scrolled: the DOM and
  `getBoundingClientRect` stay correct while screenshots come back blank.
- **Do not use a file-wide failure counter as a loop guard.** The shiny-entrance
  check did, so any four failures anywhere earlier broke it on frame zero and
  reported three more that had nothing to do with it. A cascade like that makes a
  real regression look like it broke something it never touched.
- **A check that compares a stale value against itself passes either way.** The
  first page-swap test asserted her y against `world.scroll.y` — the very thing
  that was stale. Always pair a fix's test against a control with the fix removed.

---

# 9 · Verification

```bash
npm test                      # sim (826) + router harness
node test/tail_scroll.js      # PASS/FAIL gate for the scroll-drag bug
node test/tail_probe.js --calm --fly --wire   # tail integrity, three scenarios
node test/tail_turn.js        # base-vs-body angle through hard turns
node test/dump_motion.js && python3 tools/render_motion.py motion_dump.json out.png
node test/pose_frames.js && python3 tools/render_poses.py
python3 tools/check_mew.py    # the model gate
```

`?shiny=1` / `?shiny=0` forces the shiny roll. The roll is `Math.random()`,
deliberately NOT the world's seeded rng — that is seeded so the wander is
reproducible headlessly, and a reproducible shiny would mean every load is the
same one.

`tail_probe --calm` PINS THE BODY, and that is the only mode where `jitter` means
anything: with the body flying, follow-through and rattle are the same number.

**`npm run build` needs rollup's native binary for the host platform.** If
node_modules was installed on a different OS it fails with MODULE_NOT_FOUND on
`rollup/dist/native.js`; reinstall deps on the machine doing the build.

---

# 10 · Assets

| file | role |
|---|---|
| `src/assets/mew.glb` | **the shipped model.** Built by `tools/rig_mew.py` |
| `mewNew.glb` | the Meshy source it is built FROM. Keep — it is the only way to rebuild |
| `src/assets/mew_face.png` | the painted face, for restyling |
| `src/assets/mewOverlay.png`, `mewAnimation.gif` | the sprite-overlay presentation modes |
| `src/assets/media/sky-field.webp` | the baked cloud density sheet (120 KB) |
| `src/assets/media/icon-atlas.png` | **generated.** 128x512, four glyph cells, white = hole. `uMask` |
| `src/assets/media/glyph-*.png` | **generated.** White, alpha = the same key. Two jobs: the icon you see at rest, and the CSS mask that punches the card. One alpha channel, so CSS and the shader cannot drift |
| `tools/icons/icon-*.{png,jpg}` | the SOURCE art the atlas is baked from. Outside `src/` on purpose — see the traps |
| `src/assets/media/card-*.{webp,mp4}` | **placeholders**, from `aesthetic-images/`, transcoded to card size (~1.7 MB for all six). Drop a real `card-<slug>` in and it is picked up next build |
| `assets-source/*.mp4` | **the only copy of the cloud clip.** 60 MB, gitignored. Deleting it means the sky can never be re-baked |
| `src/assets/fonts/` | IBM Plex Mono 200/600 + Overpass Mono var, and their OFL licences |
| `src/assets/media/` | capture slots — drop a file named for the id and it appears next build. `README.txt` lists what is still wanted |

Capture slots still empty: `usb-hub`, `usb-engraver`, `closet-app`,
`closet-board`, `iclicker-poll`, `iclicker-response`, `iclicker-map`.

---

# 11 · Open

- **The socials are placeholders.** `SOCIALS` in `site/content.js` — the email is
  real, off the resume; GitHub and LinkedIn render as visibly unset (dashed rule,
  italic) until real handles go in. A portfolio that links a wrong GitHub is
  worse than one that links none.
- **The card media is placeholder** too, from `aesthetic-images/`. Names are the
  whole interface: `card-<slug>.webp` and `card-<slug>.mp4`.
- **The project sheets are two plates of placeholder prose.** The trim is shared
  (`pages/sheet.js`) and each project file is only the words, so they are cheap
  to replace — which is the point, because the owner is rewriting all three in
  his own format. `usb-provisioning` keeps its terminal and both disclosures.
- **The project-sheet PALETTE is unused but kept.** The annotated column, the
  claim grid, the data table, the margin note and the quoted document are all
  still in `site.css`, labelled, because the rewrite should reach for them
  rather than invent a second vocabulary. If it does not want them, delete the
  block.
- **The spacing/positioning design sweep.** Contrast, weights and typeface were
  done; spacing and positioning were never finished. This is the oldest
  outstanding item.
- Longer term: `auto_iClicker/` is worth reading when that page comes up, and the
  Closet thesis is in `Closet/ENGINE_V3_STYLIST.md` and `Closet/STRATEGY.md` —
  both outside this repo.
