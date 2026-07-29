"""faceref.py

lifts the face art straight out of the reference render (y2kMew.jpg) instead of
re-drawing it. the eye and the blush are cut out as premultiplied-alpha sprites
and composited into the model's atlas by build_mew.paint_texture.

why cut-outs rather than crop the whole face: the reference is a photo of a
render -- purple rim light, bloom, chromatic fringing, jpeg noise, and a head
that is turned a few degrees off axis. dropping that rectangle onto the model
would drag all of it along and skew with the head's own uv island. isolating
just the INK (the parts that differ from skin) keeps the artwork and throws
away the lighting: the model's own flat pink shows through everywhere the
reference was skin, so the two blend seamlessly at any resolution.

the character's left eye (viewer's RIGHT in the image) is the one used: the head
is turned slightly toward the viewer's left, so that eye is the more front-on of
the two. it gets mirrored for the other side, which also guarantees symmetry the
hand-turned reference does not have.
"""

import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REF = os.path.join(ROOT, "y2kMew.jpg")

# regions measured off y2kMew.jpg (682x594). left/top/right/bottom.
EYE_BOX = (286, 211, 361, 291)
BLUSH_BOX = (306, 282, 352, 306)


def _skin_color(A):
    """the reference's skin tone, as the median of its palest pixels. taken per
    crop so the purple rim light near an edge cannot drag it."""
    lum = A[..., :3].mean(2)
    hi = A[lum >= np.percentile(lum, 62)]
    return np.median(hi[:, :3], axis=0)


def _eye_ink(A, skin):
    """the eye is either MUCH DARKER than skin (the lash hood) or MUCH BLUER
    (the iris). a plain rgb-distance mask cannot separate either from the
    purple rim light spilling across the cheek, because that spill is also
    "far from skin" -- it is just far in a direction we do not care about."""
    lum = A.mean(2)
    skin_lum = float(skin.mean())
    dark = (skin_lum - lum) / (skin_lum * 0.42)
    blue = ((A[..., 2] - A[..., 0]) - (skin[2] - skin[0])) / 62.0
    return np.maximum(dark, blue)


def _blush_ink(A, skin):
    """the ticks are magenta: red well above green, beyond what the skin does."""
    mag = ((A[..., 0] - A[..., 1]) - (skin[0] - skin[1])) / 22.0
    return mag


def _clear_border(a, pad):
    """force alpha to fade to 0 at the sprite's edge."""
    h, w = a.shape
    ry = np.minimum(np.arange(h), h - 1 - np.arange(h))[:, None]
    rx = np.minimum(np.arange(w), w - 1 - np.arange(w))[None, :]
    return a * np.clip(np.minimum(ry, rx) / float(pad), 0, 1)


def _cutout(A, ink_fn, lo, hi, fill_holes=True, feather=1.1, border=0):
    """alpha from a feature-specific "ink" score, thresholded with a soft ramp.

    a catchlight inside the eye is nearly skin-coloured, so any distance mask
    punches a hole straight through it. filling holes in the solid part first
    keeps the eye one opaque island and lets the reference's own white read as
    white instead of showing the model's pink through the pupil."""
    skin = _skin_color(A)
    a = np.clip((ink_fn(A, skin) - lo) / (hi - lo), 0, 1)
    # anything only faintly inked is SKIN caught by the ramp. left in, it tints
    # a faint rectangle of the reference's lighting around the sprite; the eye
    # then reads as a sticker with a visible box. clip the toe off hard.
    a = np.clip((a - 0.18) / 0.82, 0, 1)

    if fill_holes:
        from scipy import ndimage
        solid = ndimage.binary_fill_holes(a > 0.5)
        solid = ndimage.binary_closing(solid, np.ones((3, 3)))
        # drop specks: only the eye itself should survive
        lab, n = ndimage.label(solid)
        if n:
            sizes = ndimage.sum(solid, lab, range(1, n + 1))
            solid = lab == (int(np.argmax(sizes)) + 1)
        # keep the soft ramp only in a band around the main blob, so stray
        # speckle out on the cheek does not survive as floating dirt
        near = ndimage.binary_dilation(solid, np.ones((5, 5)))
        a = np.maximum(a * near, solid.astype(float))
        # anything still touching the crop border is rim-light spill that the
        # box happened to clip, and it survives as a hard RIGHT-ANGLED edge --
        # the one artefact that reads instantly as "pasted rectangle". clear a
        # frame and re-ramp so alpha always reaches 0 before the sprite ends.
        a = _clear_border(a, 3)

    if border:
        a = _clear_border(a, border)
    out = np.dstack([A[..., :3], a * 255.0]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    if feather > 0:
        # blur the ALPHA only -- blurring rgb too would bleed skin into the
        # lash line and grey it out
        r, g, b, al = img.split()
        al = al.filter(ImageFilter.GaussianBlur(feather))
        img = Image.merge("RGBA", (r, g, b, al))
    return img


def _load(box, ink_fn, lo, hi, **kw):
    A = np.asarray(Image.open(REF).convert("RGB").crop(box)).astype(float)
    return _cutout(A, ink_fn, lo, hi, **kw)


def eye_sprite():
    """character's left eye: thick dark lash hood, vivid blue iris, catchlight."""
    return _load(EYE_BOX, _eye_ink, 0.40, 0.70)


def blush_sprite():
    """the three little pink ticks under the outer corner."""
    return _load(BLUSH_BOX, _blush_ink, 0.34, 0.85,
                 fill_holes=False, feather=0.5, border=2)


def eye_center():
    """centre of EYE_BOX in reference pixels -- the anchor everything else is
    positioned against, so the model reproduces the reference's own layout
    rather than a guess at it."""
    x0, y0, x1, y1 = EYE_BOX
    return ((x0 + x1) / 2.0, (y0 + y1) / 2.0)


def blush_offset():
    """blush centre relative to the eye centre, in reference pixels."""
    ex, ey = eye_center()
    x0, y0, x1, y1 = BLUSH_BOX
    return ((x0 + x1) / 2.0 - ex, (y0 + y1) / 2.0 - ey)


def eye_span():
    """width/height of EYE_BOX in reference pixels."""
    x0, y0, x1, y1 = EYE_BOX
    return (x1 - x0, y1 - y0)


def dump(outdir):
    os.makedirs(outdir, exist_ok=True)
    for nm, im in (("eye", eye_sprite()), ("blush", blush_sprite())):
        p = os.path.join(outdir, f"ref_{nm}.png")
        im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(p)
        print("wrote", p, im.size)


if __name__ == "__main__":
    import sys
    dump(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "preview"))
