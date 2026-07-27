"""segment_mew.py

split the meshy mesh into the anatomical parts the rig needs: tail, ears, arms,
feet, head, body. everything downstream (joint placement, skin weights) is
driven by this, so it is a separate step with its own picture to check.

method: each protrusion is grown from a seed with the same narrowest-waist cut
split_foot.py uses. the most DISTAL parts are taken first (tail, ears, arms,
feet) and their vertices removed from play, so the head and body are simply
what is left -- a limb search on a body that still has its limbs attached keeps
finding the limbs.

    python3 tools/segment_mew.py mewNew_split.glb --report
"""

import os
import sys
import numpy as np
from scipy import sparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbtool import Glb  # noqa: E402

PARTS = ["tail", "ear.L", "ear.R", "arm.L", "arm.R",
         "foot.L", "foot.R", "head", "body"]


def load(path):
    g = Glb(path)
    prim = g.json["meshes"][0]["primitives"][0]
    P = g.accessor(prim["attributes"]["POSITION"]).astype(np.float64)
    I = g.accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
    key = np.round(P / 1e-6).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.ravel()
    nW = int(inv.max()) + 1
    W = np.zeros((nW, 3))
    W[inv] = P
    T = inv[I]
    return g, prim, P, I, inv, W, T


def adjacency(T, n):
    E = np.vstack([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    A = sparse.coo_matrix((np.ones(len(E)), (E[:, 0], E[:, 1])), shape=(n, n))
    return (A + A.T).tocsr()


def grow(A, seed, avail, kmin, kmax):
    """BFS from seed inside `avail`, cut at the narrowest frontier."""
    n = A.shape[0]
    mask = avail.copy()
    sub = A[mask][:, mask]
    idx = np.where(mask)[0]
    remap = -np.ones(n, int)
    remap[idx] = np.arange(len(idx))
    if remap[seed] < 0:
        return np.array([], int), 0
    order = sparse.csgraph.breadth_first_order(sub, remap[seed], directed=False,
                                               return_predecessors=False)
    kmax = min(kmax, len(order) - 1)
    if kmax <= kmin:
        return idx[order], 0
    claimed = np.zeros(len(idx), bool)
    best_k, best_cut = kmin, None
    for k in range(1, kmax + 1):
        claimed[order[k - 1]] = True
        if k < kmin:
            continue
        cut = int(sub[order[:k]][:, ~claimed].nnz)
        if best_cut is None or cut < best_cut:
            best_cut, best_k = cut, k
    return idx[order[:best_k]], best_cut


def segment(W, T, A, report=False):
    n = len(W)
    part = np.full(n, "", dtype=object)
    avail = np.ones(n, bool)
    ctr = W.mean(0)

    def take(name, seed, kmin, kmax):
        sel, cut = grow(A, seed, avail, kmin, kmax)
        part[sel] = name
        avail[sel] = False
        if report:
            V = W[sel]
            print(f"  {name:<7} n={len(sel):3d} cut={cut:3d} "
                  f"centroid={np.round(V.mean(0), 3)}")
        return sel

    # 1. TAIL -- the point furthest from the body centre by a long way
    d = np.linalg.norm(W - ctr, axis=1)
    take("tail", int(np.argmax(np.where(avail, d, -1))), 22, 110)

    # 2. EARS -- the two highest remaining points, one per side
    for nm, sgn in (("ear.L", 1), ("ear.R", -1)):
        score = np.where(avail, W[:, 1] + 0.25 * sgn * W[:, 0], -1e9)
        take(nm, int(np.argmax(score)), 6, 34)

    # 3. ARMS -- extreme lateral, in a band that must stay ABOVE the feet.
    # the first version reached down to y = centroid-0.25, which on this model
    # is inside the legs, so the "arm" search happily swallowed the loose foot
    # and the later foot search found nothing left.
    foot_top = W[:, 1].min() + 0.34 * (W[:, 1].max() - W[:, 1].min())
    for nm, sgn in (("arm.L", 1), ("arm.R", -1)):
        band = avail & (W[:, 1] > foot_top) & (W[:, 1] < ctr[1] + 0.40)
        score = np.where(band, sgn * W[:, 0], -1e9)
        take(nm, int(np.argmax(score)), 6, 44)

    # 4. FEET -- lowest remaining, one per side
    for nm, sgn in (("foot.L", 1), ("foot.R", -1)):
        score = np.where(avail, -W[:, 1] + 0.5 * sgn * W[:, 0], -1e9)
        take(nm, int(np.argmax(score)), 8, 48)

    # 5. HEAD -- what remains above the neck pinch
    rest = np.where(avail)[0]
    ys = W[rest, 1]
    lo, hi = ys.min(), ys.max()
    bins = np.linspace(lo, hi, 26)
    widths = []
    for i in range(len(bins) - 1):
        m = rest[(ys >= bins[i]) & (ys < bins[i + 1])]
        widths.append(0.0 if len(m) < 2 else float(np.ptp(W[m][:, 0])))
    widths = np.array(widths)
    upper = widths[len(widths) // 2:]
    neck_i = len(widths) // 2 + int(np.argmin(upper))
    neck_y = bins[neck_i]
    part[rest[W[rest, 1] >= neck_y]] = "head"
    part[rest[W[rest, 1] < neck_y]] = "body"
    if report:
        print(f"  neck at y={neck_y:.3f}  head n={(part == 'head').sum()}  "
              f"body n={(part == 'body').sum()}")
    return part, neck_y


def visualise(P, I, inv, part, path):
    """colour every triangle by the part it landed in -- the only honest way to
    confirm a segmentation."""
    sys.path.insert(0, HERE)
    import preview_model as pm
    from PIL import Image
    COL = {"tail": (250, 120, 60), "ear.L": (90, 220, 255), "ear.R": (60, 140, 255),
           "arm.L": (255, 230, 90), "arm.R": (230, 180, 40),
           "foot.L": (120, 255, 130), "foot.R": (60, 200, 90),
           "head": (245, 130, 200), "body": (185, 185, 200), "": (90, 90, 100)}
    tri_part = np.array([part[inv[t[0]]] for t in I], dtype=object)
    cols = np.array([COL.get(p, (90, 90, 100)) for p in tri_part], float)
    views = [("front", (0, 0, 1)), ("left", (1, 0, 0)),
             ("back", (0, 0, -1)), ("top", (0, 1, 0.02))]
    CW, CH = 620, 660
    lo, hi = P.min(0), P.max(0)
    ctr, rad = (lo + hi) / 2, np.linalg.norm(hi - lo) / 2
    tiles = []
    for nm, d in views:
        d = np.array(d, float)
        d /= np.linalg.norm(d)
        up = (0, 0, -1) if abs(d[1]) > 0.9 else (0, 1, 0)
        v = pm.look_at(ctr + d * rad * 4, ctr, up)
        _, Pc = pm.project(P, v, CW, CH, 1, np.zeros(3))
        cc = (Pc.min(0) + Pc.max(0)) / 2
        ext = (Pc.max(0) - Pc.min(0))[:2]
        s2 = min(CW / (ext[0] * 1.1), CH / (ext[1] * 1.1))
        Pv, _ = pm.project(P, v, CW, CH, s2, cc)
        tiles.append(pm.rasterize(Pv, I, CW, CH, pm.shade(P, I, cols, v)))
    sheet = np.tile(pm.BG, (CH, CW * len(tiles), 1))
    for i, t in enumerate(tiles):
        sheet[:, i * CW:(i + 1) * CW] = t
    Image.fromarray(sheet.astype(np.uint8)).save(path)
    print("wrote", path)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "mewNew_split.glb"
    g, prim, P, I, inv, W, T = load(src)
    A = adjacency(T, len(W))
    print(f"{src}: {len(P)} verts ({len(W)} welded), {len(I)} tris")
    part, neck_y = segment(W, T, A, report="--report" in sys.argv)
    np.save(os.path.join(HERE, "_segment.npy"),
            {"part": part, "inv": inv, "W": W, "neck_y": neck_y},
            allow_pickle=True)
    print("counts:", {p: int((part == p).sum()) for p in PARTS})
    if "--viz" in sys.argv:
        visualise(P, I, inv, part, os.path.join(HERE, "preview", "segment.png"))


if __name__ == "__main__":
    main()
