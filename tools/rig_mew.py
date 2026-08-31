"""rig_mew.py

build src/assets/mew.glb from the meshy source (mewNew.glb).

    python3 tools/rig_mew.py

pipeline, in order
    tools/mewparts.py     normalise + cut the mesh into anatomical parts
    tools/tailbuild.py    delete the meshy tail, grow a new one out of the butt
    tools/meshsurgery.py  detach every other limb into its own CLOSED shell
    tools/retexture.py    new uvs + a flat-pink atlas with the face baked on
    tools/facemorph.py    blink / squint / smile targets
    here                  skeleton, weights, export

WHAT THE OWNER ASKED FOR, AND WHERE IT LIVES
    "feet never change shape"        -> their own shells, 100% one joint
    "head doesn't change shape"      -> 100% one joint above the neck band
    "arms one piece, hinge at the
     armpit, and they must MOVE"     -> their own shells, one joint each, back
                                        on the chest (they could not leave the
                                        head while they shared its vertices)
    "ear twitch only near the tips"  -> graded field (tools/mewparts.py)
    "cut the tail off at the butt
     and redo it"                    -> the meshy tail (welded to the RIGHT HIP,
                                        sweeping out sideways) is deleted and the
                                        hip capped; a new one is grown on the
                                        midline out of the butt, its own closed
                                        shell, its own 10-bone chain, nothing
                                        else weighted to it at all.
                                        tools/tailbuild.py + pose/tailChain.js
    "solid pink skin, eyes and
     blush identical"                -> tools/retexture.py
    "bring the blink back"           -> tools/facemorph.py

EVERYTHING RUNS ON A WELDED MESH and is exploded to flat-shaded triangles only
at export. the source ships vertex-split for faceting, which makes every edge
look like a boundary edge and defeats any topological operation.
"""

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from glbtool import GlbWriter                # noqa: E402
import mewparts as mp                        # noqa: E402
import meshsurgery as ms                     # noqa: E402
import tailbuild as tb                       # noqa: E402
import retexture as rt                       # noqa: E402
import facemorph as fm                       # noqa: E402

SRC = os.path.join(ROOT, "mewNew.glb")
DST = os.path.join(ROOT, "src", "assets", "mew.glb")

NTAIL = 10          # more joints than the old 7: the solver is a rod now, and
                    # segment count is what buys it curvature resolution
LIMBS = ["arm.L", "arm.R", "foot.L"]     # foot.R already ships loose, and the
                                         # tail is not cut off the body any more
                                         # -- it is deleted and regrown, see
                                         # tools/tailbuild.py

ORDER = ["root", "spine", "chest", "neck", "head", "ear.L", "ear.R",
         "arm.L", "arm.R", "foot.L", "foot.R"] + \
        ["tail.%03d" % k for k in range(1, NTAIL + 1)]
PARENT = {"root": None, "spine": "root", "chest": "spine", "neck": "chest",
          "head": "neck", "ear.L": "head", "ear.R": "head",
          # the arms are free shells now, so they hang off the CHEST where they
          # belong. while they shared vertices with the collar they had to be
          # parented to the head or the collar tore open on every head turn.
          "arm.L": "chest", "arm.R": "chest",
          "foot.L": "root", "foot.R": "root", "tail.001": "root",
          **{"tail.%03d" % (k + 1): "tail.%03d" % k for k in range(1, NTAIL)}}

# --- weight shaping --------------------------------------------------------
COLLAR_TOP = 0.06    # the head hands over from the neck joint between
NECK_BAND = 0.22     # neck_y+COLLAR_TOP and +COLLAR_TOP+NECK_BAND. above that
                     # the head is RIGID, which is why the face cannot warp.
                     # this character has almost no neck, so the band has to do
                     # two things at once: start low enough to begin at the
                     # actual narrow ring (a short band high up concentrated the
                     # whole shear into one row of vertices and tore the collar,
                     # 11% of body height on a 42 deg head turn) and finish
                     # BELOW the chin at y 0.83, or the face stops being rigid.
                     # 0.581 -> 0.801 clears both.
