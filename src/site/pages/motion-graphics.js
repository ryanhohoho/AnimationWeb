// pages/motion-graphics.js — EXPERIMENTAL MOTION GRAPHICS
//
// The one page on this site that does not wear the site's clothes, by
// instruction (2026-09-25): it dresses in the look of the work on it -- a dark
// ground, the blue grade, dithers and scanlines, computer-vision boxes. The
// portfolio's paper, die-cuts and riso sky stop at the door.
//
// IT IS A SHOWCASE OF WORKS (2026-09-26), top to bottom:
//
//   · the head: the title and one line, nothing else;
//   · THE WALL: the longest, most developed works, large, in columns that
//     drift against each other as the page scrolls -- then everything else,
//     scattered smaller under it. No headings, no counts, no dividers. Each
//     tile is as big as its clip is long;
//   · THE FLOWER: every cut of "A flower." as one frame that stays put while
//     the scroll steps it through the effects, in order (site/motionBloom.js);
//   · behind the scenes;
//   · the conclusion: the whole film, centred, then its own timeline, then the
//     credits.
//
// Nothing relates a work to the film but the film itself.
//
// Every frame is boxed the way the piece's own computer vision boxes what it
// sees (m_angels.js there: thin translucent lines, the label above; cyan while
// it tracks, deep red once it has locked -- here, the tile your pointer is on).
// The page's ground is a still of the pixelated flower, dithered, until you
// point at a tile, and then it is that tile (site/motionAmbient.js).
//
// THE MECHANICS: every tile plays from ONE video (site/motionSheet.js); the
// layout of the wall, which needs each clip's length, is laid when the page's
// code arrives (site/motionLayout.js) -- until then the wall is a plain grid,
// which is also what it stays if that code never comes. The viewer opens out
// of a tile and closes back into it (site/motionViewer.js).
//
// THE WORDS: the headline, the lead and the process notes are strings in this
// file; the works' names are in site/motion.js. Both are the editor's to
// change. The behind-the-scenes figures are ordinary capture() slots: select
// one in the editor and Replace… takes a picture or a clip from Finder.

import { capture } from "../media.js";
import { ACTS, CUT, FILM, WORKS, worksOn } from "../motion.js";
// the viewer, the sheet's drawing, the layout, the ground and the credits are
// fetched when the page mounts (site/motionPage.js), not with the site


const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nameOf = (id) => (id === FILM.id ? FILM.name : WORKS.find((w) => w.id === id)?.name ?? id);

// a tile: the frame, its box, and its name hanging above the box as the
// piece's vision labels what it has found
function tile(w) {
  return `
          <div class="mg-tile" role="listitem" data-id="${esc(w.id)}">
            <a class="mg-cell-a" href="#${esc(w.id)}" data-scene="${esc(w.id)}" aria-label="${esc(w.name)}">
              <span class="mg-frame-cut"><canvas class="mg-cv" aria-hidden="true"></canvas><i class="mg-box" aria-hidden="true"></i></span>
              <span class="mg-name" aria-hidden="true">${esc(w.name)}</span>
            </a>
          </div>`;
}

