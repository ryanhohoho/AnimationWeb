"""retexture.py

throw away meshy's uv set and author a new one, then bake the face art onto it.

WHAT WAS WRONG
--------------
the source atlas is 2048x2048 and every single triangle is its OWN island,
scattered at random, with the lighting baked in. the eyes are cut across a
dozen unrelated islands. you cannot edit it, you cannot repaint it, and the
whole 2 MB of it carries about six useful colours.

WHAT THIS DOES
--------------
1. every triangle that is not part of the face gets its three uvs pinned to a
   single texel deep inside a flat block. the body is then EXACTLY one colour,
   with no interpolation, no seams and no lighting baked in -- the light rig
   does all the shading, which is what it was tuned for.
2. the front of the head gets ONE clean planar island, big and undistorted.
3. the eyes and blush are baked into that island THROUGH THE GEOMETRY: for
   every pixel of the new island we know the surface point, hence the source
   triangle and its barycentric coordinates, hence the source uv, hence the
   source texel. that is an exact transfer -- it does not care how shattered
   the old layout was.
4. the baked face is then separated into skin / eye / blush, the skin is thrown
   away and replaced with the flat colour, and the marks are composited back
   with an antialiased alpha. so the eyes and blush survive pixel for pixel and
   everything around them becomes flat.

PROVENANCE is what makes step 3 exact. every triangle carries (source triangle,
barycentric coordinates of its three corners) all the way through surgery and
subdivision, so a vertex created by splitting a face triangle four ways still
knows exactly where it came from in the original uv layout.
"""

import io
import numpy as np
from PIL import Image

ATLAS = 1024                     # the face island wants to match the source
                                 # resolution over the face (the old 2048 atlas
                                 # spent ~600k px there); the rest of this one is
                                 # a single flat colour and costs nothing to store
FACE_RECT = (0.008, 0.008, 0.88, 0.88)  # u0, v0, u1, v1 of the face island
FLAT_UV = (0.955, 0.955)         # every non-face corner points here
def _skin_from_config():
    """the flat albedo, read out of src/config/rigConfig.js.

    it lives there, not here, because the engine's light-rig test needs the same
    number and the owner needs ONE place to recolour the character. the default
    is the area-weighted mean of the original meshy atlas, so replacing the
    texture did not shift mew's on-screen tone."""
    import os
    import re
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "src", "config", "rigConfig.js")
    m = re.search(r'skinHex:\s*"#([0-9A-Fa-f]{6})"', open(p).read())
    if not m:
        raise SystemExit("rigConfig.js has no skinHex")
    h = m.group(1)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


SKIN = _skin_from_config()

# --- mark isolation --------------------------------------------------------
# measured off the bake, not guessed.
# the eye is the ONLY blue thing on this character: its ink runs B-R = +89..+110
# while every skin pixel runs B-R = -2..-109. so "clearly blue" seeds the mask
# and hole-filling pulls in the white catchlights sitting inside it -- much
# safer than thresholding white, because the forehead carries a near-white
# specular (254,251,252) that no brightness test can tell from a catchlight.
EYE_SEED = 25          # B-R above this is unambiguously eye ink
# ...but the eye is not only blue. this character's eyes carry a WHITE SCLERA
# crescent down the outer side and a white catchlight inside the iris, and both
# are pure enough that no blue test sees them. hole-filling recovers the
# catchlight (it is enclosed) and cannot recover the crescent (it opens onto the
# eye's own boundary), which is exactly what shipped: eyes with a pink bite
# taken out of them. so the mask GROWS from the blue seed through near-white
# pixels, and the component filter below keeps only the blobs the seed is in --
# which is what rules out the forehead and muzzle speculars, near-white blobs of
# 10k and 2k pixels that carry no blue at all.
EYE_WHITE_S = 0.20     # HSV saturation under this is ink-white, not pink skin
EYE_WHITE_V = 0.85     # ...and it has to be bright
# the blush is the only thing that pulls GREEN down hard: cheek core G=110,
# blush edge G=143, ordinary skin G=183..205. it is re-TINTED rather than
# copied, so it lands on the flat skin with its own gradient and none of the
# source's baked lighting.
BLUSH_G0 = 168         # green level where the blush starts
BLUSH_G1 = 108         # ...and where it is full strength
BLUSH_WARM = -55       # and it must be warm (B-R below this), ruling out the
                       # eye ink and any cool shadow
BLUSH_RGB = (250, 106, 141)


