// pages/iclicker.js — the iClicker sheet.
//
// PLACEHOLDER PROSE. The owner is rewriting all three project sheets in his own
// format, so what is here is deliberately short and deliberately easy to throw
// away: the trim lives in pages/sheet.js and this file is only the words.
//
// The framing is kept because it is the one part that is not a placeholder: this
// is a study of a system, not a method for defeating one, and no procedure is
// published on it.

import { renderSheet } from "./sheet.js";

export function html(p) {
  return renderSheet(p, {
    headline: "a mark that<br />anything can make<br /><em>is not attendance</em>",
    lead: "An industry-standard attendance system, adopted institution-wide, that " +
      "asks the device being measured to grade itself and trusts the answer. " +
      "Written up as a case study of what a standardised system rests on when it " +
      "is deployed at that scale, not as a method.",
    notes: [
      { k: "FRAMING", v: "A study of a system, not a method for defeating one. No procedure is published here." },
      { k: "CONSENT", v: "Built and run with the course instructor's knowledge." },
      { k: "WHY IT MATTERS", v: "Not that one student can produce a mark. That a standardised system is trusted at institutional scale while resting on a check it cannot make." }
    ]
  });
}
