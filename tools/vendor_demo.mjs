#!/usr/bin/env node
// vendor_demo.mjs — brings the xTool demo into src/vendor/xtool-demo/
//
//   node tools/vendor_demo.mjs [--from ../USB-UI/app] [--dry]
//
// The engraving generator has a desktop UI, and FIG. 2 on the USB sheet is that
// UI running -- the real components, the real store, fed by output the real
// generator printed. It is built as a library in ANOTHER repository and copied
// in here, rather than pulled as a dependency, because vercel.json deploys this
// repo on its own: a `file:` dependency on a sibling folder is a build that
// works on one machine.
//
// So this is the copy step, and it is a TOOL rather than a shell command for
// the same reason bake_captures.mjs is: it has a rule to enforce and it exits
// non-zero rather than printing a warning nobody reads.
//
// ── THE ONE TRANSFORMATION, AND WHY ────────────────────────────────────────
// The demo mounts inside a SHADOW ROOT (see src/site/usbDemo.js). It has to:
// its stylesheet is Tailwind's output and it sets `body { font-family; color;
// user-select:none }` and `html,body { height:100% }`. Dropped into this
// document those four declarations repaint the entire sheet -- and the traffic
// goes both ways, because site.css styles bare elements too and would leak into
// a React app that has never heard of riso paper.
//
// A shadow root fixes both directions at once, but it breaks one thing: `:root`
// matches nothing inside one, so every design token the app defines would be
// undefined. `:host` is the shadow equivalent, so the selectors below are
// rewritten on the way in.
//
// EACH REWRITE IS CHECKED. If a future build of the library stops emitting one
// of these selectors -- Tailwind changes its output, someone edits the app's
// base layer -- the rewrite silently does nothing and the demo arrives with no
// tokens at all, which looks like a styling bug three files away. So a rewrite
// that matches nothing is an error here, at the point the assumption is made.

import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/vendor/xtool-demo");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const fromArg = args.indexOf("--from");
const FROM = resolve(ROOT, fromArg === -1 ? "../USB-UI/app" : args[fromArg + 1]);

// what is copied, and where it comes from. The recordings are data rather than
// code and are fetched at runtime, so they keep their own folder.
const FILES = [
  { from: "out/lib/xtool-demo.js", to: "xtool-demo.js" },
  { from: "out/lib/xtool-demo.css", to: "xtool-demo.css", rewrite: true },
  { from: "demo/recordings/col-major.stdout.txt", to: "recordings/col-major.stdout.txt" },
  { from: "demo/recordings/row-major.stdout.txt", to: "recordings/row-major.stdout.txt" },
  { from: "demo/recordings/preview.32gb.json", to: "recordings/preview.32gb.json" },
  { from: "demo/recordings/preview.western-digital-large.json", to: "recordings/preview.western-digital-large.json" },
  { from: "demo/recordings/manifest.json", to: "recordings/manifest.json" }
];

