# AnimationWeb

Ryan Ho's portfolio. It is **one document, printed as a two-ink riso sky seen
through die-cut apertures**, with a procedurally animated Mew loose on the page
as the only unprinted thing on it.

![The link card: bone paper with a rectangle cut out of it, and Mew standing in the hole in cerulean.](public/og.png)

Four cards — summary, experience, projects, contact — reached from a small bar
at the top, with three project sheets hanging off the projects card. The deck
shape exists so the work survives being skimmed; the sheet it is cut from has not
changed. Mew stays on the four cards.

One of the three sheets is not on the sheet at all: **experimental motion
graphics** shows "let me be a flower", a vertical piece rendered live in the
browser, as every one of its scenes -- a contact sheet that plays them all at
once from one video, and a viewer that opens out of a scene with the Photos app's
gestures. It is dressed in the piece's look rather than the site's.

Vite and Three.js. No framework, no CSS library, no component library. Real
routes via the History API, because Mew is a live WebGL context with physics and
a brain: a real navigation would kill her and start a new one, so the **sheet**
changes and the window does not.

## Running it

```bash
npm install
npm run dev      # localhost:5173
npm run edit     # localhost:5275/editor/ — edit the site visually, save into the source
npm test         # a headless engine sim + a router/page-swap harness
npm run build    # production bundle
```

`.claude/launch.json` also carries `mew-dist`, which serves the built `dist/` —
hashed URLs, `public/`, the SPA fallback — for checking the bundle as a bundle.

## What is where

| | |
|---|---|
| `src/site/pressgl.js` | **the press.** Paper, print and every hole, in one fragment shader pass. Compiled twice from one template, once per GLSL dialect, and the two agree byte for byte. |
| `src/site/sky.js` | the same press on the CPU. The reference implementation. |
| `src/site/deck.js` | the mask: geometry, the crossing, the two draws. |
| `src/site/router.js` | going through the hole. Page scopes, generation-guarded watchdogs, the swipe. |
| `src/site/pages/sheet.js` | the two-plate trim the USB and iClicker sheets are cut to. Their page files are only the **words**. |
| `src/site/pages/motion-graphics.js` | the motion-graphics page: markup here, the viewer (`motionViewer.js`), the contact sheet (`motionSheet.js`) and the dithered ground (`motionAmbient.js`) fetched only when it opens. Its media: `tools/bake_motion.mjs`, `tools/motion/README.md`. |
| `src/site/usbDemo.js` | FIG. 2 on the USB sheet: a terminal and the interface built over it, one rectangle, wiped between by the scroll. |
| `src/engine/**` | Mew: physics, a small brain, pose layers, and effects whose maths is headless-testable. |
| `src/mew.js` | the engine, behind a dynamic import. The sheet is a finished page without it. |
| `tools/` | the bake scripts. Nothing generated is edited by hand. |
| `editor/` | a visual editor that runs the real site in a frame and saves words, styles, colours and media back into the source. `editor/README.md`. |

## Reading it

Four files carry the argument, and in this order:

- **`RYAN.txt`** — the taste this was designed against. Never regenerated.
- **`STATE.md`** — what exists, the numbers, and every trap already paid for.
- **`DESIGN.md`** — what was built and why each part is there.
- **`CLAUDE.md`** — how to work in here.

Every comment in the source says *why*, and says what was tried and rejected.
That is deliberate: it is what stops the next pass redoing work that was already
measured and thrown away.

## Not finished

The three project sheets carry **placeholder prose** — the words have not had
their turn, including the motion-graphics page's process notes and its three
behind-the-scenes slots. The USB and iClicker card media are placeholders too. Their FIGURES are not placeholders: the USB sheet plays a real
recorded session and, beside it, the engraving generator's own interface running
a real recorded batch. The LinkedIn handle in `src/site/content.js` is marked
`placeholder: true` and renders as visibly unset rather than as a plausible
guess.
