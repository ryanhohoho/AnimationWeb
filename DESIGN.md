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

It is **one** sheet, not five. The sections are numbered because they are
sections; the header carries how far down the sheet you are in real document
pixels (`844 / 3,391`), measured at runtime. Five "SHEET n OF 5" labels were a
lie about a document that scrolls continuously, and they are gone.

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
| Mew's aperture, moving | 0.016 ms |
| Mew's aperture, stationary | 0.001 ms |

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

| project | second ink | why |
|---|---|---|
| iclicker | `#FFC400` signal yellow | the colour a system uses to say it is listening |
| canvas | `#00A95C` terminal green | the colour of the shell it was found from |
| engrave | `#3A3F4A` graphite | the colour of the media it writes to |
| closet | `#FF6C2F` riso orange | the sheet's own ink — this one is not separate from the person |

This is also the only way four differently-coloured frames can live on a sheet
whose whole discipline is "one or two inks": **the gate shows one at a time**, so
you never see more than one second ink at once. The colour becomes the thing
that changes rather than a thing that accumulates.

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

### 01 · WORK — 20:40 · THE GATE
The work does not sit in a grid and it does not sit in a carousel. It runs
through a **gate**: one hole in the sheet, fixed, with the project plates
advancing behind it one at a time — which is what a projector is, and
"PROJECTOR / EDEN" is one of the posters this whole sheet is descended from
(`RYAN.txt` V).

- **Why a gate and not four windows.** A grid gives every project the same weight
  and asks you to compare them; a gate gives you one and asks you to look at it.
  It also keeps the one-or-two-ink rule (see above). And a hole that things pass
  through is the same object as the rest of the page — nothing new had to be
  invented to hold the work.
- **The hole never moves.** That is the whole difference between a projector and
  a carousel, and it is why the composition of this section is fixed while its
  content changes.
- **The transport** — an advance hairline that fills over the 6.2 s dwell, and
  four numbered stops — sits directly under the gate, because it belongs to the
  hole and not to the caption. The bar exists because the gate moves on its own,
  and a thing that moves on its own without warning has taken the page away from
  you. It pauses on hover and on focus, and nothing runs at all while the section
  is off screen.
- **Everything that moves here is one transform.** The film is a `translate3d`,
  the bar is a `scaleX`. Nothing is measured per frame.

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

### Mew's aperture (`#halo`)
She is the only thing that can open the sheet **without a die**, so she carries a
small soft-edged hole with her. It shows the *same print at the same document
position* — that is the entire difference between a cut and a spotlight. Soft
edge, because no die.

This is `RYAN.txt`'s closing sentence built as a mechanism rather than written
as a caption: *a quiet, exact, instrumented surface, mostly empty, with a field
underneath it that only becomes visible where something alive passes through.*

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

### Colliders
Mew collides with the display headline, the index, the spec column, the dialog,
the colophon columns and plate 02's aperture. Two reasons, both functional: she
never sits on text you are reading, and the die-cut holes read as physical
objects with edges.

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
src/site/gate.js      the projector gate: four plates, one hole, one transport.
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
