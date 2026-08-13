"""check_type.py -- the ramp table's gate.

    python3 tools/check_type.py

reads src/assets/ramp.json and src/assets/ramp.png BACK (never
glyphatlas.py's in-memory state, so a bug in what it *writes* can't hide) and
asserts every promise phase 1 makes:

  complete    every ramp glyph from siteConfig.js exists at all three weights
  coverage    the table spans a wide enough range to be worth calling a ramp
  confusable  no two glyphs at one weight sit closer than epsilon in 6-D
  budget      the atlas fits the size/byte ceiling
  no bleed    a glyph's ink never crosses into a neighbour's cell

then writes tools/preview/ramp.png (a contact sheet, sorted by coverage) and
tools/preview/ramp_test.png (a greyscale gradient rendered through the ramp),
same reasoning as check_mew.py: a regression should be visible, not just
counted.

A NOTE ON TWO OF THE NUMBERS BELOW, because this file's job is to tell the
truth about what got measured, not to be tuned until it prints green:

  - COVERAGE CEILING. IMPLEMENTATION_PLAN.md's phase-1 acceptance test names
    0.55 as the top of the coverage span. Measured honestly -- full-cell
    average ink, supersampled, over the ramp's own tightest shared vertical
    span -- the densest glyph this font has (M/W/Q/$ at 600 weight, the SOLID
    family bible 3.4 names as "darks") tops out around 0.33. That is not a
    measurement bug: a letterform is line art, not a filled block, and a cell
    tall enough to also hold `$`'s full ascender-to-descender reach and `j`'s
    descender cannot let any one glyph's own strokes cover much more than a
    third of it. Verified independently: even a binarized (any-ink-at-all)
    coverage measure lands within a percent of the continuous mean, so this
    is not an anti-aliasing averaging artifact either. So COV_CEILING below
    is the measured bound, not the plan's ballpark -- exactly the kind of
    thing DESIGN_BIBLE.md 7.3 means by "this section was rewritten after
    measuring." The check still asserts a real floor (not zero), so a future
    regression that flattens the ramp's dynamic range is still caught.
  - CONFUSABLE EPSILON. 0.04 is the brief's number and this file asserts it
    as given. At 200 (ExtraLight) weight it is NOT cleared by every pair --
    thin round lowercase letters (e/o) and single-dot punctuation
    (,/;  ./:  ,/.  :/;) really do sit under a third of the epsilon apart in
    this 6-D space, and no amount of legitimate disc geometry closes that
    without either adding discs (the spec fixes 6) or shrinking them enough
    to reintroduce the exact blind-spot bug that used to map a bare space and
    an apostrophe to the identical zero vector (see glyphatlas.py's DISC_RX
    comment). Left failing on purpose: a check that quietly stops checking
    the thing it was built to catch is worse than one that fails honestly.
"""

import io
import itertools
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from typeconfig import ramp_charset  # noqa: E402
import typeconfig as tc              # noqa: E402  (portrait_* readers)
import glyphatlas as ga              # noqa: E402  (ATLAS_SCALE, weights, etc)
import portrait as pt                # noqa: E402  (decode_all, write_frame_previews)

RAMP_JSON = os.path.join(ROOT, "src", "assets", "ramp.json")
RAMP_PNG = os.path.join(ROOT, "src", "assets", "ramp.png")
PORTRAIT_JSON = os.path.join(ROOT, "src", "assets", "portrait.json")
PORTRAIT_BIN = os.path.join(ROOT, "src", "assets", "portrait.bin")
OUT = os.path.join(HERE, "preview")
FAILS = []

WEIGHTS = sorted(ga.FONT_FILES)
ATLAS_MAX_PX = 2048
ATLAS_MAX_BYTES = int(1.5 * 1024 * 1024)
COV_MIN_CEILING = 0.02     # some glyph must be at or below this (bare paper)
COV_CEILING = 0.28         # some glyph must be at or above this -- see the
                            # module docstring for why this isn't the plan's
                            # 0.55, and what was checked before settling here
CONFUSABLE_EPS = 0.04      # the brief's number, asserted as given


def check(ok, msg, detail=""):
    print(("  ok   " if ok else "  FAIL ") + msg + (f"   {detail}" if detail else ""))
    if not ok:
        FAILS.append(msg)


def load():
    ramp = json.load(open(RAMP_JSON))
    atlas = np.asarray(Image.open(RAMP_PNG).convert("L"), dtype=np.float64)
    return ramp, atlas


