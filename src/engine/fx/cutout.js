// cutout.js
// presentation pass: mew becomes a HOLE in the page.
//
// the scene renders into an offscreen target exactly as usual, but only its
// ALPHA is used -- as a stencil. inside the silhouette we draw a stationary
// background image (png or animated gif); outside it we discard, so the site
// shows through. the image is pinned to the viewport (or to the document), so
// as mew swims around, the picture behind the page is revealed in the shape of
// wherever it happens to be. exactly the BSOD-silhouette look in the refs.
//
// cost: one extra fullscreen pass. the scene colors are never even read, so
// the fragment work is a handful of alpha taps plus one image sample.

import * as THREE from "three";
import { coverFit, scrollUvOffset } from "./presentMath.js";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D mask;      // scene render target: only .a matters
  uniform sampler2D overlay;   // the stationary picture behind the page
  uniform vec2 texel;          // 1 / mask size
  uniform vec2 uvScale;        // cover-fit scale around the uv center
  uniform vec2 uvOffset;       // scroll / pan slide
  uniform vec2 feather;        // edge softening radius, in mask texels
  uniform float edgeLo;        // smoothstep window on the blurred alpha
  uniform float edgeHi;
  uniform float opacity;
  uniform float rimOn;
  uniform float rimWidth;
  uniform vec3 rimColor;
  varying vec2 vUv;

  // 9-tap box on alpha only. a hard silhouette edge sampled at one point
  // aliases badly; averaging first is what buys the soft border.
  float softAlpha(vec2 uv, vec2 r) {
    float a = texture2D(mask, uv).a * 4.0;
    a += texture2D(mask, uv + vec2( r.x, 0.0)).a * 2.0;
    a += texture2D(mask, uv + vec2(-r.x, 0.0)).a * 2.0;
    a += texture2D(mask, uv + vec2(0.0,  r.y)).a * 2.0;
    a += texture2D(mask, uv + vec2(0.0, -r.y)).a * 2.0;
    a += texture2D(mask, uv + vec2( r.x,  r.y)).a;
    a += texture2D(mask, uv + vec2( r.x, -r.y)).a;
    a += texture2D(mask, uv + vec2(-r.x,  r.y)).a;
    a += texture2D(mask, uv + vec2(-r.x, -r.y)).a;
    return a / 16.0;
  }

  void main() {
    vec2 r = feather * texel;
    float a = softAlpha(vUv, r);
    float inside = smoothstep(edgeLo, edgeHi, a);
    if (inside <= 0.001) discard;

    // the picture is sampled in SCREEN space, never in mew's space: that is
    // what makes it sit still while the hole moves over it
    vec2 ouv = (vUv - 0.5) * uvScale + 0.5 + uvOffset;
    vec3 col = texture2D(overlay, clamp(ouv, vec2(0.0), vec2(1.0))).rgb;

    // optional rim: a soft dark lip just inside the edge, to seat the hole
    // against a light page instead of letting it float
    if (rimOn > 0.5) {
      float rim = 1.0 - smoothstep(edgeHi, edgeHi + rimWidth, a);
      col = mix(col, rimColor, rim * 0.85);
    }

    gl_FragColor = vec4(col, inside * opacity);
  }
