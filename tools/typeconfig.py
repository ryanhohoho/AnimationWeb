"""typeconfig.py -- read the numbers tools/glyphatlas.py and tools/check_type.py
both need out of src/config/siteConfig.js, the same way check_mew.py's cfg_num()
reads rigConfig.js: by regex over the source, not by running a JS parser. the
config is the single source of truth (see siteConfig.js's own header); this
module exists only so two python tools don't duplicate the regex.
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE_CFG = os.path.join(ROOT, "src", "config", "siteConfig.js")


def _src():
    return open(SITE_CFG).read()


def _js_string(name, src=None):
    """pull a `name: "..."` js string literal out of the source and unescape
    it. the ramp families are the only strings this needs, and their only
    escape is \\" (siteConfig's SPARSE family embeds a literal double quote),
    so python's unicode_escape codec -- run only on the already-isolated
    literal, never on the whole file -- is exactly enough and no more."""
    src = src or _src()
    m = re.search(rf'{name}:\s*"((?:[^"\\]|\\.)*)"', src)
    if not m:
        raise ValueError(f"could not find {name!r} in {SITE_CFG}")
    return m.group(1).encode("utf-8").decode("unicode_escape")


def _js_int(name, src=None):
    src = src or _src()
    m = re.search(rf'\b{name}:\s*(-?[0-9]+)', src)
    if not m:
        raise ValueError(f"could not find {name!r} in {SITE_CFG}")
    return int(m.group(1))


def ramp_families():
    """the four named glyph families, in the bible's order. INVERT is not a
    glyph set (it is any glyph on a filled cell) so it is not here."""
    src = _src()
    return {
        "SPARSE": _js_string("SPARSE", src),
        "MID": _js_string("MID", src),
        "DENSE": _js_string("DENSE", src),
        "SOLID": _js_string("SOLID", src),
    }


def ramp_charset():
    """every glyph the atlas must render, deduped, in a stable sorted order.
    stable order matters: it is what makes glyphatlas.py's packing and
    match.js's brute-force scan order reproducible run to run."""
    fams = ramp_families()
    chars = set()
    for s in fams.values():
        chars.update(s)
    return sorted(chars)


def base_cell_px():
    """the bible's reference cell (3.1), measured at the 1440px breakpoint.
    the atlas cell is this shape scaled up by an integer factor -- see
    glyphatlas.py -- so the baked glyphs share the exact aspect ratio the
    on-screen lattice is quantized to, not an approximation of it."""
    src = _src()
    m = re.search(r'baseCellPx:\s*\{\s*w:\s*(\d+)\s*,\s*h:\s*(\d+)\s*\}', src)
    if not m:
        raise ValueError("could not find grid.baseCellPx in " + SITE_CFG)
    return int(m.group(1)), int(m.group(2))


def shape_dims():
    return _js_int("shapeDims")


def cache_bits_per_axis():
    return _js_int("cacheBitsPerAxis")


