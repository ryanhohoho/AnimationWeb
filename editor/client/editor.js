// editor.js — the verbs: select, restyle, retype, replace, insert, delete
//
// Everything the panels and the canvas do goes through here, so there is one
// place that decides how a change is scoped, how it is undone and what it
// writes on save.

import { setProp, effective, clone, BPS } from "../shared/editsCss.js";
import { locate, find, locKey, kindOf, lockReason, repeats, classesOf, cleanHTML,
  isTextLeaf, leafTexts, norm } from "./identity.js";
import { api, toast, uid, modal, h } from "./util.js";

export function createEditor({ store, frame }) {
  const listeners = new Set();
  const textInfo = new Map();        // locKey -> resolve() answer, taken before the first edit
  const ed = {
    store, frame,
    bp: "base",
    scope: "el",
    sel: null,                       // { el, loc } when exactly ONE thing is selected
    sels: [],                        // [{ el, loc }] -- everything selected, in the order it was picked
    hover: null,
    editing: null,                   // the element being typed into
    get ctx() { return frame.ctx; },
    get doc() { return frame.ctx.doc; },
    get win() { return frame.ctx.win; },
    get page() { return frame.ctx.page; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    emit(what) { listeners.forEach((f) => f(what)); }
  };

  // ── selection ──────────────────────────────────────────────────────────
  // ONE LIST, AND ONE SHORTHAND. `sels` is everything selected; `sel` is set
  // only when that is exactly one thing, because the verbs that make sense on
  // one element (edit its words, replace its picture, duplicate it) read it,
  // and they must not quietly act on the first of five.
  //
  // A selection never holds an element AND something inside it: moving both
  // would move the inner one twice. The outer one wins.
  function setSels(els) {
    if (ed.editing) ed.finishText();
    const list = [];
    for (const el of els) if (el && !lockReason(el) && !list.includes(el)) list.push(el);
    const kept = list.filter((el) => !list.some((o) => o !== el && o.contains(el)));
    ed.sels = kept.map((el) => ({ el, loc: locate(el, ed.doc) }));
    ed.sel = ed.sels.length === 1 ? ed.sels[0] : null;
    ed.emit("sel");
  }
  ed.select = (el) => setSels(el ? [el] : []);
  ed.selectMany = (els) => setSels(els);
  /** shift: add to what is selected; ⌘/Ctrl-shift: take it out */
  ed.addToSelection = (els) => setSels([...ed.selEls(), ...[els].flat()]);
  ed.removeFromSelection = (els) => { const out = [els].flat(); setSels(ed.selEls().filter((e) => !out.includes(e))); };
  ed.selEls = () => ed.sels.map((s) => s.el);
  ed.isSelected = (el) => ed.sels.some((s) => s.el === el);
  /** after a re-render, find the selection again or let it go */
  ed.reselect = () => {
    if (!ed.sels.length) return;
    const back = ed.sels.map((s) => ({ el: find(s.loc, ed.doc), loc: s.loc })).filter((s) => s.el);
    ed.sels = back;
    ed.sel = back.length === 1 ? back[0] : null;
    ed.emit("sel");
  };

  // ── linked dimensions ──────────────────────────────────────────────────
  // TEXT: size and box scale together (on by default, by instruction): every
  // handle, and W or Aa typed in the inspector, scales the type so its lines
  // break where they did. Off, the side handles and W re-wrap the lines as
  // before. BOX: width and height keep their ratio. Remembered in this
  // browser, not saved into the site -- they are how you edit, not what.
  const LINK_KEY = "ed-link";
  ed.link = (() => {
    try { return { text: true, box: false, ...JSON.parse(localStorage.getItem(LINK_KEY) || "{}") }; }
    catch { return { text: true, box: false }; }
  })();
  ed.setLink = (kind, on) => {
    ed.link[kind] = on;
    try { localStorage.setItem(LINK_KEY, JSON.stringify(ed.link)); } catch {}
    ed.emit("link");
  };

  // ── where a style change goes ──────────────────────────────────────────
  const pageScope = () => `#doc[data-page="${ed.page}"]`;

  /** the selector for an element WITHOUT creating anything: null if it has no identity yet */
  ed.peek = (el, scope = ed.scope) => {
    if (scope !== "el") {
      const cls = classesOf(el);
      if (!cls.length) return null;
      return `${scope === "page" ? pageScope() : "#doc"} .${cls.join(".")}`;
    }
    const part = partFor(el, false);
    return part ? `${pageScope()} ${part}` : null;
  };

  /** the selector for an element, giving it an identity in the source if it needs one */
  ed.target = (el, scope = ed.scope) => {
    if (scope !== "el") return ed.peek(el, scope);
    const part = partFor(el, true);
    return part ? `${pageScope()} ${part}` : null;
  };

  function partFor(el, create) {
    if (el.dataset.e) return `[data-e="${el.dataset.e}"]`;
    if (el.matches("figure.fig")) {
      const media = el.querySelector("img, video");
      const cid = captureIdOf(media);
      if (cid && ed.page !== "home") {
        if (!create) return null;
        const id = uid("fig");
        const loc = locate(el, ed.doc);
        store.page({
          page: ed.page, label: "Give the figure an id",
          apply: (doc) => { const n = find(loc, doc); if (n) n.dataset.e = id; },
          revert: (doc) => { const n = find({ e: id }, doc); if (n) delete n.dataset.e; },
          op: { type: "setCaptureId", page: ed.page, captureId: cid, id }
        }, ed.ctx);
        return `[data-e="${id}"]`;
      }
    }
    if (el.dataset.esrc && repeats(el, ed.doc) === 1) {
      if (!create) return null;
      const id = uid(classesOf(el)[0] || el.tagName);
      const loc = locate(el, ed.doc);
      store.page({
        page: ed.page, label: "Give the element an id",
        apply: (doc) => { const n = find(loc, doc); if (n) n.dataset.e = id; },
        revert: (doc) => { const n = find({ e: id }, doc); if (n) delete n.dataset.e; },
        op: { type: "setId", esrc: el.dataset.esrc, id }
      }, ed.ctx);
      return `[data-e="${id}"]`;
    }
    // no identity of its own (an item of a list): a path from the nearest thing that has one
    const parent = el.parentElement;
    if (!parent || parent.id === "doc") return null;
    const up = partFor(parent, create);
    if (!up) return null;
    const i = [...parent.children].indexOf(el) + 1;
    return `${up} > ${el.tagName.toLowerCase()}:nth-child(${i})`;
  }

  const captureIdOf = (media) => {
    const src = media?.getAttribute("src") || "";
    const m = /\/src\/assets\/media\/([^/?#]+?)\.(webp|png|jpe?g|avif|gif|mp4|webm|mov)(\?|$)/.exec(src);
    return m ? m[1] : null;
  };
  ed.captureIdOf = captureIdOf;

  // ── reading and writing styles ─────────────────────────────────────────
  /** { value, from, computed } -- `from` is the breakpoint the value was set at */
  // `child` may name several descendants ("img, video"); each is scoped under
  // the element's own selector, or the comma would let the second one escape
  const under = (base, child) => child
    ? child.split(",").map((c) => `${base} ${c.trim()}`).join(", ")
    : base;

  ed.read = (el, prop, child) => {
    const base = ed.peek(el);
    const sel = base ? under(base, child) : null;
    const eff = sel ? effective(store.styles, sel, ed.bp, prop) : { value: undefined, from: null };
    const first = child ? child.split(",")[0].trim().replace(/^>\s*/, "") : "";
    const target = first ? el.querySelector(`:scope ${child.split(",")[0].trim()}`) || el.querySelector(first) || el : el;
    let computed = "";
    try { computed = ed.win.getComputedStyle(target).getPropertyValue(prop); } catch {}
    return { ...eff, computed };
  };

  const rerender = () => { frame.renderCss(store.styles); ed.emit("style"); };
  ed.rerender = rerender;

  /**
   * MANY ELEMENTS, ONE STEP: [{ el, props, child }] -> one undo step (or one
   * live update). Always "this element only": a multiple selection is a set
   * of elements, and widening each to its class would reach elements nobody
   * selected.
   */
  ed.styleMany = (pairs, { label = "Style", live = false } = {}) => {
    const rules = [];
    for (const { el, props, child = "" } of pairs) {
      const base = ed.target(el, "el");
      if (!base) { toast(`${el.tagName.toLowerCase()} cannot be styled on its own, so it was left out.`, true); continue; }
      rules.push([under(base, child), props]);
    }
    if (!rules.length) return false;
    const mutate = (st) => { for (const [sel, props] of rules) for (const [p, v] of Object.entries(props)) setProp(st.styles, sel, ed.bp, p, v); };
    if (live) store.live(mutate, rerender);
    else store.global(label, mutate, rerender);
    return true;
  };
  ed.endLiveMany = (label, pairs) => {
    if (liveBefore) { const before = liveBefore; liveBefore = null; restore(before); }
    return ed.styleMany(pairs, { label });
  };

  /** props: { prop: value | null }. One undo step unless `live`. */
  ed.style = (el, props, { label = "Style", live = false, child = "" } = {}) => {
    const base = ed.target(el);
    if (!base) { toast("This element cannot be styled on its own; choose a scope in the inspector.", true); return; }
    const sel = under(base, child);
    const mutate = (st) => { for (const [p, v] of Object.entries(props)) setProp(st.styles, sel, ed.bp, p, v); };
    if (live) store.live(mutate, rerender);
    else store.global(label, mutate, rerender);
  };

  // a drag, a scrub or a colour being picked: live updates, then ONE undo step
  // holding the whole gesture. The snapshot is all of the global data, because
  // a gesture can be on a colour as well as on a style.
  let liveBefore = null;
  const all = () => ({ s: clone(store.styles), p: { ...store.palette }, t: { ...store.tokens }, i: clone(store.inks) });
  const restore = (v) => store.live((st) => { st.styles = v.s; st.palette = v.p; st.tokens = v.t; st.inks = v.i; }, () => {});
  ed.beginLive = () => { if (!liveBefore) liveBefore = all(); };
  ed.living = () => !!liveBefore;
  ed.endLive = (label, el, props, child = "") => {
    if (!liveBefore) return ed.style(el, props, { label, child });
    const before = liveBefore; liveBefore = null;
    restore(before);
    ed.style(el, props, { label, child });
  };
  ed.commitLive = (label, mutate, after) => {
    if (liveBefore) { const before = liveBefore; liveBefore = null; restore(before); }
    store.global(label, mutate, after);
  };
  ed.cancelLive = () => {
    if (!liveBefore) return;
    const before = liveBefore; liveBefore = null;
    restore(before);
    rerender();
    frame.applyPalette(store.palette, store.tokens, store.inks);
  };

  /** the translate an element carries at this size, as numbers */
  ed.translateOf = (el) => {
    const v = ed.read(el, "translate").value || "0px 0px";
    const [x = "0", y = "0"] = v.split(/\s+/);
    return [parseFloat(x) || 0, parseFloat(y) || 0];
  };

  // ── text ───────────────────────────────────────────────────────────────
  const leaves = () => [...ed.doc.querySelectorAll("#doc *")].filter((n) => isTextLeaf(n, ed.win));

  async function infoFor(el) {
    const loc = locate(el, ed.doc);
    const key = locKey(loc);
    if (textInfo.has(key)) return textInfo.get(key);
    if (el.closest("[data-ed-new]")) { const i = { ok: true, kind: "new", form: "html", label: "new — written on save" }; textInfo.set(key, i); return i; }
    const html = cleanHTML(el.innerHTML);
    const same = leaves().filter((n) => norm(cleanHTML(n.innerHTML)) === norm(html));
    const r = await api("/__ed/resolve", {
      page: ed.page, esrc: el.dataset.esrc || null, count: repeats(el, ed.doc),
      html, nth: same.indexOf(el), same: same.length
    });
    textInfo.set(key, r);
    return r;
  }
  ed.textInfo = infoFor;
  // after a save every offset in the source has moved, so what was resolved is stale
  ed.clearCaches = () => textInfo.clear();

  ed.editText = async (el) => {
    if (!el || !isTextLeaf(el, ed.win) || lockReason(el)) return;
    const info = await infoFor(el);
    if (!info.ok) { toast(info.reason, true, 5200); return; }
    if (info.sharedBy > 1) toast(`This text is in a template used by ${info.sharedBy} pages; changing it changes all of them.`, false, 4200);
    const before = el.innerHTML;
    ed.editing = el;
    el.setAttribute("contenteditable", info.form === "text" ? "plaintext-only" : "true");
    el.setAttribute("spellcheck", "true");
    el.focus();
    const range = ed.doc.createRange();
    range.selectNodeContents(el);
    const s = ed.win.getSelection(); s.removeAllRanges(); s.addRange(range);
    ed.emit("editing");

    const onKey = (e) => {
      if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); ed.finishText(); }
      else if (e.key === "Enter" && e.shiftKey && info.form === "html") {
        e.preventDefault(); ed.doc.execCommand("insertHTML", false, "<br>");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && info.form === "html") {
        // the site's only emphasis is <em>, set heavier -- so that is what bold makes
        e.preventDefault();
        const sel = ed.win.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;
        const r = sel.getRangeAt(0);
        const em = r.commonAncestorContainer.parentElement?.closest("em");
        if (em && el.contains(em)) em.replaceWith(...em.childNodes);
        else { const w = ed.doc.createElement("em"); try { r.surroundContents(w); } catch {} }
      }
    };
    const onPaste = (e) => {
      e.preventDefault();
      ed.doc.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    };
    el.addEventListener("keydown", onKey);
    el.addEventListener("paste", onPaste);

    ed.finishText = () => {
      ed.finishText = () => {};
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("paste", onPaste);
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
      ed.editing = null;
      const after = el.innerHTML;
      if (after === before) { ed.emit("editing"); return; }
      const loc = locate(el, ed.doc);
      const clean = cleanHTML(after);
      const value = info.form === "text" ? el.textContent : clean;
      let op = null;
      if (info.kind === "static") op = { type: "inner", file: info.file, start: info.start, end: info.end, orig: info.orig, value: clean };
      else if (info.kind === "data") op = { type: "text", file: info.file, start: info.start, end: info.end, orig: info.orig, value };
      store.page({
        page: ed.page, label: "Edit text", loc,
        apply: (doc) => { const n = find(loc, doc); if (n) n.innerHTML = after; },
        revert: (doc) => { const n = find(loc, doc); if (n) n.innerHTML = before; },
        op
      }, ed.ctx);
      ed.afterPage();
    };
  };
  ed.finishText = () => {};

  // ── links ──────────────────────────────────────────────────────────────
  ed.linkOf = (el) => {
    const a = el.closest("a") || el.querySelector?.(":scope > a");
    if (!a || a.hasAttribute("data-route")) return null;
    return a;
  };
  ed.setHref = async (a, href) => {
    const before = a.getAttribute("href");
    if (href === before) return;
    const r = await api("/__ed/resolve", { mode: "href", page: ed.page, esrc: a.dataset.esrc || null, href: before });
    if (!r.ok) { toast(r.reason, true); return false; }
    const loc = locate(a, ed.doc);
    store.page({
      page: ed.page, label: "Change link",
      apply: (doc) => find(loc, doc)?.setAttribute("href", href),
      revert: (doc) => find(loc, doc)?.setAttribute("href", before),
      op: r.kind === "data"
        ? { type: "text", file: r.file, start: r.start, end: r.end, orig: r.orig, value: href }
        : { type: "attr", file: r.file, start: r.start, end: r.end, orig: r.orig, value: href }
    }, ed.ctx);
    return true;
  };

  // ── media ──────────────────────────────────────────────────────────────
  /** the replaceable slots in a media element */
  ed.slotsOf = (el) => {
    if (el.matches(".pcard-media")) {
      const slug = el.closest("[data-slug]")?.dataset.slug;
      return [
        { slot: "card-still", slug, label: "Picture at rest", node: el.querySelector(".pcard-still"), accept: "image/*" },
        { slot: "card-video", slug, label: "Clip on hover", node: el.querySelector(".pcard-vid"), accept: "video/*" },
        { slot: "icon", slug, label: "Icon (cut through the card)", node: el.querySelector(".pcard-glyph"), accept: "image/*",
          note: "The icon atlas is re-baked on save (tools/bake_icons.mjs)." }
      ];
    }
    const m = el.matches("img, video") ? el : el.querySelector("img, video");
    const id = captureIdOf(m);
    if (!m) return [];
    return [{ slot: el.matches("figure.fig") && ed.page !== "home" ? "capture" : "file", id, label: "Picture or clip",
              node: m, accept: "image/*,video/*", esrc: m.dataset.esrc }];
  };

  ed.pickFile = (accept) => new Promise((done) => {
    const input = document.getElementById("file");
    input.accept = accept || "image/*,video/*";
    input.value = "";
    input.onchange = () => done(input.files[0] || null);
    input.click();
  });

  ed.upload = async (file) => {
    toast(`Uploading ${file.name}…`);
    const r = await fetch(`/__ed/upload?name=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
    const j = await r.json();
    if (!j.ok) { toast(j.reason || "Upload failed", true); return null; }
    return { ...j, name: file.name };
  };

  ed.replaceMedia = async (el, slotInfo) => {
    const file = await ed.pickFile(slotInfo.accept);
    if (!file) return;
    const up = await ed.upload(file);
    if (!up) return;
    if (slotInfo.slot === "card-still" && up.video) return toast("The resting picture must be a still image.", true);
    if ((slotInfo.slot === "card-video") && !up.video) return toast("The hover slot takes a clip.", true);
    if (slotInfo.slot === "icon" && up.video) return toast("An icon must be a still image.", true);
    const loc = locate(el, ed.doc);
    const nodeIdx = slotInfo.node ? [...el.querySelectorAll("img, video")].indexOf(slotInfo.node) : -1;
    const snapshot = el.innerHTML;
    const ratio0 = el.style.getPropertyValue("--ratio");
    const apply = (doc) => {
      const box = find(loc, doc); if (!box) return;
      let n = nodeIdx >= 0 ? box.querySelectorAll("img, video")[nodeIdx] : null;
      if (slotInfo.slot === "icon") {
        if (n) n.src = up.url;
        box.style.setProperty("--glyph", `url(${up.url})`);
        return;
      }
      if (!n) return;
      const wantVideo = up.video;
      if ((n.tagName === "VIDEO") !== wantVideo && slotInfo.slot !== "card-video") {
        const r = doc.createElement(wantVideo ? "video" : "img");
        for (const a of n.attributes) if (!["src", "poster"].includes(a.name)) r.setAttribute(a.name, a.value);
        if (wantVideo) { r.muted = true; r.loop = true; r.autoplay = true; r.playsInline = true; }
        n.replaceWith(r); n = r;
      }
      n.src = up.url;
      if (n.tagName === "VIDEO") { n.removeAttribute("poster"); n.play?.().catch(() => {}); }
      // the figure takes the new file's own shape at once, as the save will
      // make it (it rewrites capture({ ratio })); previewed inline, because a
      // rule in edits.css would then override every later ratio for good
      if (box.matches("figure.fig") && up.w && up.h) box.style.setProperty("--ratio", (up.w / up.h).toFixed(4));
    };
    store.page({
      page: ed.page, label: `Replace ${slotInfo.label.toLowerCase()}`, loc,
      apply,
      revert: (doc) => { const box = find(loc, doc); if (box) { box.innerHTML = snapshot; box.style.removeProperty("--glyph"); box.style.setProperty("--ratio", ratio0); } },
      op: { type: "media", slot: slotInfo.slot, slug: slotInfo.slug, id: slotInfo.id, esrc: slotInfo.esrc,
            staged: up.staged, name: up.name, page: ed.page }
    }, ed.ctx);
    ed.afterPage();
    toast("Replaced. Saved into src/assets/media/ when you press Save.");
  };

  // ── structure ──────────────────────────────────────────────────────────
  /** the nearest element at or above `el` that exists exactly once in its source */
  const staticAnchor = (el) => {
    for (let n = el; n && n.id !== "doc"; n = n.parentElement) {
      if (n.dataset.esrc && repeats(n, ed.doc) === 1 && !n.closest("[data-ed-new]")) return n;
    }
    return null;
  };

  /**
   * A template several pages are cut from (the deck cards' shell(), the project
   * sheets' renderSheet()) is ONE place in the source: something added there is
   * added to every page cut from it. Say so before it happens, not after.
   */
  async function confirmShared(el, verb) {
    if (!el.dataset.esrc) return true;
    const info = await api("/__ed/resolve", { mode: "info", esrc: el.dataset.esrc });
    if (!(info.sharedBy > 1)) return true;
    const n = info.sharedBy;
    const go = await modal(`This is shared by ${n} pages`, h("div", {},
      h("p", {}, `The spot you picked is in ${info.file.split("/").pop()}, a template ${n} pages are cut from, so what you ${verb} here appears on all ${n}.`),
      h("p", { style: { marginTop: "8px" } }, "To change this page only, select something in this page's own content first — on a project sheet, the evidence block or the colophon; on a deck card, the list itself.")),
      [{ label: "Cancel", value: false }, { label: `${verb === "add" ? "Add" : "Duplicate"} on all ${n}`, kind: "primary", value: true }]);
    return !!go;
  }

  ed.insert = async (kind) => {
    const from = ed.sel?.el || ed.doc.querySelector("#doc > section");
    const anchor = staticAnchor(from);
    if (!anchor) { toast("Select something on the page first; new elements go after it.", true); return; }
    if (!(await confirmShared(anchor, "add"))) return;
    const id = uid(kind);
    let media = null, html = "";
    const parent = anchor.parentElement;
    const composition = parent?.matches(".plate:not(.deckpage):not(.sheet)") || anchor.matches(".plate");
    const inside = anchor.matches("section.plate") || anchor.matches(".deck-in, .sheet-in");
    if (kind === "figure") {
      const file = await ed.pickFile("image/*,video/*");
      if (!file) return;
      const up = await ed.upload(file);
      if (!up) return;
      media = { staged: up.staged, id: `ed-${id}`, url: up.url, video: up.video, w: up.w, h: up.h };
      const tag = up.video ? `<video src="${up.url}" autoplay muted loop playsinline></video>` : `<img src="${up.url}" alt="" />`;
      html = `<figure class="fig has" data-e="${id}" style="--ratio:${(up.w / up.h).toFixed(4)}"><div class="fig-in">${tag}</div></figure>`;
    } else if (kind === "text") html = `<p class="t body" data-e="${id}">New paragraph. Double-click to write.</p>`;
    else if (kind === "heading") html = `<h2 class="d sm" data-e="${id}">new heading</h2>`;
    else if (kind === "label") html = `<p class="t dim" data-e="${id}">LABEL</p>`;
    else if (kind === "hole") {
      html = composition
        ? `<div class="ap" data-ap data-e="${id}" style="--x:8%; --y:60%; --w:22%; --h:24%"></div>`
        : `<span class="ap sheet-ap" data-ap data-e="${id}"></span>`;
      const count = ed.win.__DECK__?.debug?.holes?.length || 0;
      if (count >= 12) toast("This page already has 12 holes, the most the press can cut; a 13th will not show.", true, 5000);
    }
    const anchorLoc = locate(anchor, ed.doc);
    const cmd = {
      page: ed.page, label: `Insert ${kind}`, newId: id, dead: false,
      apply: (doc) => {
        if (doc.querySelector(`[data-e="${id}"]`)) return;
        const a = find(anchorLoc, doc); if (!a) return;
        const t = doc.createElement("template");
        t.innerHTML = cmd.op.html;
        const n = t.content.firstElementChild;
        n.setAttribute("data-ed-new", "");
        if (media) {
          // the preview shows the upload; the file written on save is the encoded one
          const m = n.querySelector("img, video"); if (m) m.src = media.url;
        }
        if (inside) a.append(n); else a.after(n);
        cmd.dead = false;
      },
      revert: (doc) => { doc.querySelector(`[data-e="${id}"]`)?.remove(); },
      op: { type: "insert", anchor: anchor.dataset.esrc, inside, kind, id, html, media, alt: "", page: ed.page }
    };
    store.page(cmd, ed.ctx);
    // a new block in a flow column takes the width of what it follows
    if (kind === "figure" && !composition) ed.style(ed.doc.querySelector(`[data-e="${id}"]`), { width: "min(100%, 34rem)" }, { label: "Figure width" });
    ed.afterPage();
    const n = ed.doc.querySelector(`[data-e="${id}"]`);
    if (n) { ed.select(n); n.scrollIntoView({ block: "center", behavior: "smooth" }); }
  };

  ed.duplicate = async () => {
    const el = ed.sel?.el; if (!el) return;
    if (el.closest("[data-ed-new]")) return toast("Save first, then duplicate this new element.", true);
    const count = repeats(el, ed.doc);
    if (count === 1 && !(await confirmShared(el, "duplicate"))) return;
    const loc = locate(el, ed.doc);
    const newId = count === 1 ? uid(classesOf(el)[0] || el.tagName) : null;
    const texts = leafTexts(el, ed.win);
    store.page({
      page: ed.page, label: "Duplicate",
      apply: (doc) => {
        const n = find(loc, doc); if (!n) return;
        const c = n.cloneNode(true);
        c.setAttribute("data-ed-copy", "");
        // the copy is not in the source yet, so it must not claim a place there
        for (const m of [c, ...c.querySelectorAll("[data-esrc]")]) m.removeAttribute("data-esrc");
        if (newId) c.dataset.e = newId; else c.removeAttribute("data-e");
        n.after(c);
      },
      revert: (doc) => { const n = find(loc, doc); if (n?.nextElementSibling?.hasAttribute("data-ed-copy")) n.nextElementSibling.remove(); },
      op: { type: "duplicate", esrc: el.dataset.esrc || null, count, newId, texts, page: ed.page }
    }, ed.ctx);
    ed.afterPage();
    toast(count > 1 ? "Duplicated the list item. Save, then edit the copy's words." : "Duplicated. Save, then edit the copy's words.");
  };

  ed.remove = async () => {
    if (ed.sels.length > 1) return removeMany();
    const el = ed.sel?.el; if (!el) return;
    if (el.closest("[data-usb-stage]")) return;
    if (el.closest("[data-ed-copy]")) return toast("This copy is not saved yet; undo the duplicate instead (⌘Z).", true);
    const newCmd = el.closest("[data-ed-new]") && store.done.find((c) => c.newId === el.closest("[data-ed-new]").dataset.e);
    const count = repeats(el, ed.doc);
    let info = { sharedBy: 1 };
    if (el.dataset.esrc && !newCmd) info = await api("/__ed/resolve", { mode: "info", esrc: el.dataset.esrc });
    let choice = "src";
    if (!newCmd) {
      const where = count > 1 ? "This is one item of a list in the source; it is removed from that list."
        : info.sharedBy > 1 ? `This element is in a template used by ${info.sharedBy} pages. Deleting it removes it from ALL of them.`
        : `It is removed from ${info.file || "the source"}.`;
      choice = await modal("Delete this element?", h("div", {}, where,
        h("p", { style: { marginTop: "8px" } }, "Or hide it on this page only (at this screen size and smaller) — that is reversible in the inspector.")),
        [{ label: "Cancel", value: null }, { label: "Hide here only", value: "hide" }, { label: count > 1 ? "Delete item" : "Delete", kind: "danger", value: "src" }]);
      if (!choice) return;
    }
    if (choice === "hide") { ed.scope = "el"; ed.style(el, { display: "none" }, { label: "Hide" }); ed.select(null); return; }
    const loc = locate(el, ed.doc);
    let parent = null, next = null, node = null;
    store.page({
      page: ed.page, label: "Delete",
      apply: (doc) => {
        node = find(loc, doc); if (!node) return;
        parent = node.parentElement; next = node.nextSibling; node.remove();
        if (newCmd) newCmd.dead = true;
      },
      revert: () => { if (node && parent) parent.insertBefore(node, next); if (newCmd) newCmd.dead = false; },
      op: newCmd ? null : { type: "delete", esrc: el.dataset.esrc || null, count, texts: leafTexts(el, ed.win), page: ed.page }
    }, ed.ctx);
    ed.select(null);
    ed.afterPage();
  };

  /**
   * Several at once: one question, then each goes the way it would alone --
   * an unsaved new element simply disappears, an item of a list leaves that
   * list, anything else leaves its source. FIG. 2 and unsaved copies are left
   * where they are and said so.
   */
  async function removeMany() {
    const els = ed.selEls().filter((el) => !el.closest("[data-usb-stage]") && !el.closest("[data-ed-copy]"));
    if (!els.length) return;
    const skipped = ed.sels.length - els.length;
    const choice = await modal(`Delete ${els.length} elements?`, h("div", {},
      "Each is removed from the source it came from: an item of a list from that list, and anything in a template several pages share from all of those pages.",
      h("p", { style: { marginTop: "8px" } }, "Or hide them on this page only (at this screen size and smaller), which is reversible in the inspector."),
      skipped ? h("p", { style: { marginTop: "8px" } }, `${skipped} selected ${skipped === 1 ? "element is" : "elements are"} left alone (unsaved copies, or FIG. 2).`) : null),
      [{ label: "Cancel", value: null }, { label: "Hide here only", value: "hide" }, { label: `Delete ${els.length}`, kind: "danger", value: "src" }]);
    if (!choice) return;
    if (choice === "hide") {
      ed.styleMany(els.map((el) => ({ el, props: { display: "none" } })), { label: `Hide ${els.length}` });
      ed.select(null);
      return;
    }
    for (const el of els) {
      const newCmd = el.closest("[data-ed-new]") && store.done.find((c) => c.newId === el.closest("[data-ed-new]").dataset.e);
      const count = repeats(el, ed.doc);
      const loc = locate(el, ed.doc);
      const op = newCmd ? null : { type: "delete", esrc: el.dataset.esrc || null, count, texts: leafTexts(el, ed.win), page: ed.page };
      let parent = null, next = null, node = null;
      store.page({
        page: ed.page, label: "Delete",
        apply: (doc) => {
          node = find(loc, doc); if (!node) return;
          parent = node.parentElement; next = node.nextSibling; node.remove();
          if (newCmd) newCmd.dead = true;
        },
        revert: () => { if (node && parent) parent.insertBefore(node, next); if (newCmd) newCmd.dead = false; },
        op
      }, ed.ctx);
    }
    ed.select(null);
    ed.afterPage();
  }

  /** keep every unsaved insert's markup in step with what is on screen */
  ed.afterPage = () => {
    for (const c of store.done) {
      if (c.newId && c.page === ed.page) {
        const n = ed.doc.querySelector(`[data-e="${c.newId}"]`);
        if (n && c.op) {
          const copy = n.cloneNode(true);
          copy.removeAttribute("data-ed-new");
          if (c.op.media) { const m = copy.querySelector("img, video"); if (m) m.setAttribute("src", `__MEDIA__`); }
          c.op.html = cleanHTML(copy.outerHTML);
        }
      }
    }
    frame.remeasure();
    ed.emit("page");
  };

  // ── order, within a flex or grid parent ────────────────────────────────
  ed.canReorder = (el) => {
    const p = el.parentElement;
    if (!p || p.id === "doc" || el.matches("dt, dd")) return false;
    const d = ed.win.getComputedStyle(p).display;
    return /flex|grid/.test(d);
  };
  ed.reorder = (el, to) => {
    const p = el.parentElement;
    const kids = [...p.children].filter((k) => !k.matches(".sr, [data-ed-new-ghost]"));
    const cur = kids.slice().sort((a, b) =>
      (+ed.win.getComputedStyle(a).order || 0) - (+ed.win.getComputedStyle(b).order || 0) || kids.indexOf(a) - kids.indexOf(b));
    const from = cur.indexOf(el);
    to = Math.max(0, Math.min(cur.length - 1, to));
    if (from === to) return;
    cur.splice(from, 1); cur.splice(to, 0, el);
    const sels = cur.map((k) => ed.target(k, "el"));
    if (sels.some((s) => !s)) return toast("These items cannot be reordered here.", true);
    store.global("Reorder", (st) => { sels.forEach((s, i) => setProp(st.styles, s, ed.bp, "order", String(i + 1))); }, rerender);
  };
  ed.orderIndex = (el) => {
    const p = el.parentElement;
    const kids = [...p.children].filter((k) => !k.matches(".sr"));
    const cur = kids.slice().sort((a, b) =>
      (+ed.win.getComputedStyle(a).order || 0) - (+ed.win.getComputedStyle(b).order || 0) || kids.indexOf(a) - kids.indexOf(b));
    return [cur.indexOf(el), cur.length];
  };

  ed.kind = (el) => kindOf(el, ed.win);
  ed.BPS = BPS;
  return ed;
}
