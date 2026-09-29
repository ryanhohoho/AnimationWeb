// identity.js — what a thing on the page IS, and how to find it again
//
// Four kinds, each with the properties it needs:
//   text   a block of words: size, weight, tracking, leading, case, alignment,
//          colour, and the width of its box (which is where it breaks lines)
//   media  a picture or a clip (a figure, or a project card's picture): replace,
//          fit, focal point, shape
//   hole   a die-cut onto the sky: where it is and how big
//   box    anything that holds other things: position, size, gap, fill
//
// A LOCATOR is how an edit finds its element again after the page is
// re-rendered -- which the router does on every visit -- without holding a
// reference to a node that no longer exists (the same rule deck.js follows:
// key on the element, never on a record, and here not even on the element).

export const TYPES = ["text", "media", "hole", "box"];

/** why something cannot be edited, or null */
export function lockReason(el) {
  if (!el || el.nodeType !== 1) return "nothing";
  if (el.closest("#chrome")) return "The nav bar is locked, like the rest of the fixed chrome.";
  if (el.closest("#stage")) return "Mew is locked.";
  if (el.closest("#sheet, #eat")) return "The sky is locked.";
  if (el.closest("[data-usb-stage]")) return "FIG. 2 is locked. Its backlight colours are in the panel with nothing selected.";
  if (!el.closest("#doc")) return "Only the page itself can be edited.";
  if (el.closest(".sr")) return "Screen-reader text is not visible.";
  return null;
}

const INLINE = new Set(["inline", "contents"]);

export function isTextLeaf(el, win) {
  if (!el || el.nodeType !== 1) return false;
  if (el.matches("img, video, svg, canvas, iframe, [data-ap], [data-icon-ap], ul, ol, dl")) return false;
  let words = false;
  for (const n of el.childNodes) {
    if (n.nodeType === 3 && n.textContent.trim()) words = true;
    else if (n.nodeType === 1) {
      const d = win.getComputedStyle(n).display;
      if (!INLINE.has(d) && !(n.tagName === "BR")) return false;
      if (n.textContent.trim()) words = true;
    }
  }
  return words;
}

/**
 * The thing a click on `raw` means: the figure rather than its <img>, the
 * card's picture rather than one of its four layers, the paragraph rather than
 * the <em> inside it.
 */
/**
 * A text block made of several inline pieces with nothing but a separator
 * between them ("BLENDER · 2026": two spans and a dot). Each piece is its own
 * string in the source; the block is put together by code, so the block cannot
 * be written back and the pieces can. A click should therefore stop at the
 * piece, not climb to the block.
 */
export function isComposite(el) {
  let pieces = 0, sep = false;
  for (const n of el.childNodes) {
    if (n.nodeType === 1) { if (n.tagName !== "BR") pieces++; }
    else if (n.nodeType === 3) {
      if (/[\p{L}\p{N}]/u.test(n.textContent)) return false;
      if (n.textContent.trim()) sep = true;
    }
  }
  // (two <em> with only a space between them are still one sentence)
  return pieces >= 2 && sep;
}

export function selectable(raw, win) {
  if (!raw || raw.nodeType !== 1) return null;
  let el = raw.closest("svg") || raw;
  const card = el.closest(".pcard-media");
  if (card) return card;
  const fig = el.closest("figure.fig");
  if (fig) return fig;
  while (el.parentElement && el.id !== "doc" &&
         INLINE.has(win.getComputedStyle(el).display) && isTextLeaf(el.parentElement, win) &&
         !isComposite(el.parentElement)) {
    el = el.parentElement;
  }
  return el;
}

export function kindOf(el, win) {
  if (el.matches("[data-ap]")) return "hole";
  if (el.matches(".pcard-media, figure.fig, img, video")) return "media";
  if (isTextLeaf(el, win)) return "text";
  return "box";
}

export function nameOf(el, win) {
  const k = kindOf(el, win);
  if (k === "text") {
    const t = el.textContent.replace(/\s+/g, " ").trim();
    return t.length > 34 ? t.slice(0, 33) + "…" : t;
  }
  if (el.matches(".pcard-media")) return "project card picture";
  if (el.matches("figure.fig")) return "figure";
  if (el.matches("[data-round]")) return "lens";
  if (k === "hole") return "hole";
  if (el.matches("section")) return `section ${el.id ? "#" + el.id : ""}`.trim();
  const cls = [...el.classList].filter((c) => !STATE.has(c))[0];
  return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
}

// classes the site toggles at runtime; never part of a selector
export const STATE = new Set(["on", "done", "deep", "hit", "has", "unset", "crossing", "sel"]);
export const classesOf = (el) => [...el.classList].filter((c) => !STATE.has(c) && !c.startsWith("__ed"));

// ── locators ───────────────────────────────────────────────────────────────
export function locate(el, doc) {
  if (el.dataset.e) return { e: el.dataset.e };
  if (el.dataset.esrc) {
    const same = [...doc.querySelectorAll(`[data-esrc="${el.dataset.esrc}"]`)];
    return { esrc: el.dataset.esrc, idx: same.indexOf(el) };
  }
  // no mark of its own: a path down from the nearest thing that has one
  const path = [];
  let n = el;
  while (n && !n.dataset.e && !n.dataset.esrc && n.id !== "doc") {
    path.unshift([...n.parentElement.children].indexOf(n));
    n = n.parentElement;
  }
  if (!n || n.id === "doc") return { path, root: "doc" };
  return { ...locate(n, doc), path };
}

export function find(loc, doc) {
  if (!loc) return null;
  let base = null;
  if (loc.e) base = doc.querySelector(`[data-e="${loc.e}"]`);
  else if (loc.esrc) base = doc.querySelectorAll(`[data-esrc="${loc.esrc}"]`)[loc.idx] || null;
  else if (loc.root === "doc") base = doc.getElementById("doc");
  if (!base) return null;
  let n = base;
  for (const i of loc.path || []) { n = n?.children[i]; if (!n) return null; }
  return n;
}

export const locKey = (loc) => JSON.stringify(loc);

/** how many elements on this page came from the same place in the source */
export const repeats = (el, doc) =>
  el.dataset.esrc ? doc.querySelectorAll(`[data-esrc="${el.dataset.esrc}"]`).length : 0;

/** the normalised words of every text leaf inside an element, for tracing it to data */
export function leafTexts(el, win) {
  const out = [];
  const walk = (n) => {
    for (const c of n.children) {
      if (isTextLeaf(c, win)) out.push(cleanHTML(c.innerHTML));
      else walk(c);
    }
  };
  if (isTextLeaf(el, win)) out.push(cleanHTML(el.innerHTML));
  walk(el);
  return out;
}

/** markup as it should be written to a file: no editor marks in it */
export function cleanHTML(html) {
  return html
    .replace(/\s+data-esrc="[^"]*"/g, "")
    .replace(/\s+data-ed-new(="[^"]*")?/g, "")
    .replace(/\s+contenteditable="[^"]*"/g, "")
    .replace(/\s+spellcheck="[^"]*"/g, "");
}

export const norm = (s) => {
  const t = document.createElement("textarea");
  t.innerHTML = s.replace(/<br\s*\/?>/gi, "<br>");
  return t.value.replace(/ /g, " ").replace(/\s+/g, " ").trim();
};
