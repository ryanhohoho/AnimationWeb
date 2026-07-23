// presentation.js
// picks the presentation pass from rigConfig.presentation.mode and hands back
// one common interface, so main.js never branches on which look is active:
//
//   pixelRatio(dpr) -> number   what the renderer should draw at
//   snapPx()        -> number   render-position quantization (0 = none)
//   resize(w, h)
//   render(scene, camera, { dt, scrollY })
//   dispose()
//
// "none" is a passthrough that just renders the scene straight to the canvas.

import { createPixelate } from "./pixelate.js";
import { createCutout } from "./cutout.js";

// vite resolves these at build time (and inlines them for build:single)
import overlayPngUrl from "../../assets/mewOverlay.png?url";
import overlayGifUrl from "../../assets/mewAnimation.gif?url";

const OVERLAYS = {
  "mewOverlay.png": overlayPngUrl,
  "mewAnimation.gif": overlayGifUrl
};

// config.overlay is a filename from the table above, or any url/data-uri
function resolveOverlay(name) {
  return OVERLAYS[name] ?? name;
}

export function createPresentation({ renderer, config }) {
  const mode = config?.mode ?? "none";

  if (mode === "pixelate") {
    return createPixelate({ renderer, config: config.pixelate });
  }

  if (mode === "cutout") {
    return createCutout({
      renderer,
      config: { ...config.cutout, overlayUrl: resolveOverlay(config.cutout.overlay) }
    });
  }

  // raw 3d, no pass
  return {
    pixelRatio: (dpr) => dpr,
    snapPx: () => 0,
    resize() {},
    render(scene, camera) {
      renderer.render(scene, camera);
    },
    dispose() {}
  };
}
