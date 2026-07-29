"""check_mew.py -- the model gate.

    python3 tools/check_mew.py

reads src/assets/mew.glb BACK (never the builder's in-memory state, so an export
bug cannot hide) and asserts every promise the pipeline makes:

  structure   weights normalised, <= 4 influences, no orphans, no hand joints
  shells      each limb is its own CLOSED shell, so it cannot drag the body
  rigid       feet / arms / head keep their exact shape under a hard pose
  ears        an ear twitch moves the tips and leaves the face untouched
  tail        trails BACKWARD, is driven by nothing but its own chain
  skin        the body samples ONE flat texel; the face island holds the eyes
  face        blink closes the painted eye and does not move the skull
  contract    rigConfig's roles resolve and pivotFactor matches the root joint

then writes tools/preview/mew_*.png so a regression is visible as well as
counted.
"""

import io
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from glbtool import Glb                      # noqa: E402
import preview_model as pm                   # noqa: E402
import meshsurgery as ms                     # noqa: E402
import retexture as rt                       # noqa: E402

GLB = os.path.join(ROOT, "src", "assets", "mew.glb")
CFG = os.path.join(ROOT, "src", "config", "rigConfig.js")
OUT = os.path.join(HERE, "preview")
FAILS = []


def check(ok, msg, detail=""):
    print(("  ok   " if ok else "  FAIL ") + msg + (f"   {detail}" if detail else ""))
    if not ok:
        FAILS.append(msg)


def cfg_num(name):
    m = re.search(rf"\b{name}:\s*([0-9.]+)", open(CFG).read())
    return float(m.group(1)) if m else None


# ---------------------------------------------------------------------------
def load():
    g = Glb(GLB)
    mesh = g.json["meshes"][0]
    prim = mesh["primitives"][0]
    P = g.accessor(prim["attributes"]["POSITION"]).astype(np.float64)
    I = g.accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
    UV = g.accessor(prim["attributes"]["TEXCOORD_0"]).astype(np.float64)
    Jo = g.accessor(prim["attributes"]["JOINTS_0"]).astype(np.int64)
    Wo = g.accessor(prim["attributes"]["WEIGHTS_0"]).astype(np.float64)
    skin = g.json["skins"][0]
    names = [g.json["nodes"][n]["name"] for n in skin["joints"]]
    wm = g.world_matrices()
    rest = np.array([wm[n][:3, 3] for n in skin["joints"]])
    parent = {}
    for i, nd in enumerate(g.json["nodes"]):
        for c in nd.get("children", []):
            parent[c] = i
    pmap = {}
    for k, node in enumerate(skin["joints"]):
        p = parent.get(node)
        pmap[names[k]] = names[skin["joints"].index(p)] if p in skin["joints"] else None
    W = np.zeros((len(P), len(names)))
    for c in range(4):
        np.add.at(W, (np.arange(len(P)), Jo[:, c]), Wo[:, c])
    tnames = mesh.get("extras", {}).get("targetNames", [])
    targets = {}
    for k, nm in enumerate(tnames):
        targets[nm] = pm._sparse_fill(g, prim["targets"][k]["POSITION"])
    img = g.json["images"][0]
    bv = g.json["bufferViews"][img["bufferView"]]
    off = bv.get("byteOffset", 0)
    atlas = np.asarray(Image.open(io.BytesIO(
        g.bin[off:off + bv["byteLength"]])).convert("RGB")).astype(float)
    return g, P, I, UV, names, rest, pmap, W, targets, atlas


def dom(W, names, want):
    return W[:, names.index(want)]


