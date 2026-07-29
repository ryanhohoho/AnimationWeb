"""tailshape.py

re-aim the mew's tail so it TRAILS BACKWARD instead of sticking out sideways.

the source mesh (a meshy generation) has the tail leaving the right hip and
sweeping straight out along +x, level with the head. that is fine as a portrait
pose and hopeless as a rig: the engine flies this character head-first along its
long axis with the tail streaming behind (see engine/pose/tailChain.js), so a
tail whose rest direction is 90 deg off the body reads as broken no matter how
the sim is tuned -- the shape-memory spring spends the whole time dragging it
back to a rest pose that points into the airflow.

the fix is geometry, not simulation. the tube is rebuilt along a NEW centreline
with the same arc length, using rotation-minimising frames so every ring keeps
its own cross-section, radius and uv. the socket ring is pinned (the new curve
starts at the old start with the old tangent and turns over the first fifth), so
nothing tears where the tail meets the hip.

the new curve is the ORIGINAL model's tail curve -- back, down a little, then a
long sweep up behind the head -- with its sideways drift mirrored so the tail
settles onto the midline instead of wandering further off it.
"""

import numpy as np

# direction keys for the new centreline: (arc fraction, direction).
# taken from the v3.7 model's tail joints, x mirrored (the socket is already
# off-centre on this mesh, so the drift has to come back toward the midline)
# and the x components softened to 45% so the tail stays close to the spine.
DIR_KEYS = [
    (0.00, None),                       # None = keep the mesh's own base tangent
    (0.10, (-0.40, -0.30, -0.87)),      # out of the hip, straight back
    (0.28, (-0.62, +0.16, -0.77)),      # the low point behind the body
    (0.48, (-0.50, +0.75, -0.43)),      # starting to climb, closing on the spine
    (0.68, (-0.24, +0.95, +0.15)),      # vertical, behind the shoulders
    (0.86, (-0.04, +0.91, +0.41)),
    (1.00, (+0.18, +0.84, +0.48)),      # the hook curls forward over the back
]
PIN = 0.18          # arc fraction over which the rebuild fades in from the socket


# ---------------------------------------------------------------------------
def centreline(V, A, idx, base_pt, n=64):
    """arc-length-even centreline of a tube given its vertex set.

    ordered by GRAPH distance from the base, binned by equal vertex COUNT (a
    ring's vertices are all about the same graph distance, so equal-count bins
    are rings), then resampled by ARC LENGTH -- binning by distance instead
    piles the fat club end into one bin and kinks the curve."""
    from scipy import sparse
    sub = A[idx][:, idx]
    start = int(np.argmin(np.linalg.norm(V[idx] - base_pt, axis=1)))
    d = sparse.csgraph.dijkstra(sub, indices=start, directed=False)
    d[~np.isfinite(d)] = d[np.isfinite(d)].max() if np.isfinite(d).any() else 0.0
    order = np.argsort(d)
    nb = max(6, min(16, len(order) // 3))
    raw = np.array([V[idx[c]].mean(0) for c in np.array_split(order, nb) if len(c)])
    for _ in range(2):                      # a lumpy ring must not kink the curve
        sm = raw.copy()
        sm[1:-1] = 0.25 * raw[:-2] + 0.5 * raw[1:-1] + 0.25 * raw[2:]
        raw = sm
    return resample(raw, n)


def resample(poly, n):
    seg = np.linalg.norm(np.diff(poly, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    want = np.linspace(0, cum[-1], n)
    return np.stack([np.interp(want, cum, poly[:, k]) for k in range(3)], 1)


def frames(C):
    """rotation-minimising frames. a fixed up-vector collapses wherever the
    curve turns parallel to it -- this tail does, twice."""
    T = np.gradient(C, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-12)
    N = np.zeros_like(T)
    seed = np.array([0.0, 1.0, 0.0])
    if abs(seed @ T[0]) > 0.9:
        seed = np.array([1.0, 0.0, 0.0])
    N[0] = seed - (seed @ T[0]) * T[0]
    N[0] /= np.linalg.norm(N[0])
    for i in range(1, len(T)):
        v = N[i - 1] - (N[i - 1] @ T[i]) * T[i]
        nl = np.linalg.norm(v)
        N[i] = v / nl if nl > 1e-9 else N[i - 1]
    B = np.cross(T, N)
    return T, N, B


def integrate_dirs(L, t0, n):
    """build a unit-speed curve of length L from the direction keys."""
    ts = np.linspace(0, 1, n)
    keys = [(f, np.array(d, float) / np.linalg.norm(d) if d is not None else t0)
            for f, d in DIR_KEYS]
    D = np.zeros((n, 3))
    for k in range(3):
        D[:, k] = np.interp(ts, [f for f, _ in keys], [d[k] for _, d in keys])
    D /= np.maximum(np.linalg.norm(D, axis=1, keepdims=True), 1e-12)
    ds = L / (n - 1)
    C = np.cumsum(np.vstack([np.zeros(3), D[:-1] * ds]), axis=0)
    return C, D


def project(C, p):
    """(arc fraction, perpendicular offset) of p against the polyline C."""
    seg = C[1:] - C[:-1]
    L2 = np.einsum("ij,ij->i", seg, seg)
    w = p - C[:-1]
    t = np.clip(np.einsum("ij,ij->i", w, seg) / np.maximum(L2, 1e-12), 0, 1)
    foot = C[:-1] + t[:, None] * seg
    dd = np.linalg.norm(p - foot, axis=1)
    i = int(np.argmin(dd))
    return i, t[i], p - foot[i]


def reroute(P, V, A, tail_raw, tail_welded, base_pt):
    """rebuild the tail vertices of P (raw positions) on the new centreline."""
    C = centreline(V, A, tail_welded, base_pt, n=64)
    T, N, B = frames(C)
    seg = np.linalg.norm(np.diff(C, axis=0), axis=1)
    L = float(seg.sum())
    C2, D2 = integrate_dirs(L, T[0], len(C))
    C2 = C2 + C[0]
    T2, N2, B2 = frames(C2)

    out = P.copy()
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    for r in tail_raw:
        i, t, off = project(C, P[r])
        # local frame coords, interpolated across the segment so the mapping is
        # continuous (a per-vertex nearest-ring lookup steps and shears the tube)
        n_i = N[i] * (1 - t) + N[i + 1] * t
        b_i = B[i] * (1 - t) + B[i + 1] * t
        n_i /= np.linalg.norm(n_i)
        b_i /= np.linalg.norm(b_i)
        u, v = off @ n_i, off @ b_i
        n_o = N2[i] * (1 - t) + N2[i + 1] * t
        b_o = B2[i] * (1 - t) + B2[i + 1] * t
        n_o /= np.linalg.norm(n_o)
        b_o /= np.linalg.norm(b_o)
        newp = C2[i] + (C2[i + 1] - C2[i]) * t + u * n_o + v * b_o
        s = (cum[i] + t * seg[i]) / L
        k = np.clip(s / PIN, 0, 1)
        k = k * k * (3 - 2 * k)                 # socket stays exactly put
        out[r] = P[r] * (1 - k) + newp * k
    return out, C, C2
