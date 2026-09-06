// pages/sheet.js — THE SHAPE EVERY PROJECT SHEET IS CUT TO
//
// Three sheets used to be three files of markup, five and six plates each,
// repeating the same title composition and the same colophon with different
// words in them. They came in at 206, 310 and 364 lines, and between them 2,458
// words of prose about work whose own pages had not been written yet.
//
// They are two plates now, which is as close to a third of the old iClicker
// sheet as the format reaches: a plate is one screen by definition, so 200 lvh
// is the nearest landing to 167.
//
//   PLATE 0   the claim. The home sheet's title composition and its trim:
//             corners used, centre left alone, one tall slot right of centre
//             holding the print.
//   PLATE 1   the argument, and the colophon under it. One screen, because a
//             project that needs two screens of preamble before its first
//             figure has not decided what it is about yet.
//
// WHY A SHARED SHELL AND NOT THREE FILES. The composition is not the argument.
// Every sheet on this site is pulled on the same press with the same trim, and
// what differs between them is the ink and the words -- so the trim belongs in
// one place, and each project file becomes the words. It is also the honest
// state of the work: these pages are placeholders for writing that has not
// happened yet, and a placeholder should be cheap to replace, not a 300-line
// document somebody has to unpick first.
//
// The one thing that is NOT shared is `body`: usb-provisioning has a real
// terminal transcript on its second plate and the others do not.

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nb = (v) => esc(v).replace(/ /g, "&nbsp;");

/**
 * @param p        the project record from site/projects.js
 * @param headline the display line on plate 0. Raw HTML: it carries <br> and
 *                 one <em>, which is the only emphasis this face has.
 * @param lead     one paragraph. ONE -- see the note on length above.
 * @param notes    [{ k, v }] for the colophon. Three or four.
 * @param body     raw HTML dropped into the middle of plate 1, for a sheet that
 *                 has something to show. Optional.
 */
export function renderSheet(p, { headline, lead, notes, body = "" }) {
  const inkName = nb(p?.inkName ? p.inkName.replace(/&nbsp;/g, " ") : "TWO INKS");
  const n = nb(p?.n || "00");
  const cols = notes.map((c) =>
    `<div><p class="t dim">${nb(c.k)}</p><p class="t body">${c.v}</p></div>`).join("\n      ");

  return `
  <section class="plate" id="p0">
    <div class="corner tl">
      <p class="t">PROJECT&nbsp;${n}&nbsp;—&nbsp;${nb(p?.title || "")}</p>
      <p class="t dim">${nb(p?.kind || "")}</p>
    </div>
    <div class="corner tr">
      <p class="t dim"><span data-at>—</span></p>
      <p class="t">${nb(p?.year || "")}</p>
    </div>

    <div class="ap tall" data-ap style="--x:57%; --y:12%; --w:25%; --h:64%"></div>
    <p class="t dim cap" style="--x:57%; --y:78%">PL.&nbsp;${n}&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}</p>

    <div class="corner bl">
      <h1 class="d" style="max-width:19ch">${headline}</h1>
    </div>
    <div class="corner br">
      <p class="t dim">TWO&nbsp;PLATES.</p>
      <p class="t">SCROLL&nbsp;↓</p>
    </div>
  </section>

  <section class="plate" id="p1">
    <div class="corner tl"><p class="t">${n}&nbsp;—&nbsp;THE&nbsp;SHEET</p></div>
    <div class="corner tr"><p class="t dim"><span data-at>—</span></p></div>

    ${body}

    <div class="spec">
      <p class="t body wide">${lead}</p>
    </div>

    <div class="cols">
      ${cols}
    </div>

    <div class="ap band" data-ap style="--x:0%; --y:70%; --w:100%; --h:13%"></div>
    <p class="t dim cap pad" style="--y:85%">PL.&nbsp;${n}&nbsp;—&nbsp;CERULEAN&nbsp;+&nbsp;${inkName}.</p>

    <div class="corner br">
      <p class="t"><a class="link" href="/projects" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;work</a></p>
    </div>
  </section>`;
}
