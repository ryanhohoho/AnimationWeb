// canvas.js — pointing at the page: hover, select, drag, resize, type
//
// Drawn in a shadow root inside the frame, above everything the site paints.
// Positions come from getBoundingClientRect every frame of the EDITOR's own
// animation loop -- reading layout on every frame is exactly what the site
// refuses to do, and exactly what a tool that has to track it may do.
//
// A move is stored as `translate`, not `transform`: every entrance animation on
// the site ends on `transform:none` with fill-mode `both`, which would wipe a
// transform for good, and `translate` is a separate property that composes with
// it. It is an offset from where the layout put the element, so it survives the
// layout changing around it.

import { selectable, lockReason, nameOf, isTextLeaf } from "./identity.js";

const CSS = `
:host { all: initial; }
.box { position: fixed; pointer-events: none; box-sizing: border-box; }
.hov { outline: 1px solid rgba(0,90,125,.75); }
.hov.lock { outline: 1px dashed rgba(90,87,76,.8); }
.sel { outline: 1.5px solid #005A7D; }
.sel.editing { outline: 1.5px dashed #005A7D; }
.h { position: absolute; width: 9px; height: 9px; margin: -5px 0 0 -5px; background: #fff;
     border: 1.5px solid #005A7D; border-radius: 2px; pointer-events: auto; box-sizing: border-box; }
.h[data-h=n], .h[data-h=s] { cursor: ns-resize; } .h[data-h=e], .h[data-h=w] { cursor: ew-resize; }
.h[data-h=nw], .h[data-h=se] { cursor: nwse-resize; } .h[data-h=ne], .h[data-h=sw] { cursor: nesw-resize; }
.tag { position: absolute; left: -1px; top: -21px; height: 18px; padding: 0 6px; white-space: nowrap;
       font: 500 10.5px/18px -apple-system, "Helvetica Neue", sans-serif; color: #fff; background: #005A7D; border-radius: 3px 3px 3px 0; }
.tag.below { top: auto; bottom: -21px; border-radius: 0 3px 3px 3px; }
.hov .tag { background: rgba(0,90,125,.85); }
.hov.lock .tag { background: #5B574C; }
.tag b { font-weight: 400; opacity: .75; margin-left: 6px; }
.g { position: fixed; background: #E0357A; pointer-events: none; }
.readout { position: fixed; pointer-events: none; font: 500 10.5px -apple-system, sans-serif; color: #fff;
           background: #E0357A; padding: 2px 5px; border-radius: 3px; white-space: nowrap; }
`;

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const SNAP = 6;

