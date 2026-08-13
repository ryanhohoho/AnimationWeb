// siteConfig.js
// single source of truth for the LOOK, the way rigConfig.js is the single
// source of truth for the rig. every number in DESIGN_BIBLE.md is transcribed
// here with the section it came from, and nothing downstream is allowed to
// hardcode a constant -- if a module needs a number, it imports it.
//
// the bible wins. if a value here disagrees with DESIGN_BIBLE.md, this file is
// wrong and gets fixed, not the bible.
//
// mew's own constants (skinHex, the shiny palette, presentation.mode) live in
// rigConfig.js and are NOT duplicated here. she is a different system that
// happens to share a page -- see bible 7.2.

export const siteConfig = {

  // ------------------------------------------------------------------
  // THE GRID (bible 3.1)
  //
  // one global lattice, and this is most of what will make the site feel
  // designed rather than assembled. everything lands on it.
  // ------------------------------------------------------------------
  grid: {
    // w/h. monospace metrics -- cells are taller than wide, and every cell
    // size below is picked to sit near this ratio. the tolerance is real:
    // useful integer pairs near 4/7 land between 0.556 and 0.600 and there is
    // nothing to be done about that without fractional pixels, which are the
    // one thing we will not have (see quantized, below).
    aspect: 4 / 7,          // 0.5714
    aspectTolerance: 0.03,  // ...what a ladder rung may stray by

    // THE BASE CELL IS 4 x 7 (bible 3.6), and it was 7 x 12.
    //
    // The old cell is what made the headings a billboard. Bible 4.4 rules 2
    // and 4 in their original form demanded a 2-cell stem AND a bare counter
    // out of a 7 px cell, and the only cap height that satisfies both is
    // 80-130 px -- which shipped as 166 px against 15 px body copy, eleven
    // times the body. Size is derived from ROWS now (see `type` below), so the
    // cell size IS the type scale, and a finer cell is what makes a 63 px
    // heading possible at all.
    //
    // It is not only a size fix. Every reference in future-refs/ is finer
    // grained than the 7 x 12 build -- another-reference and ascii-saturn run
    // 90 to 200 characters across -- so 4 x 7 moves the whole field toward the
    // things it is imitating.
    //
    // The baked atlas does NOT need re-baking for this: it stores every glyph
    // at 56 x 96 and the field samples it down, and 4/7 = 0.571 is inside the
    // aspect tolerance above.
    baseCellPx: { w: 4, h: 7 },

    // A 4 px CELL ON A DPR-1 DISPLAY IS 4 DEVICE PIXELS AND TURNS TO MUSH
    // (bible 3.6). So the cell has a device-pixel floor: the lattice steps UP
    // the ladder until the cell is at least this many DEVICE pixels wide.
    // A retina screen gets the 4 CSS px it was designed for; a non-retina one
    // gets 8, and its type comes out correspondingly larger, because the type
    // scale is measured in rows of that cell. That is the honest consequence
    // of sizing in rows and the bible's own 3.6 table states it.
    minDeviceCellW: 8,

    // CELL SIZE IS QUANTIZED IN INTEGER STEPS BY VIEWPORT WIDTH, NEVER
    // INTERPOLATED. a glyph on a half pixel is blurry, and a whole field of
    // them reads as a cheap filter rather than as type. bands are minWidth
    // descending, so a lookup is the first band whose minWidth the viewport
    // clears.
    //
    // RE-DERIVED AROUND THE NEW BASE. The bible's table was written for 7 x 12
    // and its rows scale by 4/7: its three sizes (8x14 / 7x12 / 6x10) become
    // the three rungs either side of the new base. The narrow band asks for
    // 3 x 5, which almost no real device will actually get -- every phone is
    // DPR 2 or 3, so minDeviceCellW pushes it back to 4 x 7 -- but it is the
    // honest entry: on a hypothetical DPR-3 phone a 3 px cell is 9 device
    // pixels and perfectly sharp.
    breakpoints: [
      { minWidth: 1600, cell: { w: 5, h: 9 } },   // ~320 x 100 at 1600x900
      { minWidth: 1100, cell: { w: 4, h: 7 } },   // ~378 x 141 at 1512x982
      { minWidth: 700,  cell: { w: 4, h: 7 } },
      { minWidth: 420,  cell: { w: 4, h: 7 } },
      { minWidth: 0,    cell: { w: 3, h: 5 } }
    ],

    // THE OVERFLOW LADDER. Two things step up it: the device-pixel floor
    // above, and the cell budget (budget.maxCells) on a very large display.
    // Every rung is an integer pair inside `aspectTolerance` of `aspect`, so
    // the quantization rule survives either way -- a coarser lattice, never a
    // fractional one.
    //
    // The three sizes bible 3.6's own table names (4x7, 5x9, 7x12) are all
    // here, in order; the rest exist for displays and device ratios the table
    // never described.
    cellLadder: [
      { w: 3,  h: 5 },    // 0.600  the narrow band, DPR 3 only
      { w: 4,  h: 7 },    // 0.571  THE BASE (bible 3.6)
      { w: 5,  h: 9 },    // 0.556  bible 3.6's middle row; >= 1600, and the
                          //        DPR-2 floor lands here from 3x5
      { w: 6,  h: 10 },   // 0.600
      { w: 7,  h: 12 },   // 0.583  bible 3.6's third row, and the old base
      { w: 8,  h: 14 },   // 0.571  where a DPR-1 display ends up
      { w: 10, h: 17 },   // 0.588
      { w: 12, h: 21 },   // 0.571
      { w: 14, h: 24 }    // 0.583  the coarsest we will ever go
    ],

    // the field must reach the viewport's right and bottom edges, so the dims
    // round UP: a floored grid leaves a bare strip up to one cell wide down
    // the edge of the page, and bare paper in a straight line along a screen
    // edge reads as a bug, not as weather.
    roundUp: true,

    // ONE SPARE ROW. bible 3.1: the field's scroll offset is snapped to whole
    // cells ("a field that slides sub-cell against its own lattice is the
    // single fastest way to make this look cheap"), so at any moment up to one
    // cell of real scroll is unaccounted for and the bottom edge would come up
    // short by that much. the spare row covers it.
    overscanRows: 1,

    // the grid origin is the DOCUMENT origin, not the viewport's. this is what
    // lets a cell keep its identity across a scroll and across a route swap
    // (bible 7.1), which is the entire mechanism behind the transition.
    originIsDocument: true,

    // scroll is quantized to whole cells for the field layer. see overscanRows.
    snapScrollToCells: true
  },

  // ------------------------------------------------------------------
  // COLOUR (bible 3.3)
  //
  // two inks on warm paper, plus a chromatic whisper that is a PRINTING
  // ERROR and never a decision. read the fringe block before using either
  // fringe hex for anything.
  // ------------------------------------------------------------------
  color: {
    paper: "#F4F2EC",    // warm bone. NOT white: white glares, bone reads as print
    ink:   "#12100F",    // warm near-black. NOT #000: pure black reads as a terminal

    // the two misregistration inks. magenta is the otaku poster's second ink;
    // blue is the eye reference's. which one a cell gets is a stable function
    // of the cell index (bible 3.3) so the fringe cannot crawl.
    fringeA: "#E0447A",
    fringeB: "#2B6FE0"

    // mew's #F8B7DE and the shiny #9CDEFF are deliberately absent: they are
    // rigConfig.skinHex and rigConfig.shiny.skinHex, and she is the only fully
    // saturated object on the site precisely because nothing else may reach
    // for them.
  },

  // ------------------------------------------------------------------
  // THE FRINGE RULE (bible 3.3), and it is a HARD BUDGET, not a style.
  //
  // "chromatic ink appears only as a one-cell offset ghost at the edge of a
  // dense mass, and covers no more than 4% of the cells in any viewport."
  //
  // the mechanism: when a cell's density exceeds `threshold` and a 4-neighbour
  // is at least `delta` lighter, that lighter neighbour MAY be painted in a
  // fringe ink at reduced weight. never a fill, never a highlight, never a
  // hover state, never "the accent colour". risk register: the moment this
  // drifts into an accent colour the look is dead, so the count is a lint --
  // count fringe cells per frame in dev and warn.
  // ------------------------------------------------------------------
  fringe: {
    maxCellFraction: 0.04,   // bible's number. the whole rule, in one float
    offsetCells: 1,          // "one-cell offset ghost". 2 reads as a glow

    // calibration, not measured -- the bible names these two thresholds
    // without pinning them, so they are starting values to be tuned against
    // the 4% budget once the field is real. Both are on the 0..1 EFFECTIVE INK
    // scale: what fraction of the cell is actually ink once its glyph and any
    // OVERSTRIKE are taken into account. That is the scale on which they mean
    // what the bible says they mean, and it has one consequence worth stating
    // out loud:
    //
    // THE FRINGE LIVES ON THE EDGES OF THE OVERSTRUCK MASSES. The densest
    // single glyph in the baked ramp is 0.337 ink; an overstruck cell composes
    // two of them and lands near 0.55 (bible 3.4a). So 0.42 is a threshold
    // nothing but an overstruck cell can clear, and the only place a
    // 4-neighbour is 0.18 lighter is right where such a mass meets ordinary
    // type. Which is exactly right: the eye references put the chromatic
    // whisper at the boundary of the darkest mass, because that is where a
    // two-colour print that did not register shows its error. Applying these
    // numbers to the smooth density field instead would fire nowhere at all --
    // the weather changes by about 0.01 from one cell to the next.
    //
    // THESE WERE 0.62 / 0.25 AND HAD TO MOVE. They were calibrated against
    // inverted cells, which reached ~0.9 ink; with inversion quarantined to
    // the portrait (bible 3.4a) nothing on the page clears 0.62 any more, and
    // the fringe would have quietly stopped existing.
    threshold: 0.42,
    delta: 0.18,             // how much lighter the neighbour has to be
    weightScale: 0.5,        // "at reduced weight" -- it is a whisper

    // the ONE place the budget may spike: struck cells pick up a fringe ink
    // when the beam hits (bible 6.4), "and it is over in a second".
    beamSpikeS: 1.0
  },

  // ------------------------------------------------------------------
  // THE RAMP (bible 3.4)
  //
  // families, used as REGISTERS -- not as a luminance ladder. runtime picks a
  // glyph by 6-D nearest neighbour in the atlas's shape space, not by
  // brightness, and these groups are what a caller names when it wants a
  // register ("this is a stem, give me SOLID") rather than a number.
  //
  // "sort the ASCII characters by how dark they look" is exactly what makes
  // ordinary ascii art look like halftone instead of drawing.
  // ------------------------------------------------------------------
  ramp: {
    // index 0 of SPARSE is a space, deliberately: bare paper is a member of
    // the lights family, not the absence of one.
    SPARSE: " .'`,:;-~^\"",           // lights, bare paper
    MID:    "iltfjrxnuvcz17()/",      // midtones, directional
    DENSE:  "oeaswm0489$%#",          // weight
    SOLID:  "MWB@&QZJ",               // darks, at weight 600

    // OVERSTRIKE is not a glyph set either -- it is TWO glyphs in one cell,
    // offset (bible 3.4a). It is the last two stops of the range, and it is
    // where every dark on this site now comes from. See field.overstrike.
    OVERSTRIKE: null,

    // INVERT is a glyph on a FILLED cell -- a solid ink block with the letter
    // knocked out of it. It is QUARANTINED TO THE PORTRAIT (bible 3.4a, 8):
    // banned from the field and from every word, because a field of black
    // rectangles is a stencil, not type made of type, and that already shipped
    // once. The portrait keeps it behind portrait.allowInvert, because there
    // the subject is an image rather than type and the feature-mapping
    // reference genuinely uses it.
    INVERT: null,

    // shape matching, bible 3.4. the atlas emits a 6-D vector per glyph
    // (coverage under six staggered discs: top-L, top-R, mid-L, mid-R,
    // bottom-L, bottom-R) so a glyph knows WHERE its ink is, not just how
    // much. the lookup is a quantized cache at 5 bits per axis, so it is O(1)
    // after warm-up -- 5 bits is 32 buckets, which is finer than the eye can
    // resolve on a 7x12 cell and still only 2^30 keys worst case.
    shapeDims: 6,
    cacheBitsPerAxis: 5,

    // weight jitter of +/-1 step around the chosen weight, frozen per cell
    // (bible 3.5). this is the second dimension of density that IBM Plex Mono
    // was chosen for: a cell can get darker by changing WEIGHT as well as
    // glyph.
    weightJitterSteps: 1
  },

  // ------------------------------------------------------------------
  // TYPE (bible 3.2)
  //
  // both voices come out of one family so the page reads as one system.
  // ------------------------------------------------------------------
  type: {
    family: "IBM Plex Mono",     // SIL OFL

    // FIELD -- the lattice. never loaded as a webfont at runtime; it is baked
    // into the glyph atlas offline (bible 4.1), which is why three weights is
    // a table of three numbers and not a font-loading problem.
    fieldWeights: [200, 400, 600],

    // VOICE -- small utility text that is NOT made of ascii: dates, captions,
    // footnotes, the reduced-motion toggle. rendered normally, and this is the
    // only weight that gets preloaded. it exists so the eye has somewhere to
    // rest; a page where literally everything is a crowd is exhausting, and
    // the rare piece of plain text is what makes the crowds read as
    // deliberate.
    voiceWeight: 400,

    // subset to latin + the ramp's punctuation
    subset: "latin",

    // ----------------------------------------------------------------
    // THE TYPE SCALE (bible 3.6). SIZE IS SET IN ROWS, NOT PIXELS.
    //
    // The first build set headings with `min(13vw, cell-w * 26)` -- 166 px
    // against 15 px body, ELEVEN TIMES the body. That is a billboard, and it
    // came out of the old rules demanding a 2-cell stem out of a 7 px cell.
    //
    // A letterform needs 7 rows of cap height to be legible and 9 to be
    // comfortable -- the classic 5x7 bitmap floor plus room for a counter --
    // so everything about heading size follows from a row count and the cell
    // height:
    //
    //     cap height (px) = capRows x cellHeight(px)
    //     font-size  (px) = cap height / capHeightRatio
    //
    // At the 4 x 7 base that is 49 px for a nav link and 63 px for an h1,
    // i.e. 3.1x and 3.9x the body. A 2x ratio to body copy IS NOT REACHABLE
    // and it is worth knowing why: at 16 px body, 2x is a 22 px cap, which is
    // two or three rows at any renderable cell size, and you cannot draw a
    // letter in three rows. ~3x is the honest floor, and it needs the fine
    // cell.
    // ----------------------------------------------------------------
    bodyPx: 16,             // VOICE body copy. was 15
    h1CapRows: 9,           // "comfortable"
    linkCapRows: 7,         // "legible"

    // ...and the narrow-viewport row count. NOT in the bible, and it is a
    // reading of rule 3 rather than a transcription of it: 9 rows at the base
    // cell puts "case studies" at 648 px, which does not fit a phone, and a
    // heading that wraps cannot be rasterized as one line at all -- words.js
    // sends it to VOICE. Rule 3 says 7 rows is legible, so a narrow screen
    // gets the legible size rather than nothing. Below 7 rows there is no
    // smaller ascii option and VOICE is the answer, which is bible 4.4's own
    // conclusion.
    narrowMaxWidth: 1099,   // ...at or below this viewport width
    h1CapRowsNarrow: 7,

    // IBM Plex Mono's cap height, as a fraction of the em. Measured off the
    // shipped font rather than assumed: this is the number that turns a row
    // count into a font-size, so a wrong one moves every heading on the site.
    capHeightRatio: 0.698,
    // ...and its advance width, which is what says whether a word fits.
    advanceRatio: 0.6
  },

  // ------------------------------------------------------------------
  // LEGIBILITY (bible 4.4)
  //
  // the real risk of the whole brief, and the otaku poster ducked it. these
  // are enforced in CODE in phase 4, with a VOICE fallback and a console warn
  // when a word cannot satisfy them at the current breakpoint. do not fight
  // them -- design around them.
  // ------------------------------------------------------------------
  legibility: {
    minStemCells: 2,        // a stem is a RUN of dense glyphs. never an outline
    minCounterCells: 1,     // O P R A Q keep at least one near-bare cell inside

    // RULE 3 IS STATED IN ROWS, so this floor is too. It used to be 44 px,
    // which is the same thing said in the units of one particular cell size --
    // and the moment the cell changed (7x12 -> 4x7) it silently became a
    // different rule. 7 rows is the classic 5x7 bitmap floor plus room for a
    // counter; below it the technique fails outright and the word falls back
    // to VOICE, which bible 4.4 says to design around rather than fight.
    minCapRows: 7,

    // ...and the CONTRAST rule (bible 4.4 rule 2), which is the single most
    // important number in the whole treatment.
    //
    // The densest glyph in the ramp is 0.337 ink and an overstruck cell is
    // ~0.55, so A STEM CAN NEVER BE DARK IN ABSOLUTE TERMS. It does not need
    // to be: what makes a letterform readable is the RATIO between stem and
    // counter. So counters and the immediate surround are driven to near-bare
    // -- call it 6:1 against the stem -- and the letter appears.
    //
    // Thin the counters too gently and the word turns to mud. THAT, not stem
    // darkness, is the failure mode to watch for, and it is what the first
    // build got wrong underneath the black rectangles.
    counterInkMax: 0.06,    // effective ink, 0..1
    counterRatio: 6         // ...and what that is against a stem, for the lint
  },

  // ------------------------------------------------------------------
  // WORDS (bible 4.1, 4.4) -- text -> coverage bitmap -> slots.
  //
  // one cached offscreen 2d canvas rasterizes the word at GRID resolution
  // times a supersample, and each covered cell reads off a coverage plus the
  // local 6-D shape vector of the letterform passing through it. that vector
  // is what makes a stem pick a glyph with ink on the correct SIDE, which is
  // the whole difference between drawn and halftoned (bible 3.4).
  // ------------------------------------------------------------------
  words: {
    // samples per cell axis when rasterizing. 8 matches the atlas's own
    // ATLAS_SCALE, so a word cell and an atlas cell are measured at the same
    // resolution by the same six discs -- which is the precondition for the
    // nearest-neighbour between them to mean anything.
    subsample: 4,

    // ...and the ceiling on the whole raster, which is what actually bounds the
    // cost of a route change. See words.js's note where this is applied: every
    // legibility measurement is a pass over this raster and the emboldening
    // search makes several, so a heading rasterized at 4.6 megapixels turns a
    // navigation into most of a second of blocked main thread.
    rasterMaxPixels: 1400000,

    // the font the coverage bitmap is drawn in. it is the FIELD family, at the
    // weight a heading would be set in, because the silhouette being broken up
    // is the silhouette of that letterform. never loaded as a webfont for the
    // field itself (bible 3.2) -- this canvas draws with whatever the browser
    // has, and the fallback stack is monospace all the way down so the metrics
    // stay close if IBM Plex Mono is not resident.
    rasterWeight: 700,
    rasterFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',

    // a cell is part of the word at all above this coverage. Low, because the
    // edge of a letterform should get a LIGHT register rather than vanish
    // (bible 4.1 step 4).
    //
    // ...BUT NOT AS LOW AS 0.12, WHICH IS WHERE IT WAS, and the reason is
    // LOWERCASE. Setting the ascii type lowercase (R2) draws it at the
    // x-height, which for this stack is 0.75 of the cap height, so every
    // counter in the word is three quarters the size it used to be while the
    // cell stayed exactly where it was. At 0.12 a cell that a stroke's
    // antialiasing merely BREATHED ON joined the letterform, and inside a
    // lowercase counter that is most of them: "case studies" kept one of its
    // four counters and fell back to VOICE on a 1280 px screen with 1177 px of
    // room, which is a legibility rule failing on a word that was perfectly
    // legible.
    //
    // Measured across 0.12 / 0.16 / 0.20 / 0.24 / 0.28 against the real nav at
    // the real breakpoints: everything from 0.16 up keeps all four counters.
    // 0.20 sits a clear step past the boundary without starting to eat the
    // letterform's edge -- which is the failure in the other direction, and the
    // one rule 1 cares about.
    slotCoverageMin: 0.20,
    // ...and it counts as STEM (mass, the thing rule 1 and rule 2 are about)
    // above this.
    stemCoverage: 0.55,

    // how far PAST two cells the emboldening aims, in cells. A stem of exactly
    // two cells' width only reads as two cells when it happens to land on the
    // lattice: at the worst phase it spreads across three cells at 40% each and
    // satisfies stemCoverage nowhere. This is the margin that makes rule 2 hold
    // at every phase rather than at two thirds of them.
    stemQuantizeMargin: 0.35,

    // where in the distribution of stroke widths "the stem" is. Not the
    // minimum: see the note in words.js's minStemSamples. 0.2 lands on the
    // genuinely thin strokes while ignoring the one-sample slivers every curve
    // leaves where it runs horizontal.
    stemQuantile: 0.2,

    // how a cell's coverage maps to its slot density. the exponent lifts the
    // midtones so an edge cell is a MID glyph rather than a near-space: a
    // letterform whose edges fade to paper reads as blurred, and rule 1 says
    // mass, not outline.
    densityGamma: 0.72,
    densityFloor: 0.16,

    // AT MOST this many ascii words on screen at once. the word id is 4 bits
    // in the cell data texture and 0 means "no word", so 15 is the ceiling the
    // encoding allows; the per-word resolve uniform array is the same length.
    // a page with more headings than this renders the overflow as VOICE, which
    // is the same fallback rule 2 already needs.
    maxWords: 15,

    // the counter test (rule 4) needs to know which characters HAVE counters.
    // an enclosed bare region is counted by flood fill on the cell grid, and
    // the word passes only if it finds at least as many as the string implies.
    counterChars: "ABDOPQRabdegopq04689@#%&",
    // ...and these have two.
    twoCounterChars: "B8g%"
  },

  // ------------------------------------------------------------------
  // THE FIELD AT REST (bible 4.2)
  //
  // the idle cloud is NOT noise. density follows a slow domain-warped noise
  // field so the page has weather -- drifts of darker text, clearings of
  // near-bare paper. uniform random noise is the single most common failure
  // of ascii web design and it looks like static.
  // ------------------------------------------------------------------
  field: {
    coverageMin: 0.12,      // below this the words have nothing to assemble out of
    coverageMax: 0.22,      // above this the page feels oppressive
    // the scale the weather runs at, in cells. 20-40 is wide enough to read as
    // a drift across a heading and tight enough that a viewport holds several.
    weatherCellsMin: 20,
    weatherCellsMax: 40,

    // mew pushes a soft clearing through the text as she swims (bible 6.5):
    // cells within ~1.5 body radii thin slightly and drift away from her. one
    // distance test in a pass that already runs.
    mewClearRadii: 1.5,
    // ...and what "thin slightly and drift away" means in numbers. the push is
    // deliberately smaller than one cell: mew should leave a CLEARING, which is
    // a density effect, not a bow wave, which would read as a force field.
    mewPushCells: 0.6,
    mewThin: 0.75,           // fraction of density removed at the very centre

    // THE FIELD MAKES ROOM FOR VOICE (bible 3.2). Small utility text is real
    // ink, rendered normally, and it "exists so the eye has somewhere to rest"
    // -- which it cannot do sitting on a 15%-coverage field. So the resting
    // density is thinned under every VOICE block, at layout time, with a soft
    // margin so the clearing has an edge rather than a box around it.
    // Not quite 1.0: a completely bare rectangle reads as a panel laid over the
    // field, and the whole point is that the field agreed to make room.
    voiceClearAmount: 0.88,
    voiceClearMarginCells: 3.5,

    // THE WEATHER (bible 4.2). the resting density is a domain-warped noise
    // field, precomputed into the cell data texture at layout time -- never
    // evaluated per frame (plan phase 3). "uniform random characters look like
    // static and are the most common way this aesthetic fails."
    weather: {
      // the warp is what turns fbm (which reads as clouds) into DRIFTS -- long
      // sheared bands with clearings between them, the way ink pools on a
      // press. one warp stage is enough; two starts to look marbled.
      warpCells: 14,         // how far a point is displaced by the warp field
      warpScaleCells: 34,    // ...and the scale of the field doing the warping
      octaves: 3,            // fbm depth. 3 gives one big shape + two of grain
      lacunarity: 2.0,
      gain: 0.5,
      // THE CONTRAST WINDOW. the weather is remapped through a NARROW
      // smoothstep, not through a gamma, and the window's lower edge is chosen
      // at layout time by bisection so the MEASURED mean ink coverage lands on
      // target.
      //
      // a gamma keeps fbm's gaussian hump and only leans on it, so every cell
      // ends up a midtone and the page is one even grey -- static, at a cell
      // size where the difference between density 0.10 and 0.25 is a full stop
      // against a colon. a narrow window pushes most of the field to BARE PAPER
      // and the crests to SOLID, which is the reference set's actual logic
      // (bible 2: value from mass and sparsity, not from a grey ramp).
      //
      // narrower is more graphic and more brutal; much under 0.2 and the
      // midtone transition bands vanish and the drifts get hard edges.
      contrastWidth: 0.26,

      // THE TARGET IS MEASURED OVER THE CROWD, NOT OVER THE SHEET, and that
      // distinction arrived with presence (bible 4.2).
      //
      // 4.2 asks for two things at once: 12-22% mean ink at rest, and 35-55%
      // of the viewport near-bare. Measured flat over every cell those fight --
      // with half the page deliberately empty, no window position can lift the
      // flat mean to 15%, the bisection runs off its own end and every present
      // cell saturates at density 1.0. So the bisection is PRESENCE-WEIGHTED
      // (see fieldMath.calibrateWindow) and this number is the density of the
      // crowd itself. Measured on the target machine's layout, that puts the
      // content areas at ~21% ink -- inside the band -- and the whole-viewport
      // mean at ~10%, which is lower than 12% precisely because the margins
      // are empty on purpose. That is the composition, not a miss.
      coverageTarget: 0.15,  // inside 12-22%, biased to the airy end (bible 2:
                             // "at the airiness of the portrait")
      windowMin: -0.2,       // the window may hang off either end of the
      windowMax: 1.0,        // weather's own range; that is how the extremes
                             // of the coverage band stay reachable
      calibrateSamples: 4096 // stratified sample of the grid for the bisection
    },

    // ----------------------------------------------------------------
    // OVERSTRIKE (bible 3.4a) -- WHERE THE DARKS COME FROM.
    //
    // There is no glyph in a monospace font that fills a cell: the baked
    // ramp's densest is 0.337 ink (Q at 600). A naive reading of "we need
    // darker" leads straight to an inverted cell -- a solid ink block with a
    // glyph knocked out of it -- and that is exactly what shipped, and it was
    // wrong. A field of black rectangles is not type made of type. It is a
    // stencil.
    //
    // The right answer was in the owner's opening brief all along: "overlapping
    // text in order to bring out some darks". So the darkest two stops are made
    // by striking a SECOND glyph into the same cell, offset by roughly a third
    // of a cell across and a tenth down. Two glyphs at ~0.33 compose to ~0.55
    // effective ink, the cell stays unmistakably made of letters, and the
    // artefact -- a doubled, slightly misregistered character -- is a
    // typewriter double-strike and a badly registered print run. It belongs to
    // the same world as the chromatic fringe in 3.3, and it is the second place
    // that world shows up.
    //
    // Cost: overstruck cells are a SECOND INSTANCED DRAW, and it REPLACES the
    // inverted-cell draw. The draw-call budget is unchanged at 3.
    // ----------------------------------------------------------------
    overstrike: {
      // "offset by roughly a third of a cell across and a tenth down". Across
      // is the big one because a monospace cell is taller than wide, so a
      // third of the width is a smaller absolute move than a third of the
      // height would be -- it reads as a slipped impression rather than as two
      // separate characters.
      offsetCellsX: 0.34,
      offsetCellsY: 0.10,

      // the second strike is always the heavy weight. It is the darkest thing
      // available and this register exists to be dark; letting it jitter down
      // to 200 would produce cells that are overstruck and yet lighter than
      // their unstruck neighbours.
      weight: 600,

      // ...and it is a DIFFERENT glyph, not the same one twice. Both are
      // picked by the same density lookup, so the tone is right either way,
      // but two different letterforms compose to a fuller cell and read as
      // "two glyphs in one cell" (bible 3.4's ramp table) rather than as a
      // drop shadow. The choice is a stable hash of the cell, like every other
      // "random" on this site (bible 3.5).
      variantSalt: 0x9E37,

      // AT REST, the darkest crests of the weather are overstruck -- this is
      // the register that used to be `invert.restMaxFraction`, doing the same
      // job without the rectangles. Applied as a QUANTILE at layout time, so
      // the budget holds whatever the weather does, and ranked on the RAW
      // weather so the struck cells fall in contiguous patches at the crests
      // rather than as isolated freckles through the dark banks.
      //
      // Higher than the 0.02 the inverted version used, because an overstruck
      // cell is a whisper where a black block was a shout: 2% of blocks was
      // already too loud, 2% of double-strikes is invisible.
      restMaxFraction: 0.05,
      restDensityAbove: 0.72,

      // ...and inside a word, the stem cells. This is bible 4.4 rule 1's
      // "overstruck where it needs to be darkest". It is a density threshold
      // rather than a quantile because a word's own density map already says
      // where its mass is.
      slotDensityAbove: 0.62
    },

    // ----------------------------------------------------------------
    // PRESENCE (bible 4.2) -- WEATHER ALONE IS NOT COMPOSITION.
    //
    // The first build proved it: noise that is statistically the same
    // everywhere covers the viewport corner to corner with an even grey, which
    // is exactly what "the cloud is a field pattern everywhere on the screen"
    // means. Every reference in future-refs/ has EMPTY PAPER in it -- large,
    // confident, deliberate voids. The Otaku poster is more than half bare.
    //
    //     density = weather(warpedNoise) x presence(distance to content)
    //
    // `presence` peaks over the page's real content -- headings, VOICE blocks,
    // the portrait -- and falls to `floor` in the margins. It is computed ONCE
    // AT LAYOUT from the DOM's own rects and baked into the cell data texture,
    // so it costs nothing per frame and it is automatically correct on every
    // breakpoint and every route. The crowd gathers where the page has
    // something to say and thins to bare paper where it does not -- and that
    // is a better answer than hand-placing the voids, because it can never
    // disagree with the layout.
    // ----------------------------------------------------------------
    presence: {
      falloffCells: 18,   // bible's number: "a falloff of ~18 cells"

      // WHAT IS LEFT IN THE FAR MARGINS, and it is measured against the ramp
      // rather than chosen. NOT zero: the references are not blank out there,
      // they carry isolated punctuation on bare paper (bible 2, the Otaku
      // row).
      //
      // 0.125 of density is exactly where this ramp crosses bareInkMax below,
      // so the floor sits a hair over it: a margin cell under a weather crest
      // lands at ~0.045 ink -- one thin mark, a quote or a comma -- and
      // everywhere else is genuinely bare. Below 0.125 the margins go
      // completely blank and the near-bare fraction jumps from 46% to 69%,
      // outside bible 4.2's band at the empty end; well above it they fill in
      // with an even wash of marks, which is the failure the portrait's own
      // detailFloor exists to prevent.
      floor: 0.13,

      // how far INSIDE a content rect the plateau starts, in cells. A rect's
      // own area is fully present; this pads it so a heading's descenders and
      // a paragraph's last line are not sitting on the falloff.
      padCells: 2,

      // the acceptance number this whole block exists for (bible 4.2): between
      // this much and this much of the viewport should be near-bare paper at
      // rest. Below the floor the page is a texture again; above the ceiling
      // there is nothing for the words to assemble out of.
      bareInkMax: 0.04,
      bareFractionMin: 0.35,
      bareFractionMax: 0.55
    },

    // DENSITY -> GLYPH, as a small lookup texture rather than a per-cell
    // candidate list. the field's tone is a continuous number that CHANGES at
    // runtime (thinning, gather, mew's clearing, the beam's smudge), so baking
    // candidate ids per cell would freeze the tone as well as the choice.
    lut: {
      buckets: 64,    // density resolution. finer than the 34-value coverage
                      // span of the ramp can actually resolve
      variants: 4,    // candidates per (bucket, weight). the re-roll picks
                      // between these, so this is how much a cell can change
                      // without changing tone

      // HOW FAR A VARIANT MAY STRAY FROM ITS BUCKET'S TONE, and this number is
      // load-bearing. bible 3.5: a re-roll must change the CHARACTER, not the
      // VALUE -- a cell that jumps from 0.03 ink to 0.14 ink every couple of
      // seconds is the strobe in bible 8's do-not-ship list, wearing a slower
      // clock. Picking "the four nearest in coverage" does exactly that at the
      // sparse end, where 49 glyphs per weight are spread thinly enough that
      // the fourth-nearest is three times the tone of the first.
      //
      // so the candidate pool is a TOLERANCE BAND, not a fixed count: relative
      // at the dark end where the glyphs are dense and Weber says a percentage
      // is what the eye reads, with an absolute floor at the light end where
      // relative would collapse to a single glyph.
      covTolRel: 0.20,
      covTolFloorFrac: 0.045   // x the ramp's densest glyph
    }
  },

  // ------------------------------------------------------------------
  // MOTION (bible 5). four verbs. everything on the site is one of them.
  //
  // all spring-based, reusing src/utils/math.js (Spring, expDamp) -- already
  // frame-rate independent, already tested, and the reason mew feels alive.
  // the bible calls these "a starting calibration", so they are expected to
  // move; they are not expected to move in a component file.
  // ------------------------------------------------------------------
  motion: {
    // DRIFT -- always on. the cell wanders +/-1 cell on a low-frequency noise
    // field. the apparent "rapid change" of the field comes from THOUSANDS of
    // cells each changing rarely, never from any one cell flickering.
    drift: {
      hz: 0.15,
      wanderCells: 1,
      // glyph re-roll is a per-cell POISSON timer, never a lockstep tick. a
      // field that re-rolls in step strobes, gives people headaches, breaks
      // prefers-reduced-motion and makes phones hot for nothing (bible 3.5).
      glyphRerollMeanS: 2.5,

      // THE DRIFT IS A FIELD, NOT A PER-CELL PHASE, and that is the load-
      // bearing word in the bible's own sentence ("wanders on a low-frequency
      // NOISE FIELD"). Give every cell its own phase and at any instant no two
      // neighbours line up: the lattice is gone and the page reads as bible 8's
      // static no matter how much density structure is underneath it. Sampled
      // from a smooth field, neighbours move TOGETHER, the columns survive, and
      // the whole sheet undulates -- which is the "breathing" the bible asks
      // for. Two plane waves make that field in closed form.
      waveCells: 26,          // spatial wavelength of the undulation, in cells
      hzRatio: 0.61803,       // the second wave's rate, x hz. irrational
      rateJitter: 0.55,       // per-cell rate scales over 1 +/- this

      // how the +/-1 cell of wander is split. coherent moves neighbourhoods,
      // grain moves single cells; they sum to 1, so the total excursion is
      // exactly wanderCells. Grain is small on purpose -- it is what stops the
      // sheet reading as a rigid plate, and any more of it starts eating the
      // lattice again.
      coherentCells: 0.82,
      grainCells: 0.18,

      // the re-roll interval is jittered PER EVENT, not just per cell, so a
      // cell's own gaps vary the way a poisson process's do. kept under 0.5 so
      // the event times stay monotonic -- above that a cell can be told to
      // re-roll into the past, and the glyph flickers.
      rerollJitter: 0.42,
      rerollRateJitter: 0.6   // ...and the mean interval varies per cell too
    },

    // GATHER -- the word verb. Radius-weighted lerp from the drift home to the
    // word slot, outside-in, and the falloff is continuous: never a binary
    // in-range/out-of-range snap (bible 4.3).
    //
    // ITS TRIGGER MOVED, AND THE VERB DID NOT (bible 4.3, R2). It used to be
    // driven by pointer proximity, and that HID THE NAVIGATION: a visitor who
    // does not sweep the cursor across a field of characters never discovers
    // there are links in it, and a portfolio whose menu is a puzzle is a
    // portfolio nobody reads. Words now assemble on route settle, on their own,
    // and stay assembled -- see motion.assemble below.
    gather: {
      // 1/s, exponential approach -- the bible's own authored rate for the
      // verb (bible 5), kept because this file's job is to hold every number
      // the bible states. NOTHING READS IT SINCE R2: self-assembly runs on a
      // LINEAR clock (motion.assemble.durationS) because the per-cell stagger
      // is authored in seconds, and "0.9 s of stagger inside 2.6 s" is only
      // true on screen if progress and wall-clock agree. An exponential
      // approach never arrives, so there would be no moment the stagger could
      // be measured against.
      rate: 9.0,

      // WHAT IS LEFT OF THE POINTER, and it is deliberately small (bible 4.3:
      // "it survives only as the pointer's local influence on the field, which
      // is a separate, smaller thing"). No word reads these any more. The
      // cursor calms the drift under it and firms the crowd up a little, so
      // the field acknowledges the pointer without the pointer being how the
      // page is read.
      radiusPx: 260,
      // the falloff's SHAPE. smoothstep, so it is C1 continuous at both ends.
      innerFraction: 0.28,
      // MULTIPLICATIVE, never additive, and that is the whole difference
      // between "the crowd near the cursor firms up" and "the cursor paints".
      // An additive lift invents ink in the bare margins, which is 35-55% of
      // the viewport (bible 4.2) and the one thing that composition cannot
      // afford to lose.
      pointerLift: 0.25,
      // ...and the drift settles under the cursor. A cell that is being looked
      // at stops fidgeting; this is the only thing in the field that reads as
      // a response to the mouse at all.
      pointerCalm: 0.55,

      // :focus-visible on the real DOM link forces its word to FULL assembly
      // instantly (bible 4.3): keyboard users get the same page, and they get
      // it without having to wait out an animation they did not start.
      focusResolve: 1.0,

      // a slot may pull its cell up to this far off its home, in cells. the
      // slots ARE the covered cells, so this is sub-cell letterform alignment
      // (a stem edge that wants to sit a third of a cell left), not migration.
      slotOffsetMaxCells: 0.5,

      // "at full resolve the word is at 100% slot density and the surrounding
      // cells have THINNED (the word ate them), which is what makes it read as
      // emergence rather than as an overlay" (bible 4.3). the ring extends this
      // far past the word's own cells.
      //
      // THE THINNING IS NOW A HARD CLEARING, NOT A PERCENTAGE, and this is the
      // single most important change in the R1 pass (bible 4.4 rule 2). A stem
      // tops out at ~0.55 effective ink, so the letterform can only be read by
      // the RATIO between stem and counter -- and the old "lose 90% of the
      // density" was far too gentle to make that ratio. Everything inside the
      // plateau is driven to legibility.counterInkMax (0.06 ink) instead: the
      // solver in field.js inverts the measured coverage curve to find the
      // density that lands there, and the shader mixes toward it.
      //
      // THE PLATEAU IS WHAT COVERS THE COUNTERS. A counter is a bare region
      // one or two cells across in the middle of a letter, so a falloff that
      // starts decaying at the word's edge only half-clears it. Full clearing
      // out to the plateau, then a linear return over the rest of the radius,
      // which is what stops the word having a visible box around it.
      // ...AND THE RADIUS HAD TO GROW WHEN THE CELL SHRANK. It is authored in
      // CELLS, and the base cell went 7x12 -> 4x7 (bible 3.6), so the old 5
      // cells -- 35 px of clearing -- quietly became 20 px. A 63 px heading
      // sitting in 20 px of thinned field is a word competing with the weather
      // instead of standing in a clearing, which is exactly what it looked
      // like. 12 cells is 48 x 84 px, comfortably more than the old build had
      // in absolute terms, which is what rule 2 actually asks for.
      thinPlateauCells: 3.0,
      thinRadiusCells: 12.0,
      thinAmount: 1.0       // 1 = drive the plateau all the way to the cap
    },

    // SELF-ASSEMBLY (bible 4.3) -- GATHER's new trigger.
    //
    // On route settle every ascii word condenses out of the field on its own
    // and then STAYS. Nothing about the verb changed; what changed is that the
    // page no longer waits to be discovered.
    assemble: {
      // "condenses out of the field over assembleS (~2.6 s)". Long on purpose:
      // this is the page introducing itself, and it is the one moment where the
      // whole thesis in bible 1 -- that the type is made of the crowd -- is
      // visible rather than inferred. A fast assembly reads as a fade-in.
      durationS: 2.6,
      // ...with a per-cell stagger inside it, so the word gathers rather than
      // wipes. A cell's own start is somewhere in the first staggerS; it then
      // has the remaining (durationS - staggerS) to resolve. The last cell to
      // start still finishes exactly at durationS, which is what makes the
      // acceptance test ("fully formed within 3 s") a property of one number.
      staggerS: 0.9,
      // WHERE IN THE STAGGER A CELL LANDS: mostly its distance to the word's
      // own centre, the rest its frozen seed.
      //
      // Pure distance is a clean expanding wavefront and it looks mechanical --
      // a wipe with a curve. Pure seed is a dissolve with no direction, which
      // loses "the silhouette resolves before the interior detail". At 0.65 the
      // outline arrives first and unmistakably, but with a grain on it, so it
      // reads as condensation.
      orderWeight: 0.65,

      // WHERE AN ASSEMBLED WORD RESTS, and it is 1.0 -- which took a measured
      // failure to arrive at, because 0.88 looks like the more thoughtful
      // number and it is the one R1 shipped.
      //
      // R1 rested a HEADING at 0.88 and a LINK at zero, and the links were only
      // ever seen with the pointer on them, i.e. at 1.0. So the 12% shortfall
      // was only ever paid by the h1, over its own cleared ring, where it did
      // not show. R2 leaves every word resting where R1 left the heading -- and
      // at 0.88 the density mix is `mix(restD, slotD, 0.88)`, so a counter over
      // a crest of restD 0.95 keeps 0.11 of it and lands at 0.27 density
      // instead of the 0.19 the counter cap solved for. Bible 4.4 rule 2's
      // failure mode exactly: the ratio collapses and the word turns to mud.
      // Magnified, "projects" was unreadable.
      //
      // So the density goes ALL THE WAY, and the aliveness that 0.88 was buying
      // comes from holdDrift below instead -- which is where it should have
      // come from anyway, because bible 4.3 asks for a word that MOVES, not for
      // a word with the weather showing through it.
      restResolve: 1.0,
      // ...and how much FASTER a word comes apart than it went together, when
      // the panel it is on is leaving (bible 7.1a's 0-180 beat). Leaving is not
      // the same gesture as arriving: arriving is the page introducing itself
      // over 2.6 s, leaving is the crowd carrying the letters off, and it has
      // to be done before the camera is. At 0.35 a departing word has dissolved
      // by ~900 ms, which is when the migrate bump falls.
      exitScale: 0.35,
      // ...and this is what keeps an assembled word a crowd rather than a
      // picture: its cells hold their formation while still drifting a little,
      // at a tenth of the field's amplitude. "A formed word is a crowd holding
      // a formation, not a static image" (bible 4.3) -- a formation is held by
      // things that could move, and this is the tenth of a cell that says so.
      // It costs nothing: the drift is analytic and already computed.
      holdDrift: 0.10
    },

    // HOVER, as a MODULATION of an already-assembled word (bible 4.3a).
    //
    // It used to BE the assembly, which is the thing R2 exists to undo. Now the
    // word is already there and hover is what the crowd does when it notices
    // you: four things on one spring, none of them a colour swap, no underline,
    // no scale.
    hover: {
      // "~180 ms". expDamp reaches ~95% in 3/rate seconds, so 16.7/s is 180 ms.
      // ONE spring for all four effects -- they are one gesture, and giving
      // them separate rates is how a hover state starts to feel like four
      // unrelated animations that happen to share a trigger.
      rate: 16.7,

      // 1. SHARPEN. "Stem density up ~15%, counters and surround thinned
      //    harder. Contrast rises; the letterform tightens."
      sharpenGain: 0.15,
      // the counters go from legibility.counterInkMax to roughly half of it.
      // The word is already at 6:1; hovered it is nearer 11:1, which is the
      // difference between reading it and reading it sharply.
      counterCut: 0.5,

      // 2. SHIVER. "Glyph re-roll rate spikes to ~8x for 250 ms, then decays
      //    back. The word visibly reconsiders itself and settles."
      shiverRate: 8.0,
      shiverHoldS: 0.25,
      // ...then decays over about half a second. Exponential, so there is no
      // moment where the churn stops -- it just becomes too slow to notice.
      shiverDecayRate: 6.0,
      // AND THIS IS WHAT MAKES THE SHIVER VISIBLE AT ALL. An assembled cell is
      // pinned to its 6-D matched slot glyph, so raising the re-roll rate on
      // its own changes nothing: there is nothing left to re-roll. The shiver
      // temporarily pushes cells back BELOW their own crossover, so they return
      // to the density LUT, churn at the spiked rate, and then re-cross one at
      // a time as it decays -- each at its own frozen threshold. That is
      // literally "the word reconsiders itself and settles", and it costs one
      // subtraction. Density is untouched throughout, so the word never stops
      // being legible while it is doing it.
      // 0.5, against a crossover drawn from 0.35..0.75 and a word resting at
      // 1.0: about five cells in eight let go at the peak and re-cross one at a
      // time on the way down. The other three hold the skeleton, which is what
      // keeps this a shiver and not a dissolve.
      shiverUnsettle: 0.5,

      // 3. THE FRINGE. "The one hover that may spend chromatic ink: a one-cell
      //    ghost on the stems' leading edge, inside the 4% budget, which is
      //    what makes a hovered word feel printed rather than lit."
      //
      // LEADING EDGE IS THE -X SIDE, and that is not arbitrary: the overstrike
      // in bible 3.4a slips the second impression +0.34 cell to the RIGHT, so
      // the left flank of a stem is the edge a misregistered plate leaves bare.
      // The ghost is the same printing error the resting fringe is, told about
      // a word instead of about a drift.
      fringeStemDensity: 0.55,   // what counts as a stem to ghost
      fringeGhostMax: 0.30,      // ...and how light its neighbour has to be

      // 4. BREATH. "Stem cells drift outward by <= 0.35 cell and back."
      // Outward from the word's own centre, so the word swells rather than
      // sliding -- a slide is a hover state moving the thing you are trying to
      // click on.
      breathCells: 0.35,
      // one cycle per ~1.9 s. Slow enough to be breathing and not vibrating,
      // and it starts from zero displacement (a raised cosine), so arriving on
      // a word never jumps it.
      breathHz: 0.52
    },

    // SCATTER -- hyper beam, mew collision. impulse along the beam normal,
    // scaled by distance and incidence angle. the cell flies, tumbles
    // slightly, and its ink weight goes briefly heavier: struck = smudged.
    scatter: {
      impulsePxPerS: 900,   // at the beam axis. falls off across the corridor

      // the corridor. cells inside it are struck, "strongest on the axis,
      // falling off across the width and with distance from the muzzle"
      // (bible 6.4). the beam's own drawn width is rigConfig.attack's business;
      // this is how far its INFLUENCE reaches, which is wider, because a shot
      // that only moves the type it literally covers reads as a cursor.
      corridorHalfWidthPx: 96,
      muzzleFalloff: 0.55,  // share of the impulse lost by the far end

      // the impulse is mostly along the beam NORMAL (bible 5: "impulse along
      // the beam normal"), i.e. blown sideways out of the corridor, with a
      // smaller shove down the beam so the far end of a heading gets pushed
      // away rather than just apart.
      axialFraction: 0.35,

      // "cell flies, tumbles slightly, ink weight briefly heavier (struck =
      // smudged)". the tumble is on the QUAD, not on the lattice: the cell
      // keeps its grid identity, its glyph just spins a little on its way out.
      tumbleRad: 0.7,
      smudge: 0.35,         // density added at full strike. struck = smudged

      // up to this many hits are live at once, as uniforms. a fifth shot
      // replaces the oldest -- the fourth is already inaudible under the first
      // three and an unbounded list is how a "stateless" field grows state.
      maxActive: 4,

      // cells do not all leave at the same instant: each waits a fraction of
      // this, from its own frozen seed. this is what makes the text reassemble
      // "like sand rather than snapping back" (bible 6.4) -- it is the arrival
      // spread on the way out AND on the way back, for free, because the whole
      // thing is one shifted impulse response.
      arrivalSpreadS: 0.55
    },

    // SETTLE -- after scatter. OVERDAMPED, never oscillates. a bouncing letter
    // reads as a toy. slow on purpose: the drift home should take about 2 s,
    // and cells arrive at slightly different times so the text reassembles
    // like sand rather than snapping back (bible 6.4).
    settle: {
      // the authored expDamp rate, bible 5's table. this is the rate for the
      // returns that ARE expDamp: the per-word resolve, the mew clearing.
      rate: 1.6,

      // SCATTER+SETTLE IS NOT expDamp AND ITS RATE IS NOT 1.6.
      //
      // bible 7.3 pins the displacement to the critically damped impulse
      // response, `impulse * tau * e^(-k*tau)` -- a different function with a
      // different parameter, and reusing 1.6 for its k would be a units error
      // wearing a familiar name. the two are pinned to the same OBSERVABLE
      // instead, which is the thing the bible actually specifies: cells are
      // home in about two seconds.
      //
      // normalize the response to peak 1 (`e*k*tau*e^(-k*tau)`) and its value
      // at tau = T is exactly `z*e^(1-z)` with `z = k*T`. Solving
      // `z*e^(1-z) = 0.001` gives z = 10.2334, so for T = 2 s:
      //
      //     impulseRate = 10.2334 / 2 = 5.1167   1/s
      //
      // which puts the peak excursion at tau = 1/k = 0.195 s (a fast flick
      // out) and everything under a thousandth of it by 2 s (dust settling).
      // test/type.test.js re-solves this and asserts the three numbers agree,
      // so changing durationS without changing impulseRate is a test failure,
      // not a silent drift. Carried to six figures deliberately: rounded to
      // 5.1167 the residual lands at 1.0001e-3, i.e. just OVER the budget, and
      // an acceptance number that is only met after rounding is not met.
      impulseRate: 5.116707,
      durationS: 2.0,
      residual: 0.001
    }
  },

  // ------------------------------------------------------------------
  // THE MAP (bible 7.1a) -- the site is a PLACE, not a stack of documents.
  //
  // Every route is a panel on one continuous plane and navigating is moving a
  // camera across it. There is no page load, no fade, no cut: the crowd of
  // characters is the same crowd the whole time and it walks with you.
  //
  // ADDING A PAGE IS ONE LINE HERE. Moving a page is two numbers. Nothing else
  // in the system knows a compass direction exists -- not the router, not the
  // field, not the stage. They all read a signed delta out of this table.
  // ------------------------------------------------------------------
  map: {
    // route id -> integer lattice cell, [x, y]. +x is east, +y is SOUTH,
    // because +y is down in every other coordinate space on this page and one
    // axis flip hidden in a config table is a bug nobody finds for a week.
    //
    //                    [0,-1]  who am i          N
    //      [-1,0] my journey   [0,0] home   [1,0] projects     W . E
    //                    [0,1]  case studies       S
    //
    // HOME AT [0,0] IS ONE STEP FROM EVERYTHING, which is why it is home.
    //
    // ...and nothing currently occupies it: "/" resolves to who-am-i, which
    // sits at [0,-1] per the brief. So the centre is a real, reachable, empty
    // panel -- bare field with no words in it. That is transcribed exactly as
    // specified rather than quietly resolved, because the two readings ("/" is
    // home, vs. home is a fifth page yet to be written) are the owner's call
    // and they differ by one line in this table. See the R3 report.
    routes: {
      home: [0, 0],
      "who-am-i": [0, -1],
      projects: [1, 0],
      "case-studies": [0, 1],
      "my-journey": [-1, 0]
    },

    // THE PLANE IS A TORUS, and this is the extent of each axis in panels.
    // Travel takes the SHORTER SIGNED DELTA MODULO THE EXTENT:
    //
    //     delta = ((b - a + E/2) mod E) - E/2
    //
    // West -> East is (-1) -> (+1): the direct route is +2, the wrapped route
    // is -1, so you travel LEFT and arrive at East from the far side. North ->
    // South goes up. That is the requested behaviour and it is NOT a special
    // case -- it is what the modulus does, and a bigger map gets it free.
    //
    // 3 x 3 holds the five cells above with room to grow. Raising it is safe;
    // lowering it below the occupied span would alias two routes onto one cell,
    // which map.js asserts against rather than trusting.
    extent: [3, 3],

    // the id whose panel the camera sits on before anything has been navigated
    // to. Only used to seed the camera on a deep link.
    origin: "home"
  },

  // ------------------------------------------------------------------
  // THE TRANSIT (bible 7.1a's beat table) -- and the ORDERING IS THE EFFECT.
  //
  // The crowd leads and the camera chases. Every number here is a knob, and
  // the one that matters most is cameraDelayMs: take it to zero and the whole
  // thing collapses into a slide.
  // ------------------------------------------------------------------
  transit: {
    // t=0        pushState; the destination DOM mounts at its panel. NOTHING
    //            HAS VISIBLY HAPPENED YET.
    // 0 -> 180   MIGRATE begins, staggered, the crowd peels away.
    migrateMs: 900,          // ...and the bump has fallen by here
    migrateStagger: 0.42,    // share of the window spent handing out start times
    // WHERE THE BUMP PEAKS, as a fraction of a cell's own window. Early, so the
    // take-off is quick and the settle is long -- the crowd has to be
    // DECELERATING while the camera is still arriving (bible 7.1a), or the two
    // peak together and read as one object sliding instead of as a flock the
    // camera is chasing.
    migratePeak: 0.35,
    // how far a cell surges, in CELLS, at the peak of the bump. Big enough to
    // read as a flock taking off, small enough that the lattice never comes
    // apart -- past about 8 the crowd shears into visible bands.
    migrateAmpCells: 5.5,

    // 140        THE CAMERA STARTS, DELIBERATELY LATE. This is the single
    //            number that makes the pan read as FOLLOWING rather than as
    //            the page sliding. It is the whole effect.
    cameraDelayMs: 140,
    // 140 -> 1240  the pan. Distance is |delta| x viewport; duration scales as
    //            base x |delta|^0.6, so a two-step move is longer but not twice
    //            as long -- which is how real travel feels and how a linear
    //            scaling conspicuously does not.
    cameraBaseMs: 1100,
    cameraDistanceExponent: 0.6,
    // "a soft launch and a long, decelerating arrival" (bible 7.1a). Authored
    // as the bible writes it, in CSS cubic-bezier control points, and evaluated
    // in js -- the camera is a uniform, not a CSS property, and the DOM stage
    // has to travel on exactly the same curve or the two layers separate.
    cameraEase: [0.42, 0, 0.12, 1],

    // 900 -> 2400  GATHER: the destination's words condense (bible 4.3). The
    //            heading is the last thing to finish, which is what makes
    //            arrival feel like arrival.
    //
    // NOTE THE ARITHMETIC, because the bible is internally inconsistent here
    // and this is the reading: bible 5 authors assembleS at 2.6 s, so a gather
    // starting at 900 ms finishes at 3.5 s, not at the table's 2400. The verb's
    // own rate wins -- the table's 2400 appears to predate the 2.6 s figure.
    // Shortening assemble.durationS to 1.5 would honour the table instead; it
    // is one number, and it is the owner's call. See the R3 report.
    gatherStartMs: 900,

    // MEW DOES NOT PAN (bible 7.1a). She is a creature, not scenery, and she
    // stays with the viewer. She does take a small impulse AWAY from the travel
    // direction as the world starts moving and then catches up, which sells the
    // whole thing for the price of one addImpulse.
    mewImpulsePxPerS: 420,

    // prefers-reduced-motion: the camera JUMPS and the words cross-fade. The
    // DOM swap, the URL and the focus order are identical either way -- the pan
    // is decorative and nothing about the page's meaning is in it.
    reducedCrossfadeMs: 240
  },

  // ------------------------------------------------------------------
  // LOAD (bible 6.1)
  //
  // the page opens as a near-bare field that INHALES. no spinner, ever, and
  // no loading screen -- bible 8 says no on sight.
  // ------------------------------------------------------------------
  load: {
    startCoverage: 0.04,    // near-bare
    inhaleMs: 900           // ...ramping to field.coverageMin..Max over this
  },

  // ------------------------------------------------------------------
  // THE PORTRAIT (bible 4.5) -- baked offline, never computed live.
  // ------------------------------------------------------------------
  portrait: {
    // 12 fps DELIBERATELY. it matches the old-computer register, it is the
    // difference between a costly feature and a free one, and 12 READS AS
    // INTENTIONAL where 24 reads as a bad video.
    fps: 12,
    maxBytes: 200 * 1024,   // ~4 s, delta-encoded; most cells do not change
    targetSeconds: 4,

    // THE ONE PLACE INVERSION IS STILL ALLOWED (bible 3.4a, 8).
    //
    // Inverted cells are banned from the field and from every word -- a letter
    // made of blocks is a stencil, and it shipped once. They are QUARANTINED
    // here rather than deleted, because the feature-mapping reference
    // genuinely uses inversion and here the subject is an IMAGE rather than
    // type: a knocked-out block inside a photograph is a tonal stop, not a
    // letterform made of rectangles.
    //
    // OFF by default, and the shipped pack has no inverted cells in it at all
    // (its densest glyph is 0.337 and the airy register in bible 4.5 has no
    // solid masses to invert). This flag is the seam, not a feature: turning
    // it on lets tools/portrait.py spend the register when a clip's darks need
    // it. NOTHING outside src/type/portrait.js and tools/portrait.py may read
    // it -- test/type.test.js asserts that.
    allowInvert: false,

    // THE HERO BOX'S OWN LATTICE (bible 4.5). Baked offline at a FIXED grid --
    // unlike the main field, which resizes with the viewport, this clip is
    // pre-rendered once and its own cell count is exactly what maxBytes above
    // is measured against. A bespoke box, at the SAME per-cell shape as the
    // rest of the lattice, so it reads as one system rather than an inset
    // photo (bible 3.1).
    //
    // 110 x 96 IS MEASURED OFF THE REFERENCE, not chosen. future-refs/
    // another-reference.jpg -- the image bible 4.5 names as this element's
    // register -- is 551 x 869 px, and the autocorrelation of its ink profile
    // puts its character pitch at 5 x 9 px on both axes: a 110 x 96 grid. The
    // previous 88 x 64 was 1.9x coarser than the thing it was supposed to look
    // like, which is most of why it read as a silhouette rather than a
    // drawing. At 7x12 this box is 770 x 1152 -- a 0.668 portrait crop, near
    // the reference's own 0.634, and the right shape for a face.
    grid: { cols: 110, rows: 96 },

    // AIRY REGISTER (bible 2, 4.5): "fine, delicate, punctuation- and digit-
    // heavy, lots of bare paper" -- deliberately below the field's 12-22%
    // (field.coverageMin/Max above) so the portrait reads as the airiest
    // thing on the page.
    //
    // THIS NUMBER IS ON THE RENDERED-GLYPH SCALE, and that changed. It used to
    // be measured on the tone signal BEFORE glyph matching, which is a
    // quantity the reference cannot be measured on -- so the target could not
    // be checked against the thing it was imitating, and duly wasn't: the old
    // 0.10 of tone came out as 0.058 of actual ink. 0.055 is what
    // another-reference.jpg measures at its own 110x96 grid (0.0535, rounded).
    // tools/portrait.py bisects one tone-curve exponent until the clip's mean
    // ink -- after matching, as it will actually be drawn -- lands here.
    coverageTarget: 0.055,

    // THE DISTRIBUTION, WHICH IS THE PART THE MEAN CANNOT SEE.
    //
    // The old bake hit its coverage target almost exactly and still looked
    // wrong, because a mean is blind to the difference between a tonal ramp
    // and a silhouette. Measured on the same 110x96 grid:
    //
    //                          reference   old bake
    //   empty cells              60.1%       77.6%
    //   midtone body (2-15% ink) 21.1%        3.7%
    //   maxed out (>=30% ink)     0.2%       12.6%
    //
    // The old bake was bimodal -- bare paper plus a solid mass, with nothing
    // in between -- which is exactly the "halftone instead of drawing" failure
    // bible 3.4 names, and it is what kills the thumbnail: at small sizes a
    // bimodal field IS its silhouette. So the ramp's shape is a gate, not a
    // preference; tools/check_type.py asserts it against the shipped pack.
    //
    // THE BOUNDS ARE SET BY THE PLACEHOLDER, NOT BY THE REFERENCE, and that is
    // worth being honest about. Run on portrait-like material the current
    // pipeline lands at 61.5% / 24.3% / 0.6%, essentially on the reference.
    // Run on the placeholder -- a flat-shaded cartoon with literally solid
    // black outlines, framed small -- the same settings give 73.6% / 12.2% /
    // 8.7%, because a cartoon genuinely has fewer midtones and genuinely has
    // black in it. So these bounds are loose enough for the asset that ships
    // today and still catch the failure they exist for: the old bake fails
    // midtoneMin by a factor of three.
    //
    // WHEN THE REAL CLIP LANDS, tighten toward the reference column above.
    tonalGate: {
      midtoneMin: 0.09,   // >= this fraction of cells in [0.02, 0.15) ink
      heavyMax: 0.11,     // <= this fraction at or above 0.30 ink
      emptyMax: 0.80      // <= this fraction bare. above it there is no drawing
    },

    // HOW FAST THE SOURCE'S OWN TIMELINE IS TRAVERSED. 1.0 plays the clip at
    // its native rate; 0.3 covers 1.2 s of source motion across the 4 s bake.
    //
    // This is bible 4.5's content note turned into a number: "prefer a short,
    // slow, near-loop clip (a blink, a head turn) over anything with big
    // motion -- the technique falls apart on fast movement and looks
    // magnificent on stillness." Because the pack is delta-encoded, that
    // sentence is also the byte budget. Measured on the placeholder, which is
    // a cat in flight and precisely the content the bible says not to use:
    //
    //   speed 1.00  -> 31.7% of cells change per frame  -> 471 KB
    //   speed 0.50  -> 16.9%                            -> 256 KB
    //   speed 0.30  -> ~10%                             -> ~160 KB
    //
    // Hysteresis cannot rescue the first row and it was measured trying: at a
    // change margin of 0.6 -- twenty times the shipped one, far past where the
    // picture degrades -- churn only fell from 31.7% to 26.2%, because 75% of
    // it is cells genuinely crossing between paper and ink as the subject
    // moves. There is nothing to suppress; the content is simply wrong for the
    // technique.
    //
    // THE REAL CLIP SHOULD SHIP AT 1.0 and be shot slow instead. This number
    // is a property of the placeholder, not of the design.
    sourceSpeed: 0.3,

    // FRAMING, applied to the source before anything measures it.
    //
    // Not a convenience. Everything downstream is calibrated against the WHOLE
    // grid -- the tone exponent is bisected until the clip's mean rendered ink
    // hits coverageTarget, and that target was measured off a reference whose
    // subject fills its frame. Hand the same machinery a subject sitting in a
    // wide white margin and it does the only thing it can: drives the exponent
    // to its floor trying to make a small subject account for the whole
    // frame's ink, and blackens it. Measured on the placeholder at zoom 1.0 --
    // exponent pinned at its 0.04 floor, 82% of cells bare, 13% at the very
    // top of the ramp. A silhouette with a halo.
    //
    // zoom 1.0 is the whole frame; 2.0 takes the middle half on each axis.
    // THE VALUE BELOW IS FOR THE PLACEHOLDER, which frames a small cat in a
    // large empty margin, and is the one number in this block that should be
    // re-judged by eye when the real clip lands (bible 4.5 wants a face, and a
    // face shot as a portrait will want something near 1.0).
    //
    // AND THE REAL CLIP NEEDS TO BE BIGGER THAN THE PLACEHOLDER IS.
    // mewAnimation.gif is 350x238. Cropped to zoom 2.0 that is 175x119 source
    // pixels behind a 110x96 grid -- about ONE source pixel per cell. The 6-D
    // match measures six staggered discs WITHIN a cell (bible 3.4), so at one
    // pixel per cell there is nothing inside a cell to measure: every cell is
    // flat, every flat cell in a region matches the same glyph, and the result
    // is the runs of one repeated character that read as halftone. It is also
    // most of why this asset's thumbnail is soft where the reference's is
    // sharp. Nothing in the tone curve or the match can invent detail that was
    // never sampled.
    //
    // Rule of thumb from the above: want >= 4 source pixels per cell on each
    // axis after cropping, so a 110x96 grid wants a source of at least ~440 x
    // ~384 inside the framed area -- any modern phone clip clears that by an
    // order of magnitude. This is a note for whoever supplies the clip, not a
    // knob.
    crop: { zoom: 2.0, centerX: 0.5, centerY: 0.52 },

    // THE TONE CURVE (bible 3.4's ethos applied to a photograph).
    //
    // levels -> gamma -> re-add fine detail. The order is the whole trick:
    // the gamma crush is what buys the bare paper, and it flattens the
    // midtones on its way past, so the cell-scale high-pass is added back
    // AFTERWARDS. Global tone decides where the masses are; local detail
    // decides where the speckle is. That is what produces the reference's
    // signature -- clean paper across a flat lit cheek, fine marks wherever
    // there is actual texture, real mass only in the darks -- instead of a
    // smooth gradient that quantizes to bands.
    tone: {
      // the white point is a PERCENTILE (only the distribution knows where
      // the darkest real content is); the black point is a FRACTION OF IT,
      // not a percentile, because a percentile cannot find a noise floor. A
      // source whose background is literally white has more than any sensible
      // percentile of its pixels at exactly zero, so the percentile is zero
      // and clips nothing -- which is precisely what the placeholder did, at
      // 4, 20 and 35 alike, while its background stayed speckled. As a share
      // of the clip's own range it means what it is for on any source.
      blackPointFrac: 0.08,
      whitePointPct: 99.5,
      // THE LOW-FREQUENCY HALF OF THE CONTRAST PAIR: a linear stretch about
      // a pivot. Below the pivot, tone is pushed toward bare paper; above it,
      // toward the ramp's dark end. The high-pass below is the HIGH-frequency
      // half and cannot do this job -- it moves a cell relative to its
      // neighbours, so it can put speckle into a grey plane but it cannot make
      // the plane stop being grey.
      //
      // This exists because of what a thumbnail showed. Earlier versions of
      // this pipeline passed on the mean AND on the tonal histogram and still
      // died at thumbnail size -- a uniform pale haze with the subject barely
      // separable -- because the match's tone-to-ink response is compressive
      // (a uniform cell at 0.34 tone draws only ~0.21 ink) and nothing was
      // pushing the two ends apart ahead of it. Bible 9's first acceptance
      // question is a greyscale thumbnail; this is the knob that answers it.
      contrast: 1.4,
      contrastPivot: 0.30,

      detailCells: 3.0,       // high-pass radius, in CELLS. ~a feature's width
      detailGain: 0.55,       // how much of it survives the gamma crush

      // ...and the local tone below which the high-pass is faded out
      // entirely. A photographic background is not empty -- it is compression
      // noise a fraction of a percent off white -- and a high-pass cannot tell
      // that from an eyelash. Ungated, this pipeline washed every inch of bare
      // margin in an even field of `'` and `-`: uniform marks with no density
      // structure behind them, which is bible 8's "static", and it ate the
      // airiness the whole register is for.
      detailFloor: 0.10,

      // THE CEILING, and it is the ramp's own dynamic range rather than a
      // taste call. The densest glyph the atlas bakes is 0.337 coverage; a
      // cell whose discs all read well above that is off the glyph manifold,
      // where every candidate is equally far away and the argmin stops
      // depending on the image -- so every such cell collapses onto the same
      // densest glyph. That is where the old bake's `QQQQQQQQ` runs came from,
      // and it is why 12.6% of its cells sat at the very top of the ramp while
      // the reference has 0.2% there. Tone above this is not extra darkness,
      // it is discarded contrast, and giving it back to the midtones is what
      // fills the 0.02-0.15 band.
      maxInk: 0.50
    },

    // RAMP WEIGHTING FOR THIS ELEMENT (bible 3.4's families used as registers).
    //
    // The 6-D match stays the match -- these are a PRIOR added to its squared
    // distance, not a replacement for it. Scale matters: the median distance
    // from a ramp glyph to its nearest neighbour in the normalized 6-D space
    // is 0.102, so a bias of a few thousandths decides near-ties and is
    // powerless against a genuine match. That is deliberate. A cell that
    // really is a dark mass still gets SOLID; a cell that could go either way
    // goes airy.
    //
    // Weight bias is the same idea on bible 3.2's second density dimension:
    // the reference is thin-stroked almost throughout, so 600 has to earn it.
    match: {
      // SHAPE DECIDES WHICH GLYPH, VALUE DECIDES HOW DARK. The 6-D shape
      // distance is the match (bible 3.4: never sort glyphs by how dark they
      // look); this weights an explicit coverage-error term alongside it.
      //
      // It is here because a photograph breaks the shape metric in one
      // specific way. A photographic cell is smooth -- all six discs read
      // nearly the same -- and among glyphs of similar coverage the isotropic
      // ones are the TALL ones, so shape alone quietly prefers `1 l Q $ j 7`
      // over `a e c w m 9 4`. Measured, with no value term at all: 0.0% of
      // cells landed anywhere in the 0.15-0.20 ink band and 37% piled up at
      // 0.01-0.02, against a reference that is 12.4% and 1.6% there. A hole
      // in the middle of the ramp is tonal banding and it looks like it.
      covWeight: 8.0,

      biasScale: 0.02,
      familyBias: { SPARSE: -0.35, MID: -0.25, DENSE: 0.30, SOLID: 0.60 },
      weightBias: { "200": -0.30, "400": 0.0, "600": 0.45 },

      // FROZEN JITTER (bible 3.5), and here it does real work rather than
      // decoration: without it a run of cells at the same tone all resolve to
      // the same argmin and you get `QQQQQQQQ`, which reads as halftone. Any
      // candidate within this much of the best distance is eligible, and which
      // one a cell takes is a stable hash of the cell index -- so the texture
      // is frozen, not per-frame noise.
      // ...but a candidate must ALSO be within tieCovTolerance of the
      // winner's COVERAGE, and that condition is load-bearing. tieTolerance is
      // an absolute distance, and near the ORIGIN of the 6-D space -- where
      // every bare cell sits -- a dozen light glyphs fall within any useful
      // tolerance of the blank one. Without the coverage clause the jitter
      // quietly inks the paper: measured, 42% of all cells came out carrying a
      // 0.013-coverage mark against the reference's 1.6%, and the whole
      // background wore an even wash of `'` and `-`. Bible 3.5 says the jitter
      // picks among the top-k MATCHES -- things already near-equivalent -- so
      // it may vary which shape a cell draws, never how dark it is.
      tieTolerance: 0.035,
      tieCovTolerance: 0.030,
      jitterSeed: 0x5E3D,

      // BARE PAPER IS A DECISION, NOT A ROUNDING. A cell with less ink than
      // this in it is paper, and nothing downstream -- not the prior, not the
      // jitter, not the hysteresis -- may put a mark on it. Half the
      // reference's cells inside the head are empty: the airiness is not what
      // is left over after the marks, it is the thing being drawn.
      blankBelow: 0.018,

      // TEMPORAL HYSTERESIS. A cell keeps last frame's glyph unless the new
      // best beats it by this margin. Two jobs: it is the anti-strobe rule
      // (bible 8) applied between baked frames rather than at runtime, and it
      // is what pays for the finer grid -- the pack is delta-encoded, so
      // churn IS bytes.
      changeMargin: 0.030
    },

    // THE FRINGE, FOR THE PORTRAIT SPECIFICALLY (bible 3.3).
    //
    // The global `fringe` block above is calibrated on the EFFECTIVE INK scale
    // and, as its own comment says, deliberately fires only at the edges of
    // INVERTED masses -- nothing but a filled cell clears 0.62. The portrait
    // has no inverted cells at all: its densest glyph is 0.337, and the
    // reference has no solid blocks in it either. So the global thresholds
    // would fire nowhere here, and the element needs its own pair on its own
    // scale. Same rule, same 4% ceiling, same mechanism -- a one-cell offset
    // ghost at the edge of a dense mass, never a fill.
    //
    // maxCellFraction is BELOW the bible's 4% on purpose: the eye references
    // measure at 0.07% (the blue one) and 2.53% (the pink one) of their cells
    // carrying chromatic ink. 4% is the ceiling the bible forbids crossing;
    // 2% is where the references actually sit. Candidates are ranked by the
    // density step across the edge and the weakest are dropped until the
    // budget holds, so this is enforced by construction, not hoped for.
    fringe: {
      threshold: 0.20,        // a cell this inked counts as "a dense mass"
      delta: 0.12,            // ...and a 4-neighbour this much lighter ghosts
      maxCellFraction: 0.02
    }
  },

  // ------------------------------------------------------------------
  // THE PERFORMANCE BUDGET (bible 7.3)
  //
  // this is an AESTHETIC constraint, not a tax: a field that changes slowly
  // IS the better look. the acceptance test is a three-year-old phone, five
  // minutes, still cool, battery graph flat.
  // ------------------------------------------------------------------
  budget: {
    // field opaque, field OVERSTRUCK, mew pass. that is all -- and the middle
    // one used to be the inverted pass. Overstrike replaces it one for one
    // (bible 3.4a), so this number did not move.
    drawCallsPerFrame: 3,
    webglContexts: 1,       // for the SESSION. a route swap must never take one
    atlasPx: 2048,          // one 2048^2 R8 texture, ~4 MB gpu, uploaded once
    atlasChannels: 1,       // R8. nearest-sampled, no mips, no anisotropy

    // FRAME RATE: RENDER AT THE DISPLAY'S NATIVE RATE.
    //
    // this used to say 30 idle / 60 active, and that was written before the
    // field was measured. Two things changed it:
    //   * the field is now a PURE FUNCTION evaluated in the vertex shader
    //     (bible 7.3), so a frame costs 0.05 ms of cpu and ~0.4 ms of gpu on
    //     the target machine. Halving the frame rate saves a fraction of a
    //     percent of a 120 Hz budget. There is nothing left to save.
    //   * the primary target is a 120 Hz ProMotion MacBook Pro, and mew is
    //     ALWAYS moving, so the panel never drops to a lower refresh on its
    //     own. Rendering at 60 into a 120 Hz panel with a moving character is
    //     visible judder. Half-rate is a cost, not a saving.
    // so: render at whatever rAF gives us, and claw frames back only from the
    // degradation ladder, from document.hidden, and from a long idle.
    targetFps: 0,           // 0 = native. never cap on a healthy device
    hiddenFps: 0,           // document.hidden -> stop completely
    longIdleS: 45,          // after this long with no pointer/scroll/key...
    longIdleFps: 30,        // ...drop to 30. nobody is watching closely.
    mewSimHz: 120,          // unchanged, fixed-step, on the same rAF

    dprMax: 2,
    dprMaxDense: 1.5,       // ...and 1.5 once the grid is bigger than
    denseCellCount: 60000,  //     this many cells

    // THE CELL CEILING IS NOW A SANITY CHECK, NOT A BUDGET.
    //
    // it was 24 000 when every cell cost cpu time and buffer bandwidth every
    // frame. With the analytic field a cell costs 4 vertices and nothing else:
    // 120 000 cells is 480 k verts/frame, which is 58 M verts/s at 120 Hz, i.e.
    // nothing. The real limit is FRAGMENT coverage, and that is bounded by the
    // screen no matter how many cells there are.
    // measured on an M2 Max, 10 980 cells at 2560x1440 (tools/bench):
    //   cpu-driven instances  0.917 ms cpu, 0.261 ms gpu, 176 KB/frame uploaded
    //   analytic instances    0.050 ms cpu, 0.261 ms gpu, ZERO uploaded
    //   fullscreen post-pass  0.033 ms cpu, 0.215 ms gpu, ZERO uploaded
    // same picture, same gpu cost, 18x less cpu, no bandwidth. And the
    // post-pass, while cheapest, cannot move a glyph independently of the grid
    // -- which is the entire effect -- so it is used only where cells never
    // move (the portrait, the optional ascii mew pass).
    maxCells: 120000,

    // instances are allocated to cover the VIEWPORT plus a margin, not the
    // document. per-cell content is looked up by document grid coordinate from
    // a data texture in the vertex shader, so a long page costs nothing extra.
    instanceMarginCells: 2,

    // THE CELL DATA TEXTURE COVERS THE WHOLE MAP (bible 7.1a), because that is
    // what makes the torus free: walking off the west edge samples the east
    // panel's texels and the wrap-around is literally texture wrapping.
    //
    // It is the one thing in R3 that costs real memory, so it is budgeted here
    // and asserted rather than assumed. At the 4 x 7 base cell on a 1512 px
    // viewport a 3 x 3 map is 1134 x 423 texels: 1.92 MB per plane, and there
    // are TWO planes (texA and texB), so 3.84 MB on the GPU. Held for the
    // session, uploaded on layout, never per frame.
    //
    // The ceiling is per PLANE, so it reads the same as the figure in the
    // bible and in the plan. 8 MB leaves room for a 4 x 4 map at this cell
    // size, or a 3 x 3 at a 4K viewport, before anything has to be rethought.
    maxMapTexelBytesPerPlane: 8 * 1024 * 1024,
    mapPlanes: 2,

    // restated from the two blocks above so a perf check has one place to
    // read them: mean ink coverage 12-22% at rest, chromatic cells <= 4%.
    meanCoverage: { min: 0.12, max: 0.22 },
    chromaticCellFraction: 0.04
  }
};

export default siteConfig;