# ---------------------------------------------------------------------------
def rgb_to_hsv(a):
    a = a / 255.0
    mx = a.max(-1)
    mn = a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-9
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    im = (mx == r) & m
    h[im] = ((g - b)[im] / d[im]) % 6
    im = (mx == g) & m
    h[im] = (b - r)[im] / d[im] + 2
    im = (mx == b) & m
    h[im] = (r - g)[im] / d[im] + 4
    h = h / 6.0
    s = np.where(mx > 1e-9, d / np.maximum(mx, 1e-9), 0.0)
    return h, s, mx


def source_texture(glb):
    img = glb.json["images"][0]
    bv = glb.json["bufferViews"][img["bufferView"]]
    off = bv.get("byteOffset", 0)
    im = Image.open(io.BytesIO(glb.bin[off:off + bv["byteLength"]])).convert("RGB")
    return np.asarray(im).astype(np.float64)


def sample(TEX, uv):
    """bilinear, glTF convention (v runs DOWN from the image's top-left)."""
    H, W = TEX.shape[:2]
    x = np.clip(uv[:, 0] * W - 0.5, 0, W - 1.001)
    y = np.clip(uv[:, 1] * H - 0.5, 0, H - 1.001)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    return ((TEX[y0, x0] * (1 - fx) + TEX[y0, x0 + 1] * fx) * (1 - fy)
            + (TEX[y0 + 1, x0] * (1 - fx) + TEX[y0 + 1, x0 + 1] * fx) * fy)


# ---------------------------------------------------------------------------
def face_triangles(P, I, part, meta, cos_min=0.10, z_min=0.05):
    """the head triangles that can carry face art: front-facing, on the head,
    and forward of the skull's midline."""
    T = P[I]
    n = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    mid = T.mean(1)
    onhead = np.isin(part, ["head", "ear.L", "ear.R"])[I].all(1)
    return np.where(onhead & (n[:, 2] > cos_min) & (mid[:, 2] > z_min)
                    & (mid[:, 1] > meta["neck_y"] + 0.15))[0]


def subdivide(P, I, tri_src, corner_bary, sel, levels=2, part=None):
    """4-way split of the selected triangles, `levels` times, carrying
    provenance. neighbouring triangles are split 1-into-2 where needed so the
    mesh stays watertight (no t-junctions)."""
    for _ in range(levels):
        P, I, tri_src, corner_bary, sel, part = _one_level(
            P, I, tri_src, corner_bary, sel, part)
    return P, I, tri_src, corner_bary, sel, part


