// photos.js — THE PHOTOS CARD: THE PHOTOGRAPHY AS A BLOCK, THE LIFE IN THE MARGINS
//
// Two kinds of picture, and the page keeps them apart.
//
// THE PHOTOGRAPHY is the work: few, chosen, meant to be looked at. It is one
// justified block the column wide (photolayout.js says how it is worked out
// from the pictures, and why): rows and features of different sizes that all
// end on the same edges, so the block is a rectangle with one gutter and no
// gaps. Every picture is uncropped.
//
// THE LIFE is his reel: many, casual, taken on the way to somewhere. It used to
// be a film strip drifting across the top of the card, which was slow, could
// not be got through, and looked like a banner stuck above a different page. It
// now hangs in the PAPER either side of the block, small, in two staggered
// columns, dealt round the block's spreads so the margins are hung all the way
// down. That is the layout language of every reference he keeps: the subject
// in the middle and the small things in the margins beside it. A print is a
// PRINT until you look at it -- the sky's two inks, pale, in one tone -- and
// the photograph while you do. (On a screen with no hover, the frames in the
// middle of the window are the ones that show.) On a tablet and a phone there
// is no margin, so each spread's life pictures follow it as a justified strip.
//
// Either opens THE VIEWER: one picture, as large as the window allows, on the
// paper. The same hands as the motion viewer: arrows or a swipe to page, Esc,
// the X, or a click on the paper to put it back, and it grows out of and
// shrinks back into the picture you opened.
//
// Everything the page needs to know about a picture's shape is in its file name
// (photoassets.js), so the page lays itself out with no measuring and nothing
// moves when a picture arrives: a block is an aspect-ratio and a grid of fr.

import { reducedMotion } from "../utils/motion.js";
import { PALETTE, unit } from "./palette.js";
import { copies, copyFor } from "./photoassets.js";
import { mosaic, spreads, fillRolls } from "./photolayout.js";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const REF = 1512;
const aspect = (p) => p.w / p.h;
const key = (set, p) => `${set}/${p.id}`;

/** what the window asks of the layout: the column, the gutter, the most in a row */
function profile() {
  const w = typeof innerWidth === "number" && innerWidth > 0 ? innerWidth : REF;
  if (w <= 560) return { name: "narrow", W: Math.max(240, w - 32), gap: 8, maxK: 2, spread: 1.2 };
  if (w <= 860) return { name: "mid", W: Math.min(720, w - 48), gap: 10, maxK: 3, spread: 1.0 };
  return { name: "wide", W: 960, gap: 14, maxK: 4, spread: 0.85 };
}

/** every copy of a picture a srcset can offer, by its real width */
function srcset(p) {
  const long = Math.max(p.w, p.h), seen = new Set();
  return copies(p).map(([edge, url]) => [Math.round(p.w * Math.min(1, edge / long)), url])
    .filter(([w]) => (seen.has(w) ? false : seen.add(w)))
    .map(([w, url]) => `${url} ${w}w`).join(", ");
}
const vw = (designPx) => `${Math.max(1, Math.round((designPx / REF) * 100))}vw`;

// ── THE PRINT ─────────────────────────────────────────────────────────────
// The life pictures are shown as the sky is: two inks on paper. Not a dither --
// a dither at this size was a pattern with a picture somewhere behind it, and
// nobody could tell what they were looking at before they hovered -- but the
// same two inks laid over a picture's own light and dark, by the same curves the
// sky's press uses (pressgl.js: ink A carries the dark, ink B only the deepest
// shadows), so a dark thing prints blue and its lamps print rose, and a face is
// still a face. It is a colour map, so it costs the compositor nothing per
// frame; a fine screen over it says "printed" without hiding anything.
/** the SVG filter, from the palette: light in -> the ink it would print as */
export function printFilter(id = "ph-print") {
  const A = unit(PALETTE.homeInkA), B = unit(PALETTE.homeInkB), P = unit(PALETTE.paper);
  const N = 16, ch = [[], [], []];
  for (let s = 0; s <= N; s++) {
    const L = s / N;                                       // 0 = black in the picture, 1 = white
    // ink A (the cerulean) carries the dark, as in the sky; ink B (the rose)
    // is laid where the light is, peaking in the upper mids, so a lamp or a
    // face prints rose and a shadow prints blue, and the whites stay nearly
    // paper. (The sky puts B in its deepest shadows; on a picture that turned
    // every dark thing purple and every light thing blue, and a night street
    // and a fireworks show could not be told apart.)
    const dA = Math.pow(1 - L, 1.15) * 0.85;
    const dB = 0.5 * Math.exp(-(((L - 0.62) / 0.3) ** 2));
    for (let k = 0; k < 3; k++) ch[k].push((P[k] * (1 + (A[k] - 1) * dA) * (1 + (B[k] - 1) * dB)).toFixed(4));
  }
  return `<svg class="ph-defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="${id}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">` +
    `<feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>` +
    `<feComponentTransfer><feFuncR type="table" tableValues="${ch[0].join(" ")}"/><feFuncG type="table" tableValues="${ch[1].join(" ")}"/><feFuncB type="table" tableValues="${ch[2].join(" ")}"/></feComponentTransfer></filter></svg>`;
}

