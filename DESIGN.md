# DESIGN — v4, "two sheets and one animal"

Read `RYAN.txt` first. This file only says what was built and why every part of
it is there. If you are picking this up cold, also read `STATE.md`.

---

## 0. The lesson that produced this build

Three grounds were rejected before this one. The useful signal was not "no
generative grounds" — it was this, in his words:

> the field lines looked like no effort was made graphically and they are simply
> a mathematical function. No shaders, filters, aesthetics. They exist just
> because. There is no aesthetic purpose to them.

So the rule this build is designed against:

**A ground must be a made thing, not a running function.** The craft has to live
somewhere a person chose — in a separation, a screen angle, a lighting model, a
misregistration — and not in the fact that maths is happening on screen.

The second signal: he loved the dithered sky most and disliked it for three
specific reasons — it covered 100% of the surface, it made type unreadable, and
it was so filtered it stopped looking like a sky. All three are fixed here by
one structural decision rather than by tuning.

---

## 1. The object

The page is **two sheets of paper and one animal.**

| | what it is | where |
|---|---|---|
| **SHEET 1 · THE PLATE** | a two-ink riso print of a sky, running from last light at the top of the document to full night at the bottom | `src/site/pressgl.js` |
| **SHEET 2 · THE MASK** | bone paper, die-cut. Everything you read is on it. | `index.html`, `src/styles/site.css` |
| **THE ANIMAL** | Mew. The one thing on the page that is not printed. | `src/engine/**` — untouched |

It is a **deck of five cards**, one screen each, read with the arrow keys —
home, experience, projects, photos, contact (photos joined on 2026-09-27) —
with the four project sheets hanging off card three as long documents.

That is a change of shape, and the reason is worth stating plainly because it
overrides an earlier argument in this file. The previous build was one tall sheet
with a projector gate on it. A gate shows you one thing, holds it, and moves on
its own: right for something a reader is meant to LOOK at, wrong for something a
hiring manager is skimming to decide whether to keep reading. **The work has to
survive being skimmed.** Four cards and two arrow keys is the whole site in about
forty seconds, and the argument is still there underneath for anyone who opens a
project.

What did not change is everything the sheet is made of. Same press, same two
inks, same die-cuts, same animal. It is the same object, cut into cards.

This is not a metaphor imposed on the work. It is `RYAN.txt` II stated as a
mechanism: Board A is the restrained surface he presents, Board B is the
saturated thing underneath. **The bone sheet is Board A. The print is Board B.
An aperture is where you reach through.** Board A is 89.4% of the page.

It also fixes all three complaints at once, structurally:

- **Coverage.** The print is only visible through holes, and the holes are 10.6%
  of the sheet. It cannot be busy.
- **Legibility.** Type never sits on tone. Not "mostly" — never.
- **"It doesn't look like a sky."** It is screened, not dithered. A halftone
  preserves tone; a dither destroys it. And the clouds now have a lighting
  model, which is the step v2 skipped.

---

## 2. The print, step by step

The press does what a two-colour press does, in order. Each step is a decision,
and that is where the craft is.

It exists twice and that is deliberate: `sky.js` is the CPU implementation and
is still the reference — readable, steppable, testable — and `pressgl.js` is the
one that actually runs, the same sequence as a fragment shader that also cuts
every hole in the same pass. The two are checked against each other.

**1 · FORM.** An atmosphere ramp, a warm bloom where the sun has just gone down
off the top-right, and a deck of cloud with real lighting — lit on the side that
faces the light, dark on the side that doesn't, tied to the sky behind it so it
can never go black at dusk or glow at 1 AM. The lighting comes from the gradient
of the density field, which is free because the neighbours are already in the
array.

Three numbers in here were fought for and are worth protecting:

- **warp 0.85, one level.** Stacking domain warps — the thing every shader
  gallery does — turns cloud into marbling. Marbling is not weather. The first
  pass of this file used 2.6 and looked like oil on water.
- **ANISO 3.9**, anchored in pixels rather than in normalised coordinates. A
  cloud is about four times wider than it is tall; an isotropic field gives
  vertical streaks. Deriving the vertical frequency from the aspect ratio works
  at 1400×4400 and produces horizontal stripes at 390×4220.
- **one cloud band per plate.** Coverage runs on a cycle of exactly one viewport
  so every plate has weather across its middle, where its aperture is. Without
  it, whether a hole lands on cloud is luck, and half of them came up empty — an
  aperture full of flat tone reads as a paint chip, not a picture.

**2 · SEPARATE.** One grey image, two ink densities.