export function createCanvas(ed) {
  let root = null, hov = null, sel = null, guides = null, readout = null;
  let drag = null;
  let raf = 0;

  function mount(ctx) {
    root = ctx.overlay;
    root.innerHTML = `<style>${CSS}</style>`;
    hov = el("div", "box hov"); hov.append(el("div", "tag"));
    sel = el("div", "box sel"); sel.append(el("div", "tag"));
    for (const k of HANDLES) { const hd = el("div", "h"); hd.dataset.h = k; sel.append(hd); }
    guides = el("div", ""); readout = el("div", "readout");
    readout.style.display = "none";
    root.append(hov, sel, guides, readout);
    hov.style.display = sel.style.display = "none";
    cancelAnimationFrame(raf);
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    loop();
  }
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

  function place(box, r) {
    box.style.left = r.left + "px"; box.style.top = r.top + "px";
    box.style.width = Math.max(1, r.width) + "px"; box.style.height = Math.max(1, r.height) + "px";
  }

  function draw() {
    if (!root || !ed.doc) return;
    const h = ed.hover;
    if (h && h !== ed.sel?.el && h.isConnected && !drag) {
      const r = h.getBoundingClientRect();
      place(hov, r);
      const lock = lockReason(h);
      hov.classList.toggle("lock", !!lock);
      hov.firstChild.textContent = lock ? "🔒 " + lock.replace(/\.$/, "") : nameOf(h, ed.win);
      hov.style.display = "";
    } else hov.style.display = "none";

    const s = ed.sel?.el;
    if (s && s.isConnected) {
      const r = s.getBoundingClientRect();
      place(sel, r);
      sel.classList.toggle("editing", ed.editing === s);
      const kind = ed.kind(s);
      const t = sel.firstChild;
      t.innerHTML = `${esc(nameOf(s, ed.win))}<b>${Math.round(r.width)} × ${Math.round(r.height)}</b>`;
      t.classList.toggle("below", r.top < 24);
      const text = kind === "text";
      const round = s.matches("[data-round]");
      const aspect = s.matches("figure.fig, .pcard-media");
      for (const hd of sel.querySelectorAll(".h")) {
        const k = hd.dataset.h;
        let show = !ed.editing;
        if (text || aspect) show &&= k === "e" || k === "w";
        if (round) show &&= k.length === 2;
        hd.style.display = show ? "" : "none";
        hd.style.left = (k.includes("w") ? 0 : k.includes("e") ? r.width : r.width / 2) + "px";
        hd.style.top = (k.includes("n") ? 0 : k.includes("s") ? r.height : r.height / 2) + "px";
      }
      sel.style.display = "";
    } else sel.style.display = "none";
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // ── snapping ───────────────────────────────────────────────────────────
  function snapTargets(elm) {
    const xs = [], ys = [];
    const add = (r) => { xs.push(r.left, r.left + r.width / 2, r.right); ys.push(r.top, r.top + r.height / 2, r.bottom); };
    const p = elm.parentElement;
    if (p) {
      add(p.getBoundingClientRect());
      for (const c of p.children) if (c !== elm && c.getBoundingClientRect().width) add(c.getBoundingClientRect());
    }
    const vw = ed.win.innerWidth;
    xs.push(vw / 2);
    // the section it sits in, too: a plate's edges and middle
    const sec = elm.closest("section");
    if (sec && sec !== p) add(sec.getBoundingClientRect());
    return { xs, ys };
  }
  function snap(vals, targets) {
    let best = null;
    for (const v of vals) for (const t of targets) {
      const d = t - v;
      if (Math.abs(d) <= SNAP && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t };
    }
    return best;
  }
  function showGuides(gx, gy) {
    guides.replaceChildren();
    const H = ed.win.innerHeight, W = ed.win.innerWidth;
    if (gx !== null) { const g = el("div", "g"); Object.assign(g.style, { left: gx + "px", top: 0, width: "1px", height: H + "px" }); guides.append(g); }
    if (gy !== null) { const g = el("div", "g"); Object.assign(g.style, { top: gy + "px", left: 0, height: "1px", width: W + "px" }); guides.append(g); }
  }

  // ── gestures ───────────────────────────────────────────────────────────
  function onEvent(e) {
    if (e.type === "scroll" || e.type === "resize") return;
    if (e.type.startsWith("key")) return ed.onKey?.(e);
    const path = e.composedPath ? e.composedPath() : [];
    const handle = path.find((n) => n.classList?.contains?.("h"));
    const target = e.target;

    if (ed.editing) {
      // typing: clicks inside the words place the caret; a click anywhere else finishes
      if (e.type === "mousedown" && !ed.editing.contains(target)) { ed.finishText(); }
      else return;
    }

    if (e.type === "mousemove") {
      if (drag) return dragMove(e);
      if (target === ed.ctx.host) return;
      ed.hover = selectable(target, ed.win);
      return;
    }
    if (e.type === "mouseout" && !e.relatedTarget) { ed.hover = null; return; }
    if (e.type === "mousedown" && e.button === 0) {
      if (handle && ed.sel) return startResize(e, handle.dataset.h);
      const hit = selectable(target, ed.win);
      if (!hit || lockReason(hit)) { ed.select(null); return; }
      if (hit !== ed.sel?.el) ed.select(hit);
      startMove(e, hit);
      return;
    }
    if (e.type === "mouseup") return dragEnd(e);
    if (e.type === "dblclick") {
      const hit = selectable(target, ed.win);
      if (hit && isTextLeaf(hit, ed.win)) ed.editText(hit);
    }
  }

  function startMove(e, elm) {
    drag = { mode: "move", x0: e.clientX, y0: e.clientY, el: elm, started: false,
             t0: ed.translateOf(elm), r0: elm.getBoundingClientRect() };
  }
  function startResize(e, h) {
    const elm = ed.sel.el;
    const cs = ed.win.getComputedStyle(elm);
    drag = { mode: "resize", h, x0: e.clientX, y0: e.clientY, el: elm, started: false,
             t0: ed.translateOf(elm), r0: elm.getBoundingClientRect(),
             w0: parseFloat(cs.width), h0: parseFloat(cs.height) };
  }

  function dragMove(e) {
    const d = drag;
    let dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      if (!ed.target(d.el)) { drag = null; return; }
      d.started = true;
      d.snaps = snapTargets(d.el);
      ed.beginLive();
    }
    const free = e.altKey;
    let gx = null, gy = null;
    if (d.mode === "move") {
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!free) {
        const r = d.r0;
        const sx = snap([r.left + dx, r.left + r.width / 2 + dx, r.right + dx], d.snaps.xs);
        const sy = snap([r.top + dy, r.top + r.height / 2 + dy, r.bottom + dy], d.snaps.ys);
        if (sx) { dx += sx.d; gx = sx.at; }
        if (sy) { dy += sy.d; gy = sy.at; }
      }
      const tx = Math.round(d.t0[0] + dx), ty = Math.round(d.t0[1] + dy);
      d.props = { translate: tx === 0 && ty === 0 ? null : `${tx}px ${ty}px` };
      readoutAt(e, `x ${tx}  y ${ty}`);
    } else {
      const h = d.h;
      const text = ed.kind(d.el) === "text";
      const round = d.el.matches("[data-round]");
      let w = d.w0, hh = d.h0, tx = d.t0[0], ty = d.t0[1];
      if (h.includes("e")) w = d.w0 + dx;
      if (h.includes("w")) { w = d.w0 - dx; tx = d.t0[0] + dx; }
      if (h.includes("s")) hh = d.h0 + dy;
      if (h.includes("n")) { hh = d.h0 - dy; ty = d.t0[1] + dy; }
      if (!free && (h.includes("e") || h.includes("w"))) {
        const edge = h.includes("e") ? d.r0.right + dx : d.r0.left + dx;
        const sx = snap([edge], d.snaps.xs);
        if (sx) { const k = h.includes("e") ? 1 : -1; w += k * sx.d; if (k < 0) tx += sx.d; gx = sx.at; }
      }
      if (round || (e.shiftKey && !text)) {
        const s = Math.max(w, hh * (d.w0 / d.h0));
        hh = s * (d.h0 / d.w0); w = s;
      }
      w = Math.max(8, Math.round(w)); hh = Math.max(8, Math.round(hh));
      const props = { width: `${w}px` };
      if (text) props["max-width"] = "none";
      else if (!d.el.matches("figure.fig, .pcard-media")) props.height = `${hh}px`;
      if (tx !== d.t0[0] || ty !== d.t0[1]) props.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
      d.props = props;
      readoutAt(e, text || d.el.matches("figure.fig, .pcard-media") ? `w ${w}` : `${w} × ${hh}`);
    }
    showGuides(gx, gy);
    ed.style(d.el, d.props, { live: true });
  }

  function readoutAt(e, text) {
    readout.textContent = text;
    readout.style.display = "";
    readout.style.left = e.clientX + 14 + "px";
    readout.style.top = e.clientY + 16 + "px";
  }

  function dragEnd() {
    const d = drag;
    drag = null;
    showGuides(null, null);
    readout.style.display = "none";
    if (!d?.started) return;
    ed.endLive(d.mode === "move" ? "Move" : "Resize", d.el, d.props);
    ed.emit("style");
  }

  return { mount, onEvent, cancel: () => { if (drag?.started) ed.cancelLive(); drag = null; showGuides(null, null); } };
}
