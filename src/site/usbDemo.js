// usbDemo.js — FIG. 2: THE COMMAND LINE BECOMING THE INTERFACE
//
// Two halves of one run. Underneath, the engraving generator's desktop UI --
// the real React app, the real store, the real stream parsing, fed by stdout
// the real generator printed. Over it, exactly the same rectangle, a terminal
// playing the same run's console output. The terminal is clipped from the right
// as the reader scrolls, so at half the track they see half of each, and at the
// end of it the terminal is gone and the interface is alone.
//
// It is a FIGURE and not a tool: nothing in it can be clicked, at any point in
// the scroll. See the note on `inert` below.
//
// It is the argument this sheet is making, drawn rather than described: the
// tool did not get a coat of paint, the operator got a picture of the jig.
//
// ── WHY BOTH HALVES ARE THE SAME EVENTS ────────────────────────────────────
// The terminal is not a second recording on a second clock. `mountDemo` hands
// over every console line as the replay reaches it (`onLines`), so the words in
// the terminal and the pocket lighting up in the viewer come out of the same
// frame of the same run. Two clocks would drift, and a wipe between two things
// that have drifted is a wipe between two different runs.
//
// ── WHY A SHADOW ROOT ──────────────────────────────────────────────────────
// The app's stylesheet is Tailwind's output: it styles `body` and `html`, and
// this file's own `* { margin:0 }` would style every node in the app right
// back. Neither is a bug in either stylesheet -- they are two documents' worth
// of assumptions in one document. A shadow root is the boundary that lets both
// keep theirs. tools/vendor_demo.mjs rewrites `:root` to `:host` on the way in,
// which is the one thing a shadow root breaks.
//
// ── WHY THE PROGRESS IS COMPUTED IN JS AND NOT BY A SCROLL TIMELINE ────────
// `animation-timeline: view()` is the CSS feature for this and it would run off
// the main thread. It was NOT used, and the reason is narrower than browser
// support: the properties this effect animates -- `clip-path: inset()` and a
// blurred layer's opacity -- are not compositor-driven in any current engine,
// so the work lands on the main thread either way and the timeline buys a frame
// of latency, not a free effect. What it would cost is two implementations of
// the same number, one of which cannot be verified in this environment at all
// (the preview pane suspends animations). So: one source of truth, `--p`,
// written by one handler that does arithmetic and nothing else.
//
// The SHAPE is still the one Apple and NVIDIA product pages use, because the
// shape is the part that matters: a tall track, a sticky child, progress
// derived from how far through the track the reader is. No scroll-jacking,
// nothing seized from the scroller, and scrolling back up runs it backwards
// because the number is a pure function of scroll position.

import { createGlow } from "./glow.js";
import { afterArrival } from "../utils/arrival.js";

const STAGE = "[data-usb-stage]";

/**
 * THE COMMAND LINE DOING THE SAME THING, AT THE SAME MOMENT.
 *
 * The terminal used to sit black through the whole approach -- five seconds of
 * a cursor pressing buttons on one side and nothing at all on the other, which
 * is the one stretch where the two halves were not the same run.
 *
 * They are the generator's OWN prompts, lifted from generate_xcs_master.py
 * rather than written to look plausible: the numbered template list, the
 * row/col diagram it draws, the prefix step and its default of 'E'. That
 * default is also why the interface changes the prefix to 'X' -- it is a real
 * thing an operator does here, not a beat invented to fill the time.
 *
 * Keyed on the step the script reports, so the two sides cannot drift: the
 * terminal answers a prompt at the same instant the pointer presses the
 * control that answers it.
 */
