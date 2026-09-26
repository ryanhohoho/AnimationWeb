// motionAmbient.js — THE PAGE'S GROUND IS THE SCENE YOU ARE LOOKING AT
//
// By instruction the motion-graphics page leaves the portfolio's paper behind
// and dresses in the piece's own look: a dark ground, with the piece's effects
// on it. The ground is not decoration, though. It is YouTube's "ambient mode"
// -- the colour of the video you are watching bleeding out past its frame --
// printed the way "let me be a flower" prints everything: the scene is shrunk
// to a few dozen pixels, graded blue the way the whole piece is graded blue
// (story.js, BLUE and the whale's dither), and put through a 4x4 ordered
// dither in four inks, with a CRT's scanlines and film grain over it.
//
// At rest the ground is a still (the pixelated flower, motion.js GROUND); as
// you point at a tile the whole page quietly becomes that work, and when one
// is open its frame stands in a field of its own light. Scrolling alone never
// changes it (by instruction: it flickered when it followed the scroll). The
// source is always something already decoded -- a tile's canvas, a poster, or
// the viewer's own video -- so this adds no decoder, only a 48x104 copy and
// one small draw.
//
// COST. The canvas is a third of the window's size and scaled up pixelated, so
// a dither cell is three CSS pixels and the fragment count is a ninth; it draws
// at most 24 times a second, only while the page is in front and the source
// moves, and not at all under reduced motion beyond one still frame per change.

import { reducedMotion } from "../utils/motion.js";

const SW = 48, SH = 104;               // the source, shrunk: the blur is the resolution
const SCALE = 3;                       // CSS px per dither cell
const FPS = 24;

const VS = `
attribute vec2 p;
varying vec2 v;
void main(){ v = p*.5 + .5; gl_Position = vec4(p, 0., 1.); }`;

// no backticks in here: this is a template literal (CLAUDE.md, invariants)
const FS = `
precision mediump float;
varying vec2 v;
uniform sampler2D uA, uB;
uniform float uMix, uTime, uSrcAspect;
uniform vec2 uRes;
float bayer(vec2 f){
  vec2 a = mod(floor(f), 4.);
  float m = 0.;
  // 4x4 Bayer, built from the 2x2 one
  vec2 b = mod(a, 2.), c = floor(a*.5);
  float d2 = mod(3.*b.x + 2.*b.y - 4.*b.x*b.y + 0., 4.);
  float e2 = mod(3.*c.x + 2.*c.y - 4.*c.x*c.y + 0., 4.);
  m = 4.*d2 + e2;
  return (m + .5)/16.;
}
float hash(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233)))*43758.5453); }
void main(){
  // cover: the source is 9:19.5, the window is whatever it is
  float ra = uRes.x/uRes.y;
  vec2 uv = v;
  if (ra > uSrcAspect) uv.y = (v.y - .5)*uSrcAspect/ra + .5;
  else uv.x = (v.x - .5)*ra/uSrcAspect + .5;
  uv.y = 1. - uv.y;
  vec3 a = texture2D(uA, uv).rgb, b = texture2D(uB, uv).rgb;
  vec3 c = mix(a, b, uMix);
  float l = dot(c, vec3(.2126, .7152, .0722));
  // the piece's grade: a dark field, lifted only where the picture is bright
  l = pow(clamp(l, 0., 1.), 1.35)*.62;
  vec2 v2 = v - .5;
  l *= 1. - .85*dot(v2, v2)*1.6;                   // vignette, into the black
  l += (hash(gl_FragCoord.xy + fract(uTime)*97.) - .5)*.05;   // grain
  // four inks: black, navy, ultramarine, periwinkle -- 4x4 ordered dither between
  float k = clamp(l, 0., .999)*3.;
  float lo = floor(k), fr = k - lo;
  float step1 = lo + (fr > bayer(gl_FragCoord.xy) ? 1. : 0.);
  vec3 ink0 = vec3(.012, .016, .047), ink1 = vec3(.039, .078, .251),
       ink2 = vec3(.122, .141, .839), ink3 = vec3(.561, .604, .902);
  vec3 col = step1 < .5 ? ink0 : step1 < 1.5 ? ink1 : step1 < 2.5 ? ink2 : ink3;
  col *= .86 + .14*mod(gl_FragCoord.y, 2.);        // scanlines
  gl_FragColor = vec4(col, 1.);
}`;

