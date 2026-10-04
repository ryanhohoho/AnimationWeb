// pages/rcmp-encryption.js — RCMP ENCRYPTION ARCHITECTURE (CONFIDENTIAL)
//
// By instruction (2026-09-26): a project whose details are locked, the way a
// studio portfolio marks work done under NDA (the owner's reference is
// liumichelle.com's Apple, Roblox and NASA pages: a Year / Role / Org / With
// row, short labelled sections, then "This work is confidential. Please email
// me if you'd like to chat!"). The structure is that one; the look is this
// site's -- the same two-plate trim as the USB sheet it sits beside
// (pages/sheet.js), and the locked block drawn in the print's own language: a
// flat tint of the sheet's plate, a square of paper out of register with it,
// and a padlock on a pixel grid (site/padlock.js), not a rounded card.
//
// THE WORDS ARE DRAFTS, and every fact in them is one the site already
// states (content.js EXPERIENCE, projects.js, the USB sheet): the roles and
// their dates, the tool and its size, "several thousand" drives, the
// drive-letter problem. Nothing here describes the architecture, its keys or
// its procedures -- that is what the lock is for. The owner rewrites any of it
// in the editor; the three photographs are ordinary capture() slots (select
// one and Replace…).
//
// SECURITY (CLAUDE.md, a hard constraint on this pipeline): no credentials, no
// key material, no asset numbers, drive serials or volume identifiers, ever --
// in the words, in the photographs, or in their file names.

import { renderSheet } from "./sheet.js";
import { capture } from "../media.js";
import { padlockSvg } from "../padlock.js";
import { SOCIALS } from "../content.js";

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// where "email me" goes: the contact card's own address, so there is one.
// (The sentence around the link is two spans so each half stays editable in
// the editor: a paragraph with code inside it is locked there as a whole.)
const MAIL = SOCIALS.find((s) => s.url?.startsWith("mailto:"))?.url || "/contact";

export function html(p) {
  // the row under the title: when, as whom, where, with what (her row says
  // WITH for the people; the people here are not the site's to name)
  const meta = [
    ["YEAR", "2025 — present"],
    ["ROLE", "Junior Software Developer"],
    ["ORG", "Royal Canadian Mounted Police"],
    ["TOOLS", "C  · C++  ·  Powershell   ·  Other"]
  ].map(([k, v]) => `
        <div><p class="t dim">${esc(k)}</p><p class="t body">${esc(v)}</p></div>`).join("");

  return renderSheet(p, {
    headline: "RCMP<br><em>Softshield</em>",
    hero: `
      <div class="conf-meta">${meta}
      </div>
      ${capture({ id: "rcmp-encryption-1", ratio: "1.7778", alt: "The encryption station." })}`,
    lead: "Complete redesign of RCMP private encryption architecture. \nAutomatic encryption and formatting of storage devices.\nComplete manipulatability of software encryption protocol and format through a Command-Line interface.",

    body: `
      <div class="conf-sec">
        <p class="t dim conf-k">summary</p>
        <ul class="conf-list">
          <li class="t body">CLI application that reads and writes encrypted drives.</li>
          <li class="t body">Accesses and pre-configures encryption architecture on all connected storage devices.</li>
          <li data-e="t-as53" class="t body">Fully documented SOP.</li>
        </ul>
      </div>

      <div class="conf-lock" role="note" style="--lock:${esc(p.inkA || "#16305C")}">
        <div class="conf-lock-badge">${padlockSvg("conf-lock-mark")}</div>
        <div class="conf-lock-t">
          <p class="t body conf-lock-h">This work is confidential.</p>
          <p class="t body conf-lock-s"><span>Please</span> <a class="link" href="${esc(MAIL)}">email me</a> <span>if you'd like to chat!</span></p>
        </div>
      </div>

      <div data-e="conf-photos-gww3" class="conf-photos">
        ${capture({ id: "rcmp-encryption-2", ratio: "1.3333", alt: "At the station." })}
        ${capture({ id: "rcmp-encryption-3", ratio: "1.3333", alt: "At the station." })}
      </div>`,

    notes: [
      { k: "STATUS", v: "Processed over two-thousand devices as of September 7th, 2026." },
      { k: "DISCLOSURE", v: "The architecture, its keys and its procedures are confidential. Please email me for further information about this project." }
    ]
  });
}
