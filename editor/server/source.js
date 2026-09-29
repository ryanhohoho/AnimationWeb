// source.js — finding a piece of the page in the code that wrote it
//
// Every word on the site is a string somewhere: a literal in content.js, a
// field in projects.js, an argument to renderSheet(), a run of text inside a
// template literal, or plain markup in index.html. When the editor changes a
// word, this is how the server finds that string and writes the new one in
// its place -- through the real AST (Vite's own parser, so no new dependency),
// never through a search that could land in a comment.
//
// THE MATCH IS ON WHAT THE READER SEES. The page does things to a string on the
// way out -- escapes it, binds its last space with &nbsp;, joins a `+`
// concatenation -- so both sides are normalised to the same plain form before
// they are compared: entities decoded, whitespace collapsed, <br /> spelled one
// way. A string used twice (two RCMP rows) is told apart by its position on the
// page, which is the order the renderer walked the source in.

import { parseAst } from "vite";

export const parse = (code) => parseAst(code);

/** depth-first walk with parents */
export function walk(node, fn, parent = null, key = null) {
  if (!node || typeof node.type !== "string") return;
  fn(node, parent, key);
  for (const k of Object.keys(node)) {
    if (k === "start" || k === "end") continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, fn, node, k));
    else if (v && typeof v.type === "string") walk(v, fn, node, k);
  }
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—",
  ndash: "–", middot: "·", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", times: "×" };
export function decode(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m));
}

/** the form both sides are compared in */
export function norm(s) {
  return decode(String(s)
    .replace(/\s+data-e(?:src)?="[^"]*"/g, "")
    .replace(/<br\s*\/?>/gi, "<br>"))
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * THE FORM TWO MARKUPS ARE COMPARED IN when one came out of a browser and the
 * other out of a file. A browser re-writes what it parsed: a bare attribute
 * (`data-route`) comes back as `data-route=""`, single quotes become double,
 * `<br />` becomes `<br>`, a script may have added a class. None of that is a
 * difference in WORDS, and comparing it as if it were was the editor refusing
 * "back to the start" -- which is written in the source exactly as it is on the
 * page -- as "assembled by code". So attributes are not compared at all: a
 * start tag is reduced to its name, and what is left is the tags in order and
 * the words between them. (The element is already pinned by its position in
 * the file, `data-esrc`; this only has to say "and it still reads the same".)
 */
export function canon(s) {
  return norm(String(s)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(\/?)([a-zA-Z][\w-]*)\b(?:"[^"]*"|'[^']*'|[^>"'])*>/g,
      (_, close, name) => `<${close}${name.toLowerCase()}>`));
}

/** the static value of a node, or null if it has any dynamic part */
export function staticValue(n) {
  if (!n) return null;
  if (n.type === "Literal" && typeof n.value === "string") return n.value;
  if (n.type === "TemplateLiteral" && n.expressions.length === 0) return n.quasis[0].value.cooked;
  if (n.type === "BinaryExpression" && n.operator === "+") {
    const a = staticValue(n.left), b = staticValue(n.right);
    return a === null || b === null ? null : a + b;
  }
  return null;
}

/**
 * Every string-valued node that could be text on the page, in source order.
 * A `+` chain is ONE candidate (its parts are not offered separately), and an
 * import path, an object key or a property name is never a candidate.
 */
// Properties whose values are names for CODE, not words for the reader: a
// project's `slug: "iclicker"` is the same string as its `title: "iclicker"`,
// and counting it made the title look like it was written twice.
const CODE_KEYS = new Set(["slug", "id", "key", "href", "url", "src", "srcset", "type", "ink", "inkA",
  "class", "className", "e", "tag", "path", "route", "poster", "on", "node", "hour"]);
const COMPARES = new Set(["==", "===", "!=", "!=="]);

