"""mewparts.py

load + anatomically segment the meshy mew (mewNew.glb). shared by the rig
builder and the model gate, so both agree on what a "foot" is.

the source is mewNew.glb, NOT the mewNew_split.glb an earlier pass produced:
that file's foot split left 18 non-manifold edges (a doubled surface welded back
onto itself), and non-manifold geometry defeats every topological operation
downstream. the clean original is perfectly manifold -- 266 welded vertices, 524
triangles, every edge used exactly twice -- and tools/meshsurgery.py does the
splitting properly.

WHY IT IS NOT ALL AUTOMATIC
---------------------------
the previous auto-rig guessed regions from distance-to-bone AFTER placing the
bones, which is circular: a badly placed bone claimed the wrong vertices, the
weights followed the bad region, and moving the joint only fixed half of it.
so the mesh is cut FIRST and the bones are placed inside the parts afterwards.

only two cuts are things topology can actually answer on this model:

  * the TAIL. one long tube through a genuine narrow waist -- "grow from the tip
    until the boundary ring is shortest" nails it (cut length 1.73 against 2.5+
    either side of the minimum).
  * the -X FOOT. the artist already exported it as its own shell.

everything else attaches over a broad area with no waist at all, and this mesh
is only ROUGHLY mirror-symmetric (the two ear tips differ by 0.11 in height, the
two arm nubs by 0.11), so a symmetric fit does not converge either. those parts
are therefore hand-authored boxes in NORMALISED coordinates, measured off the
mesh once and checked by eye in tools/preview/rig_parts.png. the numbers below
are for THIS asset; re-derive them if the source mesh is ever replaced.

NORMALISED SPACE (everything below, and the whole rig, lives here)
  x = 0 is the mirror plane, +x is one side
  y = 0 is the sole of the feet, the model is 1.75 tall
  z = 0 is the trunk's median, +z is the direction the face points
"""

import numpy as np
from scipy import sparse

TARGET_HEIGHT = 1.75

PART_NAMES = ["tail", "foot.L", "foot.R", "arm.L", "arm.R",
              "ear.L", "ear.R", "head", "torso"]

# --- hand-authored regions, normalised coords ------------------------------
# (see the module docstring for why these are literals). each is a box:
# (xlo, xhi, ylo, yhi, zlo, zhi); None means unbounded.
BOXES = {
    # the paddle foot on +x. its twin on -x is a loose shell and needs no box.
    # bounded in z because the tail's root sweeps through the same x and y.
    "foot.L": (0.11, None, None, 0.60, 0.10, None),
    # the arm nubs: four cap vertices and a base ring, sitting at the collar.
    # the widest part of the SKULL reaches further out sideways than the arm
    # tip does, so these are bounded above in y or the region eats the cheeks.
    "arm.L": (0.24, None, 0.58, 0.82, None, 0.15),
    "arm.R": (None, -0.24, 0.50, 0.75, None, 0.15),
}
# the tail's outer tube is found topologically; its ROOT blends into the hip
# with no waist to find, so the socket is added by box.
TAIL_ROOT_BOX = (0.50, None, None, 0.60, None, 0.05)

# ear field shape. t is measured along each ear's OWN axis (head centre -> that
# ear's tip), so the two ears behave identically even though one is taller.
EAR_T0 = 0.66          # twitch starts this far out; below it the skull is rigid
EAR_LAT0 = 0.06        # and fades toward the midline so the crown never lifts
EAR_LAT1 = 0.22


# ---------------------------------------------------------------------------
def weld(P, I, eps=5):
    """collapse the export's split (flat-shaded) vertices back to one per
    corner, so the graph is a real surface and not 542 loose triangles."""
    U, inv = np.unique(np.round(P, eps), axis=0, return_inverse=True)
    return U, inv, inv[I]


def graph(U, T):
    n = len(U)
    r = np.concatenate([T[:, 0], T[:, 1], T[:, 2]])
    c = np.concatenate([T[:, 1], T[:, 2], T[:, 0]])
    w = np.linalg.norm(U[r] - U[c], axis=1)
    A = sparse.coo_matrix((w, (r, c)), shape=(n, n)).tocsr()
    return A.maximum(A.T)


def geo(A, seed):
    d = sparse.csgraph.dijkstra(A, indices=seed, directed=False)
    d[~np.isfinite(d)] = 1e9
    return d


