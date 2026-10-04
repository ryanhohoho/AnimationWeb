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

Five cards, one screen each, read with the arrow keys:

**01 HOME · 02 EXPERIENCE · 03 PROJECTS · 04 PHOTOS · 05 CONTACT**

with the four project sheets hanging off card 03 as long scrolling documents
(Photos joined on 2026-09-27, §18; the summary was renamed Home on 2026-09-26).

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
int: the constraint and the design are the same decision. (Since §21 the icon
is its own glyph-masked canvas and the shader's mask uniforms are unused; the
one-open-icon rule is kept by `deck.setMaskHole`.)

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
  fx/beam.js          the hyper beam: clock + geometry (redrawn 2026-10-04, §26)
  fx/beamShape.js     ...its envelope, clocks, bolts, stars (pure, headless)
  fx/beamMaterials.js ...its six shaders
  fx/beamGeometry.js  beam length + corridor maths (pure, headless)
  fx/faceOverlay.js   the >.< face, drawn ON the eyes
  fx/alphaFlags.js    the alpha channel used as a side channel
  fx/presentMath.js   pure maths for the presentation passes

src/site/
  pressgl.js          THE WHOLE SHEET ON THE GPU — paper, print, and every
                      hole, in one pass. Compiled twice, once per GLSL dialect
  deck.js             the mask: every hole prints into its own canvas (§21);
                      the full-screen canvas draws only the crossing
  sky.js              the plate (the CPU press; still the reference impl)
  skyclip.js          the baked density sheet loader
  router.js           the crossing, the return, commit()
  projects.js         the work + the colour system
  content.js          the words: the bio, the roles, the socials, the card media
  chrome.js           the furniture that does NOT turn — the stitch chart, the
                      phone bar, and the two exit discs. Lives OUTSIDE #doc.
  cards.js            the card hover: one tween that owns the one open icon
  photos.js           the photos card: block, margins, viewer (§18, superseded by §22)
  photolayout.js      the photos card's layout maths, pure (§22)
  photoassets.js      the photo folders as a list: a glob, not generated (§22)
  iconatlas.js        GENERATED by tools/bake_icons.mjs — cell order + uv
  pages.js            shared chrome + the "set, not printed" state
  pages/deck.js       the four deck cards that are not the summary
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
blitted into a small 2D canvas up in the chrome (`deck.js`, `skyBtns`; since
§21 every hole works this way, and a `[data-sky]` control is simply a hole of
kind "sky"). About
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

**FIG. 1 IS GONE (2026-09-22), by instruction** — the played session and the
table of timings read off it were the outdated demo on that sheet. `term.js`
and the `.term` block in `site.css` are kept unimported, on the `media.js`
argument. What follows is the record of how it was built.

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

### FIG. 2 — the command line becoming the interface

The USB sheet documents two tools and only ever showed one of them. The second,
the engraving generator, now has a desktop UI, and plate 1 carries that UI
**running** — the real React app, the real store, the real stream parsing, fed
by stdout the real generator printed. Over it, on exactly the same rectangle, a
terminal playing the same run's console output; the terminal is clipped away to
the left as the reader goes down a scroll track, so at half the track they see
half of each and at the end of it the interface is alone.

It is the HERO of plate 0 — the figure under the headline — and the plate 0 rule
starts it 51lvh down, so about 70% of the window is below the fold when the
reader lands. The page opens on a title and the top of a screen, and the figure
is something to scroll into rather than something already arrived. Measured at
1440x900: the title block and the gaps above it come to 370px, which is what the
`max(0px, calc(51lvh - 370px))` is; re-measure it if the headline gains a line.

**Nothing in it can be clicked, at any point in the scroll.** It is evidence, the
way the transcript below it is evidence, and a reader who can operate it is a
reader who can leave it in a state that demonstrates nothing — a stopped run, an
empty jig, a dialog over the thing they were meant to be looking at. So it is
permanently `inert`, which is the attribute that covers the mouse, the keyboard
AND the screen reader; `pointer-events:none` alone would leave a tab stop inside
an application sitting in the middle of a page about engraving. There was a gate
here once, with hysteresis, that handed the app over at 100% of the track. It is
gone, and `mountDemo`'s `setInteractive` is simply never called.

The no-framework principle is set aside here and only here. What is being shown
IS a React app, and a reimplementation of it would be a drawing of the product
rather than the product.

**It is a demo, not a loop of a run.** A pass is: open Templates, choose a jig,
open Generate, choose the load order, retype the serial prefix, press the
button — then the batches. The script presses the app's REAL controls with
`element.click()`, found by the accessible names a screen reader would use, so
every handler and every transition is the app's own; a renamed control breaks
the demo, which is the right failure. It reaches them through `inert` — which
blocks hit-testing, focus and the accessibility tree but not a click dispatched
straight at a node. That was verified in a browser, not assumed: with `inert` on
the mount point and again on the shadow host, a synthetic click still fires
while `elementFromPoint` over the same button returns null. So the script can
reach what the reader cannot.

The prefix step is typed rather than clicked, through the native value setter on
`HTMLInputElement.prototype` plus an `input` event — a controlled React input
ignores `value = x`, because React paints it back from its own state. It is also
a true step: the generator's default prefix is `E` and this pipeline's serials
begin with `X`.

**Two jigs, and that is the point of two passes.** 1,250 serials go into the
75-pocket 32GB fixture down the columns; 306 go into the 18-pocket Western
Digital Large across the rows, six across and three down, painted violet.
Seventeen batches each, and each pass runs about eleven and a half seconds.

It was a 150-pocket fixture for a draft, and BOTH reasons it stopped being one
came off the page rather than out of a preference. A 150-pocket jig is eight
columns by NINETEEN ROWS, so the sidebar's grid is bound by its height, the
cells go small and most of the sidebar's width is left empty — no cap or budget
fixes that, it is the fixture's own shape. And it carried 527 elements against
this one's 90; measured on the built page, 829 SVG paths became 127.

They need DIFFERENT PACES, which is the part that is easy to miss. Cinematic
spacing puts a fixed gap between pockets, so a batch takes as long as its pocket
count: 75 pockets is about 700 ms and 18 is 165 ms, which is not a jig filling,
it is a flicker. The small fixture plays at a quarter of the speed, which makes
a batch legible on both and lands the two passes within a few hundred
milliseconds of each other.

The violet is a PRESENTATION choice and is applied to the event stream rather
than to the recording, which stays byte-true evidence. It has to be applied
there and not only to `inspectTemplate`: the idle still comes from the
inspection, but the viewer rebuilds its scene from the run's own
`template_loaded` the moment a pass starts, so an override on the still alone is
thrown away by the first frame of the thing it was meant to colour.

**And the gate caught a real one on the way in.** `Western Digital Large.xcs`
carries two loose text elements on its serial layer — asset-number-shaped
strings that are not pockets, so the generator does not detect them as
placeholders and they are engraved verbatim onto every sheet. That is worth
knowing about the template on its own account; for this figure it is simply not
publishable. They are redacted at record time, text AND pre-rendered outlines,
because replacing the string alone leaves the original digits being drawn — the
same trap the telephone number set.

**The terminal answers the same prompts at the same moment.** It used to sit
black through the approach, which was the one stretch where the two halves were
not the same run. The lines are the generator's OWN prompts, lifted from
`generate_xcs_master.py` rather than written to look plausible — the numbered
template list, the row/col diagram it draws, the prefix step and its `E`
default — and they are keyed on the step the script reports, so the terminal
answers a prompt at the instant the pointer presses the control that answers it.

**The terminal prints a line at a time**, because a program does, even a quick
one. Events arrive in frame-sized groups and used to be appended in one go, so a
step's worth of output — the fourteen-line header the generator writes before
its first batch, or the prompt block answering a click — landed as a single cut.
A group is queued now and drained one line per animation frame, about sixty a
second: the header is over in a quarter of a second and still reads as printing.
The drain takes more per frame when the queue is long (capped at six) so the
backlog always clears inside 700 ms — a fixed rate would let the terminal fall
behind the interface, and the whole figure is the claim that they are one run at
one instant.

**The viewer draws on TWO SVGs, and that is a paint decision.** A repaint of an
SVG is a repaint of the whole SVG, and the serials are revealed by writing
`stroke-dashoffset` every frame — so with the jig and the serials in one root,
every frame of every trace re-rasterised the entire drawing. 829 paths on the
150-pocket fixture against 384 on the 75-pocket one, which is exactly why the
bigger jig was the one that stuttered and why it took Mew and the rest of the
page down with it. Split, the jig is rasterised once and never touched again;
`will-change:transform` promotes it, and `contain:paint` on the viewer stops
what is left from walking the invalidation up into a page that has a live WebGL
character on it.

**The sidebar minimap is bounded on both axes and its cell has a ceiling.** Its
grid was `1fr` columns with `aspect-square` cells — a width rule and a shape rule
and no height rule — so it grew downwards for as many rows as the fixture had,
and the 150-pocket jig covered the navigation. The cell size now comes from
whichever bound binds first, capped at 20px so a two-pocket fixture is not two
enormous squares. The height budget is MEASURED, and the thing that makes it
awkward is worth writing down: `nav` is `flex-1`, so its height, clientHeight
and scrollHeight are all "the space it was given" rather than "the space it
needs" — subtracting that is circular, and the grid duly collapsed to a 45px
column. Its children's heights are what it actually needs.

