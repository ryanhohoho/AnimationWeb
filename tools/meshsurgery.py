"""meshsurgery.py

cut limbs off the trunk so each one is its own CLOSED shell.

why bother: a limb that shares vertices with the body can only ever be a
compromise. weight the shared ring to the limb and the body's surface gets
dragged; weight it to the body and the limb's own base cannot move. the meshy
mew has this everywhere -- the arm nubs are one ring deep and welded to the
collar, and the tail's socket is welded to the hip -- which is why the arms
"barely move" and the tail could never be given real physics without the rump
denting along with it.

so: split, then PLUG. after splitting the two openings are coincident and would
z-fight, so the body side is recessed along the socket axis and the limb side is
extended into the recess. the limb ends up with a stub plug sitting inside a
shallow socket, both closed, and it can rotate a long way before anything can be
seen through the joint.

EVERYTHING HERE WORKS ON A WELDED MESH (one vertex per surface point). the
source file is vertex-split for flat shading -- 1399 vertices for 1626 corners
-- so on the raw index buffer almost every edge looks like a boundary edge and
loop finding returns nonsense. the faceting is put back at export time
(rig_mew.explode), and the uvs are re-authored from scratch anyway.
"""

import numpy as np

SOCKET_LABEL = "_socket"   # body-side cap vertices; the caller relabels them

PLUG_IN = 0.55      # how far the limb's plug reaches into the body, in socket radii
SOCKET_IN = 1.05    # how far the body's cap is recessed. must exceed PLUG_IN or
                    # the plug pokes out the far side of its own socket


# ---------------------------------------------------------------------------
def boundary_loops(tris):
    """ordered vertex loops of the open boundary of a welded triangle set."""
    count = {}
    nxt = {}
    for a, b, c in tris:
        for u, v in ((a, b), (b, c), (c, a)):
            k = (min(u, v), max(u, v))
            count[k] = count.get(k, 0) + 1
            nxt.setdefault((u, v), True)
    half = {}
    for a, b, c in tris:
        for u, v in ((a, b), (b, c), (c, a)):
            if count[(min(u, v), max(u, v))] == 1:
                half[int(u)] = int(v)          # keeps the shell's winding
    loops = []
    seen = set()
    for start in list(half):
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        cur = half[start]
        while cur != start and cur in half and cur not in seen:
            loop.append(cur)
            seen.add(cur)
            cur = half[cur]
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def _orient(P, tris, ref_inside):
    """flip whichever new triangles face inward, judged against a point known
    to be inside the shell. cheaper and far more robust than threading half-edge
    orientation through a skirt."""
    T = P[tris]
    nrm = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0])
    bad = (nrm * (T.mean(1) - ref_inside)).sum(1) < 0
    tris = tris.copy()
    tris[bad] = tris[bad][:, [0, 2, 1]]
    return tris


# ---------------------------------------------------------------------------
def detach(P, I, part, names, body_ctr):
    """split each named part into its own closed shell. welded arrays in,
    welded arrays out. returns (P, I, part, sockets) where sockets maps a part
    name to the centre of the ring it was cut from -- which is exactly where its
    joint wants to be."""
    P = np.asarray(P, float).copy()
    I = np.asarray(I, np.int64).copy()
    part = np.array(part, dtype=object)
    sockets = {}

    for nm in names:
        vsel = part == nm
        tsel = vsel[I].all(1)
        if not tsel.any():
            continue

        # --- 1. private copies of every vertex the part shares -------------
        used_part = np.unique(I[tsel])
        used_rest = np.unique(I[~tsel])
        shared = np.intersect1d(used_part, used_rest)
        if len(shared):
            remap = {int(v): len(P) + k for k, v in enumerate(shared)}
            P = np.vstack([P, P[shared]])
            part = np.concatenate([part, np.array([nm] * len(shared), dtype=object)])
            Ip = I[tsel]
            for r in range(Ip.shape[0]):
                for c in range(3):
                    j = int(Ip[r, c])
                    if j in remap:
                        Ip[r, c] = remap[j]
            I[tsel] = Ip

        # --- 2. plug the limb, recess the body -----------------------------
        vsel = part == nm
        limb_t = I[vsel[I].all(1)]
        body_t = I[~vsel[I].all(1)]
        limb_ctr = P[np.unique(limb_t)].mean(0)
        for tris, is_limb in ((limb_t, True), (body_t, False)):
            for loop in boundary_loops(tris):
                ring = np.array(loop, np.int64)
                if not is_limb and not set(loop) & set(shared.tolist()):
                    continue                    # a pre-existing hole, not ours
                c = P[ring].mean(0)
                rad = float(np.linalg.norm(P[ring] - c, axis=1).mean())
                if rad < 1e-6:
                    continue
                ax = c - body_ctr
                n = np.linalg.norm(ax)
                ax = ax / n if n > 1e-9 else np.array([0.0, 1.0, 0.0])
                depth = rad * (PLUG_IN if is_limb else SOCKET_IN)
                base = len(P)
                P = np.vstack([P, P[ring] - ax * depth])
                # the body side is TAGGED, not named: the caller relabels it by
                # geometry along with everything else that ended up on the body
                # shell. hard-coding "torso" gave the arm's socket recess -- which
                # sits up on the COLLAR at y 0.74 -- chest weights while the
                # collar around it was head-weighted, and a head turn tore the
                # two apart (13% of body height).
                lab = nm if is_limb else SOCKET_LABEL
                part = np.concatenate([part, np.array([lab] * len(ring), dtype=object)])
                k = len(ring)
                skirt = [(ring[i], ring[(i + 1) % k], base + (i + 1) % k)
                         for i in range(k)]
                skirt += [(ring[i], base + (i + 1) % k, base + i) for i in range(k)]
                cidx = len(P)
                P = np.vstack([P, (P[base:base + k]).mean(0)[None]])
                part = np.concatenate([part, np.array([lab], dtype=object)])
                cap = [(cidx, base + i, base + (i + 1) % k) for i in range(k)]
                add = np.array(skirt + cap, np.int64)
                inside = limb_ctr if is_limb else body_ctr
                I = np.vstack([I, _orient(P, add, inside)])
                if is_limb:
                    sockets[nm] = c
    return P, I, part, sockets


# ---------------------------------------------------------------------------
def components(P, I):
    """(count, per-vertex label) of the connected shells."""
    from scipy import sparse
    n = len(P)
    r = np.concatenate([I[:, 0], I[:, 1], I[:, 2]])
    c = np.concatenate([I[:, 1], I[:, 2], I[:, 0]])
    A = sparse.coo_matrix((np.ones(len(r)), (r, c)), shape=(n, n)).tocsr()
    return sparse.csgraph.connected_components(A.maximum(A.T), directed=False)


def is_closed(I, sel):
    """True if the sub-mesh of triangles whose vertices are all in `sel` has no
    boundary edge -- i.e. it is watertight."""
    tris = I[sel[I].all(1)]
    if not len(tris):
        return False
    cnt = {}
    for a, b, c in tris:
        for u, v in ((a, b), (b, c), (c, a)):
            k = (min(int(u), int(v)), max(int(u), int(v)))
            cnt[k] = cnt.get(k, 0) + 1
    return all(v == 2 for v in cnt.values())
