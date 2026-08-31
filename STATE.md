# STATE — read this after any context compaction, with RYAN.txt

## The files that matter
- **`RYAN.txt`** — the distilled read of ~200 reference images plus the whole
  collaboration. It survives compaction. **Do NOT re-analyse the image folders**
  — that work is done and the conclusions are in there. He has said so directly.
- **`DESIGN.md`** — what the current build is and why every part of it exists.
- **`HANDOFF.md`** — the Mew engine bible. Only relevant if you touch the rig.

## What he has ACCEPTED (keep)
- The **type system**: IBM Plex Mono, weights 200 and 600 only. Big type thin,
  small type heavy. Two sizes, nothing in between. He called this out by name.
- **Placement/coherence**: corners used, centre empty, tiny type, annotation
  register. "the concept and coherence of the text and placements are
  fascinating."
- **Purpose-per-element**: every object must be explainable — why it exists and
  why it is *there*. Non-negotiable.
- The measured-not-chosen culture (constants derived from artefacts).
- **Mew**, untouched. `src/engine/**`, `rigConfig.js`, the tooling, 661 tests.

## What he has REJECTED, and the real reason
1. **ASCII text field** (v1) — unusably laggy, navigation hidden, black-block
   headings, headings 11× body size.
2. **Dithered procedural sky** (v2) — "incredibly incredibly busy", text
   unreadable, "the sky does not look like a sky since it is so filtered", and
   it represented one or two pins rather than him. **But: "Out of your three
   implementations, I loved the dithered sky the most."**
3. **Iron-filing field lines** (v3) — "I do not like the field lines concept at
   all."

**The reason is NOT "no generative grounds".** He corrected that explicitly:

> Do not think that I purely do not like generative grounds. It is simply that
> the execution of all instances are very flawed and either lag or are visually
> unappealing/distracting.

> the field lines looked like no effort was made graphically and they are simply
> a mathematical function. No shaders, filters, aesthetics. They exist just
> because. There is no aesthetic purpose to them. Remember this philosophy for
> our development.

So the operating rule is: **a ground must be a made thing, not a running
function.** The craft has to live in a decision — a separation, a screen angle,
a lighting model, a misregistration — not in the fact that maths is visibly
happening. Anything is permitted as material: video, photographs, layers,
shaders, 3D objects, camera moves, scroll, game-like, procedural or not. Mew is
liked as the subject; the ground need not interact with her or match her.

## Where v4 landed (current build)
Two sheets and one animal: a **two-ink riso print of a sky** (last light at the
top of the document, full night at the bottom) seen through **die-cut apertures**
in one continuous bone sheet, with **Mew** the only unprinted thing on it, and
she carries a soft hole of her own. See `DESIGN.md` for the full argument.

Key properties: the print is rendered once and never again — steady-state ground
cost is **zero**; type never sits on tone; the sheet is ~89% paper.

Four sections, not five, and no "SHEET n OF 5" — he pointed out that a document
which scrolls continuously should not pretend to be separate pages. The header
now carries the real document position (`844 / 3,391`), measured at runtime.

**00 SHEET · 01 WORK (the gate) · 02 STATEMENT · 03 COLOPHON.**

### The work, and the identity system
Ultramarine is the constant — every plate is pulled in it and no project may own
it. A project owns the **second ink**: iclicker/signal yellow, canvas/terminal
green, engrave/graphite, closet/riso orange (the sheet's own, because that one is
not separate from him). Four differently-coloured frames can live on a
one-or-two-ink sheet because **the gate shows one at a time**.

The work runs through a **gate** — one fixed hole, plates advancing behind it,
with an advance hairline and four stops as its transport. Clicking goes THROUGH
the hole: the frame scales to `7.3×` so the halftone becomes countable marks
(RYAN.txt III), then a new sheet is laid down.

### Routing
Real paths + History API, single document, because Mew is a live WebGL context
and a real navigation would kill her. Home markup ships in `index.html` and the
router captures it once. Per-page `createScope()`. `crossing` holds `#doc` at
opacity 0, so the commit is in a `try/finally` with a 2.5 s watchdog.

## Next: the project pages
Each gets **its own concept**, developed ONE AT A TIME — he was explicit: do not
even brainstorm the next page before the current one is finished and polished.
Until a project's sheet is set it renders the shared chrome plus a dialog saying
it is "set, not printed". Order to build: iclicker, canvas, engrave, closet.
There is an `auto_iClicker/` directory in this repo worth reading when that page
comes up. The Closet thesis is in `Closet/ENGINE_V3_STYLIST.md` and
`Closet/STRATEGY.md`: every wardrobe app maximises similarity with fixed weights
and an imposed outfit size, so it collapses to the closet's centroid; his engine
is HERO → BLUEPRINT → CAST → CRITIQUE → REVISE, and each piece must justify its
marginal contribution — which is the same rule this website is built on.

## Perf facts already established (don't re-measure)
- The print: ~300 ms at 1400×4400, ~190 ms at 390×4228, spread over ~50 frames
  at a 5 ms budget. Nine blits for the life of the page.
- Steady state: 0.016 ms/frame while Mew moves, 0.001 ms when still. Scrolling
  costs nothing — no listener, no parallax, no mask to move.
- A full-screen 2D canvas pass at ~1/5 res: ~0.9 ms median.
- 1,248 stroked segments solving a 7-source field: 0.1 ms. Canvas work was never
  the bottleneck.
- v1's lag came from per-frame CPU over a glyph field + scroll listeners reading
  layout. Never put layout reads in a scroll handler.

## Tooling notes (these cost hours if rediscovered)
- **The Browser pane does not repaint reliably once the page is scrolled.** The
  DOM and `getBoundingClientRect` stay correct while screenshots come back as
  blank paper. Workaround that works: keep `scrollY = 0` and translate `#doc`
  instead — `document.getElementById('doc').style.transform =
  'translateY(-Npx)'`.
- **rAF in the pane is throttled to near zero while the pane is hidden**, so the
  press stalls between tool calls. Drive it manually through
  `window.__DECK__.debug.press.step(...)` when you need a finished print to look
  at. This is a harness artefact, not a bug — the develop path is verified
  working (progress advanced 0→0.6 and the first hole cut itself on its own).
