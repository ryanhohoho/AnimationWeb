"""preview_model.py

headless turnaround renderer for the mew glb. software rasterizer (numpy +
PIL), so it runs anywhere with no GL context -- this is how the model gets
checked without opening a browser.

usage:
  python3 tools/preview_model.py src/assets/mew.glb out.png
  python3 tools/preview_model.py src/assets/mew.glb out.png --wire
  python3 tools/preview_model.py src/assets/mew.glb out.png --weights head
  python3 tools/preview_model.py src/assets/mew.glb out.png --morph blink=1

views rendered: front, 3/4 front-left, left, back, top, plus a big hero shot.
"""

import sys
import os
import io
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbtool import Glb  # noqa: E402

BG = np.array([28, 28, 34], dtype=np.float64)


# ---------------------------------------------------------------------------
# rasterizer
# ---------------------------------------------------------------------------
def rasterize(V, F, W, H, cols, wire=False, wire_col=(20, 20, 26),
              uvs=None, texim=None):
    """V: (n,3) already in screen space (x,y px, z depth, +z toward viewer).
    F: (m,3) tri indices. cols: (m,3) rgb per face."""
    img = np.tile(BG, (H, W, 1))
    zb = np.full((H, W), -np.inf)

    tri = V[F]                       # (m,3,3)
    # backface cull. NOTE: project() flips y for screen space, which flips the
    # sign of the 2d cross product -- a world-ccw (front facing) triangle comes
    # out NEGATIVE here. keeping area > 0 silently renders the far side of the
    # model instead, which looks plausible on a roughly symmetric character and
    # is a nightmare to spot. keep the negative ones, then reverse them so the
    # barycentric code below still sees a positive area.
    e1 = tri[:, 1, :2] - tri[:, 0, :2]
    e2 = tri[:, 2, :2] - tri[:, 0, :2]
    area = e1[:, 0] * e2[:, 1] - e1[:, 1] * e2[:, 0]
    keep = area < -1e-9
    tri, cols, area = tri[keep][:, ::-1], cols[keep], -area[keep]
    if uvs is not None:
        uvs = uvs[keep][:, ::-1]        # reversed with the triangles
        TH, TW = texim.shape[:2]

    for ti_, (t, c, ar) in enumerate(zip(tri, cols, area)):
        x0 = max(int(np.floor(t[:, 0].min())), 0)
        x1 = min(int(np.ceil(t[:, 0].max())) + 1, W)
        y0 = max(int(np.floor(t[:, 1].min())), 0)
        y1 = min(int(np.ceil(t[:, 1].max())) + 1, H)
        if x1 <= x0 or y1 <= y0:
            continue
        xs = np.arange(x0, x1) + 0.5
        ys = np.arange(y0, y1) + 0.5
        gx, gy = np.meshgrid(xs, ys)
        # barycentrics
        d0 = ((t[1, 0] - t[0, 0]) * (gy - t[0, 1]) - (t[1, 1] - t[0, 1]) * (gx - t[0, 0]))
        d1 = ((t[2, 0] - t[1, 0]) * (gy - t[1, 1]) - (t[2, 1] - t[1, 1]) * (gx - t[1, 0]))
        d2 = ((t[0, 0] - t[2, 0]) * (gy - t[2, 1]) - (t[0, 1] - t[2, 1]) * (gx - t[2, 0]))
        inside = (d0 >= 0) & (d1 >= 0) & (d2 >= 0)
        if not inside.any():
            continue
        w0, w1, w2 = d1 / ar, d2 / ar, d0 / ar
        z = w0 * t[0, 2] + w1 * t[1, 2] + w2 * t[2, 2]
        sub = zb[y0:y1, x0:x1]
        hit = inside & (z > sub)
        if not hit.any():
            continue
        sub[hit] = z[hit]
        if uvs is None:
            img[y0:y1, x0:x1][hit] = c
        else:
            # interpolate uv per PIXEL. sampling one texel per triangle makes a
            # painted face look like shattered glass and says nothing about
            # what the gpu will actually draw.
            q = uvs[ti_]
            uu = w0 * q[0, 0] + w1 * q[1, 0] + w2 * q[2, 0]
            vv = w0 * q[0, 1] + w1 * q[1, 1] + w2 * q[2, 1]
            sx = np.clip((uu * TW).astype(int), 0, TW - 1)
            sy = np.clip((vv * TH).astype(int), 0, TH - 1)   # glTF: v is top-down
            img[y0:y1, x0:x1][hit] = texim[sy[hit], sx[hit]] * (c / 255.0)

    if wire:
        _draw_wire(img, zb, V, F, W, H, np.array(wire_col, dtype=np.float64))
    return img


