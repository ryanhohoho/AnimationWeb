// about.js — THE ABOUT CARD: WHO HE IS WHEN HE IS NOT WORKING
//
// Card four since 2026-10-04, in the slot the Photos card had (the photos
// sheet still exists and hangs off this one: router.js, SHEETS_OFF). By
// instruction, top to bottom:
//
//   THE INTRO      a few words and his interests (placeholders until he writes
//                  them: content.js, ABOUT), and his picture
//   THE LIFE       four polaroids hung in the paper either side, each turning
//                  through the reel's pictures on its own clock; pressed, one
//                  opens large in the photos sheet's viewer
//   PHOTOGRAPHY    one picture at a time in a frosted frame, turning by itself
//                  (the frosted border is the owner's pick from claireyluo's
//                  site); pressed, it opens the photos sheet
//   MUSIC          the albums on a wheel (aboutMusic.js)
//   THE BINDER     his Pokemon cards, in a binder drawn the way Mew is drawn
//                  (binder.js, a separate chunk: it is three.js)
//
// Mew is not on this card (mewPresence.js): it is a page to look through, and
// the binder is the thing on it that moves.
//
// Nothing here measures on a hover or a scroll. Each thing that turns by
// itself does so only while it is on screen and the tab is showing, and stops
// before the next page is drawn (ctx.onLeave).

import { ABOUT } from "./content.js";
import { REEL, PHOTOGRAPHY, BINDER, PORTRAIT, copyFor, copies } from "./photoassets.js";
import { ALBUMS } from "./music.js";
import { musicHTML, mountMusic } from "./aboutMusic.js";
import { makeViewer } from "./photos.js";
import { reducedMotion } from "../utils/motion.js";
import { mulberry32 } from "../utils/math.js";

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const srcset = (p) => copies(p).map(([e, u]) => `${u} ${Math.round(p.w * Math.min(1, e / Math.max(p.w, p.h)))}w`).join(", ");

// ── THE LIFE: WHERE THE POLAROIDS HANG ────────────────────────────────────
// Design px against the column (960 wide on a desktop): negative x is the left
// margin, past 960 the right; r is each one's lean. Four, not six (2026-10-04,
// second pass: six printed frames made the page busy), staggered so no two
// line up like a ruler, beside the intro and the photographs. On a tablet or
// a phone there is no margin, and they become a row under the intro.
const FRAMES = [
  { x: -232, y: 10, w: 128, r: -5 }, { x: -190, y: 520, w: 116, r: 4 },
  { x: 1036, y: 190, w: 124, r: 5 }, { x: 1066, y: 700, w: 112, r: -3 }
];
const CYCLE_MS = 3400;             // one frame turns every this; each, every 4x
const AUTO_MS = 4200;              // the photography's own turn

/** the reel dealt round the frames: seeded, so a visit is the same every time */
export function dealReel(list, frames = FRAMES.length, seed = 151) {
  const r = mulberry32(seed), a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const out = Array.from({ length: frames }, () => []);
  a.forEach((p, i) => out[i % frames].push(p));
  return out;
}

function reelHTML(decks) {
  const layer = (p, on) => `<span class="ar-l${on ? " is-on" : ""}">${p ? `<img src="${copyFor(p, 640)}" alt="" draggable="false" loading="lazy" decoding="async" />` : ""}</span>`;
  return `
      <div class="ar" role="group" aria-label="Snapshots">${FRAMES.map((f, i) => decks[i]?.length ? `
        <button type="button" class="ar-f" data-f="${i}" data-photo="reel/${esc(decks[i][0].id)}" aria-label="Open this snapshot" style="--x:${f.x}; --y:${f.y}; --w:${f.w}; --r:${f.r}deg"><span class="ar-win">${layer(decks[i][0], true)}${layer(null, false)}<span class="ar-pic"></span></span></button>` : "").join("")}
      </div>`;
}

