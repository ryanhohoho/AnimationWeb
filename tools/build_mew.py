"""build_mew.py

builds src/assets/mew.glb from scratch: geometry, rig, weights, uvs, painted
face texture and expression morphs. pure python + numpy, no blender -- so the
whole thing is reproducible and checkable headlessly.

    python3 tools/build_mew.py
    python3 tools/check_model.py          # topology + rig report

shape reference is the chibi mew render: very large head, thin short neck,
small pear torso, two armless mitten hands, two big legless feet, thick tail
with a rounded club. eyes are PAINTED into the texture, never geometry.

everything is authored as ALL QUADS. triangulation happens once, at export.
the previous blender version is kept at tools/legacy/build_mew_blender_v1.py.
"""

import os
import sys
import io
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import meshkit as mk                      # noqa: E402
from glbtool import GlbWriter             # noqa: E402


# ===========================================================================
# tuning -- the whole silhouette lives here
# ===========================================================================
CFG = dict(
    # --- head: the dominant mass. wider than deep, slightly wider than tall
    head_center=(0.0, 1.048, 0.005),
    head_half=(0.392, 0.372, 0.358),
    head_res=6,
    head_box=2.45,          # superellipse exponent on the cross-section.
                           # 2 = sphere, higher = flatter planes + soft corners,
                           # which is what gives the trapezoidal read
    jaw_widen=0.205,       # wider at the jaw than at the crown -> trapezoid
    crown_taper=0.235,     # narrow the top
    crown_flat=0.130,      # and squash it, so the ears sit on a platform
    chin_taper=0.075,      # soften the jaw to a rounded chin (not a point)
    chin_lo=-0.62,         # taper only kicks in near the very bottom
    brow_flatten=0.088,    # flatten the face plane so it reads as a face
    # snout: a real wedge off the lower face that tapers to a nose POINT,
    # not the soft bulge it was
    snout_push=0.106,      # how far the muzzle juts forward
    snout_y=-0.30,         # centre height on the unit sphere
    snout_h=0.60,          # vertical reach
    snout_w=0.52,          # width before it tapers in
    snout_sharp=1.12,       # >1 pulls the falloff toward a point at the nose
    snout_drop=0.018,      # nose sits a little below the muzzle centre

    # --- ears: broad triangles, flattened front-to-back, swept out and back.
    # socket is 3x3 quads, so the base is genuinely wide instead of a spike
    # 2x2 socket: a 3x3 one would make the two sockets share the head's centre
    # column, which pushes those vertices to valence 6. the base reads broad
    # anyway because the first ring flares well past the socket.
    ear_socket=2,
    # the socket ring is stretched across the head BEFORE the ear grows out of
    # it. that is what makes the base run down the sides and the outer edge
    # carry on the head's circumference, instead of a thin spike bolted on top.
    ear_spread_along=1.30,   # widen down/up the head's meridian
    ear_spread_across=1.22,  # and front-to-back
    ear_sink=0.028,          # let the outboard side of the base sag down
    ear_len=0.400,           # shorter than before; the base does the work now
    ear_out=(0.30, 0.945, -0.07),   # direction, normalised in code
    ear_profile_t=(0.0, 0.24, 0.54, 0.80, 1.0),
    ear_width=(1.00, 1.02, 0.84, 0.48, 0.07),
    ear_thick=(1.00, 1.02, 0.78, 0.40, 0.07),   # fatter through the middle
    ear_curl=0.042,        # tip drifts back so the ear is not a straight cone
    ear_outer_bias=0.88,   # as the ear narrows, slide the ring OUTWARD so the
                           # outer edge stays straight and carries on the head's
                           # silhouette. a symmetric taper narrows from both
                           # sides and reads as a cone stuck on the skull

    # --- body: small pear, widest low
    body_center=(0.0, 0.478, -0.015),
    body_half=(0.236, 0.228, 0.216),
    body_res=4,
    body_pear=0.150,

    # --- neck: short and thin, the head sits on it
    neck_r=0.078,
    neck_y0=0.645,
    neck_y1=0.785,
    neck_rings=3,

    # --- hands: rounded mittens, no arms. one hinge each
    hand_center=(0.246, 0.548, 0.156),
    hand_half=(0.048, 0.096, 0.086),   # much smaller than the feet, and FLAT
    hand_res=2,
    hand_box=3.8,          # rounded rectangle paddle, not a ball
    hand_taper=0.20,       # narrows toward the shoulder end
    hand_roll=14.0,        # paddle face angled toward the viewer

    # --- feet: big rounded paddles, no legs. one hinge each
    foot_center=(0.228, 0.180, 0.058),
    foot_half=(0.150, 0.122, 0.302),   # longer, same width
    foot_res=4,
    foot_yaw=16.0,         # splayed outward, degrees
    foot_heel=0.30,        # heel narrower than the toe

    # --- tail: thick faceted tube ending in a round club
    tail_rings=17,
    tail_scale=1.34,       # rest curve stretched away from the base; the verlet
                           # chain is length-driven so it follows automatically
    tail_overhang=0.55,    # curve continues past the last joint, so the bulb
                           # sits BEYOND tail.007 rather than on top of it
    # the last stretch is a hemisphere profile, which is what makes a real
    # rounded bulb instead of the flat coons cap it had
    tail_r=((0.00, 0.100), (0.22, 0.082), (0.52, 0.074), (0.76, 0.072),
            (0.84, 0.108), (0.90, 0.146), (0.95, 0.152), (0.98, 0.130),
            (1.00, 0.078)),
)

