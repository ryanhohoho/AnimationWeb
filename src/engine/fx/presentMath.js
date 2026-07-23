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
