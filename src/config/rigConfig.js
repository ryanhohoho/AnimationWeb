// rigConfig.js
// single source of truth for bone names and every tuning constant.
// swapping in a future model should only ever require edits to this file.

export const rigConfig = {
  // ------------------------------------------------------------------
  // THE SKIN COLOUR, and the only place it lives.
  //
  // v4 dropped meshy's 2048px atlas -- 2 MB of shattered per-triangle islands
  // with the lighting baked in -- for a flat one. the ENTIRE body samples a
  // single texel of this colour and the light rig does all the shading, which
  // is what it was tuned for. only the face keeps a real uv island, and only so
  // it can carry the painted eyes and blush.
  //
  // tools/rig_mew.py reads this hex OUT OF THIS FILE when it bakes the atlas,
  // and test/sim.test.js reads it as the albedo for the light-rig check, so the
  // three can never drift apart. to recolour mew: change it here, then
  //     python3 tools/rig_mew.py && python3 tools/check_mew.py
  // (measured default: the area-weighted mean of the original atlas, so the
  // character's on-screen tone did not shift when the texture was replaced.)
  // ------------------------------------------------------------------
  skinHex: "#F8B7DE",

  // ------------------------------------------------------------------
  // SHINY. one in three page loads, mew comes up shiny, the way the games do
  // it: the body colour changes and an entrance animation plays.
  //
  // THE COLOURS ARE THE GAMES'. taken out of the actual sprites, not eyeballed:
  //   #9CDEFF  shiny mew's body. the dominant colour of the Gen V B/W sprite
  //            (which is also the default sprite PokeAPI serves), 28.9% of its
  //            opaque pixels. the Gen III sprite runs a touch paler (#C0E8F8)
  //            and the official artwork a touch deeper (#A5EDFF..#B1ECFF); the
  //            Gen V value is the one everybody means by "shiny mew blue".
  //   #7BACD5  its shade colour from the same palette, used here for the blush.
  //            the official shiny artwork contains ZERO warm pixels -- the
  //            cheeks are simply a deeper shade of the body -- so keeping the
  //            pink blush would ship a cyan mew with hot pink cheeks.
  //   #C5FFFF  its highlight, which is what the star sparkles are tinted with.
  //
  // ?shiny=1 forces it on and ?shiny=0 forces it off, for previewing.
  // ------------------------------------------------------------------
  shiny: {
    chance: 1 / 3,
    skinHex: "#9CDEFF",
    blushHex: "#7BACD5",

    // THE ENTRANCE, ported beat for beat from the games -- see
    // engine/fx/starBurst.js for the sources and the shape maths.
    sparkle: {
      // 1. the FLASH. bulbapedia's definition of the whole effect is "a flash
      // of stars or light"; this is the light half. near-instant up, slower
      // down. it lives in the character's MATERIAL, not in the post pass, so it
      // blows out the painted eyes along with everything else.
      flashUpS: 0.06,
      flashDownS: 0.26,
      flashPeak: 0.85,        // 1.0 would erase the silhouette's outline

      // 2. the RING: "white stars appear around the Pokémon" (gen VI). evenly
      // spaced and jittered rather than randomly placed -- pure random angles
      // clump and read as debris instead of a ring.
      ringCount: 14,
      ringInnerPx: 26,        // where they start, from the character's centre
      ringOuterPx: 96,        // ...and where they end up, on an ease-out
      // the stars have to be big enough to READ as stars. the scene is drawn
      // at a quarter resolution, so a 17 px star was four texels across and the
      // astroid's arms vanished into a dot with an outline around it.
      ringSizePx: 28,
      ringStagger: 0.16,      // s of spawn spread
      ringLife: 0.62,

      // 3. the HERO STAR: "a large golden star appears in front of the
      // Pokémon" (gen VII). barely travels, outlasts the ring.
      heroCount: 2,
      heroSizePx: 60,
      heroDriftPx: 22,
      heroDelay: 0.10,
      heroLife: 0.95,

      // 4. STRAGGLERS drifting up, so the burst has a tail instead of stopping
      // dead on the last frame of the ring
      moteCount: 6,
      moteSizePx: 19,
      moteRisePx: 74,
      moteWobblePx: 7,
      moteStagger: 0.35,
      moteLife: 0.70,

      twinkle: 0.18,          // size ripple, so they flicker like a sprite sheet
      twinkleHz: 3.0,
      // the gen V shiny palette again: white core, its #C5FFFF highlight on the
      // arms, and gold for the gen VII hero star
      coreColor: "#ffffff",
      edgeColor: "#dcffff",
      goldColor: "#ffe9a3",
      zOffset: 0.0,

      // ANNOYANCE STARS, knocked loose by a hard collision. Same four-pointed
      // stars, thrown instead of swept: manga's vocabulary for "that hurt" is
      // stars seen circling the head, and the mechanics are the standard
      // game-juice impact burst -- a handful of particles on an upward-biased
      // cone with randomised speed and lifetime, pulled back down by gravity so
      // each one draws an ARC and shrinks away at the end.
      annoy: {
        waves: 3,             // emitted in waves, not one burst: the flail lasts
        perWave: 5,           // 1.5 s and a single pop at t=0 would be over long
        waveGapS: 0.36,       // before mew stopped waving
        originPx: 34,         // spawn ring around the head...
        originYPx: 52,        // ...and how far above the body's centre
        speedLoPx: 170,
        speedHiPx: 340,
        coneDeg: 116,         // thrown UP and out, spread this wide
        gravityPx: 660,       // what turns the throw into an arc
        lifeLoS: 0.45,
        lifeHiS: 0.85,

        // ── THE SHAPE, AND IT IS NOT THE SHINY SPARKLE'S ─────────────────
        // A knocked-loose star is the manga/Kirby star: five points, straight
        // edges, fat body. The shiny entrance keeps its four-pointed astroid,
        // which is a different reference and a different moment.
        //
        // The waist is the whole character of it. 0.382 (1/phi^2) is the
        // pentagram-sharp star and reads as a spikeball at these sizes and
        // this spin — which is the report this fixes. 0.52 is measured off the
        // reference: the waist a little past half way out, so the body is
        // round and the points are short.
        starWaist: 0.52,
        // ...and the core threshold has to be re-derived for it, or the
        // two-tone changes when only the OUTLINE was supposed to. Both fields
        // run 0 at the centre to 1 on the edge, but they fill differently: the
        // astroid's `d <= c` region is the astroid scaled by c^(3/2) on each
        // axis, so its area goes as c^3, and 0.42^3 is 7.4% of the sprite. The
        // five-point field is linear in radius, so its area goes as c^2, and
        // sqrt(0.074) is 0.27. Same white core, same weight, different shape.
        starCore: 0.27,

        // ── FOUR SIZES, AND THE RATIO BETWEEN THEM IS THE BRIEF ──────────
        // Rungs, not a jitter: the reference is one big star and a few smaller
        // ones, each a size you could name. 1.00 / 0.34 is 2.94x, under the
        // 3x ceiling asked for, and there is a check on it — a jitter on top
        // would quietly put it over.
        sizePx: 26,                        // the largest rung, in character px
        sizeLadder: [1.0, 0.68, 0.47, 0.34],
        sizeWeights: [1, 2, 3, 3]          // the big one is the rare one
      }
    }
  },

  // ------------------------------------------------------------------
  // PANIC SWEAT (engine/fx/sweatDrops.js). The other half of the startle,
  // and the half that carries it: 汗マーク, many of them, FLUNG. One drop at
  // the temple is embarrassment; a dozen thrown off in waves is an animal
  // that moved before it finished looking.
  //
  // The numbers that matter are the last three groups. apexOvershoot is what
  // keeps a drop from ever being seen coming down — it is culled a shade past
  // the top of its own arc, so the spray always reads as LEAVING. holdFrac is
  // what keeps it at full size for nearly all of that flight instead of
  // shrinking the whole way, which reads as receding rather than travelling.
  // And riseBlend is how much of the escape direction survives being bent
  // toward vertical: at 1 the spray is a jet along the escape, at 0 it is a
  // fountain straight up regardless, and neither of those is a startled animal.
  // ------------------------------------------------------------------
  sweat: {
    // ── THREE WAVES, THREE DROPS, AND NEVER TWO WAVES IN THE AIR ──────────
    // The old build ran four waves 0.12 s apart against a life three times
    // longer, so all twelve were up together: a cloud coming off her rather
    // than three throws. Boom, boom, boom is three separate events, and an
    // event needs the stage clear before the next one starts.
    waves: 3,
    perWave: 3,
    waveGapS: 0.05,         // the breath BETWEEN waves, from the last drop of
                            // one to the first of the next. NOT a period

    // ── THE LAUNCH, AND IT IS THE SAME EVERY TIME ─────────────────────────
    // One speed, one elevation, no jitter: the arc is a designed constant, not
    // a scatter. The three of a wave are separated in SPACE (below), because
    // separating them in ANGLE separates their arcs, and then they are no
    // longer carrying the same arch.
    //
    // "FASTER" IS A TIME SCALE, NOT A SPEED KNOB — and this is the whole reason
    // the block below moved together rather than one number moving alone.
    // Raising speedPx by itself is wrong in both directions at once: against
    // the same gravity a faster launch throws the drops HIGHER and WIDER, and
    // it makes each one live LONGER, so the waves would come further apart. The
    // opposite of what a faster spray should do.
    //
    // Under v -> k*v and g -> k*k*g the ballistic is exactly time-scaled: every
    // drop traces the SAME curve through the SAME points at k times the speed
    // and in 1/k of the time. The arc's height is vy*vy/2g, invariant. The apex
    // time is vy/g, which falls by k -- so the life falls by k, and with the
    // breath between waves held at an absolute 0.05 s the three waves come round
    // measurably sooner. Even the tail is untouched: its hook is 0.5*g*dt*dt
    // with dt = tailPx/speed, and the two k's cancel, so the drawn glyph is
    // identical and only its clock has changed.
    //
    // k = 1.3. EVERY velocity in this block carries it — escapeCarryPx included,
    // or the escape lean would quietly change with the speed — and every
    // duration carries 1/k.
    templeXPx: 22,          // the two spawn points, off her centre...
    templeYPx: 44,          // ...at the upper temples of a 150 px character
    elevDeg: 58,            // from horizontal, mirrored per side
    speedPx: 559,           // 430 * k
    gravityPx: 2112,        // 1250 * k*k. Steep, because the arc has to finish
                            // in about a fifth of a second for three of them to
                            // fit inside face.overlay.durS
    apexOvershoot: 1.22,    // culled a shade past the top, so nothing is ever
                            // seen coming down -- and so the hook, which is
                            // widest as it goes over, is the last thing you see
    lifeMaxS: 0.346,        // 0.45 / k. A GUARD, NOT A KNOB: the schedule is
                            // derived from the apex, and if this ever binds the
                            // waves silently start overlapping. Scaled with the
                            // rest so it keeps exactly the margin it had.
    escapeCarryPx: 78,      // 60 * k. Her flight carries them sideways. A CARRY
                            // and not a lean: leaning rotates the launch, which
                            // changes vy, which changes the apex, which
                            // desynchronises the waves and costs the closed-form
                            // schedule. Before the scale it was 60 against a 430
                            // launch; 120 was tried first and was half the
                            // launch's own horizontal component, so the upwind
                            // temple threw almost straight up while the downwind
                            // one threw wide and the two sides stopped reading as
                            // one spray. Scaling it with the speed is what keeps
                            // that ratio -- and so the lean -- exactly where it
                            // was tuned.
    sideStepPx: 9,          // the pair of a wave, across the launch line...
    sideOutPx: 7,           // ...and along it, so they read as one arc at two
                            // phases rather than as two copies of one drop

    // ── THE GLYPH, SIZED IN TEXELS ────────────────────────────────────────
    // Presentation runs through fx/pixelate.js at pixelSize 4, so one texel is
    // four screen pixels. The old drop was about 20 px end to end -- FIVE
    // texels -- with two specular dots of one texel each inside it. None of
    // that shape was ever resolvable: it was solved exactly and then thrown
    // away by the pass that draws it.
    bulbPx: 9,              // head RADIUS. 18 px across is 4.5 texels, the
                            // least a disc can be and still read as round once
                            // the outline pass rings it
    tailPx: 26,             // the DRAWN length of the tail at any speed. A glyph
                            // has fixed proportions, so this is what is fixed;
                            // how far back in time it reaches follows from it
    tailSegs: 8,            // tapered segments the sweep is solved as. The error
                            // is the bezier's chordal error, under 0.1 px at 8,
                            // a fortieth of a texel. A union of DISCS was tried
                            // first: it scallops, and near the tip, where the
                            // radius falls below the spacing, it comes apart
                            // into a dotted line
    taperExp: 1.35,         // r = bulb * (1-t)^this. Above 1 the tail pinches
                            // quickly and ends in a needle, which is the manga
                            // mark. Below 1 it is a wedge with a blunt flare --
                            // tried, and it reads as a chilli
    hookGain: 2.5,          // the gravity term of the trailing path, exaggerated.
                            // At 1.0 the tail IS the flown path exactly and the
                            // bend peaks at 3.1 px, which is 0.78 of a texel and
                            // invisible. This is the one place the drawing lies,
                            // and it lies the way the physics already points
    tailMinS: 0.027,        // how far back in time the tail may reach. Without
    tailMaxS: 0.123,        // the cap, a nearly-stopped drop grows a tail out of
                            // the whole first half of its own flight. These are
                            // 0.035 and 0.16 over k: they are DURATIONS, and the
                            // fraction of a life they guard has to survive the
                            // time scale or the cap would start biting where it
                            // never used to. Neither binds at present -- dt runs
                            // 0.047 s at launch to 0.067 s at the top.

    // the specular, in bulb radii. ONE, not two: the old build drew two dots at
    // about one texel each, which is a sub-pixel detail on a sprite
    hiOffset: 0.34,         // pushed toward the LEADING edge, the side with no
                            // tail on it
    hiAlong: 0.5,           // ~4.5 px by ~3 px: about two texels by one, the
    hiAcross: 0.32,         // smallest ellipse that still reads as an ellipse
    hiTiltDeg: -30,         // off-axis, and mirrored by the drop's handedness

    popInFrac: 0.08,
    growFrom: 0.74,         // grows through the flight: a shrinking sprite reads
    growTo: 1.22,           // as receding, and these are coming at the viewer
    holdFrac: 0.88,
    bodyColor: "#5FA6DC",
    hiColor: "#C3E1F8",
    zOffset: 0.02
  },

  // ------------------------------------------------------------------
  // bone role map. tail is base -> tip. roles other than root/tail are
  // optional: pose layers skip missing ones.
  // NOTE: three's gltfloader sanitizes node names (dots, colons, spaces are
  // stripped), so "ear.L" in blender arrives here as "earL". if a bone seems
  // missing, check the console error for the sanitized list.
  // ------------------------------------------------------------------
  boneRoles: {
    root: "root",
    spine: ["spine", "chest"],
    neck: "neck",
    head: "head",
    earL: "earL",
    earR: "earR",
    // v4 model: the arms are ONE PIECE and hinge only at the armpit, so there
    // is no hand joint to resolve. every pose layer treats a role as optional,
    // so dropping them here is all that is needed (rig.js -> bones.handL = null,
    // limbPose skips it).
    armL: "armL",
    armR: "armR",
    footL: "footL",
    footR: "footR",
    // the tail is a 10-joint rod now (was 7). the extra segments are what buy
    // the solver curvature resolution; nothing outside this list cares.
    tail: ["tail001", "tail002", "tail003", "tail004", "tail005",
           "tail006", "tail007", "tail008", "tail009", "tail010"]
  },

  // ------------------------------------------------------------------
  // PRESENTATION PASS -- how the rendered character is finally drawn.
  // flip `mode` to switch looks. purely visual: the animation/movement code
  // never changes and never even knows which one is on.
  //
  //   "pixelate" retro sprite: low-res + posterized + dark outline  (DEFAULT)
  //   "ascii"    mew drawn out of the same glyphs as the rest of the site
  //   "cutout"   mew is a hole in the page onto a stationary picture
  //   "none"     raw 3d
  //
  // >>> HOW TO TURN MEW INTO ASCII <<<
  // change the one string below to "ascii". That is the entire change. It works
  // because fx/presentation.js picks a pass behind a single interface
  // (pixelRatio / snapPx / resize / render / dispose), so fx/asciiPass.js is
  // just another implementation of it -- mew is rendered into the site's own
  // glyph atlas at her own, coarser cell size and composited into the type
  // field. Tuning for it lives in `presentation.asciiPass` below.
  // The default is deliberately "pixelate": a saturated, smooth, ALIVE mew in a
  // flat two-ink ascii world is the contrast the whole site is built on.
  // See DESIGN.md.
  // ------------------------------------------------------------------
  presentation: {
    mode: "pixelate",       // <-- TOGGLE HERE ("pixelate" | "ascii" | "cutout" | "none")

    // the scene is rendered at low resolution and upscaled with hard pixels,
    // posterized colors, and a dark sprite outline. cheaper than full-res
    // rendering (a fraction of the fragments).
    pixelate: {
      pixelSize: 4,           // screen px per texel (bigger = chunkier)
      colorLevels: 6,         // posterization steps. secondary now: the SHADING
                              // is banded in the character's own material (see
                              // spriteShade below), which is a better place to
                              // do it, so this mostly catches the fx layers
      bandLuma: true,         // band BRIGHTNESS and keep the hue. false bands
                              // r/g/b separately, which is the classic look but
                              // rounds the channels apart and neutralizes the
                              // pink in the shadow bands
      shadeLift: 0.0,         // 0..1 pulls the shadow bands up toward the light
                              // side. OFF: spriteShade.shadeFloor does this job
                              // now, on the light instead of on the finished
                              // picture, so it cannot lift the eyes with it
      outline: true,
      outlineColor: "#2a1f33",// dark plum silhouette line, like the references
      fxOutlineColor: "#ffd7f2",
                              // ...but the SAME line around a hyper beam reads
                              // as soot. Additive fx flag themselves in the
                              // alpha channel (see engine/fx/alphaFlags.js) and
                              // get this instead: the hot pink-white rim the
                              // anime beams are drawn with, which also makes the
                              // outline pass work FOR the beam -- it is now what
                              // gives it a crisp edge against the page
      snapToGrid: true        // quantize the RENDER position to the texel grid
                              // (physics untouched; classic sprite crawl)
    },

    // SPRITE SHADING, applied inside the character's material -- see
    // engine/fx/spriteShade.js. the light rig above still does all the lighting;
    // this cuts its smooth falloff into flat sections and keeps the painted
    // marks out of it entirely.
    spriteShade: {
      bands: 4,               // how many flat sections. 4 = lit, two shadows and
                              // a core shadow, which is about what a hand-drawn
                              // sprite of this size carries
      shadeFloor: 0.45,       // the darkest section's level. this is what keeps
                              // the shadow side in the pink family instead of
                              // going to mud
      shadeGain: 1.25,        // contrast before the floor: >1 pushes more of the
                              // surface into the top band = flatter, more sticker
      // TINTS ARE MULTIPLIERS, not colours (a hex would be sRGB-decoded and
      // "#ffffff" would stop meaning 1.0). shadows shift COOL and lights shift
      // WARM: a shadow that is only darker reads as dirt, and the hue shift is
      // what makes it read as light instead. this is standard pixel-art practice
      // and it is the single thing that stops a 4-band ramp looking like a
      // JPEG artefact.
      shadowTint: [0.86, 0.85, 1.05],
      lightTint: [1.03, 1.00, 0.97],
      // INK = how far a texel is from the flat skin colour. the eyes and the
      // blush are art, not surface, so they are drawn flat and at full contrast
      // wherever the character is facing. measured on the shipped atlas: skin
      // sits at 0, the blush at 0.57, the eye whites at 0.32 and the iris at
      // 1.06, so the ramp only has to clear the anti-aliased boundary.
      inkLo: 0.12,
      inkHi: 0.32,
      inkShade: 0.22,         // ...but keep a trace of the shading on it, or the
                              // eyes look pasted onto the head
      // WARM window that isolates the blush and its gradient from every other
      // kind of ink, used only by the shiny recolour. measured on the shipped
      // atlas as (r-b)/luma in LINEAR -- normalised, NOT absolute, because a
      // half-strength blush texel is pale enough to slip an absolute test while
      // still being proportionally as warm as the core.
      //
      // WHERE THE WINDOW HAS TO SIT. the same pink paint that makes the cheeks
      // also draws the lid line around each eye, and it is thinned there: 500
      // texels of #f89fc5 sitting at warm 0.18, which the old 0.22 floor missed
      // by four hundredths. Those were the last pink pixels on the shiny, and
      // because they ring the eyes they were also what showed around the >.<
      // overlay. Sweeping the floor down the ramp: 0.22 leaves 309 visibly pink
      // texels (worst r-b 0.059 sRGB, at mip 3), 0.10 leaves none, and the eye
      // whites -- the nearest thing that must NOT be re-tinted -- do not come
      // off zero until the floor goes below 0.00. So: land in the middle of
      // that gap, and it is clean on all nine mip levels.
      warmLo: 0.08,
      warmHi: 0.26,
      inkBoost: 1.70          // and push the marks back AWAY from the skin colour
                              // to undo minification. the face island is 880 px
                              // of atlas landing on ~20 px of a quarter-res
                              // target, so every eye pixel that reaches the
                              // screen is an average of navy and pink -- that
                              // averaging IS the blur, and no filter setting
                              // undoes an average. 1 = off; much past 1.8 and
                              // the boost overshoots into cyan fringes.
    },

    // only mew's SILHOUETTE is kept; it is filled with a picture that stays
    // put on screen while the silhouette moves over it, so the character reads
    // as a window cut through the website (the bsod-person references).
    cutout: {
      overlay: "mewOverlay.png",  // or "mewAnimation.gif" (animated), or any url
      gifFps: 12,             // gif frames pushed to the gpu per second
      zoom: 1,                // >1 crops into the picture, <1 pulls it back
      scrollWithPage: false,  // false: pinned to the viewport (feels like it
                              // sits behind the site). true: pinned to the
                              // document, so it scrolls with the page
      parallax: 1,            // scroll slide multiplier when scrollWithPage
      edgeSoftPx: 1.6,        // border feather radius in screen px. ~1 is a
                              // clean antialiased cut, 4+ goes dreamy/glowy
      edgeLo: 0.35,           // smoothstep window on the blurred silhouette
      edgeHi: 0.62,           // alpha. widen the gap for an even softer lip
      opacity: 1,
      rim: false,             // soft dark lip just inside the edge
      rimWidth: 0.3,
      rimColor: "#2a1f33",
      msaa: 4,                // multisamples on the mask (0 disables)
      maskScale: 1            // mask resolution multiplier vs the device dpr
    }
  },

  // ------------------------------------------------------------------
  // light rig. the character should read as BRIGHT PASTEL PINK and fairly
  // FLAT -- sticker-like, not a moody 3d render. two things get us there:
  //   1. most of the light is ambient, so there is little falloff to go dark
  //   2. the fill is pink-family, so the shadow side stays pink instead of
  //      sliding toward purple (the old ground color was a grey-purple, which
  //      is what was dirtying it)
  // the key light is VIEWER-RELATIVE: it is re-aimed from the camera at the
  // character every frame, so the lit face is whichever side you are looking
  // at, no matter where on the page mew is. costs two vector writes a frame.
  // ------------------------------------------------------------------
  lighting: {
    skyColor: "#fff0f6",      // ambient from above (near-white, a touch warm)
    groundColor: "#e8b9d0",   // ambient from below: light pink, NOT purple
    ambientIntensity: 1.55,   // the flatness dial -- raise to flatten further
    keyColor: "#fff6fb",
    keyIntensity: 2.1,        // form dial -- raise for more shaping/contrast
    keyOffset: [-0.75, 0.5, 0.72], // key direction in VIEW space (x right, y up,
                              // z toward the viewer).
                              // THIS IS WHAT MAKES THE SPRITE BANDS VISIBLE. it
                              // used to be near-pure +z, i.e. a light sitting on
                              // the camera: every front-facing surface then has
                              // the same N.L, so cutting that into sections gives
                              // ONE section and the character reads as a flat
                              // silhouette. an upper-left key spreads the same
                              // surfaces across the ramp, which is what a sprite
                              // artist would draw. ambient came down to match so
                              // the overall level did not change.
    followCharacter: true      // aim the key from the camera at mew each frame
  },

  sizing: {
    characterHeightPx: 150,   // on-screen height of the model, on a wide window
    // ── AND SHE IS SIZED FOR THE SCREEN SHE IS ON ──────────────────────────
    // 150 px is 12% of a 1280 px window and 38% of a phone: the same animal,
    // reading as a companion on one and as an obstruction on the other. She has
    // no colliders any more -- by instruction, so she can go where she likes --
    // which means on a phone she simply sits on the words.
    //
    // The two ends are named rather than a ratio, because what matters is her
    // size against the COLUMN, and the column stops growing at the deck's
    // 60rem measure. Between them it is linear. 96 px is 25% of a 390 px phone,
    // which is about where a character stops being furniture and starts being
    // company again.
    narrowHeightPx: 96,
    narrowAtPx: 380,
    wideAtPx: 900,
    // physics circle radius = height * this. measured: with the rotation centre
    // at the root joint the furthest body vertex sits at 0.598 x height, the
    // 90th percentile at 0.484, so 0.50 covers ~93% of the character and leaves
    // only the ear/foot/muzzle points proud -- which is the right trade for a
    // circle around a pointy silhouette. before the pivot fix the worst case
    // was 1.2 x height (the head, upside down) against a 0.42 radius.
    radiusFactor: 0.50,
    // THE PIVOT MUST MATCH THE ROOT JOINT'S HEIGHT. bodyPose spins the whole
    // character about the root BONE, while this parks the model so that
    // bounds.min.y + height*pivotFactor sits on the physics point. when the two
    // were different heights (root at 15% of the model, pivot at 50%) turning
    // upside down swung the head ~180px away from a 63px collision circle, and
    // most of the character clipped straight through the page. the builder puts
    // the root joint at the model's own centre of area and prints the matching
    // number; tools/check_mew.py asserts they agree.
    pivotFactor: 0.5456,
    fovDeg: 35,
    camDistance: 16
  },

  physics: {
    dragLinear: 1.1,          // 1/s
    dragQuad: 0.0006,         // 1/px
    maxSpeed: 1400,           // px/s: anime-fast top end
    restitution: 0.35,
    tangentDamp: 0.9,

    // ── SHE PASSES THROUGH THINGS ────────────────────────────────────────
    // Nothing on the page blocks her. Text is avoided, not collided with,
    // because a sequence of small collisions during ordinary navigation reads
    // as a bug rather than as an animal. Both fields are SHORT-RANGED on
    // purpose: a long-range repulsion from every block of type has its minimum
    // out at the margin of the page, and she would spend her life crawling
    // around the outside edge of it.
    avoidRangePx: 110,        // how far off a surface she starts to steer away
    avoidAccel: 2400,         // px/s^2 at the surface, falling off quadratically
    // ── AND THE WAY OUT MUST BEAT THE WAY IN ───────────────────────────
    // This was 4000 against a steering force that peaks at steerMaxForce
    // (2600) x leanThrust.maxMul (1.7) = 4420. A fully leaned-in steer
    // therefore WON, by 420 px/s^2 — so any time the thing she was flying at
    // sat inside a block of type, she flew in, held herself there against the
    // escape, and stayed until something changed the geometry. That is the
    // "pushes into an element and will not come out without a nudge": the
    // nudge was not freeing her, it was breaking the tie.
    //
    // Nothing may out-push the escape. There is a check on this in
    // test/sim.test.js so the two numbers cannot drift back past each other.
    insideAccel: 5600,        // px/s^2 out of anything she is actually inside

    // ── THE EDGE IS A LEASH ──────────────────────────────────────────────
    // She can cross it. The hard stop exists only so a fling can never lose
    // her somewhere the return flight cannot reach.
    // ── THE LEASH, LOOSENED ──────────────────────────────────────────────
    // A narrow gap between an element and the rim is the one place she reliably
    // jammed: the avoidance field pushes her off the element, the leash pushes
    // her off the rim, and between the two there was nowhere left to be. The
    // answer is not to weaken the avoidance — that is what keeps her off the
    // type — but to let her go AROUND, outside the frame, which costs nothing
    // because the sheet does not end at the viewport.
    edgeSlackPx: 240,         // free travel past the TOP and BOTTOM, so she can
                              // exit frame
                              // and come back in somewhere else entirely
    edgeReturnAccel: 1250,    // then a spring, stiffening with distance
    edgeHardPx: 520,          // the point of no return
    // ── THE SIDES ARE THE SCREEN, AND SHE STAYS ON IT ──────────────────
    // There was a version of this where the sides were a very long leash (560
    // px of free travel) so she could round an element flush to the rim by
    // going outside the page. It worked, and it read as her wandering off the
    // sheet constantly — worse than the thing it fixed. Getting past an
    // element is the push ramp's job now (behavior.push): she leans on it until
    // she is through, rather than walking round the outside of the paper.
    //
    // So: no free travel at all sideways. The spring starts at the rim and is
    // at full within `edgeRampXPx`, and full is FIRMER than `insideAccel`, so an
    // element sitting flush to the edge cannot push her off the page — see the
    // exit-direction choice in avoidColliders, which will not pick a way out
    // that does not exist either.
    //
    // The STOP is still well out, because it is not what contains her. It is
    // there so a fling cannot lose her, and it has to leave room for the two
    // things that legitimately begin outside the frame: a page-swap entry
    // (behavior.entryOffsetPx, 170) and the tail of a throw. A startled exit is
    // a third case and switches the sideways leash off entirely while it runs.
    // Measured against her SKIN, not her centre: the line sits one body radius
    // inside the rim, so what stops at the edge of the screen is the edge of
    // her. Held by the centre instead, half of a 150 px animal hangs off the
    // page, which is the thing being complained about.
    edgeSlackXPx: 0,          // no free travel past the LEFT and RIGHT
    edgeRampXPx: 40,          // the spring is at full within this
    edgeReturnAccelX: 12000,  // ...and full is more than twice the escape out
                              // of type (insideAccel), so she settles ~19 px
                              // over the line rather than 60
    edgeHardXPx: 420,         // the stop — a backstop, not the boundary
    edgeRestitution: 0.4,
    bumpEventMinSpeed: 60,    // px/s of normal impact before a bump event fires
    // ...and a much harder one fires 'flail' as well: limbs windmill and the
    // face screws up into >.< (pose/limbPose.js, pose/faceMorphs.js). The roll
    // is made ONCE here rather than per pose layer, so the face and the limbs
    // can never disagree about whether it happened.
    flailMinSpeed: 620,       // px/s of NORMAL impact. maxSpeed is 1400, so
                              // this needs a real whack, not a graze
    flailChance: 0.55         // ..."occasionally", even then
  },

  behavior: {
    // idle float: the body follows a slowly evolving ORBITAL path (circular
    // trails with wandering radius and angular speed, plus a small epicycle),
    // tracked by a near-critically-damped controller. round and airy: the
    // character of the motion comes from the path, never from random forces
    hover: {
      orbitRadiusPx: 55,
      // ── AND IT SHRINKS TO WHAT THE SEAT HAS ────────────────────────────
      // The orbit is the reason a roomy seat is asked for at all: at 55 px
      // around a 75 px body, an anchor needs 130 px of clearance before the
      // whole lap is off the words. On a sheet where the column IS the window
      // — parked at the terminal, 1056 of 1400 px is transcript — no seat has
      // that, so she takes the roomiest one going (86 px in the margin, which
      // clears her body) and the orbit alone carries her back over the type.
      // Measured there: 5.1% of resting time on the transcript, all of it
      // orbit.
      //
      // So the lap is sized to the seat, which is what an animal on a crowded
      // desk does — it curls up smaller. Where there is room nothing changes;
      // where there is not, she tucks in. The floor keeps her alive rather
      // than parked: at 14 px the epicycle and the radius noise are still
      // visibly working.
      orbitMinPx: 14,
      radiusVar: 0.5,           // slow noise on the radius
      omegaRad: 0.55,           // rad/s around the orbit (~11s laps)
      omegaVar: 0.55,           // slow noise on the angular speed
      epicycle: 0.35,           // secondary circle for figure-8 variety
      dirFlipMeanS: 13,         // occasionally circles the other way
      posGain: 4.2,             // px/s^2 per px of error
      velDamp: 3.4              // near-critical: follows the path smoothly
    },
    // WHERE SHE RE-ENTERS after a page swap. Far enough out to be genuinely
    // offscreen at any sensible viewport, close enough that she is not gone for
    // a second and a half first.
    exitCapS: 1.1,            // the longest she may spend FINISHING an exit
                              // after the sheet has already changed. She is
                              // airborne at 0.66 s and clears ~700 px at about
                              // 1.22 s, which is ~0.42 s past the 0.800 s swap;
                              // this is roughly double that, so it is a
                              // backstop for a flight that never clears rather
                              // than the usual path
    entryOffsetPx: 170,
    entrySpeed: 620,          // and this is the speed she comes in at
    entryDelayS: 0.45,        // ...after waiting this long out of frame. She
                              // used to ride in on the same frame the swap
                              // happened, which is before the paper has even
                              // finished closing; an entrance needs somewhere
                              // to arrive into, so the sheet settles first.
                              // IT WAS 2.0, AND THAT IS A BUDGET, NOT A BEAT.
                              // The requirement is that she is back in frame
                              // within two seconds of the new page, and two
                              // seconds of standing still off-screen spent the
                              // whole of it before the entrance had started.
                              // 0.45 is still a beat -- long enough that the
                              // paper is closed and the sheet is settled -- and
                              // it puts her first visible pixel at about 0.55 s

    // ── SHE PUSHES HARDER THE LONGER IT IS TAKING ──────────────────────
    // There is no stuck DETECTOR any more. A detector has to decide from the
    // outside that something has gone wrong, and it can be wrong both ways: it
    // fires on a slow arrival and misses a slow grind that never quite crosses
    // its threshold. Whatever it does next is also a mode, so there is a seam
    // in the motion at each end of it.
    //
    // A force that grows with time has no threshold, no mode and no seam. The
    // clock starts when the destination is ASSIGNED, so it is a statement about
    // the trip rather than about any instant of it, and nothing on this page
    // pushes back with a force that GROWS — so nothing can hold her.
    //
    // Free when it is not needed: steerArrive asks for a SPEED, so the force is
    // proportional to how far she is from having it. In open air the error is
    // zero and a ceiling three times higher changes nothing. It only ever shows
    // up against something resisting her.
    //
    // maxMul has to clear the escape she is pushing against. That is
    // steerMaxForce (2600) x leanThrust.maxMul (1.7) x THIS, against
    // physics.insideAccel (5600) — doubled where two overlapping blocks push
    // the same way. 3.2 gives 14,100 against a worst case of 11,200.
    push: {
      delayS: 3.0,            // grace. Nothing changes at all for this long
      rampS: 3.5,             // ...then it climbs, squared, over this
      maxMul: 3.2             // ...to this many times its normal peak
    },
    cruiseGiveUpS: 14,        // a trip that has not landed by now is not a
                              // force problem, it is a PLACE problem: abandon
                              // it and want something else
    blockedForS: 9,           // and she remembers the spot for this long
    blockedRadiusPx: 190,     // ...and anywhere within this of it
    blockedMax: 6,            // only the last few failures are interesting
    interestMinS: 4,
    interestMaxS: 10,
    cruiseSpeed: 640,           // px/s
    arriveRadius: 180,
    steerGain: 3.0,
    steerMaxForce: 2600,
    // anime acceleration: weak thrust until the body has LEANED IN (long axis
    // agreeing with the intended direction), then an intense burst to speed.
    // leanIn is measured from the actual posed orientation each frame
    leanThrust: {
      minMul: 0.32,             // thrust while turning/leaning
      maxMul: 1.7,              // burst once fully leaned in
      leanLo: 0.6,              // dot(bodyAxis, desiredDir) ramp window
      leanHi: 0.94
    },
    startleCursorSpeed: 1200,   // px/s
    startleDistance: 250,       // px
    startleClosingSpeed: 600,   // px/s toward the character
    startleBumpSpeed: 500,
    startleImpulse: 620,
    startleDurMinS: 0.5,
    startleDurMaxS: 0.9,

    // THE PANIC — the press opening is not the cursor, and she does not treat
    // it like the cursor. Timings are the take: look, decide, go.
    panicGlanceS: 0.50,       // square on to the viewport, HELD. Twice this beat
                              // has failed to read: once for being a fifth of a
                              // second, once for being aimed at a place a few
                              // hundred pixels away, which at a six-unit look
                              // plane is a two-degree turn nobody can see
    panicBrake: 14,           // and she is braked to a stop for the whole of
                              // beat one. A head turning on a drifting body is
                              // a glance; on a stopped body it is a double-take
    panicTurnS: 0.16,         // then whips onto the escape line. Faster than
                              // the glance: turning away slowly is reluctance,
                              // and this is fright
    panicDurS: 1.9,           // and she is gone for this long, which has to
                              // outlast the crossing that scared her
    panicImpulse: 1250,       // the kick on beat three...
    panicThrust: 2600,        // ...and she keeps ACCELERATING out, so she is
                              // still gaining when she leaves the frame. A
                              // bolt that coasts looks like a glide
    // (the limbs get their own event, 'panic' — see limbs.panic* below)
    agitationTau: 2.5,          // seconds, exp decay
    pokeImpulse: 760,
    margin: 90,                 // interest points keep this far from edges
    // seek: come find the cursor when it's far, or come back when offscreen
    seekTriggerFactor: 0.55,    // of max(viewport w, h): "about half a page"
    seekStopPx: 200,            // settle distance (hysteresis vs the trigger)
    seekSpeed: 950,             // px/s, eager once it has leaned in
    seekPatienceS: 1.2,         // ...and then she loses patience. Below this
                                // nothing changes, so a short hop is unaffected
    seekRampS: 2.6,             // over which she winds up to...
    seekSpeedMax: 1380,         // ...a flat sprint, just under the body's own
                                // ceiling (physics.maxSpeed 1400). Asking for
                                // more than the cap is not a faster mew, it is
                                // a number that gets quietly clamped, and then
                                // this knob would stop meaning anything
    seekHoverAbovePx: 90,       // aim above the cursor, not on top of it
    offscreenReturnS: 4,        // seconds lost offscreen before swimming back
    offscreenSidePx: 340,       // ...and this far past a SIDE is offscreen too.
                                // The sideways leash makes this nearly
                                // unreachable outside a startle; it is the
                                // backstop for a throw that beat it

    // ── CHOOSING SOMEWHERE TO GO ─────────────────────────────────────────
    // The failure mode this exists to prevent: everything else on the page
    // pushes her away from type, the page is mostly type, so the emptiest
    // places are the margins — and the naive sampler sends her to one every
    // time until she is just patrolling the border. Openness is therefore one
    // term among several, and being near an edge is explicitly a cost.
    interest: {
      maxCost: 4.5,             // will consider a spot between paragraphs
      idealTripPx: 480,         // a trip worth taking
      tripWeight: 1.0,
      costWeight: 55,           // prefer open, but only mildly
      edgeComfortPx: 210,       // inside this of any viewport edge starts to hurt
      edgeWeight: 2.4,          // ...and this is what keeps her off the rim
      centreWeight: 0.22,       // stay near what the reader is looking at
      jitter: 140,              // never the same route twice
      blockedWeight: 900        // ...and heavily against anywhere she has just
                                // failed to reach. Weighted, not vetoed: if the
                                // only open space left is near a spot she gave
                                // up on, going back beats standing still
    },
    // ── SHE MOVES OUT OF YOUR LIGHT ────────────────────────────────────────
    // Nothing stops her landing on a paragraph, and nothing should: being told
    // where she may not go is what made the old collision version read as
    // furniture. She is allowed to drift onto the words, notice, and move —
    // which is what an animal on a desk does, and it is legible in a way a
    // force field never is.
    //
    // Half a second is the number in the request and it is a good one: under
    // it the move reads as a twitch, over it she looks like she is settling in.
    // The glance is the cute half — she looks at what she was sitting on as she
    // slides off it — and it outlasts the move slightly so it does not snap
    // away the instant she arrives.
    aside: {
      noticeS: 0.5,             // ...on the words before she does anything
      glanceS: 0.9,             // and how long she keeps looking at them
      roomFactor: 1.0,          // x hover.orbitRadiusPx: the ORBIT has to clear
                                // the type, not just the anchor. She is 75 px
                                // across and the orbit is 55 px wide, so a seat
                                // needs 130 px of room or she swings back over
                                // the line every lap.
                                //
                                // AND IT HAS TO BEAT `isOpen`, WHICH IS NOT
                                // OBVIOUS. A cell counts as open at
                                // radius x 0.5 + padPx + nearCells x cellPx =
                                // 117 px of clearance (path.insideCost's ring),
                                // so anything under 0.77 here asks for LESS
                                // room than nearestOpenPoint already gave and
                                // the whole change is a no-op. Measured, not
                                // picked: 0.6 was the first value tried and the
                                // paired test caught it.
      giveUpForS: 6             // found nowhere better: stop asking for a while
                                // rather than searching the grid every frame
    },

    // grab & fling: press on mew and drag to carry it, release to throw.
    // a press without movement is still a pet (hyper beam)
    fling: {
      grabThresholdPx: 9,       // movement before a press becomes a drag
      holdGain: 160,            // px/s^2 per px toward the hand (snappy, lags a touch)
      holdDamp: 22,
      flingGain: 1.15,          // release velocity = pointer velocity * this
      flingMaxPx: 1700,         // px/s cap
      settleSpeedPx: 260,       // below this the throw is over -> hover
      loopChance: 0.35          // fast throws may end in a loop-de-loop
    },
    // loop-de-loop: a quick flown circle following the existing velocity,
    // triggered by fast arrivals/sudden stops. it accelerates INTO the loop
    // (speedMul) and sizes the circle from the entry speed, so faster
    // approaches make crisper, bigger loops. duration = 2*pi*r/speed
    flourish: {
      minSpeed: 380,            // threshold velocity to celebrate
      chanceOnArrive: 0.7,      // on fast seek/cruise arrivals
      cruiseChancePerS: 0.02,   // rare spontaneous loops mid-cruise
      speedMul: 1.12,           // accelerate into the loop
      speed: 640,               // floor for the loop speed
      radiusPx: 125,            // base radius; grows with entry speed
      maxRadiusPx: 185,
      steerCap: 5200            // centripetal force needs way more than cruise
    }
  },

  // hyper beam: click mew (petting) -> 1.5s charge staring at the cursor ->
  // beam from the mouth, stationary in document space, disintegrates elements
  attack: {
    chargeS: 1.5,
    expandS: 0.12,              // point -> full width
    sustainS: 0.95,
    fadeS: 0.4,
    widthPx: 82,                // full beam width, about the head size
    recoil: 430,                // impulse opposite the beam
    cooldownS: 1.2,             // after firing before another pet registers
    mouthOffset: [0, 0.224, 0.50], // model units from the head bone origin in
                                  // the head's REST char frame (mouth height,
                                  // face front); rotated by the head's live
                                  // rotation delta so the glow rides it exactly.
                                  // MEASURED off the built glb, not guessed: the
                                  // head bone sits at the neck top (y 0.651) and
                                  // the muzzle's furthest-forward point is
                                  // z 0.468 at y 0.875 (it falls back to 0.434 by
                                  // y 0.92), so this is the tip itself plus a
                                  // hair of standoff. Under the painted eyes
                                  // (y 0.96 / 1.03), above the chin.
    // HOW FAR IN FRONT OF THE MOUTH THE BEAM ACTUALLY STARTS, as a fraction of
    // the character's on-screen height. The mouth anchor is a 3d point and the
    // beam is a 2d document-space shape; they only line up when mew is side-on,
    // and head-on the muzzle projects into the middle of the silhouette, which
    // is what was firing the beam's round root from inside mew's face. The head
    // is about 0.45 model units of radius on a 1.75-unit model = 0.26 of the
    // height, so this clears it from every angle with a little to spare.
    muzzleClearFactor: 0.32,
    gazeHoldAfterS: 0.5,        // stare down the beam this long after it ends
    chargeRockDeg: 9,           // head/body rock backwards during charge
    fireJerkRad: 3.6,           // head snap toward the beam at the shot (rad/s kick)
    // anime brace: the body snaps lengthwise onto the beam axis (head toward
    // the beam, tail streaming behind), STARTING in the last beat of the
    // charge so the pose is set when the beam erupts. the belly direction is
    // a deterministic function of the beam direction (muscled, no roll
    // wander): horizontal beam -> belly down (side profile), beam up ->
    // belly to camera, beam down -> belly away
    braceStartS: 0.1,           // TUNE ME: seconds into the charge the brace begins
    braceRampS: 0.4,            // TUNE ME: how long the fold onto the axis takes
    braceDipRad: 0.24,          // head-first initiation: forward head dip that also
                                // forces downward braces to fold through the FRONT
                                // (fixes the wrong-way 180 spin on downward beams)
    fireAlignOmegaMul: 2.4,     // muscle: orientation spring boost through the brace
    edgeDamagePx: 26,           // scorch/nibble zone beyond the beam proper
    destroyFractionDrop: 0.5    // removed-area fraction that kills a collider
  },

  // pathfinding grid (document space)
  path: {
    cellPx: 36,
    padPx: 8,                   // extra inflation beyond the body radius
    replanMinS: 0.25,           // never replan faster than this
    replanMaxS: 1.5,            // always refresh a route older than this
    targetMoveReplanPx: 150,    // replan when the target strays this far
    reachedPx: 46,              // ...and a waypoint she is this close to is
                                // BEHIND her. The cursor used to advance only
                                // by line of sight, which does not exist inside
                                // type — so a route that crossed a block froze
                                // on its last cheap node and she stood on it.
                                // A little over one cell (36), so she never
                                // stalls between two adjacent nodes.

    // ── TEXT IS EXPENSIVE, NOT IMPASSABLE ────────────────────────────────
    // The grid used to be a wall map: a cell was blocked or it was not, and A*
    // would take ANY detour, however absurd, over crossing one. On a page that
    // is mostly type that means the only routes are around the outside — which
    // is exactly the edge-crawling this is meant to avoid.
    //
    // It is a COST field instead. Crossing a paragraph is dear enough that she
    // goes round it whenever round is remotely reasonable, and possible when
    // the alternative is a trip along the margin.
    // AND THIS IS A PLACEMENT PRICE NOW. Soft rects — every block of type on
    // the page — reach `cost` and never `travel`, so these numbers say where
    // she may STOP and say nothing at all about how she gets anywhere. Routes
    // are planned against hard rects alone, of which there are none.
    insideCost: 12,             // a cell inside a rect
    nearCost: 3,                // ...and the graded ring around it
    nearCells: 2,               // how many cells wide that ring is
    losMaxCost: 2.2,            // a straight line may only be shortened through
                                // cells at least this cheap
    openMaxCost: 1.5,           // what counts as open space for a destination

    // ── AND A GAP SHE CANNOT FIT THROUGH IS PRICED LIKE NO GAP ───────────
    // The cost above prices what a cell CONTAINS. It said nothing about how
    // much ROOM a cell has, so a 40 px crack beside a paragraph cost 1 and A*
    // threaded it as a shortcut the body could not fly. The grid measures
    // clearance now and charges for the squeeze.
    //
    // Both ends come off the body rather than being typed in: `fit` is about
    // her half-width (radius 75), `ease` adds the reach of the avoidance field
    // she has to fly against (physics.avoidRangePx, 110) — the width at which
    // nothing is touching her at all.
    //
    // `tightCost` matching `insideCost` is the whole rule in one number. A gap
    // too narrow to use is worth exactly what no gap is worth, so where a
    // roomier one exists nearby A* takes it, and where none does every route
    // costs the same per cell — the shortest wins, and the shortest is straight
    // through. No threshold, no "half a screen away" test; the search does the
    // comparison itself, at every scale.
    tightFitFactor: 1.05,       // x body radius: at or under this she does not fit
    tightEasePx: 110,           // ...and this much more is a gap she can fly
    tightCost: 12,              // the charge at `fit` — the same as being in type

    // ── THE GRID STOPS WHERE THE PAGE DOES ───────────────────────────────
    // ...and it does not reach past the page either. It used to carry 500 px of
    // open space past each rim so a route could round a flush element from the
    // outside — which is exactly the wandering-off-the-sheet that has now been
    // taken away from her, and a planner that keeps proposing it would just be
    // driving her into the leash. Routes stay on the paper; the push ramp is
    // what gets her past things.
    outsideXPx: 0,
    outsideYPx: 0,

    // ── HOW FAR SHE WILL LOOK FOR A SEAT ─────────────────────────────────
    // nearestRoomyPoint rings outward from wherever she is. Unbounded, on a
    // page with no open space anywhere — a phone, a full-bleed figure — that is
    // a walk of the entire document-sized grid from a per-frame path. 520 px
    // crosses the widest column this site sets (66rem measure, ~1056 px, so
    // half of it plus a margin) which is as far as "move aside" can mean
    // without becoming "go somewhere else".
    roomSearchPx: 520
  },

  // streamlined mew flight: the LONG axis (head to tail) aligns to travel,
  // head first, belly rolled toward the camera or into the turn. see bodyPose.js
  body: {
    alignLoPx: 90,            // speed where travel alignment starts
    alignHiPx: 380,           // fully streamlined beyond this
    orientOmega: 4.0,         // rotational spring stiffness
    orientZeta: 1.0,
    intentAlign: 0.95,        // alignment target while traveling (lean-in
                              // starts from intent, before speed exists)
    alignOmega: 3.2,          // spring easing the alignment blend
    idleYawBiasDeg: 19,       // slight 3/4 stance at rest so the tail reads
    // belly-in banking: when the flight path curves hard enough, the belly
    // rolls toward the inside of the turn (this is what sells the loop)
    curveBellyLoRad: 1.4,     // rad/s of velocity-heading change where it starts
    curveBellyHiRad: 4.5,     // fully belly-in beyond this
    // free roll about the long axis: mostly side-profile to the viewer, slowly
    // wandering, and it spins to the other side on hard turns. phi = 0 means
    // belly to camera; +/-90 deg is a side profile
    roll: {
      omega: 2.3,             // roll spring stiffness (lazy, weighty)
      zeta: 0.95,
      sideAnchorDeg: 90,      // preferred resting roll (side profile)
      wanderAmp: 1.0,         // radians of slow noise around the anchor
      wanderHz: 0.06,
      flipHeadingRate: 2.2,   // rad/s of turn that can trigger a side flip
      flipMinIntervalS: 1.6,
      flipChance: 0.7         // per qualifying turn event
    },
    flightHeadPitchDeg: 40,   // head lifts off the long axis so the face leads.
                              // v4: lower than the v3.7 model's 58 -- same reason
                              // as the look limits, there is barely a neck to bend
    undulation: {
      ampDeg: 5.5,            // spine wave amplitude at full swim
      phaseStepRad: 0.85,     // wave travel head -> tail
      freqBase: 1.1,          // hz at rest
      freqPerSpeed: 1.7       // extra hz at max speed
    },
    breatheHz: 0.22,
    breatheAmp: 0.016,
    bobAmpPx: 6,
    bobHz: 0.32,
    squashAmount: 0.16,       // scale dip on a hard bump
    squashOmega: 15,
    squashZeta: 0.45
  },

  look: {
    // v4 model: the head is most of the character and it sits on a very short
    // neck, so the old 55/35 limits swung the skull far enough to visibly pull
    // the collar off the chest. these are what a neckless chibi can actually do.
    yawLimitDeg: 42,
    pitchLimitDeg: 26,
    omegaWhip: 34,            // the panic's head snaps. At the merely-curious
                              // 11.2 the spring was still travelling when the
                              // beat ended, so the pose it was aiming for never
                              // appeared on screen at all
    omegaCurious: 7,
    omegaCalm: 2.7,
    microYawDeg: 2.2,         // ever-present gaze micro-drift (kills stiffness)
    microPitchDeg: 1.5,
    microHz: 0.35,
    headRollDeg: 4,           // slow curious head tilt around the view axis
    headRollHz: 0.09,
    saccadeThresholdDeg: 8,
    saccadeMinMs: 80,
    saccadeMaxMs: 200,
    predictS: 0.12,           // lead the cursor by its velocity * this
    neckShare: 0.3,
    idleAfterS: 3,            // cursor still -> curiosity wander
    curiosityHz: 0.07,
    curiosityAmpDeg: 30
  },

  // expression morph targets baked into the model (blink / squint / smile).
  // the eyes are painted into the texture, so an "expression" is the face
  // geometry squashing the painted eye -- no extra draw calls, no eye meshes.
  // see engine/pose/faceMorphs.js. every knob below is dormant on the v4 model
  // (read on), and kept so re-enabling is a one-line change.
  face: {
    // BACK ON for v4. the eyes are painted, so a blink is the face geometry
    // squashing the painted eye -- tools/facemorph.py builds the targets, and it
    // finds the eyes by reading the eye-ink mask the retexture pass produced,
    // so repainting them and rebuilding moves the blink with them.
    // the face patch is subdivided first (tools/retexture.py) precisely so the
    // morph has rows of vertices to compress; the raw meshy head had about four.
    enabled: true,
    blinkMinS: 2.4,           // random gap between blinks
    blinkMaxS: 7.0,
    blinkDurS: 0.17,          // one blink, close is faster than the open
    blinkAmount: 1.15,        // >1 squeezes past the modelled shut point.
                              // 1.0 is a clean line; 1.15 presses the lids
                              // together, which reads better at 150px
    doubleBlinkChance: 0.22,
    squintBase: 0.10,         // resting pleasantness
    squintPerSpeed: 0.42,     // eyes narrow as it picks up speed
    // NO SMILE TARGET on this model: mew has no painted mouth to curve, so
    // there is nothing for it to act on. faceMorphs skips a missing target, and
    // these two are left here so re-adding one is a builder change only.
    smileBase: 0.16,
    smilePerSpeed: 0.34,
    moodRate: 2.2,            // 1/s, how fast mood catches up

    // THE >.< FACE, on a hard collision (physics.flailMinSpeed / flailChance
    // decide when). It is a flat OVERLAY drawn over the eyes, not a morph
    // target -- see engine/fx/faceOverlay.js. A >.< is a symbol, the same
    // vocabulary as the sweat drop and the anger cross, and a morph has to bend
    // real geometry into the shape of a glyph. The first version did exactly
    // that and still only ever read as "eyes shut at an angle".
    // WHERE the eyes are comes out of the glb, measured off the same ink mask
    // the blink is built from, so repainting them moves this too.
    overlay: {
      inkColor: "#123049",    // the eyes' own darkest ink, so the glyph belongs
      thickness: 0.19,        // stroke half-width, in eye half-heights
      padX: 1.46,             // how far the patch oversizes the eye it hides.
      padY: 1.52,             // GENEROUS: the ink mask the eye box comes from
                              // stops at the iris, and the painted lashes run
                              // well past it -- too small a patch leaves a navy
                              // fringe poking out around the glyph
      patchDim: 0.94,         // the patch is the LIT skin band, and the face is
                              // rarely dead-on, so nudge it down between the
                              // top two bands to disappear into either
      liftZ: 0.02,            // standoff ALONG THE EYE'S OWN NORMAL. small on
                              // purpose: depth testing is off, so this buys
                              // nothing except parallax, and parallax between
                              // the quad and the face is exactly what used to
                              // let the painted eye slide out from behind it
      closeAt: 0.5,           // the blink underneath is fully shut by the time
      closeAmount: 1.15,      // the glyph is this far on. Belt and braces: the
                              // morph that closes these eyes onto a line already
                              // exists, so the overlay uses it and there is no
                              // open eye left to leak. 1.15 presses the lids
                              // together, same as an ordinary blink
      durS: 1.5,              // the same length as the flail
      attack: 0.05,           // drawn on fast, tip first
      release: 0.14,          // ...and whipped off at the end: the eyes OPEN
      fullSpeed: 1100,        // impact px/s that draws it at full strength
      // it ignores depth so it can sit on the face, which means nothing stops
      // it sitting on the back of the skull either. fade it by how squarely the
      // head faces the camera.
      facingLo: 0.05,
      facingHi: 0.45,
      // and per eye, by the facet it is painted on: mew's eyes sit on the SIDES
      // of a ball-shaped head (about 31 degrees outward), so on a turned head
      // one of them is round the side where the muzzle would hide it. These
      // quads ignore depth and would sit on top of the muzzle instead.
      quadFacingLo: -0.05,
      quadFacingHi: 0.35
    }
  },

  ears: {
    omega: 14,
    zeta: 0.35,               // underdamped: ears wobble a touch
    followGain: 0.09,         // reaction to head angular velocity
    twitchMeanS: 4,
    // v4: the ear weight is a FIELD that is zero at the skull and only reaches
    // 1 near the tip (tools/mewparts.py), so a given angle moves less ear than
    // it did on the v3.7 model -- hence the bigger numbers. this is the whole
    // point: turning the amplitude up can never contort the head, because the
    // head simply is not weighted to the ear joints.
    twitchAmpDeg: 15,
    startleFlattenDeg: 34
  },

  limbs: {
    blendLoPx: 120,           // speed where cruise pose starts blending in
    blendHiPx: 420,
    blendOmega: 3,
    noiseAmpDeg: 4,
    noiseHz: 0.2,

    // --- follow-through ---------------------------------------------------
    // body.accel is the RAW physics acceleration: it steps by thousands of
    // px/s^2 the frame a collider is hit. this used to go straight into the
    // pose through followGain * footFollowMul, up to 66 degrees of foot swing
    // in one frame -- the "feet snap at weird angles" report. now it is
    // clamped and then low-passed, so an impact swings the limbs instead of
    // teleporting them.
    followGain: 0.00055,      // rad per px/s^2 of body accel
    followClamp: 0.34,        // rad, on the raw value before smoothing
    followRate: 11,           // 1/s low pass. lower = laggier, floatier limbs
    footFollowMul: 1.7,       // feet trail hardest (loose ankles)
    armFollowMul: 1.0,
    footNoiseMul: 1.6,        // extra wobble on the feet
    armNoiseMul: 1.5,
    // THE FLAIL, on a hard collision. colliders.js makes the call once and
    // emits 'flail', so the limbs and the face (>.< , see face.wince*) can never
    // disagree about whether it happened. Same duration as the wince so they
    // finish together.
    flailDeg: 42,             // peak extra swing per limb
    flailArmMul: 0.85,
    flailFootMul: 1.15,       // feet are longer and looser, so they swing wider
    flailZMul: 0.7,           // the second axis, a quarter cycle off the first,
                              // so a limb circles instead of flapping flat
    flailHz: 7.2,             // windmill rate at the start. fast enough to read
                              // as panic, slow enough to survive a 30 fps frame
    flailHzEnd: 3.4,          // ...and by the end. A CONSTANT rate reads as a
                              // machine; every hand-drawn flail starts frantic
                              // and winds down, and that decay is most of what
                              // sells it as an animal rather than an effect
    flailPhaseStep: 1.9,      // rad between limbs -- never in lockstep
    flailDurS: 1.5,           // a proper tantrum, not a twitch. the >.< overlay
                              // and the annoyance stars are pinned to the same
                              // number (face.overlay.durS, and the star waves)
                              // so the three finish together
    flailAttack: 0.05,        // hard in, slow out: it is a reaction
    // THE FRIGHTENED FLAIL, which is not the annoyed one (engine/pose/limbPose).
    // The bump's is a tantrum: wide, loose, 7 Hz winding down to 3.4 over a
    // second and a half while she tells the wall about it. This is terror —
    // SMALLER, TIGHTER and much faster, and it does not wind down, because she
    // is not getting over it, she is leaving. It holds flat for as long as she
    // is running and drops only at the very end.
    // ...AND IT IS A TREMOR NOW, NOT A WINDMILL. 27 degrees at 13.5 Hz on all
    // four limbs, with 1.15x on the feet and held flat for 78% of the burst,
    // is two oscillators above 13 Hz on a foot -- which reads as vibration,
    // not as fright, and was the whole of "the feet effectively vibrate".
    // She flies out now: limbPose pins the streamlined cruise pose for the
    // length of a panic (arms swept back, legs extended), and what is left
    // here is a small fast shiver ON that pose rather than a gait bolted over
    // it. The fear was never in the legs -- it is the >.< face, the sweat and
    // the head whip, and all three are untouched.
    panicDeg: 7,              // a shiver, not a throw
    panicHz: 5.5,             // ...and below the rate a foot reads as buzzing
    panicHzEnd: 4.2,          // still barely slowing: she is not calming down
    panicDurS: 1.6,           // as long as the flight
    panicAttack: 0.03,        // snapped on
    panicHold: 0.78,          // held flat this far, then dropped
    flailShakePx: 5.5,        // and the whole body buzzes with it, on the same
    flailShakeHz: 19,         // envelope. screen/character shake is the other
                              // half of what makes an impact land
    flailFullSpeed: 1100,     // impact px/s for a full-amplitude flail
    flailMin: 0.5,            // ...and the least it ever flails

    flinchKick: 26,           // bump impulse -> flinch spring VELOCITY (1/s).
                              // it used to be added to the spring's position,
                              // which is a teleport, not an impulse

    // --- rhythm -----------------------------------------------------------
    footFlutterDeg: 9,        // feet kick with the swim undulation wave
    footFlutterPhase: 1.9,    // wave phase offset behind the spine
    // the ARMS scull on the same clock, slower and out of phase. they run at
    // idle as well as in flight (the feet only flutter when swimming), because
    // "they barely move at all" was the complaint and a hovering creature
    // paddles to hold station.
    armPaddleDeg: 11,
    armPaddleRatio: 0.55,     // arm cycles per spine cycle
    armPaddlePhase: 0.6,
    startleTuckDeg: 18,

    // --- pose deltas in the BODY frame, degrees [x, y, z] per role --------
    // x+ pitches the limb back/up, z+ swings it outward.
    // the arms are their own shells hinged at the armpit now, so these can be
    // real angles: while they shared vertices with the collar anything past a
    // few degrees tore the neck open.
    poses: {
      hover: {
        armL: [-16, 0, 12], armR: [-16, 0, -12],
        footL: [10, 0, 6], footR: [10, 0, -6]
      },
      // streamlined dive per the flight references: arms swept back along the
      // sides, legs extended away down the long axis, everything loose enough
      // that the noise/follow-through reads as dangling in the wind
      cruise: {
        armL: [-54, 0, -20], armR: [-54, 0, 20],
        footL: [58, 0, -7], footR: [58, 0, 7]
      }
    }
  },

  // ------------------------------------------------------------------
  // THE TAIL is an INEXTENSIBLE STRAND -- dynamic follow-the-leader over a
  // posed rest curve. see engine/pose/tailChain.js for the method and the paper.
  //
  // the previous rod read as a RATTLESNAKE and the reason was not the solver:
  // it was DRIVEN by a travelling-wave force carrying more than a full
  // wavelength on ten segments, at ten times the strength of gravity, while two
  // hard limits ran as projections 720 times a second. there is no forcing term
  // here at all. the tail's own motion is the REST CURVE swaying slowly; the
  // strand has mass and drag, so it always arrives late -- which is the whole
  // difference between flowing and vibrating.
  //
  // every number below is a MATERIAL parameter. halve substepHz and the tail
  // does not change character, only its accuracy.
  // ------------------------------------------------------------------
  tail: {
    substepHz: 240,           // follow-the-leader is unconditionally stable and
                              // O(n) with no inner iteration, so this buys
                              // accuracy only -- 240 and 480 are the same tail
    maxSubsteps: 8,           // per rendered frame, so a stalled tab cannot
                              // spend a second catching up

    // --- mass -------------------------------------------------------------
    tipMassRatio: 0.35,       // the tip particle's mass as a fraction of the
                              // base's. tails taper, so their linear density
                              // does too; this is what lets the end crack while
                              // the root stays authoritative

    // --- forces (there is no driving force: these are all passive) ---------
    gravity: 0.55,            // world units/s^2, reads as weight
    // ANISOTROPIC AIR DRAG, 1/s. a slender body feels several times more drag
    // across its axis than along it, and that ratio (here ~4.6x) is the entire
    // reason a real tail streams and flutters rather than just lagging behind.
    // it is also the ONLY damping in the solver.
    dragTangential: 1.5,
    dragNormal: 6.9,
    accelCouple: 0.0055,      // follow-through from body acceleration
    accelSmoothRate: 9,       // ...low-passed first. body.accel is RAW and jumps
                              // by thousands of px/s^2 when a collider is hit;
                              // feeding that in unfiltered is the same mistake
                              // that made the feet snap

    // --- the muscle -------------------------------------------------------
    // authored in Hz: how fast that section returns to the posed rest curve.
    // the blend is exponential, so the result is exactly timestep independent.
    poseBaseHz: 4.6,          // the root holds like muscle...
    poseTipHz: 0.55,          // ...the last third is nearly free to swing
    poseCurve: 1.7,           // >1 keeps the base stiff and lets go late
    ftlDamp: 0.86,            // DFTL velocity correction. follow-the-leader hands
                              // each parent momentum it never earned, which reads
                              // as wire; this takes it back out. 1 = limp,
                              // 0 = the artificial stiffness returns

    // --- the flight target ------------------------------------------------
    // THERE IS NO FLIGHT TARGET ANY MORE, and that is the fix for "it rattles
    // while flying". v4.2 had `flightStraighten: 0.82`, which collapsed the
    // whole target onto ONE straight trail line whenever mew was moving. A
    // straight line has no memory of the turn, so on a heading change the stiff
    // base snapped onto it while the soft tip lagged and the kink between them
    // ran down the chain. In flight the tail now simply carries its own rest
    // curl and lags it, which IS the sweep. Measured on `test/tail_probe.js
    // --fly`: worst joint angle 53.5 deg -> 23.8, tip jitter 0.058 -> 0.011 of
    // a segment, torsion 20.4 -> 7.3 deg/joint (i.e. far less twist, which is
    // the other half of the report).
    //
    // A path follower -- record the body's track, lay the tail along it, the
    // way a chinese dragon works -- was built and measured and is NOT here. See
    // the long note in engine/pose/tailChain.js for why it loses on this
    // particular character. Do not re-add it without re-running that probe.
    // --- aiming the tail behind the motion --------------------------------
    // the tail has to TRAIL mew in flight, not sit off to one side like an
    // accessory. One rigid rotation of the whole rest curve about the screen
    // normal turns its chord to point opposite the travel. Rigid is the point:
    // a rigid rotation of a smooth curve is the same smooth curve, so unlike
    // v4.2's per-segment `flightStraighten` there is no mechanism by which it
    // can grow a kink -- every segment turns by the same angle.
    aimSpeedLo: 90,           // px/s where the tail starts swinging behind
    aimSpeedHi: 460,          // ...and where it is fully committed
    aimAmount: 0.78,          // how far toward "straight behind" it goes. short
                              // of 1 on purpose: the last bit is what would drag
                              // the club through the torso on some headings, and
                              // the physics lag reads as trailing anyway
    aimMaxDeg: 150,           // never wrap further than this, either way
    aimRate: 2.6,             // 1/s. SLOW: this is the "gently circle around"
                              // rate. the tail takes about a second to come
                              // round to a new heading, which is a sweep, and
                              // anything above ~6 starts to look like a snap
    targetLagRate: 9,         // 1/s. THE TARGET LAGS, IT DOES NOT JUMP -- this
                              // is "on a change of direction it should circle
                              // round instead of snapping", stated directly.
                              // The socket sits half a tail length off the
                              // rotation centre, so a hard reversal swings the
                              // target through most of a half-circle in a
                              // couple of frames; smoothing the target's
                              // rotation makes that a sweep the strand can
                              // follow. Measured on a realistic startle-and-
                              // chase run: worst joint angle 66 deg -> 37, tip
                              // jitter 0.244 -> 0.212. A CRUISE IS UNTOUCHED
                              // (23.8 deg / 0.010 at every value) because the
                              // target turns slowly there.
                              //
                              // IT IS A LAG, NOT A RATE CAP, and the difference
                              // only shows under sustained rotation: with the
                              // flight straightening gone the target's rotation
                              // IS the body's, so CAPPING it decouples the tail
                              // outright -- a 200 deg/s cap left the tail
                              // pointing 165 deg away from the body's ask,
                              // permanently, in test/tail_turn.js. A lag settles
                              // to a fixed angle behind (62 deg at 842 deg/s of
                              // spin, which is what a trailing tail should do)
                              // and converges the instant the spin stops.
                              // LOWER IS NOT BETTER: at 6 the realistic run
                              // improves a little more but the sustained-spin
                              // offset jumps to 88 deg, and at 4 to 177.
    targetSmooth: 2,          // passes of neighbour-averaging over the target
                              // directions. zero sharp angles is a property of
                              // the TARGET, not something the solver can fix
                              // afterwards, and follow-the-leader re-imposes
                              // the lengths anyway so this is free
    braceWeight: 0.85,        // during the beam brace the character is braced on
                              // the spot, so the tail lays out along the
                              // straight line behind the beam

    // --- the idle sway (this replaced the travelling wave) ----------------
    // it poses the REST CURVE, it does not push the particles, so everything
    // visible still has to be caught up with. kept slow and long-wavelength on
    // purpose: 0.15 rad per segment is about a fifth of a wavelength across the
    // whole tail, against the 1.03 wavelengths the old wave stood on it.
    swayHz: 0.28,             // hz at rest
    swayPerSpeed: 0.55,       // extra hz at full speed
    swaySpeedFull: 520,       // px/s counted as full speed
    swayDeg: 11,              // peak bend per joint at the tip
    swayIdle: 0.72,           // fraction of that amplitude when hovering still
    swayPerAgitation: 0.6,    // ...and how much an agitated mew adds
    swayLag: 0.15,            // rad of phase per segment: the wavelength knob
    swayRamp: 1.25,           // amplitude profile base -> tip. a flat profile
                              // swings the whole tail from the socket like a
                              // windscreen wiper
    swaySwirl: 0.45,          // vertical component, a quarter phase behind the
                              // lateral one, so the tip traces a shallow ellipse

    // --- and the idle is EPISODIC, which is what makes it an animal --------
    // The sway above is a metronome: one sine, always running, identical every
    // second of every minute. That is why the tail read as "held in a curl" --
    // nothing about it was ever an EVENT. A cat at rest is mostly still and
    // then does something: a tip flick, a slow sweep, a curl, three fast beats.
    //
    // A gesture is not a keyframe and not a second oscillator. It modulates the
    // sway that is already there -- amplitude, rate, how far toward the tip it
    // is weighted, and a rigid bias angle applied the way the aim is -- for a
    // second or two, and then it is gone. Every parameter is drawn from a range
    // per gesture, so the same kind twice is never the same motion.
    //
    // NOTHING HERE TOUCHES A PARTICLE. That is the rule this whole file is
    // built on: the strand follows a posed rest curve, and a gesture poses the
    // curve. A forcing term is what made it a rattlesnake the first time.
    gestureGapMinS: 2.6,      // quiet between gestures...
    gestureGapMaxS: 6.5,      // ...drawn uniformly in this range
    gestureCalmSpeed: 0.25,   // only below this fraction of full speed...
    gestureCalmAgit: 0.35,    // ...and this calm. A frightened tail is not playing
    gestureCalmDwellS: 1.2,   // ...and it has to have BEEN calm this long. An
                              // instantaneous test fires in the lull between two
                              // hard turns, which is not a cat playing, it is a
                              // cat mid-sprint doing something odd with its
                              // tail. Measured: without the dwell, the violent
                              // probe's closest self-approach went 0.95 -> 0.69
                              // segments, entirely from gestures firing in gaps
                              // that were never really calm
    gestureFadeIn: 0.18,      // fraction of the gesture eased in (raised cosine)
    gestureFadeOut: 0.35,     // ...and out. The target must never STEP:
                              // targetLagRate and targetSmooth sit downstream
                              // and would smear a step into a whip rather than
                              // remove it
    gestures: {
      // amp:  multiplier on the sway's amplitude
      // hz:   added to its rate
      // bias: rigid extra rotation about the screen normal, degrees. Rigid is
      //       the point -- one rotation applied to every segment is still the
      //       same smooth curve, so it cannot develop a kink
      // tip:  0..1, how far the amplitude profile is squared toward the tip
      // arc:  1 = the bias traces one slow there-and-back; 0 = it is held
      // A FLICK CANNOT BE FASTER THAN THE TAIL. The tip's own muscle runs at
      // poseTipHz 0.55, a time constant of about 0.29 s, so a 0.35 s gesture is
      // over before the strand has answered a third of it -- measured, the tip
      // barely moved. A real cat's flick is faster than this; this tail is
      // deliberately slow at the tip, and that inertia is the whole design.
      flick:  { w: 3, dur: [0.55, 0.78], amp: [3.0, 3.8],  hz: [1.4, 2.0],    bias: [0, 0],   tip: 0.85, arc: 0 },
      sweep:  { w: 3, dur: [1.9, 2.6],   amp: [2.2, 2.7],  hz: [-0.12, -0.04], bias: [6, 10],  tip: 0.20, arc: 1 },
      curl:   { w: 2, dur: [1.4, 1.9],   amp: [0.45, 0.60], hz: [-0.14, -0.06], bias: [11, 16], tip: 0.35, arc: 0 },
      twitch: { w: 2, dur: [0.45, 0.60], amp: [0.80, 1.00], hz: [2.6, 3.2],    bias: [0, 0],   tip: 0.90, arc: 0 }
    },

    // --- and in flight it is an OTTER, not a banner ------------------------
    // Asked for: a tail that goes through the air the way a sea otter's goes
    // through water -- resistance, density, a slow scull rather than a streamer
    // snapping along behind her.
    //
    // Two of these are PASSIVE COEFFICIENTS blended in by swimAlign, which
    // bodyPose already computes and shares. More normal drag is literally more
    // water; a freer tip is a heavier, looser end. Neither adds a force.
    dragNormalFlight: 9.5,    // up from 6.9 at full flight: the resistance
    poseTipHzFlight: 0.35,    // down from 0.55: the last third goes freer
    // ...and the scull is a SECOND, SLOWER sine added to the same rotation the
    // sway already applies. Locked to the body's undulation, so the tail is
    // part of the same animal -- at a THIRD of its rate. The warning in this
    // file's header is about locking to swimPhase at the spine's own 1.1-2.8 Hz,
    // which is the buzz; a third of that is 0.37-0.95 Hz, below the sway's own
    // band, which is a scull.
    scullRatio: 0.34,
    scullDeg: 7,              // peak bend per joint at the tip, at full flight
    scullLag: 0.22,           // rad of phase per segment -- a longer wave than
                              // the sway's 0.15, because a scull is one push

    // --- limits (backstops, idle almost all of the time) ------------------
    maxBendBaseDeg: 42,       // hard curvature clamp per joint, applied inside
    maxBendTipDeg: 74,        // the same root-to-tip walk so it can never fight
    bendCurve: 1.3,           // the length constraint. WIDER than it was: the
                              // recorded path already bounds curvature, so this
                              // went back to being a backstop that almost never
                              // fires instead of a shaping term that clipped
                              // every turn (it was pinned at its limit, 58 deg,
                              // in every scenario)
    selfSepMul: 0.85,         // non-adjacent particles stay this far apart, as a
                              // multiple of the mean segment length

    // --- output -----------------------------------------------------------
    quatDampRate: 30          // final smoothing on the bone quats. the strand is
                              // already smooth, so this only kills single-frame
                              // sparkle
  }
};