def _draw_wire(img, zb, V, F, W, H, col):
    edges = set()
    for a, b, c in F:
        for u, v in ((a, b), (b, c), (c, a)):
            edges.add((min(u, v), max(u, v)))
    for u, v in edges:
        p, q = V[u], V[v]
        n = int(max(abs(q[0] - p[0]), abs(q[1] - p[1]))) + 1
        if n > 4000:
            continue
        t = np.linspace(0, 1, n)
        x = (p[0] + (q[0] - p[0]) * t).astype(int)
        y = (p[1] + (q[1] - p[1]) * t).astype(int)
        z = p[2] + (q[2] - p[2]) * t
        m = (x >= 0) & (x < W) & (y >= 0) & (y < H)
        x, y, z = x[m], y[m], z[m]
        vis = z > zb[y, x] - 0.012
        img[y[vis], x[vis]] = col


# ---------------------------------------------------------------------------
# scene setup
# ---------------------------------------------------------------------------
def look_at(eye, target, up=(0, 1, 0)):
    f = np.array(target, float) - np.array(eye, float)
    f /= np.linalg.norm(f)
    u = np.array(up, float)
    s = np.cross(f, u)
    s /= np.linalg.norm(s)
    u = np.cross(s, f)
    M = np.eye(4)
    M[0, :3], M[1, :3], M[2, :3] = s, u, -f
    M[:3, 3] = -M[:3, :3] @ np.array(eye, float)
    return M


def project(P, view, W, H, scale, center):
    """orthographic: keeps proportions honest for silhouette checking."""
    Pc = (view @ np.c_[P, np.ones(len(P))].T).T[:, :3]
    out = np.empty_like(Pc)
    out[:, 0] = W * 0.5 + (Pc[:, 0] - center[0]) * scale
    out[:, 1] = H * 0.5 - (Pc[:, 1] - center[1]) * scale
    out[:, 2] = Pc[:, 2]
    return out, Pc


def shade(P, F, base, view, flat=True):
    tri = P[F]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    n = n / np.maximum(ln, 1e-12)
    # two lights in VIEW space so every angle reads
    R = view[:3, :3]
    key = R.T @ np.array([0.35, 0.55, 0.75])
    key /= np.linalg.norm(key)
    fill = R.T @ np.array([-0.5, -0.2, 0.4])
    fill /= np.linalg.norm(fill)
    d = 0.78 * np.maximum(n @ key, 0) + 0.30 * np.maximum(n @ fill, 0) + 0.26
    return np.clip(base * d[:, None], 0, 255)


# ---------------------------------------------------------------------------
def _sparse_fill(g, acc_index):
    """decode an accessor that may be sparse (morph targets are)."""
    a = g.json["accessors"][acc_index]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
    out = (g.accessor(acc_index).astype(np.float64) if "bufferView" in a
           else np.zeros((a["count"], n)))
    sp = a.get("sparse")
    if sp:
        def raw(d, dt, cnt, ncomp):
            bv = g.json["bufferViews"][d["bufferView"]]
            off = bv.get("byteOffset", 0) + d.get("byteOffset", 0)
            return np.frombuffer(g.bin, dtype=dt, count=cnt * ncomp,
                                 offset=off).reshape(cnt, ncomp)
        idx = raw(sp["indices"], {5121: "u1", 5123: "u2", 5125: "u4"}[
            sp["indices"]["componentType"]], sp["count"], 1).ravel()
        val = raw(sp["values"], "f4", sp["count"], n)
        out = out.copy()
        out[idx] = val
    return out


