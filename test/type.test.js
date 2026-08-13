// type.test.js
// headless checks for the ASCII layer's foundations: no rendering, no dom, no
// gl. run with `node test/type.test.js`.
//
// same shape as sim.test.js, and for the same reason -- that work held up
// because every claim about it was a number something asserted. phase 0 owns
// the grid maths, the event bus's new off(), and the disposal registry;
// phases 1+2 add the baked ramp table (tools/glyphatlas.py,
// src/assets/ramp.json) and its matcher (src/type/match.js) -- this file owns
// the acceptance tests for all of it.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { siteConfig } from "../src/config/siteConfig.js";
import {
  cellForWidth, cellForViewport, gridDims, createGrid, minCellWidthFor,
  docToCell, cellToDoc, cellRect, cellIndex, indexToCell,
  snapScroll, dprFor
} from "../src/type/grid.js";
import { createScope } from "../src/utils/lifecycle.js";
import { createWorld } from "../src/engine/world.js";
import { mulberry32 } from "../src/utils/math.js";
import {
  createRouter, normalizePath, matchRoute, shouldIntercept,
  resolveScrollTarget, ROUTES, NOT_FOUND_ROUTE
} from "../src/site/router.js";
import { createMatcher, nearestGlyph, quantizeKey } from "../src/type/match.js";
import * as fieldMath from "../src/type/fieldMath.js";
import { buildRampLut, makeCoverageOf, densityForCoverage } from "../src/type/atlas.js";
import { buildCellData } from "../src/type/field.js";
import {
  minStemCells, countCounters, expectedCounters, buildRing,
  assemblyOrder, leadingEdgeGhosts
} from "../src/type/words.js";
import { createMap, shortestDelta, panDurationMs, cubicBezier } from "../src/site/map.js";
import {
  applyDelta, seedFrame0, frameBlockLength, createPortraitPlayer, createPortraitBuffer
} from "../src/type/portrait.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ramp = JSON.parse(readFileSync(path.join(__dirname, "../src/assets/ramp.json"), "utf8"));
const matchFixture = JSON.parse(readFileSync(path.join(__dirname, "fixtures/matchRef.json"), "utf8"));
const portraitHeader = JSON.parse(readFileSync(path.join(__dirname, "../src/assets/portrait.json"), "utf8"));
const portraitPacked = new Uint8Array(readFileSync(path.join(__dirname, "../src/assets/portrait.bin")));

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    console.error("  FAIL:", msg);
  }
}
function section(name) {
  console.log("\n==", name);
}

// ---------------------------------------------------------------------------
section("config: the bible's numbers survived transcription");
{
  const c = siteConfig;
  ok(c.color.paper === "#F4F2EC", "paper is warm bone, not white");
  ok(c.color.ink === "#12100F", "ink is warm near-black, not #000");
  ok(c.color.fringeA === "#E0447A" && c.color.fringeB === "#2B6FE0",
    "both fringe inks present");
  // the fringe is a HARD BUDGET (bible 3.3). the moment this drifts upward it
  // stops being misregistration and becomes an accent colour, which is fatal
  // to the look.
  ok(c.fringe.maxCellFraction === 0.04, "fringe budget is 4% of the viewport");
  ok(c.fringe.offsetCells === 1, "the fringe is a ONE-cell offset ghost");
  ok(c.budget.chromaticCellFraction === c.fringe.maxCellFraction,
    "the perf budget's chromatic number agrees with the fringe rule");

  ok(c.motion.gather.rate === 9.0, "gatherRate 9.0 /s");
  ok(c.motion.gather.radiusPx === 260, "gatherRadiusPx 260");
  ok(c.motion.scatter.impulsePxPerS === 900, "scatterImpulse 900 px/s");
  ok(c.motion.settle.rate === 1.6, "settleRate 1.6 /s");
  ok(c.motion.drift.hz === 0.15, "driftHz 0.15");
  ok(c.motion.drift.glyphRerollMeanS === 2.5, "glyphRerollMeanS 2.5");
  // SETTLE is overdamped and slow on purpose: a bouncing letter reads as a
  // toy, and the drift home should take about 2 s.
  ok(c.motion.settle.rate < c.motion.gather.rate,
    "settle is slower than gather (dust, not a snap-back)");

  // NATIVE FRAME RATE, not a 30/60 cap. the field is a pure function in the
  // vertex shader now (bible 7.3), so a frame costs ~0.05 ms of cpu -- capping
  // saves a fraction of a percent, and 60-into-120 on a ProMotion panel with a
  // moving character is visible judder. frames come back only from hiding the
  // tab and from a long idle.
  ok(c.budget.targetFps === 0 && c.budget.hiddenFps === 0,
    "renders at the display's native rate, stops when hidden");
  ok(c.budget.longIdleFps === 30 && c.budget.longIdleS >= 20,
    "drops to 30 only after a long idle");
  ok(c.budget.drawCallsPerFrame === 3, "3 draw calls: field, field overstruck, mew");
  ok(c.budget.webglContexts === 1, "one gl context for the session");
  ok(c.budget.atlasPx === 2048, "one 2048^2 atlas");
  ok(c.budget.dprMax === 2 && c.budget.dprMaxDense === 1.5,
    "dpr capped at 2, and 1.5 on a dense grid");
  ok(c.budget.denseCellCount === 60000, "dense grid starts at 60k cells");
  // the ceiling is a sanity check, not a budget: with the analytic field a cell
  // costs 4 vertices and nothing else, and fragment cost is bounded by the
  // screen however many cells there are.
  ok(c.budget.maxCells >= 100000, "the cell ceiling is a sanity check, not a budget");
  ok(c.budget.instanceMarginCells >= 1,
    "instances cover the viewport plus a margin, not the document");
  ok(c.budget.meanCoverage.min === 0.12 && c.budget.meanCoverage.max === 0.22,
    "mean ink coverage 12-22% at rest");
  ok(c.field.coverageMin === c.budget.meanCoverage.min &&
     c.field.coverageMax === c.budget.meanCoverage.max,
    "the field's coverage window and the budget's are the same window");
  ok(c.load.startCoverage < c.field.coverageMin,
    "the page inhales: it starts below the resting coverage");

  ok(c.portrait.fps === 12, "the portrait plays at 12 fps, deliberately");
  ok(c.portrait.maxBytes === 200 * 1024, "portrait budget 200 KB");

  // the portrait is the AIRY register (bible 4.5) -- it must stay lighter than
  // the field it sits in, or it stops being the airiest thing on the page.
  ok(c.portrait.coverageTarget < c.field.coverageMin,
    "the portrait is airier than the field's resting coverage");

  // the portrait's fringe is the SAME rule on a different scale (its own block
  // explains why), so it may tune the thresholds but never the ceiling.
  ok(c.portrait.fringe.maxCellFraction <= c.fringe.maxCellFraction,
    "the portrait's chromatic budget sits inside the bible's 4% ceiling");
  ok(c.portrait.tonalGate.midtoneMin > 0 && c.portrait.tonalGate.heavyMax < 1 &&
     c.portrait.tonalGate.emptyMax < 1,
    "the tonal gate is a real bound in all three directions");
  ok(c.legibility.minStemCells === 2, "minimum stem width 2 cells");

  // ---- the R1 revision's own numbers (bible 3.4a, 3.6, 4.2, 4.4) ----------
  // RULE 3 IS COUNTED IN ROWS. It used to be "44 px", which is the same rule
  // stated in the units of one particular cell size -- and it silently became
  // a different rule the moment the cell went 7x12 -> 4x7.
  ok(c.legibility.minCapRows === 7, "an ascii letterform needs 7 rows of cap");
  ok(c.legibility.minCapHeightPx === undefined,
    "...and the old px floor is gone, not shadowing it");

  // THE SINGLE MOST IMPORTANT NUMBER IN THE R1 PASS (bible 4.4 rule 2). The
  // densest glyph is 0.337 ink and an overstruck cell is ~0.56, so a stem can
  // never be dark in absolute terms -- the word reads by the RATIO between
  // stem and counter, and it is the counter that has to do the work.
  ok(c.legibility.counterInkMax <= 0.06,
    `counters clear to <= 0.06 effective ink (${c.legibility.counterInkMax})`);
  ok(c.legibility.counterRatio >= 6, "...roughly 6:1 against a stem");

  ok(c.type.bodyPx === 16, "VOICE body copy is 16 px (bible 3.6)");
  ok(c.type.linkCapRows === 7, "an ascii nav link is 7 rows of cap");
  ok(c.type.h1CapRows === 9, "an ascii h1 is 9 rows of cap");
  // the arithmetic bible 3.6 states: 9 rows on the 4x7 base is a 63 px cap,
  // 3.9x the body -- and the old build's 166 px against 15 px was ELEVEN
  // times, which is a billboard and not a heading.
  const h1Cap = c.type.h1CapRows * c.grid.baseCellPx.h;
  ok(h1Cap === 63, `h1 cap height is 63 px at the base cell (${h1Cap})`);
  ok(h1Cap / c.type.bodyPx < 4.2 && h1Cap / c.type.bodyPx > 3.5,
    `...i.e. ${(h1Cap / c.type.bodyPx).toFixed(1)}x the body, not 11x`);
  ok(c.type.linkCapRows * c.grid.baseCellPx.h === 49, "a nav link cap is 49 px");
  ok(c.type.h1CapRowsNarrow >= c.legibility.minCapRows,
    "the narrow h1 is still at or above the 7-row floor");

  // OVERSTRIKE (bible 3.4a), which is where every dark on the site now comes
  // from. The offsets are the bible's own.
  ok(c.field.overstrike.offsetCellsX === 0.34, "the second strike is +0.34 cell across");
  ok(c.field.overstrike.offsetCellsY === 0.10, "...and +0.10 cell down");
  ok(c.field.overstrike.weight === 600, "...at weight 600");

  // PRESENCE (bible 4.2)
  ok(c.field.presence.falloffCells === 18, "presence falls off over ~18 cells");
  ok(c.field.presence.floor > 0 && c.field.presence.floor < 0.25,
    "the margins keep a whisper of field, not a hard edge");
  ok(c.field.presence.bareInkMax === 0.04, "near-bare is < 0.04 effective ink");
  ok(c.field.presence.bareFractionMin === 0.35 && c.field.presence.bareFractionMax === 0.55,
    "35-55% of the viewport is near-bare at rest");
}

// ---------------------------------------------------------------------------
section("config: the ramp families are registers, and disjoint");
{
  const r = siteConfig.ramp;
  const fams = { SPARSE: r.SPARSE, MID: r.MID, DENSE: r.DENSE, SOLID: r.SOLID };
  const seen = new Map();
  let dupes = 0;
  for (const [name, chars] of Object.entries(fams)) {
    ok(typeof chars === "string" && chars.length > 0, `${name} is populated`);
    for (const ch of chars) {
      if (seen.has(ch)) { dupes++; console.error(`    ${JSON.stringify(ch)} in ${seen.get(ch)} and ${name}`); }
      seen.set(ch, name);
    }
  }
  ok(dupes === 0, "no glyph belongs to two families");
  ok(r.SPARSE[0] === " ", "bare paper is a member of SPARSE, not an absence");
  // Neither OVERSTRIKE nor INVERT is a glyph set, so neither can be a
  // character list -- one is two glyphs in a cell, the other a glyph on a
  // filled one.
  ok(r.OVERSTRIKE === null, "OVERSTRIKE is a register, not a glyph set");
  ok(r.INVERT === null, "INVERT is a register, not a glyph set");
  ok(r.shapeDims === 6, "6-D shape vectors (bible 3.4)");
  ok(r.cacheBitsPerAxis === 5, "the match cache quantizes at 5 bits/axis");
  for (const ch of r.SOLID) ok("MWB@&QZJ".includes(ch), `${ch} is one of the bible's darks`);
}

// ---------------------------------------------------------------------------
section("grid: cell size is an integer at every breakpoint");
{
  for (const band of siteConfig.grid.breakpoints) {
    const c = cellForWidth(band.minWidth);
    ok(Number.isInteger(c.w) && Number.isInteger(c.h),
      `band >=${band.minWidth}: cell ${c.w}x${c.h} is integer`);
    ok(c.w === band.cell.w && c.h === band.cell.h,
      `band >=${band.minWidth}: lookup returns the table's cell`);
  }
  // and integer at EVERY width, not just at the band edges -- the whole point
  // of quantizing is that nothing in between interpolates.
  let allInt = true, allOnTable = true;
  const tableSizes = new Set(siteConfig.grid.breakpoints.map((b) => `${b.cell.w}x${b.cell.h}`));
  for (let w = 1; w <= 3000; w++) {
    const c = cellForWidth(w);
    if (!Number.isInteger(c.w) || !Number.isInteger(c.h)) allInt = false;
    if (!tableSizes.has(`${c.w}x${c.h}`)) allOnTable = false;
  }
  ok(allInt, "cell size is integer at every width 1..3000");
  ok(allOnTable, "cell size is never a value the table does not contain");

  // the table, spot-checked at the widths that produced it (bible 3.6's
  // re-derivation around the 4x7 base).
  ok(cellForWidth(1600).w === 5 && cellForWidth(1600).h === 9, ">=1600 is 5x9");
  ok(cellForWidth(1440).w === 4 && cellForWidth(1440).h === 7, "the 1440 base cell is 4x7");
  ok(cellForWidth(1100).w === 4, "1100 is still 4 wide");
  ok(cellForWidth(1099).w === 4, "1099 stays 4 wide (the band below shares the size)");
  ok(cellForWidth(700).w === 4 && cellForWidth(699).w === 4, "700 and 699 are both 4 wide");
  ok(cellForWidth(419).w === 3 && cellForWidth(419).h === 5, "<420 is 3x5");

  const base = siteConfig.grid.baseCellPx;
  ok(base.w === 4 && base.h === 7, "the base cell is 4x7 (bible 3.6), not 7x12");
  ok(cellForWidth(1440).w === base.w && cellForWidth(1440).h === base.h,
    "baseCellPx is what the 1440 breakpoint actually resolves to");

  // THE DEVICE-PIXEL FLOOR (bible 3.6). A 4 px cell on a DPR-1 display is 4
  // device pixels and turns to mush, so the lattice steps up the ladder until
  // the cell is at least minDeviceCellW DEVICE pixels wide -- and because the
  // type scale is measured in ROWS of that cell, a non-retina screen gets
  // correspondingly larger type. That is the honest consequence.
  ok(minCellWidthFor(2) === 4, "a retina screen gets the 4 CSS px base cell");
  ok(minCellWidthFor(1) === 8, "a non-retina one needs 8");
  ok(minCellWidthFor(3) === 3, "...and a DPR-3 phone can carry 3");
  const retina = cellForViewport(1512, 982, 2);
  const plain = cellForViewport(1512, 982, 1);
  ok(retina.w === 4 && retina.h === 7, `1512 at dpr 2 is 4x7 (${retina.w}x${retina.h})`);
  ok(plain.w >= 8, `1512 at dpr 1 steps up to at least 8 wide (${plain.w}x${plain.h})`);
  let floorHolds = true;
  for (const dpr of [1, 1.5, 2, 3]) {
    for (let w = 320; w <= 2560; w += 37) {
      const c = cellForViewport(w, 900, dpr);
      if (c.w * dpr < siteConfig.grid.minDeviceCellW - 1e-9) floorHolds = false;
      if (!Number.isInteger(c.w) || !Number.isInteger(c.h)) floorHolds = false;
    }
  }
  ok(floorHolds, "every cell clears the device-pixel floor, and stays integer");

  // the aspect ratio the table is built around. integers near 4/7 cannot hit
  // it exactly, so this is a tolerance, and the tolerance is the point.
  const tol = siteConfig.grid.aspectTolerance;
  let aspectOk = true;
  for (const c of siteConfig.grid.cellLadder) {
    if (Math.abs(c.w / c.h - siteConfig.grid.aspect) > tol) aspectOk = false;
    if (!Number.isInteger(c.w) || !Number.isInteger(c.h)) aspectOk = false;
  }
  ok(aspectOk, `every ladder rung is integer and within ${tol} of aspect 4/7`);
  ok(siteConfig.grid.cellLadder.some((c) => c.w === 4 && c.h === 7) &&
     siteConfig.grid.cellLadder.some((c) => c.w === 5 && c.h === 9) &&
     siteConfig.grid.cellLadder.some((c) => c.w === 7 && c.h === 12),
    "the ladder carries all three sizes bible 3.6's table names");
  let monotone = true;
  for (let i = 1; i < siteConfig.grid.cellLadder.length; i++) {
    const a = siteConfig.grid.cellLadder[i - 1], b = siteConfig.grid.cellLadder[i];
    if (!(b.w > a.w && b.h > a.h)) monotone = false;
  }
  ok(monotone, "the ladder only ever gets coarser");
}

