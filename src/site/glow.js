// glow.js — FIG. 2'S BACKLIGHT, DRAWN
//
// The model is site/glowField.js: what the light is, where it came from, and
// why every part of it is shaped the way it is. This file is only the drawing
// -- a WebGL canvas behind the window, one small fragment shader that is that
// model transcribed, and the rules for when it is allowed to spend a frame.
//
// ── WHY A SHADER, AND NOT CSS ──────────────────────────────────────────────
// The version before this was a conic gradient on a child element, rotated
// under a blurred parent, and it had two faults it could not fix from inside
// CSS. It SPUN, which every reconstruction of the phone's light names as the
// thing that makes it look cheap; the real one's colours swell and slide into
// each other. And the only CSS that changes a gradient's colours over time --
// animated stop positions, a registered angle, hue-rotate -- re-rasterises and
// re-blurs the whole layer every frame. Four layers of that is the frame drop
// this figure has already been in trouble for once.
//
// A shader has neither problem. The four bands are formulas rather than blurs,
// so there is nothing to re-blur; the colour field is computed per pixel, so
// it can do what the phone's does; and the canvas it draws into is drawn at
// half the device's resolution (see RENDER_SCALE), because light has no hard
// edge to lose, and the window it sits behind supplies the one crisp line there
// is.
//
// ── WHEN IT SPENDS A FRAME ─────────────────────────────────────────────────
// Only while the light is actually visible (the reader is part-way down the
// track, or the editor is previewing it), the figure is on screen, and the tab
// is in front. At most thirty times a second: all that changes between draws
// is colour drifting at a pace of seconds, and the canvas's POSITION rides the
// compositor with the rest of the page at full rate whatever this does. Under
// prefers-reduced-motion it never runs at all -- it draws one still when the
// scroll, the colours or the size change, and stops.
//
// ── THE COLOURS COME FROM CSS ──────────────────────────────────────────────
// `--glow-1` .. `--glow-6` on :root, in styles/site.css. That is where the
// editor already reads and writes every colour token, and where it previews a
// change by setting the property on the live page's root element -- so this
// watches the root's style attribute and re-reads the six when it changes. On
// the published site nothing ever touches that attribute and the observer
// never fires.

import {
  APPLE_GLOW, BANDS, FRONT, GAIN, GLOW_TOKENS, MARGIN, STILL_T,
  bandScale, blobsAt, breathAt, hexToLinear, reachAt
} from "./glowField.js";

/**
 * Backing pixels per CSS pixel: half the device ratio, between these bounds.
 *
 * Light has no hard edge to lose, and everything in the field but the core is
 * tens of pixels wide. The core is the limit: 2.4 CSS px of falloff, and below
 * about a pixel and a half of backing across it the brightest line on the
 * figure starts to go soft. So the floor is 0.75 -- a 1x screen draws at three
 * quarters -- and a 2x screen draws at one backing pixel per CSS pixel. Past
 * that there is nothing left to resolve, and 3x screens would only be paying
 * more for the same picture.
 */
const RENDER_SCALE = 0.5;
const RENDER_FLOOR = 0.75;

/** The longest this waits between draws while running: thirty a second. */
const MIN_FRAME_MS = 33;

/** Below this the light is not visible at all, and nothing should run. */
const LIT_FROM = 0.02;

// ── THE SHADER ─────────────────────────────────────────────────────────────
// No backtick anywhere below: the GLSL lives in a template literal, and one
// inside it, even in a comment, ends the string and the module fails to parse.

