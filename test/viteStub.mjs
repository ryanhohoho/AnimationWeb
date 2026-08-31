// viteStub.mjs — a node resolve/load hook so the site modules can be imported
// outside Vite. Only media.js needs it: it uses `import.meta.glob`, which is a
// Vite build-time transform and does not exist in node.
export async function load(url, context, next) {
  if (url.endsWith("/src/site/media.js")) {
    return {
      format: "module",
      shortCircuit: true,
      source: `
        export function capture() { return ""; }
        export function mountMedia() {}
        export function mediaFiles() { return {}; }
      `
    };
  }
  return next(url, context);
}