// ---------------------------------------------------------------------------
section("grid: dims match the bible's table, and always cover the viewport");
{
  const over = siteConfig.grid.overscanRows;
  const rowsOf = (g) => g.rows - over;
  // THE FIELD GOT FINER, and that is most of what bible 3.6 is about: every
  // reference in future-refs/ runs 90-200 characters across, and the 7x12
  // build ran 171. These are the dims the new table produces at the width that
  // sets each band, and the column count is the number to look at.
  const a = gridDims(1600, 900);
  ok(a.cols === 320 && rowsOf(a) === 100, `>=1600 -> 320x100 (got ${a.cols}x${rowsOf(a)})`);
  const b = gridDims(1512, 982);
  ok(b.cols === 378 && rowsOf(b) === 141, `1512 (the target machine) -> 378x141 (got ${b.cols}x${rowsOf(b)})`);
  const c = gridDims(700, 660);
  ok(c.cols === 175 && rowsOf(c) === 95, `700-1099 -> 175x95 (got ${c.cols}x${rowsOf(c)})`);
  const d = gridDims(468, 660);
  ok(d.cols === 117 && rowsOf(d) === 95, `420-699 -> 117x95 (got ${d.cols}x${rowsOf(d)})`);
  const e = gridDims(372, 660, 3);
  ok(e.cols === 124 && rowsOf(e) === 132, `<420 at dpr 3 -> 124x132 (got ${e.cols}x${rowsOf(e)})`);
  let inRefRange = true;
  for (let w = 700; w <= 2560; w += 11) {
    const g = gridDims(w, 900);
    if (g.cols < 90 || g.cols > 700) inRefRange = false;
  }
  ok(inRefRange, "every desktop breakpoint runs at least 90 characters across");

  // THE LATTICE MUST REACH THE EDGE. a floored grid leaves a bare strip up to
  // one cell wide down the right and bottom of the page, and bare paper in a
  // straight line along a screen edge reads as a bug, not as weather.
  let covers = true, positive = true;
  for (let w = 320; w <= 2560; w += 7) {
    for (let h = 320; h <= 1600; h += 13) {
      const g = gridDims(w, h);
      if (g.coverPx.w < w || g.coverPx.h < h) covers = false;
      if (g.cols < 1 || g.rows < 1) positive = false;
    }
  }
  ok(covers, "the grid always covers the viewport");
  ok(positive, "cols and rows are always at least 1");

  // the zero-height viewport is reachable, and on the mew side it NaNs the
  // whole scene graph (HANDOFF.md, first pitfall). here it must simply give a
  // valid 1-cell grid rather than a division by zero.
  const z = gridDims(0, 0);
  ok(z.cols >= 1 && z.rows >= 1 && Number.isFinite(z.cells),
    "a zero viewport still yields a finite grid");
}

// ---------------------------------------------------------------------------
section("grid: the 24 000-cell budget holds up to a 2560 px viewport");
{
  const max = siteConfig.budget.maxCells;
  let worst = 0, worstAt = "";
  let overBudget = 0;
  for (let w = 320; w <= 2560; w += 4) {
    for (let h = 320; h <= 1600; h += 8) {
      const g = gridDims(w, h);
      if (g.cells > max) { overBudget++; }
      if (g.cells > worst) { worst = g.cells; worstAt = `${w}x${h} @ ${g.cell.w}x${g.cell.h}`; }
    }
  }
  ok(overBudget === 0, `no viewport up to 2560 exceeds ${max} cells (${overBudget} did)`);
  console.log(`   worst grid: ${worst} cells at ${worstAt}`);

  // tall and square displays too -- a rotated monitor is a real thing and the
  // ladder has to keep stepping.
  for (const [w, h] of [[2560, 1440], [2560, 1600], [2560, 2560], [1440, 2560], [1920, 1080]]) {
    const g = gridDims(w, h);
    ok(g.cells <= max, `${w}x${h}: ${g.cells} cells at ${g.cell.w}x${g.cell.h} <= ${max}`);
    ok(Number.isInteger(g.cell.w) && Number.isInteger(g.cell.h),
      `${w}x${h}: the stepped-up cell is still integer`);
  }

  // a big display gets a COARSER lattice, never a finer one than the table
  // asked for.
  const table = cellForWidth(2560);
  const used = cellForViewport(2560, 1440);
  ok(used.w >= table.w && used.h >= table.h,
    `2560 wide steps up, never down (${table.w}x${table.h} -> ${used.w}x${used.h})`);

  // ...and dpr steps down over 60k, per bible 7.3
  ok(dprFor(10000, 3) === 2, "dpr caps at 2 on a normal grid");
  ok(dprFor(61000, 3) === 1.5, "dpr caps at 1.5 once the grid passes 60k");
  ok(dprFor(21000, 1) === 1, "a dpr-1 device is never scaled UP");
}

// ---------------------------------------------------------------------------
section("grid: doc <-> cell round-trips");
{
  const rnd = mulberry32(0xA5C11);
  let worstDx = 0, worstDy = 0;
  let exact = true;
  for (const cell of siteConfig.grid.cellLadder) {
    for (let i = 0; i < 4000; i++) {
      const x = (rnd() - 0.2) * 20000;   // negatives included on purpose
      const y = (rnd() - 0.2) * 40000;   // documents get tall
      const c = docToCell(x, y, cell);
      ok0(Number.isInteger(c.cx) && Number.isInteger(c.cy));
      const p = cellToDoc(c.cx, c.cy, cell);
      worstDx = Math.max(worstDx, Math.abs(p.x - x) / cell.w);
      worstDy = Math.max(worstDy, Math.abs(p.y - y) / cell.h);
      // the other direction is EXACT: a cell index survives the trip intact,
      // which is what lets a cell keep its identity across a route swap.
      const back = docToCell(p.x, p.y, cell);
      if (back.cx !== c.cx || back.cy !== c.cy) exact = false;
    }
  }
  ok(worstDx < 1 && worstDy < 1,
    `cellToDoc(docToCell(p)) lands within one cell (worst ${worstDx.toFixed(3)}, ${worstDy.toFixed(3)})`);
  ok(worstDx <= 0.5 && worstDy <= 0.5,
    "...within HALF a cell, in fact, because cellToDoc returns the centre");
  ok(exact, "docToCell(cellToDoc(c)) === c for every cell tried");

  const cell = { w: 7, h: 12 };
  const r = cellRect(3, 4, cell);
  ok(r.x === 21 && r.y === 48 && r.w === 7 && r.h === 12, "cellRect is the cell's own box");
  const ctr = cellToDoc(3, 4, cell);
  ok(ctr.x > r.x && ctr.x < r.x + r.w && ctr.y > r.y && ctr.y < r.y + r.h,
    "the mapped point is inside its own cell's rect");
  ok(docToCell(0, 0, cell).cx === 0 && docToCell(-1, -1, cell).cx === -1,
    "the origin is the document origin, and negatives floor correctly");

  // flat index round trip, which is the instanced buffer's addressing
  let idxOk = true;
  for (let cy = 0; cy < 40; cy++) {
    for (let cx = 0; cx < 60; cx++) {
      const back = indexToCell(cellIndex(cx, cy, 60), 60);
      if (back.cx !== cx || back.cy !== cy) idxOk = false;
    }
  }
  ok(idxOk, "cell <-> flat instance index round-trips");

  // scroll is quantized to WHOLE cells for the field layer (bible 3.1)
  let snapOk = true;
  for (let y = 0; y < 5000; y += 3) {
    const s = snapScroll(y, cell);
    if (s % cell.h !== 0) snapOk = false;
    if (Math.abs(s - y) > cell.h / 2 + 1e-9) snapOk = false;
  }
  ok(snapOk, "snapScroll lands on whole cells, within half a cell of the truth");

  const g = createGrid(1440, 900, 2);
  const gc = g.docToCell(613, 421);
  const rt = g.cellToDoc(gc.cx, gc.cy);
  ok(Math.abs(rt.x - 613) <= g.cell.w && Math.abs(rt.y - 421) <= g.cell.h,
    "the bound grid round-trips the same way the free functions do");
  ok(g.inBounds(0, 0) && !g.inBounds(-1, 0) && !g.inBounds(g.cols, 0),
    "inBounds fences the lattice");
  ok(Object.isFrozen(g), "a grid is immutable: rebuild on resize, never mutate");
}

// ---------------------------------------------------------------------------
section("bus: off(), once(), and no growth across 1000 cycles");
{
  const world = createWorld({ headless: true });

  let hits = 0;
  const fn = () => { hits++; };
  const un = world.on("beamFire", fn);
  ok(typeof un === "function", "on() returns an unsubscribe");
  world.emit("beamFire", {});
  ok(hits === 1, "a live listener fires");

  world.off("beamFire", fn);
  world.emit("beamFire", {});
  ok(hits === 1, "a REMOVED listener does not fire");

  // ...and the unsubscribe handle does the same job
  let hits2 = 0;
  const un2 = world.on("bump", () => { hits2++; });
  world.emit("bump", {});
  un2();
  world.emit("bump", {});
  ok(hits2 === 1, "the returned unsubscribe removes the listener");

  // off() with something that was never on must be a no-op, not a throw:
  // teardown races call it twice.
  let threw = false;
  try { world.off("bump", fn); world.off("nosuchevent", fn); un2(); }
  catch (e) { threw = true; }
  ok(!threw, "off() is safe to call twice and on an unknown type");

  let onceHits = 0;
  world.once("pet", () => { onceHits++; });
  world.emit("pet", {});
  world.emit("pet", {});
  world.emit("pet", {});
  ok(onceHits === 1, "once() fires exactly once");
  ok(!world._listeners.has("pet"), "once() cleans its own key out of the map");

  // a handler that unsubscribes DURING an emit must not corrupt the walk
  let aHits = 0, bHits = 0;
  const offA = world.on("resize", () => { aHits++; offA(); });
  world.on("resize", () => { bHits++; });
  world.emit("resize", {});
  ok(aHits === 1 && bHits === 1, "unsubscribing mid-emit still runs the rest");
  world.emit("resize", {});
  ok(aHits === 1 && bHits === 2, "...and the unsubscribe took effect");

  // THE LEAK TEST. this is leak class 5 in the plan: on() used to be add-only,
  // so in an SPA every route swap piled up listeners holding closures over
  // dead dom. the map size AND the per-type array must both come back.
  const world2 = createWorld({ headless: true });
  const baseKeys = world2._listeners.size;
  for (let i = 0; i < 1000; i++) {
    const off1 = world2.on("beamFire", () => {});
    const off2 = world2.on(`route:${i}`, () => {});   // a fresh type each cycle
    off1();
    off2();
  }
  ok(world2._listeners.size === baseKeys,
    `listener map does not grow across 1000 subscribe/unsubscribe cycles (${world2._listeners.size} keys, was ${baseKeys})`);
  let totalFns = 0;
  for (const arr of world2._listeners.values()) totalFns += arr.length;
  ok(totalFns === 0, `no listener functions retained (${totalFns})`);

  // the existing call sites ignore the return value; make sure that still works
  const world3 = createWorld({ headless: true });
  let plain = 0;
  world3.on("bump", () => { plain++; });
  world3.emit("bump", {});
  ok(plain === 1, "the old on()/emit() contract is unchanged");
}

// ---------------------------------------------------------------------------
section("lifecycle: a disposed scope has nothing pending");
{
  const scope = createScope("test");

  let timerFired = 0, intervalFired = 0, rafFired = 0;
  scope.addTimer(() => { timerFired++; }, 5);
  scope.addTimer(() => { timerFired++; }, 5);
  scope.addInterval(() => { intervalFired++; }, 5);
  scope.addRaf(() => { rafFired++; });

  ok(scope.pending.timers === 3, `3 timers pending (${scope.pending.timers})`);
  ok(scope.pending.rafs === 1, `1 raf pending (${scope.pending.rafs})`);
  ok(scope.disposed === false, "a live scope is not disposed");

  // disposables: functions, and objects carrying dispose/disconnect/close.
  const order = [];
  scope.add(() => order.push("first"));
  scope.add({ dispose: () => order.push("second") });
  scope.add({ disconnect: () => order.push("third") });   // an observer
  let gpuDisposed = false;
  scope.add({ dispose: () => { gpuDisposed = true; } });  // a geometry/material
  ok(scope.pending.disposables === 4, "4 disposables registered");

  // and the listener path, which is the whole reason for the AbortController
  const target = new EventTarget();
  let evHits = 0;
  scope.listen(target, "ping", () => { evHits++; });
  target.dispatchEvent(new Event("ping"));
  ok(evHits === 1, "a scoped listener fires while the scope is live");

  scope.dispose();

  ok(scope.pending.timers === 0, `zero pending timers after dispose (${scope.pending.timers})`);
  ok(scope.pending.rafs === 0, `zero pending rAFs after dispose (${scope.pending.rafs})`);
  ok(scope.pending.disposables === 0, "zero disposables retained after dispose");
  ok(scope.disposed === true, "the scope knows it is disposed");
  ok(gpuDisposed, "a gpu object's dispose() ran");
  // reverse registration order, the way a stack unwinds: later things tend to
  // depend on earlier ones.
  ok(order.join(",") === "third,second,first", `teardown runs in reverse (${order.join(",")})`);
  ok(scope.signal.aborted, "the scope's signal is aborted");

  target.dispatchEvent(new Event("ping"));
  ok(evHits === 1, "a scoped listener stops firing after dispose");

  // IDEMPOTENT: route teardown races and double-unmounts are normal, and a
  // dispose that throws the second time turns a harmless race into a broken
  // navigation.
  let threw = false;
  try { scope.dispose(); scope.dispose(); } catch (e) { threw = true; }
  ok(!threw, "dispose() is idempotent");
  ok(order.length === 3, "...and does not re-run teardown");

  // registering into a dead scope is always a bug -- it would never be cleaned
  // up, because the cleanup already ran. loud, not silent.
  let late = false;
  try { scope.addTimer(() => {}, 1); } catch (e) { late = true; }
  ok(late, "registering on a disposed scope throws");

  // a broken disposable must not strand the ones registered after it
  const s2 = createScope("throwy");
  let after = false;
  s2.add(() => { after = true; });
  s2.add(() => { throw new Error("boom"); });
  // the scope logs the throw, which is right in production and noise here --
  // an expected stack trace in a passing test run is how real failures get
  // scrolled past.
  const realError = console.error;
  console.error = () => {};
  s2.dispose();
  console.error = realError;
  ok(after, "one broken teardown does not strand the rest");

  // child scopes go with the parent
  const parent = createScope("parent");
  const kid = parent.child();
  let kidTorn = false;
  kid.add(() => { kidTorn = true; });
  parent.dispose();
  ok(kidTorn && kid.disposed, "a child scope is disposed with its parent");

  // nothing fires after the fact. the timers above were armed at 5 ms, so a
  // 40 ms wait is decisive.
  await new Promise((r) => setTimeout(r, 40));
  ok(timerFired === 0, `no timer fired after dispose (${timerFired})`);
  ok(intervalFired === 0, `no interval fired after dispose (${intervalFired})`);
  ok(rafFired === 0, `no raf fired after dispose (${rafFired})`);
}