const CLI = {
  "Open Templates": (jig) => [
    "> python generate_xcs_master.py",
    "",
    "select a template:",
    "  1. 32GB.xcs",
    "  2. Western Digital Large.xcs",
    `\nenter number (1-2): ${jig.startsWith("32GB") ? "1" : "2"}`
  ],
  Choose: (jig) => [`\ntemplate '${jig.replace(/\.[^.]+$/, "")}' has no saved load order yet.`],
  "Open Generate": () => [
    "    col = column-major:             (top to bottom)",
    "     |    E1     E4     E7",
    "     |    E2     E5     E8",
    "     v    E3     E6     E9",
    "          ________________",
    "    row = row-major:                (left to right)",
    "    ----> E1     E2     E3",
    "          E4     E5     E6",
    "          E7     E8     E9",
    "          ________________"
  ],
  Order: (_jig, value) => [`  enter 'row' or 'col': ${value}`],
  Prefix: () => [
    "",
    "serial prefix is currently 'E'.",
    "first serial will look like:  E1111111",
    "press Enter to accept, or 'p' to change the prefix: p",
    "  prefix: X"
  ],
  "Generate batches": () => ["confirm? Y to run, N to re-edit: Y", ""]
};

/** Which CLI block a reported step belongs to. */
function cliFor(step, jig) {
  if (step.startsWith("Choose ")) return CLI.Choose(step.slice(7));
  if (step === "Column-major" || step === "Row-major") {
    return CLI.Order(jig, step === "Column-major" ? "col" : "row");
  }
  if (step.startsWith("Prefix")) return CLI.Prefix();
  return CLI[step]?.(jig) ?? null;
}

/**
 * How far through the track the reader is: 0 at the top, 1.3 at the release.
 *
 * PURE, and exported, because it is the whole effect in one line and the rest
 * of this file is wiring. A number that is wrong here is a wipe that finishes
 * early, a backlight that never reaches full, or a figure that hands itself
 * over before the terminal has gone -- and none of those can be tested by
 * looking at the DOM, because the DOM is only ever showing one value of it.
 * `fx/beamGeometry.js` is the same idea.
 */
export function progressAt(scrollY, top, travel) {
  const p = (scrollY - top) / Math.max(1, travel);
  return p < 0 ? 0 : p > RELEASE ? RELEASE : Math.round(p * 1000) / 1000;
}

// ── THE UNIT, AND THE ONE PLACE IT IS EASY TO GET WRONG ────────────────────
// `p` is measured in DESIGNED SCROLLS, not in track. The wipe finishes at 1,
// the backlight peaks at 1.2, and at 1.3 the sticky child reaches the foot of
// its track and lets go -- so the track has to be 1.3 designed scrolls long,
// and the designed scroll is the sticky travel over 1.3.
//
// Dividing by the sticky travel instead is the obvious thing to write and it
// is wrong in a way that looks almost right: `p` then tops out at exactly 1.0
// at the foot of the track, so the wipe completes at the same instant the pin
// releases -- the reader never gets a moment with the interface alone, and the
// backlight never reaches full. There is a check.
const WIPE_END = 1;
const GLOW_FULL = 1.2;
const RELEASE = 1.3;

// How many lines the terminal keeps. A 2,000-serial run prints a few thousand,
// and a console does not grow downward off the desk -- it scrolls. The body is
// a flex column justified to its end, so the newest line is always the bottom
// one and nothing here ever reads layout to make that true.
const KEEP = 240;

/**
 * @param scope  the page scope. Everything here is disposed with the page.
 * @param world  the engine's world: `scroll.y`, and `recollect` / `resize`.
 * @param root   document, or a detached tree in the router harness.
 */