# rest curve of the tail.
#
# v1's curve lived almost entirely in the Y-Z plane (x spread was 0.04 across
# the whole tail). seen from the front that arc is edge-on, so it PROJECTS into
# a hairpin -- the tail looked like it was folding back through itself even
# though in 3d the strands were nearly two segment-lengths apart. the fix is a
# real 3d spiral: sweep out to the side as it goes back and up, so there is
# genuine depth separation between the outbound and returning halves.
_TAIL_SHAPE = np.array([
    [0.000, 0.500, -0.240],   # base, at the body's back
    [0.090, 0.418, -0.470],   # back and starting to sweep out
    [0.245, 0.455, -0.640],
    [0.395, 0.635, -0.712],   # widest point, already climbing
    [0.478, 0.880, -0.672],
    [0.492, 1.130, -0.558],   # rises past the shoulders
    [0.428, 1.352, -0.430],   # tip finishes high and outboard, near ear height
])
TAIL_ARC = 1.90               # total rest arc length in model units


def _fit_arc(pts, target):
    """scale a curve about its base to a given arc length. keeps length as one
    honest number instead of a shape edit plus a mystery multiplier."""
    L = float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())
    return pts[0] + (pts - pts[0]) * (target / L)


TAIL_JOINTS = _fit_arc(_TAIL_SHAPE, TAIL_ARC)

# 20 joints, names exactly as rigConfig expects (gltf loading sanitises the
# dots away: "ear.L" -> "earL", "tail.001" -> "tail001").
# rest orientations are all identity: every pose layer works in char-frame
# deltas, so identity rest gives identical motion from a much simpler file.
BONES = [
    ("root",     None,       (0.000, 0.420, -0.010)),
    ("spine",    "root",     (0.000, 0.462, -0.010)),
    ("chest",    "spine",    (0.000, 0.600, -0.008)),
    ("neck",     "chest",    (0.000, 0.700,  0.000)),
    ("head",     "neck",     (0.000, 0.800,  0.000)),
    ("ear.L",    "head",     (0.208, 1.276, -0.030)),
    ("ear.R",    "head",     (-0.208, 1.276, -0.030)),
    ("arm.L",    "chest",    (0.196, 0.622,  0.020)),
    ("hand.L",   "arm.L",    (0.292, 0.548,  0.098)),
    ("arm.R",    "chest",    (-0.196, 0.622,  0.020)),
    ("hand.R",   "arm.R",    (-0.292, 0.548,  0.098)),
    ("foot.L",   "root",     (0.222, 0.268, -0.070)),
    ("foot.R",   "root",     (-0.222, 0.268, -0.070)),
    ("tail.001", "root",     tuple(TAIL_JOINTS[0])),
    ("tail.002", "tail.001", tuple(TAIL_JOINTS[1])),
    ("tail.003", "tail.002", tuple(TAIL_JOINTS[2])),
    ("tail.004", "tail.003", tuple(TAIL_JOINTS[3])),
    ("tail.005", "tail.004", tuple(TAIL_JOINTS[4])),
    ("tail.006", "tail.005", tuple(TAIL_JOINTS[5])),
    ("tail.007", "tail.006", tuple(TAIL_JOINTS[6])),
]

# which bones may influence which part. this is what stops a foot weight
# leaking onto an ear, and it is why hands/feet end up as true single hinges.
GROUP_BONES = {
    "head": ["head", "neck"],
    "ear.L": ["ear.L", "head"],
    "ear.R": ["ear.R", "head"],
    "neck": ["neck", "head", "chest"],
    "body": ["chest", "spine", "root", "neck"],
    "hand.L": ["hand.L"],
    "hand.R": ["hand.R"],
    "foot.L": ["foot.L"],
    "foot.R": ["foot.R"],
    "tail": ["tail.%03d" % i for i in range(1, 8)],
}


# ---------------------------------------------------------------------------
# small shaping helpers
# ---------------------------------------------------------------------------
def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def bump(x, c, w):
    """1 at x=c, smoothly 0 beyond |x-c| >= w."""
    t = np.clip(np.abs(x - c) / w, 0, 1)
    return (1 - t * t) ** 2


def boxify(P, p):
    """unit sphere -> superellipsoid. p=2 leaves a sphere, higher values flatten
    the faces and tighten the corners, which is what reads as trapezoidal /
    slab-like instead of blobby."""
    if p is None or abs(p - 2.0) < 1e-6:
        return P
    m = (np.abs(P) ** p).sum(1, keepdims=True) ** (1.0 / p)
    return P / np.maximum(m, 1e-9)


