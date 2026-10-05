// aboutMusic.js — THE ALBUMS, ON A WHEEL THAT TURNS UPWARD
//
// By instruction (2026-10-04): the covers stand on the rim of a drum seen
// edge-on, turning about a horizontal axis, every cover facing straight out
// from the drum's centre. The one at the front faces the reader; the ones
// above and below tip away from them, like records in a turning rack. It turns
// to the next album by itself, a drag swipes it and it settles on an album, and
// a click on the front one opens it on Spotify.
//
// THE DRUM HAS A FIXED NUMBER OF SLOTS (SLOTS, 30 degrees apart), and that is
// what makes a list of any length cost the same. Slot j stands at -30j degrees
// on the drum for ever; the drum is rotated by +30u, where u is "which album is
// at the front", a real number. So slot j shows whichever album n is congruent
// to j and nearest u -- slotAlbum() -- and the slot is given a new album only
// when that answer changes, which is exactly when the slot is half a turn away,
// round the back of the drum, where nobody can see it change. Ten albums or a
// thousand, the page holds twelve covers.
//
// ONE TRANSFORM A FRAME. The slots never move: they are rotated once into
// place on their own element and turned by their parent. While the drum is
// still, nothing runs at all (the auto-turn is one timer). backface-visibility
// hides the half of the rim facing away, and a mask on the window fades the
// top and bottom, so neither costs a frame either.
//
// Why CSS 3D and not WebGL: the covers are pictures with links on them, the
// browser draws twelve textured quads on the compositor for free, and a
// keyboard, a screen reader and a middle click all work on an <a>.

import { reducedMotion } from "../utils/motion.js";
import { expDamp } from "../utils/math.js";

export const SLOTS = 12;          // 360 / 30: the rim is exactly full
export const STEP_DEG = 360 / SLOTS;
// how far apart the covers stand on the rim, as a share of a cover: the chord
// between two neighbours is 2R sin(15deg), and 1.06 of a cover leaves a sliver
// of paper between them at the front, so they read as separate records
const GAP = 1.06;
const AUTO_MS = 3400;             // a turn by itself: long enough to read a cover
const SETTLE = 9;                 // expDamp rate: 1/e of the way every 0.11 s
const FLING_S = 0.28;             // how far a release carries: v x this, in albums

/** the album slot j shows when album u is at the front: the n = j (mod S) nearest u */
export function slotAlbum(j, u, S = SLOTS) {
  return j + S * Math.round((u - j) / S);
}
/** n mod len, for a negative n too */
export const wrap = (n, len) => ((n % len) + len) % len;
/** the drum's radius for a cover of side c (both in the same unit) */
export const radiusFor = (c) => (c * GAP) / (2 * Math.sin(Math.PI / SLOTS));

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** the markup: a window, a drum, twelve slots, and a line for the front album's name */
export function musicHTML(list) {
  const slots = Array.from({ length: SLOTS }, (_, j) => `
          <a class="md-s" data-slot="${j}" tabindex="-1" draggable="false" style="--a:${-j * STEP_DEG}deg"${list.length ? ` target="_blank" rel="noopener noreferrer"` : ` aria-hidden="true"`}><img alt="" draggable="false" decoding="async" /></a>`).join("");
  return `
      <div class="md${list.length ? "" : " is-blank"}" data-md data-noswipe tabindex="0" role="group" aria-roledescription="carousel" aria-label="Albums${list.length ? "" : " (none yet)"}">
        <div class="md-win">
          <div class="md-drum">${slots}
          </div>
        </div>
        <p class="t body md-name" aria-live="off"></p>
      </div>`;
}

