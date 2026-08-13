# DESIGN BIBLE — the ASCII portfolio

This is the art direction, pinned to numbers. It is to the look what
`src/config/rigConfig.js` is to the rig: the single place a decision is made, so
that ten sessions building ten components produce **one** site.

Read this before `IMPLEMENTATION_PLAN.md`. If a plan step and this document
disagree, this document wins and the plan gets amended.

---

## 1. The thesis

> **Every word on this page is a crowd.**

Nothing here is typeset. A heading is *assembled* out of hundreds of smaller
glyphs that were doing something else a second ago and will go back to doing it
when you look away. The page's resting state is a field of characters with
weather in it — drifts of dense text, clearings of near-empty paper. Meaning is
what happens when part of that field agrees to line up.

Three consequences, and they are non-negotiable:

1. **The field is continuous.** Words do not fade in over a background; they are
   made *of* the background. There is never a moment where a word exists and the
   cloud does not, or vice versa. Every transition on this site — hover, route
   change, beam hit — is the same cells re-agreeing.
2. **Density is the medium.** Value comes from how much ink a cell carries and
   whether it is inverted, not from opacity. Never fade a glyph to 40% grey to
   make it lighter; pick a lighter glyph. Opacity is for one thing only:
   cross-fading the whole layer during a hard cut.
3. **Colour is misregistration, never fill.** See §3.3.

---

## 2. The references, read properly

The eight images in `future-refs/` are not a mood board to average. Each teaches
exactly one thing, and two of them are traps.

| Reference | What it teaches | What to ignore |
|---|---|---|
| `general-asci-reference` (Otaku poster) | **Value from mass and sparsity, not from a grey ramp.** Darks are solid runs of one repeated dense glyph (`JJJJJJJ`); midtones are sparse `@ // rM` fringes; lights are isolated punctuation on bare paper. Two inks on cream. | Its display type is *clean magenta sans, not ASCII*. We are doing the harder thing. See §4.4 for how the headers still stay legible. |
| `not-style-i-want-but-this-type-of-feature-mapping` | **Feature mapping** — value carried by *where* the characters are, and the fill being a *meaningful repeated word* rather than random characters. | **Its inverted cells.** This row originally read "inverted cells double the tonal range for free" and that sentence is what put black rectangles on the headings. Inversion is quarantined to the portrait (§3.4a); type gets its darks from overstrike. Also ignore the harsh 1-bit black — our paper is warm. |
| `architectural-lidarish-asci` | **Multiple text scales in one composition.** Dense body copy reads as a grey plane; runs of text rotated along an edge define form. Editorial, constructivist, confident. | Do not rotate text off the grid. We get the same energy from *runs* along grid axes. |
| `another-reference` (portrait) | **Airiness.** Fine, delicate, punctuation- and digit-heavy, lots of bare paper. This is the register for the hero portrait. | — |
| `ascii-saturn` | **Continuous tonality by glyph shape.** Characters chosen for their silhouette (`M X Z` dense, `. ' \`` sparse) produce a gradient with no dithering. | — |
| `old-computer-asci` | The Y2K/BBS pointer: `B 8 o` masses, isometric construction, no anti-aliasing. Use **sparingly**, as a quotation. | Do not build the whole site here. It dates instantly. |
| `slightly-colored-eyes-*` (both) | **The colour rule.** Near-black glyphs on white with a *whisper* of chromatic fringe — pink in one, blue in the other. The darkest mass is the iris. Colour arrives as a printing error, not as a decision. | — |

**The synthesis:** the Otaku poster's density logic, the feature-mapping ref's
inversion trick, the eye refs' chromatic whisper, at the airiness of the
portrait. Y2K is a seasoning, not a base.

---

## 3. The system

### 3.1 The grid

One global lattice. Everything on the site — every glyph, every image, every
piece of Mew's shadow — lands on it. This single rule is most of what will make
the site feel designed rather than assembled.

```
cell aspect   0.583  (w/h)      matches monospace metrics; cells are taller than wide
base cell     7 x 12 CSS px     at the 1440px breakpoint
```

Cell size is **quantized in integer steps by viewport width**, never
interpolated, so a glyph never lands on a half pixel:

