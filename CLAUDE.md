# Global Behavioral & Agentic Guidelines

## Scope & Local Project Override
- **Local Commands**: Refer to the local project `./CLAUDE.md` or repository configuration files for project-specific build, test, lint, and formatting commands.
- **Precedence**: Local project instructions override or extend these global behavioral guidelines where specific repo conventions apply.

## Documentation & Dependency Management
- **Outdated Knowledge Assumption**: ALWAYS assume that your pre-existing/internal understanding of dependencies, libraries, frameworks, tools, and their underlying implementations is outdated. This applies universally across all forms of dependency, not just external API integrations.
- **Context 7 MCP Usage**: ALWAYS use the `context 7` MCP tool to fetch up-to-date documentation, version details, and current implementation patterns before writing code or implementing solutions involving any dependency. If somehow `context 7` does not cover the relevant subject matter, curl the subject matter and read them directly instead.

## Communication & Progress Updates
- **Conciseness**: Keep outputs focused, brief, and direct. Keep disclaimers and caveats short, spending most of the response on the main answer.
- **Progress Cadence**: Before your first tool call, state in one sentence what you are about to do. While working, give a brief update only when you find something important or change direction.
- **Final Output Structure**: Answer in under 6 sentences. Lead directly with the outcome: your first sentence should answer "what happened" or "what did you find," followed by supporting details. Use Simplified Technical English (ASD-STE100). No fluff. Don't rationalize final output structure internally by telling yourself the topic warrants depth, that's exactly the kind of self-justification that shouldn't override an explicit instruction.
- **Written Deliverables**: Match written documents and files to substance. Cover what is needed without padding with filler sections, redundant summaries, or boilerplate.
- **Correction Narration**: Only state corrections to earlier statements if the error alters the user's code, conclusions, or decisions. State the fix plainly and briefly, then move on.

## Action Defaults & Tool Execution
- **Default to Action**: Implement changes directly rather than only proposing them. Infer intent and proceed using tools to discover details rather than guessing.
- **Parallel Tool Calling**: When calling multiple tools without sequential dependencies (such as reading multiple files or performing speculative searches), execute independent tool calls in parallel.
- **No Guessing**: Never use placeholders or guess missing parameters in tool calls.
- **Scratchpad Cleanup**: Clean up temporary scratchpad scripts or temporary test files at the end of the session.

## Task Scope & Over-Verification Safeguards
- **Exact Scope**: Deliver what was asked, at the scope intended. Make routine judgment calls yourself, and check in only when different readings of the request would lead to materially different work. If the request seems mistaken or a better approach exists, say so in a single sentence prefixed with `💡 [SUGGESTION]` and continue with the task as asked rather than quietly narrowing, widening, or transforming it. Finish the whole task, and stop short of actions that are clearly beyond what was asked.
- **Preserve Tests**: Never edit or alter existing tests to pass without explicitly asking for authorization.

## Subagent Orchestration & Damping
- **Delegation Boundaries**: Delegate to subagents ONLY for large tasks that are genuinely independent and parallelizable (such as wide multi-file investigations).
- **Delegation Restrictions**: Do not delegate work you can finish yourself in a handful of tool calls, and do not use subagents to verify or double-check your own work.

## Safety & Reversibility Guardrails
- **Reversible Local Actions**: Editing local files, running linters, and running test suites do not require prior approval.
- **Destructive & Shared Actions**: ALWAYS request user confirmation before running destructive or hard-to-reverse commands:
  - Destructive filesystem or DB operations (e.g., `rm -rf`, dropping database tables).
  - Force/hard git commands (e.g., `git push --force`, `git reset --hard`, modifying published history, bypassing hooks via `--no-verify`).
  - Shared infrastructure or external API calls with side effects.

## Long-Horizon Persistence & Context Compaction
- **Token Persistence**: Do not stop tasks early due to token budget concerns. Context windows are automatically compacted near limits.
- **State Preservation**: As you approach token budget limits or before context refreshes, save current progress and state to memory/files (`progress.txt`, `tests.json`, or Git history).
- **Context Refresh Discovery**: When starting after a context refresh, inspect local state files (`progress.txt`, `tests.json`, Git logs) to restore context before taking action.

## Grounding & Hallucination Prevention
- **Admit Uncertainty**: If required information is missing or no available tool fits what is requested, state so directly rather than guessing.
- **Document Analysis**: When summarizing or analyzing long context documents (>20k tokens), extract direct quotes to ground conclusions before performing tasks.