export function stringNodes(ast, { content = false } = {}) {
  const out = [];
  const inChain = new Set();
  walk(ast, (n, parent, key) => {
    if (inChain.has(n)) return;
    if (content) {
      // `content` is asking for WORDS: skip what only ever names or tests something
      if (parent?.type === "Property" && key === "value" && CODE_KEYS.has(parent.key?.name || parent.key?.value)) return;
      if (parent?.type === "BinaryExpression" && COMPARES.has(parent.operator)) return;
      if (parent?.type === "SwitchCase" && key === "test") return;
    }
    if (parent?.type === "ImportDeclaration" || parent?.type === "ExportAllDeclaration" ||
        parent?.type === "ExportNamedDeclaration" && key === "source") return;
    if (parent?.type === "Property" && key === "key") return;
    if (parent?.type === "ImportExpression") return;
    const v = staticValue(n);
    if (v === null) return;
    if (n.type === "BinaryExpression") {
      walk(n, (c) => inChain.add(c));
    }
    out.push({ node: n, value: v, start: n.start, end: n.end });
  });
  return out.sort((a, b) => a.start - b.start);
}

/** the text of a template literal's static pieces, with their offsets */
export function quasis(ast) {
  const out = [];
  walk(ast, (n) => {
    if (n.type === "TemplateLiteral") for (const q of n.quasis) out.push({ start: q.start, end: q.end, tpl: n });
  });
  return out.sort((a, b) => a.start - b.start);
}

// ── writing markup back ──────────────────────────────────────────────────
const TAGS = /(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/;
const tagName = (t) => (t.startsWith("<!--") ? "<!--" : /^<\/?[a-zA-Z][\w-]*/.exec(t)[0].toLowerCase());

/**
 * A changed piece of markup, written back WITHOUT re-writing the parts that
 * did not change. The browser hands back what it serialised -- `data-route=""`
 * for `data-route`, `<br>` for `<br />`, attributes in its own order -- and
 * writing that over the source changed the file's syntax on every edit, in
 * places the person never touched. When the tags are the same tags in the
 * same order (the usual case: only words changed), the ORIGINAL tags are kept
 * exactly and only the text between them is replaced, and text that reads the
 * same keeps its original spelling (`&nbsp;`, its own line breaks). Returns
 * null when the structure itself changed (a word made emphasised, a line
 * break added): the caller then writes the browser's markup.
 */
export function mergeInner(orig, next) {
  const a = orig.split(TAGS), b = next.split(TAGS);
  if (a.length !== b.length) return null;
  let out = "";
  for (let i = 0; i < a.length; i++) {
    if (i % 2) {
      if (tagName(a[i]) !== tagName(b[i])) return null;
      out += a[i];
    } else out += decode(a[i]) === decode(b[i]) ? a[i] : b[i];
  }
  return out;
}

/** attributes the browser wrote as `name=""` that the source writes bare */
const BARE = /\s((?:data-[\w-]+)|autoplay|muted|loop|playsinline|hidden|inert|controls|disabled|async|defer)=""/g;
export const tidyAttrs = (html) => html.replace(BARE, " $1");

// ── writing a string back ────────────────────────────────────────────────
function jsQuote(value, q) {
  return q + value.replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), "\\" + q)
    .replace(/\n/g, "\\n") + q;
}

/** wrap a long string into `"a " +\n  "b"` pieces, the way this repo writes prose */
function wrapConcat(value, q, indent, width = 72) {
  const words = value.split(/(?<= )/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + w).length > width) { lines.push(cur); cur = ""; }
    cur += w;
  }
  if (cur) lines.push(cur);
  return lines.map((l) => jsQuote(l, q)).join(" +\n" + indent);
}

/**
 * Source text to put in place of `cand.node`, carrying `value`.
 * Keeps the node's own kind: a "..." literal stays one, a `...` template stays
 * one, and a `+` chain over several lines is re-wrapped over several lines.
 */
