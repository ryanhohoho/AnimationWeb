// binder.js — HIS POKEMON CARDS, IN A BINDER DRAWN THE WAY MEW IS DRAWN
//
// The About card's last section (by instruction, 2026-10-04): a small 3D
// binder that rests with its face leaning toward the top right of the window,
// pivots in place under a drag and swings back when let go, and opens to be
// paged through, sleeve by sleeve. Each page is one of his photographs of a
// nine-pocket sheet (src/assets/photos/binder/, the folder is the list).
//
// DRAWN LIKE HER, LITERALLY. The board, the spine and the rings go through the
// same pixel pass she does (engine/fx/pixelate.js, with presentation.pixelate
// read as it is): a quarter-resolution render, posterised, with her plum ink
// line round every silhouette; and their light is banded the way her material
// bands it (presentation.spriteShade's bands, floor, gain and the cool-shadow
// / warm-light tints). The cover is the press's rose with a cerulean window on
// it and her in it, from the tab icon's own 32x32 grid (identity.js).
//
// ...BUT THE CARDS ARE NOT PIXELATED, because they are the point: a nine-pocket
// page at a quarter resolution is nine smudges. So the frame is drawn twice
// over the same canvas: the pixel pass first (the sleeves are in it, as plain
// white sheets, so they get the ink line too), then the sleeves again at full
// resolution with their photographs, depth-tested against the board -- which
// is redrawn into the depth buffer only, at full resolution, for exactly that.
// The board hides a page where it should and nothing else is drawn twice.
//
// WHAT IT COSTS. Nothing at rest: it draws a frame only while something is
// moving (a drag, the swing back, a turn, the camera easing between closed and
// open) or a picture has arrived, and never off screen. Only the sleeves either
// side of the open spread hold a texture (binderModel.sheetsNear); the rest are
// released. ONE renderer for the session, its canvas moved into each visit's
// page and out again: a WebGLRenderer thrown away leaks a GPU context the
// browser only reclaims by killing an older one (mew.js says the same).

import * as THREE from "three";
import { rigConfig } from "../config/rigConfig.js";
import { createPixelate } from "../engine/fx/pixelate.js";
import { GLSL_SPRITE_SHADE } from "../engine/fx/presentMath.js";
import { Spring, expDamp } from "../utils/math.js";
import { reducedMotion } from "../utils/motion.js";
import { ICON } from "./identity.js";
import { copyFor } from "./photoassets.js";
import {
  lastPos, clampPos, targets, sidesOf, sheetsNear, stackZ,
  sleeveAt, lagAt, easeTurn, spineDepth, pagesFor, spineAngle, ringX
} from "./binderModel.js";

const B = rigConfig.binder;
const PX = rigConfig.presentation.pixelate;
const SH = rigConfig.presentation.spriteShade;
const SEG = 12;                       // a sleeve's segments along its length