const VERT_300 = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const VERT_100 = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// glowField.shadeAt, line for line. Every name here is the name there.
const BODY = `
uniform vec2  uPx;        // CSS px per backing px, x and y
uniform float uCssH;      // the canvas's height in CSS px
uniform float uMargin;    // how far the canvas reaches past the window
uniform vec2  uFrame;     // the window's width and height
uniform float uRadius;    // its corner radius
uniform float uScale;     // the bands' scale for this width
uniform float uReach;     // how far round the light has travelled
uniform float uFront;     // the soft edge of its leading front
uniform float uGain;
uniform vec2  uBreath;    // x: how much light, y: how far it falls
uniform vec4  uSigma;     // the four bands' widths at the reference size
uniform vec4  uWeight;    // and their shares of the light
uniform float uCentre[6];
uniform float uWidth[6];
uniform vec3  uColour[6]; // linear light

const float PI = 3.14159265358979;

float circDist(float a, float b) {
  float d = fract(a - b);
  return min(d, 1.0 - d);
}

float sdRoundRect(vec2 q, vec2 b, float r) {
  vec2 d = abs(q) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// arc length round the window, 0 at the middle of the right side, clockwise
float perimeterU(vec2 q, vec2 b, float r) {
  float hx = b.x - r;
  float hy = b.y - r;
  float cx = clamp(q.x, -hx, hx);
  float cy = clamp(q.y, -hy, hy);
  float qa = 0.5 * PI * r;
  float P = 4.0 * hx + 4.0 * hy + 2.0 * PI * r;
  bool R = cx == hx;
  bool L = cx == -hx;
  bool B = cy == hy;
  bool T = cy == -hy;
  float dx = q.x - cx;
  float dy = q.y - cy;
  float s = 0.0;
  if (R && !T && !B) s = cy >= 0.0 ? cy : P + cy;
  else if (B && !L && !R) s = hy + qa + (hx - cx);
  else if (L && !T && !B) s = hy + 2.0 * qa + 2.0 * hx + (hy - cy);
  else if (T && !L && !R) s = 3.0 * hy + 3.0 * qa + 2.0 * hx + (cx + hx);
  else if (R && B) s = hy + r * atan(dy, dx);
  else if (L && B) s = hy + qa + 2.0 * hx + r * atan(-dx, dy);
  else if (L && T) s = 3.0 * hy + 2.0 * qa + 2.0 * hx + r * atan(-dy, -dx);
  else if (R && T) s = 3.0 * hy + 3.0 * qa + 4.0 * hx + r * atan(dx, -dy);
  return s / P;
}

float profile(float d) {
  float x = max(d, 0.0);
  vec4 s = uSigma * uScale * uBreath.y;
  vec4 e = exp(-(x * x) / (s * s));
  return dot(uWeight, e);
}

float litAt(float u) {
  return 1.0 - smoothstep(uReach - uFront, uReach, circDist(u, 0.0));
}

float waveAt(float u) {
  float closing = 1.0 - smoothstep(0.5, 0.5 + uFront, uReach);
  float x = (circDist(u, 0.0) - (uReach - uFront * 0.5)) / 0.045;
  return 0.35 * closing * exp(-x * x);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x * uPx.x, uCssH - gl_FragCoord.y * uPx.y);
  vec2 b = 0.5 * uFrame;
  vec2 q = css - uMargin - b;
  float d = sdRoundRect(q, b, uRadius);
  if (d < -1.5) { OUT = vec4(0.0); return; }
  float u = perimeterU(q, b, uRadius);

  vec3 rgb = vec3(0.0);
  float k = 0.0;
  for (int i = 0; i < 6; i++) {
    float x = circDist(u, uCentre[i]) / uWidth[i];
    float w = exp(-x * x);
    rgb += w * uColour[i];
    k += w;
  }
  rgb /= max(k, 1e-4);
  float strength = 0.7 + 0.3 * smoothstep(0.25, 1.1, k);

  float light = profile(d) * strength * (1.0 + waveAt(u)) * uBreath.x;
  float a = (1.0 - exp(-uGain * light)) * litAt(u);
  OUT = vec4(pow(max(rgb, 0.0), vec3(1.0 / 2.2)) * a, a);
}`;

const PRECISION = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const FRAG_300 = `#version 300 es
${PRECISION}out vec4 fragColor;
${BODY.replace(/\bOUT\b/g, "fragColor")}`;

const FRAG_100 = `${PRECISION}${BODY.replace(/\bOUT\b/g, "gl_FragColor")}`;

// ── THE RENDERER ───────────────────────────────────────────────────────────

/**
 * Put the backlight behind a window.
 *
 * @param host     the element the size of the window, which the canvas is
 *                 drawn around. It gets `data-gl` while WebGL is drawing, and
 *                 loses it if the context is lost -- the stylesheet shows a
 *                 still, CSS-only glow whenever that attribute is missing.
 * @param root     document, or a detached tree in the router harness.
 * @param reduced  prefers-reduced-motion: the light holds still.
 * @returns a handle, or null when there is no WebGL and the CSS still stands in.
 */
