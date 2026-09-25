// plugin.js — the editor's half of the dev server
//
// `npm run edit` runs the REAL site (same vite config, same modules, same
// press, same animal) with this plugin added. It does four things, and none of
// them reach a production build -- this file is only ever loaded by
// editor/vite.editor.config.js:
//
//   1. MARKS WHERE THINGS CAME FROM. Every start tag in index.html and in the
//      template literals of src/site/pages*.js gets `data-esrc="file:offset"`
//      on the way to the browser -- the offset of its `<` in the file on disk.
//      That is how a click on the page becomes a place in the code.
//   2. ANSWERS "WHERE IS THIS TEXT" (/__ed/resolve) so the inspector can say
//      which file a word lives in before you change it, or why it cannot.
//   3. TAKES UPLOADS into node_modules/.editor-staging -- ignored by git and
//      invisible to the site -- so a replaced picture previews before it is
//      saved.
//   4. SAVES (/__ed/save): every change becomes a range edit against the file
//      as it was when the page was built, all of them are checked first, and
//      then all of them are written. Nothing is half-saved. Then `npm test`
//      runs and its output streams back to the editor (/__ed/events).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync,
  copyFileSync, statSync, rmSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { startTags, elementAt, bodyRange } from "./html.js";
import * as S from "./source.js";
import * as M from "./media.js";

const ROOT = process.cwd();
const R = (p) => join(ROOT, p);
const MEDIA = "src/assets/media";
const STAGE = R("node_modules/.editor-staging");
const EDITS = "src/styles/edits.css";

const read = (f) => readFileSync(R(f), "utf8");

// which files carry markup worth marking. media.js is deliberately NOT here:
// its figure template is shared by every capture on every sheet, so a mark in
// it could not tell two figures apart. A figure gets its identity through
// capture({ e }) instead (see setCaptureId below).
const MARKED = /\/src\/site\/(pages\/[a-z0-9-]+|pages)\.js$/;

/** the files a route's words can live in, in the order the renderer reads them */
function filesFor(page) {
  if (page === "home") return ["index.html"];
  if (page === "experience" || page === "contact") return ["src/site/content.js", "src/site/pages/deck.js"];
  if (page === "projects") return ["src/site/projects.js", "src/site/pages/deck.js"];
  if (page?.startsWith("project:")) {
    const slug = page.slice(8);
    const own = `src/site/pages/${slug}.js`;
    return [...(existsSync(R(own)) ? [own] : []), "src/site/projects.js",
      "src/site/pages/sheet.js", "src/site/pages.js", "src/site/media.js"];
  }
  return ["src/site/pages.js"];
}

// the file text each page was BUILT from. An offset in data-esrc is only true of
// that exact text, so a save checks the disk still holds it.
const seen = new Map();

function mark(code, file, ranges, js) {
  const ins = [];
  for (const [a, b] of ranges) {
    for (const t of startTags(code, a, b, { js })) {
      if (t.tag === "script" || t.tag === "noscript" || t.tag === "style") continue;
      ins.push([t.nameEnd, ` data-esrc="${file}:${t.start}"`]);
    }
  }
  ins.sort((x, y) => y[0] - x[0]);
  let out = code;
  for (const [at, s] of ins) out = out.slice(0, at) + s + out.slice(at);
  return out;
}

// ── resolving ──────────────────────────────────────────────────────────────
function parseEsrc(esrc) {
  const i = esrc.lastIndexOf(":");
  return { file: esrc.slice(0, i), off: +esrc.slice(i + 1) };
}

/** how many places call the function a template is in -- 3 means three pages */
function sharedBy(file, off) {
  if (!file.endsWith(".js")) return 1;
  const code = read(file);
  const name = S.enclosingFunctionName(S.parse(code), off);
  if (!name || name === "html") return 1;
  let n = 0;
  const walkDir = (d) => {
    for (const f of readdirSync(R(d))) {
      const p = `${d}/${f}`;
      if (statSync(R(p)).isDirectory()) walkDir(p);
      else if (p.endsWith(".js")) {
        const src = read(p);
        n += (src.match(new RegExp(`\\b${name}\\(`, "g")) || []).length;
        n -= (src.match(new RegExp(`function\\s+${name}\\(`, "g")) || []).length;
      }
    }
  };
  walkDir("src/site");
  return Math.max(1, n);
}

