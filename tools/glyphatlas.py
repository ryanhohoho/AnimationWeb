"""glyphatlas.py -- bake the ramp table.

    python3 tools/glyphatlas.py

renders IBM Plex Mono (SIL OFL; downloaded into tools/fonts/ on first run) at
the three field weights (design bible 3.2: 200/400/600) for every glyph in the
ramp (siteConfig.js's SPARSE+MID+DENSE+SOLID, deduped), packs them into a
single R8 PNG atlas, and writes src/assets/ramp.json:

    { "cell": [w,h], "atlas": [W,H],
      "glyphs": [ {"ch":"J","w":600,"uv":[u0,v0,u1,v1],"cov":0.41,"v6":[...]}, ... ] }

WHY THIS IS MEASURED, NOT ESTIMATED (bible 3.4): "sort the ascii characters by
how dark they look" is what makes ordinary ascii art read as halftone instead
of drawing. every `cov` and `v6` entry below comes from actually rasterizing
the glyph at several times the atlas's own resolution and averaging real ink,
not from a hand-guessed density table.

THE 6-D SHAPE VECTOR is coverage under six sampling discs, staggered
vertically so two columns of three discs tile the cell without much overlap
(bible 3.4, and the `DISC_*` block below spells out the geometry):

    TL .           . TR      TL/ML/BL sit at the left column, rows 1/12 5/12
     .  ML .       .          9/12 of cell height; TR/MR/BR sit at the right
     .   .  MR .   .          column, rows 3/12 7/12 11/12 -- offset by half a
     .  BL .       .          row so the six samples read the cell at twice
     .           BR .         the vertical resolution either column gets alone

this is what lets the matcher pick `L` / `T` / `p` / `j` for their DIRECTION,
not just their darkness -- see check_type.py for the confusable-distance gate
this table has to clear, and src/type/match.js for the nearest-neighbour
lookup that consumes it.
"""

import io
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from typeconfig import ramp_charset, base_cell_px, shape_dims  # noqa: E402

FONT_DIR = os.path.join(HERE, "fonts")
OUT_JSON = os.path.join(ROOT, "src", "assets", "ramp.json")
OUT_PNG = os.path.join(ROOT, "src", "assets", "ramp.png")

# IBM Plex Mono, SIL OFL -- the same static TTFs Google Fonts ships, source of
# record is github.com/IBM/plex. mirrored off google/fonts because it serves
# raw files over plain https with no auth, which is what a build-time fetch
# needs. weight -> (filename, google-fonts path).
FONT_FILES = {
    200: "IBMPlexMono-ExtraLight.ttf",
    400: "IBMPlexMono-Regular.ttf",
    600: "IBMPlexMono-SemiBold.ttf",
}
FONT_BASE_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono"
OFL_URL = f"{FONT_BASE_URL}/OFL.txt"

# ---------------------------------------------------------------------------
# THE ATLAS CELL is the bible's own baseCellPx (7x12, the aspect the whole
# grid is quantized around) scaled up by an integer factor. scaling the exact
# ratio -- instead of picking an arbitrary "big enough" box -- is what keeps
# the baked glyph's proportions identical to what the runtime lattice will
# ask for, whichever breakpoint's cell size it ends up sampling this atlas at
# (bible 7.3: the atlas is nearest-sampled, no mips -- there is no filtering
# to hide a proportion mismatch).
ATLAS_SCALE = 8

# render at this many times the atlas cell before downsampling. this is the
# "supersample the coverage measurement" instruction in the brief, made
# literal: cov and v6 are averaged over a raster four times finer per axis
# (16x the samples) than what actually ships in the PNG, then box-filtered
# down. the shipped texel values are therefore already anti-aliased by the
# same measurement, not by a second, independent blur.
SUPERSAMPLE = 4

# blank pixels between adjacent cells in the atlas, in FINAL (post-downsample)
# resolution. every glyph is rendered on its own isolated canvas and pasted
# into the atlas at an exact, non-overlapping offset, so nothing can bleed
# across a cell boundary by construction -- the gutter exists so
# check_type.py has something concrete to assert: if a glyph ever overflowed
# its own canvas, ink would show up IN the gutter, which should always be 0.
GUTTER = 2

