// motionPage.js — WHAT THE MOTION-GRAPHICS PAGE RUNS, FETCHED ONLY WHEN IT OPENS
//
// The viewer, the tiles' drawing, the wall's layout, the flower's run, the
// dithered ground and the credits are about 70 KB of script that nothing else
// on the site uses, and the site's first chunk is what every visitor
// downloads before the summary card is interactive. Measured: 119 KB before
// this page and 191 KB with it inlined. So pages/motion-graphics.js keeps only
// its markup in that chunk and asks for this module when the page is actually
// mounted -- the same argument that already keeps three.js out of it (src/mew.js).

import { CREDITS } from "./motioncredits.js";
import { CLIPS } from "./motionassets.js";
import { GROUND, FILM, worksOn } from "./motion.js";
import { lay } from "./motionLayout.js";
import { mountSheet } from "./motionSheet.js";
import { mountBloom } from "./motionBloom.js";
import { mountViewer } from "./motionViewer.js";
import { createAmbient } from "./motionAmbient.js";
import { afterArrival } from "../utils/arrival.js";

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── THE WALL'S SHAPE, PER WIDTH ────────────────────────────────────────────
// cols: how many columns; air: [lo, hi] above a tile, in column widths;
// stagger: how much deeper each column starts; seed: the scatter's deal.
// The featured works are big and close; the rest are smaller and looser, which
// is what makes the second wall read as a scatter and the first as a front.
// drift: how far each column travels against the scroll (px, either way), so
// the columns slide past each other like layers at different depths.
const WALLS = {
  top: {
    wide:   { cols: 3, air: [.1, .3],  stagger: .34, seed: 19, min: .62, max: 1 },
    mid:    { cols: 2, air: [.1, .26], stagger: .4,  seed: 19, min: .66, max: 1 },
    narrow: { cols: 2, air: [.08, .22], stagger: .4, seed: 19, min: .7,  max: 1 },
    drift: [-26, 44, -12]
  },
  mix: {
    wide:   { cols: 5, air: [.14, .6], stagger: .5, seed: 7, min: .5, max: .92 },
    mid:    { cols: 4, air: [.14, .5], stagger: .5, seed: 7, min: .55, max: .95 },
    narrow: { cols: 3, air: [.12, .4], stagger: .5, seed: 7, min: .6, max: 1 },
    drift: [34, -22, 58, -6, 40]
  }
};

function mountWalls(scope, root) {
  const walls = [...root.querySelectorAll(".mg-wall")];
  const narrow = matchMedia("(max-width:560px)"), mid = matchMedia("(max-width:860px)");
  const tilesOf = new Map(walls.map((w) => [w, [...w.querySelectorAll(".mg-tile")]]));
  function apply() {
    const size = narrow.matches ? "narrow" : mid.matches ? "mid" : "wide";
    for (const wall of walls) {
      const spec = WALLS[wall.classList.contains("mg-top") ? "top" : "mix"];
      const tiles = tilesOf.get(wall);
      const byId = new Map(tiles.map((t) => [t.dataset.id, t]));
      const { cols } = lay(tiles.map((t) => ({ id: t.dataset.id, dur: CLIPS[t.dataset.id]?.dur ?? 5 })), spec[size]);
      const frag = document.createDocumentFragment();
      cols.forEach((c, k) => {
        const col = document.createElement("div");
        col.className = "mg-col";
        col.setAttribute("role", "presentation");
        col.style.setProperty("--top", c.top);
        col.style.setProperty("--drift", `${spec.drift[k % spec.drift.length]}px`);
        for (const it of c.items) {
          const t = byId.get(it.id);
          t.style.setProperty("--w", it.w);
          t.style.setProperty("--x", it.x);
          t.style.setProperty("--dy", it.dy);
          col.append(t);
        }
        frag.append(col);
      });
      wall.replaceChildren(frag);
      wall.style.setProperty("--cols", cols.length);
      wall.classList.add("is-laid");
    }
  }
  apply();
  // a width that crosses a breakpoint deals the wall again (a resize, never a scroll)
  narrow.addEventListener("change", apply);
  mid.addEventListener("change", apply);
  scope?.add(() => { narrow.removeEventListener("change", apply); mid.removeEventListener("change", apply); });
}

