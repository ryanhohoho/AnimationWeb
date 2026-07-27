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
    # --- head: the dominant mass. noticeably wider than tall, and wider than
    # deep -- the reference reads as a broad rounded wedge seen head-on and a
    # near-square block from the side
    head_center=(0.0, 1.098, 0.005),
    # even out vertex spacing over the FINISHED head+ears (see relax_params).
    # without this the ear tip is bald: a long feature grown out of a small
    # patch of the parameter sphere gets the same vertex count stretched over
    # several times the area
    relax_iters=140,
    relax_step=0.45,
    head_half=(0.412, 0.442, 0.372),
    head_res=12,
    head_box=3.00,       # superellipse exponent on the cross-section.
                           # 2 = sphere, higher = flatter planes + soft corners,
                           # which is what gives the trapezoidal read. pushed up
                           # from 2.45: the reference reads as big flat planes
                           # meeting at defined corners, not a sphere
    jaw_widen=0.130,       # wider at the jaw than at the crown -> trapezoid
    crown_taper=0.215,     # narrow the top
    crown_flat=0.085,      # and squash it, so the ears sit on a platform
    chin_taper=0.145,      # soften the jaw to a rounded chin (not a point)
    chin_lo=-0.46,         # taper only kicks in near the very bottom
    brow_flatten=0.070,    # flatten the face plane so it reads as a face
    # snout: a real wedge off the lower face that tapers to a nose POINT,
    # not the soft bulge it was
    snout_push=0.020,      # how far the muzzle juts forward
    snout_y=-0.34,         # centre height on the unit sphere
    snout_h=0.56,          # vertical reach
    snout_w=0.46,          # width before it tapers in
    snout_sharp=1.20,       # >1 pulls the falloff toward a point at the nose
    snout_drop=0.020,      # nose sits a little below the muzzle centre
    # chin: square jaw at the sides, rounding into a smooth prow that ends up
    # marginally in front of the nose (measured by check_model)
    chin_push=0.125,       # forward reach of the chin
    chin_y=-0.64,          # centre height on the unit sphere
    chin_h=0.46,           # vertical reach
    chin_w=0.80,           # width before it falls off
    chin_sharp=1.00,       # <1 keeps the prow broad across the jaw
    chin_round=0.92,       # how far the chin region unboxes back to a sphere
    chin_round_y=-0.60,
    chin_round_h=0.68,

    # --- ears: a convex LOBE smooth-UNIONED into the skull.
    #
    # three techniques were tried before this one. extruding a tube out of a
    # socket leaves a base ring that always reads as a seam. pulling the head's
    # vertices toward an APEX fixes the seam but is concave by construction --
    # every vertex slides along a straight line to a single point, so the sides
    # cave in and the tip ends up starved of vertices, because one small patch
    # of the sphere has to cover the whole ear.
    #
    # so: define the ear as an ELLIPSOID sitting half-buried in the head, and
    # take a smooth union of the two. the top half of the skull stays the dome
    # it was; the ear is simply the part of the lobe that pokes out of it. it is
    # convex on every side by definition (an ellipsoid is), it bulges, it comes
    # to a naturally rounded point, and the blend into the head is a smooth
    # fillet rather than any kind of edge. half a samosa.
    ear_center=(0.226, 1.296, -0.014),   # lobe centre (x mirrored per side)
    ear_axis=(0.640, 0.766, -0.050),     # long axis, normalised in code
    ear_len=0.395,       # semi-axis ALONG the ear -- half of this pokes out
    ear_w=0.300,         # semi-axis across the head
    ear_t=0.158,         # semi-axis front-to-back (the ear is a fat blade)
    ear_cross_p=2.95,    # cross-section exponent: >2 squares the section off
                         # a touch, which is what gives the samosa its flat-ish
                         # faces instead of a perfectly round tube
    ear_long_p=1.08,     # exponent ALONG the ear. <2 tapers it toward a rounded
                         # point instead of an egg end -- staying >=1 keeps the
                         # lobe convex, so the sides still bulge outward
    ear_blend=0.058,     # smooth-union radius: the fillet where the ear meets
                         # the skull. bigger = the ear melts in further
    ear_mask_in=0.100,   # rigging softness: full ear authority within this
    ear_mask_out=0.620,  # distance of the ear's axis, easing to none by this

    # --- body: small pear, widest low
    body_center=(0.0, 0.532, -0.015),
    body_half=(0.288, 0.282, 0.262),
    body_res=4,
    body_pear=0.165,

    # --- neck: short and thick, the head sits right down on the body
    neck_r=0.110,
    neck_y0=0.690,
    neck_y1=0.800,
    neck_rings=2,

    # --- arms: short flat flippers held out to the sides, one hinge each.
    # the reference has no elbow -- each arm is a single rounded blade whose
    # long axis runs outward and a little down/forward from the shoulder.
    # (the mesh group is still called hand.* because it is driven by the
    # hand bone; arm.* is the shoulder pivot above it.)
    hand_center=(0.372, 0.578, 0.098),
    hand_half=(0.194, 0.112, 0.038),   # LONG outboard, and thin FRONT-TO-BACK:
                       # the flat faces look forward and back, so the arm
                       # reads as a blade edge-on from the side, not a shelf
    hand_res=2,
    hand_box=3.4,          # rounded rectangle paddle, not a ball
    hand_taper=0.30,       # narrows toward the shoulder end (inboard)
    hand_roll=10.0,        # paddle face angled toward the viewer
    hand_droop=26.0,       # swung down from horizontal, degrees
    hand_sweep=13.0,       # and a little forward

    # --- feet: big teardrops HANGING down and splayed out, no legs. one hinge
    # each. built long in y then rotated out, so the taper runs hip -> toe
    foot_center=(0.252, 0.168, 0.022),
    foot_half=(0.196, 0.312, 0.232),   # long down the leg axis
    foot_res=4,
    foot_splay=29.0,       # rolled outward from vertical, degrees
    foot_yaw=13.0,         # and toed out
    foot_pitch=9.0,        # toes swing a touch forward
    foot_heel=0.34,        # narrow at the hip end, full at the toe
    foot_curl=0.055,       # toe end drifts forward, so it is not a straight cone

    # --- tail: thick faceted tube ending in a round club
    tail_rings=15,
    tail_scale=1.34,       # rest curve stretched away from the base; the verlet
                           # chain is length-driven so it follows automatically
    tail_overhang=0.42,    # curve continues past the last joint, so the bulb
                           # sits BEYOND tail.007 rather than on top of it
    # the last stretch is a hemisphere profile, which is what makes a real
    # rounded bulb instead of the flat coons cap it had. the shaft is fatter
    # than v3.7's: the reference tail is a heavy rope, not a wire
    tail_r=((0.00, 0.126), (0.22, 0.108), (0.52, 0.099), (0.76, 0.097),
            (0.84, 0.138), (0.90, 0.172), (0.95, 0.178), (0.98, 0.150),
            (1.00, 0.088)),

    # --- painted face. all in MODEL units so the atlas's non-square aspect
    # never leaks into the eye's shape; paint_texture converts per axis.
    # these also place the blink/squint morph fields, so moving the eye moves
    # the deformation with it.
    eye=dict(
        sep=0.186,         # half the distance between the two eye centres
        rise=0.022,        # above the head centre
        front=0.342,       # depth of the eye plane (uv projection is planar,
                           # but the morph falloffs use this in 3d)
        w=0.252,           # full eye width  (reference: ~0.30 of head width)
        h=0.330,           # full eye height (taller than wide, as drawn)
        rim=0.052,         # dark outline thickness
        blush_n=3,
        blush_len=0.088,
        blush_gap=0.062,
        mouth=0.052,       # half-width of the little cat mouth (0 hides it)
    ),
)

