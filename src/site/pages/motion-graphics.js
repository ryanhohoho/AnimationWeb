// pages/motion-graphics.js — EXPERIMENTAL MOTION GRAPHICS
//
// The one page on this site that does not wear the site's clothes, by
// instruction (2026-09-25): it dresses in the PIECE's -- "let me be a flower"
// (../VisualAudialExperience) -- a dark ground, its blue grade, its dithers
// and scanlines, its computer-vision boxes. The portfolio's paper, die-cuts
// and riso sky stop at the door.
//
// WHAT IS ON IT, top to bottom:
//
//   · the head, and the film standing beside it as the largest frame;
//   · THE CUT: the whole film as one strip, every scene as a segment as long as
//     it lasts in the film -- the "A flower." flicker is a run of hairlines,
//     the angels a long bar -- so the piece's pacing is legible at a glance,
//     and pressing a segment opens the film at that moment;
//   · the scenes, by the piece's own four parts. Two runs of the piece are one
//     gesture each and are laid out as one: the 21 cuts of "A flower." as a
//     single strip of film, and the devices montage as a flurry of small
//     frames that LANDS on four larger ones, the way the cut holds on them;
//   · behind the scenes, and the credits as one long list at the foot.
//
// Every frame is boxed the way the piece's own computer vision boxes what it
// sees (m_angels.js: thin translucent lines, a label above; cyan while it
// tracks, deep red once it has locked). The page's ground is the scene you are
// looking at, dithered (site/motionAmbient.js).
//
// THE MECHANICS are unchanged by the look: every cell plays from ONE video
// (site/motionSheet.js); the viewer opens out of the cell and closes back into
// it, with the Photos app's gestures on a phone (site/motionViewer.js).
//
// THE WORDS: the headline, the lead and the process notes are strings in this
// file; the scenes' names are in site/motion.js. Both are the editor's to
// change. The behind-the-scenes figures are ordinary capture() slots: select
// one in the editor and Replace… takes a picture or a clip from Finder.

import { capture } from "../media.js";
import { ACTS, FILM, GROUPS, SCENES } from "../motion.js";
// the viewer, the sheet's drawing, the ground and the credits are fetched when
// the page mounts (site/motionPage.js), not with the site


const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** m:ss, which is how a running time is written everywhere */
export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const two = (n) => String(n).padStart(2, "0");

// A scene's tile on the contact sheet is its place in the order (the film is
// 0), which is how tools/bake_motion.mjs lays the sheet out -- so the markup
// needs no asset table, and the table (106 hashed URLs) stays out of the
// site's first chunk with the rest of this page's code.
function cell(sc, no, cls = "") {
  return `
          <li class="mg-cell${cls}">
            <a class="mg-cell-a" href="#${esc(sc.id)}" data-scene="${esc(sc.id)}"
               aria-label="${esc(sc.name)}">
              <span class="mg-tag" aria-hidden="true"><span class="mg-no">${esc(two(no))}</span></span>
              <span class="mg-frame-cut"><canvas class="mg-cv" data-cell="${no}" aria-hidden="true"></canvas><i class="mg-box" aria-hidden="true"></i></span>
              <span class="mg-name">${esc(sc.name)}</span>
            </a>
          </li>`;
}

