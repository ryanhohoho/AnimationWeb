// pages/usb-provisioning.js — the USB provisioning sheet.
//
// WHAT IS NOT ON THIS PAGE
// ------------------------
// No asset numbers, no serials, no volume identifiers, no key material, no
// credentials. The transcript below is a real run with every device identifier
// swapped for a stand-in of the same width, so the columns sit where they sit on
// the operator's screen. `EXXXXXXX` is the template's own placeholder, not
// anybody's number. The DISCLOSURE cell in the colophon says so on the page
// itself, and the subtitle beside the transcript says it again where it is
// actually read. Both must survive any edit to this file.
//
// The prose is a PLACEHOLDER, like the other two sheets — the trim lives in
// pages/sheet.js and this file is the words. The TRANSCRIPT is not a
// placeholder: it is the one thing on any of the three sheets that is real, and
// it is the reason this page keeps a second element the others do not have.

import { renderSheet } from "./sheet.js";
import { createTerm } from "../term.js";
import { capture } from "../media.js";

// A substituted device identifier. Same width as the real thing so every
// column downstream of it lands where it really lands.
const ID = (s) => `<span class="sub">#${s}</span>`;

// ── THE SESSION ────────────────────────────────────────────────────────────
// A real run. Three drives already in the hub, a fourth pushed in while it is
// working — which is the entire point of the tool and the reason it is shown
// running rather than described. Every line format here is the tool's own.
const SESSION = [
  { t: "&gt; .\\USB-Tool.ps1", c: "cmd", type: true, wait: 700 },
  { t: "" },
  { t: "  Protected disks that will never be touched:", c: "k", wait: 90 },
  { t: "    Disk 0   - system disk (hosts this tool)", c: "k", wait: 300 },
  { t: "" },
  { t: "  3 drive(s) are connected right now:", c: "k", wait: 90 },
  { t: `    Disk 2  Kingston DataTraveler Max  57.3 GB  E:  id ${ID("1234567")}`, c: "k", wait: 70 },
  { t: `    Disk 3  Kingston DataTraveler Max  57.3 GB  F:  id ${ID("2345678")}`, c: "k", wait: 70 },
  { t: `    Disk 4  Kingston DataTraveler Max  57.3 GB  G:  id ${ID("3456789")}`, c: "k", wait: 320 },
  { t: "" },
  { t: "   [1]  Encrypt   - wipe, format NTFS, enable BitLocker, save recovery key", c: "k", wait: 60 },
  { t: "   [2]  exFAT     - wipe (removes BitLocker), format exFAT", c: "k", wait: 60 },
  { t: "   [3]  FAT32     - wipe (removes BitLocker), format FAT32", c: "k", wait: 60 },
  { t: "   [4]  Verify    - show which connected drives are actually encrypted", c: "k", wait: 520 },
  { t: "" },
  { pre: "  Choose an option: ", t: "1", c: "k", type: true, wait: 620 },
  { t: "" },
  { t: "  Each drive will be wiped, formatted NTFS, and encrypted with BitLocker.", c: "k", wait: 80 },
  { t: "  Encryption: XtsAes256, used-space-only: True", c: "k", wait: 80 },
  { t: "  Blank drives are processed automatically. A drive with data on it stops", c: "k", wait: 60 },
  { t: "  and asks before anything is erased.", c: "k", wait: 420 },
  { t: "" },
  { t: "   [ENTER] Start - watch for NEWLY inserted drives only", c: "k", wait: 60 },
  { t: "   [A]     Start - ALSO process the 3 drive(s) already connected", c: "k", wait: 520 },
  { pre: "  Choose: ", t: "A", c: "k", type: true, wait: 800 },
  { t: "" },
  { t: "  Insert USB drives to process them automatically.", c: "k", wait: 900 },
  { t: "" },

  { t: `  [09:41:07] NEW DRIVE  Disk 2  Kingston DataTraveler Max  57.3 GB  E:  id ${ID("1234567")}`, c: "cmd", wait: 320 },
  { t: '      Formatting NTFS (label "USB")...', c: "k", wait: 1500 },
  { t: "      Enabling BitLocker on E: ...", c: "k", wait: 700 },
  { t: `      Recovery key saved: D:\\USB-Keys\\BitLockerRecoveryKey_E_${ID("1234567")}.txt`, c: "k", wait: 260 },
  { t: "      SETUP OK E:  encrypting in background - leave it plugged in", c: "hit", wait: 900 },
  { t: "" },
  { t: `  [09:41:24] NEW DRIVE  Disk 3  Kingston DataTraveler Max  57.3 GB  F:  id ${ID("2345678")}`, c: "cmd", wait: 320 },
  { t: '      Formatting NTFS (label "USB")...', c: "k", wait: 1400 },
  { t: "      Enabling BitLocker on F: ...", c: "k", wait: 700 },
  { t: "      SETUP OK F:  encrypting in background - leave it plugged in", c: "hit", wait: 900 },
  { t: "" },
  { t: `  [09:41:39] NEW DRIVE  Disk 4  Kingston DataTraveler Max  57.3 GB  G:  id ${ID("3456789")}`, c: "cmd", wait: 320 },
  { t: '      Formatting NTFS (label "USB")...', c: "k", wait: 1400 },
  { t: "      Enabling BitLocker on G: ...", c: "k", wait: 640 },
  { t: "      SETUP OK G:  encrypting in background - leave it plugged in", c: "hit", wait: 700 },
  { t: "" },
  { t: "      DONE     E:  100% encrypted in 46s - SAFE TO REMOVE", c: "hit", wait: 640 },

  // the fourth drive was not in the hub when the run started. It was pushed in
  // thirty seconds ago, and nobody had to tell the tool about it.
  { t: `  [09:42:11] NEW DRIVE  Disk 5  Kingston DataTraveler Max  57.3 GB  H:  id ${ID("4567890")}`, c: "cmd", wait: 320 },
  { t: '      Formatting NTFS (label "USB")...', c: "k", wait: 1400 },
  { t: "      Enabling BitLocker on H: ...", c: "k", wait: 620 },
  { t: "      SETUP OK H:  encrypting in background - leave it plugged in", c: "hit", wait: 520 },
  { t: "  / Watching... connected: 4  done: 1  failed: 0  encrypting: 3 (from 61%)   [ESC stop]", c: "k", wait: 1100 },
  { t: "      DONE     F:  100% encrypted in 44s - SAFE TO REMOVE", c: "hit", wait: 420 },
  { t: "      DONE     G:  100% encrypted in 41s - SAFE TO REMOVE", c: "hit", wait: 420 },
  { t: "      DONE     H:  100% encrypted in 43s - SAFE TO REMOVE", c: "hit", wait: 560 },
  { t: "  - Watching... connected: 4  done: 4  failed: 0   [ESC stop] [R retry skipped]", c: "k", wait: 900 }
];