def load(path, morphs=None, only=None, zup=False, tex=False):
    """walk mesh NODES, not meshes -- a node's transform positions its mesh,
    except for skinned primitives, whose vertices already live in skin space
    (bind pose = identity, which is what we want to look at)."""
    g = Glb(path)
    wm = g.world_matrices()
    nodes = g.json["nodes"]
    Vs, Fs, cols, uvtri, off = [], [], [], [], 0
    TEX = [None]
    palette = [np.array([214, 196, 208.]), np.array([120, 128, 178.]),
               np.array([170, 200, 170.])]

    for ni, node in enumerate(nodes):
        if "mesh" not in node:
            continue
        mesh = g.json["meshes"][node["mesh"]]
        nm = f"{node.get('name','')}|{mesh.get('name','')}"
        if only and only.lower() not in nm.lower():
            continue
        names = mesh.get("extras", {}).get("targetNames", [])
        for pk, prim in enumerate(mesh["primitives"]):
            P = g.accessor(prim["attributes"]["POSITION"]).astype(np.float64)
            if morphs and prim.get("targets"):
                for k, amt in morphs.items():
                    if k in names and amt:
                        t = prim["targets"][names.index(k)]
                        if "POSITION" in t:
                            P = P + _sparse_fill(g, t["POSITION"]) * amt
            if "skin" not in node:
                M = wm.get(ni, np.eye(4))
                P = (M @ np.c_[P, np.ones(len(P))].T).T[:, :3]
            if zup:
                P = P[:, [0, 2, 1]] * np.array([1, 1, -1])
            IDX = g.accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
            if tex and "TEXCOORD_0" in prim["attributes"] and g.json.get("images"):
                uv = g.accessor(prim["attributes"]["TEXCOORD_0"]).astype(np.float64)
                bv = g.json["bufferViews"][g.json["images"][0]["bufferView"]]
                bo = bv.get("byteOffset", 0)     # NOT `off` -- that is the
                TEX[0] = np.asarray(Image.open(io.BytesIO(  # running vertex offset
                    g.bin[bo:bo + bv["byteLength"]])).convert("RGB")).astype(float)
                uvtri.append(uv[IDX])
            Vs.append(P)
            Fs.append(IDX + off)
            cols.append(np.tile(palette[min(pk, 2)], (len(IDX), 1)))
            off += len(P)

    if not Vs:
        raise SystemExit(f"no mesh matched only={only!r}")
    C = np.vstack(cols)
    UV = np.vstack(uvtri) if (tex and uvtri) else None
    if UV is not None:
        C = np.tile(np.array([255., 255., 255.]), (len(C), 1))
    return g, np.vstack(Vs), np.vstack(Fs), C, UV, TEX[0]


VIEWS = [
    ("front", (0, 0, 1)),
    ("3/4", (0.75, 0.18, 0.85)),
    ("left", (1, 0, 0)),
    ("back", (0, 0, -1)),
    ("top", (0, 0.98, 0.2)),
]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "src/assets/mew.glb"
    dst = sys.argv[2] if len(sys.argv) > 2 else "model_preview.png"
    wire = "--wire" in sys.argv
    zup = "--zup" in sys.argv
    only = None
    morphs = {}
    for i, a in enumerate(sys.argv):
        if a == "--morph":
            for kv in sys.argv[i + 1].split(","):
                k, v = kv.split("=")
                morphs[k] = float(v)
        if a == "--only":
            only = sys.argv[i + 1]

    g, P, F, base, UV, TEX = load(src, morphs, only, zup, "--tex" in sys.argv)
    lo, hi = P.min(0), P.max(0)
    ctr = (lo + hi) / 2
    rad = np.linalg.norm(hi - lo) / 2

    CW, CH = 420, 480
    pad = 1.06
    tiles = []
    for name, d in VIEWS:
        d = np.array(d, float)
        d /= np.linalg.norm(d)
        up = (0, 0, -1) if abs(d[1]) > 0.9 else (0, 1, 0)
        view = look_at(ctr + d * rad * 4, ctr, up)
        Pv, Pc = project(P, view, CW, CH, 1, np.zeros(3))
        cc = (Pc.min(0) + Pc.max(0)) / 2
        ext = (Pc.max(0) - Pc.min(0))[:2]
        s = min(CW / (ext[0] * pad), CH / (ext[1] * pad))
        Pv, _ = project(P, view, CW, CH, s, cc)
        cols = shade(P, F, base, view)
        tiles.append((name, rasterize(Pv, F, CW, CH, cols, wire,
                                      uvs=UV, texim=TEX)))

    sheet = np.tile(BG, (CH, CW * len(tiles), 1))
    for i, (_, t) in enumerate(tiles):
        sheet[:, i * CW:(i + 1) * CW] = t
    Image.fromarray(sheet.astype(np.uint8)).save(dst)
    print(f"wrote {dst}  ({len(P)} verts, {len(F)} tris)")


if __name__ == "__main__":
    main()