**The backlight is a reconstruction of Apple Intelligence's edge light, turned
inside out.** On the phone the light lives on the glass and falls inward; here
it lives behind the window and falls OUTWARD onto the paper. Apple publishes no
source for it, so it is built from the public reconstructions, and it keeps the
four things they agree on. `site/glowField.js` is the whole model, pure;
`site/glow.js` is one WebGL fragment shader that is a transcription of the
model's `shadeAt`.

- **It does not spin.** The rotating conic gradient it replaced is the build
  every write-up names as the one that looks cheap. Six soft blobs of colour sit
  on the perimeter, each wandering on its own two clocks and swelling on a
  third, all incommensurate; the whole drifts one lap in 26 s, under the pace a
  rotation reads AS rotation. A gap between two colours varies by 46% of the
  loop over a minute, where a rotation holds it fixed.
- **It has depth.** Four Gaussian bands — a core, two blooms and a wash — in the
  ratios of the phone's four stacked strokes, so there is no blur pass: the
  falloff is the formula. Colours mix in LINEAR light, because these are lights
  overlapping; mixed in sRGB, two blobs meet in a dark grey-mauve seam.
- **It has no seam and no corners.** Position round the frame is ARC LENGTH on
  the rounded rectangle, not angle — an angle is out by 2.5% of the loop on this
  window, which squeezes every band through the corners. Every distance along
  it is taken the short way round, so the loop has no start.
- **It arrives from somewhere.** The interface is uncovered from the right, so
  the light starts at the right-hand midpoint and spreads both ways round,
  closing the loop exactly as the wipe ends at `p = 1`. A brighter band leads
  it in and is gone once the loop closes. Its opacity ramps linearly with `--p`
  to full at 1.2 — it was squared, and a squared ramp put 11% of the light on
  screen at `p = 0.4`, which hid the entry it was meant to show.

**The travelling wave is a GAIN on the rim's light, not light of its own.** The
first version added it to the total, which has no outward falloff, so at the
front's position it shone at every distance from the window: a faint ray from
the frame to the canvas edge through the middle of the track. A check on the
bands alone could not see it. The check now runs on WHOLE PIXELS round the
canvas border, over the whole track at the largest band scale: the brightest is
**0.011 of an 8-bit step**.

**Verified on the GPU against the model.** `glow.debugSample(t, p, points)`
draws one chosen moment and reads the named pixels back with `readPixels`; the
same points through `shadeAt` agree to **half an 8-bit step, the rounding,
worst case over five moments and 1,048 pixels each**. A colour set in the editor
was followed the same way, root style to uniform to pixel. Everything else the
model claims is about the whole loop or the whole track, which a page showing
one moment cannot demonstrate, so it is in `test/sim.test.js` with a control
for each.

**Cost.** The canvas is drawn at half the device pixel ratio, held between
0.75 and 1 backing pixel per CSS pixel, and capped at 30 fps — a soft light has
nothing at full resolution to lose. It stops entirely when the figure is off
screen, the tab is hidden, or the reader is not yet 2% into the track; under
reduced motion it draws one still moment and never runs a loop. With no WebGL, or a lost context, a static blurred conic
gradient of the same six colours stands in.

**The colours are the editor's.** `--glow-1` to `--glow-6` in `:root`, read by
the renderer on mount and whenever the root's style changes — which is how the
editor previews. The default is Apple's six, pastel because they were sampled
off a screen where the light is emitted; on white paper a colour cannot be
brighter than the paper, so the editor also offers a Vivid preset of Apple's
system colours at full chroma.