// ── THE SAME RUN, FOR SOMEBODY WHO CANNOT WATCH IT ─────────────────────────
// The transcript is CONTENT, not decoration: it is the whole evidence for this
// project, and a tool whose entire surface is the text it leaves behind cannot
// be shown any other way. But the played version is a moving fragment -- at any
// instant it holds a few lines mid-type -- so a reader on a screen reader got a
// meaningless snapshot of it.
//
// So the animated body is hidden from the accessibility tree and the COMPLETE
// transcript is emitted beside it, off screen. One source (SESSION), both
// forms, and the substitution rule holds in both because it is applied before
// either is built.
//
// Not a live region: this is a recording, and a recording that announces itself
// line by line for ninety seconds is worse than no recording at all.
const PLAIN = SESSION
  .map((l) => `${l.pre || ""}${String(l.t ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&gt;/g, ">").replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&")}`)
  .join("\n");

export function html(p) {
  return renderSheet(p, {
    headline: "ten thousand drives,<br />and nobody typing<br /><em>a single serial</em>",
    lead: "Two command-line tools that took the manual step out of an RCMP hardware " +
      "pipeline. Drives are formatted and BitLocker-encrypted unattended, several " +
      "at a time; asset numbers are laid onto physical jig coordinates by a " +
      "generator rather than typed into an engraver pocket by pocket.",
    notes: [
      { k: "DELIVERED", v: "In daily use. The provisioning tool has run several thousand drives." },
      { k: "THE HARD PART", v: "Not the encryption. Windows recycles drive letters within seconds of a release, so every drive has to be re-resolved by a stable device identity on each poll or the tool will call a half-encrypted drive safe to remove." },
      // THE DISCLOSURE, ON THE PAGE. Not only in a comment: this cell and the
      // subtitle beside the transcript are the two places a reader is told, and
      // the page must never carry the transcript without both of them.
      { k: "DISCLOSURE", v: "No asset numbers, serials, volume identifiers, key material or credentials appear anywhere on this sheet. The transcript is a real run with every device identifier replaced by a stand-in of the same width." }
    ],
    // THE TRANSCRIPT IS THE ONE FIGURE ON ANY OF THESE THREE SHEETS THAT IS
    // REAL, which is why this page keeps a second element the others do not.
    // It carried a `.spec.term-col` wrapper, absolutely positioned at top:20% —
    // landing on the lead at 28% and the colophon at 28%, which is the
    // collision that started this rework. In a column it needs no wrapper.
    body: `
    <div class="term-col">
      <p class="t dim">A REAL RUN. DEVICE IDENTIFIERS&nbsp;SUBSTITUTED.</p>
      <!-- tabindex, because on a narrow screen this is the one thing on the site
           that scrolls sideways (.term gets overflow-x:auto under 860px) and a
           scrollable region a keyboard cannot reach is a region a keyboard
           cannot read. -->
      <div class="term" data-term data-noswipe tabindex="0" role="group"
           aria-label="Recorded session, playing. The full transcript follows.">
        <div data-lines aria-hidden="true"></div>
      </div>
      <pre class="sr">${PLAIN.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
      <p class="t dim">FIG.&nbsp;1 — FOUR DRIVES, ONE OPERATOR, NINETY&nbsp;SECONDS.</p>
    </div>

    <!-- the numbers that run underneath it. Every one came off the session
         above, which is what a measured table on this sheet is for: the ink
         goes on the figure that IS the finding, and one operator is it. -->
    <dl class="tab">
      <dt>Drives provisioned in the run</dt><dd>4</dd>
      <dt>Operators</dt><dd class="key">1</dd>
      <dt>Wall clock, first insert to last DONE</dt><dd>90s</dd>
      <span class="rule"></span>
      <dt>E: encrypted in</dt><dd>46s</dd>
      <dt>F:</dt><dd>44s</dd>
      <dt>G:</dt><dd>41s</dd>
      <dt>H: — inserted mid-run</dt><dd>43s</dd>
    </dl>`,

    // deep, because a transcript is taller than a figure and the plate has to
    // be told: a screen and a half rather than a screen
    deep: true,

    hero: capture({ id: "stand-usb-hero", ratio: "1.3333",
      alt: "Reference artwork standing in for a capture of the hub." }),
    figure: capture({ id: "stand-usb-side", ratio: "0.7069", cls: "narrow",
      alt: "Reference artwork standing in for a capture of the engraver tray." })
  });
}

export function mount({ scope }) {
  const el = document.querySelector("[data-term]");
  if (!el) return;
  const term = createTerm({ scope, el, script: SESSION });
  // ── AND A HANDLE ON IT, THE WAY THE DECK AND THE ANIMAL HAVE ONE ────────
  // term.js already carries a `debugRun`, written for the fact that rAF and
  // timers are both throttled in a hidden preview pane and the tape has to be
  // runnable by hand. It was unreachable: nothing held the object. A debug
  // affordance nobody can call is a comment. Goes away with the page, like
  // every other thing this scope owns.
  window.__TERM__ = term;
  scope?.add(() => { if (window.__TERM__ === term) delete window.__TERM__; });
}
