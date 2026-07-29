"""render_poses.py -- draw the frames test/pose_frames.js captured.

    node test/pose_frames.js && python3 tools/render_poses.py

one column per moment, front and 3/4 rows, all on a shared scale so a limb that
inflates or a face that shears is obvious against its neighbours.
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import preview_model as pm  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "pose_frames.json")
DST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "preview", "mew_motion.png")

d = json.load(open(SRC))
I = np.array(d["index"], np.int64).reshape(-1, 3)
frames = d["frames"]
CW, CH = 340, 400
VIEWS = [("front", (0, 0, 1)), ("3/4", (0.75, 0.2, 0.7)), ("side", (1, 0, 0))]

# one shared framing across every frame, so sizes are comparable
allv = np.vstack([np.array(f["verts"], float) for f in frames])
ctr = (allv.min(0) + allv.max(0)) / 2
rad = np.linalg.norm(allv.max(0) - allv.min(0)) / 2
cols = np.tile(np.array([224.0, 198.0, 212.0]), (len(I), 1))

sheet = np.tile(pm.BG, (CH * len(VIEWS), CW * len(frames), 1))
for c, f in enumerate(frames):
    P = np.array(f["verts"], float)
    for r, (nm, dv) in enumerate(VIEWS):
        dv = np.array(dv, float)
        dv /= np.linalg.norm(dv)
        v = pm.look_at(ctr + dv * rad * 4, ctr, (0, 1, 0))
        _, Pc = pm.project(np.stack([ctr - rad, ctr + rad]), v, CW, CH, 1, np.zeros(3))
        s = min(CW, CH) / (rad * 2.3)
        Pv, _ = pm.project(P, v, CW, CH, s, pm.project(ctr[None], v, CW, CH, 1, np.zeros(3))[1][0])
        img = pm.rasterize(Pv, I, CW, CH, pm.shade(P, I, cols, v))
        im = Image.fromarray(img.astype(np.uint8))
        ImageDraw.Draw(im).text((5, 4), f"t={f['t']} {f['state']} / {nm}", fill=(255, 255, 255))
        sheet[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW] = np.asarray(im).astype(float)

Image.fromarray(sheet.astype(np.uint8)).save(DST)
print("wrote", os.path.relpath(DST, ROOT))
