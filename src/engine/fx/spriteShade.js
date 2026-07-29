// spriteShade.js
// turns the character's PBR material into a sprite: the light rig's smooth
// falloff is cut into a few flat sections with hue-shifted shadows, and the
// painted marks (the eyes, the blush) are drawn FLAT, at full contrast,
// wherever the character is facing.
//
// WHY THIS AND NOT MORE POSTERIZE
// -------------------------------
// the retro look used to be one posterize at the very end of the frame, over
// the finished picture. that has two problems the owner ran straight into:
//
//   * IT BANDS THE ART TOO. the eyes are a painted decal a dozen pixels across;
//     quantizing their brightness alongside the skin, then lifting the darks
//     toward the light side (`shadeLift`, which existed to stop the shadow side
//     going black), pulls a navy eye up toward the pink around it. that is what
//     "the eyes are masked by the filter" was.
//   * THE STEPS MOVE. banding the final image puts a step wherever the gradient
//     happens to cross a threshold, so the terminator crawls across the face as
//     the character turns. banding the LIGHT puts the steps at fixed
//     brightnesses, and the sections stay put -- which is what a hand-painted
//     sprite looks like.
//
// so the banding moves INTO the character's material, where it can tell art
// from surface:
//
//   shade = outgoingLight / albedo          the light rig's own result, undone
//                                           back to an incident level, so all of
//                                           lighting.* still applies unchanged
//   q     = shadeBand(luma(shade), ...)     cut into flat sections
//   tint  = mix(shadowTint, lightTint, q)   shadows shift COOL, lights WARM.
//                                           a shadow that is only darker reads
//                                           as dirt; the hue shift is what makes
//                                           it read as light. standard practice
//                                           in pixel art for exactly this reason
//   ink   = how far this texel is from the flat skin colour
//   out   = mix(albedo * q * tint, albedo * flat, ink)
//
// and the fragment writes an ALPHA FLAG on ink, so the pixelate pass can leave
// the painted marks alone as well (see fx/pixelate.js).

import * as THREE from "three";
import { GLSL_SPRITE_SHADE } from "./presentMath.js";
import { INK_ALPHA } from "./alphaFlags.js";

// alpha written for painted marks. anything above 0.5 is "solid" as far as the
// outline test is concerned, so this is invisible to everything except the one
// branch in pixelate.js that looks for it. The full alpha-channel protocol --
// what every value in it means, and who writes it -- lives in fx/alphaFlags.js;
// this re-export is here so the modules that only ever needed this one flag do
// not have to know about the rest.
export { INK_ALPHA };

const PARS = /* glsl */ `
  uniform vec3  spriteSkin;
  uniform vec3  spriteTint;
  uniform vec3  spriteBlushTint;
  uniform float spriteBlushLuma;
  uniform float spriteBlushMix;
  uniform float spriteWarmLo;
  uniform float spriteWarmHi;
  uniform float spriteFlash;
  uniform vec3  spriteShadowTint;
  uniform vec3  spriteLightTint;
  uniform float spriteBands;
  uniform float spriteFloor;
  uniform float spriteGain;
  uniform float spriteInkLo;
  uniform float spriteInkHi;
  uniform float spriteInkShade;
  uniform float spriteInkBoost;
  uniform float spriteInkAlpha;
  ${GLSL_SPRITE_SHADE}
`;