// ── PHOTOGRAPHY: ONE AT A TIME, IN A FROSTED FRAME ────────────────────────
// Five frames, for the pictures two either side of the one shown. They are
// TURNED, never re-pointed while seen: a step moves every frame one place and
// gives a new picture only to the one that has gone round from one end to the
// other, invisible at both. (The motion viewer learned this: re-pointing a
// frame that is on screen flashes the picture it had.)
const NEAR = [-2, -1, 0, 1, 2];
function carouselHTML(list) {
  if (!list.length) return `<div class="pc is-empty"><div class="pc-stage"></div></div>`;
  const slide = (o) => {
    const p = list[((o % list.length) + list.length) % list.length];
    return `
          <a class="pc-s" href="/photos" data-route data-o="${o}" tabindex="${o ? -1 : 0}" draggable="false" aria-label="Photography: open the photos">
            <span class="pc-glass">
              <span class="pc-pic" data-cross-from>
                <img class="pc-soft" src="${copyFor(p, 640)}" alt="" draggable="false" decoding="async" />
                <img class="pc-sharp" src="${copyFor(p, 1280)}" srcset="${srcset(p)}" sizes="(max-width:860px) 60vw, 300px" alt="" draggable="false" decoding="async" />
              </span>
            </span>
          </a>`;
  };
  const dots = list.length > 1 && list.length <= 24
    ? `<div class="pc-dots" role="tablist" aria-label="Choose a photograph">${list.map((_, i) => `<button type="button" class="pc-dot${i ? "" : " on"}" data-i="${i}" role="tab" aria-selected="${i ? "false" : "true"}" aria-label="Photograph ${i + 1}"></button>`).join("")}</div>`
    : list.length > 24 ? `<div class="pc-bar" aria-hidden="true"><span></span></div>` : "";
  return `
      <div class="pc" data-pc data-noswipe role="group" aria-roledescription="carousel" aria-label="Photography">
        <div class="pc-stage">${NEAR.map(slide).join("")}
        </div>${dots}
      </div>`;
}

/** the whole card body */
export function aboutHTML(i = 3) {
  const ph = ABOUT.placeholder ? " is-ph" : "";
  const me = PORTRAIT[0];
  const portrait = me
    ? `<div class="ab-me-f"><img src="${copyFor(me, 1280)}" srcset="${srcset(me)}" sizes="(max-width:860px) 40vw, 260px" width="${me.w}" height="${me.h}" alt="Ryan Ho" draggable="false" decoding="async" /></div>`
    : `<div class="ap ab-me-ap" data-ap></div>`;
  return `
    <div class="ab">
      <div class="ab-intro" style="--i:${i}">
        <div class="ab-words">
          <p class="t dim ab-k">ABOUT ME</p>
          <p class="t body ab-text${ph}">${esc(ABOUT.me)}</p>
          <p class="t dim ab-k ab-k2">INTERESTS</p>
${ABOUT.interests.map((t) => `
          <p class="t body ab-text${ph}">${esc(t)}</p>`).join("")}
        </div>
        <div class="ab-me">${portrait}</div>
      </div>
      ${REEL.length ? reelHTML(dealReel(REEL)) : ""}
      <div class="ab-row" style="--i:${i + 1}">
        <section class="ab-sec ab-photo" data-e="ab-photo-s1" aria-label="Photography">
          <p class="t dim ab-k">PHOTOGRAPHY</p>${carouselHTML(PHOTOGRAPHY)}
        </section>
        <section class="ab-sec ab-music" data-e="ab-music-s1" aria-label="Music">
          <p class="t dim ab-k">MUSIC</p>${musicHTML(ALBUMS)}
        </section>
      </div>
      <section class="ab-sec ab-binder" data-e="ab-binder-s1" aria-label="Pokemon binder" style="--i:${i + 2}">
        <p class="t dim ab-k">BINDER</p>
        <div class="bd" data-bd data-noswipe>
          <div class="bd-stage" tabindex="0" role="img" aria-label="A binder of Pokemon cards. Drag to turn it; press it to open it and turn the pages."></div>
          <div class="bd-ctl">
            <button type="button" class="bd-b" data-step="-1" aria-label="Previous page" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.5 7.5 12 15 19.5"/></svg></button>
            <button type="button" class="bd-b" data-step="1" aria-label="Open the binder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5 16.5 12 9 19.5"/></svg></button>
          </div>
        </div>
      </section>
    </div>`;
}

// ── ON THE PAGE ──────────────────────────────────────────────────────────
export function mountAbout(ctx) {
  const root = document.getElementById("p-about");
  if (!root) return;
  const live = { seen: new Map() };
  // one observer for everything that turns by itself: it only turns on screen
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => {
    for (const e of es) live.seen.set(e.target, e.isIntersecting);
  }, { rootMargin: "60px 0px" }) : null;
  const seen = (el) => !io || live.seen.get(el) !== false;
  ctx.scope?.add(() => io?.disconnect());

  mountCarousel(root, PHOTOGRAPHY, ctx, io, seen);
  mountReel(root, ctx, io, seen);
  mountMusic(root, ALBUMS, ctx);
  mountBinderWhenNear(root, ctx);
}

