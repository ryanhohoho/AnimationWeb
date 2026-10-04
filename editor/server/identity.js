// identity.js (server) — checking and writing src/site/identity.js
//
// The "Link & icon" tab sends whole values for the four exports (SITE, PREVIEW,
// CARD, ICON). Each is checked against the shape the site reads -- nothing
// arrives in the file that the build, the router or the bake would choke on --
// and then written ONE PROPERTY AT A TIME as a range edit, so every comment in
// the file stays where it was. Pure: source text in, edits out; plugin.js
// applies them with the rest of a save, and test/sim.test.js checks them.

import { walk } from "./source.js";

export const IDENTITY_FILE = "src/site/identity.js";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const str = (max) => (v) => typeof v === "string" && v.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v);
const num = (lo, hi) => (v) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const bool = (v) => typeof v === "boolean";
const hex = (v) => typeof v === "string" && HEX.test(v);
const oneOf = (...xs) => (v) => xs.includes(v);
const shape = (spec) => (v, path, errs) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) { errs.push(`${path} is not an object`); return; }
  for (const k of Object.keys(v)) if (!(k in spec)) errs.push(`${path}.${k} is not something the site reads`);
  for (const [k, test] of Object.entries(spec)) {
    if (test.length === 3) test(v[k], `${path}.${k}`, errs);
    else if (!test(v[k])) errs.push(`${path}.${k} = ${JSON.stringify(v[k])?.slice(0, 60)} is not allowed there`);
  }
};
const list = (item, max) => (v, path, errs) => {
  if (!Array.isArray(v) || v.length > max) { errs.push(`${path} is not a list of at most ${max}`); return; }
  v.forEach((x, i) => item(x, `${path}[${i}]`, errs));
};

const TEXT = shape({
  text: str(400), font: oneOf("grotesque", "plex", "overpass"), weight: num(100, 900),
  size: num(4, 600), color: hex, x: num(-2400, 3600), y: num(-2400, 3600),
  spacing: num(-50, 200), lineHeight: num(0.5, 4), align: oneOf("left", "center", "right")
});

/** what each export may hold, and nothing else */
export const SPEC = {
  SITE: shape({
    url: (v) => typeof v === "string" && (v === "" || /^https?:\/\/[^\s/"'<>]+$/.test(v)),
    title: str(200), pageTitle: str(200), siteName: str(120), description: str(400), author: str(120)
  }),
  PREVIEW: shape({
    title: str(300), description: str(600), image: oneOf("/og.png", "/og.jpg"),
    imageAlt: str(420), mode: oneOf("design", "upload")
  }),
  CARD: shape({
    background: hex,
    window: shape({ show: bool, x: num(-1200, 2400), y: num(-630, 1260), w: num(0, 2400), h: num(0, 1260),
      fill: hex, ticks: bool, tick: hex }),
    mark: shape({ show: bool, x: num(-1200, 2400), y: num(-630, 1260), cell: num(1, 40), color: hex }),
    texts: list(TEXT, 24)
  }),
  ICON: shape({
    mode: oneOf("grid", "upload"), fg: hex, bg: hex,
    // optional, so an identity.js from before it existed still checks
    clear: (v) => v === undefined || typeof v === "boolean",
    grid: (v) => Array.isArray(v) && v.length === 32 && v.every((r) => typeof r === "string" && /^[.#]{32}$/.test(r))
  })
};

/** every reason `values` cannot be written; empty when it can */
export function checkIdentity(values) {
  const errs = [];
  for (const [name, v] of Object.entries(values || {})) {
    if (!SPEC[name]) { errs.push(`${name} is not part of identity.js`); continue; }
    SPEC[name](v, name, errs);
  }
  return errs;
}

// ── writing a value as source ───────────────────────────────────────────────
const IDENT = /^[A-Za-z_$][\w$]*$/;
const key = (k) => (IDENT.test(k) ? k : JSON.stringify(k));

/** a long sentence as `"…" +\n"…"` at the width the file is written to,
    rather than one 200-column line */
function stringLit(s, indent) {
  const one = JSON.stringify(s);
  if (one.length <= 72 || s.includes("\n")) return one;
  const words = s.split(/(?<= )/);
  const parts = [];
  let cur = "";
  for (const w of words) {
    if (cur && JSON.stringify(cur + w).length > 72) { parts.push(cur); cur = w; } else cur += w;
  }
  if (cur) parts.push(cur);
  return parts.map((p) => JSON.stringify(p)).join(` +\n${indent}  `);
}

/** a value as the JS source identity.js is written in */
export function literal(v, indent = "") {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return stringLit(v, indent);
  if (typeof v !== "object") return JSON.stringify(v);
  const inner = indent + "  ";
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return `[\n${v.map((x) => inner + inline(x)).join(",\n")}\n${indent}]`;
  }
  const flat = inline(v);
  if (flat.length + indent.length <= 110) return flat;
  return `{\n${Object.entries(v).map(([k, x]) => `${inner}${key(k)}: ${literal(x, inner)}`).join(",\n")}\n${indent}}`;
}
/** on one line: a row of the grid, a text block, the window */
function inline(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
  return `{ ${Object.entries(v).map(([k, x]) => `${key(k)}: ${inline(x)}`).join(", ")} }`;
}

/** the object literal `export const NAME = { … }` */
function exportObject(ast, name) {
  let hit = null;
  walk(ast, (n) => {
    if (hit || n.type !== "VariableDeclarator" || n.id?.name !== name) return;
    if (n.init?.type === "ObjectExpression") hit = n.init;
  });
  return hit;
}
const lineIndent = (code, pos) => /[ \t]*$/.exec(code.slice(code.lastIndexOf("\n", pos - 1) + 1, pos))[0];

/**
 * The range edits that turn identity.js into `values`, property by property.
 * Only properties whose value changed are touched (`current` is the module as
 * it is now, imported), so an untouched property keeps its exact spelling --
 * the hand-wrapped description, the comments between the rows.
 */
export function identityEdits(code, ast, values, current) {
  const edits = [];
  for (const [name, next] of Object.entries(values || {})) {
    const obj = exportObject(ast, name);
    if (!obj) throw new Error(`${IDENTITY_FILE} has no export ${name}`);
    for (const [k, v] of Object.entries(next)) {
      if (JSON.stringify(v ?? null) === JSON.stringify(current?.[name]?.[k] ?? null)) continue;
      const p = obj.properties.find((q) => q.type === "Property" && (q.key.name ?? q.key.value) === k);
      if (p) {
        edits.push({ start: p.value.start, end: p.value.end, text: literal(v, lineIndent(code, p.start)) });
      } else {
        // a property the file does not have yet: after the last one
        const last = obj.properties[obj.properties.length - 1];
        const ind = last ? lineIndent(code, last.start) : "  ";
        edits.push({ start: last ? last.end : obj.start + 1, end: last ? last.end : obj.start + 1,
          text: `${last ? "," : ""}\n${ind}${key(k)}: ${literal(v, ind)}` });
      }
    }
  }
  return edits;
}

/** the files in public/ the tab may write or remove, and nothing else */
export const PUBLIC_FILES = new Set(["og.png", "og.jpg", "favicon.svg", "favicon.ico", "favicon-32.png",
  "favicon-192.png", "apple-touch-icon.png"]);