---
---

# AnimationWeb — project instructions

Everything above is the global behavioural contract and stands unchanged.
Everything below is specific to this repository and takes precedence where the
two overlap.

## What this is

A personal portfolio site that is **one document**, printed as a **two-ink riso
sky** seen through **die-cut apertures**, with **Mew** — a procedurally animated
3D character — loose on the page as the only unprinted thing on it.

It reads as a **deck of five cards** — home, experience, projects, photos,
contact — reached from a small nav bar at the top middle -- no box, a hairline
over the five names, out of the way while scrolling down (the arrow keys and a swipe
still turn it, unadvertised), with four project sheets hanging off the projects card.
The deck shape exists so the work survives being skimmed; the sheet it is cut
from has not changed. **Mew is on Home and Contact** (`MEW_PAGES` in
`site/mewPresence.js`; Contact since 2026-10-04): she leaves Home through its
crossings, leaves Contact by fading out with the words on a page turn (or by
the same flight on the crossing back to Home), sleeps everywhere else, and
comes back by the side entrance. Every word is set in **Darker Grotesque**.

One project page is not cut to the site's trim: **experimental motion graphics** (titled "Digital Motion graphics" on the site since 2026-09-28)
(`pages/motion-graphics.js`), a showcase of short vertical works -- most cut from
"let me be a flower" (`../VisualAudialExperience`), with more to come. By
instruction it wears the works' look, not the site's: a dark ground (a dithered
still of the pixelated flower, or the work under the pointer), the pieces' inks.
The works and where each is shown are data, one line each, in `site/motion.js`.
**No spec notes on any page** (counts, running times, ratios, frame rates): the
owner asked for none, and nothing here may say to add them.

Vite 8 (upgraded from 5 on 2026-09-28) + Three.js, no framework, no CSS
library. Hosted on Vercel; `@vercel/analytics` and `@vercel/speed-insights` are
injected at the top of `src/main.js`. Real routes via the History API,
because Mew is a live WebGL context with physics and a brain: a real navigation
would kill her, so the SHEET changes, not the window.

Read in this order when picking it up cold:

| file | what it is | when |
|---|---|---|
| `README.md` | the front door, for somebody who arrived from the site's own GitHub link | if you are changing what this project IS, it changes too |
| `RYAN.txt` | the owner's taste, distilled from ~200 reference images and the whole collaboration | **first, always.** Never regenerate it. Do NOT re-analyse the image folders — that work is done |
| `STATE.md` | what exists, how it works, the numbers, and every trap already paid for | before touching anything |
| `DESIGN.md` | what was built and why each part is there | when the question is "why is it like this" |
| `CLAUDE.md` | this file | how to work |

Three files carry more than their name suggests. `src/site/pages/sheet.js` is the
two-plate trim the USB and iClicker sheets are cut to — their page files are only
the WORDS. `src/site/chrome.js` is the nav bar, the one thing that does not turn
when the page does, and it lives outside `#doc` so a page swap cannot flicker it. `src/engine/fx/sweatGeometry.js` is the
sweat's maths, pure and headless; its `sdDrop` is a twin of the shader's, and the
two are checked against each other on the GPU.

## Commands

```bash
npm run dev            # localhost:5173 — the owner tests here, in his own browser
npm run edit           # localhost:5275/editor/ — the visual editor (see below)
npm test               # the headless sim + the router harness (all pass, 2026-10-04)
npm run test:sim       # just the engine/behaviour suite
npm run test:router    # just the router + page-swap harness (needs a fake DOM)
npm run build          # production bundle
npm run build:single   # one-file dist, for file:// checks
```

Model pipeline (Python 3 + numpy/scipy/Pillow, only needed if you touch the rig):

```bash
python3 tools/rig_mew.py     # rebuild src/assets/mew.glb from mewNew.glb (~20 s)
python3 tools/check_mew.py   # the model gate — weights, shells, skin, blink, tail
```

Sky pipeline (only if the cloud field itself changes):

```bash
node tools/bake_sky.mjs assets-source/<clip>.mp4 20 320   # -> src/assets/media/sky-field.webp
```

