// pages/usb-provisioning.js — PROJECT 01
//
// THE WORK
// --------
// Two command-line tools, commissioned by the RCMP, that took the manual step
// out of a hardware pipeline. Crates of USB drives arrive; each one has to
// leave engraved with its asset number and encrypted. Both halves used to be
// done by a person, by hand, one unit at a time.
//
//   ENGRAVE   a Python batch generator. Reads the asset column out of whatever
//             spreadsheet the property office actually sends and emits one
//             xTool project file per tray, every pocket filled. Which fixed
//             label belongs to which pocket is SOLVED, not guessed: minimum-cost
//             bipartite matching over the label-to-pocket distances.
//   ENCRYPT   ~2,500 lines of PowerShell. Watches the bus, takes each drive as
//             it appears, formats it and hands it to BitLocker — so the drives
//             convert in parallel while the next one is being set up.
//
// WHY THE PAGE IS BUILT THIS WAY
// ------------------------------
// The same object as the home sheet: white stock, die-cut, with the two-ink
// print showing through the holes. Nothing new was invented to hold a project.
// The apertures here are the home sheet's own trims — a tall slot on the title
// plate, the full-bleed horizon on the colophon — and they SUPPORT the page
// rather than being its content. What carries the work is the work: a played
// transcript of the tool running, and captures of the real thing.
//
// WHAT IS NOT ON THIS PAGE
// ------------------------
// No asset numbers, no serials, no volume identifiers, no key material, no
// credentials. The transcript is a real run with every device identifier
// swapped for a stand-in of the same width, so the columns sit where they sit
// on the operator's screen. `EXXXXXXX` is the template's own placeholder, not
// anybody's number.

import { capture, mountMedia } from "../media.js";
import { createTerm } from "../term.js";

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

