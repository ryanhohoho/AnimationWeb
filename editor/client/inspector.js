// inspector.js — every property of the selected thing, and the page's colours
//
// Every field shows three states, because a value can come from three places:
//   a filled dot   set here, at this screen size
//   a hollow dot   set at a larger size and carried down to this one
//   no dot         the site's own stylesheet; the grey placeholder is what it
//                  computes to right now
// The ↺ on a field clears it at this size, which hands it back to whatever is
// underneath.

import { h, toast, contrastOf, parseColor, ratio, toHex, modal } from "./util.js";
import { classesOf, nameOf, lockReason } from "./identity.js";

const WEIGHTS = [300, 400, 500, 600, 700];

export function createInspector(ed, mount) {
  let pop = null;

  function closePop() { pop?.remove(); pop = null; document.removeEventListener("mousedown", outside, true); }
  function outside(e) { if (pop && !pop.contains(e.target)) closePop(); }
  function openPop(anchor, content) {
    closePop();
    pop = h("div", { class: "pop" }, content);
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    const top = Math.min(r.bottom + 6, innerHeight - pop.offsetHeight - 10);
    pop.style.top = top + "px";
    pop.style.left = Math.max(10, Math.min(r.left, innerWidth - pop.offsetWidth - 10)) + "px";
    setTimeout(() => document.addEventListener("mousedown", outside, true));
  }

  // ── field builders ─────────────────────────────────────────────────────
  /**
   * A number with a unit. `get()` -> ed.read-shaped value; `set(v, live)`.
   * The label scrubs: press on it and drag sideways.
   */
  function num({ k, title, get, set, unit = "px", step = 1, min = -Infinity, max = Infinity, dec = 0 }) {
    const cur = get();
    const dot = cur.value !== undefined ? (cur.from === ed.bp ? "set" : "inh") : "";
    const shown = cur.value !== undefined ? cur.value : "";
    const ph = cur.computed ? tidy(cur.computed) : "";
    const input = h("input", { value: shown, placeholder: ph, spellcheck: "false", "aria-label": title });
    const commit = () => {
      const raw = input.value.trim();
      if (raw === (shown || "")) return;
      if (!raw) return set(null);
      set(/^-?[\d.]+$/.test(raw) ? `${raw}${unit}` : raw);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { commit(); input.blur(); }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const n = parseFloat(input.value || ph) || 0;
        const d = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
        input.value = String(+(Math.max(min, Math.min(max, n + d))).toFixed(dec + 2)).replace(/\.?0+$/, "") + (/[a-z%]+$/.exec(input.value || ph)?.[0] ?? "");
        commit();
      }
    });
    input.addEventListener("blur", commit);
    const key = h("span", { class: "k", title: `${title} — drag to change` }, k);
    key.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const start = parseFloat(input.value || ph) || 0;
      const u = /[a-z%]+$/.exec(input.value || ph)?.[0] ?? unit;
      const x0 = e.clientX;
      let last = null;
      ed.beginLive();
      const mv = (m) => {
        const v = Math.max(min, Math.min(max, start + Math.round((m.clientX - x0) / 2) * step * (m.shiftKey ? 10 : 1)));
        last = `${+v.toFixed(dec + 2)}${u}`;
        input.value = last;
        set(last, true);
      };
      const up = () => {
        removeEventListener("mousemove", mv); removeEventListener("mouseup", up);
        if (last !== null) set(last, false, true); else ed.cancelLive();
      };
      addEventListener("mousemove", mv); addEventListener("mouseup", up);
    });
    const x = h("button", { class: `x${dot === "set" ? " on" : ""}`, title: "Reset at this size", onclick: () => set(null) }, "↺");
    return h("label", { class: "num", title }, key, input, dot ? h("span", { class: `dot ${dot}` }) : null, x);
  }
  const tidy = (v) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return v;
    const u = /[a-z%]+$/.exec(v)?.[0] || "";
    return `${Math.round(n * 100) / 100}${u}`;
  };

  function buttons(items, cur, onPick) {
    return h("div", { class: "btns" }, items.map((it) =>
      h("button", {
        class: `${cur.value === it.v ? "on" : ""}${cur.value === undefined && it.match?.(cur.computed) ? " inh" : ""}`,
        title: it.t, onclick: () => onPick(cur.value === it.v ? null : it.v),
        html: it.svg ? `<svg viewBox="0 0 16 16"><path d="${it.svg}"/></svg>` : null
      }, it.svg ? null : it.l)));
  }

  function colorField({ label, get, set, allowVars = true, allowNone = true }) {
    const cur = get();
    const value = cur.value ?? "";
    const shownColor = cur.value ? cssColor(cur.value) : cur.computed;
    const btn = h("button", { class: "swatch-btn", type: "button" },
      h("i", { style: { "--c": shownColor } }),
      h("span", {}, cur.value ? pretty(cur.value) : (tidyColor(cur.computed) || "—")),
      h("small", {}, cur.value !== undefined ? (cur.from === ed.bp ? "set" : "from larger") : "site"));
    btn.addEventListener("click", () => {
      const swatches = [];
      if (allowVars) {
        for (const [tok, name] of [["--ink", "ink"], ["--n3", "label grey"], ["--ink-a", "cerulean"],
          ["--ink-b", "rose"], ["--paper", "paper"], ["--n4", "hairline grey (never words)"]]) {
          swatches.push({ v: `var(${tok})`, c: ed.store.tokens[tok], t: `${name} (${tok})`, no: tok === "--n4" });
        }
        for (const [slug, p] of Object.entries(ed.store.inks)) {
          swatches.push({ v: p.inkA, c: p.inkA, t: `${slug} ink A` }, { v: p.ink, c: p.ink, t: `${slug} ink B` });
        }
        swatches.push({ v: "#FFFFFF", c: "#FFFFFF", t: "white" });
      }
      if (allowNone) swatches.push({ v: "transparent", c: "transparent", t: "none" });
      const hex = h("input", { class: "hex", value: /^#/.test(value) ? value : toHex(parseColor(cssColor(value) || shownColor) || [0, 0, 0]) });
      const picker = h("input", { type: "color", value: hex.value.slice(0, 7) });
      picker.addEventListener("input", () => { ed.beginLive(); hex.value = picker.value.toUpperCase(); set(hex.value, true); });
      picker.addEventListener("change", () => { set(picker.value.toUpperCase(), false, true); });
      hex.addEventListener("keydown", (e) => { if (e.key === "Enter" && /^#[0-9a-f]{6}$/i.test(hex.value)) { set(hex.value.toUpperCase()); closePop(); } });
      openPop(btn, [
        swatches.length ? h("h4", {}, "The site's palette") : null,
        swatches.length ? h("div", { class: "sw-grid" }, swatches.map((s) =>
          h("button", { class: `${value === s.v ? "on" : ""}${s.no ? " no" : ""}`, title: s.t,
            style: { background: s.c }, onclick: () => { set(s.v); closePop(); } }))) : null,
        h("h4", {}, "Any colour"),
        h("div", { class: "hexrow" }, picker, hex),
        allowVars ? h("p", { class: "tip" }, "A palette swatch stays linked to the token, so it follows if the palette changes. The crossed one is for hairlines only.") : null,
        cur.value !== undefined ? h("button", { class: "ghost", style: { marginTop: "8px", width: "100%" }, onclick: () => { set(null); closePop(); } }, "Reset to the site's own") : null
      ]);
    });
    return h("div", {}, label ? h("div", { class: "pal-lab" }, label) : null, btn);
  }
  const cssColor = (v) => {
    if (!v) return "";
    const m = /^var\((--[a-z0-9-]+)\)$/.exec(v);
    return m ? ed.store.tokens[m[1]] || "" : v;
  };
  const pretty = (v) => {
    const m = /^var\((--[a-z0-9-]+)\)$/.exec(v);
    return m ? `${m[1]}  ${ed.store.tokens[m[1]] || ""}` : v;
  };
  const tidyColor = (c) => { const p = parseColor(c); return p ? (p[3] < 0.05 ? "none" : toHex(p)) : c; };

  const sec = (title, kids, reset) => h("div", { class: "sec" },
    h("div", { class: "sec-h" }, title, reset ? h("button", { onclick: reset }, "reset") : null), kids);

  // ── setters bound to the selection ─────────────────────────────────────
  const R = (prop, child) => () => ed.read(ed.sel.el, prop, child);
  const S = (prop, child, label) => (v, live, fromLive) => {
    if (fromLive) return ed.endLive(label || prop, ed.sel.el, { [prop]: v }, child);
    ed.style(ed.sel.el, { [prop]: v }, { live, label: label || prop, child });
  };
  const translateGet = (i) => () => {
    const r = ed.read(ed.sel.el, "translate");
    const parts = (r.value || "").split(/\s+/);
    return { value: r.value ? parts[i] || "0px" : undefined, from: r.from, computed: "0px" };
  };
  const translateSet = (i) => (v, live, fromLive) => {
    const t = ed.translateOf(ed.sel.el);
    t[i] = v === null ? 0 : parseFloat(v) || 0;
    const val = t[0] === 0 && t[1] === 0 ? null : `${t[0]}px ${t[1]}px`;
    if (fromLive) return ed.endLive("Move", ed.sel.el, { translate: val });
    ed.style(ed.sel.el, { translate: val }, { live, label: "Move" });
  };

  // ── the panels ─────────────────────────────────────────────────────────
  function render() {
    closePop();
    if (!ed.doc) { mount.replaceChildren(h("div", { class: "note" }, "Loading the site…")); return; }
    if (!ed.sel) return renderPage();
    const el = ed.sel.el;
    const kind = ed.kind(el);
    const cls = classesOf(el);
    const bpLabel = ed.BPS.find((b) => b.key === ed.bp).label;

    const src = h("div", { class: "insp-src" }, " ");
    const head = h("div", { class: "insp-head" },
      h("div", { class: "insp-kind" }, h("span", { class: `badge ${kind}` }, kind), nameOf(el, ed.win)),
      src,
      crumbs(el),
      h("div", { class: "scope" },
        h("label", {}, "Style changes apply to"),
        (() => {
          const s = h("select", { onchange: (e) => { ed.scope = e.target.value; render(); } },
            h("option", { value: "el" }, "This element only"),
            cls.length ? h("option", { value: "page" }, `Every .${cls.join(".")} on this page`) : null,
            cls.length ? h("option", { value: "site" }, `Every .${cls.join(".")} on every page`) : null);
          if (!cls.length && ed.scope !== "el") ed.scope = "el";
          s.value = ed.scope;
          return s;
        })()),
      h("div", { class: "bpnote", html: ed.bp === "base"
        ? `Editing <b>${bpLabel}</b>. Applies to tablet and phone too, unless changed there.`
        : `Editing <b>${bpLabel}</b> (≤${ed.bp} px). Applies here${ed.bp === "860" ? " and on phone" : ""} only.` }));

    // where the words live, asked once and shown before anyone types
    if (kind === "text") {
      src.textContent = "Finding where these words live…";
      ed.textInfo(el).then((info) => {
        if (ed.sel?.el !== el) return;
        src.textContent = info.ok ? `Words from ${info.label}${info.sharedBy > 1 ? ` — shared by ${info.sharedBy} pages` : ""}` : info.reason;
        src.classList.toggle("bad", !info.ok);
      });
    } else src.textContent = el.dataset.esrc ? `Markup in ${el.dataset.esrc.split(":")[0]}` : el.closest("[data-ed-new]") ? "New — written on save" : "Generated by code";

    const parts = [head];
    const warnings = warningsFor(el, kind);
    for (const w of warnings) parts.push(h("div", { class: "warn" }, w));

    // CONTENT
    if (kind === "text") {
      const kids = [h("div", { class: "actions" },
        h("button", { class: "ghost", onclick: () => ed.editText(el) }, "Edit words"),
        h("span", { style: { color: "var(--faint)", fontSize: "11px", alignSelf: "center" } }, "or double-click · ⏎ done · ⇧⏎ line break · ⌘B emphasis"))];
      const a = ed.linkOf(el);
      if (a) {
        const inp = h("input", { value: a.getAttribute("href"), style: { width: "100%", height: "26px", border: "1px solid var(--line2)", borderRadius: "5px", padding: "0 6px", font: "11px var(--mono)" } });
        inp.addEventListener("change", async () => { if (!(await ed.setHref(a, inp.value.trim()))) inp.value = a.getAttribute("href"); });
        kids.push(h("div", { class: "pal-lab" }, "Link goes to"), inp);
      }
      parts.push(sec("Words", kids));
    }
    if (kind === "media") parts.push(mediaSection(el));
    if (kind === "hole") parts.push(h("div", { class: "note" },
      `A cut in the paper: the sky shows through it, pulled in this page's inks. ${ed.win.__DECK__?.debug?.holes?.length ?? "?"} of 12 holes used on this page.`));

    // LAYOUT
    const round = el.matches("[data-round]");
    const layout = [h("div", { class: "grid2" },
      num({ k: "X", title: "Move sideways (offset from its place)", get: translateGet(0), set: translateSet(0) }),
      num({ k: "Y", title: "Move up or down (offset from its place)", get: translateGet(1), set: translateSet(1) }),
      round
        ? num({ k: "⌀", title: "Diameter", get: R("width"), set: (v, live, fl) => fl ? ed.endLive("Size", el, { width: v, height: v }) : ed.style(el, { width: v, height: v }, { live, label: "Size" }) })
        : num({ k: "W", title: kind === "text" ? "Box width — where the lines break" : "Width",
            get: R("width"), set: (v, live, fl) => {
              const props = { width: v };
              if (kind === "text") props["max-width"] = v === null ? null : "none";
              if (fl) return ed.endLive("Width", el, props);
              ed.style(el, props, { live, label: "Width" });
            } }),
      !round && kind !== "text" && !el.matches("figure.fig, .pcard-media")
        ? num({ k: "H", title: "Height", get: R("height"), set: S("height") }) : h("span"))];
    layout.push(h("div", { class: "grid2", style: { marginTop: "6px" } },
      num({ k: "↑", title: "Space above", get: R("margin-top"), set: S("margin-top", "", "Space above") }),
      num({ k: "↓", title: "Space below", get: R("margin-bottom"), set: S("margin-bottom", "", "Space below") })));
    const disp = ed.read(el, "display");
    layout.push(h("div", { class: "row" },
      h("label", { class: "tog", style: { padding: 0 } },
        h("input", { type: "checkbox", checked: disp.value === "none" ? true : null,
          onchange: (e) => ed.style(el, { display: e.target.checked ? "none" : null }, { label: "Hide" }) }),
        ` Hide at ${bpLabel.toLowerCase()}${ed.bp === "base" ? " (and smaller)" : ""}`)));
    if (ed.canReorder(el)) {
      const [i, n] = ed.orderIndex(el);
      layout.push(h("div", { class: "row" }, h("span", { class: "lab" }, "Order"),
        h("div", { class: "btns", style: { flex: 1 } },
          h("button", { title: "Earlier", onclick: () => { ed.reorder(el, i - 1); } }, "↑ earlier"),
          h("button", { title: "Later", onclick: () => { ed.reorder(el, i + 1); } }, "later ↓")),
        h("span", { style: { font: "10.5px var(--mono)", color: "var(--faint)" } }, `${i + 1}/${n}`)));
    }
    const pd = ed.win.getComputedStyle(el).display;
    if (/flex|grid/.test(pd) && kind === "box") {
      layout.push(h("div", { class: "grid2", style: { marginTop: "6px" } },
        num({ k: "gap", title: "Space between the things inside", get: R("gap"), set: S("gap", "", "Gap") }),
        num({ k: "pad", title: "Padding", get: R("padding"), set: S("padding", "", "Padding") })));
    }
    parts.push(sec(kind === "hole" ? "Position and size" : "Layout", layout,
      () => ed.style(el, { translate: null, width: null, height: null, "max-width": null, "margin-top": null, "margin-bottom": null }, { label: "Reset layout" })));

    // TYPE
    if (kind === "text") {
      const wt = ed.read(el, "font-weight");
      const wv = parseInt(wt.value || wt.computed) || 400;
      const range = h("input", { type: "range", min: 300, max: 700, step: 100, value: wv });
      const out = h("output", {}, wv);
      range.addEventListener("input", () => { out.textContent = range.value; ed.style(el, { "font-weight": range.value }, { live: true }); });
      range.addEventListener("pointerdown", () => ed.beginLive());
      range.addEventListener("change", () => ed.endLive("Weight", el, { "font-weight": range.value }));
      const tt = ed.read(el, "text-transform");
      const ta = ed.read(el, "text-align");
      const fs = ed.read(el, "font-style");
      parts.push(sec("Type", [
        h("div", { class: "grid3" },
          num({ k: "Aa", title: "Size", get: R("font-size"), set: S("font-size", "", "Size"), step: 1, min: 4 }),
          num({ k: "↔", title: "Letter spacing (em)", get: R("letter-spacing"), set: S("letter-spacing", "", "Tracking"), unit: "em", step: 0.01, dec: 2 }),
          num({ k: "↕", title: "Line height (× the size)", get: R("line-height"), set: S("line-height", "", "Leading"), unit: "", step: 0.05, dec: 2, min: 0.5 })),
        h("div", { class: "row" }, h("span", { class: "lab" }, "Weight"), h("div", { class: "slider", style: { flex: 1 } }, range, out)),
        h("div", { class: "row" }, h("span", { class: "lab" }, "Align"),
          h("div", { style: { flex: 1 } }, buttons([
            { v: "left", t: "Left", svg: "M2.5 4h11M2.5 7h7M2.5 10h11M2.5 13h7", match: (c) => c === "left" || c === "start" },
            { v: "center", t: "Centre", svg: "M2.5 4h11M4.5 7h7M2.5 10h11M4.5 13h7", match: (c) => c === "center" },
            { v: "right", t: "Right", svg: "M2.5 4h11M6.5 7h7M2.5 10h11M6.5 13h7", match: (c) => c === "right" || c === "end" },
            { v: "justify", t: "Justify", svg: "M2.5 4h11M2.5 7h11M2.5 10h11M2.5 13h11", match: (c) => c === "justify" }
          ], ta, (v) => ed.style(el, { "text-align": v }, { label: "Align" })))),
        h("div", { class: "row" }, h("span", { class: "lab" }, "Case"),
          h("div", { style: { flex: 1 } }, buttons([
            { v: "none", l: "As typed", t: "As typed", match: (c) => c === "none" },
            { v: "uppercase", l: "AB", t: "Upper case", match: (c) => c === "uppercase" },
            { v: "lowercase", l: "ab", t: "Lower case", match: (c) => c === "lowercase" },
            { v: "capitalize", l: "Ab", t: "Title case", match: (c) => c === "capitalize" }
          ], tt, (v) => ed.style(el, { "text-transform": v }, { label: "Case" })))),
        h("div", { class: "row" }, h("span", { class: "lab" }, "Style"),
          h("div", { style: { flex: 1 } }, buttons([
            { v: "normal", l: "Upright", t: "Upright", match: (c) => c === "normal" },
            { v: "italic", l: "Italic", t: "Italic", match: (c) => c === "italic" }
          ], fs, (v) => ed.style(el, { "font-style": v }, { label: "Italic" })))),
        colorField({ label: "Colour", get: R("color"), set: S("color", "", "Colour"), allowNone: false })
      ], () => ed.style(el, { "font-size": null, "font-weight": null, "letter-spacing": null, "line-height": null,
        "text-transform": null, "text-align": null, "font-style": null, color: null }, { label: "Reset type" })));
    }

    // FILL
    const op = ed.read(el, "opacity");
    const ov = Math.round((parseFloat(op.value ?? op.computed) || 1) * 100);
    const orange = h("input", { type: "range", min: 0, max: 100, value: ov });
    const oout = h("output", {}, ov + "%");
    orange.addEventListener("pointerdown", () => ed.beginLive());
    orange.addEventListener("input", () => { oout.textContent = orange.value + "%"; ed.style(el, { opacity: String(orange.value / 100) }, { live: true }); });
    orange.addEventListener("change", () => ed.endLive("Opacity", el, { opacity: orange.value === "100" ? null : String(orange.value / 100) }));
    parts.push(sec("Fill", [
      kind === "hole" ? h("div", { class: "note", style: { margin: "0 0 6px" } }, "A hole has no fill — it shows the sky.")
        : colorField({ label: "Background", get: R("background-color"), set: S("background-color", "", "Background") }),
      h("div", { class: "row" }, h("span", { class: "lab" }, "Opacity"), h("div", { class: "slider", style: { flex: 1 } }, orange, oout))
    ]));

    // ACTIONS
    parts.push(sec("Element", [h("div", { class: "actions" },
      h("button", { class: "ghost", onclick: (e) => insertMenu(e.currentTarget) }, "Insert after ▾"),
      h("button", { class: "ghost", onclick: () => ed.duplicate(), title: "⌘D" }, "Duplicate"),
      h("button", { class: "danger", onclick: () => ed.remove(), title: "⌫" }, "Delete"),
      h("button", { class: "ghost", onclick: () => resetAll(el) }, "Reset styles here"))]));

    mount.replaceChildren(...parts);
  }

  function resetAll(el) {
    const sel = ed.peek(el);
    if (!sel) return toast("Nothing is set on this element at this scope.");
    ed.store.global("Reset styles", (st) => {
      for (const s of Object.keys(st.styles.rules)) {
        if (s === sel || s.startsWith(sel + " ")) {
          delete st.styles.rules[s][ed.bp];
          if (!Object.keys(st.styles.rules[s]).length) delete st.styles.rules[s];
        }
      }
    }, () => { ed.frame.renderCss(ed.store.styles); ed.emit("style"); });
  }

  function crumbs(el) {
    const chain = [];
    for (let n = el.parentElement; n && n.id !== "doc"; n = n.parentElement) chain.unshift(n);
    return h("div", { class: "crumbs" }, chain.slice(-4).map((n) =>
      h("button", { title: "Select the container", onclick: () => ed.select(n) }, nameOf(n, ed.win))));
  }

  function mediaSection(el) {
    const slots = ed.slotsOf(el);
    const kids = [];
    for (const s of slots) {
      const node = s.node;
      const url = node?.currentSrc || node?.getAttribute("src") || "";
      const isVid = node?.tagName === "VIDEO";
      const prev = h("div", { class: "media-prev", title: "Click to set the focal point — the part that stays in frame when it is cropped" },
        url ? (isVid ? h("video", { src: url, muted: true, autoplay: true, loop: true, playsinline: true }) : h("img", { src: url, alt: "" })) : h("div", { class: "note", style: { margin: "30% 12px" } }, "Nothing here yet"));
      // the focal point: object-position on the picture itself
      if (node && s.slot !== "icon") {
        const child = el.matches(".pcard-media") ? (isVid ? ".pcard-vid" : ".pcard-still") : ".fig-in > img, .fig-in > video";
        const cur = ed.read(el, "object-position", child);
        const pos = (cur.value || cur.computed || "50% 50%").split(/\s+/).map((v) => parseFloat(v));
        const fp = h("div", { class: "fp", style: { left: (pos[0] ?? 50) + "%", top: (pos[1] ?? 50) + "%" } });
        prev.append(fp);
        prev.addEventListener("click", (e) => {
          const r = prev.getBoundingClientRect();
          const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100);
          fp.style.left = x + "%"; fp.style.top = y + "%";
          ed.style(el, { "object-position": `${x}% ${y}%` }, { label: "Focal point", child });
        });
      }
      kids.push(h("div", { class: "slot" },
        h("div", { class: "slot-h" }, s.label,
          h("button", { class: "ghost", onclick: () => ed.replaceMedia(el, s) }, "Replace…")),
        prev,
        s.note ? h("div", { style: { fontSize: "10.5px", color: "var(--faint)" } }, s.note) : null));
    }
    // fit and shape
    const fitChild = el.matches(".pcard-media") ? ".pcard-still, .pcard-vid" : ".fig-in > img, .fig-in > video";
    const fit = ed.read(el, "object-fit", fitChild);
    kids.push(h("div", { class: "row" }, h("span", { class: "lab" }, "Fit"),
      h("div", { style: { flex: 1 } }, buttons([
        { v: "cover", l: "Fill & crop", t: "Fill the box, crop what does not fit", match: (c) => c === "cover" },
        { v: "contain", l: "Show all", t: "Show the whole picture", match: (c) => c === "contain" }
      ], fit, (v) => ed.style(el, { "object-fit": v }, { label: "Fit", child: fitChild })))));
    const shapeChild = el.matches("figure.fig") ? "> .fig-in" : "";
    const ar = ed.read(el, "aspect-ratio", shapeChild || undefined);
    const shapes = [["", "Original"], ["16 / 9", "16:9"], ["3 / 2", "3:2"], ["4 / 3", "4:3"], ["1 / 1", "1:1"], ["3 / 4", "3:4"], ["9 / 16", "9:16"]];
    const selEl = h("select", { style: { flex: 1, padding: "4px", border: "1px solid var(--line2)", borderRadius: "5px", background: "#fff" },
      onchange: (e) => ed.style(el, { "aspect-ratio": e.target.value || null }, { label: "Shape", child: shapeChild }) },
      shapes.map(([v, l]) => h("option", { value: v }, l)));
    selEl.value = shapes.some(([v]) => v === ar.value) ? ar.value || "" : "";
    kids.push(h("div", { class: "row" }, h("span", { class: "lab" }, "Shape"), selEl));
    if (el.matches(".pcard-media")) kids.push(h("div", { class: "note", style: { margin: "8px 0 0" } }, "The icon hole is measured from this box; a new shape is re-measured automatically."));
    return sec("Picture", kids);
  }

  function insertMenu(anchor) {
    closePop();
    const menu = h("div", { class: "menu" },
      [["text", "Paragraph", "body text"], ["heading", "Heading", "display type"], ["label", "Label", "small caps"],
       ["figure", "Picture or clip…", "from Finder"], ["hole", "Hole", "a cut onto the sky"]]
        .map(([k, l, s]) => h("button", { onclick: () => { closePop(); ed.insert(k); } }, l, h("small", {}, s))));
    pop = menu;
    document.body.append(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.left = Math.min(r.left, innerWidth - 210) + "px";
    menu.style.top = Math.min(r.bottom + 4, innerHeight - menu.offsetHeight - 8) + "px";
    setTimeout(() => document.addEventListener("mousedown", outside, true));
  }
  ed.insertMenu = insertMenu;

  // ── guardrails: warn, never block ──────────────────────────────────────
  function warningsFor(el, kind) {
    const out = [];
    if (kind !== "text") return out;
    const col = ed.read(el, "color").value || "";
    if (/--n4\b/.test(col) || col.toUpperCase() === (ed.store.tokens["--n4"] || "").toUpperCase()) {
      out.push("--n4 is the hairline grey (2.6:1 on bone). The site's rule is that it never carries a word.");
    }
    if (/--mew\b/.test(col) || col.toUpperCase() === "#F7A8D8") out.push("Pink is Mew's. No other element may use --mew.");
    const r = contrastOf(el, ed.win, ed.store.tokens["--paper"]);
    if (r && r < 4.5) out.push(`Contrast is ${r.toFixed(2)}:1, under the 4.5:1 floor the site holds every word to.`);
    return out;
  }
  ed.warningsFor = warningsFor;

  // ── nothing selected: the page and its colours ─────────────────────────
  function renderPage() {
    const T = ed.store.tokens, P = ed.store.palette;
    const setTok = (tok) => (v, live, fromLive) => {
      if (!v) return;
      const mutate = (st) => {
        st.tokens[tok] = v;
        if (tok === "--ink-a") st.tokens["--blue"] = v;
        if (tok === "--paper") st.palette.paper = v;
      };
      const after = () => { ed.frame.applyPalette(ed.store.palette, ed.store.tokens, ed.store.inks); if (!live) render(); };
      if (live) ed.store.live(mutate, after);
      else if (fromLive) ed.commitLive(`Colour ${tok}`, mutate, after);
      else ed.store.global(`Colour ${tok}`, mutate, after);
    };
    const setPal = (k) => (v, live, fromLive) => {
      if (!v) return;
      const after = () => { ed.frame.applyPalette(ed.store.palette, ed.store.tokens, ed.store.inks); if (!live) render(); };
      const mutate = (st) => { st.palette[k] = v; };
      if (live) ed.store.live(mutate, after);
      else if (fromLive) ed.commitLive(`Sky ${k}`, mutate, after);
      else ed.store.global(`Sky ${k}`, mutate, after);
    };
    const setInk = (slug, k) => (v, live, fromLive) => {
      if (!v) return;
      const after = () => { ed.frame.applyPalette(ed.store.palette, ed.store.tokens, ed.store.inks); if (!live) render(); };
      const mutate = (st) => { st.inks[slug] = { ...st.inks[slug], [k]: v }; };
      if (live) ed.store.live(mutate, after);
      else if (fromLive) ed.commitLive(`${slug} ink`, mutate, after);
      else ed.store.global(`${slug} ink`, mutate, after);
    };
    const val = (v) => () => ({ value: v, from: ed.bp, computed: v });

    const warn = [];
    const paper = parseColor(T["--paper"]);
    const rr = (tok) => ratio(parseColor(T[tok]), paper);
    if (rr("--ink") <= 12) warn.push(`Ink on paper is ${rr("--ink").toFixed(1)}:1; the tests want more than 12:1.`);
    if (rr("--n3") < 4.5) warn.push(`Label grey on paper is ${rr("--n3").toFixed(2)}:1, under 4.5:1 — every label would fail.`);
    if (rr("--ink-a") < 4.5) warn.push(`Cerulean on paper is ${rr("--ink-a").toFixed(2)}:1, under 4.5:1 — every link would fail.`);
    if (rr("--n4") >= 3) warn.push(`Hairline grey is now ${rr("--n4").toFixed(2)}:1; the tests expect it to stay under 3:1 (it must not look like text).`);

    mount.replaceChildren(
      h("div", { class: "insp-head" }, h("div", { class: "insp-kind" }, h("span", { class: "badge" }, "page"), pageName()),
        h("div", { class: "insp-src" }, "Nothing selected. Click anything on the page, or change the colours below.")),
      ...warn.map((w) => h("div", { class: "warn" }, w)),
      sec("Paper", [colorField({ label: "", get: val(T["--paper"]), set: setTok("--paper"), allowVars: false, allowNone: false }),
        h("div", { style: { fontSize: "10.5px", color: "var(--faint)", marginTop: "6px" } }, "The sheet itself. Saved to --paper, the press (palette.js) and the browser's theme colour together.")]),
      sec("Sky inks — the home sheet", [h("div", { class: "pal-row" },
        colorField({ label: "Ink A (the air)", get: val(P.homeInkA), set: setPal("homeInkA"), allowVars: false, allowNone: false }),
        colorField({ label: "Ink B (the light)", get: val(P.homeInkB), set: setPal("homeInkB"), allowVars: false, allowNone: false })),
        h("div", { style: { fontSize: "10.5px", color: "var(--faint)", marginTop: "6px" } }, "The cans, not the print: a halftone drifts toward the paper, so these are pushed past the colour you see.")]),
      sec("Sky inks — each project", Object.entries(ed.store.inks).map(([slug, p]) =>
        h("div", { class: "proj" }, h("div", { class: "t" }, slug), h("div", { class: "pal-row" },
          colorField({ label: "", get: val(p.inkA), set: setInk(slug, "inkA"), allowVars: false, allowNone: false }),
          colorField({ label: "", get: val(p.ink), set: setInk(slug, "ink"), allowVars: false, allowNone: false }))))),
      sec("Type and line colours", [h("div", { class: "pal-row" },
        colorField({ label: "Ink (--ink)", get: val(T["--ink"]), set: setTok("--ink"), allowVars: false, allowNone: false }),
        colorField({ label: "Labels (--n3)", get: val(T["--n3"]), set: setTok("--n3"), allowVars: false, allowNone: false }),
        colorField({ label: "Hairlines (--n4)", get: val(T["--n4"]), set: setTok("--n4"), allowVars: false, allowNone: false }),
        colorField({ label: "Cerulean (--ink-a)", get: val(T["--ink-a"]), set: setTok("--ink-a"), allowVars: false, allowNone: false }),
        colorField({ label: "Rose (--ink-b)", get: val(T["--ink-b"]), set: setTok("--ink-b"), allowVars: false, allowNone: false }))]),
      sec("Keys", [h("div", { style: { fontSize: "11px", color: "var(--dim)", lineHeight: 1.8 } },
        "Click select · double-click edit words · drag move (⌥ no snap, ⇧ one axis) · arrows nudge (⇧ ×10) · ⌘Z / ⇧⌘Z · ⌘D duplicate · ⌫ delete · Esc deselect · ⌘S save")])
    );
  }
  const pageName = () => ({ home: "Summary", experience: "Experience", projects: "Projects", contact: "Contact" }[ed.page]
    || (ed.page?.startsWith("project:") ? ed.page.slice(8) : ed.page));

  return { render, closePop };
}
