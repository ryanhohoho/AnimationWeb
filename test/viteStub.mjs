// viteStub.mjs — a node resolve/load hook so the site modules can be imported
// outside Vite.
//
// Two Vite build-time features do not exist in node:
//
//   import.meta.glob(...)   a directory read, resolved at build time
//   import x from "./y?url" an asset URL
//
// EVERY module under src/ gets the glob call rewritten to an empty object, so
// the module still loads and its own logic is still the real logic. A module
// whose glob comes back empty behaves exactly as it does when the asset has not
// been baked yet — hasSkyClip false, hasIconAtlas false, every capture slot
// printing its honest "not supplied" state — which the site is already designed
// to handle, so this is not a fiction invented for the harness. It is the
// un-baked case.
//
// media.js used to be REPLACED outright here, with a three-line copy exporting
// a capture() that returned "". That was fine while it was nothing but a glob;
// it stopped being fine when it grew a poster lookup and a class argument,
// because a stub that replaces a module is a stub that can silently diverge
// from it — which is the argument two paragraphs down, applied to itself. It
// takes the same glob rewrite as everything else now.
//
// Why this matters: the checks are supposed to drive the REAL modules. A stub
// that replaces a module is a stub that can silently diverge from it, and the
// deck's own arithmetic (cell uv rectangles, fixed-aperture mounting) is worth
// testing against the thing that ships rather than against a copy.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// ── ASSET IMPORTS ────────────────────────────────────────────────────────────
// `import url from "./x.png?url"` is a Vite transform: it emits the asset and
// hands back its final hashed path. Node sees a .png and refuses it outright.
//
// Resolved here to a synthetic module whose default export is the ORIGINAL path
// as a string, which is exactly the shape the real thing has -- a string nobody
// headless ever dereferences. It has to be a string rather than null, because
// `hasIconAtlas = !!URL_` is a real branch and stubbing it falsy would quietly
// switch off the code the checks are there to exercise.
const ASSET = "vitestub-asset:";

export async function resolve(specifier, context, next) {
  if (specifier.includes("?url") || /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|glb|woff2?|ttf)(\?|$)/.test(specifier)) {
    return { url: ASSET + specifier, format: "module", shortCircuit: true };
  }
  return next(specifier, context);
}

const GLOB = /import\.meta\.glob\s*\([\s\S]*?\)\s*(?=[;,)\]])/g;

export async function load(url, context, next) {
  if (url.startsWith(ASSET)) {
    const p = url.slice(ASSET.length).replace(/\?url$/, "");
    return { format: "module", shortCircuit: true,
             source: `export default ${JSON.stringify(p)};` };
  }

  if (url.startsWith("file:") && url.includes("/src/") && url.endsWith(".js")) {
    const src = await readFile(fileURLToPath(url), "utf8");
    if (GLOB.test(src)) {
      GLOB.lastIndex = 0;
      return {
        format: "module",
        shortCircuit: true,
        source: src.replace(GLOB, "({})")
      };
    }
  }

  return next(url, context);
}
