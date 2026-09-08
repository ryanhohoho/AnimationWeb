# STATE — what this is, how it works, and what has already been paid for

Read `RYAN.txt` first, then this. `CLAUDE.md` is how to work here; `DESIGN.md`
is the argument for the look. This file is the system.

Last consolidated after the phone pass, the counter, the sweat rewrite, the
sweat's time scale and the home disc.
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
  pressgl.js          THE WHOLE SHEET ON THE GPU — paper, print, and every
                      hole, in one pass. Compiled twice, once per GLSL dialect
  deck.js             the mask: geometry, the crossing state, the two draws
  sky.js              the plate (the CPU press; still the reference impl)
  skyclip.js          the baked density sheet loader
  router.js           the crossing, the return, commit()
  projects.js         the work + the colour system
  content.js          the words: the bio, the roles, the socials, the card media
  chrome.js           the furniture that does NOT turn — the stitch chart, the
                      phone bar, and the two exit discs. Lives OUTSIDE #doc.
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
src/utils/motion.js   does this reader want less motion? One expression, five
                      files, and one of them declines to boot the animal

src/main.js           boot: world, press, routing, chrome. No three.js in it
src/mew.js            the engine, behind a dynamic import — 809 KB the sheet
                      does not need in order to be a finished page
```

---

# 3 · The print

**One full-viewport fragment shader** paints paper + print + every hole in a
single pass (`pressgl.js`, WebGL2 with a WebGL1 fallback). A hole is not a masked
DOM layer — a mask over a dozen rectangles behaves differently in every browser.
It is simply what the shader returns where the fragment is inside one, so a hole
stays registered to the page while the page scrolls under it.

**Two-ink riso simulation:** rotated halftone screens at 45° and 15°, ruling
5.2 px, dot radius `sqrt(d)·(0.5642 + 0.1429·d³)`.

### The chrome, and why some of it is not a hole

**The two exit controls are DISCS OF SKY, not holes.** The back arrow was an
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
- **BOTH discs print at that same hour**, and they are told apart by the mark on
  them. Giving home a paler sky (a window onto the summary, which is printed at
  19:00) was built and measured out: at depth 1,800 the disc is 2.73:1 against
  its own white mark where 2,640 is 4.26:1, and the pale hour is the shallow end
  of exactly the range `SKY_BTN_DEPTH` exists to avoid.

### Three written rules that nothing was checking

A rule a person has to remember is a rule that lasts as long as that person's
attention. Each of these was already written down somewhere in the repo, and
each is now a check with a paired control.

**No real identifiers on the USB sheet** (CLAUDE.md states it as a hard
constraint). The check walks every committed text file for shapes that cannot
occur by accident — a BitLocker recovery key, a GUID or volume identifier, a
a Windows volume path, PowerShell credential handling, an assigned secret — and then
renders the page and asserts that every `#`-prefixed identifier on it is one of
the four sequential stand-ins, that no seven-figure number is anything else, and
that **both** disclosures are still on it. It excludes its own file, because the
patterns it hunts for are written in it. Verified against three planted
violations.

**The icon atlas is generated, so it can go stale.** `iconatlas.js` says
GENERATED — DO NOT EDIT, and the failure when it drifts is quiet in the worst
way: the card renders, the hover runs, and the hole is simply never cut. The
check compares the tool's `CELLS`, the baked row list and `projects.js`'s slugs
— **in order**, because `deck.js` turns a slug into a row INDEX and two cells
swapped would cut each card the other one's shape. The failure message carries
the command to fix it.

**No word is printed under the floor.** `site.css` says it in a comment above
the palette: the greys that carry WORDS are near-ink and only the greys that
carry LINES stay grey. It was true of `--n3` and **not true of `--n4`**, which
is 2.61:1 on bone — not a near miss on 4.5:1, a bit over half of it. It was the
colour of the section eyebrow, every experience row's date and location, a
card's kind line, the contact labels, the chart's counter and the key legend:
eight places, all words, all at 9–11px. They are `--n3` (9.8:1) now, and the
hierarchy did not need them faded — size, weight and case do it, which is the
sentence that comment already ended on.

Two keep `--n4` and the checker is TOLD about them rather than talked out of
them: `.sock.unset .sock-v` (a handle that is not set — the faded italic is the
signal) and `.term.done::after` (a cursor block, not a word). The check also
asserts both exemptions still name rules that exist.

One thing the checker had to learn: **a rule that sets its own ground is
measured against it.** Assuming bone everywhere failed `.dlg-bar`, which is
paper type on ink — 15.6:1, read as 1.00:1 until that line existed.

### On paper