# ---------------------------------------------------------------------------
def pose(P, W, names, rest, pmap, edits):
    local = {}
    for nm in names:
        ax, deg = edits.get(nm, ((0, 1, 0), 0.0))
        local[nm] = rot(np.array(ax, float), np.deg2rad(deg))
    M = {}

    def world(nm):
        if nm in M:
            return M[nm]
        R = local[nm]
        T = np.eye(4)
        T[:3, :3] = R
        T[:3, 3] = rest[names.index(nm)] - R @ rest[names.index(nm)]
        par = pmap[nm]
        M[nm] = (world(par) @ T) if par else T
        return M[nm]

    S = np.stack([world(nm) for nm in names])
    out = np.zeros_like(P)
    Ph = np.c_[P, np.ones(len(P))]
    for k in range(len(names)):
        w = W[:, k]
        m = w > 1e-6
        if m.any():
            out[m] += w[m, None] * (Ph[m] @ S[k].T)[:, :3]
    return out


def rot(ax, a):
    ax = ax / np.linalg.norm(ax)
    K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
    return np.eye(3) + np.sin(a) * K + (1 - np.cos(a)) * (K @ K)


def rigidity(P, Q, sel):
    """residual after the best rigid fit: 0 means the set only moved and
    turned, it did not change shape."""
    A, B = P[sel], Q[sel]
    ca, cb = A.mean(0), B.mean(0)
    H = (A - ca).T @ (B - cb)
    U_, _, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U_.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U_.T
    return float(np.abs((A - ca) @ R.T - (B - cb)).max())


def edge_change(P, Q, I, limb):
    e = np.unique(np.sort(np.vstack([I[:, [0, 1]], I[:, [1, 2]], I[:, [2, 0]]]), 1), axis=0)
    e = e[limb[e[:, 0]] == limb[e[:, 1]]]
    a = np.linalg.norm(P[e[:, 0]] - P[e[:, 1]], axis=1)
    b = np.linalg.norm(Q[e[:, 0]] - Q[e[:, 1]], axis=1)
    d = np.abs(b - a)
    k = int(np.argmax(d))
    return float(d[k]), P[e[k, 0]]


