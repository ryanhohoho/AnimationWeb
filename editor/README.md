# The editor

```bash
npm run edit        # opens http://localhost:5275/editor/
```

The real site runs in the middle, at the width of the screen size you pick. Click
anything to select it, change it, press **Save**. The changes are written into
the site's own source files, then `npm test` runs. Nothing is committed to git.

Mew, the sky, the fixed chrome (the nav bar) and FIG. 2 on the USB sheet are
locked. FIG. 2's backlight colours are not: see below. On the motion-graphics
page the works' names are in `src/site/motion.js` and edit like any other words;
its behind-the-scenes figures take **Replace…**.

## Using it

| to | do |
|---|---|
| select | click it, or click its row in **Layers** (left) |
| select several | press on empty space and drag a box: it picks every word, picture and hole it touches. ⇧-click (or ⇧-box) adds, ⌘⇧-click (Ctrl-⇧) takes out — on the canvas or in **Layers**. A plain click on one of them selects just that one |
| select the thing around it | the grey path under its name in the inspector |
| change words | double-click (or ⏎). ⏎ finishes, ⇧⏎ breaks the line, ⌘B is the site's emphasis |
| move | drag it (drag any one of a selection to move all of them). Guides snap to its neighbours and the page's middle; ⌥ turns snapping off, ⇧ holds one axis |
| nudge | arrow keys, ⇧ for 10 px |
| resize | the handles, on one element or round a selection of several. **Text scales**: with the chain on (the default) every handle scales the type, its box and its spacing together, so the lines break where they did and it follows the pointer 1:1; with the chain off the side handles change the box only and re-wrap the lines. Corners always scale. A picture keeps its shape from every handle; a box keeps its ratio when its chain is on, or with ⇧ |
| link size and box | the chain under Layout: on a text block, **Size and box scale together** (W scales the type; Aa scales a box that has a set width); on a box, **Keep width and height in ratio**. Remembered in this browser |
| change several at once | the inspector shows only what they share (type only if all are words, fit and shape only if all are pictures). A value that differs shows **Mixed**. Typing sets it on all; dragging a field's label moves each by the same amount from its own value; **%** scales everything in place |
| reorder | drag rows in **Layers**, or "earlier / later" in the inspector |
| replace a picture or clip | select it → **Replace…** → pick a file in Finder |
| set what stays in frame | click the preview in the inspector (the focal point) |
| add something | **Insert after ▾**: a paragraph, heading, label, picture or clip, or a hole |
| copy / remove | ⌘D / ⌫ (⌫ on several asks once for all of them). Delete also offers "hide on this page only" |
| paper and ink colours | click empty space, so that nothing is selected: the inspector shows the page's colours |
| FIG. 2's backlight colours | on the USB sheet, with nothing selected: six colours and two presets (Apple Intelligence, Vivid). The light is shown in full while the panel is open, because on the page it follows the reader's scroll |
| try the page as a visitor | tick **Preview** |
| undo / redo | ⌘Z / ⇧⌘Z (everything, including text and media, until you save) |

**Screen sizes.** Desktop, Tablet (≤860 px) and Phone (≤560 px) are the site's
own breakpoints. **Desktop is always 1512 px wide** (the owner's 14" MacBook
Pro), shown smaller when the pane is narrower: every px the editor writes is a
DESIGN pixel -- a pixel of that window -- and the site scales it with the
window above 860 px (`src/styles/designPx.js`), so what is placed here lands
in the same place, at the same size, on a 27" monitor. Only at exactly 1512
wide does a pixel dragged on screen store one design pixel, which is why the
width is fixed. A change made on Desktop carries down to the smaller sizes
until you change it there. Each field shows where its value comes from:
a filled dot means set at this size; a hollow dot means set at a larger size;
no dot means it comes from `site.css`, and the grey placeholder shows what it
currently works out to.

**Scope.** "This element only" is the default. If the element has classes, the
inspector also offers every element like it on this page, or on every page.

**Warnings, not locks.** Text under 4.5:1 contrast, a word set in `--n4`, and
`--mew` on anything but Mew are flagged in the inspector and in the Save dialog.
You can still save them.

## Where each change is written

| change | file |
|---|---|
| words | the string they came from: `content.js`, `projects.js`, `pages/*.js`, `index.html` |
| link addresses | the same way |
| position, size, type, fill, order, hide | `src/styles/edits.css` (generated; do not hand-edit) |
| the element's id for those rules | `data-e="…"` in its markup, or `capture({ e })` for a figure |
| paper | `site/palette.js` + `--paper` in `site.css` + `<meta name="theme-color">` |
| sky inks | `site/palette.js` (home), `projects.js` (each project) |
| text colours | the `:root` tokens in `site.css` |
| FIG. 2's backlight colours | `--glow-1` to `--glow-6` in `:root` in `site.css` |
| a figure's picture | `src/assets/media/<id>.webp` (or `.mp4` + `-still.webp`), and its `ratio` in `capture()` |
| a card's picture / hover clip | `src/assets/media/card-<slug>.webp` / `.mp4` |
| a card's icon | `tools/icons/icon-<slug>.*`, then `tools/bake_icons.mjs` runs |
| new elements, deletions | the markup or the data list they belong to |

Uploads are encoded the way `tools/bake_captures.mjs` encodes: WebP stills,
walked down a quality ladder to 140 KB; H.264 clips with a poster, aimed at
500 KB. A replacement keeps the width of the file it replaces. Anything over
budget is reported after saving.

## What it will refuse, and why

- **Words that code assembles** (e.g. `kind · year` joined in a template, or a
  title upper-cased on the way out). There is no single string to write back to.
  The inspector says so when you select it.
- **Editing a copy before saving it.** A duplicated list item does not exist in
  the source until it is saved.
- **A save against a file that changed on disk** since the page was loaded (you
  or another tool edited it). Reload the editor and redo the change.
- **A template shared by several pages.** The deck cards share `shell()` and the
  project sheets share `renderSheet()`, so an insert or duplicate there lands
  on all of them. The editor asks before doing that.

## How it works

```
editor/
  vite.editor.config.js   the site's own config + the plugin, port 5275
  server/plugin.js        marks tags with data-esrc, resolves text, uploads,
                          and applies a save as one checked batch
  server/source.js        AST lookups and rewrites (vite's parseAst)
  server/html.js          a tag scanner that keeps source offsets
  server/media.js         ffmpeg-static encoding, same ladders as the bake tools
  shared/editsCss.js      the style model <-> edits.css, used on both sides
  client/                 the shell: frame, canvas overlay, layers, inspector
```

- In edit mode only, every start tag in `index.html` and in the page templates
  carries `data-esrc="file:offset"`: where its `<` sits in the file on disk.
- A text edit is resolved before you type: the server finds the string, through
  the AST, whose normalised value matches what is on screen. Two identical
  strings (the two RCMP rows) are told apart by their order on the page.
- A save becomes range edits against the original files. All are checked
  (overlaps, files changed on disk, JS that no longer parses) before any file is
  written.
- Unsaved page changes can re-apply themselves, because the router throws away
  a page's DOM every time it renders it again. They find their element by
  `data-e`, or by `data-esrc` plus its position on the page, never by a stored
  node.
- The shell page is served raw, with no Vite reload client, so saving source
  files reloads the site in the frame and never the editor holding your undo
  history.
