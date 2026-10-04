// pixelate.js
// retro sprite presentation: the whole scene renders into a small offscreen
// target, then a single fullscreen pass upscales it with hard pixels,
// posterizes the colors into sprite-style shade bands, and draws a dark
// outline around every silhouette (alpha edges on the low-res texture).
// this is CHEAPER than direct rendering -- a fraction of the fragments --
// and touches nothing in the animation pipeline.

import * as THREE from "three";
import { GLSL_LINEAR_TO_SRGB } from "./presentMath.js";
import { FX_GATE, INK_GATE, SOFT_GATE } from "./alphaFlags.js";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 texel;
  uniform float levels;
  uniform vec3 outlineColor;
  uniform vec3 fxOutlineColor;
  uniform float outlineOn;
  uniform float lift;
  uniform float bandLuma;
  uniform float inkGate;
  uniform float fxGate;
  uniform float softGate;
  // THE IMPACT FRAMES' SILHOUETTE. For the three drawings before a hyper beam
  // (fx/beam.js) she is one flat ink -- white on the burst's black, black on
  // its white -- the way every anime impact frame flattens its subject. 0 is
  // off; while on, her line is drawn in the same ink so the silhouette reads
  // as one shape.
  uniform float flatOn;
  uniform vec3 flatColor;
  varying vec2 vUv;

  ${GLSL_LINEAR_TO_SRGB}

  void main() {
    vec4 c = texture2D(map, vUv);
    if (c.a < 0.5) {
      // transparent texel: become the outline if any 4-neighbor is solid
      if (outlineOn > 0.5) {
        // the STRONGEST neighbour, not the sum. the alpha channel carries a
        // flag saying what drew each texel (fx/alphaFlags.js) and summing four
        // of them destroys it -- two beam pixels at 0.58 add up to look exactly
        // like the character's 1.0. taking the max keeps the flag readable AND
        // gets the priority right: where a beam runs off the edge of mew, the
        // character's silhouette line is the one that should win.
        float a = max(
          max(texture2D(map, vUv + vec2(texel.x, 0.0)).a,
              texture2D(map, vUv - vec2(texel.x, 0.0)).a),
          max(texture2D(map, vUv + vec2(0.0, texel.y)).a,
              texture2D(map, vUv - vec2(0.0, texel.y)).a));
        // ...and soft glows are below the gate entirely, so a muzzle flash
        // stays a wash of light instead of becoming an outlined bubble.
        if (a > softGate) {
          // a dark plum line reads as ink around a body and as SOOT around a
          // hyper beam, which is the one place the silhouette colour was
          // actively wrong. Additive fx get a hot rim instead.
          vec3 oc = a < fxGate ? fxOutlineColor : outlineColor;
          oc = mix(oc, flatColor, flatOn);
          gl_FragColor = vec4(linearToSrgb(oc), 1.0);
          return;
        }
      }
      discard;
    }
    // the render target is LINEAR (three only encodes when drawing to the
    // default framebuffer, and a raw ShaderMaterial never gets the encode
    // injected). do it here or the whole character comes out gamma-dark.
    vec3 s = linearToSrgb(c.rgb);
    if (flatOn > 0.5) {
      gl_FragColor = vec4(linearToSrgb(flatColor), 1.0);
      return;
    }

    // PAINTED ART PASSES THROUGH UNTOUCHED. fx/spriteShade.js writes this alpha
    // on the eyes and the blush; they are a decal a dozen pixels across, and
    // lifting their darks toward the light side then re-banding them is what
    // was washing a navy eye out into the pink around it. the character's skin
    // writes alpha 1 and gets the full pass; a blended fx pixel that happens to
    // land under the gate skips it too, which is what you want on a glow anyway.
    if (c.a < inkGate) {
      gl_FragColor = vec4(s, 1.0);
      return;
    }

    // shade lift: pull the darks up toward the light side. flattens the form
    // without touching the light rig
    s = mix(s, sqrt(s), lift);

    // posterize AFTER the encode, so the bands are perceptually even instead
    // of piling up in the shadows.
    if (bandLuma > 0.5) {
      // band the BRIGHTNESS and keep the chroma. quantizing r,g,b separately
      // rounds the channels apart and drags hues around -- it is what was
      // turning the pink shadow bands neutral/purple. scaling by a quantized
      // luma instead keeps the hue exactly, which is what you want on a
      // single-color character.
      float y = dot(s, vec3(0.2126, 0.7152, 0.0722));
      float q = floor(y * levels + 0.5) / levels;
      float m = max(max(s.r, s.g), s.b);
      // never scale past the point where a channel would clip and shift hue
      s *= min(q / max(y, 1e-4), 1.0 / max(m, 1e-4));
    } else {
      s = floor(s * levels + 0.5) / levels;
    }
    gl_FragColor = vec4(s, 1.0);
  }
`;

export function createPixelate({ renderer, config }) {
  const cfg = config;
  const rt = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true
  });
  rt.texture.generateMipmaps = false;

  const uniforms = {
    map: { value: rt.texture },
    texel: { value: new THREE.Vector2(1, 1) },
    levels: { value: cfg.colorLevels },
    outlineColor: { value: new THREE.Color(cfg.outlineColor) },
    fxOutlineColor: { value: new THREE.Color(cfg.fxOutlineColor ?? cfg.outlineColor) },
    outlineOn: { value: cfg.outline ? 1 : 0 },
    lift: { value: cfg.shadeLift ?? 0 },
    bandLuma: { value: (cfg.bandLuma ?? true) ? 1 : 0 },
    // the thresholds in the alpha protocol, each sitting halfway between the
    // flags it separates so nothing ever lands on a boundary.
    // see fx/alphaFlags.js.
    inkGate: { value: INK_GATE },
    fxGate: { value: FX_GATE },
    softGate: { value: SOFT_GATE },
    flatOn: { value: 0 },
    flatColor: { value: new THREE.Color(0, 0, 0) }
  };
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
    // the low-res target IS the resolution here: drawing the canvas at dpr
    // would just resample the same texels
    pixelRatio: () => 1,
    // classic sprite crawl: the render position quantizes to the texel grid
    snapPx: () => (cfg.snapToGrid ? cfg.pixelSize : 0),
    resize(w, h) {
      const rw = Math.max(2, Math.ceil(w / cfg.pixelSize));
      const rh = Math.max(2, Math.ceil(h / cfg.pixelSize));
      rt.setSize(rw, rh);
      uniforms.texel.value.set(1 / rw, 1 / rh);
    },
    // `under` and `over` are the hyper beam's two scenes (fx/beam.js), drawn
    // at the canvas's own resolution either side of her sprite, with their
    // own pixel camera. Absent, this is exactly the pass it always was.
    render(scene, camera, opts) {
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      const under = opts?.under, over = opts?.over, fxCam = opts?.fxCamera;
      if (!fxCam || (!under && !over)) {
        renderer.render(blitScene, blitCam);
        return;
      }
      const ac = renderer.autoClear;
      renderer.clear();
      renderer.autoClear = false;
      if (under) renderer.render(under, fxCam);
      renderer.render(blitScene, blitCam);
      if (over) renderer.render(over, fxCam);
      renderer.autoClear = ac;
    },
    /** her flat silhouette for the impact frames: a css colour, or null */
    setFlat(hex) {
      uniforms.flatOn.value = hex ? 1 : 0;
      if (hex) uniforms.flatColor.value.set(hex);
    },
    dispose() {
      rt.dispose();
      blitMat.dispose();
    }
  };
}
