// main.js — the editor shell: the bar, the frame, the panels, and Save

import { toCss, BPS } from "../shared/editsCss.js";
import { REF_H } from "../../src/styles/designPx.js";
import { h, api, toast, modal, contrastOf } from "./util.js";
import { createFrame } from "./frame.js";
import { createStore } from "./model.js";
import { createEditor } from "./editor.js";
import { createCanvas } from "./canvas.js";
import { createLayers } from "./layers.js";
import { createInspector } from "./inspector.js";
import { isTextLeaf } from "./identity.js";

const $ = (id) => document.getElementById(id);
const state = await api("/__ed/state");
const store = createStore(state);

let canvas, layers, inspector, ed;
const frame = createFrame({
  iframe: $("site"),
  onReady(ctx) {
    canvas.mount(ctx);
    store.replay(ctx.page, ctx.doc);
    ed.afterPage();
    ed.reselect();
    syncPage();
    refresh();
  },
  onPage(ctx) {
    ed.select(null);
    store.replay(ctx.page, ctx.doc);
    ed.afterPage();
    syncPage();
    refresh();
  },
  onEvent(e, ctx) { canvas.onEvent(e); }
});
ed = createEditor({ store, frame });
canvas = createCanvas(ed);
// a handle for checks and debugging, the way the site has __DECK__
window.__ED__ = ed;
layers = createLayers(ed, $("tree"));
inspector = createInspector(ed, $("inspector"));

frame.applyStyles(toCss(store.styles));
frame.applyPalette(store.palette, store.tokens, store.inks);

// ── the pages ──────────────────────────────────────────────────────────────
const PAGES = [
  { path: "/", key: "home", label: "Home" },
  { path: "/experience", key: "experience", label: "Experience" },
  { path: "/projects", key: "projects", label: "Projects" },
  { path: "/photos", key: "photos", label: "Photos" },
  { path: "/contact", key: "contact", label: "Contact" },
  ...state.projects.map((p) => ({ path: `/projects/${p.slug}`, key: `project:${p.slug}`, label: p.title, sub: true })),
  { path: "/not-printed", key: "404", label: "404", sub: true }
];
function renderPages() {
  const nav = $("pages");
  nav.replaceChildren();
  let sep = false;
  for (const p of PAGES) {
    if (p.sub && !sep) { nav.append(h("span", { class: "sep" })); sep = true; }
    nav.append(h("button", { "aria-current": frame.ctx.page === p.key ? "page" : null,
      onclick: () => { ed.select(null); frame.navigate(p.path); } }, p.label));
  }
}
function syncPage() {
  renderPages();
  try { history.replaceState(null, "", `/editor/#${frame.ctx.win.location.pathname}`); } catch {}
}

