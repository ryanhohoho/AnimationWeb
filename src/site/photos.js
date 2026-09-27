// photos.js — THE PHOTOS CARD: A STRIP OF LIFE, AND THE PHOTOGRAPHY
//
// Two ways of showing pictures, because they are two kinds of picture.
//
// THE REEL is his life: many, casual, taken on the way to somewhere. It is a
// strip across the whole window, drifting slowly sideways the way a strip of
// film is pulled through a viewer, and it is PRINTED -- each frame is the
// picture put through the sky's own press (tools/bake_photos.mjs, riso) -- until
// you look at one, and then that one is the photograph. Colour on this site is
// an event (RYAN.txt, IX), and the event is your attention. A hand can take the
// strip and pull it either way; letting go lets it drift on from there.
//
// THE HANG is his photography: fewer, chosen, meant to be looked at. It is in
// the column, and it is paced like a photobook rather than filled like a
// wall: a pair, then one alone, then a pair -- every picture in a row the same
// height and none of them cropped. The one alone never takes more than ONE_W
// of the column and hangs to a side of it, left, then right, so there is
// always paper beside it; never in the middle (nothing he keeps is centred,
// and his references are mostly empty, RYAN.txt IX). The first version paired
// everything it could, and nine pictures came out as a wall of tiles. The rows are worked out here from
// each picture's own shape and written as proportions, so the page lays itself
// out with no measuring: a width that is a flex share of the column and a
// height that is aspect-ratio. Nothing moves when a picture arrives.
//
// Either opens THE VIEWER: one picture, as large as the window allows, on the
// paper (not on black -- the motion page's dark ground is that page's own
// instruction, and this card is the sheet). The same hands as the motion
// viewer: arrows or a swipe to page, Esc, the X, or a click on the paper to
// put it back, and it grows out of and shrinks back into the picture you
// opened.

import { reducedMotion } from "../utils/motion.js";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// design px (src/styles/designPx.js): the column is the deck's 60rem
const COL = 960;
const REF = 1512;
const REEL_H = 240;        // the strip's height; its prints are baked at twice this
const REEL_GAP = 6;        // paper between two frames: a strip, not a grid
const DRIFT = 20;          // px a second -- a frame's width in about ten
const HANG_GAP = 24;
const PAIR_MIN = 300;      // two in a row only if neither ends up shorter than this
const ONE_MAX = 560;       // one alone is never taller than this
const ONE_W = 0.62;        // ...nor wider than this share of the column

/** every copy of a picture a srcset can offer, by its real width, smallest first */
function srcset(p) {
  const long = Math.max(p.w, p.h), seen = new Set();
  return Object.entries(p.src).map(([edge, url]) => [Math.round(p.w * Math.min(1, Number(edge) / long)), url])
    .filter(([w]) => (seen.has(w) ? false : seen.add(w)))
    .map(([w, url]) => `${url} ${w}w`).join(", ");
}
const aspect = (p) => p.w / p.h;
const vw = (designPx) => `${Math.max(1, Math.round((designPx / REF) * 100))}vw`;

// ── THE REEL ──────────────────────────────────────────────────────────────
// The track is the set of frames twice over, and it moves by exactly half its
// own length and starts again -- where it starts is where the second copy
// was, so the loop has no seam. The set is repeated first until one copy is
// wider than the widest window it will be in (in design px, so at any size),
// or a short reel would drift its own end into view. The second copy is not
// there for a screen reader or the tab key.
export function reelHTML(list, i) {
  const one = list.reduce((s, p) => s + REEL_H * aspect(p) + REEL_GAP, 0);
  const k = Math.max(1, Math.ceil((REF * 1.15) / one));
  const frame = (p, hidden) => `
        <button type="button" class="reel-f" data-photo="${esc(p.id)}" style="--a:${aspect(p).toFixed(4)}"${hidden ? ` tabindex="-1" aria-hidden="true"` : ` aria-label="Open photo"`}>
          <img class="reel-print" src="${p.print}" alt="" loading="lazy" decoding="async" />
          <img class="reel-photo" src="${p.src[640]}" alt="" loading="lazy" decoding="async" />
        </button>`;
  const copy = (hidden) => Array.from({ length: k }, (_, n) => list.map((p) => frame(p, hidden || n > 0)).join("")).join("");
  const secs = ((one * k) / DRIFT).toFixed(1);
  return `
    <div class="reel" data-reel style="--i:${i}; --reel-t:${secs}s">
      <div class="reel-track">${copy(false)}${copy(true)}
      </div>
    </div>`;
}

