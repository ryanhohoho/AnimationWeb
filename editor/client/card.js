// card.js — the link card and the tab mark, drawn on a canvas
//
// The ONE renderer of the 1200x630 card. The designer shows it, every preview
// in the Link & icon tab shows it, and Save encodes it into public/og.png, so
// what is on screen is what ships. It used to be an ffmpeg filter graph in
// tools/bake_og.mjs; that drew type with its own rasteriser and could only be
// seen after a bake. Here it is the browser's own text engine, on the site's
// own font files.
//
// Pure functions of their arguments plus a 2D context: no state, no DOM beyond
// the context, so the tab can draw the same card into a 1200 px canvas for
// Save and a 400 px one for a Discord mock-up.

export const CARD_W = 1200, CARD_H = 630;

// the site's three faces, under names of their own so nothing here can change
// what the editor's chrome or the site's frame looks like
const F = "/src/assets/fonts/";
export const FONTS = {
  grotesque: { family: "Card Grotesque", label: "Darker Grotesque", weights: [300, 400, 500, 600, 700, 800, 900],
    faces: [{ src: `${F}DarkerGrotesque-var.woff2`, weight: "300 900" }] },
  // two cuts and only two: they are the files the site has (the ExtraLight
  // file is what site.css calls PlexMono 400 -- here it is called what it is)
  plex: { family: "Card Plex", label: "IBM Plex Mono", weights: [200, 600],
    faces: [{ src: `${F}IBMPlexMono-ExtraLight.woff2`, weight: "200" }, { src: `${F}IBMPlexMono-SemiBold.woff2`, weight: "600" }] },
  overpass: { family: "Card Overpass", label: "Overpass Mono", weights: [300, 400, 500, 600, 700],
    faces: [{ src: `${F}OverpassMono-var.woff2`, weight: "300 700" }] }
};

let fontsReady = null;
/** every face, loaded once; resolves when a canvas can draw with them */
export function loadCardFonts() {
  fontsReady ||= Promise.all(Object.values(FONTS).flatMap((f) => f.faces.map(async (face) => {
    const ff = new FontFace(f.family, `url(${face.src}) format("woff2")`, { weight: face.weight, style: "normal" });
    await ff.load();
    document.fonts.add(ff);
  }))).catch((e) => { console.warn("[editor] card fonts", e); });
  return fontsReady;
}

/** the nearest weight the face actually has */
export const weightFor = (font, w) => {
  const ws = (FONTS[font] || FONTS.grotesque).weights;
  return ws.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), ws[0]);
};
const fontOf = (t) => `${weightFor(t.font, t.weight)} ${t.size}px "${(FONTS[t.font] || FONTS.grotesque).family}"`;

// canvas letter-spacing is new (Chrome 99, Safari 18.?); without it the line is
// set a glyph at a time, which loses kerning only on a spaced line
const HAS_SPACING = typeof CanvasRenderingContext2D !== "undefined" &&
  "letterSpacing" in CanvasRenderingContext2D.prototype;

function setText(ctx, t) {
  ctx.font = fontOf(t);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (HAS_SPACING) ctx.letterSpacing = `${t.spacing || 0}px`;
}
function lineWidth(ctx, s, t) {
  const w = ctx.measureText(s).width;
  // the native spacing is measured in; the fallback adds it by hand
  return HAS_SPACING || !t.spacing ? w : w + t.spacing * Math.max(0, [...s].length - 1);
}
function drawLine(ctx, s, x, y, t) {
  if (HAS_SPACING || !t.spacing) { ctx.fillText(s, x, y); return; }
  for (const ch of s) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + t.spacing; }
}
const startX = (x, w, align) => (align === "center" ? x - w / 2 : align === "right" ? x - w : x);

/** where a text block's ink sits on the card: { x0, y0, x1, y1 } */
export function textBox(ctx, t) {
  setText(ctx, t);
  const lines = String(t.text).split("\n");
  const lead = t.size * (t.lineHeight || 1.2);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  lines.forEach((s, i) => {
    const m = ctx.measureText(s || " ");
    const w = lineWidth(ctx, s, t);
    const lx = startX(t.x, w, t.align);
    const by = t.y + i * lead;
    x0 = Math.min(x0, lx); x1 = Math.max(x1, lx + Math.max(w, 2));
    y0 = Math.min(y0, by - (m.fontBoundingBoxAscent ?? t.size * 0.8));
    y1 = Math.max(y1, by + (m.fontBoundingBoxDescent ?? t.size * 0.2));
  });
  return { x0, y0, x1, y1 };
}