// ── screen sizes ───────────────────────────────────────────────────────────
const DEV_ICON = {
  base: "M1.5 3h13v8.5h-13zM5.5 14h5M8 11.5V14",
  860: "M3.5 1.5h9v13h-9zM7 12.5h2",
  560: "M4.5 1.5h7v13h-7zM7.2 12.8h1.6"
};
function renderBps() {
  $("bps").replaceChildren(...BPS.map((b) => h("button", {
    role: "radio", "aria-checked": String(ed.bp === b.key),
    title: b.key === "base" ? "Desktop — every width above 860 px" : `${b.label} — ${b.key} px and narrower`,
    onclick: () => setBp(b.key), html: `<svg viewBox="0 0 16 16"><path d="${DEV_ICON[b.key]}"/></svg>`
  }, b.label, h("small", {}, b.key === "base" ? "" : `≤${b.key}`))));
}
function setBp(key) {
  ed.bp = key;
  renderBps();
  fit();
  refresh();
}
function fit() {
  const dev = $("device"), cv = $("canvas");
  const availW = cv.clientWidth - 32, availH = cv.clientHeight - 40;
  const b = BPS.find((x) => x.key === ed.bp);
  // desktop is ALWAYS the owner's own window, 1512 wide, shown smaller when the
  // pane is narrower. It used to take the room there was (1024-1600), which
  // was harmless while a px was a px; now a px is 1/1512 of the window
  // (src/styles/designPx.js), and only at exactly that width does a drag of
  // one pixel on screen store one pixel of design.
  //
  // AND DESKTOP IS HIS WINDOW'S HEIGHT TOO (867 inside the browser, REF_H), not
  // whatever the pane has room for. The fold is where a laptop visitor stops
  // seeing the page on arrival, and a frame as tall as a 27" pane put it
  // somewhere else entirely: a composition that fitted here scrolled on the
  // laptop. So the whole window is shown, scaled to fit both ways. Tablet and
  // phone keep filling the height; their pages are meant to be scrolled.
  const w = b.width;
  const desk = ed.bp === "base";
  const scale = Math.min(1, availW / w, desk ? availH / REF_H : 1);
  dev.dataset.bp = ed.bp;
  dev.style.width = w + "px";
  dev.style.height = (desk ? REF_H : availH / scale) + "px";
  dev.style.transform = scale < 1 ? `scale(${scale})` : "";
  // A scaled frame is centred HERE, not by the grid. A transform leaves the
  // layout box at full width, and a grid item wider than its cell is pushed
  // to the start edge rather than centred -- so scaling about its top centre
  // put the picture half a frame to the right (measured: 1512 wide at 63%).
  // Anchored at its top-left, the margin is simply what is left over, halved.
  dev.style.transformOrigin = scale < 1 ? "top left" : "";
  dev.style.justifySelf = scale < 1 ? "start" : "";
  dev.style.marginLeft = scale < 1 ? `${Math.max(0, (availW - w * scale) / 2)}px` : "";
  dev.dataset.size = `${w}${desk ? ` × ${REF_H}` : ""} px${scale < 1 ? ` · shown at ${Math.round(scale * 100)}%` : ""}`;
}
addEventListener("resize", fit);

// ── keeping the panels in step ─────────────────────────────────────────────
// batched to one render per turn of the event loop, not per frame: a burst of
// changes (a replay, an undo) renders the panels once
let refreshQueued = false;
function refresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    // not mid-gesture: re-rendering the inspector would close the colour picker
    // being dragged or drop the field being scrubbed
    if (!ed.living()) { inspector.render(); layers.build(); }
    const n = store.dirtyCount();
    $("dirty").textContent = n ? `${n} unsaved change${n === 1 ? "" : "s"}` : "";
    $("undo").disabled = !store.canUndo();
    $("redo").disabled = !store.canRedo();
    const s = ed.sel?.el;
    $("crumbs").textContent = ed.sels.length > 1 ? `${frame.ctx.page} › ${ed.sels.length} elements`
      : s ? `${frame.ctx.page} › ${s.dataset.e ? "#" + s.dataset.e : s.tagName.toLowerCase()} ${[...s.classList].map((c) => "." + c).join("")}` : frame.ctx.page || "";
  });
}
ed.on(refresh);
store.on(refresh);

// ── undo, keys ─────────────────────────────────────────────────────────────
function undo() { const c = store.undo(frame.ctx); if (c) { frame.remeasure(); ed.afterPage(); ed.reselect(); toast(`Undid: ${c.label}`); } }
function redo() { const c = store.redo(frame.ctx); if (c) { frame.remeasure(); ed.afterPage(); ed.reselect(); toast(`Redid: ${c.label}`); } }
$("undo").onclick = undo;
$("redo").onclick = redo;

let nudgeT = 0;
function nudge(dx, dy) {
  const els = ed.selEls(); if (!els.length) return;
  // every selected element by the same step; consecutive nudges are one undo step
  const pairs = els.map((el) => {
    const [x, y] = ed.translateOf(el);
    return { el, props: { translate: x + dx === 0 && y + dy === 0 ? null : `${x + dx}px ${y + dy}px` } };
  });
  if (!ed.living()) ed.beginLive();
  if (els.length === 1) ed.style(els[0], pairs[0].props, { live: true });
  else ed.styleMany(pairs, { live: true });
  clearTimeout(nudgeT);
  nudgeT = setTimeout(() => {
    if (els.length === 1) ed.endLive("Nudge", els[0], pairs[0].props);
    else ed.endLiveMany(`Nudge ${els.length}`, pairs);
  }, 700);
}

