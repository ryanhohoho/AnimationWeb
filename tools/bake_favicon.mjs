// bake_favicon.mjs — the tab mark.
//
//   node tools/bake_favicon.mjs   ->  public/favicon.svg
//                                     public/favicon.ico        (32, for /favicon.ico)
//                                     public/favicon-32.png
//                                     public/favicon-192.png    (Android's home screen)
//                                     public/apple-touch-icon.png (180, iOS's)
//
// The drawing is ICON.grid in src/site/identity.js (painted in the editor's
// "Link & icon" tab, or by hand); the writer is mewMark.mjs; this file is the
// sizes and the argument for them. The editor runs it on Save.
//
// THE COLOURS ARE THE DISC IDIOM EXACTLY: the animal in bone against the
// cerulean, which is the one ink no project may own. Mew is the one thing on
// this site that is not printed, so she is the paper and the ground is the sky
// -- the same sentence every window on the sheet says, at 32 pixels.
//
// A 16 px cell was tried and is not shipped: at that size her tail is a dashed
// line and the whole thing is a smudge. Modern tab strips draw 32 device px on
// any retina display, and the svg covers everything else.
//
// 180 IS NOT A WHOLE NUMBER OF CELLS, and a nearest-neighbour scale to it makes
// some cells 5 px and some 6, which on pixel art reads as a wobble. So it is
// 5 px cells (160) on 10 px of ground each side. iOS rounds the corners of the
// tile and fills transparency with black, which is why it is opaque.
//
// When the icon is an uploaded picture (ICON.mode "upload") the editor made
// these files, and this refuses rather than paint over them with the grid.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ICON } from "../src/site/identity.js";
import { markSvg, markPng, icoOf } from "./mewMark.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

if (ICON.mode !== "grid") {
  console.error(`the icon is an uploaded picture (ICON.mode "${ICON.mode}" in src/site/identity.js); ` +
    `switch it back to the grid in the editor's Link & icon tab to bake from the grid`);
  process.exit(1);
}

const png32 = markPng(1);
writeFileSync(join(OUT, "favicon.svg"), markSvg());
writeFileSync(join(OUT, "favicon.ico"), icoOf(png32));
writeFileSync(join(OUT, "favicon-32.png"), png32);
writeFileSync(join(OUT, "favicon-192.png"), markPng(6));
writeFileSync(join(OUT, "apple-touch-icon.png"), markPng(5, undefined, undefined, 10));
console.log("baked favicon.svg, favicon.ico, favicon-32.png, favicon-192.png, apple-touch-icon.png ->", OUT);
