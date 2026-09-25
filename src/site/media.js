// media.js — CAPTURES OF THE WORK
//
// A project page shows the project. Not a diagram of the project, not an
// abstraction of it: the thing itself, running — a screenshot or a screen
// recording of the actual tool. Everything around it is still this sheet (the
// paper, the die-cuts, the two type sizes, the sky apertures), so a capture is
// mounted the same way an aperture is: a rectangle cut in the sheet, with
// registration ticks rather than a frame, and its caption in clear space below.
//
// RESOLUTION IS DONE AT BUILD TIME
// --------------------------------
// Captures live in src/assets/media/ and are picked up by name. Vite resolves
// the glob when the bundle is built, so a slot either has a real hashed URL or
// it has nothing — there is no runtime probe and no request that can 404.
//
// A slot with no file is NOT a broken image. It prints the true thing, in the
// register the rest of the sheet uses: this plate is set, the capture has not
// been supplied yet, and here is the filename it is waiting for. Drop a file
// with that basename into src/assets/media/ and it appears on the next build.
//
// NOTHING IMPORTS THIS RIGHT NOW, and that is deliberate rather than rot -- the
// same argument the .fig / .spec / .check block in site.css is kept under. The
// three project sheets were cut to two plates of placeholder prose because
// their real writing has not happened yet (pages/sheet.js), and captures are
// the first thing that writing will want. Being unimported costs nothing at
// all: Rollup never reaches a module no entry point names, so this is zero
// bytes in the bundle rather than dead weight in it, and the glob above is not
// even evaluated.
//
// If a rewrite lands and still does not want captures, delete this file AND the
// two comments in site.css that point at it. Leaving it named and explained is
// the difference between a facility and an orphan; leaving it unexplained would
// be neither.

const FILES = import.meta.glob(
  "../assets/media/*.{png,jpg,jpeg,gif,webp,avif,mp4,webm,mov}",
  { eager: true, query: "?url", import: "default" }
);

// basename (no extension) -> { url, ext }. First one wins per extension rank,
// so a recording beats a still of the same name if both are present.
const RANK = ["mp4", "webm", "mov", "gif", "webp", "avif", "png", "jpg", "jpeg"];
const BY_ID = new Map();
for (const [path, url] of Object.entries(FILES)) {
  const m = path.match(/([^/]+)\.([a-z0-9]+)$/i);
  if (!m) continue;
  const id = m[1], ext = m[2].toLowerCase();
  const prev = BY_ID.get(id);
  if (!prev || RANK.indexOf(ext) < RANK.indexOf(prev.ext)) BY_ID.set(id, { url, ext });
}

const VIDEO = new Set(["mp4", "webm", "mov"]);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nb = (s) => esc(s).replace(/ /g, "&nbsp;");

/**
 * A capture slot.
 * @param id    basename in src/assets/media/, without extension
 * @param cap   the caption, printed under the cut
 * @param alt   what the capture shows, for anyone who cannot see it
 * @param pos   `--x/--y/--w/--h` for the absolute composition (omit to flow)
 * @param ratio the box shape. Pass the SOURCE's own ratio: `.fig-in` fills with
 *              `object-fit:cover`, so a box that disagrees with the file crops
 *              it. bake_captures.mjs prints the number for each asset.
 * @param cls   extra classes. `narrow` is the one the sheet column uses, so two
 *              figures on one sheet are not two identical rectangles.
 * @param e     the editor's id for this figure (editor/), written here by the
 *              editor the first time it styles one figure on its own. It is
 *              an argument rather than a mark in the markup below because
 *              that markup is shared by every figure on every sheet.
 */
export function capture({ id, cap = "", alt = "", pos = "", ratio = "1.6", cls = "", e = "" }) {
  const hit = BY_ID.get(id);
  const style = `${pos ? pos + "; " : ""}--ratio:${ratio}`;
  let inner;

  if (!hit) {
    inner = `<div class="fig-wait">
        <p class="t">CAPTURE&nbsp;NOT&nbsp;SUPPLIED</p>
        <p class="t dim">src/assets/media/${nb(id)}.mp4&nbsp;|&nbsp;.png</p>
      </div>`;
  } else if (VIDEO.has(hit.ext)) {
    // A recording of a tool is not a film: no sound, no controls, no decision
    // for the reader to make. It loops because the thing it shows is a loop.
    //
    // A POSTER IF THERE IS ONE -- `<id>-still.webp`, which bake_captures.mjs
    // emits beside every clip. It covers two different things: the flash of
    // nothing before `preload="metadata"` resolves, and PAPER, because a
    // <video> with no poster prints blank and the print stylesheet on this site
    // is a load-bearing feature rather than an afterthought.
    const post = BY_ID.get(`${id}-still`);
    inner = `<video src="${esc(hit.url)}" autoplay muted loop playsinline
                    preload="metadata"${post ? ` poster="${esc(post.url)}"` : ""}
                    aria-label="${esc(alt || cap)}"></video>`;
  } else {
    inner = `<img src="${esc(hit.url)}" alt="${esc(alt || cap)}" loading="lazy" decoding="async" />`;
  }

  // `set` is what makes the slot part of the plate's four-corner composition;
  // without a position it simply flows, which is what the narrow layout wants.
  const klass = `fig${pos ? " set" : ""}${hit ? " has" : ""}${cls ? ` ${cls}` : ""}`;
  return `<figure class="${klass}"${e ? ` data-e="${esc(e)}"` : ""} style="${style}">
      <div class="fig-in">${inner}</div>
      ${cap ? `<figcaption class="t dim">${nb(cap)}</figcaption>` : ""}
    </figure>`;
}

/** True if a capture exists — lets a plate word itself differently when it is
    still waiting on footage. */
export const hasCapture = (id) => BY_ID.has(id);

/**
 * Videos are cheap but they are not free, and this site's one hard rule is that
 * it cannot drop a frame on a bad machine. Nothing decodes while it is off
 * screen: a capture plays when its slot is in view and is paused the moment it
 * leaves. Mew gets the GPU back for nothing.
 */
export function mountMedia(scope, root = document) {
  const vids = [...root.querySelectorAll(".fig video")];
  if (!vids.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) v.play?.().catch(() => {});
      else v.pause?.();
    }
  }, { threshold: 0.12 });
  vids.forEach((v) => io.observe(v));
  scope?.add(() => { io.disconnect(); vids.forEach((v) => v.pause?.()); });
}