| viewport width | cell (w × h) | approx grid |
|---|---|---|
| ≥ 1600 | 8 × 14 | 200 × 64 |
| 1100–1599 | 7 × 12 | 171 × 66 |
| 700–1099 | 7 × 12 | 100 × 55 |
| 420–699 | 6 × 10 | 78 × 66 |
| < 420 | 6 × 10 | 62 × 66 |

The grid origin is the document origin, and it does **not** scroll fractionally:
scroll offset is snapped to whole cells for the field layer. A field that slides
sub-cell against its own lattice is the single fastest way to make this look
cheap.

### 3.2 The two voices

Both from one family so the page reads as one system.

- **FIELD** — the lattice. `IBM Plex Mono` (SIL OFL), weights 200 / 400 / 600.
  Chosen over JetBrains Mono because its six weights give density a second
  dimension: a cell can get darker by changing *weight* as well as glyph, which
  is exactly the "thinner characters or thicker characters with some randomness"
  brief. Never loaded as a webfont at runtime — it is baked into the glyph atlas
  offline (§4.1).
- **VOICE** — small utility text that is *not* made of ASCII: dates, captions,
  footnotes, the reduced-motion toggle. `IBM Plex Mono` 400, rendered normally.
  This exists so the eye has somewhere to rest. A page where literally
  everything is a crowd is exhausting; the rare piece of plain text is what
  makes the crowds read as deliberate.

Subset to Latin + the ramp's punctuation. Preload the VOICE weight only.

### 3.3 Colour

```
--paper   #F4F2EC    warm bone. NOT white: white glares, and bone reads as print
--ink     #12100F    warm near-black. NOT #000: pure black reads as a terminal
--fringe-a #E0447A   magenta, from the Otaku poster's second ink
--fringe-b #2B6FE0   blue,    from the eye reference
```

**The colour rule, and it is a hard budget:**

> Chromatic ink appears only as a **one-cell offset ghost** at the edge of a
> dense mass, and covers **no more than 4% of the cells in any viewport**.

That is the mechanism behind the eye references: it is a two-colour print that
did not register. It is never a fill, never a highlight, never a hover state,
never "the accent colour". Implementation: when a cell's density exceeds
`fringeThreshold` and a 4-neighbour is at least `fringeDelta` lighter, that
lighter neighbour may be painted in a fringe ink at reduced weight. Which ink is
a stable function of cell index, so the fringe does not crawl.

Mew keeps her full pink `#F8B7DE` (and the shiny `#9CDEFF`). She is the only
fully saturated object on the site. That is exactly why she reads as alive.

### 3.4 The ramp is measured, not guessed

This project's culture is that constants are measurements. The ramp is no
exception, and "sort the ASCII characters by how dark they look" is not good
enough — it is what makes ordinary ASCII art look like halftone instead of
drawing.

`tools/glyphatlas.py` renders every candidate glyph at cell size, for every
weight, and emits per glyph:

- `cov` — ink coverage, 0..1
- a **6-D shape vector** — coverage sampled by six staggered discs (top-left,
  top-right, mid-left, mid-right, bottom-left, bottom-right), so a glyph knows
  *where* its ink is, not just how much
- flags: ambiguous-at-size, too-wide, confusable-with

Runtime picks a glyph by nearest neighbour in that 6-D space, not by luminance.
That is what lets the field choose `L`, `T`, `p`, `j` for their *direction* and
produces the drawn quality in `ascii-saturn` and `another-reference`. The
lookup is a quantized cache (5 bits per axis) so it is O(1) after warm-up.

Ramp families, used as registers:

