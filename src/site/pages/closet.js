// pages/closet.js — the closet sheet.
//
// PLACEHOLDER PROSE, like the other two: the trim is in pages/sheet.js and this
// is only the words, kept short so it is cheap to replace.

import { renderSheet } from "./sheet.js";

export function html(p) {
  return renderSheet(p, {
    headline: "an outfit engine,<br />and a judge that<br /><em>actually grades it</em>",
    lead: "Every wardrobe app maximises similarity under fixed weights and a fixed " +
      "piece count, so it collapses to the closet's average item — one shawl in " +
      "24 of 24 outfits, measured. This one optimises for interest instead: it " +
      "picks a statement piece first and adds a piece only while it contributes " +
      "more than it costs.",
    notes: [
      { k: "STATUS", v: "Ongoing. The engine runs; the learned judge is the part still being trained." },
      { k: "THE HARD HALF", v: "Not generating an outfit. Telling whether the result is any good, which is a judgement and not a constraint." },
      { k: "INK", v: "Two greys, no chroma — the value range his own wardrobe measures at." }
    ]
  });
}