// ---------------------------------------------------------------------------
section("ramp: the baked table shape");
{
  ok(Array.isArray(ramp.glyphs) && ramp.glyphs.length > 0, "ramp.json loaded with glyphs");
  ok(ramp.cell.length === 2 && ramp.atlas.length === 2, "cell and atlas are [w,h] pairs");
  for (const g of ramp.glyphs) {
    if (g.v6.length !== siteConfig.ramp.shapeDims) {
      ok(false, `${JSON.stringify(g.ch)}@${g.w} has a ${g.v6.length}-D v6, want ${siteConfig.ramp.shapeDims}`);
      break;
    }
  }
  ok(true, "every glyph's v6 has siteConfig.ramp.shapeDims components");
}

// ---------------------------------------------------------------------------
section("match: nearestGlyph finds a glyph's own vector exactly");
{
  // a glyph's own v6, fed straight back in, must return itself at distance 0
  // -- the simplest possible correctness check on the distance function
  // before trusting it on anything derived (the cache, the fixture).
  const sample = ramp.glyphs[Math.floor(ramp.glyphs.length / 2)];
  const r = nearestGlyph(sample.v6, ramp.glyphs);
  ok(r.ch === sample.ch && r.w === sample.w, "a glyph's own vector matches itself");
  ok(r.dist < 1e-9, `distance to self is ~0 (${r.dist})`);

  // ties: two identical vectors at different indices must resolve to the
  // FIRST one in array order, not whichever the engine happens to visit last
  // -- this is the exact rule tools/gen_match_fixture.py's python reference
  // uses, and the cross-check below depends on both sides agreeing on it.
  const twins = [{ ch: "A", w: 1, v6: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] },
                 { ch: "B", w: 2, v6: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] }];
  const rt = nearestGlyph(twins[0].v6, twins);
  ok(rt.ch === "A", "exact ties resolve to the first array entry");
}

// ---------------------------------------------------------------------------
section("match: quantizeKey is deterministic and packs 5 bits/axis");
{
  const v = [0.1, 0.9, 0.5, 0.0, 1.0, 0.33];
  ok(quantizeKey(v) === quantizeKey(v), "the same vector always packs to the same key");
  ok(Number.isInteger(quantizeKey(v)), "the key is a plain integer, not a float or BigInt");
  const bits = siteConfig.ramp.cacheBitsPerAxis;
  ok(quantizeKey([1, 1, 1, 1, 1, 1], bits) === (1 << (bits * siteConfig.ramp.shapeDims)) - 1,
    "all-ones vector packs to all-ones bits (5 bits/axis, 6 axes)");
  ok(quantizeKey([0, 0, 0, 0, 0, 0], bits) === 0, "all-zero vector packs to key 0");
  // out-of-range components (a test vector can wander past [0,1]; a real one
  // never should, since v6 is normalised so its max is 1 -- but the cache
  // must not corrupt a key over it) clamp rather than wrap
  const clamped = quantizeKey([1.4, -0.2, 0.5, 0.5, 0.5, 0.5]);
  const atEdges = quantizeKey([1, 0, 0.5, 0.5, 0.5, 0.5]);
  ok(clamped === atEdges, "out-of-[0,1] components clamp instead of wrapping");
}

// ---------------------------------------------------------------------------
section("match: numeric mirror -- js and the python reference agree");
{
  // regenerate the SAME 500 vectors the fixture was built from, using the
  // real mulberry32 (not a copy) at the fixture's own seed. this is the
  // sanity check that makes trusting the fixture's precomputed ranks valid:
  // if this ever fails, the fixture is stale, not the matcher.
  const rnd = mulberry32(matchFixture.seed);
  let vectorsMatch = true;
  const regenerated = [];
  for (const c of matchFixture.cases) {
    const v = Array.from({ length: matchFixture.dims }, () => rnd());
    regenerated.push(v);
    for (let i = 0; i < matchFixture.dims; i++) {
      if (Math.abs(v[i] - c.vector[i]) > 1e-12) vectorsMatch = false;
    }
  }
  ok(vectorsMatch,
    "sanity: mulberry32(fixture.seed) regenerates exactly the fixture's vectors");

  const matcher = createMatcher(ramp);
  let exact = 0, rank1 = 0, worse = 0;
  const worseExamples = [];
  matchFixture.cases.forEach((c, i) => {
    const picked = matcher.match(regenerated[i]);
    const rank = c.rank.findIndex((entry) => entry.idx === picked.idx);
    if (rank === 0) exact++;
    else if (rank === 1) rank1++;
    else { worse++; if (worseExamples.length < 5) worseExamples.push({ i, picked, rank }); }
  });
  const n = matchFixture.cases.length;
  const exactRate = exact / n;
  console.log(`   exact ${exact}/${n} (${(exactRate * 100).toFixed(1)}%), ` +
    `rank1 ${rank1}, worse-or-unranked ${worse}`);
  ok(exactRate >= 0.99, `js matches the python reference's top pick >=99% of the time (${(exactRate * 100).toFixed(1)}%)`);
  ok(worse === 0,
    `js never differs from the python reference by more than one rank (${worse} did)` +
    (worseExamples.length ? `  e.g. ${JSON.stringify(worseExamples[0])}` : ""));
}

// ---------------------------------------------------------------------------
section("match: quantized cache hit rate on a real gradient");
{
  // a plausible field gradient: a slowly-varying coverage target with the
  // other five dims trailing it proportionally, the shape a GATHER'd word or
  // a drifting cell's re-roll would actually feed the matcher (bible 4.2/5) --
  // smooth and revisiting the same neighbourhood over and over, which is
  // exactly what the quantized cache exists to exploit.
  const matcher = createMatcher(ramp);
  const STEPS = 240;
  for (let rep = 0; rep < 6; rep++) {
    for (let i = 0; i < STEPS; i++) {
      const t = i / (STEPS - 1);
      matcher.match([t, t * 0.82, t * 0.55, t * 0.31, t * 0.63, t * 0.9]);
    }
  }
  const stats = matcher.cacheStats();
  console.log(`   gradient cacheStats: ${JSON.stringify(stats)}`);
  ok(stats.hitRate > 0.90, `cache hit rate on a real gradient is >90% (${(stats.hitRate * 100).toFixed(1)}%)`);
}

// ---------------------------------------------------------------------------
section("match: a warm lookup is fast");
{
  const matcher = createMatcher(ramp);
  const probe = [0.31, 0.44, 0.12, 0.58, 0.23, 0.49];
  matcher.match(probe);   // warm the cache
  const N = 200000;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) matcher.match(probe);
  const t1 = process.hrtime.bigint();
  const nsPerCall = Number(t1 - t0) / N;
  console.log(`   warm lookup: ${nsPerCall.toFixed(1)} ns/call (${(nsPerCall / 1000).toFixed(4)} us/call)`);
  ok(nsPerCall < 500, `a warm lookup is under 0.5us (${(nsPerCall / 1000).toFixed(4)} us)`);
  ok(matcher.cacheStats().misses === 1, "the warm-up loop only missed once");
}

// ---------------------------------------------------------------------------
section("router: pure route matching, scroll targets and click interception");
{
  ok(normalizePath("") === "/", 'normalizePath("") is the root');
  ok(normalizePath("/") === "/", "the root normalizes to itself");
  ok(normalizePath("/projects/") === "/projects", "a trailing slash is stripped");
  ok(normalizePath("/projects") === "/projects", "no trailing slash is unchanged");
  ok(normalizePath("/case-studies//") === "/case-studies/",
    "only ONE trailing slash is stripped -- normalizePath is not a general sanitizer");

  ok(ROUTES.length === 4, "four real routes, per plan phase 6");
  const ids = new Set(ROUTES.map((r) => r.id));
  ok(ids.size === 4, "route ids are unique");
  for (const wanted of ["who-am-i", "projects", "case-studies", "my-journey"]) {
    ok(ids.has(wanted), `route table has ${wanted}`);
  }
  ok(!ids.has(NOT_FOUND_ROUTE.id), "the 404 is not one of the linkable routes");

  for (const r of ROUTES) {
    ok(matchRoute(r.path, ROUTES) === r, `matchRoute resolves ${r.path} back to ${r.id}`);
    ok(matchRoute(r.path + "/", ROUTES) === r, `...and tolerates a trailing slash on ${r.path}`);
  }
  ok(matchRoute("/nowhere", ROUTES) === null, "an unknown path matches nothing (caller falls back to 404)");
  ok(matchRoute("/projects/nested", ROUTES) === null, "matchRoute is exact, not a prefix match");

  // resolveScrollTarget's priority: a popped nav with a known position wins,
  // then a same-page hash, then the top. this is the whole scroll-restoration
  // policy, and it is a pure function specifically so this table IS the spec.
  const ORIGIN = "https://example.test";
  const y1 = resolveScrollTarget({ popped: true, savedY: 480, hash: "#x", hasHashElement: true });
  ok(y1.type === "y" && y1.y === 480, "a popped nav with a saved position restores it, even over a hash");
  const y2 = resolveScrollTarget({ popped: false, savedY: 480, hash: "#x", hasHashElement: true });
  ok(y2.type === "hash" && y2.hash === "#x", "a forward nav with a hash target scrolls to the hash");
  const y3 = resolveScrollTarget({ popped: false, savedY: undefined, hash: "#missing", hasHashElement: false });
  ok(y3.type === "y" && y3.y === 0, "a hash with no matching element falls back to the top");
  const y4 = resolveScrollTarget({ popped: true, savedY: undefined, hash: "#x", hasHashElement: true });
  ok(y4.type === "hash", "a popped nav with NO saved position falls through to the hash");
  const y5 = resolveScrollTarget({ popped: false, savedY: undefined, hash: "", hasHashElement: false });
  ok(y5.type === "y" && y5.y === 0, "a plain forward nav with nothing special goes to the top");

  // shouldIntercept: the whole "does the router own this click" decision
  const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    target: "", download: false, rel: null, href: "/projects", currentOrigin: ORIGIN };
  ok(shouldIntercept(base) === true, "a plain left click on an internal link is intercepted");
  ok(shouldIntercept({ ...base, button: 1 }) === false, "a middle click is not (opens in a new tab)");
  ok(shouldIntercept({ ...base, ctrlKey: true }) === false, "ctrl-click is not (new tab/window)");
  ok(shouldIntercept({ ...base, metaKey: true }) === false, "cmd-click is not");
  ok(shouldIntercept({ ...base, shiftKey: true }) === false, "shift-click is not");
  ok(shouldIntercept({ ...base, target: "_blank" }) === false, "target=_blank is not");
  ok(shouldIntercept({ ...base, target: "_self" }) === true, "target=_self is still intercepted");
  ok(shouldIntercept({ ...base, download: true }) === false, "a download link is not");
  ok(shouldIntercept({ ...base, rel: "external" }) === false, "rel=external is an explicit escape hatch");
  ok(shouldIntercept({ ...base, href: "https://other.test/x" }) === false, "a cross-origin href is not");
  ok(shouldIntercept({ ...base, href: "not a url", currentOrigin: "also not a url" }) === false,
    "a malformed href fails closed, not throws");
}

// ---------------------------------------------------------------------------
section("router: navigate() lifecycle is headless-testable via DI (real dynamic imports, fake DOM)");
{
  // outlet and render are injected specifically so this can run with no
  // window/document at all: router.js guards every window/document/history
  // touch behind hasDom(), which is false under plain node, exactly the way
  // world.js skips attachBrowser() under { headless: true }.
  function fakeOutlet() {
    return { last: null, calls: 0, replaceChildren(node) { this.last = node; this.calls++; } };
  }

  const world = createWorld({ headless: true });
  const outlet = fakeOutlet();
  let renderCalls = 0;
  const router = createRouter({
    world, outlet,
    render: (content, route) => { renderCalls++; return { routeId: route.id, title: content && content.title }; }
  });

  let routeEvents = [];
  world.on("route", (e) => routeEvents.push(e));

  await router.navigate("/");
  ok(router.currentRoute && router.currentRoute.id === "who-am-i", "navigate('/') resolves the home route");
  ok(outlet.calls === 1 && renderCalls === 1, "the outlet was swapped exactly once");
  ok(routeEvents.length === 1 && routeEvents[0].id === "who-am-i" && routeEvents[0].notFound === false,
    'a "route" event fired with the resolved id and notFound: false');
  ok(typeof routeEvents[0].scope.dispose === "function",
    'the "route" payload carries a live lifecycle scope for subscribers to register into');

  // re-navigating to the SAME path is a no-op: no re-render, no second event.
  await router.navigate("/");
  ok(outlet.calls === 1 && renderCalls === 1 && routeEvents.length === 1,
    "re-navigating to the current path does not re-render or re-emit");

  await router.navigate("/projects");
  ok(router.currentRoute.id === "projects" && outlet.calls === 2 && routeEvents.length === 2,
    "navigating to a different route renders and emits again");

  // real content, loaded through a real dynamic import() -- no DOM needed,
  // since src/site/content/*.js are plain data modules.
  ok(outlet.last.title === "Projects", "the real projects.js content module was actually loaded");

  await router.navigate("/this-path-does-not-exist");
  ok(router.currentRoute.id === "not-found", "an unknown path resolves to the 404 route");
  ok(routeEvents[routeEvents.length - 1].notFound === true, '...and its "route" event says notFound: true');
  ok(outlet.last.title === "Not Found", "...rendering the 404 content, not a thrown error");

  // -- prefetch cache: dedup by id, one load per id no matter how many times
  // it's requested (idle sweep once, then N hovers) ------------------------
  let loadCalls = 0;
  const stubRoute = { id: "stub", path: "/stub", navLabel: "stub",
    load: () => { loadCalls++; return Promise.resolve({ default: { title: "Stub" } }); } };
  const world2 = createWorld({ headless: true });
  const router2 = createRouter({ world: world2, outlet: fakeOutlet(), routes: [stubRoute],
    render: (c) => c });
  const p1 = router2.prefetch("stub");
  const p2 = router2.prefetch("stub");
  ok(p1 === p2, "two prefetch() calls for the same id return the SAME promise");
  await p1;
  ok(loadCalls === 1, "...and the underlying loader ran exactly once");
  await router2.navigate("/stub");
  ok(loadCalls === 1, "navigating to an already-prefetched route reuses the cache, no second load");

  // a failed load must not poison the cache forever -- a retry (the next
  // hover, or the next navigate) gets a fresh attempt.
  let attempts = 0;
  const flakyRoute = { id: "flaky", path: "/flaky", navLabel: "flaky",
    load: () => { attempts++; return attempts === 1 ? Promise.reject(new Error("network"))
                                                      : Promise.resolve({ default: { title: "Flaky" } }); } };
  const router3 = createRouter({ world: createWorld({ headless: true }), outlet: fakeOutlet(),
    routes: [flakyRoute], render: (c) => c });
  let firstFailed = false;
  try { await router3.prefetch("flaky"); } catch { firstFailed = true; }
  ok(firstFailed, "a rejected loader rejects prefetch()");
  await router3.prefetch("flaky");
  ok(attempts === 2, "a later prefetch() retries instead of replaying the cached rejection");

  router.dispose();
  router2.dispose();
  router3.dispose();
}