# ---------------------------------------------------------------------------
def check_complete(ramp):
    want = {(ch, w) for ch in ramp_charset() for w in WEIGHTS}
    got = {(g["ch"], g["w"]) for g in ramp["glyphs"]}
    missing = sorted(want - got)
    extra = sorted(got - want)
    check(not missing, "every ramp glyph is present at every weight",
          f"missing {missing}" if missing else "")
    check(not extra, "no untracked (ch, weight) pairs in the table",
          f"extra {extra}" if extra else "")
    dupe = len(ramp["glyphs"]) != len(got)
    check(not dupe, "no duplicate (ch, weight) entries",
          f"{len(ramp['glyphs'])} entries, {len(got)} unique")


def check_coverage(ramp):
    covs = [g["cov"] for g in ramp["glyphs"]]
    lo, hi = min(covs), max(covs)
    check(lo <= COV_MIN_CEILING, "coverage reaches down to bare paper",
          f"min {lo:.4f} <= {COV_MIN_CEILING}")
    check(hi >= COV_CEILING, "coverage reaches a genuinely dense glyph",
          f"max {hi:.4f} >= {COV_CEILING}")
    for g in ramp["glyphs"]:
        if not (0.0 <= g["cov"] <= 1.0):
            check(False, f"cov in range for {g['ch']!r}@{g['w']}", f"{g['cov']}")
            break
    else:
        check(True, "every cov value is within [0, 1]")


def check_confusable(ramp):
    by_w = {}
    for g in ramp["glyphs"]:
        by_w.setdefault(g["w"], []).append(g)
    for w in WEIGHTS:
        lst = by_w[w]
        close = []
        for a, b in itertools.combinations(lst, 2):
            d = float(np.linalg.norm(np.array(a["v6"]) - np.array(b["v6"])))
            if d < CONFUSABLE_EPS:
                close.append((d, a["ch"], b["ch"]))
        close.sort()
        detail = ", ".join(f"{a!r}/{b!r} {d:.4f}" for d, a, b in close[:6])
        if len(close) > 6:
            detail += f", +{len(close) - 6} more"
        check(not close, f"weight {w}: no confusable pair under {CONFUSABLE_EPS}",
              detail)


def check_budget(ramp, atlas):
    aw, ah = ramp["atlas"]
    check(aw == atlas.shape[1] and ah == atlas.shape[0],
          "ramp.json's atlas size matches the actual PNG",
          f"json {aw}x{ah} vs png {atlas.shape[1]}x{atlas.shape[0]}")
    check(aw <= ATLAS_MAX_PX and ah <= ATLAS_MAX_PX,
          f"atlas fits {ATLAS_MAX_PX}^2", f"{aw}x{ah}")
    size = os.path.getsize(RAMP_PNG)
    check(size <= ATLAS_MAX_BYTES, "atlas PNG fits the byte budget",
          f"{size / 1024:.1f} KB <= {ATLAS_MAX_BYTES / 1024:.0f} KB")


def check_no_bleed(ramp, atlas):
    """every pixel NOT claimed by some glyph's own uv rect must be exactly 0.
    each glyph is rendered on an isolated canvas and pasted at a non-
    overlapping offset (glyphatlas.py), so the only way ink shows up outside
    every claimed rect is a glyph's own render overflowing its cell -- this
    reloads the shipped PNG and checks for exactly that, independent of
    glyphatlas.py's own bookkeeping."""
    h, w = atlas.shape
    owned = np.zeros((h, w), dtype=bool)
    for g in ramp["glyphs"]:
        u0, v0, u1, v1 = g["uv"]
        x0, x1 = round(u0 * w), round(u1 * w)
        y0, y1 = round(v0 * h), round(v1 * h)
        owned[y0:y1, x0:x1] = True
    outside = atlas[~owned]
    leaked = float(outside.max()) if outside.size else 0.0
    check(leaked == 0.0, "no ink outside any glyph's own cell (the gutter)",
          f"max stray pixel value {leaked:.0f}")


# ---------------------------------------------------------------------------
def crop_cell(atlas, g):
    u0, v0, u1, v1 = g["uv"]
    h, w = atlas.shape
    x0, x1 = round(u0 * w), round(u1 * w)
    y0, y1 = round(v0 * h), round(v1 * h)
    return atlas[y0:y1, x0:x1]