/** a readable name for where a string lives: "content.js › EXPERIENCE › what" */
function labelFor(file, ast, pos) {
  const parts = [basename(file)];
  const decl = S.enclosing(ast, pos, pos, (n) => n.type === "VariableDeclarator");
  if (decl?.node.id?.name) parts.push(decl.node.id.name);
  const fn = S.enclosingFunctionName(ast, pos);
  if (!decl && fn) parts.push(`${fn}()`);
  const p = S.enclosing(ast, pos, pos, (n) => n.type === "Property");
  const k = p?.node.key?.name || p?.node.key?.value;
  if (k) parts.push(k);
  return parts.join(" › ");
}

function resolveData(page, target, nth, same) {
  const want = S.norm(target);
  const hits = [];
  for (const file of filesFor(page)) {
    if (!file.endsWith(".js") || !existsSync(R(file))) continue;
    const code = read(file);
    const ast = S.parse(code);
    for (const c of S.stringNodes(ast)) {
      if (S.norm(c.value) === want) hits.push({ file, code, ast, c });
    }
  }
  let pick = null;
  if (hits.length === 1) pick = hits[0];
  else if (hits.length > 1 && hits.length === same) pick = hits[nth];
  if (!pick) {
    return { ok: false, reason: hits.length
      ? `This text appears ${hits.length} times in the source and ${same} times on the page, so the editor cannot tell which one this is.`
      : "This text is assembled by code rather than written as one string, so it cannot be edited here." };
  }
  const { file, ast, c } = pick;
  return {
    ok: true, kind: "data", file, start: c.start, end: c.end, orig: c.value,
    form: /<[a-z]/i.test(c.value) ? "html" : "text",
    label: labelFor(file, ast, c.start),
    reusedOnPage: hits.length === 1 && same > 1 ? same : 1
  };
}

function resolveText({ page, esrc, count, html, nth, same }) {
  if (esrc) {
    const { file, off } = parseEsrc(esrc);
    const code = read(file);
    const el = elementAt(code, off, { js: file.endsWith(".js") });
    if (el) {
      const inner = code.slice(el.openEnd, el.closeStart);
      if (!inner.includes("${") && S.norm(inner) === S.norm(html)) {
        return {
          ok: true, kind: "static", file, start: el.openEnd, end: el.closeStart, orig: inner,
          form: "html", label: `${basename(file)} › <${el.tag}>`,
          sharedBy: sharedBy(file, off), repeated: count
        };
      }
    }
  }
  return resolveData(page, html, nth, same);
}

function resolveHref({ page, esrc, href }) {
  for (const file of filesFor(page)) {
    if (!file.endsWith(".js")) continue;
    const code = read(file);
    const ast = S.parse(code);
    const hits = S.stringNodes(ast).filter((c) => c.value === href);
    if (hits.length === 1) {
      return { ok: true, kind: "data", file, start: hits[0].start, end: hits[0].end, orig: href,
               label: labelFor(file, ast, hits[0].start) };
    }
  }
  if (esrc) {
    const { file, off } = parseEsrc(esrc);
    const code = read(file);
    const t = startTags(code, off, off + 2000, { js: file.endsWith(".js") })[0];
    const tag = t && code.slice(t.start, t.openEnd);
    const m = tag && /\shref="([^"$]*)"/.exec(tag);
    if (m && m[1] === href) {
      const s = t.start + m.index + 7;
      return { ok: true, kind: "static", file, start: s, end: s + href.length, orig: href,
               label: `${basename(file)} › href` };
    }
  }
  return { ok: false, reason: "This link's address is built by code, so it cannot be edited here." };
}

