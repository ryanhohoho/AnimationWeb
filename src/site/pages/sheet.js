// pages/sheet.js — THE SHAPE EVERY PROJECT SHEET IS CUT TO
//
// Two plates, and each one is a COLUMN.
//
// WHY IT STOPPED BEING A FOUR-CORNER COMPOSITION
// ----------------------------------------------
// It was one, and the composition had a bug in it that no amount of care was
// going to keep out. `.spec` (the lead) and `.cols` (the colophon) are both
// `position:absolute; left:var(--pad); top:28%` in the stylesheet, and neither
// says so in the markup -- so on plate 1 the argument and the colophon were
// printed on top of each other. On the USB sheet a third block, `.spec.term-col`
// at `top:20%`, landed on both. Nothing in the file you are editing tells you
// that; you have to hold three percentages from another file in your head.
//
// So a project sheet is a flow column now. It cannot collide, because nothing
// in it is pinned, and reading order IS source order. This is not a new idiom:
// `.deck-in` on the four deck cards is the same object, and four of the seven
// pages on this site were already built this way.
//
// It also costs almost nothing responsive. The 860 px block and the print
// stylesheet exist largely to UNPIN the absolute components; a column is
// already unpinned, so it needs neither.
//
// THE CORNERS ARE EMPTY, BY INSTRUCTION
// -------------------------------------
// `PROJECT 01 — …`, the kind line, the year, `TWO PLATES.`, `SCROLL ↓`, the
// `0 / 1,734` scroll readout and `PL. 01 — CERULEAN + NAVY + BLACK` are all
// gone. That register is real metadata as composition, which is the site's own
// move -- but on a project's page the PRESS is the least project-specific thing
// there is, and it was wearing the most prominent annotation slots. The chrome
// still says where you are: the stitch chart doubles card three and the legend
// reads `01 of 03`.
//
// THE SHEET KEEPS ONE HOLE, and it is not decoration. Type never sits on the
// print anywhere on this site; the print is only ever visible through a cut,
// and a project sheet with no cut at all would be the one page where that stops
// being true. It is pulled in this project's own pair, which is the identity
// system saying its whole sentence in one rectangle.
//
// It also carries `data-second`. router.js's footerHole() used to select
// `.ap.band` -- the full-bleed footer that is gone now -- and it feeds
// `state.second`, the SECOND window the closing paper retreats into. The
// mechanism was argued for and is right; only the selector was tied to a
// footer.

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A LABEL NEVER LEAVES ITS LAST WORD ALONE, and that is the whole job of the
// character. Joining EVERY space with a non-breaking one is what this started
// as, and on a 320 px phone it turned a 30-character label into one unbreakable
// 290 px word -- the flex column stretched to fit it, the transcript stretched
// to the column, and the page grew a horizontal scrollbar. Measured: a 447 px
// page on a 320 px screen.
//
// Binding only the FINAL space is what nbsp is actually for. Short labels still
// never break, because there is nothing in them long enough to break.
const nb = (v) => esc(v).replace(/ (?=[^ ]*$)/, "&nbsp;");

/**
 * @param p        the project record from site/projects.js
 * @param headline the display line on plate 0. Raw HTML: it carries <br> and
 *                 one <em>, which is the only emphasis this face has.
 * @param lead     one paragraph. ONE -- the argument goes on plate 1.
 * @param notes    [{ k, v }] for the colophon. Three or four.
 * @param hero     the figure under the headline. Normally capture().
 * @param figure   the figure on plate 1, after the evidence. Normally capture().
 * @param body     raw HTML for plate 1's evidence -- a transcript, a table, a
 *                 quoted document. This is the part that differs per project.
 * @param deep     plate 1 is a screen and a half, for a sheet whose evidence is
 *                 taller than a figure.
 */
export function renderSheet(p, {
  headline, lead, notes, hero = "", figure = "", body = "", deep = false
}) {
  const cols = notes.map((c) =>
    `<div><p class="t dim">${nb(c.k)}</p><p class="t body">${c.v}</p></div>`).join("\n        ");

  // BUILT WITH is the one hard, skimmable fact in projects.js that the site has
  // never printed anywhere. A colophon is exactly where it belongs.
  const skills = p?.skills
    ? `\n        <div><p class="t dim">BUILT&nbsp;WITH</p><p class="t body">${esc(p.skills)}</p></div>`
    : "";

  return `
  <section class="plate sheet" id="p0">
    <div class="sheet-in">
      <h1 class="d sheet-h">${headline}</h1>
      ${hero}
      <p class="t body wide lead">${lead}</p>
    </div>
  </section>

  <section class="plate sheet${deep ? " deep" : ""}" id="p1">
    <div class="sheet-in">
      <span class="ap sheet-ap" data-ap data-second></span>
      ${body}
      ${figure}
      <div class="cols">
        ${cols}${skills}
      </div>
      <p class="t back-hint"><a class="link" href="/projects" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;work</a></p>
    </div>
  </section>`;
}
