// motionPage.js — WHAT THE MOTION-GRAPHICS PAGE RUNS, FETCHED ONLY WHEN IT OPENS
//
// The viewer, the contact sheet's drawing, the dithered ground and the 112 rows
// of credits are about 70 KB of script that nothing else on the site uses, and
// the site's first chunk is what every visitor downloads before the summary
// card is interactive. Measured: 119 KB before this page and 191 KB with it
// inlined. So pages/motion-graphics.js keeps only its markup in that chunk and
// asks for this module when the page is actually mounted -- the same argument
// that already keeps three.js out of it (src/mew.js).

import { CREDITS } from "./motioncredits.js";
import { mountSheet } from "./motionSheet.js";
import { mountViewer } from "./motionViewer.js";
import { createAmbient } from "./motionAmbient.js";

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function mountMotion(ctx, root) {
  // the credits, printed into the list the markup left for them
  const list = root.querySelector("[data-credits]");
  if (list) {
    list.innerHTML = CREDITS.map((c) => `
          <li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.work)}</a>` : esc(c.work)} <span>${esc(c.author)} · ${esc(c.licence)}</span></li>`).join("");
    const n = root.querySelector("[data-credits-n]");
    if (n) n.textContent = String(CREDITS.length);
  }
  const ambient = createAmbient(root.querySelector(".mg-ground"));
  ctx.scope?.add(() => ambient.dispose());
  const sheet = mountSheet(ctx.scope, root, { ambient });
  mountViewer(ctx.scope, root, { sheet, ambient });
}