// ── THE HANG ──────────────────────────────────────────────────────────────
/** the rows: pure, so it is the same on every screen and testable in node */
export function hangRows(list) {
  const rows = [];
  let side = 0, lastPair = false;
  for (let n = 0; n < list.length;) {
    const a = aspect(list[n]), b = n + 1 < list.length ? aspect(list[n + 1]) : 0;
    const pairH = b ? (COL - HANG_GAP) / (a + b) : 0;
    if (!lastPair && b && pairH >= PAIR_MIN) {
      rows.push({ items: [list[n], list[n + 1]], h: pairH });
      n += 2; lastPair = true; continue;
    }
    const h = Math.min(ONE_MAX, (COL * ONE_W) / a);
    rows.push({ items: [list[n]], h, frac: (h * a) / COL, side: side++ % 2 ? "r" : "l" });
    n += 1; lastPair = false;
  }
  return rows;
}

export function hangHTML(list, i) {
  return `
    <div class="hang" style="--i:${i}">${hangRows(list).map((r) => {
      const sum = r.items.reduce((s, p) => s + aspect(p), 0);
      const cells = r.items.map((p) => {
        // how much of the window this picture is, for picking a copy
        const px = r.items.length === 1 ? r.frac * COL : ((COL - HANG_GAP) * aspect(p)) / sum;
        return `
        <button type="button" class="hang-f" data-photo="${esc(p.id)}" style="--a:${aspect(p).toFixed(4)}" aria-label="Open photo">
          <img srcset="${srcset(p)}" sizes="(max-width:860px) 100vw, ${vw(px)}" alt="" loading="lazy" decoding="async" />
        </button>`;
      }).join("");
      const cls = r.items.length === 1 ? ` is-one${r.side ? ` is-${r.side}` : ""}` : "";
      const style = r.items.length === 1 ? `; --w:${(r.frac * 100).toFixed(3)}%` : "";
      return `
      <div class="hang-row${cls}"${style ? ` style="${style.slice(2)}"` : ""}>${cells}
      </div>`;
    }).join("")}
    </div>`;
}

// ── ON THE PAGE ──────────────────────────────────────────────────────────
export function mountPhotos(ctx, lists) {
  const root = document.getElementById("p-photos");
  if (!root) return;
  const byId = new Map([...lists.REEL, ...lists.PHOTOGRAPHY].map((p) => [p.id, p]));
  const listOf = (id) => (id.startsWith("reel-") ? lists.REEL : lists.PHOTOGRAPHY);
  const viewer = makeViewer(ctx.scope, byId, listOf, (id) =>
    root.querySelector(`[data-photo="${CSS.escape(id)}"]:not([aria-hidden])`));
  const reel = root.querySelector("[data-reel]");
  if (reel) mountReel(ctx, reel, (id) => viewer.open(id));
  // the hang opens on a click; the reel opens on a tap it tells apart from a pull
  const onClick = (e) => {
    const f = e.target.closest(".hang-f");
    if (f) viewer.open(f.dataset.photo);
  };
  root.addEventListener("click", onClick);
  ctx.scope?.add(() => root.removeEventListener("click", onClick));
}