export function html(p) {
  const total = FILM.film[1];
  let no = 0;

  // the scenes, by part; a group is one row of its own
  const acts = ACTS.map((a, ai) => {
    const own = SCENES.filter((s) => s.act === ai);
    let out = `
      <li class="mg-act" role="presentation">
        <span class="mg-act-n">${esc(a.n)}</span>
        <span class="mg-act-name">${esc(a.name)}</span>
      </li>`;
    for (let k = 0; k < own.length;) {
      const g = own[k].group;
      if (!g) { out += cell(own[k], ++no); k++; continue; }
      const run = [];
      while (k < own.length && own[k].group === g) run.push(own[k++]);
      out += `
      <li class="mg-group mg-group-${esc(g)}" role="presentation">
        <p class="mg-group-h"><span>${esc(GROUPS[g].name)}</span> <span class="mg-group-note">${esc(GROUPS[g].note)}</span></p>
        <ol class="mg-run"${g === "flower" ? " data-noswipe" : ""}>${run.map((s) => cell(s, ++no, s.land ? " is-land" : "")).join("")}
        </ol>
      </li>`;
    }
    return out;
  }).join("");

  // THE CUT: every scene as long as it lasts in the film; the gaps are the
  // piece's own black (the warning it opens on, the silence before the end)
  let t = 0;
  const segs = [];
  for (const s of SCENES) {
    if (s.film[0] > t + .01) segs.push(`<span class="mg-seg is-black" style="flex-grow:${(s.film[0] - t).toFixed(3)}"></span>`);
    segs.push(`<a class="mg-seg a${s.act}" href="#film" data-scene="film" data-film-at="${s.film[0]}" style="flex-grow:${(s.film[1] - s.film[0]).toFixed(3)}" aria-label="${esc(s.name)}, at ${clock(s.film[0])}" title="${esc(s.name)}"></a>`);
    t = s.film[1];
  }
  if (total > t + .01) segs.push(`<span class="mg-seg is-black" style="flex-grow:${(total - t).toFixed(3)}"></span>`);
  const ticks = Array.from({ length: Math.floor(total / 30) + 1 }, (_, k) =>
    `<span style="left:${(100 * k * 30 / total).toFixed(3)}%">${clock(k * 30)}</span>`).join("");

  return `
  <section class="plate mg" id="p0">
    <canvas class="mg-ground" aria-hidden="true"></canvas>
    <div class="mg-in">
      <header class="mg-head">
        <div class="mg-head-t">
          <p class="mg-kicker">${esc(p.n)} · ${esc(p.year)}</p>
          <h1 class="mg-h">experimental<br /><em>motion graphics</em></h1>
          <p class="mg-lead">A vertical piece made for phones, cut here into every one of its scenes. Each one is drawn live in the browser by its own shader and scored by code.</p>
          <p class="mg-hud"><span>${SCENES.length}&nbsp;scenes</span><span>${clock(total)}</span><span>9:19.5</span><span>30&nbsp;fps</span></p>
        </div>
        <ul class="mg-film" role="list">${cell(FILM, 0, " is-film")}
        </ul>
      </header>

      <div class="mg-cut">
        <div class="mg-cut-bar">${segs.join("")}</div>
        <div class="mg-cut-ticks" aria-hidden="true">${ticks}</div>
      </div>

      <ol class="mg-sheet" aria-label="Every scene">${acts}
      </ol>

      <section class="mg-bts" aria-labelledby="mg-bts-h">
        <h2 class="mg-bts-h" id="mg-bts-h">behind the scenes</h2>
        <p class="mg-body">Placeholder. The process notes go here: the engine, the offline renders, the path-traced undercroft in Blender, the measured camera shake.</p>
        <p class="mg-body">Placeholder. A second paragraph, for whatever the first did not have room for.</p>
        <div class="mg-bts-figs">
          ${capture({ id: "motion-bts-1", ratio: "1.7778", alt: "Behind the scenes." })}
          ${capture({ id: "motion-bts-2", ratio: "1.7778", alt: "Behind the scenes." })}
          ${capture({ id: "motion-bts-3", ratio: "0.75", cls: "narrow", alt: "Behind the scenes." })}
        </div>
      </section>

      <section class="mg-credits" aria-label="Credits">
        <p class="mg-credits-h">credits · <span data-credits-n></span> sources</p>
        <p class="mg-credits-note">Everything not listed was made for the piece procedurally, in code: the shaders, the score, the typography and the pixel flowers. Faces: Bodoni Moda (Owen Earl), Instrument Serif, JetBrains Mono, Silkscreen, Noto Sans JP, Noto Serif SC and VT323, under the SIL Open Font License 1.1.</p>
        <ul class="mg-credits-list" data-credits></ul>
      </section>

      <p class="mg-back"><a href="/projects" data-route>←&nbsp;back&nbsp;to&nbsp;the&nbsp;work</a></p>
    </div>
  </section>`;
}

export function mount(ctx) {
  const root = document.querySelector(".mg");
  if (!root) return;
  let gone = false;
  ctx.scope?.add(() => { gone = true; });
  import("../motionPage.js")
    .then((m) => { if (!gone && root.isConnected) m.mountMotion(ctx, root); })
    .catch((err) => console.error("[motion] page failed to mount:", err));
}
