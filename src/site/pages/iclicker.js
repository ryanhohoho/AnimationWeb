// pages/iclicker.js — the iClicker sheet.
//
// PLACEHOLDER PROSE. The trim lives in pages/sheet.js and this file is the words
// and the evidence.
//
// The framing is the one part that is not a placeholder: this is a study of a
// system, not a method for defeating one, and no procedure is published on it.
// The claim table below is deliberately written so that it describes what the
// system CHECKS, which is public, and never how to produce any of it.
//
// The figures are STAND-INS out of the reference folder (tools/bake_captures.mjs)
// and carry no caption, because a caption claiming somebody else's artwork is a
// screenshot of the client would be the first false label on this site.

import { renderSheet } from "./sheet.js";
import { capture } from "../media.js";

export function html(p) {
  return renderSheet(p, {
    headline: "iClicker",
    lead: "← GO BACK",

    hero: capture({ id: "stand-iclicker-hero", ratio: "1.7778",
      alt: "Reference artwork standing in for a capture of the client." }),

    // THE EMPTY ROW IS THE FINDING, and `.check.none` was written for exactly
    // this page — "the last row is empty on purpose and that emptiness is the
    // finding, so it gets the ink rather than a label" (site.css). Three things
    // the system checks, and the one it cannot.
    body: `
      <div class="checks">
        <dl class="check">
          <dt>CLAIM</dt><dd class="claim">I am in the room</dd>
          <dt>CHECKED BY</dt><dd>the client, on the device making the claim</dd>
        </dl>
        <dl class="check">
          <dt>CLAIM</dt><dd class="claim">I am this student</dd>
          <dt>CHECKED BY</dt><dd>a session token issued to the same device</dd>
        </dl>
        <dl class="check">
          <dt>CLAIM</dt><dd class="claim">I answered this question</dd>
          <dt>CHECKED BY</dt><dd>the server, against the token</dd>
        </dl>
        <dl class="check none">
          <dt>CLAIM</dt><dd class="claim">A person was present</dd>
          <dt>CHECKED BY</dt><dd>nothing</dd>
        </dl>
      </div>`,

    figure: capture({ id: "stand-iclicker-side", ratio: "0.5625", cls: "narrow",
      alt: "Reference artwork standing in for a capture of the poll." }),

    notes: [
      { k: "FRAMING", v: "A study of a system, not a method for defeating one. No procedure is published here." },
      { k: "CONSENT", v: "Built and run with the course instructor's knowledge." },
      { k: "WHY IT MATTERS", v: "Not that one student can produce a mark. That a standardised system is trusted at institutional scale while resting on a check it cannot make." }
    ]
  });
}
