// designPx.js — A PIXEL IN THE STYLESHEETS IS A PIXEL OF THE OWNER'S SCREEN
//
// The owner lays the site out on a 14" MacBook Pro (a 1512 px wide window) and
// it is seen on everything else. Most of the stylesheet was in px, the editor
// writes px, and the sky's apertures were in percentages of the window -- so
// on a 27" monitor (2560 wide) the windows grew 1.7x and every word and every
// nudge stayed the size it was: the type shrank to a third of the screen and
// the column drifted inward, and nothing done on the laptop carried over.
// (Measured on his screenshots, 2026-09-27: the aperture sat at the same
// fraction of both screens; the name did not.)
//
// So a `px` in site.css or edits.css now means "a pixel at 1512 wide", and this
// rewrites every one of them to `calc(n * var(--u))` as the file is served.
// `--u` is defined in site.css: exactly 1px up to the tablet breakpoint, and
// above it the window's width over 1512 (floored and capped there, and held by
// the height on a very wide, very short window). The words, the gaps, the
// nudges and the percentages then all scale by the same factor, and the page
// is one composition at every size -- the horizontal before the vertical, by
// instruction, because a window's height is the least reliable number it has.
//
// Rejected: CSS `zoom` on the page. It does exactly this, but Mew and the sky
// read element rectangles, and how every engine reports a rectangle inside a
// zoomed box was not something this could verify headlessly (no WebKit here).
// Rewriting the stylesheet source into calc() by hand: 1800 lines of
// `calc(11 * var(--u))`, and the next rule written in px would not scale.
//
// THE WHOLE WINDOW, NOT ITS WIDTH (2026-09-27, the owner's second answer). The
// design pixel was the window's width over 1512, so a window wider for its
// height than his (a 27" monitor's browser is about 2:1, the laptop's 1.74:1)
// had less of the page's height: the experience card fitted on the laptop and
// scrolled on the monitor. --u is now the SMALLER of width/1512 and
// height/867, and every page sheet is a 1512 x 867 stage scaled by it and
// centred -- so every screen shows exactly the laptop's page, and a wider one
// a little more paper either side. For that to hold, a vw or a vh has to mean
// a share of the REFERENCE window too, so those are rewritten as well, to
// calc(n * var(--vw)) and friends (1vw below the tablet breakpoint, 15.12
// design px above it) -- except 100 and 50, which mean the real window.
//
// Left alone, on purpose:
//   · anything of 1px or less -- a hairline is a hairline at every size, and a
//     1.7px line is a blurred one;
//   · @media / @container / @supports conditions -- a breakpoint is a fact
//     about the window, not about the design;
//   · the declarations of --u, --vw, --vh, --lvh, --svh, --dvh (they are the
//     units), strings, url() and comments.
//
// Used by vite.config.js (site.css and edits.css, as they are served and
// built) and by the editor's live preview, which injects the same edits
// without going through Vite. Pure: no DOM, testable in node.

export const REF_W = 1512;   // the owner's window, 14" MacBook Pro at its default resolution
export const REF_H = 867;    // ...and its height inside the browser, measured off his screenshot

const HOLD = /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\([^)]*\)|--(?:u|vw|vh|lvh|svh|dvh)\s*:[^;}]*|@(?:media|container|supports)[^{]*\{/g;
const PX = /(^|[^\w.#-])(-?(?:\d+\.\d+|\d+|\.\d+))px\b/g;
const VP = /(^|[^\w.#-])(-?(?:\d+\.\d+|\d+|\.\d+))(vw|vh|lvh|svh|dvh)\b/g;

export function designPx(css) {
  let out = "", at = 0;
  const scale = (s) => s
    .replace(PX, (m, pre, n) => (Math.abs(+n) <= 1 ? m : `${pre}calc(${n} * var(--u))`))
    // a share of the WINDOW is a share of the reference window, except the
    // two that mean the real one: 100 (full bleed, a sticky pin, a sheet
    // that fills the screen) and 50 (the middle of it)
    .replace(VP, (m, pre, n, unit) => (Math.abs(+n) === 100 || Math.abs(+n) === 50 ? m : `${pre}calc(${n} * var(--${unit}))`));
  for (const m of css.matchAll(HOLD)) {
    out += scale(css.slice(at, m.index)) + m[0];
    at = m.index + m[0].length;
  }
  return out + scale(css.slice(at));
}