# rest curve of the tail.
#
# v1's curve lived almost entirely in the Y-Z plane (x spread was 0.04 across
# the whole tail). seen from the front that arc is edge-on, so it PROJECTS into
# a hairpin -- the tail looked like it was folding back through itself even
# though in 3d the strands were nearly two segment-lengths apart. the fix is a
# real 3d spiral: sweep out to the side as it goes back and up, so there is
# genuine depth separation between the outbound and returning halves.
#
# the reference silhouette adds a HOOK: the tail sweeps out and up in a long
# arc, then the last two joints turn over toward the head so the club hangs off
# the crook like a shepherd's staff. the turn is deliberately spread across two
# joints rather than kinked at one -- a single hard rest bend eats the whole
# per-joint angle budget in the verlet sim and leaves nothing for motion.
_TAIL_SHAPE = np.array([
    [0.000, 0.505, -0.268],   # base, at the body's back
    [0.135, 0.414, -0.468],   # back and starting to sweep out
    [0.318, 0.446, -0.612],
    [0.478, 0.634, -0.678],   # widest point, already climbing
    [0.500, 0.878, -0.646],
    [0.505, 1.140, -0.548],   # rises past the shoulders
    [0.398, 1.330, -0.418],   # crook turns in over the head, club beyond it
])
TAIL_ARC = 1.72               # total rest arc length in model units


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
    ("root",     None,       (0.000, 0.440, -0.010)),
    ("spine",    "root",     (0.000, 0.486, -0.010)),
    ("chest",    "spine",    (0.000, 0.626, -0.008)),
    ("neck",     "chest",    (0.000, 0.722,  0.000)),
    ("head",     "neck",     (0.000, 0.815,  0.000)),
    ("ear.L",    "head",     (0.255, 1.246, -0.016)),
    ("ear.R",    "head",     (-0.255, 1.246, -0.016)),
    ("arm.L",    "chest",    (0.212, 0.640,  0.022)),
    ("hand.L",   "arm.L",    (0.238, 0.588,  0.052)),
    ("arm.R",    "chest",    (-0.212, 0.640,  0.022)),
    ("hand.R",   "arm.R",    (-0.238, 0.588,  0.052)),
    ("foot.L",   "root",     (0.108, 0.336, -0.012)),
    ("foot.R",   "root",     (-0.108, 0.336, -0.012)),
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
    # the ears are no longer separate geometry, so they must not be a separate
    # weight island either: a hard group boundary part-way up a CONTINUOUS
    # surface is a weight cliff, and the pose check caught it tearing (5.9x edge
    # stretch). letting the ear bones compete over the whole head instead makes
    # the handover smooth, and the 1/d^4 falloff keeps them local anyway.
    "head": ["head", "neck", "ear.L", "ear.R"],
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
    slab-like instead of blobby.

    p may be PER VERTEX. that is what lets the head carry a square-ish jaw along
    the sides and still round off into a smooth chin -- one exponent for the
    whole head can give you one or the other, never both."""
    p = np.asarray(p, float)
    if p.ndim == 0:
        if abs(float(p) - 2.0) < 1e-6:
            return P
        p = np.full(len(P), float(p))
    pv = p[:, None]
    m = (np.abs(P) ** pv).sum(1, keepdims=True) ** (1.0 / pv)
    return P / np.maximum(m, 1e-9)


def rot_x(deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


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
    # unit-sphere coords BEFORE boxing, used to place the local chin rounding
    y0, z0 = P[:, 1].copy(), P[:, 2].copy()
    chin_zone = bump(y0, c["chin_round_y"], c["chin_round_h"]) * sstep(-0.15, 0.70, z0)
    pexp = c["head_box"] + (2.0 - c["head_box"]) * chin_zone * c["chin_round"]
    P = boxify(P, pexp)
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

    # chin prow: the lower face rounds FORWARD until it is, just barely, the
    # frontmost point of the head -- ahead of the nose. the falloff is wide and
    # soft so it reads as a full rounded chin rather than a beak, and it is
    # centred well above the very bottom so the jaw underneath stays square.
    cy = bump(y, c["chin_y"], c["chin_h"])
    cx = bump(x, 0.0, c["chin_w"]) ** c["chin_sharp"]
    prow = front * cy * cx
    q[:, 2] += c["chin_push"] * prow
    return q + np.array(c["head_center"])


def shape_body(P):
    c = CFG
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    bw, bh, bd = c["body_half"]
    w = 1.0 + c["body_pear"] * sstep(0.35, -0.75, y) - 0.34 * sstep(0.15, 1.0, y)
    q = np.stack([x * bw * w, y * bh, z * bd * w], 1)
    return q + np.array(c["body_center"])


def shape_hand(P, side):
    """short flat flipper held out to the side. long axis is OUTBOARD, so the
    taper has to run along x*side -- both halves are built in the same handed
    local space (mirroring x would flip the winding), and only the profile and
    the rotation signs are flipped."""
    c = CFG
    P = boxify(P, c["hand_box"])
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    hw, hh, hd = c["hand_half"]
    xo = x * side                       # +1 = outboard tip, -1 = shoulder end
    # narrows toward the shoulder, where it disappears into the body
    t = 1.0 - c["hand_taper"] * sstep(0.5, -1.0, xo)
    q = np.stack([x * hw, y * hh * t, z * hd * t], 1)
    q = (q @ rot_x(c["hand_roll"]).T
         @ rot_z(-c["hand_droop"] * side).T
         @ rot_y(-c["hand_sweep"] * side).T)
    return q + np.array(c["hand_center"]) * np.array([side, 1, 1])


def shape_foot(P, side):
    """big teardrop hanging DOWN and splayed out (the reference sits with its
    legs dangling). built long in y with the taper running hip -> toe, then
    rolled outward -- so the same profile code gives a proper leg silhouette
    from every angle instead of a slipper lying flat."""
    c = CFG
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    fw, fh, fd = c["foot_half"]
    # hip end (top, +y) narrower than the toe
    t = 1.0 - c["foot_heel"] * sstep(-0.15, 1.0, y)
    q = np.stack([x * fw * t, y * fh, z * fd * t], 1)
    q[:, 2] += c["foot_curl"] * sstep(0.2, -1.0, y)      # toe drifts forward
    q = (q @ rot_x(-c["foot_pitch"]).T
         @ rot_z(c["foot_splay"] * side).T
         @ rot_y(c["foot_yaw"] * side).T)
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


def _ear_frame(side):
    """orthonormal frame + radii of one ear lobe, in model space."""
    c = CFG
    E = np.array(c["ear_center"]) * np.array([side, 1, 1])
    ax = np.array(c["ear_axis"], float) * np.array([side, 1, 1])
    ax /= np.linalg.norm(ax)
    # "across" is the head's left-right, made perpendicular to the axis
    across = np.array([1.0, 0, 0]) - ax * ax[0]
    if np.linalg.norm(across) < 1e-6:
        across = np.array([0, 0, 1.0])
    across /= np.linalg.norm(across)
    thick = np.cross(ax, across)
    R = np.stack([across, ax, thick], 1)          # columns = ellipsoid axes
    rad = np.array([c["ear_w"], c["ear_len"], c["ear_t"]])
    return E, R, rad


def _ray_lobe(C, U, side, samples=112):
    """furthest hit of the rays C + s*U against one ear lobe, or -inf.

    the lobe is a SUPERELLIPSOID, not a plain ellipsoid: a plain one is too
    round to read as an ear, and the taper toward the tip is what makes it a
    samosa rather than a bump. exponents stay >= 1 so the solid is still convex
    everywhere -- that is the property the whole approach rests on, since it is
    what guarantees the surface bulges on every side and never caves in.

    no closed form for a superellipsoid, so sample the ray, take the LAST
    interval that is inside, and bisect it. the head is star-shaped about its
    centre and the lobe is convex, so the far crossing is the outer surface."""
    c = CFG
    E, R, rad = _ear_frame(side)
    m, n = c["ear_cross_p"], c["ear_long_p"]
    smax = float(np.linalg.norm(C - E)) + float(rad.max()) * 1.25
    ss = np.linspace(0.0, smax, samples)

    def field(sv):
        P = C + U * sv[:, None]
        v = ((P - E) @ R) / rad
        return (np.abs(v[:, 0]) ** m + np.abs(v[:, 1]) ** n
                + np.abs(v[:, 2]) ** m) - 1.0

    inside = np.stack([field(np.full(len(U), t)) <= 0 for t in ss], 1)
    any_in = inside.any(1)
    last = inside.shape[1] - 1 - np.argmax(inside[:, ::-1], axis=1)
    out = np.full(len(U), -np.inf)
    if not any_in.any():
        return out
    lo = ss[last]
    hi = np.minimum(ss[np.minimum(last + 1, samples - 1)], smax)
    for _ in range(24):                       # bisect to the surface
        mid = 0.5 * (lo + hi)
        f = field(mid)
        lo = np.where(f <= 0, mid, lo)
        hi = np.where(f <= 0, hi, mid)
    out[any_in] = (0.5 * (lo + hi))[any_in]
    return out


def smooth_max(a, b, k):
    """polynomial smooth maximum. only blends within k of the crossover, so the
    head keeps its own shape everywhere the ear is not, and the join is a
    fillet instead of a crease."""
    h = np.clip(0.5 + 0.5 * (a - b) / k, 0, 1)
    return b + (a - b) * h + k * h * (1 - h)


def lobe_field(P, side):
    """superellipsoid field of one ear lobe. <0 inside, 0 on the surface."""
    c = CFG
    E, R, rad = _ear_frame(side)
    v = ((P - E) @ R) / rad
    return (np.abs(v[:, 0]) ** c["ear_cross_p"]
            + np.abs(v[:, 1]) ** c["ear_long_p"]
            + np.abs(v[:, 2]) ** c["ear_cross_p"]) - 1.0


def ear_mask(P, side):
    """how much the ear BONE owns a vertex.

    deliberately NOT the lobe field. the lobe is thin front-to-back and its
    exponent is close to 3, so that field swings by order 1 across a single
    edge -- reused as a weight mask it switches the ear bone on almost
    instantly, which is a cliff, and the pose check sees it as a tear. an
    isotropic falloff on distance to the ear's own axis is smooth in every
    direction, which is the only property a weight mask actually needs."""
    c = CFG
    E, R, rad = _ear_frame(side)
    ax = R[:, 1]
    a = E - ax * (c["ear_len"] * 0.75)
    b = E + ax * (c["ear_len"] * 0.95)
    d = seg_distance(P, a, b)
    t = np.clip((c["ear_mask_out"] - d) /
                (c["ear_mask_out"] - c["ear_mask_in"]), 0, 1)
    return t * t * (3 - 2 * t)


def union_ears(q):
    """smooth-union the two ear lobes into the shaped head.

    returns the new positions and, per side, the blend weight -- how much of
    the final radius came from the ear rather than the skull. that weight is
    what the rigging uses to decide which vertices the ear bones drive, so the
    handover follows the actual geometry instead of a hand-drawn box."""
    c = CFG
    C = np.array(c["head_center"])
    d = q - C
    r = np.linalg.norm(d, axis=1)
    u = d / np.maximum(r, 1e-9)[:, None]

    rn = r.copy()
    weights = []
    for side in (1, -1):
        re = _ray_lobe(C, u, side)
        re = np.where(np.isfinite(re), re, -1e3)
        merged = smooth_max(rn, re, c["ear_blend"])
        w = np.clip((merged - rn) / c["ear_blend"], 0, 1)
        weights.append(w)
        rn = merged
    return C + u * rn[:, None], weights


def head_surface(S):
    """unit-sphere parameters -> the finished head, ears included. one function
    so the relaxation below can evaluate the real surface it is equalising."""
    return union_ears(shape_head(S))[0]


def relax_params(S, Q, freeze, iters, step):
    """even out vertex spacing on the OUTPUT surface by moving the parameters.

    the ear is a long feature grown from a small patch of the parameter sphere,
    so a uniform sphere gives it far too few vertices -- the tip comes out bald
    and faceted while the cheek is dense. this migrates parameters INTO the
    stretched regions: each vertex moves toward the weighted centroid of its
    neighbours with the weights being OUTPUT edge lengths, so a neighbour that
    is far away on the finished surface pulls hardest.

    it is a convex combination, so unlike a force/spring form it cannot
    overshoot or blow the sphere apart -- the first attempt at this used
    explicit forces and diverged, making spacing worse AND breaking the model's
    left-right symmetry. topology is untouched: only where each vertex samples
    the surface changes."""
    E = np.vstack([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    E = np.unique(np.sort(E, axis=1), axis=0)
    E = np.vstack([E, E[:, ::-1]])                # both directions
    S = S.copy()
    S0 = S.copy()
    for _ in range(iters):
        V = head_surface(S)
        w = np.linalg.norm(V[E[:, 1]] - V[E[:, 0]], axis=1) + 1e-9
        num = np.zeros_like(S)
        den = np.zeros(len(S))
        np.add.at(num, E[:, 0], S[E[:, 1]] * w[:, None])
        np.add.at(den, E[:, 0], w)
        tgt = num / np.maximum(den, 1e-12)[:, None]
        S = S + step * (tgt - S)
        S[freeze] = S0[freeze]
        S /= np.linalg.norm(S, axis=1, keepdims=True)
    return S


def spacing_cv(S, Q):
    """coefficient of variation of output edge length -- the number the
    relaxation is minimising, reported so the effect is not taken on faith."""
    E = np.vstack([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    V = head_surface(S)
    L = np.linalg.norm(V[E[:, 1]] - V[E[:, 0]], axis=1)
    return float(L.std() / L.mean())


# ---------------------------------------------------------------------------
def build_mesh():
    c = CFG
    M = mk.QuadMesh()

    # ---- head. only ONE socket is opened (the neck): the ears are sculpted
    # out of the head's own surface, not grown out of sockets, so they inherit
    # the skull's quad grid and there is no base ring to show as a seam -------
    head = mk.quadsphere(c["head_res"])
    n = c["head_res"]
    # open the neck socket FIRST: it deletes an interior vertex and renumbers
    # everything after it, which would rot the index sets taken below
    mk.ring_from_patch(head, "NY", n // 2 - 1, n // 2 - 1, 2, name="neck")

    # relax the sampling over the finished head+ears, holding the neck socket
    # put (it has to stay a clean ring for the loft to bridge onto)
    S = head.V.copy()
    freeze = S[:, 1] < -0.78
    before = spacing_cv(S, head.Q)
    S = relax_params(S, head.Q, freeze, c["relax_iters"], c["relax_step"])
    CFG["_spacing_cv"] = (before, spacing_cv(S, head.Q))

    head.V, (wL, wR) = union_ears(shape_head(S))
    head.groups["head"] = np.arange(len(head.V))
    M.append(head)

    # no separate ear vertex group: the ear IS head surface, and the ear bones
    # pick it up through the shared allowed-bone set (see GROUP_BONES). the
    # union's own blend weight is kept as a per-vertex MASK for those bones --
    # continuous by construction, so it gates the ears' authority without
    # reintroducing the cliff a group boundary created.
    M.ear_mask = {"ear.L": ear_mask(head.V, 1),
                  "ear.R": ear_mask(head.V, -1)}

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

    # pad the ear masks out to the final vertex count (everything appended
    # after the head is body/limbs, which the ears never influence)
    for k, v in M.ear_mask.items():
        M.ear_mask[k] = np.concatenate([v, np.zeros(len(M.V) - len(v))])

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
        "head": (0, 0.72, 0.02),
        "ear.L": (0.128, 0.29, -0.021), "ear.R": (-0.128, 0.29, -0.021),
        "hand.L": (0.16, -0.07, 0.03), "hand.R": (-0.16, -0.07, 0.03),
        "foot.L": (0.18, -0.28, 0.05), "foot.R": (-0.18, -0.28, 0.05),
        "tail.007": (-0.12, 0.10, 0.10),
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
            mask = getattr(M, "ear_mask", {}).get(bn)
            if mask is not None:
                # gate the ear bones by how much of this vertex's surface the
                # ear lobe actually produced. without it the ear bones bleed
                # weight across the whole crown and the head bone never gets
                # full authority at the top of the skull.
                w[:, k] *= np.clip(mask[idx], 0, 1)
        w /= np.maximum(w.sum(1, keepdims=True), 1e-12)
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
    """planar projection of the head's front onto the atlas island.

    v is INVERTED against model y on purpose. glTF's v grows DOWNWARD, so
    mapping y straight through stores the face upside down in the atlas: the
    eyes survive that (they are near enough symmetric) but everything with a
    vertical sense -- highlights, blush, mouth -- lands mirrored, which is
    exactly how v3.7 ended up painting the blush onto the forehead. flipping
    here lets paint_texture draw in plain screen orientation, up is up."""
    x0, y0, x1, y1 = box
    u0, v0, u1, v1 = FACE_UV
    fu = (np.asarray(P)[..., 0] - x0) / (x1 - x0)
    fv = (np.asarray(P)[..., 1] - y0) / (y1 - y0)
    return np.stack([u0 + fu * (u1 - u0), v1 - fv * (v1 - v0)], -1)


def face_px_scale(box, size):
    """model units -> atlas pixels, per axis. the island is not square and the
    face box is not either, so a single scalar would skew every circle drawn."""
    x0, y0, x1, y1 = box
    u0, v0, u1, v1 = FACE_UV
    return ((u1 - u0) / (x1 - x0) * size, (v1 - v0) / (y1 - y0) * size)


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
    e = CFG["eye"]
    return (np.array([hc[0] + e["sep"], hc[1] + e["rise"], hc[2] + e["front"]]),
            np.array([hc[0] - e["sep"], hc[1] + e["rise"], hc[2] + e["front"]]))


def paint_texture(box, size=1024):
    """the face, lifted STRAIGHT OUT OF THE REFERENCE RENDER rather than redrawn.

    tools/faceref.py cuts the eye and the blush out of y2kMew.jpg as alpha
    sprites (see that file for why cut-outs beat cropping the whole face). here
    they are just placed: the character's left eye goes where the model's eye
    is, the blush keeps the exact offset it has in the reference, and the whole
    pair is mirrored for the other side. everything is sized in MODEL units and
    converted per axis, so the atlas island's aspect never skews the artwork.

    edit src/assets/mew_face.png (or swap the reference) and rebuild to restyle.
    the base pink matches the v1 material exactly, so lighting is unchanged."""
    import faceref

    e = CFG["eye"]
    PINK = (251, 228, 238)
    img = Image.new("RGBA", (size, size), PINK + (255,))
    sx, sy = face_px_scale(box, size)

    eye = faceref.eye_sprite()
    blush = faceref.blush_sprite()
    ref_w, ref_h = faceref.eye_span()
    bdx, bdy = faceref.blush_offset()

    # one scale for the whole face: model units per reference pixel, fixed by
    # how wide the eye should be. everything else inherits it, so the reference's
    # proportions and spacing survive intact.
    upp = e["w"] / ref_w

    def paste(sprite, pt, dx, dy, mirror):
        """place a sprite centred on a model point, sized in model units."""
        mw, mh = sprite.width * upp, sprite.height * upp
        pw, ph = max(1, int(round(mw * sx))), max(1, int(round(mh * sy)))
        sp = sprite.resize((pw, ph), Image.LANCZOS)
        if mirror:
            sp = sp.transpose(Image.FLIP_LEFT_RIGHT)
        uv = model_to_face_uv(np.asarray(pt) + np.array([dx, -dy, 0.0]), box)
        cx, cy = float(uv[0]) * size, float(uv[1]) * size
        img.alpha_composite(sp, (int(round(cx - pw / 2)), int(round(cy - ph / 2))))

    eL, eR = eye_points()
    for pt, side in ((eL, 1), (eR, -1)):
        mirror = side < 0        # sprite is the character's LEFT eye
        paste(eye, pt, 0.0, 0.0, mirror)
        paste(blush, pt, side * bdx * upp, bdy * upp, mirror)

    return img.convert("RGB")


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
