// identity.js — WHAT THE SITE IS CALLED, AND WHAT A LINK TO IT LOOKS LIKE
//
// The tab's name, the link card a shared URL unfurls into, and the tab mark,
// in one place. The editor's "Link & icon" tab writes every value below (one
// property at a time, so the comments survive), and three things read them:
//
//   vite.config.js (siteIdentity)   writes the <title>, the meta tags and the
//                                   icon links into index.html's head, at dev
//                                   time and at build time
//   site/router.js                  the tab's name on every page after the first
//   tools/bake_favicon.mjs          the tab mark, from ICON's grid
//
// They used to live in three places that had to agree by hand: the head of
// index.html, a DESC table and a "— RYAN HO" suffix in router.js, and the grid
// in tools/mewMark.mjs. Now a change is one edit, and the editor can make it.
//
// ONE PREVIEW FOR THE WHOLE SITE, by instruction (2026-10-04). Discord,
// iMessage, Slack and LinkedIn do not run JavaScript: they read the head of
// whatever HTML the address returns, and Vercel returns the same index.html for
// every route, so every shared link unfurls into this card. (The router still
// changes the description per page for the readers that DO run the page --
// Google -- which is DESC in router.js.)
//
// Plain data, no imports, nothing computed: the editor reads it by importing it
// and writes it through the AST, and node imports it for the bake.

export const SITE = {
  // the address the site is served from, with no slash at the end. It turns
  // the card's picture into an absolute URL, which the Open Graph spec asks
  // for and LinkedIn insists on (the others forgive a relative one). Empty
  // means relative paths, which is what was shipped before the domain existed.
  url: "https://ryanho.vercel.app",
  // the tab on Home
  title: "ryan ho",
  // the tab on every other page; {page} is that page's name ("experience",
  // a project's title, "not printed" for a missing page)
  pageTitle: "ryan ho — {page} ",
  // the small line above the card's title in Discord and Slack (og:site_name),
  // and the name under the icon when the site is added to a phone's home screen
  siteName: "ryan ho",
  // what a search result quotes under the title (<meta name="description">).
  // The card's own description is PREVIEW.description, which can differ.
  description: "Designing encryption architecture for the Government of Canada " +
    "(RCMP). Currently studying at Computer Science and Biology at UBC.",
  author: "ryan ho"
};

// ── THE LINK CARD ────────────────────────────────────────────────────────────
// A shared link is the only part of this site most people will ever see, and
// it is seen at about 500 px wide in somebody else's feed.
export const PREVIEW = {
  title: "ryan ho",
  description: "Designing encryption architecture for the Government of Canada " +
    "(RCMP). Currently studying at Computer Science and Biology at UBC.",
  // the picture, in public/: "/og.png" when it is drawn by the card designer
  // (flat colour compresses to almost nothing as a PNG), "/og.jpg" when it is
  // an uploaded photograph (which would be megabytes as one). Always 1200x630.
  image: "/og.png",
  imageAlt: "Designing encryption architecture for the Government of Canada " +
    "(RCMP). Currently studying at Computer Science and Biology at UBC.",
  // which of the two made it: "design" (CARD below) or "upload"
  mode: "design"
};

// ── THE CARD'S PICTURE, AS A DESIGN ──────────────────────────────────────────
// SET RATHER THAN CAPTURED. A screenshot of the sheet at 500 px is a grey
// rectangle: the halftone dissolves, the display type is unreadable and the
// animal is 40 px of pink. So the card draws the site's thesis instead -- bone
// paper, a rectangle cut out of it, the one unprinted thing standing in the
// hole -- in the order of a print: ground, cut, animal, type. Drawn any other
// way the window paints over her (the first bake did exactly that).
//
// The editor draws this on a canvas with the site's own font files and saves
// the PNG; nothing else renders it, so there is no second drawing to drift.
// (It used to be tools/bake_og.mjs, an ffmpeg filter graph. That needed the
// Plex .ttf files, which left the tree when the fonts went woff2.)
//
// Every length is a pixel of the 1200x630 card. A text's `y` is its BASELINE.
// `font` is one of "grotesque" (Darker Grotesque, 300-900), "plex" (IBM Plex
// Mono, 200 or 600) or "overpass" (Overpass Mono, 300-700). The values below
// are the card that shipped, measured off its PNG: every line's ink lands
// within 2 px of where ffmpeg put it. (The lines are a little wider than they
// were, because FreeType rounded each glyph's advance to a whole pixel and a
// browser does not.)
export const CARD = {
  background: "#FFFFFF",
  // the cut, and the ticks that say a hole is a hole
  window: { show: false, x: 400, y: 84, w: 402, h: 462, fill: "#005A7D", ticks: true, tick: "#3D392F" },
  // her, drawn from ICON's grid: `cell` pixels to a cell, 32 cells a side.
  // 10 is 320 px of animal centred in the window with a cell of air all round.
  // Nearest-neighbour, always: she is pixel art, and smoothing greys her edge.
  mark: { show: true, x: 450, y: 155, cell: 10, color: "#EAC2D8" },
  // EVERY LABEL ON THIS SITE IS TRUE, and that holds here: the last line says
  // this window is a cut with the one unprinted thing standing in it. "AP. 01 —
  // LAST LIGHT" was the first caption, and it is the HOME card's aperture.
  // (Nothing inside these lists: the editor rewrites each one whole.)
  texts: []
  // (an uploaded picture is not described here: when PREVIEW.mode is "upload"
  // the 1200x630 the editor cut from it IS the card, and the original is not
  // kept)
};

// ── THE TAB MARK ─────────────────────────────────────────────────────────────
// Her, in bone, on the one ink no project may own -- the disc idiom and every
// window on the sheet, said in 32 pixels.
//
// The source was src/assets/media/"mew icon.png": a 1024 px white silhouette on
// black, and NOT an integer upscale of anything (the best power-of-two grid
// scores 0.81 on uniformity, which is a resample, not a sprite). So there was
// no lattice to recover, and the 32x32 below IS the decision: her bounding box,
// centred in a square, majority-voted at a 0.30 threshold so the tail's
// one-cell strokes survive instead of dropping out. Text, so it is editable
// with a keyboard as well as in the editor. '#' is her, '.' is sky.
//
// No 16 px cell: at that size her tail is a dashed line, and any retina tab
// strip draws 32 device pixels anyway.
export const ICON = {
  // "grid": tools/bake_favicon.mjs draws the files from the grid below.
  // "upload": the editor cut them from a picture; the bake leaves them alone.
  mode: "grid",
  fg: "#EAC2D8",
  bg: "#303030",
  grid: [
    "................................",
    "......................###.......",
    ".....................####.......",
    "....................####........",
    "...................#####........",
    "...................####.........",
    "..................####..........",
    "........##........##............",
    "......####.......##.............",
    "....######.......#..............",
    "...########......#..............",
    "###########.......##............",
    "############.......#####........",
    ".###########............##......",
    ".############.............##....",
    "..###########...............#...",
    "..##########..........#......#..",
    "...######............##.......#.",
    "......####......##...##.......#.",
    "......#######..###..###........#",
    ".....########..###..###........#",
    "...##########..##..###.........#",
    "...##############..###.........#",
    "......#######.#######.........##",
    ".......######.#######.........#.",
    ".......###.##.#######.........#.",
    "........##########...........#..",
    ".........######.#...........#...",
    "..........###.###..........#....",
    "................##.......##.....",
    "..................#######.......",
    "................................"
  ]
};