// ── THE MATERIALS ────────────────────────────────────────────────────────
const TOON_V = /* glsl */ `
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// her banding, on a board: the light cut into flat sections, shadows cool,
// lights warm (engine/fx/spriteShade.js has the argument). Linear out; the
// pixel pass encodes it.
const TOON_F = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uLight;
  uniform float uAmbient;
  uniform float uBands, uFloor, uGain;
  uniform vec3 uShadowTint, uLightTint;
  varying vec3 vN;
  varying vec2 vUv;
  ${GLSL_SPRITE_SHADE}
  void main() {
    vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 albedo = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uColor;
    float key = max(dot(n, normalize(uLight)), 0.0);
    float sky = 0.5 + 0.5 * n.y;
    float lum = uAmbient * (0.7 + 0.3 * sky) + (1.0 - uAmbient) * key;
    float q = shadeBand(lum, uBands, uFloor, uGain);
    vec3 tint = mix(uShadowTint, uLightTint, q);
    gl_FragColor = vec4(albedo * q * tint, 1.0);
  }
`;
// a sleeve at full resolution: its photograph, front or back by which face is
// toward the camera, lit just enough to read as turning. The photographs are
// sampled as stored (sRGB) and written as they are -- an unlit picture has no
// business going through linear light and back. A side with no photograph is
// a sheet of nine empty pockets.
const PAGE_V = /* glsl */ `
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const PAGE_F = /* glsl */ `
  uniform sampler2D uFront, uBack;
  uniform float uHasFront, uHasBack;
  uniform vec3 uLight;
  varying vec3 vN;
  varying vec2 vUv;
  vec3 pockets(vec2 uv) {
    vec2 g = abs(fract(uv * 3.0) - 0.5);
    float line = step(0.465, max(g.x, g.y));
    return mix(vec3(0.95, 0.95, 0.94), vec3(0.78, 0.78, 0.8), line);
  }
  void main() {
    bool front = gl_FrontFacing;
    vec2 uv = front ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 c = front
      ? (uHasFront > 0.5 ? texture2D(uFront, uv).rgb : pockets(uv))
      : (uHasBack > 0.5 ? texture2D(uBack, uv).rgb : pockets(uv));
    vec3 n = normalize(vN) * (front ? 1.0 : -1.0);
    float l = 0.86 + 0.14 * max(dot(n, normalize(uLight)), 0.0);
    gl_FragColor = vec4(c * l, 1.0);
  }
