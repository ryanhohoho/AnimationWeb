"""meshkit.py

all-quad procedural mesh toolkit. numpy only.

the authoring representation is a QUAD mesh -- that is what topology quality is
judged on. triangulation only happens at export. everything here is built so
the result is watertight, all-quad, consistently wound, and free of poles
(cube-sphere corners are valence 3, which is the standard and only irregularity).

conventions:
  right-handed, y up, +z toward the viewer.
  quads are wound counter-clockwise seen from OUTSIDE the surface.
"""

import numpy as np

# cube faces: (normal, right, up). right x up == normal, so ccw-from-outside
# falls out of the grid order for free.
CUBE_FACES = {
    "PZ": ((0, 0, 1), (1, 0, 0), (0, 1, 0)),
    "NZ": ((0, 0, -1), (-1, 0, 0), (0, 1, 0)),
    "PX": ((1, 0, 0), (0, 0, -1), (0, 1, 0)),
    "NX": ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),
    "PY": ((0, 1, 0), (1, 0, 0), (0, 0, -1)),
    "NY": ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
}


class QuadMesh:
    """V (n,3) float64, Q (m,4) int. `groups` maps a name to a vertex index
    array; `grids` maps a name to a 2d index array (for patch surgery)."""

    def __init__(self, V=None, Q=None):
        self.V = np.zeros((0, 3)) if V is None else np.asarray(V, float)
        self.Q = np.zeros((0, 4), int) if Q is None else np.asarray(Q, int)
        self.groups = {}
        self.grids = {}
        # named ORDERED vertex loops (limb sockets). they have to be tracked on
        # the mesh, not held as loose arrays by the caller: opening a second
        # socket deletes vertices and renumbers everything, which would
        # silently rot any ring extracted earlier.
        self.rings = {}

    def copy(self):
        m = QuadMesh(self.V.copy(), self.Q.copy())
        m.groups = {k: v.copy() for k, v in self.groups.items()}
        m.grids = {k: v.copy() for k, v in self.grids.items()}
        m.rings = {k: v.copy() for k, v in self.rings.items()}
        return m

    def append(self, other, group=None):
        """merge another mesh in, offsetting its indices. returns the index
        offset so callers can keep referring to the other mesh's vertices."""
        off = len(self.V)
        self.V = np.vstack([self.V, other.V]) if len(self.V) else other.V.copy()
        self.Q = np.vstack([self.Q, other.Q + off]) if len(self.Q) else other.Q.copy()
        for k, v in other.groups.items():
            key = k if group is None else f"{group}.{k}"
            self.groups[key] = np.concatenate([self.groups.get(key, np.zeros(0, int)), v + off])
        for k, v in other.grids.items():
            self.grids[k if group is None else f"{group}.{k}"] = v + off
        for k, v in other.rings.items():
            self.rings[k if group is None else f"{group}.{k}"] = v + off
        if group is not None:
            self.groups[group] = np.concatenate(
                [self.groups.get(group, np.zeros(0, int)), np.arange(off, len(self.V))])
        return off

    def tris(self):
        return self.tris_corners()[0]

    def tris_corners(self):
        """quad -> 2 tris, split on the shorter diagonal so faceted shading
        stays symmetric on stretched quads. also returns, per triangle, which
        quad it came from and which of that quad's 4 corners each of its
        vertices is -- that is what lets face-varying attributes (uvs) ride
        through triangulation without a seam problem."""
        q = self.Q
        d02 = np.linalg.norm(self.V[q[:, 0]] - self.V[q[:, 2]], axis=1)
        d13 = np.linalg.norm(self.V[q[:, 1]] - self.V[q[:, 3]], axis=1)
        a = d02 <= d13
        cA = np.where(a[:, None], np.array([[0, 1, 2]]), np.array([[0, 1, 3]]))
        cB = np.where(a[:, None], np.array([[0, 2, 3]]), np.array([[1, 2, 3]]))
        C = np.empty((len(q) * 2, 3), int)
        C[0::2], C[1::2] = cA, cB
        TQ = np.repeat(np.arange(len(q)), 2)
        T = q[TQ[:, None], C]
        return T, TQ, C


# ---------------------------------------------------------------------------
# construction
# ---------------------------------------------------------------------------
def _spherify(p):
    """cube point in [-1,1]^3 -> sphere, with far better vertex distribution
    than plain normalization (no bunching at the cube corners)."""
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    return np.stack([
        x * np.sqrt(np.maximum(0, 1 - y * y / 2 - z * z / 2 + y * y * z * z / 3)),
        y * np.sqrt(np.maximum(0, 1 - z * z / 2 - x * x / 2 + z * z * x * x / 3)),
        z * np.sqrt(np.maximum(0, 1 - x * x / 2 - y * y / 2 + x * x * y * y / 3)),
    ], -1)