// ---------------------------------------------------------------------------
section("router: leak class 5 (world listeners) does not grow across 50 route swaps");
{
  // simulates the type layer's own future contract (router.js's header
  // comment): a "route" subscriber registers its OWN world.on() into the
  // scope the route event carries, so it dies on the SAME beat as the route
  // that created it -- never later, never never.
  const world = createWorld({ headless: true });
  const trueBaseKeys = world._listeners.size;   // nothing subscribed at all
  const outlet = { replaceChildren() {} };
  const router = createRouter({ world, outlet, render: (c) => c });

  // this subscription is the permanent, SESSION-scoped one -- the stand-in
  // for the type layer itself, which lives for as long as the app does. it
  // is deliberately outside what the per-swap assertion below measures: the
  // leak this test hunts is a subscription that OUTLIVES its own route, not
  // the one subsystem that is allowed to outlive all of them.
  const offRoute = world.on("route", ({ scope, id }) => {
    const off = world.on(`demo:${id}`, () => {});
    scope.add(off);
  });
  const baseKeys = world._listeners.size;   // captured WITH that one subscription live

  const cycle = ["/", "/projects", "/case-studies", "/my-journey"];
  let maxExtraKeys = 0;
  for (let i = 0; i < 50; i++) {
    await router.navigate(cycle[i % cycle.length]);
    // AT MOST one extra key: whatever the CURRENTLY active route subscribed,
    // because its predecessor's scope was disposed before this event fired.
    // if this ever exceeds 1 the map is accumulating one entry per swap,
    // which is exactly the leak class 5 describes.
    maxExtraKeys = Math.max(maxExtraKeys, world._listeners.size - baseKeys);
  }
  ok(maxExtraKeys <= 1,
    `world's listener map never carries more than the active route's own subscription across 50 swaps (worst +${maxExtraKeys})`);

  router.dispose();
  ok(world._listeners.size === baseKeys,
    `router.dispose() tears down the LAST route's subscription too, leaving only ` +
    `the permanent one (${world._listeners.size} keys, expected ${baseKeys})`);

  offRoute();
  ok(world._listeners.size === trueBaseKeys,
    `...and once the permanent subscriber itself unsubscribes, the map is back to ` +
    `nothing at all (${world._listeners.size}, was ${trueBaseKeys})`);
}

// ---------------------------------------------------------------------------
section("fieldMath: every verb is a pure function of ABSOLUTE time");
{
  // THIS REPLACES THE OLD FRAME-RATE-INDEPENDENCE TEST AND IS STRICTLY
  // STRONGER. That test asserted 60 steps of 1/60 equal one step of 1 -- which
  // is the best you can do for an INTEGRATOR. The field has no integrator: bible
  // 7.3 makes every verb a pure function of (cell identity, absolute time, a few
  // globals), so evaluating at t is identical HOWEVER YOU GOT TO t. There is no
  // path-dependence left to be independent of, and no way for a frame-rate bug
  // to exist at all.
  const seed = fieldMath.cellSeed(37, 91);
  const T = 4.25;
  const cell = { w: 7, h: 12 };

  const driftAt = (t) => fieldMath.drift(seed, t, 37, 91, cell.w, cell.h);
  const direct = driftAt(T);

  // walked there in 255 unequal steps, jumped straight there, and walked
  // BACKWARDS past it -- all three must agree exactly, not approximately.
  let walked = null;
  let acc = 0;
  for (let i = 0; i < 255; i++) { acc += T / 255; walked = driftAt(acc); }
  const backwards = (() => { for (let t = 10; t > T; t -= 0.37) driftAt(t); return driftAt(T); })();
  ok(Math.abs(walked[0] - direct[0]) < 1e-9 && Math.abs(walked[1] - direct[1]) < 1e-9,
    `DRIFT at t is the same whether stepped or jumped (${walked[0]} vs ${direct[0]})`);
  ok(backwards[0] === direct[0] && backwards[1] === direct[1],
    "DRIFT is identical after evaluating later times first (no hidden state)");

  // the same for the re-roll timer, the weight jitter and the clearing
  ok(fieldMath.rerollSlot(seed, T) === fieldMath.rerollSlot(seed, T),
    "the glyph re-roll slot is a pure function of (seed, t)");
  ok(fieldMath.variantAt(seed, T, 4) === fieldMath.variantAt(seed, T, 4),
    "the glyph variant is a pure function of (seed, t)");
  ok(fieldMath.weightRow(seed) === fieldMath.weightRow(seed),
    "the weight jitter is frozen per cell (bible 3.5)");

  // ...and DRIFT is bounded by the authored wander. A cell that can leave its
  // own neighbourhood is a cell that has stopped being part of a lattice.
  let worstX = 0;
  let worstY = 0;
  for (let i = 0; i < 400; i++) {
    const s = fieldMath.cellSeed(i, i * 7 + 3);
    for (let t = 0; t < 40; t += 0.37) {
      const d = fieldMath.drift(s, t, i, i * 7 + 3, cell.w, cell.h);
      worstX = Math.max(worstX, Math.abs(d[0]) / cell.w);
      worstY = Math.max(worstY, Math.abs(d[1]) / cell.h);
    }
  }
  const wander = siteConfig.motion.drift.wanderCells;
  ok(worstX <= wander + 1e-9 && worstY <= wander + 1e-9,
    `DRIFT never exceeds wanderCells (${worstX.toFixed(3)}, ${worstY.toFixed(3)} vs ${wander})`);

  // THE DRIFT IS COHERENT, which is the property that keeps the page a lattice
  // rather than bible 8's static: neighbouring cells must move TOGETHER.
  let worstNeighbour = 0;
  for (let cx = 0; cx < 60; cx++) {
    for (let cy = 0; cy < 60; cy++) {
      const a = fieldMath.drift(0.5, 3.1, cx, cy, cell.w, cell.h);
      const b = fieldMath.drift(0.5, 3.1, cx + 1, cy, cell.w, cell.h);
      worstNeighbour = Math.max(worstNeighbour, Math.hypot(a[0] - b[0], a[1] - b[1]) / cell.w);
    }
  }
  ok(worstNeighbour < 0.35,
    `neighbouring cells drift together, so the lattice survives (worst gap ` +
    `${worstNeighbour.toFixed(3)} cells)`);
}

// ---------------------------------------------------------------------------
section("fieldMath: SCATTER+SETTLE is the critically damped impulse response");
{
  const S = siteConfig.motion.settle;

  // the shape: zero at the hit, peak exactly 1 at tau = 1/k, monotone after
  ok(fieldMath.impulseResponse(0) === 0, "no displacement at the instant of the hit");
  ok(fieldMath.impulseResponse(-1) === 0, "no displacement BEFORE the hit");
  const peak = fieldMath.impulseResponse(1 / S.impulseRate);
  ok(Math.abs(peak - 1) < 1e-9, `the response peaks at exactly 1 (${peak})`);
  let mono = true;
  for (let tau = 1 / S.impulseRate; tau < 6; tau += 0.01) {
    if (fieldMath.impulseResponse(tau + 0.01) > fieldMath.impulseResponse(tau) + 1e-12) mono = false;
  }
  ok(mono, "the response decays monotonically after the peak -- OVERDAMPED, never oscillates");

  // THE ACCEPTANCE NUMBER: under 0.1% of the peak by the settle duration.
  const residual = fieldMath.settleResidual(S.durationS);
  ok(residual < S.residual,
    `the impulse decays to ${(residual * 100).toFixed(4)}% by ${S.durationS}s ` +
    `(budget ${S.residual * 100}%)`);

  // ...and that the three config numbers are CONSISTENT, so changing the
  // duration without changing the rate is a test failure rather than a silent
  // drift into cells that never come home.
  const solved = fieldMath.solveImpulseRate(S.durationS, S.residual);
  ok(Math.abs(solved - S.impulseRate) < 5e-4,
    `motion.settle.impulseRate ${S.impulseRate} is the solution for ` +
    `(${S.durationS}s, ${S.residual}) -> ${solved.toFixed(4)}`);

  // the config authors a VELOCITY (bible 5: 900 px/s); the peak excursion is
  // v/(k*e), and the difference between the two is a factor of 2.7 -- which is
  // the difference between a shove and the page falling off the screen.
  const peakPx = fieldMath.peakDisplacementPx(siteConfig.motion.scatter.impulsePxPerS);
  ok(peakPx > 20 && peakPx < 200,
    `a ${siteConfig.motion.scatter.impulsePxPerS} px/s impulse peaks at ` +
    `${peakPx.toFixed(1)} px, a readable displacement`);

  // FIRING THE SAME HIT TWICE IS BIT-IDENTICAL, because nothing persists.
  // There is no struck flag to clear, no awake set to drain and no reset path,
  // so "the second is identical to the first" is a property of the function
  // rather than of a teardown somebody has to remember to write.
  const hit = { ox: 100, oy: 400, dx: 1, dy: 0, len: 1200, tHit: 5, strength: peakPx };
  const again = { ...hit, tHit: 5 };
  let allIdentical = true;
  let anyMoved = false;
  for (let i = 0; i < 500; i++) {
    const hx = 100 + (i % 50) * 24;
    const hy = 400 + ((i / 50) | 0) * 11 - 55;
    const s = fieldMath.cellSeed(hx, hy);
    for (const tau of [0.05, 0.2, 0.5, 1.0]) {
      const a = fieldMath.scatterAt(hit, hx, hy, hit.tHit + tau, s);
      const b = fieldMath.scatterAt(again, hx, hy, again.tHit + tau, s);
      if (a.dx !== b.dx || a.dy !== b.dy || a.spin !== b.spin || a.hitAmount !== b.hitAmount) {
        allIdentical = false;
      }
      if (Math.abs(a.dx) + Math.abs(a.dy) > 0.5) anyMoved = true;
    }
  }
  ok(anyMoved, "the test hit actually displaces cells (otherwise the check below is vacuous)");
  ok(allIdentical, "the same hit fired twice gives bit-identical displacement, spin and smudge");

  // ...and a hit fired at a DIFFERENT absolute time is identical at the same
  // tau. This is the same statement in the form the site actually needs: the
  // beam can be fired at any moment and behaves the same way every time.
  // NOT bit-identical here, and it cannot be: `907.5 + 0.3` is not the same
  // double as `5 + 0.3`, so tau itself differs in its last bits before the
  // function ever sees it. That is floating point, not state -- the function
  // is still pure, and the difference is 12 orders of magnitude below a pixel.
  const later = { ...hit, tHit: 907.5 };
  let worstShift = 0;
  for (let i = 0; i < 300; i++) {
    const hx = 100 + (i % 30) * 40;
    const hy = 400 + ((i / 30) | 0) * 9 - 45;
    const s = fieldMath.cellSeed(hx, hy);
    const a = fieldMath.scatterAt(hit, hx, hy, hit.tHit + 0.3, s);
    const b = fieldMath.scatterAt(later, hx, hy, later.tHit + 0.3, s);
    worstShift = Math.max(worstShift, Math.hypot(a.dx - b.dx, a.dy - b.dy));
  }
  ok(worstShift < 1e-9,
    `the same hit at a different absolute time gives the same displacement at ` +
    `the same tau (worst ${worstShift.toExponential(2)} px)`);

  // nothing outside the corridor is touched at all
  const outside = fieldMath.scatterAt(hit, 100, 400 + siteConfig.motion.scatter.corridorHalfWidthPx + 20,
                                      hit.tHit + 0.2, 0.5);
  ok(outside.dx === 0 && outside.dy === 0, "a cell outside the corridor is untouched");
  const behind = fieldMath.scatterAt(hit, 40, 400, hit.tHit + 0.2, 0.5);
  ok(behind.dx === 0 && behind.dy === 0, "a cell behind the muzzle is untouched");

  // EVERY cell is home by the settle duration plus its own arrival offset
  let worstLate = 0;
  for (let i = 0; i < 500; i++) {
    const s = i / 500;
    const r = fieldMath.scatterAt(hit, 300, 400, hit.tHit + S.durationS + siteConfig.motion.scatter.arrivalSpreadS, s);
    worstLate = Math.max(worstLate, Math.hypot(r.dx, r.dy));
  }
  ok(worstLate < peakPx * S.residual * 1.05,
    `every cell is within ${(peakPx * S.residual).toFixed(3)} px of home after ` +
    `settle + arrival spread (worst ${worstLate.toFixed(4)} px)`);
}

// ---------------------------------------------------------------------------
section("fieldMath: GATHER is continuous, and mew's clearing is bounded");
{
  const G = siteConfig.motion.gather;
  ok(fieldMath.gatherFalloff(0) === 1, "a cell under the pointer is fully resolved");
  ok(fieldMath.gatherFalloff(G.radiusPx) === 0, "a cell at the radius is untouched");
  ok(fieldMath.gatherFalloff(G.radiusPx * 10) === 0, "...and stays untouched beyond it");

  // CONTINUOUS, NEVER A BINARY SNAP (bible 4.3). Sampled finely, no step in the
  // falloff may exceed what a smooth curve would produce -- a binary test would
  // show up here as a jump of 1.0 between two adjacent samples.
  let worstStep = 0;
  let prev = fieldMath.gatherFalloff(0);
  for (let d = 0; d <= G.radiusPx * 1.2; d += 0.5) {
    const v = fieldMath.gatherFalloff(d);
    worstStep = Math.max(worstStep, Math.abs(v - prev));
    prev = v;
  }
  ok(worstStep < 0.02, `the falloff is continuous (worst step ${worstStep.toFixed(4)} per half px)`);

  // THE POINTER NO LONGER RESOLVES A WORD AT ALL (bible 4.3, R2). What is left
  // of gatherFalloff is the cursor's local influence on the FIELD, so the only
  // thing that can still be asserted about it is that it is bounded and smooth
  // -- which is above. Self-assembly is its own section further down.

  // mew (bible 6.5): thins and pushes nearby, does nothing far away, and never
  // pushes further than the authored clearing.
  const near = fieldMath.mewClearing(500, 500, 500, 500, 60);
  const far = fieldMath.mewClearing(5000, 500, 500, 500, 60);
  ok(far.thin === 0 && far.push[0] === 0, "mew does not disturb cells outside her clearing");
  ok(near.thin > 0, "cells at mew's centre thin");
  let worstPush = 0;
  for (let d = 0; d < 300; d += 1) {
    const c = fieldMath.mewClearing(500 + d, 500, 500, 500, 60);
    worstPush = Math.max(worstPush, Math.hypot(c.push[0], c.push[1]));
  }
  ok(worstPush <= siteConfig.field.mewPushCells + 1e-9,
    `mew's push never exceeds field.mewPushCells (${worstPush.toFixed(3)})`);
}