FLAP_T0, FLAP_T1 = 0.22, 0.62   # weight ramp along an arm nub (see hinge())


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------------------
def place_joints(P, part, meta, tailC, sockets):
    """the skeleton, in normalised space. every joint is measured INSIDE the
    part it drives, so a joint can never sit in a region it does not own."""
    torso = P[part == "torso"]
    head = P[np.isin(part, ["head", "ear.L", "ear.R"])]
    neck_y = meta["neck_y"]
    zc = float(np.median(torso[:, 2]))
    J = {}

    # THE ROOT IS THE ROTATION CENTRE, and it has to be the model's own centre.
    # bodyPose spins the whole character about this joint while main.js parks
    # the pivot (sizing.pivotFactor) on the physics point; when the two are
    # different heights, turning upside down swings the head a long way outside
    # the collision circle -- which is exactly the "everything above the belly
    # clips through the page" report. keep these two in step: check_mew asserts
    # root.y / height == pivotFactor.
    body = ~np.isin(part, ["tail"])
    J["root"] = [0.0, float(P[body, 1].mean()), zc]

    ty0 = float(torso[:, 1].min())
    J["spine"] = [0.0, ty0 + 0.70 * (neck_y - ty0), zc]
    J["chest"] = [0.0, neck_y - 0.02, zc]
    J["neck"] = [0.0, neck_y + 0.04, zc]
    # the head joint sits at the TOP of the neck, not at the skull's centre, so
    # the head swivels on the neck instead of spinning about its own middle
    J["head"] = [0.0, neck_y + 0.13, float(np.median(head[:, 2])) * 0.2]

    # ears: at the base of the MOVING part of each ear, i.e. where the ear field
    # first bites. hinging any lower drags the skull.
    hc = meta["head_centre"]
    for nm, sgn in (("ear.L", +1), ("ear.R", -1)):
        side = np.isin(part, ["head", "ear.L", "ear.R"]) & (np.sign(P[:, 0]) == sgn)
        tip = P[mp.farthest(P, side, P[:, 1] + 0.3 * sgn * P[:, 0])]
        J[nm] = list(hc + (tip - hc) * mp.EAR_T0)

    # limbs: the centre of the socket they were cut from, which is the hinge
    for nm in ("arm.L", "arm.R", "foot.L", "foot.R"):
        if nm in sockets:
            J[nm] = list(sockets[nm])
        else:                              # foot.R ships loose: use its own end
            f = P[part == nm]
            J[nm] = list(f[np.argsort(np.abs(f[:, 0]))[:6]].mean(0))

    # tail: joints evenly by arc length along the generated centreline. they
    # stop at 90%, because rig.js turns N bones into N+1 sim points by
    # EXTRAPOLATING one more segment past the last joint -- spreading the joints
    # over the whole arc puts that phantom point out beyond the club.
    seg = np.linalg.norm(np.diff(tailC, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    want = np.linspace(0, cum[-1] * 0.90, NTAIL)
    for k in range(NTAIL):
        J["tail.%03d" % (k + 1)] = [float(np.interp(want[k], cum, tailC[:, i]))
                                    for i in range(3)]
    return J


# ---------------------------------------------------------------------------
def hinge(sel, P, I, body_ctr):
    """per-vertex weight for a limb that must move as ONE rigid piece.

    now that every limb is its own closed shell there is no shared ring left to
    hand back, so a limb is simply 1.0 throughout -- except the arms, which are
    stubby flaps whose plug reaches deep into the collar; those ramp along their
    own axis so the plug does not poke out of the socket when they swing."""
    V = P[sel]
    c = V.mean(0)
    ax = c - body_ctr
    n = np.linalg.norm(ax)
    if n < 1e-9:
        return np.ones(len(V))
    ax /= n
    t = (V - c) @ ax
    t = (t - t.min()) / max(float(np.ptp(t)), 1e-9)
    return smoothstep((t - FLAP_T0) / (FLAP_T1 - FLAP_T0))


def skin(P, I, part, meta, J, tailC):
    """per-vertex weights. explicit, region by region -- no distance falloff
    over the whole skeleton, which is what used to let an ear twitch reach the
    muzzle and an arm share vertices with the skull."""
    idx = {n: i for i, n in enumerate(ORDER)}
    W = np.zeros((len(P), len(ORDER)))
    neck_y = meta["neck_y"]
    hand_y = neck_y + COLLAR_TOP

    # --- trunk: three overlapping tents up the body -----------------------
    t = part == "torso"
    y = P[t, 1]
    lo, hi = float(y.min()), neck_y
    u = np.clip((y - lo) / max(hi - lo, 1e-6), 0, 1)
    W[t, idx["root"]] = np.clip(1.0 - u / 0.5, 0, 1)
    W[t, idx["chest"]] = np.clip((u - 0.5) / 0.5, 0, 1)
    W[t, idx["spine"]] = 1.0 - W[t, idx["root"]] - W[t, idx["chest"]]

    # --- head: rigid above the neck band ----------------------------------
    h = np.isin(part, ["head", "ear.L", "ear.R"])
    k = smoothstep((P[h, 1] - hand_y) / NECK_BAND)
    W[h, idx["head"]] = k
    W[h, idx["neck"]] = 1.0 - k

    # --- ears: taken out of the head, never out of the neck ---------------
    for nm in ("ear.L", "ear.R"):
        take = np.minimum(meta["earw"][nm], W[:, idx["head"]])
        W[:, idx["head"]] -= take
        W[:, idx[nm]] += take

    # --- arms and feet: one joint each ------------------------------------
    body_ctr = P[part == "torso"].mean(0)
    for nm, host in (("arm.L", "chest"), ("arm.R", "chest"),
                     ("foot.L", "root"), ("foot.R", "root")):
        s = part == nm
        if not s.any():
            continue
        g = hinge(s, P, I, body_ctr) if nm.startswith("arm") else 1.0
        W[s] = 0.0
        W[s, idx[nm]] = g
        if not np.isscalar(g):
            W[s, idx[host]] = 1.0 - g

    # --- tail: two-bone linear blend along the arc ------------------------
    # a gaussian around each joint (what this used to do) leaves the weight
    # bunched at the joints and slack between them, which shows as a lumpy
    # bend. projecting onto the chain and blending the two nearest joints is
    # the standard rod skin and gives a constant-curvature bend.
    tj = np.array([J["tail.%03d" % (k + 1)] for k in range(NTAIL)])
    tv = part == "tail"
    s, seg = _arc_param(P[tv], tj)
    i0 = np.clip(np.floor(s).astype(int), 0, NTAIL - 2)
    f = np.clip(s - i0, 0, 1)
    W[tv] = 0.0
    rows = np.where(tv)[0]
    W[rows, [idx["tail.%03d" % (i + 1)] for i in i0]] = 1 - f
    W[rows, [idx["tail.%03d" % (i + 2)] for i in i0]] = f

    s = W.sum(1, keepdims=True)
    W = W / np.maximum(s, 1e-9)
    order = np.argsort(-W, axis=1)[:, :4]
    Jo = order.astype(np.uint8)
    Wo = np.take_along_axis(W, order, axis=1)
    Wo /= np.maximum(Wo.sum(1, keepdims=True), 1e-9)
    return Jo, Wo, W


def _arc_param(V, tj):
    """continuous position of each vertex along the joint polyline, in joint
    index units."""
    best = np.full(len(V), 1e18)
    out = np.zeros(len(V))
    for i in range(len(tj) - 1):
        a, b = tj[i], tj[i + 1]
        ab = b - a
        L2 = float(ab @ ab)
        t = np.clip(((V - a) @ ab) / max(L2, 1e-12), 0, 1)
        d = np.linalg.norm(V - (a + t[:, None] * ab), axis=1)
        m = d < best
        best[m] = d[m]
        out[m] = i + t[m]
    return out, best


# ---------------------------------------------------------------------------
def explode(P, I, uv, W_full, morphs):
    """one vertex per triangle CORNER, so every face is flat shaded (the look
    the character is authored in) and the new per-corner uvs survive."""
    n = len(I) * 3
    vi = I.reshape(-1)
    Pv = P[vi]
    UVv = uv.reshape(-1, 2)
    Wv = W_full[vi]
    tri = P[I]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    Nv = np.repeat(fn, 3, axis=0)
    Mv = {k: v[vi] for k, v in morphs.items()}
    return Pv, np.arange(n, dtype=np.uint32).reshape(-1, 3), UVv, Nv, Wv, Mv


def write_glb(P, I, N, UV, Jo, Wo, J, morphs, atlas, path, eyes=None):
    import io
    from PIL import Image
    gw = GlbWriter()
    acc = {"POSITION": gw.add(P.astype(np.float32), "VEC3", 5126, target=34962,
                              minmax=True),
           "NORMAL": gw.add(N.astype(np.float32), "VEC3", 5126, target=34962),
           "TEXCOORD_0": gw.add(UV.astype(np.float32), "VEC2", 5126, target=34962),
           "JOINTS_0": gw.add(Jo, "VEC4", 5121, target=34962),
           "WEIGHTS_0": gw.add(Wo.astype(np.float32), "VEC4", 5126, target=34962)}
    a_i = gw.add(I.reshape(-1).astype(np.uint32), "SCALAR", 5125, target=34963)
    names = list(morphs.keys())
    targets = [{"POSITION": gw.add_sparse(morphs[k].astype(np.float32), "VEC3",
                                          5126, minmax=True)} for k in names]

    idx = {n: i for i, n in enumerate(ORDER)}
    ibm = np.zeros((len(ORDER), 16), np.float32)
    for n in ORDER:
        M = np.eye(4)
        M[:3, 3] = -np.array(J[n])
        ibm[idx[n]] = M.T.reshape(-1)          # gltf matrices are column-major
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

    buf = io.BytesIO()
    Image.fromarray(atlas.astype(np.uint8)).save(buf, format="PNG", optimize=True)
    img_view = gw._view(buf.getvalue())

    prim = {"attributes": acc, "indices": a_i, "material": 0, "mode": 4}
    if targets:
        prim["targets"] = targets
    gltf = {
        "scene": 0, "scenes": [{"nodes": [root_node]}], "nodes": nodes,
        "meshes": [{"name": "MewBody", "primitives": [prim],
                    "weights": [0.0] * len(names),
                    "extras": {"targetNames": names, "eyes": eyes or []}}],
        "skins": [{"name": "MewRig", "joints": [idx[n] for n in ORDER],
                   "inverseBindMatrices": a_ibm, "skeleton": idx["root"]}],
        "materials": [{"name": "MewSkin", "doubleSided": False,
                       "pbrMetallicRoughness": {
                           "baseColorTexture": {"index": 0},
                           "metallicFactor": 0.0, "roughnessFactor": 0.85}}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987,
                      "wrapS": 33071, "wrapT": 33071}],
        "images": [{"bufferView": img_view, "mimeType": "image/png"}],
        "textures": [{"source": 0, "sampler": 0}],
    }
    gw.write(path, gltf)


# ---------------------------------------------------------------------------
def build(verbose=True):
    m = mp.load(SRC)
    partw, meta = mp.segment(m, verbose=verbose)
    U, T = m["U"], m["T"]
    src_I, src_UV = m["I"], m["attrs"]["TEXCOORD_0"]
    TEX = rt.source_texture(m["glb"])

    # PROVENANCE starts here and is carried all the way to the bake: every
    # triangle remembers which SOURCE triangle it came from, so the face art can
    # be looked up through the old uv layout no matter what surgery happens in
    # between. -1 means "generated here", which only the flat-skin parts ever are.
    tri_src = np.arange(len(T))

    # --- 1. delete the meshy tail and cap the hip it left ------------------
    P, I, part, tri_src = tb.remove(U, T, partw, tri_src)

    # --- 2. detach the remaining limbs into their own closed shells --------
    body_ctr = P[part == "torso"].mean(0)
    P, I, part, sockets = ms.detach(P, I, part, LIMBS, body_ctr)
    tri_src = np.concatenate([tri_src, np.full(len(I) - len(tri_src), -1)])
    ncomp, comp = ms.components(P, I)
    big = int(np.argmax(np.bincount(comp)))
    stray = (comp == big) & np.isin(part, LIMBS + [ms.SOCKET_LABEL])
    part[stray] = np.where(P[stray, 1] >= meta["neck_y"], "head", "torso")

    # --- 3. grow the new tail out of the butt ------------------------------
    P, I, part, tri_src, C_new = tb.grow(P, I, part, tri_src)
    ncomp, comp = ms.components(P, I)

    corner_bary = np.tile(np.eye(3), (len(I), 1, 1))
    ft = rt.face_triangles(P, I, part, meta)
    P, I, tri_src, corner_bary, ft, part = rt.subdivide(
        P, I, tri_src, corner_bary, ft, levels=2, part=part)

    # the ear field is re-measured HERE, after surgery and subdivision: both
    # add vertices to the head, and a field measured before them leaves the new
    # ones with no ear weight at all (and the array lengths disagree)
    meta["earw"] = mp.ear_field(P, part)
    meta["head_centre"] = P[np.isin(part, ["head", "ear.L", "ear.R"])].mean(0)

    # --- 4. new uvs + baked atlas ------------------------------------------
    uv, uvinfo = rt.plan_uvs(P, I, ft)
    rgb, cov = rt.bake_face(uv, I, ft, tri_src, corner_bary, src_I, src_UV, TEX)
    eye, blush = rt.isolate_marks(rgb, cov)
    atlas = rt.compose(rgb, cov, eye, blush)

    # --- 5. skeleton + weights ---------------------------------------------
    J = place_joints(P, part, meta, C_new, sockets)
    Jo, Wo, Wfull = skin(P, I, part, meta, J, C_new)

    # --- 6. expression morphs ----------------------------------------------
    morphs = fm.build(P, I, uv, ft, eye, uvinfo, cov, part, meta)
    # WHERE THE EYES ARE, for the engine to draw the >.< overlay on. It travels
    # in the glb rather than rigConfig so it can never drift from the atlas.
    eyes = fm.eye_meta(P, I, ft, eye, uvinfo)

    Pv, Iv, UVv, Nv, Wv, Mv = explode(P, I, uv, Wfull, morphs)
    order = np.argsort(-Wv, axis=1)[:, :4]
    Jov = order.astype(np.uint8)
    Wov = np.take_along_axis(Wv, order, axis=1)
    Wov /= np.maximum(Wov.sum(1, keepdims=True), 1e-9)

    write_glb(Pv, Iv, Nv, UVv, Jov, Wov, J, Mv, atlas, DST, eyes)
    with open(os.path.join(HERE, "joints.json"), "w") as fh:
        json.dump({k: [round(float(x), 4) for x in v] for k, v in J.items()},
                  fh, indent=2)

    if verbose:
        lo, hi = Pv.min(0), Pv.max(0)
        print(f"wrote {os.path.relpath(DST, ROOT)}")
        print(f"  welded {len(P)} verts / {len(I)} tris -> exported {len(Pv)} verts")
        print(f"  joints {len(ORDER)}   morphs {list(Mv)}   atlas {atlas.shape[0]}px")
        print(f"  eyes {[(e['cx'], e['cy'], e['z']) for e in eyes]}")
        print(f"  shells {ncomp}   face island {len(ft)} tris")
        print(f"  bounds x[{lo[0]:+.3f},{hi[0]:+.3f}] y[{lo[1]:+.3f},{hi[1]:+.3f}] "
              f"z[{lo[2]:+.3f},{hi[2]:+.3f}]")
        print(f"  root joint y {J['root'][1]:.4f}  -> pivotFactor "
              f"{J['root'][1] / (hi[1] - lo[1]):.4f}")
    np.save(os.path.join(HERE, "_rig.npy"),
            {"J": J, "part": part, "P": P, "I": I, "W": Wfull, "uv": uv,
             "order": ORDER, "parent": PARENT, "tail": C_new, "atlas": atlas},
            allow_pickle=True)
    return dict(J=J, P=P, I=I, part=part, W=Wfull, uv=uv, atlas=atlas, ft=ft,
                eye=eye, meta=meta, tailC=C_new)


if __name__ == "__main__":
    build()
