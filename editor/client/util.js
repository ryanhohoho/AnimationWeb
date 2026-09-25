// util.js — small things every part of the editor uses

/** h("div", { class: "x", onclick }, child, "text", [more]) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") {
      for (const [p, x] of Object.entries(v)) {
        if (p.startsWith("--")) el.style.setProperty(p, x); else el.style[p] = x;
      }
    }
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const svg = (d, vb = "0 0 16 16") =>
  h("span", { html: `<svg viewBox="${vb}"><path d="${d}"/></svg>`, style: { display: "contents" } });

export function toast(msg, bad = false, ms = 3200) {
  const box = document.getElementById("toast");
  const t = h("div", { class: bad ? "bad" : "" }, msg);
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

/** a dialog. buttons: [{ label, kind, value }]. Resolves with the value. */
export function modal(title, body, buttons) {
  const m = document.getElementById("modal");
  return new Promise((done) => {
    const close = (v) => { m.hidden = true; m.replaceChildren(); done(v); };
    const dlg = h("div", { class: "dlg", role: "dialog", "aria-modal": "true" },
      h("h3", {}, title),
      h("div", { class: "body" }, body),
      h("div", { class: "foot" }, buttons.map((b) =>
        h("button", { class: b.kind || "ghost", onclick: () => close(b.value) }, b.label))));
    m.replaceChildren(dlg);
    m.hidden = false;
    m.onclick = (e) => { if (e.target === m) close(null); };
    const onKey = (e) => { if (e.key === "Escape") { document.removeEventListener("keydown", onKey, true); close(null); } };
    document.addEventListener("keydown", onKey, true);
    dlg.querySelector("button.primary, button.danger")?.focus();
  });
}

export async function api(path, body) {
  const r = await fetch(path, body === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
  return r.json();
}

// ── colour ─────────────────────────────────────────────────────────────────
// The same formula test/sim.test.js measures the stylesheet with, so a warning
// here and a failure there are the same number.
const srgb = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
export function parseColor(c) {
  if (!c) return null;
  let m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = /^#([0-9a-f]{3})$/i.exec(c.trim());
  if (m) return [...m[1]].map((x) => parseInt(x + x, 16)).concat(1);
  m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return null;
}
export const lum = ([r, g, b]) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
export function ratio(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const toHex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/** an element's own text colour against whatever is actually behind it */
export function contrastOf(el, win, paperHex) {
  const cs = win.getComputedStyle(el);
  const fg = parseColor(cs.color);
  let bg = null;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = parseColor(win.getComputedStyle(n).backgroundColor);
    if (c && c[3] > 0.5) { bg = c; break; }
    if (n.id === "doc") break;
  }
  bg ||= parseColor(paperHex);
  return fg && bg ? ratio(fg, bg) : null;
}

export const uid = (prefix = "e") => {
  const base = String(prefix).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 14) || "e";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
};