/** the mark's grid, as her cells, at `cell` px each, from (x, y) */
export function drawGrid(ctx, grid, x, y, cell, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    let c = 0;
    // merged runs, the way the svg favicon is written: one rect per run
    while (c < row.length) {
      if (row[c] !== "#") { c++; continue; }
      let w = 0;
      while (c + w < row.length && row[c + w] === "#") w++;
      ctx.fillRect(x + c * cell, y + r * cell, w * cell, cell);
      c += w;
    }
  }
}

/**
 * The card, as a design. Order is the order of a print: ground, the cut, what
 * stands in it, the type -- any other order and the window paints over her.
 * The context is in CARD pixels (scale it first to draw smaller).
 */
export function drawCard(ctx, card, grid) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = card.background;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const w = card.window;
  if (w?.show) {
    ctx.fillStyle = w.fill;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    if (w.ticks) {
      // the registration ticks every aperture on the sheet carries: top-left
      // and bottom-right, 26 long, 2 thick, outside the cut
      const T = 26, H = 2;
      ctx.fillStyle = w.tick;
      ctx.fillRect(w.x - T, w.y - H, T, H);
      ctx.fillRect(w.x - H, w.y - T, H, T);
      ctx.fillRect(w.x + w.w, w.y + w.h, T, H);
      ctx.fillRect(w.x + w.w, w.y + w.h - T + H, H, T);
    }
  }
  const m = card.mark;
  if (m?.show && grid) drawGrid(ctx, grid, m.x, m.y, m.cell, m.color);
  for (const t of card.texts || []) {
    setText(ctx, t);
    ctx.fillStyle = t.color;
    const lead = t.size * (t.lineHeight || 1.2);
    String(t.text).split("\n").forEach((s, i) => {
      drawLine(ctx, s, startX(t.x, lineWidth(ctx, s, t), t.align), t.y + i * lead, t);
    });
  }
  ctx.restore();
}

/**
 * A picture into a frame of W x H. `crop` is { x, y, zoom }: the point of the
 * picture (0-1 of its width and height) that sits at the frame's centre, and a
 * zoom where 1 is "just covers the frame". Below 1 the picture no longer
 * covers it and `fill` shows round it (null leaves it transparent).
 */
export function drawCropped(ctx, img, crop, W, H, { fill = null, sharp = false } = {}) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(W / iw, H / ih) * (crop?.zoom || 1);
  ctx.save();
  if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H); } else ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = !sharp;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, W / 2 - (crop?.x ?? 0.5) * iw * s, H / 2 - (crop?.y ?? 0.5) * ih * s, iw * s, ih * s);
  ctx.restore();
}

/**
 * A big picture brought down to a small square in halving steps. One
 * drawImage from 1024 to 32 samples a handful of source pixels per output
 * pixel and shimmers; halving each time averages all of them.
 */
export function downscale(src, size, { sharp = false } = {}) {
  let cur = src, w = src.width;
  if (!sharp) {
    while (w / 2 >= size * 2) {
      const c = square(Math.round(w / 2));
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(cur, 0, 0, c.width, c.height);
      cur = c; w = c.width;
    }
  }
  const out = square(size);
  const x = out.getContext("2d");
  x.imageSmoothingEnabled = !sharp;
  x.imageSmoothingQuality = "high";
  x.drawImage(cur, 0, 0, size, size);
  return out;
}
function square(n) {
  const c = document.createElement("canvas");
  c.width = n; c.height = n;
  return c;
}

/** a PNG inside an .ico: one entry, which is all a browser asks /favicon.ico for */
export function icoOf(png, size = 32) {
  const head = new Uint8Array(22);
  const v = new DataView(head.buffer);
  v.setUint16(2, 1, true); v.setUint16(4, 1, true);
  head[6] = size >= 256 ? 0 : size; head[7] = size >= 256 ? 0 : size;
  v.setUint16(10, 1, true); v.setUint16(12, 32, true);
  v.setUint32(14, png.byteLength, true); v.setUint32(18, 22, true);
  const out = new Uint8Array(22 + png.byteLength);
  out.set(head, 0); out.set(new Uint8Array(png), 22);
  return out;
}

export const toBlob = (canvas, type = "image/png", q) =>
  new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("the canvas would not encode"))), type, q));