// THE PULL. The drift is a CSS animation -- the compositor's job, not a loop
// of ours, and it never stutters -- so a pull has to take the strip off it and
// put it back without a jump. Where the strip is when a finger lands is read
// ONCE (a computed transform, on a pointer event, never per frame); the finger
// then moves it, one write per frame; and letting go restarts the animation
// with a negative delay that puts it exactly where the finger left it.
function mountReel(ctx, reel, open) {
  const track = reel.querySelector(".reel-track");
  const secs = parseFloat(reel.style.getPropertyValue("--reel-t")) || 60;
  let g = null, raf = 0;
  const xOf = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
  const wrap = (x, half) => ((x % half) - half) % half;           // always in (-half, 0]
  const apply = () => { raf = 0; if (g) track.style.transform = `translate3d(${wrap(g.x0 + g.dx, g.half)}px,0,0)`; };

  const down = (e) => {
    if (!e.isPrimary || e.button > 0) return;
    const half = track.getBoundingClientRect().width / 2;
    g = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: xOf(), dx: 0, half, moved: false, frame: e.target.closest(".reel-f") };
  };
  const move = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      // a vertical start is the page being scrolled: let it go
      if (Math.abs(dy) > Math.abs(dx)) { g = null; return; }
      g.moved = true;
      reel.classList.add("is-held");
      track.style.animation = "none";
      reel.setPointerCapture?.(e.pointerId);
    }
    g.dx = dx;
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const up = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const s = g; g = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    // a tap: open the frame it landed on (either copy -- they are the same picture)
    if (!s.moved) { if (s.frame) open(s.frame.dataset.photo); return; }
    const x = wrap(s.x0 + s.dx, s.half);
    reel.classList.remove("is-held");
    track.style.transform = "";
    track.style.animation = "";
    track.style.animationDelay = `${((x / s.half) * secs).toFixed(3)}s`;
  };
  const cancel = (e) => { if (g && e.pointerId === g.id) { g.moved = true; up(e); } };

  reel.addEventListener("pointerdown", down);
  reel.addEventListener("pointermove", move);
  reel.addEventListener("pointerup", up);
  reel.addEventListener("pointercancel", cancel);
  // a pointer opens a frame on pointerup, above; a keyboard's Enter or Space is
  // a click with no pointer behind it (detail 0), and that is the only click
  // this listens to -- a tap's own click would open it twice
  const key = (e) => { const f = e.target.closest(".reel-f"); if (f && e.detail === 0) open(f.dataset.photo); };
  reel.addEventListener("click", key);
  ctx.scope?.add(() => { if (raf) cancelAnimationFrame(raf); });
}

// ── THE VIEWER ───────────────────────────────────────────────────────────
const CROSS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/></svg>`;
const CHEV = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? "M15 4.5 7.5 12 15 19.5" : "M9 4.5 16.5 12 9 19.5"}"/></svg>`;
const EASE = "cubic-bezier(.2,.8,.2,1)";
const OPEN_MS = reducedMotion ? 0 : 340;
const TURN_MS = reducedMotion ? 0 : 240;

