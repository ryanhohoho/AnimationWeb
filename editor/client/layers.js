// layers.js — the page as a tree, and the one place to reorder things
//
// Reordering writes CSS `order` rather than moving markup: the parents that
// can reorder are flex columns and grids (.deck-in, .sheet-in, the lists), so
// order is exact, it can differ per screen size, and it never touches the
// source structure a renderer loops over.

import { h } from "./util.js";
import { lockReason, nameOf, kindOf, classesOf } from "./identity.js";

const ICON = {
  text: "M3 3.5h10M8 3.5v9M5.5 12.5h5",
  media: "M2.5 3.5h11v9h-11zM2.5 10l3.2-3 2.8 2.6 2-1.8 3 2.7",
  hole: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z",
  box: "M2.5 2.5h11v11h-11z",
  lock: "M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 0 1 4 0v2"
};

export function createLayers(ed, mount) {
  let dragEl = null;

  function visible(n) {
    if (n.matches(".sr, script, style, template, br, #__ed_overlay")) return false;
    const r = n.getBoundingClientRect();
    return r.width > 1 || r.height > 1 || n.matches("[data-ap]") ||
      ed.win.getComputedStyle(n).display === "none";
  }

  function build() {
    if (!ed.doc) return;
    const docEl = ed.doc.getElementById("doc");
    const rows = [];
    // children in their DISPLAYED order, which is what a reorder changes
    const shown = (n) => {
      const kids = [...n.children];
      const ord = (c) => +ed.win.getComputedStyle(c).order || 0;
      return kids.map((c, i) => [c, i]).sort((a, b) => ord(a[0]) - ord(b[0]) || a[1] - b[1]).map(([c]) => c);
    };
    const walk = (n, depth) => {
      for (const c of shown(n)) {
        if (!visible(c)) continue;
        const lock = lockReason(c);
        const kind = kindOf(c, ed.win);
        const hidden = ed.win.getComputedStyle(c).display === "none";
        const row = h("div", {
          class: `node${lock ? " locked" : ""}${ed.sel?.el === c ? " sel" : ""}${hidden ? " hidden-bp" : ""}`,
          style: { paddingLeft: 8 + depth * 12 + "px" },
          draggable: !lock && ed.canReorder(c) ? "true" : null,
          title: lock || ""
        },
          h("span", { class: "ty", html: `<svg viewBox="0 0 16 16"><path d="${lock ? ICON.lock : ICON[kind]}"/></svg>` }),
          h("span", { class: "nm" }, nameOf(c, ed.win)),
          kind !== "text" && classesOf(c).length ? h("span", { class: "cl" }, "." + classesOf(c)[0]) : null);
        row.addEventListener("click", () => { if (!lock) ed.select(c); });
        row.addEventListener("mouseenter", () => { ed.hover = c; });
        row.addEventListener("mouseleave", () => { if (ed.hover === c) ed.hover = null; });
        if (!lock && ed.canReorder(c)) {
          row.addEventListener("dragstart", (e) => { dragEl = c; e.dataTransfer.effectAllowed = "move"; });
          row.addEventListener("dragover", (e) => {
            if (!dragEl || dragEl === c || dragEl.parentElement !== c.parentElement) return;
            e.preventDefault();
            const r = row.getBoundingClientRect();
            const after = e.clientY > r.top + r.height / 2;
            row.classList.toggle("drop-after", after);
            row.classList.toggle("drop-before", !after);
          });
          row.addEventListener("dragleave", () => row.classList.remove("drop-after", "drop-before"));
          row.addEventListener("drop", (e) => {
            e.preventDefault();
            const after = row.classList.contains("drop-after");
            row.classList.remove("drop-after", "drop-before");
            if (!dragEl || dragEl.parentElement !== c.parentElement) return;
            const [target] = ed.orderIndex(c);
            const [from] = ed.orderIndex(dragEl);
            let to = target + (after ? 1 : 0);
            if (from < to) to -= 1;
            ed.reorder(dragEl, to);
            dragEl = null;
          });
        }
        rows.push(row);
        // a text block's inline pieces are part of it, not layers of their own
        if (kind !== "text" && !c.matches(".pcard-media, figure.fig, svg, [data-usb-stage]")) walk(c, depth + 1);
      }
    };
    walk(docEl, 0);
    mount.replaceChildren(...rows);
    mount.querySelector(".node.sel")?.scrollIntoView({ block: "nearest" });
  }

  return { build };
}
