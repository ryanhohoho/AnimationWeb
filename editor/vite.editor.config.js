// vite.editor.config.js — the site, plus the editor
//
//   npm run edit      ->  http://localhost:5275/editor/
//
// This is the site's OWN config with one plugin added, so the page inside the
// editor is the real one -- the same modules, the same press, the same animal,
// on its own port -- and it can never drift from what ships. Nothing in
// editor/ is reachable from index.html, so none of it can reach a build.

import { defineConfig } from "vite";
import base from "../vite.config.js";
import editor from "./server/plugin.js";

export default defineConfig((env) => {
  const c = typeof base === "function" ? base(env) : base;
  return {
    ...c,
    plugins: [...(c.plugins || []), editor()],
    server: {
      ...(c.server || {}),
      // 5275 by hand (npm run edit); a launcher that assigns its own port
      // (the preview tool, beside another session's editor) passes PORT
      port: Number(process.env.PORT) || 5275,
      strictPort: true,
      open: "/editor/",
      // the staging folder is written to on every upload; it is nothing the
      // page imports, so watching it would only cost reloads
      watch: { ignored: ["**/node_modules/.editor-staging/**"] }
    }
  };
});