This whole site is a picture of a printed sheet, so it had better survive being
printed. It did not. Every fault was a fixed layer: `#sheet` and `#stage` are
canvases (a canvas is not reliably printed at all), `#chrome` is fixed so it
stamps itself onto page one and sits on the words, and the grain printed as a
grey wash over every line of type. What is left when those go is the document —
type on paper — which is what the screen was always a picture of.

Then the first print of a project SHEET came out as six paragraphs stacked on
the same inch: the corners were unpinned but `.spec`, `.cols` and `.term-col`
place themselves by percentage too. Print unpins the same list the narrow media
query does, for the same reason — a phone is a column and so is a page.

Four decisions worth keeping:

- **The transcript swaps places with its own player.** On screen the played
  session is the thing and the full text is the alternative; on paper it is the
  other way round, because a recording cannot play on paper and the complete
  transcript is exactly what a printed case study should carry. `pre.sr` comes
  out of hiding and `.term` goes. One `SESSION` array, both directions.
- **Navigation is not content, and on paper it is not even true.** "press → to
  continue", "SCROLL ↓" and "← back to the work" all name a gesture the reader
  cannot make, and the top-right readout is a live number about a window that is
  not there. Every internal link carries `data-route`, so one `:has()` catches
  all of them.
- **A crossing takes 1.6 s and Cmd+P takes none.** `body.crossing` holds `#doc`
  at opacity 0, so printing inside that window printed a **blank page**. The
  paper does not know about the crossing, so on paper there is not one.
- **`loading="lazy"` and printing.** Every current browser forces lazy images to
  load before a print, and "every current browser" is not a guarantee — a
  `beforeprint` listener in `main.js` sets them eager. Four lines that run only
  when somebody prints.

The artwork stays: it is only the PUNCH that has to go, because the mask removes
the icon's shape from the picture so the sheet can show through, and the sheet is
not being printed. And a placeholder social prints no URL — on screen the dashed
underline says it is unset; on paper a bare `https://github.com/` reads as a real
link that goes nowhere.

Checked by promoting the block to `@media screen` and looking at all five kinds
of page. That is the only way to see it in this environment.

### The transcript, for somebody who cannot watch it

The played session on the USB sheet is **content, not decoration** — a tool
whose whole surface is the text it leaves behind cannot be shown any other way.
But at any instant the played version is a few lines mid-type, so a reader on a
screen reader got a meaningless fragment of it.

The animated body is `aria-hidden` now, and the complete 54-line transcript is
emitted beside it in a `pre.sr`. One source (`SESSION`), both forms, and the
substitution rule holds in both because it is applied before either is built —
checked: only the four sequential placeholders appear in the alternative.

Not a live region. This is a recording, and a recording that announces itself
line by line for ninety seconds is worse than no recording at all.

Two details that are easy to get wrong: `.sr` is written `white-space:nowrap`
so a live region cannot reflow the page while it announces, and that same rule
**collapses every newline** of a transcript into a space — `pre.sr` restores it,
because the shape of a terminal session is half of what it says. And `.term`
gets `overflow-x:auto` under 860 px, which makes it the one thing on the site
that scrolls sideways; a scrollable region a keyboard cannot reach is a region a
keyboard cannot read, so it carries `tabindex="0"` and a group label.

### The engine chunk is three.js, and that was measured

809 KB raw / 222 KB gzip, and none of it is waste worth chasing. Two things were
tried and are recorded so they are not tried again:

- **`three/src/Three.js` instead of the prebuilt module** (aliased so GLTFLoader
  resolves to the same copy), on the theory that Rollup shakes hundreds of small
  modules better than one 1.2 MB one. It came out **829 KB — 20 KB WORSE**.
- **GLTFLoader is not the problem.** Stubbed out, the chunk is 764 KB: the
  loader and every glTF extension it carries cost **45 KB raw / 13 KB gzip**.

So the 764 KB is three.js itself, essentially unshaken, and the only lever left
is not importing it — which is exactly what the reduced-motion path does, and
what a page with no WebGL gets for free. The site chunk is 95 KB / 42 KB gzip
and is interactive before the engine is asked for; this is a background
download, not a blocking one.

### The keyboard, and where the ring goes

Tab order in the chrome is now top-of-screen first: the sheet, then the two
discs in the top-left corner, then the chart and the bar at the foot. Everything
in `#chrome` is fixed furniture, so DOM order **is** tab order, and the discs
used to be last — a reader left the page, went to the bottom-left corner, and
then back up.

Two rings were wrong:

- **The disc dropped its outline** for the same 3 px nudge the hover has, plus
  the label. The label is `display:none` on a narrow screen, so on a small
  window with a keyboard the entire focus indicator was a three-pixel shift. It
  keeps the ring now; at 5 px of offset the ring is out on the paper and clear
  of the sky, so it costs the disc nothing.
