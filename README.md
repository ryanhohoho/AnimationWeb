# AnimationWeb

Ryan Ho's portfolio. It is **one document, printed as a two-ink riso sky seen
through die-cut apertures**, with a procedurally animated Mew loose on the page
as the only unprinted thing on it.

![The link card: bone paper with a rectangle cut out of it, and Mew standing in the hole in cerulean.](public/og.png)

Five cards — home, experience, projects, photos, contact — reached from a small
bar at the top, with the project sheets hanging off the projects card. The deck shape
exists so the work survives being skimmed; the sheet it is cut from has not
changed. Mew is on Home and Contact, and nowhere else.

One of the four sheets is not on the sheet at all: **digital motion graphics** is a showcase of short vertical works rendered live in the browser --
a drifting wall of every one of them playing at once from one video, the
longest first, a flower stepped through 21 techniques as you scroll, and the
whole film they were cut from as the conclusion. A viewer opens out of any of
them with the Photos app's gestures. It is dressed in the works' look rather
than the site's.

Another is locked: **Softshield**, the confidential encryption tool (slug
`rcmp-encryption`), says what the work was and what the role was, and marks the
rest "This work is confidential" with a way to ask. The other two are **Laser
Processing** (slug `usb-provisioning`, the engraving pipeline) and **iclicker**.

The **photos** card is the photography as one justified block, its pictures in
different sizes but ending on the same edges, with the snapshots of his life hung
in the paper either side of it, printed in the sky's two inks until you look at
one. The folders `src/assets/photos/reel/` and `photography/` are the list: add a
picture and it is on the card, delete one and it is gone. Pictures come straight
off an iPhone through `tools/bake_photos.mjs` (`npm run photos`), which strips
every one of its location and camera data.

**Every screen shows the owner's laptop page.** A px in the stylesheets is a
pixel of his 14" MacBook Pro's 1512 x 867 window; above tablet width every page
is that window scaled to fit the screen and centred (`src/styles/designPx.js`).

Vite 8 and Three.js, plus Vercel Web Analytics and Speed Insights (injected at
the top of `src/main.js`; the site is hosted on Vercel). No framework, no CSS library, no component library. Real
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
| `src/site/pressgl.js` | **the press.** Paper, print and the crossing, in one fragment shader. Compiled twice from one template, once per GLSL dialect, and the two agree byte for byte. |
| `src/site/sky.js` | the same press on the CPU. The reference implementation. |
| `src/site/deck.js` | the mask: every hole prints its own sky into a canvas inside its element; the full-screen canvas is used only for the crossing. |
| `src/site/photos.js`, `photolayout.js`, `photoassets.js` | the photos card: the block and the margins, how they are worked out from the pictures (pure), and the folder glob that is the list. Pictures: `tools/bake_photos.mjs` from `photos-source/` (git-ignored). |
| `src/styles/designPx.js` | the design pixel: every px/vw/vh in the stylesheets rewritten to scale from the 1512 x 867 reference window. |
| `src/site/router.js` | going through the hole. Page scopes, generation-guarded watchdogs, the swipe. |
| `src/site/pages/sheet.js` | the two-plate trim the USB and iClicker sheets are cut to. Their page files are only the **words**. |
| `src/site/pages/motion-graphics.js` | the motion-graphics page: markup here; the works and where each is shown in `motion.js`; the wall's layout (`motionLayout.js`), the tiles' drawing (`motionSheet.js`), the flower (`motionBloom.js`), the viewer (`motionViewer.js`) and the dithered ground (`motionAmbient.js`) fetched only when it opens. Its media: `tools/bake_motion.mjs`, `tools/motion/README.md`. |
| `src/site/usbDemo.js` | FIG. 2 on the USB sheet: a terminal and the interface built over it, one rectangle, wiped between by the scroll. |
| `src/engine/**` | Mew: physics, a small brain, pose layers, and effects whose maths is headless-testable. |
| `src/mew.js` | the engine, behind a dynamic import. The sheet is a finished page without it. |
| `src/site/identity.js` | the tab's name, the link card a shared URL unfurls into, and the tab mark: written into the head by `vite.config.js`, edited in the editor's **Link & icon** tab. |
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

Some project prose is still being written, including the motion-graphics
page's process notes and its three behind-the-scenes slots. The Laser
Processing sheet's figures are real: a recorded command-line session and,
beside it, the engraving generator's own interface running a recorded batch.