# how much of the render canvas the font is allowed to fill. must be < 1 so a
# few percent of bare cell survives even for the SOLID family (bible 4.4 rule
# 4: letters with holes need at least one bare counter cell, and a font that
# exactly fills its advance box leaves no room for one). the GUTTER, not this
# margin, is what actually guarantees no cross-cell bleed (each glyph renders
# on its own isolated canvas), so this can sit close to 1 without risking a
# false pass on the bleed check -- it only trades away a little visual
# breathing room inside the cell.
FIT_MARGIN = 0.94

# the six sampling discs, as (name, cx, cy) in NORMALIZED cell coordinates,
# in the exact order the "v6" array is documented in: top-left, top-right,
# mid-left, mid-right, bottom-left, bottom-right. see the staggering diagram
# in the module docstring.
DISC_X = {"L": 0.25, "R": 0.75}
DISC_Y = {"top-left": 1 / 12, "mid-left": 5 / 12, "bottom-left": 9 / 12,
          "top-right": 3 / 12, "mid-right": 7 / 12, "bottom-right": 11 / 12}
DISC_ORDER = ["top-left", "top-right", "mid-left", "mid-right", "bottom-left", "bottom-right"]
# normalized radii, tuned to TILE the cell (small gaps let a centred mark
# fall through and read as identical to a blank cell -- see below), not to
# leave daylight between discs. ry is essentially half the 1/6 row spacing, so
# the six rows (three per column, staggered) butt up with no seam. rx is
# bigger than the naive "quarter to the midline" 0.25 on purpose: a glyph like
# an apostrophe or backtick sits close to horizontally CENTRED in its advance
# box, and centres at 1/4 and 3/4 with a snug radius leave a dead zone right
# down the cell's vertical midline where that ink lands in neither disc.
# widening past 0.25 gives the two columns a deliberate overlap band there
# instead, so a centred mark is never simply invisible to the vector -- it
# was tested against src/assets/ramp.json (0.22 mapped apostrophe and space to
# an identical all-zero v6 at weight 200; 0.30 does not).
DISC_RX = 0.30
DISC_RY = 0.5 / 6


# ---------------------------------------------------------------------------
def ensure_fonts():
    os.makedirs(FONT_DIR, exist_ok=True)
    for weight, fname in FONT_FILES.items():
        path = os.path.join(FONT_DIR, fname)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        url = f"{FONT_BASE_URL}/{fname}"
        print(f"  fetching {fname} ({weight}) ...")
        urllib.request.urlretrieve(url, path)
    ofl = os.path.join(FONT_DIR, "OFL.txt")
    if not os.path.exists(ofl):
        print("  fetching OFL.txt ...")
        urllib.request.urlretrieve(OFL_URL, ofl)
    return {w: os.path.join(FONT_DIR, f) for w, f in FONT_FILES.items()}


def tight_vspan(font, charset):
    """the union, over every glyph in the set, of real ink extent above and
    below the baseline -- NOT the font's own ascent/descent metrics.

    a font's ascent+descent is padded for glyphs this ramp never uses (tall
    diacritics, deep exotic descenders), so fitting against it leaves the
    whole set sitting in the middle third of the cell with bare paper top and
    bottom. that is not "airy" (bible 4.2's SPARSE register is an actual
    design choice, made by picking sparse GLYPHS, not by shrinking every
    glyph into a smaller box) -- it just makes every coverage number too low
    across the board, including the SOLID family's, and the whole point of
    this table is that SOLID reads as dense. fitting the ramp's OWN ink
    extent instead is what makes a baked `M` actually look solid.

    returns (top, bottom) in font units relative to the baseline (top is
    negative for anything that rises above it).
    """
    tops, bottoms = [], []
    for ch in charset:
        if ch == " ":
            continue   # no ink to bound
        bbox = font.getbbox(ch, anchor="ls")
        tops.append(bbox[1])
        bottoms.append(bbox[3])
    return min(tops), max(bottoms)


