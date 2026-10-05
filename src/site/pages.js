// pages.js — sheets other than the home sheet.
//
// A project page is being designed one at a time, each with its own concept.
// Until a project's own sheet is set, it gets THIS one: the shared chrome, its
// real metadata, and its plate pulled in its own pair of inks — plus a dialog
// that says plainly that the page is not printed yet.
//
// An honest empty state is not a placeholder. "Set but not printed" is a real
// condition in a print shop and it is exactly the register the statement plate
// already uses: say the true thing, inside system chrome.

import * as iclicker from "./pages/iclicker.js";
import * as usbProvisioning from "./pages/usb-provisioning.js";
import * as motionGraphics from "./pages/motion-graphics.js";
import * as rcmpEncryption from "./pages/rcmp-encryption.js";
import { renderDeckPage } from "./pages/deck.js";
import { mountCards } from "./cards.js";
import { mountMedia } from "./media.js";
import { mountPhotos } from "./photos.js";
import { REEL, PHOTOGRAPHY } from "./photoassets.js";
import { mountAbout } from "./about.js";
import { mountHomeLinks } from "./homeLinks.js";
export { afterArrival } from "../utils/arrival.js";

// the three deck cards that are not the summary. The summary ships as markup in
// index.html so the first paint needs no JS, and the router captures it once.
export { renderDeckPage };

// A project with its own sheet is registered here. Everything else falls back
// to the shared chrome below, which says plainly that it is not printed yet.
const SHEETS = { iclicker, "motion-graphics": motionGraphics, "usb-provisioning": usbProvisioning,
  "rcmp-encryption": rcmpEncryption };

export function sheetFor(slug) { return SHEETS[slug] || null; }

/** A move towards `route` has started: its sheet may fetch its code now. */
export function prefetchPage(route) {
  if (route?.name === "project") sheetFor(route.project.slug)?.prefetch?.();
}

/** Called after the router has committed a page. */
export function mountPage(route, ctx) {
  const sheet = route.name === "project" && sheetFor(route.project.slug);
  // the projects card has something live on it
  if (route.name === "projects") mountCards(ctx);
  // ...and the photos card, whose strip can be pulled and whose pictures open
  if (route.name === "photos") mountPhotos(ctx, { REEL, PHOTOGRAPHY });
  // ...and About, whose pictures, albums and binder turn
  if (route.name === "about") mountAbout(ctx);
  // ...and Home's three links, whose glyphs open onto the sky
  if (route.name === "home") mountHomeLinks(ctx);
  // ...and every project sheet carries figures. ONE call here rather than an
  // identical three-line mount() in each of the three sheet files: mountMedia
  // returns immediately when a page has no <video> in a figure, and it puts its
  // teardown on the page scope, which is the whole leak story for navigation.
  if (route.name === "project") mountMedia(ctx.scope);
  sheet?.mount?.(ctx);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function renderProject(p) {
  const own = sheetFor(p.slug);
  if (own) return own.html(p);
  return `
    <section class="plate" id="p-${esc(p.slug)}">
      <div class="corner tl">
        <p class="t">PROJECT&nbsp;${esc(p.n)}&nbsp;—&nbsp;${esc(p.title).toUpperCase()}</p>
        <p class="t dim">${esc(p.kind).replace(/ /g, "&nbsp;")}</p>
      </div>
      <div class="corner tr">
        <p class="t dim">ONE&nbsp;PLATE&nbsp;·&nbsp;2&nbsp;INKS</p>
        <p class="t">${esc(p.year)}</p>
      </div>

      <!-- the plate, pulled in this project's own pair. The cerulean is the
           constant; the second ink is what this piece of work owns. -->
      <div class="ap wide" data-ap style="--x:47%; --y:22%; --w:41%; --h:46%"></div>

      <div class="spec">
        <h1 class="d sm">${esc(p.title)}</h1>
        <dl>
          <dt>SUBJECT</dt><dd>${esc(p.sub).replace(/ /g, "&nbsp;")}</dd>
          <dt>KIND</dt><dd>${esc(p.kind).replace(/ /g, "&nbsp;")}</dd>
          <dt>YEAR</dt><dd>${esc(p.year)}</dd>
          <dt>2ND&nbsp;INK</dt><dd>${esc(p.inkName).replace(/ /g, "&nbsp;")}</dd>
        </dl>
        <p class="t dim body">${esc(p.line)}</p>
        <p class="t dim body"><em style="font-style:normal">${esc(p.inkName)}</em> — ${esc(p.inkWhy)}.</p>
      </div>

      <div class="dialog set" style="--x:47%; --y:74%; --w:41%">
        <p class="dlg-bar">SYSTEM</p>
        <div class="dlg-body">
          <span class="ap icon" data-ap></span>
          <div class="dlg-text">
            <p class="t">THIS&nbsp;SHEET&nbsp;IS&nbsp;SET,&nbsp;NOT&nbsp;PRINTED.</p>
            <p class="t dim body wide">The plate is pulled and the inks are
              chosen. The page itself is being made one at a time, and this one
              has not had its turn.</p>
          </div>
        </div>
      </div>

      <div class="corner bl">
        <p class="t"><a class="link" href="/" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;sheet</a></p>
      </div>
    </section>`;
}

export function renderNotFound(path) {
  return `
    <section class="plate" id="p-404">
      <div class="corner tl">
        <p class="t">404&nbsp;—&nbsp;NOT&nbsp;PRINTED</p>
        <p class="t dim">${esc(path || "")}</p>
      </div>
      <div class="corner bl">
        <h1 data-e="d-cjra" class="d">sorry,<br><em>invalid link.</em></h1>
      </div>
      <div class="corner br">
        <p class="t"><a class="link" href="/" data-route>← go back</a></p>
      </div>
    </section>`;
}