def waist(A, seed, avail, lo, hi):
    """grow outward from `seed` and stop at the NARROWEST boundary ring.

    scored as cut_length / sqrt(size): the raw cut always prefers the tiniest
    region (one vertex barely has a boundary) and dividing by size flat prefers
    swallowing everything. sqrt is what picks the real waist on the tail."""
    idx = np.where(avail)[0]
    if len(idx) <= lo:
        return idx
    sub = A[idx][:, idx]
    s = int(np.where(idx == seed)[0][0])
    d = sparse.csgraph.dijkstra(sub, indices=s, directed=False)
    d[~np.isfinite(d)] = 1e9
    order = np.argsort(d)
    inside = np.zeros(len(idx), bool)
    best = None
    for i, v in enumerate(order):
        inside[v] = True
        k = i + 1
        if k < lo or k > min(hi, len(idx) - 1):
            continue
        cut = float(sub[inside][:, ~inside].sum())
        score = cut / (k ** 0.5)
        if best is None or score < best[0]:
            best = (score, k)
    return np.sort(idx[order[:best[1]] if best else order[:lo]])


def farthest(U, avail, key):
    return int(np.argmax(np.where(avail, key, -1e18)))


def in_box(U, box):
    xl, xh, yl, yh, zl, zh = box
    m = np.ones(len(U), bool)
    for k, (lo, hi) in enumerate(((xl, xh), (yl, yh), (zl, zh))):
        if lo is not None:
            m &= U[:, k] > lo
        if hi is not None:
            m &= U[:, k] < hi
    return m


def mirror_x(U, exclude):
    """the character's plane of symmetry, x = c. measured with the tail left
    out: it is one-sided by design and drags any fit toward itself."""
    from scipy.spatial import cKDTree
    V = U[~exclude]
    tree = cKDTree(V)
    best = None
    for c in np.linspace(V[:, 0].min(), V[:, 0].max(), 400):
        M = V * np.array([-1.0, 1.0, 1.0]) + np.array([2 * c, 0, 0])
        d, _ = tree.query(M)
        e = float(np.sqrt((d ** 2).mean()))
        if best is None or e < best[0]:
            best = (e, float(c))
    return best[1], best[0]


def girth_profile(U, T, drop, n=60):
    """(ys, girth) of the trunk, from real triangle cross-sections.

    counting vertices per horizontal slice does not work on a 267-vertex model
    -- a slice can hold two of them. the tail and the feet are dropped: both
    cross the trunk's height range and would fill in the waist we want."""
    keep = ~drop
    Tk = T[keep[T].all(1)]
    ys = np.linspace(U[Tk, 1].min() + 1e-3, U[Tk, 1].max() - 1e-3, n)
    out = np.zeros(n)
    for i, y in enumerate(ys):
        pts = []
        for tri in Tk:
            p = U[tri]
            for a, b in ((0, 1), (1, 2), (2, 0)):
                ya, yb = p[a, 1], p[b, 1]
                if (ya - y) * (yb - y) < 0:
                    pts.append(p[a] + (y - ya) / (yb - ya) * (p[b] - p[a]))
        if len(pts) >= 3:
            s = np.array(pts)
            out[i] = float(np.ptp(s[:, 0]) + np.ptp(s[:, 2]))
    return ys, out


def neck_line(U, T, drop):
    """the y of the narrowest cross-section between the two mass peaks, chosen
    by PROMINENCE.

    splitting the search at the model's mid height (the obvious way) assumes the
    torso's widest slice is below it. here the head reaches well past halfway
    down, so the "torso peak" came out a jaw and the neck landed at the eyes --
    which is the face-warping bug: everything below that line was skinned to the
    chest and sheared whenever the body leaned."""
    ys, gir = girth_profile(U, T, drop)
    gir = np.convolve(gir, np.ones(3) / 3.0, mode="same")
    n = len(gir)
    prom = np.full(n, -1e9)
    for i in range(int(0.12 * n), int(0.88 * n)):
        prom[i] = min(gir[:i].max(), gir[i + 1:].max()) - gir[i]
    return float(ys[int(np.argmax(prom))])


