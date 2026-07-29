// tailChain.js
// the tail as an INEXTENSIBLE STRAND: dynamic follow-the-leader over a posed
// rest curve.
//
// the tail is its own closed shell in the model (tools/tailbuild.py grows it out
// of the butt, on the midline) and nothing else is weighted to its joints, so
// this file owns its motion outright.
//
// WHY THIS AND NOT THE XPBD ROD IT REPLACES
// -----------------------------------------
// the rod solved fine and still read as a RATTLESNAKE, for two reasons that had
// nothing to do with the integrator:
//
//   1. IT WAS DRIVEN, NOT FOLLOWING. a travelling-wave force pushed every
//      particle at 1.5 Hz with a phase step of 0.72 rad per segment. across ten
//      segments that is 6.5 rad -- MORE THAN A FULL WAVELENGTH standing on the
//      tail at all times. real tails carry a fraction of one. worse, the force
//      was 4.5 world units/s^2 against a gravity of 0.45: ten gravities of
//      buzz, on a tip deliberately left nearly free to whip.
//   2. THE HARD LIMITS RAN AS PROJECTIONS 720 TIMES A SECOND. a cone that takes
//      55% of its excess per pass, at two passes per substep and 360 substeps a
//      second, is not a soft limit -- it is a rigid one that switches on and off
//      as the body turns. that is where the snapping came from.
//
// so this is not a re-tune. a tail flows because it FOLLOWS: the body moves, the
// strand lags, drag shapes the lag, and the muscle slowly poses it back. there
// is no forcing term at all now -- the idle motion is the REST CURVE swaying,
// which the strand then has to catch up with, so every visible movement has
// inertia in it by construction.
//
// THE SOLVER (Muller, Kim & Chentanez 2012, "Fast Simulation of Inextensible
// Hair and Fur" -- DFTL)
//   predict -> pose -> limit -> follow-the-leader -> corrected velocities
//
//   * FOLLOW-THE-LEADER walks from the root outward and puts each particle at
//     exactly its rest length from its parent's ALREADY-CORRECTED position. one
//     pass, O(n), exactly inextensible, and unconditionally stable -- no
//     iteration count to tune and nothing to blow up.
//   * FTL cheats: moving a child to fix its own length adds momentum the child
//     never earned, which reads as artificial stiffness. DFTL takes it back out
//     in the velocity update, v_i = (p_i - p_i_old)/h - s * d_(i+1)/h, where
//     d_(i+1) is the correction FTL applied to the next particle. `ftlDamp` is
//     that s: 1 gives a limp strand, 0 gives the stiffness back.
//   * the pose step is the muscle. each segment's direction is blended toward
//     the rest curve's, by a per-segment fraction authored in Hz, stiff at the
//     base and nearly free at the tip. because it runs inside the same
//     root-to-tip walk, it never fights the length constraint.
//
// KEPT (all of it paid for once, see HANDOFF.md)
//   - ANISOTROPIC AERODYNAMIC DRAG, several times higher across the tail than
//     along it. that ratio is why real tails, ribbons and hair stream and
//     flutter instead of merely lagging, and it is the only damping here.
//   - the tapered mass profile, so the tip cracks and the root does not
//   - shared.trailDir override during the beam brace, so the tail streams
//     behind the BEAM
//   - SCROLL COMPENSATION, or the page drags the tail
//   - the teleport guard and the persistent bone-quat smoothing

import * as THREE from "three";
import { clamp } from "../../utils/math.js";

const D2R = Math.PI / 180;

