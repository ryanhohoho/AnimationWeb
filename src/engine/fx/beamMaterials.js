// beamMaterials.js
// the hyper beam's five drawings, as shader materials. fx/beam.js owns the
// clock and the geometry; this file is only what each fragment looks like.
//
// EVERYTHING HERE IS DRAWN AT THE PAGE'S OWN RESOLUTION, not through the
// pixelate pass. By the owner's choice (2026-10-04): the references are anime
// fx, and a beam whose streaks and nose are cut to mew's 4 px grid loses both.
// She stays a sprite; the light she throws is drawn. These meshes live in two
// small scenes of their own that mew.js hands the presentation pass -- one
// drawn under her (the beam, the impact burst) and one over her (the orb, the
// lightning, the stars) -- with an orthographic camera in CSS pixels, so a
// number in here is a pixel on screen and nothing is foreshortened.
//
// THE CANVAS IS PREMULTIPLIED, and every material here blends ONE,
// ONE_MINUS_SRC_ALPHA and writes premultiplied colour. That one convention
// buys both kinds of mark the beam needs from a single blend state: a cel
// fill writes rgb*a with alpha a and simply covers, and a glow writes rgb*a
// with a SMALLER alpha, which lets the page through underneath and so adds
// light instead of laying paint. (The old beam's additive blend did nothing on
// white paper: white plus anything is white.)
//
// NO BACKTICKS IN ANY COMMENT BELOW. These shaders are template literals; one
// backtick ends the string and the module stops parsing (CLAUDE.md).

import * as THREE from "three";

function premul(params) {
  return new THREE.ShaderMaterial({
    ...params,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // the fx camera's y runs DOWN the page, which flips the winding of every
    // triangle; nothing here has a back worth culling
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor
  });
}

const col = (hex) => new THREE.Color(hex);
// the colours go in as RAW sRGB triples: a ShaderMaterial gets no colour-space
// conversion injected, and the canvas is sRGB, so what is written is what is
// seen. THREE.Color would linearise a hex on the way in.
const raw = (hex) => {
  const c = col(hex).convertLinearToSRGB();
  return new THREE.Vector3(c.r, c.g, c.b);
};