def fit_point_size(font_path, render_w, render_h, charset, margin=FIT_MARGIN):
    """largest integer point size whose monospace advance width and the
    ramp's own tight vertical ink span both fit inside the render box with
    `margin` headroom. binary search: both measures are monotonic in size."""
    lo, hi, best = 4, 4000, 4
    while lo <= hi:
        mid = (lo + hi) // 2
        f = ImageFont.truetype(font_path, mid)
        top, bottom = tight_vspan(f, charset)
        max_w = max(f.getlength(ch) for ch in charset)
        if max_w <= render_w * margin and (bottom - top) <= render_h * margin:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def render_glyph(font, ch, render_w, render_h, baseline_y):
    """one glyph, alone on its own canvas, so it can never touch another
    glyph's pixels. anchor "ls": pen-left / baseline -- the SAME baseline_y
    for every character in the set (computed once per weight from the font's
    own ascent), which is what makes a `j`'s descender and an `l`'s ascender
    differ by real shape instead of by independent per-glyph centering."""
    img = Image.new("L", (render_w, render_h), 0)
    draw = ImageDraw.Draw(img)
    adv = font.getlength(ch)
    x = (render_w - adv) / 2
    draw.text((x, baseline_y), ch, font=font, fill=255, anchor="ls")
    return np.asarray(img, dtype=np.float64)


def downsample(arr, factor):
    h, w = arr.shape
    fh, fw = h // factor, w // factor
    return arr.reshape(fh, factor, fw, factor).mean(axis=(1, 3))


def build_disc_masks(render_w, render_h):
    """boolean masks for the six discs, in supersampled pixel space. computed
    once and reused for every glyph -- geometry is identical across the set,
    only the ink under it changes."""
    ys, xs = np.mgrid[0:render_h, 0:render_w]
    nx = (xs + 0.5) / render_w
    ny = (ys + 0.5) / render_h
    masks = {}
    for name in DISC_ORDER:
        cx = DISC_X["L"] if name.endswith("left") else DISC_X["R"]
        cy = DISC_Y[name]
        masks[name] = (((nx - cx) / DISC_RX) ** 2 + ((ny - cy) / DISC_RY) ** 2) <= 1.0
    return masks


def measure(arr, disc_masks):
    cov = float(arr.mean() / 255.0)
    v6 = []
    for name in DISC_ORDER:
        m = disc_masks[name]
        v6.append(float(arr[m].mean() / 255.0) if m.any() else 0.0)
    return cov, v6