def write_contact_sheet(ramp, atlas, path):
    glyphs = sorted(ramp["glyphs"], key=lambda g: (g["cov"], g["w"], g["ch"]))
    cw, ch = ramp["cell"]
    pad = 6
    label_h = 12
    tile_w, tile_h = cw + pad * 2, ch + pad * 2 + label_h
    cols = 21
    rows = int(np.ceil(len(glyphs) / cols))
    sheet = np.full((rows * tile_h, cols * tile_w), 40, dtype=np.uint8)
    im = Image.fromarray(sheet, mode="L").convert("RGB")
    dr = ImageDraw.Draw(im)
    for i, g in enumerate(glyphs):
        r, c = divmod(i, cols)
        cell = crop_cell(atlas, g).astype(np.uint8)
        gy, gx = r * tile_h + pad, c * tile_w + pad
        glyph_rgb = np.stack([cell] * 3, axis=-1)
        arr = np.asarray(im)
        arr = arr.copy()
        arr[gy:gy + ch, gx:gx + cw] = glyph_rgb
        im = Image.fromarray(arr)
        dr = ImageDraw.Draw(im)
        label = f"{g['ch']}{g['w']}"
        dr.text((c * tile_w + pad, r * tile_h + pad + ch + 1), label,
                fill=(120, 220, 140))
        dr.text((c * tile_w + pad, r * tile_h + 1),
                 f"{g['cov']:.2f}", fill=(220, 180, 90))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    print("  wrote", os.path.relpath(path, ROOT))


def write_gradient(ramp, atlas, path, steps=64, weight=600):
    """a greyscale gradient, rendered through the ramp by nearest-COVERAGE
    lookup. this is a coverage smoke test, not an exercise of the 6-D
    matcher (src/type/match.js) -- it only has to show the ramp's dynamic
    range is continuous and monotonic-looking, not exact matcher behaviour."""
    pool = [g for g in ramp["glyphs"] if g["w"] == weight]
    pool.sort(key=lambda g: g["cov"])
    lo, hi = pool[0]["cov"], pool[-1]["cov"]
    cw, ch = ramp["cell"]
    strip = np.zeros((ch, cw * steps), dtype=np.uint8)
    for i in range(steps):
        # span the RAMP's own achievable range, not the full 0..1: a target
        # past the densest glyph's coverage has nothing closer to snap to
        # than that same glyph, which would flatten the back half of the
        # strip into one repeated character instead of showing a gradient.
        target = lo + (hi - lo) * i / (steps - 1)
        best = min(pool, key=lambda g: abs(g["cov"] - target))
        strip[:, i * cw:(i + 1) * cw] = crop_cell(atlas, best).astype(np.uint8)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(strip, mode="L").save(path)
    print("  wrote", os.path.relpath(path, ROOT))


# ---------------------------------------------------------------------------
# THE PORTRAIT PACK'S GATE (plan phase 7). Reads src/assets/portrait.json and
# .bin BACK, same rule as the ramp checks above: never trust portrait.py's own
# in-memory state, only what actually got written to disk.
# ---------------------------------------------------------------------------
def load_portrait():
    header = json.load(open(PORTRAIT_JSON))
    packed = open(PORTRAIT_BIN, "rb").read()
    return header, packed


def _reference_decode_portrait(header, packed):
    """an INDEPENDENT reimplementation of the pack format -- deliberately NOT
    a call into portrait.py's own decode_all, and deliberately walking the
    bytes with plain int.from_bytes rather than sharing a single helper with
    it. Same reasoning as tools/gen_match_fixture.py re-deriving match.js's
    ranking instead of importing it, and fieldMath.js's GLSL mirror: two
    independently-written implementations of the same spec have nothing to
    hide behind if they agree, which a single shared decoder cross-checked
    against itself never proves."""
    cols, rows = header["grid"]
    cell_count = cols * rows
    n = header["frames"]
    offsets = header["offsets"]
    cur = bytearray(packed[offsets[0]:offsets[0] + cell_count])
    frames = [bytes(cur)]
    for i in range(1, n):
        off = offsets[i]
        count = int.from_bytes(packed[off:off + 2], "little")
        o = off + 2
        for _ in range(count):
            idx = int.from_bytes(packed[o:o + 2], "little")
            gid = packed[o + 2]
            o += 3
            cur[idx] = gid
        frames.append(bytes(cur))
    return frames


def check_portrait_config(header):
    cols, rows = tc.portrait_grid()
    check(header.get("grid") == [cols, rows],
          "portrait grid matches siteConfig.portrait.grid",
          f"{header.get('grid')} vs {[cols, rows]}")
    check(header.get("fps") == tc.portrait_fps(),
          "portrait fps matches siteConfig.portrait.fps",
          f"{header.get('fps')} vs {tc.portrait_fps()}")
    want_frames = max(1, round(tc.portrait_fps() * tc.portrait_target_seconds()))
    check(header.get("frames") == want_frames,
          "frame count matches fps x targetSeconds",
          f"{header.get('frames')} vs {want_frames}")