// ── THE NOISE ───────────────────────────────────────────────────────────────
// One 128x128 tile made once on the CPU, three different noises in three
// channels, sampled with repeat. A texture fetch is the cheapest thing a phone
// GPU does; three octaves of hashed value noise per fragment over a beam a
// thousand pixels long is not.
//
//   r  STREAKS. Value noise stretched 8:1 -- four cells along, thirty-two
//      across -- so it reads as fibres of light running down the beam: the
//      white flow in regidrago's beam.
//   g  BLOBS. Isotropic and coarse: the torn, boiling edge.
//   b  GRAIN. Fine and isotropic: breaks the sheath line like a dry brush.
export function makeNoiseTexture(seed = 7) {
  const N = 128;
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // a periodic lattice, so the tile repeats without a seam
  const lattice = (cx, cy) => {
    const g = new Float32Array(cx * cy);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x, y) => {
      const fx = (x / N) * cx, fy = (y / N) * cy;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const at = (i, j) => g[((j % cy + cy) % cy) * cx + ((i % cx + cx) % cx)];
      const a0 = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
      const a1 = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
      return a0 + (a1 - a0) * ty;
    };
  };
  const s1 = lattice(4, 32), s2 = lattice(8, 64);
  const b1 = lattice(6, 6), b2 = lattice(12, 12);
  const g1 = lattice(32, 32), g2 = lattice(64, 64);
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      // contrast-stretched: value noise bunches round 0.5, and the shaders
      // threshold these, so the tails have to exist
      const st = (s1(x, y) * 0.68 + s2(x, y) * 0.32 - 0.5) * 1.9 + 0.5;
      const bl = (b1(x, y) * 0.7 + b2(x, y) * 0.3 - 0.5) * 1.8 + 0.5;
      const gr = (g1(x, y) * 0.6 + g2(x, y) * 0.4 - 0.5) * 1.7 + 0.5;
      data[i] = Math.round(Math.min(1, Math.max(0, st)) * 255);
      data[i + 1] = Math.round(Math.min(1, Math.max(0, bl)) * 255);
      data[i + 2] = Math.round(Math.min(1, Math.max(0, gr)) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// the envelope, transcribed from fx/beamShape.js envelope(). uWidth is the FULL
// width; the half-width is 0.5 * uWidth * env(s).
const ENV = /* glsl */ `
  uniform vec4 uEnv;      // root, flare, power, spread
  uniform float uWidth;
  float env(float s) {
    float d = max(s, 0.0);
    float x = d / max(1e-4, uEnv.y * uWidth);
    float k = pow(x / (1.0 + x), uEnv.z);
    return (uEnv.x + (1.0 - uEnv.x) * k) * (1.0 + uEnv.w * d / max(1e-4, uWidth));
  }
`;

// THE TWO GLINT SHAPES, shared by every drawing that has stars in it.
//   astroid  |x/a|^p + |y/b|^p <= 1 with p under 1 IS a four-pointed star with
//            concave sides, arms a and b: the twinkle (starBurst.js uses the
//            same curve for the shiny).
//   needle   |x/l| + |y/w| <= 1 is a long thin diamond: the tapering line of
//            light in every reference's origin flare. Two of them crossed,
//            with an astroid at the heart, is the flare.
const SHAPES = /* glsl */ `
  float astroid(vec2 q, float a, float b) {
    vec2 t = abs(q) / vec2(max(a, 1e-3), max(b, 1e-3));
    return pow(t.x, 0.6) + pow(t.y, 0.6);
  }
  float needle(vec2 q, float l, float w) {
    return abs(q.x) / max(l, 1e-3) + abs(q.y) / max(w, 1e-3);
  }
  float flare(vec2 q, float l, float l2, float w, float heart) {
    return min(min(needle(q, l, w), needle(q.yx, l2, w)), astroid(q, heart, heart));
  }
  vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(p.x * c + p.y * s, -p.x * s + p.y * c); }
`;

// ── 1 · THE BEAM ────────────────────────────────────────────────────────────
// One strip mesh down the axis, its width following the envelope in the vertex
// shader, and every layer of the beam solved in one fragment: the haze, a deep
// pink edge, the pale body with white streaks pouring through it, the white
// core, the parabolic sheath of the eruption, and the tearing as it goes out.
// One draw call, and it only costs the pixels it covers.
export function beamMaterial(noise, cfg) {
  const L = cfg.look, P = cfg.palette;
  return premul({
    uniforms: {
      uNoise: { value: noise },
      uO: { value: new THREE.Vector2() },
      uD: { value: new THREE.Vector2(1, 0) },
      uLen: { value: 1 },
      uBack: { value: 1 },
      uHead: { value: 0 },
      uWidth: { value: 100 },
      uWidthK: { value: 1 },
      uEnv: { value: new THREE.Vector4(L.root, L.flare, L.power, L.spread) },
      uOuter: { value: L.glowMul + 0.1 },
      uTime: { value: 0 },
      uBoil: { value: 0 },
      uBreak: { value: 0 },
      uAlpha: { value: 1 },
      uShell: { value: 0 },
      uShellLen: { value: L.shellLenPx },
      uFlow: { value: L.flowPxS },
      uStreak: { value: L.streakPx },
      uGlowMul: { value: L.glowMul },
      uBody: { value: L.bodyAlpha },
      cCore: { value: raw(P.core) },
      cLight: { value: raw(P.light) },
      cMid: { value: raw(P.mid) },
      cDeep: { value: raw(P.deep) },
      cGlow: { value: raw(P.glow) }
    },
    vertexShader: /* glsl */ `
      attribute vec2 aSU;        // x 0..1 down the beam, y -1..1 across it
      uniform vec2 uO;
      uniform vec2 uD;
      uniform float uLen;
      uniform float uBack;
      uniform float uWidthK;
      uniform float uOuter;
      varying vec2 vSR;
      ${ENV}
      void main() {
        float s = mix(-uBack, uLen, aSU.x);
        // the mesh is as wide as the widest thing drawn in it: the haze, or
        // the sheath while it lasts (which is cut from the UNSCALED width so
        // it can open wider than the beam while the beam is still arriving)
        float hw = 0.5 * uWidth * env(s) * max(uWidthK, 1.0);
        float r = aSU.y * hw * uOuter;
        vec2 p = uO + uD * s + vec2(-uD.y, uD.x) * r;
        vSR = vec2(s, r);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uNoise;
      uniform float uLen;
      uniform float uBack;
      uniform float uHead;
      uniform float uWidthK;
      uniform float uTime;
      uniform float uBoil;
      uniform float uBreak;
      uniform float uAlpha;
      uniform float uShell;
      uniform float uShellLen;
      uniform float uFlow;
      uniform float uStreak;
      uniform float uGlowMul;
      uniform float uBody;
      uniform vec3 cCore;
      uniform vec3 cLight;
      uniform vec3 cMid;
      uniform vec3 cDeep;
      uniform vec3 cGlow;
      varying vec2 vSR;
      ${ENV}

      void main() {
        float s = vSR.x;
        float r = vSR.y;
        float ar = abs(r);
        float hw0 = 0.5 * uWidth * env(s);
        float hw = hw0 * uWidthK;

        // THE FRONT, while it travels: a blunt round nose, not a cut end
        float cap = hw * 1.15 + 1.0;
        float hd = s - (uHead - cap);
        if (hd > 0.0) { float q = hd / cap; hw *= sqrt(max(0.0, 1.0 - q * q)); }
        // ...and the root behind the muzzle closes in a round too (the orb is
        // drawn over it, so this only has to not be a square)
        if (s < 0.0) { float q = -s / max(uBack, 1.0); hw *= sqrt(max(0.0, 1.0 - q * q)); }

        float bw = max(hw, 0.75);
        float u = ar / bw;

        // the flow: streaks pour down the beam at uFlow px/s, continuously
        float flow = uTime * uFlow;
        float st = texture2D(uNoise, vec2((s - flow) / uStreak, r / max(bw, 1.0) * 0.23)).r;
        // the edge: coarse blobs, stepped once per drawing (uBoil)
        float bl = texture2D(uNoise, vec2((s - flow * 0.22) / (uStreak * 1.6) + uBoil * 0.311,
                                          r / max(bw, 1.0) * 0.11 + uBoil * 0.173)).g;
        float edge = 1.0 + 0.24 * (bl - 0.5) + 0.10 * (st - 0.5);
        float a = u / edge;
        // a pixel and a bit, in half-widths: every band edge is drawn crisp
        // but never aliased
        float aa = 1.3 / bw;

        vec4 o = vec4(0.0);
        if (a > 1.0) {
          // THE HAZE: light thrown on the page. Low alpha against its colour,
          // so it adds rather than covers.
          float g = exp(-(a - 1.0) * 2.2) * smoothstep(uGlowMul, uGlowMul * 0.55, a);
          g *= 0.40 * uAlpha * (1.0 - 0.6 * uBreak);
          o = vec4(cGlow * g, g * 0.5);
        } else {
          // THE BODY, in cel bands with streak-displaced boundaries
          float v = a + (st - 0.5) * 0.34;
          vec3 c = cDeep;
          c = mix(c, cMid, smoothstep(0.84 + aa, 0.84 - aa, v));
          c = mix(c, cLight, smoothstep(0.55 + aa, 0.55 - aa, v));
          float coreE = 0.30 + 0.12 * (bl - 0.5);
          float core = smoothstep(coreE + aa, coreE - aa, v);
          c = mix(c, cCore, core);
          // white fibres running through the body
          float fib = smoothstep(0.70, 0.78, st) * smoothstep(0.9, 0.45, a);
          c = mix(c, cCore, fib * 0.85);
          float al = mix(uBody, 1.0, max(core, fib * 0.6));
          // the outer edge antialiases into the haze
          al *= smoothstep(1.0, 1.0 - aa, a);
          // THE DISSIPATION: torn into streaks from the outside in, the core
          // holding out longest
          float keep = st * 0.62 + (1.0 - a) * 0.55 + bl * 0.18;
          float thr = uBreak * 0.92;
          al *= smoothstep(thr - 0.05, thr + 0.05, keep);
          al *= uAlpha;
          o = vec4(c * al, al);
          // the haze carries on under a torn body, so the beam goes out as
          // light and not as holes
          float g = 0.40 * uAlpha * uBreak * (1.0 - a * 0.5);
          o += vec4(cGlow * g, g * 0.5) * (1.0 - o.a);
        }

        // THE SHEATH: the parabolic shell of the eruption, cmzw's two magenta
        // lines opening wider than the beam itself. It only exists at the
        // shot and dies down the beam, and it is broken in places like a dry
        // brush line rather than ruled.
        if (uShell > 0.0 && s > 0.0 && s < uHead) {
          float hs = hw0 * (1.18 + 0.95 * (1.0 - exp(-s / (uWidth * 0.9))));
          float d = abs(ar - hs);
          float w = 1.0 + 1.4 * uShell;
          float line = smoothstep(w + 1.0, w - 0.5, d);
          line *= exp(-s / uShellLen) * uShell;
          line *= step(0.34, texture2D(uNoise, vec2(s / 300.0 + uBoil * 0.37, 0.5 + sign(r) * 0.25)).b);
          o = vec4(cDeep * line, line) + o * (1.0 - line);
        }
        if (o.a <= 0.002) discard;
        gl_FragColor = o;
      }
    `
  });
}

// ── 2 · THE ORB AND THE FLARE ───────────────────────────────────────────────
// The gathering ball during the charge and the white-hot point at the origin
// during the shot are one drawing at two sizes, with the origin's cross of
// light on top. Its outline wobbles once per drawing -- three sines with phases
// picked per boil step -- so the ball looks hand-drawn and alive, not stamped.
export function orbMaterial(cfg) {
  const P = cfg.palette;
  return premul({
    uniforms: {
      uC: { value: new THREE.Vector2() },
      uExtent: { value: 100 },
      uR: { value: 10 },
      uOrbA: { value: 1 },
      uPh: { value: new THREE.Vector3() },
      uFlareL: { value: 0 },
      uFlareW: { value: 1 },
      uRot: { value: 0 },
      uHaze: { value: 1 },
      cCore: { value: raw(P.core) },
      cMid: { value: raw(P.mid) },
      cDeep: { value: raw(P.deep) },
      cGlow: { value: raw(P.glow) }
    },
    vertexShader: /* glsl */ `
      uniform vec2 uC;
      uniform float uExtent;
      varying vec2 vP;
      void main() {
        vP = position.xy * uExtent;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(uC + vP, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uR;
      uniform float uOrbA;
      uniform vec3 uPh;
      uniform float uFlareL;
      uniform float uFlareW;
      uniform float uRot;
      uniform float uHaze;
      uniform vec3 cCore;
      uniform vec3 cMid;
      uniform vec3 cDeep;
      uniform vec3 cGlow;
      varying vec2 vP;

      ${SHAPES}

      void main() {
        float d = length(vP);
        float th = atan(vP.y, vP.x);
        vec4 o = vec4(0.0);

        // haze round the whole thing
        float hz = exp(-d / max(uR * 1.6, 1.0)) * 0.55 * uHaze * uOrbA;
        o = vec4(cGlow * hz, hz * 0.5);

        // the cross of light, long axis down the beam
        if (uFlareL > 0.5) {
          vec2 q = rot(vP, uRot);
          float fo = flare(q, uFlareL + 3.0, uFlareL * 0.5 + 3.0, uFlareW + 2.5, uR * 0.9 + 2.5);
          float fi = flare(q, uFlareL, uFlareL * 0.5, uFlareW, uR * 0.9);
          float edgeO = smoothstep(1.06, 0.94, fo);
          float edgeI = smoothstep(1.06, 0.94, fi);
          vec3 fc = mix(cDeep, cCore, edgeI);
          o = vec4(fc * edgeO, edgeO) + o * (1.0 - edgeO);
        }

        // the orb: a deep outline, a pink ring, a white heart
        float wob = 1.0 + 0.07 * sin(3.0 * th + uPh.x) + 0.05 * sin(5.0 * th + uPh.y)
                        + 0.035 * sin(9.0 * th + uPh.z);
        float rb = uR * wob;
        float aa = 1.0;
        float body = smoothstep(rb + aa, rb - aa, d);
        if (body > 0.0) {
          vec3 c = cDeep;
          c = mix(c, cMid, smoothstep(rb - 1.5 + aa, rb - 1.5 - aa, d));
          c = mix(c, cCore, smoothstep(rb * 0.66 + aa, rb * 0.66 - aa, d));
          float al = body * uOrbA;
          o = vec4(c * al, al) + o * (1.0 - al);
        }
        if (o.a <= 0.002) discard;
        gl_FragColor = o;
      }
    `
  });
}

// ── 3 · INK LINES: the lightning, the aim, the gathering streaks ────────────
// Triangle strips built on the CPU (fx/beam.js) with a soft edge across them.
// aSoft 0 is a crisp stroke; 1 is a halo whose alpha falls away from the
// centre line. Each stroke carries its own colour.
export function lineMaterial() {
  return premul({
    uniforms: {},
    vertexShader: /* glsl */ `
      attribute float aEdge;
      attribute vec3 aCol;
      attribute float aA;
      attribute float aSoft;
      varying float vEdge;
      varying vec3 vCol;
      varying float vA;
      varying float vSoft;
      void main() {
        vEdge = aEdge; vCol = aCol; vA = aA; vSoft = aSoft;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vEdge;
      varying vec3 vCol;
      varying float vA;
      varying float vSoft;
      void main() {
        float e = abs(vEdge);
        float crisp = smoothstep(1.0, 0.55, e);
        float halo = (1.0 - e) * (1.0 - e);
        float a = vA * mix(crisp, halo, vSoft);
        if (a <= 0.002) discard;
        // a halo adds light (alpha under its colour); a stroke covers
        gl_FragColor = vec4(vCol * a, a * mix(1.0, 0.45, vSoft));
      }
    `
  });
}

// ── 4 · THE STARS ───────────────────────────────────────────────────────────
// Quads built on the CPU, one per star, each drawing a white four-point glint
// with a deep pink outline (on white paper a white star is invisible without
// one). aShape.x is the long arm, .y the short; a twinkle has them equal, the
// origin's flare does not.
export function starMaterial(cfg) {
  const P = cfg.palette;
  return premul({
    uniforms: { cFill: { value: raw(P.core) }, cLine: { value: raw(P.deep) } },
    vertexShader: /* glsl */ `
      attribute vec2 aLocal;     // -1..1 across the quad, in the star's frame
      attribute vec4 aShape;     // arm x px, arm y px, alpha, kind (0 twinkle, 1 flare)
      varying vec2 vQ;
      varying vec4 vShape;
      void main() {
        vQ = aLocal * (max(aShape.x, aShape.y) + 3.0);
        vShape = aShape;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 cFill;
      uniform vec3 cLine;
      varying vec2 vQ;
      varying vec4 vShape;
      ${SHAPES}
      void main() {
        float ax = vShape.x, ay = vShape.y;
        float fo, fi;
        if (vShape.w > 0.5) {
          float w = max(1.6, ax * 0.05);
          fo = flare(vQ, ax + 2.5, ay + 2.5, w + 2.2, ay * 0.32 + 2.2);
          fi = flare(vQ, ax, ay, w, ay * 0.32);
        } else {
          fo = astroid(vQ, ax + 2.5, ay + 2.5);
          fi = astroid(vQ, ax, ay);
        }
        float ao = smoothstep(1.07, 0.93, fo) * vShape.z;
        float ai = smoothstep(1.07, 0.93, fi);
        if (ao <= 0.002) discard;
        gl_FragColor = vec4(mix(cLine, cFill, ai) * ao, ao);
      }
    `
  });
}

// ── 5 · THE IMPACT FRAMES ───────────────────────────────────────────────────
// Drawn in two inks only, alternating negative and positive, and every frame
// is a different DRAWING -- a new cut edge, new lines -- because an impact frame
// that is the same picture three times is a flash, not a hit. Her silhouette
// is drawn over it by the pixelate pass (setFlat), so the frame and the animal
// are the same two inks.
//
// TWO REGIONS, one drawing (rigConfig.attack.impact.mode, which the editor
// sets -- 2026-10-04, by instruction):
//
//   "band"    a hand-cut strip ALONG THE SHOT, from just behind her to the
//             edge of the window -- cmzw's black-and-white frames, which are the
//             beam's own path inverted, not a hole around the shooter. It
//             widens a little away from her, and its two long edges are cut
//             with a saw of teeth and a few deep shards.
//   "screen"  the whole window, the classic full-frame impact.
//
// Everything inside is drawn in the BEAM's frame (s along the shot from the
// muzzle, r across it), so both regions share the same lines:
//
//   frame 0  negative: white speed lines bursting from the muzzle, the
//            origin's cross of light, glints
//   frame 1  positive: dense ink lines, an ink cross, a white heart ringed
//   frame 2  negative: the beam itself as a torn white silhouette, still
//            unlit, with a ring of needles at the muzzle -- the shot an instant
//            before it is light
export function impactMaterial(cfg) {
  const P = cfg.palette;
  return premul({
    uniforms: {
      uO: { value: new THREE.Vector2() },      // the muzzle, document px
      uD: { value: new THREE.Vector2(1, 0) },  // the shot's direction
      uBack: { value: 100 },                   // band: how far behind the muzzle
      uLen: { value: 1000 },                   // band: how far along the shot
      uHalf: { value: 100 },                   // band: half-width, far end
      uR: { value: 300 },                      // the scale the lines are drawn at
      uScreen: { value: new THREE.Vector4() }, // screen: the window, document px
      uWhole: { value: 0 },                    // 1 = the whole window
      uFrame: { value: 0 },
      uSeed: { value: new THREE.Vector4() },
      uStars: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      cInk: { value: raw(P.ink) },
      cFlash: { value: raw(P.flash) }
    },
    vertexShader: /* glsl */ `
      uniform vec2 uO;
      uniform vec2 uD;
      uniform float uBack;
      uniform float uLen;
      uniform float uHalf;
      uniform vec4 uScreen;
      uniform float uWhole;
      varying vec2 vSR;
      void main() {
        vec2 a = position.xy * 0.5 + 0.5;
        vec2 n = vec2(-uD.y, uD.x);
        vec2 p;
        if (uWhole > 0.5) {
          p = uScreen.xy + a * uScreen.zw;
        } else {
          float s = mix(-uBack, uLen, a.x);
          p = uO + uD * s + n * (position.y * uHalf * 1.45);
        }
        vec2 q = p - uO;
        vSR = vec2(dot(q, uD), dot(q, n));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uBack;
      uniform float uHalf;
      uniform float uR;
      uniform float uWhole;
      uniform float uFrame;
      uniform vec4 uSeed;
      uniform vec4 uStars[4];
      uniform vec3 cInk;
      uniform vec3 cFlash;
      varying vec2 vSR;

      const float TAU = 6.2831853;
      float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
      ${SHAPES}

      // SPEED LINES bursting from the muzzle: wedges in polar bins that taper
      // to nothing on the way in, each with its own start, width and presence.
      float speedLines(vec2 p, float n, float density, float inner, float seed) {
        float r = length(p);
        float t = (atan(p.y, p.x) / TAU + 0.5) * n;
        float k = floor(t);
        float f = fract(t) - 0.5;
        float h1 = hash(k + seed * 17.0);
        float h2 = hash(k * 1.37 + seed * 29.0);
        float h3 = hash(k * 2.11 + seed * 41.0);
        if (h1 > density) return 0.0;
        float r0 = uR * (inner + (1.0 - inner) * 0.7 * h2);
        float taper = clamp((r - r0) / (uR * 0.28), 0.0, 1.0);
        float w = (0.2 + 0.4 * h3) * taper;
        float px = abs(f) * TAU * r / n;
        float hw = w * TAU * r / n * 0.5;
        return smoothstep(hw + 0.7, hw - 0.7, px) * step(r0, r);
      }

      void main() {
        float s = vSR.x, r = vSR.y, ar = abs(r);

        float inside = 1.0;
        if (uWhole < 0.5) {
          // THE CUT EDGE of the band: widening away from her, a saw of short
          // teeth down both long sides and a few deep shards, the two sides
          // cut independently. Behind her it closes in a ragged round.
          float side = r < 0.0 ? 0.0 : 1.0;
          float hb = uHalf * (0.78 + 0.22 * smoothstep(0.0, uHalf * 6.0, s));
          float tl = uHalf * 0.34;
          float t = s / tl + uSeed.x * 40.0 + side * 17.0;
          float k = floor(t);
          float f = fract(t);
          float ck = 0.25 + 0.5 * hash(k * 1.9 + uSeed.y * 7.0 + side);
          float saw = max(0.0, 1.0 - abs(f - ck) / 0.5) * (0.06 + 0.14 * hash(k + uSeed.y * 13.0 + side * 3.0));
          float t2 = s / (uHalf * 1.6) + uSeed.z + side * 5.0;
          float k2 = floor(t2);
          float f2 = fract(t2);
          float c2 = 0.3 + 0.4 * hash(k2 * 2.3 + uSeed.y + side);
          float shard = step(0.55, hash(k2 * 5.7 + uSeed.w + side * 9.0))
                      * max(0.0, 1.0 - abs(f2 - c2) / 0.12) * (0.2 + 0.35 * hash(k2 * 3.3 + uSeed.x * 9.0));
          float edge = hb * (0.86 + saw + shard);
          // the round behind her, as ragged as the sides
          float bk = max(0.0, -s - (uBack - hb));
          float d = length(vec2(ar, bk));
          inside = smoothstep(edge + 0.8, edge - 0.8, d);
          if (inside <= 0.0) discard;
        }

        bool neg = uFrame != 1.0;
        vec3 ground = neg ? cInk : cFlash;
        vec3 mark = neg ? cFlash : cInk;
        float m = 0.0;
        vec2 pm = vec2(s, r);
        float rm = length(pm);

        if (uFrame == 0.0) {
          m = max(m, speedLines(pm, 150.0, 0.6, 0.12, uSeed.w));
          float fl = flare(pm, uR * 0.95, uR * 0.42, uR * 0.03, uR * 0.09);
          m = max(m, smoothstep(1.05, 0.95, fl));
          m = max(m, smoothstep(uR * 0.06 + 0.8, uR * 0.06 - 0.8, rm));
        } else if (uFrame == 1.0) {
          m = max(m, speedLines(pm, 230.0, 0.8, 0.08, uSeed.w + 3.0));
          float fl = flare(pm, uR * 0.7, uR * 0.3, uR * 0.025, uR * 0.07);
          m = max(m, smoothstep(1.05, 0.95, fl));
          float hole = smoothstep(uR * 0.1 + 0.8, uR * 0.1 - 0.8, rm);
          float ring = smoothstep(uR * 0.1 + 3.5, uR * 0.1 + 2.0, rm) - hole;
          m = max(m * (1.0 - hole), ring);
        } else {
          // the shot an instant before it is light: the beam's own nose,
          // torn along both edges, in white
          float x = max(s, 0.0) / max(uR * 0.35, 1.0);
          float hwS = uR * 0.2 * (0.22 + 0.78 * pow(x / (1.0 + x), 0.62));
          float tb = s / (uR * 0.09) + uSeed.z * 7.0;
          float tear = 0.18 * (hash(floor(tb) + (r < 0.0 ? 31.0 : 0.0)) - 0.5);
          float body = step(0.0, s) * smoothstep(hwS * (1.0 + tear) + 0.8, hwS * (1.0 + tear) - 0.8, ar);
          m = max(m, body);
          // the needle ring at the muzzle
          float R0 = uR * 0.16;
          float tn = (atan(pm.y, pm.x) / TAU + 0.5) * 120.0;
          float kn = floor(tn);
          float fn = abs(fract(tn) - 0.5);
          float hn = hash(kn + uSeed.w * 11.0);
          float out_ = R0 * (1.02 + 0.6 * hn * hn);
          float in_ = R0 * (0.84 - 0.22 * hash(kn * 1.7 + uSeed.w));
          float wn = 0.5 * (1.0 - smoothstep(R0, out_, rm)) + 0.5 * (1.0 - smoothstep(R0, in_, rm));
          m = max(m, step(in_, rm) * step(rm, out_) * smoothstep(0.32 * wn + 0.05, 0.32 * wn - 0.05, fn));
          m = max(m, smoothstep(2.2, 0.8, abs(rm - R0 * 0.93)));
        }

        for (int i = 0; i < 4; i++) {
          vec4 S = uStars[i];
          if (S.z <= 0.0) continue;
          vec2 sq = rot(pm - S.xy, S.w);
          m = max(m, smoothstep(1.05, 0.95, astroid(sq, S.z, S.z)));
        }

        vec3 c = mix(ground, mark, clamp(m, 0.0, 1.0));
        gl_FragColor = vec4(c * inside, inside);
      }
    `
  });
}

// ── 6 · THE SHOCK RINGS ─────────────────────────────────────────────────────
// Thrown down the beam at the shot (genesect's rings): an ellipse seen nearly
// edge-on, drawn as a deep pink brush line with a pale inner line, on a quad
// in the beam's own frame.
export function ringMaterial(cfg) {
  const P = cfg.palette;
  return premul({
    uniforms: {
      uC: { value: new THREE.Vector2() },
      uD: { value: new THREE.Vector2(1, 0) },
      uAB: { value: new THREE.Vector2(10, 40) },   // semi-axes: along, across
      uA: { value: 0 },
      uTh: { value: 3 },
      cDeep: { value: raw(P.deep) },
      cLight: { value: raw(P.light) }
    },
    vertexShader: /* glsl */ `
      uniform vec2 uC;
      uniform vec2 uD;
      uniform vec2 uAB;
      uniform float uTh;
      varying vec2 vQ;
      void main() {
        vQ = position.xy * (uAB + uTh + 2.0);
        vec2 p = uC + uD * vQ.x + vec2(-uD.y, uD.x) * vQ.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uAB;
      uniform float uA;
      uniform float uTh;
      uniform vec3 cDeep;
      uniform vec3 cLight;
      varying vec2 vQ;
      void main() {
        // distance to an ellipse, first order: |f| / |grad f|
        vec2 e = vQ / uAB;
        float f = dot(e, e) - 1.0;
        vec2 g = 2.0 * vQ / (uAB * uAB);
        float d = abs(f) / max(length(g), 1e-4);
        float line = smoothstep(uTh + 0.8, uTh - 0.8, d);
        float inner = smoothstep(uTh * 0.45 + 0.6, uTh * 0.45 - 0.6, d);
        // the far half of the ring is behind the beam: drawn thinner
        float far = vQ.x < 0.0 ? 0.55 : 1.0;
        float a = line * uA * far;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(mix(cDeep, cLight, inner) * a, a);
      }
    `
  });
}
