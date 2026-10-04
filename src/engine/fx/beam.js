// beam.js
// MEW'S HYPER BEAM, redrawn from nothing on 2026-10-04 (owner's brief: the shape
// of cmzw_'s hand-animated beam, the colours of regidrago's, impact frames with
// stars before the shot, and the paper burning away under it). Only the old
// beam's TIMING survives -- rigConfig.attack.chargeS / expandS / sustainS /
// fadeS, which the brain reads too -- and everything inside those beats is new:
//
//   CHARGE (1.5 s)   an orb gathers at the mouth, hand-drawn and boiling;
//                    streaks of light are drawn into it; pink lightning
//                    crackles round it; a dashed guide line reaches toward the
//                    target. All of it follows the cursor, as she does.
//   IMPACT (the charge's last 0.2 s)
//                    three drawings, negative / positive / negative, inside a
//                    ragged burst around her -- not the whole window -- with
//                    her as a flat silhouette in it and glints at the origin.
//   FIRE (0.12 s)    the beam erupts: a point that opens like a bullet's nose
//                    (fx/beamShape.js envelope), overshooting its width and
//                    snapping back; a parabolic sheath and two shock rings
//                    thrown down it; a cross of light at the origin; stars
//                    knocked loose.
//   HOLD (0.95 s)    streaks pour down it, its edges boil on twos, lightning
//                    coils round it, and the paper under it has burned through
//                    to the sky (site/pressgl.js, below the words).
//   FADE (0.4 s)     it thins to its core and tears into streaks, and the
//                    paper heals back over the burn.
//
// WHERE IT IS DRAWN. Two small scenes mew.js hands the presentation pass, in
// CSS pixels with an orthographic camera, authored in DOCUMENT pixels (their
// root is moved by the scroll): `under` is drawn before her sprite, `over`
// after. Nothing here goes through the pixelate pass -- see beamMaterials.js.
//
// WHAT IT COSTS. Every mesh is one draw call over only the pixels it covers.
// Per frame the CPU writes a handful of uniforms, and rebuilds the lightning
// strips (a few hundred vertices) only when the drawing changes, twelve times
// a second. The noise is one 128 px tile made once. The burn is the sheet's
// own press, which was drawing that pixel anyway.

import * as THREE from "three";
import { beamLength } from "./beamGeometry.js";
import {
  envelope, fireTimeline, chargeTimeline, jaggedPath, wrapArc,
  starSchedule, starScale, hash1
} from "./beamShape.js";
import {
  makeNoiseTexture, beamMaterial, orbMaterial, lineMaterial, starMaterial,
  impactMaterial, ringMaterial
} from "./beamMaterials.js";
import { mulberry32 } from "../../utils/math.js";

const rgb = (hex) => {
  const c = new THREE.Color(hex).convertLinearToSRGB();
  return [c.r, c.g, c.b];
};

/**
 * @param under, over   THREE.Group roots in document px (mew.js scrolls them)
 * @param config        rigConfig.attack
 * @param getMouthDoc   () => {x,y} the mouth, document px
 * @param getOriginDoc  (dir) => {x,y} where the shot leaves (clear of the head)
 * @param getBodyDoc    () => {x,y} her centre
 * @param getAim        () => {x,y} unit vector toward the target right now
 * @param charScale     () => her height / the reference height
 * @param getDocSize    () => {w,h}
 * @param present       the presentation pass (setFlat paints her silhouette)
 * @param burn          { set(state), clear() } -- the paper under the beam
 */