function onKey(e) {
  if (e.type !== "keydown") return;
  if (ed.editing) return;
  const inField = e.target.closest?.("input, select, textarea, [contenteditable]") && e.target.ownerDocument === document;
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key;
  if (mod && k.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
  if (mod && k.toLowerCase() === "s") { e.preventDefault(); save(); return; }
  if (inField) return;
  if (mod && k.toLowerCase() === "d") { e.preventDefault(); if (ed.sels.length > 1) toast("Duplicate one element at a time."); else ed.duplicate(); return; }
  if (!ed.sels.length) return;
  if (k === "Escape") { ed.select(null); return; }
  if (k === "Backspace" || k === "Delete") { e.preventDefault(); ed.remove(); return; }
  if (k === "Enter") { e.preventDefault(); if (ed.sel && isTextLeaf(ed.sel.el, ed.win)) ed.editText(ed.sel.el); return; }
  const step = e.shiftKey ? 10 : 1;
  if (k === "ArrowLeft") { e.preventDefault(); nudge(-step, 0); }
  if (k === "ArrowRight") { e.preventDefault(); nudge(step, 0); }
  if (k === "ArrowUp") { e.preventDefault(); nudge(0, -step); }
  if (k === "ArrowDown") { e.preventDefault(); nudge(0, step); }
}
ed.onKey = onKey;
document.addEventListener("keydown", onKey);
// a drag released over the editor's own panels still ends
addEventListener("mouseup", () => canvas.onEvent({ type: "mouseup", composedPath: () => [] }));

// ── toggles ────────────────────────────────────────────────────────────────
$("mew").onchange = (e) => frame.setMew(e.target.checked);
$("preview").onchange = (e) => {
  frame.setPreview(e.target.checked);
  ed.select(null);
  document.body.classList.toggle("previewing", e.target.checked);
  toast(e.target.checked ? "Preview: the page works like the real site. Untick to edit." : "Editing.");
};

// ── save ───────────────────────────────────────────────────────────────────
async function save() {
  if (ed.editing) ed.finishText();
  const body = store.payload(toCss);
  const cssChanged = body.css !== state.css;
  if (!body.ops.length && !cssChanged && !body.palette && !body.tokens && !body.projectInks) {
    toast("Nothing to save.");
    return;
  }
  // the summary, in words, and the rules this would break -- warned, not refused
  const count = (t) => body.ops.filter((o) => o.type === t).length;
  const lines = [];
  const words = count("text") + count("inner");
  if (words) lines.push(`${words} change${words > 1 ? "s" : ""} to words`);
  if (count("attr") || body.ops.some((o) => o.type === "text" && /^(https?:|mailto:)/.test(o.value))) lines.push("link addresses");
  if (count("media")) lines.push(`${count("media")} replaced picture${count("media") > 1 ? "s or clips" : " or clip"} (encoded into src/assets/media/)`);
  if (count("insert")) lines.push(`${count("insert")} new element${count("insert") > 1 ? "s" : ""}`);
  if (count("duplicate")) lines.push(`${count("duplicate")} duplicate${count("duplicate") > 1 ? "s" : ""}`);
  if (count("delete")) lines.push(`${count("delete")} deletion${count("delete") > 1 ? "s" : ""} from the source`);
  if (cssChanged) lines.push(`styles → src/styles/edits.css (${Object.keys(store.styles.rules).length} rules)`);
  if (body.palette || body.tokens) lines.push("colours → site.css, palette.js" + (body.tokens?.["--paper"] ? ", index.html" : ""));
  if (body.projectInks) lines.push(`project inks → projects.js (${Object.keys(body.projectInks).join(", ")})`);

  const warns = [];
  for (const [sel, bps] of Object.entries(store.styles.rules)) {
    for (const d of Object.values(bps)) {
      if (/--n4\b/.test(d.color || "")) warns.push(`${sel}: a word set in --n4, the hairline grey`);
      if (/--mew\b/.test(d.color || d["background-color"] || "")) warns.push(`${sel}: --mew is Mew's alone`);
    }
  }
  if (frame.ctx.doc) {
    for (const n of frame.ctx.doc.querySelectorAll("#doc *")) {
      if (!isTextLeaf(n, frame.ctx.win) || !n.getBoundingClientRect().width) continue;
      const r = contrastOf(n, frame.ctx.win, store.tokens["--paper"]);
      if (r && r < 4.5) { warns.push(`“${n.textContent.trim().slice(0, 40)}” on this page is ${r.toFixed(2)}:1, under 4.5:1`); if (warns.length > 12) break; }
    }
  }

  const ok = await modal("Save into the portfolio?", h("div", {},
    h("p", {}, "These are written into the real source, then the tests run:"),
    h("ul", {}, lines.map((l) => h("li", {}, l))),
    warns.length ? h("div", {}, h("p", { class: "w", style: { marginTop: "10px" } }, "Warnings (they do not stop the save):"),
      h("ul", {}, warns.slice(0, 12).map((w) => h("li", { class: "w" }, w)))) : null,
    h("p", { style: { marginTop: "10px" } }, "Nothing is committed to git.")),
    [{ label: "Cancel", value: false }, { label: "Save", kind: "primary", value: true }]);
  if (!ok) return;

  $("save").disabled = true;
  $("save").textContent = "Saving…";
  let res;
  try { res = await api("/__ed/save", body); }
  catch (e) { res = { ok: false, errors: [String(e)] }; }
  $("save").disabled = false;
  $("save").textContent = "Save";
  if (!res.ok) {
    await modal("Nothing was saved", h("div", {}, h("p", {}, "The save was checked before anything was written, and it stopped here:"),
      h("ul", {}, (res.errors || []).map((e) => h("li", {}, e)))), [{ label: "OK", kind: "primary", value: true }]);
    return;
  }
  state.css = body.css;
  store.committed();
  ed.clearCaches();
  toast(`Saved ${res.changed.length} file${res.changed.length === 1 ? "" : "s"}.`);
  for (const w of res.warnings || []) toast(w, true, 7000);
  console.info("[editor] saved:", res.changed);
  // the site reloads from the files it was just written into
  frame.reload();
}
$("save").onclick = save;
addEventListener("beforeunload", (e) => { if (store.isDirty()) { e.preventDefault(); e.returnValue = ""; } });

// ── the tests, as they run ─────────────────────────────────────────────────
const tests = $("tests"), log = $("log"), out = $("log-out");
const es = new EventSource("/__ed/events");
es.addEventListener("test-start", () => { out.textContent = ""; tests.className = "tests run"; tests.textContent = "npm test — running…"; });
es.addEventListener("test-line", (e) => {
  out.textContent += JSON.parse(e.data).text;
  if (!log.hidden) out.scrollTop = out.scrollHeight;
});
es.addEventListener("test-end", (e) => {
  const d = JSON.parse(e.data);
  tests.className = `tests ${d.passed ? "ok" : "bad"}`;
  tests.textContent = d.passed ? `npm test passed${d.summary ? ` · ${d.summary}` : ""}` : `npm test FAILED — click for details`;
  if (!d.passed) { log.hidden = false; out.scrollTop = out.scrollHeight; toast("The tests failed after saving. The output is open below.", true, 6000); }
});
tests.onclick = () => { log.hidden = !log.hidden; out.scrollTop = out.scrollHeight; };
$("log-x").onclick = () => { log.hidden = true; };
tests.textContent = "tests run after every save";

// ── go ─────────────────────────────────────────────────────────────────────
renderBps();
renderPages();
fit();
const start = decodeURIComponent(location.hash.slice(1)) || "/";
frame.load(start.startsWith("/") ? start : "/");
refresh();