- **The chart's ring crossed its neighbours.** A cell is 19 px and the cells
  abut by design (their borders overlap by a pixel so the rule between two of
  them is one line), so a ring at 5 px of offset is 10 px wider than its own
  cell and covers both sides of it. Tight to the cell instead — the chart is a
  grid, so a ring on the grid line IS the cell.

`.pcard` and `.sock-a` keep `outline:none` on purpose: each replaces the ring
with an affordance a reader can NAME — a card underlines its title, a contact
row slides and shows its arrow. A 3 px nudge is not one, which is what separates
those two from the disc.

### One more thing the preview pane does not do

`STATE.md` already says the pane reports `document.hidden: true` and never runs
the deck's rAF. It also **suspends CSS transitions and animations**, which is a
separate trap: `getComputedStyle` on a transitioning property returns the FROM
value, forever. A focus rule that was applying perfectly well read back as
`opacity: 0`, and a staggered entrance reads as `opacity: 0` long after it
should have landed. To check whether a rule actually matched, append
`transition:none !important` for that element, read, and remove it. Its WebGL
readback also lags several draws behind, so a pixel probe of anything on a clock
does not survive contact with it.

### The die-cut and its own ring, 30 px apart

Two faults, one visible symptom: the lens and the project icons sat left of the
hairline ring drawn around them, badly after a page turn and slightly on a cold
load.

**The 30 px.** A page turn slides `#doc` sideways with an inline transform and
hands the deck the same offset, so the holes travel with the type. Both halves
are right. What was wrong is where they MEET: `runFade` calls `commit()` — and
therefore `bind()` — at the swap, while that transform is still on the element
at its full −30 px. `getBoundingClientRect` includes a transform, so every hole
was measured 30 px left of where it lives, the shader added `docDX` on top, and
when the turn ended and `docDX` returned to zero **the baked −30 stayed** —
permanently, on every aperture and every project icon, for the life of the page.

Reproduced exactly, with no animation involved: set the transform, call
`remeasure()`, clear it. The lens read `x: 130` against an element at `160`.
`measure()` takes the transform off for the length of the measurement now — one
forced recalc, only when there is one to remove, which is only ever mid-turn.
Confirmed through a real fade: `hole.x 160.00` against `element 160.00`.

**The half-pixel.** Aperture boxes were rounded. The shader takes floats and
every hole is a hard in/out test, so a fractional edge lands on the nearest
pixel either way — rounding buys nothing there. It costs something on the ROUND
one: the lens is a circle *inscribed* in the box, so half a pixel of rounding
moves its centre and changes its radius, under a 1 px ring drawn from the
element's own real rectangle. Measured at 1280: an element at `131.52 / 43.52`
became a hole at `132 / 44`, and the painted disc's centroid sat **0.24, 0.72 px**
off the ring's. Unrounded it is **0.03, 0.12 px** — centroid quantisation.

The icons get the same treatment for the same reason: their hole is a mask
sampled across that rectangle and the white plate over it is drawn by CSS from
the true one. `skyBtns` stay rounded, and have to: that box is a scissor
rectangle and a `drawImage` source rect, both integer device operations.

### A teleport is only free while nobody can see it

The `recollect` handler in `brain.js` opens by saying the swap is "the one
moment in the whole transition when the window is completely covered". For a
CROSSING that is nearly true — except she is drawn at z30, above the spreading
print at z20, so she is the one thing on the page it does not cover. For a page
TURN it is not true at all: a fade dissolves the type and leaves the sheet in
full view, so the placement happened in the open and she vanished from where she
was standing and flew back in from the edge, **on every arrow key**.

So the test is no longer which kind of transition it was. It is whether she can
be seen:

- **On screen** — left exactly where she is, and carries on. Mid-flight through
  the hole on a crossing, mid-wander on a turn, which is the truthful picture of
  both.
- **Off screen** — the placement is free, so she gets the deliberate entrance it
  was written for.

**And the document jumps under her.** `commit()` puts the reader at the top of
the new sheet and winds the plate on by however far down the old one they were,
so the sky does not step. She is in document pixels too and nothing was doing
the same for her, so on a long sheet she was left thousands of pixels below a
page nobody had scrolled to. Same offset, same reason, one line — and `prevPos`
comes with it, or the render loop draws one frame of a streak.

