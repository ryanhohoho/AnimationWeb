// site.js — the "Link & icon" tab: what the site is called, what a link to it
// looks like, and the mark in the browser's tab
//
// Everything here edits src/site/identity.js (through the store, so it undoes
// with everything else) and, on Save, the files in public/ the head links: the
// card's picture and the icon at every size. Four sections:
//
//   Name          the tab's name on Home and on every other page, the site's
//                 name, the address the card's picture is served from
//   Link preview  the card's title, description and picture text, and what a
//                 search result quotes
//   Card picture  the 1200x630 picture: designed (CARD, drawn by card.js) or a
//                 picture cut to size
//   Icon          the 32x32 grid, painted, or a picture cut to a square
//
// Each section shows what it changes where it will be seen -- a Discord embed,
// an iMessage bubble, a browser's tab strip, a phone's home screen -- drawn
// from the same canvas that Save encodes, so nothing is a separate mock of
// what ships. The mock-ups are approximations of each app's own layout as of
// 2026, at its own sizes; the picture in them is exact.
//
// The panels re-render only when something they did not do themselves changed
// the data (an undo), so typing is never interrupted by its own echo.

import { h, toast } from "./util.js";
import { CARD_W, CARD_H, FONTS, loadCardFonts, weightFor, drawCard, drawGrid, drawCropped,
  downscale, textBox, icoOf, toBlob } from "./card.js";

