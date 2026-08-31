"""mulberry32.py -- bit-exact python port of src/utils/math.js's mulberry32.

this is what lets tools/gen_match_fixture.py generate the SAME 500 pseudorandom
6-D vectors the js test regenerates at test time (test/type.test.js imports the
real mulberry32 from src/utils/math.js with the same seed): one RNG, ported
once, verified once, instead of shipping a second source of truth for random
numbers that could quietly drift from the js one.

ported term-for-term from the js, including the parts that look redundant
(the `a |= 0` truncation, the double use of the pre-update `t`). javascript's
`>>>` is an UNSIGNED right shift and `|`, `^`, `+` on numbers used as bitwise
ops operate on the low 32 bits as SIGNED int32 -- python ints don't wrap, so
every arithmetic step that js would truncate has to be masked back to int32/
uint32 explicitly, in the same order js evaluates it in.

verified against the real mulberry32() for multiple seeds before this file was
relied on for anything.
"""


def _to_int32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x


def _to_uint32(x):
    return x & 0xFFFFFFFF


def _imul(a, b):
    """Math.imul: 32-bit integer multiply, wrapping like C, returning int32."""
    return _to_int32((_to_uint32(a) * _to_uint32(b)) & 0xFFFFFFFF)


def mulberry32(seed):
    """returns a zero-arg callable that yields the same stream as the js
    mulberry32(seed) -- floats in [0, 1)."""
    state = {"a": _to_uint32(seed)}

    def next_value():
        a = _to_int32(state["a"])
        a = _to_int32(a + 0x6D2B79F5)
        t = _imul(a ^ (_to_uint32(a) >> 15), 1 | a)
        # the js `t = (t + imul(...)) ^ t` reads the PRE-update t twice on the
        # right-hand side before reassigning -- python evaluates the whole
        # expression before binding too, so writing it in one line is enough
        # to get the same order; splitting it into two statements would use
        # the wrong (already updated) t on the second read.
        t = _to_int32(t + _imul(t ^ (_to_uint32(t) >> 7), 61 | t)) ^ t
        t = _to_int32(t)
        state["a"] = a
        return _to_uint32(t ^ (_to_uint32(t) >> 14)) / 4294967296.0

    return next_value


if __name__ == "__main__":
    # quick self-check: known-good values from `node -e` against the real
    # mulberry32(12345), first 3 draws.
    r = mulberry32(12345)
    got = [r() for _ in range(3)]
    want = [0.9797282677609473, 0.3067522644996643, 0.484205421525985]
    assert all(abs(g - w) < 1e-15 for g, w in zip(got, want)), (got, want)
    print("mulberry32 port matches the js reference")