// ---------------------------------------------------------------------------
section("field: the weather has structure, and the page lands in the bible's band");
{
  const lut = buildRampLut(ramp);
  const coverageOf = makeCoverageOf(ramp, lut);

  // the LUT is a tonal ladder, not a shape lottery: a bucket's four variants
  // must agree about VALUE or a re-roll flickers the page (bible 3.5).
  let worstSpread = 0;
  for (let b = 0; b < lut.buckets; b++) {
    for (let r = 0; r < lut.rows; r++) {
      const covs = [0, 1, 2, 3].map((k) => ramp.glyphs[lut.data[(r * lut.buckets + b) * 4 + k]].cov);
      worstSpread = Math.max(worstSpread, Math.max(...covs) - Math.min(...covs));
    }
  }
  ok(worstSpread < 0.12,
    `no bucket's variants differ by more than 0.12 of ink (worst ${worstSpread.toFixed(4)}) -- ` +
    `a re-roll changes the character, never the value`);
  ok(coverageOf(0) < 0.02, `density 0 is bare paper (${coverageOf(0).toFixed(4)} ink)`);

  // and the whole page, built exactly as the browser builds it -- with a
  // PRESENCE FIELD, because that is what the browser builds now (bible 4.2)
  // and a flat field is a different page.
  const P = siteConfig.field.presence;
  // the target machine, 1512x982 at the 4x7 base: 378 x 141 cells of viewport
  // on a document about twice that tall. The content boxes are modelled on the
  // real route -- a stacked nav, an h1, two blocks of copy -- because the
  // near-bare number is a property of the LAYOUT as much as of the field.
  const cols = 378;
  const vpRows = 141;
  const docRows = 258;
  const contentPx = [];
  {
    let y = 50;
    for (let i = 0; i < 4; i++) { contentPx.push({ x: 60, y, w: 340, h: 72 }); y += 78; }
    y += 70;
    contentPx.push({ x: 60, y, w: 440, h: 95 });
    y += 130;
    for (let i = 0; i < 7; i++) { contentPx.push({ x: 60, y, w: 544, h: 27 }); y += 27; }
    y += 40;
    for (let i = 0; i < 6; i++) { contentPx.push({ x: 60, y, w: 544, h: 27 }); y += 27; }
  }
  const inCells = contentPx.map((r) => ({
    x0: r.x / 4, y0: r.y / 7, x1: (r.x + r.w) / 4, y1: (r.y + r.h) / 7
  }));
  const presence = fieldMath.presenceField(cols, docRows, inCells);
  const built = buildCellData(cols, docRows, coverageOf, { presence, viewportRows: vpRows });
  const s = built.stats;
  const F = siteConfig.field;

  // PRESENCE IS A REAL FIELD, not a rubber stamp
  ok(presence.every((v) => v >= P.floor - 1e-6 && v <= 1 + 1e-6),
    "presence stays inside [floor, 1]");
  const overContent = presence[Math.floor((contentPx[0].y / 7 + 3)) * cols +
                               Math.floor(contentPx[0].x / 4 + 10)];
  ok(overContent > 0.98, `presence is ~1 over a content box (${overContent.toFixed(3)})`);
  ok(presence[Math.floor(vpRows * 0.5) * cols + (cols - 4)] < P.floor + 0.02,
    "...and back at the floor in the far right margin");
  // NO CONTENT MEANS A FULL FIELD, never a blank page: a first paint before the
  // DOM has been measured must not flash bare paper.
  ok(fieldMath.presenceField(20, 20, []).every((v) => v === 1),
    "an unmeasured page is fully present, not empty");

  // ---- THE R1 ACCEPTANCE NUMBER (bible 4.2) ------------------------------
  // "35-55% of the viewport should be near-bare paper (< 0.04 effective ink)
  // at rest. If that number drops, the page is a texture again."
  ok(s.viewportBareFraction >= P.bareFractionMin && s.viewportBareFraction <= P.bareFractionMax,
    `${(s.viewportBareFraction * 100).toFixed(1)}% of the viewport is near-bare ` +
    `(< ${P.bareInkMax} ink) -- bible 4.2 wants ${P.bareFractionMin * 100}-${P.bareFractionMax * 100}%`);

  // ...and the same page WITHOUT presence is the one that shipped: wall-to-wall
  // texture, which is what bible 8 says no to on sight.
  const flat = buildCellData(cols, docRows, coverageOf, { viewportRows: vpRows });
  ok(flat.stats.viewportBareFraction < P.bareFractionMin,
    `a field with no presence is only ${(flat.stats.viewportBareFraction * 100).toFixed(1)}% ` +
    `bare -- that is the wall-to-wall texture presence exists to fix`);

  // THE CROWD ITSELF lands in bible 4.2's 12-22% band. Measured where the
  // presence is, because the whole-viewport mean is deliberately below the
  // band once half the page is empty -- see siteConfig's coverageTarget note.
  let crowdInk = 0;
  let crowdN = 0;
  for (let i = 0; i < cols * vpRows; i++) {
    if (presence[i] < 0.5) continue;
    const struck = (built.a[i * 4 + 3] & 4) !== 0;
    crowdInk += coverageOf(built.a[i * 4 + 1] / 255, struck);
    crowdN++;
  }
  const crowdMean = crowdInk / Math.max(1, crowdN);
  ok(crowdMean >= F.coverageMin && crowdMean <= F.coverageMax,
    `the crowd is at ${(crowdMean * 100).toFixed(1)}% mean ink, inside bible 4.2's ` +
    `${F.coverageMin * 100}-${F.coverageMax * 100}% band`);
  ok(crowdMean > s.viewportBareFraction * 0 + s.meanCoverage,
    "...and denser than the sheet as a whole, which is what a composition is");

  ok(s.fringeFraction <= siteConfig.fringe.maxCellFraction + 1e-9,
    `chromatic cells ${(s.fringeFraction * 100).toFixed(2)}% <= the ` +
    `${siteConfig.fringe.maxCellFraction * 100}% budget (bible 3.3), and it is a HARD budget`);

  // OVERSTRIKE, the register that replaced inversion (bible 3.4a)
  ok(s.overstrikeFraction <= F.overstrike.restMaxFraction + 1e-9,
    `overstruck cells ${(s.overstrikeFraction * 100).toFixed(2)}% <= ` +
    `${F.overstrike.restMaxFraction * 100}% -- the last two stops, used sparingly`);
  ok(s.overstrikeFraction > 0, "...and the register is actually spent, not quietly dropped");
  // two impressions at ~0.33 compose to ~0.5-0.55 effective ink, which is the
  // whole arithmetic of bible 3.4a and the reason a block is not needed.
  const struckInk = coverageOf(1, true);
  const plainInk = coverageOf(1, false);
  ok(struckInk > plainInk * 1.7 && struckInk < 0.62,
    `an overstruck cell is ${struckInk.toFixed(3)} ink against ${plainInk.toFixed(3)} plain ` +
    `-- darker, and nowhere near a filled block`);
  ok(struckInk <= 1, "...and it can never exceed a full cell");

  // IT IS NOT STATIC (bible 8). Two properties separate weather from noise:
  // there is real bare paper, and the density is SPATIALLY CORRELATED. Uniform
  // random noise has neither.
  ok(s.bareFraction > 0.05,
    `${(s.bareFraction * 100).toFixed(1)}% of the page is bare paper -- "lights are ` +
    `isolated punctuation on bare paper" needs somewhere for them to be isolated`);

  let sameSum = 0;
  let farSum = 0;
  let n = 0;
  for (let cy = 2; cy < 120; cy += 3) {
    for (let cx = 2; cx < 200; cx += 3) {
      const d = (x, y) => built.a[(y * cols + x) * 4 + 1] / 255;
      sameSum += Math.abs(d(cx, cy) - d(cx + 1, cy));
      farSum += Math.abs(d(cx, cy) - d((cx + 97) % 200, (cy + 41) % 120));
      n++;
    }
  }
  ok(sameSum / n < farSum / n * 0.35,
    `neighbouring cells are far more alike than distant ones ` +
    `(${(sameSum / n).toFixed(3)} vs ${(farSum / n).toFixed(3)}) -- the field has ` +
    `weather, not static`);

  // ...and the calibration is a MEASUREMENT, so it holds at a different size.
  // No presence here, so this is the flat case and the plain mean is the crowd.
  const small = buildCellData(80, 40, coverageOf);
  ok(small.stats.meanCoverage >= F.coverageMin && small.stats.meanCoverage <= F.coverageMax,
    `the coverage calibration holds at a different grid size ` +
    `(${(small.stats.meanCoverage * 100).toFixed(1)}%)`);
}

// ---------------------------------------------------------------------------
section("R1: no inverted cell can be produced outside the portrait (bible 3.4a, 8)");
{
  // "Black rectangles. No inverted cells in the field or in any word. Darks
  // come from overstrike. A letter made of blocks is a stencil, not type made
  // of type, and this one already shipped once." -- bible 8.
  //
  // This is asserted STRUCTURALLY rather than by looking at a picture, because
  // the thing that shipped looked fine to whoever shipped it.
  ok(siteConfig.field.invert === undefined,
    "field.invert is gone -- there is no threshold that could invert a cell");
  ok(siteConfig.field.overstrike && siteConfig.field.overstrike.slotDensityAbove > 0,
    "...and a word's darkest cells reach OVERSTRIKE instead");

  const srcDir = path.join(__dirname, "..", "src");
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".js")) files.push(full);
    }
  })(srcDir);
  ok(files.length > 10, `scanned ${files.length} source files`);

  // THE QUARANTINE (bible 3.4a): the register stays available to the portrait,
  // where the subject is an image rather than type, and nowhere else. Reading
  // the flag anywhere in the field or the word path would be the leak.
  const readers = files.filter((f) => readFileSync(f, "utf8").includes("allowInvert"))
                       .map((f) => path.relative(srcDir, f));
  const allowed = new Set(["config/siteConfig.js", "type/portrait.js"]);
  for (const r of readers) ok(allowed.has(r), `only the portrait may read allowInvert (${r} does)`);
  ok(siteConfig.portrait.allowInvert === false,
    "...and it is off, so the shipped pack has no inverted cells either");

  // THE FRAGMENT SHADER CANNOT DRAW A RECTANGLE. An inverted cell is made by
  // filling the quad with ink and knocking the glyph out of it in PAPER, so a
  // fragment shader that never writes the paper colour cannot produce one
  // whatever the rest of the pipeline believes. That branch is what the black
  // headings actually were.
  const rendererSrc = readFileSync(path.join(srcDir, "type", "fieldRenderer.js"), "utf8");
  const frag = rendererSrc.slice(rendererSrc.indexOf("const FRAG"),
                                 rendererSrc.indexOf("// ---", rendererSrc.indexOf("const FRAG")));
  ok(frag.includes("discard"), "the fragment shader discards where there is no ink");
  ok(!frag.includes("uPaper"),
    "...and never writes the paper colour, so no cell can come out as a block");
  ok(!rendererSrc.includes("INVERTED_PASS"), "there is no inverted pass left to compile");
  ok(rendererSrc.includes("OVERSTRIKE_PASS"), "the second draw is the overstrike pass");
}

// ---------------------------------------------------------------------------
section("R1: the type scale is rows, and PROJECTS fits (bible 3.6)");
{
  const T = siteConfig.type;
  // THE SIZE OF AN ASCII HEADING, exactly as dom.js computes it in CSS.
  const fontSizeFor = (capRows, cellH) => capRows * cellH / T.capHeightRatio;
  const widthOf = (text, fontPx) => text.length * T.advanceRatio * fontPx;

  // the acceptance number: PROJECTS as an h1 at the 1512 px breakpoint.
  const cell = cellForViewport(1512, 982, 2);
  const h1Font = fontSizeFor(T.h1CapRows, cell.h);
  const projects = widthOf("PROJECTS", h1Font);
  ok(projects <= 520,
    `PROJECTS as an h1 is ${projects.toFixed(0)}px wide at 1512 (<= 520)`);
  ok(h1Font < 100, `...at a ${h1Font.toFixed(0)}px font size, not the old 166px cap`);

  // ...and it is still a HEADING, not body copy dressed up
  ok(h1Font * T.capHeightRatio / T.bodyPx > 3,
    "an h1 is more than 3x the body copy");
  ok(h1Font * T.capHeightRatio / T.bodyPx < 5,
    "...and less than 5x. Eleven times is a billboard (bible 3.6)");

  // EVERY BREAKPOINT, at the row count dom.js would actually apply, has to
  // leave the longest word room to sit on one line -- a heading the browser
  // wraps cannot be rasterized at all and falls back to VOICE (words.js).
  const longest = "CASE STUDIES";
  const widths = [1600, 1512, 1200, 900, 600, 375];
  for (const vw of widths) {
    const c = cellForViewport(vw, 900, 2);
    const rows = vw <= T.narrowMaxWidth ? T.h1CapRowsNarrow : T.h1CapRows;
    const w = widthOf(longest, fontSizeFor(rows, c.h));
    const avail = vw * 0.92;    // #doc has 4vw of padding a side
    ok(rows >= siteConfig.legibility.minCapRows,
      `${vw}px: ${rows} rows is at or above the 7-row floor`);
    if (w > avail) {
      // Not a failure -- bible 4.4's own conclusion is that the word falls
      // back to VOICE when the technique does not fit. It IS a thing the test
      // should say out loud rather than discover in a screenshot.
      console.log(`   note: "${longest}" needs ${w.toFixed(0)}px at ${vw}px wide ` +
                  `(${avail.toFixed(0)} available) -- falls back to VOICE`);
    }
  }
  const midW = widthOf(longest, fontSizeFor(T.h1CapRows, cellForViewport(1512, 982, 2).h));
  ok(midW < 1512 * 0.92, `"${longest}" fits on one line at 1512 (${midW.toFixed(0)}px)`);
}

// ---------------------------------------------------------------------------
section("R1: counters and surround clear to near-bare (bible 4.4 rule 2)");
{
  const lut = buildRampLut(ramp);
  const coverageOf = makeCoverageOf(ramp, lut);
  const L = siteConfig.legibility;
  const G = siteConfig.motion.gather;

  // the counter cap, solved the way field.js solves it
  const counterDensity = densityForCoverage(coverageOf, L.counterInkMax);
  const counterInk = coverageOf(counterDensity, false);
  ok(counterInk <= L.counterInkMax + 1e-3,
    `a cleared cell lands on ${counterInk.toFixed(4)} ink (<= ${L.counterInkMax})`);
  ok(densityForCoverage(coverageOf, 0.3) > densityForCoverage(coverageOf, 0.1),
    "densityForCoverage is monotone, so the bisection means something");

  // THE RATIO IS THE RULE. A stem tops out at an overstruck cell; the counter
  // is at the cap; the letterform is read from the difference. 6:1 or better.
  const stemInk = coverageOf(1, true);
  ok(stemInk / counterInk >= L.counterRatio,
    `stem:counter is ${(stemInk / counterInk).toFixed(1)}:1 (bible 4.4 wants ${L.counterRatio}:1)`);

  // ...and the shader's own arithmetic, mirrored: thin=1 lands exactly on the
  // cap however dark the weather underneath happens to be. The old
  // restD * (1 - thin * 0.9) scaled with the weather, so a counter sitting on
  // a dark drift stayed dark -- which is the "far too gentle" thinning that
  // turned words to mud.
  const thinnedAt = (restD, thin) =>
    restD + (Math.min(restD, counterDensity) - restD) * thin * G.thinAmount;
  for (const restD of [0.2, 0.5, 0.85, 1.0]) {
    const ink = coverageOf(thinnedAt(restD, 1), false);
    ok(ink <= L.counterInkMax + 1e-3,
      `a counter over density ${restD} clears to ${ink.toFixed(4)} ink`);
    // ...and what the old formula left AT A COUNTER'S REAL DISTANCE. This is
    // the honest comparison: without a plateau, a cell one step from a stem
    // only reaches thin = 1 - 1/radius = 0.8, so the old arithmetic is
    // restD * (1 - 0.8 * 0.9) = restD * 0.28 -- and over a dark drift that is
    // 0.095 ink, half again over the cap and visibly grey inside an O.
    const oldWay = coverageOf(restD * (1 - 0.8 * 0.9), false);
    if (restD >= 0.85) {
      ok(oldWay > L.counterInkMax,
        `...where the old thinning left ${oldWay.toFixed(4)} at the same cell -- ` +
        `over the ${L.counterInkMax} cap, and it is the ratio that reads`);
    }
  }

  // THE PLATEAU is what actually covers a counter. A counter is a bare region
  // one or two cells across in the middle of a letter, so its centre is barely
  // a cell from a stem: a falloff that starts decaying at the word's edge only
  // ever half-clears it.
  // the grid has to be bigger than the ring radius on every side, or the
  // outermost cells of the falloff simply fall off the edge and the check
  // below measures nothing.
  const cols = 48;
  const rows = 48;
  const slots = [];
  for (let cy = 18; cy < 30; cy++) {
    for (let cx = 18; cx < 30; cx++) {
      // a ring of stem cells with a 4x4 counter inside it
      const inner = cx >= 21 && cx < 25 && cy >= 21 && cy < 25;
      if (!inner) slots.push(cy * cols + cx);
    }
  }
  const ring = buildRing(slots, cols, rows);
  const thinAt = new Float32Array(cols * rows);
  for (const r of ring) thinAt[r.i] = r.thin;
  let counterCleared = true;
  for (let cy = 21; cy < 25; cy++) {
    for (let cx = 21; cx < 25; cx++) {
      if (thinAt[cy * cols + cx] < 0.999) counterCleared = false;
    }
  }
  ok(counterCleared, "every cell of a 4x4 counter is fully cleared by the plateau");
  ok(ring.every((r) => r.thin > 0 && r.thin <= 1), "the ring's thinning stays in (0, 1]");
  // ...and it still returns to nothing at the radius, so the word has no box
  // drawn around it.
  const far = ring.filter((r) => r.thin < 0.05).length;
  ok(far > 0, "the thinning fades to nothing before the radius, not at it");

  // a plateau of zero is the old behaviour, and it does NOT clear the counter --
  // which is the regression this whole section exists to pin.
  const oldRing = buildRing(slots, cols, rows, G.thinRadiusCells, 0);
  const oldThin = new Float32Array(cols * rows);
  for (const r of oldRing) oldThin[r.i] = r.thin;
  ok(oldThin[22 * cols + 22] < 0.9,
    `without the plateau a counter cell only thins to ${oldThin[22 * cols + 22].toFixed(2)}`);
}

