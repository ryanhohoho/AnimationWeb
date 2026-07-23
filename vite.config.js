import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// normal build for hosting, `--mode single` bundles everything (glb included)
// into one html file that works over file:// for quick visual checks
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    assetsInlineLimit: mode === "single" ? 100000000 : 4096,
    chunkSizeWarningLimit: 2000
  }
}));