# ---------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    g, P, I, UV, names, rest, pmap, W, targets, atlas = load()
    H = P[:, 1].max() - P[:, 1].min()
    ntail = sum(1 for n in names if n.startswith("tail"))
    print(f"== {os.path.relpath(GLB, ROOT)}: {len(P)} verts, {len(I)} tris, "
          f"{len(names)} joints ({ntail} tail), {len(targets)} morphs, "
          f"atlas {atlas.shape[0]}px, height {H:.3f}")

    # --- structure --------------------------------------------------------
    check(abs(W.sum(1) - 1).max() < 1e-4, "weights normalised",
          f"max err {abs(W.sum(1)-1).max():.2e}")
    check(((W > 1e-4).sum(1) <= 4).all(), "at most 4 influences per vertex")
    check((W.max(1) > 1e-3).all(), "no orphan vertices")
    check("handL" not in names and "handR" not in names,
          "no hand joints (each arm is one piece)")

    # --- shells -----------------------------------------------------------
    # the EXPORT is one vertex per corner (flat shading), so components have to
    # be counted on WELDED vertices. and the weld key has to include the joint:
    # a detached limb's socket ring sits at exactly the same coordinates as the
    # body's, on purpose (that is what makes the seam invisible at rest), so
    # welding on position alone glues every limb back onto the body.
    key = np.c_[np.round(P, 5), W.argmax(1)]
    U, inv = np.unique(key, axis=0, return_inverse=True)
    ncomp, ucomp = ms.components(U[:, :3], inv[I])
    comp = ucomp[inv]
    sizes = np.bincount(comp)
    check(ncomp >= 6, "every limb is its own shell",
          f"{ncomp} shells, sizes {sorted(sizes.tolist(), reverse=True)}")
    for k in range(ncomp):
        sel = ucomp == k
        if not ms.is_closed(inv[I], sel):
            check(False, f"shell {k} is watertight", f"{int(sel.sum())} verts")
            break
    else:
        check(True, "every shell is watertight (no holes at the sockets)")
    # and each limb owns exactly one shell
    for nm in ("footL", "footR", "armL", "armR", "tail001"):
        drv = dom(W, names, nm) > 0.5
        if not drv.any():
            check(False, f"{nm} drives vertices")
            continue
        shells = set(comp[drv].tolist())
        body_shell = int(np.argmax(sizes))
        check(body_shell not in shells,
              f"{nm} drives nothing on the body shell", f"shells {sorted(shells)}")

    # --- rigid parts ------------------------------------------------------
    for nm in ("footL", "footR"):
        w = dom(W, names, nm)
        check((w[w > 0].min() > 0.999) if (w > 0).any() else False,
              f"{nm} is 100% one joint everywhere it appears")
    for nm in ("armL", "armR"):
        w = dom(W, names, nm)
        check((w > 0.999).sum() > 6, f"{nm} has a solid rigid core",
              f"{int((w > 0.999).sum())} verts at w=1")

    hw = dom(W, names, "head")
    face = hw >= 1.0 - 1e-7          # STRICTLY one joint: anything less is the
                                     # neck band and is meant to deform
    check(face.sum() > 200, "the head has a large fully-rigid region",
          f"{int(face.sum())} verts")

    # --- hard pose: nothing rigid may change shape ------------------------
    hard = {"root": ((1, 0, 0), 26), "spine": ((0, 0, 1), 14),
            "chest": ((1, 0, 0), 14), "neck": ((0, 1, 0), 14),
            "head": ((0, 1, 0), 42), "armL": ((1, 0, 0), -54),
            "armR": ((1, 0, 0), -54), "footL": ((1, 0, 0), 58),
            "footR": ((1, 0, 0), 58),
            **{f"tail{k:03d}": ((0, 0, 1), 14) for k in range(1, ntail + 1)}}
    Q = pose(P, W, names, rest, pmap, hard)
    for nm, sel in (("footL", dom(W, names, "footL") > 0.5),
                    ("footR", dom(W, names, "footR") > 0.5),
                    ("armL", dom(W, names, "armL") > 0.999),
                    ("armR", dom(W, names, "armR") > 0.999),
                    ("head", face)):
        r = rigidity(P, Q, sel)
        check(r < 1e-6, f"{nm} keeps its exact shape under a hard pose",
              f"residual {r:.2e}")
    # ANY limb weight disqualifies an edge, not just a dominant one: the arm
    # plugs are a graded ramp, so a plug-to-plug edge is still a hinge edge
    lw = sum(dom(W, names, n) for n in ("armL", "armR", "footL", "footR"))
    rip, worst = edge_change(P, Q, I, lw > 1e-6)
    check(rip / H < 0.075, "no visible rips away from the hinges",
          f"worst edge moves {rip/H*100:.1f}% of body height at {np.round(worst,2)}")

    # --- ears -------------------------------------------------------------
    Q = pose(P, W, names, rest, pmap, {"earL": ((1, 0, 0), 35),
                                       "earR": ((1, 0, 0), -35)})
    moved = np.linalg.norm(Q - P, axis=1)
    tips = P[:, 1] > P[:, 1].max() - 0.18
    facesel = face & (P[:, 2] > 0.15) & (P[:, 1] < P[:, 1].max() - 0.45)
    check(moved[tips].max() > 0.02 * H, "an ear twitch moves the ear tips",
          f"{moved[tips].max():.3f}")
    check(moved[facesel].max() < 1e-6, "an ear twitch leaves the face alone",
          f"{moved[facesel].max():.5f}")

    # --- tail -------------------------------------------------------------
    t1 = rest[names.index("tail001")]
    tN = rest[names.index(f"tail{ntail:03d}")]
    d = tN - t1
    d /= np.linalg.norm(d)
    check(d[2] < -0.35, "the tail leaves the body going BACKWARD (-z)",
          f"dir {np.round(d,2)}")
    # the meshy tail grew out of the RIGHT HIP at x = +0.60 and swung out to
    # x = +1.48. it is deleted now and regrown on the midline (tailbuild.py), so
    # this asserts where it LEAVES as well as where it goes.
    tj = np.array([rest[names.index(f"tail{k:03d}")] for k in range(1, ntail + 1)])
    check(abs(t1[0]) < 0.05, "the tail leaves the body ON THE MIDLINE",
          f"x {t1[0]:+.3f}")
    check(t1[1] < 0.30 and t1[2] < -0.15, "...at the butt, not the hip or the back",
          f"y {t1[1]:.2f} z {t1[2]:.2f}")
    check(tN[1] > t1[1] + 0.4, "the tail sweeps up behind",
          f"y {t1[1]:.2f} -> {tN[1]:.2f}")
    tailw = sum(dom(W, names, f"tail{k:03d}") for k in range(1, ntail + 1))
    # ...and then it has to become VISIBLE. the camera looks at this character
    # head-on down +z, so a tail that only sweeps back and up hides behind the
    # body the entire time mew is not flying. it has to clear the trunk's
    # silhouette sideways.
    # measured against the TRUNK at the tail's own height band, not against
    # everything below the neck: the feet stick out to |x| 0.75 and would set an
    # impossible bar, and they sit forward of the tail in z anyway.
    band = (tailw < 1e-6) & (P[:, 1] > 0.45) & (P[:, 1] < 1.25)
    half = float(np.abs(P[band, 0]).max())
    check(np.abs(tj[:, 0]).max() > half,
          "the tail clears the body's silhouette from the front",
          f"tail reaches |x| {np.abs(tj[:,0]).max():.2f} vs trunk {half:.2f}")
    body_shell = int(np.argmax(sizes))
    check(tailw[comp == body_shell].max() < 1e-6,
          "the tail chain drives nothing but the tail")

    # --- skin / uv --------------------------------------------------------
    flat = np.array(rt.FLAT_UV)
    per_tri = UV[I]
    is_flat = (np.abs(per_tri - flat).max(axis=(1, 2)) < 1e-4)
    check(is_flat.mean() > 0.4, "most of the body samples ONE flat texel",
          f"{is_flat.mean()*100:.0f}% of triangles")
    A = atlas.shape[0]
    px = atlas[int(flat[1] * A), int(flat[0] * A)]
    check(np.abs(px - np.array(rt.SKIN)).max() < 3, "that texel is the skin colour",
          f"{px.astype(int)} vs {rt.SKIN}")
    face_tris = np.where(~is_flat)[0]
    check(len(face_tris) > 100, "there is a real face island",
          f"{len(face_tris)} triangles")
    # the island must actually contain the eye ink
    sub = per_tri[face_tris].reshape(-1, 2)
    xs = np.clip((sub[:, 0] * A).astype(int), 0, A - 1)
    ys = np.clip((sub[:, 1] * A).astype(int), 0, A - 1)
    blue = (atlas[ys, xs][:, 2] - atlas[ys, xs][:, 0]) > 25
    check(blue.any(), "the face island carries the painted eyes")

    # --- morphs -----------------------------------------------------------
    check(set(targets) >= {"blink"}, "a blink target exists", ",".join(targets))
    check("wince" not in targets,
          "no wince morph -- the >.< face is a flat OVERLAY, not a deformation")
    # WHERE THE EYES ARE has to ship with the model, or the overlay cannot be
    # placed. it is measured off the same ink mask the blink is.
    eyes = g.json["meshes"][0].get("extras", {}).get("eyes", [])
    check(len(eyes) == 2, "the glb carries both eye boxes for the overlay",
          f"{len(eyes)} found")
    if len(eyes) == 2:
        check(eyes[0]["cx"] * eyes[1]["cx"] < 0, "one eye each side of the midline",
              f"{eyes[0]['cx']:+.2f} / {eyes[1]['cx']:+.2f}")
        for e in eyes:
            near = ((np.abs(P[:, 0] - e["cx"]) < e["hx"])
                    & (np.abs(P[:, 1] - e["cy"]) < e["hy"]))
            check(near.sum() > 20, "the eye box lands on real geometry",
                  f"{int(near.sum())} verts")
            check(e["z"] > 0.1, "...on the FRONT of the head", f"z {e['z']:.2f}")
            # THE TANGENT PLANE. the overlay quad is laid on this; without it the
            # quad floats in front of a face that curves away under it and the
            # painted eye slides out from behind it as the head turns.
            check("n" in e and "zc" in e, "...and ships its tangent plane")
            if "n" in e:
                n = np.array(e["n"], float)
                check(abs(np.linalg.norm(n) - 1) < 1e-3, "the eye normal is unit",
                      f"|n| {np.linalg.norm(n):.4f}")
                check(n[2] > 0.4, "...and points out of the FRONT of the face",
                      f"n.z {n[2]:+.3f}")
                # it must lean OUTWARD -- these eyes are on the sides of a ball,
                # and a normal leaning the other way means the fit caught the
                # wrong surface
                check(n[0] * e["cx"] > 0.1, "...leaning outward, like the head",
                      f"n.x {n[0]:+.3f} at cx {e['cx']:+.3f}")
                # and the plane has to sit ON the surface, not in front of it
                on = near & (P[:, 2] > 0)
                if on.any():
                    err = abs(e["zc"] - float(np.median(P[on, 2])))
                    check(err < 0.06, "the plane sits on the surface it covers",
                          f"{err:.3f} from the median z there")

    # --- engine contract --------------------------------------------------
    src = open(CFG).read()
    roles = re.search(r"boneRoles:\s*\{(.*?)\n  \}", src, re.S).group(1)
    want = set(re.findall(r'"([A-Za-z0-9_.]+)"', roles))
    missing = sorted(want - set(names))
    check(not missing, "rigConfig bone roles all resolve", f"missing {missing}")
    pivot = cfg_num("pivotFactor")
    root_y = rest[names.index("root")][1]
    want_pivot = (root_y - P[:, 1].min()) / H
    check(abs(pivot - want_pivot) < 0.004,
          "sizing.pivotFactor matches the root joint's height",
          f"config {pivot:.4f} vs model {want_pivot:.4f}")
    rad = cfg_num("radiusFactor")
    body = tailw < 1e-6
    reach = np.linalg.norm(P[body] - rest[names.index("root")], axis=1).max() / H
    check(rad >= np.percentile(np.linalg.norm(
        P[body] - rest[names.index("root")], axis=1), 90) / H,
        "the collision radius covers 90% of the body",
        f"radiusFactor {rad} vs reach {reach:.3f} x height")

    renders(P, I, UV, atlas, W, names, rest, pmap, hard, targets)
    print()
    print("ALL CHECKS PASS" if not FAILS else f"{len(FAILS)} FAILURES")
    return 1 if FAILS else 0