**The paper waits for her, and only as long as it was open anyway.** The swap
used to land at `MIN_OUT` of the outward half — 440 ms on a 1,600 ms crossing —
and her fright is a 0.50 s braked double-take before she has moved at all, so
the sheet changed under an animal standing still in the middle of the window.
The swap now also needs `world.mewClear`, published by `brain.step()`, and may
hold for the rest of the outward half and not one frame more: at `t >= 1` the
paper is fully closed and waiting longer would be a pause rather than a
transition. 440 ms becomes 440–800.

`!== false`, not `=== true`: the property does not exist until the engine boots,
so a reduced-motion reader, a machine with no WebGL and a chunk that failed to
load all cross at exactly the speed they always did. The deck already handles
`cross.t > 1` — it stops easing and accelerates — so the extra frames were
anticipated by the one part of this that did not change.

### The tail: an episodic idle, and an otter in flight

Two asks: the idle "doesn't sway like an animal's" — it was one sine, always
running, which is why it read as a held curl — and in flight it should move the
way a sea otter's tail moves through water.

**Nothing here touches a particle.** That is the rule the file is built on: the
strand FOLLOWS a posed rest curve, and a driving wave is what made it read as a
rattlesnake the first time. A gesture poses the curve; the flight change is two
passive coefficients and a second, slower sine on the same rotation.

**The idle is episodic.** A scheduler picks one of four kinds — flick, sweep,
curl, twitch — every 2.6–6.5 s, with every parameter drawn from a range so the
same kind twice is never the same motion. Each modulates amplitude, rate, a
tip-weighting, and a **rigid** bias angle applied exactly the way the aim is:
one rotation of a smooth curve is still the same smooth curve, so it cannot
kink. Measured in the browser over 60 s of real idle: **17 bursts, peak tip
speed 28.6× the median.** Mostly quiet, then something happens.

**In flight**, `dragNormal` 6.9 → 9.5 (the water) and `poseTipHz` 0.55 → 0.35
(the freer, heavier end), both blended by `swimAlign`; plus a scull at a **third**
of the body's undulation rate. The header's warning is about locking to
`swimPhase` at the spine's own 1.1–2.8 Hz, which is the buzz; a third of that is
0.37–0.95 Hz, under the sway's own band.

#### Three things worth knowing before touching it again

1. **The tail had its own RNG stream added, and it needed one.** `world.random`
   is shared, so a draw from it changes what the BRAIN gets next. Caught by the
   probe: neutralising every new knob should have reproduced the baseline and
   did not, because the scheduler had shifted the stream and she flew a
   different path. `world.seed` is exposed now for exactly this.
2. **A gesture fires only in `hover`.** Speed and agitation alone let one start
   in the lull between two hard turns — measured, the fast-turn probe's worst
   joint angle went 54.1° → 68.9° from that alone. A cat plays with its tail
   when it is doing nothing, and the brain already has a word for doing nothing.
3. **A flick cannot be faster than the tail.** The tip's muscle runs at 0.55 Hz,
   a time constant of ~0.29 s, so the original 0.35 s flick was over before the
   strand answered a third of it. 0.55–0.78 s is the shortest gesture this tail
   can actually perform.

#### The gate

Baselines re-taken on **today's** body — the ones from the start of the session
were stale, because the crossing and limb work above changed the path she flies
and the probes drive the real brain.

| probe | metric | baseline | after | note |
|---|---|---|---|---|
| `tail_scroll` | verdict | PASS | **PASS** 6.05e-14 | tol 3.41e-3 |
| `tail_probe` | folds | 0 | **0** | |
| | maxBend | 74.0° | 74.0° | |
| | selfMin | 0.59 | **0.69** | improved |
| | jitter | 1.155 | 1.112 | |
| `--calm` | folds | 0 | **0** | |
| | **jitter** | 0.001 | **0.027** | the rattle number; gate ≤ 0.05 |
| | maxBend | 22.1° | 22.3° | |
| | selfMin | 1.95 | 1.95 | |
| | **swing** | 1.01 | **2.04** | the liveliness, doubled |
| `tail_turn` | folds | 0 | **0** | |
| | maxBend | 54.1° | **74.0°** | see below |
| | selfMin | 1.78 | 1.60 | |

**Neutralise every new knob and the probes reproduce the baseline exactly** —
turn 54.1/1.78, violent 0.59/1.155. That is the check that the addition is
cleanly gated rather than entangled.

The one number that got worse is `tail_turn`'s `maxBend`, 54.1° → 74.0°, and
74.0 is not a coincidence: it is `maxBendTipDeg`, the curvature backstop. So the
limiter now engages during an 842 °/s whip where it previously did not. It is
doing its job rather than being defeated — folds stay 0 and `selfMin` is 1.60 —
but the file's own comment wants that backstop "idle almost all of the time",
and during a hard turn it no longer is. Backing the flight coefficients most of
the way off buys 0.8° of it, which is not worth the feel. **Steady flight is
nowhere near it: held at full speed for six seconds, the worst joint bend is
23°.**

