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
//
// SELECTING SEVERAL (2026-09-26). Press on empty space -- a section or a
// container that is not selected -- and drag: a box picks every word, picture
// and hole it touches. ⇧ adds to the selection (by click or by box), ⌘/Ctrl-⇧
// takes out. A selection of several moves together, and resizes together
// from the handles on the box round all of it.
//
// RESIZING TEXT SCALES IT. With the text link on (ed.link.text, the default)
// every handle on a text block scales its type -- size, box and spacing
// together, so the lines break where they did and the text follows the
// pointer 1:1. With it off, the side handles change the box only and re-wrap
// the lines, as they used to. Corners always scale. A picture keeps its shape
// from every handle; a box keeps its ratio when its link is on, or with ⇧.
//
// Resizing an element in the page's flow moves its neighbours, and can move
// the element itself (a centred column re-centres it). So after each step of
// a resize the element is measured and its offset corrected, until the fixed
// point of the resize is exactly where it started.

import { selectable, lockReason, nameOf, isTextLeaf } from "./identity.js";
import { HANDLES, factors, uniform, anchorOf, mapRect, union, meets, scaleText, round } from "../shared/scale.js";

const CSS = `
:host { all: initial; }
.box { position: fixed; pointer-events: none; box-sizing: border-box; }
.hov { outline: 1px solid rgba(0,90,125,.75); }
.hov.lock { outline: 1px dashed rgba(90,87,76,.8); }
.sel { outline: 1.5px solid #005A7D; }
.sel.editing { outline: 1.5px dashed #005A7D; }
.sel.group { outline: 1px dashed #005A7D; outline-offset: 3px; }
.member { outline: 1px solid rgba(0,90,125,.7); }
.h { position: absolute; width: 9px; height: 9px; margin: -5px 0 0 -5px; background: #fff;
     border: 1.5px solid #005A7D; border-radius: 2px; pointer-events: auto; box-sizing: border-box; }
.h.scale { background: #005A7D; }
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
.marquee { position: fixed; pointer-events: none; border: 1px dashed #005A7D; background: rgba(0,90,125,.07); }
`;

const SNAP = 6;
const FIGURE = "figure.fig, .pcard-media";