export function literalFor(code, cand, value) {
  const n = cand.node;
  if (n.type === "TemplateLiteral") {
    return "`" + value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
  }
  const first = n.type === "Literal" ? n : (function leftmost(x) { return x.left ? leftmost(x.left) : x; })(n);
  const q = first.raw?.[0] === "'" ? "'" : '"';
  if (n.type === "BinaryExpression") {
    const src = code.slice(n.start, n.end);
    const nl = src.indexOf("\n");
    if (nl >= 0) {
      const indent = /\n([ \t]*)/.exec(src)[1];
      return wrapConcat(value, q, indent);
    }
  }
  return jsQuote(value, q);
}

// ── structure ────────────────────────────────────────────────────────────
/** the innermost node of `type` whose range contains [a, b] */
export function enclosing(ast, a, b, pred) {
  let best = null;
  walk(ast, (n, parent) => {
    if (n.start <= a && n.end >= b && pred(n, parent)) {
      if (!best || n.end - n.start <= best.node.end - best.node.start) best = { node: n, parent };
    }
  });
  return best;
}

/** the array element (and its array) that contains a position */
export function arrayItemAt(ast, pos) {
  let best = null;
  walk(ast, (n) => {
    if (n.type !== "ArrayExpression") return;
    for (const el of n.elements) {
      if (el && el.start <= pos && el.end >= pos) {
        if (!best || el.end - el.start < best.item.end - best.item.start) best = { array: n, item: el };
      }
    }
  });
  return best;
}

/** a `capture({ id: "..." })` call, by the id it was given */
export function captureCall(ast, id) {
  let hit = null;
  walk(ast, (n) => {
    if (hit || n.type !== "CallExpression" || n.callee?.name !== "capture") return;
    const obj = n.arguments[0];
    if (obj?.type !== "ObjectExpression") return;
    const p = obj.properties.find((q) => (q.key?.name || q.key?.value) === "id");
    if (p && staticValue(p.value) === id) hit = { call: n, obj };
  });
  return hit;
}

/** a property of an object literal, by name */
export const prop = (obj, name) =>
  obj.properties.find((q) => q.type === "Property" && (q.key?.name || q.key?.value) === name) || null;

/** the object in an array whose `key` property is `value` (a project, by slug) */
export function objectWith(ast, key, value) {
  let hit = null;
  walk(ast, (n) => {
    if (hit || n.type !== "ObjectExpression") return;
    const p = prop(n, key);
    if (p && staticValue(p.value) === value) hit = n;
  });
  return hit;
}

/** a `const NAME = {...}` object literal */
export function constObject(ast, name) {
  let hit = null;
  walk(ast, (n) => {
    if (hit || n.type !== "VariableDeclarator" || n.id?.name !== name) return;
    if (n.init?.type === "ObjectExpression") hit = n.init;
  });
  return hit;
}

/** the name of the function a position is inside, if it has one */
export function enclosingFunctionName(ast, pos) {
  // innermost first, and past the unnamed ones: a template inside
  // `ROWS.map((e) => ...)` belongs to the function that called map
  const fns = [];
  walk(ast, (n, parent) => {
    if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression" ||
         n.type === "ArrowFunctionExpression") && n.start <= pos && n.end >= pos) fns.push({ n, parent });
  });
  fns.sort((a, b) => (a.n.end - a.n.start) - (b.n.end - b.n.start));
  for (const { n, parent } of fns) {
    if (n.id?.name) return n.id.name;
    if (parent?.type === "VariableDeclarator" && parent.id?.name) return parent.id.name;
  }
  return null;
}

/** the byte range of a whole line or lines, so a removal leaves no blank one */
export function lineRange(code, start, end) {
  let a = start, b = end;
  while (a > 0 && (code[a - 1] === " " || code[a - 1] === "\t")) a--;
  if (code[a - 1] === "\n") {
    let c = b;
    while (c < code.length && (code[c] === " " || code[c] === "\t")) c++;
    if (code[c] === "\n" || c === code.length) return [a, c + (code[c] === "\n" ? 1 : 0)];
  }
  return [start, end];
}

/** the indentation of the line a position is on */
export function indentAt(code, pos) {
  const ls = code.lastIndexOf("\n", pos - 1) + 1;
  return /^[ \t]*/.exec(code.slice(ls))[0];
}