- **Cerulean** (`#005A7D`, the site's own `--ink-a`) is the absence of light.
  It is the air. It replaced an ultramarine at `#2242E8`, and the reason is in
  §4: this one is shiny Mew's own hue, and the old one was 24° off her — far
  enough to be a different blue and close enough to read as hers rendered wrong.
- **Her rose** (`#CF69AB`) does two jobs, which is what a second plate is for.
  Sparse at the top it is the last warm light on the cloud tops; solid at the
  bottom it is the shadow. **Overprinted, the two make night.** Two inks is his
  poster rule; night falling out of their overprint is the reason the rule was
  worth keeping rather than working around. It was an orange (`#FF6C2F`) for the
  same reason the blue was an ultramarine, and it moved for the same one: 56°
  off her pink is a second near-miss, and two near-misses are not a palette.
- **`--mew` itself is not available as an ink.** The rose above is her colour as
  the press pulls it; the flat `--mew` is her, and nothing else may use it.

**3 · SCREEN.** Each separation is halftoned on its own rotated grid — 45° for
the first ink, 15° for the second, one ruling (5.2 px) for both, 30° apart so
they form rosettes instead of moiré.

The dot radius is the one number in the file with a right answer:
`sqrt(d/π) = 0.5642·sqrt(d)`, ramping to the cell's half-diagonal `0.7071` as
the dots close up past d = 0.785. Using 0.7071 flat — the obvious thing to
write, and what this did first — lays down **1.57× the ink the separation asked
for**. Every tone came out over-inked and the highlights printed as slabs.

**4 · REGISTER.** The orange plate is offset by (+1.0, −0.7) px. Nothing else in
the file says "a person made this" as loudly as a misregistration.

**Measured output at 1400×4400:** ultramarine covers 47%, orange 19%. The
colophon reads those off the render at runtime rather than asserting them.

---

## 3. It stopped being a still image, and here is the deal that made that safe

**This section used to be called "Why it is a still image", and every number in
it was about the CPU press.** That build printed the whole document once into an
offscreen canvas, progressively, on a 5 ms per-frame budget — ~300 ms of pixel
work at 1400×4400 spread over about fifty frames — and then cost literally zero
per frame forever after. Nine blits for the life of the page. `sky.js` still
does exactly that and is still the reference implementation.

What ships is `pressgl.js`, which draws the entire sheet — paper, print, and
every hole — in **one fragment shader pass**, from a 120 KB density sheet. That
buys the thing the still image could not have: the clouds MOVE. Weather, at
20 fps on a 16-second loop, which is about 0.6× the speed of the source clip
because a printed animation is shot on twos or fours and 60 fps of halftone
boils.

The rule that made it safe to give up "zero" is that the cost is **bounded and
gated**, not that it is small:

- **The lattice does not move.** The halftone is a property of the PAPER and is
  computed from document position, so the dots stay put and the weather moves
  behind them. A moving screen is what makes generated texture look generated.
- **The deck repaints only for a reason** (`deck.js`): a scroll, a hover, a
  navigation, or a tick of the cloud clock — and it holds a `dirty` flag rather
  than assuming. Off screen, the rAF stops entirely.
- **A reader who asked for less motion gets the still image back**, exactly:
  the cloud frame is held, so there is no tick, so the deck repaints for real
  changes only. That is not a degraded mode — it is this section's original
  argument, still available, for the people it was really for.
- **The scissored passes are three thousand fragments against a million.** The
  two discs are drawn by the same shader into their own small canvases, which is
  what lets a control be a window without being a hole.

Registration is still a property of the geometry rather than something a handler
maintains: everything is positioned in document pixels and the shader is handed
the scroll offset as a uniform. `background-attachment:fixed` would have been
the obvious way and is both broken on iOS and a repaint on every scroll tick.

---

## 4. Every element, and why it is there

Nothing here is decorated. What is labelled is labelled **truly**. But spec
notes are not a style to add: the owner does not want them (2026-09-26, "I do
not wish for these stylistic notes to be in theme with my portfolio"). Do not
add counts, running times, aspect ratios, frame rates, "PLATE"/"FIG." tallies or
dates as decoration to any page; a label names a thing a reader needs, and that
is all. The annotation register in `RYAN.txt` V is what the owner SAVES, not
a direction for these pages. (What is already on the older sheets stays until
the owner says otherwise; nothing new of that kind is added.)

### THE IDENTITY SYSTEM

Cerulean (`#005A7D`) is the **constant**. It is the site's ink, it is the air in
every plate this press ever pulls, and no project may own it. It is also **shiny
Mew's own hue** — she renders at OKLCh h 241 through the real light rig and this
is h 233.7, measured on screen — which is why it replaced an earlier blue at
h 267: 24° off her is far enough to be a different blue and close enough to read
as hers rendered wrong. What a project owns is
the **second ink** — one variable in a fixed process, which is a system rather
than a palette.

| project | pair | why |
|---|---|---|
| usb-provisioning | `#16305C` navy + `#23262B` near-black | the colour of the hardware it writes to |
| motion-graphics | `#1F24D6` + `#B3122E`, ultramarine + crimson | the two inks the piece engraves its eye and flower in |
| iclicker | `#3576C4` blue + `#4FAEA6` teal | the system's own colour, used to describe the system |

(These are the three in `site/projects.js`. A project owns its whole sky now, not
just the second plate — an earlier version of this table listed four projects and
a single second ink each, and both of those things changed.)

This is also the only way three differently-coloured windows can live on a sheet
whose whole discipline is "one or two inks": **only the icon under the pointer is
open**, so you never see more than one pair at once. The colour becomes the thing
that changes rather than a thing that accumulates. The gate used to enforce that
with a timer; the cards enforce it with the reader's own attention, which is
better because it is theirs.

Two mechanical notes that took real tuning:

- On the sheet's own print the second ink is strictly *light and shadow*, which
  is correct for a sky and useless for telling four projects apart — it lands
  almost entirely where ultramarine is already solid, and two complementary inks
  overprinted make grey, not identity. A project plate therefore also puts its
  ink **on the lit cloud tops** (`identity: 1`), the one place a second ink can
  be seen as a colour rather than as a darkness. Second-ink coverage goes 17% →
  25%, and navy, two greys and teal become unmistakable as three different
  skies rather than three shades of one.
- Each frame is pulled with its own **seed**. Four frames from one field with one
  seed is not a system, it is one photograph recoloured four times.

### 01 · SUMMARY — 19:00
- **One tall slot, right of centre.** The sun is off the top-right of the print;
  this is the aperture that has to hold the last warm light, and it is the one
  card that keeps a whole window. It is also where the reader is TAUGHT what a
  hole in this sheet is, because pressing on opens exactly this rectangle and
  takes them through it. After that the rest of the deck can turn like pages.
- **Type in one column**, left-aligned, centred in the page, with the hour alone
  in the top-right corner. Mew spawns at 72% width and nothing here is a
  collider, so the composition can be this tight without ever trapping her.
- **The headline is the name.** An earlier version set `two inks, / one animal,
  / and the light going out` here — true of the object and the wrong first line
  for a portfolio, which has about four seconds to say whose it is.
- **The headline is capped at 14ch of its own face**, so the line breaks land
  the same way at every viewport and it can never reach the aperture at 57%.

### 02 · EXPERIENCE — 20:50 · 04 · CONTACT — 00:15
Two lists, one shell (`pages/deck.js`), because a one-screen card whose renderer
is a dozen lines does not earn a file of its own — three files would be three
headers explaining the same thing. What they share with the summary is the lens:
**one small round cut above the section's own name**, and the only circle on a
sheet whose every other die-cut is a rectangle. You look through it first and
then you read, which is what a lens is for.

Without a hole a card is all paper, and the night walking across the deck —
19:00 on the summary to a quarter past midnight on contact — would be something
the code does that nobody can ever see.

### 03 · PROJECTS — 22:45 · THE CARDS

Three cards, stacked, each a picture with that project's **icon cut clean through
the middle of it**. At rest the cut is filled by a white plate, so the icon reads
as a solid white mark. Point at a card and the plate clears, the sheet's own sky
shows through the shape underneath in that project's inks, and the picture starts
moving. Click, and the crossing opens out of that icon.

- **The card is another piece of die-cut paper.** This is the part worth
  defending: the obvious way to put a project's colour on a card is to tint the
  card. Instead the card has a hole in it, and behind the hole is the same sky
  that is behind every other hole on the site, registered to the same document
  position. Nothing new was invented to hold the work — which is the same
  argument the gate was built on, and the reason it survives the gate's removal.
- **Only the icon under the pointer is open, and that is not a compromise.**
  Three cards each printing their own pair would be six inks on one page, and the
  colour would stop being the thing that CHANGES and become a thing that
  accumulates. The gate enforced one-at-a-time with a timer; this enforces it
  with the reader's attention, which is better because it is theirs.
- **The picture is the only thing that scales.** The hole does not move — it
  cannot, because the deck measured it and re-measuring on a pointer event is the
  one thing this build refuses to do. So the picture pushes forward inside a
  fixed frame. That is the gate's own thesis restated: the hole stays, the plate
  behind it advances.
- **The white plate and the shader hole are one alpha channel.** They are drawn
  by two completely different machines — CSS compositing and a fragment shader —
  and they have to agree on the same edge to within a pixel. `bake_icons.mjs`
  emits both from one buffer, so agreement is structural rather than a thing to
  keep checking.

### FIG. 2 — the command line becoming the interface

(FIG. 1, the played transcript below it, was removed as the outdated demo in
September 2026. The paragraphs below still describe the relationship it had
with FIG. 2, because that is why FIG. 2 is built the way it is.)

The USB sheet documents two command-line tools and could only ever show one of
them: a transcript plays, because a tool whose whole surface is the text it
leaves behind cannot be shown any other way. The second tool — the engraving
generator — now has a desktop UI, and plate 0 of that sheet carries it RUNNING,
under the headline, as the figure the page opens on.

Two halves of one rectangle. Underneath, the real React app: the same
components, the same store, the same stream parsing, fed by stdout the real
generator printed. Over it, a terminal playing the same run's console output.
The terminal is clipped away to the left as the reader goes down a scroll track,
so at half the track they see half of each and at the end of it the interface is
alone.

- **It is the argument drawn rather than described.** The sheet's claim is that
  the manual step came out of a pipeline. A screenshot of an app makes that
  claim; a terminal turning into that app, running the same batch, shows the
  thing the work actually was — the tool did not get a coat of paint, the
  operator got a picture of the jig.
- **The no-framework principle is set aside here and only here.** What is being
  shown IS a React app. A reimplementation would be a drawing of the product
  rather than the product, which is the one thing this sheet cannot afford: it
  is the only page on the site whose figure is evidence.
- **It is a demo, not a loop of a run.** A pass opens Templates, picks a jig,
  opens Generate, chooses the load order, retypes the serial prefix and presses
  the button — then the batches. The script presses the app's REAL controls,
  found by the accessible names a screen reader would use, so a renamed control
  breaks the figure rather than quietly faking it.
- **Nothing in it can be clicked, at any point.** It is evidence, the way the
  transcript below it is evidence, and a reader who can operate it is a reader
  who can leave it in a state that demonstrates nothing. Permanently `inert` —
  which covers the mouse, the keyboard and the accessibility tree, and which a
  synthetic click dispatched at a node passes straight through. That is the
  whole reason the script can reach what the reader cannot.
- **A shadow root, and it is not optional.** The app's stylesheet is Tailwind's
  output and styles `body`; this site's own reset styles every bare element
  right back. Two documents' worth of assumptions in one document, and the
  boundary is what lets both keep theirs.
- **The light behind it is Siri's, inside out.** The edge light Apple
  Intelligence runs round an iPhone falls inward from the glass; this one lives
  behind the window and falls outward onto the paper. It keeps what makes the
  real one read as light rather than a coloured border: colours that wander and
  swell into each other instead of rotating, four bands of falloff rather than
  one, no seam and no corner, and an entry that comes from somewhere — here the
  right, where the interface is uncovered, closing round the frame as the wipe
  ends. It is the one place on the site that is lit rather than printed, and it
  is earned: it arrives with the interface, and only with it. The six colours
  are the editor's to change; Apple's own are the default.

`STATE.md` carries the numbers, the traps and the measurements — the divisor
that made the wipe finish at the wrong moment, the two SVG layers that stopped
a trace repainting 829 paths a frame, and what the whole thing costs.

### The statement and the colophon — folded away

The one tall sheet had two more plates: a STATEMENT built as a dialog box (he
says soft things inside system chrome, `RYAN.txt` IV — built rather than quoted,
with the alert's warning-triangle slot replaced by a hole onto the sky), and a
COLOPHON of four metadata columns closing on a full-bleed horizon band.

Neither survives as a PLACE, because the deck has four cards and neither of them
is one. Both survive as **components** — and most of them are now in use. When
the project sheets were rebuilt as columns they reached for exactly the block
that had been kept for them: `.cols` carries every colophon, `.tab` the measured
run times and the closet's 24-of-24, `.checks` the iClicker claim table (whose
empty last row the stylesheet already describes as "the finding"), and `.fig`
every figure. `site/media.js` was kept unimported on the same argument and
needed no changes beyond a poster when the moment came.

Still unused and still named: `.doc` / `.ring`, `.dialog` / `.dlg-*`, `.side`,
`.spec.wide-col`. Leaving them explained is the difference between a palette and
dead code.

### Mew's aperture — removed

She used to carry a small soft-edged hole with her, and it was the closing
sentence of `RYAN.txt` built as a mechanism: *a field underneath the surface that
only becomes visible where something alive passes through.* It is gone, by
instruction, and the reason is that the sentence stopped being true of the
object. On one tall sheet she was the only thing moving and the hole was how you
knew she was part of the print. On a deck of four cards she reads better
unaccompanied — the halo followed her everywhere and turned her from a thing on
the page into a thing with a spotlight on it.

It had a second cost worth recording: it was the one element dirtying the sheet
on **every pixel of her movement**, so the deck now genuinely idles when nothing
is happening.

The sentence survives elsewhere. The lens above each card's name, the icon cut
through each project card, and the two discs in the top-left corner are all the
same idea — the field showing through where something opens onto it.

### The two discs — the nearest exit is always at the corner

**Superseded (2026-09-25).** The discs, the stitch chart, the phone's arrows and
the keycaps were replaced by one small nav bar at the top middle, by
instruction; STATE.md §13. What follows is the record of why they were built.

Top-left, both of them: a small circle of sky with a white mark on it, painted
into its own canvas by a scissored pass of the same press. **Not holes.** A hole
is cut in `#sheet` at z1, under the type, so every figure and paragraph a sheet
happened to lay over the control went straight on top of it — and no z-index can
fix that, because the pixels are in a layer beneath the words by construction.
Painting the sky up here keeps the material argument (it is still a window onto
somewhere else) and puts the control where a control has to be.

**The corner is always the nearest exit.** On a project sheet that is the back
arrow with home one place inward; on a deck card there is nothing to go back to,
so home takes the corner. One rule, and it is why home is never in the same
absolute place twice and never has to be — it is always the last disc in the row.

The chart in the opposite corner has always linked to `/`, and that was the
answer to a different question: a stitch chart is read as a POSITION, not as an
exit. Three of the four cards had no visible way back to the start.

Two things were measured and thrown away on the way. Giving home a **paler sky**
— it is a window onto the summary, which is printed at 19:00 — puts it at 2.7:1
against its own white mark where the back arrow is 4.2:1, and that pale hour is
the shallow end of exactly the range a sky disc stops being readable in. And
**"01" as the mark** — the deck numbers its own cards, so it is the site's own
language — was mush at 56 px, because two small figures need about twice the
contrast a chunky glyph does. The number moved into the hover label.

### The crossing — going through the hole
You do not slide to another page. **You go through the hole you clicked.**

The frame in the gate is a print, and a print is made of dots. So the transition
scales that frame up until the halftone stops being a texture and becomes a grid
of individual, countable marks — `scale(7.3)` over 720 ms, which puts a 5.2 px
screen cell at ~38 px — and then you are out the other side and a new sheet is
laid down over it.

That is not a flourish. It is `RYAN.txt` III, the thing under every reference he
keeps: *an invisible continuous thing made visible by many small discrete
identical marks*. The whole site is built out of that idea; this is the one
moment where you get to fall into it.

Going **back** crosses on paper instead — a quiet fade. You are not entering
anything, you are returning to the sheet.

Cost: one transform and two opacities, all on the compositor, over a single
574×405 canvas blitted once at the start of the move.

### Routing
It is one document that changes what is printed on it — not because an SPA is
fashionable, but because **Mew is a live WebGL context with physics and a brain,
and a real navigation would kill her and start a new one.** She has to still be
there on the other side, so the sheet changes and the window does not.

**Two kinds of move, because there are two kinds of distance.** A fade is turning
a page: same place, next thing. A crossing is going somewhere. The deck's middle
steps fade; stepping off the deck into a project crosses, and so does the first
step out of the summary — once, because that is where the reader is taught what
the window in the middle of it is for. After that they know, and a 1.6-second
event between two lists of text is a toll booth.

- Real paths (`/projects/iclicker`), History API, `appType: "spa"` for the
  fallback. The home markup ships in `index.html` so the first paint needs no JS;
  the router captures it once as the home template, so there is one copy and no
  drift.
- Every page gets its own `createScope()`, disposed the moment the next one is
  committed. That is the whole leak story for navigation.
- A project page reprints the sheet in that project's pair; going home or moving
  between two pages of the same ink **reuses the print** instead of spending
  300 ms on an identical one.
- `crossing` holds `#doc` at opacity 0, so the commit runs in a `try/finally`
  with a watchdog behind it. A page that renders one project's markup badly is a
  bug; a page that renders nothing at all is a dead site.
- **A watchdog may only speak for its own navigation.** They outlive the move
  that armed them by seconds, and an unguarded one cleared a LATER crossing for
  one frame — which is the whole of the intermittent mid-transition flicker.
  Every move takes a generation number and a watchdog checks it before it acts.
- **A shared link has to land.** These are real URLs and people send them, and a
  static host asked for `/projects/closet` has no file there. The build copies
  the finished `index.html` to `dist/404.html`, which is what GitHub Pages,
  Netlify, Cloudflare Pages and Render all serve for an unknown path, with the
  URL left intact for the router to read.

### Colliders — there are none, and she still gets out of your light

She used to collide with the headline, the index, the spec column, the dialog and
the colophon columns, so that she never sat on text you were reading. That went,
by instruction: **`data-collider` appears nowhere in the site markup**, and it
still does not. Nothing on this page stops her, nothing pushes her, and no route
goes round anything.

What came back is the *reading experience*, without any of the physics that used
to buy it. The tracker now finds the type by itself — an element inside `#doc`
with words of its own, or a picture — and files it as a **soft** rect. A soft
rect is data about where the READING is, not an obstacle:

| | hard rect (`data-collider`) | soft rect (the type) |
|---|---|---|
| pushes her | yes | **no** |
| routes go round it | yes | **no** |
| bumps, flails | yes | **no** |
| expensive to STOP on | yes | yes |

The two already had separate grids in `pathfinder.js`, for an unrelated reason —
a narrow corridor is a miserable thing to thread at speed and a perfectly fine
place to hover — so soft rects reach the placement grid and never the travel
one. She crosses a paragraph in a straight line, because as far as the planner
is concerned it is blank paper.

Three things then do the whole job:

- **She lands off the words.** A trip ends in `settle()`, which asks for the
  nearest point with enough room for the *orbit*, not just for her body. The
  orbit is 55 px and she is 75 across, so a seat that merely clears the column
  swings her back over it every eleven-second lap.
- **She notices.** Sitting in type for half a second — her circle actually
  overlapping it, while hovering — moves the anchor to a roomier seat and sets a
  glance at the words she was covering. No new state and no thrust: the hover
  spring is near-critical and already running, so it comes out as an unhurried
  scoot rather than an errand. Travelling over type never triggers it; flying
  over the words is not sitting on them.
- **She gives up gracefully.** On a phone the widest column is 339 px of a
  375 px window, so there is nowhere with 48 px of room and there never will be.
  A cooldown stops her searching for a seat that does not exist. Measured: four
  anchor moves in a minute, not one per half-second.

Measured over a minute of ordinary life on each of the five real page layouts,
dumped from the running site: **1.7%** of resting time overlapping type, against
**8.3%** with the noticing switched off and **3.7%** with the roomy seat switched
off. Travelling over type is unremarkable and deliberately untouched.

The rest is markup, not engine, exactly as before. The whole collision system —
the escape, the squeeze surcharge, the push ramp, and the checks that hold them —
is untouched and still correct, and putting `data-collider` back on an element
turns it back on with nothing else to change.

---

### The hyper beam (2026-10-04)

Her one attack, redrawn from nothing: the shape of a hand-animated anime beam
and the colours of regidrago's, in her pink. Every part answers to something:

- **It leaves her mouth as a point and opens like a bullet's nose**, then runs
  nearly parallel, because every reference does and a constant bar reads as a
  laser, not as something she threw.
- **It is drawn, not pixelated.** She is a sprite; the light she throws is
  fx, and its streaks and its nose do not survive a 4 px grid (owner's choice).
- **It is cel-shaded and on twos**: hard-edged bands, edges and lightning that
  change drawing twelve times a second, while the flow down it stays smooth.
  That step is what keeps it from reading as a running function (§0).
- **The paper burns away under it** to the sky -- the site's own idea, a field
  showing through where something passes, made violent for one second and
  healed inside the shot. The words stay on top: type still never sits ON the
  print in a way you cannot read past, and the burn's edge is printed char, in
  the press's two inks, not a gradient.
- **Three impact frames, along the shot, not the window.** Negative,
  positive, negative, her as one flat ink, in a cut strip from behind her to
  the window's edge -- the beam's own path, inverted, the way cmzw's frames
  are drawn. Kept off the rest of the page because this is a portfolio and the
  rest of the page is somebody's reading; the editor can switch it to the
  whole window (2026-10-04, by instruction).
- **And then her own blast batters her.** One wind field
  (`behavior/wind.js`) that every part of her reads in its own physics: she is
  shoved back half her height and grips there, the gusts torque a body her
  brace has to haul back, the tail's drag streams and flutters it, the limbs
  and ears flap, she squints into it. Nothing is keyframed onto a limb; the
  air is a quantity and the animal answers it, which is the site's rule for
  her from the first day.

STATE.md §26 has the numbers and the measurements.

## 5. Narrow

Below 860 px a plate stops being a four-corner composition and becomes a column,
in the order the sheet is meant to be read. The apertures keep existing and keep
meaning the same thing; they turn from a slot into a band, because a 98 px-wide
slot on a phone is a stripe, not a window. The lens is the exception and has to
be written as one — `.ap:not(.icon)` is (0,2,0) and beats a bare class, so the
one circle on the site inherited `width:100%` and became a porthole.

**The navigation stops floating and becomes a bar.** The two arrow circles used
to hang at the right edge, vertically centred, which put them on top of every
project card's artwork; a control that sits on the content is a control that
competes with it. Everything moves into one band at the foot, on its own ground,
and the page reserves room for it rather than being overlaid — "scroll a bit
further" is not an answer when the last line is a link.

A **swipe** drives the same `step()` the arrow keys do, and never calls
`preventDefault`: setting `touch-action` would take vertical scrolling away from
a page that genuinely scrolls, so the gesture is only WATCHED and a drag that
turns out to be mostly sideways is read as an intent afterwards. The buttons
stay anyway, because a gesture nobody is told about is a gesture some visitors
never find.

And the card is sized to the **visible** window: `100svh`, not `100lvh`. `lvh` is
the height with the toolbars retracted, so on an iPhone with them showing every
card was about 140 px taller than the screen and the deck's "one card, one
screen" premise quietly stopped being true. `dvh` tracks the toolbar and would
fire a resize, and a resize remeasures every aperture on the page.

---

## 6. Things to protect

- **Type never sits on the print.** This is the rule that makes the build
  readable where three previous ones were not.
- **Pink is Mew's.** No other element may use `--mew`.
- **Every label stays true.** If you change the ruling, change the caption.
- **The ground stays still.** The moment it animates, it is a running function
  again and the whole argument collapses.
- **`src/engine/**`, `rigConfig.js` and the Python tooling are Mew's.** Change
  them only when the change is about her.
- **Every rule in this file that can be checked, is.** No real identifier on the
  USB sheet, no stale icon atlas, no word printed under 4.5:1 — all three were
  paragraphs before they were tests (`test/sim.test.js`).

## 7. Files

```
src/main.js            boot: the world, the press, the routing, the chrome. No
                       three.js in it at all — see the note at its head.
src/mew.js             the engine, behind a dynamic import. 809 KB that the
                       sheet does not need in order to be a finished page.
src/utils/motion.js    does this reader want less of it? One expression, five
                       files, and one of them declines to boot the animal.

src/site/pressgl.js    THE PRESS. Paper, print and the crossing, in one
                       fragment shader, placed on the plate by uOrigin and
                       uZoom (design px). Compiled twice, once per GLSL
                       dialect, from one template.
src/site/sky.js        the same press on the CPU. The reference implementation.
src/site/skyclip.js    the density sheet the clouds are read out of.
src/site/deck.js       the mask. Every hole prints its own sky into a canvas
                       inside its element; the full-screen canvas draws only
                       the crossing. Runs any other press the page needs off
                       the same 5 ms budget.
src/site/router.js     going through the hole. History API, page scopes,
                       generation-guarded watchdogs, the swipe, the live region.
src/site/chrome.js     the furniture that does not turn. Outside #doc.
src/site/cards.js      the card hover: one tween, one open icon (its own
                       glyph-masked canvas over the picture; no punch).
src/site/photos.js     the photos card: the block, the margins, the pale viewer.
src/site/photolayout.js the pure maths of how a folder becomes that page.
src/site/photoassets.js the folders src/assets/photos/{reel,photography} as a list (a glob).
src/styles/designPx.js the design pixel: every px, vw and vh in the stylesheets
                       scaled from the owner's 1512 x 867 window.
src/site/projects.js   the work, and the second-ink identity system.
src/site/content.js    the words: bio, roles, socials, card media.
src/site/iconatlas.js  GENERATED by tools/bake_icons.mjs.
src/site/media.js      captures. No importer yet, and its head says why.
src/site/term.js       a recorded session, played back.
src/site/usbDemo.js    FIG. 2 on the USB sheet: the scroll track, the wipe, and
                       the terminal half of it. The app it wipes away from is
                       vendored, not written here.
src/site/glowField.js  FIG. 2's backlight, the maths: Apple Intelligence's edge
                       light turned outward. Pure; checked in sim.test.js.
src/site/glow.js       ...and the WebGL that draws it. Its shader is a
                       transcription of glowField.js's shadeAt. Colours are the
                       --glow-1..6 tokens, which the editor owns.
src/vendor/xtool-demo/ GENERATED by tools/vendor_demo.mjs. The engraving
                       generator's UI built as a library, its stylesheet
                       rewritten for a shadow root, and the recordings it plays.
src/site/pages.js      routing to a renderer.
src/site/pages/deck.js the four cards that are not the summary.
src/site/pages/sheet.js the two-plate trim EVERY project sheet is cut to. The
                       three project files are only the WORDS.
src/styles/site.css    the sheet. Two type sizes, one chroma, layer order at the
                       top, the print stylesheet at the foot.
index.html             the summary card, and the chrome. Every block carries its
                       reason.

tools/mewMark.mjs      the 32x32 Mew, as text. The tab mark and the link card
                       are both cut from it.
tools/bake_favicon.mjs -> public/favicon.svg + the two pngs
tools/bake_og.mjs      -> public/og.png, set rather than captured
tools/bake_icons.mjs   -> the atlas, the glyph plates, and iconatlas.js (the
                       glyph plates are also each icon's CSS mask now; the
                       shader no longer reads the atlas)
tools/bake_photos.mjs  -> src/assets/photos/{reel,photography}/, from
                       photos-source/ (git-ignored). Strips all metadata.
                       Writes pictures only, never code.
tools/vendor_demo.mjs  -> src/vendor/xtool-demo/. Copies the demo in from the
                       other repository and exits non-zero if the one
                       transformation it makes stops matching.
```

## 8. Outside the window

Three things about this site are only ever seen by somebody who is not looking
at it, and all three were nothing until recently.

- **A shared link.** The card is SET, not captured (`tools/bake_og.mjs`): at the
  ~500 px a preview is seen at, a screenshot of this sheet is a grey rectangle,
  because the halftone dissolves and the animal is 40 px of pink. So the card
  draws the thesis instead — bone paper, a rectangle cut out of it, the one
  unprinted thing standing in the hole. The description travels with the route,
  or a shared `/projects/closet` advertises the front page.
- **A reader who asked for less motion.** The crossings commit outright, the
  entrances land at their end state, the weather holds on one frame, the hover
  video never starts — and the engine is never imported. She wanders, flees the
  pointer, flails and sprays, which is the canonical thing that preference
  exists to spare someone. The argument, and the still-mew alternative that was
  rejected, are in `utils/motion.js`.
- **Paper.** This whole site is a picture of a printed sheet, so it had better
  print. The press comes off, the fixed furniture goes, the absolute
  compositions unpin into a column, and the transcript swaps places with its own
  player — a recording cannot play on paper, and the complete text is exactly
  what a printed case study should carry.

## 9. Still to come

Each project sheet gets **its own writing**, developed one at a time. The prose
is still a placeholder; what changed is that the sheets are no longer only
prose. They are columns now (`pages/sheet.js`) carrying a hero figure, the
evidence the palette was written for, a second figure and a colophon — so the
shape the writing has to fill exists, and filling it is a matter of words and
real captures rather than of layout.

**The media are stand-ins.** Reference art out of `aesthetic-images/`, baked by
`tools/bake_captures.mjs`, and deliberately **uncaptioned**: a figcaption
claiming somebody else's artwork is a screenshot of the tool would be the first
false label on a site whose whole discipline is that every label is true. Drop a
real capture in under the id in `src/assets/media/README.txt` and the stand-in
is gone, caption and all.

A handle in `content.js` marked `placeholder` renders dashed and italic so the
page never claims a link it does not have (the LinkedIn handle is real since
2026-09-28).

`window.__DECK__.debug` exposes the measured state — `holes` (each with its
`kind`, `box`, `seen` and canvas), `mask`, `k` (the design pixel), `stageX`,
`pw`, `ph`, `raf`, `gpu`, `webgl2`, `cross` — plus
`paint(t, scrollY)`, which draws one frame by hand. That last one is how every
visual claim in `STATE.md` was measured, because the preview pane in this
environment never runs the deck's rAF.

## 10. Experimental motion graphics — the page that is not on the sheet

By instruction, one page leaves the sheet behind and wears the look of the work
on it: a near-black ground, the blue grade and ordered dither, misregistered
titles, computer-vision boxes round every frame. Since 2026-09-26 it is a
**showcase of works**, not a breakdown of one film: most of the works were cut
from "let me be a flower", but nothing relates a work to that film except the
film itself, at the foot of the page. More experiments will be added, so the
page is data (`site/motion.js`: one line per work, and where it is shown).

Top to bottom, and why each part is where it is:

- **The head**: the title and one line. No counts or specs (§4).
- **The wall.** The longest, most developed works first and large, then
  everything else scattered smaller. It is a **broken grid** (the editorial
  layout whose columns do not share a baseline): each column starts at its own
  depth, each tile is as wide as its clip is long, and pushed left, centre or
  right with its own air. Order is priority (a tile goes to the shortest
  column, so the first written land highest); the scatter is seeded, so it is
  the same on every visit and re-dealt when a work is added. The columns
  **drift** against each other as the page scrolls and each tile's box **locks
  on** as it arrives -- CSS scroll-driven animations, run by the compositor,
  so the motion costs no script. No headings, notes or dividers.
- **The flower.** "A flower." is one flower through 21 techniques, so it is
  shown as that: one frame pinned mid-window while the scroll steps it through
  the cuts in order, the effects listed beside it with the current one lit
  (the scrollytelling pattern: a sticky stage and steps scrolling past it).
- **Behind the scenes.**
- **The conclusion**: the whole film, centred, then its own timeline (every
  stretch as long as it lasts, coloured by the film's four parts; press one to
  open the film there), then the credits in one small list.

The ground rests on a still of the pixelated pink flower and becomes the work
under the pointer -- only a pointer that moves; following the scroll made it
flicker. The viewer shows the work, its name and one bar laid in the work; on a
computer a drawn X in the corner and a click on the dark around the frame put
it back, and it pages within whatever it was opened from.

## 11. One page on every screen, and holes that cannot slip (2026-09-27)

Two structural changes, both by instruction after a question round.

- **The owner's window is the page.** He lays the site out on a 14" MacBook
  Pro; it was seen on a 27" monitor with the words a third of the size and
  the column drifting. Every px, vw and vh in the stylesheets is now a share
  of his 1512 x 867 browser window (`src/styles/designPx.js`), and above
  tablet width each page sheet is that window scaled to fit the screen --
  width or height, whichever runs out first -- and centred. Every screen
  shows the same composition, where it stops and whether it scrolls; a wider
  screen gets paper at the sides. Mew and FIG. 2's app scale with it. Home
  never scrolls on a desktop.
- **Every hole prints itself.** The sky used to be one full-screen canvas
  behind the page, redrawn a frame after every scroll, so holes trailed their
  elements and a project icon (a CSS punch, the canvas sky, a white plate)
  never quite agreed with itself. Each hole now has a canvas inside its own
  element, printed from the same press, so it moves with the element by
  construction; the icons are glyph-masked canvases laid over the picture.
  The full-screen canvas is kept only for the crossing, which is the one
  thing that has to cover the whole window. The plate is laid out in design
  pixels, so a hole shows the same weather on every screen.

The Photos card (§ in STATE.md, 18 and 22) follows the same rules: the
snapshots of life hung small in the paper beside the work, printed in the sky's
two inks until looked at, and the photography one justified block in the middle.
