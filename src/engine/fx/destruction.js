// destruction.js
// permanent (until refresh) beam damage on dom elements via canvas alpha
// masks. all the expensive work happens ONCE at fire time; afterwards the
// browser just composites the mask on the gpu. damage accumulates across
// multiple beams because each element keeps its canvas.

import { mulberry32 } from "../../utils/math.js";
import {
  corridorHitsRect, corridorPolygon,
  removedFraction, beamLength
} from "./beamGeometry.js";

const DESTRUCTIBLE = "[data-collider], nav, footer, h1, h2, h3, p, img";

export function createDestruction({ world, config }) {
  // element -> { canvas, ctx, scale, rect, removed }
  const damage = new WeakMap();
  let seed = 1;

  function getEntry(el, rect) {
    let entry = damage.get(el);
    if (!entry) {
      const scale = Math.min(1, 800 / Math.max(rect.w, rect.h, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round(rect.w * scale));
      canvas.height = Math.max(2, Math.round(rect.h * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      entry = { canvas, ctx, scale, rect, removed: 0 };
      damage.set(el, entry);
    }
    return entry;
  }

  function carve(entry, origin, dir, halfW, tStart, tEnd, rng) {
    const { ctx, scale, rect } = entry;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.scale(scale, scale);
    ctx.translate(-rect.x, -rect.y);
    // three passes: wide faint scorch, mid partial, hard core. the outer
    // passes are the "slightly damaged" fringe just outside the beam proper
    const edge = config.edgeDamagePx;
    const passes = [
      [halfW + edge, 0.28, edge * 1.2],
      [halfW + edge * 0.45, 0.5, edge * 0.8],
      [halfW, 1.0, edge * 0.5]
    ];
    for (const [w, alpha, jag] of passes) {
      ctx.globalAlpha = alpha;
      const poly = corridorPolygon(origin, dir, w, tStart, tEnd, jag, rng);
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fill();
    }
    // nibbles: small bites just outside the corridor edges
    ctx.globalAlpha = 0.55;
    const px = -dir.y, py = dir.x;
    const nib = 4 + Math.floor(rng() * 8);
    for (let i = 0; i < nib; i++) {
      const t = tStart + rng() * (tEnd - tStart);
      const side = rng() < 0.5 ? 1 : -1;
      const off = halfW + edge * (0.4 + rng() * 0.9);
      ctx.beginPath();
      ctx.arc(
        origin.x + dir.x * t + px * off * side,
        origin.y + dir.y * t + py * off * side,
        2 + rng() * 8, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  function apply(el, entry) {
    const url = `url(${entry.canvas.toDataURL()})`;
    el.style.webkitMaskImage = url;
    el.style.maskImage = url;
    el.style.webkitMaskSize = "100% 100%";
    el.style.maskSize = "100% 100%";
  }

  // fire the beam: origin + dir in DOCUMENT coords, dir unit. returns beam
  // length, cinder spawn samples, and per-element hit info.
  function fire(origin, dir) {
    const halfW = config.widthPx / 2;
    const len = beamLength(origin, dir, world.docSize);
    const rng = mulberry32(seed++ * 7919 + 17);
    const sy = window.scrollY;

    // candidates: visible-ish destructible blocks, topmost only (masking a
    // parent already hides its children)
    const all = Array.from(document.querySelectorAll(DESTRUCTIBLE))
      .filter((el) => el.id !== "mew-canvas" && !el.dataset.beamDead);
    const hitSet = new Set();
    const hits = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      const rect = { x: r.left, y: r.top + sy, w: r.width, h: r.height };
      if (rect.w < 4 || rect.h < 4) continue;
      if (!corridorHitsRect(rect, origin, dir, halfW + config.edgeDamagePx, len)) continue;
      hits.push({ el, rect });
      hitSet.add(el);
    }
    const topHits = hits.filter(({ el }) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (hitSet.has(p)) return false;
      }
      return true;
    });

    let colliderChanged = false;
    for (const { el, rect } of topHits) {
      const entry = getEntry(el, rect);
      // carve over the full corridor span across this rect (plus margin so
      // the jags never show a straight canvas edge)
      const chordPad = 40;
      const hitSpan = corridorSpan(rect, origin, dir, halfW + config.edgeDamagePx, len);
      if (!hitSpan) continue;
      carve(entry, origin, dir, halfW, hitSpan[0] - chordPad, hitSpan[1] + chordPad, rng);
      apply(el, entry);

      entry.removed = Math.min(1, entry.removed + removedFraction(rect, origin, dir, halfW, len));
      if (entry.removed > config.destroyFractionDrop && el.hasAttribute("data-collider")) {
        el.removeAttribute("data-collider");
        el.dataset.beamDead = "1";
        colliderChanged = true;
      }
    }

    if (colliderChanged) world.emit("recollect");
    return { len, hitCount: topHits.length };
  }

  // span of centerline t where the corridor overlaps the rect (uses the
  // corners' projections, so it also covers grazing hits)
  function corridorSpan(rect, origin, dir, halfW, len) {
    const px = -dir.y, py = dir.x;
    let tMin = Infinity, tMax = -Infinity;
    let sMin = Infinity, sMax = -Infinity;
    for (const [cx, cy] of [
      [rect.x, rect.y], [rect.x + rect.w, rect.y],
      [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]
    ]) {
      const rx = cx - origin.x, ry = cy - origin.y;
      const t = rx * dir.x + ry * dir.y;
      const s = rx * px + ry * py;
      tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
      sMin = Math.min(sMin, s); sMax = Math.max(sMax, s);
    }
    if (sMin > halfW || sMax < -halfW) return null;
    return [Math.max(0, tMin), Math.min(len, tMax)];
  }

  return { fire };
}