**Whether it looks like an otter is not a thing these numbers can say.**

### 320 px, where the sheet was 447 px wide

Checked every route at the narrowest phone still in use. One route failed, and
the cause was three layers down from where it showed.

**The symptom:** a project sheet at 320 px reported `scrollWidth: 447` — a
horizontal scrollbar on the whole page. The transcript looked guilty (it is the
one thing on the site with `overflow-x:auto`) and was not.

**The cause was `&nbsp;`.** The sheet's labels bind their spaces so a two-word
caption cannot orphan its second word — and they were binding EVERY space, which
is a different thing entirely: `PROJECT 01 — usb provisioning cli` became one
unbreakable 290 px word. The plate is a flex column on a phone, so the column
stretched to fit it, the transcript stretched to the column, and the page grew
by 127 px. Binding only the FINAL space is what the character is actually for,
and short labels still never break because there is nothing in them to break.
Desktop is unchanged: every label still sets on one line.

Two smaller ones found in the same pass:

- **The legend broke after its slash.** `03 / 04` on two lines made the bar
  taller than the page had reserved. `nowrap` fixes the break — and then
  revealed that the project-sheet legend (`03 / 04 — 01 of 03`) was 168 px of a
  320 px bar. It was also **saying what the chart already says**: the chart
  doubles the cell you are standing inside, which is the whole reason the
  doubled stitch exists. It reads `01 of 03` now, which is the half the chart
  cannot carry — one sentence about one place, which is what `chrome.js`'s own
  comment always claimed.
- **`--bar` under-reserved by one pixel**, having counted the control and its
  padding but not the 1px rule along the bar's top edge. The page reserved 60
  and the bar was 61.

After: all six routes report `scrollWidth: 320` with nothing overflowing.

### The page arrives even if the script does not

`index.html` ships the whole summary card as markup, and both its own comment and
`main.js`'s say the first paint needs no JavaScript. **They were wrong.** `<body
class="pre">` holds `#doc` at opacity 0 until `main.js` removes it, so with
scripting off every word of that card sat in the source and the page rendered as
blank bone paper.

Two layers, because losing the script has two different shapes:

| | what covers it |
|---|---|
| scripting **disabled** | a `<noscript><style>` in `index.html`, immediately |
| script **broken or never arrives** | a 4 s `doc-rescue` animation in `site.css` — that case still runs CSS |

Nothing normal reaches the animation: `pre` comes off in about a hundred
milliseconds, and once it does the rule stops matching entirely, so it can never
fight the real fade. A slow boot that does reach it lands on opacity 1 and stays
there, so there is no flash when the class finally goes.

**The noscript rule needs `!important`, and that is a fact about the bundler.**
It and the stylesheet rule have identical specificity, so the winner is document
order — and Vite injects its `<link rel="stylesheet">` at the foot of `<head>`,
below the noscript block. Measured in `dist/index.html`: noscript on line 59,
stylesheet on 104. Verified the `!important` version wins from the *earliest*
position in head, which is the worst case.

What that reader gets: the summary card, the chart and the two discs — all real
`<a href>`s, so they navigate — and no print, because the press is a canvas.
Every die-cut reads as an empty cut with its registration ticks, which is what a
die-cut with nothing behind it should look like.

### The production build, checked as a production build

Everything above was verified against `npm run dev`. The bundle is a different
artefact — hashed asset URLs, `public/` copied to the root, a `base` of `/`, and
one file (`404.html`) that only exists after a build — so `.claude/launch.json`
carries a second configuration, **`mew-dist`**, that serves `dist/` on 5274.

Deep-linked at `/projects/usb-provisioning`, cold: the right route, the right
title, the route's own description, both discs measured, the press up on WebGL 2,
the atlas uploaded, the navy-and-black plate printing in its aperture, and **zero
failed requests**. `/favicon.svg`, `/favicon-32.png`, `/favicon-192.png`,
`/og.png` and `/404.html` all serve 200 with the right content types.

One thing to know before reading a probe on a fresh tab there: the pane opens a
new tab at `innerWidth: 0`, so `paint()` bails at its first line and `gpu` reads
false with nothing wrong. Resize the tab first.

Also checked in the browser, since none of it is in the test harness: **rapid
navigation** (four route clicks in one task — `busy` swallows three and the URL
never runs ahead of the page), **back and forward** (path, title, plate, chart,
disc and description all track), and **resize** (the discs' boxes are stale for
the length of the 200 ms debounce and then match the DOM exactly).