export function createBeamFx({
  under, over, config, getMouthDoc, getOriginDoc, getBodyDoc, getAim,
  charScale, getDocSize, present, burn
}) {
  const cfg = config;
  const P = cfg.palette;
  const noise = makeNoiseTexture(11);

  const quad = new THREE.PlaneGeometry(2, 2);
  const keep = (m, order) => {
    m.frustumCulled = false;   // every position here is made in a shader
    m.renderOrder = order;
    m.visible = false;
    return m;
  };

  // ── the beam: a strip, rows packed toward the muzzle where the nose curves
  const ROWS = 72, COLS = 6;
  const beamGeo = new THREE.BufferGeometry();
  {
    const su = new Float32Array((ROWS + 1) * (COLS + 1) * 2);
    const idx = [];
    let k = 0;
    for (let i = 0; i <= ROWS; i++) {
      const x = Math.pow(i / ROWS, 1.8);
      for (let j = 0; j <= COLS; j++) {
        su[k++] = x;
        su[k++] = (j / COLS) * 2 - 1;
      }
    }
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const a = i * (COLS + 1) + j, b = a + COLS + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    beamGeo.setAttribute("aSU", new THREE.BufferAttribute(su, 2));
    // three wants a position attribute to count vertices; the shader ignores it
    beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(su.length / 2 * 3), 3));
    beamGeo.setIndex(idx);
  }
  const beamMat = beamMaterial(noise, cfg);
  const beam = keep(new THREE.Mesh(beamGeo, beamMat), 2);

  const impactMat = impactMaterial(cfg);
  const impact = keep(new THREE.Mesh(quad, impactMat), 1);

  const rings = [];
  for (let i = 0; i < cfg.look.rings; i++) rings.push(keep(new THREE.Mesh(quad, ringMaterial(cfg)), 3 + i));
  under.add(impact, beam, ...rings);

  const orbMat = orbMaterial(cfg);
  const orb = keep(new THREE.Mesh(quad, orbMat), 1);

  // ── ink lines: one buffer, rebuilt in place, uploaded only as far as used
  const LV = 6000;
  const lPos = new Float32Array(LV * 3), lEdge = new Float32Array(LV), lCol = new Float32Array(LV * 3);
  const lA = new Float32Array(LV), lSoft = new Float32Array(LV), lIdx = new Uint16Array(LV * 3);
  const lineGeo = new THREE.BufferGeometry();
  const lAttr = {
    position: new THREE.BufferAttribute(lPos, 3), aEdge: new THREE.BufferAttribute(lEdge, 1),
    aCol: new THREE.BufferAttribute(lCol, 3), aA: new THREE.BufferAttribute(lA, 1),
    aSoft: new THREE.BufferAttribute(lSoft, 1)
  };
  for (const [n, a] of Object.entries(lAttr)) { a.setUsage(THREE.DynamicDrawUsage); lineGeo.setAttribute(n, a); }
  const lIndex = new THREE.BufferAttribute(lIdx, 1).setUsage(THREE.DynamicDrawUsage);
  lineGeo.setIndex(lIndex);
  const lines = keep(new THREE.Mesh(lineGeo, lineMaterial()), 2);
  let lv = 0, li = 0;

  function strip(pts, width, col, alpha, soft, taper = true) {
    const n = pts.length / 2;
    if (n < 2 || lv + n * 2 > LV || li + (n - 1) * 6 > lIdx.length) return;
    const base = lv;
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
      let tx = pts[i1 * 2] - pts[i0 * 2], ty = pts[i1 * 2 + 1] - pts[i0 * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      // a stroke tapers at both ends, the way a brush lifts
      const u = i / (n - 1);
      const w = 0.5 * width * (taper ? Math.max(0.25, Math.sin(Math.PI * u) ** 0.5) : 1);
      const x = pts[i * 2], y = pts[i * 2 + 1];
      for (const side of [1, -1]) {
        const v = lv++;
        lPos[v * 3] = x - ty * w * side;
        lPos[v * 3 + 1] = y + tx * w * side;
        lPos[v * 3 + 2] = 0;
        lEdge[v] = side;
        lCol[v * 3] = col[0]; lCol[v * 3 + 1] = col[1]; lCol[v * 3 + 2] = col[2];
        lA[v] = alpha;
        lSoft[v] = soft;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      lIdx[li++] = a; lIdx[li++] = a + 1; lIdx[li++] = a + 2;
      lIdx[li++] = a + 1; lIdx[li++] = a + 3; lIdx[li++] = a + 2;
    }
  }
  const BOLT = rgb(P.bolt), BOLT_GLOW = rgb(P.boltGlow), DEEP = rgb(P.deep);
  // A BOLT IS INKED, not just lit: on white paper a pale line with a glow is
  // nothing at all. A halo for the light, a deep pink stroke for the drawing,
  // a white core for the heat -- the way the references draw theirs.
  function bolt(pts, k, a = 1) {
    strip(pts, 11 * k, BOLT_GLOW, 0.55 * a, 1);
    strip(pts, 4.2 * k, DEEP, a, 0);
    strip(pts, 1.7 * k, BOLT, a, 0);
  }
  function flushLines() {
    for (const a of Object.values(lAttr)) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, lv * a.itemSize);
      a.needsUpdate = true;
    }
    lIndex.clearUpdateRanges();
    lIndex.addUpdateRange(0, li);
    lIndex.needsUpdate = true;
    lineGeo.setDrawRange(0, li);
    lines.visible = li > 0;
  }

  // ── stars: a quad each, rebuilt per frame (a dozen at most)
  const SV = 16;
  const sPos = new Float32Array(SV * 4 * 3), sLoc = new Float32Array(SV * 4 * 2), sShape = new Float32Array(SV * 4 * 4);
  const sIdx = new Uint16Array(SV * 6);
  for (let i = 0; i < SV; i++) {
    sIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    sLoc.set([-1, -1, 1, -1, -1, 1, 1, 1], i * 8);
  }
  const starGeo = new THREE.BufferGeometry();
  const sAttr = {
    position: new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage),
    aLocal: new THREE.BufferAttribute(sLoc, 2),
    aShape: new THREE.BufferAttribute(sShape, 4).setUsage(THREE.DynamicDrawUsage)
  };
  for (const [n, a] of Object.entries(sAttr)) starGeo.setAttribute(n, a);
  starGeo.setIndex(new THREE.BufferAttribute(sIdx, 1));
  const stars = keep(new THREE.Mesh(starGeo, starMaterial(cfg)), 3);
  over.add(orb, lines, stars);

  // ── state
  let mode = "idle";            // idle | charge | fire
  let t = 0;
  let seed = 1;
  let dir = { x: 1, y: 0 };
  let sched = [];
  let lastBoil = -1;
  let arcs = [];                // the current drawing's bolts, in a local frame
  let flat = null;

  function setFlat(hex) {
    if (flat === hex) return;
    flat = hex;
    present?.setFlat?.(hex);
  }

  function hideAll() {
    for (const m of [beam, impact, orb, lines, stars, ...rings]) m.visible = false;
    setFlat(null);
  }

  function startCharge() {
    mode = "charge";
    t = 0;
    lastBoil = -1;
    seed = (Math.random() * 0xffffffff) >>> 0;
    sched = starSchedule(seed, cfg);
  }

  function fire(_origin, d) {
    mode = "fire";
    t = 0;
    lastBoil = -1;
    dir = { x: d.x, y: d.y };
    if (!sched.length) { seed = (Math.random() * 0xffffffff) >>> 0; sched = starSchedule(seed, cfg); }
    impact.visible = false;
    setFlat(null);
  }

  // ── the stars, both sides of the shot
  function drawStars(tShot, origin, d, k) {
    const H = k * 150;   // the character's height in px (sizing.characterHeightPx)
    let n = 0;
    for (const s of sched) {
      if (n >= SV) break;
      const sc = starScale(tShot, s);
      if (sc <= 0) continue;
      const cx = origin.x + d.x * s.fwd * H - d.y * s.side * H;
      const cy = origin.y + d.y * s.fwd * H + d.x * s.side * H;
      const ax = s.size * H * sc * (s.kind ? 1 : 1);
      const ay = s.kind ? ax * 0.48 : ax;
      // a flare lies along the beam; a twinkle is upright or turned 45
      const ang = s.kind ? Math.atan2(d.y, d.x) : s.rot;
      const c = Math.cos(ang), sn = Math.sin(ang);
      const ext = Math.max(ax, ay) + 3;
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (let v = 0; v < 4; v++) {
        const [lx, ly] = corners[v];
        const px = lx * ext, py = ly * ext;
        const o = (n * 4 + v);
        sPos[o * 3] = cx + px * c - py * sn;
        sPos[o * 3 + 1] = cy + px * sn + py * c;
        sPos[o * 3 + 2] = 0;
        sShape[o * 4] = ax; sShape[o * 4 + 1] = ay; sShape[o * 4 + 2] = 1; sShape[o * 4 + 3] = s.kind;
      }
      n++;
    }
    sAttr.position.needsUpdate = true;
    sAttr.aShape.needsUpdate = true;
    starGeo.setDrawRange(0, n * 6);
    stars.visible = n > 0;
  }

  // ── CHARGE ──────────────────────────────────────────────────────────────
  function updateCharge(dt) {
    const ct = chargeTimeline(t, cfg);
    const k = charScale();
    const H = 150 * k;
    const aim = getAim();
    const mouth = getMouthDoc();
    const origin = getOriginDoc(aim);
    lv = 0; li = 0;

    if (ct.impact >= 0) {
      // THE IMPACT FRAMES replace everything else: one drawing each, held
      const body = getBodyDoc();
      const C = { x: body.x + (origin.x - body.x) * 0.5, y: body.y + (origin.y - body.y) * 0.5 };
      const R = cfg.impact.radiusMul * H;
      const u = impactMat.uniforms;
      u.uC.value.set(C.x, C.y);
      u.uExtent.value = R * 1.1;
      u.uR.value = R;
      u.uM.value.set(origin.x - C.x, origin.y - C.y);
      u.uDir.value = Math.atan2(aim.y, aim.x);
      u.uFrame.value = ct.impact;
      const fs = seed + ct.impact * 7919;
      u.uSeed.value.set(hash1(fs), hash1(fs + 1) * 10, hash1(fs + 2) * 10, hash1(fs + 3) * 10);
      const rng = mulberry32(fs >>> 0);
      const nStars = ct.impact === 1 ? 2 : 3 + Math.floor(rng() * 2);
      for (let i = 0; i < 4; i++) {
        const S = u.uStars.value[i];
        if (i >= nStars) { S.set(0, 0, 0, 0); continue; }
        const a = rng() * Math.PI * 2, r = R * (0.3 + 0.45 * rng());
        S.set(Math.cos(a) * r, Math.sin(a) * r, R * (0.05 + 0.06 * rng()), rng() < 0.5 ? 0 : Math.PI / 4);
      }
      impact.visible = true;
      setFlat(ct.impact === 1 ? P.ink : P.flash);
      orb.visible = false;
      flushLines();
      drawStars(t - cfg.chargeS, origin, aim, k);
      return;
    }
    impact.visible = false;
    setFlat(null);

    // the orb, at the mouth
    const C = cfg.charge;
    const ou = orbMat.uniforms;
    const pulse = 1 + 0.12 * Math.sin(t * 34) * ct.ball;
    const r = Math.max(2, C.ballPx * k * ct.ball * pulse);
    ou.uC.value.set(mouth.x, mouth.y);
    ou.uR.value = r;
    ou.uExtent.value = r * 4 + 6;
    ou.uOrbA.value = Math.min(1, 0.4 + ct.ball);
    ou.uHaze.value = 0.6 + 0.6 * ct.crackle;
    ou.uFlareL.value = 0;
    if (ct.boil !== lastBoil) {
      lastBoil = ct.boil;
      const rr = mulberry32((seed + ct.boil * 131) >>> 0);
      ou.uPh.value.set(rr() * 6.28, rr() * 6.28, rr() * 6.28);
      // pink crescents round the orb: arcs of a circle, roughened
      arcs = [];
      const nA = ct.crackle > 0 ? 1 + Math.round(ct.crackle * 3) : 0;
      for (let i = 0; i < nA; i++) {
        const a0 = rr() * Math.PI * 2, span = 0.9 + rr() * 1.4;
        const rad = 1.5 + rr() * 0.9;
        const pts = [];
        const m = 7;
        for (let j = 0; j <= m; j++) {
          const a = a0 + span * (j / m);
          const jr = rad * (1 + (rr() - 0.5) * 0.35);
          pts.push(Math.cos(a) * jr, Math.sin(a) * jr);
        }
        arcs.push(pts);
      }
    }
    orb.visible = true;
    for (const a of arcs) {
      const pts = new Array(a.length);
      for (let j = 0; j < a.length; j += 2) {
        pts[j] = mouth.x + a[j] * r;
        pts[j + 1] = mouth.y + a[j + 1] * r;
      }
      bolt(pts, k * (0.7 + 0.5 * ct.crackle));
    }

    // streaks of light drawn into the mouth
    const G = C.gatherCount;
    for (let i = 0; i < G; i++) {
      const ph = (t * (1.1 + 0.9 * ct.ball) + hash1(seed + i * 3.1)) % 1;
      const ang = hash1(seed + i * 7.7) * Math.PI * 2;
      const r0 = (C.gatherFromPx * k) * (1 - ph) + r * 1.2;
      const len = (14 + 22 * ct.ball) * k * (1 - ph * 0.6);
      const a = Math.sin(Math.PI * ph) * (0.5 + 0.5 * ct.ball);
      strip([mouth.x + Math.cos(ang) * (r0 + len), mouth.y + Math.sin(ang) * (r0 + len),
             mouth.x + Math.cos(ang) * r0, mouth.y + Math.sin(ang) * r0],
            2.6 * k, DEEP, a, 0);
    }

    // the dashed guide line toward where the shot will go
    if (ct.aim > 0) {
      const reach = C.aimReachPx * k * ct.aim;
      const dash = 15 * k, gap = 9 * k;
      const crawl = (t * 90 * k) % (dash + gap);
      for (let s = crawl; s < reach; s += dash + gap) {
        const s1 = Math.min(reach, s + dash);
        const fade = 1 - s / Math.max(reach, 1) * 0.6;
        strip([origin.x + aim.x * s, origin.y + aim.y * s, origin.x + aim.x * s1, origin.y + aim.y * s1],
              3.2 * k, DEEP, fade, 0, false);
      }
    }
    flushLines();
    drawStars(t - cfg.chargeS, origin, aim, k);
  }

  // ── FIRE ────────────────────────────────────────────────────────────────
  function updateFire() {
    const ft = fireTimeline(t, cfg);
    if (ft.done) {
      mode = "idle";
      hideAll();
      burn?.clear();
      return;
    }
    const k = charScale();
    const W = cfg.widthPx * k;
    const L = cfg.look;
    // the shot follows her mouth as the recoil pushes her back, so the beam
    // stays in it; the direction was fixed at the shot
    const origin = getOriginDoc(dir);
    const len = beamLength(origin, dir, getDocSize());
    const head = ft.headK * len;
    const rootHW = 0.5 * W * L.root;

    const u = beamMat.uniforms;
    u.uO.value.set(origin.x, origin.y);
    u.uD.value.set(dir.x, dir.y);
    u.uLen.value = len;
    u.uBack.value = rootHW * 1.2;
    u.uHead.value = head;
    u.uWidth.value = W;
    u.uWidthK.value = ft.widthK;
    u.uTime.value = t;
    u.uBoil.value = ft.boil;
    u.uBreak.value = ft.breakup;
    u.uAlpha.value = ft.alpha;
    u.uShell.value = ft.shell;
    beam.visible = true;

    // the shock rings
    for (let i = 0; i < rings.length; i++) {
      const rm = rings[i].material.uniforms;
      const p = (t - i * 0.08) / L.ringS;
      if (p <= 0 || p >= 1) { rings[i].visible = false; continue; }
      const e = 1 - Math.pow(1 - p, 3);
      const s = Math.min(head, 20 * k + L.ringTravelPx * k * e * (1 + i * 0.5));
      const hw = 0.5 * W * envelope(s, W, L) * Math.max(ft.widthK, 0.5);
      const b = hw * (1.2 + 0.7 * e);
      rm.uC.value.set(origin.x + dir.x * s, origin.y + dir.y * s);
      rm.uD.value.set(dir.x, dir.y);
      rm.uAB.value.set(b * 0.24, b);
      rm.uTh.value = (3.2 - 1.6 * p) * k;
      rm.uA.value = Math.pow(1 - p, 1.4);
      rings[i].visible = true;
    }

    // the white-hot point at the origin
    const ou = orbMat.uniforms;
    const r = rootHW * 2.7 * Math.max(0.4, ft.widthK) * (0.55 + 0.45 * ft.alpha);
    ou.uC.value.set(origin.x, origin.y);
    ou.uR.value = r;
    ou.uExtent.value = r * 4 + 6;
    ou.uOrbA.value = ft.alpha;
    ou.uHaze.value = 1.5;
    ou.uFlareL.value = 0;
    orb.visible = true;

    // the lightning: a new drawing twelve times a second, kept in the BEAM's
    // frame so it rides the beam if the origin moves
    lv = 0; li = 0;
    if (ft.boil !== lastBoil) {
      lastBoil = ft.boil;
      const rr = mulberry32((seed + 977 + ft.boil * 613) >>> 0);
      ou.uPh.value.set(rr() * 6.28, rr() * 6.28, rr() * 6.28);
      arcs = [];
      const live = 1 - ft.breakup;
      const reachable = Math.min(head, 1500 * k);
      const nWrap = Math.round((2 + rr() * 2) * live);
      for (let i = 0; i < nWrap && reachable > W; i++) {
        const segLen = W * (2.2 + rr() * 3);
        const s0 = W * 0.3 + rr() * Math.max(1, reachable - segLen - W * 0.3);
        const hw = 0.5 * W * envelope(s0 + segLen / 2, W, L);
        arcs.push(wrapArc(rr, s0, segLen, hw, 0.6 + rr() * 1.2, 4));
      }
      // the crown of crackle round the origin (the white star of bolts behind
      // cmzw's muzzle): short bolts thrown back and out
      const nCrown = Math.round((4 + rr() * 3) * live);
      for (let i = 0; i < nCrown; i++) {
        const a = Math.PI + (rr() - 0.5) * Math.PI * 1.5;
        const l = W * (0.35 + rr() * 0.55);
        arcs.push(jaggedPath(rr, 0, 0, Math.cos(a) * l, Math.sin(a) * l, 3, 0.28));
      }
    }
    const px = -dir.y, py = dir.x;
    for (const a of arcs) {
      const pts = new Array(a.length);
      for (let j = 0; j < a.length; j += 2) {
        pts[j] = origin.x + dir.x * a[j] + px * a[j + 1];
        pts[j + 1] = origin.y + dir.y * a[j] + py * a[j + 1];
      }
      // the lightning goes out first: a bolt with no beam under it is a stray
      bolt(pts, k, ft.alpha * (1 - ft.breakup) * (1 - ft.breakup));
    }
    flushLines();
    drawStars(t, origin, dir, k);

    // THE PAPER UNDER IT (site/pressgl.js). Handed over in document px; the
    // deck converts to the plate's design px.
    burn?.set({
      x: origin.x, y: origin.y, dx: dir.x, dy: dir.y,
      reach: head, width: W, open: ft.open,
      env: L, widthMul: cfg.erosion.widthMul, muzzleMul: cfg.erosion.muzzleMul,
      seed: (seed % 997) / 997
    });
  }

  function update(dt) {
    if (mode === "idle") return;
    t += dt;
    if (mode === "charge") updateCharge(dt);
    else updateFire();
  }

  return {
    startCharge, fire, update,
    /** upload the noise tile ahead of the first shot (mew.js, at load) */
    warm(renderer) { renderer.initTexture?.(noise); },
    get mode() { return mode; },
    /** anything to draw this frame -- mew.js skips both scenes when not */
    get active() { return mode !== "idle"; }
  };
}
