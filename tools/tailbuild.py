"""tailbuild.py

delete the meshy tail outright and GROW A NEW ONE out of the butt.

WHY NOT KEEP THE SOURCE TAIL
----------------------------
the generated tail leaves the model's RIGHT HIP -- the ring it is welded to sits
at (0.60, 0.26, -0.16) in normalised space, a third of the body's width off the
midline -- and sweeps out sideways to x = 1.48. v4.1 tried to rescue it by
re-routing the tube along a new centreline (tools/legacy/tailshape.py), which
fixed the DIRECTION but could not move the attachment: the tail still grew out
of the hip, so a chunk of it read as part of the body and the whole thing hung
off-centre. it was also a lumpy tube -- 53 vertices spread over 64 rings, some
rings holding a single vertex -- so bending it at all produced facets and
pinches no solver can hide.

so this module throws it away. the hole in the hip is capped and rounded back
into the rump, and a NEW tail is generated: a swept tube on an authored
centreline, leaving the midline of the butt, with even rings, a smooth taper and
the bulb tip the character is drawn with. it is a separate CLOSED shell that
plugs into the body -- no boolean, no shared vertices, nothing of it weighted to
the trunk -- which is what "cut it off right at the butt" actually means.

everything is in mewparts' NORMALISED space: x = 0 is the mirror plane, y = 0 is
the soles, the model is 1.75 tall, +z is the direction the face points.
"""

import numpy as np

# --- where it leaves the body ----------------------------------------------
# the socket is found by shooting a ray out of the trunk along SOCKET_DIR and
# taking the last surface it crosses; it is not a literal coordinate, so it
# survives the source mesh moving. straight back and a little low = the butt.
SOCKET_DIR = (0.0, -0.30, -1.0)
SOCKET_FROM = 0.42        # the ray starts this far up the trunk (0 = its floor,
                          # 1 = the neck), on the midline

# --- the shape --------------------------------------------------------------
LENGTH = 1.58             # arc length of the visible tail, model height is 1.75
SIDES = 7                 # a 7-gon reads round at 150 px and stays odd, so no
                          # pair of facets is ever exactly edge-on together
RINGS = 22
PLUG = 0.20               # how far the root reaches back INTO the body
ROOT_FLARE = 1.25         # the plug's ring radius, in shaft radii, so the socket
                          # cannot be seen through even at full deflection

# radius profile, (arc fraction, radius). a long thin shaft and the big teardrop
# club the character is drawn with. the last key is not zero: the tip is closed
# by a cap ring, and a cap on a zero-radius ring is a degenerate fan.
RADIUS = [(0.00, 0.088), (0.08, 0.076), (0.35, 0.064), (0.62, 0.062),
          (0.74, 0.080), (0.84, 0.135), (0.92, 0.152), (0.97, 0.128),
          (1.00, 0.052)]

# centreline direction keys, (arc fraction, unit direction). out of the butt
# going back and down, then a long sweep OUT TO THE SIDE and up, so the club
# floats beside and behind the shoulders.
#
# THE SIDEWAYS COMPONENT IS NOT DECORATION. the camera looks at this character
# head-on down +z, so a tail that only goes backward and up is hidden behind the
# body at every moment it is not flying -- which is exactly what the first
# version of this file shipped: a beautiful tail nobody could see while mew was
# hovering. it needs to clear the torso's silhouette on screen, and swinging it
# out to +x is what does that while keeping the attachment on the midline.
DIRS = [
    (0.00, (0.30, -0.30, -0.90)),
    (0.20, (0.85, +0.15, -0.50)),
    (0.45, (0.75, +0.63, -0.20)),
    (0.70, (0.35, +0.92, +0.15)),
    (1.00, (-0.10, +0.90, +0.42)),
]

# rings are packed toward the club: `t**RING_BIAS` in arc fraction. the shaft is
# straight enough to survive coarse rings, the bulb is not.
RING_BIAS = 1.35


# ---------------------------------------------------------------------------
def _unit(v):
    v = np.asarray(v, float)
    return v / max(float(np.linalg.norm(v)), 1e-12)


def boundary_loops(tris):
    """ordered vertex loops of the open boundary of a welded triangle set."""
    count = {}
    for a, b, c in tris:
        for u, v in ((a, b), (b, c), (c, a)):
            k = (min(int(u), int(v)), max(int(u), int(v)))
            count[k] = count.get(k, 0) + 1
    half = {}
    for a, b, c in tris:
        for u, v in ((a, b), (b, c), (c, a)):
            if count[(min(int(u), int(v)), max(int(u), int(v)))] == 1:
                half[int(u)] = int(v)
    loops = []
    seen = set()
    for start in list(half):
        if start in seen:
            continue
        loop, cur = [start], half[start]
        seen.add(start)
        while cur != start and cur in half and cur not in seen:
            loop.append(cur)
            seen.add(cur)
            cur = half[cur]
        if len(loop) >= 3:
            loops.append(loop)
    return loops