export function createGlow({ host, root = document, reduced = false }) {
  const view = root.defaultView;
  if (!host || !view) return null;

  const canvas = root.createElement("canvas");
  canvas.className = "usb-glow-gl";
  canvas.setAttribute("aria-hidden", "true");
  // Placed from here rather than from site.css, so the one number that says how
  // far past the window it reaches has one home, in glowField.js.
  Object.assign(canvas.style, {
    position: "absolute",
    left: `${-MARGIN}px`,
    top: `${-MARGIN}px`,
    width: `calc(100% + ${2 * MARGIN}px)`,
    height: `calc(100% + ${2 * MARGIN}px)`
  });

  const opts = {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false,
    stencil: false, preserveDrawingBuffer: false, powerPreference: "low-power"
  };
  let gl = null;
  let two = false;
  let prog = null;
  let U = {};
  let lost = false;
  // Declared before build() runs, which reads and writes them: a let-binding
  // read before its line is reached throws, and build() is called a few lines
  // down.
  let frameW = 0, frameH = 0, radius = 10;
  let sized = false;
  let colourKey = "";

  function build() {
    gl = canvas.getContext("webgl2", opts);
    two = !!gl;
    if (!gl) gl = canvas.getContext("webgl", opts);
    if (!gl) return false;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("glow shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, two ? VERT_300 : VERT_100);
    const fs = compile(gl.FRAGMENT_SHADER, two ? FRAG_300 : FRAG_100);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("glow shader link:", gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!two) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const at = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    }

    U = {};
    for (const n of ["uPx", "uCssH", "uMargin", "uFrame", "uRadius", "uScale", "uReach",
      "uFront", "uGain", "uBreath", "uSigma", "uWeight", "uCentre", "uWidth", "uColour"]) {
      U[n] = gl.getUniformLocation(prog, n);
    }
    // what never changes, once
    gl.uniform1f(U.uMargin, MARGIN);
    gl.uniform1f(U.uFront, FRONT);
    gl.uniform1f(U.uGain, GAIN);
    gl.uniform4f(U.uSigma, ...BANDS.map((b) => b.sigma));
    gl.uniform4f(U.uWeight, ...BANDS.map((b) => b.weight));
    gl.clearColor(0, 0, 0, 0);
    uploadColours();
    sized = false;
    return true;
  }

  host.append(canvas);
  if (!build()) {
    canvas.remove();
    return null;
  }
  host.dataset.gl = "";

  // ── the window's size ───────────────────────────────────────────────────
  function size(w, h) {
    frameW = w;
    frameH = h;
    // the window's own corner radius, read once per resize rather than kept
    // as a second copy of a number that lives in site.css
    radius = parseFloat(view.getComputedStyle(host).borderTopLeftRadius) || 0;
    const cssW = w + 2 * MARGIN, cssH = h + 2 * MARGIN;
    const px = Math.min(Math.max((view.devicePixelRatio || 1) * RENDER_SCALE, RENDER_FLOOR), 1);
    canvas.width = Math.max(1, Math.round(cssW * px));
    canvas.height = Math.max(1, Math.round(cssH * px));
    sized = false;
  }
  function uploadSize() {
    if (sized || !gl) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    // exact per axis: a rounded backing size is not quite cssSize * scale
    gl.uniform2f(U.uPx, (frameW + 2 * MARGIN) / canvas.width, (frameH + 2 * MARGIN) / canvas.height);
    gl.uniform1f(U.uCssH, frameH + 2 * MARGIN);
    gl.uniform2f(U.uFrame, frameW, frameH);
    gl.uniform1f(U.uRadius, radius);
    gl.uniform1f(U.uScale, bandScale(frameW));
    sized = true;
  }
  const ro = new view.ResizeObserver(([entry]) => {
    const box = entry.contentRect;
    if (box.width === frameW && box.height === frameH) return;
    size(box.width, box.height);
    kick();
  });
  ro.observe(host);

  // ── the six colours ─────────────────────────────────────────────────────
  function readColours() {
    const style = view.getComputedStyle(root.documentElement);
    return GLOW_TOKENS.map((tok, i) => {
      const v = parseColour(style.getPropertyValue(tok));
      return v ?? hexToLinear(APPLE_GLOW[i]);
    });
  }
  function uploadColours() {
    const cols = readColours();
    const key = cols.map((c) => c.map((v) => v.toFixed(5)).join(",")).join(";");
    if (key === colourKey && gl) return false;
    colourKey = key;
    gl.uniform3fv(U.uColour, new Float32Array(cols.flat()));
    return true;
  }
  // The editor previews a colour by setting it on the live page's root. On the
  // published site nothing ever writes that attribute, and this never fires.
  const mo = new view.MutationObserver(() => {
    if (!lost && gl && uploadColours()) kick();
  });
  mo.observe(root.documentElement, { attributes: true, attributeFilter: ["style"] });

  // ── when it may spend a frame ───────────────────────────────────────────
  let progress = 0;
  let previewing = false;
  let onScreen = true;
  let raf = 0;
  let lastDraw = -Infinity;
  const born = view.performance.now();

  const lit = () => previewing || progress > LIT_FROM;
  const shouldRun = () =>
    !reduced && !lost && lit() && onScreen && !root.hidden && frameW > 0;

  function draw(now, pOverride, tOverride) {
    if (!gl || lost || frameW === 0) return;
    uploadSize();
    const t = tOverride ?? (reduced ? STILL_T : (now - born) / 1000);
    const p = pOverride ?? (previewing ? 1.3 : progress);
    const blobs = blobsAt(t);
    const breath = reduced && tOverride === undefined ? { gain: 1, reach: 1 } : breathAt(t);
    gl.uniform1f(U.uReach, reachAt(p));
    gl.uniform2f(U.uBreath, breath.gain, breath.reach);
    gl.uniform1fv(U.uCentre, new Float32Array(blobs.centre));
    gl.uniform1fv(U.uWidth, new Float32Array(blobs.width));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    lastDraw = now;
  }

  function loop(now) {
    raf = 0;
    if (!shouldRun()) return;
    if (now - lastDraw >= MIN_FRAME_MS) draw(now);
    raf = view.requestAnimationFrame(loop);
  }

  /**
   * Something changed that the picture depends on. Running, the loop will
   * pick it up; stopped, one frame is drawn so the still is current -- which
   * is the whole of the reduced-motion path, and of a colour previewed while
   * the reader is scrolled away from the light.
   */
  function kick() {
    if (raf) { lastDraw = -Infinity; return; }
    if (shouldRun()) { raf = view.requestAnimationFrame(loop); return; }
    if (lit() || reduced) {
      raf = view.requestAnimationFrame((now) => { raf = 0; draw(now); if (shouldRun()) kick(); });
    }
  }

  const io = new view.IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) kick();
  }, { rootMargin: `${MARGIN}px` });
  io.observe(host);

  const onVisibility = () => { if (!root.hidden) kick(); };
  root.addEventListener("visibilitychange", onVisibility);

  // ── a lost context falls back to the CSS still, and comes back ─────────
  const onLost = (e) => {
    e.preventDefault();
    lost = true;
    delete host.dataset.gl;
    if (raf) { view.cancelAnimationFrame(raf); raf = 0; }
  };
  const onRestored = () => {
    lost = false;
    colourKey = "";
    if (build()) {
      host.dataset.gl = "";
      if (frameW) size(frameW, frameH);
      kick();
    }
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  return {
    /** Progress through the track, the same number the wipe reads. */
    setProgress(p) {
      if (p === progress) return;
      progress = p;
      // Drawn on the NEXT frame, not at the throttle's next thirty-a-second
      // slot: the front of the light is the reader's own scroll answered, and
      // an answer a frame and a half late is felt. Under reduced motion it
      // still follows the scroll for the same reason; it just does not move by
      // itself.
      kick();
    },
    /** The editor's preview: the whole loop lit and moving, wherever the scroll is. */
    preview(on) {
      previewing = !!on;
      kick();
    },
    /** Read the colours again now. */
    refresh() {
      if (!lost && gl && uploadColours()) kick();
    },
    destroy() {
      if (raf) view.cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      root.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      // A page swap disposes this, and the router swaps pages without a
      // navigation. Contexts are a limited resource per document: one left
      // behind on every visit to this sheet is a slow leak toward the limit,
      // after which the browser starts killing the OLDEST -- which is the sky.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      delete host.dataset.gl;
      gl = null;
    },
    get running() { return raf !== 0 && shouldRun(); },
    get webgl2() { return two; },
    /**
     * The GPU check: draw at a fixed moment and progress, then read back the
     * pixels at these CSS positions from the canvas's top-left, straight out
     * of the drawing buffer before it is composited away. Returns premultiplied
     * [r, g, b, a] in 0..1 for each, and the CSS position of the pixel CENTRE
     * that was read, which is where the model has to be evaluated to compare.
     */
    debugSample(t, p, points) {
      if (!gl) return null;
      draw(view.performance.now(), p, t);
      const sx = (frameW + 2 * MARGIN) / canvas.width;
      const sy = (frameH + 2 * MARGIN) / canvas.height;
      const px = new Uint8Array(4);
      return points.map(([x, y]) => {
        const ix = Math.min(canvas.width - 1, Math.max(0, Math.floor(x / sx)));
        const iyTop = Math.min(canvas.height - 1, Math.max(0, Math.floor(y / sy)));
        gl.readPixels(ix, canvas.height - 1 - iyTop, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return {
          at: [(ix + 0.5) * sx, (iyTop + 0.5) * sy],
          rgba: [px[0] / 255, px[1] / 255, px[2] / 255, px[3] / 255]
        };
      });
    },
    debugState() {
      return {
        frame: [frameW, frameH], radius, scale: bandScale(frameW),
        backing: [canvas.width, canvas.height], colours: readColours()
      };
    }
  };
}

/**
 * A colour as CSS gives it back from a custom property: "#RRGGBB", "#RGB", or
 * "rgb(r, g, b)" / "rgb(r g b)" if something wrote it that way. Linear [r, g,
 * b], or null so the caller can fall back to Apple's colour for that slot
 * rather than drawing black.
 */
function parseColour(value) {
  const v = String(value || "").trim();
  if (v.startsWith("#")) return hexToLinear(v);
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v);
  if (!m) return null;
  return [m[1], m[2], m[3]].map((c) => Math.pow(Math.min(255, +c) / 255, 2.2));
}