export function createTailChain({ config, world }) {
  const cfg = config.tail;

  let n = 0;
  let pos = null;         // Float64Array(n*3) world space
  let prev = null;
  let vel = null;
  let corr = null;        // the FTL correction applied to each particle
  let w = null;           // inverse mass per particle (0 = pinned)
  let restLen = null;     // world-space rest length per segment
  let poseRate = null;    // muscle rate per segment, rad/s
  let maxBend = null;     // curvature limit per interior joint, radians
  let ramp = null;        // sway amplitude profile along the chain
  let restDir = null;     // posed rest direction per segment, world space
  let smoothBuf = null;   // scratch for the target-smoothing pass
  let prevDir = null;     // last frame's target, for the lag
  let lagInit = false;
  let acc = 0;
  let initialized = false;
  let rootRestInv = null;
  let smoothed = null;
  let lastScrollY = 0;
  let minSep = 0;
  let swayPhase = 0;


  // scratch, allocated once (this runs a few hundred times a second)
  const _attach = new THREE.Vector3();
  const _rootQ = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _seg = new THREE.Vector3();
  const _side = new THREE.Vector3();
  const _zAxis = new THREE.Vector3(0, 0, 1);
  const _trail = new THREE.Vector3(0, -1, 0);
  const _trailRaw = new THREE.Vector3();
  const _accelW = new THREE.Vector3();
  const _accelRaw = new THREE.Vector3();
  const _rd = new THREE.Vector3();
  const _sd = new THREE.Vector3();
  const _swing = new THREE.Quaternion();
  const _worldQ = new THREE.Quaternion();
  const _parentQ = new THREE.Quaternion();
  const _localQ = new THREE.Quaternion();
  const _tmp = new THREE.Vector3();
  const _sway = new THREE.Quaternion();

  const gx = (a, i) => a[i * 3];
  const gy = (a, i) => a[i * 3 + 1];
  const gz = (a, i) => a[i * 3 + 2];

  function init(rig, scale) {
    n = rig.tailRest.points.length;
    pos = new Float64Array(n * 3);
    prev = new Float64Array(n * 3);
    vel = new Float64Array(n * 3);
    corr = new Float64Array(n * 3);
    w = new Float64Array(n);
    restLen = new Float64Array(n - 1);
    poseRate = new Float64Array(n - 1);
    maxBend = new Float64Array(Math.max(n - 2, 0));
    ramp = new Float64Array(n - 1);
    restDir = new Float64Array((n - 1) * 3);
    smoothBuf = new Float64Array((n - 1) * 3);
    prevDir = new Float64Array((n - 1) * 3);
    rootRestInv = rig.rest.get(rig.bones.root).charQuat.clone().invert();
    smoothed = rig.bones.tail.map((b) => rig.rest.get(b).localQuat.clone());
    rebuild(rig, scale);
    placeAtRest(rig, scale);
    initialized = true;
  }

  // everything that depends on modelScale, recomputed if the viewport resizes
  function rebuild(rig, scale) {
    const lens = rig.tailRest.lens;
    let total = 0;
    for (let i = 0; i < n - 1; i++) {
      restLen[i] = lens[i] * scale;
      total += restLen[i];
    }
    minSep = (total / (n - 1)) * cfg.selfSepMul;
    // TAPERED MASS. a real tail's cross-section shrinks toward the tip, so its
    // linear density does too; giving every particle the same mass is why the
    // old chain's tip felt as heavy as its root. w is INVERSE mass, so it grows.
    w[0] = 0;                                    // the base is pinned to the body
    for (let i = 1; i < n; i++) {
      const t = (i - 1) / Math.max(n - 2, 1);
      w[i] = 1 / (1 - (1 - cfg.tipMassRatio) * t);
    }
    for (let i = 0; i < n - 1; i++) {
      const t = n > 2 ? i / (n - 2) : 0;
      // authored in Hz: how fast that section of the tail returns to the pose
      const hz = cfg.poseBaseHz
        + (cfg.poseTipHz - cfg.poseBaseHz) * Math.pow(t, cfg.poseCurve);
      poseRate[i] = 2 * Math.PI * Math.max(hz, 1e-3);
      // the sway is a muscle, so it has to start at the root and grow: a flat
      // profile swings the whole tail from the socket like a windscreen wiper
      ramp[i] = Math.pow(t, cfg.swayRamp);
    }
    for (let i = 0; i < n - 2; i++) {
      const t = n > 3 ? i / (n - 3) : 0;
      maxBend[i] = (cfg.maxBendBaseDeg
        + (cfg.maxBendTipDeg - cfg.maxBendBaseDeg)
        * Math.pow(t, cfg.bendCurve)) * D2R;
    }
  }

  function placeAtRest(rig, scale) {
    rig.bones.tail[0].getWorldPosition(_attach);
    rig.charQuatOf(rig.bones.root, _rootQ).multiply(rootRestInv);
    const pts = rig.tailRest.points;
    for (let i = 0; i < n; i++) {
      _tmp.copy(pts[i]).sub(pts[0]).multiplyScalar(scale)
        .applyQuaternion(_rootQ).add(_attach);
      pos[i * 3] = prev[i * 3] = _tmp.x;
      pos[i * 3 + 1] = prev[i * 3 + 1] = _tmp.y;
      pos[i * 3 + 2] = prev[i * 3 + 2] = _tmp.z;
      vel[i * 3] = vel[i * 3 + 1] = vel[i * 3 + 2] = 0;
    }
    lastScrollY = world.scroll.y;
  }

  // -------------------------------------------------------------------------
  // THE TARGET. where the muscle wants each segment to POINT. two sources:
  //
  //   the POSED REST CURVE   the tail's own slow sway, carried by the body
  //   a straight TRAIL LINE  during the beam brace only, where the character is
  //                          braced on the spot and the tail still has to
  //                          stream out behind the beam
  //
  // WHAT IS DELIBERATELY NOT HERE, part 1: v4.2 straightened the target toward
  // the trail line whenever mew was flying (`flightStraighten`), and that was
  // the rattle. A straight line has no memory of the turn, so on a heading
  // change the stiff base snapped onto the new line while the soft tip lagged,
  // and the kink between them ran down the chain. Dropping it halves the worst
  // joint angle in a smooth cruise (53.5 deg -> 23.8) and cuts the tip jitter
  // five times over (0.058 -> 0.011 of a segment): `test/tail_probe.js --fly`.
  //
  // WHAT IS DELIBERATELY NOT HERE, part 2: A CHINESE-DRAGON PATH FOLLOWER.
  // Recording the body's track and laying the tail along it is the textbook way
  // to get flowing, circling motion, and on this character it measured three to
  // thirty times WORSE than nothing -- jitter 0.147 laying the tail on the
  // track, 0.357 re-aiming only the track's curvature, against 0.011 for
  // neither. The reason is specific and worth knowing before anyone tries
  // again: this tail's socket sits 0.66 world units from the rotation centre,
  // HALF THE TAIL'S OWN LENGTH, so when bodyPose swings the character onto a
  // new heading the socket orbits nearly a whole tail length. A world-fixed
  // track anchored to an orbiting socket fights itself, and re-aiming the
  // track's shape onto a direction that is itself rotating only moves the
  // fight somewhere else. What produces the circling here is the plain physics:
  // the rest curl rides the body's rotation and the strand lags it, which is a
  // sweep by construction.
  // -------------------------------------------------------------------------
  function updateTargets(ctx, dt) {
    const { rig, body, brain } = ctx;
    const dirs = rig.tailRest.dirs;
    const speed = Math.hypot(body.vel.x, body.vel.y);

    // the sway runs on its own slow clock and speeds up with the body, but it
    // never turns into a wag: locking it to shared.swimPhase (what the old
    // travelling wave did) beats the tail at the spine's 1.1-2.8 Hz, which is
    // precisely the buzz all of this exists to remove.
    const speedN = clamp(speed / cfg.swaySpeedFull, 0, 1);
    swayPhase += (cfg.swayHz + cfg.swayPerSpeed * speedN) * 2 * Math.PI * dt;
    const amp = cfg.swayDeg * D2R
      * (cfg.swayIdle + (1 - cfg.swayIdle) * speedN)
      * (1 + brain.agitation * cfg.swayPerAgitation);

    // ---- 1. the posed rest curve -----------------------------------------
    // SWAY AXES: rotating about a FIXED body axis is wrong -- it tilts a
    // segment by the full angle only where the segment is perpendicular to that
    // axis and by nothing where it is parallel, and this tail ends up pointing
    // almost straight up, so swaying it about the body's up axis moved the tip
    // by 0.05 of a segment. Invisible. The primary axis is the SCREEN NORMAL,
    // so the sway always happens in the plane the character is presented in;
    // the secondary is perpendicular to the segment, a quarter phase behind,
    // and supplies the depth that stops it reading as a metronome.
    for (let i = 0; i < n - 1; i++) {
      _d.copy(dirs[i]).applyQuaternion(_rootQ);
      if (amp > 1e-4) {
        const ph = swayPhase - i * cfg.swayLag;
        const a = amp * ramp[i];
        _sway.setFromAxisAngle(_zAxis, Math.sin(ph) * a);
        _d.applyQuaternion(_sway);
        _side.crossVectors(_d, _zAxis);
        if (_side.lengthSq() > 1e-8) {
          _sway.setFromAxisAngle(_side.normalize(), Math.cos(ph) * a * cfg.swaySwirl);
          _d.applyQuaternion(_sway);
        }
        _d.normalize();
      }
      const j = i * 3;
      restDir[j] = _d.x; restDir[j + 1] = _d.y; restDir[j + 2] = _d.z;
    }

    // ---- 2. the beam brace overrides it ----------------------------------
    if (ctx.shared.trailDir) {
      for (let i = 0; i < n - 1; i++) {
        const j = i * 3;
        _d.set(restDir[j], restDir[j + 1], restDir[j + 2])
          .lerp(_trail, cfg.braceWeight).normalize();
        restDir[j] = _d.x; restDir[j + 1] = _d.y; restDir[j + 2] = _d.z;
      }
    }

    // ---- 3. LAG THE TARGET: it may swing round, never jump -----------------
    // this is "on a change of direction it should circle round instead of
    // snapping", stated directly. A hard reversal turns the body in a couple of
    // frames, and because the socket sits half a tail length from the rotation
    // centre the target swings through most of a half-circle almost instantly.
    // Smoothing the TARGET's rotation makes that a sweep the strand can follow.
    //
    // IT IS A LAG, NOT A RATE CAP. A cap was tried first and it is wrong in a
    // way that only shows up under sustained rotation: with the flight
    // straightening gone the target's rotation IS the body's rotation, so
    // capping it decouples the tail from the body outright. Under the 842 deg/s
    // spin in test/tail_turn.js a 200 deg/s cap left the tail pointing 165 deg
    // away from where the body was asking, permanently, because it could never
    // catch up. A first-order lag settles to a fixed angle behind instead --
    // which is what a trailing tail is supposed to do -- and converges the
    // moment the spin stops.
    if (lagInit) {
      const k = 1 - Math.exp(-cfg.targetLagRate * Math.max(dt, 1e-6));
      for (let i = 0; i < n - 1; i++) {
        const j = i * 3;
        _d.set(prevDir[j], prevDir[j + 1], prevDir[j + 2]);
        _tmp.set(restDir[j], restDir[j + 1], restDir[j + 2]);
        _d.lerp(_tmp, k);
        const L = _d.length() || 1e-9;
        restDir[j] = _d.x / L; restDir[j + 1] = _d.y / L; restDir[j + 2] = _d.z / L;
      }
    }
    lagInit = true;
    prevDir.set(restDir);

    // ---- 4. smooth the target --------------------------------------------
    // ZERO SHARP ANGLES is a property of the TARGET, not something the solver
    // can be asked to clean up after the fact: a corner in what the muscle is
    // pulling toward is a corner in the tail. Averaging neighbouring directions
    // guarantees it for a handful of multiply-adds, and it costs nothing
    // downstream because follow-the-leader re-imposes the lengths regardless.
    for (let k = 0; k < cfg.targetSmooth; k++) {
      for (let i = 1; i < n - 2; i++) {
        const j = i * 3;
        for (let c = 0; c < 3; c++) {
          smoothBuf[j + c] = 0.25 * restDir[j - 3 + c] + 0.5 * restDir[j + c]
            + 0.25 * restDir[j + 3 + c];
        }
      }
      for (let i = 1; i < n - 2; i++) {
        const j = i * 3;
        const L = Math.hypot(smoothBuf[j], smoothBuf[j + 1], smoothBuf[j + 2]) || 1e-9;
        restDir[j] = smoothBuf[j] / L;
        restDir[j + 1] = smoothBuf[j + 1] / L;
        restDir[j + 2] = smoothBuf[j + 2] / L;
      }
    }
  }

  // -------------------------------------------------------------------------
  function substep(h) {
    // ---- 1. predict ------------------------------------------------------
    pos[0] = _attach.x; pos[1] = _attach.y; pos[2] = _attach.z;
    prev[0] = pos[0]; prev[1] = pos[1]; prev[2] = pos[2];
    vel[0] = vel[1] = vel[2] = 0;

    for (let i = 1; i < n; i++) {
      const t = i / (n - 1);
      const j = i * 3;
      _seg.set(pos[j] - pos[j - 3], pos[j + 1] - pos[j - 2], pos[j + 2] - pos[j - 1]);
      const sl = _seg.length() || 1e-9;
      _seg.multiplyScalar(1 / sl);

      let ax = 0, ay = -cfg.gravity, az = 0;

      // ANISOTROPIC AERODYNAMIC DRAG. split the velocity into the component
      // along the tail and the component across it and damp them at very
      // different rates; a slender body's normal drag coefficient is several
      // times its tangential one. this is the only damping in the solver.
      _v.set(vel[j], vel[j + 1], vel[j + 2]);
      const vt = _v.dot(_seg);
      ax -= cfg.dragTangential * vt * _seg.x + cfg.dragNormal * (_v.x - vt * _seg.x);
      ay -= cfg.dragTangential * vt * _seg.y + cfg.dragNormal * (_v.y - vt * _seg.y);
      az -= cfg.dragTangential * vt * _seg.z + cfg.dragNormal * (_v.z - vt * _seg.z);

      // follow-through against the body's (smoothed) acceleration, stronger
      // toward the tip
      const k = -cfg.accelCouple * t;
      ax += _accelW.x * k;
      ay += _accelW.y * k;
      az += _accelW.z * k;

      vel[j] += ax * h;
      vel[j + 1] += ay * h;
      vel[j + 2] += az * h;
      prev[j] = pos[j]; prev[j + 1] = pos[j + 1]; prev[j + 2] = pos[j + 2];
      pos[j] += vel[j] * h;
      pos[j + 1] += vel[j + 1] * h;
      pos[j + 2] += vel[j + 2] * h;
    }

    // ---- 2. separation ---------------------------------------------------
    // the gap starts at THREE, not two: a rod is a tube, and points a couple of
    // segments apart along the arc are SUPPOSED to come close when it curves.
    // forcing those apart turns this into a badly conditioned bend limit that
    // fights the real one. this only exists to stop the strand lying back
    // through its own length, which the bend limit already makes hard.
    if (minSep > 0) {
      for (let i = 1; i < n; i++) {
        for (let k = i + 3; k < n; k++) {
          const a = i * 3;
          const b = k * 3;
          const dx = pos[b] - pos[a];
          const dy = pos[b + 1] - pos[a + 1];
          const dz = pos[b + 2] - pos[a + 2];
          const d = Math.hypot(dx, dy, dz);
          if (d > minSep || d < 1e-9) continue;
          const wsum = w[i] + w[k];
          if (wsum < 1e-12) continue;
          const c = ((minSep - d) / d) / wsum;
          pos[a] -= w[i] * c * dx;
          pos[a + 1] -= w[i] * c * dy;
          pos[a + 2] -= w[i] * c * dz;
          pos[b] += w[k] * c * dx;
          pos[b + 1] += w[k] * c * dy;
          pos[b + 2] += w[k] * c * dz;
        }
      }
    }

    // ---- 3. pose + limit + FTL, in ONE root-to-tip walk -------------------
    // every particle is placed from its parent's already-final position, so
    // nothing downstream can undo the length, and nothing upstream is disturbed.
    for (let i = 1; i < n; i++) {
      const a = (i - 1) * 3;
      const b = i * 3;
      let dx = pos[b] - pos[a];
      let dy = pos[b + 1] - pos[a + 1];
      let dz = pos[b + 2] - pos[a + 2];
      let L = Math.hypot(dx, dy, dz) || 1e-9;
      dx /= L; dy /= L; dz /= L;

      // (a) MUSCLE: blend toward the posed rest direction. exponential, so the
      // fraction is exactly timestep independent -- half the substeps gives the
      // same tail, which the fixed "correct 55% per pass" limits never did.
      const k = 1 - Math.exp(-poseRate[i - 1] * h);
      dx += (restDir[a] - dx) * k;
      dy += (restDir[a + 1] - dy) * k;
      dz += (restDir[a + 2] - dz) * k;
      let nl = Math.hypot(dx, dy, dz) || 1e-9;
      dx /= nl; dy /= nl; dz /= nl;

      // (b) CURVATURE LIMIT against the parent segment. generous, and a hard
      // clamp rather than a fraction-per-pass: it is a backstop that should be
      // idle almost all of the time, not a shaping term.
      if (i >= 2) {
        const p = (i - 2) * 3;
        let px = pos[a] - pos[p], py = pos[a + 1] - pos[p + 1], pz = pos[a + 2] - pos[p + 2];
        const pl = Math.hypot(px, py, pz) || 1e-9;
        px /= pl; py /= pl; pz /= pl;
        const dot = clamp(px * dx + py * dy + pz * dz, -1, 1);
        const ang = Math.acos(dot);
        const lim = maxBend[i - 2];
        if (ang > lim) {
          // rotate the segment back toward the parent's direction by the excess,
          // in their common plane: slerp with the exact fraction that lands on
          // the limit.
          const f = (ang - lim) / ang;
          const s = Math.sin(ang) || 1e-9;
          const c0 = Math.sin(f * ang) / s;
          const c1 = Math.sin((1 - f) * ang) / s;
          dx = c0 * px + c1 * dx;
          dy = c0 * py + c1 * dy;
          dz = c0 * pz + c1 * dz;
          nl = Math.hypot(dx, dy, dz) || 1e-9;
          dx /= nl; dy /= nl; dz /= nl;
        }
      }

      // (c) FOLLOW THE LEADER: exact rest length from the corrected parent
      L = restLen[i - 1];
      const nx = pos[a] + dx * L;
      const ny = pos[a + 1] + dy * L;
      const nz = pos[a + 2] + dz * L;
      corr[b] = nx - pos[b];
      corr[b + 1] = ny - pos[b + 1];
      corr[b + 2] = nz - pos[b + 2];
      pos[b] = nx; pos[b + 1] = ny; pos[b + 2] = nz;
    }

    // ---- 4. DFTL velocities ----------------------------------------------
    // subtract the correction the walk applied to the NEXT particle. without
    // this, FTL hands every parent the momentum it spent dragging its child
    // into place and the strand behaves like wire.
    const inv = 1 / h;
    const s = cfg.ftlDamp;
    for (let i = 1; i < n; i++) {
      const j = i * 3;
      const c = i < n - 1 ? (i + 1) * 3 : -1;
      vel[j] = (pos[j] - prev[j]) * inv;
      vel[j + 1] = (pos[j + 1] - prev[j + 1]) * inv;
      vel[j + 2] = (pos[j + 2] - prev[j + 2]) * inv;
      if (c >= 0) {
        vel[j] -= s * corr[c] * inv;
        vel[j + 1] -= s * corr[c + 1] * inv;
        vel[j + 2] -= s * corr[c + 2] * inv;
      }
    }
  }

  // -------------------------------------------------------------------------
  return {
    // exposed for the headless tests
    getParticles: () => {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({ p: new THREE.Vector3(gx(pos, i), gy(pos, i), gz(pos, i)) });
      }
      return out;
    },

    update(ctx) {
      const { rig, view, dt, body } = ctx;
      const tail = rig.bones.tail;
      if (!tail.length) return;
      const scale = view.modelScale;

      if (!initialized) init(rig, scale);
      if (Math.abs(restLen[0] - rig.tailRest.lens[0] * scale) > 1e-6) {
        rebuild(rig, scale);          // viewport resized
      }

      rig.modelRoot.updateWorldMatrix(true, true);
      tail[0].getWorldPosition(_attach);
      rig.charQuatOf(rig.bones.root, _rootQ).multiply(rootRestInv);

      // SCROLL COMPENSATION. the sim integrates in three's scene space, but
      // main.js bakes -scrollY into the character's scene position, so scrolling
      // slides the anchor while the persisted particles lag and the page drags
      // the tail. shift every particle (and its previous position, so no phantom
      // velocity appears) by the same amount. body physics live in document
      // space and never feel this, so the tail must not either.
      const shiftY = (world.scroll.y - lastScrollY) * view.worldPerPx;
      lastScrollY = world.scroll.y;
      if (shiftY !== 0) {
        for (let i = 0; i < n; i++) {
          pos[i * 3 + 1] += shiftY;
          prev[i * 3 + 1] += shiftY;
        }
      }

      // teleport guard: on a resize or a tab wake the anchor can jump metres.
      // restart at rest rather than whip across the screen.
      _tmp.set(gx(pos, 0), gy(pos, 0), gz(pos, 0));
      if (_tmp.distanceTo(_attach) > 3) {
        placeAtRest(rig, scale);
        lagInit = false;           // a teleport is not a turn
      }

      // smoothed trail direction: quick heading changes sweep the streaming
      // target gently instead of whipping it. during the beam brace the pose
      // layer overrides it, so the tail streams behind the BEAM.
      const speed = Math.hypot(body.vel.x, body.vel.y);
      if (ctx.shared.trailDir) {
        _trailRaw.copy(ctx.shared.trailDir);
        _trail.lerp(_trailRaw, 1 - Math.exp(-8 * dt)).normalize();
      } else if (speed > 1) {
        _trailRaw.set(-body.vel.x / speed, body.vel.y / speed, 0);
        _trail.lerp(_trailRaw, 1 - Math.exp(-5 * dt)).normalize();
      }
      // body.accel is the RAW physics acceleration and jumps by thousands of
      // px/s^2 the frame a collider is hit. feeding that straight into the tail
      // is the same mistake that made the feet snap (see limbPose.js).
      _accelRaw.set(body.accel.x * view.worldPerPx,
        -body.accel.y * view.worldPerPx, 0);
      _accelW.lerp(_accelRaw, 1 - Math.exp(-cfg.accelSmoothRate * dt));

      // the path is recorded in the same world space the particles live in, so
      // it gets the same scroll shift, and the same teleport reset.
      updateTargets(ctx, dt);

      // SMALL STEPS: the accumulator keeps it frame-rate independent and the cap
      // keeps a stalled tab from spending a second catching up.
      const H = 1 / cfg.substepHz;
      acc = Math.min(acc + dt, cfg.maxSubsteps * H);
      while (acc >= H) {
        substep(H);
        acc -= H;
      }

      // map particles to bone rotations, base -> tip, each local quat computed
      // against its parent's fresh world orientation. the smoothing state lives
      // here because the poser resets every bone to rest each frame.
      rig.charQuatOf(tail[0].parent, _parentQ);
      const smoothK = 1 - Math.exp(-cfg.quatDampRate * dt);
      const _pInv = _worldQ;
      for (let k = 0; k < tail.length; k++) {
        const bone = tail[k];
        const rest = rig.rest.get(bone);
        _rd.copy(rig.tailRest.dirs[k]).applyQuaternion(_rootQ);
        _sd.set(gx(pos, k + 1) - gx(pos, k),
          gy(pos, k + 1) - gy(pos, k),
          gz(pos, k + 1) - gz(pos, k)).normalize();
        _swing.setFromUnitVectors(_rd, _sd);
        const targetWorld = _swing.multiply(_rootQ).multiply(rest.charQuat);
        _localQ.copy(_pInv.copy(_parentQ).invert()).multiply(targetWorld);
        smoothed[k].slerp(_localQ, smoothK);
        bone.quaternion.copy(smoothed[k]);
        _parentQ.multiply(bone.quaternion);
      }
    }
  };
}
