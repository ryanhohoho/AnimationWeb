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

// normal build for hosting, `--mode single` bundles everything (glb included)
// into one html file that works over file:// for quick visual checks
export default defineConfig(({ mode }) => ({
  // Clean routes (/projects/x) need absolute asset URLs; a relative base would
  // resolve them against /projects/ and 404. The single-file build has no
  // routes and no server, so it keeps the relative base.
  base: mode === "single" ? "./" : "/",
  appType: "spa",
  plugins: mode === "single" ? [viteSingleFile()] : [spaFallback()],
  build: {
    assetsInlineLimit: mode === "single" ? 100000000 : 4096,
    chunkSizeWarningLimit: 2000
  }
}));
