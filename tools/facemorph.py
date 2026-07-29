"""facemorph.py

blink and squint targets for a face whose eyes are PAINTED, not modelled.

an expression here is the face geometry squashing the painted eye: compress the
surface vertically inside the eye's band and the art compresses with it, because
the uvs ride the vertices. that is the same trick the v3.7 model used, and it is
why the face patch is subdivided first -- a blink needs rows of vertices across
the eye to compress, and the raw meshy head has about four.

WHERE THE EYES ARE is not guessed and not sampled off the vertices. the
retexture pass produced a pixel-exact mask of the eye ink in the new atlas, and
the new atlas is a plain affine projection of the face, so the mask's bounding
box inverts straight back to model x/y. repaint the eyes and rebuild and the
morph follows them.

THE PROFILE is the part that is easy to get wrong, twice over:

  * a spherical falloff centred on the eye fades out exactly where a lid vertex
    has furthest to travel, so the lid barely moves. the v3.7 build shipped a
    4% twitch that way once, and the first attempt here shipped a 60% one.
  * but you cannot simply not fade, either: closing a lid means the surface
    above the eye really does slide down a whole eye-height, so SOMETHING has
    to absorb it. let that reach the forehead and the skull visibly shrinks.

so the profile is: move by the full distance to the closing line everywhere
INSIDE the eye, then return linearly to zero over a short band just outside it.
the shear is confined to that band -- which is what a brow does -- and the eye
itself closes completely.
"""

import numpy as np

CLOSE_AT = 0.40     # the lids meet this far up the eye (0 = bottom, 1 = top).
                    # real lids close low; closing at the middle reads as the
                    # eye shrinking rather than shutting
REACH_UP = 1.15     # the shear band above the eye, in units of the distance
REACH_DN = 0.75     # from the closing line to the eye's edge. shorter below:
                    # the muzzle and the blush live there and must stay put
LAT_FLAT = 1.10     # lateral gate: 1.0 out to this many eye half-widths...
LAT_FADE = 1.85     # ...and 0 by this many, so the skull's silhouette is safe
DEPTH_ON = 0.14     # and a DEPTH gate: full effect forward of this z, nothing
DEPTH_OFF = -0.02   # behind this. the face island is picked per TRIANGLE, so a
                    # cheek triangle can own a vertex well round the side of the
                    # head; without this the blink reached it
SQUINT = 0.45       # a squint is a partial close, upper lid only
EYE_PAD = 1.06      # the ink mask stops just inside the drawn eye; nudge the
                    # measured extent out so the lid clears the lashes


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def _profile(d, up, dn):
    """odd function: identity inside [-dn, up], then a smooth return to zero."""
    out = np.zeros_like(d)
    pos = d >= 0
    o = np.where(d <= up, d, up * (1.0 - smoothstep((d - up) / (REACH_UP * up))))
    out[pos] = o[pos]
    o = np.where(d >= -dn, d, -dn * (1.0 - smoothstep((-d - dn) / (REACH_DN * dn))))
    out[~pos] = o[~pos]
    return out


def eye_boxes(eye_mask, info):
    """model-space (x0, x1, y0, y1) of each painted eye, read straight off the
    atlas mask. `info` is the affine the new uv island was built with."""
    from scipy import ndimage
    H, W = eye_mask.shape
    lab, n = ndimage.label(eye_mask)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if len(ys) < 60:
            continue
        # atlas px -> uv -> model. plan_uvs used:
        #   u = (x - lo.x) * s + u0        ->  x = (u - u0)/s + lo.x
        #   v = v1 - (y - lo.y) * s        ->  y = (v1 - v)/s + lo.y
        u0, v1, s, lo = info["u0"], info["v1"], info["scale"], info["lo"]
        ux = xs / W
        vy = ys / H
        x = (ux - u0) / s + lo[0]
        y = (v1 - vy) / s + lo[1]
        cx, cy = x.mean(), y.mean()
        hx = max((x.max() - x.min()) * 0.5, 1e-4) * EYE_PAD
        hy = max((y.max() - y.min()) * 0.5, 1e-4) * EYE_PAD
        out.append((cx, cy, hx, hy))
    out.sort(key=lambda b: b[0])
    return out


def build(P, I, uv, ft, eye_mask, info, cov, part, meta):
    """{name: (nvert,3) delta array} for the welded mesh."""
    boxes = eye_boxes(eye_mask, info)
    if len(boxes) < 1:
        return {}
    # only the face patch may move at all -- the morph must never reach the
    # skull's silhouette or the back of the head
    onface = np.zeros(len(P), bool)
    onface[np.unique(I[ft])] = True

    # SHARED half-extents. this mesh is not mirror-symmetric (the two eyes sit
    # 0.02 apart in height and cover different areas), and giving each eye its
    # own band made one shut a third of a blink before the other -- a wink.
    hy = float(np.mean([b[3] for b in boxes]))
    hx = float(np.mean([b[2] for b in boxes]))

    blink = np.zeros_like(P)
    squint = np.zeros_like(P)
    for cx, cy, _, _ in boxes:
        line = cy + (CLOSE_AT - 0.5) * 2.0 * hy
        up = (cy + hy) - line          # distance from the line to the eye's top
        dn = line - (cy - hy)
        d = P[:, 1] - line
        lat = 1.0 - smoothstep((np.abs(P[:, 0] - cx) / hx - LAT_FLAT)
                               / (LAT_FADE - LAT_FLAT))
        lat = lat * smoothstep((P[:, 2] - DEPTH_OFF) / (DEPTH_ON - DEPTH_OFF))
        lat = np.where(onface, lat, 0.0)
        blink[:, 1] += -_profile(d, up, dn) * lat
        squint[:, 1] += -np.where(d > 0, _profile(d, up, dn), 0.0) * lat * SQUINT
    return {"blink": blink, "squint": squint}


def eye_meta(P, I, ft, eye_mask, info):
    """where each painted eye IS, in model space, for the engine to draw on.

    the >.< face is a flat overlay (engine/fx/faceOverlay.js) rather than a morph
    target: it is a symbol, not a deformation, and a symbol only has to be put in
    the right place. This is that place -- centre, half-extents and the face's
    own depth there, so the overlay sits just proud of the surface -- and it is
    measured off the same ink mask the blink is, so repainting the eyes moves
    both together."""
    onface = np.zeros(len(P), bool)
    onface[np.unique(I[ft])] = True
    out = []
    for cx, cy, hx, hy in eye_boxes(eye_mask, info):
        near = (onface & (np.abs(P[:, 0] - cx) < hx * 1.5)
                & (np.abs(P[:, 1] - cy) < hy * 1.5))
        z = float(P[near, 2].max()) if near.any() else 0.0
        out.append({"cx": round(float(cx), 5), "cy": round(float(cy), 5),
                    "hx": round(float(hx), 5), "hy": round(float(hy), 5),
                    "z": round(z, 5)})
    return out