# ---------------------------------------------------------------------------
def remove(P, I, part, tri_src, label="tail"):
    """drop every triangle of `label` and cap the hole it leaves.

    the cap is a fan to a centre pushed OUT along the ring's own axis, not a flat
    disc: the tail left a 0.09-radius crater in the hip and a flat lid on it
    reads as a chopped-off stump at any angle. a shallow dome reads as rump.
    returns (P, I, part, tri_src) with the cap's vertices labelled "torso"."""
    P = np.asarray(P, float).copy()
    I = np.asarray(I, np.int64).copy()
    part = np.array(part, dtype=object)
    tri_src = np.asarray(tri_src).copy()

    drop = (part == label)[I].all(1)
    I, tri_src = I[~drop], tri_src[~drop]
    ctr = P[np.unique(I)].mean(0)

    for loop in boundary_loops(I):
        ring = np.array(loop, np.int64)
        c = P[ring].mean(0)
        rad = float(np.linalg.norm(P[ring] - c, axis=1).mean())
        ax = _unit(c - ctr)
        apex = len(P)
        P = np.vstack([P, (c + ax * rad * 0.55)[None]])
        part = np.concatenate([part, np.array(["torso"], dtype=object)])
        k = len(ring)
        fan = np.array([(apex, ring[i], ring[(i + 1) % k]) for i in range(k)],
                       np.int64)
        # orient outward: the apex is a lid on a closed body, so a face whose
        # normal points away from the body centre is the right way round
        Tn = P[fan]
        nrm = np.cross(Tn[:, 1] - Tn[:, 0], Tn[:, 2] - Tn[:, 0])
        bad = (nrm * (Tn.mean(1) - ctr)).sum(1) < 0
        fan[bad] = fan[bad][:, [0, 2, 1]]
        I = np.vstack([I, fan])
        tri_src = np.concatenate([tri_src, np.full(len(fan), -1)])

    # COMPACT. dropping triangles leaves the tail's vertices in P with nothing
    # pointing at them, and an orphan vertex is not harmless: it still carries a
    # part label, so `socket` measured the trunk's height against tail vertices
    # 1.4 up in the air and shot its ray out of the model's back.
    used = np.unique(I)
    remap = np.full(len(P), -1, np.int64)
    remap[used] = np.arange(len(used))
    P, part, I = P[used], part[used], remap[I]

    # the label is now unused; keep the array clean for the caller
    part[part == label] = "torso"
    return P, I, part, tri_src


# ---------------------------------------------------------------------------
def socket(P, I, part):
    """(point, outward axis) where the new tail leaves the body.

    a ray out of the trunk along SOCKET_DIR; the LAST triangle it crosses is the
    outer surface. measured, not hard-coded, so the numbers above stay true if
    the source mesh is ever swapped."""
    trunk = P[part == "torso"]
    y0, y1 = float(trunk[:, 1].min()), float(trunk[:, 1].max())
    o = np.array([0.0, y0 + SOCKET_FROM * (y1 - y0),
                  float(np.median(trunk[:, 2]))])
    d = _unit(SOCKET_DIR)

    # Moeller-Trumbore against every triangle at once
    T = P[I]
    e1, e2 = T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]
    h = np.cross(d, e2)
    a = np.einsum("ij,ij->i", e1, h)
    ok = np.abs(a) > 1e-12
    f = np.zeros(len(T))
    f[ok] = 1.0 / a[ok]
    s = o - T[:, 0]
    u = f * np.einsum("ij,ij->i", s, h)
    q = np.cross(s, e1)
    v = f * (q @ d)
    t = f * np.einsum("ij,ij->i", e2, q)
    hit = ok & (u > -1e-9) & (v > -1e-9) & (u + v < 1 + 1e-9) & (t > 1e-6)
    if not hit.any():
        raise SystemExit("tailbuild: the socket ray missed the body")
    return o + d * float(t[hit].max()), d


# ---------------------------------------------------------------------------
def centreline(p0, axis, n=160):
    """unit-speed curve of length LENGTH from the direction keys, rotated so its
    first tangent is the socket's outward axis."""
    ts = np.linspace(0, 1, n)
    fr = [f for f, _ in DIRS]
    D = np.stack([np.interp(ts, fr, [_unit(d)[k] for _, d in DIRS])
                  for k in range(3)], 1)
    D /= np.maximum(np.linalg.norm(D, axis=1, keepdims=True), 1e-12)
    # align the authored curve's start with the measured socket normal
    R = _align(_unit(D[0]), _unit(axis))
    D = D @ R.T
    C = p0 + np.cumsum(np.vstack([np.zeros(3), D[:-1] * (LENGTH / (n - 1))]), 0)
    return C, D