export function html() {
  const flower = worksOn("flower");

  // THE FILM'S TIMELINE: every stretch as long as it lasts, coloured by the
  // film's four parts; the gaps are its own black. Pressing one opens the film
  // at that moment.
  const total = FILM.dur;
  let t = 0;
  const segs = [];
  for (const [id, act, from, to] of CUT) {
    if (from > t + .01) segs.push(`<span class="mg-seg is-black" style="flex-grow:${(from - t).toFixed(3)}"></span>`);
    segs.push(`<a class="mg-seg a${act}" href="#film" data-scene="film" data-film-at="${from}" style="flex-grow:${(to - from).toFixed(3)}" aria-label="${esc(nameOf(id))}" title="${esc(nameOf(id))}"></a>`);
    t = to;
  }
  if (total > t + .01) segs.push(`<span class="mg-seg is-black" style="flex-grow:${(total - t).toFixed(3)}"></span>`);

  return `
  <section data-e="plate-2jgh" class="plate mg" id="p0">
    <canvas class="mg-ground" aria-hidden="true"></canvas>
    <div class="mg-in">
      <header class="mg-head">
        <h1 data-e="mg-h-7s8e" class="mg-h">experimental<br><em>motion graphics</em></h1>
        <p data-e="mg-lead-prta" class="mg-lead">Scenes made for mobile viewing experience.</p>
      </header>

      <div class="mg-wall mg-top" role="list" aria-label="Featured works" data-list="works">${worksOn("top").map(tile).join("")}
      </div>

      <div class="mg-wall mg-mix" role="list" aria-label="More works" data-list="works">${worksOn("mix").map(tile).join("")}
      </div>

      <section class="mg-bloom" data-list="flower" data-noswipe aria-label="A flower, one effect at a time" style="--n:${flower.length}">
        <div class="mg-bloom-pin">
          <ol class="mg-bloom-list">${flower.map((w, k) => `
            <li><button type="button" class="mg-bloom-name${k ? "" : " on"}" data-step="${k}">${esc(w.name)}</button></li>`).join("")}
          </ol>
          <a class="mg-bloom-frame" href="#${esc(flower[0].id)}" data-scene="${esc(flower[0].id)}" aria-label="${esc(flower[0].name)}">
            <span class="mg-frame-cut"><img class="mg-bloom-img" alt="" decoding="async" /><i class="mg-box" aria-hidden="true"></i></span>
            <span class="mg-name mg-bloom-now" aria-hidden="true">${esc(flower[0].name)}</span>
          </a>
          <div class="mg-bloom-rail" aria-hidden="true">${flower.map((_, k) => `<i${k ? "" : ' class="on"'}></i>`).join("")}</div>
        </div>
        <div class="mg-bloom-steps" aria-hidden="true">${flower.map((_, k) => `<i style="--k:${k}"></i>`).join("")}</div>
      </section>

      <section data-e="mg-bts-5bho" class="mg-bts" aria-labelledby="mg-bts-h">
        <h2 class="mg-bts-h" id="mg-bts-h">behind the scenes</h2>
        <p class="mg-body">Work in progress.</p>
        <p class="mg-body">Work in progress.</p>
        <div class="mg-bts-figs">
          ${capture({ id: "motion-bts-1", ratio: "1.7778", alt: "Behind the scenes." })}
          ${capture({ id: "motion-bts-2", ratio: "1.7778", alt: "Behind the scenes." })}
          ${capture({ id: "motion-bts-3", ratio: "0.75", cls: "narrow", alt: "Behind the scenes." })}
        </div>
      </section>

      <section class="mg-end" data-list="film" aria-label="${esc(FILM.name)}">
        <div class="mg-tile mg-film">
          <a class="mg-cell-a" href="#${esc(FILM.id)}" data-scene="${esc(FILM.id)}" aria-label="${esc(FILM.name)}">
            <span class="mg-frame-cut"><canvas class="mg-cv" aria-hidden="true"></canvas><i class="mg-box" aria-hidden="true"></i></span>
          </a>
        </div>
        <p class="mg-end-name">${esc(FILM.name)}</p>
        <div class="mg-cut" role="group" aria-label="${esc(FILM.name)}, by part: ${ACTS.map(esc).join(", ")}">
          <div class="mg-cut-bar">${segs.join("")}</div>
        </div>
      </section>

      <section class="mg-credits" aria-label="Credits">
        <p class="mg-credits-h">credits</p>
        <p data-e="mg-credits-not-7s2i" class="mg-credits-note">Everything not listed was made for the pieces procedurally in code: shaders, audio, typography and pixel flowers. Faces: Bodoni Moda (Owen Earl), Instrument Serif, JetBrains Mono, Silkscreen, Noto Sans JP, Noto Serif SC and VT323, under the SIL Open Font License 1.1.</p>
        <ul class="mg-credits-list" data-credits></ul>
      </section>

      <p class="mg-back"><a href="/projects" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;work</a></p>
    </div>
  </section>`;
}

// the page's code is fetched as soon as a move towards it STARTS, so it is
// usually in hand by the time the paper closes over the page (pages.js)
let code = null;
export function prefetch() {
  code ||= import("../motionPage.js");
  return code;
}

export function mount(ctx) {
  const root = document.querySelector(".mg");
  if (!root) return;
  let gone = false;
  ctx.scope?.add(() => { gone = true; });
  prefetch()
    .then((m) => { if (!gone && root.isConnected) m.mountMotion(ctx, root); })
    .catch((err) => { code = null; console.error("[motion] page failed to mount:", err); });
}
