// bake_favicon.mjs — the tab mark.
//
//   node tools/bake_favicon.mjs   ->  public/favicon.svg
//                                     public/favicon-32.png
//                                     public/favicon-192.png
//
// The drawing and the writer are in mewMark.mjs; this file is the sizes and the
// argument for them.
//
// THE COLOURS ARE THE DISC IDIOM EXACTLY: the animal in bone against the
// cerulean, which is the one ink no project may own. Mew is the one thing on
// this site that is not printed, so she is the paper and the ground is the sky
// -- the same sentence every window on the sheet says, at 32 pixels.
//
// A 16 px cell was tried and is not shipped: at that size her tail is a dashed
// line and the whole thing is a smudge. Modern tab strips draw 32 device px on
// any retina display, and the svg covers everything else.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markSvg, markPng } from "./mewMark.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

writeFileSync(join(OUT, "favicon.svg"), markSvg());
writeFileSync(join(OUT, "favicon-32.png"), markPng(1));
writeFileSync(join(OUT, "favicon-192.png"), markPng(6));
console.log("baked favicon.svg, favicon-32.png, favicon-192.png ->", OUT);
