"""portrait.py -- bake the hero portrait clip (design bible 4.5).

    python3 tools/portrait.py [input.gif|input.png]

converts a still image or a short animated GIF into a fixed COLS x ROWS grid
of glyph cells (siteConfig.portrait.grid) at siteConfig.portrait.fps, using
the SAME 6-D shape matching tools/glyphatlas.py bakes the ramp table with and
src/type/match.js looks glyphs up with: every cell samples the same six
staggered discs (top-L, top-R, mid-L, mid-R, bottom-L, bottom-R) glyphatlas.py
uses to measure a glyph, over the image's own ink instead of a rendered
character, then picks the nearest ramp glyph in that same normalized 6-D
space (dividing by ramp.json's axisMax, exactly as src/type/words.js has to
for a rasterized word -- see atlas.js's axisMaxOf).

THE REGISTER IS THE AIRY ONE (bible 4.5): future-refs/another-reference.jpg,
NOT the otaku poster. Everything this module does that is not "resample and
match" exists to land on that reference's numbers, which were measured off it
rather than guessed at -- see `siteConfig.portrait` for every one of them and
the reasoning behind it. The short version, all on the reference's own 110x96
grid: mean rendered ink 0.0535, 60% of cells bare, and -- the part a mean
cannot see -- a BROAD, near-flat spread of the remaining 40% across every
tonal step from 0.02 to 0.30. That last property is the whole look. A bake can
hit the mean exactly and still be a silhouette, which is what the first one
was.

Three mechanisms produce it, in this order:

  1. TONE (levels -> gamma -> re-add cell-scale detail). The gamma crush buys
     the bare paper; the high-pass added back afterwards buys the speckle. A
     single free parameter, the exponent, is bisected against the clip's own
     measured RENDERED coverage -- after matching, as it will actually be
     drawn, which is the only scale the reference can be compared on.
  2. MATCH (6-D nearest neighbour + an airy prior + frozen jitter). The prior
     is additive on squared distance and small enough to decide near-ties
     only. The jitter is bible 3.5's frozen randomness and it is load-bearing
     here: without it, a run of equal-tone cells all resolve to the same
     argmin and you get `QQQQQQQQ`, which reads as halftone.
  3. HYSTERESIS between frames. Anti-strobe (bible 8), and it is also what
     pays for the finer grid, because the pack is delta-encoded and churn is
     literally bytes.

Frames are delta-encoded (bible 4.5: "most cells do not change between
adjacent frames") and packed with a companion JSON header:

    src/assets/portrait.json   { version, grid, frames, fps, byteLength,
                                  offsets, refCellPx, palette, glyphMask,
                                  fringeBit, gamma, levels, meanCoverage,
                                  emptyFraction, midtoneFraction,
                                  heavyFraction, fringeCellFraction }
    src/assets/portrait.bin    frame 0 raw (cols*rows bytes), then one
                                 delta block per subsequent frame:
                                   uint16 changedCount
                                   changedCount x (uint16 cellIndex LE,
                                                    uint8 cellByte)

THE CELL BYTE (format version 2). Low 7 bits are an index into `palette`;
bit 7 (0x80) is the CHROMATIC FRINGE flag (bible 3.3).

The palette is what buys the flag bit. The ramp has 147 glyphs, which does not
fit in seven bits -- but the portrait never uses 147 of them: it is one
element in one register, and its whole point is that it does NOT range over
the entire ramp. `palette[i]` is the ramp glyph id the cell byte's low bits
mean, so the pack indexes the subset it actually draws and the top bit is free
for the fringe. It costs a few hundred bytes of JSON, it costs the transport
nothing at all -- src/type/portrait.js still just moves bytes, and
`applyDelta` did not have to learn anything -- and it makes the register the
portrait uses an explicit, checkable property of the asset rather than an
emergent one. If a clip ever wants more than 128 distinct glyphs, the rarest
are folded into their nearest surviving neighbour in the same 6-D space the
match itself runs in, which is a merge the matcher would have called close to
a tie anyway.

WHICH fringe ink a flagged cell takes is not stored, because the bible already
specifies it as "a stable function of cell index, so the fringe does not
crawl" -- the renderer derives it, exactly as the field does.

`offsets[i]` is the byte offset of frame i's block within the .bin.
`decode_all()` below is the reference decoder: src/type/portrait.js's
`applyDelta`/`createPortraitPlayer` are its JS mirror, the same split this
codebase already uses for match.js (mirrored by tools/gen_match_fixture.py)
and fieldMath.js (mirrored in GLSL). tools/check_type.py cross-checks a
SECOND, independently-written decoder against this one, on the shipped
files -- not against this module's in-memory state -- for the same reason
check_type.py re-reads ramp.json/ramp.png rather than trusting
glyphatlas.py's return value.

NO REAL CLIP YET. Per IMPLEMENTATION_PLAN.md phase 7 ("blocked on you
supplying the clip. Everything else can proceed without it -- build against
a placeholder portrait and swap the asset in"), this defaults to
src/assets/mewAnimation.gif -- an actual animated asset already in the repo,
not a synthetic pattern, so the pipeline is exercised against real image
content end to end. Swapping in the real clip is `python3 tools/portrait.py
path/to/real-clip.gif`: nothing here hardcodes the placeholder path into the
format, the grid, or the matching -- only the default argument names it.

TWO THINGS THE PLACEHOLDER LIMITS, both measured, both properties of the asset
rather than of this pipeline, and both stated here so the shipped look is not
mistaken for the achievable one:

  * RESOLUTION. It is 350x238, which behind a 110x96 grid is about one source
    pixel per cell. The match measures six discs WITHIN a cell, so at that
    scale there is nothing inside a cell to measure and whole regions collapse
    onto one glyph. The real clip wants >= 4 source pixels per cell per axis.
  * MOTION. It is a cat in flight, precisely the "big motion" bible 4.5 says
    to avoid, and the pack is delta-encoded, so at native speed it costs
    471 KB against a 200 KB budget. siteConfig.portrait.sourceSpeed slows it
    to fit; a clip shot the way the bible asks would not need that.

Run against portrait-like material the same settings land within a couple of
points of the reference on every tonal statistic (61.5% bare / 24.3% midtone /
0.6% heavy, against 60.1 / 21.1 / 0.2), which is how those two constraints
were separated from the tuning in the first place.
"""