**The jig stopped re-zooming mid-run, and the cause was two layout leaks
rather than anything pressing Fit.** The viewer refits when its container
changes size, which is right — and its container was changing size during a run
for two reasons. The form column beside it was `minmax(320px,380px)`, so it
breathed by forty pixels as its own content changed ("⌘↩ to start" goes, the
button's label shortens). And the viewer's own grid had an implicit `auto`
column, which is max-content: the console two rows below sets its lines
`white-space:pre`, so the column tracked the longest line the generator had
printed and the viewer stretched past its cell to match. Fixed width and
`grid-cols-[minmax(0,1fr)]` respectively; measured after, the viewer holds its
size for a whole pass and the scale only changes between the two fixtures,
which is the one time it should.

Two corrections came out of that, and both are the kind that only show on the
page. Pinning the form column at the TOP of its old range took forty pixels off
the jig and the console for ever — the two things worth looking at — so it sits
near the bottom of the range instead, at 340, where everything in it still fits.
And a fixed-height row whose text wraps does not grow, it OVERLAPS: the status
line broke after "Batch" and its second line landed on the progress bar beneath
it. The two counters refuse to wrap and the filename is the one that gives,
because it is long, monospaced and the least damaged by losing its tail.

**The pointer is drawn UNDER the mask.** It is pressing controls in the
interface, and the interface is the half the wipe has uncovered; a cursor
floating over the terminal points at something that is not there.

**Both halves are the same events.** `mountDemo` hands over every console line
as its replay reaches it (`onLines`), so the words in the terminal and the
pocket lighting up in the viewer come out of the same frame of the same run.
Two recordings on two clocks would drift, and a wipe between two things that
have drifted is a wipe between two different runs. It is visible on the page:
the terminal and the app's own console pane print the same batch number.

**A shadow root, and it is not optional.** The app's stylesheet is Tailwind's
output — it styles `body` and `html` and sets `user-select:none` — and this
site's `* { margin:0 }` would style every node in the app right back. Neither
is a bug in either stylesheet; they are two documents' worth of assumptions in
one document. `tools/vendor_demo.mjs` rewrites `:root` to `:host` on the way in,
because `:root` matches nothing inside a shadow root and every design token the
app defines would otherwise be undefined. Each rewrite is checked, and a rewrite
that matches nothing is an error in the tool rather than a styling bug three
files away.

**The figure is always printed light.** The app follows `prefers-color-scheme`,
which is right on a desktop and wrong inside a printed sheet. The deciding
reason is not taste: the terminal is set in the sheet's own ink, `#16150F`, and
the app's dark window is `#1E1E1E`. Eight points apart — the cut between the two
halves was almost invisible in dark mode and is a hard black-to-white edge in
light. The whole figure is that cut. The dark block is made inert at vendor
time; `.usb-frame` therefore carries one background value and cannot drift out
of step with a second.

**THE DIVISOR, which is the one thing here that is easy to get wrong.** `--p` is
measured in DESIGNED SCROLLS, not in track. The wipe finishes at 1, the backlight
peaks at 1.2, and at 1.3 the sticky child reaches the foot of its track and lets
go — so the track is 1.3 designed scrolls long and the designed scroll is the
sticky travel over 1.3. Dividing by the sticky travel instead is the obvious
thing to write and it is wrong in a way that looks almost right: `p` then tops
out at exactly 1.0 at the foot of the track, so the wipe completes at the same
instant the pin releases — the reader never gets a moment with the interface
alone, and the backlight never reaches full. It was a divisor. Measured on the
real page after the fix: 998 px of sticky travel, 768 of designed scroll, and
**230 px still pinned after the terminal has gone**.

**No scroll timeline.** `animation-timeline: view()` is the CSS feature for this
and it would run off the main thread, and it was not used. The reason is
narrower than browser support: the properties this effect animates —
`clip-path: inset()` and a blurred layer's opacity — are not compositor-driven
in any current engine, so the work lands on the main thread either way and the
timeline buys a frame of latency rather than a free effect. What it would cost
is two implementations of the same number, one of which cannot be verified in
this environment at all. The SHAPE is still the one Apple and NVIDIA product
pages use, because the shape is the part that matters: a tall track, a sticky
child, progress derived from position in the track. No scroll-jacking, and
scrolling back up runs it backwards because the number is a pure function of
scroll.

`progressAt` is exported and pure, and that is where it is checked — a page is
only ever showing one value of `--p`, and the preview pane does not scroll at
all.

**What it costs, and the frame it used to drop.** Lazily loaded behind an
IntersectionObserver, and then behind an IDLE CALLBACK as well, which is the
part that matters: the figure is the first thing on the sheet now, so the
observer fires on landing and used to put the module's evaluation, React's first
mount and the first jig's render in among the sky shader compiling and the
animal being rigged. Measured with `PerformanceObserver`: **354 ms of total
blocking time across nine long tasks, down to 110 ms across two.**

Three things got it there. The idle callback (with a 1.2 s timeout, so a page
that never goes idle still starts it). Splitting the FETCH from the PARSE — a
fetch costs the main thread nothing, `buildSchedule` costs 16 ms warm and 31 ms
cold, and doing both in one step put the parse two milliseconds after the fetch
resolved, which is to say in the middle of React's first mount; split, the bytes
are on their way while the cursor walks to Templates and the parse lands four
seconds later on a quiet thread. And fetching each template's geometry only when
that template is CHOSEN, through `inspectTemplate`, which the app was going to
call anyway.

A scroll frame is still one property write and no layout.

**The data.** Sequential synthetic serials from `X1111111`, generated for this
and belonging to nobody, and the template's telephone number is substituted the
same way the transcript's device identifiers are. The source repository gates
its own build; `test/sim.test.js` checks the vendored files again from this
side, by PARSING them rather than pattern-matching — a pattern loose enough to
catch a real asset number also catches a number out of the middle of an SVG
curve, which the source repository's gate failed on twice before it was
rewritten this way. The label's pre-rendered glyph outlines are checked as well
as its text: replacing the text alone leaves the original digits being drawn.

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
- **And the LAP gives way where the seat could not.** A seat is asked for 130 px
  because that is her body plus the orbit. Parked at the terminal — 1056 of
  1400 px is transcript — nothing has that, so she takes the roomiest going
  (86 px in the margin, which clears her body) and the orbit alone carries her
  back over the words. `orbitCap` is sized with the anchor, never read per
  frame, and floors at `hover.orbitMinPx` so she curls up rather than parks.
  Measured there, over six minutes of resting at that scroll: **8.7% → 6.1%**
  of resting time on type, **5.1% → 4.4%** on the transcript itself, and she
  still drifts 23 px/s rather than 27. Where there is room the cap is exactly
  `orbitRadiusPx` and nothing changes at all.

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

## What the page actually costs, measured

Taken in a real browser at 1400x900, dpr 2, on the dev build. Every number is a
median of 40+ samples.

| | cost | how often |
|---|---|---|
| the press repainting the whole sheet (`__DECK__.debug.paint`) | **0.1 ms** JS | up to 20/s (the cloud loop) |
| `poser.update` — every pose layer, one render frame | **0.1 ms** (p90 0.3) | per frame |
| `brain.step` — one 120 Hz sim step | **< 0.01 ms** | 120/s |
| the collider remeasure, 19 rects, forced layout | **0.4 ms** (max 1.3) | only on a real layout change |
| brain + physics, headless, per simulated second | **13.8 ms** | ~1.4% of real time |

**There is no hardware-heavy redundancy of consequence, and that is a
measurement rather than an opinion.** The sheet's fragment work is ~5 Mpx a pass
at 20/s on a desktop and ~3 Mpx at 20/s on a phone; everything the site adds on
top of the three.js draw is sub-millisecond. The one thing that WAS permanent
and avoidable — a 500 ms interval remeasuring every block of type, twice a
second, forever — is now a ResizeObserver (see below).

Two costs were looked at and deliberately left alone:

- **The grain**, `body::before`: a fixed full-viewport `mix-blend-mode:multiply`
  layer above everything. It is the most expensive compositing on the page by
  construction, because a blend layer cannot be skipped. It is also the print,
  and the print is the site. Not a candidate.
- **The duplicate soft rects.** A project card stacks a still and a clip in the
  same frame, so the collector finds two elements with the same box and the grid
  pays for both — 22 rects where 19 would do. The saving is 14% of a rebuild
  that happens on a layout change, and the containment test that would earn it
  is O(n²) over up to 400 rects. Not worth the code.

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
- **The biggest block of type on the site was invisible to the collector.**
  The transcript types itself into a child of `.term` a character at a time, so
  the text walk found nothing at load — and `collect()` only runs on a route
  swap and a resize, so it found nothing 54 lines later either. 1056x504 of
  words, and she was free to sit in the middle of them. `[data-term]` joins the
  list of boxes that PAINT their own content, beside `<canvas>` and `<video>`,
  which is the same idea rather than a class list creeping in: the container is
  there from the first frame, at its final size, and outermost-wins keeps every
  typed line out of the list. Verified live — one rect before the tape runs and
  the same one rect after all 54 lines, with `collidersVersion` never moving.
- **`term.debugRun()` had no handle.** term.js carries it precisely because rAF
  and timers are throttled in a hidden pane and the tape has to be runnable by
  hand; nothing held the object, so it could not be called. `window.__TERM__`
  now, beside `__DECK__` and `__AW__`, and it goes away with the page.
- **A remeasure must be a reaction, not a poll.** The collider tracker ran on a
  500 ms interval, which cost nothing while `[data-collider]` was on nothing and
  costs a forced layout twice a second now that it reads every block of type.
  It is a ResizeObserver on `#doc` and on the collected elements — which is not
  merely cheaper but strictly better, because it fires WHEN the font or the
  image lands rather than up to half a second afterwards. `collect()` must
  `disconnect()` before re-observing or every route swap leaves twenty
  observations on detached nodes. A transform is not a resize, so the card
  hover cannot reach it: nothing on a hover path may read layout.
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

- **A wrap is not a rhythm.** `.row-head` is a wrapping flex row, so whether a
  job title sat beside the employer or under it depended on how long the two
  happened to be: at 414 px, "Royal Canadian Mounted Police" (264) + "Junior
  Software Developer" (175) is 453 into a 378 px column and wraps, while "Free
  Geek Vancouver" (173) + "Computer Technician" (133) is 320 and does not. Two
  rows stacked, one row inline, in a list whose whole job is to be scanned
  down. Below 560 px the column cannot hold the longest pair (509 px) at all,
  so `.row-role` takes `width:100%` there and all three read the same way.
- **The chart cells are 26 px wide and stay that way.** They are butted
  together on a shared grid with no gap, so a 44 px pad would overlap its
  neighbours by 9 px on each side and a third of every cell would fire the
  wrong page. The pad grows the target to 26x44 in the axis where it is free to,
  and the 44x44 primary control is the pair of arrows in the same bar.

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

(Historical: §21 replaced the punch, the masked hole and the shared canvas.
The rules below about percentages and measuring by ELEMENT still hold.)

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

## The keyboard

- **The arrow-key legend is a control, not a caption.** It was
  `<kbd>←</kbd><kbd>→</kbd> navigate`: two 9 px boxes in `--n4`, the hairline
  grey, naming a category rather than an action, and doing nothing when
  pointed at. It is now two 20 px keycaps that are real links carrying the same
  `data-prev`/`data-next` as the phone's bar — one control in two costumes, one
  rule in chrome.js driving both — so a desktop reader who never touches the
  keyboard has a next/previous control for the first time. `chrome.js`
  `querySelector` became `querySelectorAll` for exactly that reason: it took
  whichever costume came first in the document, which works right up until
  there are two.
- **The glyph is an arrow, not a chevron, and it is drawn rather than typed.**
  Side by side at 8×, a chevron reads as a pagination button and a stemmed
  arrow reads as the KEY — which is the difference on the keyboard itself. The
  phone's circles keep chevrons: they are buttons, and there is no key to point
  at. Typed `←`/`→` sit off-centre in their em box and on a different baseline
  in every fallback face; a path is the same shape everywhere.
- **A cap lights only on a press the router acted on.** The flash is driven
  through the world bus (`deckstep`), not a keydown listener in chrome, because
  the router is the only thing that has already discounted modifiers, a field
  being typed into, a focused link taking Enter, and a page with scrolling
  left. Measured: ArrowRight lights `→`; ArrowLeft on card 01, where `step(-1)`
  fails, lights nothing.
- **An inert cap dims with opacity, never with `--n4`.** The `--n4` check reads
  the real stylesheet and cannot tell an inactive mark from a word, so the
  token in a `color:` is a violation whatever it draws — and `.mob-b` has
  always dimmed with opacity, so the two costumes now cannot drift.

- **A key that scrolls is the reader's before it is the deck's.** ArrowDown,
  ArrowUp and Space went straight into `step()` alongside the horizontal
  arrows, with `preventDefault()` on top — so on a project sheet, 3,310 px of
  terminal and figures, the three standard scrolling keys threw a keyboard
  reader onto the next project and stopped the browser scrolling as well. The
  one kind of page that actually scrolls was the one you could not scroll.
  `keyScrollsFirst()` gates the vertical keys on scroll position now; Left and
  Right are untouched, because nothing on this site scrolls sideways at a width
  that has a keyboard attached (`.term` only takes `overflow-x` under 860 px).
  Measured in the browser: on the USB sheet Down and Space are no longer taken
  and Right still is; on `/experience`, one screen tall, all three still are.
- **The annoyance stars are a different reference from the shiny sparkle.**
  Both bursts drew the astroid — the four-pointed twinkle with concave sides
  the shiny sprites use — and four long thin concave arms at that size and that
  spin read as a little yellow spikeball. A knocked-loose star is the manga /
  Kirby star: five points, straight edges, fat body. `fivePoint()` folds the
  plane into one 72° wedge, where the whole boundary is a single straight edge
  from tip to waist, and tests one dot product against its un-normalised
  normal — no divides, no per-edge atan. `starWaist` 0.52 is the character of
  it; 0.382 (1/φ²) is the pentagram-sharp star and is the spikeball.
  **The shiny entrance keeps the astroid** — that one really is a four-pointed
  sparkle in the games, and it is a different moment.
  Verified on the GPU: the shader's boundary radius matches the headless twin
  to 0.005 at thirteen angles, five tips at 1.0 and five waists at 0.52.
- **`starCore` is derived, not chosen.** Both fields run 0 at the centre and 1
  on the outline, but they FILL differently: the astroid's `d ≤ c` region has
  area ∝ c³, the five-point's ∝ c². So 0.42 on one is 0.42³ = 7.4% of the
  sprite, and the same 7.4% on the other is √0.074 = 0.27. Change the outline
  without re-deriving this and the two-tone changes when only the shape was
  supposed to.
- **A crossing with no origin still means "away".** The return — experience
  back to summary — is the only transition whose opening closes in from the rim
  rather than out of a hole, so it hands the brain no source. That used to
  invert the rule: no source meant run at the middle of the room. It made the
  return the one press that flew her across the reader's view, and it was the
  longest possible way off the page. Measured from the four seats `settle()`
  actually finds on that sheet: **0.82 s to clear and 190 px of sideways travel
  outward, against 1.75 s and 1,375 px inward** — she used to cross the whole
  window to leave it. `panicFrom(null)` reads the middle of the screen as the
  thing to get away from now, which is one rule for every crossing.
- **A fling IS a swipe, and the page was listening.** The router reads any
  mostly-sideways touch drag as "next card" — which is the exact shape of
  throwing her across a phone screen, so a fling navigated away from the page
  you threw her on. There is no element for the swipe to exclude, because she
  is a WebGL context and the grab is a window listener, so the engine publishes
  `world.grabbing`. It must be raised in the `mewdown` handler and not at the
  next sim step: world.js's window listener was registered at construction, so
  the whole press → mewdown → brain chain runs before the router's own listener
  for the same event, which is where the swipe decides whether to watch. A step
  later is a step too late. Verified live: the same 140 px drag navigates from
  empty paper and does not from her.
- **`step(-1)` at the first project reports false, and that is not a bug.**
  ArrowUp at the top of `usb-provisioning` looks unhandled because there is no
  previous project to go to — the same key on `closet` is taken.

## The scroll

- **The paper may not bounce, because the print cannot bounce with it.** Every
  hole is painted on `#sheet`, which is `position:fixed`, so a macOS elastic
  overscroll slides the document down and leaves every cut circle behind — the
  lens' hole pinned at the top with its own hairline ring walking away from it.
  It is true of every aperture; the lens is only where a few pixels are obvious,
  because a circle against its own ring has no slack.
  **It cannot be corrected for.** MDN's `Window.scrollY` page states the split:
  Safari updates `scrollY` beyond the maximum, Chrome and Firefox do not. So
  WebKit hands the press a negative `scrollY` and the press tracks the bounce
  for free — no bug there — while Chromium and Gecko clamp at 0 and move the
  layer on the compositor, where `getBoundingClientRect` cannot see it either.
  The engine with the bug is the one that will not tell you about it. So the
  bounce goes: `html { overscroll-behavior-y: none }`, which is the same
  decision as `history.scrollRestoration = "manual"` — the router owns the
  scroll, and anything that moves the page without saying so breaks the one
  invariant the sheet rests on. `overscroll-behavior-x` stays `auto`, and the
  rule is on `html` and not on `.term`, which is the one thing here that is
  supposed to scroll to its own ends. Costs pull-to-refresh on Android Chrome.

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
| `src/assets/fonts/` | Overpass Mono var (22 KB) + IBM Plex Mono 200/600 (80 KB), all woff2, and their OFL licences. The Plex pair shipped as .ttf until it was measured: 276 KB of uncompressed container for the same 1,033 glyphs. The .ttf sources are not in the tree — they are stock IBM Plex Mono, and site.css carries the one-line fonttools command that made these |
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

---

# 12 · The editor

`npm run edit` → `localhost:5275/editor/`. Full account in `editor/README.md`;
the short version, and the traps:

- **It runs the real site.** `editor/vite.editor.config.js` is the site's own
  config plus one plugin, so the frame shows exactly what ships. The plugin
  marks every start tag in `index.html` and the page templates with
  `data-esrc="file:offset"` — in edit mode only — which is how a click becomes a
  place in the code.
- **Words go back through the AST** (`vite`'s `parseAst`), matched on what the
  reader sees (entities decoded, whitespace collapsed), with duplicates told
  apart by page order. A string assembled by code is refused, not guessed.
- **Styles go to `src/styles/edits.css`**, keyed on `data-e` ids the editor
  writes into markup, scoped by `#doc[data-page]`, in three breakpoint sections.
- **A save is all or nothing.** Every change is a range edit against the file
  the page was built from; all are checked, then all are written; a file that
  changed on disk since is refused. `npm test` runs after and streams back.
- **Moves are `translate`, never `transform`**: every entrance animation ends on
  `transform:none` with fill `both`, which would erase a transform for good.
- **A template shared by several pages** (`shell()`, `renderSheet()`) asks before
  an insert or duplicate lands on all of them.
- **An icon the bake refuses is rolled back**, so `tools/icons` never disagrees
  with the atlas.
- **The shell has no vite client on purpose**: it is served raw, so a save
  reloads the site in the frame and never the editor holding the history.


# 13 · The nav bar, the face, Mew off the sheets, and the motion-graphics page (2026-09-25)

All by instruction, and each consulted before it was built.

### The chrome is one bar
`#chrome` holds a small bar at the top middle, a third of the window wide (the
width its four names need on a phone), naming the four cards. It replaced the
two sky discs, the stitch chart and its counter, the phone's arrow buttons and
the corner keycaps. The arrow keys and the swipe still turn the deck,
unadvertised. `chrome.js` marks the card you are on (`aria-current="page"`), and
Projects on a project sheet as `location`; a 404 marks nothing. The deck's
`skyBtns` pass (`[data-sky]`) is intact and simply has nothing to draw. The
summary's "press → to continue" and the two "← back to …" links are left for
the owner to delete in the editor.

### The crossing rule
A move crosses if it leaves or arrives at the summary, or leaves or arrives at a
project sheet; everything else turns; project ↔ project turns
(`transitionFor`). A hash-only `popstate` is no longer a navigation.

### Every word is Darker Grotesque
One variable woff2, 40 KB, 300–900. Sizes are unchanged: `body` carries
`font-size-adjust:0.511`, the old mono's x-height, so the new face's lowercase
stands where the old one did (x1.265, off both OS/2 tables). Its zero adjusted is
0.610 em against the mono's 0.616, so every `ch` column keeps its width to 1%.
FIG. 2's terminal, the unused `.term`/`.doc` and the vendored demo's shadow root
keep IBM Plex Mono and set `font-size-adjust:none`.

### Mew is not on the project sheets
`site/mewPresence.js` is the rule: every commit says whether she is away; the
engine is fetched on the first card of a visit and never for a visit that stays
on sheets; booted late, she enters from the side. `mew.js` stops her loop and
hides her canvas (`#stage.asleep`) on the first frame she is out of sight, and
restarts it on the way back, where the swap's own `recollect` has already given
her the side entrance. Checked in the router harness, with a paired control.

### closet is gone; slot 02 is experimental motion graphics
`/projects/motion-graphics`: "let me be a flower" (`../VisualAudialExperience`),
52 scenes and the film, ultramarine + crimson, the hallway's pixel flower as its
icon (the shape evaluated off the piece's shader, fill only), the pool rhino
x-rayed in the Photo Viewer as its card.

- **Renders** come from a scratch copy of the piece, never the piece:
  `tools/motion/README.md`. Story beats are cut from a word-free re-render of the
  whole piece; the devices montage's scenes and the 21 cuts of "A flower." are
  standalone takes (the flower cuts hold the bloom at their own moment of the
  film -- letting it keep opening blew five of them out to white).
- **Budget:** 92 MB of video in `src/assets/motion/`, 720x1560 H.264, capped
  CRF (2 Mbps; the wings' per-frame colour noise came out at 13.7 MB for 8 s at
  pure CRF), a keyframe every half second so scrubbing never stalls.
- **The contact sheet is one video** (sheet.mp4, 9x6 tiles of 200x434, each a
  2.5 s boomerang on a shared 5 s loop), drawn into each visible cell's canvas
  on `requestVideoFrameCallback`. Fifty videos would be fifty decoders.
- **The look is the piece's, not the site's**: a near-black ground that is the
  scene under the pointer, or crossing the middle of the screen, or open in the
  viewer -- shrunk to 48x104, graded blue and put through a 4x4 ordered dither in
  four inks with scanlines and grain, on a canvas a third of the window's size at
  24 fps (`motionAmbient.js`, YouTube's ambient mode printed the piece's way).
  Frames are boxed like its computer vision (cyan tracking, red locked).
- **The viewer** carries the scene's name and one bar, in the scene, and nothing
  else: Photos' gestures on touch; beside the frame, click, arrow keys and Esc
  with a mouse; the wheel or a trackpad scrubs frames. Credits are one list at
  the foot of the page, generated from the piece's CREDITS.md.
- **Cost to everyone else:** the page's code is its own chunk (64 KB), fetched
  when the page mounts. The site's first chunk went 118.9 → 127.9 KB (53.0 →
  57.0 KB gzipped) for the bar, the presence rule, the router and this page's
  markup and names.

### Open
- (Resolved 2026-09-26, §14.) The white paper is deliberate; `--n4` went
  `#9A9384` → `#9E9789` to get back under 3:1 on it.

# 14 · The motion page becomes a showcase; the bar loses its box (2026-09-26)

By instruction, after one round of questions. Supersedes §13 where they differ.

### The nav bar
No box: one hairline over the four names (`border-top`, `--n4`; on the motion
page the piece's periwinkle). The page you are on is set LIGHTER, by
instruction -- the other three are ink -- in its own token, `--nav-here`
`#6F6A5E`, which clears 4.5:1 on white and on bone (5.4 / 4.8), because this
sheet does not fade words below the floor. On the dark page "lighter" is the
full cream against the others' dim. With no box the page would run under it,
so `chrome.js` slides it away while scrolling down (40 px of travel) and back
on scrolling up (10 px) or near the top; `:focus-within` brings it back for a
keyboard. One `scrollY` read per frame, a transform on the compositor.

### The motion page is a showcase of works
- **Data**: `site/motion.js` is one line per work -- id, name, and `on`:
  `"top"` (the featured wall, in order), `"mix"` (the scatter), `"flower"` (the
  flower's run). A work can be in two places. The film's own cut (`CUT`,
  `ACTS`) is used by its timeline and scrub ticks and nowhere else.
- **Featured** (owner's list): the heavens tiled (the sky tiles as ONE take, see
  below), liquid chrome, the undercroft, science., the pool, the angels, and of
  the flower cuts only stripes. Lines, the real one, halftone, kaleidoscope and
  one bit are also in the scatter. All 21 flower cuts are in the flower's run.
- **The wall** (`site/motionLayout.js`, pure, tested): a broken grid -- 3
  featured columns / 5 scatter columns on a desktop (2 / 4 under 860 px,
  2 / 3 on a phone). Width follows clip length (3 s → 13 s, clamped), order is
  priority (shortest column first), the scatter is seeded. Every length is in
  column widths, so CSS percentages place it with no measuring. The columns
  drift and the tiles lock on with `animation-timeline: view()`; unsupported or
  reduced motion is a still wall. Before the page's code arrives the wall is a
  plain grid.
- **The flower** (`site/motionBloom.js`): a sticky 100svh stage, 21 invisible
  steps of 15svh (11 on a phone) watched by one IntersectionObserver band at
  mid-window. Posters swap while scrolling; after 0.4 s at rest the cut's clip
  plays in the frame (one decoder, only on screen).
- **The ground** rests on flower-13's poster (`GROUND`) and follows only a
  MOVING mouse onto a tile (never the scroll: that was the flicker). A still
  stops the draw loop once it has faded in -- no grain shimmer, zero cost.
- **The viewer** pages within the list it was opened from (wall / flower /
  film). A mouse closes it by clicking the dark around the frame (the chevron
  targets are now 92 px strips beside the frame, not the whole side) or the
  drawn X, top left, which a phone does not show.
- **The sky, whole**: the firmament and the montage's turn were one take shown
  twice. `?takes=sky` (sandbox) renders it straight through: 5 s of clouds, the
  jerk to the portrait at 5 s, to the frame before the scene's own cut to black
  (6.7 s). Sound: the firmament's mic without its whale J-cut, then the turn's
  sound as the montage plays it. `turn` is gone.
- **Bake**: the contact sheet is now cut from the site's own clips, not the
  renders, so a new work needs only its video: `node tools/bake_motion.mjs --add
  <video> --id <id>`, then one line in `motion.js`. The sheet holds only tiles
  that play (film + top + mix = 37, 8x5 of 240x520, 4.1 MB). Total video
  94.0 MB.
- **No spec notes**: the stats line and the "02 · 2026" kicker are gone, and
  RYAN.txt V and DESIGN.md §4 now say not to add such notes.

### --n4 on the white paper
The paper is `#FFFFFF` on purpose (the owner, 2026-09-26). That put the
hairline grey at 3.05:1 -- over the 3:1 large-text floor, so it could pass for
faint text, which is what "control: --n4 is under even the large-text floor"
exists to forbid (the editor's inspector warns on the same bound). `--n4` is now
`#9E9789`: the same hue 4% toward white, 2.90:1 on white, 2.57 on bone. The
test was not touched; the token moved back under it.

# 15 · Ready to host (2026-09-26)

- **What is committed** is exactly what `npm ci && npm run build` needs, plus
  the tools, tests and docs (`.gitignore` says why for every exclusion).
  Checked by building from ONLY those files in a clean folder: all 140 output
  files matched the local build byte for byte. Nothing is read from
  `../VisualAudialExperience` or `../USB-UI` at build time.
- **HTML comments are stripped from the build** (`buildNotesOut` in
  `vite.config.js`): `index.html` 15.4 → 3.5 KB, the main chunk −2.8 KB, zero
  comment nodes in the live DOM. Checked against the previous build on all
  eight routes (the four cards, the three sheets, a 404): the page, the bar,
  the head and the visible text fingerprint identically.
- **The editor cannot reach the host**: it runs only under `npm run edit`
  (its own vite config); nothing in `src/` refers to it; no editor code or
  source offsets appear in `dist/`. `edits.css` is the saved result and ships.
- **Vercel**: `vercel.json` builds with `npm run build` into `dist/` and
  rewrites unknown paths to `index.html`; the filesystem takes precedence over
  rewrites (Vercel docs), so assets are never rewritten.
- Open: `og:image`/`og:url` are relative until the domain is known (link
  previews on LinkedIn and others want absolute URLs); `npm audit` reports 4
  advisories, all in build-time tools (esbuild's dev server, postcss, nanoid),
  none in what visitors download.

# 16 · Mew on Home only, a confidential sheet, and the phone lag (2026-09-26)

After the site went live on Vercel. By instruction, one question round.

### Mew is on Home, and nowhere else
`mewPresence.js`: away on every route but `home`; the engine is fetched the
first time a visit reaches Home. Crossings unchanged: leaving Home is always a
crossing, so she leaves through it and sleeps; coming Home is a return, and she
enters from the side. The nav says **Home** and the live region says "home —
page loaded". Router test rewritten (authorised) with a control; checked
headless: no engine request on a visit that starts on Experience, asleep on
Experience and Contact, awake on Home.

### RCMP encryption architecture (confidential)
`pages/rcmp-encryption.js`, slot 03, between USB and iClicker. The owner's
reference is liumichelle.com's NDA pages (a Year/Role/Org/With row, labelled
sections, "This work is confidential. Please email me if you'd like to chat!");
the look is this site's two-plate trim with a square hairline lock box and a
pixel padlock (`site/padlock.js`, also the icon via `tools/bake_padlock.mjs`).
Words drafted ONLY from facts the site already states; three capture slots
(`rcmp-encryption-1..3`). Card: the USB still, blurred. Inks navy + grey.
The projects' order moved from editor CSS `order` rules into `projects.js`
(motion, USB, confidential, iClicker), which is also the arrow keys' order.

### The phone lag
Measured in headless Chrome on the real GPU, phone viewport, 4x CPU throttle
(scratch harness, not in the repo), before → after:

| navigation | worst frame DURING the transition |
|---|---|
| projects → USB | 408 ms (1.4 s of long tasks) → 25 ms |
| projects → motion | 158 ms → 75 ms (the page swap itself, under full cover) |
| home → projects | 159 ms → 44 ms (Mew is not fleeing it any more) |

- **Arrival**: pages start WebGL, decoders and big modules after `settled`
  (CLAUDE.md invariants). The USB demo's first render (~115 ms on an M2) now
  happens on a still page; it is the vendored app's own path-building and
  cannot be split from this side.
- **The motion page** fetches its code as the move STARTS (`prefetchPage`),
  lays the wall at commit, starts everything else on arrival, and stops its
  tiles, clip and ground as the next move starts (`onLeave`). Tiles size from
  the observer's rect instead of a layout per tile; columns lost will-change.
- **The viewer**: the endless-seek bug (Safari rounds a seek; the old test
  never came true) fixed; a scrub or wheel resumes play if the scene was
  playing; a fresh `<video>` per scene; the page under it stops before it
  opens and stays stopped through a lift (the old lift woke 40 tiles: a 183 ms
  hitch in Chrome, the 5 fps drag on the phone); one drag write per frame;
  the lifted frame is its own layer only while lifted; no shadow edge to edge;
  the ground stops on a phone while a scene is open; the bar moves by
  transform. Checked headless with synthetic touch: lift worst frame 183 →
  10 ms; after a scrub the video plays on.
- NOT verified on an iPhone: this environment has none. Safari's decoder and
  compositor are what the fixes target, by their documented behaviour.

# 17 · The editor: scaling text, corners, several at once (2026-09-26)

By instruction, after one question round.
- **Text scales.** The side handles of a text block used to change only its
  box, so a big drag barely changed anything visible (the owner's "1-2%").
  With the chain on (`ed.link.text`, default ON, kept in localStorage) every
  handle scales size, box and pixel spacing together and writes the leading as
  a ratio, so the lines break where they did; off, the sides re-wrap as
  before. Corners always scale. Measured with real pointer input: a corner drag
  took "ryan ho" 53 → 114 px with the top-left fixed and one line kept.
- **Corners on everything**: pictures (shape kept), text, boxes (chain or ⇧
  keeps the ratio).
- **Several at once**: a selection box from empty space (a container that is
  not selected), ⇧ to add, ⌘⇧ to take out, on the canvas and in Layers; move,
  resize (round the group's box), nudge, delete and hide together, each as ONE
  undo step (`ed.styleMany`, `ed.endLiveMany`). The inspector shows the
  properties they share, "Mixed" where they differ; a dragged label moves
  each from its own value; `%` scales all in place.
- **After a resize the element is measured and its offset corrected** so its
  fixed point stays put even when the flow moves it (a centred column).
  Scaled boxes get 0.5% + 1 px of room: at x1.44 a shrink-wrapped label needed
  49.09 px in a box scaled to 49 and broke (measured).
- **The inspector's labels capture the pointer**, so a drag keeps going when
  it crosses onto the canvas (it used to stop dead at the frame's edge).
- **A canvas drag no longer starts a text selection** in the page (mousedown's
  default is prevented while not typing).
- The arithmetic is `editor/shared/scale.js`, pure, checked in sim.test.js.

# 18 · One composition on every screen; the photos card (2026-09-27)

By instruction, after one question round (reference screen: 14" MacBook Pro;
photos on a card of their own; the reel is a film strip; placement applied for
the owner to adjust).
- **The mismatch, measured** on the owner's two screenshots: the home window
  was a percentage of the screen and sat at the same fraction on both; the
  words were px and the nudges were px, so on 2560 wide they were a third
  smaller and drifted inward. Now every px in the site's stylesheets is a
  design pixel (CLAUDE.md invariants, `src/styles/designPx.js`). Measured
  after: at 1512x867, 2560x1277, 1920x969 and 1280x720 every horizontal
  fraction on home, experience and projects is identical to three places;
  vertical fractions differ with the window's shape, by instruction (the
  horizontal first).
- **The home window's height** was 62% of the window and its width 23% of
  it, so a 2:1 monitor drew it squatter (0.75 against 0.65). On a desktop its
  top and height are those shares of the reference, in design px.
- **The home placement** (edits.css, the owner's to adjust in the editor):
  the column starts at 1/3 of the window, where the nav's hairline starts; the
  window starts at 2/3, where it ends; the name is set so its width equals the
  window's (110 px -> 348.1 of 348, measured), so the row reads column 348 |
  gap 156 | window 348 | margin 156; and the greeting hangs from the window's
  top edge (a Swiss hanging line), so the name is the first thing on the
  Z the eye takes. The two near misses it replaced (29.9% against the
  hairline's 33.3%, 63% against 66.7%) read as accidents.
- **The USB figure** is 70% of the reference window's height on a desktop
  (it was 70lvh), and its app is zoomed by the design pixel (CLAUDE.md).
  Measured after: the app's words sit at the same fractions of the frame at
  both sizes, to three places.
- **The photos card** (`pages/deck.js`, `site/photos.js`,
  `tools/bake_photos.mjs`): card 04, before Contact, 23:30 on the sky. A
  strip of life across the whole window, printed with the sky's own press
  (45 and 15 degree screens, 5.2 ruling, the same misregistration, the home
  inks) until the pointer is on a frame; it drifts as a CSS animation, pauses
  under the pointer, and can be pulled either way (read once at the grab, one
  write a frame, a negative delay to hand back without a jump -- measured
  0 px). The photography hangs in the column paced like a photobook: a pair,
  one alone to a side (never over 62% of the column), a pair. A pale viewer
  (the motion viewer's hands: turn, Esc, X, click the paper, swipe) opens and
  closes out of the picture. Checked headless with stand-ins (removed): drift
  20 px/s, hover pauses and shows the photograph, a pull does not open, a
  click and a tap do, arrows page, Esc and the paper close, no errors.
- **The nav on a phone** was re-spaced for five words (CONTACT reached 4 px
  from the edge at 390; a narrower step below 360).
- NOT verified: Safari (no WebKit here) -- in particular FIG. 2's pointer
  position under `zoom`, which rests on getBoundingClientRect reporting
  screen pixels inside a zoomed box.

# 19 · Three works re-made in the piece (2026-09-27)

By instruction, in "let me be a flower" itself (its HANDOFF.md, round 10), then re-baked here with
`--only credits,tower,earth` from a sandbox montage render (scenes.json's offsets unchanged: every take kept its
length). Only those three clips, their posters, the contact sheet and the generated tables changed.
- **credits**: god's lament in Chinese on a phone-filmed CRT (neon-green extrusion, scanlines, curved glass,
  glare), the roll dividing into a rash, ending on the tube switching off.
- **tower** ("disconnected"): the dish broadcasts rotoscoped pigeons in waves, tracked in numbered boxes; the
  meters and scribbles are gone; the blue screen's text is new.
- **earth** (was **radar**; id, clip and CUT entry renamed, name "the world, spun out" — the owner's to change):
  the Earth on NASA maps tumbling four turns a second, through motion blur, rolling and Harris shutters, a sonic
  boom and a spiral into the lens. Its poster is 4.6 s in (`"poster"` in scenes.json, new: the middle frame
  is a torn one); `bake_motion.mjs --only` now takes a comma list.
- `tools/motion/credits.mjs` maps the new CREDITS.md rows (the pigeon clip → tower, NASA's maps → earth).
- NOT redone: `film.mp4` (the whole film on the page) still carries the old credits/tower/radar for the
  0.1–0.35 s each appears in it; re-render the film to bring it in step.

# 20 · No music; the Earth engraved; roots under the dish (2026-09-27)

By instruction, in the piece first (its HANDOFF.md, round 11), then every work re-baked from fresh sandbox renders
(clean, montage, flower, sky and the film), so every clip on the page now carries the piece's sound design with no
music at all (the owner will score it later). `tools/motion/sandbox_takes.js` lost its music too (the flower cuts'
pads, bells, plucks and choir; the sky take's hum). Clips that were only music are now near silent ("clouds").
- **earth**: a black-and-white globe engraved on its own surface, fixed dead centre and spinning about its own
  axes, against photographic star trails. **tower**: a real dug-up root system (Datura, CC BY-SA) hangs under the
  dish, creeping. The credits list gained the root photo and lost the unused music recordings (CREDITS.md now marks
  them "no longer in the cut", which `credits.mjs` skips).
- Because every clip was re-cut from current renders, the other works show the piece as it is now, and `film.mp4`
  is the current film (same timeline: CUT unchanged).

# 21 · One page on every screen; holes that print themselves (2026-09-27/28)

By instruction, after one question round ("fit whole window", "rebuild all holes"). Commit
`6590738` ("dither-hole-fixes"), plus the owner's own commits after it.

**The page is the laptop's window, scaled to fit.** `--u` (site.css) is now the smaller of
width/1512 and height/867 above 860 px, every `.plate` is 1512 design px wide and centred, and
`designPx.js` also rewrites `vw`/`vh`/`lvh`/`svh`/`dvh` to shares of the reference window
(`--vw` = 15.12 design px, `--vh` = 8.67) except 100 and 50. Measured headless at 1512x867,
2560x1277, 1920x969, 1512x982 and 1280x720: every checked element (home name and window, the
experience/projects/photos/contact headings and rows, the nav, the USB figure, the motion wall)
sits at the same fraction of the page sheet to three places, and experience, photos and contact
no longer scroll anywhere. `mew.js` `characterPx()` measures in design px and multiplies by the
design pixel, so she grows with the page.

**Home never scrolls on a desktop.** It scrolled by 157 design px on every screen: the owner had
moved the whole `.deck-in` column (translate -194/208, editor id `deck-in-w257`), and that
column was `flex:1`, as tall as the page, so its empty foot went past the bottom (a transformed
box counts towards the scroll). `#s0 > .deck-in { flex:none }` and `#s0 { height:100lvh;
overflow:clip }` at desktop widths. Measured: 0 px overflow at all five sizes.

**The editor's Desktop frame is 1512 x 867** (`REF_W`/`REF_H`), scaled to fit the pane both
ways and centred by hand (a scaled grid item wider than its cell was pushed right). The fold in
the editor is the laptop's fold.

**Every hole prints its own sky** (`deck.js`, rewritten; `pressgl.js` gained `uOrigin`/`uZoom`,
`doc = (vp + uOrigin) / uZoom`). The cause of the owner's report -- icons and holes lagging and
separating on a fast scroll or a zoom -- was structural: the sky was one fixed canvas redrawn
from `scrollY` on the next frame, while the page scrolled on the compositor. Now `bind()` puts a
`canvas.hole-cv` in every `[data-ap]`, `[data-icon-ap]` and `[data-sky]` element; each paint
prints each on-screen hole into the top-left of the full-screen buffer (scissored, tiled if
larger than the window) and copies it across in the same task. Holes are not redrawn on a
scroll. `#sheet` is hidden at rest and drawn only during a crossing, with no holes in it.
The plate is in design px (x from the page sheet's left), so a hole shows the same weather on
every screen; the router's scroll carry divides by `deck.scale`.
- The project icon is no longer a punch: `.pcard-ap` sits over the picture (z 3), its canvas
  masked to `--glyph` and faded by `--open` (written by `deck.setMaskHole`), the white glyph
  below it the same square. The two-layer punch mask on `.pcard-cut` is gone.
- The lens: `.deck-hole { overflow:hidden }`, canvas `border-radius:50%`, inside the ring.
- Checked headless (SwiftShader) at 1512 and 2560: the home window, the lens and the hovered
  icon print (ink in the canvas), closed icons stay white, an off-screen icon is not printed,
  no console errors. NOT seen: a live fast scroll or a browser zoom (the pane cannot scroll),
  and Safari.

**The owner's changes after that (2026-09-28), recorded here:**
- Copy and names (editor and hand): the projects are now titled "Digital Motion graphics"
  (slug `motion-graphics`), "Laser Processing" (`usb-provisioning`), "Softshield"
  (`rcmp-encryption`, "PROTECTED B") and "iclicker"; new kind lines, years, card media
  (`card-*.mp4/webp`, `Softshield.png`), experience rows (RCMP, Surrey BC), the home bio
  ("Software Developer for the Government of Canada (RCMP)"), the 404 headline, the contact
  email and a real LinkedIn handle. Many new `data-e` ids and `edits.css` rules.
- Commit `73b0729` is titled "Home on phone broken": the owner flagged the phone Home layout as
  broken. Not investigated here.
- Vercel Web Analytics and Speed Insights (`@vercel/analytics`, `@vercel/speed-insights`) are
  injected at the top of `src/main.js`; Vite went from ^5.4 to ^8.3.1.
- Photos imported: 20 photography pictures, no reel pictures yet (`photoassets.js`, 6.2 MB in
  `src/assets/photos/`). With an empty reel the card shows the photography only.
- **OPEN: two failing checks.** The USB sheet's DISCLOSURE note was reworded (commit `87d737d`)
  and no longer carries the two sentences `test/sim.test.js` looks for, so `npm run test:sim`
  is 1068/1070 ("...and it still says what is NOT on the sheet", "...and what the engraving
  figure runs instead"). The stand-in-serial check still passes. The owner decides: restore the
  sentences or authorise a test change (CLAUDE.md, Security).

# 22 · The editor's text and visibility, the photos card, and the home alignment (2026-09-29)

By instruction, no question round (the owner's list was specific). Supersedes §18 on the photos card
and §12/§17 where they describe hiding and text matching.

### The editor
- **Show on: Desktop / Tablet / Phone** replaces "Hide at this size (and smaller)". The old box wrote
  `display:none` into a breakpoint bucket, which cascades DOWN, so hiding the laptop's words hid the
  phone's too and words written for the phone could never be shown there while the laptop's stayed
  hidden. Visibility is now a set of devices (`shared/editsCss.js`: `DEVICES`, `hiddenOn`, `setHidden`),
  written as `display:none` under each device's own width range in `@hide d|t|p` sections at the foot of
  `edits.css`. Nothing has to know an element's natural display. An older bucket `display:none` is read as
  hidden-below and folded into the new form the first time the element's switches are touched.
  Delete's "Hide here only" is now "Hide on <this device> only"; Insert has **Only on <device>** (on by
  default when Tablet or Phone is being edited).
- **"appears 2 times in the source and 1 time on the page"**: the count of how often the page draws a
  string was taken from the DOM as it is NOW, so as soon as one of the two RCMP rows had been edited it no
  longer said the same and the pair could not be told apart. It is counted from each leaf's words as the
  page first drew them (`ed.snapshotPristine`, before unsaved edits are replayed). If the counts still
  disagree the editor asks which occurrence, with its line, instead of refusing.
- **"assembled by code" on "back to the start"**: markup was compared literally, and a browser re-spells it
  (`data-route` -> `data-route=""`). Comparison is now `canon` (tags reduced to their names, entities
  decoded). The write is a patch (`mergeInner`): only words are replaced and the original tags stay as
  written, so an edit no longer rewrites the syntax around it. A retyped run in a contenteditable no longer
  leaves `<span style="letter-spacing…">` or `<b>` behind (that is how the USB headline got its inline style).
- Also fixed: a project's `slug` counted as a second occurrence of its title (`stringNodes(ast, { content })`
  skips code-name properties and comparisons); "kind · year" is now two editable pieces, not one refused
  block; a stray literal "null" under the sky inks; `ED_STAGE` lets a second editor run without emptying
  the first one's uploads. Verified by scanning every text element on all ten pages: what is left refusing
  is the motion page's generated credits and the 404's path.
- NOT verified in a browser with a real pointer: the Show-on buttons by click (checked by calling the same
  handlers), and Safari.

### The photos card
- **The folders are the list.** `src/assets/photos/reel/` and `photography/`; `photoassets.js` is a
  `import.meta.glob`. The site no longer breaks when a picture is deleted (a stale generated import did,
  with "Failed to resolve import ...reel-img-0536-640.webp"). A file's name carries its shape and lightness:
  `<id>_<w>x<h>_l<0-100>_<edge>.webp`. `tools/bake_photos.mjs` writes those files and nothing else (no
  generated code, no print files); `photos-source/.baked` remembers what it made so a picture you
  removed is not baked back; `--restore`, `--prune`, `--all`, `--dry`; `npm run photos`.
- **The photography is one justified block** (`photolayout.js`): rows and "features" (one large picture with
  a stack beside it) that are exact rectangles the column wide, so the block has one gutter and no gaps and
  nothing is cropped. Where the breaks go is a dynamic programme (after Knuth-Plass, as photo sites do)
  over a short ladder of sizes, with a seeded shuffle tried 120 ways and the fittest kept; the seed is the
  file names, so a folder is the same page every visit. Large pictures are the light ones (relative
  lightness, so a night set works).
- **The life pictures hang in the margins** (2 staggered columns a side, ~70-100 design px wide, dealt
  round the block's spreads and scaled so all of them fit) and become a justified strip after each spread
  on a tablet or phone. The layout is re-dealt if the window crosses a breakpoint. The strip that drifted
  across the top of the card is gone (it was slow, could not be got through, and read as a banner).
- **The print is a colour map, not a dither**: an SVG filter built from the palette (ink A carries the
  dark, ink B the upper mids) over the picture itself, with a fine screen on top, so a face is still a face
  before you hover. No `-print.webp` files. The reel has a 320 px copy (the margins are ~100 px wide).
  Without hover, the snapshots in the middle band of the window show their photograph.
- Checked headless at 1512, 768 and 390 with the real 20 + 50 pictures; the build is clean.
  NOT seen: a real pointer hover, Safari, a real phone.

### Home
Measured (design px, 1512x867): the greeting, name and bio, the window and the nav rule shared no edge
(window top 165 against text top 234, window bottom 703 against text bottom 562, the window 38 px from the
long bio line and 338 from the name, margins 181 and 236, the nav rule ending 80 px from the window). Now:
the name's ink top is the window's top edge (165), the last bio line's baseline is its bottom edge (703),
the window starts where the nav's rule ends (1008) and both side margins are 156. Written into `edits.css`
(translate only). The tablet and phone buckets are untouched.

**Home on a phone (<=560, added the same day).** The laptop's page kept, not shrunk: words on the left,
the tall window on the right, the name hanging from the window's top edge and the bio's last line on its
bottom edge. It is layout, not translates (a phone is 320 to 430 wide, a translate is one number): a
two-column grid in `site.css` ("HOME ON A PHONE"), the row as tall as the window (`aspect-ratio:2/5`,
46% of the column), the text column stretched to it, the bio pushed to its foot (`.name + .bio
{ margin-top:auto }`), the whole group centred in the card, both edges on the nav rule's 28 px. Type sizes
and the reset of the laptop's translates are in the phone section of `edits.css`; the name is `17.8vw`
because "Ryan" is 2.12 em wide and the text column is 144 to 160 px (320 to 390). The old phone rules for
elements that no longer exist (`heading-4ddi`, `label-*`, `text-*`, `link-oar7`, `t-zx0b`) and the
`display:none` on the whole column were removed; the same orphans remain in the base and tablet sections.
The words are the same as on the laptop. Measured at 320, 360, 390, 430 and 560: no overflow, no scroll,
the name inside its column. Not seen: a real phone.

### Tests
`test/sim.test.js` gained checks for the folder list, the block geometry (closed forms), the margins, the
photos markup, the visibility model and the editor's matching. It is 1106/1108: the two failures are the
open USB disclosure sentences (§21), unchanged. The router harness is all clear. (Before this pass the
identifier scan also tripped on the generated photo manifest, whose ids were UUID-named phone exports;
the new photo code holds no ids, and the bake's ledger is `photos-source/.baked`, not a .json, for the
same reason.)

---

# 23 · Sound on the motion-graphics page (2026-10-03)

Only the pool and the clouds speak (by instruction), and the film keeps its score. The other 49 clips
in `src/assets/motion/` were rewritten without their audio track (`-c:v copy -an`: the picture is
byte-for-byte what it was, 4 MB lighter in all). The flag is `sound: true` on a work in `site/motion.js`
(`hasSound(id)` answers for a work or the film). Three things read it: `tools/bake_motion.mjs` (writes a
silent clip with `-an`, so a re-bake cannot bring a track back; `--add ... --sound` for a new work), the
viewer (`motionViewer.js` hides the speaker, `.mgv-snd.is-silent`, and ignores the M key on a silent scene)
and `npm test` (reads each file's `hdlr` boxes). Seen: the speaker hidden on the chrome, science., undercroft
and others and shown on the pool; not heard: playback. The film was left alone because it is the whole
piece, which contains both scenes; silencing it is a one-line change in `hasSound` and a re-cut. The sim
suite is 1111/1113; the same two USB disclosure checks fail.

---

# 24 · The editor wrote one card's heading into another's (2026-10-04)

The experience, projects and photos headings are one line in the shared `shell()` template, so they carry
the SAME `data-e` (`d-xu4x`). The editor's cache of "which string is this" (`textInfo` in
`editor/client/editor.js`) was keyed by that id alone: the first heading resolved answered for the other
two. An edit on Projects was therefore written over the Photos string, a refusal on one page showed on the
next, and the Photos edit that followed was lost. The key is now `page|id`, and a cached answer is also
dropped when the words it was taken for are not the element's words. Checked live: the three headings
resolve to lines 73, 128 and 142, and an edit on each of Projects and Photos gives two ops on two ranges
that survive moving between the pages. The strings in `deck.js` were put back to what the owner typed:
Projects "and this is what i've built.", Photos "and this is my life.". Not covered by `npm test` (the
editor's client has no DOM harness).

---

# 25 · Home and Photos for visitors, the shiny note, the photo arrangement, and wording tests (2026-10-04)

- **Wording tests removed.** The DISCLOSURE checks (the colophon names itself, and two sentences) were
  the only tests of copy; they are gone by the owner's instruction. The identifier scanners stay: they
  test what is in the repository, not what a page says. `npm test` is all green.
- **The shiny note.** `index.html` holds two lines in `.mew-hint` (still `data-e="label-qbzw"`, so the
  owner's position rules apply): "refresh a few times, mew can be shiny!" and "try clicking on mew!".
  `bootMew` sets `html[data-shiny]` ("1"/"0") when it rolls; CSS shows the first on "0", the second on "1",
  and neither before she has rolled (a visit with no Mew shows no note about her).
- **No text selection on Home and Photos** (`site.css`): `user-select:none` (plus `-webkit-`), no
  touch-callout, images not draggable; every other page selects as before. The editor re-enables selection
  inside the words it is editing (`frame.js`, `EDIT_CSS`).
- **Photos arrangement.** Frames are made for a picture (its shape); the editor swaps which picture is
  in which frame (`photoassets.js`: `arrange`, `sanitize`, `compact`; `photos.js`: `data-slot` = frame,
  `data-photo` = picture shown, `root.__ph` = the editor's handle). Frames never change size. The viewer
  pages in the order of the frames on the page. Saved as `src/assets/photos/arrangement.json`, optional
  (a glob), read as well-formed entries only, and tolerant of pictures coming and going; the editor's op
  is `photoOrder` (`plugin.js`), the last one wins at save. Drag in `canvas.js` (`swap` mode). Checked in
  node and live in the editor, including a real save. The viewer's paging order was not exercised live
  (the hidden pane suspends its animations).
- **Mew and the home window.** Each hole prints its sky into a `canvas.hole-cv`; the collector counted a
  canvas as a picture, so the window had been a soft rect (an expensive place to stop) since holes got
  canvases. `colliders.js` now skips `.hole-cv`; a router test pairs it with a control.


---

# 26 · The hyper beam, redrawn (2026-10-04)

By instruction: a completely new beam, the SHAPE of cmzw_'s hand-animated one (a point that opens like a
bullet's nose, a parabolic sheath, lightning coiling round it, a cross of light at the origin), the
COLOURS of regidrago's (a white core in pale pink, white streaks, a deeper pink edge), three impact frames
with stars before the shot (the impact frames are gone since §27), and the paper burning away under it. Only the old TIMING is kept
(`attack.chargeS / expandS / sustainS / fadeS`, which the brain reads too). One question round; the
owner chose all four recommendations: drawn at screen resolution (not through the 4 px pixel pass), the
words stay ON TOP of the burn, the burn heals inside the fade, the impact frames are a ragged burst round
her (not the window).

**Files.** `fx/beamShape.js` (pure: the envelope, the fire and charge clocks, bolts, the star schedule),
`fx/beamMaterials.js` (five shaders since §27: beam, orb, ink lines, stars, shock rings),
`fx/beam.js` (the clock and the geometry), the burn in `site/pressgl.js` + `site/deck.js`
(`setBeamBurn`), and two small hooks in the presentation passes. Constants: `rigConfig.attack`, from
`widthPx` down (`look`, `palette`, `charge`, `impact`, `stars`, `erosion`). `edgeDamagePx` and
`destroyFractionDrop` were deleted: they belonged to the long-gone `fx/destruction.js`.

**Where it is drawn.** Two scenes in `mew.js`, `fxUnder` (beam, rings) and `fxOver` (orb,
lightning, aim line, stars), authored in DOCUMENT px and drawn with an orthographic camera in CSS px
(their roots move by `-scrollY`). The presentation pass draws them either side of her sprite, at the
canvas's own resolution (`render(scene, camera, { under, over, fxCamera })` in `pixelate.js`, `cutout.js`
and the passthrough). They are skipped entirely when the beam is idle. The old beam's planes sat at z=1
under the perspective camera and were foreshortened by it; the ortho camera removes that.

**The canvas is premultiplied** and every beam material blends ONE, ONE_MINUS_SRC_ALPHA with
premultiplied output: a cel fill covers (alpha = its coverage), a glow adds (alpha under its colour). The
old additive blend did nothing on `#FFFFFF` paper.

**The shape.** `envelope(s) = (root + (1-root)·(x/(1+x))^power)·(1 + spread·s/W)`, `x = s/(flare·W)`.
It is 80% open one beam-width out and nearly parallel after (the owner: "not too parabolic"). It exists
THREE times: the JS (`beamShape.js`), the beam shader's `ENV` and the press's `beamEnv`. Checked on the GPU
on 2026-10-04 (both GLSL twins against the JS over 0-2040 px: worst 0.0078, half an 8-bit step; control
with the wrong power: 0.148). Change one, change all three.

**The burn** is the press's own: a beam-shaped opening in the paper, under the type, its edge chewed by
the weather (`dens`) plus two grains of value noise, translucent over the outer half of the way in. Just
outside it the paper is SINGED: the rose screen, and at the very edge both inks overprinted (char). The
beam hands `{origin, dir, reach, width, open, seed}` to `deck.setBeamBurn` every frame in document px; the
deck converts to design px. While a burn is set the full-screen `#sheet` is shown (as for a crossing) and
repainted every frame, but the HOLES reprint only on their own reasons (`paint(now, sy, holesToo)`). A burn
not refreshed for 400 ms is dropped (she slept mid-shot), and `bind()` drops it with the page. At Home's
hour (19:00) the middle of the page is clear sky, so the burn there shows a light tint of dots; fired up
or down it opens onto the cloud bands. That is the print as it is; it was not darkened.

**The impact frames** (REMOVED, §27) were the charge's last `frames/fps` = 0.2 s: negative, positive, negative. Each one is
a new drawing (cut edge: a saw of short teeth plus a few deep shards; one scale of even spikes read as a
flower). Her silhouette is the pixelate pass's `setFlat(hex)`: flat ink, outline included. Stars run from
the frames into the shot (`starSchedule`, seeded per shot).

**Hand-drawn timing.** Edges, lightning and the held width step at `boilFps` 12 (on twos); the flow of
streaks down the beam stays continuous.

**Performance, measured** (headless Chrome over CDP, real GPU, scratch harness not in the repo; frame
times over a whole shot, twice):

| viewport | throttle | worst frame | frames > 20 ms |
|---|---|---|---|
| 390x844 dpr3 | 4x CPU | 16.8 ms | 0 |
| 390x844 dpr3 | 6x CPU | 16.8 ms | 0 |
| 1512x867 dpr2 | 4x CPU | 16.8 ms | 0 |
| 390x844, production bundle | 6x CPU | 16.8 ms | 0 |

The control: before the programs were warmed, the first shot had a **117 ms** frame at 4x (three builds a
program the first time a material is drawn). `mew.js` now calls `renderer.compileAsync` on both fx scenes
and on her own scene at load, and uploads the noise tile; her stars, sweat and >.< face had the same
latent hitch and get the same warm-up (not measured separately). NOT measured on a real iPhone.

**Verified visually** in the Browser pane with a hand-driven clock (rAF and `performance.now` replaced,
then stepped): charge, all three impact frames, the shot, the hold, the fade, desktop and phone, a
horizontal and a diagonal shot. Motion itself was not watched live (the pane does not run rAF unaided).

**Tests.** A new section in `test/sim.test.js` (28 checks, nothing existing changed): the envelope's shape
with a cone as control, the clock ending on the brain's beat, the burn healing, the overshoot, the boil,
the impact frames' order and window, the star schedule's determinism with a control, and the whole effect
driven headless (her silhouette only in the frames' two inks, the burn handed over every frame and
released once). 1153/1153.

---

# 27 · Stars instead of impact frames, the >.< while firing, flicks on text, Mew on Contact (2026-10-04)

Two rounds on the same day; this section is what is left after the second.

**Removed by the owner, every trace:**

- **The wind** (her own blast pushing her back, gust torque on the body, air in the tail's drag, limb and
  ear flutter, the squint, a render buzz). It was built and measured, and on screen it read as jitter; the
  owner's judgement is that her rig cannot make it look good. `behavior/wind.js`, `attack.wind`, every
  reader in the pose layers, the brain's slide-and-hold and its tests are gone, and the fire state is the
  old recoil-and-damper again.
- **All impact frames**: the burst round her (§26), the band along the shot that replaced it, the
  whole-screen mode, the editor's switch for them (store `fx`, the `impactMode` save), the pixelate
  pass's flat silhouette (`setFlat`) and `attack.impact` / `palette.ink` / `palette.flash`.
- **The dashed guide line** (`charge.aimFromS / aimReachPx`).

**What replaced them:**

- **The stars that form** round the origin are kept as they were (`attack.stars`, from the charge's last
  0.12 s into the shot).
- **A row of glints along the path**, in the guide line's place (`attack.pathStars`,
  `beamShape.pathStarSchedule`): waves of small twinkles pop outward from the muzzle, on the LIVE aim,
  from 0.8 s into the charge, every one over before the shot leaves. Drawn by the same star quads as the
  origin's (`beam.js`, `pushStar`).
- **The >.< for the whole shot** (`fx/faceOverlay.js`): a held envelope that follows
  `brain.state === "fire"` (on in `face.overlay.fireInS`, off in `fireOutS` once the beam is done). No
  event is emitted, so no stars and no flail. Checked: amount 1.00 mid-shot, 0 within 0.2 s after.

**Kept from the first round of the day:**

- **Flicks only on text.** The cursor startle (`brain.js`) also requires
  `pathfinder.clearanceAt(pos, radius) < radius`, the aside's own test. The test "a pointer charging her"
  puts a paragraph under her, with a control in open paper.
- **Mew on Contact.** `MEW_PAGES = {home, contact}` in `mewPresence.js`. A page TURN off Contact fades her
  canvas at the router's `FADE_OUT` rate (the `navigating` event carries `fadeMs`), then she sleeps
  (granted on `fadedOut` as well as `mewClear`) and is parked off the nearer side, so her next page gives
  her the side entrance. The crossing back to Home is a return and she flees it as from Home. Checked
  through the real router with a stepped clock. Router presence test updated: Home and Contact present, a
  visit reaching Contact boots her, one reaching neither does not, reduced motion never does.

**A one-frame flicker entering Contact, fixed.** Coming to Contact from any page but Home, she showed
for one frame at the spot she had left before flying in from the side. Her BODY was already parked off
screen; the CANVAS still held the last picture drawn before she slept, and waking removed `.asleep`
before the loop had drawn a new one. The wake now only arms `reveal`, and `renderFrame` removes the class
in the same task as the first frame drawn after it (`mew.js`). Reproduced, then checked, with a stepped
clock: on the frame the canvas is shown again she is off the right edge and nothing of her is on it.

**Tests.** 1159 sim checks + the router harness, all green. The beam section now checks that no impact
frames or guide line are scheduled, the path glints (determinism, window, outward waves, drawn late in
the charge and not before), and the >.< hold (none in the charge, up within a beat of the shot, gone after,
with no flail or startle emitted).
