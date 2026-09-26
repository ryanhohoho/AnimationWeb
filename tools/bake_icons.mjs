// bake_icons.mjs — TURN THE PROJECT ICONS INTO ONE MASK ATLAS
//
// A project's icon has to be a SHAPE, not a picture, because the site cuts it
// out of the paper: on the projects sheet the icon is a hole, and what shows
// through it is that project's own sky. A hole needs an alpha channel and the
// three source files do not have one between them.
//
//   icon-motion-graphics.png   PNG,  520x520, grey: white art pixels on black
//   icon-iclicker.jpg          JPEG, 1024x1024, no alpha
//   icon-usb-provisioning.jpg  JPEG, 1024x1024, no alpha
//
// (two of them shipped as .png with JPEG bytes inside; renamed, because
// media.js ranks capture slots by EXTENSION and would have believed the lie.)
//
// THE SOURCE ART LIVES HERE, NEXT TO THE TOOL, and not in src/assets/media/ --
// media.js globs that directory eagerly, so anything in it is bundled whether
// anything imports it or not. Three source icons nobody ships is 590 KB of dead
// weight in dist, against 7 KB for the atlas they bake down to.
//
// All three are light-glyph-on-dark. usb-provisioning also carries a white
// margin OUTSIDE its squircle, which is not part of the icon -- keyed naively it
// becomes a solid square hole with the icon punched out of it, i.e. the exact
// inverse of the drawing. The border flood fill below is what removes it.
//
// WHAT COMES OUT
//   src/assets/media/icon-atlas.png   greyscale column, one cell per glyph.
//                                     white = hole. This is uMask in pressgl.
//   src/assets/media/glyph-<slug>.png RGBA, pure white, alpha = THE SAME KEY.
//                                     Two jobs: the white icon you see at rest,
//                                     and the CSS mask that punches the card.
//   src/site/iconatlas.js             generated. cell order + the uv arithmetic.
//
// The white plate and the shader hole share one alpha channel on purpose. They
// are drawn by two completely different machines -- CSS compositing and a
// fragment shader -- and they have to agree on the same edge to within a pixel
// or the icon shows a rim of paper as it crossfades. Deriving both from one
// buffer makes agreement structural instead of a thing to keep checking.
//
//   node tools/bake_icons.mjs [--invert <slug>] [--cover 0.82]
//
// ffmpeg-static is the only image I/O, exactly as in bake_sky.mjs. No new deps:
// ffmpeg decodes anything into raw grey on a pipe and writes anything back off
// one, so every decision in between is plain arithmetic in this file.

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ffmpeg from "ffmpeg-static";

// ── the cells, in order ──────────────────────────────────────────────────────
// The order IS the atlas layout and it is what iconatlas.js exports, so it must
// not be sorted, filtered or otherwise made clever. Kept a power of two so the
// v arithmetic is exact in float32; a fifth project pushes this to 8 and the
// spare cells cost 16 KB of a greyscale image.
const CELLS = [
  { slug: "usb-provisioning", src: "tools/icons/icon-usb-provisioning.jpg" },
  // the hallway's pixel flower, from "let me be a flower": its shape evaluated
  // off the piece's own shader (hallway.js, flower(), seed .55, no wind) on its
  // 26-cell art grid, as white cells on black. The FILL only: with the sprite's
  // one-pixel outline ring included the silhouette read as a blob, not a flower
  { slug: "motion-graphics",  src: "tools/icons/icon-motion-graphics.png" },
  // the confidential project: a padlock on the same kind of pixel grid as the
  // flower (src/site/padlock.js, rendered by tools/bake_padlock.mjs)
  { slug: "rcmp-encryption",  src: "tools/icons/icon-rcmp-encryption.png" },
  { slug: "iclicker",         src: "tools/icons/icon-iclicker.jpg" }
  // THERE IS NO "back" CELL ANY MORE. The back control was an arrow-shaped hole
  // and is now a disc of sky with a drawn arrow on top of it, because a hole
  // lives under the type and a control cannot. Nothing masks an arrow now, so
  // baking one would be an asset with no consumer.
];

const CELL = 128;          // ~1:1 with how big the icon lands on screen, so the
                           // shader never minifies it. See the note by the atlas
                           // write for why bigger is worse, not better.
const WORK = 512;          // what the key is computed at, before the downsample
const GUTTER = 6;          // dead texels inside each cell, so a bilinear fetch
                           // at the edge of one glyph cannot reach the next
let COVER = 0.82;          // how much of the live area the glyph's long side
                           // fills, AFTER trimming. This is the number that makes
                           // three drawings with three different margins read at
                           // the same weight.

