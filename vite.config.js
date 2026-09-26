import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { copyFileSync } from "node:fs";
import { join } from "node:path";

// ── THE DEEP LINK PROBLEM, AND THE SMALLEST HONEST FIX ──────────────────────
// This site has real routes. /projects/closet is a URL somebody can send to
// somebody else, and now that a shared link carries a card and its own
// description (index.html, router.js) that is a URL people WILL send.
//
// But there is no server here. A static host asked for /projects/closet looks
// for a file at that path, does not find one, and returns its 404 -- so every
// shared link and every refresh lands on the host's error page rather than on
// the sheet. Vite's own dev server hides this completely: appType "spa" means
// it serves index.html for anything it cannot find, which is exactly the rule
// production does not have.
//
// GitHub Pages, Netlify, Cloudflare Pages and Render all serve `404.html` for
// an unknown path, with the original URL left intact in location.pathname. So
// if 404.html IS the app, the router reads the real path and renders the real
// page. It cannot be a file in public/, because it has to carry the BUILT
// script and style tags with their content hashes -- so it is a copy taken
// after the bundle is written.
//
// THE ONE THING IT DOES NOT FIX is the status code: GitHub Pages serves that
// body with a 404, which is right for a genuinely missing page and wrong for
// /projects/closet. The alternative is the redirect hack (404.html bounces to
// /?p=... and the app puts the URL back), and that trades a wrong status for a
// visible flash and a second request on every shared link. A crawler that
// matters is Googlebot, which renders JS and follows the links from the front
// page regardless; a reader never sees a status code. vercel.json below is the
// one host where a real rewrite is available, and it gets a real 200.
const spaFallback = () => ({
  name: "spa-404-fallback",
  apply: "build",
  closeBundle() {
    const out = join(process.cwd(), "dist");
    try {
      copyFileSync(join(out, "index.html"), join(out, "404.html"));
    } catch (err) {
      // a single-file build has no routes and may not have written index.html
      // where this expects it; that build is for file:// checks and does not
      // need a fallback at all
      this.warn?.(`spa fallback not written: ${err.message}`);
    }
  }
});

// ── THE NOTES STAY IN THE SOURCE, NOT IN WHAT SHIPS ────────────────────────
// The source is commented heavily on purpose (CLAUDE.md, rule 8), and the
// minifier already drops every JS and CSS comment. HTML comments it does not
// touch: they were 11 KB of the 15 KB index.html, and seven more ride inside
// the page templates into the live DOM, where anyone opening DevTools reads
// the working notes. This removes them from the BUILD only -- the dev server
// and the editor keep the files exactly as written (the editor maps every
// element back to its source offset, so it must see the real file).
//
// A comment node renders nothing, and nothing on the site reads one (the one
// child walk, colliders.js hasOwnText, looks only at text nodes). A comment
// alone on its lines goes with its line, so no blank lines are left; one
// inside a line goes alone, so the whitespace either side of it -- which is
// what separates two words -- is exactly what it was. A match may not run
// past the first "-->", so a comment followed by markup on the same line can
// never swallow that markup looking for a later one. The vendored demo's chunk
// is left alone (it is generated elsewhere and builds its own comment nodes).
// If a chunk still has "<!--" afterwards, the build stops rather than ship it.
const NOTE = String.raw`<!--(?:(?!-->)[\s\S])*-->`;
const stripNotes = (s) => s
  .replace(new RegExp(String.raw`^[ \t]*${NOTE}[ \t]*\r?\n`, "gm"), "")
  .replace(new RegExp(NOTE, "g"), "");
const buildNotesOut = () => ({
  name: "strip-html-notes",
  apply: "build",
  transformIndexHtml: { order: "post", handler: (html) => stripNotes(html) },
  renderChunk: {
    order: "post",
    handler(code, chunk) {
      // (the main chunk carries the demo's recordings as URLs, so it is the
      // demo's own CODE that marks a chunk as the vendor's, not the folder)
      if (!code.includes("<!--") || Object.keys(chunk.modules).some((id) => /\/src\/vendor\/.*\.(js|css)(\?|$)/.test(id))) return null;
      const out = stripNotes(code);
      if (out.includes("<!--")) this.error(`an HTML comment in ${chunk.fileName} could not be removed safely`);
      return { code: out, map: null };
    }
  }
});

// normal build for hosting, `--mode single` bundles everything (glb included)
// into one html file that works over file:// for quick visual checks
export default defineConfig(({ mode }) => ({
  // Clean routes (/projects/x) need absolute asset URLs; a relative base would
  // resolve them against /projects/ and 404. The single-file build has no
  // routes and no server, so it keeps the relative base.
  base: mode === "single" ? "./" : "/",
  appType: "spa",
  plugins: mode === "single" ? [viteSingleFile()] : [buildNotesOut(), spaFallback()],
  build: {
    assetsInlineLimit: mode === "single" ? 100000000 : 4096,
    chunkSizeWarningLimit: 2000
  }
}));