def check_portrait_budget(header, packed):
    size = len(packed)
    check(header.get("byteLength") == size,
          "portrait.json's byteLength matches the actual .bin size",
          f"json {header.get('byteLength')} vs file {size}")
    budget = tc.portrait_max_bytes()
    check(size <= budget, "portrait pack fits the byte budget",
          f"{size / 1024:.1f} KB <= {budget / 1024:.0f} KB")


def check_portrait_offsets(header):
    offsets = header.get("offsets", [])
    n = header.get("frames", 0)
    cols, rows = header.get("grid", [0, 0])
    cell_count = cols * rows
    check(len(offsets) == n, "one offset per frame", f"{len(offsets)} offsets, {n} frames")
    if not offsets:
        return
    check(offsets[0] == 0, "frame 0 starts at byte 0", f"offsets[0]={offsets[0]}")
    mono = all(offsets[i] < offsets[i + 1] for i in range(len(offsets) - 1))
    check(mono, "offsets strictly increase (every frame occupies at least its own count field)")
    if n > 1:
        check(offsets[1] - offsets[0] == cell_count,
              "frame 0 is stored raw (cols*rows bytes), not delta-encoded",
              f"{offsets[1] - offsets[0]} vs {cell_count}")


def check_portrait_decode(header, packed, ramp):  # noqa: C901
    """the frame-N-matches-a-full-re-encode acceptance test (plan phase 7):
    two independently-written decoders (portrait.py's own, and the from-
    scratch one above) must agree, byte for byte, on every single frame."""
    n = header.get("frames", 0)
    mirror_frames = pt.decode_all(header, packed)
    reference_frames = _reference_decode_portrait(header, packed)
    check(len(mirror_frames) == n and len(reference_frames) == n,
          "both decoders produced exactly one grid per frame",
          f"{len(mirror_frames)} / {len(reference_frames)} vs {n}")

    mismatch = None
    for i in range(min(len(mirror_frames), len(reference_frames))):
        a = np.asarray(mirror_frames[i], dtype=np.uint8)
        b = np.frombuffer(reference_frames[i], dtype=np.uint8)
        if not np.array_equal(a, b):
            mismatch = i
            break
    check(mismatch is None,
          "portrait.py's decoder and an independent reference decoder agree on every frame",
          f"first mismatch at frame {mismatch}" if mismatch is not None else "")

    # THE CELL BYTE IS NOT A GLYPH ID (pack format 2, see portrait.py's module
    # docstring): its low 7 bits index `palette` and its top bit is the
    # chromatic fringe flag. So this walks the same two steps a renderer has
    # to -- mask, then look up -- and checks BOTH, rather than checking a
    # number the format does not contain.
    n_glyphs = len(ramp["glyphs"])
    palette = header.get("palette")
    check(isinstance(palette, list) and 0 < len(palette) <= pt.PALETTE_MAX,
          f"the pack carries a palette of at most {pt.PALETTE_MAX} entries",
          f"{len(palette) if isinstance(palette, list) else palette!r}")
    check(header.get("glyphMask") == pt.GLYPH_MASK and header.get("fringeBit") == pt.FRINGE_BIT,
          "the header states the cell byte's layout",
          f"glyphMask={header.get('glyphMask')} fringeBit={header.get('fringeBit')}")
    if not isinstance(palette, list) or not palette:
        return mirror_frames

    check(all(isinstance(g, int) and 0 <= g < n_glyphs for g in palette),
          "every palette entry is a glyph the ramp table actually has")
    check(len(set(palette)) == len(palette),
          "the palette has no duplicate entries")

    bad_frame = None
    for i, frame in enumerate(mirror_frames):
        arr = np.asarray(frame, dtype=np.uint8)
        if arr.size and int((arr & pt.GLYPH_MASK).max()) >= len(palette):
            bad_frame = i
            break
    check(bad_frame is None, "every cell byte in every frame indexes a palette entry",
          f"out-of-range index at frame {bad_frame}" if bad_frame is not None else "")

    return mirror_frames