Icon pipeline (only if a project's icon changes, or a project is added):

```bash
node tools/bake_icons.mjs        # tools/icons/*  ->  icon-atlas.png, glyph-*.png,
                                 #                    src/site/iconatlas.js
```

Project-sheet figures (only if a sheet's media changes):

```bash
node tools/bake_captures.mjs [--only <id>] [--dry]   # -> src/assets/media/stand-*
```

The crop decisions live in a manifest at the head of the tool, the way `CELLS`
does in `bake_icons.mjs`. It derives quality from a size ceiling and **exits
non-zero over budget** rather than printing a warning nobody reads.

FIG. 2 on the USB sheet — the engraving generator's UI, built as a library in
another repository and vendored in (only if that app or its recordings change):

```bash
cd ../USB-UI/app
npm run build:lib      # -> out/lib/xtool-demo.{js,css}, gated by demo:check
npm run demo:record    # -> demo/recordings/ (both runs, and a preview per jig)
cd -
node tools/vendor_demo.mjs        # -> src/vendor/xtool-demo/
```

`src/vendor/xtool-demo/` is **generated — do not edit it.** The tool rewrites the
stylesheet for a shadow root and switches the app's dark mode off, and it exits
non-zero if either rewrite stops matching. `test/sim.test.js` re-checks the
vendored recordings from this side rather than trusting the other repository's
gate. See STATE.md, "FIG. 2 — the command line becoming the interface".

FIG. 2's backlight is NOT vendored: `src/site/glowField.js` is its model and
`src/site/glow.js` draws it. The fragment shader in `glow.js` is a
transcription of `shadeAt` in `glowField.js` — change one, change the other,
and check them against each other on the GPU (STATE.md says how).

The motion-graphics page's video (only if a work is added or re-cut). Renders of
"let me be a flower" are made in a SCRATCH COPY of `../VisualAudialExperience`,
never in it; `tools/motion/README.md` is the whole procedure:

```bash
node tools/bake_motion.mjs --add <video> --id <id>        # a new work from any video, then one line in site/motion.js
                                                          # silent by default: --sound keeps its track, with `sound: true` on its line in site/motion.js (only the pool, the clouds and the film have one)
node tools/bake_motion.mjs --sheet                        # rebuild the contact sheet from the site's own clips
node tools/bake_motion.mjs --renders <sandbox>/renders    # re-cut every work from the piece's renders
node tools/motion/credits.mjs ../VisualAudialExperience/CREDITS.md   # -> site/motioncredits.js
```

`src/site/motionassets.js` and `src/site/motioncredits.js` are **generated — do
not edit them.** The works' names, and where each is shown, are
`src/site/motion.js`, which is hand-written.

The photos card's pictures. The two FOLDERS are the list: `src/assets/photos/reel/`
(the snapshots hung in the margins) and `src/assets/photos/photography/` (the
block in the middle). `site/photoassets.js` is a hand-written glob over them, so
a picture added there is on the card and one deleted there is gone, with no code
to edit and nothing to run. (Which picture sits in which frame is
`src/assets/photos/arrangement.json`, written by the editor's drag-to-swap: optional,
and it follows the folders.) Only a picture a browser cannot show needs the bake:
drop it straight off the iPhone -- HEIC is fine -- into `photos-source/reel/` or
`photos-source/photography/` (git ignores both), then:

```bash
npm run photos                   # = node tools/bake_photos.mjs -> src/assets/photos/{reel,photography}/
node tools/bake_photos.mjs --dry|--prune|--restore|--all
```

It strips every picture's metadata (an iPhone writes its GPS position into
each one), turns it upright, converts P3 to sRGB, and writes each at 640 / 1280 /
2048 (and 320 for the reel) as `<id>_<w>x<h>_l<lightness>_<edge>.webp`: the page
learns a picture's shape and lightness from its NAME, so it needs no manifest
and nothing moves when a picture arrives. It writes no code. A picture already
in a folder as a WebP/JPEG/PNG can simply be copied in. A picture you delete from
the site's folder while its original is still in `photos-source/` is not baked
again (`photos-source/.baked` remembers what it made); `--restore` brings
it back and `--prune` removes what has no original.

The site's name, the link card and the tab mark: **`src/site/identity.js`**,
edited in the editor's **Link & icon** tab (or by hand). `siteIdentity()` in
`vite.config.js` writes the `<title>`, the descriptions, the `og:` tags and the
icon links into `index.html`'s head where the `<!-- identity -->` marker is, at
dev and at build time (a scraper never runs the page). The card's picture is
drawn by the editor (`editor/client/card.js`) and saved as `public/og.png` (or
`og.jpg` for an uploaded photograph); the grid icon is baked by:

```bash
node tools/bake_favicon.mjs      # ICON.grid -> public/favicon.svg, .ico, -32, -192, apple-touch-icon.png
```

`tools/bake_og.mjs` is gone (it needed the Plex `.ttf` files, which left the
tree with the woff2 switch); the card has one renderer now, the editor's.
`public/` is copied verbatim to the dist root, which is why the icon paths are
absolute. ONE preview for the whole site, by instruction: Vercel returns the
same `index.html` for every route, so every shared link unfurls into this card.

`src/site/iconatlas.js` is **generated — do not edit it.** Add a project by
dropping its icon in `tools/icons/`, adding a cell to `CELLS` in the tool, and
re-running it. The words live in `src/site/content.js`, in one file, because copy
is the thing most likely to change.

## Working rules — non-negotiable

1. **Naturalness is the acceptance bar.** If motion looks wrong, find the
   STRUCTURAL cause — wrong stiffness model, wrong reference frame, missing
   follow-through, geometry too small to read. Do not mask symptoms by fiddling
   parameters. Recognise when something genuinely IS surface-level before tuning.
2. **Purpose per element.** Every object must be explainable: why it exists and
   why it is *there*. This is the rule the whole site is built on.
3. **A ground must be a made thing, not a running function.** The craft has to
   live in a decision — a separation, a screen angle, a lighting model, a
   misregistration — not in the fact that maths is visibly happening. Anything is
   permitted as material; "it exists because the function does" is not.
4. **Measured, not chosen.** Constants come from artefacts and get their
   provenance in a comment. A number nobody can defend is a number that drifts.
5. **All tuning constants live in `src/config/rigConfig.js`.** Never hardcode
   bone names or magic numbers in engine files. A future model must swap in by
   editing rigConfig alone.
6. **Everything frame-rate independent.** `expDamp`, `Spring`, `QuatSpring`.
   Raw per-frame lerps are banned. The sim runs at a fixed 120 Hz (`loop.js`);
   pose layers run per render frame with their own substepping.
7. **FX cost is one-time, at event time.** Zero or near-zero per frame. Pure
   maths goes in headless-testable modules — the pattern is `fx/beamGeometry.js`.
8. **Comments: relaxed tone, lowercase except abbreviations.** Say WHY, and say
   what was tried and rejected. Never regenerate a whole file when a patch does.
9. **The owner verifies visually, you verify headlessly.** Do not ask him to
   check something you could have measured. Do not browser-test each change.
10. **Character aesthetics are his call.** Do not redesign the silhouette or
    repaint the face unasked.

## Verification, and what this environment will not do

A new Browser-pane tab reports **`innerWidth: 0`** and **`document.hidden: true`**.
Four consequences, and each one has cost a wrong conclusion at least once:

- **The deck's rAF never runs**, so live screenshots of transitions are
  impossible and always have been. `window.__DECK__.debug.paint(t, scrollY)`
  draws a frame by hand; that is how every visual claim in `STATE.md` was made.
- **`paint()` bails on its first line at `innerWidth: 0`**, so `debug.gpu` reads
  false with nothing wrong at all. **Resize the tab before reading any probe.**
- **CSS transitions and animations are suspended.** `getComputedStyle` on a
  transitioning property returns the FROM value, forever — a focus rule that was
  applying perfectly well read back as `opacity: 0`, and an entrance that had
  long since landed reads as `opacity: 0` too. To find out whether a rule
  actually matched, append `transition:none !important` for that element, read,
  and remove it.
- **The pane does not scroll**, and timers are throttled hard. A debounced
  handler can take seconds; end the tool call and read again rather than
  awaiting inside one. WebGL readback also lags several draws behind, so a pixel
  probe of anything on a clock does not survive contact with it.

The other tools that do work: cache-busted module imports compiling the real
shaders into a scratch canvas, then `readPixels` and comparing; the node sim
harness driving the real engine; and `.claude/launch.json`'s **`mew-dist`**,
which serves the real bundle — hashed URLs, `public/`, `404.html` — on 5274.

**Say so when you have not seen something.** Never describe motion as verified
when only the numbers were.

## Invariants — break these and something silently dies

- **Never put a backtick in a GLSL comment.** Shaders live in template literals;
  one backtick anywhere inside terminates the string and the whole MODULE fails
  to parse. Vite reports nothing useful. Check with
  `node -e "import('./src/site/pressgl.js')"` — the browser console will not
  find it.
- **The escape from inside type must out-push the hardest steer.**
  `physics.insideAccel` > `steerMaxForce × leanThrust.maxMul`. There is a test.
- **`world.scroll.y` and `world.docSize` are stale during a page swap.** The
  router swaps `#doc`, scrolls to the top and emits `recollect` in one
  synchronous block, and `scroll` is async. Anything positional must read the
  re-measured values — world.js re-measures on `recollect`, subscribed first.
- **Read `window.scrollY` BEFORE replacing `#doc`.** A shorter page clamps the
  scroll on the spot, so a value read afterwards is where the reader ENDED UP.
- **A teleport must copy `prevPos`.** The render loop interpolates
  `prevPos → pos`; leaving it behind draws one frame of a streak.
- **Bones are reset to rest every frame** by the poser. Cross-frame smoothing
  keeps its own state; never smooth on `bone.quaternion` directly.
- **InstancedMesh: `frustumCulled = false`.** The bounding volume sits at the
  fx-group origin, which is nearly always off camera.
- **Never hold a deck icon RECORD across a `measure()`.** It rebuilds every one
  of them, so anything keyed on record identity is silently dropped on the next
  resize or font load. Key on the ELEMENT.
- **An entrance animation is geometry.** `measure()` runs inside `commit()`, in
  the frame the markup is inserted, so anything still at its `from` keyframe is
  measured THERE. Nothing carrying an aperture may translate as it arrives.
- **`:not()` takes its argument's specificity**, so `.ap:not(.icon)` is (0,2,0)
  and beats a bare class. Same family as `.t.body` (two classes) beating every
  single-class `max-width` override, and `.d.sm` beating the small-screen `.d`.
- **`gl.scissor` counts from the BOTTOM; `drawImage` counts from the TOP.** A
  scissored pass must also run BEFORE the full one, because they share the
  drawing buffer the sheet is displayed from.
- **Anything pinned to Mew converts with `view.fxPerPx`, not `worldPerPx`.** She
  is sized for the screen she is on (`characterPx()` in `src/mew.js`, which
  also multiplies by the design pixel so she grows with the page), and an
  effect using the page's scale keeps the proportions of a character twice as big.
- **The sweat's alpha is a CLASSIFIER, not a coverage** (`fx/alphaFlags.js`).
  Antialiasing its edge puts the fringe on `FX_ALPHA` and the pixelate pass rims
  every drop in the hyper beam's hot outline. Hard `discard`, always.
- **A watchdog may only speak for its own navigation.** They outlive the move
  that armed them by seconds; an unguarded one clears a LATER crossing's eating
  for one frame, which is the intermittent mid-transition flicker.
- **A hidden element has no rectangle and is never measured.** Reveal it,
  remeasure, then ask the deck for a hole in it — in that order.
- **A CSS percentage in a custom property is two different lengths.**
  `width:var(--icon); height:var(--icon)` resolves against the box's width and
  against its height respectively, so a 4:3 box makes a square drawing oblong.
  Use `aspect-ratio` for the second axis.
- **Nothing on a hover or scroll path may read layout.** The card's hover scales
  the picture INSIDE a fixed frame for exactly this reason: the hole has to stay
  where it was measured.
- **`data-collider` appears nowhere in the site markup**, by instruction — Mew
  passes through everything, and no route goes round anything. The collision
  engine is intact and still tested; putting the attribute back on an element
  turns it on again. The tracker DOES collect the type now, as `soft` rects, and
  a soft rect exerts no force and is invisible to A\* — it only makes a cell an
  expensive place to STOP. Everything about where she settles reads the
  placement grid; nothing about how she travels does.
- **A hole is measured where the document LIVES, not where it is standing.**
  `getBoundingClientRect` includes a transform, and a page turn has one on
  `#doc` at the exact moment `commit()` calls `bind()`. `measure()` takes it off
  for the length of the measurement; without that, every aperture and every icon
  is baked 30 px left for the life of the page.
- **Every hole prints its own sky, into a canvas inside its element**
  (`deck.js`, since 2026-09-27). `bind()` gives each `[data-ap]`,
  `[data-icon-ap]` and `[data-sky]` element a first-child `canvas.hole-cv`;
  each paint prints that hole's piece of the plate into the top-left of the
  full-screen canvas's buffer (scissored) and copies it across in the SAME
  task. So a hole moves, zooms and turns with its element by construction --
  the old single full-screen canvas trailed a frame behind every scroll. The
  full-screen `#sheet` is now drawn ONLY during a crossing and hidden at rest
  (its buffer is scratch for the hole passes). Holes print only while on
  screen, and never on a scroll (their content depends on their place on the
  page, not the scroll), except `data-fixed` ones and the crossing.
- **The plate is in DESIGN pixels.** The press takes `origin` (real px, x from
  the left of the page sheet) and `zoom` (the design pixel); holes, `sky` and
  `skyRamp` are design px. Anything handing the deck a real page length
  divides by `deck.scale` first -- the router's scroll carry does.
- **A project icon is one element OVER the picture, not a punch through it.**
  `.pcard-ap`'s canvas is masked to the glyph (`--glyph`) and faded by
  `--open`, which `deck.setMaskHole` writes; the white glyph below is the same
  square. Only one icon is open at a time. The lens's sky is clipped by the
  same element that draws its ring (`.deck-hole { overflow:hidden }`).
- **A teleport is only free while nobody can see it.** She is drawn above the
  spreading print, so a crossing does not hide one either, and a fade covers
  nothing at all. `recollect` places her only when she is off screen; on screen
  she is left where she is, carried by the same scroll offset the plate gets.
- **The paper is written in two places, not three.** `site/palette.js` is the
  one source for the press (the shader takes it as the `uPaper` uniform, and
  `sky.js` reads it too); `--paper` in `site.css` is the CSS twin. Change both,
  or use the editor, which writes both.
- **`#doc[data-page]` is set by the router on every commit** (`home`,
  `experience`, `project:<slug>` …). `edits.css` scopes page rules with it; the
  project sheets share every other id they have.
- **`--n4` may never carry a word.** It is 2.61:1 on bone — under half the 4.5:1
  floor — and it is for hairlines, ticks and inactive marks. Eight rules were
  painting text in it. There is a check, and it reads the real stylesheet.
- **The router owns the scroll, so the browser must not.**
  `history.scrollRestoration` is set to `manual`: `commit()` reads where the
  reader was, puts them at the top of the new sheet, and winds the plate on by
  exactly that offset. An async restore landing afterwards is a race the SKY
  loses, not just the scroll position.
- **`public/` is copied verbatim to the dist root**, which is why the favicon and
  card paths in `index.html` are absolute — and why `dist/404.html` has to be
  written by the build rather than dropped in `public/`: it carries the hashed
  script tags.
- **The head's name, card and icon tags are not in `index.html`.** They are
  written from `src/site/identity.js` over the `<!-- identity -->` marker by
  `siteIdentity()` (normal order: after the editor's "pre" hook, which re-reads
  the file from disk, and before `buildNotesOut` strips comments). Add a meta
  tag there by hand and it will disagree with the editor; there is a test.
  `theme-color` stays in `index.html` because the paper owns it.
- **`[data-at]` is the scroll readout's.** `deck.js` writes
  `"<scroll> / <height>"` into every element carrying it, on every measure. A
  page that puts its own `data-at` on something gets that text printed into it.
- **A hash change is not a page change.** A fragment navigation fires
  `popstate`; the router ignores one whose path is the sheet already shown (it
  used to re-render the page and throw the hash away). A page that wants the
  hash listens for `hashchange` itself.
- **`font-size-adjust` is inherited, into shadow roots too.** `body` carries
  `font-size-adjust:0.511` (Darker Grotesque set at the old mono's x-height);
  anything in another face -- FIG. 2's terminal, the vendored demo's shadow
  root -- sets `font-size-adjust:none` or it is scaled 1.265x.
- **Mew sleeps with a CLASS, not an inline style** (`#stage.asleep`). The editor
  hides her with the inline visibility; waking must not overrule it. And the
  class comes off in `renderFrame`, after the first frame drawn on waking --
  the canvas still holds her last picture from before she slept.
- **The motion page's viewer lives on `<body>`, and its ground canvas moves into
  it while open.** `#doc` is a stacking context under the grain; a canvas moved
  in the DOM keeps its WebGL context, so the ground travels rather than being
  drawn twice.
- **The motion wall is placed in COLUMN WIDTHS, never measured.** A
  percentage margin or padding resolves against the containing block's WIDTH,
  so `--dy`, `--x`, `--w` and `--top` from `motionLayout.js` place every tile
  with no layout read. Give a column a width-dependent height any other way
  (a `vh`, a `px`) and the greedy estimate no longer matches the page.
- **The ground stops when it rests on a still.** `motionAmbient.js` draws a
  still until it has faded in and then not at all; a loop redrawing it re-rolls
  the grain every frame, which is a shimmer across the whole window.
- **A page is committed MID-TRANSITION, so nothing costly starts at commit.**
  The router emits `navigating` as a move starts and `settled` once it has
  finished drawing; main.js turns those into `ctx.onLeave(fn)` and
  `ctx.settled`, and `afterArrival(ctx, fn)` (utils/arrival.js) is how a page
  starts a WebGL context, a video decoder or a big module. Starting them at
  commit was the frame drop going into every project sheet on a phone
  (measured: a 408 ms frame into the USB sheet at 4x throttle; 25 ms now).
  An idle callback is NOT a substitute: Chrome finds idle gaps between a
  transition's frames, and Safari has no idle callback at all.
- **A seek is re-issued only for a NEWER request, never to match currentTime.**
  Safari lands a seek on the nearest time it can present, so "seek again until
  currentTime equals what I asked" never terminates: after one scrub the
  viewer's video sat seeking forever (frozen, bar stuck, phone warm).
  motionViewer.js compares `want` with `asked`, never with the element.
- **The viewer makes a new `<video>` per scene** and empties the old one (src
  removed, load()). Swapping the src of one playing element is where iOS kept
  the clock running on a frozen picture.
- **Nothing under the motion viewer runs while a scene is open or lifted.** The
  tiles, their video, the flower's clip stop BEFORE the frame grows and start
  again only once it has landed back; on a phone the ground stops too (the
  frame covers it). Waking the page at the start of a lift was the 5 fps drag.
- **The viewer's frames turn; their pictures are not re-pointed.** After a
  page the neighbour that slid in becomes the middle frame where it stands
  (`rotate`); re-pointing all three posters at once flashed the scenes just
  left, because an undecoded poster shows its old picture. A chevron or key is
  a TURN (two frames, step and fade), a finger drags the strip.
- **A touch in the viewer is answered once.** iOS follows a tap with a click
  that has no `pointerType`, so a click soon after a touch is ignored; without
  that, a tap paused and its click played again, and a phone never paused.
- **A px in `site.css` and `edits.css` is a DESIGN pixel** -- a pixel of the
  owner's 1512 px window. `src/styles/designPx.js` rewrites each one to
  `calc(n * var(--u))` as the file is served and built (Vite plugin in
  `vite.config.js`, and the editor's live preview). `--u` is 1px up to 860
  wide, and above it the SMALLER of width/1512 and height/867 (the laptop's
  window inside the browser) -- so every desktop shows exactly the laptop's
  page, scaled to fit, with any spare width as paper at the sides. Every
  `.plate` is 1512 design px wide and centred (the stage), so a percentage
  inside one is a share of the laptop's page. `vw`/`vh`/`lvh`/`svh`/`dvh` are
  rewritten too (to `calc(n * var(--vw))` etc: 1vw below 860, 15.12 design px
  above) EXCEPT 100 and 50, which keep meaning the real window (full bleed,
  sticky pins, centring). Hairlines (≤1px), breakpoints and the unit
  declarations are left alone. The editor's Desktop frame is therefore fixed
  at 1512 x 867 (`REF_W`/`REF_H` in designPx.js), scaled to fit the pane.
- **Home never scrolls on a desktop.** `#s0` is `height:100lvh; overflow:clip`
  and its `.deck-in` is `flex:none`: a moved box still counts towards the
  scroll, and moving the tall flex:1 column in the editor made Home scroll by
  157 design px. Something placed below the laptop's fold is clipped, and the
  editor's 867-tall frame shows exactly where.
- **FIG. 2's app is zoomed, not rewritten.** Its console places rows at a
  pixel height from script, which a stylesheet rewrite cannot reach, so
  `usbDemo.js` sets `zoom` on the shadow host to the design pixel -- and
  re-cuts the app's CSS for the three things zoom does not reach (a `rem` is
  the page's root size, media queries ask the window, and its font-size is
  inherited from the already-scaled figure).
- **HTML comments never ship.** `vite.config.js` (`buildNotesOut`) strips
  every `<!-- -->` from `index.html` and from the page templates in the BUILD
  only; dev and the editor see the files as written. So no code may depend on
  a comment node, and a note meant for a reader of the source goes in a
  comment, never in visible markup. The build stops if one cannot be removed.
- **The hyper beam's envelope is written three times** -- `envelope()` in
  `fx/beamShape.js`, `ENV` in `fx/beamMaterials.js`, `beamEnv` in
  `site/pressgl.js` (the burn under it). Change one, change all three, and
  check them against each other on the GPU (STATE.md §26 says how).
- **The beam is not drawn through the pixelate pass.** Its two scenes
  (`fxUnder`, `fxOver` in `mew.js`) are document-px meshes under an
  orthographic CSS-px camera, drawn either side of her sprite by the
  presentation pass's `under`/`over`. Every beam material writes PREMULTIPLIED
  colour (ONE, ONE_MINUS_SRC_ALPHA): additive blending is invisible on white
  paper.
- **Compile an effect at load, never at its moment.** three builds a program
  the first time a material is drawn; the new beam's first shot was a 117 ms
  frame on a phone-sized window until `mew.js` called `compileAsync` on its
  scenes. Anything hidden until its moment needs the same.
- **The hand is where it pressed.** `world.js` sets the pointer's position
  on `pointerdown`, because a finger sends no move before its press; reading
  the position from `pointermove` alone made every tap on a phone a drag.
  And a finger on her lands on `#mew-touch` (touch-action:none, coarse
  pointers only), never on the page, or the browser turns it into a scroll.
- **A cursor only flicks her off TEXT** (brain.js, the startle): her circle has
  to overlap a soft rect, the same test the aside uses. In open paper a fast
  pointer does nothing.
- **The burn under the beam is the sheet's** (`deck.setBeamBurn`, every frame
  while the beam is out). It shows `#sheet` like a crossing does, and the
  holes do NOT reprint for it; a burn not refreshed for 400 ms is dropped.
- **A scanner strict enough to be useful catches documentation about itself.**
  The redaction check failed on `STATE.md` for spelling out a volume path while
  explaining the rule. Prose about those patterns must name them, not spell
  them.

The full catalogue, with the failures that produced each one, is in `STATE.md`
under **Traps already paid for**. Read it before debugging anything that smells
like one.

## Security — a hard constraint on the USB project

`src/site/pages/usb-provisioning.js` documents a real RCMP hardware pipeline.
The source tooling for it lives OUTSIDE this repository and contains a hardcoded
credential.

**None of the following may ever appear in this repository, on any page, in any
committed file, or in any transcript:** credentials or key material, real asset
numbers, drive serials, or volume identifiers.

FIG. 1 — the played PowerShell transcript and its timing table — was removed
as the outdated demo; FIG. 2 runs sequential synthetic serials. The redaction
check in `test/sim.test.js` still holds any device identifier to the four
stand-ins (`#1234567` …) and scans every committed text file for key-shaped and
serial-shaped values. **No test checks the page's WORDING** (2026-10-04, by the
owner's instruction: the DISCLOSURE-sentence checks were removed, and tests are
for behaviour, not copy), so the DISCLOSURE note is the owner's to word; it
should still say what is not on the page. If you are ever asked to
include real capture data, censor it in a copy of the file rather than reading
the original into context.