def _block(name, src=None):
    """the inner text of a `name: { ... }` block, found by brace DEPTH rather
    than a single regex -- siteConfig nests object literals (portrait.grid
    inside portrait, for instance), and some leaf key names are reused across
    blocks (`coverageTarget` exists both on field.weather and on portrait).
    a whole-file regex for a bare key name would silently pick up the wrong
    one; scoping the search to this block first is what tools/portrait.py's
    readers below rely on to get the right number."""
    src = src or _src()
    m = re.search(rf'\b{name}:\s*\{{', src)
    if not m:
        raise ValueError(f"could not find {name!r} block in {SITE_CFG}")
    start = m.end() - 1
    depth = 0
    for i in range(start, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[start + 1:i]
    raise ValueError(f"unbalanced braces in {name!r} block in {SITE_CFG}")


def portrait_block():
    return _block("portrait")


def portrait_grid():
    """cols, rows of the portrait's own fixed lattice (bible 4.5)."""
    b = portrait_block()
    m = re.search(r'grid:\s*\{\s*cols:\s*(\d+)\s*,\s*rows:\s*(\d+)\s*\}', b)
    if not m:
        raise ValueError("could not find portrait.grid in " + SITE_CFG)
    return int(m.group(1)), int(m.group(2))


def portrait_fps():
    return _js_int("fps", portrait_block())


def portrait_max_bytes():
    """maxBytes is `200 * 1024` in siteConfig, not a bare literal -- _js_int's
    plain-integer regex does not match it. captured as a small arithmetic
    expression and validated (digits/whitespace/+-*/() only) before eval,
    which is the narrowest thing that can read "N * M" without hand-parsing
    it or duplicating the number as a second literal that could drift from
    the one siteConfig.js actually ships."""
    b = portrait_block()
    m = re.search(r'\bmaxBytes:\s*([^,\n]+)', b)
    if not m:
        raise ValueError("could not find portrait.maxBytes in " + SITE_CFG)
    expr = m.group(1).strip()
    if not re.fullmatch(r"[0-9\s*+\-/().]+", expr):
        raise ValueError(f"unsafe maxBytes expression {expr!r} in {SITE_CFG}")
    return int(eval(expr, {"__builtins__": {}}, {}))


def portrait_target_seconds():
    return _js_int("targetSeconds", portrait_block())


def portrait_coverage_target():
    b = portrait_block()
    m = re.search(r'\bcoverageTarget:\s*([0-9.]+)', b)
    if not m:
        raise ValueError("could not find portrait.coverageTarget in " + SITE_CFG)
    return float(m.group(1))


# --- the look-pass numbers (siteConfig.portrait.{tone,match,fringe,tonalGate}) ---
#
# every one of these is scoped to portrait_block() first, for the reason
# _block's own docstring gives: `fringe`, `threshold`, `delta` and
# `maxCellFraction` all exist at the TOP level of siteConfig too (the field's
# own fringe rule), on a different scale, and a whole-file regex for any of
# them would silently read the wrong number. this is exactly the bug the
# portrait's fringe block exists to avoid, so it would be a poor one to
# reintroduce in the reader.
def _float_in(block, name, cfg_path):
    m = re.search(rf'\b{name}:\s*(-?[0-9.]+)', block)
    if not m:
        raise ValueError(f"could not find {cfg_path} in {SITE_CFG}")
    return float(m.group(1))


def _float_map(block, name, cfg_path):
    """a `name: { KEY: num, ... }` literal -> {str: float}. keys may be bare
    identifiers or quoted (weightBias's are quoted, because `200:` is not a
    legal bare js key)."""
    inner = _block(name, block)
    out = {}
    for k, v in re.findall(r'["\']?([A-Za-z0-9_]+)["\']?\s*:\s*(-?[0-9.]+)', inner):
        out[k] = float(v)
    if not out:
        raise ValueError(f"could not read any entries from {cfg_path} in {SITE_CFG}")
    return out


def portrait_tone():
    b = _block("tone", portrait_block())
    return {k: _float_in(b, k, f"portrait.tone.{k}")
            for k in ("blackPointFrac", "whitePointPct", "detailCells",
                      "detailGain", "detailFloor", "maxInk",
                      "contrast", "contrastPivot")}


def portrait_match():
    b = _block("match", portrait_block())
    out = {k: _float_in(b, k, f"portrait.match.{k}")
           for k in ("biasScale", "tieTolerance", "changeMargin", "covWeight",
                     "tieCovTolerance", "blankBelow")}
    out["familyBias"] = _float_map(b, "familyBias", "portrait.match.familyBias")
    out["weightBias"] = _float_map(b, "weightBias", "portrait.match.weightBias")
    m = re.search(r'\bjitterSeed:\s*(0[xX][0-9a-fA-F]+|-?[0-9]+)', b)
    if not m:
        raise ValueError("could not find portrait.match.jitterSeed in " + SITE_CFG)
    out["jitterSeed"] = int(m.group(1), 0)
    return out


def portrait_source_speed():
    b = portrait_block()
    m = re.search(r'\bsourceSpeed:\s*([0-9.]+)', b)
    if not m:
        raise ValueError("could not find portrait.sourceSpeed in " + SITE_CFG)
    return float(m.group(1))


def portrait_crop():
    b = _block("crop", portrait_block())
    return {k: _float_in(b, k, f"portrait.crop.{k}")
            for k in ("zoom", "centerX", "centerY")}


def portrait_fringe():
    b = _block("fringe", portrait_block())
    return {k: _float_in(b, k, f"portrait.fringe.{k}")
            for k in ("threshold", "delta", "maxCellFraction")}


def portrait_tonal_gate():
    b = _block("tonalGate", portrait_block())
    return {k: _float_in(b, k, f"portrait.tonalGate.{k}")
            for k in ("midtoneMin", "heavyMax", "emptyMax")}