### The two compilations agree, byte for byte

`pressgl.js` compiles ONE `BODY` template into both GLSL ES 300 es and GLSL ES
1.00, and picks whichever context it gets. That dual compilation has always been
the largest untested risk in the file — the two dialects differ in `in`/`out`
vs `attribute`/`varying`, in `texture` vs `texture2D`, in whether `fwidth` is
core, and in how a uniform array packs — and "it looked fine" was the whole of
the evidence.

**Checked, and they are identical.** Same page, same hand-driven frame
(`debug.paint(3000, 0)` at 1280×800 on `/projects`), 640×400 of the sheet read
back and hashed:

| context | FNV-1a of RGB | sum of R | opaque px |
|---|---|---|---|
| WebGL 2 (300 es) | 3649933341 | 61125921 | 256000 |
| WebGL 1 (1.00) | 3649933341 | 61125921 | 256000 |

Not "close" — the same 256,000 pixels. To repeat it: force `let gl = null` at
`pressgl.js:517` so the WebGL 1 path is taken, reload, and compare.

### And with no WebGL at all it is still a portfolio

Forced both contexts to fail. The site is complete and legible: bone paper, all
the type, the cards with their artwork, the chart, the navigation, and Mew
(three.js holds its own context — a machine with no WebGL anywhere loses her
too, which is the same branch reduced motion takes). Every die-cut reads as an
empty cut with its hairline ring, which is what a die-cut with nothing behind it
should look like.

The only things that have to stand in for a picture are the two discs, and their
CSS fallback is **cerulean, not `--ink`** — a near-black disc on bone is the one
element on the page that would not belong to it, and cerulean is the colour the
disc becomes anyway.

### A shared link has to land, and a 404 has to be honest

**The deep link problem.** This site has real routes, and a shared
`/projects/closet` is a URL a static host has no file for — so every shared link
and every refresh lands on the host's error page. Vite's dev server hides it
completely: `appType: "spa"` serves `index.html` for anything it cannot find,
which is exactly the rule production does not have.

`vite.config.js` copies the built `index.html` to `dist/404.html` after the
bundle (it cannot be a file in `public/` — it has to carry the built script and
style tags with their hashes). GitHub Pages, Netlify, Cloudflare Pages and
Render all serve `404.html` for an unknown path with the URL intact, so the
router reads the real path and renders the real page. `vercel.json` is there for
the one host with a real rewrite, and gets a real 200.

What it does not fix: GitHub Pages serves that body with a **404 status**. The
alternative is the redirect hack (`404.html` bounces to `/?p=…`), which trades a
wrong status for a visible flash and a second request on every shared link.

**And the 404 page itself was wrong in four ways**, found by looking at it:

- `Math.max(0, onDeck)` clamped every off-deck route onto the first cell, so the
  chart said the reader was standing on the summary and put `aria-current="page"`
  on it. Off the deck nothing is worked — bare canvas, which is the correct
  chart for "you are not in the piece" — and the legend reads `—— / 04`.
- The mobile arrows sent "next" to `/experience`, a real page picked for no
  reason. `step()` returns false off the deck, so both go inert.
- `.keys` still read **← → navigate** for two keys that do nothing there.
- The corner rules were keyed on `body.on-project`, so the 404 — the other page
  built out of `.corner` clusters, and the one a reader is most likely to arrive
  on cold — got none of them: the home disc sat on the words NOT PRINTED and
  "← back to the sheet" ran through the key legend. They are keyed on `.plate`
  now, because every `.plate` has the discs over its top-left corner.

### Less motion means less motion, and it means the animal

`utils/motion.js` is one expression that five files trust, read ONCE at import
(a preference almost nobody flips mid-visit, and reacting to it would mean
tearing down a WebGL context and a physics sim mid-session; a reload is the
correct answer and it is what every other site does).

| where | what stops |
|---|---|
| `router.js` | commits outright instead of opening the paper |
| `site.css` | every entrance lands at its END state |
| `deck.js` | the cloud loop holds on one frame — and with no tick, the deck only ever repaints for a real change |
| `cards.js` | the hover video never starts, and the hole's crossfade snaps |
| `main.js` | **the engine is never imported at all** |

The last one is the call worth arguing. Mew wanders, flees the pointer, flails
and sprays — an autonomously moving object crossing the reading, which is the
canonical thing that preference exists to spare someone. A STILL mew was the
alternative and is worse twice: a second behavioural mode threaded through the
whole brain, and a character standing frozen in the middle of a page is a
stranger picture than an honest absence. It is also the same branch as the
engine chunk failing to load, which `main.js` already treats as a correct page.
**Verified in the browser**: with the flag forced on, the network shows no
request for `src/mew.js` and the page is a complete portfolio without her. The
weather hold is verified by inspection only — the preview pane throttles its
timers and its WebGL readback lags by several draws, so a pixel probe of the
cloud clock does not survive contact with it.