## The editor — `npm run edit`

A visual editor for the site, in `editor/`, that runs the REAL site (same vite
config plus one plugin, port 5275) in a frame and writes changes back into the
source. Read `editor/README.md` before touching it. What it writes:

- **words** into the string they came from (`content.js`, `projects.js`, the
  page files, `index.html`), found through the AST, never a text search;
- **styles** into `src/styles/edits.css` — GENERATED, imported after `site.css`,
  three sections (all widths / ≤860 / ≤560). Do not hand-edit its format;
- **ids** as `data-e="…"` in markup (and `capture({ e })` for figures), which is
  what `edits.css` selectors key on. Leave them in place when editing markup;
- **colours** into `site/palette.js` + the `:root` tokens in `site.css`
  (FIG. 2's six backlight colours are `--glow-1`..`--glow-6` among them);
- **media** encoded into `src/assets/media/` the way `bake_captures.mjs` does.

On the motion-graphics page the works' names resolve to `src/site/motion.js`
(plugin.js, `DATA`), and the behind-the-scenes figures are ordinary capture
slots. The nav bar is fixed chrome and locked.

Nothing in `editor/` is reachable from `index.html`; the build never sees it.

## Conventions

- Comments carry the argument, not just the description. When something was
  tried and rejected, the comment says so and why — that is what stops the next
  session redoing it.
- Tests are named as sentences about behaviour, not about functions
  (`"a frightened flail is not an annoyed one"`).
- Every route assertion that could pass by accident is **paired against a
  control** — the same code with the fix disabled. If a check would pass either
  way, it is not testing anything.
- Scratch/probe scripts belong in the session scratchpad, not in the repo.
- `git commit` only when asked.