// ── the selector rewrites, in order ────────────────────────────────────────
// `:root[data-platform=darwin]` has to go before the bare `:root`, and `:host`
// cannot take a compound the way `:root` can -- `:host[x]` is invalid, the
// functional form is `:host([x])`.
//
// `html,body,#root` keeps its `#root`: that is the div the app is mounted into,
// it still exists inside the shadow root, and it still needs its height.
const REWRITES = [
  [/:root\[data-platform=darwin\]\{/g, ":host([data-platform=darwin]){"],
  [/html,body,#root\{/g, ":host,#root{"],
  [/(^|[{},])body\{/g, "$1:host{"],
  [/(^|[{},]):root\{/g, "$1:host{"],

  // ── AND THE FIGURE IS ALWAYS PRINTED LIGHT ──────────────────────────
  // The app follows prefers-color-scheme, which is right on a desktop and
  // wrong inside a printed sheet. Two reasons, and the second is the one that
  // decided it:
  //
  //   1. The page is bone paper. A dark window on it is a screen sitting on a
  //      page rather than a figure printed in it.
  //   2. THE WIPE STOPS READING. The terminal is set in the sheet's own ink,
  //      #16150F, and the app's dark window is #1E1E1E -- eight points apart.
  //      Measured on the real page: the cut between the two halves was almost
  //      invisible in dark mode and is a hard black-to-white edge in light.
  //      The whole figure is that cut.
  //
  // `not all` never matches, so the block is inert rather than deleted --
  // deleting it would mean brace-matching minified CSS, and leaving it in
  // place means a future build diffs cleanly against the source.
  [/@media\(prefers-color-scheme:dark\)/g, "@media not all"],
  [/@media\(prefers-contrast:more\)and \(prefers-color-scheme:dark\)/g, "@media not all"]
];

const fail = (message) => {
  console.error(`vendor_demo: ${message}`);
  process.exit(1);
};

function rewriteCss(css) {
  let out = css;
  for (const [re, to] of REWRITES) {
    re.lastIndex = 0;
    const hits = (out.match(re) || []).length;
    // the assumption, checked where it is made
    if (hits === 0) fail(`the stylesheet no longer contains ${re.source} — the shadow-root ` +
      `rewrite would be a no-op, and the demo would mount with no design tokens`);
    out = out.replace(re, to);
  }
  // ── and nothing that reaches the document survived it ──────────────────
  // Checked over SELECTOR LISTS rather than over the text, because the two are
  // not the same question. Tailwind emits `:root,:host{...}` and `html,:host`
  // of its own accord: those carry a document selector that matches nothing in
  // here, next to a shadow selector that matches everything, and rewriting them
  // would be work for no reason. A list is a problem only when it names the
  // document and has no `:host` to land on.
  for (const list of selectorLists(out)) {
    const parts = list.split(",").map((s) => s.trim());
    const reaches = parts.filter((s) => /^(html|body|:root)\b/.test(s));
    if (reaches.length > 0 && !parts.some((s) => s.startsWith(":host"))) {
      fail(`a document-level selector survived the rewrite: ${JSON.stringify(list)}`);
    }
  }
  return out;
}

/**
 * Every selector list in a stylesheet, at any nesting depth.
 *
 * Not a CSS parser and does not need to be: it walks braces, and the text
 * before an opening one is either a selector list or an at-rule prelude. The
 * at-rules are dropped, which leaves exactly the lists.
 */
function selectorLists(css) {
  const lists = [];
  let buffer = "";
  for (const ch of css) {
    if (ch === "{") {
      const text = buffer.trim();
      if (text && !text.startsWith("@")) lists.push(text);
      buffer = "";
    } else if (ch === "}" || ch === ";") buffer = "";
    else buffer += ch;
  }
  return lists;
}

const size = (n) => `${(n / 1024).toFixed(1)} kB`;

mkdirSync(join(OUT, "recordings"), { recursive: true });

let total = 0;
for (const file of FILES) {
  const src = join(FROM, file.from);
  let bytes;
  try {
    bytes = statSync(src).size;
  } catch {
    fail(`${file.from} is missing from ${FROM}.\n` +
      `  Build it first:  cd ${FROM} && npm run build:lib && npm run demo:record`);
  }
  total += bytes;
  const dest = join(OUT, file.to);
  if (!dry) {
    if (file.rewrite) writeFileSync(dest, rewriteCss(readFileSync(src, "utf8")), "utf8");
    else copyFileSync(src, dest);
  }
  console.log(`  ${file.to.padEnd(34)} ${size(bytes).padStart(10)}`);
}

// PROVENANCE, in the folder itself. A vendored build with no note saying where
// it came from is a file nobody dares regenerate.
const README = `# xtool-demo — VENDORED, DO NOT EDIT

FIG. 2 on the USB provisioning sheet: the engraving generator's desktop UI,
built as a library, playing a recording of a real run.

Built elsewhere and copied in. Nothing in this folder is edited by hand — a
change here is lost the next time anyone runs the tool below.

## Regenerating

\`\`\`bash
cd ../USB-UI/app
npm run build:lib      # -> out/lib/xtool-demo.{js,css}, gated by demo:check
npm run demo:record    # -> demo/recordings/  (re-records the two runs)
cd -
node tools/vendor_demo.mjs
\`\`\`

## What is here

| file | what |
|---|---|
| \`xtool-demo.js\` | the ES module. Exports \`mountDemo(el, opts)\`. |
| \`xtool-demo.css\` | its stylesheet, **rewritten for a shadow root** — see the tool. |
| \`recordings/*.stdout.txt\` | two real runs of the generator, against different jigs and different serial counts. |
| \`recordings/preview.*.json\` | each jig, inspected: the still the viewer shows while it is idle. One per template. |
| \`recordings/manifest.json\` | what was recorded, when, and with which interpreter. |

## The data

The serials are sequential and synthetic, \`X1111111\` upward, generated for this
purpose and belonging to nobody. Both runs take theirs off the front of one
sequence, so the counts differ but the numbers never do. The template's phone number is substituted the
same way the transcript's device identifiers are. \`npm run demo:check\` in the
source repository fails the build on anything of another shape, and
\`test/sim.test.js\` checks these files again from this side.

Generated ${new Date().toISOString().slice(0, 10)} by \`tools/vendor_demo.mjs\`.
`;

if (!dry) writeFileSync(join(OUT, "README.md"), README, "utf8");

console.log(`\n  ${String(FILES.length)} file(s), ${size(total)} on disk` +
  `${dry ? " (dry run, nothing written)" : ` -> src/vendor/xtool-demo/`}`);
