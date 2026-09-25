// html.js — where every tag is, in the SOURCE text
//
// The editor writes changes back into the files the page is made from:
// index.html, and the template literals in src/site/pages/*.js. To do that it
// has to know, for an element on screen, where its markup starts and ends in
// the file. A DOM parser throws the offsets away, so this is a small scanner
// that keeps them.
//
// It is not a full HTML parser and does not need to be. It reads the markup
// this site actually writes: comments, start and end tags with quoted
// attributes, void elements, and -- inside a JS template -- `${...}`
// expressions, which it steps over as opaque text.

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr", "path"]);
// `path` is not void in HTML, but every <path> this site writes is inside an
// <svg> and self-closes with `/>`, which is handled below anyway.

const RAW = new Set(["script", "style", "noscript"]);

/** skip a `${ ... }` starting at i (pointing at `$`); returns the index after `}` */
function skipExpr(s, i) {
  let depth = 0, j = i + 1;
  for (; j < s.length; j++) {
    const c = s[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return j + 1; }
    else if (c === "`") {
      // a nested template: walk to its closing backtick, stepping over its
      // own expressions
      j++;
      while (j < s.length && s[j] !== "`") {
        if (s[j] === "\\") j++;
        else if (s[j] === "$" && s[j + 1] === "{") { j = skipExpr(s, j) - 1; }
        j++;
      }
    } else if (c === '"' || c === "'") {
      const q = c; j++;
      while (j < s.length && s[j] !== q) { if (s[j] === "\\") j++; j++; }
    }
  }
  return s.length;
}

/**
 * Every start tag in s[from, to), in order.
 * @returns [{ tag, start, nameEnd, openEnd, selfClose }]
 *   start: index of `<`; nameEnd: index just after the tag name (where an
 *   attribute can be inserted); openEnd: index just after `>`.
 */
export function startTags(s, from = 0, to = s.length, { js = false } = {}) {
  const out = [];
  let i = from;
  while (i < to) {
    if (js && s[i] === "$" && s[i + 1] === "{") { i = skipExpr(s, i); continue; }
    if (s.startsWith("<!--", i)) {
      const e = s.indexOf("-->", i + 4);
      i = e < 0 ? to : e + 3;
      continue;
    }
    if (s[i] === "<" && /[a-zA-Z]/.test(s[i + 1] || "")) {
      const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(s.slice(i, i + 40));
      const tag = m[1].toLowerCase();
      const nameEnd = i + m[0].length;
      // walk to the end of the tag, respecting quotes and expressions
      let j = nameEnd, q = "";
      for (; j < to; j++) {
        const c = s[j];
        if (q) { if (c === q) q = ""; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if (js && c === "$" && s[j + 1] === "{") { j = skipExpr(s, j) - 1; continue; }
        if (c === ">") break;
      }
      const selfClose = s[j - 1] === "/";
      out.push({ tag, start: i, nameEnd, openEnd: j + 1, selfClose });
      i = j + 1;
      if (RAW.has(tag)) {
        const close = s.toLowerCase().indexOf(`</${tag}`, i);
        i = close < 0 ? to : close;
      }
      continue;
    }
    i++;
  }
  return out;
}

/**
 * The full extent of the element whose `<` is at `start`.
 * @returns { tag, start, openEnd, closeStart, end } -- closeStart is where the
 *   end tag begins (== openEnd for a void element), end is just after it.
 */
export function elementAt(s, start, { js = false } = {}) {
  const first = startTags(s, start, Math.min(s.length, start + 4000), { js })[0];
  if (!first || first.start !== start) return null;
  if (first.selfClose || VOID.has(first.tag)) {
    return { tag: first.tag, start, openEnd: first.openEnd, closeStart: first.openEnd, end: first.openEnd };
  }
  // count nesting of the SAME tag name; other tags cannot close this one
  let depth = 1, i = first.openEnd;
  const open = new RegExp(`<${first.tag}(?=[\\s>/])`, "gi");
  const close = new RegExp(`</${first.tag}\\s*>`, "gi");
  while (i < s.length) {
    if (s.startsWith("<!--", i)) { const e = s.indexOf("-->", i + 4); i = e < 0 ? s.length : e + 3; continue; }
    if (js && s[i] === "$" && s[i + 1] === "{") { i = skipExpr(s, i); continue; }
    open.lastIndex = i; close.lastIndex = i;
    const mo = open.exec(s), mc = close.exec(s);
    if (mo && mo.index === i) { depth++; i += mo[0].length; continue; }
    if (mc && mc.index === i) {
      depth--;
      if (depth === 0) return { tag: first.tag, start, openEnd: first.openEnd, closeStart: i, end: i + mc[0].length };
      i += mc[0].length; continue;
    }
    i++;
  }
  return null;
}

/** the byte ranges of a file that hold markup: all of it, minus <head> */
export function bodyRange(html) {
  const b = html.search(/<body[\s>]/i);
  return [b < 0 ? 0 : b, html.length];
}