const args = process.argv.slice(2);
const forceInvert = new Set();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--invert") forceInvert.add(args[++i]);
  else if (args[i] === "--cover") COVER = Number(args[++i]);
}

// ── decode ───────────────────────────────────────────────────────────────────
// Letterboxed onto black rather than stretched: an icon is a drawing, and a
// drawing that changes proportion is a different drawing. Black is the correct
// pad colour because these are all light-on-dark, so the pad reads as ground.
function decodeGrey(file) {
  const buf = execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error",
    "-i", file,
    "-vf", `scale=${WORK}:${WORK}:force_original_aspect_ratio=decrease,` +
           `pad=${WORK}:${WORK}:(ow-iw)/2:(oh-ih)/2:color=black,format=gray`,
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"
  ], { maxBuffer: 1 << 28 });
  if (buf.length !== WORK * WORK) {
    throw new Error(`${file}: got ${buf.length} bytes, wanted ${WORK * WORK}`);
  }
  return new Float32Array(Array.from(buf, (v) => v / 255));
}

// ── polarity ─────────────────────────────────────────────────────────────────
// BY MAJORITY, NOT BY THE BORDER. The obvious detector is "sample the frame
// edge, that is the background" and it gets usb-provisioning exactly backwards:
// its four corners sit OUTSIDE the squircle and are white, so a border test
// concludes the ground is light, inverts, and destroys the drawing. What is
// actually true of all three files is that most of the frame is dark and the
// mark is light, which is what this measures.
function isLightOnDark(g) {
  let dark = 0;
  for (let i = 0; i < g.length; i++) if (g[i] < 0.5) dark++;
  return dark / g.length > 0.5;
}

// ── the key ──────────────────────────────────────────────────────────────────
// Otsu picks the threshold, then the key is a RAMP across it rather than a step.
// Two of the three sources are JPEGs and carry ringing along every edge; a hard
// threshold turns that ringing into a fringe of loose pixels, and those print as
// dirt in a hole that is supposed to have a drawn edge.
function otsu(g) {
  const h = new Float64Array(256);
  for (let i = 0; i < g.length; i++) h[Math.min(255, Math.max(0, Math.round(g[i] * 255)))]++;
  const total = g.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * h[t];
  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += h[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * h[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > bestVar) { bestVar = v; best = t; }
  }
  return best / 255;
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
};

// ── drop anything that touches the frame ─────────────────────────────────────
// THIS IS THE usb-provisioning FIX, and it is worth stating as a rule rather
// than as a special case: an icon is a mark on a ground, so any lit region that
// runs off the edge of the frame is ground that happened to be light, not mark.
// Four-connected, seeded from every border pixel that survived the key, with an
// explicit stack because 512x512 will blow the call stack if this recurses.
//
// Costs nothing on the other two: neither the dress nor the iclicker glyph
// touches its frame, so the fill finds no seed and returns immediately.
function dropFrameConnected(a, w, h, thresh = 0.35) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => { if (!seen[i] && a[i] > thresh) { seen[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  let killed = 0;
  while (stack.length) {
    const i = stack.pop();
    a[i] = 0; killed++;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  return killed;
}

// ── trim, rescale, centre ────────────────────────────────────────────────────
// The three drawings arrive with wildly different margins -- the dress fills
// about 85% of its frame, the iclicker glyph about 55%. Left alone that is three
// holes at three sizes in three identical cards, which reads as a mistake rather
// than as a system. Normalising the LONG SIDE (not the area) keeps each drawing's
// own proportion while making them all sit the same in their cell.
function trimAndFit(a, w, h, cell, cover) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a[y * w + x] > 0.5) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const out = new Float32Array(cell * cell);
  if (x1 < 0) return { out, empty: true };

  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const live = cell - GUTTER * 2;
  const s = (cover * live) / Math.max(bw, bh);      // source px per dest px
  const dw = bw * s, dh = bh * s;
  const ox = (cell - dw) / 2, oy = (cell - dh) / 2;

  // area-ish downsample: one bilinear tap per dest pixel is not enough going
  // 512 -> 128, it aliases the thin strokes in the terminal glyph into dashes.
  const box = Math.max(1, Math.floor(1 / s));
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      const sx = x0 + (x - ox) / s, sy = y0 + (y - oy) / s;
      if (sx < x0 - 1 || sy < y0 - 1 || sx > x1 + 1 || sy > y1 + 1) continue;
      let acc = 0, n = 0;
      for (let j = 0; j < box; j++) {
        for (let i = 0; i < box; i++) {
          const px = Math.round(sx + i - box / 2), py = Math.round(sy + j - box / 2);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          acc += a[py * w + px]; n++;
        }
      }
      out[y * cell + x] = n ? acc / n : 0;
    }
  }
  return { out, empty: false };
}