# ---------------------------------------------------------------------------
def load(src):
    """read the source glb and put it in normalised space."""
    from glbtool import Glb
    g = Glb(src)
    prim = g.json["meshes"][0]["primitives"][0]
    P = g.accessor(prim["attributes"]["POSITION"]).astype(np.float64)
    I = g.accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
    U, inv, T = weld(P, I)
    A = graph(U, T)
    ncomp, comp = sparse.csgraph.connected_components(A, directed=False)
    main = int(np.bincount(comp).argmax())
    on_main = comp == main

    # the tail first, because it is what makes the mirror fit lie
    ctr = U[on_main].mean(0)
    c0 = int(np.argmin(np.linalg.norm(U - ctr, axis=1) + 1e6 * ~on_main))
    tail = waist(A, farthest(U, on_main, np.where(on_main, geo(A, c0), -1.0)),
                 on_main, 20, 90)
    ex = np.zeros(len(U), bool)
    ex[tail] = True
    x0, mirr_rms = mirror_x(U, ex)
    y0 = float(U[:, 1].min())
    z0 = float(np.median(U[~ex, 2]))
    scale = TARGET_HEIGHT / float(np.ptp(U[:, 1]))
    off = np.array([x0, y0, z0])

    return dict(glb=g, prim=prim, attrs={k: g.accessor(v).astype(np.float64)
                                         for k, v in prim["attributes"].items()},
                P=(P - off) * scale, I=I, U=(U - off) * scale, inv=inv, T=T, A=A,
                comp=comp, on_main=on_main, tail_topo=tail,
                mirror_rms=mirr_rms * scale, xform=(off, scale))


def segment(m, verbose=False):
    """per-WELDED-vertex part label, plus the ear weight fields."""
    U, T, A = m["U"], m["T"], m["A"]
    n = len(U)
    part = np.full(n, "core", dtype=object)

    part[m["tail_topo"]] = "tail"
    part[in_box(U, TAIL_ROOT_BOX) & (part == "core")] = "tail"
    part[~m["on_main"]] = "foot.R"
    for nm in ("foot.L", "arm.L", "arm.R"):
        part[in_box(U, BOXES[nm]) & (part == "core")] = nm

    drop = np.isin(part, ["tail", "foot.L", "foot.R"])
    neck_y = neck_line(U, T, drop)
    rest = part == "core"
    part[rest] = np.where(U[rest, 1] >= neck_y, "head", "torso")

    # --- ears: a graded FIELD, not a rigid part ---------------------------
    # the owner's brief is that the ears are semi-part of the head and only
    # their tips may move. an ear that is a rigid part hinged at its base drags
    # the skull around with it, which is what made the face contort during an
    # ear twitch. so: zero at the base, one at the tip, faded out toward the
    # midline. the labels are only for the pictures and the gate.
    earw = ear_field(U, part)
    for nm in ("ear.L", "ear.R"):
        part[earw[nm] > 0.5] = nm

    meta = {"neck_y": neck_y, "earw": earw,
            "head_centre": U[np.isin(part, ["head", "ear.L", "ear.R"])].mean(0)}
    if verbose:
        for k in PART_NAMES:
            s = part == k
            if not s.any():
                print(f"  {k:7s}    0")
                continue
            print(f"  {k:7s} {s.sum():4d}  x[{U[s,0].min():+.2f},{U[s,0].max():+.2f}]"
                  f" y[{U[s,1].min():+.2f},{U[s,1].max():+.2f}]"
                  f" z[{U[s,2].min():+.2f},{U[s,2].max():+.2f}]")
        print(f"  neck_y {neck_y:+.3f}   mirror rms {m['mirror_rms']:.3f}")
    return part, meta


def ear_field(U, part):
    """per-vertex ear weight, measured along each ear's OWN axis (head centre ->
    that ear's tip) so both ears behave identically even though one is 0.11
    taller than the other. re-measurable at any point in the pipeline, which
    matters because surgery and subdivision both add vertices to the head."""
    head = np.isin(part, ["head", "ear.L", "ear.R"])
    hc = U[head].mean(0)
    out = {}
    for nm, sgn in (("ear.L", +1), ("ear.R", -1)):
        side = head & (np.sign(U[:, 0]) == sgn)
        if not side.any():
            out[nm] = np.zeros(len(U))
            continue
        tip = U[farthest(U, side, U[:, 1] + 0.3 * sgn * U[:, 0])]
        ax = tip - hc
        L = float(np.linalg.norm(ax))
        ax = ax / max(L, 1e-9)
        t = np.clip(((U - hc) @ ax) / max(L, 1e-9), 0, 1)
        t = np.clip((t - EAR_T0) / (1.0 - EAR_T0), 0, 1)
        t = t * t * (3 - 2 * t)
        lat = np.clip((np.abs(U[:, 0]) - EAR_LAT0) / (EAR_LAT1 - EAR_LAT0), 0, 1)
        out[nm] = np.where(side, t * lat, 0.0)
    return out