// ---------------------------------------------------------------------------
section("R2: words assemble on their own, and the pointer cannot summon one");
{
  const A = siteConfig.motion.assemble;
  const res = (progress, order, seed) => fieldMath.assembleResolve(progress, order, seed);

  // THE ACCEPTANCE NUMBER (bible 4.3): load any route, touch nothing, and every
  // ascii word is fully formed within 3 s. It is one config number, and it is
  // true of every cell because the per-cell delay and the remaining span are
  // complementary by construction -- the last cell to START still finishes
  // exactly at durationS.
  ok(A.durationS <= 3, `assembly finishes in ${A.durationS}s (<= 3s)`);
  for (const order of [0, 0.25, 0.5, 0.75, 1]) {
    for (const seed of [0, 0.33, 0.5, 0.87, 1]) {
      ok(res(1, order, seed) === 1,
        `every cell is fully resolved at progress 1 (order ${order}, seed ${seed})`);
      ok(res(0, order, seed) === 0, `...and none of them before it starts`);
    }
  }

  // OUTSIDE-IN (bible 4.3): "the silhouette resolves before the interior
  // detail, which is what makes it read as condensation rather than as a wipe".
  // At the same seed, a cell further from the word's centre is never behind one
  // nearer to it.
  let outsideFirst = true;
  for (let p = 0; p <= 1.0001; p += 0.02) {
    for (const seed of [0, 0.4, 1]) {
      if (res(p, 0, seed) < res(p, 1, seed) - 1e-9) outsideFirst = false;
    }
  }
  ok(outsideFirst, "an outer cell always resolves at or before an inner one");
  // ...but it is not a clean geometric wipe either, or it would read as one:
  // the seed is what puts a grain on the wavefront.
  const spread = Math.abs(res(0.35, 0.5, 0) - res(0.35, 0.5, 1));
  ok(spread > 0.05, `the frozen seed grains the wavefront (${spread.toFixed(3)} apart mid-assembly)`);
  ok(A.orderWeight > 0.5 && A.orderWeight < 1,
    "...while distance still dominates it, so the shape of the gesture survives");

  // CONTINUOUS IN TIME. A word that steps is a word that pops on.
  let worstStep = 0;
  let prev = res(0, 0.5, 0.3);
  for (let p = 0; p <= 1; p += 1 / 240) {
    const v = res(p, 0.5, 0.3);
    worstStep = Math.max(worstStep, Math.abs(v - prev));
    prev = v;
  }
  ok(worstStep < 0.02, `assembly is continuous (worst step ${worstStep.toFixed(4)} per frame)`);

  // AND THEY STAY (bible 4.3). There is no decay path: nothing in the config
  // takes an assembled word back apart, and setWordFocus has no un-focus
  // branch -- both of which are the pointer-summons behaviour wearing a
  // different trigger.
  const fieldSrc = readFileSync(path.join(__dirname, "..", "src", "type", "field.js"), "utf8");
  ok(/setWordFocus\(el, focused\) \{\s*\n\s*if \(!focused\) return;/.test(fieldSrc),
    "focus assembles a word and nothing un-assembles it");

  // THE POINTER IS OUT OF THE WORD PATH ENTIRELY. This is asserted structurally
  // for the same reason R1's inverted cells are: "words appear near the cursor"
  // looked correct to whoever shipped it, and the failure it causes -- nobody
  // finds the navigation -- is invisible to the person who already knows where
  // the links are.
  ok(siteConfig.motion.gather.wordRadiusPx === undefined,
    "the word-level pointer radius is gone");
  ok(siteConfig.motion.gather.routeResolve === undefined,
    "...and so is the two-tier resting level it went with");
  // AN ASSEMBLED WORD RESOLVES ALL THE WAY, and its aliveness comes from the
  // drift rather than from leaving weather inside it. Resting at 0.88 -- which
  // is what R1 did, and what this was first written as -- keeps 12% of the
  // resting density in the counters, and over a crest that lands them at 0.27
  // against a 0.19 cap: bible 4.4 rule 2 collapsing exactly as it warns.
  ok(siteConfig.motion.assemble.restResolve === 1,
    "an assembled word reaches full density, so the counters actually clear");
  ok(siteConfig.motion.assemble.holdDrift > 0 && siteConfig.motion.assemble.holdDrift < 0.2,
    "...and it keeps a little drift, so it is a crowd holding a formation");
  // the arithmetic that makes that the right call, mirrored from the shader
  {
    const lut = buildRampLut(ramp);
    const coverageOf = makeCoverageOf(ramp, lut);
    const cap = densityForCoverage(coverageOf, siteConfig.legibility.counterInkMax);
    const counterAt = (r) => 0.95 + (cap - 0.95) * r;   // a counter over a crest
    ok(coverageOf(counterAt(1), false) <= siteConfig.legibility.counterInkMax + 1e-3,
      "at full resolve a counter over a crest lands on the cap");
    ok(coverageOf(counterAt(0.88), false) > siteConfig.legibility.counterInkMax * 1.3,
      `...where 0.88 left it at ${coverageOf(counterAt(0.88), false).toFixed(3)} ink, well over it`);
  }

  const rendererSrc = readFileSync(path.join(__dirname, "..", "src", "type", "fieldRenderer.js"), "utf8");
  ok(!rendererSrc.includes("uWordResolve"), "the per-word resolve uniform is now per-word STATE");
  ok(/float resolve = wordId > 0\.5\s*\n\s*\? assembleResolve\(/.test(rendererSrc),
    "a cell resolves from its word's own clock, never from a pointer distance");
  // gatherFalloff survives, but only as the field's local response to the
  // cursor -- it may touch the drift and the density, never the resolve.
  ok(rendererSrc.includes("POINTER_CALM") && rendererSrc.includes("POINTER_LIFT"),
    "...and what is left of the pointer only calms the drift and firms the crowd");

  const mainSrc = readFileSync(path.join(__dirname, "..", "src", "main.js"), "utf8");
  ok(!mainSrc.includes("restResolve"),
    "no word is handed a resting level any more -- links and headings assemble alike");
}

// ---------------------------------------------------------------------------
section("R2: hover modulates an assembled word, and stays inside the ink budget");
{
  const H = siteConfig.motion.hover;

  // ONE SPRING, ~180 ms (bible 4.3a). expDamp reaches 95% in 3/rate seconds.
  const settleS = 3 / H.rate;
  ok(settleS > 0.15 && settleS < 0.21, `the hover spring settles in ${(settleS * 1000) | 0}ms`);

  // THE SHIVER: "~8x for 250 ms, then decays back."
  ok(H.shiverRate >= 7.5 && H.shiverRate <= 8.5, `the re-roll rate spikes ${H.shiverRate}x`);
  ok(fieldMath.shiverEnvelope(0.0) === 0, "nothing before the pointer arrives");
  ok(fieldMath.shiverEnvelope(H.shiverHoldS) === 1, "held flat through the spike");
  ok(fieldMath.shiverEnvelope(H.shiverHoldS + 0.001) < 1, "...then it decays");
  ok(fieldMath.shiverEnvelope(H.shiverHoldS + 1.5) < 0.02, "...and is gone within two seconds");
  let monotone = true;
  let prevEnv = 1;
  for (let tau = H.shiverHoldS; tau < 3; tau += 0.01) {
    const v = fieldMath.shiverEnvelope(tau);
    if (v > prevEnv + 1e-9) monotone = false;
    prevEnv = v;
  }
  ok(monotone, "the decay never goes back up, so the word settles once");

  // AND THE SHIVER IS VISIBLE AT ALL. An assembled cell is pinned to its 6-D
  // matched glyph, so spiking the re-roll rate on its own changes nothing --
  // there is nothing left to re-roll. The unsettle has to push a cell back
  // below its own crossover, and the crossover is 0.35..0.75 from a frozen
  // hash. At the resting level, the peak of the shiver must reach past the
  // bottom of that range or the effect is a no-op.
  const rest = siteConfig.motion.assemble.restResolve;
  const unpinned = fieldMath.clamp01((0.75 - (rest - H.shiverUnsettle)) / 0.4);
  ok(unpinned >= 0.5,
    `the shiver un-pins ${(unpinned * 100) | 0}% of a word's cells at its peak`);
  // ...and NOT all of them, which is the better answer and is where this
  // landed rather than where it was aimed. The cells whose crossover sits
  // lowest keep their matched glyph throughout, so the letterform holds its
  // skeleton while most of it reconsiders -- a word where every cell lets go at
  // once is a word that dissolves and re-forms, which is a different gesture
  // and a much louder one.
  ok(unpinned < 1,
    `...and never all of them (${((1 - unpinned) * 100) | 0}% hold the skeleton)`);

  // SHARPEN: contrast rises, and it rises by getting the RATIO up, which is the
  // only thing that makes a letterform readable (bible 4.4 rule 2). Never a
  // colour swap, never a scale -- so the ink cost of a hover is nil.
  const lut = buildRampLut(ramp);
  const coverageOf = makeCoverageOf(ramp, lut);
  const counterD = densityForCoverage(coverageOf, siteConfig.legibility.counterInkMax);
  const restRatio = coverageOf(1, true) / coverageOf(counterD, false);
  const hotRatio = coverageOf(1, true) / coverageOf(counterD * (1 - H.counterCut), false);
  ok(hotRatio > restRatio,
    `hover takes stem:counter from ${restRatio.toFixed(1)}:1 to ${hotRatio.toFixed(1)}:1`);
  ok(H.sharpenGain > 0 && H.sharpenGain <= 0.2, "stems rise ~15% and no more");
  ok(H.breathCells <= 0.35, "the breath never exceeds a third of a cell (bible 4.3a)");

  const rendererSrc = readFileSync(path.join(__dirname, "..", "src", "type", "fieldRenderer.js"), "utf8");
  for (const marker of ["SHARPEN_GAIN", "SHIVER_RATE", "BREATH_CELLS", "COUNTER_CUT"]) {
    ok(rendererSrc.includes(marker), `${marker} reaches the shader`);
  }
  // NO COLOUR SWAP, NO UNDERLINE, NO SCALE (bible 4.3a). The only colour a
  // hovered cell can take is a fringe ink, and only on a ghost cell.
  const domSrc = readFileSync(path.join(__dirname, "..", "src", "site", "dom.js"), "utf8");
  ok(!/a\[.*\]:hover|:hover\s*\{/.test(domSrc),
    "there is no CSS hover state -- the field is the hover state");

  // THE 4% CHROMATIC BUDGET (bible 3.3), and the hover fringe is the one thing
  // allowed to spend any of it. Counted, not eyeballed: the ghosts are the
  // LEADING EDGE of the stems, so their number is bounded by the stem cells,
  // which is a fraction of one word -- while the resting fringe is capped at
  // layout. Driven here off a hand-built letterform, the same way rule 4 is.
  const cells = [];
  for (let cy = 0; cy < 12; cy++) {
    // two stems three cells wide with a counter between them: an H, roughly
    for (const cx of [4, 5, 6, 12, 13, 14]) cells.push({ cx, cy, density: 0.95 });
    if (cy === 6) for (const cx of [7, 8, 9, 10, 11]) cells.push({ cx, cy, density: 0.95 });
  }
  const ghosts = leadingEdgeGhosts(cells);
  // 12 down the left stem's outer flank, 11 down the right one's -- the right
  // stem loses its ghost on the row where the crossbar reaches it, because
  // there is no leading edge in the middle of a join. That is the predicate
  // being exactly right rather than approximately right.
  ok(ghosts.length === 23,
    `a two-stem letterform ghosts ${ghosts.length} cells, one per exposed stem row`);
  ok(ghosts.every((g) => cells.every((c) => !(c.cx === g.cx && c.cy === g.cy && c.density >= 0.55))),
    "no ghost lands inside a stem: it is the edge, not the mass");
  ok(ghosts.every((g) => cells.some((c) => c.cx === g.cx + 1 && c.cy === g.cy)),
    "...and every ghost is exactly one cell to the LEFT of ink (the leading edge)");
  // ghosts per word cell, which is what the budget is really made of: a whole
  // page of hovered words could not reach 4% of the viewport on its own.
  const ratio = ghosts.length / cells.length;
  ok(ratio < 0.4, `ghosts are ${(ratio * 100).toFixed(0)}% of a word's own cells`);
}

// ---------------------------------------------------------------------------
section("R3: the map is a torus, and nothing else knows a compass direction exists");
{
  const M = siteConfig.map;
  const map = createMap(M);

  // THE BIBLE'S OWN MAP (7.1a). Home at the origin is one step from everything,
  // which is why it is home.
  for (const id of ["projects", "case-studies", "my-journey", "who-am-i"]) {
    const d = map.delta("home", id);
    ok(Math.abs(d[0]) + Math.abs(d[1]) === 1, `home -> ${id} is one step (${d})`);
  }

  // W -> E TRAVELS LEFT, and it is the modulus that says so, not a special
  // case. The direct route from -1 to +1 is +2; the wrapped route is -1.
  const we = map.delta("my-journey", "projects");
  ok(we[0] === -1 && we[1] === 0, `west -> east travels LEFT and wraps (${we})`);
  // N -> S TRAVELS UP, same mechanism on the other axis.
  const ns = map.delta("who-am-i", "case-studies");
  ok(ns[0] === 0 && ns[1] === -1, `north -> south travels UP and wraps (${ns})`);
  // ...and every hop is its own reverse.
  for (const [a, b] of [["my-journey", "projects"], ["who-am-i", "case-studies"],
                        ["home", "projects"], ["home", "case-studies"]]) {
    const f = map.delta(a, b);
    const r = map.delta(b, a);
    ok(f[0] === -r[0] && f[1] === -r[1], `${a} <-> ${b} reverses exactly (${f} / ${r})`);
  }

  // THE DELTA IS ALWAYS AN INTEGER, at every extent. The bible writes the
  // formula as ((b - a + E/2) mod E) - E/2, which for an ODD extent shifts by a
  // half -- and a half-panel delta would park the camera permanently between
  // two panels with nothing in the system noticing.
  let allInt = true;
  let inRange = true;
  for (let E = 1; E <= 12; E++) {
    for (let a = -3 * E; a <= 3 * E; a++) {
      for (let b = -3 * E; b <= 3 * E; b++) {
        const d = shortestDelta(a, b, E);
        if (!Number.isInteger(d)) allInt = false;
        if (d <= -E / 2 - 1e-9 || d > E / 2 + 1e-9) inRange = false;
        // ...and it really is congruent to the naive delta, i.e. it lands on
        // the same panel by a shorter road.
        if (((b - a - d) % E + E) % E !== 0) allInt = false;
      }
    }
  }
  ok(allInt, "the delta is an integer congruent to b-a at every extent 1..12");
  ok(inRange, "...and always the SHORTER road, in (-E/2, E/2]");

  // a route with no cell does not move the camera. A 404 is not a place.
  const none = map.delta("who-am-i", "nowhere");
  ok(none[0] === 0 && none[1] === 0, "an unmapped route travels nowhere");

  // TWO ROUTES ON ONE PANEL CAN NEVER BE TOLD APART, so it is an error rather
  // than a surprise -- and an extent too small to hold the map aliases them.
  let threw = false;
  try { createMap({ routes: { a: [0, 0], b: [3, 0] }, extent: [3, 3] }); } catch { threw = true; }
  ok(threw, "two routes wrapping onto one cell is a construction error");

  // MOVING A PAGE IS TWO NUMBERS AND NOTHING ELSE (bible 7.1a). Same table with
  // projects moved to the west cell: the direction reverses and nothing else in
  // the map's behaviour changes.
  const moved = createMap({ routes: { ...M.routes, projects: [-1, 0], "my-journey": [1, 0] },
                            extent: M.extent });
  const wasEast = map.delta("home", "projects");
  const nowWest = moved.delta("home", "projects");
  ok(wasEast[0] === -nowWest[0] && wasEast[0] !== 0,
    `moving one route flips its direction and only its direction (${wasEast} -> ${nowWest})`);
  ok(map.delta("home", "case-studies").join() === moved.delta("home", "case-studies").join(),
    "...while every other route travels exactly as before");

  // NOTHING ELSE KNOWS A COMPASS DIRECTION EXISTS. Asserted by reading the
  // source, because this is an architectural claim and the only way it stays
  // true is if it is checked: the moment a "if we are heading west" appears in
  // the field or the router, adding a page stops being one line.
  const srcDir = path.join(__dirname, "..", "src");
  const srcFiles = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".js")) srcFiles.push(full);
    }
  })(srcDir);
  const compass = /\b(north|south|east|west|northward|southward|eastward|westward)\b/i;
  for (const f of srcFiles) {
    const rel = path.relative(srcDir, f);
    // strip comments: the words are all over the prose, and correctly so.
    const code = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    ok(!compass.test(code), `no compass direction in the code of ${rel}`);
  }
  // ...and THE ROUTE TABLE EXISTS IN EXACTLY ONE PLACE. A second copy of
  // "projects lives at [1, 0]" anywhere in the tree is how "moving a page is
  // two numbers" quietly becomes "two numbers and then whatever else knew".
  const idCell = new RegExp(`["']?(${Object.keys(M.routes).join("|")})["']?\\s*:\\s*\\[`);
  for (const f of srcFiles) {
    const rel = path.relative(srcDir, f);
    if (rel === "config/siteConfig.js") continue;
    ok(!idCell.test(readFileSync(f, "utf8")),
      `the route -> cell table is not duplicated in ${rel}`);
  }
  // every consumer asks the map for a signed delta instead.
  ok(readFileSync(path.join(srcDir, "main.js"), "utf8").includes("siteMap.delta("),
    "main.js gets its travel direction from the map, not from a table of its own");
}

