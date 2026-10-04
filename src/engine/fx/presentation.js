// presentation.js
// picks the presentation pass from rigConfig.presentation.mode and hands back
// one common interface, so main.js never branches on which look is active:
//
//   pixelRatio(dpr) -> number   what the renderer should draw at
//   snapPx()        -> number   render-position quantization (0 = none)
//   resize(w, h)
//   render(scene, camera, { dt, scrollY, under, over, fxCamera })
//                               under/over: the hyper beam's scenes, drawn at
//                               full resolution either side of the character
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
    // the hyper beam's two scenes, either side of her (see pixelate.js)
    render(scene, camera, opts) {
      const under = opts?.under, over = opts?.over, fxCam = opts?.fxCamera;
      if (!fxCam || (!under && !over)) { renderer.render(scene, camera); return; }
      const ac = renderer.autoClear;
      renderer.clear();
      renderer.autoClear = false;
      if (under) renderer.render(under, fxCam);
      renderer.render(scene, camera);
      if (over) renderer.render(over, fxCam);
      renderer.autoClear = ac;
    },
    dispose() {}
  };
}