`;

const lin = (hex) => new THREE.Color(hex);       // ColorManagement: stored linear

// ── THE OWNER'S COLOURS ──────────────────────────────────────────────────
// Six :root tokens in styles/site.css, changed in the editor. Read when the
// binder is mounted and again whenever the root's style changes, which is how
// the editor previews a colour (the same arrangement as FIG. 2's backlight,
// glow.js). On the published site nothing writes that attribute.
export const BINDER_TOKENS = { board: "--binder-board", spine: "--binder-spine", lining: "--binder-lining",
                               rings: "--binder-rings", window: "--binder-window", mew: "--binder-mew" };
function readColours() {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const [k, tok] of Object.entries(BINDER_TOKENS)) {
    const v = cs.getPropertyValue(tok).trim();
    out[k] = /^#[0-9a-f]{6}$/i.test(v) ? v : "#999999";
  }
  return out;
}
function toon(hex, map = null) {
  return new THREE.ShaderMaterial({
    vertexShader: TOON_V, fragmentShader: TOON_F, side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: lin(hex) }, uMap: { value: map }, uHasMap: { value: map ? 1 : 0 },
      uLight: { value: new THREE.Vector3(...B.light) }, uAmbient: { value: B.ambient },
      uBands: { value: SH.bands }, uFloor: { value: SH.shadeFloor }, uGain: { value: SH.shadeGain },
      uShadowTint: { value: new THREE.Vector3(...SH.shadowTint) }, uLightTint: { value: new THREE.Vector3(...SH.lightTint) }
    }
  });
}

// ── THE COVER'S FACE: HER, IN A WINDOW ON THE BOARD ──────────────────────
// Drawn on a canvas a whole number of cells to her grid, nearest-neighbour all
// the way: she is pixel art, and smoothing greys her edge (identity.js says so
// of the card). The window is the site's idea -- a hole in the stock, sky
// behind -- and her ink line is a one-cell dilation of her own silhouette.
function drawCover(cv, w, h, col) {
  const cell = 3, grid = ICON.grid || [];
  const G = grid.length || 32;
  const H = 168;                            // 56 cells of 3: her 32 and the board round her
  cv.width = Math.round((w / h) * H); cv.height = H;
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = col.board; g.fillRect(0, 0, cv.width, H);
  // the window, centred a little above the middle, as a badge sits on a binder
  const box = (G + 6) * cell, bx = Math.round((cv.width - box) / 2), by = Math.round(H * 0.42 - box / 2);
  g.fillStyle = PX.outlineColor; g.fillRect(bx - cell, by - cell, box + 2 * cell, box + 2 * cell);
  g.fillStyle = col.window; g.fillRect(bx, by, box, box);
  const on = (x, y) => y >= 0 && y < G && x >= 0 && x < G && grid[y][x] === "#";
  const ox = bx + 3 * cell, oy = by + 3 * cell;
  g.fillStyle = PX.outlineColor;
  for (let y = -1; y <= G; y++) for (let x = -1; x <= G; x++) {
    if (on(x, y)) continue;
    if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
  }
  g.fillStyle = col.mew;
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (on(x, y)) g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
  // a label strip low on the board, the way a binder has one: blank, it is a
  // binder and not a product
  g.fillStyle = col.lining; g.fillRect(Math.round(cv.width * 0.3), Math.round(H * 0.8), Math.round(cv.width * 0.4), 2 * cell);
}
function coverTexture(w, h, col) {
  const cv = document.createElement("canvas");
  drawCover(cv, w, h, col);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

// ── ONE RENDERER FOR THE SESSION ─────────────────────────────────────────
let shared = null;
function ensureShared() {
  if (shared) return shared;
  const canvas = document.createElement("canvas");
  canvas.className = "bd-cv";
  canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  const pix = createPixelate({ renderer, config: PX });
  shared = { canvas, renderer, pix, scenes: null };
  return shared;
}

// ── THE MODEL ────────────────────────────────────────────────────────────
function buildModel(S, col) {
  const W = B.pageW, H = B.pageH;
  // closed, the rings' middle is at the hinge (x = 0) and a sleeve runs from
  // ringGap to ringGap + W, so the board is that and one overhang: the same
  // overhang the top and the foot have
  const CW = W + B.ringGap + B.coverPad, CH = H + 2 * B.coverPad, CT = B.coverT;
  const D = spineDepth(S, B.sheetDz, B.spineMin);
  const body = new THREE.Scene();       // the pixel pass: board, spine, rings, plain sleeves
  const pages = new THREE.Scene();      // the full-resolution sleeves
  const pivot = new THREE.Group();      // the turn and the lean, about its own middle
  const inner = new THREE.Group();      // the binder, offset so its middle is the pivot's
  const pivotP = new THREE.Group(), innerP = new THREE.Group();
  body.add(pivot); pivot.add(inner);
  pages.add(pivotP); pivotP.add(innerP);

  // a board: x from its hinge, the face (+z) is its outside
  const boardGeo = new THREE.BoxGeometry(CW, CH, CT);
  boardGeo.translate(CW / 2, 0, CT / 2);
  // ONE material per colour, shared, so a colour change is five uniforms
  const mats = { spine: toon(col.spine), lining: toon(col.lining), board: toon(col.board), rings: toon(col.rings),
                 face: toon(col.board, coverTexture(CW, CH, col)) };
  const coverMats = [mats.spine, mats.spine, mats.spine, mats.spine, mats.face, mats.lining];
  const backMats = [mats.spine, mats.spine, mats.spine, mats.spine, mats.lining, mats.board];
  // the back board lies under the pages, x 0..CW, its lining (+z) at z = 0
  // and its outside facing down
  const back = new THREE.Mesh(boardGeo.clone().translate(0, 0, -CT), backMats);
  inner.add(back);
  const spineGeo = new THREE.BoxGeometry(D, CH, CT);
  // its thickness on +z locally: turned flat (rotation.y = -PI) that lands
  // UNDER the boards' top face, level with them; on -z it stood up through
  // the turned pages
  spineGeo.translate(D / 2, 0, CT / 2);
  const spine = new THREE.Mesh(spineGeo, mats.spine);
  inner.add(spine);
  const front = new THREE.Mesh(boardGeo, coverMats);
  inner.add(front);
  // the rings, on the spine's middle (binderModel.ringX says why), so they
  // are the spine's children and turn with it: the spine's inside face is its
  // local z = 0 and inward is its local -z, so the half-rings arch that way
  const ringR = D * 0.42;
  const ringGeo = new THREE.TorusGeometry(ringR, 0.011, 6, 14, Math.PI);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = mats.rings;
  for (const y of [-H * 0.36, 0, H * 0.36]) {
    const r = new THREE.Mesh(ringGeo, ringMat);
    r.position.set(D / 2, y, 0);
    spine.add(r);
  }

  // the sleeves: one geometry each, shared by its plain twin and its picture
  const sleeveMat = toon(B.sleeve);
  const sheets = [];
  for (let s = 0; s < S; s++) {
    const geo = new THREE.PlaneGeometry(W, H, SEG, 1);
    const plain = new THREE.Mesh(geo, sleeveMat);
    const mat = new THREE.ShaderMaterial({
      vertexShader: PAGE_V, fragmentShader: PAGE_F, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
      uniforms: {
        uFront: { value: null }, uBack: { value: null }, uHasFront: { value: 0 }, uHasBack: { value: 0 },
        uLight: { value: new THREE.Vector3(...B.light) }
      }
    });
    const pic = new THREE.Mesh(geo, mat);
    inner.add(plain); innerP.add(pic);
    sheets.push({ s, geo, plain, pic, mat, a: 0, from: 0, to: 0, t0: 0, dur: 0, dir: 0, tex: { front: null, back: null } });
  }
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  return { S, W, H, CW, CH, CT, D, hx: 0, body, pages, mats, pivot, inner, pivotP, innerP, front, spine, sheets, depthOnly,
           cover: { a: 0, from: 0, to: 0, t0: 0, dur: 0 } };
}

/** the owner's colours onto the materials and the cover's face */
function recolour(m, col) {
  for (const k of ["spine", "lining", "board", "rings"]) m.mats[k].uniforms.uColor.value.set(col[k]);
  const t = m.mats.face.uniforms.uMap.value;
  drawCover(t.image, m.CW, m.CH, col);
  t.needsUpdate = true;
}

// lay the boards and every sleeve at their current angles
function pose(m) {
  const c = m.cover.a / Math.PI;                           // 0 closed .. 1 open
  // the spine stands while the cover lifts, and lies down as it comes over
  const sig = spineAngle(c);
  m.spine.rotation.y = -sig;
  const tx = m.D * Math.cos(sig), tz = m.D * Math.sin(sig);
  m.front.position.set(tx, 0, tz);
  m.front.rotation.y = -m.cover.a;
  // the sleeves hang from the rings, which ride on the spine
  m.hx = ringX(sig, m.D);
  const base = 0.004;
  for (const sh of m.sheets) {
    const z = stackZ(sh.s, sh.a, m.S, base, B.sheetDz);
    const prog = sh.dur ? (performance.now() - sh.t0) / (sh.dur * 1000) : 1;
    const pts = sleeveAt(sh.a, lagAt(prog, B.bend, sh.dir), m.W, SEG, m.hx, B.ringGap);
    const pos = sh.geo.attributes.position;
    // PlaneGeometry(W, H, SEG, 1): two rows of SEG + 1, top row first
    for (let row = 0; row < 2; row++) {
      const y = row === 0 ? m.H / 2 : -m.H / 2;
      for (let i = 0; i <= SEG; i++) {
        const [x, zz] = pts[i];
        pos.setXYZ(row * (SEG + 1) + i, x, y, z + zz);
      }
    }
    pos.needsUpdate = true;
    sh.geo.computeVertexNormals();
    sh.geo.computeBoundingSphere();
  }
}

// ── MOUNTED ON THE PAGE ──────────────────────────────────────────────────
export function mountBinder(host, photos, ctx) {
  // the sides of the sheets, in order, null where a side has no photograph
  const list = pagesFor(photos);
  const stage = host.querySelector(".bd-stage");
  const btns = [...host.querySelectorAll(".bd-b")];
  const sh = stage && ensureShared();
  if (!sh) { host.classList.add("is-flat"); flatBook(host, list, ctx); return; }
  // a binder with nothing in it is one sheet of empty pockets
  const { renderer, pix, canvas } = sh;
  const S = Math.max(1, list.length / 2);
  let col = readColours();
  if (!sh.scenes || sh.scenes.S !== S) sh.scenes = buildModel(S, col);
  const m = sh.scenes;
  recolour(m, col);
  stage.append(canvas);
  host.classList.add("is-3d");
  const sig = ctx.scope?.signal;

  // a new visit starts closed and at rest
  let pos = 0;
  m.cover.a = m.cover.from = m.cover.to = 0; m.cover.dur = 0;
  for (const s of m.sheets) { s.a = s.from = s.to = 0; s.dur = 0; s.dir = 0; }
  const yaw = new Spring(0, B.springOmega, B.springZeta), pitch = new Spring(0, B.springOmega, B.springZeta);
  let dYaw = 0, dPitch = 0, drag = null, camZ = 0, open = 0;
  const camera = new THREE.PerspectiveCamera(B.fovDeg, 1, 0.05, 50);
  let w = 0, h = 0;

  // ── THE PICTURES: only the sleeves near the open spread hold one ──────
  const loader = new THREE.TextureLoader();
  const cache = new Map();                   // photo index -> texture (or a promise)
  const want = () => {
    const near = new Set();
    for (const s of sheetsNear(pos, S)) { const d = sidesOf(s, list); if (d.front >= 0) near.add(d.front); if (d.back >= 0) near.add(d.back); }
    // closed, the first page is the next thing seen
    if (pos === 0 && list[0]) near.add(0);
    for (const [k, t] of cache) if (!near.has(k)) { if (t?.dispose) t.dispose(); cache.delete(k); }
    const edge = h * Math.min(2, devicePixelRatio || 1) > 640 ? 1280 : 640;
    for (const k of near) {
      if (cache.has(k)) continue;
      cache.set(k, "loading");
      loader.load(copyFor(list[k], edge), (t) => {
        if (cache.get(k) !== "loading" || ctx.scope?.disposed) { t.dispose(); return; }
        t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        cache.set(k, t);
        bindTex();
        kick();
      }, undefined, () => cache.delete(k));
    }
    bindTex();
  };
  const bindTex = () => {
    for (const s of m.sheets) {
      const d = sidesOf(s.s, list);
      const f = d.front >= 0 ? cache.get(d.front) : null, b = d.back >= 0 ? cache.get(d.back) : null;
      s.mat.uniforms.uFront.value = f?.isTexture ? f : null; s.mat.uniforms.uHasFront.value = f?.isTexture ? 1 : 0;
      s.mat.uniforms.uBack.value = b?.isTexture ? b : null; s.mat.uniforms.uHasBack.value = b?.isTexture ? 1 : 0;
    }
  };

  // ── TURNING ───────────────────────────────────────────────────────────
  function go(p) {
    const np = clampPos(p, S);
    if (np === pos) return;
    const now = performance.now();
    const tg = targets(np, S);
    const start = (o, to, dur, dir) => {
      if (o.to === to) return;
      o.from = o.a; o.to = to; o.t0 = now; o.dur = reducedMotion ? 0 : dur; o.dir = dir;
      if (!o.dur) o.a = to;
    };
    start(m.cover, tg.cover, B.coverS, Math.sign(tg.cover - m.cover.a));
    for (const s of m.sheets) start(s, tg.sheets[s.s], B.flipS, Math.sign(tg.sheets[s.s] - s.a));
    pos = np;
    label();
    want();
    kick();
  }
  const label = () => {
    const [prev, next] = btns;
    if (prev) { prev.disabled = pos === 0; prev.setAttribute("aria-label", pos === 1 ? "Close the binder" : "Previous page"); }
    if (next) { next.disabled = pos === lastPos(S); next.setAttribute("aria-label", pos === 0 ? "Open the binder" : "Next page"); }
  };

  // ── THE FRAME ─────────────────────────────────────────────────────────
  let raf = 0, last = 0, seen = true;
  const advance = (o, now) => {
    if (!o.dur) { o.a = o.to; return false; }
    const t = (now - o.t0) / (o.dur * 1000);
    if (t >= 1) { o.a = o.to; o.dur = 0; o.dir = 0; return false; }
    o.a = o.from + (o.to - o.from) * easeTurn(t);
    return true;
  };
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    let busy = advance(m.cover, now);
    for (const s of m.sheets) busy = advance(s, now) || busy;
    pose(m);

    // the lean, and the drag on top of it, swinging back when let go
    open = m.cover.a / Math.PI;
    const lean = 1 - (1 - B.openLean) * open;
    if (drag) { yaw.x = dYaw; pitch.x = dPitch; yaw.v = pitch.v = 0; }
    else if (reducedMotion) { yaw.reset(0); pitch.reset(0); }
    else { yaw.step(0, dt); pitch.step(0, dt); }
    const y = B.restYaw * lean + yaw.x, x = B.restPitch * lean + pitch.x;
    for (const p of [m.pivot, m.pivotP]) p.rotation.set(x, y, B.restRoll * lean);
    // its middle is the pivot's: the cover's middle closed, the spread's open
    const cx = (m.CW / 2) * (1 - open) + (-m.D / 2) * open;
    const cz = (m.D / 2) * (1 - open);
    for (const g of [m.inner, m.innerP]) g.position.set(-cx, 0, -cz);

    // the camera stands back far enough for the closed binder, and only
    // openZoom of the further way for the open one (rigConfig says why)
    const tan = Math.tan((B.fovDeg * Math.PI) / 360), halfH = m.CH / 2;
    const fitW = (halfW) => Math.max(halfH / tan, halfW / (tan * camera.aspect)) * B.fitMargin + m.D;
    const shut = fitW(m.CW / 2);
    const need = shut + (fitW(m.CW + m.D / 2) - shut) * open * B.openZoom;
    camZ = camZ ? expDamp(camZ, need, 8, dt) : need;
    camera.position.set(0, 0, camZ);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    draw();
    const settling = drag || busy || Math.abs(yaw.x) + Math.abs(yaw.v) + Math.abs(pitch.x) + Math.abs(pitch.v) > 1e-4
      || Math.abs(camZ - need) > 1e-4;
    if (settling && seen && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  const kick = () => { if (!raf && seen) raf = requestAnimationFrame(frame); };

  function draw() {
    if (!w || !h) return;
    // the pixel pass: the board, the spine, the rings and the plain sleeves
    pix.render(m.body, camera);
    // ...then the sleeves' photographs at full resolution, behind the board
    // where the board is in front of them
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    m.body.overrideMaterial = m.depthOnly;
    renderer.render(m.body, camera);
    m.body.overrideMaterial = null;
    renderer.render(m.pages, camera);
    renderer.autoClear = ac;
  }

  // ── SIZE ──────────────────────────────────────────────────────────────
  const fit = () => {
    const r = stage.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    pix.resize(w, h);
    camera.aspect = w / h;
    camZ = 0;
    want();
    kick();
  };
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
  ro?.observe(stage);
  fit();

  // ── HANDS ─────────────────────────────────────────────────────────────
  // A drag turns it in place; a press that did not drag turns a page -- on the
  // right of the spine forward, on the left back -- or opens it when closed.
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    drag = { x: e.clientX, y: e.clientY, y0: yaw.x, p0: pitch.x, id: e.pointerId, moved: false };
    dYaw = yaw.x; dPitch = pitch.x;
    try { stage.setPointerCapture(e.pointerId); } catch { /* gone */ }
  }, { signal: sig });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    const lim = (v, m2) => m2 * Math.tanh(v / m2);       // soft: no wall to hit
    dYaw = lim(drag.y0 + dx * B.dragRad, B.maxYaw);
    dPitch = lim(drag.p0 + dy * B.dragRad, B.maxPitch);
    kick();
  }, { signal: sig });
  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const was = drag;
    drag = null;
    if (!was.moved && e?.type === "pointerup") press(e);
    kick();
  };
  stage.addEventListener("pointerup", release, { signal: sig });
  stage.addEventListener("pointercancel", release, { signal: sig });
  function press(e) {
    if (pos === 0) { go(1); return; }
    // which side of the spine: the rings' own place on the screen
    const v = new THREE.Vector3(m.hx, 0, 0);
    m.inner.updateMatrixWorld(true);
    v.applyMatrix4(m.inner.matrixWorld).project(camera);
    const r = stage.getBoundingClientRect();
    const sx = ((v.x + 1) / 2) * r.width;
    go(pos + (e.clientX - r.left >= sx ? 1 : -1));
  }
  for (const b of btns) b.addEventListener("click", () => go(pos + Number(b.dataset.step)), { signal: sig });
  stage.addEventListener("keydown", (e) => {
    let d = 0;
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") d = 1;
    else if (e.key === "ArrowLeft") d = -1;
    if (!d) return;
    e.preventDefault();
    go(pos + d);
  }, { signal: sig });

  const io = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((es) => { seen = es[0]?.isIntersecting ?? true; if (seen) kick(); }) : null;
  io?.observe(stage);
  const onVis = () => { if (!document.hidden) kick(); };
  // the editor previews a colour on the root's style: follow it
  const mo = typeof MutationObserver === "function" ? new MutationObserver(() => {
    const next = readColours();
    if (JSON.stringify(next) === JSON.stringify(col)) return;
    col = next; recolour(m, col); last = 0;
    if (!raf) { raf = requestAnimationFrame(frame); }
  }) : null;
  mo?.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  document.addEventListener("visibilitychange", onVis, { signal: sig });

  // compiled now, so the first turn is not the frame that builds the programs
  renderer.compileAsync?.(m.body, camera).catch(() => {});
  renderer.compileAsync?.(m.pages, camera).catch(() => {});
  label();

  ctx.scope?.add(() => {
    cancelAnimationFrame(raf);
    ro?.disconnect(); io?.disconnect(); mo?.disconnect();
    for (const t of cache.values()) if (t?.dispose) t.dispose();
    cache.clear();
    bindTex();
    canvas.remove();
  });
}

// ── WITHOUT WEBGL: THE SAME PAGES, AS PICTURES ───────────────────────────
// No model and no turn, but the binder is still there to page through: the
// open spread as two photographs, and the same two buttons.
function flatBook(host, list, ctx) {
  const stage = host.querySelector(".bd-stage");
  const btns = [...host.querySelectorAll(".bd-b")];
  if (!stage) return;
  const S = Math.max(1, list.length / 2);
  let pos = 1;
  const show = () => {
    const t = pos - 1;
    const left = t > 0 ? sidesOf(t - 1, list).back : -1;
    const right = t < S ? sidesOf(t, list).front : -1;
    stage.innerHTML = [left, right].map((k) => k >= 0
      ? `<img class="bd-flat" src="${copyFor(list[k], 640)}" alt="A page of Pokemon cards" />`
      : `<span class="bd-flat is-empty"></span>`).join("");
    btns[0].disabled = pos <= 1; btns[1].disabled = pos >= lastPos(S);
  };
  for (const b of btns) b.addEventListener("click", () => { pos = Math.max(1, Math.min(lastPos(S), pos + Number(b.dataset.step))); show(); }, { signal: ctx.scope?.signal });
  show();
}
