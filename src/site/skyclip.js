// skyclip.js — REAL WEATHER, FED INTO THE PRESS
//
// WHY THE CLOUDS COULD NOT TRAVEL BEFORE
// --------------------------------------
// Procedural noise cannot pan and wrap at the same time on a small frame
// budget. A seamless loop needs the field to be periodic, and a period short
// enough to cross in a couple of seconds is a period you can see tiling. So the
// procedural sky could sway, and it could not move.
//
// A clip fixes that by construction: the loop is authored, not derived, so the
// clouds can travel as far as they like and still come back.
//
// WHAT THIS IS NOT
// ----------------
// It is not a video on the page with a filter over it. The clip never reaches
// the screen and there is no video element at runtime. What ships is a
// greyscale sprite sheet — N frames of DENSITY, "where there is cloud and how
// much", at the resolution the field grid actually reads (tools/bake_sky.mjs).
// That field is handed to the same press that drew the procedural one
// (sky.js `opts.dens`) and everything downstream is untouched: the night ramp
// down the page, the sun off the top-right, the gradient lighting on the cloud
// tops, the two-ink separation, the rotated screens, the misregistration.
//
// So it is this site's sky with its weather taken from a photograph instead of
// from noise, screened on the sheet's own lattice — the clouds move, the dots
// do not.
//
// COST: one 120 KB image, decoded once. No video decoder, no seeking, no
// per-frame source work, and it behaves the same in every browser.

// The baked sheet: frames stacked vertically, greyscale. Absent until someone
// runs the bake, and the sky falls back to procedural drift if it is.
const SHEET = import.meta.glob("../assets/media/sky-field.{webp,png}",
  { eager: true, query: "?url", import: "default" });
const URL_ = Object.values(SHEET)[0] || null;

export const hasSkyClip = !!URL_;

// Must match what tools/bake_sky.mjs was run with.
export const CLIP_FRAMES = 20;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Decode the sheet and return one density sampler per frame.
 *
 * @returns { frames, sampler(i) -> (u,v) => 0..1 } or null
 *          `u,v` are normalised position on the WHOLE plate, so a windowed
 *          press asking for its own rectangle gets exactly the piece of weather
 *          that belongs there — which is what keeps every aperture on the sheet
 *          part of one sky rather than each holding its own.
 */
export async function loadSkyClip({ frames = CLIP_FRAMES } = {}) {
  if (!URL_) return null;

  // fetch + createImageBitmap rather than `new Image()` + decode(): an Image
  // is attached to the renderer, so its decode can be deferred indefinitely in
  // a backgrounded or hidden tab — and this runs before the first press, so a
  // deferred decode would hold up the whole ground. A bitmap decode is off the
  // renderer's clock and cannot be parked.
  let bmp;
  try {
    const res = await fetch(URL_);
    if (!res.ok) return null;
    bmp = await createImageBitmap(await res.blob());
  } catch {
    return null;
  }

  const w = bmp.width;
  const fh = Math.floor(bmp.height / frames);
  if (w < 8 || fh < 8) { bmp.close?.(); return null; }

  const c = document.createElement("canvas");
  c.width = w; c.height = bmp.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();

  const seq = [];
  for (let i = 0; i < frames; i++) {
    const d = ctx.getImageData(0, i * fh, w, fh).data;
    const g = new Float32Array(w * fh);
    for (let k = 0, p = 0; k < g.length; k++, p += 4) g[k] = d[p] / 255;
    seq.push(g);
  }

  // ── NORMALISE EACH FRAME ON ITS OWN ──────────────────────────────────────
  // This is the difference between weather and a flicker.
  //
  // A cloud clip's overall exposure wanders — this one swings from heavy
  // overcast at 3 seconds to blown-out bright at 7. Scaled by one global range,
  // the whole aperture would pump light and dark once per loop, which reads as
  // a fault in the printing rather than as sky. Normalising each frame to its
  // own percentiles throws that swing away and keeps only what moves.
  //
  // Percentiles rather than min/max: one blown highlight should not set the
  // scale for a whole frame. The target range is chosen around the coverage
  // threshold in sky.js (~0.48, with a 0.115-wide cloud edge), so the clip
  // lands where the sky model expects weather to be.
  const LO = 0.30, HI = 0.74;
  for (const f of seq) {
    const s = [];
    for (let i = 0; i < f.length; i += 5) s.push(f[i]);
    s.sort((a, b) => a - b);
    const lo = s[Math.floor(s.length * 0.04)] ?? 0;
    const hi = s[Math.floor(s.length * 0.96)] ?? 1;
    const span = Math.max(1e-4, hi - lo);
    for (let i = 0; i < f.length; i++) {
      f[i] = clamp01(LO + ((f[i] - lo) / span) * (HI - LO));
    }
  }

  // The same normalised field, stacked back up as one 8-bit sheet, ready to be
  // a texture. The GPU path reads the weather straight out of this and never
  // touches the CPU copy again; the CPU path uses the samplers below.
  const data = new Uint8Array(w * fh * seq.length);
  for (let f = 0; f < seq.length; f++) {
    const src = seq[f], base = f * w * fh;
    for (let i = 0; i < src.length; i++) data[base + i] = (src[i] * 255) | 0;
  }

  return {
    frames: seq.length,
    width: w,
    height: fh,
    sheet: { width: w, height: fh * seq.length, data },
    /**
     * A `dens(u,v)` for one frame of the loop — bilinear, edge-clamped.
     *
     * `fold` is how many times the clip repeats down the plate: pass
     * plateHeight / viewportHeight so one pass of the sky covers one screen.
     * Stretching a single 16:9 frame over a document-tall plate instead means
     * a hole sees only a thin strip of the source, and in a flythrough that
     * strip swings from solid overcast to clear air within a second. Alternate
     * passes are MIRRORED, so the repeat has no seam — clouds have no up or
     * down at this scale, and a fold is invisible where a butt join would be a
     * hard edge across the sheet.
     *
     * This must match foldV() in pressgl.js exactly, or the still print and the
     * moving one are two different skies.
     */
    sampler(i, fold = 1) {
      const f = seq[((i % seq.length) + seq.length) % seq.length];
      const wm = w - 1, hm = fh - 1;
      return (u, v) => {
        const t = ((v * fold) % 2 + 2) % 2;
        const vv = 1 - Math.abs(1 - t);
        const x = clamp01(u) * wm;
        const y = vv * hm;
        const x0 = x | 0, y0 = y | 0;
        const x1 = x0 < wm ? x0 + 1 : x0, y1 = y0 < hm ? y0 + 1 : y0;
        const tx = x - x0, ty = y - y0;
        const r0 = y0 * w, r1 = y1 * w;
        const a = f[r0 + x0], b = f[r0 + x1];
        const cc = f[r1 + x0], d = f[r1 + x1];
        return (a + (b - a) * tx) * (1 - ty) + (cc + (d - cc) * tx) * ty;
      };
    }
  };
}
