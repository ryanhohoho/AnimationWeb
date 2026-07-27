"""rig_new.py

auto-rig the meshy mew (mewNew_split.glb) onto the 20-joint skeleton the engine
expects, and write src/assets/mew.glb.

    python3 tools/rig_new.py                # build
    python3 tools/rig_new.py --viz          # + joint/weight pictures

design notes
------------
only TWO parts are found by topology: the tail and the two feet. both hang off
the body through a narrow neck, so the narrowest-waist cut from split_foot.py
isolates them cleanly. everything else -- head, torso, ears, arms -- attaches
over a broad area with no waist at all, and a waist search on those degenerates
to the smallest region it is allowed to return (it was confidently labelling two
patches of the skull as "arms"). so those are not segmented at all: their bones
are placed geometrically and the skin weights fall out of distance to the bone
SEGMENTS, which is what actually decides deformation anyway.

the model also arrives off-centre -- the character sits at negative x with the
tail sweeping to +x, so the mesh origin is nowhere near the body. it is
recentred on the torso axis and dropped so the feet sit at y=0, because the
engine's pivot and collider radius are both derived from the bounding box.
"""

import os
import sys
import io
import numpy as np
from scipy import sparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from glbtool import Glb, GlbWriter          # noqa: E402
from segment_mew import load, adjacency, grow   # noqa: E402

SRC = os.path.join(ROOT, "mewNew_split.glb")
DST = os.path.join(ROOT, "src", "assets", "mew.glb")

TARGET_HEIGHT = 1.75        # model units, roughly matching the previous rig


# ---------------------------------------------------------------------------
# part finding -- only what topology can actually answer
# ---------------------------------------------------------------------------
def find_parts(W, A):
    """feet FIRST, then the tail.

    the tail's root sits right beside the right foot on this model, so a
    breadth-first search from the tail tip runs straight into the foot and a
    later foot search then finds only leftovers -- the first version labelled
    the tail's lower arc as a foot. the feet are unambiguous (the two lowest
    extremes, well separated), so take them first and let the tail grow into
    what is left."""
    avail = np.ones(len(W), bool)
    feet = []
    for _ in range(2):
        sc = np.where(avail, -W[:, 1], -1e9)
        if feet:
            far = np.linalg.norm(W - W[feet[0]].mean(0), axis=1) > 0.45
            sc = np.where(avail & far, -W[:, 1], -1e9)
        f, _ = grow(A, int(np.argmax(sc)), avail, 10, 46)
        avail[f] = False
        feet.append(f)

    ctr = W.mean(0)
    d = np.where(avail, np.linalg.norm(W - ctr, axis=1), -1)
    tail, _ = grow(A, int(np.argmax(d)), avail, 24, 64)
    avail[tail] = False

    core = np.where(avail)[0]
    # the vertical axis comes from the HEAD, not the whole core: the core's
    # median x is dragged sideways by the tail root and the asymmetric pose,
    # which threw the arms and ears off-centre
    hi_core = core[W[core, 1] > np.percentile(W[core, 1], 62)]
    axis_x = float(np.median(W[hi_core, 0]))
    if W[feet[0], 0].mean() < W[feet[1], 0].mean():
        feet = feet[::-1]
    return tail, feet[0], feet[1], core, axis_x    # footL = +x side