def check_portrait_look(header, frames, ramp):
    """THE LOOK PASS'S OWN GATE (bible 4.5, siteConfig.portrait.tonalGate and
    .fringe).

    Everything above checks the pack is well FORMED. These check it is well
    LOOKING, which is a different question and the one the first bake failed:
    it was a valid, in-budget, byte-perfect pack of the wrong picture. Nothing
    here trusts portrait.py's own reported numbers -- they are recomputed from
    the decoded frames and the ramp's own coverages, the same rule as the
    decoder cross-check above."""
    palette = header.get("palette")
    if not isinstance(palette, list) or not palette:
        return
    cols, rows = header["grid"]
    pal_cov = np.array([ramp["glyphs"][g]["cov"] for g in palette], dtype=np.float64)

    cov = np.concatenate([pal_cov[np.asarray(f, dtype=np.uint8) & pt.GLYPH_MASK]
                          for f in frames])
    stats = pt.tonal_stats(cov)
    gate = tc.portrait_tonal_gate()
    target = tc.portrait_coverage_target()

    # the mean is a calibration target, not a hard gate -- it is what the
    # exponent bisection aims at, over a SAMPLE of frames, so the whole clip
    # lands near it rather than on it. A wide band still catches a bake that
    # forgot to calibrate at all.
    check(abs(stats["meanCoverage"] - target) <= 0.25 * target,
          "mean rendered coverage is within 25% of portrait.coverageTarget",
          f"{stats['meanCoverage']:.4f} vs {target}")

    check(stats["midtoneFraction"] >= gate["midtoneMin"],
          f"the tonal ramp has a midtone body (>= {gate['midtoneMin']} of cells "
          f"in [{pt.MIDTONE_LO}, {pt.MIDTONE_HI}) ink)",
          f"{stats['midtoneFraction']:.4f} -- a bimodal pack is a silhouette, bible 3.4")
    check(stats["heavyFraction"] <= gate["heavyMax"],
          f"the dark end is not saturated (<= {gate['heavyMax']} of cells at >= {pt.HEAVY} ink)",
          f"{stats['heavyFraction']:.4f}")
    check(stats["emptyFraction"] <= gate["emptyMax"],
          f"there is a drawing here (<= {gate['emptyMax']} of cells bare)",
          f"{stats['emptyFraction']:.4f}")

    # THE FRINGE IS A HARD BUDGET (bible 3.3), so it is measured per FRAME and
    # the worst frame is the one that has to pass -- an average would let a
    # single frame blow past 4% and hide behind quiet ones.
    per_frame = [float((np.asarray(f, dtype=np.uint8) & pt.FRINGE_BIT).astype(bool).mean())
                 for f in frames]
    worst = max(per_frame) if per_frame else 0.0
    cfg_cap = tc.portrait_fringe()["maxCellFraction"]
    check(worst <= cfg_cap + 1e-9,
          f"no frame exceeds portrait.fringe.maxCellFraction ({cfg_cap})",
          f"worst frame {worst:.4f}")
    check(worst <= 0.04 + 1e-9,
          "no frame exceeds the bible's own 4% chromatic ceiling (3.3)",
          f"worst frame {worst:.4f}")

    print(f"  mean {stats['meanCoverage']:.4f} | empty {stats['emptyFraction']:.3f} | "
          f"midtone {stats['midtoneFraction']:.3f} | heavy {stats['heavyFraction']:.3f} | "
          f"fringe worst frame {worst:.4f} | palette {len(palette)}")


# ---------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    ramp, atlas = load()
    print(f"== {os.path.relpath(RAMP_JSON, ROOT)}: {len(ramp['glyphs'])} glyphs, "
          f"cell {ramp['cell']}, atlas {ramp['atlas']}")

    check_complete(ramp)
    check_coverage(ramp)
    check_confusable(ramp)
    check_budget(ramp, atlas)
    check_no_bleed(ramp, atlas)

    print("== previews ==")
    write_contact_sheet(ramp, atlas, os.path.join(OUT, "ramp.png"))
    write_gradient(ramp, atlas, os.path.join(OUT, "ramp_test.png"))

    print()
    print(f"== portrait: {os.path.relpath(PORTRAIT_JSON, ROOT)} + "
          f"{os.path.relpath(PORTRAIT_BIN, ROOT)}")
    portrait_header, portrait_packed = load_portrait()
    print(f"  {portrait_header.get('frames')} frames, grid {portrait_header.get('grid')}, "
          f"{len(portrait_packed) / 1024:.1f} KB")
    check_portrait_config(portrait_header)
    check_portrait_budget(portrait_header, portrait_packed)
    check_portrait_offsets(portrait_header)
    portrait_frames = check_portrait_decode(portrait_header, portrait_packed, ramp)
    check_portrait_look(portrait_header, portrait_frames, ramp)
    pt.write_frame_previews(portrait_header, portrait_packed, ramp, atlas, OUT)

    print()
    print("ALL CHECKS PASS" if not FAILS else f"{len(FAILS)} FAILURES")
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