```
SPARSE     (space) . ' ` , : ; - ~ ^ "        lights, bare paper
MID        i l t f j r x n u v c z 1 7 ( ) /  midtones, directional
DENSE      o e a s w m 0 4 8 9 $ % #          weight
SOLID      M W B @ & Q Z J   at weight 600    darks
OVERSTRIKE two glyphs in one cell, offset     the last two stops
```

### 3.4a OVERSTRIKE — where the darks come from, and why not from a block

The baked ramp's densest single glyph is **0.337 ink** (`Q` at weight 600).
There is no glyph in a monospace font that fills a cell, so a naive reading of
"we need darker" leads straight to an inverted cell — a solid ink block with a
glyph knocked out of it — and that is what shipped, and it was wrong. A field of
black rectangles is not type made of type. It is a stencil.

The right answer was in the owner's opening brief all along:

> "…not just line-by-line of text with margins, but with **overlapping text in
> order to bring out some darks** and some parts more spaced out to bring in
> lights."

So the darkest two stops are made by **striking a second glyph into the same
cell**, offset by roughly a third of a cell across and a tenth down. Two glyphs
at ~0.33 compose to ~0.5–0.55 effective ink, the cell stays unmistakably made of
letters, and the artefact it produces — a doubled, slightly misregistered
character — is a typewriter double-strike and a badly registered print run. It
belongs to the same world as the chromatic fringe in §3.3, and it is the second
place that world shows up.

Rendered comparison lives at `tools/preview/heading_modes.png`: A is the
inverted version that shipped, D is overstrike at the same word. D is legible,
darker than plain dense glyphs, and contains no rectangle.

Cost: overstruck cells are a second instanced draw. They **replace** the
inverted-cell draw, so the draw-call budget is unchanged.

**INVERT is not deleted — it is quarantined.** It stays available for the
portrait (§4.5), where the feature-mapping reference genuinely uses it and where
the subject is an image rather than type. It is **banned from the field and from
every word**, and `field.invert.slotDensityAbove` must not exist any more.

### 3.5 Frozen randomness

Every "random" choice on this site — which of the top-k glyph matches a cell
uses, its weight jitter (±1 step), its drift phase — is a **stable hash of the
cell's identity**, not a per-frame roll.

This is the difference between *cryptic* and *noisy*. A frozen field has
texture; a re-rolled field strobes, gives people headaches, breaks
`prefers-reduced-motion`, and makes phones hot for nothing.

Glyphs do re-roll — see DRIFT in §5 — but on a slow Poisson timer, per cell,
never in lockstep.

---

## 4. The type engine

### 4.1 How a word is made of smaller type

1. The word is rasterized to a coverage bitmap at grid resolution — offline for
   fixed copy, at runtime (one small 2D canvas, cached) for dynamic copy.
2. Each covered cell becomes a **slot** carrying a target density from the
   coverage, plus the local 6-D shape vector of the letterform passing through
   it.
3. A glyph is chosen per slot by 6-D nearest neighbour, with frozen jitter.
4. Slots at the letterform's edge get a lighter register; slots in the stem get
   SOLID or INVERT. **The letter's silhouette must survive being squinted at.**

### 4.2 The field at rest

The idle cloud is **not noise**. Its density follows a slow domain-warped noise
field, so the page has weather: drifts of darker text, clearings of near-bare
paper, at a scale of roughly 20–40 cells. Random uniform noise is the single
most common failure of ASCII web design and it looks like static.

Target: **12–22% mean ink coverage** at rest. Above that the page feels
oppressive; below it the words have nothing to assemble out of.

**But weather alone is not composition, and the first build proved it.** Noise
that is statistically the same everywhere covers the viewport corner to corner
with an even grey, which is exactly what "the cloud is a field pattern
everywhere on the screen" means. Every reference in `future-refs/` has *empty
paper* in it — large, confident, deliberate voids. The Otaku poster is more than
half bare.

So resting density is **two factors multiplied**:

```
density = weather(warpedNoise)  ×  presence(distance to the page's content)
```

`presence` is a soft field that peaks over the page's real content — headings,
VOICE blocks, the portrait — and falls to near-zero in the margins, with a
falloff of ~18 cells. It is computed **once at layout, from the DOM's own
rects**, and baked into the cell data texture, so it costs nothing per frame and
it is automatically correct on every breakpoint and every route.

The result is that the crowd *gathers where the page has something to say* and
thins to bare paper where it does not. That is the localized cloud, and it is a
better answer than a hand-placed one because it can never disagree with the
layout.

Budget: **35–55% of the viewport should be near-bare paper** (< 0.04 effective
ink) at rest. If that number drops, the page is a texture again.

### 4.3 Self-assembly, and why the pointer no longer summons a word

**This replaces the original pointer-gather design, which was wrong for a
reason worth recording: it hid the navigation.** A visitor who does not sweep
the cursor across a field of noise never discovers that there are links in it.
A portfolio whose menu is a puzzle is a portfolio nobody reads.

So the words **assemble on their own**. On route settle, every ASCII word on the
page condenses out of the field over `assembleS` (≈2.6 s), with a per-cell
stagger from the cell's frozen seed so it gathers rather than fades. It then
**stays assembled**. The field around it stays alive — cells still drift, still
re-roll — so the word is never a static image; it is a crowd holding a formation.

The GATHER verb is unchanged; only its trigger moved, from pointer proximity to
route arrival. Everything built for it survives.

Assembly order is **outside-in by distance to the word's own centre**, so the
silhouette resolves before the interior detail, which is what makes it read as
condensation rather than as a wipe. `:focus-visible` on a real DOM link forces
its word to full assembly instantly — keyboard users get the same page.

### 4.3a Hover

Hover is now a *modulation of an already-assembled word*, which is a better job
for it. Four things happen together over ~180 ms, and none of them is a colour
swap:

1. **The word sharpens.** Stem density up ~15%, counters and surround thinned
   harder. Contrast rises; the letterform tightens.
2. **A shiver.** Glyph re-roll rate spikes to ~8× for 250 ms, then decays back.
   The word visibly reconsiders itself and settles — the crowd noticing you.
3. **The fringe arrives.** This is the one hover that may spend chromatic ink:
   a one-cell ghost on the stems' leading edge (§3.3), inside the 4% budget,
   which is what makes a hovered word feel *printed* rather than lit.
4. **A one-cell breath.** Stem cells drift outward by ≤0.35 cell and back.

Off-hover, all four relax on the same spring. Nothing snaps.

### 4.4 Making ASCII headers actually legible

This is the real risk of the brief, and the Otaku poster ducked it (its display
type is clean sans; only the illustration is ASCII). **These rules were rewritten
after the first build shipped headings as black rectangles at eleven times the
body size — both of which the original wording caused.** Five rules now:

1. **Mass, not outline — and mass means dense GLYPHS.** A stem is a run of
   SOLID-register characters at weight 600, overstruck (§3.4a) where it needs to
   be darkest. Never a one-cell-wide outline, and **never an inverted cell**.
2. **The word reads by CONTRAST, not by ink.** The densest glyph is 0.337 ink,
   so a stem can never be dark in absolute terms. It does not need to be: what
   makes a letterform readable is the *ratio* between stem and counter. Counters
   and the immediate surround are thinned to **near-bare (≤0.06 effective ink)**
   — call it 6:1 against the stem — and the letter appears. Thin the counters
   too gently and the word turns to mud; that, not stem darkness, is the failure
   mode to watch for.
3. **Size is set in ROWS, not pixels.** A letterform needs **7 rows of cap
   height** to be legible and **9 to be comfortable** — that is the classic 5×7
   bitmap floor plus room for a counter. Everything about heading size follows
   from the row count and the cell height, and §3.6 turns that into a scale.
4. **One clear counter.** Letters with holes (`O`, `P`, `R`, `A`, `Q`) must keep
   at least one near-bare cell inside the counter. At 7 rows this is tight; at
   9 rows it is comfortable. Below 7 rows the word falls back to VOICE.
5. **Squint at it.** Screenshot the heading, greyscale, scale to 25%. If the
   word survives, it is legible. If it becomes a grey bar, the counters are not
   cleared hard enough (rule 2) or you are below 7 rows (rule 3).

### 3.6 The type scale

The first build set headings with `font-size: min(13vw, cell-w × 26)` — 166 px
against 15 px body copy, **eleven times** the body. That is not a heading, it is
a billboard, and it came from rules 1–4 above in their original form demanding a
two-cell stem out of a 7 px cell.

Size is now derived from rows, and the arithmetic is worth stating because it
sets a hard floor on how small an ASCII heading can ever be:

```
cap height (px) = capRows × cellHeight(px)
```

| cell | 7 rows | 9 rows | 11 rows |
|---|---|---|---|
| 4 × 7 (recommended base) | **49 px** | **63 px** | 77 px |
| 5 × 9 | 63 px | 81 px | 99 px |
| 7 × 12 (the old base) | 84 px | 108 px | 132 px |

**A 2× ratio to body copy is not reachable.** At 16 px body, 2× is a 22 px cap
height, which at any renderable cell size is two or three rows — you cannot draw
a letter in three rows. The honest floor is **≈3× body copy**, and that needs
the finer cell.

So the scale, and every number is one knob:

```
VOICE body            16 px            (was 15)
ASCII nav link        7 rows  = 49 px  ≈ 3.1× body
ASCII h1              9 rows  = 63 px  ≈ 3.9× body
base cell             4 × 7 px         (was 7 × 12)
```

That takes the heading from 166 px to 63 px — **62% smaller** — and takes
`PROJECTS` from 994 px wide to 480 px. Both are measured, in
`tools/preview/heading_modes.png`.

**The finer cell is not only a size fix.** Every reference in `future-refs/` is
finer-grained than the 7 × 12 build: `another-reference` and `ascii-saturn` are
90–200 characters across. Dropping to 4 × 7 moves the whole field toward them.

**Cell size has a device-pixel floor.** A 4 px cell on a DPR-1 display is 4
device pixels and turns to mush. The rule is
`cellW = max(base, ceil(minDeviceW / dpr))` with `minDeviceW = 8`, so a retina
screen gets 4 CSS px and a non-retina one gets 8. The lattice stays integer
either way (§3.1).

### 4.5 The portrait

The hero portrait (your face / your cat, right side of screen) is **baked
offline**, not computed live:

- source video/gif → per-frame cell grid → 6-D glyph match → packed binary
- **delta-encoded** between frames; most cells do not change
- target: ≤ 200 KB for ~4 s
- plays at **12 fps**, deliberately. It matches the old-computer register, it is
  the difference between a costly and a free feature, and 12 fps *reads as
  intentional* where 24 reads as a bad video.

A still photo is the same pipeline with one frame. Prefer a short, slow,
near-loop clip (a blink, a head turn) over anything with big motion — the
technique falls apart on fast movement and looks magnificent on stillness.

Register: the airy one. `another-reference`, not the Otaku poster.

---

## 5. Motion vocabulary

Four verbs. Everything on the site is one of them. All spring-based, reusing
`src/utils/math.js` (`Spring`, `expDamp`) — already frame-rate independent and
already tested, and the reason Mew feels alive.

| Verb | Trigger | Behaviour | Feel |
|---|---|---|---|
| **DRIFT** | always | Cell wanders ±1 cell on a low-frequency noise field (~0.15 Hz). Glyph re-rolls on a per-cell Poisson timer, **mean 2.5 s**. | Breathing. The apparent "rapid change" comes from thousands of cells each changing rarely — never from any one cell flickering. |
| **GATHER** | **route settle** (§4.3), focus | Lerp from drift home to word slot, staggered outside-in by the cell's own seed. Runs to completion and stays. | Agreement. Condensation. |
| **MIGRATE** | route change (§7.1) | The whole crowd surges along the travel direction, staggered by seed, ahead of the camera. Rises and falls on one bump curve. | A flock taking off. The crowd *leads*, the camera chases. |
| **SCATTER** | hyper beam, Mew collision | Impulse along the beam normal, scaled by distance and incidence angle. Cell flies, tumbles slightly, ink weight briefly heavier (struck = smudged). | Impact. |
| **SETTLE** | after SCATTER | `expDamp` home. **Overdamped — never oscillates.** | Dust settling. A bouncing letter reads as a toy. |

Timing, as a starting calibration:

```
assembleS         2.6   s    route settle -> fully formed word (§4.3)
assembleStaggerS  0.9   s    spread of per-cell start times inside a word
gatherRate        9.0   1/s  exponential approach, once a cell has started
hoverRate        12.0   1/s  hover modulation spring (§4.3a)
hoverShiverMul    8.0        glyph re-roll multiplier on hover, decays in 250 ms
scatterImpulse  900     px/s at the beam axis
settleRate        1.6   1/s  slow. the drift home should take ~2 s
driftHz           0.15
glyphRerollMeanS  2.5
```

---

## 6. Named behaviours

### 6.1 Load

Page opens as a near-bare field that **inhales**: density ramps from 4% to rest
over ~900 ms while the hero portrait resolves from noise. Mew's existing shiny
roll and star burst are unchanged and land on top. No spinner, ever.

### 6.2 Navigation

There is no page load. See §7.

### 6.3 Links

A link's word is dormant in the field until approached (§4.3). Focus via
keyboard resolves it identically — the DOM link is real and focusable, and
`:focus-visible` drives the same GATHER.

### 6.4 The hyper beam

Replaces the deleted `fx/destruction.js` entirely. The beam **displaces** type:

- cells within the corridor take a SCATTER impulse, strongest on the axis,
  falling off across the width and with distance from the muzzle
- displacement is **temporary and non-destructive** — nothing is removed, no
  state persists, there is nothing to reset
- cells SETTLE home over ~2 s, arriving at slightly different times so the text
  reassembles like sand rather than snapping back
- struck cells briefly pick up a fringe ink (§3.3) — this is the one place the
  colour budget is allowed to spike, and it is over in a second

The beam already emits `beamFire` on the world bus with a document-space origin,
direction and length. The type layer subscribes; nothing else needs wiring.

### 6.5 Mew's presence in the field

Mew is **not** ASCII (see §7.2), but she is not floating in a separate universe
either. The field knows about her: cells within ~1.5 body radii thin slightly
and drift away from her, so she pushes a soft clearing through the text as she
swims. Cheap — it is one distance test in the same pass that already runs.

---

## 7. Architecture that the look depends on

These are aesthetic decisions that happen to be technical, so they live here.

### 7.1 One canvas, one context, forever

The DOM is the layout engine and the accessibility layer; the canvas is the
paint. `index.html` documents the contract. Consequences:

- The browser does reflow, responsive layout, text selection, focus order,
  screen-reader semantics, and right-click-open-in-new-tab. We never
  reimplement any of it.
- **Navigation is an SPA route swap, not a document load.** A cross-document
  navigation would destroy the WebGL context, drop the glyph atlas, reload Mew
  and reset the field — a visible hitch on every click, which is exactly what
  you said you would not accept. Cross-document View Transitions are lovely and
  are the wrong tool for a site with a persistent living canvas.
- Route modules are prefetched on idle and on link hover, so the content is
  resident before the click.

### 7.1a The site is a place, not a stack of documents

The original wording ("route change = a GATHER re-target") was correct and far
too small an idea. Here is the real one.

**Every page is a panel on one continuous plane, and navigating is moving the
camera across it.** There is no page load, no fade, no cut. The crowd of
characters is the same crowd the whole time; it walks with you.

**The map.** Routes sit on an integer lattice, in `siteConfig.map`:

```
                 [0,-1]  who am i          N
   [-1,0] my journey   [0,0] home   [1,0] projects        W  ·  E
                 [0,1]  case studies       S
```

Home at the origin is one step from everything, which is why it is home. Adding
a page is one line; moving a page is editing two numbers. Nothing else in the
system knows a compass direction exists.

**The plane wraps. It is a torus.** The axes have an extent (3 × 3 for the map
above) and travel takes the *shorter signed delta modulo that extent*:

```
delta = ((b − a + E/2) mod E) − E/2
```

West → East is `(−1) → (+1)`: the direct route is +2, the wrapped route is −1, so
you travel **left** and arrive at East from the far side. North → South goes up.
That is exactly the behaviour asked for, and it is not a special case — it is
what the modulus does. A bigger map gets the same behaviour free.

The torus is also free in the renderer: the cell data texture covers the whole
map and is sampled with `REPEAT` wrapping, so walking off the west edge samples
the east panel's texels. **The wrap-around is literally texture wrapping.**

**The transit, beat by beat.** This is the sequence, and the ordering is the
whole effect — the crowd leads and the camera chases:

| t (ms) | what |
|---|---|
| 0 | Click. `pushState` fires, the URL is already the destination, the destination DOM mounts at its panel. **Nothing has visibly happened yet.** |
| 0 → 180 | **MIGRATE** begins. Cells surge along the travel direction, each starting at its own seeded delay, so the crowd peels away rather than sliding as a sheet. The departing page's words dissolve back into the field as they go. |
| 140 | **The camera starts**, deliberately late, so it reads as *following*. `cubic-bezier(0.42, 0, 0.12, 1)`: a soft launch and a long, decelerating arrival. |
| 140 → 1240 | The pan. Distance is `|delta| × viewport`; duration scales as `base × |delta|^0.6`, so a two-step move is longer but not twice as long. |
| ~900 | MIGRATE's bump curve falls. The crowd decelerates ahead of the camera. |
| ~1150 | The camera arrives and settles. |
| 900 → 2400 | **GATHER**: the destination's words condense (§4.3). The heading is the last thing to finish, which is what makes arrival feel like arrival. |

Total ≈ 2.4 s, every number a config knob.

**What moves and what does not.** The field's camera is a 2D generalisation of
the scroll offset it already has, so panning reuses the machinery that already
recycles cells at the viewport edge — a pan and a scroll are the same operation.
The DOM rides along on one composited `translate3d` of the panel stage. **Mew
does not pan**: she is a creature, not scenery, and she stays with the viewer.
She does take a small impulse away from the travel direction as the world starts
moving and then catches up, which sells the whole thing for the price of one
`addImpulse`.

**One screen per page.** Strongly recommended, and the map only really works
this way: a panel is exactly one viewport, so North is always one screen up. It
also suits the register — these references are posters, not documents. Long-form
copy lives in a bounded internal scroll region inside a panel, or, better, gets
its own map cell. If a page ever must scroll the whole panel, vertical
navigation has to give up that axis.

**Accessibility.** The pan is decorative. Under `prefers-reduced-motion` the
camera jumps and the words cross-fade over 240 ms; the DOM swap, the URL and the
focus order are identical either way.

### 7.2 Mew stays Mew — and how to flip her to ASCII later

Mew renders exactly as she does today: her own pass, sprite-shaded, through the
pixelate post-process, on top of the field. She is the saturated, smooth,
*alive* thing in a flat two-ink world, and that contrast is the site's best
joke.

**The toggle exists in code from day one.** In `src/config/rigConfig.js`:

```js
presentation: {
  mode: "pixelate",   // "pixelate" | "ascii" | "cutout" | "none"
  ...
}
```

Set `mode: "ascii"` and Mew is rendered into the same glyph atlas as everything
else, at her own (coarser) cell size, and composited into the field. That is the
whole change — one string. It works because `fx/presentation.js` already selects
a pass behind one interface (`pixelRatio / snapPx / resize / render / dispose`),
so `fx/asciiPass.js` only has to implement that interface. The image→cell→glyph
code is the same module the portrait uses.

Tuning for the ASCII Mew lives in `presentation.asciiPass`. Start at cell 2× the
field's, so she reads as a coarser, closer object.

### 7.3 The field is a pure function — the one idea that makes this cheap

This section was rewritten after measuring. The first version described a
CPU-simulated field with sleeping cells and partial buffer uploads: an
inefficient mechanism engineered to be as efficient as possible. What follows is
a different mechanism that produces the **identical** picture for almost no cost.

**The insight: nothing in the field's motion needs memory.**

- DRIFT is noise — a function of `(cellSeed, t)`.
- GATHER is a falloff around the pointer — a function of `(cellHome, pointer)`.
- SCATTER + SETTLE is a critically damped impulse response,
  `displacement = impulse · τ · e^(−kτ)` where `τ = t − tHit` — closed form, and
  *more* faithful to the specified overdamped behaviour than an integrator.
- The glyph re-roll is `hash(cellSeed, floor(t / period + phase))`.
- Mew's clearing is a distance test against one position.

Every one of those is a pure function of cell identity, absolute time, and a
handful of globals. So **the whole field is evaluated in the vertex shader**, and
per frame the CPU sets about ten uniforms and issues one draw call. There is no
integration loop, no awake set, no sleeping predicate, no partial buffer upload —
none of that machinery needs to exist. The efficient design is also the smaller
one.

Per-cell static data (home position, seed, candidate glyph ids, word id, slot
position, distance-to-nearest-word) is uploaded **once**, and rewritten only when
the layout or the route changes. It lives in a data texture indexed by document
grid coordinate and is read in the vertex shader, so instances only ever have to
cover the viewport — a long page costs nothing extra.

**Measured**, M2 Max, 10 980 cells at 2560×1440 (`tools/bench/field-bench.html`):

| architecture | CPU / frame | GPU / frame | uploaded / frame |
|---|---|---|---|
| CPU-driven instances | **0.917 ms** | 0.261 ms | 176 KB |
| **analytic instances** | **0.050 ms** | 0.261 ms | **0** |
| fullscreen post-pass | 0.033 ms | 0.215 ms | 0 |

Three things to read off that table:

1. **The GPU cost is the same in all three.** Drawing glyphs was never the
   problem — it is one screen's worth of textured fragments whichever way you
   arrange it. "Too many objects" was the wrong diagnosis.
2. **The CPU cost is the whole story, and it is 18× lower.** It also stops
   scaling with cell count: the analytic field costs the same at 20 000 cells as
   at 100 000, because the CPU never touches a cell.
3. **The post-pass is marginally cheapest and is still the wrong tool** for the
   type field: a fullscreen filter samples a *fixed* grid, so it cannot move one
   glyph independently of its neighbours. Displacing its input displaces pixels
   — a smear, not letters flying. It is exactly right where cells never move,
   which is why the portrait (§4.5) and the optional ASCII Mew pass (§7.2) use
   it.

Projected onto the target machine (1512×982 at DPR 2 → 3024×1964, 17 712 cells
at a 7×12 grid): the field costs ~0.05 ms CPU and ~0.42 ms GPU per frame. The
120 Hz budget is 8.33 ms. **The type layer is about 5% of one frame, and the CPU
half of it is a rounding error.**

Hard budget:

```
draw calls / frame        3   (field opaque, field inverted, mew pass)
WebGL contexts            1   for the session
glyph atlas             one 2048² R8 texture, ~4 MB GPU, uploaded once
per-frame CPU (field)   ~10 uniform writes and one draw call. Nothing else.
per-frame upload        0 bytes. Cell data is written on layout/route change only
frame rate              the display's native rate. 120 Hz on ProMotion
mew sim                 120 Hz fixed (unchanged), rendered on the same rAF
device pixel ratio      capped at 2 (1.5 above 60k cells)
mean ink coverage       12–22% at rest
chromatic cells         ≤ 4% of viewport
```

**On frame rate.** The earlier draft capped at 30 fps idle to save power. That is
now the wrong trade: the saving is a fraction of a percent of the budget, Mew is
always moving so the panel will hold 120 anyway, and 60-into-120 on a ProMotion
display is visible judder. Render at the native rate. Claw frames back only from
(a) `document.hidden`, which stops entirely, (b) 45 s of no input, which drops to
30, and (c) the degradation ladder on weak hardware.

**On running for hours.** Sustained heat comes from sustained memory traffic and
CPU wakeups, not from peak frame cost. The CPU-driven design pushes 176 KB ×
120/s ≈ **21 MB/s** across the memory bus forever. The analytic design pushes a
few hundred bytes per second. That difference is the whole answer to "it should
not be remotely taxing after hours."

**What this costs us.** The motion lives in GLSL, which is harder to debug. The
mitigation is the one this repo already uses twice (`fx/presentMath.js`,
`fx/beamGeometry.js`): every analytic function is mirrored in plain JS and
unit-tested headlessly, and the shader is *required* to match. Nothing is lost
aesthetically — the four verbs in §5 are exactly the ones that have closed
forms, because they were specified as overdamped and non-interacting in the
first place.

---

## 8. What this must never look like

Say no to all of these on sight:

- **The Matrix.** Falling columns, green on black, katakana. Non-negotiable.
- **A terminal.** No blinking block cursor, no `$` prompt, no `> _`, no
  fake-typing a command. It is a lazy signifier and it is everywhere.
- **Static.** Uniform random characters with no density structure (§4.2).
- **A strobe.** Glyphs re-rolling every frame (§3.5).
- **A CRT filter.** No scanlines, no barrel distortion, no chromatic bloom over
  the whole page. The chromatic whisper in §3.3 is a *print* artefact, and the
  distinction is the entire difference between 2026 and 2009.
- **Grey text.** Lightness comes from glyph choice, never from opacity (§1.2).
- **A loading screen.** Ever.
- **Black rectangles.** No inverted cells in the field or in any word. Darks come
  from overstrike (§3.4a). A letter made of blocks is a stencil, not type made of
  type, and this one already shipped once.
- **Wall-to-wall texture.** If the viewport has no confident empty paper in it,
  the composition has failed (§4.2). Between a third and a half of the screen
  should be near-bare.
- **A billboard.** A heading is 7–9 rows, not a quarter of the viewport (§3.6).
- **Hidden navigation.** Words assemble by themselves. If the visitor has to
  sweep the cursor to discover a link exists, the site is broken (§4.3).
- **A page cut.** No fade-to-white, no flash, no spinner, no visible remount
  between routes (§7.1a).

---

## 9. The acceptance test

Not "does it work". Two questions:

1. Screenshot any frame, in greyscale, at thumbnail size. **Is it a good
   poster?** If the composition dies without motion, the motion is carrying it
   and the design is wrong.
2. Leave it open on a three-year-old phone for five minutes. **Is the phone
   still cool, and is the battery graph flat?** If not, no amount of beauty
   counts, because the site will be closed before it is seen.