def tail_centreline(W, A, tail, attach, n=7):
    """centreline of the tail tube, sampled evenly by ARC LENGTH.

    the first version binned vertices into equal slices of graph distance and
    took each slice's centroid. graph distance around a tube is not arc length
    -- vertices on the same ring differ by up to half the circumference, and the
    fat club end piles many vertices into one slice -- so the "centreline" came
    out as a zig-zag with 135 and 145 degree kinks and joint spacing varying 5x.
    a rest curve like that fights the sim's angle limit forever: the tail never
    settles, which is what broke the scroll gate.

    so: order by graph distance, bin by equal vertex COUNT (never empty, never
    lopsided), smooth, then resample by arc length -- the same lesson the
    procedural builder learned about sampling a curve by its parameter."""
    sub = A[tail][:, tail]
    start = int(np.argmin(np.linalg.norm(W[tail] - attach, axis=1)))
    dist = sparse.csgraph.dijkstra(sub, indices=start, directed=False)
    finite = np.isfinite(dist)
    dist[~finite] = dist[finite].max() if finite.any() else 0.0

    V = W[tail]
    order = np.argsort(dist)
    nb = max(n + 3, min(14, len(order) // 3))
    chunks = np.array_split(order, nb)
    raw = np.array([V[c].mean(0) for c in chunks if len(c)])

    # light smoothing so a single lumpy ring cannot kink the curve
    if len(raw) >= 3:
        sm = raw.copy()
        for i in range(1, len(raw) - 1):
            sm[i] = 0.25 * raw[i - 1] + 0.5 * raw[i] + 0.25 * raw[i + 1]
        raw = sm

    # resample evenly by arc length
    seg = np.linalg.norm(np.diff(raw, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    want = np.linspace(0, cum[-1], n)
    out = np.empty((n, 3))
    for k in range(3):
        out[:, k] = np.interp(want, cum, raw[:, k])
    return out


def mirror_plane(W, exclude):
    """the character's own plane of symmetry.

    measured with the TAIL EXCLUDED -- the tail is one-sided by design and
    would drag any symmetry fit toward it. the mesh turns out to be genuinely
    mirror-symmetric about this plane (4.3% rms), so the character is not posed
    asymmetrically, it is merely offset from the file's origin. that means a
    SYMMETRIC skeleton is the correct thing to fit, and any left/right
    difference in the placed joints is a bug in the placement, not the model."""
    from scipy.spatial import cKDTree
    keep = np.setdiff1d(np.arange(len(W)), exclude)
    V = W[keep]
    tree = cKDTree(V)
    best = None
    for c in np.linspace(V[:, 0].min(), V[:, 0].max(), 260):
        M = V * np.array([-1, 1, 1]) + np.array([2 * c, 0, 0])
        d, _ = tree.query(M)
        e = float(np.sqrt((d ** 2).mean()))
        if best is None or e < best[0]:
            best = (e, float(c))
    return best[1], best[0]


def fold(V, axis_x):
    """reflect everything onto one side of the mirror plane, so a paired
    feature can be measured once from twice the samples and then mirrored."""
    out = V.copy()
    out[:, 0] = axis_x + np.abs(V[:, 0] - axis_x)
    return out


def neck_plane(W, core):
    """the waist BETWEEN the head and the torso.

    "narrowest slice in the upper half" is not enough: on this character the
    head is the biggest mass in the model, so the narrowest upper slice is the
    crown, and the neck came out at y=1.63 of a 1.75-tall model -- the head bone
    then drove almost nothing and the whole skull was weighted to the chest.
    find the two mass peaks (head above, torso below) and take the minimum
    between them instead."""
    ys = W[core, 1]
    lo, hi = ys.min(), ys.max()
    bins = np.linspace(lo, hi, 34)
    wid = np.zeros(len(bins) - 1)
    for i in range(len(bins) - 1):
        m = core[(ys >= bins[i]) & (ys < bins[i + 1])]
        wid[i] = 0.0 if len(m) < 3 else float(np.ptp(W[m][:, 0]) + np.ptp(W[m][:, 2]))
    sm = np.convolve(wid, np.ones(3) / 3, mode="same")
    top = len(sm) // 2
    head_pk = top + int(np.argmax(sm[top:]))          # widest slice of the head
    torso_pk = int(np.argmax(sm[:max(top, 1)]))        # widest slice of the torso
    if head_pk <= torso_pk + 1:
        return float(bins[max(head_pk - 1, 1)])
    gap = sm[torso_pk:head_pk]
    return float(bins[torso_pk + int(np.argmin(gap))])


# ---------------------------------------------------------------------------
def build_joints(W, tail, footL, footR, core, axis_x, A):
    """place the 20 joints, PAIRED JOINTS MIRRORED.

    the first version measured each side independently, and every statistic it
    used was polluted by the tail root sitting inside the torso's x range: the
    left arm landed at +0.33 and the right at -0.20 (one of them inside the
    tail), one foot's region captured 10 vertices and the other 23, and the ears
    came out 0.2 apart. skinning a symmetric mesh with a skeleton that lopsided
    is what crumpled it. now every left/right pair is measured once on the
    folded mesh and mirrored."""
    lo, hi = W.min(0), W.max(0)
    axis_x, mirr_err = mirror_plane(W, tail)
    neck_y = neck_plane(W, core)
    head = core[W[core, 1] >= neck_y]
    torso = core[W[core, 1] < neck_y]
    hc = W[head].mean(0)
    tc = W[torso].mean(0)
    axis_z = float(np.median(W[core, 2]))

    # the waist cut isolates only the OUTER tail -- the root blends smoothly
    # into the body, so there is no waist there to find. that left tail.001 at
    # y=0.98, a third of the way along the tail, and the whole 7-joint chain
    # squeezed into the outer half. so: take the outer centreline, then extend
    # it back to where it actually meets the torso and resample the full span.
    tail_attach = W[tail][np.argmin(np.linalg.norm(
        W[tail] - np.array([axis_x, tc[1], lo[2]]), axis=1))]
    outer = tail_centreline(W, A, tail, tail_attach, n=6)
    d0 = outer[0] - outer[1]
    d0 /= max(np.linalg.norm(d0), 1e-9)
    tv = W[torso]
    ahead = tv[(tv - outer[0]) @ d0 > 0]
    root_pt = (ahead[np.argmin(np.linalg.norm(ahead - outer[0], axis=1))]
               if len(ahead) else outer[0] + d0 * 0.25)
    full = np.vstack([root_pt, outer])
    seg = np.linalg.norm(np.diff(full, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    want = np.linspace(0, cum[-1], 7)
    tj = np.stack([np.interp(want, cum, full[:, k]) for k in range(3)], 1)

    # anything close to the tail's line is TAIL, not torso -- the arm reach
    # below is measured on the torso and the tail root sits inside its x range,
    # which is what pushed hand.L out to x=0.535, past the body entirely
    def near_tail(V, r=0.22):
        d = np.min(np.linalg.norm(V[:, None, :] - full[None, :, :], axis=2), axis=1)
        return d < r

    # --- ears: fold, measure once, mirror ---------------------------------
    hv = W[head]
    htop = hv[hv[:, 1] > hc[1] + 0.30 * (hv[:, 1].max() - hc[1])]
    if len(htop) < 3:
        htop = hv
    f = fold(htop, axis_x)
    ear_dx = float(np.percentile(f[:, 0] - axis_x, 78))
    ear_y = float(np.percentile(htop[:, 1], 72))
    ear_z = float(np.median(htop[:, 2]))

    # --- arms: the torso's lateral reach, TAIL EXCLUDED -------------------
    ax_hi = float(np.percentile(W[torso, 1], 74))
    band = torso[(W[torso, 1] > ax_hi - 0.20) & (W[torso, 1] < ax_hi + 0.20)]
    if len(band) < 4:
        band = torso
    band = band[~near_tail(W[band])]
    if len(band) < 4:
        band = torso
    # measure the reach on the side AWAY FROM THE TAIL and mirror it. folding
    # both sides together does not help here: the tail root lives inside the
    # torso's x range on its own side and survives the proximity filter (the
    # tail is thick and flares where it meets the body), so the folded 94th
    # percentile read 0.74 against the clean side's 0.53 and put the hand
    # outside the body altogether.
    tail_side = np.sign(W[tail][:, 0].mean() - axis_x) or 1.0
    off = (W[band][:, 0] - axis_x) * -tail_side          # clean side, positive
    reach = float(np.percentile(off[off > 0], 88)) if (off > 0).any() else 0.3
    arm_z = float(np.median(W[band][:, 2]))

    # --- feet: pool BOTH regions, fold, mirror ----------------------------
    fv = np.vstack([W[footL], W[footR]])
    ff = fold(fv, axis_x)
    foot_dx = float(np.median(ff[:, 0] - axis_x))
    foot_y = float(np.median(fv[:, 1])) + 0.12
    foot_z = float(np.median(fv[:, 2]))

    J = {
        "root":   [axis_x, tc[1] - 0.02, axis_z],
        "spine":  [axis_x, tc[1] + 0.10, axis_z],
        "chest":  [axis_x, ax_hi, axis_z],
        "neck":   [axis_x, neck_y, axis_z],
        "head":   [axis_x, neck_y + 0.06, axis_z],
        "ear.L":  [axis_x + ear_dx, ear_y, ear_z],
        "ear.R":  [axis_x - ear_dx, ear_y, ear_z],
        "arm.L":  [axis_x + reach * 0.42, ax_hi, arm_z],
        "hand.L": [axis_x + reach * 0.86, ax_hi - 0.03, arm_z],
        "arm.R":  [axis_x - reach * 0.42, ax_hi, arm_z],
        "hand.R": [axis_x - reach * 0.86, ax_hi - 0.03, arm_z],
        "foot.L": [axis_x + foot_dx, foot_y, foot_z],
        "foot.R": [axis_x - foot_dx, foot_y, foot_z],
    }
    for k in range(7):
        J["tail.%03d" % (k + 1)] = list(tj[k])
    J["_axis_x"] = axis_x
    J["_mirror_err"] = mirr_err
    return J, head, torso, neck_y


PARENT = {
    "root": None, "spine": "root", "chest": "spine", "neck": "chest",
    "head": "neck", "ear.L": "head", "ear.R": "head",
    "arm.L": "chest", "hand.L": "arm.L", "arm.R": "chest", "hand.R": "arm.R",
    "foot.L": "root", "foot.R": "root",
    "tail.001": "root", **{"tail.%03d" % (k + 1): "tail.%03d" % k for k in range(1, 7)},
}
ORDER = ["root", "spine", "chest", "neck", "head", "ear.L", "ear.R",
         "arm.L", "hand.L", "arm.R", "hand.R", "foot.L", "foot.R"] + \
        ["tail.%03d" % k for k in range(1, 8)]


# ---------------------------------------------------------------------------
# weights
# ---------------------------------------------------------------------------
STUB = {
    "root": (0, -0.06, 0), "chest": (0, 0.10, 0.01), "head": (0, 0.42, 0.02),
    "ear.L": (0.06, 0.16, -0.02), "ear.R": (-0.06, 0.16, -0.02),
    "hand.L": (0.12, -0.03, 0.02), "hand.R": (-0.12, -0.03, 0.02),
    "foot.L": (0.04, -0.22, 0.04), "foot.R": (-0.04, -0.22, 0.04),
    "tail.007": (0.10, 0.06, 0.04),
}


def segments(J):
    kids = {n: [] for n in ORDER}
    for n in ORDER:
        if PARENT[n]:
            kids[PARENT[n]].append(n)
    seg = {}
    for n in ORDER:
        a = np.array(J[n], float)
        if n in STUB:
            b = a + np.array(STUB[n], float)
        elif kids[n]:
            b = np.array(J[kids[n][0]], float)
        else:
            b = a + np.array([0, 0.08, 0])
        seg[n] = (a, b)
    return seg


def seg_dist(P, a, b):
    ab = b - a
    L2 = float(ab @ ab)
    t = np.clip(((P - a) @ ab) / max(L2, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


TRUNK = ["root", "spine", "chest", "neck", "head", "ear.L", "ear.R",
         "arm.L", "hand.L", "arm.R", "hand.R"]
TAILB = ["tail.%03d" % k for k in range(1, 8)]

# which bones may touch which anatomical region. this is the whole point: the
# original model was SOLID and articulated only at the neck and the tail, and it
# achieved that by restricting each region to two or three bones. binding by
# plain distance to all bones instead let the EAR bones pull on the face (every
# face vertex ended up influenced by four bones, mean dominant weight 0.60), so
# an ear twitch visibly warped the muzzle.
REGION_BONES = {
    "head": ["head", "neck"],
    "ear.L": ["ear.L", "head"],
    "ear.R": ["ear.R", "head"],
    "torso": ["chest", "spine", "root", "neck"],
    "arm.L": ["hand.L"],
    "arm.R": ["hand.R"],
    "foot.L": ["foot.L"],
    "foot.R": ["foot.R"],
    "tail": TAILB + ["root"],
}
ARM_RADIUS = 0.20   # how far from the hand bone still counts as arm
HEAD_BLEND = 0.16   # metres of neck->head handover; above this the head
                    # is 100% rigid, so the face never deforms
RIGID_P = 10.0   # falloff exponent. 4 blends across half the body; 10 keeps a
                 # part essentially rigid and confines blending to its joint


def classify(V, part, J, neck_y):
    """split the 'core' into head / ears / arms / torso using the placed bones.

    only the tail and feet come from topology; the rest is decided here, by
    which bone segment each vertex actually belongs to."""
    seg = segments(J)
    out = np.array(part, dtype=object)
    core = np.where(part == "core")[0]
    if not len(core):
        return out
    Vc = V[core]

    d = {n: seg_dist(Vc, *seg[n]) for n in
         ("head", "neck", "ear.L", "ear.R", "hand.L", "hand.R", "chest")}
    above = Vc[:, 1] >= neck_y

    # ears: above the neck AND closer to an ear than to the skull's own bone
    for nm in ("ear.L", "ear.R"):
        pick = above & (d[nm] < d["head"] * 0.95)
        out[core[pick]] = nm

    # arms: the small nubs at the shoulders only. "closer to a hand than to any
    # trunk bone" is not enough on its own -- the hand bones sit at y~0.61 and
    # the legs at y~0.30, which is nearer to a hand than to root or chest, so
    # the arm region swallowed both legs. bound it by an actual radius around
    # the hand and keep it above the feet.
    trunk_d = np.minimum(np.minimum(d["chest"], d["neck"]), d["head"])
    hand_y = min(J["hand.L"][1], J["hand.R"][1])
    for nm, bn in (("arm.L", "hand.L"), ("arm.R", "hand.R")):
        pick = ((~above) & (d[bn] < trunk_d) & (d[bn] < ARM_RADIUS)
                & (Vc[:, 1] > hand_y - ARM_RADIUS) & (out[core] == "core"))
        out[core[pick]] = nm

    rest = core[out[core] == "core"]
    out[rest] = np.where(V[rest, 1] >= neck_y, "head", "torso")
    return out


def skin(V, part, J):
    """near-rigid binding: inverse distance with a high exponent, restricted to
    each region's own bones. blending then only happens where two allowed bones
    are genuinely close together -- i.e. at the joint -- which is what makes the
    body read as solid instead of contorting."""
    seg = segments(J)
    idx = {n: i for i, n in enumerate(ORDER)}
    Wt = np.zeros((len(V), len(ORDER)))
    neck_y = J["neck"][1]
    for grp, bones in REGION_BONES.items():
        m = np.where(part == grp)[0]
        if not len(m):
            continue
        if grp == "head":
            # the head is ONE RIGID PIECE that swivels on the neck -- exactly
            # what the previous model did. distance-based blending cannot give
            # that here: the muzzle sits ~0.43 out in z, which puts it nearly
            # as far from the head's own bone as from the neck's, so the face
            # came out a 50/50 blend and warped whenever the neck moved. grade
            # by HEIGHT through a short band above the neck instead.
            t = np.clip((V[m, 1] - neck_y) / HEAD_BLEND, 0, 1)
            t = t * t * (3 - 2 * t)
            Wt[m, idx["head"]] = t
            Wt[m, idx["neck"]] = 1.0 - t
            continue
        w = np.zeros((len(m), len(bones)))
        for k, bn in enumerate(bones):
            w[:, k] = 1.0 / (seg_dist(V[m], *seg[bn]) ** RIGID_P + 1e-12)
        if grp == "tail":
            w[:, -1] *= 0.10          # root only steadies the very base
        w /= np.maximum(w.sum(1, keepdims=True), 1e-30)
        for k, bn in enumerate(bones):
            Wt[m, idx[bn]] = w[:, k]
    order = np.argsort(-Wt, axis=1)[:, :4]
    Jo = order.astype(np.uint8)
    Wo = np.take_along_axis(Wt, order, axis=1)
    Wo /= np.maximum(Wo.sum(1, keepdims=True), 1e-9)
    return Jo, Wo, Wt


# ---------------------------------------------------------------------------
def main():
    """--dump-joints writes the placed skeleton to tools/joints.json.
    --joints <file> loads it back, so the rig can be hand-tuned (in blender or
    by editing the numbers) without touching the code."""
    g, prim, P, I, inv, W, T = load(SRC)
    A = adjacency(T, len(W))
    tail, footL, footR, core, axis_x = find_parts(W, A)
    J, head, torso, neck_y = build_joints(W, tail, footL, footR, core, axis_x, A)

    # per-welded-vertex group, then lifted to the raw vertices
    wpart = np.full(len(W), "core", dtype=object)
    wpart[tail] = "tail"
    wpart[footL] = "foot.L"
    wpart[footR] = "foot.R"
    rawpart = wpart[inv]

    # ---- normalise: recentre on the torso axis, feet to y=0, scale --------
    axis_x = J.pop("_axis_x")
    mirr_err = J.pop("_mirror_err")
    axis_z = J["root"][2]
    shift = np.array([-axis_x, -W[:, 1].min(), -axis_z])
    scale = TARGET_HEIGHT / (W[:, 1].max() - W[:, 1].min())
    P2 = (P + shift) * scale
    for k in J:
        J[k] = list((np.array(J[k]) + shift) * scale)

    # hand-tuned joints, if any, override the fitted ones (post-normalisation,
    # so the numbers match what you see in blender after importing the glb).
    # this MUST happen before classify(): the region each vertex belongs to is
    # decided by which bone it is nearest, so loading overrides afterwards gave
    # correct weights around the moved joint but stale regions around the old
    # one -- move a hand across the body and its region stayed behind.
    jf = None
    if "--joints" in sys.argv:
        jf = sys.argv[sys.argv.index("--joints") + 1]
    elif os.path.exists(os.path.join(HERE, "joints.json")) and "--fit" not in sys.argv:
        jf = os.path.join(HERE, "joints.json")
    if jf:
        import json
        with open(jf) as fh:
            over = json.load(fh)
        n = 0
        for k, v in over.items():
            if k in J:
                J[k] = list(map(float, v))
                n += 1
        print(f"  joint overrides loaded from {os.path.relpath(jf, ROOT)}: {n}")

    rawpart = classify(P2, rawpart, J, (neck_y + shift[1]) * scale)
    Jo, Wo, Wfull = skin(P2, rawpart, J)
    if "--dump-joints" in sys.argv:
        import json
        out = os.path.join(HERE, "joints.json")
        with open(out, "w") as fh:
            json.dump({k: [round(float(x), 4) for x in v] for k, v in J.items()},
                      fh, indent=2)
        print(f"  wrote {os.path.relpath(out, ROOT)} -- edit and re-run to apply")
    print("  regions:", {k: int((rawpart == k).sum()) for k in sorted(set(rawpart))})

    attrs = {k: g.accessor(v).astype(np.float32)
             for k, v in prim["attributes"].items()}
    attrs["POSITION"] = P2.astype(np.float32)

    write_skinned(g, attrs, I, Jo, Wo, J, DST)
    lo, hi = P2.min(0), P2.max(0)
    print(f"wrote {DST}")
    print(f"  verts={len(P2)} tris={len(I)} joints={len(ORDER)}")
    print(f"  bounds x[{lo[0]:+.3f},{hi[0]:+.3f}] y[{lo[1]:+.3f},{hi[1]:+.3f}] "
          f"z[{lo[2]:+.3f},{hi[2]:+.3f}]  height={hi[1]-lo[1]:.3f}")
    print(f"  parts: tail={len(tail)} footL={len(footL)} footR={len(footR)} core={len(core)}")
    print(f"  mirror plane fit: rms {mirr_err:.4f} (mesh is symmetric -> rig is mirrored)")
    np.save(os.path.join(HERE, "_rig.npy"),
            {"J": J, "part": rawpart, "P": P2, "I": I, "W": Wfull}, allow_pickle=True)
    if "--viz" in sys.argv:
        viz(P2, I, J, rawpart, Wfull)


def write_skinned(g, attrs, I, Jo, Wo, J, path):
    gw = GlbWriter()
    acc = {}
    kind = {"POSITION": "VEC3", "NORMAL": "VEC3", "TANGENT": "VEC4",
            "TEXCOORD_0": "VEC2"}
    for k in ["POSITION", "NORMAL", "TANGENT", "TEXCOORD_0"]:
        if k in attrs:
            acc[k] = gw.add(attrs[k], kind[k], 5126, target=34962,
                            minmax=(k == "POSITION"))
    acc["JOINTS_0"] = gw.add(Jo, "VEC4", 5121, target=34962)
    acc["WEIGHTS_0"] = gw.add(Wo.astype(np.float32), "VEC4", 5126, target=34962)
    a_i = gw.add(I.reshape(-1).astype(np.uint32), "SCALAR", 5125, target=34963)

    idx = {n: i for i, n in enumerate(ORDER)}
    ibm = np.zeros((len(ORDER), 16), np.float32)
    for n in ORDER:
        M = np.eye(4)
        M[:3, 3] = -np.array(J[n])
        ibm[idx[n]] = M.T.reshape(-1)          # gltf is column-major
    a_ibm = gw.add(ibm, "MAT4", 5126)

    nodes = []
    for n in ORDER:
        p = PARENT[n]
        loc = np.array(J[n]) - (np.array(J[p]) if p else np.zeros(3))
        nodes.append({"name": n.replace(".", ""),
                      "translation": [float(v) for v in loc], "children": []})
    for n in ORDER:
        if PARENT[n]:
            nodes[idx[PARENT[n]]]["children"].append(idx[n])
    for nd in nodes:
        if not nd["children"]:
            nd.pop("children")

    mesh_node = len(nodes)
    nodes.append({"name": "Mew", "mesh": 0, "skin": 0})
    root_node = len(nodes)
    nodes.append({"name": "MewRig", "children": [mesh_node, idx["root"]]})

    gltf = {
        "scene": 0, "scenes": [{"nodes": [root_node]}], "nodes": nodes,
        "meshes": [{"name": "MewBody", "primitives": [
            {"attributes": acc, "indices": a_i, "material": 0, "mode": 4}]}],
        "skins": [{"name": "MewRig", "joints": [idx[n] for n in ORDER],
                   "inverseBindMatrices": a_ibm, "skeleton": idx["root"]}],
        "materials": g.json.get("materials", []),
        "samplers": g.json.get("samplers", [{"magFilter": 9729, "minFilter": 9987}]),
    }
    if g.json.get("images"):
        img = g.json["images"][0]
        bv = g.json["bufferViews"][img["bufferView"]]
        off = bv.get("byteOffset", 0)
        gltf["images"] = [{"bufferView": gw._view(g.bin[off:off + bv["byteLength"]]),
                           "mimeType": img.get("mimeType", "image/jpeg")}]
        gltf["textures"] = g.json.get("textures", [{"source": 0, "sampler": 0}])
    gw.write(path, gltf)


def viz(P, I, J, part, Wfull):
    import preview_model as pm
    from PIL import Image, ImageDraw
    COL = {"tail": (250, 130, 60), "foot.L": (110, 255, 130),
           "foot.R": (60, 200, 90), "core": (190, 190, 205),
           "head": (245, 130, 200), "torso": (185, 188, 205),
           "ear.L": (95, 220, 255), "ear.R": (55, 145, 255),
           "arm.L": (255, 225, 90), "arm.R": (225, 175, 45)}
    cols = np.array([COL.get(part[t[0]], (150, 150, 160)) for t in I], float)
    views = [("front", (0, 0, 1)), ("left", (1, 0, 0)), ("3/4", (0.7, 0.15, 0.75))]
    CW, CH = 640, 700
    lo, hi = P.min(0), P.max(0)
    ctr, rad = (lo + hi) / 2, np.linalg.norm(hi - lo) / 2
    tiles = []
    for nm, d in views:
        d = np.array(d, float)
        d /= np.linalg.norm(d)
        v = pm.look_at(ctr + d * rad * 4, ctr, (0, 1, 0))
        _, Pc = pm.project(P, v, CW, CH, 1, np.zeros(3))
        cc = (Pc.min(0) + Pc.max(0)) / 2
        ext = (Pc.max(0) - Pc.min(0))[:2]
        s = min(CW / (ext[0] * 1.1), CH / (ext[1] * 1.1))
        Pv, _ = pm.project(P, v, CW, CH, s, cc)
        img = pm.rasterize(Pv, I, CW, CH, pm.shade(P, I, cols, v))
        im = Image.fromarray(img.astype(np.uint8))
        dr = ImageDraw.Draw(im)
        Q = np.array([J[n] for n in ORDER])
        Qv, _ = pm.project(Q, v, CW, CH, s, cc)
        for n in ORDER:
            if PARENT[n]:
                a, b = Qv[ORDER.index(PARENT[n])], Qv[ORDER.index(n)]
                dr.line([a[0], a[1], b[0], b[1]], fill=(255, 60, 60), width=3)
        for i, n in enumerate(ORDER):
            x, y = Qv[i, 0], Qv[i, 1]
            dr.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 235, 40))
        tiles.append(np.asarray(im).astype(float))
    sheet = np.tile(pm.BG, (CH, CW * len(tiles), 1))
    for i, t in enumerate(tiles):
        sheet[:, i * CW:(i + 1) * CW] = t
    p = os.path.join(HERE, "preview", "rig_new.png")
    Image.fromarray(sheet.astype(np.uint8)).save(p)
    print("wrote", p)


if __name__ == "__main__":
    main()