def rot_x(deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def lerp_profile(pairs, t):
    xs = np.array([p[0] for p in pairs])
    ys = np.array([p[1] for p in pairs])
    return float(np.interp(t, xs, ys))


def catmull(points, n):
    """smooth polyline through the tail joints, for placing the tube rings."""
    P = np.asarray(points, float)
    ext = np.vstack([P[0] + (P[0] - P[1]), P, P[-1] + (P[-1] - P[-2])])
    out = []
    segs = len(P) - 1
    for k in range(n):
        u = k / (n - 1) * segs
        i = min(int(u), segs - 1)
        f = u - i
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * f
                          + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3))
    return np.array(out)


def resample_arclength(points, n):
    """even spacing along the curve. sampling catmull by its PARAMETER bunches
    rings wherever control points sit close together -- the socket centre is
    only 0.03 from tail.001, so the first rings landed on top of each other and
    showed up as duplicate vertices."""
    dense = catmull(points, 400)
    seg = np.linalg.norm(np.diff(dense, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    want = np.linspace(0, cum[-1], n)
    out = np.empty((n, 3))
    for k in range(3):
        out[:, k] = np.interp(want, cum, dense[:, k])
    return out, float(cum[-1])


# ---------------------------------------------------------------------------
# parts
# ---------------------------------------------------------------------------
def shape_head(P):
    """unit sphere -> cat head. y up, +z is the face.

    the read we want is TRAPEZOIDAL, not spherical: flat-ish planes, wider at
    the jaw than the crown, with a distinct snout wedge coming to a point at
    the nose."""
    c = CFG
    P = boxify(P, c["head_box"])
    x, y, z = P[:, 0].copy(), P[:, 1].copy(), P[:, 2].copy()
    hw, hh, hd = c["head_half"]

    # trapezoid: narrow crown, full jaw, then a small chin taper at the base
    w = (1.0
         + c["jaw_widen"] * sstep(0.55, -0.45, y)
         - c["crown_taper"] * sstep(0.30, 1.0, y)
         - c["chin_taper"] * sstep(c["chin_lo"], -1.0, y))
    d = (1.0
         - c["crown_taper"] * 0.70 * sstep(0.35, 1.0, y)
         - c["chin_taper"] * 0.65 * sstep(c["chin_lo"], -1.0, y))

    # flatten the crown so the ears plant on a platform rather than a dome
    yy = y - c["crown_flat"] * sstep(0.25, 1.0, y) * y
    q = np.stack([x * hw * w, yy * hh, z * hd * d], 1)

    front = sstep(0.10, 0.95, z)
    # pull the face plane back so the snout has something to project FROM
    q[:, 2] -= c["brow_flatten"] * front * bump(y, 0.22, 0.85) * hd

    # snout: sharpened falloffs in both axes so it converges on a nose point
    fy = bump(y, c["snout_y"], c["snout_h"]) ** c["snout_sharp"]
    fx = bump(x, 0.0, c["snout_w"]) ** c["snout_sharp"]
    wedge = front * fy * fx
    q[:, 2] += c["snout_push"] * wedge
    q[:, 1] -= c["snout_drop"] * wedge
    return q + np.array(c["head_center"])


def shape_body(P):
    c = CFG
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    bw, bh, bd = c["body_half"]
    w = 1.0 + c["body_pear"] * sstep(0.35, -0.75, y) - 0.34 * sstep(0.15, 1.0, y)
    q = np.stack([x * bw * w, y * bh, z * bd * w], 1)
    return q + np.array(c["body_center"])


def shape_hand(P, side):
    """small flat paddle, not a ball -- and clearly smaller than a foot."""
    c = CFG
    P = boxify(P, c["hand_box"])
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    hw, hh, hd = c["hand_half"]
    # taper toward the top-inner corner, where it invisibly meets the body
    t = 1.0 - c["hand_taper"] * sstep(-0.2, 1.0, y)
    q = np.stack([x * hw * t, y * hh, z * hd * t], 1)
    q = q @ rot_x(c["hand_roll"]).T @ rot_y(-16 * side).T
    return q + np.array(c["hand_center"]) * np.array([side, 1, 1])


def shape_foot(P, side):
    c = CFG
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    fw, fh, fd = c["foot_half"]
    # heel (back, -z) narrower than the toe; toe slightly lifted
    t = 1.0 - c["foot_heel"] * sstep(0.1, -1.0, z)
    q = np.stack([x * fw * t, y * fh * (1 - 0.18 * sstep(0.2, -1.0, z)), z * fd], 1)
    q[:, 1] += 0.045 * sstep(-0.1, 1.0, z)
    q = q @ rot_y(c["foot_yaw"] * side).T
    return q + np.array(c["foot_center"]) * np.array([side, 1, 1])


def build_limb(res, shaper, side, name):
    m = mk.quadsphere(res)
    m.V = shaper(m.V, side)
    m.groups[name] = np.arange(len(m.V))
    return m


def transport_frames(centers):
    """rotation-minimising frames along a polyline.

    deriving each ring's frame from a fixed world axis (cross(dir, +z) or
    similar) blows up wherever the curve turns parallel to that axis -- which
    the tail does, twice -- and the tube collapses into a ribbon there. so
    seed one frame and rotate it by the minimal rotation between consecutive
    directions instead."""
    dirs = np.diff(centers, axis=0)
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    a = dirs[0]
    s = np.cross(a, [0, 1.0, 0])
    if np.linalg.norm(s) < 1e-6:
        s = np.cross(a, [1.0, 0, 0])
    s /= np.linalg.norm(s)
    frames = [(a, s, np.cross(a, s))]
    for k in range(1, len(dirs)):
        ap, sp, up = frames[-1]
        a = dirs[k]
        v = np.cross(ap, a)
        c = float(ap @ a)
        nv = np.linalg.norm(v)
        if nv < 1e-9:
            R = np.eye(3) if c > 0 else -np.eye(3)
        else:
            vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
            R = np.eye(3) + vx + vx @ vx * (1.0 / (1.0 + c))
        frames.append((a, R @ sp, R @ up))
    return frames


def extrude_socket(mesh, ring, centers, radii, blend=2):
    """grow a tube out of a socket ring. every ring reuses the socket's own
    angular signature in a transported frame, so correspondence is exact and
    the tube can never come out twisted."""
    P0 = mesh.V[ring]
    c0 = P0.mean(0)
    frames = transport_frames(centers)
    a0, s0, u0 = frames[0]
    d = P0 - c0
    d = d - np.outer(d @ a0, a0)              # flatten into the socket plane
    rad = np.linalg.norm(d, axis=1)
    r0 = float(rad.mean())
    ang = np.arctan2(d @ u0, d @ s0)          # fixed for the whole tube
    shape = rad / max(r0, 1e-9)               # socket's own out-of-round

    prev = ring
    quads = []
    for k in range(1, len(centers)):
        _, s, u = frames[k - 1]
        # keep the socket's silhouette at the base, relax to a clean circle
        mixk = min(1.0, k / max(blend, 1))
        r = radii[k] * (shape * (1 - mixk) + mixk)
        pts = centers[k] + (np.cos(ang) * r)[:, None] * s + (np.sin(ang) * r)[:, None] * u
        base = len(mesh.V)
        mesh.V = np.vstack([mesh.V, pts])
        cur = np.arange(base, base + len(ring))
        quads.append(mk.bridge(prev, cur))
        prev = cur
    mesh.Q = np.vstack([mesh.Q, np.vstack(quads)])
    return prev


def spread_socket(mesh, ring):
    """stretch an ear socket across the head surface before extruding.

    a 2x2 socket on its own gives a narrow base and the ear reads as a spike
    bolted onto the skull. widening the ring here reshapes the head's own quads
    into a broad ear root that runs down the sides, so the ear's outer edge
    carries on the head's circumference."""
    c = CFG
    P = mesh.V[ring]
    ctr = P.mean(0)
    n = ctr - np.array(c["head_center"])
    n /= np.linalg.norm(n)
    across = np.cross(n, [0, 1.0, 0])
    if np.linalg.norm(across) < 1e-6:
        across = np.array([0, 0, 1.0])
    across /= np.linalg.norm(across)
    along = np.cross(across, n)          # meridian: up-and-over the head
    d = P - ctr
    a = d @ along
    b = d @ across
    out = (ctr + np.outer(a * c["ear_spread_along"], along)
           + np.outer(b * c["ear_spread_across"], across))
    # the outboard/lower half of the base sags down the side of the head
    low = np.clip(-a / (np.abs(a).max() + 1e-9), 0, 1)
    out[:, 1] -= low * c["ear_sink"]
    mesh.V[ring] = out


def build_ear(mesh, ring, side):
    c = CFG
    P0 = mesh.V[ring]
    c0 = P0.mean(0)
    axis = np.array(c["ear_out"], float) * np.array([side, 1, 1])
    axis /= np.linalg.norm(axis)
    thick_ax = np.cross(axis, [0, 1.0, 0])
    if np.linalg.norm(thick_ax) < 1e-6:
        thick_ax = np.array([0, 0, 1.0])
    thick_ax /= np.linalg.norm(thick_ax)     # roughly front-back
    wide_ax = np.cross(thick_ax, axis)

    d = P0 - c0
    u = d @ wide_ax
    v = d @ thick_ax
    # which way along the wide axis points AWAY from the head's midline
    outward = wide_ax * np.sign(wide_ax[0] * side or 1.0)
    half = float(np.abs(u).max())

    prev = ring
    quads = []
    ts = c["ear_profile_t"]
    for k in range(1, len(ts)):
        t = ts[k]
        ctr = c0 + axis * (c["ear_len"] * t) - thick_ax * (c["ear_curl"] * t * t)
        # keep the outer edge put; take the whole taper out of the inner side
        ctr = ctr + outward * ((1.0 - c["ear_width"][k]) * half * c["ear_outer_bias"])
        pts = (ctr + wide_ax * (u * c["ear_width"][k])[:, None]
               + thick_ax * (v * c["ear_thick"][k])[:, None])
        base = len(mesh.V)
        mesh.V = np.vstack([mesh.V, pts])
        cur = np.arange(base, base + len(ring))
        quads.append(mk.bridge(prev, cur))
        prev = cur
    mesh.Q = np.vstack([mesh.Q, np.vstack(quads)])
    return prev


# ---------------------------------------------------------------------------
def build_mesh():
    c = CFG
    M = mk.QuadMesh()

    # ---- head, with sockets opened for the neck and both ears -------------
    head = mk.quadsphere(c["head_res"])
    head.V = shape_head(head.V)
    n = c["head_res"]
    k = c["ear_socket"]
    mk.ring_from_patch(head, "NY", n // 2 - 1, n // 2 - 1, 2, name="neck")
    mk.ring_from_patch(head, "PY", n - k, n // 2 - 1, k, name="earL")
    mk.ring_from_patch(head, "PY", 0, n // 2 - 1, k, name="earR")
    head.groups["head"] = np.arange(len(head.V))
    M.append(head)

    # ---- ears -------------------------------------------------------------
    for key, side, nm in (("earL", 1, "ear.L"), ("earR", -1, "ear.R")):
        spread_socket(M, M.rings[key])
        start = len(M.V)
        tip = build_ear(M, M.rings[key], side)
        mk.cap_ring(M, tip, M.V[tip].mean(0))
        M.groups[nm] = np.arange(start, len(M.V))

    # ---- body, with sockets for the neck and the tail ---------------------
    body = mk.quadsphere(c["body_res"])
    body.V = shape_body(body.V)
    b = c["body_res"]
    mk.ring_from_patch(body, "PY", b // 2 - 1, b // 2 - 1, 2, name="neckB")
    mk.ring_from_patch(body, "NZ", b // 2 - 1, b // 2 - 1, 2, name="tailB")
    body.groups["body"] = np.arange(len(body.V))
    M.append(body)
    neck_ring_b, tail_ring_b = M.rings["neckB"], M.rings["tailB"]

    # ---- neck: loft from the body socket up to the head socket ------------
    # the two rings were built independently, so line them up first
    neck_ring_h = mk.best_ring_match(M.V[neck_ring_b], M.V[M.rings["neck"]],
                                     M.rings["neck"])
    start = len(M.V)
    steps = c["neck_rings"]
    ys = np.linspace(c["neck_y0"], c["neck_y1"], steps + 2)[1:-1]
    prev = neck_ring_b
    quads = []
    A, B = M.V[neck_ring_b], M.V[neck_ring_h]
    for k, y in enumerate(ys):
        t = (k + 1) / (steps + 1)
        blend = A * (1 - t) + B * t
        ctr = blend.mean(0)
        rad = blend - ctr
        rad /= np.maximum(np.linalg.norm(rad, axis=1, keepdims=True), 1e-9)
        # pinch to the neck radius, waisted in the middle
        r = c["neck_r"] * (1.0 - 0.18 * np.sin(np.pi * t))
        pts = np.stack([ctr[0] + rad[:, 0] * r, np.full(len(rad), y),
                        ctr[2] + rad[:, 2] * r], 1)
        base = len(M.V)
        M.V = np.vstack([M.V, pts])
        cur = np.arange(base, base + len(prev))
        quads.append(mk.bridge(prev, cur))
        prev = cur
    quads.append(mk.bridge(prev, neck_ring_h))
    M.Q = np.vstack([M.Q, np.vstack(quads)])
    M.groups["neck"] = np.arange(start, len(M.V))

    # ---- tail -------------------------------------------------------------
    start = len(M.V)
    # continue the curve past tail.007 so the bulb sits BEYOND the last joint
    last, prev = TAIL_JOINTS[-1], TAIL_JOINTS[-2]
    ctrl = np.vstack([M.V[tail_ring_b].mean(0), TAIL_JOINTS,
                      last + (last - prev) * c["tail_overhang"]])
    pts, arclen = resample_arclength(ctrl, c["tail_rings"] + 1)
    ts = np.linspace(0, 1, len(pts))
    radii = [lerp_profile(c["tail_r"], t) for t in ts]
    tip = extrude_socket(M, tail_ring_b, pts, radii, blend=2)
    mk.cap_ring(M, tip, M.V[tip].mean(0), bulge=1.9)
    M.groups["tail"] = np.arange(start, len(M.V))
    CFG["_tail_arclen"] = arclen

    # ---- hands and feet: separate closed volumes, one hinge each ----------
    for side, nm in ((1, "hand.L"), (-1, "hand.R")):
        M.append(build_limb(c["hand_res"], shape_hand, side, nm))
    for side, nm in ((1, "foot.L"), (-1, "foot.R")):
        M.append(build_limb(c["foot_res"], shape_foot, side, nm))

    return M


# ---------------------------------------------------------------------------
# rig
# ---------------------------------------------------------------------------
def bone_table():
    pos = {n: np.array(p, float) for n, _, p in BONES}
    parent = {n: p for n, p, _ in BONES}
    children = {n: [] for n, _, _ in BONES}
    for n, p, _ in BONES:
        if p:
            children[p].append(n)
    # each bone gets a segment to measure distance against; leaves and forks
    # get a stub pointing the way the limb actually goes
    stub = {
        "root": (0, 0.05, 0),
        "chest": (0, 0.10, 0.005),
        "head": (0, 0.46, 0.02),
        "ear.L": (0.10, 0.30, -0.03), "ear.R": (-0.10, 0.30, -0.03),
        "hand.L": (0.02, -0.13, 0.01), "hand.R": (-0.02, -0.13, 0.01),
        "foot.L": (0.02, -0.09, 0.24), "foot.R": (-0.02, -0.09, 0.24),
        "tail.007": (0.0, 0.20, 0.06),
    }
    seg = {}
    for n, _, _ in BONES:
        if n in stub:
            seg[n] = (pos[n], pos[n] + np.array(stub[n], float))
        elif children[n]:
            seg[n] = (pos[n], pos[children[n][0]])
        else:
            seg[n] = (pos[n], pos[n] + np.array([0, 0.08, 0]))
    return pos, parent, seg


def seg_distance(P, a, b):
    ab = b - a
    L2 = float(ab @ ab)
    t = np.clip(((P - a) @ ab) / max(L2, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def compute_weights(M):
    names = [n for n, _, _ in BONES]
    index = {n: i for i, n in enumerate(names)}
    pos, parent, seg = bone_table()
    nV = len(M.V)
    W = np.zeros((nV, len(names)))

    owner = np.full(nV, "", dtype=object)
    for g in ("body", "head", "neck", "tail", "ear.L", "ear.R",
              "hand.L", "hand.R", "foot.L", "foot.R"):
        if g in M.groups:
            owner[M.groups[g]] = g

    assert (owner != "").all(), f"{int((owner == '').sum())} vertices in no group"

    for g in GROUP_BONES:
        idx = np.where(owner == g)[0]
        if not len(idx):
            continue
        allowed = GROUP_BONES[g]
        P = M.V[idx]
        w = np.zeros((len(idx), len(allowed)))
        for k, bn in enumerate(allowed):
            w[:, k] = 1.0 / (seg_distance(P, *seg[bn]) ** 4 + 1e-7)
        w /= w.sum(1, keepdims=True)
        for k, bn in enumerate(allowed):
            W[idx, index[bn]] = w[:, k]

    # keep the 4 strongest influences, renormalise
    order = np.argsort(-W, axis=1)[:, :4]
    J = order.astype(np.uint8)
    Wt = np.take_along_axis(W, order, axis=1)
    Wt /= Wt.sum(1, keepdims=True)
    return J, Wt, names, owner, W


# ---------------------------------------------------------------------------
# uvs + painted face
# ---------------------------------------------------------------------------
FACE_UV = (0.055, 0.525, 0.945, 0.985)      # u0, v0, u1, v1 of the face island
SWATCH_UV = (0.5, 0.22)


def face_box(M):
    """bounding box of the head's front, used for the planar face projection."""
    P = M.V[M.groups["head"]]
    hc = np.array(CFG["head_center"])
    sel = P[P[:, 2] > hc[2] + 0.05]
    return sel[:, 0].min(), sel[:, 1].min(), sel[:, 0].max(), sel[:, 1].max()


def model_to_face_uv(P, box):
    x0, y0, x1, y1 = box
    u0, v0, u1, v1 = FACE_UV
    fu = (np.asarray(P)[..., 0] - x0) / (x1 - x0)
    fv = (np.asarray(P)[..., 1] - y0) / (y1 - y0)
    return np.stack([u0 + fu * (u1 - u0), v0 + fv * (v1 - v0)], -1)


def build_uvs(M):
    """face-varying uvs: one per quad corner. the head's front quads get a big
    undistorted planar island to paint on; everything else samples a flat
    swatch. per-corner storage means the island border is a free uv seam."""
    box = face_box(M)
    head = np.zeros(len(M.V), bool)
    head[M.groups["head"]] = True

    P = M.V[M.Q]                                   # (nQ, 4, 3)
    ctr = P.mean(1)
    nrm = np.cross(P[:, 2] - P[:, 0], P[:, 3] - P[:, 1])
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
    hc = np.array(CFG["head_center"])
    on_face = head[M.Q].all(1) & (nrm[:, 2] > 0.34) & (ctr[:, 2] > hc[2] + 0.02)

    UV = np.tile(np.array(SWATCH_UV), (len(M.Q), 4, 1))
    UV[on_face] = model_to_face_uv(P[on_face], box)
    return UV, box, on_face


def eye_points():
    hc = np.array(CFG["head_center"])
    return (np.array([hc[0] + 0.156, hc[1] + 0.008, hc[2] + 0.30]),
            np.array([hc[0] - 0.156, hc[1] + 0.008, hc[2] + 0.30]))


def paint_texture(box, size=512):
    """the starter face. eyes, blush and mouth are PAINTED here, never modelled
    -- edit src/assets/mew_face.png (or this function) and rebuild to restyle.
    the base pink matches the v1 material exactly, so lighting is unchanged."""
    PINK = (251, 228, 238)
    img = Image.new("RGB", (size, size), PINK)
    d = ImageDraw.Draw(img, "RGBA")

    def uv2px(uv):
        # glTF UV origin is the TOP-LEFT and v increases DOWNWARD, and
        # GLTFLoader sets flipY=false, so v maps straight to the image row.
        # painting with (1-v) puts the face on the wrong half of the atlas and
        # the model comes out faceless -- a preview that samples with the same
        # flipped convention will happily agree with itself and hide it.
        return (float(uv[0]) * size, float(uv[1]) * size)

    eL, eR = eye_points()
    pL = uv2px(model_to_face_uv(eL, box))
    pR = uv2px(model_to_face_uv(eR, box))
    span = abs(pL[0] - pR[0])
    ew, eh = span * 0.46, span * 0.60

    for (cx, cy), sgn in ((pL, 1), (pR, -1)):
        # almond eye: dark rim, deep blue iris, two highlights
        d.ellipse([cx - ew * .60, cy - eh * .60, cx + ew * .60, cy + eh * .60],
                  fill=(38, 30, 66, 255))
        d.ellipse([cx - ew * .48, cy - eh * .48, cx + ew * .48, cy + eh * .48],
                  fill=(58, 84, 196, 255))
        d.ellipse([cx - ew * .34, cy - eh * .18, cx + ew * .34, cy + eh * .50],
                  fill=(96, 140, 236, 255))
        d.ellipse([cx - ew * .40 + sgn * ew * .10, cy - eh * .44,
                   cx - ew * .04 + sgn * ew * .10, cy - eh * .06],
                  fill=(255, 255, 255, 235))
        d.ellipse([cx + ew * .12, cy + eh * .16, cx + ew * .34, cy + eh * .40],
                  fill=(255, 255, 255, 150))
        # blush dashes out past the outer corner
        for k in range(3):
            bx = cx + sgn * (ew * 1.00 + k * span * 0.085)
            by = cy + eh * 0.85 + abs(k - 1) * span * 0.02
            d.line([bx, by, bx + sgn * span * 0.05, by + span * 0.055],
                   fill=(244, 150, 186, 215), width=max(2, size // 150))

    # small cat mouth between and below the eyes
    mx, my = (pL[0] + pR[0]) / 2, (pL[1] + pR[1]) / 2 + eh * 1.20
    w = span * 0.16
    lw = max(2, size // 190)
    d.arc([mx - w, my - w * .8, mx, my + w * .8], 300, 90, fill=(150, 96, 128, 235), width=lw)
    d.arc([mx, my - w * .8, mx + w, my + w * .8], 90, 240, fill=(150, 96, 128, 235), width=lw)
    return img


# ---------------------------------------------------------------------------
# expression morphs -- spatial falloff fields, so they need no special topology
# ---------------------------------------------------------------------------
def build_morphs(M):
    eL, eR = eye_points()
    V = M.V
    out = {}

    def falloff(c, r):
        t = np.clip(1 - np.linalg.norm((V - c) / np.array(r), axis=1), 0, 1)
        return t * t * (3 - 2 * t)

    def lateral(c, r):
        """falloff ACROSS the face only (x,z). a spherical falloff is wrong for
        a lid: it fades out exactly where the vertex has furthest to travel, so
        the blink ends up a 4% twitch instead of closing the eye."""
        t = np.clip(1 - np.linalg.norm((V[:, [0, 2]] - c[[0, 2]]) / np.array(r),
                                       axis=1), 0, 1)
        return t * t * (3 - 2 * t)

    def band(c, h, p=3.0):
        """near-flat vertical window: full strength across the lid, soft edge."""
        return np.clip(1 - (np.abs(V[:, 1] - c[1]) / h) ** p, 0, 1)

    # blink: upper and lower lid both collapse onto the eye's midline, and the
    # lid rolls a hair forward so it does not read as a dent
    blink = np.zeros_like(V)
    for c in (eL, eR):
        f = lateral(c, (0.175, 0.265)) * band(c, 0.195)
        blink[:, 1] -= (V[:, 1] - c[1]) * f
        blink[:, 2] += f * 0.014
    out["blink"] = blink

    # squint: only the lower lid rises, which is what makes a smile read in
    # the eyes instead of just shutting them
    squint = np.zeros_like(V)
    for c in (eL, eR):
        f = lateral(c, (0.185, 0.275)) * band(c, 0.185)
        low = np.clip((c[1] - V[:, 1]) / 0.055, 0, 1)
        squint[:, 1] += f * low * 0.070
        squint[:, 2] += f * low * 0.018
    out["squint"] = squint

    # smile: mouth corners lift and pull out, cheeks round up under the eyes
    smile = np.zeros_like(V)
    hc = np.array(CFG["head_center"])
    for s in (1, -1):
        f = falloff(np.array([hc[0] + s * 0.085, hc[1] - 0.075, hc[2] + 0.30]),
                    (0.175, 0.150, 0.250))
        smile[:, 1] += f * 0.052
        smile[:, 0] += f * s * 0.030
        g = falloff(np.array([hc[0] + s * 0.185, hc[1] - 0.010, hc[2] + 0.235]),
                    (0.180, 0.150, 0.235))
        smile[:, 1] += g * 0.032
        smile[:, 0] += g * s * 0.038
    out["smile"] = smile
    return out


# ---------------------------------------------------------------------------
# export
# ---------------------------------------------------------------------------
def export(M, path, smooth=False):
    J, W, names, owner, _ = compute_weights(M)
    UV, box, on_face = build_uvs(M)
    morphs = build_morphs(M)

    T, TQ, TC = M.tris_corners()
    uv_tri = UV[TQ[:, None], TC]                    # (nT, 3, 2)

    if smooth:
        V2, N2, T2 = M.V, mk.smooth_normals(M.V, T), T
        J2, W2 = J, W
        uv2 = np.zeros((len(V2), 2))
        uv2[T.reshape(-1)] = uv_tri.reshape(-1, 2)
        src = np.arange(len(V2))
    else:
        V2, N2, T2, (J2, W2), src = mk.flat_split(M.V, T, J, W)
        uv2 = uv_tri.reshape(-1, 2)

    pos, parent, _ = bone_table()
    order = names
    idx = {n: i for i, n in enumerate(order)}

    gw = GlbWriter()
    a_pos = gw.add(V2, "VEC3", 5126, target=34962, minmax=True)
    a_nrm = gw.add(N2, "VEC3", 5126, target=34962)
    a_uv = gw.add(uv2, "VEC2", 5126, target=34962)
    a_j = gw.add(J2, "VEC4", 5121, target=34962)
    a_w = gw.add(W2, "VEC4", 5126, target=34962)
    a_i = gw.add(T2.reshape(-1).astype(np.uint32), "SCALAR", 5125, target=34963)

    targets, tnames = [], []
    for nm, delta in morphs.items():
        targets.append({"POSITION": gw.add_sparse(delta[src], "VEC3", 5126,
                                                  minmax=True)})
        tnames.append(nm)

    # inverse bind: rest orientations are identity, so it is just -translation
    ibm = np.zeros((len(order), 16), np.float32)
    for n in order:
        Mi = np.eye(4)
        Mi[:3, 3] = -pos[n]
        ibm[idx[n]] = Mi.T.reshape(-1)           # gltf wants column-major
    a_ibm = gw.add(ibm, "MAT4", 5126)

    png = paint_texture(box)
    buf = io.BytesIO()
    png.save(buf, "PNG", optimize=True)
    img_view = gw._view(buf.getvalue())
    png.save(os.path.join(ROOT, "src", "assets", "mew_face.png"))

    nodes = []
    for n in order:
        loc = pos[n] - (pos[parent[n]] if parent[n] else np.zeros(3))
        nodes.append({"name": n, "translation": [float(v) for v in loc],
                      "children": []})
    for n in order:
        if parent[n]:
            nodes[idx[parent[n]]]["children"].append(idx[n])
    for nd in nodes:
        if not nd["children"]:
            nd.pop("children")

    mesh_node = len(nodes)
    nodes.append({"name": "Mew", "mesh": 0, "skin": 0})
    scene_root = len(nodes)
    nodes.append({"name": "MewRig", "children": [mesh_node, idx["root"]]})

    prim = {
        "attributes": {"POSITION": a_pos, "NORMAL": a_nrm, "TEXCOORD_0": a_uv,
                       "JOINTS_0": a_j, "WEIGHTS_0": a_w},
        "indices": a_i, "material": 0, "mode": 4,
    }
    if targets:
        prim["targets"] = targets

    gltf = {
        "scene": 0,
        "scenes": [{"nodes": [scene_root]}],
        "nodes": nodes,
        "meshes": [{"name": "MewBody", "primitives": [prim],
                    "weights": [0.0] * len(targets),
                    "extras": {"targetNames": tnames}}],
        "skins": [{"name": "MewRig", "joints": [idx[n] for n in order],
                   "inverseBindMatrices": a_ibm, "skeleton": idx["root"]}],
        "materials": [{
            "name": "MewSkin", "doubleSided": False,
            "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0},
                "baseColorFactor": [1, 1, 1, 1],
                "metallicFactor": 0.0, "roughnessFactor": 0.92},
        }],
        "textures": [{"source": 0, "sampler": 0}],
        "images": [{"bufferView": img_view, "mimeType": "image/png"}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987,
                      "wrapS": 33071, "wrapT": 33071}],
    }
    total = gw.write(path, gltf)
    return dict(bytes=total, verts=len(V2), tris=len(T2), quads=len(M.Q),
                morphs=tnames, box=box, faces=int(on_face.sum()),
                J=J, W=W, names=names, owner=owner)


def main():
    M = build_mesh()
    issues, stats = mk.validate(M, "mew (quads)")
    out = os.path.join(ROOT, "src", "assets", "mew.glb")
    info = export(M, out)
    import shutil
    shutil.copy(out, os.path.join(ROOT, "public", "models", "mew.glb"))
    lo, hi = M.V.min(0), M.V.max(0)
    print(f"wrote {out}")
    print(f"  quads={info['quads']}  tris={info['tris']}  verts={info['verts']}  "
          f"{info['bytes']/1024:.0f} kB   face quads={info['faces']}")
    print(f"  bounds  x[{lo[0]:+.3f},{hi[0]:+.3f}]  y[{lo[1]:+.3f},{hi[1]:+.3f}]  "
          f"z[{lo[2]:+.3f},{hi[2]:+.3f}]  height={hi[1]-lo[1]:.3f}")
    print(f"  morphs  {', '.join(info['morphs'])}")
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
