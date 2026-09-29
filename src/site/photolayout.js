// photolayout.js — HOW A FOLDER OF PICTURES BECOMES A PAGE, WORKED OUT FROM THE PICTURES
//
// Pure: pictures in, geometry out, no DOM. It is the pattern of fx/beamGeometry.js
// (and it is checked in node the same way). photos.js draws what this decides.
//
// WHAT WAS WRONG WITH THE HANG. It paired what it could, then hung one alone
// at 62% of the column, left, then right. With twenty mostly-tall pictures that
// left a third of every second row empty and 72 px of paper between rows: the
// "huge gaps" -- and, worse, no shape. The block was ragged on the right and
// the eye had no edge to rest on.
//
// THE TECHNIQUE, after looking at what photo sites do (Flickr's justified
// view, Google Photos, Knuth & Plass's line breaking, which Flickr's is a
// descendant of): treat the pictures as WORDS and the column as a LINE.
//   · Rows are justified. A row of k pictures is scaled until it is exactly the
//     column wide, so every row ends on the same right edge and the whole block
//     is a rectangle -- the shape the gaps were missing. Every picture keeps
//     its own proportions (nothing is cropped) and the gutter is one width,
//     between pictures and between rows.
//   · A row's HEIGHT falls out of what is in it: two tall pictures make a tall
//     row, four make a short one. So the sizes vary by construction, and the
//     variety is not decoration: it is what the pictures' own shapes come to.
//   · Where the breaks go is Knuth-Plass's answer, not a greedy one: a dynamic
//     programme that minimises how far every row lands from the height the
//     RHYTHM asked of it. The rhythm is a seeded run of large and small rows
//     (a spread, a strip, a spread...), so the page has a pace like a photobook
//     rather than a wall of tiles.
//   · "Randomly": the order is a seeded shuffle, and a few dozen shuffles are
//     tried and the one whose rows fit their rhythm best is kept. The seed is
//     the pictures themselves (their names), so the same folder is the same
//     page on every visit, and a picture added or removed re-deals the page
//     instead of being bolted onto the end.
//
// THE LIFE PICTURES are not in the block. They hang in the paper on either
// side of it (fillRolls), small, in two staggered columns, sized so that as
// many as the folder holds fit the height of the block they flank.

import { mulberry32 } from "../utils/math.js";

const aspect = (p) => p.w / p.h;

