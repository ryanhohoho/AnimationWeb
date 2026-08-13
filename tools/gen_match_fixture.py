"""gen_match_fixture.py -- the python side of the js/python matcher
cross-check.

    python3 tools/gen_match_fixture.py

generates 500 pseudorandom 6-D vectors with the bit-exact python port of
mulberry32 (tools/mulberry32.py, verified against the real
src/utils/math.js -- see that file's docstring), and for each one computes
the full distance-ranked list of ramp glyphs -- same euclidean distance, same
glyph-array iteration order, same tie-break as src/type/match.js's
nearestGlyph() -- so a rank, not just a single pick, is available to check
against.

writes test/fixtures/matchRef.json, which test/type.test.js reads directly:
it regenerates the SAME 500 vectors at test time (mulberry32(seed) from the
real src/utils/math.js, same seed), so the fixture only has to ship the
python-computed RANKS, not a second copy of the vectors that could drift out
of sync with what the js side actually draws. the test asserts its own
regenerated vectors equal the fixture's before trusting the ranks at all --
see "sanity: the fixture's vectors are what mulberry32(seed) actually
produces" in test/type.test.js.

why a fixture instead of shelling out to python from the test: type.test.js
runs headless with plain `node test/type.test.js`, no python on the test
machine required. the fixture is the frozen output of a measurement, exactly
like tools/rig_mew.py's tools/joints.json.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from mulberry32 import mulberry32  # noqa: E402

RAMP_JSON = os.path.join(ROOT, "src", "assets", "ramp.json")
OUT = os.path.join(ROOT, "test", "fixtures", "matchRef.json")

SEED = 424242
N = 500
DIMS = 6
TOP_K = 5   # ranks beyond "off by one" are never checked; 5 is generous
            # headroom to see the shape of a mismatch when debugging one


def nearest_rank(v6, glyphs, k=TOP_K):
    """every glyph's distance to v6, sorted ascending, ties broken by
    array order (stable sort) -- the exact rule src/type/match.js's
    nearestGlyph() uses, so rank 0 here IS what an exact match must equal."""
    scored = []
    for i, g in enumerate(glyphs):
        d2 = sum((v6[d] - g["v6"][d]) ** 2 for d in range(DIMS))
        scored.append((d2, i))
    scored.sort(key=lambda t: (t[0], t[1]))   # (t[0], t[1]): distance first,
                                              # then array index -- python's
                                              # sort is stable so this is
                                              # redundant, spelled out anyway
                                              # so the tie-break rule is not
                                              # implicit
    out = []
    for d2, i in scored[:k]:
        g = glyphs[i]
        out.append({"idx": i, "ch": g["ch"], "w": g["w"], "dist": d2 ** 0.5})
    return out


def build():
    ramp = json.load(open(RAMP_JSON))
    glyphs = ramp["glyphs"]
    rnd = mulberry32(SEED)
    cases = []
    for _ in range(N):
        v6 = [rnd() for _ in range(DIMS)]
        cases.append({"vector": v6, "rank": nearest_rank(v6, glyphs)})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump({"seed": SEED, "n": N, "dims": DIMS, "topK": TOP_K,
                   "cases": cases}, fh, indent=1)
    print(f"wrote {os.path.relpath(OUT, ROOT)}  ({N} cases, seed {SEED})")


if __name__ == "__main__":
    build()