def quadsphere(n, sphere=True):
    """subdivided cube (n x n quads per face), welded. all quads, no poles.
    mesh.grids['PZ'] etc. are (n+1, n+1) index grids for patch surgery."""
    pts = []
    grids = {}
    for name, (nrm, rgt, up) in CUBE_FACES.items():
        nrm = np.array(nrm, float)
        rgt = np.array(rgt, float)
        up = np.array(up, float)
        t = np.linspace(-1, 1, n + 1)
        u, v = np.meshgrid(t, t, indexing="ij")
        P = nrm + rgt * u[..., None] + up * v[..., None]
        grids[name] = P
        pts.append(P.reshape(-1, 3))
    allp = np.vstack(pts)
    if sphere:
        allp = _spherify(allp)

    V, remap = _weld_points(allp, 1e-7)
    m = QuadMesh(V, np.zeros((0, 4), int))
    quads = []
    off = 0
    for name in CUBE_FACES:
        g = remap[off:off + (n + 1) ** 2].reshape(n + 1, n + 1)
        m.grids[name] = g
        quads.append(_grid_quads(g))
        off += (n + 1) ** 2
    m.Q = np.vstack(quads)
    return m


def _grid_quads(g, mask=None):
    """(a,b) index grid -> quads. ccw given the grid's (right, up) order."""
    a, b = g.shape
    q = np.stack([g[:-1, :-1], g[1:, :-1], g[1:, 1:], g[:-1, 1:]], -1).reshape(-1, 4)
    if mask is not None:
        q = q[mask.reshape(-1)]
    return q


def _weld_points(P, eps):
    key = np.round(P / eps).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    order = np.argsort(first)
    rank = np.empty(len(first), int)
    rank[order] = np.arange(len(first))
    return P[first[order]], rank[inv.ravel()]


def ring_from_patch(mesh, face, i0, j0, k, name=None):
    """remove a k x k block of quads from a cube face and return its boundary
    ring, ordered ccw seen from outside. this is how limbs get their sockets.
    pass `name` to register it in mesh.rings so it survives later surgery."""
    g = mesh.grids[face]
    block = set()
    for i in range(i0, i0 + k):
        for j in range(j0, j0 + k):
            block.add((int(g[i, j]), int(g[i + 1, j]), int(g[i + 1, j + 1]), int(g[i, j + 1])))
    mask = np.array([tuple(int(x) for x in q) not in block for q in mesh.Q])
    mesh.Q = mesh.Q[mask]

    ring = []
    for i in range(i0, i0 + k):
        ring.append(g[i, j0])
    for j in range(j0, j0 + k):
        ring.append(g[i0 + k, j])
    for i in range(i0 + k, i0, -1):
        ring.append(g[i, j0 + k])
    for j in range(j0 + k, j0, -1):
        ring.append(g[i0, j])
    ring = np.array(ring, int)

    # a k x k block of quads owns (k-1)^2 interior vertices; with the quads
    # gone they are orphans, so drop them now and keep the mesh clean at every
    # intermediate step rather than sweeping up at the end
    interior = [int(g[i, j]) for i in range(i0 + 1, i0 + k) for j in range(j0 + 1, j0 + k)]
    if name:
        mesh.rings[name] = ring
    if interior:
        ring = remove_vertices(mesh, interior, follow=[ring])[0]
    return ring


def remove_vertices(mesh, dead, follow=()):
    """delete vertices and remap everything that indexes them: quads, grids,
    groups and every registered ring. `follow` remaps extra loose arrays too."""
    dead = np.asarray(sorted(set(int(d) for d in dead)), int)
    keep = np.ones(len(mesh.V), bool)
    keep[dead] = False
    remap = np.full(len(mesh.V), -1, int)
    remap[keep] = np.arange(int(keep.sum()))
    mesh.V = mesh.V[keep]
    mesh.Q = remap[mesh.Q]
    assert (mesh.Q >= 0).all(), "removed a vertex that is still used by a quad"
    for k in list(mesh.grids):
        mesh.grids[k] = remap[mesh.grids[k]]
    for k in list(mesh.rings):
        r = remap[mesh.rings[k]]
        assert (r >= 0).all(), f"ring {k!r} lost a vertex to deletion"
        mesh.rings[k] = r
    for k in list(mesh.groups):
        g = remap[mesh.groups[k]]
        mesh.groups[k] = g[g >= 0]
    return [remap[np.asarray(f)] for f in follow]


