// motionBloom.js — ONE FLOWER, AND THE SCROLL STEPS IT THROUGH EVERY EFFECT
//
// "A flower." is 21 cuts of the same flower, each one a different technique:
// circles, blocks, the real one, bloom, ascii, halftone, crt, one bit … In the
// film it is a 4.9-second flicker. Here it is ONE frame that stays pinned in
// the middle of the window while the reader scrolls, and each step of scroll
// is the next cut, in order, with the effects listed beside it and the current
// one lit. It reads as one flower changing through everything that was done
// to it, which is what the sequence is.
//
// This is the "scrollytelling" pattern (a sticky stage, and steps that scroll
// past it; Russell Goldenberg's Scrollama is the well-known version of it),
// built on the platform's own parts: `position: sticky` for the stage, and an
// IntersectionObserver on 21 invisible steps with a one-line band across the
// middle of the window, so the step under the middle is the cut on show.
// Nothing on the scroll path reads layout.
//
// WHAT IT SHOWS, AND WHAT THAT COSTS:
//   · while the scroll moves, the cut's POSTER (a 540x1170 still, ~30 KB each,
//     all 21 fetched once the section is a screen away). A swap is instant, so
//     scrolling feels like scrubbing a flipbook;
//   · once the scroll has rested on a cut for 0.4 s, that cut's CLIP plays in
//     the frame, muted, looping -- one decoder, only while the section is on
//     screen, and never under reduced motion;
//   · pressing the frame opens the cut in the viewer, where the arrows and the
//     swipe page through the other twenty in the same order.

import { CLIPS } from "./motionassets.js";
import { worksOn } from "./motion.js";
import { reducedMotion } from "../utils/motion.js";

const REST_MS = 400;

export function mountBloom(scope, root) {
  const sec = root.querySelector(".mg-bloom");
  if (!sec) return null;
  const works = worksOn("flower").filter((w) => CLIPS[w.id]);
  const frame = sec.querySelector(".mg-bloom-frame");
  const cut = frame.querySelector(".mg-frame-cut");
  const img = sec.querySelector(".mg-bloom-img");
  const now = sec.querySelector(".mg-bloom-now");
  const names = [...sec.querySelectorAll(".mg-bloom-name")];
  const ticks = [...sec.querySelectorAll(".mg-bloom-rail i")];
  const steps = [...sec.querySelectorAll(".mg-bloom-steps i")];

  const video = document.createElement("video");
  video.className = "mg-bloom-vid";
  video.muted = true; video.loop = true; video.playsInline = true;
  video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
  video.preload = "none";
  video.setAttribute("aria-hidden", "true");
  cut.insertBefore(video, cut.querySelector(".mg-box"));

  let k = -1, inView = false, restT = 0;

  function show(n) {
    n = Math.max(0, Math.min(works.length - 1, n));
    if (n === k) return;
    k = n;
    const w = works[k], c = CLIPS[w.id];
    img.src = c.poster;
    frame.dataset.scene = w.id;
    frame.setAttribute("href", `#${w.id}`);
    frame.setAttribute("aria-label", w.name);
    now.textContent = w.name;
    names.forEach((b, i) => { b.classList.toggle("on", i === k); if (i === k) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    ticks.forEach((t, i) => t.classList.toggle("on", i === k));
    // the clip waits for the scroll to rest
    video.classList.remove("live");
    video.pause();
    clearTimeout(restT);
    if (!reducedMotion) restT = setTimeout(play, REST_MS);
  }

  function play() {
    if (!inView || k < 0 || document.hidden) return;
    const c = CLIPS[works[k].id];
    if (video.getAttribute("src") !== c.video) { video.src = c.video; video.currentTime = 0; }
    video.play().catch(() => {});
  }
  video.addEventListener("playing", () => { if (video.getAttribute("src") === CLIPS[works[k]?.id]?.video) video.classList.add("live"); });

  // the step under the middle of the window is the cut on show
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(steps.indexOf(e.target));
  }, { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((s) => io.observe(s));

  // the section on screen: fetch every poster once (a swap must be instant),
  // and let the clip play only while it can be seen
  let fetched = false;
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target === sec && e.isIntersecting && !fetched) {
        fetched = true;
        for (const w of works) { const im = new Image(); im.decoding = "async"; im.src = CLIPS[w.id].poster; }
      }
    }
  }, { rootMargin: "100% 0px" });
  near.observe(sec);
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      inView = e.isIntersecting;
      if (inView) { clearTimeout(restT); if (!reducedMotion) restT = setTimeout(play, REST_MS); }
      else { video.pause(); video.classList.remove("live"); }
    }
  });
  seen.observe(frame);

  // a name takes the scroll to its cut
  const onName = (e) => {
    const b = e.target.closest(".mg-bloom-name");
    if (!b) return;
    steps[Number(b.dataset.step)]?.scrollIntoView({ block: "center", behavior: reducedMotion ? "instant" : "smooth" });
  };
  sec.addEventListener("click", onName);
  const vis = () => { if (document.hidden) video.pause(); else if (video.classList.contains("live")) video.play().catch(() => {}); };
  document.addEventListener("visibilitychange", vis);

  show(0);

  scope?.add(() => {
    io.disconnect(); near.disconnect(); seen.disconnect();
    clearTimeout(restT);
    sec.removeEventListener("click", onName);
    document.removeEventListener("visibilitychange", vis);
    video.pause(); video.removeAttribute("src"); video.load(); video.remove();
  });

  return {
    ids: works.map((w) => w.id),
    /** the frame, showing `id`, with the page scrolled so it is where it rests */
    reveal(id) {
      const n = works.findIndex((w) => w.id === id);
      if (n < 0) return;
      steps[n]?.scrollIntoView({ block: "center", behavior: "instant" });
      show(n);
    },
    frame: () => cut,
    /** whatever the frame is showing right now, for the page's ground */
    picture: () => (video.classList.contains("live") ? video : img),
    pause() { clearTimeout(restT); video.pause(); },
    resume() { if (!reducedMotion) { clearTimeout(restT); restT = setTimeout(play, REST_MS); } }
  };
}