import argparse
import json
import os
import struct
import sys

import numpy as np
from PIL import Image, ImageSequence

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import typeconfig as tc          # noqa: E402
import glyphatlas as ga          # noqa: E402  (DISC_ORDER, build_disc_masks)
from mulberry32 import mulberry32  # noqa: E402

RAMP_JSON = os.path.join(ROOT, "src", "assets", "ramp.json")
RAMP_PNG = os.path.join(ROOT, "src", "assets", "ramp.png")
OUT_JSON = os.path.join(ROOT, "src", "assets", "portrait.json")
OUT_BIN = os.path.join(ROOT, "src", "assets", "portrait.bin")
PREVIEW_DIR = os.path.join(HERE, "preview")
DEFAULT_INPUT = os.path.join(ROOT, "src", "assets", "mewAnimation.gif")

# how much finer than the nominal cell to raster before disc-sampling it. A
# photo patch is already continuous-valued (unlike a rendered glyph edge), so
# this does not need glyphatlas's ATLAS_SCALE(8) -- that number buys crisp
# FONT edges, which is not what is being measured here. 4x is enough headroom
# for the six discs to sample real structure instead of a handful of pixels,
# and it keeps a 1080p source from being thrown away on the way in.
SUPERSAMPLE = 4

# how many frames the exponent is bisected against. Their leveled rasters are
# held in memory for the whole bisection (one full-supersample uint8 raster
# each; the detail term is cached at CELL resolution, which is where it was
# computed, and upsampled per iteration for a fraction of the memory).
CALIBRATION_FRAMES = 8

VERSION = 2

# see the module docstring: low 7 bits are a palette index, bit 7 is fringe.
GLYPH_MASK = 0x7F
FRINGE_BIT = 0x80
PALETTE_MAX = GLYPH_MASK + 1

# the tonal buckets siteConfig.portrait.tonalGate is stated in, and the ones
# the reference was measured with. Named here so the gate, the report and the
# preview all bucket identically.
MIDTONE_LO, MIDTONE_HI = 0.02, 0.15
HEAVY = 0.30
EMPTY = 0.01


# ---------------------------------------------------------------------------
# source frames -> a fixed number of grayscale arrays at the target fps
# ---------------------------------------------------------------------------
def load_source_frames(path, n_frames, fps, speed=1.0):
    """resample WHATEVER clip is at `path` (any length, any native fps, even a
    single still image) onto exactly `n_frames` frames spaced 1/fps apart,
    looping the source if it is shorter than the target duration. This is the
    entire reason a future real clip needs no code change: the resampler
    only ever asks the source "what does your timeline show at time t",
    never "give me your Nth frame".

    `speed` scales how fast that timeline is traversed, and it exists because
    bible 4.5 asks for content this technique can actually hold: "prefer a
    short, slow, near-loop clip (a blink, a head turn) over anything with big
    motion -- the technique falls apart on fast movement and looks magnificent
    on stillness." The pack is delta-encoded, so that sentence is also a
    budget: a source whose cells genuinely change 30% per frame cannot be
    stored in 200 KB at any grid worth having, and no amount of hysteresis
    fixes it because the change is real. See siteConfig.portrait.sourceSpeed
    for why the placeholder needs it and the real clip should not."""
    im = Image.open(path)
    if not getattr(im, "is_animated", False):
        gray = np.asarray(im.convert("L"), dtype=np.float64) / 255.0
        return [gray] * n_frames

    spans = []           # (grayscale array, start_s, end_s)
    t = 0.0
    for frame in ImageSequence.Iterator(im):
        dur = frame.info.get("duration", 100) / 1000.0
        if dur <= 0:
            dur = 0.1
        spans.append((np.asarray(frame.convert("L"), dtype=np.float64) / 255.0, t, t + dur))
        t += dur
    total = t if t > 0 else 1.0

    period = 1.0 / fps
    out = []
    for i in range(n_frames):
        want = (i * period * speed) % total
        chosen = spans[-1][0]
        for gray, start, end in spans:
            if start <= want < end:
                chosen = gray
                break
        out.append(chosen)
    return out


def crop_source(gray01, zoom, cx, cy):
    """FRAMING, applied to the source before anything measures it
    (siteConfig.portrait.crop). `zoom` 1.0 is the whole frame; 2.0 takes the
    middle half on each axis, centred on (cx, cy) in normalized coordinates
    and clamped to stay inside the image.

    This is not a convenience. Everything downstream is calibrated against the
    WHOLE grid -- the exponent is bisected until the clip's mean rendered ink
    hits a target, and that target is a number measured off a reference whose
    subject fills its frame. Give the same machinery a subject sitting in a
    wide white margin and it does the only thing it can: it drives the
    exponent to its floor trying to make a small subject account for the
    entire frame's ink budget, and blackens it. That is exactly what the
    placeholder did -- exponent pinned at the 0.04 floor, 82% of cells bare
    and 13% at the top of the ramp, a silhouette with a halo.

    So framing comes first, and it is a stated decision rather than an
    accident of whatever the source happened to be shot at."""
    if zoom <= 1.0:
        return gray01
    h, w = gray01.shape
    nh, nw = max(1, int(h / zoom)), max(1, int(w / zoom))
    y0 = int(np.clip(cy * h - nh / 2, 0, h - nh))
    x0 = int(np.clip(cx * w - nw / 2, 0, w - nw))
    return gray01[y0:y0 + nh, x0:x0 + nw]