function makeViewer(scope, byId, listOf, cellOf) {
  const el = document.createElement("div");
  el.className = "phv";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Photo");
  el.setAttribute("data-noswipe", "");
  el.tabIndex = -1;
  el.innerHTML = `
    <div class="phv-bg"></div>
    <button class="phv-side" data-step="-1" aria-label="Previous photo">${CHEV(-1)}</button>
    <button class="phv-side" data-step="1" aria-label="Next photo">${CHEV(1)}</button>
    <button class="phv-close" aria-label="Close">${CROSS}</button>`;
  document.body.append(el);
  const bg = el.querySelector(".phv-bg");
  let list = [], i = 0, img = null, open = false, busy = false, back = null;

  // the picture's box: as large as the window allows, inside a margin
  function fit(p) {
    const W = innerWidth, H = innerHeight, full = W <= 560;
    const m = full ? 0 : Math.max(28, Math.min(W, H) * 0.06);
    const s = Math.min((W - 2 * m) / p.w, (H - 2 * m) / p.h);
    const w = p.w * s, h = p.h * s;
    return { left: (W - w) / 2, top: (H - h) / 2, width: w, height: h };
  }
  function place(node, p) {
    const b = fit(p);
    Object.assign(node.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    return b;
  }
  function picture(p) {
    const n = document.createElement("img");
    n.className = "phv-img";
    n.alt = "";
    n.decoding = "async";
    const long = Math.max(p.w, p.h), seen = new Set();
    n.srcset = Object.entries(p.src).map(([e, u]) => [Math.round(p.w * Math.min(1, e / long)), u])
      .filter(([w]) => (seen.has(w) ? false : seen.add(w))).map(([w, u]) => `${u} ${w}w`).join(", ");
    n.sizes = `${Math.round((fit(p).width / innerWidth) * 100)}vw`;
    // the copy already on the page is the placeholder, so it is never blank
    n.style.backgroundImage = `url("${p.src[640]}")`;
    place(n, p);
    return n;
  }
  const sides = () => el.querySelectorAll(".phv-side").forEach((b) => {
    const k = i + Number(b.dataset.step);
    b.disabled = k < 0 || k >= list.length;
  });
  const flip = (from, to) => `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;

  function show(id) {
    const p = byId.get(id);
    if (!p || busy) return;
    list = listOf(id); i = list.findIndex((x) => x.id === id);
    back = document.activeElement;
    open = true;
    el.hidden = false;
    img = picture(p);
    el.append(img);
    sides();
    el.focus({ preventScroll: true });
    const cell = cellOf(id)?.getBoundingClientRect();
    if (!cell || !OPEN_MS) return;
    busy = true;
    const to = fit(p);
    img.animate([{ transform: flip(cell, to) }, { transform: "none" }], { duration: OPEN_MS, easing: EASE })
      .finished.then(() => { busy = false; }, () => { busy = false; });
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE });
  }

  function close() {
    if (!open || busy) return;
    const p = list[i], node = img;
    const cell = cellOf(p.id)?.getBoundingClientRect();
    const onScreen = cell && cell.bottom > 0 && cell.top < innerHeight && cell.right > 0 && cell.left < innerWidth;
    const end = () => { node.remove(); el.hidden = true; open = false; busy = false; img = null; back?.focus?.({ preventScroll: true }); };
    if (!OPEN_MS) { end(); return; }
    busy = true;
    const from = fit(p);
    const out = onScreen ? [{ transform: "none" }, { transform: flip(cell, from) }] : [{ opacity: 1 }, { opacity: 0 }];
    node.animate(out, { duration: OPEN_MS, easing: EASE, fill: "forwards" }).finished.then(end, end);
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OPEN_MS, easing: EASE, fill: "forwards" })
      .finished.then(() => bg.getAnimations().forEach((a) => a.cancel()), () => {});
  }

  // A TURN, the motion viewer's: the picture steps a little the way you went
  // and fades, the next steps in from that side over it. Nothing else moves.
  function go(k) {
    if (!open || busy || k < 0 || k >= list.length || k === i) return;
    const d = Math.sign(k - i), old = img, p = list[k];
    i = k;
    img = picture(p);
    el.append(img);
    sides();
    if (!TURN_MS) { old.remove(); return; }
    busy = true;
    const step = d * 40;
    old.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-step}px)`, opacity: 0 }],
      { duration: TURN_MS * 0.8, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" }).finished.then(() => old.remove(), () => old.remove());
    img.animate([{ transform: `translateX(${step}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: TURN_MS, delay: TURN_MS * 0.12, easing: EASE, fill: "backwards" })
      .finished.then(() => { busy = false; }, () => { busy = false; });
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b?.classList.contains("phv-close")) close();
    else if (b?.dataset.step) go(i + Number(b.dataset.step));
    else if (!b && !e.target.closest(".phv-img")) close();
  });
  // a swipe: sideways pages, downwards puts it back
  let t = null;
  el.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" && e.isPrimary) t = { x: e.clientX, y: e.clientY, at: performance.now() }; });
  el.addEventListener("pointerup", (e) => {
    if (!t) return;
    const dx = e.clientX - t.x, dy = e.clientY - t.y, fast = performance.now() - t.at < 500;
    t = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && fast) go(i - Math.sign(dx));
    else if (dy > 70 && dy > Math.abs(dx)) close();
  });
  el.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  el.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

  // heard on the DOCUMENT and stopped, so ← → page the pictures rather than
  // turning the deck (the router listens on the window)
  const onKey = (e) => {
    if (!open || e.metaKey || e.ctrlKey || e.altKey) return;
    let used = true;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  };
  document.addEventListener("keydown", onKey);
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (open && img) place(img, list[i]); }, 120); };
  window.addEventListener("resize", onResize);

  scope?.add(() => {
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    clearTimeout(rt);
    el.remove();
  });
  return { open: show, close };
}
