// presentMath.js
// pure math for the presentation passes -- no three, no dom, headless-testable
// (same pattern as beamGeometry.js). the GLSL below is the shader mirror of the
// js functions; keep the two in sync, the tests pin the js side.

// ---------------------------------------------------------------------------
// linear -> sRGB transfer function (the exact IEC 61966-2-1 piecewise curve).
//
// WHY THIS EXISTS: three only applies the output color-space encode when it
// renders to the default framebuffer. our passes render the scene into a
// WebGLRenderTarget instead, and a raw ShaderMaterial gets no automatic encode
// either, so without this the LINEAR lighting result lands in an sRGB canvas
// untouched and everything reads far too dark (a mid pink turns dusty purple).
// ---------------------------------------------------------------------------
export function linearToSrgb(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

// GLSL mirror of linearToSrgb, applied per channel
export const GLSL_LINEAR_TO_SRGB = /* glsl */ `
  vec3 linearToSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return clamp(mix(hi, lo, step(c, vec3(0.0031308))), 0.0, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// SPRITE SHADING: the smooth lambert falloff, cut into flat sections.
//
// posterizing the FINISHED PICTURE (what the pixelate pass used to do on its
// own) bands whatever happens to be on screen, which means the terminator lands
// wherever the gradient happens to cross a step and the painted eyes get banded
// along with the skin. banding the LIGHT instead puts the steps at fixed
// brightnesses, so the shape reads as a few flat sections that stay put as the
// character turns -- which is how a hand-drawn sprite is shaded.
//
// `lum` is the incident light level, 0 = fully shadowed, 1 = fully lit.
//   bands  how many steps
//   floor  the darkest step's level. this is what keeps the shadow side in the
//          pink family instead of going to black; it replaced the old
//          `shadeLift`, which did the same job by lifting the final image and
//          washed the eyes out along with everything else.
//   gain   contrast before the floor is applied: >1 pushes more of the surface
//          into the top band, which reads flatter and more sticker-like
// ---------------------------------------------------------------------------
export function shadeBand(lum, bands, floor, gain) {
  const q = Math.floor(Math.max(lum, 0) * bands + 0.5) / bands;
  return floor + (1 - floor) * Math.min(1, q * gain);
}

// how far a texel is from the flat skin colour: 0 = plain skin, 1 = painted
// ink (the eyes, the blush). ink is ART, not surface -- it is drawn flat, so
// the light rig can never dim the eyes into the face.
export function inkness(color, skin, lo, hi) {
  let d = 0;
  for (let i = 0; i < 3; i++) d += (color[i] - skin[i]) ** 2;
  d = Math.sqrt(d);
  const t = Math.min(Math.max((d - lo) / (hi - lo), 0), 1);
  return t * t * (3 - 2 * t);
}

export const GLSL_SPRITE_SHADE = /* glsl */ `
  float shadeBand(float lum, float bands, float shadeFloor, float gain) {
    float q = floor(max(lum, 0.0) * bands + 0.5) / bands;
    return shadeFloor + (1.0 - shadeFloor) * min(1.0, q * gain);
  }
  float inkness(vec3 c, vec3 skin, float lo, float hi) {
    return smoothstep(lo, hi, distance(c, skin));
  }
`;

// ---------------------------------------------------------------------------
// cover-fit: map viewport uv -> image uv so the image fills the viewport
// without distortion, cropping the overflowing axis (css `background-size:
// cover`). returns the scale applied around the uv center; zoom < 1 pushes the
// image out further, > 1 crops in.
// ---------------------------------------------------------------------------
export function coverFit(viewW, viewH, imgW, imgH, zoom = 1) {
  const view = viewW / viewH;
  const img = imgW / imgH;
  // wider image than the viewport -> sample a narrower slice of x, and vice versa
  const sx = img > view ? view / img : 1;
  const sy = img > view ? 1 : img / view;
  const z = zoom > 0 ? 1 / zoom : 1;
  return { x: sx * z, y: sy * z };
}

// how far the overlay uv slides for a given scroll offset, when the background
// is pinned to the DOCUMENT instead of the viewport. scrolling down moves the
// page up, so the sampled window moves down the image.
export function scrollUvOffset(scrollY, viewH, scaleY, parallax = 1) {
  if (!viewH) return 0;
  return -(scrollY / viewH) * scaleY * parallax;
}
