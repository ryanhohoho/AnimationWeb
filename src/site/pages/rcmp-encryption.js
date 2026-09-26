// pages/rcmp-encryption.js — RCMP ENCRYPTION ARCHITECTURE (CONFIDENTIAL)
//
// By instruction (2026-09-26): a project whose details are locked, the way a
// studio portfolio marks work done under NDA (the owner's reference is
// liumichelle.com's Apple, Roblox and NASA pages: a Year / Role / Org / With
// row, short labelled sections, then "This work is confidential. Please email
// me if you'd like to chat!"). The structure is that one; the look is this
// site's -- the same two-plate trim as the USB sheet it sits beside
// (pages/sheet.js), and the locked block drawn in the print's own language: a
// square hairline box and a padlock on a pixel grid (site/padlock.js), not a
// rounded card.
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
    ["YEAR", "2024 — present"],
    ["ROLE", "IT Technician, then Junior Software Developer"],
    ["ORG", "Royal Canadian Mounted Police"],
    ["TOOLS", "BitLocker · XTS-AES · PowerShell"]
  ].map(([k, v]) => `
        <div><p class="t dim">${esc(k)}</p><p class="t body">${esc(v)}</p></div>`).join("");

  return renderSheet(p, {
    headline: "rcmp encryption<br /><em>architecture</em>",
    hero: `
      <div class="conf-meta">${meta}
      </div>
      ${capture({ id: "rcmp-encryption-1", ratio: "1.7778", alt: "The encryption station." })}`,
    lead: "The encryption side of the RCMP hardware pipeline whose engraving side is the sheet before this one. Drives are formatted and BitLocker-encrypted unattended, several at a time, and none may be called safe to remove before it is.",

    body: `
      <div class="conf-sec">
        <p class="t dim conf-k">THE WORK</p>
        <ul class="conf-list">
          <li class="t body">Built the PowerShell tool, now 2,900 lines, that formats and BitLocker-encrypts hot-plugged drives with nobody at the keyboard. It replaced a manual, drive-by-drive process and has provisioned several thousand drives.</li>
          <li class="t body">Made the tool follow each drive by a stable device identity rather than its drive letter, because Windows hands a released letter to the next drive within seconds, and a tool that trusts letters will call a half-encrypted drive safe to remove.</li>
          <li class="t body">Wrote the procedure operators run it under, so the station works the same on anyone's shift.</li>
        </ul>
      </div>

      <div class="conf-lock" role="note">
        ${padlockSvg("conf-lock-mark")}
        <div class="conf-lock-t">
          <p class="t body conf-lock-h">This work is confidential.</p>
          <p class="t body conf-lock-s"><span>Please</span> <a class="link" href="${esc(MAIL)}">email me</a> <span>if you'd like to chat!</span></p>
        </div>
      </div>

      <div class="conf-photos">
        ${capture({ id: "rcmp-encryption-2", ratio: "1.3333", alt: "At the station." })}
        ${capture({ id: "rcmp-encryption-3", ratio: "1.3333", alt: "At the station." })}
      </div>`,

    notes: [
      { k: "STATUS", v: "In daily use. It has provisioned several thousand drives." },
      { k: "DISCLOSURE", v: "The architecture, its keys and its procedures are confidential, and nothing on this sheet describes them. No asset numbers, serials, volume identifiers, key material or credentials appear here." }
    ]
  });
}