def _align(a, b):
    """rotation taking unit a onto unit b (Rodrigues, no trig)."""
    v = np.cross(a, b)
    c = float(a @ b)
    if c < -1 + 1e-9:
        t = np.array([1.0, 0, 0]) if abs(a[0]) < 0.9 else np.array([0, 1.0, 0])
        v = _unit(np.cross(a, t))
        return -np.eye(3) + 2 * np.outer(v, v)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def frames(C):
    """rotation-minimising frames. a fixed up-vector collapses wherever the
    curve turns parallel to it -- this one does."""
    T = np.gradient(C, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-12)
    N = np.zeros_like(T)
    seed = np.array([0.0, 1.0, 0.0])
    if abs(seed @ T[0]) > 0.9:
        seed = np.array([1.0, 0.0, 0.0])
    N[0] = _unit(seed - (seed @ T[0]) * T[0])
    for i in range(1, len(T)):
        v = N[i - 1] - (N[i - 1] @ T[i]) * T[i]
        nl = np.linalg.norm(v)
        N[i] = v / nl if nl > 1e-9 else N[i - 1]
    return T, N, np.cross(T, N)


# ---------------------------------------------------------------------------
def grow(P, I, part, tri_src):
    """append the new tail as its own closed shell. returns the arrays plus the
    centreline the rig hangs its joints on."""
    p0, ax = socket(P, I, part)
    C, _ = centreline(p0, ax)
    T, N, B = frames(C)

    # ring positions in arc fraction, packed toward the club
    ss = np.linspace(0, 1, RINGS) ** RING_BIAS
    rf = [f for f, _ in RADIUS]
    rv = [r for _, r in RADIUS]
    rad = np.interp(ss, rf, rv)

    def at(s):
        i = np.clip(s * (len(C) - 1), 0, len(C) - 1)
        i0 = int(np.floor(i))
        i1 = min(i0 + 1, len(C) - 1)
        f = i - i0
        return (C[i0] * (1 - f) + C[i1] * f, _unit(N[i0] * (1 - f) + N[i1] * f),
                _unit(B[i0] * (1 - f) + B[i1] * f), _unit(T[i0] * (1 - f) + T[i1] * f))

    ang = np.arange(SIDES) * (2 * np.pi / SIDES)
    base = len(P)
    verts = []

    # the plug: one ring BEHIND the socket, inside the body, and its lid
    pc, pn, pb, pt = at(0.0)
    pr = rad[0] * ROOT_FLARE
    plug_c = pc - pt * PLUG
    verts.append(plug_c[None])                                   # 0: plug lid
    verts.append(plug_c + pr * (np.cos(ang)[:, None] * pn
                                + np.sin(ang)[:, None] * pb))     # 1..SIDES
    for k, s in enumerate(ss):
        c, nn, bb, _ = at(s)
        verts.append(c + rad[k] * (np.cos(ang)[:, None] * nn
                                   + np.sin(ang)[:, None] * bb))
    tipc, _, _, tipt = at(1.0)
    verts.append((tipc + tipt * rad[-1] * 0.9)[None])            # tip apex
    V = np.vstack(verts)

    ringstart = [1] + [1 + SIDES * (k + 1) for k in range(RINGS)]
    tris = []
    for i in range(SIDES):
        j = (i + 1) % SIDES
        tris.append((0, 1 + j, 1 + i))                            # plug lid
    for a, b in zip(ringstart[:-1], ringstart[1:]):
        for i in range(SIDES):
            j = (i + 1) % SIDES
            tris.append((a + i, a + j, b + j))
            tris.append((a + i, b + j, b + i))
    last = ringstart[-1]
    apex = len(V) - 1
    for i in range(SIDES):
        j = (i + 1) % SIDES
        tris.append((last + i, last + j, apex))
    tris = np.array(tris, np.int64) + base

    # one orientation pass against the tube's own interior beats threading
    # winding through three different fan directions
    Vt = np.vstack([P, V])[tris]
    ref = np.array([C[int(np.clip(len(C) * 0.5, 0, len(C) - 1))]])
    nrm = np.cross(Vt[:, 1] - Vt[:, 0], Vt[:, 2] - Vt[:, 0])
    axis_c = np.array([_nearest(C, m) for m in Vt.mean(1)])
    bad = (nrm * (Vt.mean(1) - axis_c)).sum(1) < 0
    tris[bad] = tris[bad][:, [0, 2, 1]]
    del ref

    P = np.vstack([P, V])
    I = np.vstack([I, tris])
    part = np.concatenate([part, np.array(["tail"] * len(V), dtype=object)])
    tri_src = np.concatenate([tri_src, np.full(len(tris), -1)])
    return P, I, part, tri_src, C


def _nearest(C, p):
    return C[int(np.argmin(np.linalg.norm(C - p, axis=1)))]