`;

// an animated gif cannot go through TextureLoader (three keeps frame 0 only),
// but an <img> playing a gif CAN be drawn to a 2d canvas, which gives us the
// frame the browser is currently showing. we blit it into a CanvasTexture at a
// capped rate instead of every frame -- gifs run at ~10-15fps anyway, and the
// upload is the only per-frame cost in this whole pass.
function loadOverlay(url, fps, onReady) {
  const animated = /\.gif(\?|#|$)/i.test(url);
  if (!animated) {
    const tex = new THREE.TextureLoader().load(url, (t) => onReady(t.image.width, t.image.height));
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    // left as NoColorSpace on purpose: the bytes are already sRGB and this
    // pass writes straight to an sRGB canvas, so passing them through
    // untouched is exactly right
    return { texture: tex, tick: () => {} };
  }

  const img = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  let ready = false;
  let acc = 0;
  const period = 1 / Math.max(1, fps);

  img.crossOrigin = "anonymous";
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ready = true;
    onReady(canvas.width, canvas.height);
  };
  img.src = url;

  return {
    texture: tex,
    tick(dt) {
      if (!ready) return;
      acc += dt;
      if (acc < period) return;
      acc = 0;
      ctx.drawImage(img, 0, 0);
      tex.needsUpdate = true;
    }
  };
}

export function createCutout({ renderer, config }) {
  const cfg = config;
  const scale = cfg.maskScale > 0 ? cfg.maskScale : 1;

  // msaa on the mask target: a resolved multisample alpha gives a clean
  // silhouette to feather from, which matters far more here than it does in
  // the pixelate pass (where hard edges are the point)
  const rt = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    samples: cfg.msaa | 0
  });
  rt.texture.generateMipmaps = false;

  const uniforms = {
    mask: { value: rt.texture },
    overlay: { value: null },
    texel: { value: new THREE.Vector2(1, 1) },
    uvScale: { value: new THREE.Vector2(1, 1) },
    uvOffset: { value: new THREE.Vector2(0, 0) },
    feather: { value: new THREE.Vector2(1, 1) },
    edgeLo: { value: cfg.edgeLo },
    edgeHi: { value: cfg.edgeHi },
    opacity: { value: cfg.opacity ?? 1 },
    rimOn: { value: cfg.rim ? 1 : 0 },
    rimWidth: { value: cfg.rimWidth ?? 0.35 },
    rimColor: { value: new THREE.Color(cfg.rimColor ?? "#000000") }
  };

  let imgW = 1;
  let imgH = 1;
  let viewW = 1;
  let viewH = 1;

  function applyFit() {
    const s = coverFit(viewW, viewH, imgW, imgH, cfg.zoom ?? 1);
    uniforms.uvScale.value.set(s.x, s.y);
  }

  const src = loadOverlay(cfg.overlayUrl, cfg.gifFps ?? 12, (w, h) => {
    imgW = w;
    imgH = h;
    applyFit();
  });
  uniforms.overlay.value = src.texture;

  const blitScene = new THREE.Scene();
  const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blitMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));

  return {
    // soft edges want real resolution, so follow the device pixel ratio
    pixelRatio: (dpr) => dpr * scale,
    // no grid to snap to here; the hole should glide
    snapPx: () => 0,
    resize(w, h) {
      viewW = w;
      viewH = h;
      const dpr = renderer.getPixelRatio();
      const rw = Math.max(2, Math.round(w * dpr));
      const rh = Math.max(2, Math.round(h * dpr));
      rt.setSize(rw, rh);
      uniforms.texel.value.set(1 / rw, 1 / rh);
      uniforms.feather.value.set(cfg.edgeSoftPx * dpr, cfg.edgeSoftPx * dpr);
      applyFit();
    },
    render(scene, camera, opts) {
      const dt = opts?.dt ?? 0;
      src.tick(dt);
      // stationary background: pinned to the viewport by default, or slid with
      // the page when the picture should feel like it lives behind the document
      const oy = cfg.scrollWithPage
        ? scrollUvOffset(opts?.scrollY ?? 0, viewH, uniforms.uvScale.value.y, cfg.parallax ?? 1)
        : 0;
      uniforms.uvOffset.value.set(0, oy);

      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      // the hyper beam's scenes either side of her, as in pixelate.js
      const under = opts?.under, over = opts?.over, fxCam = opts?.fxCamera;
      if (!fxCam || (!under && !over)) { renderer.render(blitScene, blitCam); return; }
      const ac = renderer.autoClear;
      renderer.clear();
      renderer.autoClear = false;
      if (under) renderer.render(under, fxCam);
      renderer.render(blitScene, blitCam);
      if (over) renderer.render(over, fxCam);
      renderer.autoClear = ac;
    },
    setFlat() {},
    dispose() {
      rt.dispose();
      blitMat.dispose();
      src.texture.dispose();
    }
  };
}