// ── saving ─────────────────────────────────────────────────────────────────
// Every change is { file, start, end, text } against the ORIGINAL file. They
// are applied from the end of the file backwards so no offset moves under
// another; an edit wholly inside a deletion is dropped (you edited a word and
// then deleted its paragraph); a partial overlap is a real conflict.
class Batch {
  constructor() { this.edits = new Map(); this.errors = []; this.seq = 0; }
  add(file, start, end, text) {
    (this.edits.get(file) || this.edits.set(file, []).get(file))
      .push({ start, end, text, seq: this.seq++ });
  }
  apply(file, code) {
    const list = this.edits.get(file) || [];
    // an edit wholly inside something that was deleted has nothing left to edit
    const dels = list.filter((e) => e.text === "" && e.end > e.start);
    const inside = (e, d) => d !== e && d.start <= e.start && e.end <= d.end &&
      !(e.start === e.end && (e.start === d.start || e.start === d.end));
    const keep = list.filter((e) => !dels.some((d) => inside(e, d)));
    // back to front, so no offset moves under a later edit; at one position,
    // inserts land in the order they were made
    keep.sort((a, b) => b.start - a.start || b.end - a.end || b.seq - a.seq);
    for (let i = 1; i < keep.length; i++) {
      if (keep[i].end > keep[i - 1].start) {
        throw new Error(`${file}: two changes overlap near offset ${keep[i - 1].start}`);
      }
    }
    let out = code;
    for (const e of keep) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    return out;
  }
}

const escTpl = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

/** wrap prose markup to the line width the source already used */
function wrapLike(orig, html) {
  if (!orig.includes("\n") || /<[a-z]+\s/i.test(html)) return html;
  const m = /\n([ \t]+)\S/.exec(orig);
  const indent = m ? m[1] : "  ";
  const lead = /^\s*/.exec(orig)[0], tail = /\s*$/.exec(orig)[0];
  const words = html.split(" ");
  const lines = []; let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > 74) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lead + lines.join("\n" + indent) + tail;
}

function mediaFiles(id) {
  if (!existsSync(R(MEDIA))) return [];
  return readdirSync(R(MEDIA)).filter((f) => f.replace(/\.[^.]+$/, "") === id);
}

const tracked = (p) => {
  try { execFileSync("git", ["ls-files", "--error-unmatch", p], { cwd: ROOT, stdio: "ignore" }); return true; }
  catch { return false; }
};
/** remove a superseded file: git keeps a tracked one; an untracked one is kept aside */
function retire(p, moves) {
  if (tracked(p)) moves.push({ del: R(p) });
  else moves.push({ from: R(p), to: join(STAGE, `retired-${Date.now()}-${basename(p)}`) });
}

function ensureCaptureImport(batch, file, code, ast) {
  if (/import\s*\{[^}]*\bcapture\b[^}]*\}\s*from\s*["'][^"']*media\.js["']/.test(code)) return;
  const imports = ast.body.filter((n) => n.type === "ImportDeclaration");
  const rel = file.startsWith("src/site/pages/") ? "../media.js" : "./media.js";
  const at = imports.length ? imports[imports.length - 1].end : 0;
  batch.add(file, at, at, `\nimport { capture } from "${rel}";`);
}

/**
 * Turn the editor's changes into a Batch, encoding media into staging as it
 * goes. Nothing outside node_modules/.editor-staging is touched here.
 */