- **Headless Chrome via `--screenshot --virtual-time-budget` hangs** on this page
  (Mew's rAF loop never idles). Don't bother.
- The fastest way to iterate on the print itself is the **Node harness**: stub
  `document.createElement` and capture `putImageData` into a buffer, then write
  a PNG. ~300 ms per full render, no browser involved.

---

## The animated sky (accepted)

**The hole moves; the paper does not.** Each aperture carries a second canvas
with its own WebGL2 context, running the press as a fragment shader
(`src/site/pressgl.js`). The still 2D print stays underneath, so a lost context
degrades to a finished picture rather than a blank hole.

### Rejected on the way here, with the reason
- **A video/GIF in the hole.** A halftone is the worst case a lossy codec can be
  handed: any bitrate that keeps the screen intact is bigger than the frames,
  and any bitrate that doesn't turns the rosette to porridge.
- **Procedural pan.** Noise cannot pan *and* wrap on a small frame budget. A
  seamless loop needs a periodic field, and a period short enough to cross in a
  couple of seconds is a period you can see tiling. A closed drift path wrapped
  perfectly and read as a bob, which was correctly rejected.
- **Pre-rendered JS filmstrips.** Worked, and was the wrong shape: 20 RGBA
  frames per hole turned a free effect into a memory budget and capped it at a
  stepping 6 fps.
- **One shared GL canvas that holes copy out of.** `drawImage` from a WebGL
  canvas to a 2D one forces the GPU to finish and hand back pixels — measured at
  **1.4 ms/frame**, more than the shader. Per-hole contexts: **0.007 ms/frame**
  for all three holes. That is the entire performance story.
- **Stretching one clip frame over the whole document plate.** A hole then sees
  a thin horizontal strip of the source. Measured on the title plate: 97% cloud
  at one moment of the loop, 0% four frames later. The clip now repeats once per
  viewport, mirrored on alternate passes so the repeat has no seam.

### Facts
- `createPress(w, h, band, { win: {x,y,W,H} })` prints a WINDOW of a larger
  plate and is **pixel-exact** against the corresponding crop of the master
  (verified on four cases incl. a full-bleed band and a 66x42 window). The
  window origin must be a multiple of `FIELD_PX`; the press warns if it isn't.
- Finding it exposed a real bug: phase 2 never filled the field grid's border
  ring, and phase 3's bilinear reaches one cell past it — so every plate's right
  and bottom edges faded toward paper. Apron is now 4 cells, not 3.
- `opts.dens(u,v)` replaces the noise field and *only* the noise field. The
  night ramp, sun, cloud lighting, separation, screen and misregistration are
  untouched, so a photographed sky comes out as THIS sky.
- The clip ships as a 120 KB greyscale sprite sheet (`tools/bake_sky.mjs`), not
  as the 63 MB source. Each frame is normalised to its own percentiles — without
  that the aperture pumps light/dark once per loop, which reads as a fault.
- Loop seam measured: frame 19.99 vs frame 0 differs by **0.47/255 mean**.
- Playback is capped at 20 fps and stops dead when no hole is on screen.

### Known limitation
Mew's halo still shows the STILL print. It is a hole at an arbitrary, moving
document position, so it cannot share a hole's fixed-size context. Fixable by
giving the halo its own small GL canvas that renders at her position each frame;
not done yet.

---

## Project sheets (all three printed)

Order is a judgement, not a date sort: the shipped commissioned tool first, the
ongoing engine second, the case study last. `projects.js` drives everything —
the gate's film width, travel, stops and hrefs are all derived from its length.

| | slug | second ink | figure |
|---|---|---|---|
| 01 | `usb-provisioning` | graphite | a played session of the real tool |
| 02 | `closet` | warm grey, no chroma | a played `compose()` trace |
| 03 | `iclicker` | iClicker blue | the system's own join response |

**Drawn diagrams are gone.** `figures.js` (room / mark / batch) was deleted:
hand-drawn schematics read as a digital artist's portfolio, not as evidence.
Graphics are now captures of the work — `media.js` resolves them at BUILD time
from `src/assets/media/<id>.{mp4,webm,gif,png,…}` via `import.meta.glob`, so a
slot either has a hashed URL or prints an honest "capture not supplied" state
naming the file it wants. No runtime probe, no 404. Slots awaiting files:
`usb-hub`, `usb-engraver`, `closet-app`, `closet-board`, `iclicker-poll`,
`iclicker-response`, `iclicker-map`.

**Contrast.** Secondary text was a warm mid-grey measuring 2.6:1 on white —
under the 4.5:1 floor and genuinely hard to read at 11px. `--n3` is now
`#3D392F` (11.7:1). Hierarchy is carried by size, weight and case, the way a
printed page does it. `--n4` stayed grey and is now for LINES only, never words.

**The transcript component** (`term.js`) is shared by two sheets. It loops, has
no border, and never wraps: `white-space:pre` plus a viewport-derived font size
(`min(12px, 0.95vw)`) so the widest line fits the measure instead of the measure
breaking the line — a console line is a table row and a wrapped one has lost its
meaning. Below 860px it scrolls sideways, which is what a terminal on a phone
does. Fixed height with programmatic scroll-to-bottom, so a 54-line transcript
is a plate rather than a mile of page.

**Substitution, not redaction.** The USB session is a REAL run, not a dry run,
with every device identifier replaced by a same-width stand-in (`#1234567`) so
the columns land where they land on the operator's screen. No asset numbers,
serials, volume identifiers, key material or credentials anywhere. Every line
format in it was read off the source.

**`.plate.deep`** (140lvh) exists because absolutely-positioned columns silently
outgrow a one-viewport plate and run into the next one. Stated, not discovered.
There is a check worth re-running after any copy change: measure every
absolutely-positioned child against its plate's padding box and against its
siblings. It has caught four overflows and one collision so far.

---

## The sheet is one shader pass (SUPERSEDES the filmstrip entry above)

The paper, the print and every hole are now painted by ONE fixed full-viewport
canvas behind the page (`src/site/pressgl.js`), driven by `deck.js`. Outside a
hole the shader outputs flat white stock; inside one it outputs the two-ink
print at that DOCUMENT position.

The paper is **not** a DOM layer with holes masked out of it. A mask over a
dozen rectangles is a compositing problem that behaves differently in every
browser; this is simply what the shader returns where the fragment is not inside
a hole.

### Deleted by this
- the ~300 ms document-tall JS press used for display (`sky.js` survives as the
  reference implementation and now only measures the colophon's coverage numbers)
- one 2D canvas per aperture, and the blit that filled it
- `filmstrip.js` and the per-hole WebGL contexts
- `#halo`, its canvas, its CSS radial mask, and the `setHalo` drawImage
- the reprint on ink change — the second ink is a uniform, so moving between
  project sheets is one frame instead of 300 ms

### Measured
| | |
|---|---|
| full pass: paper + print + 3 holes + halo | **0.009 ms** CPU |
| same, closet sheet (2 holes) | 0.023 ms |
| first paint (shader warm-up) | ~23 ms, once |
| scroll registration, 6 positions, 2 holes | **0 differing bytes** |
| shader vs. CPU press over a whole aperture | identical mean (224.3 / 224.3) |

### What it cost, honestly
Scrolling used to be EXACTLY zero — every hole was a static bitmap already
sitting at its document position. It is now one shader pass per scroll frame.
Redraws are gated on something actually changing (scroll, a tick of the cloud
loop at 20 fps, Mew moving, ink, resize, new page) and stop entirely when the
document is hidden.

### Mew's halo
Now just another hole, cut by the same shader at her viewport position — so it
carries the same MOVING weather as every other hole and cannot drift out of
register. The previous build could not do this at any price, because the halo
followed her to arbitrary positions and could only ever blit a still.

### Gotchas found here
- `.ap` lost `overflow:hidden` and gained `pointer-events:none` when it became
  an empty div. `.gate` is an `.ap` by class and needs BOTH back — it clips a
  300%-wide film and it is the only clickable aperture on the sheet.
- Single-pixel probes are useless against a halftone: they land between dots and
  read as paper. Compare regions, or count non-white over a rect.
- The preview pane freezes CSS transition clocks as well as rAF, so
  `getComputedStyle(el).opacity` reads 0 forever on anything mid-fade. Check the
  rule by setting `transition:none` first, not by waiting.
- The pane also refuses `window.scrollTo`, so `deck.debug.paint(t, scrollY)`
  takes a scroll override — that is the only way to test registration here.

---

## Mew is loose on the page (2026-08-14)

**Nothing on the sheet blocks her any more.** Navigation used to be a sequence
of small collisions — clip a paragraph, get shoved, replan, clip the next — and
the sum of that reads as a bug rather than as an animal. `resolveCircleRect` no
longer runs against DOM colliders at all. Two short-ranged fields replace it
(`avoidColliders` in physics/colliders.js): AVOID near a surface, ESCAPE when
her centre is inside one. Both are short-ranged **on purpose** — see below.

**The edge is a leash, not a wall.** `edgeSlackPx` of free travel past it, then
a spring that stiffens with distance, and a hard stop at `edgeHardPx` that
exists only so a fling can never lose her. Measured: a fling from mid-screen at
1400 px/s reaches x = −152 (clearly off-frame) and the leash caps her at −315.

**The pathfinder is a cost field, not a wall map.** This is the fix for the bug
he predicted before it happened. Binary occupancy meant A* would take ANY detour
over crossing a paragraph; on a page that is mostly type, the only routes left
run around the outside, and she crawls the margins forever. Crossing type now
costs `insideCost` 12 against a base of 1 — she goes round when round is
reasonable, and cuts through when the alternative is absurd.

**And the destination sampler is where it would still have gone wrong.** Every
force pushes her away from type; the page is mostly type; so the emptiest places
are the margins. `behavior.interest` therefore scores openness as ONE term among
several, and proximity to a viewport edge is an explicit cost (`edgeWeight`).

Measured over 180 s of simulation on real page geometry
(`tools/`-style scratch sim, worth rebuilding if this is ever touched):

| | |
|---|---|
| within 140 px of a viewport edge | **0.0%** |
| centre inside some text block | **0.0%** |
| dropped dead inside a paragraph → out again | **0.27 s** worst of 12 spots |

Two tests changed deliberately and are named as such in test/sim.test.js:
the edge clamp assertions (she is no longer clamped) and a new
`navigation: she does not end up crawling the margins` section.

## The crossing is the die-cut opening (2026-08-14)

`#thru` and its canvas are gone. Going into a project now grows the hole you
clicked until the paper is gone, while the RULING coarsens from 5.2 px to 30 —
so the halftone stops being a texture and becomes countable marks — and then the
next sheet's paper closes back in around its own holes as the screen resolves.

It costs nothing: a hole was already a rectangle in a uniform and the ruling was
already a uniform, so the whole transition is two numbers animating on a shader
that was going to run that frame anyway. This is also the first version of
RYAN.txt III that is honest — the dots grow in place instead of a bitmap being
scaled up.

The gate caption lost its description, its ink note and its argument. A number,
a name, what kind of thing it is, and `OPEN →`. A paragraph at the gate is a
paragraph read standing in the doorway.

## Stock, and the face (2026-08-14)

**Bone (#EFEDE6) again, not #FFF.** It must stay in step in three places:
`--paper` in styles/site.css, `PAPER` in site/pressgl.js, `PAPER` in site/sky.js.
The shader paints the stock, so a mismatch is a visible seam.

**IBM Plex Mono is gone.** It, JetBrains Mono and Geist are the default of every
scaffold, so a page set in one reads as a template before a word is read. Now
Overpass Mono — Red Hat's mono, drawn off Highway Gothic, so it comes from
SIGNAGE rather than from an IDE. One variable file, 22 KB (the two static Plex
cuts were 276 KB), every weight 300–700.

**And it bought the weight the small text was missing.** Everything under 14 px
was set in an extra-light (200), which is a display weight doing body work: at
11 px there is no stem left and it reads grey whatever colour it is. Body,
labels, table rows and captions are now 400; only the display sizes are light
(300). Contrast on bone: ink 15.6:1, secondary text 9.8:1, links 6.0:1.
`--n4` (2.6:1) is for HAIRLINES AND TICKS ONLY and must never carry a word.

---

## The palette is the animal (2026-08-14)

Every earlier colour rationale on this site is void. The old one reasoned from
his reference board; this one reasons from **Mew**, because she is the thing
actually on the page and nothing else was ever going to reconcile with her.

### What was measured

Her two forms, taken from the shipped sprites and pushed through the REAL light
rig (the analytic mirror of it in test/sim.test.js), in OKLCh:

| | lit front | top | shadow |
|---|---|---|---|
| base | `#ffb1df` L .85 C .107 **h 343** | L .79 C .095 h 345 | L .61 C .096 h 348 |
| shiny | `#a2d7ff` L .86 C .078 **h 241** | L .80 C .073 h 238 | L .60 C .057 h 257 |

Two facts fall straight out:

1. **She lives at chroma 0.06–0.11.** The old inks were 0.19–0.25 — two to three
   times her saturation. A pastel standing in front of poster colour cannot hold
   a frame; the ground shouted and she whispered.
2. **The old hues were in the discord band.** Ultramarine sat at h 267, which is
   **24° off** her shiny. Riso orange sat at h 41, **56° off** her base. That is
   the worst place a colour can be: far enough to be a different colour, close
   enough to read as HERS RENDERED WRONG. Two near-misses are not a palette, and
   "0 relation" was the right diagnosis.
3. And the thing that makes the fix obvious: **her own two forms are 102° apart
   at the same lightness and the same chroma.** She was already carrying a
   balanced two-ink system.

### What it is now

| | | |
|---|---|---|
| INK A, the constant | `#19699C` h 243 | **2° off shiny Mew.** The sky is the blue she turns. |
| INK B, the home sheet | `#D465A8` h 345 | **0° off base Mew.** The last warm light is the pink she is. |
| night, A over B | `#13275D` | 12.1:1 from paper, and the same plum family as her own outline `#2a1f33` |
| link / accent | `#005788` | ink A's hue, 6.6:1 on bone |

So both plates of the print are hers. When she comes up pink she is the same
hue as the light; when she comes up shiny she is the same hue as the air. Either
way she belongs to the sheet instead of sitting on top of it.

### The second inks

They are no longer borrowed brand colours — that produced three unrelated
swatches. Three steps of one run at a single L (.55) and C (.13):
**amber `#A65C05`** h60, **olive `#588021`** h130, **verdigris `#05837E`** h190.
Every one is ≥53° from BOTH of her hues, because inside that distance a colour
stops reading as different and starts reading as hers, wrong.

### Open, and the lever for it

Ink B does double duty in the separation: the glow at the top of the page AND
the shadow at the bottom. With an orange that read as a warm dark; with a rose
it reads PINK, so the middle of the sheet is warmer than intended. The lever is
the `shadow` term in the separation (`smoothstep(1-L, .62, 1) * 0.90` in both
sky.js and pressgl.js) — drop its weight and let the overprint carry the dark,
or give shadow its own curve. Not tuned yet.

## Typefaces, final

**Overpass Mono** for the sheet (signage ancestry, not IDE) and **IBM Plex Mono
scoped to `.term` and `.doc` only** — the played sessions and the quoted
response body. Those two ARE a machine talking, and a transcript set in the
display face is a drawing of a terminal rather than a terminal. Nothing else on
the site may use Plex.

---

## Colour, corrected twice (supersedes the entry above)

**Correction 1 — measure, don't model.** I had derived her colours by pushing
the texture through an analytic mirror of the light rig. Wrong by enough to
matter: it put her shiny at h 241 when she is **h 233.7** on screen, so the ink
built on it came out **9° off her** — the same class of near-miss I had just
criticised the old ultramarine for. Her real screen values are `#F7A8D8` base
(L .822 C .110 h 342.7) and `#99D9FD` shiny (L .855 C .082 h 233.7). 109° apart,
near-identical lightness.

**Correction 2 — the ink is not the colour that comes out.** This is the one
that actually mattered, and it is the press's own doing. A halftone over bone
drifts toward the paper as coverage falls, because a light tint is mostly paper:

| ink at her exact hue | 15% | 30% | 55% | 85% |
|---|---|---|---|---|
| ink A printed hue | 191 | 211 | 220 | 226 |
| ink B printed hue | 23 | 358 | 350 | 346 |

So an ink matched to her hue printed as a **teal** and a **peach** everywhere
except its densest corner — and the densest corner is the smallest part of the
picture. Matching the hex was matching the wrong thing.

The inks are pre-compensated instead:

| | in the can | prints at | her |
|---|---|---|---|
| INK A | `#1A71AF` h 246 | h 229–240 | 234 |
| INK B | `#CB64C4` h 330 | h 334–345 | 343 |

Swatch them and they look wrong — ink B is a frank magenta. Print them and they
are her. That is also just true of riso, which is a pleasing thing for this
particular site to have discovered the hard way.

**Also tuned:** the shadow term was `smoothstep(1-L,.62,1) * 0.90` on ink B,
which was fine for an orange and turned the whole middle of the sheet pink for a
rose. Now `* 0.52` — ink B is the LIGHT, ink A carries the dark, and the two
still overprint to a deep indigo at the foot. Chroma needs no restraint: the
press desaturates a 0.125 ink to C 0.03 at 30% coverage, well under her 0.082,
so the ground can never out-shout her.

Night `#132979`. Links `#005A7D` (6.5:1 on bone) — a UI colour, not printed, so
it takes her hue directly with no compensation.

---

## The crossing, rebuilt (2026-08-15)

**Why the first two attempts were wrong.**

1. It ran TWO crossings with the page swap wedged between them — two events with
   a discontinuity in the middle, so nothing for the eye to follow across it.
   And it grew the clicked RECTANGLE to fill the window, which gave the
   transition a shape, and the shape was the part that read wrong.
2. The rewrite made the paper dissolve globally and ramped the RULING from 5.2
   to 44 px. Also wrong, and wrong in a more interesting way: a growing dot is
   the one thing that makes a halftone look like a zoomed bitmap, and the screen
   is a property of the PAPER, so it must never move at all.

**What it actually is now.** The paper is EATEN OUTWARD from the hole you
clicked until there is nothing left but print, the sheet and both inks are
swapped at the moment the opening is bigger than the window, and then the paper
closes back IN from the edges onto the hole the new sheet has in that place.

- **The lattice never moves.** Verified: a 100x100 patch at the centre of the
  opening is byte-identical at t = 0.15 / 0.3 / 0.45 / 0.5 / 0.55. Zero
  differing bytes. Only the COVERAGE spreads.
- **The edge is chewed by the weather.** The boundary is displaced by the same
  density field the sky is made of, so the paper tears rather than wipes and no
  two crossings tear along the same line.
- **The opening reaches the corners exactly at the midpoint**, computed from the
  farthest corner to wherever it happens to be centred — a fixed radius
  overshoots for a hole near an edge and undershoots for one in the middle.
- **Four seconds.** By far the slowest thing on the site, deliberately.

Cost: one vec4 uniform. A hole was already a rectangle in a uniform.


## Per-page skies

Ink A is a uniform now, so a project owns its WHOLE sky rather than a recolour
of the home sheet's pair. `setInk(a, b)`, one frame, no reprint.

| | ink A | ink B |
|---|---|---|
| home | `#1A71AF` | `#CB64C4` (hers, pre-compensated) |
| usb-provisioning | `#16305C` navy | `#23262B` near-black |
| closet | `#2E2E2E` | `#7A7A78` — greyscale |
| iclicker | `#3576C4` | `#4FAEA6` — his blue + teal |


---

## The gate is a hole (2026-08-15)

It used to hold three offscreen JS presses — three still bitmaps in three inks.
By the time the sheet itself was live, animated and re-inked, those were the only
dead things on the page and they were in the wrong colours.

It is now ONE aperture, cut by the sheet's own shader like every other, and
simply pulled in the project's pair instead of the sheet's. Same weather, same
lattice, same clock, and it cannot fall out of step with the page it is a window
onto — because it is the same renderer.

Cost: two vec3 uniforms and an int. `uAltHole` names the one hole index that
uses `uInkA2`/`uInkB2`; only one is ever needed, because the gate only ever
shows one project at a time. Deleted in exchange: three `createPress` calls per
resize, the `.film` transform, the three `<canvas>` elements, and `.gate .fr`.

Advancing between projects is now a change of INK rather than a slide, which is
the same move the rest of the identity system makes.

## Crossing, tuned

All four adjustable numbers are together at the top of `createRouter` in
`src/site/router.js`:

| | | |
|---|---|---|
| `CROSS_MS` | 4000 | total length |
| `START_FRAC` | 0.22 | where the eating begins, as a fraction of the clicked hole's SHORT side |
| `END_FRAC` | 0.30 | how small it closes before the destination hole takes over |
| `EDGE_MESS` | 150 | how ragged the boundary is, in px |

Two bugs fixed:

- **It began outside the frame.** The start radius was the hole's CIRCUMRADIUS,
  which is larger than the hole — so the eating was already past the window edge
  on frame one. It is now a fraction of the short side (109 px against a 495 px
  hole).
- **It ended above the window.** The closing target was `querySelector("[data-ap]")`
  — whichever aperture is declared FIRST, which on these sheets is a small one
  near the top. It is now the LARGEST aperture within the first screenful.


## Crossing, round three

Three things, all of which were making the transition read as an effect played
at the page rather than something happening to it.

**It ate in the wrong colours.** The inks only became the project's at the swap,
so the opening spread in the home sheet's pink and blue and then changed colour
in the middle — putting a visible event at the one moment that is supposed to
have nothing in it. The crossing's pair is now set BEFORE its first frame
(`deck.setCrossInk`), riding the same two uniforms the gate uses; they are never
both wanted at once, and when they are they want the same thing. The midpoint
now has no colour change in it at all.

**It swapped a hair too early.** The opening reaches the corners at t = 0.50, so
swapping there does it the instant coverage is only just complete. `SWAP_AT` is
0.56. And `window.scrollTo(0,0)` was inheriting `scroll-behavior: smooth`, so
the new sheet's type was still gliding into place under the closing paper —
forced to `behavior: "instant"` per call, rather than by touching the stylesheet,
which would also kill the smooth scroll the anchors want.

**The page used to leave.** `body.crossing #doc { opacity: 0 }` faded everything
out on click, so the transition played over an empty screen. The sheet now stays
exactly where it is and the eating spreads OVER it, on `#eat` — a layer above
the type. That needs the shader run twice while a crossing is live: once in
overlay mode (print where eaten, transparent everywhere else, premultiplied)
blitted to `#eat`, then once normally for the sheet. Two draws and one blit, for
four seconds, and nothing at all the rest of the time.

Measured mid-crossing: 51.4% of the window opaque overlay, 32.1% untouched, and
41.3% of the overlay actually inked — the rest is paper-coloured print between
dots, which is what a halftone is.


## Crossing, round four — scroll-proof

**The sky jumped on arrival.** The cloud loop ran off a `t0` set on the first
paint, so anything that reset it restarted the weather at frame zero — at
exactly the moment a crossing was working to hide that nothing had happened.
The clock is now wall-clock modulo the loop length (`(now/1000)/LOOP_S % frames`)
and cannot restart, whatever else does.

**The opening is mounted to the DOCUMENT.** It used to be a viewport position,
so scrolling mid-crossing slid it off the hole it came out of. Its centre is now
a document coordinate converted at draw time, exactly like every other hole.
Verified: at doc y 600 the centre measures 600, 450, 300 and 0 at scrolls of
0, 150, 300 and 600 — `600 − scroll`, exactly.

**The swap waits for real coverage, not a clock.** A timed midpoint is only
correct if the reader holds still. The deck now computes what covering the
window would take FROM THE CURRENT SCROLL every frame, compares it against the
opening's actual radius plus the ragged edge's reach, and reports
`deck.crossCovered`; the page swaps on that. If the reader scrolls away the
target moves, the opening keeps chasing, and past its intended time it stops
easing and accelerates (`+ need * 0.9 * (t-1)^2`) rather than crawling.

**The new sheet arrives already covered**, and the retreat closes into TWO
places: the plate's own window and the full-bleed band at its foot. With one
target the paper had to sweep the whole window to reach it, which reads as a
wipe; with two, every part of the screen has somewhere of its own to go. The
footer disc typically starts at a radius of several thousand px — the band is
5,200 px down the document — so it covers from below and withdraws downward.
Measured across the retreat: inked coverage 41.3% -> 29% -> 7.2% -> 5.8%, both
radii monotonic.

Tuning, all in `createRouter`: `CROSS_MS`, `START_FRAC`, `END_FRAC`, `EDGE_MESS`,
`MIN_OUT`.


## Crossing, round five — the sky stops teleporting

**Diagnosis.** The remaining jump was not the crossing at all, it was the
landing. The sky is a function of DOCUMENT position, and every project page was
committed at scroll 0 — so the viewport teleported to the top of the plate and
took the weather with it, however carefully the frame either side had been
matched.

**Two causes, both removed.**

1. *The offset is kept.* `commit()` no longer scrolls to the top. `foldV()`
   repeats and mirrors the clip every viewport down the page, so there is no
   bottom to run out of and any offset is renderable — the cloud field is
   continuous straight through the swap. Nothing is called at all in the common
   case, deliberately: any `scrollTo` cancels momentum, and a reader still
   flicking would hit a wall at the swap. The browser holds the offset itself
   when the new sheet is tall enough; the clamp only fires when it is not.

2. *One plate, every sheet a cut from it.* The night used to run 19:00 to 01:00
   over whatever height THIS document happened to be, so the same document
   position was a different time of night on a different page — with the offset
   now kept, that was the last thing still stepping. The ramp is measured
   against a fixed `REF_H = 4000` instead. The home sheet (~3,600) reaches about
   22:30 at its foot; the taller project sheets reach night partway down and
   stay there.

**Consequence, accepted:** a project page opens wherever the reader was, so a
different part of it shows each time. If no die-cut is on screen at that offset
— the middle plates carry captures, not holes — the paper simply closes all the
way, which is the correct picture of that part of the page rather than a hole
left hanging in the middle of nothing.

## The preview matched the page — measured

`uIdentity` was the culprit. A project sheet puts its second ink on the lit
cloud tops as well as in the shadows, which is what makes the ink read as a
colour rather than as a darkness; the home sheet does not. The gate was drawing
a project's PAIR with the home sheet's identity of zero, so the preview laid
measurably less second ink than the page it is a window onto. Identity now
travels with the ink pair. Verified: the gate rectangle and the same rectangle
drawn as a project sheet are **0 differing bytes out of 160,000**.


## Crossing, round six — the reader lands at the top

Holding the reader's scroll offset made the sky continuous and dropped them into
the middle of a sheet they had not read. The offset belongs on the PICTURE, not
on the viewport.

`uSky` winds the plate on. At the swap it is set to however far down the last
sheet the reader was; the viewport goes to the top of the new one. The top of
the new sheet therefore shows exactly the sky they were already looking at. Only
the picture moves — the die-cuts stay where the layout put them.

**Then it unwinds across the retreat**, easing back to zero while the paper
closes over it. Left wound on, every sheet would start further into the night
than the one before and a few navigations in the whole site would be permanently
at 01:00. `SKY_SETTLE = false` in router.js holds it instead, if the drift ever
reads worse than the offset.

**Verified.** Compare the viewport at 1,400 px down the home sheet against the
top of a new sheet with the plate wound on 1,400, through the overlay pass so
the comparison is pure picture with no die-cuts in it:

    mean tone difference   1.08 / 255      (24 px blocks, over the 5.2 px ruling)
    worst block            5.7 / 255

Pixel-for-pixel they differ, and that is CORRECT: the halftone lattice is a
property of the paper and stays put while the picture behind it moves, so the
dot phase shifts by 1,400 mod the ruling. Tone is what the eye reads, and tone
does not move.


## Crossing, round seven — the rubber-band

The unwind was panning the whole sky back to where it started, over two seconds,
in full view. Reported as a rubber-band glide, which is exactly what it was.

Turning it off was not the answer either: the offset would then accumulate, and
four navigations in, the whole site sits at 01:00.

**The two halves of the offset have opposite needs, so they are two numbers.**

| | held? | why |
|---|---|---|
| `uSky` — the WEATHER | **held for good** | the cloud field is PERIODIC (`foldV` repeats and mirrors every viewport), so winding it on forever costs nothing and never runs out of range. Any attempt to return it is a pan of the entire sky — the rubber-band. |
| `uSkyRamp` — the TIME | eased back over the retreat | absolute, so holding it accumulates into permanent night. Unwinding it is a change of BRIGHTNESS with no motion in it, which is nearly invisible where a pan is not. |

Verified across the unwind with the weather pinned at 1,400: the cloud field is
mathematically unmoved (`uSky` constant, so `foldV(px.y + uSky)` is identical),
and what changes is tone — inked pixels 99k -> 79k as the page lightens. The ink
centroid drifts 86 px horizontally and 12 px vertically, which is the brightness
falling away around the off-centre sun bloom rather than anything translating.

`SKY_SETTLE` in router.js now governs only the time of night.


## The return is a dissolve, not an opening

Going back is not going in. Coming out of a hole only means something when there
IS a hole you came out of; a "back" link is a word in a corner, and an opening
spreading from it reads as a mistake. So leaving for the home sheet uses a
different transition entirely.

FOUR GROUPS OF CLOUD, each admitting more of the window than the last, each
fading in well before the one before it has finished fading out, until the
fourth is the whole window. The page is swapped behind that, and the same runs
in reverse. Shapes come from the same cloud sheet the sky is made of, read at a
much coarser scale so a blob is weather-sized, offset per group so no two groups
land in the same places, in VIEWPORT space so scrolling cannot escape it. The
clouds are the colour of the sheet being LEFT, which is why nothing has to match
at the far end: the screen is full when the page changes underneath it.

Tuning is `RETURN_MS` in router.js and the envelopes in `puffAt` in pressgl.js.

**A dip, found and fixed.** First tuning measured 28 -> 77 -> 67 -> 100: group
three was thinning while group four was only part way in, so the screen visibly
got LIGHTER on the way to being full. Longer holds and an earlier fourth group:
mean alpha now climbs 0, 8.7, 10.8, 24, 30, 57, 77, 80, 94, 100 with a worst
step-back of exactly 0.

## A real bug this turn: two uniforms were never uploaded

`uCross2` and `uPuff` were declared in the shader and read by it, but `draw()`
never sent them — an edit whose anchor silently did not match. The dissolve read
zero coverage at every t, which is how it surfaced.

**It also means the two-target retreat reported earlier was not real.** That
check measured `deck.debug.cross.second.r` — the deck's own arithmetic — and the
deck was computing it correctly, so the numbers looked right while the GPU never
received the value. The lesson is specific: verifying a render by reading the
CPU-side value that feeds it proves only that the CPU is willing. Read pixels,
or read the uniform back, or the check is theatre. Both are uploaded now and the
footer retreat renders.


## The return dissolve, rebuilt (the first one was wrong three ways)

Reported as "static images and blobs". All three causes were mine and specific:

1. **Static** — it sampled ONE FIXED ROW of the baked cloud sheet per layer.
   That is a photograph. Nothing about it could move.
2. **Night on it** — it coloured through `printAt`, which carries the ramp, the
   sun and the time of day. The transition clouds belong to neither the sky
   being left nor the one arrived at, and giving them a time of night made them
   read as a third sky.
3. **The last layer was a flat fill**, not dense cloud.

And a fourth, raised separately: reading the sky's own clip made the transition
look like the background sliding rather than like something arriving.

**Now:** the dissolve GENERATES its own weather — value noise, four octaves, one
level of domain warp, anisotropic, drifting on its own clock (`PUFF_LOOP_S`,
3.4 s, much faster than the sky's 16 s or a 2.6 s transition shows no movement
at all). Four layers, each reading the field at a different place and a lower
threshold. Colour comes from `puffPrint`: two inks, screened on the sheet's own
lattice, and NO ramp, sun or time of day.

The last layer covers completely and is still weather: thresholding it left
2-4% of the window open — enough to see the page change through — so its ALPHA
is solid and the cloud lives in its INK instead, the field driving how much ink
lands, biased dense.

Measured on a fresh compile: 26.7% of pixels change between two clock values at
the same `t` (it moves); top-to-bottom luminance 115.2 vs 119.2, a gap of 4/255
(no ramp); fully-opaque coverage 0 -> 8 -> 19 -> 55 -> 100 at the midpoint; and
at full cover the luminance spread is 227, so it is cloud and not a slab.

**A verification trap worth remembering.** Three runs reported `gpu:false` with
IDENTICAL shader error line numbers across three different file layouts — the
preview pane was holding a cached module and `window.__DECK__` still pointed at
the deck built from the failed compile. The console warnings were stale too. The
way out was to import the module with a cache-busting query and compile the
shader into a scratch canvas directly, which is now the reliable way to check a
shader change here.

---

## Return dissolve, rebuild 3 — the sky itself, with the sky taken out

The generated-noise version above was wrong too, and for a reason worth keeping:
it solved the "looks like the background sliding" problem by throwing away the
press. Correct instruction was to use the EXISTING formula and filter the sky
out of it. That is what this is.

**`pressAt`** — the press with every input it used to read out of global state
handed to it instead: lattice position, `u`, `v`, band phase, field lookup, fold
sign, clip frame, coverage bias, inks, identity. It returns the printed colour
AND the cloud mask in `.a`. That mask has always existed — the press needs it to
shade cloud differently from clear air — and handing it back is the whole trick:
use it as the alpha and the cloud stays while the blue goes. `printAt` is now a
four-line wrapper that supplies the page's own numbers.

**Eight samples, four groups, two each.** One sample per group made a group's
coverage the CLIP's coverage, and the clip is a flythrough running 15% cloud to
95%: across the 20 starting frames, some transitions sat at zero until the fill
arrived. Each group is now paired with the moment half a loop opposite it.
Groups are a third of a loop apart. Thresholds set off the field's measured
distribution, not guessed.

**The fill is three samples over an opaque floor, not one sample with its
threshold dropped.** Dropping it far enough to cover the window puts the whole
field over the line, the density gradient goes flat, the shading has nothing to
shade, and out comes an even grey wash — which is exactly what "the 4 frame is
not even a dense number of clouds" was describing. The fill's envelope also
starts early (0.34) because its floor is opaque, so it is the one part of the
rise that owes nothing to what the clip happens to be doing.

### Three bugs in the press found by putting it full-screen

The dissolve is the first thing to show the whole sheet at once, and it exposed
three faults that a die-cut had been hiding:

1. **`slice` clamped x but not y.** Frames are stacked in the sheet, so a lookup
   a hair past the top of frame f returned frame f-1. Only the shading gradient
   reads past an edge, and it does so exactly AT the edges — so it printed a
   hard dark line along the top and bottom of every band. Fixed in `slice`;
   fixes the background too.
2. **`foldV` flipped the lighting.** On a mirrored pass the field runs backwards,
   so the vertical gradient points the other way and the lit and shadowed faces
   of every cloud swap over at the fold — a dead straight line the full width of
   the sheet. New `foldS` returns the pass direction and `pressAt` multiplies the
   gradient by it.
3. **The clip is not even down its own frame** — mean density 108 across the top
   half, climbing to 168 in the bottom quarter (the deck at the horizon). A
   mirror turns around at both ends, so the dense end meets itself and stripes.
   `foldW` folds the dissolve inside the top 0.60 of the frame, putting the two
   turning points 13 levels apart instead of 60. The background keeps the whole
   frame; its stripe predates this and is not this task.

Layer offsets are a WHOLE number of bands, so every fold lands at the window's
own edge rather than in the middle of it. Odd offsets get the mirrored pass,
which is different weather for free. The remaining variety is horizontal:
per-sample zoom and offset through `foldU`, plus the clip's own clock.

`PUFF_V = 0.10` pins the time of day near the top of the plate. Eight samples
stack up far more ink than the one the sheet lays, so at a middling `v` the
dissolve printed darker than any sky it stands in front of.

### Measured, on a freshly compiled shader in a scratch canvas

| | |
|---|---|
| worst coverage dip | **0.07** over one tenth of the transition (was 0.205) |
| full cover at the end | **100% at every one of the 20 starting frames** |
| moves | 79.7% of pixels change between two clip moments; 44.1% sub-frame |
| scroll / sky offset / night ramp | **0 differing pixels** for all three |
| tone spread at full cover | 217 — cloud, not a slab |
| cost @1728x1117 | 0.94 ms peak overlay + 0.37 ms sheet, of a 16.7 ms budget |

`PUFF_LOOP_S` is 5 s in deck.js: the same clip as the sky, run faster, because
at the sky's 16 s a 2.6 s transition sees a sixth of the loop and looks pinned.

**Note on how this was checked.** The preview pane reports `innerWidth: 0` and
`document.hidden: true`, so the deck's rAF never runs and a screenshot of the
live transition is not available here. Everything above was measured by
importing `pressgl.js` with a cache-busting query, compiling into a scratch
canvas, and reading pixels back — plus contact sheets decoded to disk and looked
at. Renders at 250 px wide moiré badly against a 5.2 px ruling and made the
clouds look like static; the judgement calls were made at native resolution.

---

## Return dissolve, rebuild 4 — the level animates, not the opacity

Three notes on the previous version, all acted on:

1. clouds straight from the source vary too much, and are too large
2. the fill at waves 3-4 was synthetic — an opaque sheet of SKY under the cloud,
   visibly pulled across to hide the page changing
3. the induced fade fought the clip, which already has clouds forming and
   dissipating in it. Prefer the innate behaviour to a crossfade.

### The opacity envelope is gone

What animates now is THE LEVEL THE CLOUD MASK IS CUT AT. Fading a layer up is a
photographic dissolve and reads as one; lowering the level makes the picture
behave like weather — cloud appears where the field has just crossed the line,
spreads at its own edges, joins its neighbours, and on the way back shrinks and
goes. Nothing is ever semi-transparent. The forming and dissipating is the
clip's own; the level only decides how much of it is above water.

### The doubling is in the count: 2, 4, 8, 16

Sixteen cuts of the field, four waves adding 2, 2, 4 and 8 of them, so the total
on screen doubles each wave. Doing it by threshold instead does not work — the
field's density is heaped in the middle, so the levels giving 6%, 12% and 25% of
the window are 0.685, 0.650 and 0.617, near enough identical to look like one
wave breathing.

Starting from ONE cut also failed: a single cut is at the mercy of one moment of
a clip that has moments with no cloud in them at all, and the dissolve would
open on an empty screen and stay there for a third of its length.

### The level moves in two movements, and it has to

Overlapping cuts SATURATE. Two cuts covering a tenth each cover a fifth between
them; sixteen cover four fifths, not sixteen tenths. So one level per wave cannot
do both ends of the job — sparse enough for the first wave to be a scatter and
sixteen still leave the window open; deep enough to close and the first wave
arrives as overcast.

  ARRIVE   each wave cuts down to the same shallow level (0.66, the densest
           twentieth of the field), one wave later than the last. The doubling.
  SETTLE   then all sixteen go on down together to 0.38. This closes the window,
           and closes it as sixteen clouds thickening at once — which is what an
           overcast sky is — rather than as one lid.

The settle acts ON TOP OF each wave's arrival (`arrive * (A + (1-A) * settle)`),
not beside it. Taking the greater of the two looks equivalent and is not: the
settle then counts for nothing until it passes the arrival level, so the screen
held still and the entire closure happened in the last fifth, all at once. It is
also eased (^1.75), because coverage is not linear in the level — a straight run
shut the window at four fifths of the way through and left the rest with nothing
to do.

### Where small clouds come from, which is not where I looked first

The obvious answer is to tile more of the field into the window — three frames
across instead of one. It does not work: the field MIRRORS at each repeat, and a
mirror inside the window is a line of symmetry you can see. At 3.2 across,
sixteen samples folded twice apiece and the screen came out a Rorschach card.
Squeezing x harder than y to fit more in is worse — a 2:1 anamorphic squash that
stands every cloud on end, which is what produced the "vertical flames" pass.

The answer was the level, which was already there. Cut the field high and what
is left is not whole clouds shrunk, it is their dense CORES: small, separate,
scattered wherever the weather is thick. So the field is read one frame to one
screen and each sample is offset by a WHOLE number of frames in each direction —
a whole number puts the mirror exactly on the window's edge where it cannot be
seen. Four positions, sixteen moments, no repeat visible anywhere.

### A second ramp for the shading

The mask was doing two jobs: the alpha AND how much the cloud's own lighting
replaces the open sky's. Hardening it to 0.035 so the window could close hardened
the lighting too, and sixteen hard-lit cuts average to flat grey — all the tone
in the picture lives in that ramp. `pressAt` now cuts the mask at `soft` and
shades at 0.115. Identical when soft is 0.115, so the sheet is untouched.

### Measured, fresh compile, across all 20 starting frames of the clip

| | |
|---|---|
| coverage by t | 0, 0, 0, 5, 7, 18, 44, 75, 98, 100, 100 |
| holes at full | **0.00%**, every start |
| tone spread at full | 217 — weather, not a slab |
| cost @1728x1117 | 1.87 ms peak overlay + 0.44 ms sheet, of 16.7 ms |

Tuning: `PUFF_HI` (where a wave starts, must clear the field's 0.863 max),
`PUFF_LO` (where everything settles — lower closes harder), `PUFF_ARRIVE` (how
deep a wave's own arrival goes; lower is a sparser first wave), `PUFF_SOFT`
(mask hardness). Wave stagger is `g * 0.16` and the sweep `0.30` in `puffAt`.

**A trap:** a comment inside the shader's template literal used backticks around
an identifier and closed the literal. `node -e "import(...)"` catches this in a
second; the browser reports it as `SyntaxError: Unexpected identifier`, which
looks like a fault in the harness rather than in the file.

---

## Dissolve, rebuild 5 — shapes and churn

Two notes: the clouds stayed too long so the whole thing read as one fade up and
one fade down, and the shapes could be better. Both had measurable causes.

### The shapes were a texture-filtering artefact, not a cloud problem

The sheet is 320 texels across and about a hundred usable rows per frame. Over a
full window that is 4x magnification one way and 8x the other, and BILINEAR
filtering at that distance is a grid of flat triangles. Cutting a hard mask
through flat triangles gives diamonds and star points — which is exactly what
the cloud edges were.

`slice` now curves the blend weights with a smoothstep before the fetch, so the
reconstruction is continuous in slope as well as value and an edge cut through
it bulges and hooks the way a cloud does. One fetch still, four multiplies more.
Needed the sheet's texel size, so `uTex` is a new uniform. **This improves the
background sky too** — the same artefact was in every die-cut, just smaller.

### Despeckling, free

Cutting the field as high as the first waves do leaves single texels above the
line scattered through the open sky like spatter. The four neighbour taps the
SHADING already fetches are about 1.3 texels out — exactly the size of the thing
to remove — so `pressAt` now takes them BEFORE the branch when `blur > 0`, uses
the blend for the level test, and reuses them for the gradient. No extra
fetches. The sheet passes 0 and keeps the point sample and the branch it had.

Measured: spatter (cloud pixels with <=2 of 8 neighbours lit) 0.69% of cloud.

### Why the clouds stayed: the level only descends

A cloud can only leave if the field moves out from under it. At `PUFF_LOOP_S`
5 s a 2.6 s transition saw half a loop, the field barely moved, and everything
that arrived stayed and grew. Now 2.1 s — a loop and a quarter — and each of the
sixteen cuts runs the clip at its OWN RATE (0.72x to 1.34x) rather than only
from its own place in it. Sixteen cuts on one clock are the same curve shifted
sideways: they thicken and thin together and the screen breathes as one thing.

Measured turnover, per 5% step of the transition:
**4.6% of the screen LOSES cloud while 10.6% gains** — net rise, constant churn.

Coverage 0, 0, 0, 7, 9, 22, 47, 75, 96, 100, 100. Worst hole at full 0.05%.

---

## Paper vs the four skies — bone stays, the closet INK was the fault

Owed since the per-page skies landed. Measured, not argued.

The paper is OKLCh L 0.946, C 0.0096, h 94, and it is **the lightest pixel of
every sky on the site**, because zero coverage is bare stock.

| page | mean C | mean h |
|---|---|---|
| home | 0.0424 | 265 |
| iClicker | 0.0432 | 233 |
| CLI | 0.0162 | 255 |
| closet | 0.0071 | **95** |

Three sheets are blue and bone is a warm ground under a cool ink — the reason
they read as printed. The closet sheet had NO cool ink to play against, so it
came out warm end to end: highlights C 0.0094 h 94, mids 0.0074 h 95, shadows
0.0043 h 98. Not greyscale — cream monochrome, and the paper was the only thing
colouring it.

Neutralising the paper would fix one page and cost the other three their ground,
for a conceit ("one sheet") that is load-bearing. So the ink moved instead, which
is the technique already in this file: the greys are pulled a few points cool to
SPEND the paper's warmth rather than sit in it.

`#2E2E2E / #7A7A78` -> **`#2C2D31 / #78797B`**

| closet | before | after |
|---|---|---|
| mean C | 0.0075 | **0.0044** |
| mids | 0.0074 | **0.0046** |
| shadows | 0.0043 | **0.0028** |
| L | 0.673 | 0.672 |

Highlights stay 0.0092 — that is the stock and cannot change without changing
the stock. Home, iClicker and CLI measured after: 0.0424 / 0.0432 / 0.0162,
unchanged to four places.

Tuned by ladder, not by eye. Pulled FURTHER it overshoots into a split tone —
at twice this correction the shadows come back at C 0.0081 in blue.

### Dead time at the start of the dissolve

Measured: not one pixel of cloud for the first fifth of the transition — half a
second of nothing after the click. The cause is the field's shape, not the
timing. Density peaks at 0.44 and the densest thing in the sheet is 0.863, so
the whole stretch of level between 0.94 and about 0.75 has essentially nothing
above it; run through linearly, two thirds of the first wave's arrival happens
on a blank screen.

`arrive` is now `pow(raw, 0.24)` — it crosses the empty stretch almost at once
and then slows right down over the part where cloud actually lives. `pow(0, x)`
is 0, so t = 0 is still exactly empty and the reverse still ends on nothing
rather than popping out. The first wave also cuts 0.08 deeper than the others,
being the one that has to break the silence and the one most exposed to a thin
moment of the clip.

| | before | after |
|---|---|---|
| first cloud on screen | t 0.30 (avg) | **t 0.05 .. 0.25** |
| coverage at t=0 | 0 | 0 |
| cloud lost / gained per step | 4.6 / 10.6 | **5.1 / 8.1** |
| worst hole at full | 0.05% | **0.01%** |

Curve: 0, 0, 2, 3, 8, 16, 24, 40, 64, 84, 97, 100, 100.

### Two-target footer retreat — verified in pixels this time

The earlier "verification" of this was invalid: it read `deck.debug.cross.second.r`,
the deck's own arithmetic, which was correct all along while `uCross2` was never
uploaded. Now measured off the framebuffer, alpha inside a disc at the second
opening's centre:

  with only the first opening set — first 1.000, second spot **0.000**
  with both set                   — first 1.000, second **0.978**

### Still blocked

The spacing/positioning half of the visual pass cannot be done here: this
preview pane reports `innerWidth: 0` and `document.hidden: true`, so the layout
is degenerate and every `getBoundingClientRect` is meaningless. It needs a real
viewport. Everything above was verified by compiling into a scratch canvas and
reading pixels, which does not depend on the pane's layout.

---

## The clouds are gone. The return is the crossing, mirrored.

The cloud dissolve is deleted outright — `uPuff`, `puffAt`, `foldU`/`foldW`, all
the `PUFF_*` constants, the soft/blur split, deck's `setPuff`/`puffFrame`, and
router's cloud `runReturn`. pressgl.js went 770 -> 544 lines, and with only one
caller left `pressAt` collapsed back into a single `printAt`.

KEPT, deliberately: the background cloud-sky, the die-cut windows, and the
home -> project crossing. The crossing is now the ONLY transition mechanism.

**The return is that same opening run the other way round.** Going in, the paper
opens at the window you clicked and spreads to the edges. Coming out, the print
closes IN from every edge until the page is gone, and then on the home sheet it
retreats into the window you came out of. Only the first half is new, and even
that is the same boundary with the paper on the other side of it:

    uEatOut = 0   eat INSIDE uCross   — a hole opening out of the sheet
    uEatOut = 1   eat OUTSIDE it      — an island of page shrinking

The second half is literally the crossing's retreat, unchanged. Measured:
forward gives centre 1.000 / edges 0.079; return gives centre 0.000 / edges
0.921 — the exact mirror. Early inward leaves the page whole (0/0), late covers
it (1.0/1.0). `RETURN_MS` 2600 -> 2000.

### The night ramp reset

`commit()` winds `skyRamp` on by the reader's scroll at EVERY navigation.
`runCrossing` eased it back across its retreat; the dissolve never did, so every
trip home left the sheet further into the night and a few of them ran it to
01:00 for good. The new return captures `rampAtSwap` AFTER `onSwap()` (so it
includes the wind-on) and eases it to zero, then hard-sets zero — the same
contract the forward direction always had.

---

## Startled Mew

Most of the behaviour already existed: `brain.triggerStartle` sets the state and
adds an escape impulse, `faceMorphs` already widens the eyes for `"startle"`,
`headLook` already locks onto it. What was missing was any trigger from a
transition, and the sweat.

### The take: three beats, and the order IS the performance

An animal that has seen something does not leave in the same instant. It LOOKS
— that is what tells you it saw. Then it turns its head to where it is going —
that is what tells you it decided. Then it goes.

    1. GLANCE  0.20 s   head snaps onto the thing. Body has not moved.
    2. TURN    0.11 s   head whips off it and onto the escape line. Faster than
                        the glance: turning away slowly reads as reluctance,
                        and this is fright.
    3. BOLT             the impulse lands on THAT beat, not before, and the
                        limbs windmill the whole way out. She keeps
                        accelerating as she leaves — a bolt that coasts is a
                        glide.

`brain.gazeAt` is a new forced-gaze override that headLook honours over the
cursor; it is a POINT, not a direction, because a head aims at places.

**She leaves by the shortest line.** `triggerStartle` deliberately mixes a
lateral component in so a cursor-shy animal scatters unpredictably. `panicFrom`
does not: the press comes out of one specific place and the way out is directly
opposite it. Measured dot with the true away-vector: 0.99999. With no source (the
rim closing in) the rule is the same applied to an edge — she runs at the middle
of the room and glances at the nearest edge, the part arriving soonest.

**The flail is shared, the face is not.** A panic windmills the same limbs as a
wall-bump, but `>.<` is PAIN — eyes screwed shut — and the whole point of a
startle is that they are WIDE. `flail` now carries `glyph: false`, which the
`>.<` overlay and the gold annoyance stars both sit out.

### The sweat — fx/sweatDrops.js

汗マーク. The glyph has a range set by how many there are and whether they fall
or fly: one at the temple is embarrassment; many, FLUNG, is absolute panic.
This is the last one, so none of them is ever seen coming down — each is culled
just past the top of its own arc while it is still travelling
(`apexOvershoot` 1.18), and the next wave is already on its way out behind it.

Built like the annoyance stars it replaces: instanced billboards, shape solved
in the fragment shader, no texture, written at INK_ALPHA so the pixelate pass
treats them as art and the outline pass gives them the character's own border.
The keyline is the EYES' darkest ink, so the glyph belongs to this animal.

THE SHAPE IS SOLVED:  w(y) = sqrt(1 - y²) · sqrt((1 - y)/2)

At the base the first factor goes as sqrt(1+y) — a CIRCULAR bottom. At the tip
the two together go as (1-y) — a straight-sided POINT. The keyline is the same
profile shrunk about its own middle rather than an outline traced round it, so
it keeps an even weight all the way to the point where a traced one pinches.
Two white speculars in the fat of the drop are what make a flat cyan blob read
as WET. The tip TRAILS and turns through the arc: the quad angle is recomputed
from instantaneous velocity every frame, and it stretches by speed.

### Three real bugs, all caught by measurement

1. **The fan threw drops DOWNWARD.** On a sideways escape its lower edge dipped
   under the horizon — and a drop that starts by falling is a drip, the calm end
   of this glyph and the opposite of what is being drawn.
2. **Folding them back up to the limit fixed the direction and ruined the
   spray** — three drops landed on the exact same angle and read as one fat one.
   The fan is NARROWED to the room available on the downward side instead, and
   opens fully upward. Asymmetric, evenly spread, never below horizontal.
3. **Every drop rendered as a teardrop sitting on a dark SLAB.** I had divided
   the sampled coordinate by the stretch to "un-stretch" it. That squeezes the
   sampled y toward zero, the half-width profile stops varying across the quad,
   and a shape whose width is constant in y is a RECTANGLE. vP must NOT
   compensate — the point is for the shape to be drawn longer.

Verified on a real GL context after the fix: 196 rows, max width 196, widest at
0.63 down the shape, ends tapering to 2 px and 28 px. `isRectangle: false`.
Shader compiles with no errors and all three tones present.

719/719 checks. New sections: the three-beat take and its direction, the spray's
physics, and the teardrop profile itself.

---

## Startle, second pass

### The drops are commas now, in clusters, not a sprout

Two changes, and the second matters more than the first.

**Bent.** A straight teardrop is what falls off a tap. The one drawn on a
panicking face is a COMMA — its point hooks over. The spine is displaced by t²
along the length, so the base stays put and all of the bend gathers in the last
third where the taper is, which is where a real flung droplet's tail whips
round. The speculars ride the spine so they stay in the body of the drop once it
is bent, and the sampled x is scaled by the bend so the curve cannot clip out of
its own quad. Measured on a GL context: the spine drifts 39 px across a 172 px
drop; `isStraight: false`.

**Clustered.** The first build threw them on a radial fan out of a ring round
the head — which is exactly how the annoyance stars are thrown, and that was the
problem: a radial burst is the vocabulary of IMPACT. Sweat is drawn as a little
group of drops leaping off ONE side of a head, and the grouping is the read. So
each wave is a cluster of three leaving one temple together, and successive
waves alternate sides. Four waves, three each.

The three do not leave from a point — a cluster that does reads as one drop
splitting rather than three jumping — and the outer two curl OPPOSITE ways, so a
cluster opens like a hand. The curl handedness rides the sign of the stretch
attribute, which is always >= 1, so it cost no new channel.

The whole spray still leans with the escape. That sign was wrong first time:
angles run counter-clockwise, so a positive offset leaned it AGAINST the flight.

### The glance now reads, because she stops

Beat one at 0.20 s did not read at all — she went from looking at the cursor to
looking at her escape line, because the head spring had barely started swinging
before the next beat took it away. Two fixes, and the second is the real one:

  · 0.20 s -> 0.44 s
  · SHE IS BRAKED TO A STOP for the whole of it

A head turning on a drifting body is a glance. A head turning on a body that has
stopped is a double-take. The stillness is what buys the beat the time to be
seen, and it is what an animal does anyway: everything stops for the instant it
takes to understand what it is looking at. Braked, not zeroed — a velocity
snapped to nothing is a teleport, and the follow-through layers read that as a
collision. Beat two 0.11 -> 0.16 s.

### The yellow stars, and where they were really coming from

Not from my panic flail — that already opted out. `colliders.js` fires a genuine
`flail` on any hard bump, and a mew crossing the page at panic speed clips
whatever is in the way. Every one of those was hard enough to trigger the
tantrum: `>.<` and a shower of gold stars, in the middle of a flight meant to
read as fear. She is not annoyed at the furniture; she has not noticed it.

`world.panicking` gates it. Cleared on ANY exit from the startle state, not just
the tidy one — she can be grabbed mid-flight, and a flag left set would have
muted every bump for the rest of the session.

### And the frightened flail is its own animal

The `glyph: false` flag is gone; the panic emits its own `panic` event, which is
why the `>.<` overlay and the annoyance stars now sit it out by construction
rather than by a check. Both windmill all four limbs and that is where the
resemblance stops:

|  | bump (annoyed) | panic (frightened) |
|---|---|---|
| throw | 42 deg | **27 deg** — tighter |
| rate | 7.2 -> 3.4 Hz | **13.5 -> 11.0 Hz** — nearly twice as fast |
| envelope | decays over 1.5 s | **held flat to 0.78, then dropped** |
| attack | 0.05 | 0.03 |

The tantrum winds down because she is getting over it. The panic does not,
because she is not getting over it, she is leaving.

731/731 checks.

---

## Eight changes, one at a time

### 1. The head whip, which had failed twice for two different reasons

First it was too short. Then it was long enough and STILL invisible, and the
second reason was the interesting one: it was aimed at a PLACE. The look plane
is six world units out, so an opening a few hundred pixels away subtends almost
nothing — the whole "glance" was about two degrees.

It is a DIRECTION now. `brain.gazeFront` turns her square on to the viewport,
perpendicular to it, which is the largest head pose the rig has and cannot be
mistaken for anything else. Held half a second. And `omegaWhip` (34, against the
merely-curious 11.2) makes both of the panic's head moves SNAP — a spring still
travelling when its beat ends never shows the pose it was heading for, which is
how the first version lost its glance.

The thing that is frightening her is not in the page; it is the page coming
apart. Squaring up to the whole viewport is the honest pose for that.

### 2. The drops are properly bent now

0.46 read as almost straight, and worse, it was being flattened by its own fix:
the old `fit` fudge squeezed the shape back in proportion to the bend, so past
about a half, turning the curve up did nothing at all.

The quad is mapped onto the shape's measured bounding box instead — sampled off
the same two functions the shader solves, once, in JS — so the bend can be any
size without clipping or squashing. Curve 0.46 -> 1.30. Measured: the spine now
drifts 0.65 of the drop's own width, against 0.23 before.

### 3. Fired like a shotgun, growing as they go

The three of a cluster leave on the exact same frame (no stagger inside a
cluster — that reads as a trickle), from points already spread around a ring
centred on her, each travelling straight out along its own radius. Measured: all
three share a delay, all sit within 20% of `spawnRadiusPx`, and each one's
velocity is radial to better than 0.999.

And they GROW through the flight, 0.74 -> 1.22, rather than popping to full size
and shrinking. A thing getting smaller is a thing going into the distance; these
are coming off her. The vanish is the last tenth, so it is a disappearance
rather than a dwindle.

### 4. Pathing: avoiding a place has to mean going somewhere else

The stuck handler dropped the PATH and kept the DESTINATION. So: the grid says
the far side is reachable, the route threads a gap between an element and the
rim, the avoidance field pushes her off the element, the leash pushes her off
the rim, the two cancel into a standstill a few pixels wide — and replanning
finds the same gap. Forever.

`giveUp()` abandons the destination, remembers it for nine seconds, and picks
another; `pickInterest` scores heavily against anywhere it has recently failed
(weighted, not vetoed — if the only open space left is near a bad spot, going
back beats standing still). A seek cannot abandon the cursor, so it gets shoved
sideways off whatever it is grinding on and plans again from there.

And the leash is loosened — slack 110 -> 240 px — so she can go AROUND the
outside rather than jam against the rim. Weakening the avoidance instead would
have been the wrong lever: that is what keeps her off the type.

Measured: 300 fresh destinations steer clear of a failed spot 90%+ of the time.

### 5. She loses patience

A seek at one speed is fine across half a screen and hopeless across a scrolled
document. Ramped on ELAPSED TIME, not distance left — distance can grow, and a
speed that fell when the target ran away would be exactly the wrong response.
Flat for 1.2 s, then winds up over 2.6 s to 1380 px/s, which is deliberately
just under the body's own 1400 ceiling: asking for more is not a faster mew, it
is a number that gets quietly clamped and a knob that stops meaning anything.

### 6. She comes in from the side

`recollect` fires at the one moment in the transition when the window is
completely covered, so a teleport there is free — and it is the only chance to
place her deliberately. She leaves wherever the escape line took her and the
reader lands at the TOP of the new sheet; her document position is untouched by
that, so she would wander in from four hundred pixels down a page nobody has
scrolled to. Now: vertical position inside the viewport, horizontal just outside
it, on whichever side she was already nearer so the entrance continues the exit.
The exit is still free to leave over the top.

### 7 and 8. The return: colours, and the flash

Two separate faults.

**The eating had no ink of its own.** It borrowed the gate's, which is fine
going in — a project sheet has no gate to argue with — and wrong coming back,
because the home sheet has one: the instant the page committed, the gate claimed
those uniforms for its preview and the opening changed colour underneath itself.
`uEatA`/`uEatB` are its own now, and `setEatInk(null, null)` means the home pair.

**And it was more saturated even after that**, which was the other half of
matching a sheet: IDENTITY. That is how much second ink goes onto the lit cloud
tops — what makes a pair read as a colour rather than a darkness — and the home
sheet runs it at ZERO while every project sheet runs it at one. The eating had
1.0 hard-coded, so coming home it laid rose the home sheet does not lay.
`uEatIdn` travels with the pair.

Measured, eating against the sheet it resolves into: **0 differing pixels, max
delta 0**, both directions. With identity forced back to 1: 42,448 differing
pixels, max delta 139. That was the saturation.

**The flash in the middle** was two bugs stacked. The ragged edge is chewed by
the weather, which pushes the boundary inward as well as out — so at radius zero
the inward bite reaches through the middle and opens a hole onto the page. And
below that, the shader guarded the whole crossing on `radius > 0`, which means
"there is an opening" when the paper is outside and the exact OPPOSITE when the
paper is the island: r = 0 is not "no crossing", it is "the page is completely
gone". Measured as it stood: 0.5% of the window showing at r = 0.01, and 100% of
it at r = 0 — a full-frame flash of the page.

The island now shrinks PAST zero by the slack the edge can bite, and eat-out
never tests the radius for being positive. Measured across 600 samples of the
whole first half: worst coverage backstep **0.000%**, fully closed at the end.

771/771 checks.

## Coming home — the weather stepped, and it was a clamp

Reported: returning from a project to the home sheet, the sky jumps. Same fault
as the original teleport (round five), other direction, and the reporter said so
— the offset trick already in `commit()` should have covered it.

It did not, because of the ORDER of two lines.

    doc.innerHTML = html;                       // <- the sheet changes here
    deck.setSky(deck.sky + window.scrollY, …);  // <- read AFTER

How far down the OLD sheet the reader was is the number the plate winds on by,
and it is only knowable while the old sheet is still in the document. Replacing
`#doc` with a **shorter** page makes the browser clamp the scroll position to the
new maximum on the spot, so reading it afterwards returns where the reader ended
up, not where they were.

That never showed going IN — project sheets are taller than the home sheet, so
there is nothing to clamp against, which is exactly why the bug is one-directional
and why it survived every check aimed at the crossing itself. Coming HOME it is
the whole thing: leave a long project 7,000 px down, the home sheet holds ~2,700,
the plate winds on by 2,700 while the picture had been showing 7,000, and **4,300
px of sky — nearly five bands of it — steps in one frame.**

Fix: `const leftAt = window.scrollY;` at the top of `commit()`, before the
markup is replaced. One line moved.

**Verified — `test/router.test.mjs`, now part of `npm test`.** The real router,
driven against a hand-rolled DOM whose only interesting behaviour is that
shrinking the document clamps the scroll. It watches `scrollY + deck.sky` — where
the top of the viewport sits in the SKY's own coordinates — frame by frame
straight through the swap, and reports the worst one-frame step.

| | worst step |
|---|---|
| going in, reader 1,200 px down home | 0.0 px |
| coming home from 500 px | 0.0 px |
| coming home from 7,000 px | 0.0 px |
| *same, with the read put back after the innerHTML* | **4,300.0 px** |

The last row is the check having teeth: revert the fix and it fails.

`import.meta.glob` in `site/media.js` is a Vite transform, so the harness
registers a node loader (`test/viteStubRegister.mjs` → `test/viteStub.mjs`) that
serves a stub for that one module. Everything else — router, projects, pages — is
the real code.

**Noticed in passing, not changed:** `body.crossing` is added and removed by the
router and the comment says it "holds #doc at opacity 0", but there is no such
rule in site.css any more. It is harmless — `#eat` (z 20) sits above `#doc`
(z 10), so the eating covers the type without help — but the class and the
comment are both dead.

## Pathing, round two — width, the outside, and the barge

Reported: on a page with a lot of type she wedges between an element and the
rim, or between two elements, and grinds there indefinitely. The proposed fix
was a gap measurement plus a distance rule — "if the gap is too small find the
next one, and if the nearest is over half a screen away, go straight through".

**That is the right rule, and it belongs one layer lower than proposed.** There
are no "gaps" in this system and nothing "tries to path around": the grid is a
COST field, every cell is passable, type simply costs 12x and its halo 3x. A*
already weighs around against through and picks whichever is cheaper. So the
proposal was not a new behaviour to add — it was already the design, and it was
not what was failing.

**What was failing is that the two layers disagreed about what is possible.**

| | knows | does not know |
|---|---|---|
| planner | what a cell CONTAINS | how much room it has |
| body | how much room it has | — |

A 150 px gap beside a paragraph is empty, so it cost ~3, so A* threaded it as a
bargain. The body is 150 px across and the avoidance field reaches 110 px past
that, so under about 370 px the push off one side and the push off the other
point at each other and sum to a **stable well a few pixels wide**. The planner
kept promising routes the body could not fly.

**So the grid measures clearance and charges for the squeeze.** Chamfer distance
transform to the uninflated type, then a surcharge that runs from nothing at
`radius + avoidRangePx` up to `insideCost` at about her half-width. That single
number is both halves of the proposed rule and needs neither threshold:

- a roomier gap nearby is cheaper, so A* takes it — "find the next gap";
- where none exists, every route costs the same per cell, so the shortest wins,
  and the shortest is straight through — "go through the elements".

No "half a screen" constant, because the search does that comparison itself, at
every scale, correctly.

**And the squeeze is a cost of TRAVELLING, not of BEING.** Two grids now.
A 190 px corridor is miserable to thread at speed and a perfectly pleasant place
to hover — standing still, the two fields hold her in the middle of it, which is
where she wanted to be. `travel` carries the squeeze and A* and the LOS
smoothing read it; `cost` stays what a cell contains and every destination test
reads that. Charging the interest sampler for the squeeze emptied the page: she
would not choose anywhere that was not a hall. (Measured: 0 of 200 samples.)

**The grid does not stop at the page** — 500 px of open space past each rim,
matching the leash below. An element flush to the edge used to have a crack
beside it and nothing else.

### The sides are free

`edgeSlackPx` was one number for all four edges, and the sides are not the top
and bottom. Sideways there is no document, nothing to be lost in that a straight
line does not recover from, and going around the outside is the natural way past
anything near a rim. X now gets 560 px of free travel (a whole body outside the
page with room to spare) against 240 for Y, its own gentler spring, and a hard
stop at 1000 that exists only so a fling cannot lose her.

Consequence that had to be closed: the offscreen-return predicate was a VERTICAL
test, safe only while the leash held her within 240 px of a rim. It now counts
being far off to a side as being lost too (`offscreenSidePx` 340, well inside the
4 s grace, so a transit around the outside never trips it). And `seekDone` for
that mode was satisfied on y alone — so a new sheet placing her at the side with
her height already in the band ended the fly-in before it started.

### Wedged: barge first, give up second

A 36 px approximation of a page laid out in points will be wrong somewhere. The
old single response was to abandon the DESTINATION, which is a poor first answer:
the wedge is made of the avoidance field, so the thing to change is the
avoidance, not the plan.

    grinding 0.45 s   -> `world.pushThrough`. Avoidance computed but not
                         applied, planner bypassed, straight line at the
                         destination, 1.2 s. She goes THROUGH.
    still at 1.8 s    -> the destination itself is the problem. Abandon it,
                         remember it 9 s, want something else.

The overlap is still REPORTED mid-barge, so a hard one still reads as a bump.
She is going through the type, not pretending it is not there.

## Pathing, round three — she pressed into things and would not come out

Reported next, and a different fault: she pushes into an element and stays until
nudged, always near or inside one, on project sheets and not on the home sheet.

**Arithmetic.** The escape from inside type was 4000 px/s². A steer at full lean
is `steerMaxForce` x `leanThrust.maxMul` = 2600 x 1.7 = **4420**. Whenever the
thing she was flying at sat inside a block of type she flew in, WON by 420, and
held. The nudge was not freeing her; it was breaking a tie she was winning.

Three things, because one of them alone was not enough:

**1. Nothing may out-push the escape.** `insideAccel` 4000 -> 5600. Guarded by a
test on the two numbers so they cannot drift back past each other.

**2. The escape she actually gets must BE that.** Only the single-rect case
delivered it. Inside one element with a second just beside it — a title over a
demo, a caption over a figure, which is most of a project sheet — the block she
is in pushes one way and the block she is beside pushes back the other. Measured
at a point 40 px under a title, inside the demo:

| | |
|---|---|
| push out of the demo | 5600 |
| title pushing back | 2187 |
| **net** | **3413** — and 1813 with the original 4000 |
| a full-lean steer | **4420** |

So the steer beat the real escape by 2.4x in the arrangement she was reported
stuck in. The escape is normalised now: inside anything, whatever direction the
sum found gets the full magnitude. Only ever topped UP — two rects that agree
still push twice as hard. The old saddle nudge was one end of this continuum
(sum exactly zero) handled on its own; it is now the zero-length branch of the
same rule.

**3. And she is never AIMED anywhere she cannot be.** A* has always ended at the
nearest open cell, but the two branches that do not plan — the barge and the
no-route fallback — flew at the raw target, and the reader's cursor is inside a
paragraph, a title or the terminal most of the time. `nearestOpenPoint` now
sanitises the steer target, the seek goal, and every hover anchor.

The seek goal specifically, and not only the steer target: `seekDone` measures
against that goal, so a raw goal buried in a 700 px element is a distance she can
never close — the seek never ends and she hangs at the boundary at sprint speed.
Aim and arrival have to be the same point or one of them is a lie. (Measured: 15 s
of seek that never completed, before.) Hover anchors for the same reason — every
settle in brain.js is "stop here and hover", and a fling that ended in a
paragraph, a beam fired from inside one, or a cruise that timed out mid-page all
anchor her in it.

**Verified.** 808 checks pass, including a new section whose every route
assertion is paired against the same grid with the squeeze switched off — a 150 px
gap that used to be threaded is now routed around (crosses at x 1020 vs 562), a
page with nothing usable is now crossed dead straight (2 px of sideways wander vs
758), and a 260 px gap is still used, because the rule is not a hammer. Plus the
two force invariants above, and a full-loop check with the cursor parked inside a
large element.

**Not reproduced headlessly:** a three-minute soak on a synthetic busy sheet
improves (0.5 s -> 0.1 s stalled inside type, longest single stall 0.4 s -> 0.0 s)
but never showed the multi-second stall as reported, so the arithmetic above is
the evidence, not the soak.

## Pathing, round four — the cause at the terminal, and a force instead of a detector

Reported with a screenshot: she parks against the LEFT EDGE of the USB sheet's
terminal block and struggles there. Explicitly asked for no micropatch — replace
the grinding detector with a push force that grows with time, counted from when
the destination is assigned, flat for the first three seconds.

### The cause, which was two things and neither of them force

**`.spec.term-col` is `position:absolute; left:var(--pad)` — 48 px at that width
— about 860 wide and taller than the window.** So the gap between it and the
left rim is 48 px against a body 150 px across, and the block itself is wider
than she can coast over.

**1. The waypoint cursor could only advance by LINE OF SIGHT.**

    while (i < path.length - 1 && losPoints(pos, path[i + 1], r)) i++;

Line of sight means "through cells at most `losMaxCost` (2.2)", which is the
whole point of it — a shortcut that cuts a corner through a paragraph is not a
shortcut. But it made sight the *only* way forward, and inside expensive terrain
there is never any sight. A route across a block therefore gets no smoothing at
all — measured, 32 nodes, one per cell — and **every one of them fails the
test**, so the cursor froze on node 1 and she stood on the last cheap node
before the type, at ~5 px/s, being steered at a point she was already standing
on. The last cheap node before the terminal is its left edge, 48 px off the rim.
That is the screenshot.

Reaching a node now advances past it, unconditionally (`path.reachedPx` 46, a
little over one cell). Sight is what it always was — an optimisation that skips
AHEAD — and no longer the only thing that can move her along a route she has
already committed to.

This one was made worse by round two, honestly: before the squeeze surcharge the
crack beside the terminal cost ~1, so a route threaded it and sight worked along
it. Pricing the crack as solid was right, and it moved the failure from "wedged
in the crack" to "parked outside the block".

**2. The escape that always beats the steer also means she can never CROSS.**
Round three raised `insideAccel` above the steer so nothing could hold her inside
type. The same fact, read the other way: she is ejected sideways faster than she
can be driven forward, so a block wider than she can coast over is impassable.
Both halves of that are needed, and a static force cannot give both.

### The force, which is what makes both true at once

The detector — "under 40 px/s for 0.45 s, therefore switch avoidance off for
1.2 s" — is gone entirely, along with `world.pushThrough`, `brain.stuckTime`,
`unwedgeImpulse` and four config keys. A detector has to decide from outside that
something has gone wrong and can be wrong in both directions: it fires on a slow
arrival and misses a slow grind that stays just above its threshold. Whatever it
does next is a mode, so the motion has a seam at each end of it.

    push: { delayS: 3.0, rampS: 3.5, maxMul: 3.2 }

Measured from `brain.stateTime`, which for a travel state IS the age of the
destination. No threshold, no mode, no seam, and nothing on this page pushes back
with a force that GROWS — so nothing can hold her.

**It is free when it is not needed**, which is what makes it safe to leave armed:
`steerArrive` asks for a SPEED, so the force is proportional to the error, and in
open air the error is zero. Measured, an unobstructed 1,000 px trip:

| ceiling | time | peak speed |
|---|---|---|
| x1 (off) | 2.15 s | 502 px/s |
| x3.2 | 2.15 s | 502 px/s |
| x6 | 2.15 s | 502 px/s |

Identical. It only ever shows up against something resisting her.

**And it is not gated on the lean.** The throttle normally opens only once the
posed body axis has turned onto the travel line — and that axis follows travel,
so a body that is not moving never leans in and sits at `minMul`, a third of
thrust. Self-reinforcing, and the exact opposite of what being stuck calls for.
The ramp blends the gate out as it comes on.

**Verified** against a wall running past both ends of the grid and 700 px deep,
so there is no way round and the only route is through:

| ceiling | travelling (leanIn 1) | stalled (leanIn 0) |
|---|---|---|
| x1 | **never, in 40 s** | **never, in 40 s** |
| x2 | 11.2 s | 11.3 s |
| **x3.2** | **7.7 s** | **8.1 s** |
| x4.5 | 7.1 s | 7.6 s |
| x6 | 6.8 s | 7.4 s |

x1 is the check having teeth. 3.2 is the knee; past it the return is small, and
crossing a block of type ought to look like effort.

Giving up on a destination survives, driven by the trip timing out
(`cruiseGiveUpS` 14) rather than by a grind detector — the same clock as
everything else in the file, and it cannot mistake a slow arrival for a stall.
By then she has been pushing at full weight for seconds, so it is the place that
is wrong, not the force.

Three-minute soak on the busy synthetic sheet: **distance travelled 35,400 ->
44,500 px** in the same time, longest stall 0.3 s -> 0.2 s. 810 checks pass.

## Pathing, round five — she stays on the screen

Round two gave the sides a 560 px leash and let the planner see 500 px past each
rim, so she could round an element flush to the edge by going outside the page.
It worked, and it read as her wandering off the sheet constantly — worse than
the thing it fixed. Reverted, deliberately: **getting past an element is the push
ramp's job now**, which is only true because round four made pushing through
actually work.

| | before | now |
|---|---|---|
| `path.outsideXPx` | 500 | **0** — routes stay on the paper |
| `physics.edgeSlackXPx` | 560 | **0** — no free travel sideways |
| the line is drawn at | her centre | **her skin** (one radius in) |
| `edgeRampXPx` | — | 40, the spring is at full within this |
| `edgeReturnAccelX` | 900 | **12000**, more than twice `insideAccel` |
| `edgeHardXPx` | 1000 | 420 — a backstop, not the boundary |

**Three things had to be true at once, and each needed its own change.**

**1. The planner must not propose what the leash will fight.** The grid stops
where the page does. Otherwise A* keeps finding the beautiful outside route and
she spends her life driving into a spring.

**2. An element flush to the rim must not be able to push her off the page.**
The escape from inside a rect goes out the SHALLOWEST wall, and for the USB
sheet's terminal — 48 px off the left rim — that is the wall facing the rim. Two
answers, both needed: the sideways spring is now firmer than `insideAccel`, and
`avoidColliders` will no longer CHOOSE a wall whose far side is off the page. A
way out that does not exist is not the shallowest way out; it is not a way out.
Second shallowest, then.

**3. The line is her skin, not her centre.** Held at the rim by the centre, half
of a 150 px animal hangs off the page — which is exactly the thing being
complained about. The sideways line sits one body radius in.

Measured over five minutes of ordinary life on a sheet shaped like the USB one
(title, the terminal flush at `--pad` and taller than the window, an aperture
against the right rim, things nested inside both, reader scrolling and moving
the cursor throughout):

| | by the centre | by the skin |
|---|---|---|
| worst overhang | 139 px | **29 px** of a 150 px body |
| time with any part over the line | 13.7 s of 300 | **3.7 s of 300** |
| stalled inside type | 0 | **0** |

**And the three things that legitimately involve the outside all still work**,
which is why the stop stayed at 420 rather than becoming a wall:

- a **startled exit** leaves the frame entirely (reaches x −421) — the sideways
  leash switches off while `world.panicking`, because leaving is the whole shape
  of it;
- a **page swap** still places her off the side (x 1570) and she flies in within
  0.3 s;
- **crossing the terminal block** got faster, not slower — 8.0 s → **4.1 s** —
  because she now goes through it instead of hunting for a way round.

**Also fixed, unrelated and found by it:** the shiny-entrance test bailed out of
its loop on the file-wide `failures` counter, so any four failures anywhere
earlier in the suite broke it on frame zero and reported three more failures that
had nothing to do with the burst. The guard is local now. A cascade like that
makes a real regression look like it broke something it never touched.

817 checks pass, build clean.

## The entry, round two — a stale measurement, not a stale position

Reported: after a page swap her vertical position persists, so she does not come
in strictly from a side. Both directions.

The `recollect` handler has always set her y inside the viewport. It was reading
the wrong viewport.

`commit()` does three things in ONE synchronous block: replace `#doc`, scroll to
the top, emit `recollect`. But `scroll` is an **asynchronous** event, and the
document-height check runs twice a second. So at the instant `recollect` fires:

| | holds |
|---|---|
| `world.scroll.y` | however far down the OLD sheet the reader was |
| `world.docSize.h` | the old sheet's height |

`body.pos.y = world.scroll.y + vp.h * (0.3 … 0.7)` therefore reads
`oldScroll + a bit` — hundreds or thousands of pixels down the NEW sheet, well
below a window that now starts at 0. Her x was placed correctly outside a side
the whole time, which is why it reads as "not strictly from the side" rather than
as a teleport: she is off the side AND far below, so she arrives diagonally from
under the corner.

Measured, with the fix removed:

| | her y | the window she landed in |
|---|---|---|
| home → project, reader 1,200 down | 1,694 | 0..900 |
| project → home, reader 4,800 down | 5,101 | 0..900 |

794 px and 4,201 px below the window.

**Fix:** world.js re-measures on `recollect` — viewport, document size and scroll
offset — subscribed at construction so it runs before the brain's handler and
the collider tracker's (the bus fires in subscription order and `createWorld`
runs first). `docSize.h` mattered too: the pathfinder grid was the previous
sheet's height for up to half a second after every swap.

Also fixed in the same handler: **a teleport is not a move.** The render loop
interpolates `prevPos -> pos`, so leaving `prevPos` on the old sheet draws one
frame of her halfway between where she left and where she arrived — a streak
across the page on the first frame of every entry.

**The test needed the browser half of world.js**, which the headless sim suite
does not have — so this lives in `test/router.test.mjs`, driving the real router
and a real (non-headless) world against the fake DOM, whose `window` never fires
`scroll` because a real one does not fire it synchronously either.

The first version of that check passed with the bug still in, because it compared
her y against `world.scroll.y` — the stale value — which is a stale thing checked
against itself. It asserts against the harness's own scroll position now, plus
`world.scroll.y === window.scrollY` directly. **4 failures with the fix removed,
clean with it.**

## The entry, round three — a beat before she arrives

`entryDelayS: 2.0`. She used to ride in on the same frame as the swap, which is
before the paper has even finished closing; an entrance needs somewhere to
arrive into, so the sheet settles first.

She waits at a standstill outside the frame, which meant the sideways leash had
to let go of her for it — the same exemption a startled exit uses, and for the
same reason: being off the page is the POINT there rather than a failure. That
was `world.panicking` on its own; it is `world.offLeash` now, written by the
brain and covering both moments, so `resolveEdges` has one flag to read instead
of a growing list of special cases.

Nothing steers her during the wait and `stateTime` does not run, so the seek she
starts afterwards begins from zero — the push ramp's three-second grace is not
quietly eaten by the two seconds she spent holding.

Traced: parked at x 1570, `vx 0` and `offLeash true` through t=1.90; the kick
lands at 2.0; wholly on screen at **2.20 s**. 826 checks, router harness clear,
build clean.