// ── THE GROUND ─────────────────────────────────────────────────────────────
// At rest: the still of the pixelated flower. Pointing at a tile makes the
// page that work; pointing away puts the flower back. Only a pointer that
// MOVES points: a tile sliding under a resting pointer as the page scrolls
// does not change the ground, because the scroll is not the reader choosing
// anything (and following it is what made the ground flicker).
function mountGround(scope, root, ambient, bloom) {
  const rest = new Image();
  rest.decoding = "async";
  rest.src = CLIPS[GROUND]?.poster ?? CLIPS[FILM.id].poster;
  let on = null, lastScroll = -1e9;
  const pictureOf = (a) => (a.closest(".mg-bloom") ? bloom?.picture() : a.querySelector("canvas.mg-cv"));
  const set = (a) => {
    if (a === on) return;
    on = a;
    ambient.setSource((a && pictureOf(a)) || rest);
  };
  const onScroll = () => { lastScroll = performance.now(); };
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || performance.now() - lastScroll < 180) return;
    const a = e.target.closest?.(".mg-tile .mg-cell-a, .mg-bloom-frame");
    set(a || null);
  };
  const onLeave = (e) => { if (e.pointerType === "mouse" && !e.relatedTarget?.closest?.(".mg-tile .mg-cell-a, .mg-bloom-frame")) set(null); };
  window.addEventListener("scroll", onScroll, { passive: true });
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerout", onLeave);
  ambient.setSource(rest);
  scope?.add(() => {
    window.removeEventListener("scroll", onScroll);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerout", onLeave);
  });
  return { rest: () => { on = null; ambient.setSource(rest); } };
}

export function mountMotion(ctx, root) {
  // ── AT ONCE: what the reader sees as the page lands ──────────────────────
  // the credits, printed into the list the markup left for them, and the
  // wall in its columns -- DOM moves and custom properties, cheap, and done
  // before the page is uncovered so nothing jumps after it is
  const list = root.querySelector("[data-credits]");
  if (list) {
    list.innerHTML = CREDITS.map((c) => `
          <li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.work)}</a>` : esc(c.work)} <span>${esc(c.author)} · ${esc(c.licence)}</span></li>`).join("");
  }
  mountWalls(ctx.scope, root);

  // ── ONCE IT HAS ARRIVED: everything that costs ───────────────────────────
  // a WebGL context and its shader, the tiles' decoder and their drawing, the
  // flower's clip. Until then the tiles are black frames in their boxes, which
  // under the closing paper is all they need to be.
  afterArrival(ctx, () => {
    const ambient = createAmbient(root.querySelector(".mg-ground"));
    ctx.scope?.add(() => ambient.dispose());
    const sheet = mountSheet(ctx.scope, root);
    const bloom = mountBloom(ctx.scope, root);
    const ground = mountGround(ctx.scope, root, ambient, bloom);

    // THE VIEWER PAGES WITHIN WHAT YOU OPENED IT FROM, the way Photos pages
    // within the album: a tile on the wall pages through the wall, the flower
    // through its 21 cuts in order, and the film is on its own.
    const tileOf = (id) => root.querySelector(`.mg-wall [data-scene="${CSS.escape(id)}"] .mg-frame-cut`);
    const wallIds = [...new Set([...worksOn("top"), ...worksOn("mix")].map((w) => w.id))].filter((id) => CLIPS[id]);
    const lists = {
      works: { ids: wallIds, cellOf: tileOf, reveal: (id) => tileOf(id)?.scrollIntoView({ block: "nearest", behavior: "instant" }) },
      flower: bloom && { ids: bloom.ids, cellOf: () => bloom.frame(), reveal: (id) => bloom.reveal(id) },
      film: { ids: [FILM.id], cellOf: () => root.querySelector(".mg-end .mg-frame-cut"), reveal: () => {} }
    };
    mountViewer(ctx.scope, root, {
      lists,
      ambient,
      cover(on) { sheet.cover(on); if (on) bloom?.pause(); else bloom?.resume(); },
      // closed: the page's ground goes back to rest, not to the work just seen
      closed: () => ground.rest()
    });

    // ── AND AS THE NEXT MOVE STARTS: stop ──────────────────────────────────
    // the page is about to be covered; its video, tiles, clip and ground
    // would only be taking frames from the transition that covers them
    ctx.onLeave?.(() => { sheet.cover(true); bloom?.pause(); ambient.pause(); });
  });
}