export function createAmbient(canvas) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return { setSource() {}, dispose() {} };

  const small = document.createElement("canvas");
  small.width = SW; small.height = SH;
  const sctx = small.getContext("2d", { willReadFrequently: false });

  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[ambient]", gl.getProgramInfoLog(prog));
    return { setSource() {}, dispose() {} };
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uMix = U("uMix"), uTime = U("uTime"), uRes = U("uRes"), uSrc = U("uSrcAspect");
  gl.uniform1i(U("uA"), 0); gl.uniform1i(U("uB"), 1);
  gl.uniform1f(uSrc, 9 / 19.5);

  const tex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  };
  const tA = tex(), tB = tex();

  let src = null, mix = 1, mixFrom = 0, last = 0, raf = 0, alive = true, paused = false;

  function size() {
    const w = Math.max(1, Math.ceil(window.innerWidth / SCALE)), h = Math.max(1, Math.ceil(window.innerHeight / SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }

  function upload(t) {
    if (!src) return;
    try {
      sctx.drawImage(src, 0, 0, SW, SH);
      gl.activeTexture(t === tA ? gl.TEXTURE0 : gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, small);
    } catch { /* not decodable yet */ }
  }

  function draw(now) {
    upload(tB);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tA);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tB);
    mix = Math.min(1, (now - mixFrom) / 450);
    gl.uniform1f(uMix, mix);
    gl.uniform1f(uTime, now / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // A STILL IS DRAWN UNTIL IT HAS FADED IN, AND THEN NOT AT ALL. The page's
  // resting ground is a still (motion.js, GROUND), and a loop re-drawing it
  // at 24 fps would re-roll the grain every frame -- a shimmer across the
  // whole window with nothing on it moving, which is exactly the flicker the
  // resting page must not have. So once the crossfade is done and the picture
  // has actually loaded, the loop stops: zero cost, and a ground that is quiet.
  const isStill = (el) => el instanceof HTMLImageElement;
  const settled = () => isStill(src) && mix >= 1 && src.complete && src.naturalWidth > 0;
  function frame(now) {
    raf = 0;
    if (!alive || paused) return;
    if (!document.hidden && now - last >= 1000 / FPS - 2) { last = now; draw(now); }
    if (settled()) return;
    if (!reducedMotion) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && !paused) raf = requestAnimationFrame(frame); };

  size(); kick();
  const onResize = () => { size(); if (reducedMotion) kick(); };
  window.addEventListener("resize", onResize);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener("visibilitychange", onVis);

  const api = {
    /** a canvas, an image or a video: whatever is on show becomes the ground */
    setSource(el) {
      if (!el || el === src) return;
      // the outgoing picture is frozen into A, and the new one fades up in B
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tA);
      try { if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, small); } catch {}
      src = el;
      mixFrom = performance.now();
      if (reducedMotion) mixFrom -= 1e4;
      // a still that has not loaded yet draws as black: draw it again when it has
      if (isStill(el) && !el.complete) el.addEventListener("load", () => { if (src === el) kick(); }, { once: true });
      kick();
    },
    /** hold the last picture and draw nothing until resume() (a phone's open scene covers it) */
    pause() { paused = true; cancelAnimationFrame(raf); raf = 0; },
    resume() { if (!paused) return; paused = false; kick(); },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (globalThis.__MOTION__?.ambient === api) delete globalThis.__MOTION__;
    },
    // for checking by hand where rAF never runs (the preview pane): one frame
    debug: { draw: () => draw(performance.now()) }
  };
  globalThis.__MOTION__ = { ambient: api };
  return api;
}