export function html(p) {
  const inkName = (p?.inkName || "AMBER").replace(/ /g, "&nbsp;");
  return `
  <!-- ══ 00 · TITLE ═══════════════════════════════════════════════════════
       The home sheet's own title composition, and its own trim: one tall slot
       right of centre holding the print. It is the page's air, not its
       argument — the argument is three plates down. -->
  <section class="plate" id="p0">
    <div class="corner tl">
      <p class="t">PROJECT&nbsp;01&nbsp;—&nbsp;USB&nbsp;PROVISIONING&nbsp;CLI</p>
      <p class="t dim">SYSTEMS&nbsp;TOOLING&nbsp;·&nbsp;COMMISSIONED<br />ROYAL&nbsp;CANADIAN&nbsp;MOUNTED&nbsp;POLICE</p>
    </div>
    <div class="corner tr">
      <p class="t dim"><span data-at>—</span></p>
      <p class="t">2025</p>
    </div>

    <div class="ap tall" data-ap data-collider style="--x:57%; --y:12%; --w:25%; --h:64%"></div>
    <p class="t dim cap" style="--x:57%; --y:78%">PL.&nbsp;01&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}</p>

    <div class="corner bl">
      <h1 class="d" data-collider style="max-width:18ch">batch usb engraving<br />and encryption,<br /><em>from the command line</em></h1>
    </div>
    <div class="corner br">
      <p class="t dim">TWO&nbsp;TOOLS.&nbsp;NO&nbsp;ASSET&nbsp;NUMBERS&nbsp;ON&nbsp;THIS&nbsp;SHEET.</p>
      <p class="t">SCROLL&nbsp;↓</p>
    </div>
  </section>

  <!-- ══ 01 · WHAT IT REPLACED ════════════════════════════════════════════
       The value of this project is a subtraction, so the plate is built as
       one: what the job was, and what is left of it. -->
  <section class="plate" id="p1">
    <div class="corner tl">
      <p class="t">01&nbsp;—&nbsp;WHAT&nbsp;IT&nbsp;REPLACED</p>
      <p class="t dim">THE&nbsp;JOB&nbsp;BEFORE,&nbsp;AND&nbsp;WHAT&nbsp;IS&nbsp;LEFT&nbsp;OF&nbsp;IT</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="checks" data-collider>
      <div class="check">
        <dt>ENGRAVING</dt><dd class="claim">an operator typed the asset number into every pocket of the jig, by hand, for every tray</dd>
        <dt>PER&nbsp;TRAY</dt><dd>75&nbsp;POCKETS&nbsp;·&nbsp;225&nbsp;TEXT&nbsp;OBJECTS</dd>
        <dt>ON&nbsp;A&nbsp;TYPO</dt><dd>IT&nbsp;IS&nbsp;ENGRAVED</dd>
      </div>
      <div class="check">
        <dt>ENCRYPTION</dt><dd class="claim">one drive at a time — wipe, format, enable BitLocker, wait, file the key, unplug, repeat</dd>
        <dt>PER&nbsp;DRIVE</dt><dd>≈&nbsp;5&nbsp;MINUTES&nbsp;OF&nbsp;A&nbsp;PERSON</dd>
        <dt>IN&nbsp;PARALLEL</dt><dd>NONE</dd>
      </div>
      <div class="check none">
        <dt>NOW</dt><dd class="claim">the spreadsheet goes in, the trays come out, and the drives are plugged into a hub</dd>
        <dt>PER&nbsp;TRAY</dt><dd>ONE&nbsp;COMMAND</dd>
        <dt>PER&nbsp;DRIVE</dt><dd>NO&nbsp;ONE</dd>
      </div>
      <p class="t dim body wide">Neither half was hard because the cryptography
        was hard. They were hard because the work was repetitive, unforgiving and
        done at three in the afternoon by someone on their fourth crate.</p>
    </div>

    ${capture({
      id: "usb-hub",
      pos: "--x:53%; --y:24%; --w:35%",
      ratio: "4 / 3",
      cap: "FIG. 1 — A FILLED HUB, MID-RUN.",
      alt: "A USB hub full of drives being processed by the tool"
    })}
  </section>

  <!-- ══ 02 · THE SESSION ═════════════════════════════════════════════════
       A CLI has no picture. Its surface is the transcript, so the transcript
       is the figure — played, because the gap between a command and its answer
       is the finding, and unboxed, because it is text on a sheet. -->
  <section class="plate" id="p2">
    <div class="corner tl">
      <p class="t">02&nbsp;—&nbsp;THE&nbsp;SESSION</p>
      <p class="t dim">A&nbsp;REAL&nbsp;RUN.&nbsp;DEVICE&nbsp;IDENTIFIERS&nbsp;SUBSTITUTED.</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="spec term-col" data-collider>
      <div class="term" data-term><div data-lines></div></div>
      <p class="t dim">FIG.&nbsp;2&nbsp;—&nbsp;FOUR&nbsp;DRIVES,&nbsp;ONE&nbsp;OPERATOR,&nbsp;NINETY&nbsp;SECONDS.</p>
    </div>

    <div class="side high">
      <div>
        <p class="t dim">WHY&nbsp;IT&nbsp;OVERLAPS</p>
        <p class="t body wide">Enabling BitLocker returns as soon as setup is
          done; the conversion itself runs in the Windows service afterwards. So
          the script never waits on one — it sets a drive up, hands the
          conversion off, and moves to the next drive while the last three are
          still encrypting. The monitor polls them and releases each one at 100%.
          The five minutes a person used to spend was almost entirely spent
          waiting.</p>
      </div>
      <div>
        <p class="t dim">THE&nbsp;DETECTION&nbsp;BUG</p>
        <p class="t body wide">Every guide says filter on <em style="font-style:normal">DriveType
          -eq 'Removable'</em>. Modern sticks — DataTraveler Max, Samsung
          T-series — report the removable-media bit as
          <em style="font-style:normal">0</em>, so Windows calls them fixed disks
          and that filter finds nothing at all.
          <em style="font-style:normal">BusType -eq 'USB'</em> off
          <em style="font-style:normal">Get-Disk</em> is the discriminator that
          actually works.</p>
      </div>
      <div>
        <p class="t dim">THE&nbsp;TRADE&nbsp;THAT&nbsp;MATTERS</p>
        <p class="t body wide">A quick format only rewrites metadata: the drive's
          previous life stays readable in what is now free space. Encrypting the
          whole volume would cover it, and take hours per terabyte. So a drive
          that arrives with data gets a full format first and BitLocker then runs
          used-space-only — same guarantee, minutes instead of hours, and the
          operator is never the one deciding which.</p>
      </div>
    </div>
  </section>

  <!-- ══ 03 · THE ASSIGNMENT ══════════════════════════════════════════════
       The one genuinely interesting problem in the engraving half, and it is
       not a text-substitution problem. It is a matching problem. -->
  <section class="plate deep" id="p3">
    <div class="corner tl">
      <p class="t">03&nbsp;—&nbsp;THE&nbsp;ASSIGNMENT</p>
      <p class="t dim">WHICH&nbsp;LABEL&nbsp;BELONGS&nbsp;TO&nbsp;WHICH&nbsp;POCKET</p>
    </div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="spec wide-col" data-collider>
      <p class="t dim body wide">A template is not a list, it is a jig. Seventy-five
        physical pockets, and inside the file 75 serial placeholders
        (<em style="font-style:normal">EXXXXXXX</em>) plus 75 copies of each fixed
        label — a protection marking, and a bilingual return-if-found notice.
        Filling a tray means knowing which label belongs to which pocket. The
        file does not say. All it carries is where everything sits on the bed.</p>
      <p class="t dim body wide">Nearest neighbour is the obvious answer and it
        is wrong. The pockets are close enough that one pocket's label can be
        physically nearer a neighbouring pocket's serial, and a single bad
        pairing cascades — the label that pocket should have taken is already
        gone.</p>
      <p class="t dim body wide">So it is solved rather than guessed. Every
        label-to-pocket distance goes into a cost matrix, and a minimum-cost
        bipartite matching — Hungarian, by way of Jonker–Volgenant, O(n³) —
        assigns all seventy-five at once: total distance minimised, exactly one
        label per pocket, no local choice able to spoil a global one. Every
        resulting pair is then distance-checked, and a match beyond tolerance
        aborts the run instead of engraving it.</p>
      <p class="t dim body wide">Which means the script never learns what a label
        <em style="font-style:normal">is</em>. Any text appearing exactly once per
        pocket is discovered as a per-pocket label and matched the same way — so
        a template that gains a new marking next year needs no code, and a
        partial tray hides the right serials and the right labels together.</p>
    </div>

    ${capture({
      id: "usb-engraver",
      pos: "--x:53%; --y:24%; --w:35%",
      ratio: "4 / 3",
      cap: "FIG. 3 — A GENERATED TRAY, OPENED IN THE ENGRAVER.",
      alt: "A generated project file open in xTool Studio, every pocket filled"
    })}
  </section>

  <!-- ══ 04 · COLOPHON ════════════════════════════════════════════════════ -->
  <section class="plate" id="p4">
    <div class="corner tl"><p class="t">04&nbsp;—&nbsp;COLOPHON</p></div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    <div class="cols" data-collider>
      <div><p class="t dim">FOR</p><p class="t body">Royal Canadian Mounted
        Police. Commissioned, delivered, in use.</p></div>
      <div><p class="t dim">DELIVERED</p><p class="t body">~2,500 lines of
        PowerShell, a Python batch generator, a template library per drive model,
        and a standard operating procedure written for operators who are not
        engineers — which is the part that decides whether tooling survives the
        person who wrote it.</p></div>
      <div><p class="t dim">STACK</p><p class="t body">PowerShell 5.1 ·
        BitLocker / XTS-AES-256 · Get-Disk, Get-Volume, Windows Storage APIs ·
        Python · xTool XCS / XS project formats · openpyxl</p></div>
      <div><p class="t dim">DISCLOSURE</p><p class="t body">No asset numbers,
        serials, volume identifiers, key material or credentials appear anywhere
        on this sheet. The transcript is a real run with every device identifier
        replaced by a stand-in of the same width.</p></div>
    </div>

    <div class="ap band" data-ap style="--x:0%; --y:69%; --w:100%; --h:14%"></div>
    <p class="t dim cap pad" style="--y:84.5%">PL.&nbsp;04&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}.&nbsp;FULL&nbsp;BLEED.</p>

    <div class="corner br">
      <p class="t"><a class="link" href="/" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;sheet</a></p>
    </div>
  </section>`;
}

// Every aperture on this page is cut from the sheet's own plate, so the deck
// handles them and there is nothing here to press. All this has to do is start
// the transcript and keep the captures from decoding off screen.
export function mount({ scope }) {
  const el = document.querySelector("[data-term]");
  if (el) window.__TERM__ = createTerm({ scope, el, script: SESSION });
  mountMedia(scope);
}
