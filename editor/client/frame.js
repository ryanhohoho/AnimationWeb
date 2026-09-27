// frame.js — the real site, in a frame, held still enough to edit
//
// The site runs in an iframe at the width of the chosen screen size, so its
// own media queries decide the layout -- the tablet and phone views are the
// site's real narrow layouts, not a simulation of them. Same origin, so the
// editor reaches straight into its document.
//
// While editing, the site must not react to the editor's own gestures: a click
// that selects a card must not open it, an arrow key that nudges a heading must
// not turn the page, and a drag must not throw the animal. So every pointer,
// mouse and key event is caught in the capture phase at the frame's window --
// before any of the site's listeners -- handed to the editor, and stopped.
// Preview mode takes all of that away and the page is simply the page.

import { toCss } from "../shared/editsCss.js";
import { designPx } from "../../src/styles/designPx.js";

const BLOCK = ["pointerdown", "pointerup", "pointermove", "pointerover", "pointerout", "mousedown", "mouseup",
  "mousemove", "click", "dblclick", "auxclick", "contextmenu", "keydown", "keyup", "touchstart", "touchend", "dragstart"];

const EDIT_CSS = `
/* the editor's view of the page: everything selectable, nothing mid-hover */
#doc, #doc * { pointer-events: auto !important; }
#doc .sr { pointer-events: none !important; }
.pcard-zoom { transform: none !important; }
.pcard-vid { opacity: 0 !important; }
html { scroll-behavior: auto !important; }
[contenteditable] { outline: none; cursor: text; }
`;

