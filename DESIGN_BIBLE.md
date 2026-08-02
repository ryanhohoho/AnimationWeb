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
| `not-style-i-want-but-this-type-of-feature-mapping` | **Inverted cells.** White glyph on a solid ink block is the darkest two stops and it doubles the tonal range for free. Also: the fill is a *meaningful repeated word*, not random characters. | The harsh 1-bit black. Our paper is warm and our ink is not pure black. |
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
SPARSE   (space) . ' ` , : ; - ~ ^ "        lights, bare paper
MID      i l t f j r x n u v c z 1 7 ( ) /  midtones, directional
DENSE    o e a s w m 0 4 8 9 $ % #          weight
SOLID    M W B @ & Q Z J                    darks
INVERT   any glyph on a filled cell         the last two stops
```

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

### 4.3 Approach and resolve

As the pointer nears a link's slot region, cells inside a falloff radius
interpolate from their drift home to their word slot. Nearest cells arrive
first, so the word **assembles from the outside in**. The falloff is continuous
— never a binary "in range / out of range" snap.

At full resolve the word is at 100% slot density and the surrounding cells have
*thinned* (the word ate them), which is what makes it read as emergence rather
than as an overlay.

### 4.4 Making ASCII headers actually legible

This is the real risk of the brief, and the Otaku poster ducked it. Four rules:

1. **Mass, not outline.** A stem is a solid run of SOLID/INVERT cells. Never
   draw a letter as a one-cell-wide outline.
2. **Minimum stem width of 2 cells** at every breakpoint. This sets the minimum
   type size for ASCII headings: below ~44px cap-height the technique fails and
   you must fall back to VOICE. Do not fight this — design around it.
3. **Contrast, not decoration.** Inside a resolving word the field thins to
   SPARSE. The word is dark on light, always.
4. **One clear counter.** Letters with holes (`O`, `P`, `R`, `A`) must keep at
   least one fully bare cell inside the counter. If the grid is too coarse for
   that at the current size, the word is too small for ASCII.

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
| **GATHER** | pointer approach, route change | Radius-weighted lerp from drift home to word slot. Outside-in. | Agreement. Magnetic. |
| **SCATTER** | hyper beam, Mew collision | Impulse along the beam normal, scaled by distance and incidence angle. Cell flies, tumbles slightly, ink weight briefly heavier (struck = smudged). | Impact. |
| **SETTLE** | after SCATTER | `expDamp` home. **Overdamped — never oscillates.** | Dust settling. A bouncing letter reads as a toy. |

Timing, as a starting calibration:

```
gatherRate        9.0   1/s  exponential approach
gatherRadiusPx  260     falloff radius around the pointer
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
- Route change = a GATHER re-target. The cells **keep their identity** and
  re-agree into the new page's words. The old page's words dissolve into the
  field, the new page's words condense out of it, and the field itself never
  blinks. This is a transition no framework can do, and it costs nothing extra
  because GATHER already exists.
- Route modules are prefetched on idle and on link hover, so the content is
  resident before the click.

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

### 7.3 Performance is an aesthetic constraint

The site must not lag or heat a phone. Rather than treat that as a tax, it
sharpens the direction — a field that changes slowly *is* the better look.

Hard budget:

```
draw calls / frame        3   (field opaque, field inverted, mew pass)
WebGL contexts            1   for the session
glyph atlas             one 2048² R8 texture, ~4 MB GPU, uploaded once
CPU physics at rest       0   cells sleep; only the awake set integrates
field frame rate         30 fps idle, 60 fps while a GATHER or SCATTER runs
mew sim                 120 Hz fixed (unchanged), rendered on the same rAF
device pixel ratio      capped at 2 (1.5 when the grid exceeds 20k cells)
mean ink coverage       12–22% at rest
chromatic cells         ≤ 4% of viewport
```

The two decisions that matter most for heat, in order:

1. **30 fps idle.** Roughly halves sustained GPU load versus 60. Nobody will
   perceive it on a field that drifts at 0.15 Hz.
2. **Sleeping cells.** A cell at rest costs zero CPU and zero buffer upload.
   Only cells that have been disturbed integrate, and only their instance data
   is re-uploaded. At rest the entire type layer is one draw call over a static
   buffer.

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

---

## 9. The acceptance test

Not "does it work". Two questions:

1. Screenshot any frame, in greyscale, at thumbnail size. **Is it a good
   poster?** If the composition dies without motion, the motion is carrying it
   and the design is wrong.
2. Leave it open on a three-year-old phone for five minutes. **Is the phone
   still cool, and is the battery graph flat?** If not, no amount of beauty
   counts, because the site will be closed before it is seen.