const SECTIONS = [
  { key: "name", label: "Name", sub: "The tab, the site's name, its address" },
  { key: "preview", label: "Link preview", sub: "The words a shared link unfurls into" },
  { key: "card", label: "Card picture", sub: "The 1200 × 630 picture in the card" },
  { key: "icon", label: "Icon", sub: "The mark in the tab and on a home screen" }
];
const SEC_KEY = "ed-site-section";
const ch = (a, b) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
const clone = (v) => JSON.parse(JSON.stringify(v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createSiteTab({ ed, store, state, nav, board, panel, onSection }) {
  let open = false;
  let section = (() => { try { return localStorage.getItem(SEC_KEY) || "preview"; } catch { return "preview"; } })();
  if (!SECTIONS.some((s) => s.key === section)) section = "preview";
  let shown = "";                    // the identity the panel was last drawn from
  let sel = null;                    // in the designer: { kind: "text", i } | { kind: "window" } | { kind: "mark" }
  let publicFiles = { ...(state.publicFiles || {}) };
  let fontsOk = false;
  // pictures being cut from, by token: { img, blob, name, type, url, w, h }.
  // The store holds only the token and the crop, so the picture survives undo
  // and the history stays small.
  const sources = new Map();

  const I = () => store.identity;
  const savedI = () => store.savedIdentity;

  // ── changing the data ────────────────────────────────────────────────────
  // live: a drag or a keystroke, previewed with no history step; then one
  // commit for the whole gesture. Every mutate SETS rather than adds, so the
  // commit can re-run it on the snapshot taken before the gesture began.
  let living = false;
  function change(label, mutate, { live = false, panel: redrawPanel = false } = {}) {
    const after = () => paint();
    if (live) {
      if (!living) { ed.beginLive(); living = true; }
      store.live(mutate, after);
      return;
    }
    if (living) { living = false; ed.commitLive(label, mutate, after); }
    else store.global(label, mutate, after);
    shown = JSON.stringify(I());
    if (redrawPanel) renderPanel();
  }

  // ── the canvases everything is drawn from ────────────────────────────────
  const master = h("canvas", { width: CARD_W, height: CARD_H });
  function drawMaster() {
    const ctx = master.getContext("2d");
    const id = I();
    if (id.PREVIEW.mode === "upload") {
      const src = sources.get(id.uploads.card?.token);
      if (src) drawCropped(ctx, src.img, id.uploads.card.crop, CARD_W, CARD_H, { fill: id.CARD.background });
      else if (savedCard) ctx.drawImage(savedCard, 0, 0, CARD_W, CARD_H);
      else { ctx.fillStyle = "#ddd"; ctx.fillRect(0, 0, CARD_W, CARD_H); }
    } else drawCard(ctx, id.CARD, id.ICON.grid);
  }
  // the card as it is on disk, for an uploaded picture whose original is not
  // in this session any more
  let savedCard = null;
  function loadSavedCard() {
    const f = I().PREVIEW.image.replace(/^\//, "");
    if (!publicFiles[f]) { savedCard = null; return; }
    const img = new Image();
    img.onload = () => { savedCard = img; paint(); };
    img.src = `/${f}?v=${publicFiles[f]}`;
  }

  /** the icon at `size`, as it will be written: from the grid, or the picture */
  function iconCanvas(size, { apple = false } = {}) {
    const c = h("canvas", { width: size, height: size });
    const ctx = c.getContext("2d");
    const id = I();
    if (id.ICON.mode === "grid") {
      // whole cells only, as bake_favicon.mjs draws them: 180 is 5 px cells on
      // 10 px of ground, anything else the nearest whole cell centred
      const cell = Math.max(1, Math.floor(size / 32));
      const pad = Math.round((size - cell * 32) / 2);
      ctx.fillStyle = id.ICON.bg; ctx.fillRect(0, 0, size, size);
      drawGrid(ctx, id.ICON.grid, pad, pad, cell, id.ICON.fg);
      return c;
    }
    const sq = iconMaster();
    if (!sq) { ctx.fillStyle = id.ICON.bg; ctx.fillRect(0, 0, size, size); if (savedIcon) ctx.drawImage(savedIcon, 0, 0, size, size); return c; }
    const up = id.uploads.icon;
    if (apple) {
      // iOS fills transparency with black and rounds the corners itself: the
      // picture sits on the ground colour with 20 px of it round (180 px)
      ctx.fillStyle = id.ICON.bg; ctx.fillRect(0, 0, size, size);
      const inner = Math.round(size * 140 / 180);
      ctx.drawImage(downscale(sq, inner, { sharp: up?.sharp }), (size - inner) / 2, (size - inner) / 2);
    } else {
      ctx.drawImage(downscale(sq, size, { sharp: up?.sharp }), 0, 0);
    }
    return c;
  }
  let iconMasterCache = null, iconMasterKey = "";
  function iconMaster() {
    const id = I(), up = id.uploads.icon;
    const src = sources.get(up?.token);
    if (!src) return null;
    const key = JSON.stringify([up, id.ICON.bg]);
    if (iconMasterCache && key === iconMasterKey) return iconMasterCache;
    const c = h("canvas", { width: 512, height: 512 });
    drawCropped(c.getContext("2d"), src.img, up.crop, 512, 512, { fill: up.clear ? null : id.ICON.bg, sharp: up.sharp });
    iconMasterCache = c; iconMasterKey = key;
    return c;
  }
  let savedIcon = null;
  function loadSavedIcon() {
    const f = publicFiles["favicon-192.png"] ? "favicon-192.png" : null;
    if (!f) return;
    const img = new Image();
    img.onload = () => { savedIcon = img; paint(); };
    img.src = `/${f}?v=${publicFiles[f]}`;
  }

  // ── painting: every picture in the board, from the data, once a frame ────
  let paintQueued = false;
  function paint() {
    if (!open || paintQueued) return;
    paintQueued = true;
    // a frame, or 60 ms if no frame comes (a hidden window never draws one,
    // and the tab would come back to it blank)
    const run = () => {
      if (!paintQueued) return;
      paintQueued = false;
      if (!open) return;
      drawMaster();
      paintDesigner();
      paintPainter();
      renderMocks();
    };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  }

  // ── the shell ────────────────────────────────────────────────────────────
  function renderNav() {
    nav.replaceChildren(
      h("div", { class: "panel-h" }, "Link & icon"),
      h("div", { class: "site-secs" }, SECTIONS.map((s) => h("button", {
        class: `site-sec${s.key === section ? " on" : ""}`,
        onclick: () => go(s.key)
      }, h("b", {}, s.label), h("span", {}, s.sub)))),
      h("div", { class: "site-where" },
        h("p", {}, "Saved to ", h("code", {}, "src/site/identity.js"), ", and the pictures to ", h("code", {}, "public/"), "."),
        h("p", {}, "Discord, Slack and iMessage keep a link's card for a while after it was first shared. A new picture gets a new address, so it is fetched again; new words can take a few hours to show on a link that was already posted.")));
  }
  function go(key) {
    section = key;
    try { localStorage.setItem(SEC_KEY, key); } catch {}
    sel = null;
    renderAll();
    onSection?.(key);
  }
  function renderAll() {
    renderNav();
    renderBoard();
    renderPanel();
    paint();
  }

  // ── the board ────────────────────────────────────────────────────────────
  let designer = null, painter = null, mocks = null;
  function renderBoard() {
    designer = painter = null;
    mocks = h("div", { class: "mocks" });
    const kids = [];
    if (section === "card") kids.push(designerBlock());
    if (section === "icon") kids.push(painterBlock());
    kids.push(mocks);
    board.replaceChildren(h("div", { class: "site-board-in" }, kids));
  }

  const host = () => {
    try { return new URL(I().SITE.url).host || "localhost"; } catch { return I().SITE.url ? I().SITE.url.replace(/^https?:\/\//, "") : "localhost"; }
  };
  /** a canvas showing the card at w css px wide */
  function cardThumb(w, { radius = 0, cls = "" } = {}) {
    const dpr = devicePixelRatio || 1;
    const c = h("canvas", { class: `thumb ${cls}`, width: Math.round(w * dpr), height: Math.round(w * dpr * CARD_H / CARD_W),
      style: { width: `${w}px`, height: `${w * CARD_H / CARD_W}px`, borderRadius: radius ? `${radius}px` : null } });
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(master, 0, 0, c.width, c.height);
    return c;
  }
  function iconThumb(px, { round = 0, apple = false } = {}) {
    const dpr = devicePixelRatio || 1;
    const src = iconCanvas(apple ? 180 : px * dpr <= 32 ? 32 : 192, { apple });
    const c = h("canvas", { width: Math.round(px * dpr), height: Math.round(px * dpr),
      style: { width: `${px}px`, height: `${px}px`, borderRadius: round ? `${round}px` : null } });
    const ctx = c.getContext("2d");
    // the browser draws a favicon smoothed; a 32 px file in a 16 px slot on a
    // 2x screen is drawn 1:1
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  function renderMocks() {
    if (!mocks) return;
    const id = I();
    const P = id.PREVIEW, S = id.SITE;
    const blocks = [];
    const pageName = "experience";
    const tabOther = tabTitleOf(S, pageName);
    if (section === "name" || section === "icon") {
      blocks.push(mock("Browser tabs", h("div", { class: "m-tabs-wrap" },
        tabStrip("light", [S.title, tabOther]), tabStrip("dark", [S.title, tabOther]))));
      blocks.push(mock("Phone home screen", h("div", { class: "m-home" },
        h("div", { class: "m-app" }, iconThumb(60, { round: 13.5, apple: true }), h("span", {}, S.siteName || S.title)),
        h("div", { class: "m-app ghost" }, h("i"), h("span", {}, "Notes")),
        h("div", { class: "m-app ghost" }, h("i"), h("span", {}, "Photos")))));
    }
    if (section === "name" || section === "preview") {
      blocks.push(mock("Google search result", h("div", { class: "m-google" },
        h("div", { class: "m-g-site" }, h("span", { class: "m-g-ico" }, iconThumb(18, { round: 9 })),
          h("span", {}, h("b", {}, S.siteName || host()), h("small", {}, `https://${host()}`))),
        h("div", { class: "m-g-title" }, S.title),
        h("div", { class: "m-g-desc" }, cut(S.description, 158))),
        "Google shows the Home tab's name and the search description, not the card. It may rewrite either."));
    }
    if (section === "preview" || section === "card") {
      const stripe = store.tokens["--paper"] || "#FFFFFF";
      blocks.push(mock("Discord", h("div", { class: "m-discord" },
        h("div", { class: "m-d-link" }, `https://${host()}/projects`),
        h("div", { class: "m-d-embed", style: { borderLeftColor: stripe } },
          h("div", { class: "m-d-site" }, S.siteName),
          h("div", { class: "m-d-title" }, P.title),
          h("div", { class: "m-d-desc" }, cut(P.description, 350)),
          cardThumb(400, { radius: 4 }))),
        "The stripe is the page's theme colour (the paper)."));
      blocks.push(mock("iMessage", h("div", { class: "m-imsg" },
        h("div", { class: "m-i-bubble" }, cardThumb(270),
          h("div", { class: "m-i-foot" }, h("b", {}, cut(P.title, 80)), h("span", {}, host()))))));
      blocks.push(mock("Slack", h("div", { class: "m-slack" },
        h("div", { class: "m-s-site" }, iconThumb(16, { round: 3 }), h("b", {}, S.siteName)),
        h("div", { class: "m-s-title" }, P.title),
        h("div", { class: "m-s-desc" }, cut(P.description, 300)),
        cardThumb(360, { radius: 8 }))));
      blocks.push(mock("X", h("div", { class: "m-x" },
        h("div", { class: "m-x-card" }, cardThumb(380, { radius: 16 }), h("span", { class: "m-x-dom" }, host())),
        h("div", { class: "m-x-from" }, `From ${host()}`))));
      blocks.push(mock("LinkedIn", h("div", { class: "m-li" }, cardThumb(380),
        h("div", { class: "m-li-foot" }, h("b", {}, cut(P.title, 100)), h("span", {}, host())))));
    }
    mocks.replaceChildren(...blocks);
  }
  function mock(title, body, note) {
    return h("figure", { class: "mock" }, h("figcaption", {}, title), body, note ? h("p", { class: "mock-note" }, note) : null);
  }
  function tabStrip(theme, titles) {
    return h("div", { class: `m-tabs ${theme}` }, titles.map((t, i) =>
      h("div", { class: `m-tab${i === 0 ? " on" : ""}` }, iconThumb(16, { round: 2 }), h("span", {}, t), h("i", {}, "×"))),
      h("div", { class: "m-tab-plus" }, "+"));
  }
  const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + "…" : String(s));
  const tabTitleOf = (S, page) => {
    const pat = String(S.pageTitle || "{page}");
    return pat.includes("{page}") ? pat.split("{page}").join(page) : pat;
  };

  // ── the card designer ────────────────────────────────────────────────────
  function designerBlock() {
    const cv = h("canvas", { class: "designer", tabindex: "0" });
    const wrap = h("div", { class: "designer-wrap" }, cv);
    designer = { cv, wrap, drag: null, hover: null, guides: [] };
    cv.addEventListener("pointerdown", designerDown);
    cv.addEventListener("pointermove", designerMove);
    cv.addEventListener("pointerup", designerUp);
    cv.addEventListener("pointercancel", designerUp);
    cv.addEventListener("pointerleave", () => { if (designer && !designer.drag) { designer.hover = null; paintDesigner(); } });
    cv.addEventListener("wheel", designerWheel, { passive: false });
    cv.addEventListener("keydown", designerKey);
    const up = I().PREVIEW.mode === "upload";
    return h("div", { class: "site-stage" },
      h("div", { class: "stage-h" }, h("b", {}, "Card picture"), h("span", {}, up
        ? "Drag to move the picture in the frame; scroll or use the slider to zoom."
        : "Click a block to select it, drag to move it (⌥ no snapping, ⇧ one axis), arrows nudge (⇧ ×10), ⌫ deletes a text.")),
      wrap);
  }
  function designerScale() {
    const W = Math.min(960, Math.max(320, (board.clientWidth || 900) - 64));
    return W / CARD_W;
  }
  function paintDesigner() {
    if (!designer) return;
    const { cv } = designer;
    const k = designerScale(), dpr = devicePixelRatio || 1;
    const cw = Math.round(CARD_W * k), chh = Math.round(CARD_H * k);
    if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr); }
    cv.style.width = `${cw}px`; cv.style.height = `${chh}px`;
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(master, 0, 0, cv.width, cv.height);
    if (I().PREVIEW.mode !== "design") return;
    ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    const box = (b, color, dash) => {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5 / k; ctx.setLineDash(dash ? [5 / k, 4 / k] : []);
      ctx.strokeRect(b.x0 - 4, b.y0 - 4, b.x1 - b.x0 + 8, b.y1 - b.y0 + 8);
      ctx.restore();
    };
    if (designer.hover && !same(designer.hover, sel)) box(boxOf(designer.hover), "rgba(0,90,125,.55)", true);
    if (sel) box(boxOf(sel), "#0A84FF", false);
    for (const g of designer.guides) {
      ctx.save(); ctx.strokeStyle = "#E5484D"; ctx.lineWidth = 1 / k;
      ctx.beginPath();
      if (g.x !== undefined) { ctx.moveTo(g.x, 0); ctx.lineTo(g.x, CARD_H); } else { ctx.moveTo(0, g.y); ctx.lineTo(CARD_W, g.y); }
      ctx.stroke(); ctx.restore();
    }
  }
  const same = (a, b) => !!a && !!b && a.kind === b.kind && a.i === b.i;
  const measureCtx = h("canvas", { width: 4, height: 4 }).getContext("2d");
  function boxOf(s) {
    const C = I().CARD;
    if (s.kind === "window") return { x0: C.window.x, y0: C.window.y, x1: C.window.x + C.window.w, y1: C.window.y + C.window.h };
    if (s.kind === "mark") return { x0: C.mark.x, y0: C.mark.y, x1: C.mark.x + 32 * C.mark.cell, y1: C.mark.y + 32 * C.mark.cell };
    const t = C.texts[s.i];
    return t ? textBox(measureCtx, t) : { x0: 0, y0: 0, x1: 0, y1: 0 };
  }
  function hitAt(x, y) {
    const C = I().CARD;
    const inB = (b) => x >= b.x0 - 4 && x <= b.x1 + 4 && y >= b.y0 - 4 && y <= b.y1 + 4;
    for (let i = C.texts.length - 1; i >= 0; i--) if (inB(boxOf({ kind: "text", i }))) return { kind: "text", i };
    if (C.mark.show && inB(boxOf({ kind: "mark" }))) return { kind: "mark" };
    if (C.window.show && inB(boxOf({ kind: "window" }))) return { kind: "window" };
    return null;
  }
  const cardPoint = (e) => {
    const r = designer.cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * CARD_W, (e.clientY - r.top) / r.height * CARD_H];
  };
  const posOf = (s) => {
    const C = I().CARD;
    return s.kind === "text" ? C.texts[s.i] : s.kind === "mark" ? C.mark : C.window;
  };
  function designerDown(e) {
    if (e.button !== 0) return;
    designer.cv.focus({ preventScroll: true });
    const [x, y] = cardPoint(e);
    const id = I();
    if (id.PREVIEW.mode === "upload") {
      const up = id.uploads.card;
      if (!up || !sources.get(up.token)) return;
      designer.cv.setPointerCapture(e.pointerId);
      designer.drag = { pan: true, x0: x, y0: y, crop: { ...up.crop } };
      return;
    }
    const hit = hitAt(x, y);
    if (!same(hit, sel)) { sel = hit; renderPanel(); }
    paintDesigner();
    if (!hit) return;
    designer.cv.setPointerCapture(e.pointerId);
    const p = posOf(hit);
    designer.drag = { x0: x, y0: y, px: p.x, py: p.y, moved: false };
  }
  function designerMove(e) {
    if (!designer) return;
    const [x, y] = cardPoint(e);
    const d = designer.drag;
    if (!d) {
      if (I().PREVIEW.mode !== "design") return;
      const hv = hitAt(x, y);
      if (!same(hv, designer.hover) && (hv || designer.hover)) { designer.hover = hv; paintDesigner(); }
      designer.cv.style.cursor = hv ? "move" : "default";
      return;
    }
    if (d.pan) {
      const up = I().uploads.card, src = sources.get(up.token);
      const s = Math.max(CARD_W / src.w, CARD_H / src.h) * d.crop.zoom;
      const crop = { ...d.crop, x: clamp(d.crop.x - (x - d.x0) / (src.w * s), -1, 2), y: clamp(d.crop.y - (y - d.y0) / (src.h * s), -1, 2) };
      change("Move the card picture", (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop }; }, { live: true });
      d.last = crop;
      return;
    }
    let dx = x - d.x0, dy = y - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    d.moved = true;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    let nx = Math.round(d.px + dx), ny = Math.round(d.py + dy);
    designer.guides = [];
    if (!e.altKey) [nx, ny] = snap(sel, nx, ny);
    const target = sel;
    const mutate = (st) => { const p = target.kind === "text" ? st.identity.CARD.texts[target.i] : st.identity.CARD[target.kind]; p.x = nx; p.y = ny; };
    d.mutate = mutate;
    change("Move", mutate, { live: true });
  }
  function designerUp(e) {
    const d = designer?.drag;
    if (!d) return;
    designer.drag = null;
    designer.guides = [];
    try { designer.cv.releasePointerCapture(e.pointerId); } catch {}
    if (d.pan) {
      if (d.last) change("Move the card picture", (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop: d.last }; });
      return;
    }
    if (d.moved && d.mutate) change(`Move ${labelOf(sel)}`, d.mutate, { panel: true });
    else paintDesigner();
  }
  /** snap an element's position to its neighbours' edges and the card's middle */
  function snap(s, x, y) {
    const C = I().CARD;
    const me = boxOf(s), p = posOf(s);
    const ox = me.x0 - p.x, ow = me.x1 - me.x0, oy = me.y0 - p.y, oh = me.y1 - me.y0;
    const xs = [CARD_W / 2, 72, CARD_W - 72], ys = [CARD_H / 2, 72, CARD_H - 72];
    const others = [];
    if (C.window.show && s.kind !== "window") others.push(boxOf({ kind: "window" }));
    C.texts.forEach((t, i) => { if (!(s.kind === "text" && s.i === i)) others.push(boxOf({ kind: "text", i })); });
    for (const b of others) { xs.push(b.x0, b.x1, (b.x0 + b.x1) / 2); ys.push(b.y0, b.y1, (b.y0 + b.y1) / 2); }
    // a text also snaps by its baseline and its anchor, which is how type lines up
    const ax = s.kind === "text" ? C.texts.filter((t, i) => i !== s.i).map((t) => t.x) : [];
    const by = s.kind === "text" ? C.texts.filter((t, i) => i !== s.i).map((t) => t.y) : [];
    const T = 6;
    let bx = null, bdx = T;
    for (const v of ax) if (Math.abs(x - v) < bdx) { bdx = Math.abs(x - v); bx = { to: v, guide: v }; }
    for (const v of xs) for (const off of [ox, ox + ow / 2, ox + ow]) {
      const d = Math.abs(x + off - v);
      if (d < bdx) { bdx = d; bx = { to: v - off, guide: v }; }
    }
    let byy = null, bdy = T;
    for (const v of by) if (Math.abs(y - v) < bdy) { bdy = Math.abs(y - v); byy = { to: v, guide: v }; }
    for (const v of ys) for (const off of [oy, oy + oh / 2, oy + oh]) {
      const d = Math.abs(y + off - v);
      if (d < bdy) { bdy = d; byy = { to: v - off, guide: v }; }
    }
    if (bx) { x = Math.round(bx.to); designer.guides.push({ x: bx.guide }); }
    if (byy) { y = Math.round(byy.to); designer.guides.push({ y: byy.guide }); }
    return [x, y];
  }
  function designerWheel(e) {
    const id = I();
    if (id.PREVIEW.mode !== "upload" || !sources.get(id.uploads.card?.token)) return;
    e.preventDefault();
    const crop = id.uploads.card.crop;
    const zoom = clamp(crop.zoom * Math.exp(-e.deltaY * 0.002), 0.2, 8);
    change("Zoom the card picture", (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop: { ...crop, zoom } }; }, { live: true });
    clearTimeout(wheelT);
    wheelT = setTimeout(() => change("Zoom the card picture", (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop: { ...crop, zoom } }; }, { panel: true }), 350);
  }
  let wheelT = 0, nudgeT = 0;
  function designerKey(e) {
    if (!sel || I().PREVIEW.mode !== "design") return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault();
      const p = posOf(sel), target = sel;
      const nx = p.x + d[0], ny = p.y + d[1];
      const mutate = (st) => { const q = target.kind === "text" ? st.identity.CARD.texts[target.i] : st.identity.CARD[target.kind]; q.x = nx; q.y = ny; };
      change("Nudge", mutate, { live: true });
      clearTimeout(nudgeT);
      nudgeT = setTimeout(() => change(`Nudge ${labelOf(target)}`, mutate, { panel: true }), 600);
      return;
    }
    if ((e.key === "Backspace" || e.key === "Delete") && sel.kind === "text") { e.preventDefault(); removeText(sel.i); }
    if (e.key === "Escape") { sel = null; renderPanel(); paintDesigner(); }
  }
  const labelOf = (s) => !s ? "" : s.kind === "window" ? "the window" : s.kind === "mark" ? "Mew"
    : `“${cut(String(I().CARD.texts[s.i]?.text || "").split("\n")[0], 24)}”`;

  // ── the icon painter ─────────────────────────────────────────────────────
  const CELL = 12;
  function painterBlock() {
    const cv = h("canvas", { class: "painter" });
    painter = { cv, drag: null };
    cv.addEventListener("pointerdown", painterDown);
    cv.addEventListener("pointermove", painterMove);
    cv.addEventListener("pointerup", painterUp);
    cv.addEventListener("pointercancel", painterUp);
    cv.addEventListener("wheel", painterWheel, { passive: false });
    const up = I().ICON.mode === "upload";
    const sizes = h("div", { class: "icon-sizes" });
    painter.sizes = sizes;
    return h("div", { class: "site-stage" },
      h("div", { class: "stage-h" }, h("b", {}, "Icon"), h("span", {}, up
        ? "Drag to move the picture in the square; scroll or use the slider to zoom."
        : "Click a cell to paint it, drag to paint more; a stroke paints whatever the first cell was not.")),
      h("div", { class: "painter-row" }, cv, sizes));
  }
  function paintPainter() {
    if (!painter) return;
    const { cv } = painter;
    const id = I();
    const dpr = devicePixelRatio || 1, S = 32 * CELL;
    if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; cv.style.width = `${S}px`; cv.style.height = `${S}px`; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (id.ICON.mode === "grid") {
      ctx.fillStyle = id.ICON.bg; ctx.fillRect(0, 0, S, S);
      drawGrid(ctx, id.ICON.grid, 0, 0, CELL, id.ICON.fg);
      ctx.strokeStyle = "rgba(127,127,127,.28)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 32; i++) { ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, S); ctx.moveTo(0, i * CELL + 0.5); ctx.lineTo(S, i * CELL + 0.5); }
      ctx.stroke();
    } else {
      // checks under a transparent picture, so "clear" shows as clear
      for (let y = 0; y < S; y += 12) for (let x = 0; x < S; x += 12) { ctx.fillStyle = ((x + y) / 12) % 2 ? "#e8e8e8" : "#fff"; ctx.fillRect(x, y, 12, 12); }
      const sq = iconMaster();
      if (sq) { ctx.imageSmoothingEnabled = !id.uploads.icon?.sharp; ctx.drawImage(sq, 0, 0, S, S); }
      else if (savedIcon) ctx.drawImage(savedIcon, 0, 0, S, S);
    }
    painter.sizes.replaceChildren(
      ...[[16, "16 px (a standard screen's tab)"], [32, "32 px (a retina tab)"], [64, "64"]].map(([px, l]) =>
        h("div", { class: "isz" }, iconThumb(px), h("span", {}, l))),
      h("div", { class: "isz" }, iconThumb(90, { round: 20, apple: true }), h("span", {}, "home screen")));
  }
  const cellAt = (e) => {
    const r = painter.cv.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / r.width * 32), Math.floor((e.clientY - r.top) / r.height * 32)];
  };
  function setCells(grid, cells, v) {
    const rows = grid.map((r) => [...r]);
    for (const [x, y] of cells) if (x >= 0 && y >= 0 && x < 32 && y < 32) rows[y][x] = v ? "#" : ".";
    return rows.map((r) => r.join(""));
  }
  function painterDown(e) {
    if (e.button !== 0) return;
    painter.cv.setPointerCapture(e.pointerId);
    const id = I();
    if (id.ICON.mode === "upload") {
      if (!sources.get(id.uploads.icon?.token)) return;
      const r = painter.cv.getBoundingClientRect();
      painter.drag = { pan: true, x0: e.clientX, y0: e.clientY, w: r.width, crop: { ...id.uploads.icon.crop } };
      return;
    }
    const [x, y] = cellAt(e);
    const v = id.ICON.grid[y]?.[x] !== "#";
    painter.drag = { v, last: [x, y], grid: setCells(id.ICON.grid, [[x, y]], v) };
    const g = painter.drag.grid;
    change("Paint the icon", (st) => { st.identity.ICON.grid = g; }, { live: true });
  }
  function painterMove(e) {
    const d = painter?.drag;
    if (!d) return;
    if (d.pan) {
      const src = sources.get(I().uploads.icon.token);
      const s = Math.max(1 / src.w, 1 / src.h) * d.crop.zoom;     // frame = 1
      const crop = { ...d.crop, x: clamp(d.crop.x - (e.clientX - d.x0) / d.w / (src.w * s), -1, 2),
        y: clamp(d.crop.y - (e.clientY - d.y0) / d.w / (src.h * s), -1, 2) };
      d.last = crop;
      change("Move the icon picture", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop }; }, { live: true });
      return;
    }
    const [x, y] = cellAt(e);
    if (x === d.last[0] && y === d.last[1]) return;
    // every cell between the last one and this, so a fast stroke has no gaps
    const cells = [];
    const [x0, y0] = d.last, n = Math.max(Math.abs(x - x0), Math.abs(y - y0));
    for (let i = 1; i <= n; i++) cells.push([Math.round(x0 + (x - x0) * i / n), Math.round(y0 + (y - y0) * i / n)]);
    d.last = [x, y];
    d.grid = setCells(d.grid, cells, d.v);
    const g = d.grid;
    change("Paint the icon", (st) => { st.identity.ICON.grid = g; }, { live: true });
  }
  function painterUp(e) {
    const d = painter?.drag;
    if (!d) return;
    painter.drag = null;
    try { painter.cv.releasePointerCapture(e.pointerId); } catch {}
    if (d.pan) {
      if (d.last) change("Move the icon picture", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop: d.last }; });
      return;
    }
    const g = d.grid;
    change("Paint the icon", (st) => { st.identity.ICON.grid = g; });
  }
  function painterWheel(e) {
    const id = I();
    if (id.ICON.mode !== "upload" || !sources.get(id.uploads.icon?.token)) return;
    e.preventDefault();
    const crop = id.uploads.icon.crop;
    const zoom = clamp(crop.zoom * Math.exp(-e.deltaY * 0.002), 0.2, 8);
    change("Zoom the icon picture", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop: { ...crop, zoom } }; }, { live: true });
    clearTimeout(wheelT);
    wheelT = setTimeout(() => change("Zoom the icon picture", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop: { ...crop, zoom } }; }, { panel: true }), 350);
  }
  function gridOp(label, fn) {
    const g = fn(I().ICON.grid.map((r) => [...r]));
    const out = g.map((r) => r.join(""));
    change(label, (st) => { st.identity.ICON.grid = out; });
  }

  // ── fields ───────────────────────────────────────────────────────────────
  /** a text field bound to a path in the identity: live while typing, one
      undo step when it is left */
  function textField({ label, get, set, multi = false, max = 0, hint = "", placeholder = "", k }) {
    const input = h(multi ? "textarea" : "input", { class: "sf-in", spellcheck: "true", "data-f": k, placeholder,
      rows: multi ? 3 : null });
    input.value = get();
    const count = max ? h("small", { class: "sf-count" }) : null;
    const showCount = () => { if (count) { const n = input.value.length; count.textContent = `${n} / ${max}`; count.classList.toggle("over", n > max); } };
    showCount();
    input.addEventListener("input", () => { showCount(); const v = input.value; change(label, (st) => set(st.identity, v), { live: true }); });
    input.addEventListener("change", () => { const v = input.value; change(label, (st) => set(st.identity, v)); });
    if (!multi) input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
    return h("label", { class: "sf" }, h("span", { class: "sf-l" }, label, count), input, hint ? h("span", { class: "sf-h" }, hint) : null);
  }
  function numField({ label, get, set, step = 1, min = -9999, max = 9999, k, unit = "" }) {
    const input = h("input", { class: "sf-in num", type: "number", step, min, max, "data-f": k });
    input.value = String(get());
    const read = () => { const v = parseFloat(input.value); return Number.isFinite(v) ? clamp(v, min, max) : null; };
    input.addEventListener("input", () => { const v = read(); if (v !== null) change(label, (st) => set(st.identity, v), { live: true }); });
    input.addEventListener("change", () => { const v = read(); if (v === null) { input.value = String(get()); return; } input.value = String(v); change(label, (st) => set(st.identity, v)); });
    return h("label", { class: "sf sm" }, h("span", { class: "sf-l" }, label, unit ? h("small", {}, unit) : null), input);
  }
  function checkField({ label, get, set, k }) {
    const input = h("input", { type: "checkbox", "data-f": k });
    input.checked = !!get();
    input.addEventListener("change", () => { const v = input.checked; change(label, (st) => set(st.identity, v), { panel: true }); });
    return h("label", { class: "sf-check" }, input, label);
  }
  function selectField({ label, get, set, options, k }) {
    const s = h("select", { class: "sf-in", "data-f": k }, options.map(([v, l]) => h("option", { value: String(v) }, l)));
    s.value = String(get());
    s.addEventListener("change", () => { const raw = s.value; const v = /^-?\d+(\.\d+)?$/.test(raw) ? +raw : raw; change(label, (st) => set(st.identity, v), { panel: true }); });
    return h("label", { class: "sf sm" }, h("span", { class: "sf-l" }, label), s);
  }
  /** a colour: the native picker, the hex, and the site's own colours */
  function colorField({ label, get, set, k }) {
    const v = get();
    const pick = h("input", { type: "color", value: v.toLowerCase(), "data-f": k });
    const hex = h("input", { class: "sf-in hex", value: v.toUpperCase(), spellcheck: "false", maxlength: 7 });
    pick.addEventListener("input", () => { hex.value = pick.value.toUpperCase(); const c = hex.value; change(label, (st) => set(st.identity, c), { live: true }); });
    pick.addEventListener("change", () => { const c = pick.value.toUpperCase(); change(label, (st) => set(st.identity, c)); });
    hex.addEventListener("change", () => {
      let c = hex.value.trim().toUpperCase();
      if (!c.startsWith("#")) c = "#" + c;
      if (/^#[0-9A-F]{3}$/.test(c)) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
      if (!/^#[0-9A-F]{6}$/.test(c)) { hex.value = get().toUpperCase(); toast("A colour is written #RRGGBB.", true); return; }
      pick.value = c.toLowerCase();
      change(label, (st) => set(st.identity, c));
    });
    const T = store.tokens, P = store.palette;
    const chips = [["paper", T["--paper"]], ["ink", T["--ink"]], ["label grey", T["--n3"]], ["cerulean", T["--ink-a"]],
      ["rose", T["--ink-b"]], ["sky ink A", P.homeInkA], ["sky ink B", P.homeInkB]].filter(([, c]) => /^#[0-9A-Fa-f]{6}$/.test(c || ""));
    return h("div", { class: "sf sm" }, h("span", { class: "sf-l" }, label),
      h("div", { class: "sf-color" }, pick, hex),
      h("div", { class: "sf-chips" }, chips.map(([n, c]) => h("button", { type: "button", title: `${n} ${c}`, style: { background: c },
        onclick: () => { change(label, (st) => set(st.identity, c.toUpperCase()), { panel: true }); } }))));
  }
  const group = (title, kids, aside) => h("section", { class: "sec" }, h("div", { class: "sec-h" }, title, aside || null), kids);
  const seg = (items, cur, onPick) => h("div", { class: "btns" }, items.map(([v, l, t]) =>
    h("button", { class: cur === v ? "on" : "", title: t || l, type: "button", onclick: () => onPick(v) }, l)));

  // ── the panel ────────────────────────────────────────────────────────────
  function renderPanel() {
    // keep the field being typed in, across a redraw (an undo while typing)
    const act = document.activeElement?.dataset?.f;
    const selS = document.activeElement?.selectionStart, selE = document.activeElement?.selectionEnd;
    const kids = { name: namePanel, preview: previewPanel, card: cardPanel, icon: iconPanel }[section]();
    panel.replaceChildren(
      h("div", { class: "insp-head" }, h("div", { class: "insp-kind" }, h("span", { class: "badge hole" }, "site"),
        SECTIONS.find((s) => s.key === section).label),
        h("div", { class: "insp-src" }, "src/site/identity.js · one card for the whole site")),
      ...kids);
    shown = JSON.stringify(I());
    if (act) {
      const el = panel.querySelector(`[data-f="${CSS.escape(act)}"]`);
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange?.(selS, selE); } catch {} }
    }
  }

  function namePanel() {
    const S = I().SITE;
    return [
      group("The tab", [
        textField({ k: "s-title", label: "On Home", get: () => S.title, set: (d, v) => { d.SITE.title = v; }, max: 60,
          hint: "The browser's tab, a bookmark, and the blue line of a search result." }),
        textField({ k: "s-page", label: "On every other page", get: () => S.pageTitle, set: (d, v) => { d.SITE.pageTitle = v; }, max: 60,
          hint: `{page} is the page's name: “${tabTitleOf(S, "experience")}”, “${tabTitleOf(S, "Laser Processing")}”.` })
      ]),
      group("The site", [
        textField({ k: "s-name", label: "Site name", get: () => S.siteName, set: (d, v) => { d.SITE.siteName = v; }, max: 40,
          hint: "The small line above the card's title in Discord and Slack, and the name under the icon on a phone's home screen (about 12 letters show there)." }),
        textField({ k: "s-author", label: "Author", get: () => S.author, set: (d, v) => { d.SITE.author = v; } }),
        textField({ k: "s-url", label: "Address", get: () => S.url, placeholder: "https://…",
          set: (d, v) => { d.SITE.url = v.trim().replace(/\/+$/, ""); },
          hint: "Where the site is served from. It makes the card's picture an absolute address, which LinkedIn needs. Change it if the site moves to its own domain." })
      ])
    ];
  }

  function previewPanel() {
    const P = I().PREVIEW, S = I().SITE;
    return [
      h("div", { class: "note" }, "Every link to the site, to any page, unfurls into this one card: Discord, iMessage, Slack, X and LinkedIn read the page's head without running it."),
      group("The card", [
        textField({ k: "p-title", label: "Title", get: () => P.title, set: (d, v) => { d.PREVIEW.title = v; }, max: 70,
          hint: "Discord and Slack show it whole; iMessage and LinkedIn cut it at two lines." }),
        textField({ k: "p-desc", label: "Description", get: () => P.description, set: (d, v) => { d.PREVIEW.description = v; }, multi: true, max: 200,
          hint: "Discord shows up to 350 characters, Slack about three lines; iMessage, X and LinkedIn show none of it." }),
        textField({ k: "p-alt", label: "Picture, described", get: () => P.imageAlt, set: (d, v) => { d.PREVIEW.imageAlt = v; }, multi: true, max: 420,
          hint: "Read aloud by a screen reader in place of the picture." })
      ]),
      group("Search", [
        textField({ k: "s-desc", label: "Search description", get: () => S.description, set: (d, v) => { d.SITE.description = v; }, multi: true, max: 160,
          hint: "What Google quotes under the Home tab's name. Kept separate from the card's, because a search result is read differently: Google cuts it near 155 characters." })
      ])
    ];
  }

  function cardPanel() {
    const id = I(), C = id.CARD, mode = id.PREVIEW.mode;
    const out = [group("Made from", [seg([["design", "Design", "Draw it from the blocks below"], ["upload", "A picture", "Cut a picture to 1200 × 630"]], mode, (v) => {
      if (v === mode) return;
      if (v === "upload") { chooseCardPicture(); return; }
      change("Card from the design", (st) => { st.identity.PREVIEW.mode = "design"; st.identity.PREVIEW.image = "/og.png"; }, { panel: true });
      renderBoard(); paint();
    })])];
    if (mode === "upload") {
      const up = id.uploads.card, src = sources.get(up?.token);
      out.push(group("The picture", [
        h("div", { class: "actions" }, h("button", { class: "ghost", onclick: chooseCardPicture }, src ? "Choose another…" : "Choose a picture…")),
        src ? h("div", { class: "sf-h" }, `${src.name}, ${src.w} × ${src.h}. Saved as public${id.PREVIEW.image}.`)
          : h("div", { class: "note", style: { margin: "8px 0 0" } }, `The card is the picture saved as public${id.PREVIEW.image}. Its original is not kept: choose it again to re-cut it.`),
        src ? zoomField("Zoom the card picture", () => up.crop.zoom, (z) => (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop: { ...st.identity.uploads.card.crop, zoom: z } }; }) : null,
        src ? h("div", { class: "actions" },
          h("button", { class: "ghost", onclick: () => change("Fill the card", (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop: { x: 0.5, y: 0.5, zoom: 1 } }; }, { panel: true }) }, "Fill the card"),
          h("button", { class: "ghost", onclick: () => { const z = Math.min(CARD_W / src.w, CARD_H / src.h) / Math.max(CARD_W / src.w, CARD_H / src.h); change("Show the whole picture", (st) => { st.identity.uploads.card = { ...st.identity.uploads.card, crop: { x: 0.5, y: 0.5, zoom: z } }; }, { panel: true }); } }, "Show all of it")) : null,
        colorField({ k: "c-bg", label: "Round it (when it does not fill the card)", get: () => C.background, set: (d, v) => { d.CARD.background = v; } })
      ]));
      return out;
    }
    out.push(group("Card", [colorField({ k: "c-bg", label: "Paper", get: () => C.background, set: (d, v) => { d.CARD.background = v; } })]));
    // the layers, in drawing order (the last is on top), then the selected one
    const row = (s, name, sub) => h("button", { class: `site-layer${same(s, sel) ? " on" : ""}`, type: "button",
      onclick: () => { sel = same(s, sel) ? null : s; renderPanel(); paintDesigner(); } }, h("b", {}, name), h("span", {}, sub));
    out.push(group("Blocks", [
      h("div", { class: "site-layers" },
        row({ kind: "window" }, "Window", C.window.show ? `${C.window.w} × ${C.window.h}` : "hidden"),
        row({ kind: "mark" }, "Mew", C.mark.show ? `the icon's grid, ${C.mark.cell} px cells` : "hidden"),
        ...C.texts.map((t, i) => row({ kind: "text", i }, cut(String(t.text).split("\n")[0] || "(empty)", 30), `${FONTS[t.font]?.label || t.font} ${weightFor(t.font, t.weight)} · ${t.size} px`))),
      h("div", { class: "actions", style: { marginTop: "8px" } }, h("button", { class: "ghost", onclick: addText }, "Add text"))
    ]));
    if (sel?.kind === "window") {
      const W = C.window;
      out.push(group("Window", [
        checkField({ k: "w-show", label: "Show the window", get: () => W.show, set: (d, v) => { d.CARD.window.show = v; } }),
        h("div", { class: "grid4" },
          numField({ k: "w-x", label: "X", get: () => W.x, set: (d, v) => { d.CARD.window.x = v; } }),
          numField({ k: "w-y", label: "Y", get: () => W.y, set: (d, v) => { d.CARD.window.y = v; } }),
          numField({ k: "w-w", label: "W", get: () => W.w, set: (d, v) => { d.CARD.window.w = v; }, min: 0 }),
          numField({ k: "w-h", label: "H", get: () => W.h, set: (d, v) => { d.CARD.window.h = v; }, min: 0 })),
        colorField({ k: "w-fill", label: "Sky", get: () => W.fill, set: (d, v) => { d.CARD.window.fill = v; } }),
        checkField({ k: "w-ticks", label: "Registration ticks", get: () => W.ticks, set: (d, v) => { d.CARD.window.ticks = v; } }),
        W.ticks ? colorField({ k: "w-tick", label: "Ticks", get: () => W.tick, set: (d, v) => { d.CARD.window.tick = v; } }) : null
      ]));
    }
    if (sel?.kind === "mark") {
      const M = C.mark;
      out.push(group("Mew", [
        checkField({ k: "m-show", label: "Show Mew", get: () => M.show, set: (d, v) => { d.CARD.mark.show = v; } }),
        h("div", { class: "grid3" },
          numField({ k: "m-x", label: "X", get: () => M.x, set: (d, v) => { d.CARD.mark.x = v; } }),
          numField({ k: "m-y", label: "Y", get: () => M.y, set: (d, v) => { d.CARD.mark.y = v; } }),
          numField({ k: "m-cell", label: "Cell", unit: "px", get: () => M.cell, set: (d, v) => { d.CARD.mark.cell = Math.round(v); }, min: 1, max: 40 })),
        colorField({ k: "m-color", label: "Her colour", get: () => M.color, set: (d, v) => { d.CARD.mark.color = v; } }),
        h("div", { class: "actions" }, h("button", { class: "ghost", onclick: () => {
          const W = C.window, s = 32 * M.cell;
          const x = Math.round(W.x + (W.w - s) / 2), y = Math.round(W.y + (W.h - s) / 2);
          change("Centre Mew in the window", (st) => { st.identity.CARD.mark.x = x; st.identity.CARD.mark.y = y; }, { panel: true });
        } }, "Centre in the window")),
        h("div", { class: "sf-h" }, "She is drawn from the icon's grid, so painting the icon changes her here too.")
      ]));
    }
    if (sel?.kind === "text" && C.texts[sel.i]) {
      const i = sel.i, T = C.texts[i];
      const at = (d) => d.CARD.texts[i];
      out.push(group("Text", [
        textField({ k: `t${i}-text`, label: "Words", get: () => T.text, set: (d, v) => { at(d).text = v; }, multi: true, hint: "A new line is a new line on the card." }),
        h("div", { class: "grid2" },
          selectField({ k: `t${i}-font`, label: "Face", get: () => T.font, options: Object.entries(FONTS).map(([k, f]) => [k, f.label]),
            set: (d, v) => { at(d).font = v; at(d).weight = weightFor(v, at(d).weight); } }),
          selectField({ k: `t${i}-w`, label: "Weight", get: () => weightFor(T.font, T.weight), options: FONTS[T.font].weights.map((w) => [w, String(w)]),
            set: (d, v) => { at(d).weight = v; } })),
        h("div", { class: "grid3" },
          numField({ k: `t${i}-size`, label: "Size", unit: "px", get: () => T.size, set: (d, v) => { at(d).size = v; }, min: 4, max: 600 }),
          numField({ k: `t${i}-sp`, label: "Spacing", unit: "px", get: () => T.spacing, set: (d, v) => { at(d).spacing = v; }, step: 0.5, min: -50, max: 200 }),
          numField({ k: `t${i}-lh`, label: "Leading", unit: "×", get: () => T.lineHeight, set: (d, v) => { at(d).lineHeight = v; }, step: 0.05, min: 0.5, max: 4 })),
        h("div", { class: "grid2" },
          numField({ k: `t${i}-x`, label: "X", get: () => T.x, set: (d, v) => { at(d).x = v; } }),
          numField({ k: `t${i}-y`, label: "Baseline", get: () => T.y, set: (d, v) => { at(d).y = v; } })),
        h("div", { class: "sf sm" }, h("span", { class: "sf-l" }, "X is the"),
          seg([["left", "left edge"], ["center", "middle"], ["right", "right edge"]], T.align, (v) => change("Text align", (st) => { at(st.identity).align = v; }, { panel: true }))),
        colorField({ k: `t${i}-c`, label: "Colour", get: () => T.color, set: (d, v) => { at(d).color = v; } }),
        h("div", { class: "actions" },
          h("button", { class: "ghost", disabled: i === C.texts.length - 1 ? true : null, onclick: () => moveText(i, 1) }, "Forward"),
          h("button", { class: "ghost", disabled: i === 0 ? true : null, onclick: () => moveText(i, -1) }, "Back"),
          h("button", { class: "ghost", onclick: () => dupText(i) }, "Duplicate"),
          h("button", { class: "danger", onclick: () => removeText(i) }, "Delete"))
      ]));
    }
    if (!sel) out.push(h("div", { class: "note" }, "Select a block on the card or in the list to change it."));
    return out;
  }
  function zoomField(label, get, mk) {
    const r = h("input", { type: "range", min: "-1.6", max: "2", step: "0.01", value: String(Math.log(get())) });
    const o = h("output", {}, `${Math.round(get() * 100)}%`);
    r.addEventListener("input", () => { const z = Math.exp(+r.value); o.textContent = `${Math.round(z * 100)}%`; change(label, mk(z), { live: true }); });
    r.addEventListener("change", () => { const z = Math.exp(+r.value); change(label, mk(z)); });
    return h("div", { class: "sf" }, h("span", { class: "sf-l" }, "Zoom"), h("div", { class: "slider" }, r, o));
  }
  function addText() {
    const C = I().CARD;
    const n = { text: "new words", font: "grotesque", weight: 600, size: 48, color: store.tokens["--ink"] || "#16150F",
      x: 72, y: Math.min(CARD_H - 72, Math.round((C.texts.at(-1)?.y || 200) + 60)), spacing: 0, lineHeight: 1.2, align: "left" };
    change("Add text", (st) => { st.identity.CARD.texts.push(n); });
    sel = { kind: "text", i: I().CARD.texts.length - 1 };
    renderPanel(); paint();
    panel.querySelector(`[data-f="t${sel.i}-text"]`)?.select();
  }
  function dupText(i) {
    const t = clone(I().CARD.texts[i]);
    t.y += Math.round(t.size * t.lineHeight);
    change("Duplicate text", (st) => { st.identity.CARD.texts.splice(i + 1, 0, t); });
    sel = { kind: "text", i: i + 1 };
    renderPanel(); paint();
  }
  function removeText(i) {
    change("Delete text", (st) => { st.identity.CARD.texts.splice(i, 1); });
    sel = null;
    renderPanel(); paint();
  }
  function moveText(i, d) {
    const j = i + d;
    change(d > 0 ? "Bring text forward" : "Send text back", (st) => {
      const a = st.identity.CARD.texts;
      [a[i], a[j]] = [a[j], a[i]];
    });
    sel = { kind: "text", i: j };
    renderPanel(); paint();
  }

  function iconPanel() {
    const id = I(), ICON = id.ICON, mode = ICON.mode;
    const out = [group("Made from", [seg([["grid", "Pixels", "The 32 × 32 grid"], ["upload", "A picture", "Cut a picture to a square"]], mode, (v) => {
      if (v === mode) return;
      if (v === "upload") { chooseIconPicture(); return; }
      change("Icon from the grid", (st) => { st.identity.ICON.mode = "grid"; }, { panel: true });
      renderBoard(); paint();
    })])];
    if (mode === "grid") {
      out.push(group("Colours", [h("div", { class: "grid2" },
        colorField({ k: "i-fg", label: "Her", get: () => ICON.fg, set: (d, v) => { d.ICON.fg = v; } }),
        colorField({ k: "i-bg", label: "Ground", get: () => ICON.bg, set: (d, v) => { d.ICON.bg = v; } }))]));
      const flipH = (g) => g.map((r) => r.reverse());
      const shift = (dx, dy) => (g) => g.map((r, y) => r.map((_, x) => g[(y - dy + 32) % 32][(x - dx + 32) % 32]));
      out.push(group("Drawing", [
        h("div", { class: "actions" },
          h("button", { class: "ghost", onclick: () => gridOp("Clear the icon", (g) => g.map((r) => r.map(() => "."))) }, "Clear"),
          h("button", { class: "ghost", onclick: () => gridOp("Invert the icon", (g) => g.map((r) => r.map((c) => (c === "#" ? "." : "#")))) }, "Invert"),
          h("button", { class: "ghost", onclick: () => gridOp("Flip the icon", flipH) }, "Flip ↔")),
        h("div", { class: "actions", style: { marginTop: "6px" } },
          h("span", { class: "sf-h", style: { margin: "0 4px 0 0", alignSelf: "center" } }, "Move it"),
          ...[["←", -1, 0], ["→", 1, 0], ["↑", 0, -1], ["↓", 0, 1]].map(([l, dx, dy]) =>
            h("button", { class: "ghost", title: "One cell (it wraps round)", onclick: () => gridOp("Move the icon", shift(dx, dy)) }, l))),
        h("div", { class: "sf-h" }, "The same grid is Mew on the card picture. Saved as favicon.svg, favicon.ico and PNGs at 32, 192 and 180 (the home screen's), all drawn in whole cells.")
      ]));
      return out;
    }
    const up = id.uploads.icon, src = sources.get(up?.token);
    out.push(group("The picture", [
      h("div", { class: "actions" }, h("button", { class: "ghost", onclick: chooseIconPicture }, src ? "Choose another…" : "Choose a picture…")),
      src ? h("div", { class: "sf-h" }, `${src.name}, ${src.w} × ${src.h}.${svgKept() ? " An svg cut as it is, so it is also kept as favicon.svg." : ""}`)
        : h("div", { class: "note", style: { margin: "8px 0 0" } }, "The icon is the picture saved in public/. Its original is not kept: choose it again to re-cut it."),
      src ? zoomField("Zoom the icon picture", () => up.crop.zoom, (z) => (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop: { ...st.identity.uploads.icon.crop, zoom: z } }; }) : null,
      src ? h("div", { class: "actions" },
        h("button", { class: "ghost", onclick: () => change("Fill the icon", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop: { x: 0.5, y: 0.5, zoom: 1 } }; }, { panel: true }) }, "Fill the square"),
        h("button", { class: "ghost", onclick: () => { const z = Math.min(src.w, src.h) / Math.max(src.w, src.h); change("Show the whole picture", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, crop: { x: 0.5, y: 0.5, zoom: z } }; }, { panel: true }); } }, "Show all of it")) : null,
      src ? h("label", { class: "sf-check" }, (() => { const c = h("input", { type: "checkbox" }); c.checked = !!up.sharp;
        c.onchange = () => change("Sharp pixels", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, sharp: c.checked }; }, { panel: true }); return c; })(),
        "Sharp pixels (for pixel art)") : null,
      src ? h("label", { class: "sf-check" }, (() => { const c = h("input", { type: "checkbox" }); c.checked = !!up.clear;
        c.onchange = () => change("Clear ground", (st) => { st.identity.uploads.icon = { ...st.identity.uploads.icon, clear: c.checked }; }, { panel: true }); return c; })(),
        "Keep the picture's transparency in the tab") : null,
      colorField({ k: "i-bg", label: "Ground (and the home-screen tile)", get: () => ICON.bg, set: (d, v) => { d.ICON.bg = v; } }),
      h("div", { class: "sf-h" }, "A phone fills a transparent home-screen icon with black, so that one always sits on the ground colour, with 20 px of it round the picture.")
    ]));
    return out;
  }
  // an svg is kept as favicon.svg only when it is the icon as it stands: a
  // square, uncut. Cropped or zoomed, the PNGs are the icon and an svg of the
  // whole picture would disagree with them.
  const svgKept = () => {
    const up = I().uploads.icon, src = sources.get(up?.token);
    return !!src && src.type === "image/svg+xml" && src.w === src.h &&
      up.crop.zoom === 1 && up.crop.x === 0.5 && up.crop.y === 0.5;
  };

  // ── choosing a picture ───────────────────────────────────────────────────
  async function pickPicture() {
    const file = await ed.pickFile("image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml");
    if (!file) return null;
    if (file.size > 40 * 1024 * 1024) { toast("That picture is over 40 MB.", true); return null; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { URL.revokeObjectURL(url); toast("This browser cannot open that picture (an iPhone's HEIC needs Safari, or export it as JPEG).", true); return null; }
    const w = img.naturalWidth || 512, hgt = img.naturalHeight || 512;
    const token = `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    sources.set(token, { img, blob: file, name: file.name, type: file.type, url, w, h: hgt });
    return token;
  }
  async function chooseCardPicture() {
    const token = await pickPicture();
    if (!token) return;
    const src = sources.get(token);
    // a photograph is a JPEG; a drawing (a PNG, an svg, a gif) stays a PNG,
    // where JPEG would smear its flat colour (and it is re-checked at Save)
    const image = src.type === "image/jpeg" || src.type === "image/avif" || src.type === "image/webp" ? "/og.jpg" : "/og.png";
    change("Card from a picture", (st) => {
      st.identity.PREVIEW.mode = "upload";
      st.identity.PREVIEW.image = image;
      st.identity.uploads.card = { token, crop: { x: 0.5, y: 0.5, zoom: 1 } };
    }, { panel: true });
    renderBoard(); paint();
  }
  async function chooseIconPicture() {
    const token = await pickPicture();
    if (!token) return;
    change("Icon from a picture", (st) => {
      st.identity.ICON.mode = "upload";
      st.identity.uploads.icon = { token, crop: { x: 0.5, y: 0.5, zoom: 1 }, sharp: false, clear: true };
    }, { panel: true });
    renderBoard(); paint();
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const stage = async (blob, name) => {
    const r = await fetch(`/__ed/stage?name=${encodeURIComponent(name)}`, { method: "POST", body: blob });
    const j = await r.json();
    if (!j.ok) throw new Error(j.reason || `could not stage ${name}`);
    return j.staged;
  };
  /** what changed, in words, for the Save dialog (synchronous; nothing drawn) */
  function summary() {
    const a = I(), b = savedI();
    if (!a || !b) return [];
    const out = [];
    const words = [];
    if (ch(a.SITE, b.SITE)) words.push("the site's name and tab titles");
    if (ch({ ...a.PREVIEW, mode: 0, image: 0 }, { ...b.PREVIEW, mode: 0, image: 0 })) words.push("the link card's words");
    if (ch(a.CARD, b.CARD) || a.PREVIEW.mode !== b.PREVIEW.mode) words.push("the card's design");
    if (ch(a.ICON, b.ICON)) words.push("the icon");
    if (words.length) out.push(`${words.join(", ")} → src/site/identity.js`);
    if (cardDirty()) out.push(`the link card's picture → public${a.PREVIEW.image}`);
    if (iconDirty()) out.push(a.ICON.mode === "grid" ? "the icon → public/favicon.* (tools/bake_favicon.mjs)" : "the icon, cut from a picture → public/favicon.*");
    return out;
  }
  function cardDirty() {
    const a = I(), b = savedI();
    if (a.PREVIEW.mode === "design") {
      return ch(a.CARD, b.CARD) || ch(a.PREVIEW.mode, b.PREVIEW.mode) || ch(a.ICON.grid, b.ICON.grid) || ch(a.PREVIEW.image, b.PREVIEW.image);
    }
    return !!sources.get(a.uploads.card?.token) && (ch(a.uploads.card, b.uploads.card) || ch(a.CARD.background, b.CARD.background));
  }
  function iconDirty() {
    const a = I(), b = savedI();
    if (a.ICON.mode === "grid") return ch(a.ICON, b.ICON);
    return !!sources.get(a.uploads.icon?.token) && (ch(a.uploads.icon, b.uploads.icon) || ch(a.ICON, b.ICON));
  }
  const dirty = () => { const a = I(), b = savedI(); return ch(strip(a), strip(b)) || cardDirty() || iconDirty(); };
  const strip = (d) => ({ SITE: d.SITE, PREVIEW: d.PREVIEW, CARD: d.CARD, ICON: d.ICON });

  /** everything Save sends for this tab, drawing and staging the files; null when nothing changed */
  async function payload() {
    if (!dirty()) return null;
    if (!fontsOk) { await loadCardFonts(); fontsOk = true; }
    const files = {}, remove = [];
    let bake = false;
    // the card
    if (cardDirty()) {
      drawMaster();
      if (I().PREVIEW.mode === "design") {
        files["og.png"] = await stage(await toBlob(master, "image/png"), "og.png");
        remove.push("og.jpg");
      } else {
        let name = I().PREVIEW.image.slice(1);
        let blob = await toBlob(master, name === "og.jpg" ? "image/jpeg" : "image/png", 0.88);
        // a picture with many colours is megabytes as a PNG, which some apps
        // will not fetch for a card at all: past 1.5 MB it goes as a JPEG
        if (name === "og.png" && blob.size > 1.5 * 1024 * 1024) {
          blob = await toBlob(master, "image/jpeg", 0.88);
          name = "og.jpg";
          store.live((st) => { st.identity.PREVIEW.image = "/og.jpg"; }, () => {});
        }
        files[name] = await stage(blob, name);
        remove.push(name === "og.png" ? "og.jpg" : "og.png");
      }
    }
    // the icon
    if (iconDirty()) {
      if (I().ICON.mode === "grid") bake = true;
      else {
        const png = async (c) => toBlob(c, "image/png");
        const p32 = await png(iconCanvas(32));
        files["favicon-32.png"] = await stage(p32, "favicon-32.png");
        files["favicon.ico"] = await stage(new Blob([icoOf(await p32.arrayBuffer())], { type: "image/x-icon" }), "favicon.ico");
        files["favicon-192.png"] = await stage(await png(iconCanvas(192)), "favicon-192.png");
        files["apple-touch-icon.png"] = await stage(await png(iconCanvas(180, { apple: true })), "apple-touch-icon.png");
        const src = sources.get(I().uploads.icon.token);
        if (svgKept()) files["favicon.svg"] = await stage(src.blob, "favicon.svg");
        else remove.push("favicon.svg");
      }
    }
    const a = I(), b = savedI();
    const values = {};
    for (const k of ["SITE", "PREVIEW", "CARD", "ICON"]) if (ch(a[k], b[k])) values[k] = clone(a[k]);
    return { values, files, remove, bake };
  }

  /** after a save: the files on disk are new, and the panel is drawn from them */
  function afterSave(next) {
    if (next?.publicFiles) publicFiles = { ...next.publicFiles };
    savedCard = null; savedIcon = null;
    loadSavedCard(); loadSavedIcon();
    shown = JSON.stringify(I());
    if (open) renderAll();
  }

  /** the store changed: redraw the pictures, and the fields only if something else changed them */
  function sync() {
    if (!open) return;
    if (JSON.stringify(I()) !== shown) {
      // an undo can take away the block that was selected
      if (sel?.kind === "text" && !I().CARD.texts[sel.i]) sel = null;
      const b = I().PREVIEW.mode + I().ICON.mode;
      if (b !== boardModes) { boardModes = b; renderBoard(); }
      renderPanel();
    }
    paint();
  }
  let boardModes = "";

  function setOpen(on) {
    open = on;
    document.body.classList.toggle("site-mode", on);
    if (on) {
      boardModes = I().PREVIEW.mode + I().ICON.mode;
      renderAll();
      if (!fontsOk) loadCardFonts().then(() => { fontsOk = true; paint(); renderPanel(); });
      if (!savedCard) loadSavedCard();
      if (!savedIcon) loadSavedIcon();
    }
  }
  addEventListener("resize", () => { if (open) paint(); });

  return {
    get isOpen() { return open; },
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    sync, payload, summary, afterSave, dirty,
    get section() { return section; },
    // for checks: draw now, without waiting for a frame (a hidden window has none)
    debug: { paintNow: () => { paintQueued = false; drawMaster(); paintDesigner(); paintPainter(); renderMocks(); }, go, sources }
  };
}