def bridge(ringA, ringB, flip=False):
    """quads joining two equal-length closed rings. ringA is the 'from' loop
    (its own surface's outward winding), ringB the 'to' loop."""
    n = len(ringA)
    assert len(ringB) == n, f"ring size mismatch {len(ringA)} vs {n}"
    a, b = np.asarray(ringA), np.asarray(ringB)
    a2, b2 = np.roll(a, -1), np.roll(b, -1)
    q = np.stack([a, a2, b2, b], -1)
    return q[:, [0, 3, 2, 1]] if flip else q


def best_ring_match(A, B, idxB):
    """two rings built independently (say the top of the body and the bottom
    of the head) have no shared vertex order. try every roll and both
    directions, keep the correspondence with the least total travel. returns
    idxB reordered to line up with A."""
    best, bestk = None, 1e18
    for rev in (False, True):
        Bb = B[::-1] if rev else B
        ib = idxB[::-1] if rev else idxB
        for r in range(len(B)):
            cand = np.roll(Bb, -r, axis=0)
            cost = float(((A - cand) ** 2).sum())
            if cost < bestk:
                bestk, best = cost, np.roll(ib, -r)
    return best


def ring_circle(n, radius=1.0, plane=("x", "z")):
    """n evenly spaced points on a circle, ccw about the remaining axis."""
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    P = np.zeros((n, 3))
    ax = {"x": 0, "y": 1, "z": 2}
    P[:, ax[plane[0]]] = np.cos(t) * radius
    P[:, ax[plane[1]]] = np.sin(t) * radius
    return P


def loft(rings):
    """rings: list of (n,3) point loops advancing along the tube. returns an
    open-ended tube plus the first/last ring index arrays.

    winding note: ring_circle runs ccw about the -axis it omits, so the bridge
    has to be flipped for the tube surface to face outward. the validator's
    signed-volume check is what pins this down."""
    n = len(rings[0])
    V = np.vstack(rings)
    idx = np.arange(len(V)).reshape(len(rings), n)
    quads = [bridge(idx[k], idx[k + 1], flip=True) for k in range(len(rings) - 1)]
    m = QuadMesh(V, np.vstack(quads))
    return m, idx[0], idx[-1]


def cap_ring(mesh, ring, center, bulge=1.0):
    """close a 4k-vertex ring with a k x k quad grid -- a rounded cap with no
    pole. k is derived from the ring length."""
    n = len(ring)
    assert n % 4 == 0, "cap needs a 4k ring"
    k = n // 4
    P = mesh.V[ring]
    ctr = np.asarray(center, float)
    # lay a (k+1)x(k+1) grid whose border is the ring, interior bilinear + bulge
    grid = np.full((k + 1, k + 1), -1, int)
    # ring order: +i edge, +j edge, -i edge, -j edge (matches ring_from_patch)
    p = 0
    for i in range(k):
        grid[i, 0] = ring[p]; p += 1
    for j in range(k):
        grid[k, j] = ring[p]; p += 1
    for i in range(k, 0, -1):
        grid[i, k] = ring[p]; p += 1
    for j in range(k, 0, -1):
        grid[0, j] = ring[p]; p += 1

    newV = []
    base = len(mesh.V)
    for i in range(1, k):
        for j in range(1, k):
            u, v = i / k, j / k
            # coons-ish blend of the four border curves
            a = mesh.V[grid[i, 0]] * (1 - v) + mesh.V[grid[i, k]] * v
            b = mesh.V[grid[0, j]] * (1 - u) + mesh.V[grid[k, j]] * u
            c = (mesh.V[grid[0, 0]] * (1 - u) * (1 - v) + mesh.V[grid[k, 0]] * u * (1 - v)
                 + mesh.V[grid[0, k]] * (1 - u) * v + mesh.V[grid[k, k]] * u * v)
            q = a + b - c
            d = q - ctr
            q = ctr + d * (1.0 + bulge * 0.35 * np.sin(np.pi * u) * np.sin(np.pi * v))
            grid[i, j] = base + len(newV)
            newV.append(q)
    if newV:
        mesh.V = np.vstack([mesh.V, np.array(newV)])
    mesh.Q = np.vstack([mesh.Q, _grid_quads(grid)])
    return mesh