// one pixel of feather, so the shader's edge and the CSS mask's edge --
// two different rasterisers -- land on the same sub-pixel
function feather(a, w, h) {
  const o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0, n = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const px = x + i, py = y + j;
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const k = (i === 0 && j === 0) ? 4 : 1;
          acc += a[py * w + px] * k; n += k;
        }
      }
      o[y * w + x] = acc / n;
    }
  }
  return o;
}

// ── a drawn glyph, kept for the next cell that needs one ─────────────────────
// Unused today: the back control stopped being a masked hole. Kept because the
// next cell that has no source file will want exactly this -- geometry that
// lives next to COVER and the cell constants, so a drawn glyph lands at the same
// weight as a photographed one by construction rather than by measurement.
function backArrow() {
  const a = new Float32Array(WORK * WORK);
  const S = WORK;
  const midY = S / 2;
  const headX0 = S * 0.16, headX1 = S * 0.50;     // the triangle
  const halfH = S * 0.26;                          // half its height at the base
  const shaftY0 = midY - S * 0.055, shaftY1 = midY + S * 0.055;
  const shaftX1 = S * 0.84;
  const aa = 1.4;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      // head: |y - mid| <= halfH * (x - headX0) / (headX1 - headX0)
      if (x >= headX0 - aa && x <= headX1 + aa) {
        const t = (x - headX0) / (headX1 - headX0);
        const lim = halfH * Math.min(1, Math.max(0, t));
        v = Math.max(v, 1 - smoothstep(lim - aa, lim + aa, Math.abs(y - midY)));
      }
      // shaft, starting inside the head so the join has no notch
      if (x >= headX1 * 0.72 && x <= shaftX1 + aa) {
        const inX = 1 - smoothstep(shaftX1 - aa, shaftX1 + aa, x);
        const inY = (1 - smoothstep(shaftY1 - aa, shaftY1 + aa, y))
                  * smoothstep(shaftY0 - aa, shaftY0 + aa, y);
        v = Math.max(v, inX * inY);
      }
      a[y * S + x] = v;
    }
  }
  return a;
}

// ── write ────────────────────────────────────────────────────────────────────
function writeRaw(pix, w, h, fmt, out) {
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", fmt, "-s", `${w}x${h}`, "-i", "pipe:0",
    "-frames:v", "1", "-y", out
  ], { input: pix, maxBuffer: 1 << 28 });
}

// ── run ──────────────────────────────────────────────────────────────────────
const N = CELLS.length;
const atlas = new Uint8Array(CELL * CELL * N);
const report = [];

for (let ci = 0; ci < N; ci++) {
  const { slug, src } = CELLS[ci];
  let g, note;

  if (src) {
    if (!existsSync(src)) { console.error(`missing ${src}`); process.exit(1); }
    g = decodeGrey(src);
    const light = isLightOnDark(g) !== forceInvert.has(slug);
    if (!light) for (let i = 0; i < g.length; i++) g[i] = 1 - g[i];
    const T = otsu(g);
    const a = new Float32Array(g.length);
    for (let i = 0; i < g.length; i++) a[i] = smoothstep(T - 0.08, T + 0.08, g[i]);
    const killed = dropFrameConnected(a, WORK, WORK);
    note = `otsu ${T.toFixed(3)} · ${light ? "light-on-dark" : "INVERTED"} · ` +
           `frame-connected dropped ${((killed / a.length) * 100).toFixed(1)}%`;
    g = a;
  } else {
    g = backArrow();          // no cell uses this today; see the CELLS note
    note = "drawn";
  }

  const { out, empty } = trimAndFit(g, WORK, WORK, CELL, COVER);
  if (empty) { console.error(`${slug}: nothing survived the key`); process.exit(1); }
  const soft = feather(out, CELL, CELL);

  // into the atlas column
  for (let i = 0; i < soft.length; i++) {
    atlas[ci * CELL * CELL + i] = Math.round(Math.min(1, Math.max(0, soft[i])) * 255);
  }

  // and out as its own RGBA plate: pure white, alpha = the identical key. This
  // is the file CSS uses, so CSS and the shader are punching the same shape.
  const rgba = new Uint8Array(CELL * CELL * 4);
  for (let i = 0; i < soft.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, soft[i])) * 255);
    rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = v;
  }
  writeRaw(rgba, CELL, CELL, "rgba", resolve(`src/assets/media/glyph-${slug}.png`));

  let ink = 0;
  for (let i = 0; i < soft.length; i++) ink += soft[i];
  report.push(`  ${slug.padEnd(18)} ${note}\n` +
              `  ${"".padEnd(18)} coverage ${((ink / soft.length) * 100).toFixed(1)}% of its cell`);
}