export function createFrame({ iframe, onReady, onPage, onEvent }) {
  const ctx = { win: null, doc: null, page: null, preview: false, mew: true, ready: false, overlay: null, host: null };
  let css = "", palette = null, tokens = null, inks = null;
  let navAllowed = false;
  let pendingScroll = 0;
  let measureT = 0;

  iframe.addEventListener("load", () => {
    ctx.ready = false;
    const win = iframe.contentWindow;
    const t0 = performance.now();
    const wait = () => {
      const d = win.document;
      const ok = win.__DECK__ && d.getElementById("doc") && !d.body.classList.contains("pre");
      if (ok || performance.now() - t0 > 4000) instrument(win);
      else setTimeout(wait, 40);
    };
    wait();
  });

  function instrument(win) {
    const doc = win.document;
    ctx.win = win; ctx.doc = doc;

    const st = doc.createElement("style");
    st.id = "__ed_css";
    st.textContent = EDIT_CSS;
    doc.head.append(st);
    const live = doc.createElement("style");
    live.id = "__ed_live";
    doc.head.append(live);

    // vite's own copy of edits.css steps aside: the live one above is the same
    // file, rendered from the unsaved model
    const muteVite = () => {
      for (const s of doc.querySelectorAll("style[data-vite-dev-id]")) {
        if (s.getAttribute("data-vite-dev-id").endsWith("/src/styles/edits.css")) s.media = "not all";
      }
    };
    muteVite();
    new win.MutationObserver(muteVite).observe(doc.head, { childList: true });

    // the overlay: a shadow root above everything, so none of the site's CSS
    // (the reset, the grain at z40) touches it and none of ours touches the site
    const host = doc.createElement("div");
    host.id = "__ed_overlay";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    doc.body.append(host);
    ctx.host = host;
    ctx.overlay = host.attachShadow({ mode: "open" });

    for (const type of BLOCK) {
      win.addEventListener(type, (e) => {
        if (navAllowed && (type === "click")) return;
        if (ctx.preview) return;
        const editing = e.target?.isContentEditable || e.target?.closest?.("[contenteditable]");
        // typing into the words: the keys belong to the editable element's own
        // handlers (Enter, Escape, ⌘B). The site's router already ignores a key
        // aimed at contenteditable (router.js, keydown), so letting it through
        // cannot turn the page.
        if (editing && type.startsWith("key")) return;
        onEvent?.(e, ctx);
        // mousedown too: its default is to start a text selection, and a drag
        // on the canvas -- a move, a resize, a selection box -- then painted
        // the page's words blue as it went. Words being typed into keep it.
        if (type === "click" || type === "auxclick" || type === "contextmenu" || type === "dragstart" || type === "mousedown") {
          if (!editing) e.preventDefault();
        }
        e.stopImmediatePropagation();
      }, { capture: true });
    }
    // a wheel scrolls the page; the site hears it, which is what keeps the sky
    // registered while the editor scrolls
    win.addEventListener("scroll", () => onEvent?.({ type: "scroll" }, ctx), { passive: true });
    win.addEventListener("resize", () => onEvent?.({ type: "resize" }, ctx));

    const docEl = doc.getElementById("doc");
    const pageNow = () => docEl.dataset.page || "home";
    new win.MutationObserver(() => {
      const p = pageNow();
      if (p !== ctx.page) { ctx.page = p; onPage?.(ctx); }
    }).observe(docEl, { attributes: true, attributeFilter: ["data-page"] });

    ctx.page = pageNow();
    applyStyles(css);
    if (palette) applyPalette(palette, tokens, inks);
    setMew(ctx.mew);
    ctx.ready = true;
    if (pendingScroll) { win.scrollTo({ top: pendingScroll, behavior: "instant" }); pendingScroll = 0; }
    onReady?.(ctx);
  }

  function remeasure() {
    clearTimeout(measureT);
    measureT = setTimeout(() => { try { ctx.win?.__DECK__?.remeasure(); } catch {} }, 60);
  }

  function applyStyles(nextCss) {
    css = nextCss;
    // the same rewrite Vite gives the saved file: the model is in design px
    const live = ctx.doc?.getElementById("__ed_live"), text = designPx(css);
    if (live && live.textContent !== text) { live.textContent = text; remeasure(); }
  }

  async function applyPalette(p, t, i) {
    palette = p; tokens = t; inks = i;
    if (!ctx.doc) return;
    const root = ctx.doc.documentElement;
    for (const [k, v] of Object.entries(t || {})) root.style.setProperty(k, v);
    if (t?.["--ink-a"]) root.style.setProperty("--blue", t["--ink-a"]);
    try {
      // the SAME module instances the site is running, so the press reads them
      const pal = await ctx.win.eval('import("/src/site/palette.js")');
      Object.assign(pal.PALETTE, p);
      const pr = await ctx.win.eval('import("/src/site/projects.js")');
      for (const proj of pr.PROJECTS) if (i?.[proj.slug]) Object.assign(proj, i[proj.slug]);
      if (ctx.page?.startsWith("project:")) {
        const pair = i?.[ctx.page.slice(8)];
        if (pair) ctx.win.__DECK__.setInk(pair.inkA, pair.ink);
      }
      ctx.win.__DECK__?.remeasure();
    } catch (e) { console.warn("[editor] palette preview", e); }
  }

  function setMew(on) {
    ctx.mew = on;
    const s = ctx.doc?.getElementById("stage");
    if (s) s.style.visibility = on ? "" : "hidden";
  }

  function setPreview(on) {
    ctx.preview = on;
    const st = ctx.doc?.getElementById("__ed_css");
    if (st) st.media = on ? "not all" : "";
    if (ctx.host) ctx.host.style.display = on ? "none" : "";
  }

  /** go to a page through the site's own router, so nothing reloads */
  function navigate(path) {
    if (!ctx.ready) { iframe.src = path; return; }
    const cur = ctx.win.location.pathname;
    if (cur === path) return;
    const a = ctx.doc.createElement("a");
    a.href = path;
    a.setAttribute("data-route", "");
    a.style.display = "none";
    ctx.doc.body.append(a);
    navAllowed = true;
    a.click();
    navAllowed = false;
    a.remove();
  }

  function reload() {
    pendingScroll = ctx.win?.scrollY || 0;
    const path = ctx.win?.location.pathname || "/";
    ctx.ready = false;
    iframe.src = path + "?__ed=" + Date.now();
  }

  return { ctx, navigate, reload, applyStyles, applyPalette, setMew, setPreview, remeasure,
           load: (path) => { iframe.src = path; }, renderCss: (model) => applyStyles(toCss(model)) };
}