// ── THE CAROUSEL ─────────────────────────────────────────────────────────
function mountCarousel(root, list, ctx, io, seen) {
  const el = root.querySelector("[data-pc]");
  if (!el || list.length < 2) return;
  const stage = el.querySelector(".pc-stage");
  const slides = [...el.querySelectorAll(".pc-s")].map((a) => ({ a, o: Number(a.dataset.o), soft: a.querySelector(".pc-soft"), sharp: a.querySelector(".pc-sharp") }));
  const dots = [...el.querySelectorAll(".pc-dot")];
  const bar = el.querySelector(".pc-bar > span");
  const N = list.length, sig = ctx.scope?.signal;
  let i = 0, timer = 0, hover = false, focus = false, drag = null, moved = 0;
  io?.observe(el);

  const pic = (k) => list[((k % N) + N) % N];
  const point = (s, k) => {
    const p = pic(k);
    s.soft.src = copyFor(p, 640);
    s.sharp.srcset = srcset(p);
    s.sharp.src = copyFor(p, 1280);
  };
  const mark = () => {
    dots.forEach((d, k) => { const on = k === ((i % N) + N) % N; d.classList.toggle("on", on); d.setAttribute("aria-selected", String(on)); });
    // the bar's tick is 12% of the bar, so its own width x 733% is the far end
    if (bar) bar.style.transform = `translateX(${((((i % N) + N) % N) / Math.max(1, N - 1)) * 733.3}%)`;
  };
  const place = () => {
    for (const s of slides) {
      s.a.dataset.o = String(s.o);
      s.a.tabIndex = s.o === 0 ? 0 : -1;
    }
    mark();
  };
  // one step either way: every frame moves one place; the one that falls off
  // an end comes round to the other, where it is invisible, with its new picture
  function step(d) {
    i += d;
    for (const s of slides) {
      s.o -= d;
      if (s.o < -2 || s.o > 2) {
        s.o = s.o < -2 ? s.o + 5 : s.o - 5;
        // it crosses the stage while invisible: no transition, or it is seen
        // sweeping behind the glass
        s.a.classList.add("is-wrap");
        point(s, i + s.o);
      }
    }
    place();
    // the jump has been drawn at its new place; transitions back on next frame
    requestAnimationFrame(() => slides.forEach((s) => s.a.classList.remove("is-wrap")));
    arm();
  }
  // a dot further than one away: every frame takes its new picture at once
  function jump(k) {
    const d = k - (((i % N) + N) % N);
    if (!d) return;
    if (Math.abs(d) === 1) { step(d); return; }
    i += d;
    for (const s of slides) point(s, i + s.o);
    el.classList.remove("is-jump"); void el.offsetWidth; el.classList.add("is-jump");
    place();
    arm();
  }
  const arm = () => {
    clearTimeout(timer);
    if (reducedMotion) return;
    timer = setTimeout(() => {
      if (!hover && !focus && !drag && !document.hidden && seen(el)) step(1);
      else arm();
    }, AUTO_MS);
  };

  // a swipe or a mouse drag turns it; a press without one opens the photos
  // sheet (the frame's own <a>), or, on a picture either side, brings it in
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved = 0;
  }, { signal: sig });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    moved = Math.max(moved, Math.abs(e.clientX - drag.x));
  }, { signal: sig });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  };
  stage.addEventListener("pointerup", end, { signal: sig });
  stage.addEventListener("pointercancel", () => { drag = null; }, { signal: sig });
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".pc-dot");
    if (b) { jump(Number(b.dataset.i)); return; }
    const a = e.target.closest(".pc-s");
    if (!a) return;
    // marked used, so the router (which listens on the document) lets it be
    if (moved > 8) { e.preventDefault(); moved = 0; return; }
    const o = Number(a.dataset.o);
    if (o) { e.preventDefault(); step(Math.sign(o)); }
  }, { signal: sig });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    step(e.key === "ArrowRight" ? 1 : -1);
  }, { signal: sig });
  el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; }, { signal: sig });
  el.addEventListener("pointerleave", () => { hover = false; }, { signal: sig });
  el.addEventListener("focusin", () => { focus = true; }, { signal: sig });
  el.addEventListener("focusout", () => { focus = false; }, { signal: sig });

  place();
  arm();
  ctx.onLeave?.(() => clearTimeout(timer));
  ctx.scope?.add(() => clearTimeout(timer));
}