def cover_resize_gray(gray01, target_w, target_h):
    """crop-then-resize to EXACTLY (target_w, target_h), covering the whole
    box (never letterboxed) -- same fit rule the engine's own coverFit uses
    for the canvas background (src/engine/fx/presentMath.js), applied here to
    a numpy array instead of a CSS background-size."""
    sh, sw = gray01.shape
    scale = max(target_w / sw, target_h / sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    img = Image.fromarray(np.clip(gray01 * 255.0, 0, 255).astype(np.uint8), mode="L")
    img = img.resize((nw, nh), Image.LANCZOS)
    arr = np.asarray(img, dtype=np.float64) / 255.0
    x0 = (nw - target_w) // 2
    y0 = (nh - target_h) // 2
    return arr[y0:y0 + target_h, x0:x0 + target_w]


# ---------------------------------------------------------------------------
# THE TONE CURVE (siteConfig.portrait.tone)
#
# levels -> gamma -> re-add fine detail, and the order is the point. Doing the
# high-pass FIRST and the gamma after (which is what an ordinary unsharp-then-
# expose pipeline does) crushes the detail along with everything else, and you
# get back the smooth, banded gradient the first bake had. Adding it back
# afterwards means the global curve decides where the MASSES are and the local
# term decides where the SPECKLE is, independently -- which is the reference's
# actual signature: clean paper across a flat lit cheek, fine marks wherever
# there is genuine texture, real mass only in the darks.
# ---------------------------------------------------------------------------
def measure_levels(sample_grays01, black_frac, white_pct):
    """black/white points for the whole clip, from a sample of its frames --
    NOT per frame. Per-frame auto-levels would pump: a frame that happens to
    contain no dark pixel would have its midtones dragged up to fill the
    range, and the portrait would breathe in brightness for no reason the
    subject is doing.

    THE WHITE POINT IS A PERCENTILE, THE BLACK POINT IS NOT, and that
    asymmetry is deliberate. The white point has to find the darkest real
    content, which only the distribution knows. The black point has to sit
    above the noise floor -- and a percentile cannot find that, because a
    source whose background is literally white has more than any sensible
    percentile of its pixels at exactly zero, so the percentile IS zero and
    clips nothing. That is not hypothetical: it is what the placeholder does,
    and it is why a black point stated as a percentile silently did nothing at
    4, 20 or 35 while the background stayed speckled.

    Stated as a fraction of the white point it means the thing it is for --
    "tone below this share of the clip's own range is bare paper" -- on any
    source, whether its background is white, grey, or a room."""
    pool = []
    for g in sample_grays01:
        tone = 1.0 - g
        # subsample: a percentile does not need every pixel, and the full
        # rasters are large.
        pool.append(tone[::3, ::3].ravel())
    pool = np.concatenate(pool)
    hi = float(np.percentile(pool, white_pct))
    lo = black_frac * hi
    if hi - lo < 1e-4:
        hi = lo + 1e-4
    return lo, hi


def _gaussian_blur_2d(a, sigma):
    """separable gaussian, edge-clamped, in plain numpy. PIL's GaussianBlur
    refuses float ("F") images and the detail term is signed float at cell
    resolution, so rounding it through uint8 to borrow PIL's would quantize
    exactly the small differences this high-pass exists to keep. A 110x96
    array with a 3-cell sigma is a handful of microseconds either way."""
    radius = max(1, int(round(3.0 * sigma)))
    x = np.arange(-radius, radius + 1, dtype=np.float32)
    k = np.exp(-(x ** 2) / (2.0 * sigma * sigma))
    k /= k.sum()
    out = a.astype(np.float32)
    for axis in (0, 1):
        padded = np.pad(out, [(radius, radius) if i == axis else (0, 0) for i in range(2)],
                        mode="edge")
        stacked = np.stack([np.take(padded, range(i, i + out.shape[axis]), axis=axis)
                            for i in range(2 * radius + 1)], axis=0)
        out = np.tensordot(k, stacked, axes=(0, 0)).astype(np.float32)
    return out


def frame_base(gray01, target_w, target_h, cols, rows, levels, contrast, pivot,
               detail_cells, detail_floor):
    """one frame -> (base raster as uint8, detail term at CELL resolution).

    the detail term is a high-pass computed AT CELL RESOLUTION and kept there.
    It is by construction a low-frequency signal -- its radius is measured in
    cells -- so storing it at the raster's 4x-per-cell resolution would be
    storing an upsample of itself. Keeping it small is what makes holding
    several frames in memory for the bisection affordable."""
    lo, hi = levels
    tone = (1.0 - cover_resize_gray(gray01, target_w, target_h) - lo) / (hi - lo)
    np.clip(tone, 0.0, 1.0, out=tone)

    # THE CONTRAST ENHANCEMENT, and it is the low-frequency half of the pair.
    # A linear stretch about a pivot: below the pivot tone is pushed toward
    # bare paper, above it toward the ramp's dark end. The high-pass below is
    # the HIGH-frequency half and cannot do this job -- it moves a cell
    # relative to its neighbours, so it can put speckle in a grey plane but it
    # cannot make the plane stop being grey.
    #
    # It is here because of what a thumbnail showed. Every earlier version of
    # this pipeline passed on the mean and on the tonal histogram and still
    # died at thumbnail size: a uniform pale haze with the subject barely
    # separable, because the match's tone->ink response is compressive (a
    # uniform cell at 0.34 tone draws only ~0.21 ink) and nothing was pushing
    # the two ends apart before it. Bible 9's first acceptance question is a
    # greyscale thumbnail, and this is the knob that answers it.
    tone -= pivot
    tone *= contrast
    tone += pivot
    np.clip(tone, 0.0, 1.0, out=tone)

    small = np.asarray(
        Image.fromarray(tone.astype(np.float32), mode="F").resize((cols, rows), Image.BOX),
        dtype=np.float32)
    blurred = _gaussian_blur_2d(small, detail_cells)

    # GATED BY THE LOCAL MEAN, and this is not a refinement -- without it the
    # high-pass re-inks the bare paper. A photographic source's "empty"
    # background is not empty: it is compression noise a fraction of a percent
    # off white, and a high-pass does not know the difference between that and
    # an eyelash. Ungated, the first bake of this pipeline covered every square
    # inch of margin in an even wash of `'` and `-` -- uniform marks with no
    # density structure behind them, which is bible 8's "static" exactly, and
    # it ate the airiness that is the whole point of this register.
    #
    # So the detail term is scaled by how much tone its neighbourhood actually
    # has: nothing on bare paper, full strength once there is something to
    # describe. Bible 4.2 makes the same argument for the field ("the idle
    # cloud is NOT noise... random uniform noise is the single most common
    # failure of ASCII web design").
    gate = np.clip(blurred / max(detail_floor, 1e-6), 0.0, 1.0)
    return (tone * 255.0).astype(np.uint8), (small - blurred) * gate


def tone_raster(base_u8, detail_small, gamma, detail_gain, max_ink):
    """apply the bisected exponent, add the detail term back, and cap at the
    ramp's actual dynamic range. Returns ink on the 0..255 scale the disc
    measurement wants.

    THE CEILING IS NOT A STYLE CHOICE, IT IS WHERE THE RAMP ENDS. The densest
    glyph the atlas bakes is 0.337 coverage, and a cell whose six discs all
    read much above that is off the glyph manifold entirely -- every candidate
    is equally far away, so the argmin stops depending on the image and every
    such cell collapses onto the same densest glyph. That is where `QQQQQQQQ`
    comes from, and no amount of tie-breaking fixes it, because at that point
    there genuinely is no information left to break a tie with. Tone above the
    ceiling is not extra darkness; it is discarded contrast.

    Capping it costs nothing real and buys the whole midtone: the exponent
    bisection responds by lifting the mid range to make the mean, which is
    what puts cells in the 0.02-0.15 band the reference is full of and this
    pipeline was empty of.""" 
    h, w = base_u8.shape
    t = np.power(base_u8.astype(np.float32) / 255.0, gamma)
    d = np.asarray(
        Image.fromarray(detail_small, mode="F").resize((w, h), Image.BILINEAR),
        dtype=np.float32)
    t += detail_gain * d
    np.clip(t, 0.0, 1.0, out=t)
    t *= 255.0 * max_ink
    return t


# ---------------------------------------------------------------------------
# the 6-D measurement, batched over a whole frame's grid at once
# ---------------------------------------------------------------------------
def measure_frame_v6(ink255, cols, rows, cell_w, cell_h, disc_masks_flat):
    """cov (rows, cols) and v6 (rows, cols, 6) -- exactly glyphatlas.measure's
    geometry (same DISC_ORDER, same normalized disc positions), just applied
    to every cell of one frame in one vectorized pass instead of one glyph at
    a time."""
    blocks = ink255.reshape(rows, cell_h, cols, cell_w).transpose(0, 2, 1, 3)
    flat = blocks.reshape(rows, cols, cell_h * cell_w)
    cov = flat.mean(axis=2) / 255.0
    v6 = np.empty((rows, cols, 6), dtype=np.float64)
    for k, mask_flat in enumerate(disc_masks_flat):
        v6[:, :, k] = flat[:, :, mask_flat].mean(axis=2) / 255.0 if mask_flat.any() else 0.0
    return cov, v6


# ---------------------------------------------------------------------------
# THE MATCH: 6-D nearest neighbour, plus an airy prior, plus frozen jitter,
# plus hysteresis against the previous frame.
# ---------------------------------------------------------------------------
def build_glyph_bias(ramp, match_cfg):
    """a per-glyph ADDITIVE penalty on squared 6-D distance (bible 3.4's
    families used as registers, weighted for this element).

    additive, not multiplicative, and that is the whole reason it behaves.
    A multiplier does nothing where the distance is already near zero -- an
    exact match stays an exact match no matter what you scale it by -- so it
    would fail to steer in precisely the case that matters. A constant added
    to every candidate's distance decides among NEAR-TIES and is powerless
    against a genuinely better match, which is the behaviour the register
    wants: a cell that really is a dark mass still gets SOLID.

    Scale is calibrated against the ramp's own geometry: the median distance
    from a glyph to its nearest neighbour in this space is 0.102, so
    biasScale 0.02 with coefficients in [-0.35, +0.6] moves things by at most
    ~0.012 -- about a tenth of a typical gap."""
    families = tc.ramp_families()
    fam_of = {}
    for fam, chars in families.items():
        for ch in chars:
            fam_of[ch] = fam

    scale = match_cfg["biasScale"]
    fam_bias = match_cfg["familyBias"]
    w_bias = match_cfg["weightBias"]

    bias = np.zeros(len(ramp["glyphs"]), dtype=np.float64)
    for i, g in enumerate(ramp["glyphs"]):
        f = fam_bias.get(fam_of.get(g["ch"], "MID"), 0.0)
        w = w_bias.get(str(g["w"]), 0.0)
        bias[i] = scale * (f + w)
    return bias


def frozen_jitter(cell_count, seed):
    """bible 3.5: every "random" choice is a stable hash of the cell's
    identity, never a per-frame roll. One draw of the ported mulberry32 per
    cell, seeded from the cell index -- mulberry32 mixes its seed on the first
    call (`a += 0x6D2B79F5` then two rounds), so sequential seeds give
    well-spread first outputs, which is what makes this a hash rather than a
    stream. Computed ONCE for the whole clip, so a cell's tie-break never
    changes between frames: the texture is frozen and the delta encoder is
    not paying for noise."""
    out = np.empty(cell_count, dtype=np.float64)
    for i in range(cell_count):
        out[i] = mulberry32((seed ^ (i + 1)) & 0xFFFFFFFF)()
    return out


def match_frame(v6, cov, axis_max, glyph_v6, glyph_cov, bias, jitter, tie_tol,
                tie_cov_tol, cov_weight, blank_below, blank_gid, prev, change_margin):
    """the SAME rule as src/type/match.js's nearestGlyph -- plain euclidean
    distance in the table's normalized 6-D space -- with the additions the
    airy register needs. Vectorized over every cell against every glyph.

    THE VALUE TERM, and why a pure shape match needed one here. Bible 3.4 is
    right that sorting glyphs by how dark they look is what makes ascii art
    read as halftone, and the 6-D match is what buys the drawn quality. But a
    PHOTOGRAPH's cell is smooth -- all six discs read nearly the same -- and in
    that regime the shape metric has a bias of its own: it prefers glyphs whose
    ink spans the full cell height (`1 l Q $ j 7`) over ones packed into the
    x-height (`a e c w m 9 4`), because a tall glyph is the isotropic one. The
    measured result was a hole in the ramp: with shape alone, 0.0% of cells
    landed anywhere in the 0.15-0.20 ink band while 37% piled up at 0.01-0.02,
    on a reference that is 12.4% and 1.6% there respectively. That is tonal
    banding, and it is visible as banding.

    So shape decides WHICH glyph and value decides HOW DARK, weighted. This is
    not "sort by luminance" -- cov_weight is one term among seven and the six
    shape axes still choose the direction of a stroke. It is the difference
    between a match that draws and a match that draws in the right key.

    Returns (glyph ids as uint8 flat array, the chosen distances)."""
    flat = (v6 / axis_max).reshape(-1, 6)
    d2 = ((flat[:, None, :] - glyph_v6[None, :, :]) ** 2).sum(axis=2)
    d2 += cov_weight * (cov.reshape(-1, 1) - glyph_cov[None, :]) ** 2
    d2 += bias[None, :]

    best = d2.min(axis=1)
    best_ix = d2.argmin(axis=1)

    # FROZEN TIE-BREAK. Everything within tie_tol of the best is eligible; a
    # cell takes the k-th eligible candidate in glyph-id order, where k comes
    # from its frozen draw. Selecting "the k-th true value in each row" without
    # a python loop is a cumsum over the eligibility mask.
    #
    # THE SECOND CONDITION IS NOT OPTIONAL, and leaving it out was a real bug
    # rather than a missing refinement. tie_tol is an absolute distance, and
    # near the ORIGIN of the 6-D space -- which is where every bare cell sits --
    # a dozen light glyphs are within any useful tolerance of the blank one. So
    # the jitter, whose job is texture, was quietly inking the paper: 42% of
    # all cells came out carrying a 0.013-coverage mark, against 1.6% in the
    # reference, and the entire background wore an even wash of `'` and `-`.
    # The picture passed its mean and its tonal histogram and still died at
    # thumbnail size as a uniform pale haze.
    #
    # Bible 3.5 says the jitter picks among "the top-k glyph MATCHES" -- among
    # things that were already near-equivalent. So a candidate must also be
    # within tie_cov_tol of the winner's COVERAGE: the jitter may vary which
    # shape a cell draws, never how dark it is. Texture is its job; tone is the
    # tone curve's.
    cov_gap = np.abs(glyph_cov[None, :] - glyph_cov[best_ix][:, None])
    elig = (d2 <= (best + tie_tol)[:, None]) & (cov_gap <= tie_cov_tol)
    ranks = np.cumsum(elig, axis=1)
    n_elig = ranks[:, -1]
    want = np.minimum((jitter * n_elig).astype(np.int64) + 1, n_elig)
    chosen = np.argmax(elig & (ranks == want[:, None]), axis=1)

    rows_ix = np.arange(d2.shape[0])
    chosen_d2 = d2[rows_ix, chosen]

    # HYSTERESIS. Keep last frame's glyph unless the new pick beats it by a
    # margin. Anti-strobe (bible 8) between baked frames, and the reason the
    # finer grid fits the byte budget at all.
    if prev is not None:
        prev_d2 = d2[rows_ix, prev]
        keep = prev_d2 <= chosen_d2 + change_margin
        chosen = np.where(keep, prev, chosen)
        chosen_d2 = np.where(keep, prev_d2, chosen_d2)

    # BARE PAPER IS A DECISION, NOT A ROUNDING. A cell with this little ink in
    # it is paper, and nothing downstream -- not the prior, not the jitter, not
    # the hysteresis -- gets to put a mark on it. Bible 4.5's register is "lots
    # of bare paper", and half the reference's cells inside the head are empty:
    # the airiness is not what is left over after the marks, it is the thing
    # being drawn.
    blank = cov.reshape(-1) < blank_below
    chosen = np.where(blank, blank_gid, chosen)
    chosen_d2 = np.where(blank, 0.0, chosen_d2)

    return chosen.astype(np.uint8), chosen_d2


def build_palette(gid_frames, glyph_v6, axis_max):
    """the ramp subset this clip actually draws -> (palette, ramp id -> palette
    index lookup). See the module docstring for why the pack is indexed rather
    than storing raw ramp ids: seven bits do not hold 147 glyphs, and the top
    bit is worth more as the fringe flag than as a glyph id the portrait was
    never going to use.

    Ordered by descending usage, so palette[0] is the clip's most common glyph
    -- which makes the palette itself readable as a report on the register
    (tools/check_type.py prints it) rather than an opaque table.

    OVERFLOW is folded, not truncated: if a clip somehow wants more than 128
    distinct glyphs, the rarest are remapped to their nearest surviving
    neighbour in the same normalized 6-D space the match runs in. That is a
    merge between two glyphs the matcher already considered nearly
    interchangeable, so it costs a tie-break, not a tonal step."""
    counts = np.zeros(len(glyph_v6), dtype=np.int64)
    for f in gid_frames:
        counts += np.bincount(f, minlength=len(glyph_v6))
    used = np.flatnonzero(counts)
    order = used[np.argsort(-counts[used], kind="stable")]

    palette = order[:PALETTE_MAX]
    lookup = np.zeros(len(glyph_v6), dtype=np.uint8)
    lookup[palette] = np.arange(len(palette), dtype=np.uint8)

    dropped = order[PALETTE_MAX:]
    if len(dropped):
        kept_v6 = glyph_v6[palette] / axis_max
        d2 = ((glyph_v6[dropped] / axis_max)[:, None, :] - kept_v6[None, :, :]) ** 2
        lookup[dropped] = np.argmin(d2.sum(axis=2), axis=1).astype(np.uint8)
    return palette.astype(int).tolist(), lookup, len(dropped)


# ---------------------------------------------------------------------------
# THE FRINGE (bible 3.3), on the portrait's own scale
# ---------------------------------------------------------------------------
def fringe_flags(cov_grid, threshold, delta, max_fraction):
    """"chromatic ink appears only as a one-cell offset ghost at the edge of a
    dense mass, and covers no more than 4% of the cells in any viewport."

    Mechanism, exactly as the bible states it: a cell whose density clears
    `threshold` ghosts onto any 4-neighbour that is at least `delta` lighter,
    and it is the LIGHTER NEIGHBOUR that gets painted -- the offset ghost of a
    two-colour print that did not register, never a fill on the mass itself.

    The budget is enforced BY CONSTRUCTION rather than checked afterwards:
    candidates are ranked by the density step across the edge (the strongest
    misregistration first, which is also the one a print would actually show)
    and the tail is dropped until the cap holds. So this function cannot
    return an over-budget frame, whatever the thresholds are set to."""
    rows, cols = cov_grid.shape
    strength = np.zeros((rows, cols), dtype=np.float64)
    dense = cov_grid >= threshold

    # for each of the four directions: `src` is the dense cell, `dst` is the
    # neighbour one cell away that may take the ghost.
    def consider(src_sel, dst_sel):
        step = cov_grid[src_sel] - cov_grid[dst_sel]
        hit = dense[src_sel] & (step >= delta)
        np.maximum(strength[dst_sel], np.where(hit, step, 0.0), out=strength[dst_sel])

    full = slice(None)
    consider((slice(0, rows - 1), full), (slice(1, rows), full))   # ghost below
    consider((slice(1, rows), full), (slice(0, rows - 1), full))   # ghost above
    consider((full, slice(0, cols - 1)), (full, slice(1, cols)))   # ghost right
    consider((full, slice(1, cols)), (full, slice(0, cols - 1)))   # ghost left

    # A GHOST ON BARE PAPER IS NOT A GHOST. The rule paints the lighter
    # NEIGHBOUR in a fringe ink -- but "in an ink" only means anything if that
    # cell has a glyph to ink. Flagging an empty cell paints nothing, and the
    # cost of not excluding them is not cosmetic: they spend the 4% budget.
    # Measured before this line existed, the baker reported a flat 2.00% of
    # cells flagged while the browser drew 1.44%, because a quarter of the
    # budget was being handed to cells that render as paper either way. The
    # number has to mean what it says, so candidates must carry ink.
    flags = (strength > 0.0) & (cov_grid > 0.0)
    budget = int(max_fraction * rows * cols)
    n = int(flags.sum())
    if n > budget:
        # keep the strongest `budget` candidates. argpartition gives them
        # without a full sort.
        vals = np.where(flags.ravel(), strength.ravel(), -1.0)
        keep = np.argpartition(vals, -budget)[-budget:] if budget > 0 else np.empty(0, dtype=int)
        flags = np.zeros(rows * cols, dtype=bool)
        flags[keep] = True
        flags = flags.reshape(rows, cols)
    return flags


# ---------------------------------------------------------------------------
# delta pack / unpack -- src/type/portrait.js's applyDelta is the JS mirror
# ---------------------------------------------------------------------------
def pack_frames(cell_grids, cols, rows):
    cell_count = cols * rows
    assert cell_count <= 0xFFFF, "portrait grid exceeds a uint16 cell index"
    flat = [np.asarray(g, dtype=np.uint8).reshape(-1) for g in cell_grids]
    for f in flat:
        assert f.shape[0] == cell_count

    blocks = [flat[0].tobytes()]
    offsets = [0]
    total = len(blocks[0])
    prev = flat[0]
    for f in flat[1:]:
        changed = np.flatnonzero(f != prev)
        assert len(changed) <= 0xFFFF, "more changed cells in one frame than a uint16 count allows"
        parts = [struct.pack("<H", len(changed))]
        for idx in changed:
            parts.append(struct.pack("<HB", int(idx), int(f[idx])))
        block = b"".join(parts)
        offsets.append(total)
        blocks.append(block)
        total += len(block)
        prev = f

    packed = b"".join(blocks)
    assert total == len(packed)
    header = {
        "version": VERSION,
        "grid": [cols, rows],
        "frames": len(flat),
        "fps": tc.portrait_fps(),
        "byteLength": len(packed),
        "offsets": offsets
    }
    return header, packed


def decode_all(header, packed):
    """the reference decoder. Cumulative: frame 0 is raw, every later frame
    is the previous frame with its delta applied -- there is no other
    keyframe, so this always replays from the start. That is fine here (an
    authoring-time / gate-time tool decoding at most a few dozen frames); the
    runtime player (src/type/portrait.js) instead advances one frame at a
    time and never re-decodes from scratch.

    Returns the RAW cell bytes, fringe bit and all -- masking is the caller's
    job, the same way it is the renderer's."""
    cols, rows = header["grid"]
    cell_count = cols * rows
    n = header["frames"]
    offsets = header["offsets"]
    cur = np.frombuffer(packed, dtype=np.uint8, count=cell_count, offset=offsets[0]).copy()
    frames = [cur.copy()]
    for i in range(1, n):
        off = offsets[i]
        count = struct.unpack_from("<H", packed, off)[0]
        o = off + 2
        for _ in range(count):
            idx, gid = struct.unpack_from("<HB", packed, o)
            o += 3
            cur[idx] = gid
        frames.append(cur.copy())
    return frames


# ---------------------------------------------------------------------------
# the tonal shape -- the measurement the mean cannot make (siteConfig
# portrait.tonalGate, and the reference's own numbers)
# ---------------------------------------------------------------------------
def tonal_stats(cov_flat):
    cov = np.asarray(cov_flat, dtype=np.float64)
    return {
        "meanCoverage": float(cov.mean()),
        "emptyFraction": float((cov < EMPTY).mean()),
        "midtoneFraction": float(((cov >= MIDTONE_LO) & (cov < MIDTONE_HI)).mean()),
        "heavyFraction": float((cov >= HEAVY).mean())
    }


# ---------------------------------------------------------------------------
# previews -- so a regression is visible, same reasoning as check_type.py's
# ---------------------------------------------------------------------------
def crop_cell(atlas, g):
    u0, v0, u1, v1 = g["uv"]
    h, w = atlas.shape
    x0, x1 = round(u0 * w), round(u1 * w)
    y0, y1 = round(v0 * h), round(v1 * h)
    return atlas[y0:y1, x0:x1]


def _hex_rgb(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def render_frame_rgb(cells_flat, cols, rows, ramp, atlas, palette, paper, ink, fringe_inks):
    """ON PAPER, IN INK -- not white-on-black.

    The previous preview drew white glyphs on a black canvas, which is the
    photographic negative of the thing being designed. bible 9's acceptance
    test is "screenshot any frame, in greyscale, at thumbnail size -- is it a
    good poster", and you cannot run that test on an inverted image: mass and
    sparsity read as each other's opposite. So the preview is now the real two
    inks on the real warm bone, with the chromatic fringe on the flagged cells.

    Which of the two fringe inks a flagged cell takes is a stable function of
    the cell index, per bible 3.3 -- the same rule the renderer will use, so
    the preview is showing the fringe the site will actually print."""
    cw, ch = ramp["cell"]
    glyphs = ramp["glyphs"]
    canvas = np.empty((rows * ch, cols * cw, 3), dtype=np.float64)
    canvas[:] = paper
    cache = {}
    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            byte = int(cells_flat[idx])
            gid = palette[byte & GLYPH_MASK]
            crop = cache.get(gid)
            if crop is None:
                crop = crop_cell(atlas, glyphs[gid]).astype(np.float64) / 255.0
                cache[gid] = crop
            if crop.max() <= 0.0:
                continue
            colour = ink
            if byte & FRINGE_BIT:
                colour = fringe_inks[idx & 1]
            a = crop[:, :, None]
            tile = canvas[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw, :]
            tile *= (1.0 - a)
            tile += a * colour
    return np.clip(canvas, 0, 255).astype(np.uint8)


def write_frame_previews(header, packed, ramp, atlas, out_dir=PREVIEW_DIR):
    frames = decode_all(header, packed)
    n = header["frames"]
    cols, rows = header["grid"]
    palette = header["palette"]
    paper = _hex_rgb("#F4F2EC")
    ink = _hex_rgb("#12100F")
    fringe_inks = [_hex_rgb("#E0447A"), _hex_rgb("#2B6FE0")]
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for label, i in (("first", 0), ("mid", n // 2), ("last", n - 1)):
        rgb = render_frame_rgb(frames[i], cols, rows, ramp, atlas, palette,
                               paper, ink, fringe_inks)
        img = Image.fromarray(rgb, mode="RGB")
        path = os.path.join(out_dir, f"portrait_{label}.png")
        img.save(path)
        written.append(path)
        if label == "first":
            # BIBLE 9, QUESTION 1, made runnable: greyscale, thumbnail. If the
            # composition dies here the design is wrong and no amount of
            # looking at the full-size render will tell you.
            thumb = img.convert("L").resize((cols * 2, rows * 2), Image.LANCZOS)
            tp = os.path.join(out_dir, "portrait_thumb.png")
            thumb.save(tp)
            written.append(tp)
    return written


# ---------------------------------------------------------------------------
def build(input_path=None, verbose=True):
    input_path = input_path or DEFAULT_INPUT
    ramp = json.load(open(RAMP_JSON))
    glyph_v6 = np.array([g["v6"] for g in ramp["glyphs"]], dtype=np.float64)
    glyph_cov = np.array([g["cov"] for g in ramp["glyphs"]], dtype=np.float64)
    axis_max = np.array(ramp.get("axisMax") or [1.0] * len(glyph_v6[0]), dtype=np.float64)
    cols, rows = tc.portrait_grid()
    fps = tc.portrait_fps()
    n_frames = max(1, round(fps * tc.portrait_target_seconds()))
    coverage_target = tc.portrait_coverage_target()
    tone_cfg = tc.portrait_tone()
    match_cfg = tc.portrait_match()
    fringe_cfg = tc.portrait_fringe()
    crop_cfg = tc.portrait_crop()
    base_w, base_h = tc.base_cell_px()
    cell_w, cell_h = base_w * SUPERSAMPLE, base_h * SUPERSAMPLE
    target_w, target_h = cols * cell_w, rows * cell_h

    disc_masks = ga.build_disc_masks(cell_w, cell_h)
    disc_masks_flat = [disc_masks[name].reshape(-1) for name in ga.DISC_ORDER]

    bias = build_glyph_bias(ramp, match_cfg)
    jitter = frozen_jitter(cols * rows, match_cfg["jitterSeed"])
    # the lightest glyph in the ramp IS the blank one -- glyphatlas bakes the
    # space character at every weight, all three measuring 0.0 coverage. Found
    # by measurement rather than by assuming an id, for the same reason nothing
    # else here hardcodes a ramp index.
    blank_gid = int(np.argmin(glyph_cov))

    if verbose:
        print(f"source: {os.path.relpath(input_path, ROOT)}")
        print(f"grid {cols}x{rows} ({cols * rows} cells), {n_frames} frames @ {fps}fps, "
              f"cell raster {cell_w}x{cell_h}")

    src_grays = load_source_frames(input_path, n_frames, fps, tc.portrait_source_speed())
    src_grays = [crop_source(g, crop_cfg["zoom"], crop_cfg["centerX"], crop_cfg["centerY"])
                 for g in src_grays]

    sample_n = min(CALIBRATION_FRAMES, len(src_grays))
    sample_idx = np.linspace(0, len(src_grays) - 1, num=sample_n).round().astype(int)
    levels = measure_levels([src_grays[i] for i in sample_idx],
                            tone_cfg["blackPointFrac"], tone_cfg["whitePointPct"])

    # cached once for the whole bisection: the leveled raster (uint8) plus the
    # cell-resolution detail term. Neither depends on the exponent.
    cal = [frame_base(src_grays[i], target_w, target_h, cols, rows, levels,
                      tone_cfg["contrast"], tone_cfg["contrastPivot"],
                      tone_cfg["detailCells"], tone_cfg["detailFloor"])
           for i in sample_idx]

    def rendered_coverage(gamma):
        """the clip's mean ink AS IT WILL BE DRAWN -- match included. This is
        the whole reason the exponent is bisected against a full match rather
        than against the tone signal: ink->glyph is compressive (the densest
        glyph in the ramp is 0.337 coverage, not 1.0), so a target set on the
        tone signal is not the number the reference can be compared on. The
        old bake hit 0.10 of tone and drew 0.058 of ink."""
        total = []
        for base_u8, detail_small in cal:
            ink255 = tone_raster(base_u8, detail_small, gamma, tone_cfg["detailGain"],
                                 tone_cfg["maxInk"])
            cov, v6 = measure_frame_v6(ink255, cols, rows, cell_w, cell_h, disc_masks_flat)
            gids, _ = match_frame(v6, cov, axis_max, glyph_v6, glyph_cov, bias, jitter,
                                  match_cfg["tieTolerance"], match_cfg["tieCovTolerance"],
                                  match_cfg["covWeight"], match_cfg["blankBelow"], blank_gid,
                                  None, 0.0)
            total.append(float(glyph_cov[gids].mean()))
        return float(np.mean(total))

    # monotone DECREASING in gamma over [0,1] tone (a bigger exponent is
    # darker paper), so plain bisection converges without a derivative --
    # same shape of argument as fieldMath.calibrateGamma's.
    lo, hi = 0.04, 16.0
    for _ in range(20):
        mid = (lo + hi) / 2
        if rendered_coverage(mid) > coverage_target:
            lo = mid
        else:
            hi = mid
    gamma = (lo + hi) / 2
    del cal

    if verbose:
        print(f"  levels [{levels[0]:.4f}, {levels[1]:.4f}], calibrated exponent {gamma:.4f}")

    # THE BAKE, streamed one frame at a time -- the full-supersample raster for
    # this grid is ~14 MB, and holding all 48 of them at once (which the first
    # version did) is most of a gigabyte for no reason: nothing downstream of
    # the match ever looks at a raster again.
    gid_frames = []
    prev = None
    for gray in src_grays:
        base_u8, detail_small = frame_base(gray, target_w, target_h, cols, rows, levels,
                                           tone_cfg["contrast"], tone_cfg["contrastPivot"],
                                           tone_cfg["detailCells"], tone_cfg["detailFloor"])
        ink255 = tone_raster(base_u8, detail_small, gamma, tone_cfg["detailGain"],
                                 tone_cfg["maxInk"])
        cov, v6 = measure_frame_v6(ink255, cols, rows, cell_w, cell_h, disc_masks_flat)
        gids, _ = match_frame(v6, cov, axis_max, glyph_v6, glyph_cov, bias, jitter,
                              match_cfg["tieTolerance"], match_cfg["tieCovTolerance"],
                              match_cfg["covWeight"], match_cfg["blankBelow"], blank_gid,
                              prev, match_cfg["changeMargin"])
        prev = gids
        gid_frames.append(gids)

    palette, lookup, folded = build_palette(gid_frames, glyph_v6, axis_max)
    palette_cov = glyph_cov[np.asarray(palette, dtype=int)]

    # the fringe and the tonal stats both read the FINAL, post-palette
    # coverage. Doing it in this order rather than during the match is what
    # keeps them honest: a folded glyph is a slightly different glyph, and a
    # gate that measured the pre-fold grid would be reporting a picture that
    # was never written.
    cell_grids = []
    cov_pool = []
    fringe_counts = []
    for gids in gid_frames:
        pix = lookup[gids]
        # the fringe reads the RENDERED coverage, not the tone signal: the
        # bible's rule is about how dark a CELL ends up, which is a property of
        # the glyph that got picked. It also means the fringe inherits the
        # match's hysteresis for free and does not flicker on its own.
        rendered = palette_cov[pix].reshape(rows, cols)
        cov_pool.append(rendered.ravel())
        flags = fringe_flags(rendered, fringe_cfg["threshold"], fringe_cfg["delta"],
                             fringe_cfg["maxCellFraction"])
        fringe_counts.append(int(flags.sum()))
        cell_grids.append(pix | (flags.ravel().astype(np.uint8) * FRINGE_BIT))

    header, packed = pack_frames(cell_grids, cols, rows)
    header["refCellPx"] = [base_w, base_h]
    header["glyphMask"] = GLYPH_MASK
    header["fringeBit"] = FRINGE_BIT
    header["palette"] = palette
    header["gamma"] = round(float(gamma), 6)
    header["levels"] = [round(levels[0], 6), round(levels[1], 6)]
    stats = tonal_stats(np.concatenate(cov_pool))
    for k, v in stats.items():
        header[k] = round(v, 6)
    header["fringeCellFraction"] = round(float(np.mean(fringe_counts)) / (cols * rows), 6)

    # SELF-VERIFY before anything touches disk: decode what was just packed
    # and assert it matches the exact grids that went in. A pack that fails
    # this is never written -- see the module docstring on why check_type.py
    # still redoes an independent version of this from the shipped files.
    decoded = decode_all(header, packed)
    truth = [np.asarray(g, dtype=np.uint8).reshape(-1) for g in cell_grids]
    for i, (d, t) in enumerate(zip(decoded, truth)):
        if not np.array_equal(d, t):
            raise RuntimeError(f"portrait pack self-check failed decoding frame {i}")

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w") as fh:
        json.dump(header, fh, indent=1)
    with open(OUT_BIN, "wb") as fh:
        fh.write(packed)

    atlas = np.asarray(Image.open(RAMP_PNG).convert("L"), dtype=np.float64)
    previews = write_frame_previews(header, packed, ramp, atlas)

    if verbose:
        kb = len(packed) / 1024
        gate = tc.portrait_tonal_gate()
        print(f"wrote {os.path.relpath(OUT_JSON, ROOT)}")
        print(f"wrote {os.path.relpath(OUT_BIN, ROOT)}  {kb:.1f} KB "
              f"(budget {tc.portrait_max_bytes() / 1024:.0f} KB)")
        print(f"  mean rendered coverage {stats['meanCoverage']:.4f} "
              f"(target {coverage_target}; reference 0.0535)")
        print(f"  empty      {stats['emptyFraction']:.3f}  "
              f"(<= {gate['emptyMax']}; reference 0.601)")
        print(f"  midtone    {stats['midtoneFraction']:.3f}  "
              f"(>= {gate['midtoneMin']}; reference 0.211)")
        print(f"  heavy      {stats['heavyFraction']:.3f}  "
              f"(<= {gate['heavyMax']}; reference 0.002)")
        print(f"  fringe     {header['fringeCellFraction']:.4f} of cells "
              f"(<= {fringe_cfg['maxCellFraction']}; bible ceiling 0.04)")
        print(f"  palette    {len(palette)} of {len(ramp['glyphs'])} ramp glyphs"
              + (f", {folded} rare ones folded into their nearest" if folded else ""))
        for p in previews:
            print("  wrote", os.path.relpath(p, ROOT))

    return header, packed


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("input", nargs="?", default=None,
                   help=f"still image or animated gif (default: "
                        f"{os.path.relpath(DEFAULT_INPUT, ROOT)}, a placeholder "
                        f"until the real clip arrives)")
    args = p.parse_args()
    build(args.input)
    return 0


if __name__ == "__main__":
    sys.exit(main())