/** the screen laid over a print: ink A dots on a 45 degree lattice, as a tiny tile */
function screenTile() {
  const c = PALETTE.homeInkA;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><circle cx='1' cy='1' r='.62' fill='${c}' fill-opacity='.30'/><circle cx='3' cy='3' r='.62' fill='${c}' fill-opacity='.30'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ── THE BLOCK ─────────────────────────────────────────────────────────────
function cell(p, set, area, px, first) {
  return `
        <button type="button" class="ph-f" data-photo="${esc(key(set, p))}" style="${area}" aria-label="Open photo">
          <img src="${copyFor(p, 1280)}" srcset="${srcset(p)}" sizes="(max-width:860px) 100vw, ${vw(px)}" width="${p.w}" height="${p.h}" alt=""${first ? ` fetchpriority="high"` : ` loading="lazy"`} decoding="async" />
        </button>`;
}

function blockHTML(b, pf, first) {
  const set = "photography";
  const ar = (pf.W / b.h).toFixed(4);
  if (b.kind === "row") {
    const sum = b.items.reduce((s, p) => s + aspect(p), 0);
    const cols = b.items.map((p) => `${aspect(p).toFixed(4)}fr`).join(" ");
    return `
      <div class="ph-blk" style="--ar:${ar}; grid-template-columns:${cols}">${b.items.map((p, i) =>
        cell(p, set, `grid-column:${i + 1}`, ((pf.W - pf.gap * (b.items.length - 1)) * aspect(p)) / sum, first && i === 0)).join("")}
      </div>`;
  }
  // a feature: the large picture spans every row of the stack beside it
  const m = b.items.length - 1;
  const fi = b.side === "l" ? 0 : m;
  const stack = b.items.filter((_, i) => i !== fi);
  const cols = b.side === "l" ? `${b.wf.toFixed(3)}fr ${b.ws.toFixed(3)}fr` : `${b.ws.toFixed(3)}fr ${b.wf.toFixed(3)}fr`;
  const rows = stack.map((p) => `${(1 / aspect(p)).toFixed(4)}fr`).join(" ");
  const fc = b.side === "l" ? 1 : 2, sc = b.side === "l" ? 2 : 1;
  return `
      <div class="ph-blk is-feature" style="--ar:${ar}; grid-template-columns:${cols}; grid-template-rows:${rows}">${
        cell(b.items[fi], set, `grid-column:${fc}; grid-row:1 / span ${m}`, b.wf, first)}${
        stack.map((p, i) => cell(p, set, `grid-column:${sc}; grid-row:${i + 1}`, b.ws, false)).join("")}
      </div>`;
}

// ── THE MARGINS ───────────────────────────────────────────────────────────
function lifeHTML(entry, side) {
  const col = (items) => `<div class="ph-col">${items.map(({ p, w }) => `
          <button type="button" class="lf" data-photo="${esc(key("reel", p))}" style="--w:${w}; --a:${aspect(p).toFixed(4)}" aria-label="Open photo">
            <img class="lf-print" src="${copyFor(p, 320)}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async" />
            <img class="lf-photo" src="${copyFor(p, 320)}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async" />
          </button>`).join("")}
        </div>`;
  // the column beside the block is the second one, so both rolls hang their
  // pictures against it
  const [outer, inner] = entry.cols;
  return `<div class="ph-roll is-${side}" role="group" aria-label="Snapshots">${side === "l" ? col(outer) + col(inner) : col(inner) + col(outer)}</div>`;
}

/** the whole card body, worked out for a window of this kind */
export function photosHTML(lists, i, pf = profile()) {
  const { REEL, PHOTOGRAPHY } = lists;
  const mos = mosaic(PHOTOGRAPHY, { W: pf.W, gap: pf.gap, maxK: pf.maxK });
  const sp = PHOTOGRAPHY.length ? spreads(mos.blocks, pf.gap, pf.W * pf.spread)
    : REEL.length ? [{ blocks: [], h: pf.W * pf.spread }] : [];
  // two rolls to a spread: the left one, then the right one
  const rolls = fillRolls(REEL, sp.flatMap((s) => [{ h: s.h }, { h: s.h }]), { seed: 7, widths: [76, 96, 88, 70, 102, 84], ceil: 1, gap: 18 });
  let first = true;
  const body = sp.map((s, n) => `
    <div class="ph-spread">
      ${lifeHTML(rolls[n * 2], "l")}
      <div class="ph-mos">${s.blocks.map((b) => { const h = blockHTML(b, pf, first); first = false; return h; }).join("")}
      </div>
      ${lifeHTML(rolls[n * 2 + 1], "r")}
    </div>`).join("");
  return `
    ${printFilter()}
    <div class="ph" data-ph="${pf.name}" style="--i:${i}; --ph-dots:${screenTile()}">${body}
    </div>`;
}

// ── ON THE PAGE ──────────────────────────────────────────────────────────
export function mountPhotos(ctx, lists) {
  const root = document.getElementById("p-photos");
  if (!root) return;
  const byKey = new Map([...lists.REEL.map((p) => [key("reel", p), p]), ...lists.PHOTOGRAPHY.map((p) => [key("photography", p), p])]);
  const listOf = (k) => (k.startsWith("reel/") ? lists.REEL : lists.PHOTOGRAPHY);
  const viewer = makeViewer(ctx.scope, byKey, listOf, (k) => root.querySelector(`[data-photo="${CSS.escape(k)}"]`));
  // one click on any picture opens it
  const onClick = (e) => {
    const f = e.target.closest("[data-photo]");
    if (f && root.contains(f)) viewer.open(f.dataset.photo);
  };
  root.addEventListener("click", onClick);
  ctx.scope?.add(() => root.removeEventListener("click", onClick));

  // THE LAYOUT IS A FUNCTION OF THE WINDOW'S KIND. Crossing a breakpoint (a
  // phone turned on its side, a window dragged narrower) re-deals the card:
  // fewer to a row, the life pictures out of the margins and into strips.
  let kind = profile().name;
  const rebuild = () => {
    const pf = profile();
    if (pf.name === kind) return;
    kind = pf.name;
    const old = root.querySelector(".ph"), defs = root.querySelector(".ph-defs");
    if (!old) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = photosHTML(lists, 4, pf);
    defs?.remove();
    old.replaceWith(...tpl.content.children);
    watchLit();
  };
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(rebuild, 150); };
  window.addEventListener("resize", onResize);
  ctx.scope?.add(() => { window.removeEventListener("resize", onResize); clearTimeout(rt); });

  // ON A SCREEN THAT CANNOT HOVER a snapshot shows its photograph while it is
  // in the middle of the window -- attention, which is what a pointer was
  let io = null;
  const watchLit = () => {
    io?.disconnect();
    if (!matchMedia("(hover:none)").matches || typeof IntersectionObserver === "undefined") return;
    io = new IntersectionObserver((es) => { for (const e of es) e.target.classList.toggle("lit", e.isIntersecting); },
      { rootMargin: "-36% 0px -36% 0px" });
    root.querySelectorAll(".lf").forEach((n) => io.observe(n));
  };
  watchLit();
  ctx.scope?.add(() => io?.disconnect());
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
  let list = [], i = 0, img = null, open = false, busy = false, back = null, setName = "photography";
  const keyOf = (p) => `${setName}/${p.id}`;

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
    n.srcset = srcset(p);
    n.sizes = `${Math.round((fit(p).width / innerWidth) * 100)}vw`;
    // the copy already on the page is the placeholder, so it is never blank
    n.style.backgroundImage = `url("${copyFor(p, 640)}")`;
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
    list = listOf(id); setName = id.slice(0, id.indexOf("/")); i = list.findIndex((x) => x.id === p.id);
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
    const cell = cellOf(keyOf(p))?.getBoundingClientRect();
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
