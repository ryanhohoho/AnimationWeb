// pixelate.js
// retro sprite presentation: the whole scene renders into a small offscreen
// target, then a single fullscreen pass upscales it with hard pixels,
// posterizes the colors into sprite-style shade bands, and draws a dark
// outline around every silhouette (alpha edges on the low-res texture).
// this is CHEAPER than direct rendering -- a fraction of the fragments --
// and touches nothing in the animation pipeline.

import * as THREE from "three";
import { GLSL_LINEAR_TO_SRGB } from "./presentMath.js";
import { INK_ALPHA } from "./spriteShade.js";

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
  uniform float outlineOn;
  uniform float lift;
  uniform float bandLuma;
  uniform float inkGate;
  varying vec2 vUv;

  ${GLSL_LINEAR_TO_SRGB}

  void main() {
    vec4 c = texture2D(map, vUv);
    if (c.a < 0.5) {
      // transparent texel: become the outline if any 4-neighbor is solid
      if (outlineOn > 0.5) {
        float a = texture2D(map, vUv + vec2(texel.x, 0.0)).a
                + texture2D(map, vUv - vec2(texel.x, 0.0)).a
                + texture2D(map, vUv + vec2(0.0, texel.y)).a
                + texture2D(map, vUv - vec2(0.0, texel.y)).a;
        if (a > 0.5) {
          gl_FragColor = vec4(linearToSrgb(outlineColor), 1.0);
          return;
        }
      }
      discard;
    }
    // the render target is LINEAR (three only encodes when drawing to the
    // default framebuffer, and a raw ShaderMaterial never gets the encode
    // injected). do it here or the whole character comes out gamma-dark.
    vec3 s = linearToSrgb(c.rgb);

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
    outlineOn: { value: cfg.outline ? 1 : 0 },
    lift: { value: cfg.shadeLift ?? 0 },
    bandLuma: { value: (cfg.bandLuma ?? true) ? 1 : 0 },
    // halfway between the ink flag and solid, so it cannot be confused with
    // either. see fx/spriteShade.js -> INK_ALPHA.
    inkGate: { value: (INK_ALPHA + 1) / 2 }
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
    render(scene, camera) {
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(blitScene, blitCam);
    },
    dispose() {
      rt.dispose();
      blitMat.dispose();
    }
  };
}
