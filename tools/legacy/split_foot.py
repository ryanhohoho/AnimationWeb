"""split_foot.py

the meshy export has one foot fused into the body. this separates it WITHOUT
moving a single vertex: the cut is made by DUPLICATING the vertices along the
seam so the foot's triangles reference their own copies. positions, normals,
uvs and tangents are all copied verbatim, so the rendered result is identical
to the pixel -- only the connectivity changes.

finding the seam: breadth-first from the toe, and at every step count the edges
crossing from "claimed" to "unclaimed". a limb attaches to a body through a
narrow neck, so that count has a clear minimum right at the joint. cut there.

    python3 tools/split_foot.py mewNew.glb out.glb [--report]
"""

import sys
import os
import json
import struct
import numpy as np
from scipy import sparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbtool import Glb  # noqa: E402


def weld(P, eps=1e-6):
    key = np.round(P / eps).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return inv.ravel(), len(first)


def components(T, n):
    E = np.vstack([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    A = sparse.coo_matrix((np.ones(len(E)), (E[:, 0], E[:, 1])), shape=(n, n))
    A = (A + A.T).tocsr()
    return sparse.csgraph.connected_components(A, directed=False), A


def find_limb(W, T, A, seed, kmin=10, kmax=90):
    """grow from `seed` and cut at the narrowest cross-section.

    cut(k) = number of edges crossing from the k claimed vertices to the rest.
    a limb hangs off the body through a narrow neck, so cut(k) has a clear
    trough there. the first version took the GLOBAL minimum, which is always
    k=1 (a single vertex has the fewest crossings) -- so it "found" a 4-vertex
    limb. the minimum has to be searched over a plausible limb size instead."""
    n = len(W)
    Acsr = A.tocsr()
    order = sparse.csgraph.breadth_first_order(A, seed, directed=False,
                                               return_predecessors=False)
    kmax = min(kmax, len(order) - 1)
    claimed = np.zeros(n, bool)
    cuts = np.full(kmax + 1, 1 << 30)
    for k in range(1, kmax + 1):
        claimed[order[k - 1]] = True
        if k < kmin:
            continue
        cuts[k] = int(Acsr[order[:k]][:, ~claimed].nnz)
    k = int(np.argmin(cuts[kmin:kmax + 1])) + kmin
    return order[:k].copy(), int(cuts[k]), cuts


def split(path_in, path_out, report=False):
    g = Glb(path_in)
    prim = g.json["meshes"][0]["primitives"][0]
    P = g.accessor(prim["attributes"]["POSITION"]).astype(np.float64)
    I = g.accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)

    inv, nW = weld(P)
    W = np.zeros((nW, 3))
    W[inv] = P
    T = inv[I]
    (nc, lab), A = components(T, nW)

    # the foot that is ALREADY separate tells us how big a foot is and roughly
    # where it sits; the fused one is its opposite number
    sizes = np.bincount(lab)
    main = int(np.argmax(sizes))
    loose = [c for c in range(nc) if c != main]
    ref = W[lab == loose[0]] if loose else None

    # seed: the extreme toe on the OTHER side, in the same height band
    band = (W[:, 1] < ref[:, 1].max() + 0.05) & (lab == main)
    sgn = -np.sign(ref[:, 0].mean())          # opposite side
    cand = np.where(band)[0]
    seed = cand[np.argmax(sgn * W[cand, 0])]

    # try several plausible toes and keep the tightest waist
    band = np.where((W[:, 1] < ref[:, 1].max() + 0.10) & (lab == main))[0]
    seeds = [band[np.argmax(sgn * W[band, 0])],
             band[np.argmin(W[band, 1])],
             band[np.argmax(sgn * W[band, 0] - W[band, 1])],
             band[np.argmax(sgn * W[band, 0] + W[band, 2])],
             band[np.argmax(sgn * W[band, 0] - W[band, 2])]]
    best = None
    for sd in dict.fromkeys(int(x) for x in seeds):
        lm, ct, _ = find_limb(W, T, A, sd)
        score = ct / max(len(lm), 1)
        if best is None or score < best[0]:
            best = (score, lm, ct, sd)
    _, limb, cut, seed = best
    if report:
        V = W[limb]
        print(f"welded verts {nW}, components {nc}, main={main} ({sizes[main]})")
        print(f"free foot: n={(lab == loose[0]).sum()} centroid={np.round(ref.mean(0), 3)}")
        print(f"seed vertex {seed} at {np.round(W[seed], 3)}")
        print(f"limb found: {len(limb)} welded verts, seam cut = {cut} edges")
        print(f"  bounds x[{V[:,0].min():+.3f},{V[:,0].max():+.3f}] "
              f"y[{V[:,1].min():+.3f},{V[:,1].max():+.3f}] "
              f"z[{V[:,2].min():+.3f},{V[:,2].max():+.3f}]")
        np.save(os.path.join(HERE, "_limb.npy"),
                {"limb": limb, "inv": inv, "W": W}, allow_pickle=True)
    # ---- the actual split -------------------------------------------------
    # duplicate every RAW vertex that is shared between limb and non-limb
    # triangles, and point the limb's triangles at the copies. nothing moves.
    isl = np.zeros(nW, bool)
    isl[limb] = True
    tri_limb = isl[T].all(1)

    attrs = {k: g.accessor(v).astype(np.float32)
             for k, v in prim["attributes"].items()}
    used_limb = np.zeros(len(P), bool)
    used_body = np.zeros(len(P), bool)
    used_limb[I[tri_limb].ravel()] = True
    used_body[I[~tri_limb].ravel()] = True
    shared = np.where(used_limb & used_body)[0]

    remap = np.arange(len(P))
    if len(shared):
        remap[shared] = np.arange(len(P), len(P) + len(shared))
        for k in attrs:
            attrs[k] = np.concatenate([attrs[k], attrs[k][shared]], axis=0)
    I2 = I.copy()
    I2[tri_limb] = remap[I[tri_limb]]

    if report:
        print(f"seam vertices duplicated: {len(shared)}  "
              f"(verts {len(P)} -> {len(attrs['POSITION'])})")

    # cap both sides of the cut. the foot that shipped loose is a CLOSED shell,
    # so it can rotate into the body and never show a hole. a bare split leaves
    # two open rims that coincide at rest but part the moment the foot moves,
    # letting you see straight through. the caps sit inside the body, so at rest
    # nothing about the silhouette or shading changes.
    attrs, I2, nc_added = cap_cut(attrs, I2, T, tri_limb, inv)
    if report:
        print(f"cap triangles added: {nc_added} (hidden inside the body)")

    write_glb(g, prim, attrs, I2, path_out)
    return path_out


def _rim_loop(T, tri_limb):
    """the cut rim, in WELDED vertex indices.

    it must be found in POSITION space, not index space: this mesh is fully
    vertex-split (426 islands for 524 triangles), so in index space every
    triangle looks like it has boundary edges and a naive search caps the whole
    model. the rim is exactly the set of welded edges shared by one limb
    triangle and one body triangle."""
    def edges(sel):
        E = np.vstack([T[sel][:, [0, 1]], T[sel][:, [1, 2]], T[sel][:, [2, 0]]])
        return {tuple(sorted(e)) for e in E.tolist()}, E

    lim_set, lim_E = edges(tri_limb)
    bod_set, _ = edges(~tri_limb)
    rim = lim_set & bod_set
    if not rim:
        return []
    # order into a loop, keeping the limb's winding direction
    dirn = {}
    for a, b in lim_E.tolist():
        if tuple(sorted((a, b))) in rim:
            dirn[a] = b
    loops, seen = [], set()
    for a in list(dirn):
        if a in seen:
            continue
        loop, cur = [], a
        while cur in dirn and cur not in seen:
            seen.add(cur)
            loop.append(cur)
            cur = dirn[cur]
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def cap_cut(attrs, I, T, tri_limb, inv):
    """close the rim on each side of the cut with a fan to its centroid.

    fresh vertices are minted for each cap so nothing existing is touched;
    winding is chosen per side by testing the shell's signed volume, so both
    caps end up facing outward."""
    added = 0
    new_tris = []
    for loop in _rim_loop(T, tri_limb):
        Wl = np.array([attrs["POSITION"][np.where(inv == w)[0][0]] for w in loop],
                      np.float64)
        ctr = Wl.mean(0)
        for side, sel in (("limb", tri_limb), ("body", ~tri_limb)):
            base = len(attrs["POSITION"])
            # copy attributes from a raw vertex of THIS side at each rim position
            src = []
            for w in loop:
                cands = np.where(inv == w)[0]
                own = [c for c in cands if (I[sel] == c).any()]
                src.append(own[0] if own else cands[0])
            for k in attrs:
                blk = attrs[k][src]
                cv = blk.mean(0)
                if k == "NORMAL":
                    n = np.linalg.norm(cv)
                    cv = cv / n if n > 1e-9 else np.array([0, 1, 0], np.float32)
                attrs[k] = np.concatenate([attrs[k], blk, cv[None].astype(np.float32)])
            ci = base + len(loop)
            # signed volume of the fan about the shell centroid decides winding
            shell = attrs["POSITION"][np.unique(I[sel])].mean(0)
            v = 0.0
            for i in range(len(loop)):
                p0, p1 = Wl[i] - shell, Wl[(i + 1) % len(loop)] - shell
                v += np.dot(np.cross(p0, p1), ctr - shell)
            flip = v < 0
            for i in range(len(loop)):
                a2 = base + i
                b2 = base + (i + 1) % len(loop)
                new_tris.append([ci, b2, a2] if flip else [ci, a2, b2])
                added += 1
    if new_tris:
        I = np.vstack([I, np.array(new_tris, np.int64)])
    return attrs, I, added


def write_glb(g, prim, attrs, I, path_out):
    """re-emit the glb with the new attribute arrays and indices, carrying the
    original material and texture across untouched."""
    from glbtool import GlbWriter
    gw = GlbWriter()
    acc = {}
    order = ["POSITION", "NORMAL", "TANGENT", "TEXCOORD_0"]
    kind = {"POSITION": "VEC3", "NORMAL": "VEC3", "TANGENT": "VEC4",
            "TEXCOORD_0": "VEC2"}
    for k in order:
        if k in attrs:
            acc[k] = gw.add(attrs[k], kind[k], 5126, target=34962,
                            minmax=(k == "POSITION"))
    a_i = gw.add(I.reshape(-1).astype(np.uint32), "SCALAR", 5125, target=34963)

    gltf = {
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "mesh_node", "mesh": 0}],
        "meshes": [{"name": "mesh", "primitives": [
            {"attributes": acc, "indices": a_i, "material": 0, "mode": 4}]}],
        "materials": g.json.get("materials", []),
        "samplers": g.json.get("samplers", [{"magFilter": 9729, "minFilter": 9987}]),
    }
    if g.json.get("images"):
        img = g.json["images"][0]
        bv = g.json["bufferViews"][img["bufferView"]]
        off = bv.get("byteOffset", 0)
        raw = g.bin[off:off + bv["byteLength"]]
        gltf["images"] = [{"bufferView": gw._view(raw),
                           "mimeType": img.get("mimeType", "image/jpeg")}]
        gltf["textures"] = g.json.get("textures", [{"source": 0, "sampler": 0}])
    gw.write(path_out, gltf)


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "mewNew.glb"
    dst = sys.argv[2] if len(sys.argv) > 2 else "mewNew_split.glb"
    split(src, dst, report="--report" in sys.argv)