const OUT = /* glsl */ `
  vec3 albedo = max(diffuseColor.rgb, vec3(1e-4));
  // undo the albedo the light rig already multiplied in: what is left is the
  // incident light, which is the thing worth quantizing
  vec3 shade = outgoingLight / albedo;
  float lum = dot(shade, vec3(0.2126, 0.7152, 0.0722));
  // the RAW band drives the tint and the FLOORED one drives the brightness. mix
  // the tint on the floored value instead and the darkest section barely shifts
  // at all -- the floor is 0.52, so nothing ever gets near the shadow end of the
  // ramp and the hue shift, which is the entire point, disappears.
  float raw = min(1.0, floor(max(lum, 0.0) * spriteBands + 0.5)
                       / spriteBands * spriteGain);
  float q = shadeBand(lum, spriteBands, spriteFloor, spriteGain);
  vec3 tint = mix(spriteShadowTint, spriteLightTint, raw);
  // THE RECOLOUR (shiny). the body is exactly one texel of spriteSkin, so the
  // shaded path can simply use the TARGET colour instead of the sampled one --
  // there is nothing else in there to lose. normally spriteTint == spriteSkin
  // and this line is an identity.
  vec3 lit = spriteTint * q * tint;
  float ink = inkness(albedo, spriteSkin, spriteInkLo, spriteInkHi);
  // MINIFICATION SHARPENING. an 880 px face island lands on about twenty pixels
  // of the low-res target, so every eye texel that reaches the screen is an
  // average of navy ink and pink skin -- which is the actual reason the eyes
  // read as blurry, and no filtering setting can undo an average. pushing the
  // sampled colour back AWAY from the skin colour does undo it, and because it
  // only runs on ink it cannot touch the skin's own shading.
  vec3 sharp = clamp(spriteSkin + (albedo - spriteSkin) * spriteInkBoost,
                     vec3(0.0), vec3(1.0));
  // RE-ANCHOR THE SKIN INSIDE THE INK. a texel on the edge of an eye is
  // f*ink + (1-f)*skin, and the ink weight IS that f, so the skin hiding in it
  // can be swapped for the new one in closed form:
  //     albedo' = albedo + (1 - ink) * (tint - skin)
  // without this, every antialiased boundary keeps the PINK it was blended
  // with, and against a blue body that reads as a magenta fringe around both
  // eyes and the blush. it is an identity when tint == skin.
  sharp = clamp(sharp + (1.0 - ink) * (spriteTint - spriteSkin),
                vec3(0.0), vec3(1.0));
  // THE WARM ART also has to move for a shiny, and it is ink, so the recolour
  // above never reaches it. shiny mew's official artwork has ZERO warm pixels
  // -- the cheeks are just a deeper shade of the body -- so leaving the blush
  // alone would ship a cyan mew with hot pink cheeks.
  //
  // THE WARM TEST IS NORMALISED BY BRIGHTNESS, not absolute. an absolute r-b
  // catches the blush core (0.70) and misses its own gradient: a half-strength
  // blush texel, which is what the mip chain actually samples over a face
  // twenty pixels wide, sits at 0.18 and falls through BOTH nets -- the
  // re-anchor above skips it because it is fully ink, and this one skips it
  // because it is pale. that is exactly where the last pink pixels around the
  // eyes were hiding. dividing by luma separates the same set cleanly:
  // blush 4.70, half-blush 0.6-1.2, eye whites 0.04, iris 0.00, and plain skin
  // -1.00 (it has already been recoloured by the line above).
  //
  // the target is scaled by the source's own brightness, so the blush keeps its
  // soft gradient instead of being stamped on as a flat disc.
  vec3 inkCol = sharp;
  if (spriteBlushMix > 0.0) {
    float bl = dot(sharp, vec3(0.2126, 0.7152, 0.0722));
    float warm = smoothstep(spriteWarmLo, spriteWarmHi,
                            (sharp.r - sharp.b) / max(bl, 1e-3));
    vec3 blushed = clamp(spriteBlushTint * (bl / spriteBlushLuma),
                         vec3(0.0), vec3(1.0));
    inkCol = mix(inkCol, blushed, warm * spriteBlushMix);
  }
  // ink keeps a trace of the shading so it does not look pasted on
  vec3 flat_ = inkCol * mix(1.0, q, spriteInkShade);
  vec3 outCol = mix(lit, flat_, ink);
  // the SPAWN FLASH. "a flash of stars or light" is half of what a shiny
  // entrance is; this is the light half, and it has to sit here rather than in
  // the pixelate pass so it blows out the eyes along with everything else.
  outCol = mix(outCol, vec3(1.0), spriteFlash);
  gl_FragColor = vec4(outCol, mix(1.0, spriteInkAlpha, ink));
`;

function srgbToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function hexToLinear(hex) {
  return [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
}

/**
 * patch every material under `root` (the loaded character) to shade in flat
 * sections. returns a handle exposing the uniforms plus setVariant() (the shiny
 * recolour) and setFlash(), so the look can also be poked live from devtools.
 */
export function applySpriteShade(root, { config, skinHex, blushHex, renderer }) {
  const cfg = config;
  const skin = hexToLinear(skinHex);
  const blushRef = hexToLinear(blushHex);
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  const uniforms = {
    spriteSkin: { value: new THREE.Vector3(...skin) },
    spriteTint: { value: new THREE.Vector3(...skin) },
    spriteBlushTint: { value: new THREE.Vector3(...blushRef) },
    spriteBlushLuma: { value: Math.max(luma(blushRef), 1e-4) },
    spriteBlushMix: { value: 0 },
    spriteWarmLo: { value: cfg.warmLo },
    spriteWarmHi: { value: cfg.warmHi },
    spriteFlash: { value: 0 },
    // MULTIPLIERS, not colours: authoring these as hex would send them through
    // three's sRGB decode and a "#ffffff" tint would stop being 1.0
    spriteShadowTint: { value: new THREE.Vector3(...cfg.shadowTint) },
    spriteLightTint: { value: new THREE.Vector3(...cfg.lightTint) },
    spriteBands: { value: cfg.bands },
    spriteFloor: { value: cfg.shadeFloor },
    spriteGain: { value: cfg.shadeGain },
    spriteInkLo: { value: cfg.inkLo },
    spriteInkHi: { value: cfg.inkHi },
    spriteInkShade: { value: cfg.inkShade },
    spriteInkBoost: { value: cfg.inkBoost },
    spriteInkAlpha: { value: INK_ALPHA }
  };

  const maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  root.traverse((o) => {
    const mat = o.material;
    if (!mat || mat.userData.spriteShaded) return;
    mat.userData.spriteShaded = true;
    // the atlas is minified hard -- an 880 px face island lands on ~30 pixels of
    // a low-res target -- and trilinear alone picks a mip blurry enough to lose
    // the catchlight. anisotropic filtering is the one knob that sharpens a
    // minified texture without introducing the crawl that NEAREST would.
    if (mat.map) {
      mat.map.anisotropy = maxAniso;
      mat.map.needsUpdate = true;
    }
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", `${PARS}\nvoid main() {`)
        .replace("#include <opaque_fragment>", OUT);
    };
    mat.needsUpdate = true;
  });

  return {
    uniforms,
    /** recolour the character. `null` restores the baked skin. */
    setVariant(variant) {
      const t = variant ? hexToLinear(variant.skinHex) : skin;
      const b = variant ? hexToLinear(variant.blushHex) : blushRef;
      uniforms.spriteTint.value.set(...t);
      uniforms.spriteBlushTint.value.set(...b);
      uniforms.spriteBlushLuma.value = Math.max(luma(b), 1e-4);
      uniforms.spriteBlushMix.value = variant ? 1 : 0;
    },
    setFlash(v) {
      uniforms.spriteFlash.value = Math.min(Math.max(v, 0), 1);
    }
  };
}