def _one_level(P, I, tri_src, corner_bary, sel, part):
    newP = list(P)
    part = list(part) if part is not None else None
    selset = set(sel.tolist())

    # every edge of a selected triangle gets a midpoint, ALL OF THEM UP FRONT:
    # a neighbour that only needs a 1-into-2 split may well be visited before
    # the selected triangle that asked for the midpoint
    need = set()
    for t in sel:
        a, b, c = I[t]
        for u, v in ((a, b), (b, c), (c, a)):
            need.add((min(int(u), int(v)), max(int(u), int(v))))
    mid = {}
    for (u, v) in sorted(need):
        mid[(u, v)] = len(newP)
        newP.append((P[u] + P[v]) * 0.5)
        if part is not None:
            part.append(part[u])

    outI, outS, outB, outSel = [], [], [], []
    for t in range(len(I)):
        a, b, c = [int(x) for x in I[t]]
        ba, bb, bc = corner_bary[t]
        edges = [(a, b), (b, c), (c, a)]
        hit = [((min(u, v), max(u, v)) in need) for u, v in edges]
        if t in selset:
            m_ab = mid[(min(a, b), max(a, b))]
            m_bc = mid[(min(b, c), max(b, c))]
            m_ca = mid[(min(c, a), max(c, a))]
            q_ab, q_bc, q_ca = (ba + bb) / 2, (bb + bc) / 2, (bc + ba) / 2
            quads = [((a, m_ab, m_ca), (ba, q_ab, q_ca)),
                     ((m_ab, b, m_bc), (q_ab, bb, q_bc)),
                     ((m_ca, m_bc, c), (q_ca, q_bc, bc)),
                     ((m_ab, m_bc, m_ca), (q_ab, q_bc, q_ca))]
            for tri, bar in quads:
                outI.append(tri)
                outS.append(tri_src[t])
                outB.append(np.array(bar))
                outSel.append(True)
        elif any(hit):
            # CONFORMING SPLIT of a neighbour. it can share ONE, TWO or THREE
            # edges with the selected patch, and handling only the first left a
            # midpoint dangling in the middle of an unsplit edge. that is a
            # t-junction, which is a real hole in the surface -- it showed up as
            # 25 boundary edges along the head and made the body shell leak.
            vs = [a, b, c]
            bs = [ba, bb, bc]
            m = [mid[(min(u, v), max(u, v))] if hit[k] else -1
                 for k, (u, v) in enumerate(edges)]
            mb = [(bs[k] + bs[(k + 1) % 3]) / 2 for k in range(3)]
            nhit = sum(hit)
            if nhit == 3:
                fans = [(vs[0], m[0], m[2]), (m[0], vs[1], m[1]),
                        (m[2], m[1], vs[2]), (m[0], m[1], m[2])]
                fanb = [(bs[0], mb[0], mb[2]), (mb[0], bs[1], mb[1]),
                        (mb[2], mb[1], bs[2]), (mb[0], mb[1], mb[2])]
            elif nhit == 2:
                # k = the edge that was NOT split; the two split edges meet at
                # the vertex opposite it
                k = hit.index(False)
                i0, i1, i2 = k, (k + 1) % 3, (k + 2) % 3
                fans = [(vs[i0], vs[i1], m[i2]),
                        (vs[i1], m[i1], m[i2]),
                        (m[i1], vs[i2], m[i2])]
                fanb = [(bs[i0], bs[i1], mb[i2]),
                        (bs[i1], mb[i1], mb[i2]),
                        (mb[i1], bs[i2], mb[i2])]
            else:
                k = hit.index(True)
                i0, i1, i2 = k, (k + 1) % 3, (k + 2) % 3
                fans = [(vs[i0], m[k], vs[i2]), (m[k], vs[i1], vs[i2])]
                fanb = [(bs[i0], mb[k], bs[i2]), (mb[k], bs[i1], bs[i2])]
            for tri, bar in zip(fans, fanb):
                outI.append(tri)
                outS.append(tri_src[t])
                outB.append(np.array(bar))
                outSel.append(False)
        else:
            outI.append((a, b, c))
            outS.append(tri_src[t])
            outB.append(np.array((ba, bb, bc)))
            outSel.append(False)
    return (np.array(newP), np.array(outI, np.int64), np.array(outS),
            np.array(outB), np.where(np.array(outSel))[0],
            np.array(part, dtype=object) if part is not None else None)


# ---------------------------------------------------------------------------
def plan_uvs(P, I, face_tris):
    """per-CORNER uvs. face triangles are projected planar from +z into
    FACE_RECT; every other corner is pinned to one texel of flat colour."""
    uv = np.tile(np.array(FLAT_UV), (len(I), 3, 1))
    if not len(face_tris):
        return uv, None
    v = np.unique(I[face_tris])
    lo = P[v][:, :2].min(0)
    hi = P[v][:, :2].max(0)
    span = (hi - lo).max()
    u0, v0, u1, v1 = FACE_RECT
    box = min(u1 - u0, v1 - v0)
    pad = 0.06 * box
    s = (box - 2 * pad) / span

    def to_uv(pt):
        a = (pt[:, 0] - lo[0]) * s + u0 + pad
        # glTF v runs DOWN the image, and the face is authored with +y up, so
        # the island is flipped here rather than in the painter
        b = v1 - pad - (pt[:, 1] - lo[1]) * s
        return np.stack([a, b], 1)

    for t in face_tris:
        uv[t] = to_uv(P[I[t]])
    return uv, dict(lo=lo, scale=s, u0=u0 + pad, v1=v1 - pad)