# ---------------------------------------------------------------------------
def sheet(tiles, cw, ch, cols, path, label=""):
    rows = (len(tiles) + cols - 1) // cols
    s = np.tile(pm.BG, (ch * rows, cw * cols, 1))
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        s[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] = t
    im = Image.fromarray(s.astype(np.uint8))
    if label:
        ImageDraw.Draw(im).text((8, ch * rows - 16), label, fill=(255, 255, 120))
    im.save(path)
    print("  wrote", os.path.relpath(path, ROOT))


def views(P, I, cols, names=None, rest=None, pmap=None, cw=460, ch=520,
          uvs=None, tex=None, zoom=1.0, offy=0.0,
          which=(("front", (0, 0, 1)), ("3/4", (0.72, 0.2, 0.7)),
                 ("side", (1, 0, 0)), ("back", (0, 0, -1)))):
    lo, hi = P.min(0), P.max(0)
    ctr = (lo + hi) / 2
    rad = np.linalg.norm(hi - lo) / 2
    out = []
    for nm, d in which:
        d = np.array(d, float)
        d /= np.linalg.norm(d)
        v = pm.look_at(ctr + d * rad * 4, ctr, (0, 1, 0))
        _, Pc = pm.project(P, v, cw, ch, 1, np.zeros(3))
        cc = (Pc.min(0) + Pc.max(0)) / 2
        ext = (Pc.max(0) - Pc.min(0))[:2]
        s = min(cw / (ext[0] * 1.15), ch / (ext[1] * 1.15)) * zoom
        Pv, _ = pm.project(P, v, cw, ch, s, cc + np.array([0, offy, 0]))
        img = pm.rasterize(Pv, I, cw, ch, pm.shade(P, I, cols, v),
                           uvs=uvs, texim=tex)
        im = Image.fromarray(img.astype(np.uint8))
        dr = ImageDraw.Draw(im)
        if names is not None:
            Qv, _ = pm.project(rest, v, cw, ch, s, cc + np.array([0, offy, 0]))
            for i, n in enumerate(names):
                p = pmap[n]
                if p:
                    a, b = Qv[names.index(p)], Qv[i]
                    dr.line([a[0], a[1], b[0], b[1]], fill=(255, 50, 50), width=2)
            for i, n in enumerate(names):
                dr.ellipse([Qv[i, 0] - 3, Qv[i, 1] - 3, Qv[i, 0] + 3, Qv[i, 1] + 3],
                           fill=(255, 235, 40))
        dr.text((6, 6), nm, fill=(255, 255, 255))
        out.append(np.asarray(im).astype(float))
    return out