/** FNV-1a over the names: a seed that is a property of the folder's contents */
export function seedOf(list) {
  let h = 2166136261;
  for (const p of list) for (let i = 0; i < p.id.length; i++) { h ^= p.id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function shuffled(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ── THE BLOCKS ────────────────────────────────────────────────────────────
// The page is a stack of BLOCKS, each an exact rectangle the column wide:
//   a ROW      k pictures side by side, scaled until they are the column wide;
//   a FEATURE  one large picture with a stack of m smaller ones beside it, the
//              stack scaled until it is exactly the feature's height.
// Neither crops: both are closed-form. For a feature (width W, gutter g, feature
// aspect af, stack pictures with aspects b_j, S = sum of 1/b_j):
//     ws = (W - g - af*(m-1)*g) / (af*S + 1)       the stack's width
//     wf = af * (ws*S + (m-1)*g)                   the feature's width
//     h  = wf / af                                 the block's height
// which is the answer to "make the two columns the same height and together
// the column wide", solved once instead of searched for.
//
// The heights it is asked to land on are a short list of sizes, as a share of
// the column: a spread of two (0.68), a strip of four (0.32), and the features,
// which are the tallest thing on the page (0.8 to 1). Landing on one of them,
// rather than anywhere, is what makes the sizes a set of sizes and not noise.
const ROW_H = [0.68, 0.54, 0.42, 0.32];
const FEAT_H = [1.0, 0.82];

/** a block of pictures aspects[from .. from+n): its height, or null if it cannot be made */
function block(aspects, from, kind, side, m, W, gap) {
  if (kind === "row") {
    let sum = 0;
    for (let j = 0; j < m; j++) sum += aspects[from + j];
    return { kind, side: "", n: m, h: (W - gap * (m - 1)) / sum };
  }
  const n = m + 1;
  const fi = side === "l" ? from : from + m;                      // the feature is the first or the last
  const af = aspects[fi];
  let S = 0;
  for (let j = 0; j < n; j++) if (from + j !== fi) S += 1 / aspects[from + j];
  const ws = (W - gap - af * (m - 1) * gap) / (af * S + 1);
  const wf = af * (ws * S + (m - 1) * gap);
  // a stack narrower than a fifth of the column is a sliver, not a companion
  if (!(ws > W * 0.2) || !(wf > W * 0.34)) return null;
  return { kind, side, n, h: wf / af, wf, ws };
}

const nearest = (r, list) => list.reduce((b, t, i) => (Math.abs(Math.log(r / t)) < Math.abs(Math.log(r / list[b])) ? i : b), 0);

/**
 * Break the pictures (in the order given) into blocks. A dynamic programme
 * over "how many are laid out, and what was the last block", so each block's
 * cost can depend on the one before it: a height that repeats its neighbour's
 * costs, a feature on the same side as the last one costs, so the page
 * alternates by itself.
 * @returns { blocks: [{ kind, side, n, h, wf?, ws? }], cost }
 */
export function breakBlocks(aspects, W, gap, { maxK = 4, features = true, jitter = null, lift = null } = {}) {
  const n = aspects.length;
  const states = Array.from({ length: n + 1 }, () => new Map());   // key -> { cost, prev, blk }
  states[0].set("start", { cost: 0, true: 0, prev: null, blk: null, key: "start" });
  for (let i = 0; i < n; i++) {
    for (const [pk, st] of states[i]) {
      const last = st.blk;
      const tryBlock = (kind, side, m) => {
        const need = kind === "row" ? m : m + 1;
        if (i + need > n) return;
        const b = block(aspects, i, kind, side, m, W, gap);
        if (!b) return;
        const ladder = kind === "row" ? ROW_H : FEAT_H;
        const bi = nearest(b.h / W, ladder);
        const d = Math.log(b.h / (W * ladder[bi]));
        let c = st.cost + d * d;
        const tag = `${kind}${side}${bi}`;
        if (last) {
          if (last.tag === tag) c += 0.4;                                  // the same size twice running
          if (kind === "feature" && last.kind === "feature") c += side === last.side ? 1.2 : 0.35;
          if (kind === "row" && last.kind === "row" && bi === last.bi) c += 0.2;
        }
        if (!last && b.h < W * 0.6) c += 0.3;                              // the page opens on something large
        // the seeded mood of this try: where a feature or a strip lands is
        // not decided by the pictures (twenty of one shape have no opinion),
        // so each try leans a different way and mosaic() keeps the best
        if (jitter) c += jitter(i, tag);
        // LIGHT. `lift[i]` is picture i's place among the others by lightness
        // (0 darkest, 1 lightest). What is large should be light -- a night
        // set gave a page that opened on a black rectangle -- and two dark
        // blocks should not touch. Relative, so it works for any set.
        if (lift) {
          let sum = 0;
          for (let j = 0; j < need; j++) sum += lift[i + j];
          const mean = sum / need;
          if (kind === "feature") c += 1.4 * Math.max(0, 0.6 - lift[b.side === "l" ? i : i + m]) ;
          else if (need === 2 && b.h > W * 0.5) c += 0.9 * Math.max(0, 0.45 - mean);      // a spread of two dark ones
          if (last && mean < 0.3 && last.mean < 0.3) c += 0.25;
          b.mean = mean;
        }
        const trueCost = st.true + d * d;
        const key = `${i + need}|${tag}`;
        const at = states[i + need].get(key);
        if (!at || c < at.cost) states[i + need].set(key, { cost: c, true: trueCost, prev: st, blk: { ...b, tag, bi } });
      };
      for (let k = 1; k <= maxK; k++) tryBlock("row", "", k);
      if (features) for (const side of ["l", "r"]) for (const m of [2, 3]) tryBlock("feature", side, m);
    }
  }
  let end = null;
  for (const st of states[n].values()) if (!end || st.cost < end.cost) end = st;
  const blocks = [];
  for (let st = end; st && st.blk; st = st.prev) blocks.unshift(st.blk);
  return { blocks, cost: end ? end.true : Infinity };
}

/**
 * The page for a list of pictures: their order and their blocks.
 * @param opts { W, gap, maxK, tries, features }
 * @returns { blocks: [{ kind, side, h, wf?, ws?, items: [picture] }], cost }
 */
export function mosaic(list, { W = 960, gap = 14, maxK = 4, tries = 120, features = true } = {}) {
  if (!list.length) return { blocks: [], cost: 0 };
  const n = list.length;
  const base = seedOf(list);
  // what a good page of n pictures looks like: about a fifth of the column of
  // height per picture, and one feature to every eight or so
  const wantH = W * Math.max(0.55, n * 0.2), wantF = features ? Math.floor(n / 8) : 0;
  // each picture's place among the others by lightness, 0 to 1 (ties share it)
  const ls = list.map((p) => p.l ?? 0.5).sort((a, b) => a - b);
  const place = (p) => {
    const v = p.l ?? 0.5;
    if (n < 2) return 0.5;
    const lo = ls.indexOf(v), hi = ls.lastIndexOf(v);
    return (lo + hi) / 2 / (n - 1);
  };
  let bestRun = null;
  for (let t = 0; t < tries; t++) {
    const seed = (base + t * 7919) >>> 0;
    const order = shuffled(list, mulberry32(seed));
    const tagHash = (tag) => { let h = 0; for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0; return h; };
    const jitter = (i, tag) => ((Math.imul((i + 1) * 2654435761 ^ tagHash(tag), 1597334677) ^ seed) >>> 0) / 4294967296 * 0.16;
    const run = breakBlocks(order.map(aspect), W, gap, { maxK, features, jitter, lift: order.map(place) });
    if (!run.blocks.length) continue;
    const H = run.blocks.reduce((s, b) => s + b.h + gap, 0);
    const F = run.blocks.filter((b) => b.kind === "feature").length;
    // the fit to the sizes, the length of the page, and the count of features
    const score = run.cost + 0.6 * Math.log(H / wantH) ** 2 + 0.12 * Math.abs(F - wantF);
    if (!bestRun || score < bestRun.score - 1e-9) bestRun = { order, ...run, score };
  }
  let at = 0;
  return {
    cost: bestRun.cost,
    blocks: bestRun.blocks.map((b) => {
      const items = bestRun.order.slice(at, at + b.n);
      at += b.n;
      return { kind: b.kind, side: b.side, h: b.h, wf: b.wf, ws: b.ws, items };
    })
  };
}

/**
 * Blocks grouped into SPREADS -- a few blocks, tall enough to flank with pictures
 * of the other kind. Each is { blocks, h } with h the height they come to.
 */
export function spreads(blocks, gap, target) {
  const out = [];
  let cur = [], h = 0;
  for (const r of blocks) {
    cur.push(r);
    h += r.h + (cur.length > 1 ? gap : 0);
    if (h >= target) { out.push({ blocks: cur, h }); cur = []; h = 0; }
  }
  if (cur.length) {
    // a short tail is not a spread of its own
    if (out.length && h < target * 0.5) { const last = out[out.length - 1]; last.blocks.push(...cur); last.h += h + gap; }
    else out.push({ blocks: cur, h });
  }
  return out;
}

/**
 * The life pictures, dealt into rolls: two per spread (one each side), each
 * two staggered columns. `rolls` is [{ h }] -- the height each has to fill.
 * Pictures go, in order, to whichever column of the roll is shorter, until the
 * roll is full; sizes come from a small seeded set so neighbours differ, and are
 * all scaled by one factor so that EVERYTHING fits: too many pictures for the
 * paper and they get smaller, rather than the page getting longer.
 *
 * @returns [{ cols: [[{ p, w }]], }] -- w in the unit the widths were given in
 */
export function fillRolls(list, rolls, { widths = [96, 122, 108, 88, 130, 104], gap = 18, fill = 0.9, seed = 1, floor = 0.55, ceil = 1.1 } = {}) {
  if (!list.length || !rolls.length) return rolls.map(() => ({ cols: [[], []] }));
  const rand = mulberry32(seed ^ seedOf(list));
  const sized = list.map((p, i) => ({ p, w: widths[Math.floor(rand() * widths.length)], i }));
  // total height of everything at scale 1, as two columns per roll
  const need = sized.reduce((s, x) => s + x.w / aspect(x.p) + gap, 0);
  const have = rolls.reduce((s, r) => s + 2 * r.h * fill, 0);
  const scale = Math.min(ceil, Math.max(floor, Math.sqrt(have / need)));
  const out = rolls.map(() => ({ cols: [[], []], used: [0, 0] }));
  // dealt round the rolls like cards, not poured into the first until it is
  // full: every spread gets its share, so the margins are evenly hung all the
  // way down instead of crowded at the top and bare at the foot
  const room = (k, h) => Math.min(...out[k].used) + h <= rolls[k].h * fill + gap;
  let turn = 0;
  for (const x of sized) {
    const w = Math.round(x.w * scale);
    const h = w / aspect(x.p) + gap;
    let k = turn % out.length;
    for (let tries = 0; tries < out.length && !room(k, h); tries++) k = (k + 1) % out.length;
    turn++;
    const r = out[k];
    const c = r.used[0] <= r.used[1] ? 0 : 1;
    r.cols[c].push({ p: x.p, w });
    r.used[c] += h;
  }
  return out.map((r) => ({ cols: r.cols, used: r.used }));
}