// ---------------------------------------------------------------------------
section("R3: MIGRATE is a closed form, and the pan is the bible's curve");
{
  const T = siteConfig.transit;

  // MIGRATE (bible 5): one bump, zero at both ends, so abandoning a transit
  // half way through costs nothing and leaves nothing to unwind.
  for (const seed of [0, 0.25, 0.5, 0.75, 1]) {
    ok(fieldMath.migrateBump(seed, 0) === 0, `no displacement before the transit (seed ${seed})`);
    ok(fieldMath.migrateBump(seed, 1) === 0, `...and none after it (seed ${seed})`);
  }
  // it RISES AND FALLS -- one bump, not a ramp.
  let peakAt = 0;
  let peak = 0;
  for (let t = 0; t <= 1; t += 1 / 200) {
    const v = fieldMath.migrateBump(0, t);
    if (v > peak) { peak = v; peakAt = t; }
  }
  ok(peak > 0.9, `the crowd actually surges (peak ${peak.toFixed(3)})`);
  ok(peakAt > 0.05 && peakAt < 0.6, `...and peaks EARLY, at ${peakAt.toFixed(2)}, so it decelerates ahead of the camera`);
  // ...and it is monotone up then monotone down: one bump, not two.
  let turns = 0;
  let prev = 0;
  let dir = 1;
  for (let t = 0; t <= 1; t += 1 / 400) {
    const v = fieldMath.migrateBump(0.3, t);
    const d = v > prev ? 1 : v < prev ? -1 : dir;
    if (d !== dir) { turns++; dir = d; }
    prev = v;
  }
  ok(turns <= 1, `one bump, not several (${turns} turning points)`);

  // THE STAGGER IS WHAT MAKES IT A FLOCK. Two cells with different seeds must
  // be at different points of the surge, or the crowd slides as a sheet.
  const spread = Math.abs(fieldMath.migrateBump(0, 0.3) - fieldMath.migrateBump(1, 0.3));
  ok(spread > 0.1, `cells peel away at their own times (${spread.toFixed(3)} apart)`);

  // PURE FUNCTION OF (seed, t01). No state, so firing twice is identical.
  ok(fieldMath.migrateBump(0.42, 0.37) === fieldMath.migrateBump(0.42, 0.37),
    "MIGRATE is a pure function -- there is no transit state to reset");

  // THE PAN'S DURATION scales as base x |delta|^0.6 (bible 7.1a), so a two-step
  // move is longer but NOT twice as long.
  const one = panDurationMs([1, 0]);
  const two = panDurationMs([2, 0]);
  ok(Math.abs(one - T.cameraBaseMs) < 1e-6, `a one-panel pan takes cameraBaseMs (${one})`);
  ok(two > one && two < 2 * one, `a two-panel pan is longer but not twice as long (${two.toFixed(0)}ms)`);
  ok(panDurationMs([0, 0]) === 0, "...and going nowhere takes no time at all");

  // THE CAMERA STARTS LATE, AND THAT IS THE ENTIRE EFFECT (bible 7.1a).
  ok(T.cameraDelayMs > 0, `the camera starts ${T.cameraDelayMs}ms after the crowd`);
  ok(T.cameraDelayMs < T.migrateMs / 2, "...but well inside the crowd's own surge");

  // the bible's easing, evaluated in js because the camera is a uniform.
  const ease = cubicBezier(...T.cameraEase);
  ok(ease(0) === 0 && ease(1) === 1, "the pan curve starts at 0 and ends at 1");
  let mono = true;
  let last = -1;
  for (let x = 0; x <= 1; x += 1 / 256) { const y = ease(x); if (y < last - 1e-9) mono = false; last = y; }
  ok(mono, "the pan never goes backwards");
  ok(ease(0.5) > 0.5, `it is front-loaded then decelerating (half way through time is ${ease(0.5).toFixed(2)} of the distance)`);
}

// ---------------------------------------------------------------------------
section("R3: the weather tiles, so the torus has no seam");
{
  // The plane wraps, so the cell one step west of the map's west edge IS the
  // east edge. If the weather does not agree, that is a hard vertical
  // discontinuity in the resting density -- and it is the one column you pan
  // across every time a navigation wraps.
  const size = { cols: 240, rows: 90 };
  const w = fieldMath.weatherFor(size);
  let seamX = 0;
  let seamY = 0;
  for (let cy = 0; cy < size.rows; cy += 3) {
    seamX = Math.max(seamX, Math.abs(w(0, cy) - w(size.cols, cy)));
    seamX = Math.max(seamX, Math.abs(w(-1, cy) - w(size.cols - 1, cy)));
  }
  for (let cx = 0; cx < size.cols; cx += 3) {
    seamY = Math.max(seamY, Math.abs(w(cx, 0) - w(cx, size.rows)));
    seamY = Math.max(seamY, Math.abs(w(cx, -1) - w(cx, size.rows - 1)));
  }
  ok(seamX < 1e-9, `the weather tiles across the x seam (worst ${seamX.toExponential(1)})`);
  ok(seamY < 1e-9, `...and across the y seam (worst ${seamY.toExponential(1)})`);

  // ...and it is still WEATHER: tiling must not flatten it into a texture.
  let mn = 1;
  let mx = 0;
  let sum = 0;
  let n = 0;
  for (let cy = 0; cy < size.rows; cy++) {
    for (let cx = 0; cx < size.cols; cx++) {
      const v = w(cx, cy);
      mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; n++;
    }
  }
  ok(mx - mn > 0.6, `the tiled weather still has drifts and clearings (range ${mn.toFixed(2)}-${mx.toFixed(2)})`);
  ok(sum / n > 0.35 && sum / n < 0.65, `...centred, not skewed (mean ${(sum / n).toFixed(3)})`);

  // an unbounded weather is the pre-R3 behaviour and must be unchanged, since
  // it is what every earlier calibration was made against.
  ok(Math.abs(fieldMath.weatherFor(null)(37, 19) - fieldMath.weatherAt(37, 19)) < 1e-12,
    "weatherAt is still weatherFor(null) -- nothing recalibrated behind our back");
}

// ---------------------------------------------------------------------------
section("R3: the map's cell texture is budgeted, not assumed");
{
  const B = siteConfig.budget;
  const M = siteConfig.map;
  // the bible's own worked example: 4 x 7 cells, a 1512 px viewport, a 3 x 3
  // map. ~1134 x 423 texels, ~1.9 MB per plane.
  const cell = cellForViewport(1512, 982, 2);
  const panelCols = Math.ceil(1512 / cell.w);
  const panelRows = Math.ceil(982 / cell.h);
  const cols = panelCols * M.extent[0];
  const rows = panelRows * M.extent[1];
  ok(cols === 1134 && rows === 423, `the map is ${cols}x${rows} texels at the base cell`);
  const bytes = cols * rows * 4;
  ok(Math.abs(bytes / 1048576 - 1.83) < 0.1, `${(bytes / 1048576).toFixed(2)} MB per plane`);
  ok(bytes <= B.maxMapTexelBytesPerPlane, "...inside budget.maxMapTexelBytesPerPlane");
  ok(bytes * B.mapPlanes <= B.maxMapTexelBytesPerPlane * B.mapPlanes,
    `${((bytes * B.mapPlanes) / 1048576).toFixed(2)} MB for both planes`);

  // ...and it still holds at the widest breakpoint the ladder supports.
  const big = cellForViewport(2560, 1440, 2);
  const bigBytes = Math.ceil(2560 / big.w) * M.extent[0] * Math.ceil(1440 / big.h) * M.extent[1] * 4;
  ok(bigBytes <= B.maxMapTexelBytesPerPlane,
    `a 2560x1440 viewport is ${(bigBytes / 1048576).toFixed(2)} MB per plane, still in budget`);
}

// ---------------------------------------------------------------------------
section("R2: the assembly order is outside-in, measured in document px");
{
  // A WORD IS WIDER THAN IT IS TALL, always, and the lattice is anisotropic
  // (4 x 7). Both of those have to be in the same space or the wavefront is an
  // ellipse nobody asked for -- which is why the order is computed in document
  // px and not in cells.
  const cell = { w: 4, h: 7 };
  const cells = [];
  for (let cy = 0; cy < 9; cy++) for (let cx = 0; cx < 60; cx++) cells.push({ cx, cy });
  const { centre, radiusPx } = assemblyOrder(cells, cell);

  ok(Math.abs(centre.x - 60 * 4 / 2) < 2.1, `the centre is the box's (${centre.x.toFixed(1)}px across)`);
  ok(radiusPx > 100, `...and the reach spans the word (${radiusPx.toFixed(0)}px)`);
  ok(cells.every((c) => c.order >= 0 && c.order <= 1), "every order is in [0, 1]");

  const far = cells.find((c) => c.cx === 0 && c.cy === 0);
  const mid = cells.find((c) => c.cx === 30 && c.cy === 4);
  ok(Math.abs(far.order) < 1e-9, "the corner cell is at 0 -- it goes first");
  ok(mid.order > 0.95, "the centre cell is at 1 -- it goes last");

  // the wavefront runs along the word's LONG axis, because that is where the
  // distance actually is. A cell at the far end of a 240 px word is further
  // from the centre than a cell at the top of a 63 px one, and if this were
  // computed in cells the nine-row axis would win instead.
  const endOfWord = cells.find((c) => c.cx === 0 && c.cy === 4);
  const topOfWord = cells.find((c) => c.cx === 30 && c.cy === 0);
  ok(endOfWord.order < topOfWord.order,
    "the ends of a word resolve before its top and bottom edges");
}

// ---------------------------------------------------------------------------
section("words: the four legibility rules of bible 4.4, enforced");
{
  // The rasterizer needs a canvas, so these drive the PURE half directly from
  // hand-built coverage grids -- which is the half that decides whether a word
  // ships or falls back to VOICE, and the half a browser cannot be trusted to
  // reproduce identically across machines anyway.
  const grid = (rows) => {
    const h = rows.length;
    const w = rows[0].length;
    const cov = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cov[y * w + x] = rows[y][x] === "#" ? 1 : 0;
    return { cov, w, h };
  };

  // RULE 2 -- a one-cell stem must fail; two cells must pass.
  const thin = grid([
    "........", "...#....", "...#....", "...#....", "...#....", "...#....", "........"
  ]);
  const fat = grid([
    "........", "..##....", "..##....", "..##....", "..##....", "..##....", "........"
  ]);
  ok(minStemCells(thin.cov, thin.w, thin.h) === 1, "a one-cell stem measures as one cell");
  ok(minStemCells(fat.cov, fat.w, fat.h) === 2, "a two-cell stem measures as two cells");
  ok(minStemCells(thin.cov, thin.w, thin.h) < siteConfig.legibility.minStemCells,
    "...so the one-cell stem fails bible 4.4 rule 2 and the word falls back to VOICE");

  // ...and it is measured in the MIDDLE BAND, so a round letter's thin top does
  // not condemn its perfectly good stems.
  const rounded = grid([
    "........", "..####..", ".##..##.", ".##..##.", ".##..##.", "..####..", "........"
  ]);
  ok(minStemCells(rounded.cov, rounded.w, rounded.h) >= 2,
    "a round letter is judged on its stems, not on the thin curve at its extremes");

  // RULE 4 -- an enclosed bare region is a counter; an open one is not.
  const closed = grid([
    "......", ".####.", ".#..#.", ".#..#.", ".####.", "......"
  ]);
  const open = grid([
    "......", ".####.", ".#....", ".#....", ".####.", "......"
  ]);
  ok(countCounters(closed.cov, closed.w, closed.h) === 1, "a closed letter has one counter");
  ok(countCounters(open.cov, open.w, open.h) === 0,
    "a C-shape has no ENCLOSED counter -- the flood fill reaches its opening");

  // a counter that quantized away is the whole point of checking on the CELL
  // grid rather than on the raster
  const crushed = grid([
    "......", ".####.", ".####.", ".####.", ".####.", "......"
  ]);
  ok(countCounters(crushed.cov, crushed.w, crushed.h) === 0,
    "a counter crushed shut by the grid is correctly counted as lost (bible 4.4 rule 4)");

  ok(expectedCounters("who am i") === 2, "'who am i' implies two counters (o, a)");
  ok(expectedCounters("BOB") === 5, "'BOB' implies five counters (B has two, O has one)");
  ok(expectedCounters("ilt") === 0, "a word with no closed letters implies none");

  // RULE 3 -- the surrounding field thins. The ring is the mechanism, and it
  // must surround, fall off outward, and never include a slot cell.
  const slots = [];
  const W = 40;
  const H = 20;
  for (let y = 8; y < 12; y++) for (let x = 15; x < 25; x++) slots.push(y * W + x);
  const ring = buildRing(new Set(slots), W, H);
  ok(ring.length > 0, "a word thins a ring of cells around itself (bible 4.3)");
  ok(ring.every((r) => !slots.includes(r.i)), "no slot cell is also a ring cell");
  ok(ring.every((r) => r.thin > 0 && r.thin <= 1), "every ring cell thins by a fraction in (0,1]");
  const nearest = ring.reduce((a, b) => (a.thin > b.thin ? a : b));
  const furthest = ring.reduce((a, b) => (a.thin < b.thin ? a : b));
  ok(nearest.thin > furthest.thin,
    "the ring thins most at the word's edge and fades outward -- the word ate them");
}