export function mountUsbDemo({ scope, world, root = document, settled = null, onLeave = null }) {
  const stage = root.querySelector(STAGE);
  if (!stage) return null;

  const frame = stage.querySelector("[data-usb-frame]");
  const uiHost = stage.querySelector("[data-usb-ui]");
  const lines = stage.querySelector("[data-usb-lines]");
  const cursor = stage.querySelector("[data-usb-cursor]");
  if (!frame || !uiHost || !lines || !cursor) return null;

  const reduced = root.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ?? false;

  // THE BACKLIGHT. Its own module (site/glow.js, and the model in
  // site/glowField.js); all this file owes it is the progress number and a
  // teardown. Null when there is no WebGL, and then the stylesheet's still
  // version stands in and nothing here needs to know.
  //
  // IT IS BUILT ONCE THE PAGE HAS ARRIVED (utils/arrival.js), not at commit:
  // a WebGL context and its shader compile are exactly the kind of work that
  // took frames out of the transition going into this sheet.
  let glow = null;
  const ctx = { scope, settled };

  // ── THE TRACK, MEASURED ONCE ─────────────────────────────────────────────
  // `offsetTop` up the offsetParent chain, and NOT getBoundingClientRect: a
  // rect includes transforms, and #doc is carrying the page-turn transform at
  // the exact moment `recollect` fires. That is the trap the deck's measure()
  // exists to work around; an offset walk never sees a transform at all.
  let top = 0;
  let travel = 1;
  function measure() {
    let y = 0;
    for (let n = stage; n; n = n.offsetParent) y += n.offsetTop;
    top = y;
    // The sticky travel is how far the pin moves through its track; the
    // DESIGNED SCROLL is that over 1.3. Never zero: a track shorter than the
    // viewport would divide by nothing.
    const sticky = stage.offsetHeight - (root.defaultView?.innerHeight ?? 0);
    travel = Math.max(1, sticky / RELEASE);
  }

  // ── THE NUMBER ───────────────────────────────────────────────────────────
  // Arithmetic only. No layout is read here, ever: this runs on the scroll
  // path, and this site's one hard rule is that it cannot drop a frame.
  let p = -1;
  function onScroll() {
    // Rounded inside progressAt, so a sub-pixel scroll does not write a custom
    // property that resolves to the same paint.
    const next = progressAt(scrollY(), top, travel);
    if (next === p) return;
    setProgress(next);
  }

  /**
   * The one place progress changes, so the wipe and the light cannot disagree
   * about where the reader is. `debugScrollTo` goes through here as well: the
   * first version of the light was switched on from the scroll handler alone,
   * and every headless check of the figure was looking at a glow that never
   * turned.
   */
  function setProgress(next) {
    p = next;
    stage.style.setProperty("--p", String(p));
    glow?.setProgress(p);
  }

  const scrollY = () => world?.scroll?.y ?? root.defaultView?.scrollY ?? 0;

  // ── IT IS A FIGURE, NOT A TOOL ───────────────────────────────────────────
  // `mountDemo` can hand the app over to the reader, and this page does not use
  // that. The figure is evidence: it shows what the tool does, the way the
  // transcript below it does, and a reader who can click into it is a reader
  // who can leave it in a state that no longer demonstrates anything -- a
  // stopped run, an empty jig, a dialog open over the thing they were meant to
  // be looking at. It plays, and it keeps playing.
  //
  // So it is permanently `inert`. Not `pointer-events:none`, which stops only
  // the mouse: a keyboard user could still tab into a control that is behind a
  // terminal and does nothing, and a screen reader would read out an
  // application's worth of buttons sitting in the middle of a page about
  // engraving. `inert` is the one that covers all three, and mountDemo applies
  // it because `interactive` is never turned on.
  let handle = null;

  // ── THE TERMINAL HALF ────────────────────────────────────────────────────
  // One fragment per frame rather than one append per line: a frame of a
  // 75-pocket burst is a couple of dozen lines, and twenty-four insertions into
  // a live tree is twenty-four style recalculations for one paint.
  /*
   * A PROGRAM PRINTS ONE LINE AT A TIME, even when it is quick.
   *
   * The events arrive in frame-sized groups and used to be appended in one go,
   * so a step's worth of output -- the fourteen-line header the generator
   * writes before its first batch, or the prompt block answering a click --
   * landed as a single cut. That is not what a console looks like at any
   * speed; the thing a reader recognises is lines ARRIVING.
   *
   * So a group is queued and drained a line at a time. One per animation
   * frame is already about sixty a second, which is fast enough that the
   * header is over in a quarter of a second and slow enough to read as
   * printing rather than as a paste.
   */
  const queue = [];
  let drain = 0;

  /*
   * ...BUT IT MAY NEVER FALL BEHIND THE OTHER HALF.
   *
   * The whole figure is the claim that the terminal and the interface are one
   * run at one instant. A fixed rate breaks that the moment the run outpaces
   * it, so the drain takes more per frame when the queue is long: the backlog
   * is always cleared inside CATCH_UP_MS, whatever it is. The cap keeps the
   * catch-up from becoming the cut it exists to avoid.
   */
  const CATCH_UP_MS = 700;
  const MOST_PER_FRAME = 6;

  function pump() {
    drain = 0;
    if (queue.length === 0) return;

    const frames = Math.max(1, CATCH_UP_MS / 16);
    const take = Math.min(
      queue.length,
      Math.max(1, Math.min(MOST_PER_FRAME, Math.ceil(queue.length / frames)))
    );

    const frag = root.createDocumentFragment();
    for (const line of queue.splice(0, take)) {
      const el = root.createElement("p");
      el.className = line.level === "info" ? "ul" : `ul ${line.level}`;
      // textContent, not innerHTML. This is a program's output being printed
      // into a page; the one thing it must never be is parsed as markup.
      el.textContent = line.text;
      frag.appendChild(el);
    }
    lines.appendChild(frag);
    // Trimmed from the top, which is the direction a console forgets in.
    for (let over = lines.childElementCount - KEEP; over > 0; over--) {
      lines.removeChild(lines.firstElementChild);
    }
    if (queue.length > 0) drain = root.defaultView.requestAnimationFrame(pump);
  }

  function write(batch) {
    queue.push(...batch);
    if (!drain) drain = root.defaultView.requestAnimationFrame(pump);
  }

  /** A new pass is a new session: the old one's backlog goes with its lines. */
  function clearTerminal() {
    queue.length = 0;
    if (drain) root.defaultView.cancelAnimationFrame(drain);
    drain = 0;
    lines.replaceChildren();
  }

  // ── LOADING IT ───────────────────────────────────────────────────────────
  // Nothing is fetched until the reader is within a screen and a half of the
  // figure. The demo is 2.8 MB of module and recordings; a reader who opens
  // this sheet and leaves from plate 0 should not pay for a figure they never
  // reached. Same argument as mountMedia's, and the same mechanism.
  // which fixture this pass is using, for the CLI half's own prompts
  let jig = "32GB.xcs";

  let started = false;
  const io = new root.defaultView.IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting) || started) return;
    started = true;
    io.disconnect();
    /*
     * ...AND NOT IN THE SAME BREATH AS THE PAGE ARRIVING.
     *
     * The figure is the first thing on the sheet now, so this observer fires
     * immediately on landing -- which used to put the module's evaluation,
     * React's first mount and the first jig's render in among the sky shader
     * compiling and the animal being rigged. MEASURED: a 116 ms task, right
     * where the reader is looking.
     *
     * An idle callback is the whole fix. The figure is 68% below the fold when
     * the reader lands and it has a five-second cursor sequence before it does
     * anything, so a few hundred milliseconds of patience costs it nothing and
     * buys the page its first frames back. The timeout is the guarantee: on a
     * page that never goes idle, it starts anyway.
     *
     * ...AND IT WAS NOT THE WHOLE FIX. An idle gap inside a transition is
     * still inside the transition: Chrome found gaps between the crossing's
     * frames, and Safari, which has no idle callback at all, fell back to the
     * 300 ms timeout -- the middle of the paper closing. MEASURED on a phone-
     * sized, 4x-throttled window: 1.4 s of long tasks and a 408 ms frame going
     * into this sheet. So this observer is not armed until the page has
     * ARRIVED (afterArrival, below), and the idle wait starts from there.
     */
    const view = root.defaultView;
    if (typeof view.requestIdleCallback === "function") {
      view.requestIdleCallback(() => { if (!disposed) start(); }, { timeout: 1200 });
    } else {
      view.setTimeout(() => { if (!disposed) start(); }, 300);
    }
  }, { rootMargin: "150% 0px" });

  afterArrival(ctx, () => {
    glow = createGlow({ host: stage.querySelector("[data-usb-light]"), root, reduced });
    glow?.setProgress(p);
    io.observe(stage);
  });
  // ...and as the next move starts, the light stops: the page is about to be
  // covered, and the transition wants the frames
  onLeave?.(() => glow?.hold?.());

  async function start() {
    stage.dataset.usbLoad = "loading";
    try {
      const [{ mountDemo }, css] = await Promise.all([
        import("../vendor/xtool-demo/xtool-demo.js"),
        import("../vendor/xtool-demo/xtool-demo.css?inline").then((m) => m.default)
      ]);
      if (disposed) return;

      // `?inline` gives the stylesheet as TEXT rather than injecting a <link>
      // into the document, which is the whole point: it goes in the shadow
      // root and nowhere else.
      const shadow = uiHost.attachShadow({ mode: "open" });
      const style = root.createElement("style");
      style.textContent = css;
      const mountPoint = root.createElement("div");
      mountPoint.id = "root";   // the app's own stylesheet sizes #root
      shadow.append(style, mountPoint);
      // THE APP IS DRAWN AT THE SITE'S SCALE. The site's px are design pixels
      // (styles/designPx.js) and the frame grows with them; the app's own px
      // did not, so on a 27" monitor its words were laptop-sized in a frame
      // 1.7x larger. Rewriting its stylesheet the way the site's is was tried
      // and rejected: its console is a virtual list that places each row at a
      // pixel height from SCRIPT, so the words grew and the rows did not, and
      // they overprinted. `zoom` on this one host scales both. The factor is
      // the design pixel itself, read off the root's font-size (16 design px,
      // site.css). The pointer it reports is measured with
      // getBoundingClientRect on both ends, which a zoomed box reports in
      // screen pixels (standardised zoom: Chrome 128, Firefox 126).
      //
      // THINGS ZOOM DOES NOT REACH. Two are in the stylesheet, so it is re-cut
      // for the factor (the vendored file itself is never touched):
      //   · a `rem` inside a shadow root is the PAGE's root size, which is in
      //     design pixels already -- zoomed on top it counted twice (the
      //     button came out half again too big). Each becomes 16px first.
      //   · a media query is asked of the WINDOW, so at 2560 the app chose
      //     its widest layout (96rem, 1536px) while at the reference 1512 it
      //     did not. Its breakpoints are multiplied by the factor, so it
      //     picks the layout it picks on the owner's own screen.
      let k = 0;
      const scale = () => {
        const next = parseFloat(getComputedStyle(root.documentElement).fontSize) / 16 || 1;
        if (next === k) return;
        k = next;
        uiHost.style.zoom = String(k);
        // ...and a third: the app's text INHERITS the figure's font-size,
        // which is in design pixels too. Handed down unscaled, so the zoom
        // is the only thing that scales it.
        uiHost.style.fontSize = "";
        uiHost.style.fontSize = `${parseFloat(getComputedStyle(uiHost).fontSize) / k}px`;
        style.textContent = css
          .replace(/@media[^{]*\{/g, (q) => q.replace(/(\d*\.?\d+)(rem|px)/g, (m, n, unit) => `${(Number(n) * (unit === "rem" ? 16 : 1) * k).toFixed(1)}px`))
          .replace(/(^|[^\w.@-])(\d*\.?\d+)rem\b/g, (m, pre, n) => `${pre}${Number(n) * 16}px`);
      };
      scale();
      window.addEventListener("resize", scale);
      scope?.add?.(() => window.removeEventListener("resize", scale));

      handle = await mountDemo(mountPoint, {
        recordings: RECORDINGS,
        templates: TEMPLATES,
        manifestUrl: MANIFEST_URL,
        settled: reduced,
        onLines: write,
        // A new pass is a new run, so the terminal starts again with it.
        onRecordingStart: (label) => {
          clearTerminal();
          stage.dataset.usbOrder = label;
          jig = label === "col-major" ? "32GB.xcs" : "Western Digital Large.xcs";
        },
        // THE POINTER. The library says where it is and whether it is down;
        // drawing it is the host's job, because it belongs to the FIGURE
        // rather than to the app -- it has to sit over the terminal as well,
        // and the terminal is not the app's to draw on.
        onCursor: (at) => {
          cursor.style.opacity = at.shown ? "1" : "0";
          cursor.style.transform =
            `translate3d(${at.x}px, ${at.y}px, 0) scale(${at.pressed ? 0.82 : 1})`;
        },
        onStep: (label) => {
          frame.dataset.usbStep = label;
          // the same step, on the other side of the wipe
          const said = cliFor(label, jig);
          if (said) write(said.map((text) => ({ text, level: "info" })));
        }
      });
      if (disposed) { handle.destroy(); return; }

      stage.dataset.usbLoad = "ready";
    } catch (error) {
      // AN HONEST FAILURE, in the register the rest of the sheet uses: the
      // figure says it is not there, the way a capture slot with no file says
      // what filename it is waiting for. A blank rectangle says nothing.
      stage.dataset.usbLoad = "failed";
      console.warn("usbDemo: the figure did not load", error);
    }
  }

  // ── WIRING ───────────────────────────────────────────────────────────────
  // `recollect` first, because world.js re-measures on it and this reads the
  // re-measured viewport. Both handlers are pure arithmetic after the measure.
  let disposed = false;
  const remeasure = () => { measure(); p = -1; onScroll(); };
  const off = [
    world?.on?.("recollect", remeasure),
    world?.on?.("resize", remeasure),
    world?.on?.("docresize", remeasure),
    world?.on?.("scrolled", onScroll)
  ].filter(Boolean);

  measure();
  onScroll();

  scope?.add(() => {
    disposed = true;
    if (drain) root.defaultView.cancelAnimationFrame(drain);
    drain = 0;
    io.disconnect();
    for (const un of off) un();
    handle?.destroy();
    handle = null;
    glow?.destroy();
  });

  return {
    get progress() { return p; },
    get loaded() { return handle !== null; },
    /** the automated checks drive the number directly; there is no scrolling
        in a headless DOM and none in a hidden preview pane either. */
    debugScrollTo(y) {
      const at = progressAt(y, top, travel);
      if (at !== p) setProgress(at);
      return p;
    },
    debugMeasure() { return { top, travel }; },
    /**
     * Light the whole loop, wherever the scroll is. The editor calls this while
     * its backlight colours are on screen, so a colour can be judged as it is
     * changed instead of on a figure the reader has not scrolled to yet.
     */
    previewGlow(on) {
      if (on) stage.dataset.glowPreview = "";
      else delete stage.dataset.glowPreview;
      glow?.preview(on);
    },
    get glow() { return glow; }
  };
}

// Resolved at BUILD time. Vite rewrites these to hashed URLs in the bundle, so
// a slot either has a real URL or the build failed -- there is no runtime probe
// and no request that can 404. Same mechanism media.js uses for captures, and
// the same reason.
const asset = (name) => new URL(`../vendor/xtool-demo/recordings/${name}`, import.meta.url).href;

// TWO JIGS, AND THAT IS THE POINT OF HAVING TWO PASSES. 1,250 serials go into
// a 75-pocket fixture down the columns; 306 go into an 18-pocket one, six
// across and three down, in violet. Seventeen batches each, and each pass runs
// about eleven and a half seconds -- which takes a pace of its own, because
// cinematic spacing makes a batch as long as its pocket count and 18 pockets at
// the other's speed is a flicker rather than a jig filling.
//
// They are two recordings because they are two runs: the generator was asked
// for each, and this is what it printed.
const TEMPLATES = [
  {
    name: "32GB.xcs",
    stem: "32GB",
    path: "templates/32GB.xcs",
    format: "xcs",
    pockets: 75,
    previewUrl: asset("preview.32gb.json")
  },
  {
    name: "Western Digital Large.xcs",
    stem: "Western Digital Large",
    path: "templates/Western Digital Large.xcs",
    format: "xcs",
    pockets: 18,
    // VIOLET, so the second pass is not the first one continuing. The fixture's
    // own serial layer is a cyan close enough to the other's blue to read as
    // the same run still going; the colour is an xTool authoring convention
    // rather than anything the laser does, so this is a presentation choice.
    serialColour: "#a855f7",
    previewUrl: asset("preview.western-digital-large.json")
  }
];

const RECORDINGS = [
  {
    label: "col-major",
    url: asset("col-major.stdout.txt"),
    templatePath: "templates/32GB.xcs",
    order: "col"
  },
  {
    label: "row-major",
    url: asset("row-major.stdout.txt"),
    templatePath: "templates/Western Digital Large.xcs",
    order: "row",
    pace: 1.5
  }
];

const MANIFEST_URL = asset("manifest.json");

export { GLOW_FULL, RELEASE, WIPE_END };