Found on the way: `cards.js` computed its tween rate as
`(TWEEN_MS ? 1000/TWEEN_MS : 1) * dt`, so the zero case was a rate of **1 per
second** — 0.016 of the range on a 60 Hz frame. An "instant" crossfade took a
second. The zero has to sit outside the `dt` term to mean what it says.

### What a link to this site looks like

`public/` is copied verbatim to the dist root. Three baked things live in it and
all three are cut from **one 32×32 grid in `tools/mewMark.mjs`** — the drawing
itself, in text, editable with a keyboard and re-bakeable with no image library.

- **The tab mark** (`bake_favicon.mjs`): her in bone on the cerulean, which is
  the disc idiom and every window on the sheet, at 32 pixels. The `.svg` is the
  same grid as merged horizontal runs — 213 cells become 71 segments — so it IS
  the mark rather than a rendering of one. No 16 px cell: her tail is a dashed
  line at that size, and any retina tab strip draws 32 device px anyway.
- **The link card** (`bake_og.mjs`, 1200×630, ffmpeg + the site's own two font
  cuts). **Set, not captured.** A shared link is the only part of this site most
  people will ever see and it is seen ~500 px wide in somebody else's feed,
  where a screenshot of the sheet is a grey rectangle: the halftone dissolves,
  the display type is unreadable and the animal is 40 px of pink. So the card
  draws the thesis instead — bone paper, a rectangle cut out of it, the one
  unprinted thing standing in the hole. Order is the order of a print: ground,
  cut, animal, type. Drawn any other way the window paints over her, which the
  first bake did, and it looked exactly like a solid blue rectangle.
- **The description travels with the route** (`DESC` in `router.js`; a project
  sheet reuses its own written `line` from `projects.js`, so there is one copy
  of that sentence). One document that swaps its own contents has ONE
  `<meta description>`, written for the summary — invisible to a reader, and the
  whole of what a preview or a search result quotes. A shared `/projects/closet`
  advertised the front page.
- **og:image is relative and that is a known compromise.** The spec wants
  absolute; Slack, Discord, iMessage, LinkedIn and Twitter all resolve a
  relative one. A wrong absolute origin is worse, and this repo has no deploy
  config in it, so it does not know its own domain. When it does: make them
  absolute and add a canonical link.

### Two discs, and a way home from everywhere

The corner is **always the nearest exit**: on a project sheet that is the back
arrow with home one place inward, and on a deck card there is nothing to go back
to, so home takes the corner. Home is hidden on card 01 itself — a control that
leads where you already are is furniture.

The chart's first cell has always linked to `/`, so "is home reachable" was
technically true everywhere and useless: a stitch chart is read as a POSITION,
not as an exit, and it is 19 px of hairline in the opposite corner from where a
reader looks for a way out. Three of the four cards had no visible way to the
start.

- The mark is **skip-to-start**, not a house and not a numeral. "01" was tried —
  the deck numbers its own cards, so it is the site's own language — but two
  small figures need about twice the contrast a chunky glyph does, and at 56 px
  it was mush. The number moved into the hover label (`01 · SUMMARY`).
- The label **hangs below the disc**. Beside it was first and was measured out:
  on a sheet the back arrow's label ran from x 104 straight under the home disc
  at 108.
- `data-cross-target` may only ever be on ONE element — `firstHole()` takes the
  first in the document — so it stays on the back arrow. Home carries neither it
  nor `data-cross-from`, because going home DISSOLVES rather than opens and a
  start point would never be read.
- A deck card's column now has a **floor** under its top padding (`--deck-top` vs
  `--disc-clear`) so the lens cannot come up under the disc. `#s0` sets
  `--disc-clear: 0` — card 01 is the one card the disc is not on, and its
  composition keeps the air it had.

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

### Getting out of your light

**The type is in the grid again, and none of it pushes her.** The tracker walks
`#doc` for elements with words of their own (a non-empty text node directly
inside) plus `img/video/svg/canvas`, outermost wins, and files each as a rect
with `soft: true`. Found, not declared: a class list naming this site's own
vocabulary would be stale the next time a sheet is written.

A soft rect reaches the **placement** grid and never the **travel** one, so:

| | hard (`data-collider`, nothing today) | soft (all the type) |
|---|---|---|
| steer / escape / bump | yes | **no** |
| A\* and line of sight | yes | **no** |
| expensive to STOP on | yes | yes |