// ONE COLUMN, AND THE CELL IS 128.
// Bigger is not better here. The icon lands around 110 px on screen, so 128 is
// about 1:1 and the shader neither minifies nor magnifies it. At 256 the fetch
// would be minifying with no mip chain -- WebGL1 mips need power-of-two AND
// would bleed one glyph into the next down a column -- so the shader's edge
// would alias while the CSS mask's stayed clean, and the two would visibly
// disagree at exactly the moment they crossfade into each other.
writeRaw(atlas, CELL, CELL * N, "gray", resolve("src/assets/media/icon-atlas.png"));

// ── the generated module ─────────────────────────────────────────────────────
// bake_sky.mjs ends by TELLING you to go and edit skyclip.js by hand to match.
// That is one number and it has already been wrong once. Generating the module
// instead removes the drift entirely: the cell order here IS the cell order the
// shader indexes with, because there is only one copy of it.
const gen = `// GENERATED BY tools/bake_icons.mjs -- DO NOT EDIT
//
// The cell order below is the atlas layout. deck.js turns a slug into a row
// index and pressgl.js reads that row, so this list and the image are one
// artefact written by one command; nothing has to be kept in step by hand.
//
// The glyph is white with a real alpha channel in glyph-<slug>.png, and the
// SAME key is the greyscale row here. CSS punches the card with the first and
// the shader cuts the hole with the second, so the two edges cannot drift.

import ATLAS_URL from "../assets/media/icon-atlas.png?url";
const URL_ = ATLAS_URL || null;

export const hasIconAtlas = !!URL_;
export const CELLS = ${JSON.stringify(CELLS.map((c) => c.slug))};
export const CELL_PX = ${CELL};
export const COVER = ${COVER};

${CELLS.map((c, i) => `import g${i} from "../assets/media/glyph-${c.slug}.png?url";`).join("\n")}

/** the glyph plates, by slug -- the white icon you see at rest, and the CSS mask
    that punches the hole in the card it sits on.

    STATIC IMPORTS RATHER THAN A GLOB. Both work -- a glob over this directory
    resolves correctly, and the reason only one plate appears in dist/assets is
    simply that the other three are under Vite's 4 KB assetsInlineLimit and get
    inlined as data URIs. What naming them buys is that the set is generated
    here, so the list that lays out the atlas is the same list that writes these
    lines, and a cell added to CELLS cannot be silently missing its plate. */
const GLYPHS = {
${CELLS.map((c, i) => `  ${JSON.stringify(c.slug)}: g${i}`).join(",\n")}
};
export const glyphUrl = (slug) => GLYPHS[slug] || null;

/** this glyph's cell as a uv rectangle, inset by half a texel so a bilinear
    fetch at the very edge of a cell cannot reach into its neighbour */
export function cellUV(slug) {
  const i = CELLS.indexOf(slug);
  if (i < 0) return null;
  const n = CELLS.length;
  const half = 0.5 / (CELL_PX * n);
  return { u0: 0.5 / CELL_PX, du: (CELL_PX - 1) / CELL_PX,
           v0: i / n + half, dv: 1 / n - 2 * half };
}

/** Decode the atlas into the {width,height,data} shape pressgl uploads --
    deliberately the same shape loadSkyClip returns, so the upload path in
    pressgl.js is one function for both textures rather than two. */
export async function loadIconAtlas() {
  if (!URL_) return null;
  let bmp;
  try {
    const res = await fetch(URL_);
    if (!res.ok) return null;
    bmp = await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
  const w = bmp.width, h = bmp.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  const d = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let k = 0, p = 0; k < data.length; k++, p += 4) data[k] = d[p];
  return { width: w, height: h, data, cells: CELLS };
}
`;
writeFileSync(resolve("src/site/iconatlas.js"), gen);

console.log(`src/assets/media/icon-atlas.png   ${CELL}x${CELL * N}, ${N} cells`);
console.log(report.join("\n"));
console.log(`src/assets/media/glyph-*.png      ${N} plates, ${CELL}x${CELL} RGBA`);
console.log("src/site/iconatlas.js             generated");
