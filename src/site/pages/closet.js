// pages/closet.js — the closet sheet.
//
// PLACEHOLDER PROSE, like the other two: the trim is in pages/sheet.js and this
// is only the words and the evidence.
//
// The figures are STAND-INS out of the reference folder, baked by
// tools/bake_captures.mjs, and they carry no caption. A caption over somebody
// else's artwork claiming it is a screenshot of the engine would be the first
// false label on this site. When a real capture lands as `closet-hero.webp`,
// media.js picks that instead and the caption comes with it.

import { renderSheet } from "./sheet.js";
import { capture } from "../media.js";

export function html(p) {
  return renderSheet(p, {
    headline: "an outfit engine,<br />and a judge that<br /><em>actually grades it</em>",
    lead: "Every wardrobe app maximises similarity under fixed weights and a fixed " +
      "piece count, so it collapses to the closet's average item — one shawl in " +
      "24 of 24 outfits, measured. This one optimises for interest instead: it " +
      "picks a statement piece first and adds a piece only while it contributes " +
      "more than it costs.",

    hero: capture({ id: "stand-closet-hero", ratio: "1.7778",
      alt: "Reference artwork standing in for a capture of the engine." }),

    // THE NUMBER IS THE ARGUMENT, and it has only ever been a clause in a
    // sentence. A measured table is what this site does with a number that IS
    // the finding: label left, figure right, tabular so the digits line up the
    // way they do on a scorecard. The ink is the emphasis, as everywhere else.
    body: `
      <dl class="tab">
        <dt>Outfits generated, one wardrobe</dt><dd>24</dd>
        <dt>…containing the same shawl, under similarity</dt><dd class="key">24</dd>
        <dt>…containing it under interest</dt><dd>6</dd>
        <span class="rule"></span>
        <dt>Distinct statement pieces used</dt><dd>11</dd>
        <dt>Median pieces per outfit</dt><dd>4</dd>
      </dl>`,

    figure: capture({ id: "stand-closet-side", ratio: "0.75", cls: "narrow",
      alt: "Reference artwork standing in for a capture of a generated set." }),

    notes: [
      { k: "STATUS", v: "Ongoing. The engine runs; the learned judge is the part still being trained." },
      { k: "THE HARD HALF", v: "Not generating an outfit. Telling whether the result is any good, which is a judgement and not a constraint." },
      { k: "INK", v: "Two greys, no chroma — the value range his own wardrobe measures at." }
    ]
  });
}
