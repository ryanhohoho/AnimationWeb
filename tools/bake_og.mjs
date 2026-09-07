// bake_og.mjs — the link card.
//
//   node tools/bake_og.mjs      ->  public/og.png   (1200x630)
//
// WHAT IT IS, AND WHY IT IS NOT A SCREENSHOT
// -------------------------------------------
// A shared link is the only part of this site most people will ever see, and it
// is seen at about 500 px wide in somebody else's feed. A screenshot of the
// sheet at that size is a grey rectangle: the halftone dissolves, the display
// type is unreadable and the animal is 40 px of pink. So the card is SET rather
// than captured -- the site's own sentence, drawn at a size where it can be
// read.
//
// And the sentence is the site's thesis, which is one picture: bone paper with
// a rectangle cut out of it, and the one unprinted thing standing in the hole.
// Every window on every sheet says that; this says it once, still, in the same
// two inks and the same two cuts of the same typeface.
//
// PURE REPO TOOLING. ffmpeg-static is already a devDependency (it bakes the sky
// clip), the fonts are already in src/assets/fonts, and the mark is the same
// 32x32 grid the favicon is cut from -- so this re-bakes on any machine that
// can run npm install, with no image library and no browser.
//
// Nearest-neighbour on the mark, always: it is pixel art, and a bilinear scale
// turns her outline into a grey fringe.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";
import { markPng, INK, PAPER } from "./mewMark.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = join(ROOT, "public", "og.png");
const hex  = (c) => "0x" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

// ── the trim ────────────────────────────────────────────────────────────────
// 1200x630 is what every platform crops to. The window's proportion is the
// summary card's own aperture (23% x 62% of a screen, which is 1:2.7); here it
// is set on the card's own grid instead, because at this aspect that slot is a
// letterbox rather than a window.
const W = 1200, H = 630;
const PAD = 72;                      // the card's --pad
const WIN = { x: 726, y: 84, w: 402, h: 462 };
const TICK = 26, HAIR = 2;           // the registration ticks on every aperture
const CELL = 10;                     // 32 cells -> 320 px of animal, centred in
                                     // the window with a cell of air all round
const MEW  = { x: Math.round(WIN.x + (WIN.w - 32 * CELL) / 2),
               y: Math.round(WIN.y + (WIN.h - 32 * CELL) / 2) };

const FONT_B = join(ROOT, "src/assets/fonts/IBMPlexMono-SemiBold.ttf");
const FONT_L = join(ROOT, "src/assets/fonts/IBMPlexMono-ExtraLight.ttf");

const tmp = mkdtempSync(join(tmpdir(), "og-"));
try {
  // her, in bone, on the window's own cerulean -- so the overlay is a plain
  // opaque rectangle and there is no alpha to composite wrong
  writeFileSync(join(tmp, "mew.png"), markPng(1, PAPER, INK));

  const box = (x, y, w, h, c) =>
    `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${hex(c)}:t=fill`;
  const text = (s, o) => {
    const esc = String(s).replace(/\\/g, "\\\\\\\\").replace(/:/g, "\\:").replace(/'/g, "\\\\'");
    return `drawtext=fontfile='${o.font}':text='${esc}':x=${o.x}:y=${o.y}` +
           `:fontsize=${o.size}:fontcolor=${hex(o.color)}` +
           (o.space ? `:expansion=none` : "");
  };

  const NEAR_INK = [0x16, 0x15, 0x0F];   // --ink
  const LABEL    = [0x3D, 0x39, 0x2F];   // --n3

  // THE ORDER IS THE ORDER OF A PRINT: ground, then the cut, then what is
  // standing in it, then the type. Drawn any other way the window paints over
  // the animal -- which is what the first bake did, and it looked exactly like a
  // solid blue rectangle, because that is what it was.
  const cut = [
    // the window, and the ticks that say a hole is a hole
    box(WIN.x, WIN.y, WIN.w, WIN.h, INK),
    box(WIN.x - TICK, WIN.y - HAIR, TICK, HAIR, LABEL),
    box(WIN.x - HAIR, WIN.y - TICK, HAIR, TICK, LABEL),
    box(WIN.x + WIN.w, WIN.y + WIN.h, TICK, HAIR, LABEL),
    box(WIN.x + WIN.w, WIN.y + WIN.h - TICK + HAIR, HAIR, TICK, LABEL)
  ].join(",");

  const chain = [
    // the type, in the two cuts the sheet uses and nothing else
    text("RYAN HO · PORTFOLIO", { font: FONT_B, x: PAD, y: 96, size: 21, color: LABEL }),
    text("systems", { font: FONT_L, x: PAD, y: 176, size: 104, color: NEAR_INK }),
    text("developer", { font: FONT_B, x: PAD, y: 284, size: 104, color: NEAR_INK }),
    text("Undocumented file formats, and the hardware", { font: FONT_B, x: PAD, y: 432, size: 22, color: LABEL }),
    text("nobody wants to do by hand.", { font: FONT_B, x: PAD, y: 468, size: 22, color: LABEL }),
    // EVERY LABEL ON THIS SITE IS TRUE, and that holds here. "AP. 01 — LAST
    // LIGHT" was the first caption and it is the SUMMARY card's aperture, not
    // this one; borrowing it would have been the first piece of decoration on a
    // site that has none. This window is a cut with the one unprinted thing
    // standing in it, which is what the card is for.
    text("AP. 00 — THE UNPRINTED THING", { font: FONT_B, x: PAD, y: H - PAD - 14, size: 17, color: LABEL })
  ].join(",");

  execFileSync(ffmpeg, [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `color=c=${hex(PAPER)}:s=${W}x${H}`,
    "-i", join(tmp, "mew.png"),
    "-filter_complex",
    // sws_flags=neighbor on the scale, or she gets a grey fringe
    `[1:v]scale=${32 * CELL}:${32 * CELL}:flags=neighbor[m];` +
    `[0:v]${cut}[bg];` +
    `[bg][m]overlay=${MEW.x}:${MEW.y}[c];` +
    `[c]${chain}[out]`,
    "-map", "[out]", "-frames:v", "1", "-update", "1", OUT
  ]);
  console.log("baked og.png ->", OUT);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