function plan(body) {
  const batch = new Batch();
  const moves = [];     // { from, to } or { del } -- applied only if the plan holds
  const warnings = [];
  const runAfter = [];  // tools to run once the files are in place
  const cache = new Map();
  const src = (f) => {
    if (!cache.has(f)) { const code = read(f); cache.set(f, { code, ast: f.endsWith(".js") ? S.parse(code) : null }); }
    return cache.get(f);
  };
  const needSeen = new Set();

  for (const op of body.ops || []) {
    try {
      switch (op.type) {
        case "text": {
          // a string in a JS file, found again by its value if it moved
          const { code, ast } = src(op.file);
          let cand = S.stringNodes(ast).find((c) => c.start === op.start && c.end === op.end && c.value === op.orig);
          if (!cand) {
            const all = S.stringNodes(ast).filter((c) => c.value === op.orig);
            if (all.length !== 1) throw new Error(`"${op.orig.slice(0, 40)}…" is no longer in ${op.file}`);
            cand = all[0];
          }
          batch.add(op.file, cand.start, cand.end, S.literalFor(code, cand, op.value));
          break;
        }
        case "inner": {
          // markup between an element's tags, in index.html or a template
          const { code } = src(op.file);
          needSeen.add(op.file);
          if (code.slice(op.start, op.end) !== op.orig) throw new Error(`${op.file} changed under this text`);
          const v = op.file.endsWith(".js") ? escTpl(op.value) : op.value;
          batch.add(op.file, op.start, op.end, wrapLike(op.orig, v));
          break;
        }
        case "attr": {
          const { code } = src(op.file);
          needSeen.add(op.file);
          if (code.slice(op.start, op.end) !== op.orig) throw new Error(`${op.file} changed under this link`);
          batch.add(op.file, op.start, op.end, op.value.replace(/"/g, "&quot;"));
          break;
        }
        case "setId": {
          const { file, off } = parseEsrc(op.esrc);
          const { code } = src(file);
          needSeen.add(file);
          const t = startTags(code, off, off + 4000, { js: file.endsWith(".js") })[0];
          if (!t || t.start !== off) throw new Error(`${file} changed; reload the editor`);
          batch.add(file, t.nameEnd, t.nameEnd, ` data-e="${op.id}"`);
          break;
        }
        case "setCaptureId": {
          for (const file of filesFor(op.page)) {
            if (!file.endsWith(".js")) continue;
            const { ast } = src(file);
            const hit = S.captureCall(ast, op.captureId);
            if (!hit) continue;
            const last = hit.obj.properties[hit.obj.properties.length - 1];
            batch.add(file, last.end, last.end, `, e: "${op.id}"`);
            break;
          }
          break;
        }
        case "delete":
        case "duplicate": {
          if (op.count === 1 && op.esrc) {
            const { file, off } = parseEsrc(op.esrc);
            const { code } = src(file);
            needSeen.add(file);
            const el = elementAt(code, off, { js: file.endsWith(".js") });
            if (!el) throw new Error(`${file} changed; reload the editor`);
            if (op.type === "delete") {
              const [a, b] = S.lineRange(code, el.start, el.end);
              batch.add(file, a, b, "");
            } else {
              let copy = code.slice(el.start, el.end).replace(/^(<[a-zA-Z][\w-]*)\s+data-e="[^"]*"/, "$1");
              if (op.newId) copy = copy.replace(/^<([a-zA-Z][\w-]*)/, `<$1 data-e="${op.newId}"`);
              batch.add(file, el.end, el.end, "\n" + S.indentAt(code, el.start) + copy);
            }
          } else {
            // a repeated element: it is one item of a list in the data
            let done = false;
            for (const probe of op.texts || []) {
              const r = resolveData(op.page, probe, 0, 1);
              if (!r.ok) continue;
              const { code, ast } = src(r.file);
              const it = S.arrayItemAt(ast, r.start);
              if (!it) continue;
              const els = it.array.elements;
              const i = els.indexOf(it.item);
              if (op.type === "delete") {
                if (els.length === 1) throw new Error("the last item of a list cannot be deleted here");
                if (i < els.length - 1) batch.add(r.file, it.item.start, els[i + 1].start, "");
                else batch.add(r.file, els[i - 1].end, it.item.end, "");
              } else {
                const text = code.slice(it.item.start, it.item.end);
                batch.add(r.file, it.item.end, it.item.end, ",\n" + S.indentAt(code, it.item.start) + text);
              }
              done = true;
              break;
            }
            if (!done) throw new Error("this repeated element could not be traced to a list in the source");
          }
          break;
        }
        case "insert": {
          const { file, off } = parseEsrc(op.anchor);
          const { code, ast } = src(file);
          needSeen.add(file);
          const el = elementAt(code, off, { js: file.endsWith(".js") });
          if (!el) throw new Error(`${file} changed; reload the editor`);
          const js = file.endsWith(".js");
          let markup;
          if (op.kind === "figure") {
            const m = op.media;
            if (!m?.staged) throw new Error("a new figure needs a picture or a clip");
            const out = encodeInto(m.staged, m.id, null, moves, warnings);
            if (js) {
              ensureCaptureImport(batch, file, code, ast);
              markup = `\${capture({ id: "${m.id}", e: "${op.id}", ratio: "${out.ratio.toFixed(4)}", alt: ${JSON.stringify(op.alt || "")} })}`;
            } else {
              const tag = out.video
                ? `<video src="/${MEDIA}/${m.id}.mp4" poster="/${MEDIA}/${m.id}-still.webp" autoplay muted loop playsinline preload="metadata"></video>`
                : `<img src="/${MEDIA}/${m.id}.webp" alt="${(op.alt || "").replace(/"/g, "&quot;")}" loading="lazy" decoding="async" />`;
              markup = `<figure class="fig has" data-e="${op.id}" style="--ratio:${out.ratio.toFixed(4)}"><div class="fig-in">${tag}</div></figure>`;
            }
          } else {
            markup = js ? escTpl(op.html) : op.html;
          }
          const at = op.inside ? el.closeStart : el.end;
          batch.add(file, at, at, "\n" + S.indentAt(code, el.start) + (op.inside ? "  " : "") + markup);
          break;
        }
        case "media": {
          mediaOp(op, batch, src, moves, warnings, runAfter);
          break;
        }
        default:
          throw new Error(`unknown change: ${op.type}`);
      }
    } catch (e) {
      batch.errors.push(e.message);
    }
  }

  // ── the colours ─────────────────────────────────────────────────────────
  if (body.palette) {
    const f = "src/site/palette.js";
    const { code, ast } = src(f);
    const obj = S.constObject(ast, "PALETTE");
    for (const k of ["paper", "homeInkA", "homeInkB"]) {
      const p = obj && S.prop(obj, k);
      if (p && body.palette[k] && S.staticValue(p.value) !== body.palette[k]) {
        batch.add(f, p.value.start, p.value.end, `"${body.palette[k].toUpperCase()}"`);
      }
    }
  }
  if (body.tokens) {
    const css = read("src/styles/site.css");
    for (const [tok, v] of Object.entries(body.tokens)) {
      const re = new RegExp(`(${tok}:\\s*)(#[0-9A-Fa-f]{6})`);
      const m = re.exec(css);
      if (m && m[2].toUpperCase() !== v.toUpperCase()) {
        const s = m.index + m[1].length;
        batch.add("src/styles/site.css", s, s + 7, v.toUpperCase());
      }
    }
    if (body.tokens["--paper"]) {
      const html = read("index.html");
      const m = /(<meta name="theme-color" content=")(#[0-9A-Fa-f]{6})/.exec(html);
      if (m && m[2].toUpperCase() !== body.tokens["--paper"].toUpperCase()) {
        const s = m.index + m[1].length;
        batch.add("index.html", s, s + 7, body.tokens["--paper"].toUpperCase());
      }
    }
  }
  if (body.projectInks) {
    const f = "src/site/projects.js";
    const { ast } = src(f);
    for (const [slug, pair] of Object.entries(body.projectInks)) {
      const obj = S.objectWith(ast, "slug", slug);
      if (!obj) { batch.errors.push(`no project "${slug}" in projects.js`); continue; }
      for (const k of ["inkA", "ink"]) {
        const p = S.prop(obj, k);
        if (p && pair[k] && S.staticValue(p.value) !== pair[k]) {
          batch.add(f, p.value.start, p.value.end, `"${pair[k].toUpperCase()}"`);
        }
      }
    }
  }

  // every offset from data-esrc is only true of the text the page was built from
  for (const f of needSeen) {
    if (seen.has(f) && seen.get(f) !== src(f).code) {
      batch.errors.push(`${f} changed on disk after the editor loaded it. Reload the editor and make the change again.`);
    }
  }
  return { batch, moves, warnings, runAfter, src };
}

/** encode a staged upload as media id `id`; returns what it made */
function encodeInto(staged, id, slot, moves, warnings) {
  const file = join(STAGE, staged);
  if (!existsSync(file)) throw new Error("the uploaded file is gone from staging; upload it again");
  const d = M.probe(file);
  const old = slot?.oldFile ? M.slotShape(R(slot.oldFile)) : null;
  const out = join(STAGE, `out-${randomUUID()}`);
  mkdirSync(out, { recursive: true });
  let res;
  if (d.video) {
    res = M.encodeClip(file, join(out, `${id}.mp4`), join(out, `${id}-still.webp`),
      { width: old?.w || slot?.width || 640, fps: old?.fps || 20 });
    moves.push({ from: res.file, to: R(`${MEDIA}/${id}.mp4`) });
    if (!slot?.noPoster) moves.push({ from: res.poster, to: R(`${MEDIA}/${id}-still.webp`) });
    if (res.over) warnings.push(`${id}: the clip is ${(res.bytes / 1024) | 0} KB, over the ${(M.CAP.motion / 1024) | 0} KB budget (${res.seconds.toFixed(1)} s long)`);
  } else {
    res = M.encodeStill(file, join(out, `${id}.webp`), old?.w || slot?.width || 1400);
    moves.push({ from: res.file, to: R(`${MEDIA}/${id}.webp`) });
    if (res.over) warnings.push(`${id}: the picture is ${(res.bytes / 1024) | 0} KB, over the ${(M.CAP.still / 1024) | 0} KB budget`);
  }
  return { ...res, video: d.video };
}

function mediaOp(op, batch, src, moves, warnings, runAfter) {
  const staged = join(STAGE, op.staged);
  if (!existsSync(staged)) throw new Error("the uploaded file is gone from staging; upload it again");
  const isVideo = M.probe(staged).video;

  if (op.slot === "card-still" || op.slot === "card-video") {
    const want = op.slot === "card-video";
    if (isVideo !== want) throw new Error(want ? "the hover slot takes a clip, not a picture" : "the resting slot takes a picture, not a clip");
    const id = `card-${op.slug}`;
    const oldFile = mediaFiles(id).find((f) => want ? /\.(mp4|webm)$/.test(f) : /\.(webp|png|jpe?g)$/.test(f));
    encodeInto(op.staged, id, { oldFile: oldFile && `${MEDIA}/${oldFile}`, width: want ? 640 : 960, noPoster: true }, moves, warnings);
    // a card still in another format would shadow the new webp in content.js's pick()
    if (oldFile && !/\.(webp|mp4)$/.test(oldFile)) retire(`${MEDIA}/${oldFile}`, moves);
    return;
  }

  if (op.slot === "icon") {
    if (isVideo) throw new Error("an icon takes a picture, not a clip");
    const ext = extname(op.name || staged).toLowerCase() || ".png";
    const to = `tools/icons/icon-${op.slug}${ext}`;
    const tool = read("tools/bake_icons.mjs");
    const re = new RegExp(`(slug:\\s*"${op.slug}",\\s*src:\\s*")([^"]+)(")`);
    const m = re.exec(tool);
    if (!m) throw new Error(`tools/bake_icons.mjs has no cell for "${op.slug}"`);
    if (m[2] !== to) {
      const s = m.index + m[1].length;
      batch.add("tools/bake_icons.mjs", s, s + m[2].length, to);
      if (existsSync(R(m[2]))) retire(m[2], moves);
    }
    moves.push({ copy: staged, to: R(to) });
    // if the bake refuses the new drawing (it checks that a mark survives the
    // key), the icon source and the tool's cell are put back exactly as they
    // were -- a source that no longer matches the baked atlas is the stale
    // atlas the tests exist to catch
    const rollback = [{ path: R("tools/bake_icons.mjs"), content: read("tools/bake_icons.mjs") },
      { path: R(to), content: existsSync(R(to)) ? readFileSync(R(to)) : null }];
    if (m[2] !== to && existsSync(R(m[2]))) rollback.push({ path: R(m[2]), content: readFileSync(R(m[2])) });
    runAfter.push(["node", ["tools/bake_icons.mjs"], rollback]);
    return;
  }

  if (op.slot === "capture" || op.slot === "file") {
    const id = op.id;
    const olds = mediaFiles(id).concat(mediaFiles(`${id}-still`));
    const oldMain = mediaFiles(id)[0];
    const res = encodeInto(op.staged, id, { oldFile: oldMain && `${MEDIA}/${oldMain}` }, moves, warnings);
    const keep = new Set(res.video ? [`${id}.mp4`, `${id}-still.webp`] : [`${id}.webp`]);
    for (const f of olds) if (!keep.has(f)) retire(`${MEDIA}/${f}`, moves);
    if (op.slot === "capture") {
      // the figure's box takes the new picture's own shape, or it crops it
      for (const file of filesFor(op.page)) {
        if (!file.endsWith(".js")) continue;
        const { ast } = src(file);
        const hit = S.captureCall(ast, id);
        if (!hit) continue;
        const p = S.prop(hit.obj, "ratio");
        const v = `"${res.ratio.toFixed(4)}"`;
        if (p) batch.add(file, p.value.start, p.value.end, v);
        else { const last = hit.obj.properties.at(-1); batch.add(file, last.end, last.end, `, ratio: ${v}`); }
        break;
      }
    } else if (op.esrc) {
      // a picture written straight into markup: point it at the new file
      const { file, off } = parseEsrc(op.esrc);
      const { code } = src(file);
      const t = startTags(code, off, off + 2000)[0];
      const tag = code.slice(t.start, t.openEnd);
      const m = /\ssrc="([^"]+)"/.exec(tag);
      if (m) {
        const s = t.start + m.index + 6;
        batch.add(file, s, s + m[1].length, `/${MEDIA}/${id}.${res.video ? "mp4" : "webp"}`);
      }
    }
    return;
  }
  throw new Error(`unknown media slot: ${op.slot}`);
}

// ── the tests, streamed ────────────────────────────────────────────────────
const listeners = new Set();
const emit = (type, data) => {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of listeners) res.write(msg);
};
let testRun = null;
function runTests() {
  if (testRun) testRun.kill();
  emit("test-start", {});
  const p = spawn("npm", ["test"], { cwd: ROOT, env: { ...process.env, FORCE_COLOR: "0" } });
  testRun = p;
  let tail = "", fails = [];
  const onData = (b) => {
    const s = String(b);
    tail = (tail + s).slice(-20000);
    for (const line of s.split("\n")) {
      if (/^\s*(FAIL|not ok)\b/i.test(line) || /\bFAIL:/.test(line)) fails.push(line.trim());
    }
    emit("test-line", { text: s });
  };
  p.stdout.on("data", onData);
  p.stderr.on("data", onData);
  p.on("close", (code) => {
    if (testRun === p) testRun = null;
    const passed = /(\d+)\/(\d+) checks passed/.exec(tail);
    emit("test-end", { code, passed: code === 0, summary: passed ? passed[0] : null, fails: fails.slice(0, 20) });
  });
}