# ---------------------------------------------------------------------------
def build(verbose=True):
    assert shape_dims() == 6, "siteConfig.ramp.shapeDims changed -- v6 below assumes 6"
    charset = ramp_charset()
    base_w, base_h = base_cell_px()
    cell_w, cell_h = base_w * ATLAS_SCALE, base_h * ATLAS_SCALE
    render_w, render_h = cell_w * SUPERSAMPLE, cell_h * SUPERSAMPLE

    font_paths = ensure_fonts()
    disc_masks = build_disc_masks(render_w, render_h)

    # ONE point size for all three weights, fit against the middle (Regular)
    # weight's metrics. sharing it is what keeps a jittered glyph the same
    # apparent SIZE across weight (bible 3.4: weight jitter is a second density
    # dimension, not a second size dimension) -- only the stroke changes.
    pt = fit_point_size(font_paths[400], render_w, render_h, charset)

    # and ONE baseline, from the SAME Regular pass, for the same reason: a
    # baseline recomputed per weight would let jitter shift a glyph vertically
    # by a texel or two along with its stroke, which reads as a wobble.
    ref_font = ImageFont.truetype(font_paths[400], pt)
    span_top, span_bottom = tight_vspan(ref_font, charset)
    top_pad = (render_h - (span_bottom - span_top)) / 2
    baseline_y = top_pad - span_top

    if verbose:
        print(f"cell {cell_w}x{cell_h} (x{SUPERSAMPLE} render {render_w}x{render_h}), "
              f"font size {pt}pt shared across weights, baseline_y {baseline_y:.1f}")

    weights = sorted(FONT_FILES)
    entries = []          # dicts with raw (unnormalized) v6, filled in below
    cells = {}            # (ch, weight) -> final downsampled cell array

    n = len(charset) * len(weights)
    cols = int(np.ceil(np.sqrt(n * (cell_h / cell_w))))
    cols = max(cols, 1)
    rows = int(np.ceil(n / cols))
    pitch_w, pitch_h = cell_w + GUTTER, cell_h + GUTTER
    atlas_w, atlas_h = cols * pitch_w, rows * pitch_h

    idx = 0
    for weight in weights:
        font = ImageFont.truetype(font_paths[weight], pt)
        for ch in charset:
            raster = render_glyph(font, ch, render_w, render_h, baseline_y)
            cov, v6_raw = measure(raster, disc_masks)
            cell = downsample(raster, SUPERSAMPLE)
            r, c = divmod(idx, cols)
            cells[(ch, weight)] = cell
            entries.append({
                "ch": ch, "w": weight, "cov": cov, "v6_raw": v6_raw,
                "row": r, "col": c,
            })
            idx += 1

    # normalize each of the 6 shape dimensions so its max ACROSS THE WHOLE
    # TABLE (every glyph, every weight -- this is the space the matcher
    # searches, bible 3.4) is exactly 1.0.
    v6_stack = np.array([e["v6_raw"] for e in entries])
    axis_max = v6_stack.max(axis=0)
    axis_max[axis_max == 0] = 1.0   # guard: an all-blank axis would be a bug
                                     # upstream (no glyph reaches it), not a
                                     # division worth crashing over here
    v6_norm = v6_stack / axis_max

    # composite the atlas and the json side by side, since both read the same
    # `entries` + `cells`.
    atlas = np.zeros((atlas_h, atlas_w), dtype=np.uint8)
    glyphs = []
    for i, e in enumerate(entries):
        r, c = e["row"], e["col"]
        y0, x0 = r * pitch_h, c * pitch_w
        atlas[y0:y0 + cell_h, x0:x0 + cell_w] = np.clip(cells[(e["ch"], e["w"])], 0, 255).astype(np.uint8)
        u0, v0 = x0 / atlas_w, y0 / atlas_h
        u1, v1 = (x0 + cell_w) / atlas_w, (y0 + cell_h) / atlas_h
        glyphs.append({
            "ch": e["ch"], "w": e["w"],
            "uv": [round(u0, 6), round(v0, 6), round(u1, 6), round(v1, 6)],
            "cov": round(e["cov"], 6),
            "v6": [round(float(x), 6) for x in v6_norm[i]],
        })

    # AXIS MAX SHIPS WITH THE TABLE, and it is not decoration.
    #
    # the v6 above is already divided through by it, so nothing that only reads
    # ramp.json can recover it -- and src/type/words.js has to. that module
    # rasterizes a WORD to a coverage bitmap and measures the SAME six discs
    # over each cell of it (bible 4.1 step 2), then asks match.js for the
    # nearest glyph. those two vectors have to live in one space or the
    # nearest-neighbour is meaningless, and the only way to put a freshly
    # measured raw disc vector into the table's space is to divide it by the
    # same numbers the table was divided by. so: emit them.
    ramp = {
        "cell": [cell_w, cell_h],
        "atlas": [atlas_w, atlas_h],
        "axisMax": [round(float(x), 6) for x in axis_max],
        "glyphs": glyphs
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    import json
    with open(OUT_JSON, "w") as fh:
        json.dump(ramp, fh, indent=1)
    Image.fromarray(atlas, mode="L").save(OUT_PNG, optimize=True)

    if verbose:
        png_kb = os.path.getsize(OUT_PNG) / 1024
        covs = [g["cov"] for g in glyphs]
        print(f"wrote {os.path.relpath(OUT_JSON, ROOT)}  ({len(glyphs)} glyphs)")
        print(f"wrote {os.path.relpath(OUT_PNG, ROOT)}  {atlas_w}x{atlas_h}  {png_kb:.1f} KB")
        print(f"  coverage span {min(covs):.3f} .. {max(covs):.3f}")
        print(f"  gutter {GUTTER}px, pitch {pitch_w}x{pitch_h}, packed {cols}x{rows} "
              f"({len(glyphs)}/{cols * rows} cells used)")

    return ramp, atlas


if __name__ == "__main__":
    build()
