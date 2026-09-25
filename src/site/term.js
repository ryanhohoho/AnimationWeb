// term.js — A RECORDED SESSION
//
// Some work has no picture. A command-line tool's whole surface is the
// transcript it leaves behind, so the honest way to show one is to play the
// transcript back.
//
// It is typed rather than pasted because the delay between a command and its
// answer IS the information: setting a drive up takes seconds, a full format
// takes minutes, and the encryption then runs behind the operator's back on
// several drives at once. Pasted, that is a wall of text. Played, it is the
// thing itself.
//
// SUBSTITUTION, NOT REDACTION
// ---------------------------
// This plays a real run, not a dry run. Nothing is blacked out: every device
// identifier is replaced by a stand-in of the same width, the way a vendor
// prints a sample session, so the columns land exactly where they land on the
// operator's screen. No asset numbers, serials, volume identifiers, key
// material or credentials appear anywhere in this file.
//
// NOTHING IMPORTS THIS RIGHT NOW, and that is the media.js argument again
// rather than rot. Its one user was FIG. 1 on the USB sheet, removed as the
// outdated demo; Rollup never reaches an unimported module, so it costs zero
// bytes. The .term block in site.css is kept for the same reason. If nothing
// wants a played transcript again, delete this file and that block together.
//
// COST
// ----
// One rAF while a line is typing, one timer while it is holding, and neither
// exists while the transcript is off screen. It loops, because the thing it is
// a recording of is a loop.

export function createTerm({ scope, el, script, cps = 62, loop = true, holdMs = 3000 }) {
  if (!el || !script?.length) return null;
  const body = el.querySelector("[data-lines]") || el;

  let i = 0;          // which line of the script
  let ch = 0;         // characters typed of the current line
  let line = null;    // the <p> for the current line
  let into = null;    // where characters land — the line, or the echo span in it
  let raf = 0, timer = 0, last = 0;
  let visible = false;

  function idle() {
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0; timer = 0;
  }

  /** hold for ms, then resume — but only if the transcript is still on screen */
  function wait(ms) {
    timer = setTimeout(() => {
      timer = 0;
      if (visible) resume();
    }, ms);
  }

  function resume() {
    if (raf || timer) return;
    last = 0;
    raf = requestAnimationFrame(step);
  }

  function rewind() {
    i = 0; ch = 0; line = null; into = null; last = 0;
    body.textContent = "";
    el.classList.remove("done");
  }

  function step(now) {
    raf = 0;

    // end of tape: sit on the finished screen long enough to read it, then run
    // the whole thing again from the top
    if (i >= script.length) {
      el.classList.add("done");
      if (loop) timer = setTimeout(() => {
        timer = 0;
        rewind();
        if (visible) resume();
      }, holdMs);
      return;
    }

    const dt = now - (last || now);
    last = now;
    const s = script[i];

    if (!line) {
      line = document.createElement("p");
      line.className = `tl ${s.c || ""}`;
      into = line;
      // A PROMPT IS NOT TYPED, THE ANSWER IS.
      // The program writes "Choose an option: " with no newline and then the
      // operator's keypress echoes on the end of it. `pre` is that prompt: it
      // lands instantly, and only what follows it is typed.
      if (s.pre) {
        line.append(s.pre);
        into = document.createElement("span");
        into.className = "cmd";
        line.append(into);
      }
      body.appendChild(line);
      // A console does not grow downward off the desk; it scrolls. The box is a
      // fixed height and the newest line is always the bottom one, which is
      // also what keeps this plate a plate instead of a mile of transcript.
      el.scrollTop = el.scrollHeight;
      ch = 0;
      // output arrives whole, the way a program prints it; a typed line arrives
      // a character at a time, the way a person does
      if (!s.type) {
        into.innerHTML = s.t; i++; line = into = null; last = 0;
        wait(s.wait || 240);
        return;
      }
    }

    ch += (dt * cps) / 1000;
    const n = Math.floor(ch);
    into.textContent = s.t.slice(0, n);
    if (n >= s.t.length) {
      into.innerHTML = s.t; i++; line = into = null; last = 0;
      wait(s.wait || 380);
      return;
    }
    raf = requestAnimationFrame(step);
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) resume(); else idle();
  }, { threshold: 0.2 });
  io.observe(el);
  scope?.add(() => { io.disconnect(); idle(); });

  return {
    get index() { return i; },
    get lines() { return body.childElementCount; },
    /** devtools + the automated checks: rAF and timers are both throttled in a
        hidden preview pane, so there has to be a way to run the tape by hand. */
    debugRun(frames = 900) {
      idle();
      const held = wait;
      wait = () => {};                        // no sleeping while stepping
      let t = 0;
      for (let k = 0; k < frames && i < script.length; k++) { t += 30; last = t - 30; step(t); }
      wait = held;
      return i;
    }
  };
}