// ── http ───────────────────────────────────────────────────────────────────
function body(req) {
  return new Promise((ok, no) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", no);
  });
}
const json = (res, obj, code = 200) => {
  res.statusCode = code;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(obj));
};

function state() {
  const css = existsSync(R(EDITS)) ? read(EDITS) : "";
  const site = read("src/styles/site.css");
  const tokens = {};
  for (const m of site.matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) tokens[m[1]] ??= m[2];
  const { ast } = { ast: S.parse(read("src/site/palette.js")) };
  const obj = S.constObject(ast, "PALETTE");
  const palette = {};
  for (const k of ["paper", "homeInkA", "homeInkB"]) palette[k] = S.staticValue(S.prop(obj, k).value);
  const projAst = S.parse(read("src/site/projects.js"));
  const projects = [];
  S.walk(projAst, (n) => {
    if (n.type !== "ObjectExpression") return;
    const slug = S.prop(n, "slug");
    if (!slug) return;
    const v = (k) => { const p = S.prop(n, k); return p ? S.staticValue(p.value) : null; };
    projects.push({ slug: v("slug"), title: v("title"), n: v("n"), inkA: v("inkA"), ink: v("ink") });
  });
  return { css, tokens, palette, projects };
}

export default function editorPlugin() {
  // a fresh session starts with an empty staging folder: anything in it was
  // an upload for a session that has ended, saved or not
  if (existsSync(STAGE)) {
    for (const f of readdirSync(STAGE)) {
      try { rmSync(join(STAGE, f), { recursive: true, force: true }); } catch {}
    }
  }
  mkdirSync(STAGE, { recursive: true });
  return {
    name: "animationweb-editor",
    apply: "serve",
    // BEFORE vite's own transforms, so the code this marks is the file on disk
    // and every offset it writes is an offset in that file
    enforce: "pre",

    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (!/index\.html$/.test(ctx.filename || "index.html")) return html;
        const raw = read("index.html");
        seen.set("index.html", raw);
        // mark against the file ON DISK, so the offsets are the file's own
        return mark(raw, "index.html", [bodyRange(raw)], false);
      }
    },

    transform(code, id) {
      const clean = id.split("?")[0];
      if (!MARKED.test(clean)) return null;
      const file = relative(ROOT, clean);
      seen.set(file, code);
      const ranges = S.quasis(S.parse(code)).map((q) => [q.start, q.end]);
      return { code: mark(code, file, ranges, false), map: null };
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://x");
        const p = url.pathname;
        try {
          if (p === "/editor" || p === "/editor/") {
            res.setHeader("content-type", "text/html");
            // served raw, NOT through vite's html pipeline: the shell must not
            // get vite's reload client, or saving a source file would reload
            // the editor along with the page it is editing
            return res.end(readFileSync(join(ROOT, "editor/index.html"), "utf8"));
          }
          if (!p.startsWith("/__ed/")) return next();

          if (p === "/__ed/state") return json(res, state());

          if (p === "/__ed/resolve" && req.method === "POST") {
            const q = JSON.parse(String(await body(req)));
            if (q.mode === "href") return json(res, resolveHref(q));
            if (q.mode === "info") {
              const { file, off } = parseEsrc(q.esrc);
              return json(res, { ok: true, file, sharedBy: sharedBy(file, off) });
            }
            return json(res, resolveText(q));
          }

          if (p === "/__ed/upload" && req.method === "POST") {
            const name = url.searchParams.get("name") || "upload.bin";
            const ext = (extname(name) || ".bin").toLowerCase().replace(/[^.a-z0-9]/g, "");
            const id = `${randomUUID()}${ext}`;
            writeFileSync(join(STAGE, id), await body(req));
            const d = M.probe(join(STAGE, id));
            if (!d.w) { unlinkSync(join(STAGE, id)); return json(res, { ok: false, reason: "That file is not a picture or a clip ffmpeg can read." }); }
            return json(res, { ok: true, staged: id, url: `/__ed/staged/${id}`, video: d.video, w: d.w, h: d.h, seconds: d.seconds });
          }

          if (p.startsWith("/__ed/staged/")) {
            const f = join(STAGE, basename(p));
            if (!existsSync(f)) { res.statusCode = 404; return res.end(); }
            const ext = extname(f).toLowerCase();
            const type = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
              ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
              ".gif": "image/gif", ".avif": "image/avif", ".m4v": "video/mp4" }[ext] || "application/octet-stream";
            res.setHeader("content-type", type);
            return res.end(readFileSync(f));
          }

          if (p === "/__ed/events") {
            res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
            res.write(": hello\n\n");
            listeners.add(res);
            req.on("close", () => listeners.delete(res));
            return;
          }

          if (p === "/__ed/save" && req.method === "POST") {
            const b = JSON.parse(String(await body(req)));
            const { batch, moves, warnings, runAfter, src } = plan(b);
            // the new stylesheet, if it changed
            const cssNow = existsSync(R(EDITS)) ? read(EDITS) : "";
            const writeCss = typeof b.css === "string" && b.css !== cssNow;
            if (batch.errors.length) return json(res, { ok: false, errors: batch.errors, warnings });

            // check every file applies BEFORE writing any of them
            const outputs = [];
            try {
              for (const f of batch.edits.keys()) outputs.push([f, batch.apply(f, src(f).code)]);
              // a JS file that no longer parses is not written
              for (const [f, code] of outputs) if (f.endsWith(".js")) S.parse(code);
            } catch (e) {
              return json(res, { ok: false, errors: [e.message], warnings });
            }

            for (const m of moves) {
              if (m.del) { if (existsSync(m.del)) unlinkSync(m.del); }
              else if (m.copy) copyFileSync(m.copy, m.to);
              else if (existsSync(m.from)) { copyFileSync(m.from, m.to); }
            }
            for (const [f, code] of outputs) writeFileSync(R(f), code);
            if (writeCss) writeFileSync(R(EDITS), b.css);
            const toolErrors = [];
            for (const [cmd, args, rollback] of runAfter) {
              try { execFileSync(cmd, args, { cwd: ROOT, stdio: "pipe" }); }
              catch (e) {
                for (const r of rollback || []) {
                  if (r.content === null) { if (existsSync(r.path)) unlinkSync(r.path); }
                  else writeFileSync(r.path, r.content);
                }
                toolErrors.push(`${args.join(" ")} refused it, so that change was undone: ` +
                  String(e.stderr || e.message).trim().split("\n").pop().slice(0, 300));
              }
            }
            const changed = [...outputs.map(([f]) => f), ...(writeCss ? [EDITS] : []),
              ...moves.filter((m) => m.to).map((m) => relative(ROOT, m.to)),
              ...moves.filter((m) => m.del).map((m) => relative(ROOT, m.del) + " (removed)")];
            json(res, { ok: true, changed, warnings: warnings.concat(toolErrors) });
            if (changed.length) setTimeout(runTests, 300);
            return;
          }
          return next();
        } catch (e) {
          return json(res, { ok: false, errors: [e.message] }, 500);
        }
      });
    }
  };
}