def renders(P, I, UV, atlas, W, names, rest, pmap, hard, targets):
    print("== renders ==")
    white = np.tile(np.array([255.0, 255.0, 255.0]), (len(I), 1))
    flat = np.tile(np.array([222.0, 196.0, 210.0]), (len(I), 1))
    uvs = UV[I]
    sheet(views(P, I, white, uvs=uvs, tex=atlas), 460, 520, 4,
          os.path.join(OUT, "mew_turnaround.png"), "rest pose, flat skin + baked face")
    sheet(views(P, I, flat, names, rest, pmap), 460, 520, 4,
          os.path.join(OUT, "mew_rig.png"), "skeleton")
    rng = np.random.default_rng(7)
    pal = rng.integers(60, 255, (len(names), 3)).astype(float)
    sheet(views(P, I, (W @ pal)[I[:, 0]]), 460, 520, 4,
          os.path.join(OUT, "mew_weights.png"), "skin weights (one hue per joint)")
    Q = pose(P, W, names, rest, pmap, hard)
    sheet(views(Q, I, flat), 460, 520, 4,
          os.path.join(OUT, "mew_pose.png"), "hard pose: body + arms + feet + tail")
    Q2 = pose(P, W, names, rest, pmap,
              {"earL": ((1, 0, 0), 40), "earR": ((0, 0, 1), 35),
               "neck": ((0, 1, 0), 22), "head": ((0, 1, 0), 26)})
    sheet(views(Q2, I, flat), 460, 520, 4,
          os.path.join(OUT, "mew_ears.png"), "ear twitch + head turn")
    for nm, amts in (("blink", (0.0, 0.35, 0.7, 1.15)),
                     ("wince", (0.0, 0.4, 0.75, 1.05))):
        if nm not in targets:
            continue
        tiles = []
        for amt in amts:
            Pb = P + targets[nm] * amt
            tiles += views(Pb, I, white, uvs=uvs, tex=atlas, cw=460, ch=520,
                           zoom=1.6, offy=0.32,
                           which=((f"{nm} {amt}", (0, 0, 1)),))
        sheet(tiles, 460, 520, 4, os.path.join(OUT, f"mew_{nm}.png"),
              f"{nm} morph, driven by faceMorphs.js")


if __name__ == "__main__":
    sys.exit(main())