Three mechanisms, all of them small:

- `settle()` asks `nearestRoomyPoint` for a seat with room for the **orbit**, not
  just the body — `radius + orbitRadiusPx` = 130 px. Anything under 0.77 ×
  `orbitRadiusPx` asks for LESS than `nearestOpenPoint` already gave (a cell
  counts as open at `radius × 0.5 + padPx + nearCells × cellPx` = 117 px), so it
  would be a no-op. `roomFactor` 0.6 was tried and the paired test caught it.
- **Half a second sitting in type moves her**, hovering only, triggered on her
  circle actually overlapping (clearance under her radius) and satisfied at
  130 px — the gap between the two is the hysteresis. It moves the ANCHOR and
  sets `gazeAt` on the spot she is leaving; the near-critical hover spring does
  the rest, so it is a scoot and not an errand. Travelling over type never fires
  it.
- **A cooldown** (`aside.giveUpForS`) for a page with nowhere to sit.

Measured over 60 s on each of the five real page layouts, dumped from the running
site at 1400×900:

| | resting on type | travelling over it |
|---|---|---|
| as shipped | **1.7%** | 7.6% |
| control: no roomy seat | 3.7% | 5.0% |
| control: never notices | 8.3% | 10.0% |

In the browser, dropped on the 937 px rule line of `/experience`: notices at
**0.49 s**, glances the same frame, fully clear of every rect at **1.48 s**,
never leaves `hover`. On a phone (375 px, widest column 339, her radius 48) there
is nowhere to sit at all and the cooldown holds it to **4 anchor moves a minute**.

Cost: 13.8 ms of brain + physics per simulated second, i.e. ~1.4% of real time.

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
  closed-form schedule is gone. `lifeMaxS` is a guard that must not bind, and
  there is a check.
- **"Faster" is a time scale, not a speed knob.** Asked to make the spray come
  out quicker, raising `speedPx` alone is wrong in both directions at once:
  against the same gravity a faster launch throws the drops higher and wider,
  and each one lives LONGER, so the waves come further apart. Under `v → kv`
  with `g → k²g` the ballistic is exactly time-scaled — same curve, same points,
  k times the speed, 1/k of the time. `vy²/2g` (the height of the throw) is
  invariant; so is the tail's hook, because it is `½g·dt²` with `dt = tailPx/v`
  and the two k's cancel. **k = 1.3**: every velocity in the block carries it
  (`escapeCarryPx` included, or the escape lean drifts with the speed) and every
  duration carries 1/k. Life 0.356 s → 0.274 s, a wave every 0.406 s → 0.324 s,
  total **1.168 s → 0.921 s**, still inside `face.overlay.durS` (1.5) and
  `limbs.panicDurS` (1.6). Arc height measured at 53.20 px before and 53.20 px
  after, which is the check that the scale was exact.
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
- **`nearestOpenPoint` must not hand back somewhere the leash forbids.** It
  returns the nearest open cell anywhere, and on a sheet with little open space
  that is a sliver against the rim. The sideways leash holds her BODY on the
  page — the line sits one radius in — so she pushes into it for the whole
  cruise, times out, gives up, picks again and resolves to the same sliver:
  pinned to the edge of the paper, for good. It takes an x band now. Unreachable
  only became reachable when the grid got real type in it; with an empty grid
  every cell was open and the nearest open cell was always the target itself.
- **And the band has to be part of the SEARCH, not a clamp on the answer.**
  Clamping it back lands the target inside whatever sits against the rim, which
  on this site is a full-height aperture — aiming her at the middle of that is
  the opposite of what the snap is for. It cost a passing check.
- **A goal with no open cell anywhere is still a goal.** `findPath` returned
  null there, the caller fell back to a direct steer, arrived nowhere, timed
  out, gave up and picked another target that was also not open. Type is
  expensive, not impassable: plan to the cell she asked for.
- **The collider tracker measures during the page turn.** `recollect` fires
  while `#doc` still carries the turn's inline transform and the measure lands
  on the next frame, well inside it. Same fix as `deck.js` — take the transform
  off for the length of the measurement — and there is a paired control in the
  router harness that measures 30 px out without it.
- **`aria-hidden` is not "invisible".** The biggest block of type on the site is
  inside one: the terminal transcript types itself into
  `<div data-lines aria-hidden="true">`, because the accessible copy is the
  `<pre class="sr">` next door. Skipping it leaves a 1056×504 hole in the middle
  of the sheet for her to sit in. Visually-hidden things are excluded by their
  rectangle instead — `.sr` measures 1×1.

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
npm test                      # sim (918) + router harness
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