// ── THE LIFE, TURNING ────────────────────────────────────────────────────
// One clock for all six: every CYCLE_MS the next frame in turn takes its next
// picture, so the margins are never all changing at once. The new picture is
// decoded before it is shown, and crosses in over the old one.
function mountReel(root, ctx, io, seen) {
  const frames = [...root.querySelectorAll(".ar-f")];
  if (!frames.length) return;
  const decks = dealReel(REEL, FRAMES.length);
  const st = frames.map((f) => ({ f, deck: decks[Number(f.dataset.f)] || [], at: 0, busy: false, hover: false }));
  for (const s of st) {
    io?.observe(s.f);
    s.f.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") s.hover = true; }, { signal: ctx.scope?.signal });
    s.f.addEventListener("pointerleave", () => { s.hover = false; }, { signal: ctx.scope?.signal });
  }
  // PRESSED, A SNAPSHOT OPENS LARGE: the photos sheet's own viewer, growing
  // out of the polaroid and shrinking back into it, paging through the whole
  // reel. Nothing turns while it is open, so the frame it closes into is
  // still showing the picture it opened.
  const byKey = new Map(REEL.map((p) => [`reel/${p.id}`, p]));
  const order = decks.flat();
  const viewer = makeViewer(ctx.scope, byKey, () => order,
    (k) => frames.find((f) => f.dataset.photo === k) || null);
  let open = false;
  const onClick = (e) => {
    const f = e.target.closest(".ar-f");
    if (!f || !byKey.has(f.dataset.photo)) return;
    open = true;
    viewer.open(f.dataset.photo);
  };
  root.addEventListener("click", onClick);
  ctx.scope?.add(() => root.removeEventListener("click", onClick));
  const viewerOpen = () => open && !!document.querySelector(".phv:not([hidden])") || (open = false);
  let k = 0, timer = 0;
  const turn = async (s) => {
    if (s.busy || s.deck.length < 2) return;
    s.busy = true;
    s.at = (s.at + 1) % s.deck.length;
    const p = s.deck[s.at];
    const layers = [...s.f.querySelectorAll(".ar-l")];
    const on = layers.find((l) => l.classList.contains("is-on")) || layers[0];
    const off = layers.find((l) => l !== on);
    off.innerHTML = `<img alt="" draggable="false" decoding="async" />`;
    const img = off.querySelector("img");
    img.src = copyFor(p, 640);
    try { await img.decode(); } catch { /* shown anyway */ }
    if (!s.f.isConnected) { s.busy = false; return; }
    off.classList.add("is-on");
    on.classList.remove("is-on");
    s.f.dataset.photo = `reel/${p.id}`;
    s.busy = false;
  };
  const arm = () => {
    clearTimeout(timer);
    if (reducedMotion) return;
    timer = setTimeout(() => {
      if (!document.hidden && !viewerOpen()) {
        // the next frame that is on screen and not being looked at
        for (let n = 0; n < st.length; n++) {
          const s = st[(k + n) % st.length];
          if (seen(s.f) && !s.hover) { k = (k + n + 1) % st.length; turn(s); break; }
        }
      }
      arm();
    }, CYCLE_MS);
  };
  arm();
  ctx.onLeave?.(() => clearTimeout(timer));
  ctx.scope?.add(() => clearTimeout(timer));
}

// ── THE BINDER ───────────────────────────────────────────────────────────
// three.js is a 220 KB download and ~760 KB to evaluate, so it is asked for
// once the page has finished ARRIVING (never during the move: evaluating it is
// a long task, and a long task inside a transition is a dropped frame) and the
// reader is near the binder. Someone reading the intro and leaving never
// fetches it. (If Home was visited first, Mew's engine has it cached already:
// the two share one three.js chunk.)
let binderMod = null;
export const prefetchBinder = () => (binderMod ||= import("./binder.js"));
function mountBinderWhenNear(root, ctx) {
  const host = root.querySelector("[data-bd]");
  if (!host) return;
  const start = () => {
    if (ctx.scope?.disposed) return;
    prefetchBinder().then((m) => { if (!ctx.scope?.disposed) m.mountBinder(host, BINDER, ctx); })
      .catch((err) => { console.error("[binder] failed to load:", err); host.classList.add("is-flat"); });
  };
  (ctx.settled || Promise.resolve()).then(() => {
    if (ctx.scope?.disposed) return;
    if (typeof IntersectionObserver !== "function") { start(); return; }
    const near = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { near.disconnect(); start(); }
    }, { rootMargin: "500px 0px" });
    near.observe(host);
    ctx.scope?.add(() => near.disconnect());
  });
}
