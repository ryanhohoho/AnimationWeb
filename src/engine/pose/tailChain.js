// tailChain.js
// the tail as a simulated particle chain, not a stack of sine rotations.
// weight comes from verlet inertia + gravity, muscle comes from shape-memory
// springs toward the rest s-curve, flow comes from a traveling wave whose
// phase advances along the chain. bones then align to the particles.

import * as THREE from "three";
import { clamp } from "../../utils/math.js";

const D2R = Math.PI / 180;

export function createTailChain({ config, world }) {
  const cfg = config.tail;
  const SUB_DT = 1 / cfg.substepHz;

  let particles = null;   // [{ p, pp }] world space
  let acc = 0;
  let initialized = false;
  let rootRestInv = null; // inverse of the root bone's rest char quat
  let smoothed = null;    // persistent per-bone local quats for cross-frame smoothing
  let lastScrollY = 0;    // for scroll compensation (see update)

  // scratch objects, allocated once (this runs 120 times a second)
  const _attach = new THREE.Vector3();
  const _rootQ = new THREE.Quaternion();
  const _target = new THREE.Vector3();
  const _f = new THREE.Vector3();
  const _seg = new THREE.Vector3();
  const _perp = new THREE.Vector3();
  const _binorm = new THREE.Vector3();
  const _prevSeg = new THREE.Vector3();
  const _sep = new THREE.Vector3();
  const _wMix = new THREE.Vector3();
  const _trail = new THREE.Vector3(0, -1, 0);
  const _trailRaw = new THREE.Vector3();
  const _zAxis = new THREE.Vector3(0, 0, 1);
  let cumLens = null; // cumulative rest lengths from the attach point
  const _rd = new THREE.Vector3();
  const _sd = new THREE.Vector3();
  const _swing = new THREE.Quaternion();
  const _worldQ = new THREE.Quaternion();
  const _parentQ = new THREE.Quaternion();
  const _localQ = new THREE.Quaternion();
  const _prevDelta = new THREE.Vector3();
  const _tmp = new THREE.Vector3();
  const _accelW = new THREE.Vector3();
  const _baseDir = new THREE.Vector3();

  function init(rig, scale) {
    const pts = rig.tailRest.points;
    particles = pts.map(() => ({ p: new THREE.Vector3(), pp: new THREE.Vector3() }));
    rootRestInv = rig.rest.get(rig.bones.root).charQuat.clone().invert();
    smoothed = rig.bones.tail.map((b) => rig.rest.get(b).localQuat.clone());
    cumLens = [0];
    for (const l of rig.tailRest.lens) cumLens.push(cumLens[cumLens.length - 1] + l);
    placeAtRest(rig, scale);
    initialized = true;
  }

  function placeAtRest(rig, scale) {
    // rest points are char-frame; transform by current root delta + world attach
    rig.bones.tail[0].getWorldPosition(_attach);
    rig.charQuatOf(rig.bones.root, _rootQ).multiply(rootRestInv);
    const pts = rig.tailRest.points;
    for (let i = 0; i < particles.length; i++) {
      _tmp.copy(pts[i]).sub(pts[0]).multiplyScalar(scale).applyQuaternion(_rootQ).add(_attach);
      particles[i].p.copy(_tmp);
      particles[i].pp.copy(_tmp);
    }
    // resync the scroll baseline: particles now sit at the live anchor, which
    // already includes the current scroll, so there is no pending shift to undo
    lastScrollY = world.scroll.y;
  }

  function substep(ctx, scale, dt) {
    const { rig, body, brain, view } = ctx;
    const n = particles.length;
    const pts = rig.tailRest.points;
    const speed = Math.hypot(body.vel.x, body.vel.y);
    const idleFade = clamp(1 - speed / cfg.waveSpeedFade, 0, 1);
    // while swimming, the tail wave is the spine undulation continuing down
    // the chain (shared phase); the amp grows so the tail drives like a fluke
    const align = ctx.shared.swimAlign || 0;
    const waveAmp = cfg.waveAmp * scale * (0.55 + 0.45 * idleFade + align * 1.3) * (1 + brain.agitation * 0.9);
    const waveW = cfg.waveFreq * (1 + brain.agitation * 0.8) * 2 * Math.PI;
    const phase0 = ctx.shared.swimPhase !== undefined ? ctx.shared.swimPhase : ctx.time * waveW;

    // wave direction: body-frame up (dorsoventral otter kick) with a dash of
    // body-right so idle sway stays lateral when the tail hangs vertical
    if (ctx.shared.bodyQuat) {
      _wMix.set(0.35, 1, 0).applyQuaternion(ctx.shared.bodyQuat).normalize();
    } else {
      _wMix.set(0.35, 1, 0).normalize();
    }

    // smoothed trail direction, once per substep: quick heading changes
    // (loops, dodges) sweep the streaming target gently instead of whipping.
    // during the beam brace the pose layer overrides it (tail streams behind
    // the BEAM, not behind the recoil slide)
    if (ctx.shared.trailDir) {
      _trailRaw.copy(ctx.shared.trailDir);
      _trail.lerp(_trailRaw, 1 - Math.exp(-8 * dt)).normalize();
    } else if (speed > 1) {
      _trailRaw.set(-body.vel.x / speed, body.vel.y / speed, 0);
      _trail.lerp(_trailRaw, 1 - Math.exp(-5 * dt)).normalize();
    }

    // body acceleration in world units for follow-through
    _accelW.set(body.accel.x * view.worldPerPx, -body.accel.y * view.worldPerPx, 0);

    // pin the base to the pelvis attach point
    particles[0].p.copy(_attach);
    particles[0].pp.copy(_attach);

    const damp = Math.max(0, 1 - cfg.drag * dt);

    for (let i = 1; i < n; i++) {
      const pt = particles[i];
      const t = i / (n - 1);

      // shape memory: spring toward the rest curve carried by the current body
      // orientation. stiff at the base (muscle), loose at the tip (whip)
      // shape target: resting s-curl, opening into a straight line trailing
      // the motion as flight alignment rises -- the tail streams behind and
      // the traveling wave swirls it instead of the curl fighting the wind
      _target.copy(pts[i]).sub(pts[0]).multiplyScalar(scale).applyQuaternion(_rootQ).add(_attach);
      const straighten = align * cfg.flightStraighten;
      if (straighten > 0.01 && speed > 1) {
        _tmp.copy(_attach).addScaledVector(_trail, cumLens[i] * scale);
        _target.lerp(_tmp, straighten);
      }
      const stiff = (cfg.stiffBase + (cfg.stiffTip - cfg.stiffBase) * Math.pow(t, 1 / cfg.stiffCurve))
        * (1 - straighten * (1 - cfg.flightStiffnessMul));
      _f.copy(_target).sub(pt.p).multiplyScalar(stiff);

      // weight
      _f.y -= cfg.gravity;

      // traveling wave: phase marches down the chain -> flow, not flail.
      //
      // this used to be LINEARLY polarised -- every particle pushed along the
      // same body-frame axis -- so the whole chain oscillated inside one plane
      // and had no reason to ever leave it. a planar chain under compression
      // buckles, and a buckled planar chain folds back through itself.
      //
      // driving it as a CIRCULARLY polarised wave instead (two perpendicular
      // components a quarter cycle apart) makes a traveling helix: the bending
      // plane rotates as the phase marches down the chain, so the same energy
      // that used to produce a flat fold now produces a spiral. `waveSwirl`
      // blends between the two, 0 = old flat wave, 1 = fully circular.
      _seg.copy(pt.p).sub(particles[i - 1].p).normalize();
      _perp.copy(_wMix).addScaledVector(_seg, -_wMix.dot(_seg));
      if (_perp.lengthSq() < 1e-4) {
        _perp.crossVectors(_seg, _zAxis);
        if (_perp.lengthSq() < 1e-4) _perp.set(1, 0, 0);
      }
      _perp.normalize();
      _binorm.crossVectors(_seg, _perp).normalize();
      const phase = phase0 - i * cfg.wavePhaseStep;
      const amp = waveAmp * t;
      _f.addScaledVector(_perp, Math.sin(phase) * amp);
      _f.addScaledVector(_binorm, Math.cos(phase) * amp * cfg.waveSwirl);

      // and an explicit anti-fold: a lateral nudge proportional to how sharply
      // this joint is already bent, always in the same rotational sense. a
      // bend that is starting to close on itself gets rotated out of plane
      // rather than allowed to keep closing -- kinks become coils.
      if (i >= 2) {
        _prevSeg.copy(particles[i - 1].p).sub(particles[i - 2].p).normalize();
        const bend = 1 - clamp(_prevSeg.dot(_seg), -1, 1);   // 0 straight, 2 folded
        if (bend > cfg.unfoldStart) {
          _f.addScaledVector(_binorm, (bend - cfg.unfoldStart) * cfg.unfoldSwirl * scale);
        }
      }

      // follow-through against body acceleration, stronger toward the tip
      _f.addScaledVector(_accelW, -cfg.accelCouple * t);

      // verlet
      _tmp.copy(pt.p);
      pt.p.x += (pt.p.x - pt.pp.x) * damp + _f.x * dt * dt;
      pt.p.y += (pt.p.y - pt.pp.y) * damp + _f.y * dt * dt;
      pt.p.z += (pt.p.z - pt.pp.z) * damp + _f.z * dt * dt;
      pt.pp.copy(_tmp);
    }

    // ---- constraints ----------------------------------------------------
    // lengths, angle limit and self-separation all run INSIDE the same
    // relaxation loop. the angle limit used to run once, after the length
    // loop had finished, so a hard bend only ever got one softened pass at it
    // and simply stayed folded.
    const lens = rig.tailRest.lens;
    const maxAngle = cfg.angleLimitDeg * D2R;
    const rootMaxAngle = cfg.rootAngleLimitDeg * D2R;
    // body-carried rigid direction the tail root should hold to
    _baseDir.copy(rig.tailRest.dirs[0]).applyQuaternion(_rootQ).normalize();
    let minSep = 0;
    for (let i = 0; i < lens.length; i++) minSep += lens[i];
    minSep = (minSep / lens.length) * scale * cfg.selfSepMul;

    for (let iter = 0; iter < cfg.constraintIters; iter++) {
      // segment lengths
      for (let i = 1; i < n; i++) {
        const a = particles[i - 1];
        const b = particles[i];
        _seg.copy(b.p).sub(a.p);
        const d = _seg.length() || 1e-6;
        const rest = lens[i - 1] * scale;
        const diff = (d - rest) / d;
        if (i === 1) {
          b.p.addScaledVector(_seg, -diff); // base is pinned, child takes it all
        } else {
          a.p.addScaledVector(_seg, diff * 0.5);
          b.p.addScaledVector(_seg, -diff * 0.5);
        }
      }

      // base cone: the FIRST segment is held inside a cone around the
      // body-carried rest direction. the shape-memory spring alone gets OUTRUN
      // by a fast turn (measured: the base swung ~177 deg, nearly backward, off
      // the body), so the whole tail flopped onto its own length and folded in
      // projection. this is a positional constraint the turn CANNOT outrun: it
      // re-anchors the root to the body every substep, so a hard turn drags the
      // tail behind instead of flinging it around. it sits idle during gentle
      // motion (the base is well inside the cone), so the normal whip survives.
      {
        _seg.copy(particles[1].p).sub(particles[0].p);
        const blen = _seg.length() || 1e-6;
        const bang = Math.acos(clamp(_seg.dot(_baseDir) / blen, -1, 1));
        if (bang > rootMaxAngle) {
          const excess = (bang - rootMaxAngle) / bang;
          _tmp.copy(_baseDir).multiplyScalar(blen);
          _seg.lerp(_tmp, excess * cfg.rootAngleSoftness);
          _seg.setLength(blen);
          particles[1].p.copy(particles[0].p).add(_seg); // base is pinned
        }
      }

      // soft angle limit: keep each joint inside a cone around its parent
      for (let i = 2; i < n; i++) {
        _prevDelta.copy(particles[i - 1].p).sub(particles[i - 2].p).normalize();
        _seg.copy(particles[i].p).sub(particles[i - 1].p);
        const len = _seg.length() || 1e-6;
        _sd.copy(_seg).divideScalar(len);
        const ang = Math.acos(clamp(_prevDelta.dot(_sd), -1, 1));
        if (ang > maxAngle) {
          // blend the segment back toward the cone edge instead of snapping
          const excess = (ang - maxAngle) / ang;
          _tmp.copy(_prevDelta).multiplyScalar(len);
          _seg.lerp(_tmp, excess * cfg.angleSoftness);
          _seg.setLength(len);
          particles[i].p.copy(particles[i - 1].p).add(_seg);
        }
      }

      // self-separation: NON-ADJACENT particles push each other apart. without
      // this the chain has no idea it exists and will happily lie back through
      // its own body -- which is what "folding into itself" actually was.
      // 7 usable particles = 15 pairs, so the cost is nothing.
      for (let i = 0; i < n; i++) {
        for (let k = i + 2; k < n; k++) {
          _sep.copy(particles[k].p).sub(particles[i].p);
          const d = _sep.length();
          if (d > minSep || d < 1e-9) continue;
          const push = (minSep - d) / d * 0.5;
          if (i === 0) {
            particles[k].p.addScaledVector(_sep, push * 2);   // base is pinned
          } else {
            particles[i].p.addScaledVector(_sep, -push);
            particles[k].p.addScaledVector(_sep, push);
          }
        }
      }
    }
  }

  return {
    // exposed for headless tests
    getParticles: () => particles,

    update(ctx) {
      const { rig, view, dt } = ctx;
      const tail = rig.bones.tail;
      if (!tail.length) return;
      const scale = view.modelScale;

      if (!initialized) init(rig, scale);

      // world-space anchors must reflect everything earlier layers did
      rig.modelRoot.updateWorldMatrix(true, true);
      tail[0].getWorldPosition(_attach);
      // _rootQ is the root bone's rotation DELTA from rest. at rest it is
      // identity, so gravity and the rest curve stay honest. char frame ==
      // world orientation because the character group itself never rotates.
      rig.charQuatOf(rig.bones.root, _rootQ).multiply(rootRestInv);

      // scroll compensation: the sim integrates particle positions in three's
      // SCENE space, but main.js bakes -scrollY into the character's scene
      // position (doc-anchored render), so scrolling translates the tail's
      // anchor while the verlet particles -- which persist across frames -- lag
      // behind, and the tail gets dragged by the page. the body physics live in
      // document space and never feel this, so the tail shouldn't either. cancel
      // it by rigidly shifting every particle (p AND pp, so no phantom velocity)
      // by the same amount the anchor moved due to scroll: a scroll now slides
      // the whole chain together. genuine swim motion still whips, because that
      // comes from body.pos, which we leave untouched. headless (scroll.y stays
      // 0) is a no-op. runs BEFORE the teleport guard so scrolling never trips it.
      const scrollShiftY = (world.scroll.y - lastScrollY) * view.worldPerPx;
      lastScrollY = world.scroll.y;
      if (scrollShiftY !== 0) {
        for (let i = 0; i < particles.length; i++) {
          particles[i].p.y += scrollShiftY;
          particles[i].pp.y += scrollShiftY;
        }
      }

      // teleport guard: if the base jumped a huge distance (resize, tab wake),
      // restart the sim at rest instead of whipping across the screen
      if (particles[0].p.distanceTo(_attach) > 3) placeAtRest(rig, scale);

      acc = Math.min(acc + dt, 0.1);
      while (acc >= SUB_DT) {
        substep(ctx, scale, SUB_DT);
        acc -= SUB_DT;
      }

      // map particles to bone rotations, walking base -> tip so each local
      // quat is computed against its parent's fresh world orientation.
      // smoothing state lives in `smoothed` (bones are reset every frame,
      // so smoothing on bone.quaternion itself would just drag toward rest)
      rig.charQuatOf(tail[0].parent, _parentQ);
      const smoothK = 1 - Math.exp(-cfg.quatDampRate * dt);
      const _pInv = _worldQ; // reuse scratch
      for (let k = 0; k < tail.length; k++) {
        const bone = tail[k];
        const rest = rig.rest.get(bone);
        // rigid-with-body direction and orientation, then swing onto the sim
        _rd.copy(rig.tailRest.dirs[k]).applyQuaternion(_rootQ);
        _sd.copy(particles[k + 1].p).sub(particles[k].p).normalize();
        _swing.setFromUnitVectors(_rd, _sd);
        const targetWorld = _swing.multiply(_rootQ).multiply(rest.charQuat);
        _localQ.copy(_pInv.copy(_parentQ).invert()).multiply(targetWorld);
        smoothed[k].slerp(_localQ, smoothK);
        bone.quaternion.copy(smoothed[k]);
        // parent world quat for the next bone: chain quat * fresh local
        _parentQ.multiply(bone.quaternion);
      }
    }
  };
}
