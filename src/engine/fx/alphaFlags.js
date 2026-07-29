// alphaFlags.js
// THE ALPHA CHANNEL IS A SIDE CHANNEL.
//
// everything draws into one small offscreen target and fx/pixelate.js turns
// that into the finished picture: it upscales with hard pixels, posterizes the
// colours into sprite shade bands, and rings every silhouette with a dark
// outline. Those last two are wrong for some of what is in the frame -- painted
// art must not be re-banded, and a hyper beam must not be ringed in dark plum --
// so the passes that draw those things WRITE A FLAG in the alpha channel and
// pixelate reads it back.
//
// the whole protocol, in one place, because it only works if both ends agree:
//
//   a = 0                 nothing here. pixelate discards it, unless a
//                         4-neighbour is solid, in which case it becomes the
//                         outline.
//   a = SOFT_ALPHA (0.51) a soft radial glow: the muzzle flash, the charge ball,
//                         the sparks. DRAWN, but never outlined -- see below.
//   a = FX_ALPHA (0.58)   an additive fx pixel with a shape: the beam. Outlined,
//                         and the line drawn against it is the BRIGHT one.
//   a = INK_ALPHA (0.72)  painted art: the eyes, the blush, the sparkle stars.
//                         Skips the shade lift and the posterize entirely.
//   a = 1                 the character's own surface. Full treatment.
//
// WHY A GLOW NEEDS ITS OWN FLAG. pixelate discards everything under 0.5, so an
// fx pass cannot opt out of being solid -- it would opt out of being drawn. But
// a muzzle flash IS a fade; ringing it turns a wash of light into a bubble, and
// the ring around the flash sitting over mew's face is exactly what read as "a
// semicircle inside mew". So the soft flag says draw me, do not outline me, and
// where a glow lies over the beam the MAX blend hands back the beam's own flag,
// so the beam keeps its rim.
//
// SOFT_GATE / FX_GATE / INK_GATE each sit halfway between the flags they
// separate, so one compare classifies a texel and a value that drifts (an fx
// layer over another) still lands on the right side.

import * as THREE from "three";

export const SOFT_ALPHA = 0.51;
export const FX_ALPHA = 0.58;
export const INK_ALPHA = 0.72;
export const SOFT_GATE = (SOFT_ALPHA + FX_ALPHA) / 2;  // 0.545
export const FX_GATE = (FX_ALPHA + INK_ALPHA) / 2;     // 0.65
export const INK_GATE = (INK_ALPHA + 1) / 2;           // 0.86

// how much light a fx fragment has to be carrying before it counts as part of
// the beam at all. Below this it writes alpha 0 and pixelate discards it, which
// is where the beam's visible edge -- and therefore its outline -- ends up.
// LOW ON PURPOSE: the glow layer only ever reaches 0.45, and cutting it at half
// that would shrink the beam to its core.
export const FX_EDGE = 0.1;

/**
 * make an additive fx material announce itself to the pixelate pass.
 *
 * TWO CHANGES, and both are needed:
 *
 *   1. THE FRAGMENT writes a CONSTANT alpha wherever it is carrying light, so
 *      "is this a beam pixel" is one compare rather than a guess about how much
 *      alpha four overlapping additive layers happened to accumulate.
 *   2. THE ALPHA CHANNEL BLENDS WITH MAX instead of adding. Additive blending
 *      adds alpha too, so layered fx used to pile up past 1.0 in the core while
 *      the fringes stayed under 0.5 and were discarded -- which is exactly what
 *      put a hard black rim around the beam. MAX makes the flag idempotent: any
 *      number of layers over each other still reads FX_ALPHA, and where the fx
 *      crosses the character the character's own 1.0 wins and keeps its
 *      silhouette.
 *
 * the COLOUR blend is untouched -- still src*srcAlpha + dst, i.e. exactly
 * THREE.AdditiveBlending.
 *
 * @param soft  true for a radial glow that should be drawn but never outlined.
 */
export function markFxMaterial(mat, soft = false) {
  const flag = soft ? SOFT_ALPHA : FX_ALPHA;
  mat.transparent = true;
  mat.blending = THREE.CustomBlending;
  mat.blendEquation = THREE.AddEquation;
  mat.blendSrc = THREE.SrcAlphaFactor;
  mat.blendDst = THREE.OneFactor;
  mat.blendEquationAlpha = THREE.MaxEquation;
  // ignored by MAX (the spec drops the factors), set so the state reads honestly
  mat.blendSrcAlpha = THREE.OneFactor;
  mat.blendDstAlpha = THREE.OneFactor;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <colorspace_fragment>",
      `#include <colorspace_fragment>
       gl_FragColor.a = gl_FragColor.a > ${FX_EDGE.toFixed(4)}
         ? ${flag.toFixed(4)} : 0.0;`
    );
  };
  mat.needsUpdate = true;
  return mat;
}
