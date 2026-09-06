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
| **SHEET 1 · THE PLATE** | a two-ink riso print of a sky, running from last light at the top of the document to full night at the bottom | `src/site/sky.js` |
| **SHEET 2 · THE MASK** | bone paper, die-cut. Everything you read is on it. | `index.html`, `src/styles/site.css` |
| **THE ANIMAL** | Mew. The one thing on the page that is not printed. | `src/engine/**` — untouched |

It is a **deck of four cards**, one screen each, read with the arrow keys —
summary, experience, projects, contact — with the three project sheets hanging
off card three as long documents.

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

`sky.js` does what a two-colour press does, in order. Each step is a decision,
and that is where the craft is.

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

- **Ultramarine** (`#2242E8`, the site's own `--blue`) is the absence of light.
  It is the air.
- **Orange** (`#FF6C2F`) does two jobs, which is what a second plate is for.
  Sparse at the top it is the last warm light on the cloud tops; solid at the
  bottom it is the shadow. **Overprinted, the two make night** — `#201A26`, a
  deep plum-black. Two inks is his poster rule; night falling out of their
  overprint is the reason the rule was worth keeping rather than working around.
- **Pink is not available as an ink.** It is Mew's, and nothing else may use it.

**3 · SCREEN.** Each separation is halftoned on its own rotated grid — 45° for
ultramarine, 15° for orange, one ruling (5.2 px) for both, 30° apart so they
form rosettes instead of moiré.

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

## 3. Why it is a still image

The steady-state cost of the ground is **zero**. Not "cheap" — zero. It cannot
stutter, cannot heat a phone, and cannot degrade on an old machine. The only
thing a slow machine changes is how long the print takes to come out.

It comes out progressively, top to bottom, on a 5 ms per-frame budget: ~300 ms
of pixel work at 1400×4400, ~190 ms at 390×4228, spread over roughly 50 frames.
That is not a loading trick bolted on — it is the cheapest correct way to spend
that work without dropping a frame, and it happens to look like a print
developing, which is the honest picture of what it is.

Each aperture is cut the moment the screen has printed past its bottom edge, so
the sheet opens top-to-bottom as the ink lands. **Nine blits for the life of the
page.**

Measured steady state, after the print is finished:

| | cost per frame |
|---|---|
| the ground | 0 |
| scrolling | 0 — no listener, no parallax, no mask to move |
| Mew moving | 0 — she no longer carries a hole, so she no longer dirties the sheet |

Registration is a property of the geometry, not something a handler maintains:
the print is one offscreen canvas at document size, and each aperture holds
document-positioned pixels at a document position. `background-attachment:fixed`
would have been the obvious way and is both broken on iOS and a repaint on every
scroll tick.

---

## 4. Every element, and why it is there

Nothing here is decorated. Everything is **labelled**, and every label is
**true** — the screen angles, the ruling, the misregistration, the hole count
and the percentages are the constants the renderer actually uses. Fake metadata
as composition is his move (`RYAN.txt` V); real metadata as composition is the
same move, kept honest.

### THE IDENTITY SYSTEM

Ultramarine is the **constant**. It is the site's ink, it is the air in every
plate this press ever pulls, and no project may own it. What a project owns is
the **second ink** — one variable in a fixed process, which is a system rather
than a palette.

| project | pair | why |
|---|---|---|
| usb-provisioning | `#16305C` navy + `#23262B` near-black | the colour of the hardware it writes to |
| closet | `#2C2D31` + `#78797B`, two greys | no chroma — the value range his own wardrobe measures at |
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
  25%, and yellow/green/graphite/orange become unmistakable.
- Each frame is pulled with its own **seed**. Four frames from one field with one
  seed is not a system, it is one photograph recoloured four times.

### 00 · SHEET — 19:00
- **One tall slot, right of centre.** The sun is off the top-right of the print;
  this is the aperture that has to hold the last warm light.
- **Type in three corner clusters, middle-left open.** Mew spawns at 72% width.
- **`two inks, / one animal, / and the light going out`** — the whole site
  described, and every noun in it is literally true.
- **The headline is capped at 14ch of its own face**, so the line breaks land
  the same way at every viewport and it can never reach the aperture at 57%.

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

### 02 · STATEMENT — 23:00
- **The dialog box.** He says soft things inside system chrome (`RYAN.txt` IV) —
  this is that, built rather than quoted.
- **The icon slot is a hole.** Where an alert puts a warning triangle, this puts
  the sky. That 44 px square is the most important element on the page.
- The last line — *"If you can see how a thing was made, it was made by
  someone"* — is the bridge between his two boards, and it is the reason the
  rest of the sheet insists on showing its process.

### 03 · COLOPHON — 01:00
- **A full-bleed horizontal band: the horizon.** The site ends on a line.
- Four columns of real metadata. Two numbers in them are measured at runtime:
  the paper percentage and the ink coverages.

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
through each project card, and the disc the back control is made of are all the
same idea — the field showing through where something opens onto it.

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
  with a 2.5 s watchdog. A page that renders one project's markup badly is a bug;
  a page that renders nothing at all is a dead site.

### Colliders — there are none

She used to collide with the headline, the index, the spec column, the dialog and
the colophon columns, so that she never sat on text you were reading. That is
gone, by instruction: **`data-collider` appears nowhere in the site markup any
more**, so the tracker collects an empty list, the pathfinder grid is uniform and
she flies straight through everything.

Worth knowing that this is markup, not engine. The whole collision system —
`physics/colliders.js`, the cost grid, the squeeze surcharge, the push ramp, and
the 826 checks that hold them — is untouched and still correct. Putting
`data-collider` back on an element turns it back on with nothing else to change.

---

## 5. Narrow

Below 860 px a plate stops being a four-corner composition and becomes a column,
in the order the sheet is meant to be read: header, hole, caption, statement,
footer. The apertures keep existing and keep meaning the same thing; they turn
from a slot into a band, because a 98 px-wide slot on a phone is a stripe, not a
window.

The only thing dropped is plate 02's two callouts, whose whole job is to point
across a wide composition. Their words move into the caption underneath, so no
information is lost.

---

## 6. Things to protect

- **Type never sits on the print.** This is the rule that makes the build
  readable where three previous ones were not.
- **Pink is Mew's.** No other element may use `--mew`.
- **Every label stays true.** If you change the ruling, change the caption.
- **The ground stays still.** The moment it animates, it is a running function
  again and the whole argument collapses.
- **`src/engine/**`, `rigConfig.js`, the Python tooling and the 661 checks are
  Mew's and are not to be touched.**

## 7. Files

```
src/site/sky.js       the press. form -> separate -> screen -> register.
src/site/deck.js      the mask. pulls the print, cuts the holes, runs any other
                      press the page needs off the same 5 ms budget, tracks Mew's.
src/site/projects.js  the work, and the second-ink identity system.
src/site/content.js   the words: bio, roles, socials, card media.
src/site/chrome.js    the furniture that does not turn. Outside #doc.
src/site/cards.js     the card hover: one tween, one masked hole.
src/site/iconatlas.js GENERATED by tools/bake_icons.mjs.
src/site/router.js    going through the hole. History API, page scopes, watchdog.
src/site/pages.js     sheets other than the home sheet.
src/styles/site.css   the sheet. two type sizes, one chroma, layer order at top.
index.html            the four sections. every block carries its reason.
```

## 8. Still to come

Each project page gets **its own concept**, developed one at a time and none of
them brainstormed before the previous one is finished. Until a project's own
sheet is set it renders the shared chrome plus a dialog that says plainly that
the page is set but not printed — an honest empty state, in the register the
statement plate already uses.

`window.__DECK__.debug` exposes `{ press, aps, pw, ph, raf }` for devtools.
