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

It reads as a **deck of four cards** — summary, experience, projects, contact —
driven by the arrow keys, with three project sheets hanging off the projects card
as long scrolling documents. The deck shape exists so the work survives being
skimmed; the sheet it is cut from has not changed.

Vite + Three.js, no framework, no CSS library. Real routes via the History API,
because Mew is a live WebGL context with physics and a brain: a real navigation
would kill her, so the SHEET changes, not the window.

Read in this order when picking it up cold:

| file | what it is | when |
|---|---|---|
| `RYAN.txt` | the owner's taste, distilled from ~200 reference images and the whole collaboration | **first, always.** Never regenerate it. Do NOT re-analyse the image folders — that work is done |
| `STATE.md` | what exists, how it works, the numbers, and every trap already paid for | before touching anything |
| `DESIGN.md` | what was built and why each part is there | when the question is "why is it like this" |
| `CLAUDE.md` | this file | how to work |

Three files carry more than their name suggests. `src/site/pages/sheet.js` is the
two-plate trim every project sheet is cut to — the three project files are only
the WORDS. `src/site/chrome.js` is everything that does not turn when the page
does (the stitch chart, the phone bar, the back control), and it lives outside
`#doc` so a page swap cannot flicker it. `src/engine/fx/sweatGeometry.js` is the
sweat's maths, pure and headless; its `sdDrop` is a twin of the shader's, and the
two are checked against each other on the GPU.

## Commands

```bash
npm run dev            # localhost:5173 — the owner tests here, in his own browser
npm test               # 876 checks: the headless sim + the router harness
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

Tab mark and link card (only if the mark, the palette or the pitch changes):

```bash
node tools/bake_favicon.mjs      # -> public/favicon.svg, favicon-32.png, favicon-192.png
node tools/bake_og.mjs           # -> public/og.png (1200x630), needs ffmpeg-static
```

Both cut from the same 32×32 grid in `tools/mewMark.mjs`, which is the drawing
itself in text — edit it there and re-bake both. `public/` is copied verbatim to
the dist root, which is why these paths are absolute in `index.html`.

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
  is sized for the screen she is on (`characterPx()` in main.js), and an effect
  using the page's scale keeps the proportions of a character twice as big.
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
  passes through everything now. The collision engine is intact and still tested;
  putting the attribute back on an element turns it on again.
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

The transcript on that page is a real run with **every device identifier
substituted** (`id #1234567`, `#2345678` are placeholders), and the page carries
a DISCLOSURE block saying so. If you edit that page, keep both true. If you are
ever asked to include real capture data, censor it in a copy of the file rather
than reading the original into context.

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