# ---------------------------------------------------------------------------
# validation -- this is what "flawless topology" is measured against
# ---------------------------------------------------------------------------
def validate(mesh, name="mesh", verbose=True):
    V, Q = mesh.V, mesh.Q
    issues = []

    # duplicate vertices
    key = np.round(V / 1e-6).astype(np.int64)
    uniq = np.unique(key, axis=0)
    if len(uniq) != len(V):
        issues.append(f"{len(V) - len(uniq)} duplicate vertices")

    # unreferenced vertices
    used = np.unique(Q)
    if len(used) != len(V):
        issues.append(f"{len(V) - len(used)} orphan vertices")

    # degenerate quads (repeated index or ~zero area)
    for q in Q:
        if len(set(q.tolist())) != 4:
            issues.append("quad with repeated vertex")
            break
    P = V[Q]
    area = 0.5 * np.linalg.norm(
        np.cross(P[:, 2] - P[:, 0], P[:, 3] - P[:, 1]), axis=1)
    if (area < 1e-9).any():
        issues.append(f"{int((area < 1e-9).sum())} zero-area quads")

    # edge manifoldness + winding: every edge must appear exactly twice, once
    # in each direction
    E = np.vstack([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    ekey = np.sort(E, axis=1)
    _, inv, cnt = np.unique(ekey, axis=0, return_inverse=True, return_counts=True)
    c = cnt[inv]
    if (c != 2).any():
        bad = int((cnt != 2).sum())
        issues.append(f"{bad} non-manifold/boundary edges (holes or T-junctions)")
    else:
        # directed edges must cancel -> consistent outward winding everywhere
        dkey = {}
        flipped = 0
        for a, b in E:
            dkey[(int(a), int(b))] = dkey.get((int(a), int(b)), 0) + 1
        for (a, b), k in dkey.items():
            if k != 1 or dkey.get((b, a), 0) != 1:
                flipped += 1
        if flipped:
            issues.append(f"{flipped} inconsistently wound edges")

    # valence
    val = np.bincount(Q.ravel(), minlength=len(V))
    n3 = int((val == 3).sum())
    n4 = int((val == 4).sum())
    odd = int(((val < 3) | (val > 5)).sum())
    if odd:
        issues.append(f"{odd} vertices with valence <3 or >5")

    # planarity (informational; low-poly quads are allowed to bend a little)
    d1 = P[:, 1] - P[:, 0]
    d2 = P[:, 3] - P[:, 0]
    nrm = np.cross(d1, d2)
    ln = np.linalg.norm(nrm, axis=1, keepdims=True)
    nrm = nrm / np.maximum(ln, 1e-12)
    dev = np.abs(np.einsum("ij,ij->i", P[:, 2] - P[:, 0], nrm))
    scale = np.linalg.norm(V.max(0) - V.min(0))
    warp = dev.max() / scale

    # closed-volume sanity: euler characteristic of a genus-0 closed surface
    nE = len(np.unique(ekey, axis=0))
    euler = len(V) - nE + len(Q)

    # signed volume: positive means the winding really is outward, not just
    # self-consistent (a fully inverted mesh passes the winding test)
    T = mesh.tris()
    a, b, c = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    vol = np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0
    if vol <= 0:
        issues.append(f"inward-facing winding (signed volume {vol:+.4f})")

    if verbose:
        status = "OK " if not issues else "BAD"
        print(f"[{status}] {name:12s} V={len(V):5d} Q={len(Q):5d} E={nE:5d} "
              f"euler={euler:+3d} vol={vol:+.3f} val4={n4}/{len(V)} val3={n3} "
              f"warp={warp:.4f}")
        for i in issues:
            print(f"        ! {i}")
    return issues, {"euler": euler, "warp": warp, "val3": n3, "val4": n4, "vol": vol}


# ---------------------------------------------------------------------------
# export helpers
# ---------------------------------------------------------------------------
def face_normals(V, T):
    n = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def smooth_normals(V, T):
    N = np.zeros_like(V)
    fn = face_normals(V, T)
    for k in range(3):
        np.add.at(N, T[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def flat_split(V, T, *attrs):
    """duplicate vertices per triangle so every face gets its own normal --
    this is the faceted low-poly look. extra per-vertex attribute arrays are
    re-indexed alongside. returns (V2, N2, T2, attrs2, source_index)."""
    src = T.reshape(-1)
    V2 = V[src]
    fn = face_normals(V, T)
    N2 = np.repeat(fn, 3, axis=0)
    T2 = np.arange(len(src)).reshape(-1, 3)
    out = [a[src] for a in attrs]
    return V2, N2, T2, out, src


def vertex_adjacency(nV, Q):
    """neighbour lists over quad edges, for weight smoothing."""
    E = np.vstack([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    E = np.vstack([E, E[:, ::-1]])
    order = np.argsort(E[:, 0], kind="stable")
    E = E[order]
    starts = np.searchsorted(E[:, 0], np.arange(nV))
    ends = np.searchsorted(E[:, 0], np.arange(nV), side="right")
    return E[:, 1], starts, ends
