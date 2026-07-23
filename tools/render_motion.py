# render_motion.py
# draws the frames dumped by test/dump_motion.js: a filmstrip of poses over the
# fake page, plus smoothness metric plots. quick offline eyeball of motion.

import json
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

src = sys.argv[1] if len(sys.argv) > 1 else "motion_dump.json"
out = sys.argv[2] if len(sys.argv) > 2 else "motion_strip.png"

with open(src) as f:
    data = json.load(f)

frames = data["frames"]
vp = data["viewport"]
m = data["metrics"]

# world -> px mapping used by the engine (must match main.js)
FOV = 35
CAMD = 16
world_per_px = 2 * np.tan(np.radians(FOV / 2)) * CAMD / vp["h"]

def world_to_px(v):
    x = v[:, 0] / world_per_px + vp["w"] / 2
    y = vp["h"] / 2 - v[:, 1] / world_per_px
    return x, y

# pick a spread of frames across the scenario
picks = np.linspace(0, len(frames) - 1, 16).astype(int)

SKEL_STYLE = {
    "spine": ("#4a1f66", 2.5), "tail": ("#111111", 2.5),
    "armL": ("#1f6650", 2.0), "armR": ("#1f6650", 2.0),
    "earL": ("#66401f", 1.5), "earR": ("#66401f", 1.5),
}

def draw_frame(ax, fr, crop=None):
    v = np.array(fr["verts"])
    x, y = world_to_px(v)
    depth = v[:, 2]
    for r in data["colliders"]:
        ax.add_patch(Rectangle((r["x"], r["y"]), r["w"], r["h"],
                               facecolor="#ddd", edgecolor="#bbb"))
    ax.scatter(x, y, c=depth, cmap="RdPu_r", s=2.5 if crop else 1.5, linewidths=0, alpha=0.6)
    for part, pts in fr.get("skel", {}).items():
        if not pts:
            continue
        p = np.array(pts)
        px, py = world_to_px(p)
        style = SKEL_STYLE.get(part)
        if style:
            ax.plot(px, py, "-o", color=style[0], lw=style[1], ms=2.5)
        else:  # feet: dots only
            ax.plot(px, py, "o", color="#206080", ms=4)
    if fr["pointer"]:
        ax.plot(fr["pointer"][0], fr["pointer"][1], "x", color="tab:blue", ms=12, mew=2.5)
    ax.set_title(f"t={fr['t']:.1f}s {fr['state']} agit={fr['agit']:.2f}", fontsize=9)
    if crop:
        cx, cy = fr["bodyPx"]
        ax.set_xlim(cx - crop, cx + crop)
        ax.set_ylim(cy + crop, cy - crop)
    else:
        doc = data.get("docSize", vp)
        ax.set_xlim(0, doc["w"])
        ax.set_ylim(doc["h"], 0)
    ax.set_aspect("equal")
    ax.tick_params(labelsize=6)

fig, axes = plt.subplots(4, 4, figsize=(20, 13))
for ax, fi in zip(axes.flat, picks):
    draw_frame(ax, frames[fi])
plt.tight_layout()
plt.savefig(out, dpi=70)

# zoomed strip: same frames, cropped around the character
figz, axesz = plt.subplots(4, 4, figsize=(19, 19))
for ax, fi in zip(axesz.flat, picks):
    draw_frame(ax, frames[fi], crop=220)
plt.tight_layout()
plt.savefig(out.replace(".png", "_zoom.png"), dpi=70)

# metric plots: tail tip position (smoothness), body yaw, path
fig2, axs = plt.subplots(3, 1, figsize=(16, 9), sharex=True)
t = np.array(m["t"])
axs[0].plot(t, m["tipX"], label="tip x")
axs[0].plot(t, m["tipY"], label="tip y")
axs[0].plot(t, m["tipZ"], label="tip z")
axs[0].set_title("tail tip world position (smooth curves = flowing tail, spikes = flail)")
axs[0].legend(fontsize=8)
axs[1].plot(t, m["bodyYaw"], label="body yaw (rad)")
axs[1].plot(t, np.array(m["headYaw"]), label="head yaw rate (rad/s)", alpha=0.6)
axs[1].set_title("orientation")
axs[1].legend(fontsize=8)
axs[2].plot(t, m["posX"], label="pos x")
axs[2].plot(t, m["posY"], label="pos y")
axs[2].set_title("body position (px)")
axs[2].legend(fontsize=8)

# jerk metric for the tail tip
tip = np.stack([m["tipX"], m["tipY"], m["tipZ"]], axis=1)
d3 = np.diff(tip, n=3, axis=0)
jerk = np.linalg.norm(d3, axis=1)
print(f"tail tip jerk: mean={jerk.mean():.5f} p95={np.percentile(jerk, 95):.5f} max={jerk.max():.5f}")
print(f"tip y range: {min(m['tipY']):.3f}..{max(m['tipY']):.3f}")

plt.tight_layout()
plt.savefig(out.replace(".png", "_metrics.png"), dpi=70)
print("saved", out)