export function createCanvas(ed) {
  let root = null, hov = null, sel = null, members = null, guides = null, readout = null, marquee = null;
  let drag = null;
  let raf = 0;

  function mount(ctx) {
    root = ctx.overlay;
    root.innerHTML = `<style>${CSS}</style>`;
    hov = el("div", "box hov"); hov.append(el("div", "tag"));
    members = el("div", "");
    sel = el("div", "box sel"); sel.append(el("div", "tag"));
    for (const k of HANDLES) { const hd = el("div", "h"); hd.dataset.h = k; sel.append(hd); }
    guides = el("div", ""); readout = el("div", "readout");
    marquee = el("div", "marquee");
    readout.style.display = marquee.style.display = "none";
    root.append(hov, members, sel, guides, readout, marquee);
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

  const isText = (e) => ed.kind(e) === "text";
  const isFigure = (e) => e.matches(FIGURE);
  const isRound = (e) => e.matches("[data-round]");

  // ── drawing ────────────────────────────────────────────────────────────
  function draw() {
    if (!root || !ed.doc) return;
    const h = ed.hover;
    if (h && !ed.isSelected(h) && h.isConnected && !drag) {
      const r = h.getBoundingClientRect();
      place(hov, r);
      const lock = lockReason(h);
      hov.classList.toggle("lock", !!lock);
      hov.firstChild.textContent = lock ? "🔒 " + lock.replace(/\.$/, "") : nameOf(h, ed.win);
      hov.style.display = "";
    } else hov.style.display = "none";

    // while a selection box is being drawn, what it would select is shown;
    // the selection itself (and the panels that follow it) change on release
    const els = (drag?.mode === "marquee" && drag.started ? drag.preview : ed.selEls()).filter((e) => e.isConnected);
    if (!els.length) { sel.style.display = "none"; members.replaceChildren(); return; }
    const group = els.length > 1;
    // each member of a group gets its own thin outline; the handles go on the
    // box round all of them
    while (members.children.length < (group ? els.length : 0)) members.append(el("div", "box member"));
    while (members.children.length > (group ? els.length : 0)) members.lastChild.remove();
    const rects = els.map((e) => e.getBoundingClientRect());
    if (group) rects.forEach((r, i) => place(members.children[i], r));
    const r = group ? union(rects) : rects[0];
    place(sel, r);
    sel.classList.toggle("group", group);
    sel.classList.toggle("editing", !group && ed.editing === els[0]);
    const t = sel.firstChild;
    t.innerHTML = group
      ? `${els.length} selected<b>${Math.round(r.width)} × ${Math.round(r.height)}</b>`
      : `${esc(nameOf(els[0], ed.win))}<b>${Math.round(r.width)} × ${Math.round(r.height)}</b>`;
    t.classList.toggle("below", r.top < 24);
    const single = group ? null : els[0];
    for (const hd of sel.querySelectorAll(".h")) {
      const k = hd.dataset.h;
      let show = !ed.editing;
      let scales = group ? els.some(isText) : false;
      if (single) {
        if (isRound(single)) show &&= k.length === 2;
        else if (isFigure(single)) show &&= k.length === 2 || k === "e" || k === "w";
        else if (isText(single)) {
          // linked: every handle scales. Unlinked: the sides re-wrap (e, w),
          // the corners still scale, and top and bottom have nothing to do --
          // a text block's height is its lines
          if (!ed.link.text) show &&= k !== "n" && k !== "s";
          scales = ed.link.text || k.length === 2;
        }
      }
      hd.classList.toggle("scale", scales);
      hd.style.display = show ? "" : "none";
      hd.style.left = (k.includes("w") ? 0 : k.includes("e") ? r.width : r.width / 2) + "px";
      hd.style.top = (k.includes("n") ? 0 : k.includes("s") ? r.height : r.height / 2) + "px";
    }
    sel.style.display = "";
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // ── snapping ───────────────────────────────────────────────────────────
  function snapTargets(els) {
    const xs = [], ys = [];
    const skip = (n) => els.some((e) => e === n || e.contains(n) || n.contains(e));
    const add = (r) => { xs.push(r.left, r.left + r.width / 2, r.right); ys.push(r.top, r.top + r.height / 2, r.bottom); };
    const p = els[0].parentElement;
    if (p) {
      if (!skip(p)) add(p.getBoundingClientRect());
      for (const c of p.children) if (!skip(c) && c.getBoundingClientRect().width) add(c.getBoundingClientRect());
    }
    xs.push(ed.win.innerWidth / 2);
    // the section it sits in, too: a plate's edges and middle
    const sec = els[0].closest("section");
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
      if (handle && ed.sels.length) return startResize(e, handle.dataset.h);
      const add = e.shiftKey && !(e.metaKey || e.ctrlKey);
      const take = e.shiftKey && (e.metaKey || e.ctrlKey);
      const hit = selectable(target, ed.win);
      const empty = !hit || lockReason(hit) || (ed.kind(hit) === "box" && !ed.isSelected(hit));
      // EMPTY SPACE: a drag draws a selection box; a click selects the
      // container (or nothing), as it always did
      if (empty) return startMarquee(e, hit && !lockReason(hit) ? hit : null, { add, take });
      if (take) { ed.removeFromSelection(hit); return; }
      if (add) { if (!ed.isSelected(hit)) ed.addToSelection(hit); }
      else if (!ed.isSelected(hit)) ed.select(hit);
      startMove(e, hit, { narrow: !add && ed.sels.length > 1 });
      return;
    }
    if (e.type === "mouseup") return dragEnd(e);
    if (e.type === "dblclick") {
      const hit = selectable(target, ed.win);
      if (hit && isTextLeaf(hit, ed.win)) { ed.select(hit); ed.editText(hit); }
    }
  }

  // one record per element being moved or resized, taken as the gesture starts
  function snapshot(elm) {
    const cs = ed.win.getComputedStyle(elm);
    const lh = parseFloat(cs.lineHeight);
    return {
      el: elm, r0: elm.getBoundingClientRect(), t0: ed.translateOf(elm),
      w0: parseFloat(cs.width), h0: parseFloat(cs.height),
      fs0: parseFloat(cs.fontSize), lh0: Number.isFinite(lh) ? lh : null,
      ls0: ed.read(elm, "letter-spacing").value || null,
      text: isText(elm), figure: isFigure(elm), round: isRound(elm)
    };
  }

  function startMove(e, hit, { narrow }) {
    drag = { mode: "move", x0: e.clientX, y0: e.clientY, hit, narrow, started: false,
             items: ed.selEls().map(snapshot) };
  }
  function startResize(e, h) {
    drag = { mode: "resize", h, x0: e.clientX, y0: e.clientY, started: false,
             items: ed.selEls().map(snapshot) };
    drag.box = union(drag.items.map((it) => it.r0));
  }
  function startMarquee(e, container, mods) {
    drag = { mode: "marquee", x0: e.clientX, y0: e.clientY, started: false, container, ...mods, before: ed.selEls() };
  }

  function dragMove(e) {
    const d = drag;
    let dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      d.started = true;
      if (d.mode === "marquee") { marquee.style.display = ""; d.cands = candidates(); d.preview = d.before; }
      else {
        if (d.items.some((it) => !ed.target(it.el, d.items.length > 1 ? "el" : ed.scope))) { drag = null; return; }
        d.snaps = snapTargets(d.items.map((it) => it.el));
        ed.beginLive();
      }
    }
    if (d.mode === "marquee") return marqueeMove(e, dx, dy);
    const free = e.altKey;
    let gx = null, gy = null;
    if (d.mode === "move") {
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!free) {
        const r = union(d.items.map((it) => it.r0));
        const sx = snap([r.left + dx, r.left + r.width / 2 + dx, r.right + dx], d.snaps.xs);
        const sy = snap([r.top + dy, r.top + r.height / 2 + dy, r.bottom + dy], d.snaps.ys);
        if (sx) { dx += sx.d; gx = sx.at; }
        if (sy) { dy += sy.d; gy = sy.at; }
      }
      d.pairs = d.items.map((it) => {
        const tx = Math.round(it.t0[0] + dx), ty = Math.round(it.t0[1] + dy);
        return { el: it.el, props: { translate: tx === 0 && ty === 0 ? null : `${tx}px ${ty}px` } };
      });
      readoutAt(e, `x ${Math.round(dx)}  y ${Math.round(dy)}`);
      apply(d);
    } else {
      // the moving edges snap to their neighbours, then the factors follow
      const h = d.h, b = d.box;
      if (!free) {
        if (h.includes("e") || h.includes("w")) {
          const sx = snap([h.includes("e") ? b.right + dx : b.left + dx], d.snaps.xs);
          if (sx) { dx += sx.d; gx = sx.at; }
        }
        if (h.includes("n") || h.includes("s")) {
          const sy = snap([h.includes("s") ? b.bottom + dy : b.top + dy], d.snaps.ys);
          if (sy) { dy += sy.d; gy = sy.at; }
        }
      }
      resizeMove(e, dx, dy);
    }
    showGuides(gx, gy);
  }

  function marqueeMove(e, dx, dy) {
    const d = drag;
    const m = { left: Math.min(d.x0, e.clientX), top: Math.min(d.y0, e.clientY), width: Math.abs(dx), height: Math.abs(dy) };
    place(marquee, m);
    const hits = d.cands.filter((c) => meets(c.r, m)).map((c) => c.el);
    d.preview = d.take ? d.before.filter((x) => !hits.includes(x))
      : d.add ? [...new Set([...d.before, ...hits])] : hits;
    readoutAt(e, `${hits.length} ${d.take ? "to take out" : "selected"}`);
  }

  /**
   * What a selection box can pick: the words, pictures, holes and lenses on
   * the page -- never a container, which would swallow what is inside it --
   * each once, outermost first, with its rectangle. Taken once as the box
   * starts: the page does not move under a drag.
   */
  function candidates() {
    const seen = new Set(), out = [];
    for (const n of ed.doc.querySelectorAll("#doc *")) {
      const s = selectable(n, ed.win);
      if (!s || seen.has(s) || lockReason(s)) continue;
      seen.add(s);
      if (ed.kind(s) === "box" && !s.matches("[data-round]")) continue;
      const r = s.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      out.push({ el: s, r });
    }
    return out.filter((x) => !out.some((o) => o !== x && o.el.contains(x.el)));
  }

  // ── resizing ───────────────────────────────────────────────────────────
  function resizeMove(e, dx, dy) {
    const d = drag, h = d.h, b = d.box;
    const group = d.items.length > 1;
    const { sx, sy } = factors(h, dx, dy, b.width, b.height);
    const one = d.items[0];
    // proportional or free, decided once per gesture step
    let prop;
    if (group) prop = d.items.some((it) => it.text || it.figure || it.round) || h.length === 2 || e.shiftKey;
    else if (one.text) prop = ed.link.text || h.length === 2;
    else if (one.figure || one.round) prop = true;
    else prop = ed.link.box || e.shiftKey;
    const s = uniform(h, sx, sy);
    const fx = prop ? s : sx, fy = prop ? s : sy;
    const [ax, ay] = anchorOf(h);
    const pinX = b.left + ax * b.width, pinY = b.top + ay * b.height;

    d.pairs = d.items.map((it) => {
      let props;
      if (it.text && prop) props = scaleText(it, s);
      else if (it.text) props = { width: `${Math.max(8, Math.round(it.w0 * fx))}px`, "max-width": "none" };
      else if (it.round) { const w = Math.max(8, Math.round(it.w0 * s)); props = { width: `${w}px`, height: `${w}px` }; }
      else if (it.figure) props = { width: `${Math.max(8, Math.round(it.w0 * fx))}px` };
      else props = { width: `${Math.max(8, Math.round(it.w0 * fx))}px`, height: `${Math.max(8, Math.round(it.h0 * fy))}px` };
      // where it should land: its rect scaled about the fixed point of the
      // whole selection (for one element, about its own opposite corner)
      const want = mapRect(it.r0, pinX, pinY, fx, fy);
      it.want = want;
      props.translate = `${Math.round(it.t0[0] + want.left - it.r0.left)}px ${Math.round(it.t0[1] + want.top - it.r0.top)}px`;
      return { el: it.el, props };
    });
    apply(d);
    // the flow moved things: put each one's fixed point back where it belongs
    correct(d, ax, ay, group);
    const lead = d.items.find((it) => it.text && prop);
    readoutAt(e, lead ? `${Math.round(s * 100)}%  ·  Aa ${round(lead.fs0 * s, 1)}px`
      : group ? `${Math.round(fx * 100)}% × ${Math.round(fy * 100)}%`
      : one.figure ? `w ${Math.round(one.w0 * fx)}` : `${Math.round(one.w0 * fx)} × ${Math.round(one.h0 * fy)}`);
  }

  // live, as one gesture: a single element keeps the scope the inspector is
  // set to, a group is always "this element only" (editor.js, styleMany)
  function apply(d) {
    if (d.items.length === 1) ed.style(d.items[0].el, d.pairs[0].props, { live: true });
    else ed.styleMany(d.pairs, { live: true });
  }

  function correct(d, ax, ay, group) {
    let moved = false;
    for (const [i, it] of d.items.entries()) {
      const R = it.el.getBoundingClientRect();
      // one element: its own anchor corner stays put; in a group, each keeps
      // its scaled top-left (its own size may not be exactly the scaled one --
      // a text block's height is its lines)
      const fx = group ? 0 : ax, fy = group ? 0 : ay;
      const wantX = group ? it.want.left : it.r0.left + fx * it.r0.width;
      const wantY = group ? it.want.top : it.r0.top + fy * it.r0.height;
      const ex = wantX - (R.left + fx * R.width), ey = wantY - (R.top + fy * R.height);
      if (Math.abs(ex) < 0.5 && Math.abs(ey) < 0.5) continue;
      const [tx, ty] = (d.pairs[i].props.translate || "0px 0px").split(/\s+/).map(parseFloat);
      d.pairs[i].props.translate = `${Math.round(tx + ex)}px ${Math.round(ty + ey)}px`;
      moved = true;
    }
    if (moved) apply(d);
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
    readout.style.display = marquee.style.display = "none";
    if (!d) return;
    if (d.mode === "marquee") {
      if (d.started) { ed.selectMany(d.preview); return; }
      // a click on empty space, not a drag: the container, or nothing
      if (d.take || d.add) return;
      ed.select(d.container);
      return;
    }
    if (!d.started) {
      // a plain click on one of several selected: just that one, as in Figma
      if (d.mode === "move" && d.narrow) ed.select(d.hit);
      return;
    }
    const label = d.mode === "move" ? "Move" : "Resize";
    // null translates are "back to where the layout put it"
    for (const p of d.pairs) if (p.props.translate === "0px 0px") p.props.translate = null;
    if (d.items.length === 1) ed.endLive(label, d.items[0].el, d.pairs[0].props);
    else ed.endLiveMany(`${label} ${d.items.length}`, d.pairs);
    ed.emit("style");
  }

  return { mount, onEvent, cancel: () => { if (drag?.started && drag.mode !== "marquee") ed.cancelLive(); drag = null; showGuides(null, null); } };
}
