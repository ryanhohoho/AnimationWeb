// beam.js
// the hyper beam look, per the references: a blinding white core wrapped in
// pink/magenta and cyan fringes with yellow hints, all soft-edged and
// additive so overlapping layers bloom to white. built from layered planes
// with runtime canvas gradients -- no postprocessing needed.
// everything lives in the doc-anchored fx group, in document pixels, so the
// beam stays nailed to the page while the user scrolls.

import * as THREE from "three";

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

export function createBeamFx({ docFxGroup, config, getMouthDoc }) {
  // ---------------------------------------------------------------- textures
  const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,230,250,0.85)");
    g.addColorStop(0.55, "rgba(255,140,225,0.35)");
    g.addColorStop(0.8, "rgba(150,200,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // across-the-beam gradient: magenta -> yellow -> white core -> yellow -> cyan
  const chromaTex = canvasTexture(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, "rgba(255,60,200,0)");
    g.addColorStop(0.12, "rgba(255,80,210,0.55)");
    g.addColorStop(0.28, "rgba(255,190,120,0.75)");
    g.addColorStop(0.38, "rgba(255,245,180,0.95)");
    g.addColorStop(0.5, "rgba(255,255,255,1)");
    g.addColorStop(0.62, "rgba(235,255,200,0.95)");
    g.addColorStop(0.72, "rgba(140,240,230,0.8)");
    g.addColorStop(0.88, "rgba(70,215,255,0.55)");
    g.addColorStop(1.0, "rgba(60,200,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const coreTex = canvasTexture(4, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.28, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(255,255,255,1)");
    g.addColorStop(0.72, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const streakTex = canvasTexture(512, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const y = Math.random() * h;
      const x = Math.random() * w;
      const lw = 30 + Math.random() * 150;
      const grad = ctx.createLinearGradient(x, 0, x + lw, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, `rgba(255,255,255,${0.15 + Math.random() * 0.3})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, lw, 1.5 + Math.random() * 2.5);
    }
  });
  streakTex.wrapS = THREE.RepeatWrapping;

  // ---------------------------------------------------------------- meshes
  function additiveMat(map, opacity, color = 0xffffff) {
    return new THREE.MeshBasicMaterial({
      map, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false,
      side: THREE.DoubleSide
    });
  }

  const beamGroup = new THREE.Group();
  beamGroup.visible = false;
  beamGroup.renderOrder = 950;
  docFxGroup.add(beamGroup);

  // unit plane anchored at its left edge, scaled to (length, width) per layer
  const unit = new THREE.PlaneGeometry(1, 1);
  unit.translate(0.5, 0, 0);

  const layers = {
    glow: new THREE.Mesh(unit, additiveMat(glowTex, 0.45, 0xff9be0)),
    chroma: new THREE.Mesh(unit, additiveMat(chromaTex, 0.95)),
    streaks: new THREE.Mesh(unit, additiveMat(streakTex, 0.55)),
    core: new THREE.Mesh(unit, additiveMat(coreTex, 1))
  };
  const widthMul = { glow: 3.6, chroma: 2.0, streaks: 1.4, core: 0.85 };
  let order = 951;
  for (const key of ["glow", "chroma", "streaks", "core"]) {
    layers[key].renderOrder = order++;
    beamGroup.add(layers[key]);
  }

  const flare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false
  }));
  flare.renderOrder = 960;
  docFxGroup.add(flare);
  flare.visible = false;

  // charge glow + inward-spiraling sparks
  const chargeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false
  }));
  chargeGlow.renderOrder = 960;
  chargeGlow.visible = false;
  docFxGroup.add(chargeGlow);

  const SPARKS = 12;
  const sparks = [];
  for (let i = 0; i < SPARKS; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false,
      color: i % 3 === 0 ? 0x9be8ff : 0xffb3e6
    }));
    s.visible = false;
    s.renderOrder = 959;
    s.userData = { angle: (i / SPARKS) * Math.PI * 2, speed: 2.5 + (i % 4) * 0.8 };
    docFxGroup.add(s);
    sparks.push(s);
  }

  // ---------------------------------------------------------------- state
  let mode = "idle"; // idle | charge | fire
  let t = 0;
  let beamLen = 0;

  function startCharge() {
    mode = "charge";
    t = 0;
    chargeGlow.visible = true;
    for (const s of sparks) s.visible = true;
  }

  function fire(originDoc, dir, len) {
    mode = "fire";
    t = 0;
    beamLen = len;
    beamGroup.position.set(originDoc.x, originDoc.y, 1);
    beamGroup.rotation.z = Math.atan2(dir.y, dir.x);
    beamGroup.visible = true;
    flare.visible = true;
    flare.position.set(originDoc.x, originDoc.y, 1.5);
    chargeGlow.visible = false;
    for (const s of sparks) s.visible = false;
  }

  function update(dt, time) {
    if (mode === "idle") return;
    t += dt;
    const atk = config;

    if (mode === "charge") {
      const k = Math.min(t / atk.chargeS, 1);
      const m = getMouthDoc();
      const pulse = 1 + 0.16 * Math.sin(time * 30) + 0.08 * Math.sin(time * 47);
      const size = (8 + 48 * k * k) * pulse;
      chargeGlow.position.set(m.x, m.y, 1.5);
      chargeGlow.scale.set(size, size, 1);
      chargeGlow.material.opacity = 0.5 + 0.5 * k;
      for (const s of sparks) {
        const u = s.userData;
        u.angle += dt * u.speed * (1 + k * 2);
        const r = (1 - k) * 85 + 8;
        s.position.set(
          m.x + Math.cos(u.angle) * r,
          m.y + Math.sin(u.angle) * r * 0.75,
          1.4
        );
        const ss = 4 + 7 * k + 3 * Math.sin(time * 21 + u.angle);
        s.scale.set(ss, ss, 1);
        s.material.opacity = 0.35 + 0.6 * k;
      }
      return;
    }

    // fire envelope: expand -> sustain -> fade
    const { expandS, sustainS, fadeS, widthPx } = atk;
    let widthK, opacityK;
    if (t < expandS) {
      widthK = 0.04 + 0.96 * easeOutCubic(t / expandS);
      opacityK = 1;
    } else if (t < expandS + sustainS) {
      widthK = 1 + 0.05 * Math.sin(time * 40) + 0.03 * Math.sin(time * 61);
      opacityK = 1;
    } else if (t < expandS + sustainS + fadeS) {
      const f = (t - expandS - sustainS) / fadeS;
      widthK = 1 + 0.45 * f;
      opacityK = 1 - easeOutCubic(f);
    } else {
      mode = "idle";
      beamGroup.visible = false;
      flare.visible = false;
      return;
    }

    for (const key of Object.keys(layers)) {
      const mesh = layers[key];
      mesh.scale.set(beamLen, widthPx * widthMul[key] * widthK, 1);
      mesh.material.opacity = opacityK * { glow: 0.45, chroma: 0.95, streaks: 0.55, core: 1 }[key];
    }
    streakTex.repeat.set(beamLen / 420, 1);
    streakTex.offset.x -= dt * 3.2;

    const fs = widthPx * (2.3 + 0.4 * Math.sin(time * 33)) * widthK;
    flare.scale.set(fs, fs, 1);
    flare.material.opacity = opacityK;
  }

  return { startCharge, fire, update, get mode() { return mode; } };
}
