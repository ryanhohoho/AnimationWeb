import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// normal build for hosting, `--mode single` bundles everything (glb included)
// into one html file that works over file:// for quick visual checks
export default defineConfig(({ mode }) => ({
  // Clean routes (/projects/x) need absolute asset URLs; a relative base would
  // resolve them against /projects/ and 404. The single-file build has no
  // routes and no server, so it keeps the relative base.
  base: mode === "single" ? "./" : "/",
  appType: "spa",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    assetsInlineLimit: mode === "single" ? 100000000 : 4096,
    chunkSizeWarningLimit: 2000
  }
}));
