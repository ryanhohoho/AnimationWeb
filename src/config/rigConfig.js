// rigConfig.js
// single source of truth for bone names and every tuning constant.
// swapping in a future model should only ever require edits to this file.

export const rigConfig = {
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
    armL: "armL",
    handL: "handL",
    armR: "armR",
    handR: "handR",
    footL: "footL",
    footR: "footR",
    tail: ["tail001", "tail002", "tail003", "tail004", "tail005", "tail006", "tail007"]
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
      pixelSize: 3,           // screen px per texel (bigger = chunkier)
      colorLevels: 6,         // posterization steps (sprite shade bands)
      bandLuma: true,         // band BRIGHTNESS and keep the hue. false bands
                              // r/g/b separately, which is the classic look but
                              // rounds the channels apart and neutralizes the
                              // pink in the shadow bands
      shadeLift: 0.18,        // 0..1 pulls the shadow bands up toward the light
                              // side: higher = flatter, more sticker-like
      outline: true,
      outlineColor: "#2a1f33",// dark plum silhouette line, like the references
      snapToGrid: true        // quantize the RENDER position to the texel grid
                              // (physics untouched; classic sprite crawl)
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
    ambientIntensity: 1.9,    // the flatness dial -- raise to flatten further
    keyColor: "#fff6fb",
    keyIntensity: 1.5,        // form dial -- raise for more shaping/contrast
    keyOffset: [-0.22, 0.3, 1], // key direction in VIEW space (x right, y up,
                              // z toward the viewer). near-pure z is dead flat;
                              // the small up-left tilt keeps a little volume
    followCharacter: true      // aim the key from the camera at mew each frame
  },

  sizing: {
    characterHeightPx: 150,   // on-screen height of the model
    radiusFactor: 0.44,       // physics circle radius = height * this
    pivotFactor: 0.45,        // pivot sits this far up the model height (body center)
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
    mouthOffset: [0, 0.111, 0.451], // model units from the head bone origin in
                                  // the head's REST char frame (mouth height,
                                  // face front); rotated by the head's live
                                  // rotation delta so the glow rides it exactly.
                                  // measured off the v4 mesh's snout tip -- the
                                  // head bone sits at the NECK TOP (so the head
                                  // swivels on the neck), and the muzzle now
                                  // juts further forward, hence the bigger z
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
    flightHeadPitchDeg: 58,   // head lifts off the long axis so the face leads
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
    yawLimitDeg: 55,
    pitchLimitDeg: 35,
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
  // see engine/pose/faceMorphs.js. rebuild the model with tools/build_mew.py
  // after editing src/assets/mew_face.png to restyle the eyes.
  face: {
    enabled: true,
    blinkMinS: 2.4,           // random gap between blinks
    blinkMaxS: 7.0,
    blinkDurS: 0.17,          // one blink, close is faster than the open
    blinkAmount: 1.15,        // >1 squeezes past the modelled shut point
    doubleBlinkChance: 0.22,
    squintBase: 0.10,         // resting pleasantness
    squintPerSpeed: 0.42,     // eyes narrow as it picks up speed
    smileBase: 0.16,
    smilePerSpeed: 0.34,
    moodRate: 2.2             // 1/s, how fast mood catches up
  },

  ears: {
    omega: 14,
    zeta: 0.35,               // underdamped: ears wobble a touch
    followGain: 0.09,         // reaction to head angular velocity
    twitchMeanS: 4,
    twitchAmpDeg: 10,
    startleFlattenDeg: 38
  },

  limbs: {
    blendLoPx: 120,           // speed where cruise pose starts blending in
    blendHiPx: 420,
    blendOmega: 3,
    noiseAmpDeg: 4,
    noiseHz: 0.2,
    followGain: 0.00055,      // rad per px/s^2 of body accel
    handFollowMul: 1.7,
    footFollowMul: 2.3,       // feet trail the hardest (loose ankles)
    footNoiseMul: 1.9,        // extra wobble on the feet
    footFlutterDeg: 9,        // feet kick with the swim undulation wave
    footFlutterPhase: 1.9,    // wave phase offset behind the spine
    startleTuckDeg: 18,
    // pose deltas in the BODY frame, degrees [x, y, z] per role.
    // x+ pitches the limb back/up, z+ swings it outward
    poses: {
      hover: {
        armL: [-18, 0, 8], armR: [-18, 0, -8],
        handL: [-12, 0, 4], handR: [-12, 0, -4],
        footL: [12, 0, 6], footR: [12, 0, -6]
      },
      // streamlined dive per the flight references: arms swept back along the
      // sides, legs extended away down the long axis, everything loose enough
      // that the noise/follow-through reads as dangling in the wind
      cruise: {
        armL: [-74, 0, -22], armR: [-74, 0, 22],
        handL: [-30, 0, -10], handR: [-30, 0, 10],
        footL: [78, 0, -8], footR: [78, 0, 8]
      }
    }
  },

  tail: {
    substepHz: 120,
    // stiffness is spring accel per unit displacement: omega = sqrt(k).
    // base ~19 rad/s holds the s-curve like muscle; tip ~5.5 stays whippy.
    // drag sets damping ratio zeta = drag / (2 * omega): ~0.23 at the base
    // (lively), ~0.8 at the tip (flows, never rattles)
    drag: 9,
    gravity: 0.45,            // world units/s^2, reads as weight
    stiffBase: 380,           // shape-memory spring at the base (muscle)
    stiffTip: 30,             // much looser at the tip
    stiffCurve: 1.25,         // exponent shaping base->tip falloff
    waveFreq: 1.5,            // hz of the idle traveling wave
    wavePhaseStep: 0.95,      // rad per segment: this is what makes it "flow"
    waveAmp: 4.5,             // world units/s^2 force amplitude
    waveSpeedFade: 420,       // px/s where idle wave fully fades out
    accelCouple: 0.0035,      // follow-through from body acceleration
    // SPIRAL, DON'T FOLD. the wave is circularly polarised: a second force
    // component on the binormal, a quarter cycle out of phase, makes the
    // bending plane rotate down the chain so the tail coils instead of
    // buckling flat. 0 = the old planar s-wave (which folded), 1 = fully
    // circular. see engine/pose/tailChain.js
    waveSwirl: 0.85,
    unfoldStart: 0.16,        // bend (1 - dot) where the anti-fold kicks in
    unfoldSwirl: 34,          // lateral push per unit of excess bend
    selfSepMul: 0.82,         // non-adjacent particles stay this far apart,
                              // as a multiple of the mean rest segment
    // neighbour bend allowed ON TOP OF THE REST BEND. this used to be an
    // absolute limit (angleLimitDeg: 38), which meant any tail whose rest curve
    // bends further than that -- this one hooks 79 deg at the club -- sat
    // permanently in violation, so the constraint fought the shape-memory
    // spring every substep and the tail never came to rest.
    angleSlackDeg: 16,
    angleSoftness: 0.55,      // fraction of the excess corrected per iteration
    // BASE RIGIDITY. the first segment is held inside a cone around the
    // body-carried rest direction so a fast turn can't fling the tail root
    // ~180 deg onto its own length (the flops/folds-when-turning-fast bug). the
    // shape-memory spring is only a suggestion and a hard turn outruns it; this
    // cone is a limit the turn can't outrun, so the tail DRAGS behind a turn
    // instead of flipping. lower = more rigid root, higher = looser.
    // MUSCLE CONE (replaces the old base-only cone). every segment is held
    // inside a cone around the direction the shape-memory target wants it to
    // point, widening base -> tip. the old rootAngleLimitDeg only constrained
    // segment 0; the neighbour limit below is relative to the PARENT segment,
    // so lag compounded down the chain (42 + 6x38 = ~270 deg of legal freedom)
    // and the middle of the tail could point backwards while every
    // neighbour-to-neighbour reading looked perfectly healthy. measuring each
    // segment against a body-carried reference bounds the total directly.
    coneBaseDeg: 24,          // how far segment 0 may stray from the muscle line
    coneTipDeg: 58,           // and the last segment -- loose enough to whip
    coneCurve: 1.5,           // >1 keeps the base tight and opens up late
    coneSoftness: 0.5,        // fraction of the excess corrected per iteration
    constraintIters: 5,       // lengths + angles + separation, all per pass
    quatDampRate: 34,         // final smoothing on bone quats, kills jitter
    // in streamlined flight the shape-memory target morphs from the resting
    // s-curl to a straight line trailing the motion, so the tail streams
    // behind and the traveling wave swirls it aerodynamically
    flightStraighten: 0.85,   // how fully the curl opens at max alignment
    flightStiffnessMul: 0.55  // looser shape memory in flight = more swirl
  }
};
