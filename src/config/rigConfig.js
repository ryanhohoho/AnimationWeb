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
    // engine/fx/shinySparkle.js for the sources and the shape maths.
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
      zOffset: 0.0
    }
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
  //   "pixelate" retro sprite: low-res + posterized + dark outline
  //   "cutout"   mew is a hole in the page onto a stationary picture
  //   "none"     raw 3d
  // ------------------------------------------------------------------
  presentation: {
    mode: "pixelate",       // <-- TOGGLE HERE

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
      // still being proportionally as warm as the core. across every mip level
      // of the atlas: blush 4.70, half-blush 0.6..1.2, eye whites 0.04, iris
      // 0.00, plain skin -1.00 (already recoloured by then). this window leaves
      // ZERO warm texels anywhere on the shiny.
      warmLo: 0.22,
      warmHi: 0.48,
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
    characterHeightPx: 150,   // on-screen height of the model
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
    edgeInset: 20,            // px in from viewport edges
    edgeRestitution: 0.4,
    bumpEventMinSpeed: 60     // px/s of normal impact before a bump event fires
  },

  behavior: {
    // idle float: the body follows a slowly evolving ORBITAL path (circular
    // trails with wandering radius and angular speed, plus a small epicycle),
    // tracked by a near-critically-damped controller. round and airy: the
    // character of the motion comes from the path, never from random forces
    hover: {
      orbitRadiusPx: 55,
      radiusVar: 0.5,           // slow noise on the radius
      omegaRad: 0.55,           // rad/s around the orbit (~11s laps)
      omegaVar: 0.55,           // slow noise on the angular speed
      epicycle: 0.35,           // secondary circle for figure-8 variety
      dirFlipMeanS: 13,         // occasionally circles the other way
      posGain: 4.2,             // px/s^2 per px of error
      velDamp: 3.4              // near-critical: follows the path smoothly
    },
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
    agitationTau: 2.5,          // seconds, exp decay
    pokeImpulse: 760,
    margin: 90,                 // interest points keep this far from edges
    // seek: come find the cursor when it's far, or come back when offscreen
    seekTriggerFactor: 0.55,    // of max(viewport w, h): "about half a page"
    seekStopPx: 200,            // settle distance (hysteresis vs the trigger)
    seekSpeed: 950,             // px/s, eager once it has leaned in
    seekHoverAbovePx: 90,       // aim above the cursor, not on top of it
    offscreenReturnS: 4,        // seconds lost offscreen before swimming back
    avoidDistPx: 80,            // whisker range beyond the body radius
    avoidGain: 850,             // whisker repulsion force
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
    mouthOffset: [0, 0.25, 0.47], // model units from the head bone origin in
                                  // the head's REST char frame (mouth height,
                                  // face front); rotated by the head's live
                                  // rotation delta so the glow rides it exactly.
                                  // re-measured on the meshy head: the head bone
                                  // sits at the NECK TOP (y 0.651) and the muzzle
                                  // front is at z 0.468, y ~0.90 -- just under
                                  // the painted eyes, above the chin
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
    targetMoveReplanPx: 150     // replan when the target strays this far
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
    moodRate: 2.2             // 1/s, how fast mood catches up
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