// ---------------------------------------------------------------------------
section("portrait: delta decode against a hand-built pack");
{
  // a tiny synthetic pack, built BY HAND in this file (not via tools/
  // portrait.py) so this test exercises the JS decoder's own reading of the
  // format spec, independent of whatever tools/portrait.py's encoder does --
  // the same reasoning check_type.py's from-scratch reference decoder uses.
  //
  //   frame 0 (raw):        1 2 3 4 5 6
  //   frame 1 (delta):      idx2 -> 9, idx5 -> 8      => 1 2 9 4 5 8
  //   frame 2 (delta):      no changes                => 1 2 9 4 5 8
  const cols = 3, rows = 2, cellCount = cols * rows;
  const frame0 = [1, 2, 3, 4, 5, 6];
  const packed = new Uint8Array([
    ...frame0,
    2, 0, 2, 0, 9, 5, 0, 8,   // frame 1: count=2, (idx2,gid9), (idx5,gid8)
    0, 0                       // frame 2: count=0
  ]);
  const header = { grid: [cols, rows], frames: 3, fps: 12, byteLength: packed.length, offsets: [0, 6, 14] };

  ok(frameBlockLength(header, 0) === cellCount, "frame 0's block length is cols*rows");
  ok(frameBlockLength(header, 1) === 8, "frame 1's block length is offsets[2]-offsets[1]");
  ok(frameBlockLength(header, 2) === packed.length - 14, "the last frame's block runs to byteLength");

  const buf = new Uint8Array(cellCount);
  seedFrame0(buf, packed, cellCount);
  ok(buf.join(",") === frame0.join(","), "seedFrame0 loads frame 0 raw");

  const consumed1 = applyDelta(buf, packed, header.offsets[1]);
  ok(buf.join(",") === "1,2,9,4,5,8", "applyDelta patches exactly the changed cells");
  ok(consumed1 === 8, "applyDelta reports the exact byte count it consumed");

  const consumed2 = applyDelta(buf, packed, header.offsets[2]);
  ok(buf.join(",") === "1,2,9,4,5,8", "a zero-count delta changes nothing");
  ok(consumed2 === 2, "a zero-count delta consumes exactly its own count field");
}

// ---------------------------------------------------------------------------
section("portrait: createPortraitPlayer -- timing, looping, disposal");
{
  const cols = 3, rows = 2, cellCount = cols * rows;
  const packed = new Uint8Array([
    1, 2, 3, 4, 5, 6,
    2, 0, 2, 0, 9, 5, 0, 8,
    0, 0
  ]);
  const header = { grid: [cols, rows], frames: 3, fps: 12, byteLength: packed.length, offsets: [0, 6, 14] };
  const period = 1 / header.fps;

  // FRAME-RATE INDEPENDENCE -- the same invariant sim.test.js already holds
  // expDamp to (60 steps at 1/60 === one step at 1): stepping one period at a
  // time must land on the same state as one call covering the same total
  // elapsed time.
  const stepwise = createPortraitPlayer({ header, packed, buffer: new Uint8Array(cellCount) });
  stepwise.update(period);
  stepwise.update(period);
  const bulk = createPortraitPlayer({ header, packed, buffer: new Uint8Array(cellCount) });
  bulk.update(period * 2);
  ok(stepwise.buffer.join(",") === bulk.buffer.join(","),
    "two 1-period updates land on the same frame as one 2-period update");
  ok(stepwise.frameIndex === bulk.frameIndex, "...and report the same frame index");
  ok(stepwise.frameIndex === 2, "two advances from frame 0 land on frame 2");

  // LOOPING -- advancing past the last frame reseeds frame 0, exactly.
  const looped = createPortraitPlayer({ header, packed, buffer: new Uint8Array(cellCount) });
  looped.update(period * 3);
  ok(looped.buffer.join(",") === "1,2,3,4,5,6", "advancing past the last frame loops back to frame 0");
  ok(looped.frameIndex === 0, "frame index wraps to 0 on loop");

  // THE CATCH-UP CAP -- a huge dt (a stalled tab) must not spin through the
  // clip more than once, and must not leave a huge leftover accumulator that
  // fires a burst of extra advances on the very next call.
  const stalled = createPortraitPlayer({ header, packed, buffer: new Uint8Array(cellCount) });
  const advanced = stalled.update(1000);
  ok(advanced === true, "a huge dt still reports an advance");
  ok(stalled.frameIndex === 0, "a huge dt caps out at one full loop, landing back on frame 0");
  const nextAdvanced = stalled.update(period);
  ok(nextAdvanced === true && stalled.frameIndex === 1,
    "the accumulator was capped, not left huge -- the very next tick is one ordinary step");

  // A STILL IMAGE (frames === 1) never advances and never divides by a zero
  // period.
  const stillHeader = { grid: [cols, rows], frames: 1, fps: 12, byteLength: cellCount, offsets: [0] };
  const still = createPortraitPlayer({ header: stillHeader, packed: new Uint8Array(frame0Bytes(cellCount)), buffer: new Uint8Array(cellCount) });
  ok(still.update(999) === false, "a single-frame pack never advances, however large dt is");

  // DISPOSAL -- once the scope tears down, update() stops touching the
  // buffer. This is leak class 6 (closures over a resource whose owner is
  // gone): a player outliving its route must not keep mutating a buffer
  // whose backing GPU texture may already be disposed.
  const scope = createScope("portrait-test");
  const disposable = createPortraitPlayer({ header, packed, buffer: new Uint8Array(cellCount), scope });
  scope.dispose();
  ok(disposable.disposed === true, "dispose() marks the player disposed");
  const beforeDispose = disposable.buffer.join(",");
  const advancedAfterDispose = disposable.update(period);
  ok(advancedAfterDispose === false, "update() is a no-op after the scope disposes");
  ok(disposable.buffer.join(",") === beforeDispose, "...and the buffer is left untouched");

  // a mismatched buffer length is a caller bug, not something to paper over.
  let threw = false;
  try { createPortraitPlayer({ header, packed, buffer: new Uint8Array(cellCount + 1) }); }
  catch (e) { threw = true; }
  ok(threw, "a buffer whose length does not match cols*rows throws immediately");
}
function frame0Bytes(n) { return Array.from({ length: n }, (_, i) => i); }

// ---------------------------------------------------------------------------
section("portrait: the shipped pack (tools/portrait.py's output) is well-formed");
{
  const [cols, rows] = portraitHeader.grid;
  const cellCount = cols * rows;
  ok(cols === siteConfig.portrait.grid.cols && rows === siteConfig.portrait.grid.rows,
    "the shipped grid matches siteConfig.portrait.grid");
  const wantFrames = Math.max(1, Math.round(siteConfig.portrait.fps * siteConfig.portrait.targetSeconds));
  ok(portraitHeader.frames === wantFrames, "frame count matches fps x targetSeconds");
  ok(portraitPacked.length === portraitHeader.byteLength, "the .bin's actual size matches the header's byteLength");
  ok(portraitPacked.length <= siteConfig.portrait.maxBytes,
    `the shipped pack fits the ${siteConfig.portrait.maxBytes / 1024} KB budget ` +
    `(${(portraitPacked.length / 1024).toFixed(1)} KB)`);

  // A CELL BYTE IS NOT A GLYPH ID (pack format 2 -- see tools/portrait.py's
  // module docstring). Its low 7 bits index `header.palette`; its top bit is
  // the chromatic fringe flag (bible 3.3). The ramp has more than 128 glyphs
  // and the portrait draws far fewer, so indexing the subset it uses is what
  // frees the top bit -- and it costs the transport nothing, which is why
  // src/type/portrait.js below is unchanged by any of it.
  ok(portraitHeader.glyphMask === 0x7F && portraitHeader.fringeBit === 0x80,
    "the header states the cell byte's layout");
  ok(Array.isArray(portraitHeader.palette) && portraitHeader.palette.length > 0 &&
     portraitHeader.palette.length <= portraitHeader.glyphMask + 1,
    `the pack carries a palette of at most ${0x7F + 1} entries ` +
    `(${portraitHeader.palette?.length})`);
  ok(portraitHeader.palette.every(g => Number.isInteger(g) && g >= 0 && g < ramp.glyphs.length),
    "every palette entry is a glyph the ramp table actually has");

  // replay the WHOLE shipped clip through the real player, masking exactly the
  // way a renderer has to, and confirm every byte resolves to a real glyph --
  // the js-side half of the same acceptance test check_type.py runs in python.
  const buffer = createPortraitBuffer(portraitHeader);
  const player = createPortraitPlayer({ header: portraitHeader, packed: portraitPacked, buffer });
  const paletteLen = portraitHeader.palette.length;
  let sawOutOfRange = false;
  let maxFringeFraction = 0;
  for (let i = 0; i < portraitHeader.frames; i++) {
    let fringed = 0;
    for (let c = 0; c < cellCount; c++) {
      if ((buffer[c] & portraitHeader.glyphMask) >= paletteLen) sawOutOfRange = true;
      if (buffer[c] & portraitHeader.fringeBit) fringed++;
    }
    maxFringeFraction = Math.max(maxFringeFraction, fringed / cellCount);
    player.update(1 / portraitHeader.fps);
  }
  ok(!sawOutOfRange, "every cell byte the shipped clip ever plays indexes a palette entry");

  // THE FRINGE IS A HARD BUDGET (bible 3.3), so the WORST frame is the one
  // that has to pass. An average would let one frame blow past the ceiling and
  // hide behind the quiet ones.
  ok(maxFringeFraction <= siteConfig.portrait.fringe.maxCellFraction + 1e-9,
    `no frame exceeds portrait.fringe.maxCellFraction ` +
    `(worst ${(maxFringeFraction * 100).toFixed(2)}%)`);
  ok(maxFringeFraction <= siteConfig.fringe.maxCellFraction + 1e-9,
    `no frame exceeds the bible's own 4% chromatic ceiling ` +
    `(worst ${(maxFringeFraction * 100).toFixed(2)}%)`);

  ok(player.frameIndex === 0,
    "one update per frame for exactly `frames` frames laps back to frame 0");
}

// ---------------------------------------------------------------------------
section("portrait: the shipped pack is the AIRY register, not a silhouette");
{
  // The look pass's gate, in js as well as in tools/check_type.py, and for the
  // reason bible 9 gives: the first bake of this element was a valid,
  // in-budget, byte-perfect pack of the wrong picture. It hit its coverage
  // target almost exactly and still read as a silhouette, because a MEAN
  // cannot tell a tonal ramp from a bimodal one. So the shape of the
  // distribution is asserted, not just its centre.
  //
  // Recomputed from the shipped bytes and the ramp's own coverages -- never
  // from the numbers portrait.py wrote into the header, which are the thing
  // being checked.
  const [cols, rows] = portraitHeader.grid;
  const cellCount = cols * rows;
  const palCov = portraitHeader.palette.map(g => ramp.glyphs[g].cov);
  const buffer = createPortraitBuffer(portraitHeader);
  const player = createPortraitPlayer({ header: portraitHeader, packed: portraitPacked, buffer });
  let n = 0, sum = 0, empty = 0, midtone = 0, heavy = 0;
  for (let i = 0; i < portraitHeader.frames; i++) {
    for (let c = 0; c < cellCount; c++) {
      const cov = palCov[buffer[c] & portraitHeader.glyphMask];
      n++; sum += cov;
      if (cov < 0.01) empty++;
      else if (cov >= 0.02 && cov < 0.15) midtone++;
      if (cov >= 0.30) heavy++;
    }
    player.update(1 / portraitHeader.fps);
  }
  const gate = siteConfig.portrait.tonalGate;
  const mean = sum / n;
  const target = siteConfig.portrait.coverageTarget;
  ok(Math.abs(mean - target) <= 0.25 * target,
    `mean rendered coverage is within 25% of coverageTarget (${mean.toFixed(4)} vs ${target})`);
  ok(midtone / n >= gate.midtoneMin,
    `the tonal ramp has a midtone body (${(midtone / n).toFixed(3)} >= ${gate.midtoneMin})`);
  ok(heavy / n <= gate.heavyMax,
    `the dark end is not saturated (${(heavy / n).toFixed(3)} <= ${gate.heavyMax})`);
  ok(empty / n <= gate.emptyMax,
    `there is a drawing here (${(empty / n).toFixed(3)} bare <= ${gate.emptyMax})`);
}

// ---------------------------------------------------------------------------
section("portrait: decode cost is measured, and it is cheap (plan phase 7: < 0.2 ms/frame)");
{
  const [cols, rows] = portraitHeader.grid;
  const cellCount = cols * rows;
  const buf = new Uint8Array(cellCount);
  seedFrame0(buf, portraitPacked, cellCount);
  const innerFrames = Math.max(1, portraitHeader.frames - 1);
  const REPS = 2000;
  const t0 = process.hrtime.bigint();
  for (let rep = 0; rep < REPS; rep++) {
    for (let i = 1; i < portraitHeader.frames; i++) {
      applyDelta(buf, portraitPacked, portraitHeader.offsets[i]);
    }
  }
  const t1 = process.hrtime.bigint();
  const nsPerFrame = Number(t1 - t0) / (REPS * innerFrames);
  console.log(`   portrait decode: ${nsPerFrame.toFixed(1)} ns/frame (${(nsPerFrame / 1e6).toFixed(4)} ms/frame)`);
  ok(nsPerFrame < 200000, `decode cost is under 0.2 ms/frame (${(nsPerFrame / 1e6).toFixed(4)} ms)`);
}

// ---------------------------------------------------------------------------
// THE MANUAL PROCEDURE -- for the leak classes that cannot run headlessly.
//
// everything above proves the router's OWN bookkeeping (route matching,
// scroll-target priority, click interception, prefetch dedup, and that the
// world's listener map does not grow across route swaps). it cannot prove
// the three things that need a real renderer, a real DOM and a real GC:
//
//   1. renderer.info.memory (geometries/textures) is flat -- there is no
//      three.js renderer in node.
//   2. a heap snapshot shows zero DETACHED DOM nodes -- there is no DOM, so
//      there is nothing to detach.
//   3. the ACTUAL click/pointerenter/popstate wiring in router.start()
//      (guarded behind hasDom() specifically so it never runs here).
//
// to check these, in a real browser with the site running (npm run dev):
//
//   1. open devtools, take a heap snapshot as a baseline.
//   2. in the console:
//        window.__AW__.renderer.info.memory   // note geometries/textures now
//   3. click through all four nav links, in order, 50 times (200 clicks) --
//      or drive it from the console:
//        const links = [...document.querySelectorAll('nav a[href]')];
//        for (let i = 0; i < 50; i++) {
//          for (const a of links) { a.click(); await new Promise(r => setTimeout(r, 50)); }
//        }
//   4. window.__AW__.renderer.info.memory   // must equal step 2 exactly --
//      the type layer (once phase 4 exists) is the only thing that could grow
//      this, since the router itself creates zero GPU objects.
//   5. window.__AW__.world._listeners      // walk the Map: total listener
//      count across all arrays must equal whatever ONE mounted route holds
//      steady-state, not 50x that.
//   6. take a second heap snapshot, diff against the baseline, filter to
//      "Detached" -- must show zero detached HTMLElement / Text nodes. any
//      detached node here is leak class 6: a closure (colliders, a slot map)
//      still holding a reference into a torn-down route's DOM.
//   7. confirm no white flash and no font reflow across the clicks (eyes,
//      not a metric) and confirm the browser's own back/forward buttons
//      restore both the route AND the scroll position from step 3.
// ---------------------------------------------------------------------------

// helper for the tight round-trip loop: same accounting as ok(), no message
// built unless it actually fails (4000 iterations x 7 cell sizes).
function ok0(cond) {
  checks++;
  if (!cond) { failures++; console.error("  FAIL: non-integer cell index"); }
}

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
console.log("ALL PASS");