export function mountMusic(root, list, { scope, deck } = {}) {
  const el = root?.querySelector("[data-md]");
  if (!el) return;
  const drum = el.querySelector(".md-drum");
  const nameEl = el.querySelector(".md-name");
  const slots = [...el.querySelectorAll(".md-s")].map((a) => ({ a, img: a.querySelector("img"), n: NaN }));
  const N = list.length;
  const sig = scope?.signal;

  // THE COVER IS HALF THE SECTION'S WIDTH, in real px, measured -- so the
  // editor's resize of the section is a resize of the whole wheel (and a
  // phone's narrower column a smaller one). R follows from the cover.
  let c = 150, R = radiusFor(150);
  const size = (w) => {
    if (!(w > 0)) return;
    c = Math.round(w * 0.5);
    R = radiusFor(c);
    el.style.setProperty("--md-c", `${c}px`);
    el.style.setProperty("--md-r", `${R.toFixed(2)}px`);
  };
  size(el.clientWidth);

  let u = 0, target = 0, raf = 0, last = 0, drag = null, hover = false, seen = true, timer = 0, shown = NaN;

  // ── WHAT EACH SLOT SHOWS ────────────────────────────────────────────────
  function assign() {
    for (let j = 0; j < SLOTS; j++) {
      const s = slots[j], n = slotAlbum(j, u);
      if (n === s.n) continue;
      s.n = n;
      if (!N) { s.a.dataset.blank = String(wrap(n, 6)); continue; }
      const al = list[wrap(n, N)];
      s.a.href = al.url;
      s.a.setAttribute("aria-label", al.title ? `${al.title}, on Spotify` : "An album, on Spotify");
      if (al.cover) { if (s.img.getAttribute("src") !== al.cover) s.img.src = al.cover; s.a.classList.remove("no-cover"); }
      else { s.img.removeAttribute("src"); s.a.classList.add("no-cover"); }
    }
    const front = Math.round(u);
    if (front !== shown) {
      shown = front;
      const al = N ? list[wrap(front, N)] : null;
      nameEl.textContent = al?.title || "";
      for (const s of slots) s.a.classList.toggle("is-front", s.n === front);
    }
  }
  // the drum is pushed back by its radius, so the front cover stands exactly
  // in the window's plane at its true size
  const place = () => {
    drum.style.transform = `translateZ(${(-R).toFixed(2)}px) rotateX(${(u * STEP_DEG).toFixed(3)}deg)`;
  };

  // ── THE TURN ────────────────────────────────────────────────────────────
  const tick = (now) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!drag) {
      u = reducedMotion ? target : expDamp(u, target, SETTLE, dt);
      if (Math.abs(u - target) < 1e-3) u = target;
    }
    place();
    assign();
    if (drag || u !== target) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  // by itself, only while somebody could be watching and nobody is handling it
  const arm = () => {
    clearTimeout(timer);
    if (reducedMotion || N < 2) return;
    timer = setTimeout(() => {
      if (seen && !hover && !drag && !document.hidden && el.isConnected) { target = Math.round(target) + 1; kick(); }
      arm();
    }, AUTO_MS);
  };

  // ── A DRAG ──────────────────────────────────────────────────────────────
  // in albums: the front cover's height of travel is one album. The page's
  // scroll is not taken anywhere else (touch-action:none is on the window
  // only), and the deck's swipe ignores it (data-noswipe).
  let moved = 0;
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    drag = { y: e.clientY, u0: u, px: c, t: performance.now(), v: 0, ly: e.clientY, lt: performance.now(), id: e.pointerId };
    moved = 0;
    kick();
  }, { signal: sig });
  el.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    moved = Math.max(moved, Math.abs(dy));
    // CAPTURED ONLY ONCE IT IS A DRAG: a captured pointer's click lands on the
    // drum rather than on the cover under it, which would turn every click on
    // the front album into nothing
    if (!drag.cap && moved > 6) { drag.cap = true; try { el.setPointerCapture(e.pointerId); } catch { /* gone */ } }
    // dragging UP brings the next album: the drum turns the way the hand goes
    u = drag.u0 - dy / drag.px;
    const now = performance.now(), dtm = (now - drag.lt) / 1000;
    if (dtm > 0.008) { drag.v = (-(e.clientY - drag.ly) / drag.px) / dtm; drag.ly = e.clientY; drag.lt = now; }
    kick();
  }, { signal: sig });
  const end = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const recent = performance.now() - drag.lt < 90 ? drag.v : 0;
    target = Math.round(u + recent * FLING_S);
    drag = null;
    kick();
    arm();
  };
  el.addEventListener("pointerup", end, { signal: sig });
  el.addEventListener("pointercancel", end, { signal: sig });

  // A CLICK IS A CLICK ONLY IF IT DID NOT DRAG. On the front cover it opens
  // Spotify (the <a> does that itself); on any other cover it turns that one
  // to the front instead, because a record half out of sight is not one the
  // reader meant to open.
  el.addEventListener("click", (e) => {
    const a = e.target.closest(".md-s");
    if (moved > 6) { e.preventDefault(); moved = 0; return; }
    if (!a || !N) { e.preventDefault(); return; }
    const s = slots[Number(a.dataset.slot)];
    if (s && s.n !== Math.round(u)) { e.preventDefault(); target = s.n; kick(); arm(); }
  }, { signal: sig });

  // the keyboard: up and down turn it, Enter opens the front album. Heard on
  // the element and marked used, so the deck and the page scroll leave it be.
  el.addEventListener("keydown", (e) => {
    let used = true;
    if (e.key === "ArrowDown") target = Math.round(target) + 1;
    else if (e.key === "ArrowUp") target = Math.round(target) - 1;
    else if (e.key === "Enter" && N) slots.find((s) => s.n === Math.round(u))?.a.click();
    else used = false;
    if (used) { e.preventDefault(); kick(); arm(); }
  }, { signal: sig });
  el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; }, { signal: sig });
  el.addEventListener("pointerleave", () => { hover = false; }, { signal: sig });

  const io = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((es) => { seen = es[0]?.isIntersecting ?? true; }) : null;
  io?.observe(el);
  // a resize of the section (the window, a font, the editor): one measure,
  // never on a hover or a scroll
  const ro = typeof ResizeObserver === "function"
    ? new ResizeObserver((es) => { size(es[0]?.contentRect.width); place(); }) : null;
  ro?.observe(el);

  place();
  assign();
  arm();
  scope?.add(() => { cancelAnimationFrame(raf); clearTimeout(timer); ro?.disconnect(); io?.disconnect(); });
}