# ---------------------------------------------------------------------------
def bake_face(uv_new, I, face_tris, tri_src, corner_bary, src_I, src_UV, TEX,
              size=ATLAS):
    """rasterise the face island in the NEW atlas and fill it by looking the
    source texture up through the geometry. returns (rgb, coverage)."""
    rgb = np.zeros((size, size, 3))
    cov = np.zeros((size, size), bool)
    for t in face_tris:
        q = uv_new[t] * size
        x0 = max(int(np.floor(q[:, 0].min())) - 1, 0)
        x1 = min(int(np.ceil(q[:, 0].max())) + 2, size)
        y0 = max(int(np.floor(q[:, 1].min())) - 1, 0)
        y1 = min(int(np.ceil(q[:, 1].max())) + 2, size)
        if x1 <= x0 or y1 <= y0:
            continue
        xs = np.arange(x0, x1) + 0.5
        ys = np.arange(y0, y1) + 0.5
        gx, gy = np.meshgrid(xs, ys)
        d = np.stack([gx - q[0, 0], gy - q[0, 1]], -1)
        e1 = q[1] - q[0]
        e2 = q[2] - q[0]
        det = e1[0] * e2[1] - e1[1] * e2[0]
        if abs(det) < 1e-12:
            continue
        w1 = (d[..., 0] * e2[1] - d[..., 1] * e2[0]) / det
        w2 = (e1[0] * d[..., 1] - e1[1] * d[..., 0]) / det
        w0 = 1 - w1 - w2
        # a small negative tolerance closes the cracks between adjacent tris
        inside = (w0 > -0.004) & (w1 > -0.004) & (w2 > -0.004)
        if not inside.any():
            continue
        bw = np.stack([w0[inside], w1[inside], w2[inside]], 1)
        # corner barycentrics -> barycentrics in the SOURCE triangle
        sb = bw @ corner_bary[t]
        suv = sb @ src_UV[src_I[tri_src[t]]]
        col = sample(TEX, suv)
        yy, xx = np.where(inside)
        rgb[yy + y0, xx + x0] = col
        cov[yy + y0, xx + x0] = True
    return rgb, cov


# ---------------------------------------------------------------------------
def isolate_marks(rgb, cov):
    """(eye mask, blush strength 0..1) from the baked face."""
    from scipy import ndimage
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    seed = cov & ((B - R) > EYE_SEED)
    k = np.ones((3, 3), bool)
    _, sat, val = rgb_to_hsv(rgb)
    # the white lives INSIDE the convex hull of each eye's blue ink, which is a
    # far tighter fence than "near the seed": on this bake the hull holds 39.5k
    # pixels, 30.1k of them blue and 9.4k of them near-white, and 170 that are
    # neither. so the hull rules out the forehead and muzzle speculars by
    # construction and the colour test only has to separate ink from skin.
    white = cov & (sat < EYE_WHITE_S) & (val > EYE_WHITE_V) & _hulls(seed)
    eye = ndimage.binary_fill_holes(
        ndimage.binary_closing(seed | white, k, iterations=2))
    lab, n = ndimage.label(eye)
    keep = np.zeros_like(eye)
    for i in range(1, n + 1):
        m = lab == i
        if (seed & m).sum() >= 25:
            keep |= m
    eye = keep
    blush = np.clip((BLUSH_G0 - G) / (BLUSH_G0 - BLUSH_G1), 0, 1)
    blush = np.where(cov & ~eye & ((B - R) < BLUSH_WARM), blush, 0.0)
    blush = ndimage.gaussian_filter(blush, 1.2)
    return eye, blush


def _hulls(seed, min_px=200):
    """union of the convex hulls of `seed`'s components."""
    from scipy import ndimage
    from scipy.spatial import ConvexHull
    lab, n = ndimage.label(seed)
    out = np.zeros_like(seed)
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < min_px:
            continue
        hull = ConvexHull(np.c_[xs, ys])
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        gy, gx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        pts = np.c_[gx.ravel(), gy.ravel()]
        inside = (pts @ hull.equations[:, :2].T
                  + hull.equations[:, 2] <= 1e-9).all(1)
        out[y0:y1 + 1, x0:x1 + 1] |= inside.reshape(gy.shape)
    return out


def alpha_from(mask, soft=0.7):
    from scipy import ndimage
    a = ndimage.gaussian_filter(mask.astype(float), soft)
    return np.clip((a - 0.35) / 0.35, 0, 1)


def compose(rgb, cov, eye, blush, skin=SKIN, size=ATLAS):
    """flat colour everywhere, then the marks back on top.

    the BLUSH is re-tinted rather than copied: the baked pixels carry the
    source's baked lighting, and dropping that onto a flat skin leaves a visible
    disc. tinting keeps the exact shape and gradient with none of the shading.
    the EYE is copied verbatim -- it is flat art with no baked light in it, and
    the brief was that the eyes must not change at all.
    """
    out = np.tile(np.array(skin, float), (size, size, 1))
    t = blush[..., None]
    out = out * (1 - t) + np.array(BLUSH_RGB, float) * t
    a = alpha_from(eye)[..., None]
    out = out * (1 - a) + rgb * a
    return np.clip(out, 0, 255)
