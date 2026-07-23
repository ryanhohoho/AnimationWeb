# plot_turn.py
# before/after filmstrip of the tail through a hard turn. top row = base cone
# OFF (old: the tail root flops ~180 deg onto its length); bottom row = the
# shipped cone (the tail drags behind the turn). the dashed grey ray is the
# body-carried rigid base direction the root should hold to.

import json, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

src = sys.argv[1] if len(sys.argv) > 1 else "turn_dump.json"
out = sys.argv[2] if len(sys.argv) > 2 else "turn_strip.png"
d = json.load(open(src))

def panel(ax, fr, title, color):
    c = np.array(fr["center"])          # tail centerline, world units
    base = np.array(fr["base"])
    rigid = np.array(fr["rigid"])
    # screen plane = world x (right) vs world y (up)
    ax.plot(c[:, 0], c[:, 1], "-o", color=color, ms=3, lw=2)
    ax.plot(c[0, 0], c[0, 1], "s", color="black", ms=5)   # pinned base
    # rigid base direction ray (where the root SHOULD point), scaled to seg
    seg = np.linalg.norm(c[1] - c[0]) * 2.2
    ax.plot([base[0], base[0] + rigid[0] * seg], [base[1], base[1] + rigid[1] * seg],
            "--", color="grey", lw=1.2)
    ax.set_title(title, fontsize=8)
    ax.set_aspect("equal"); ax.set_xticks([]); ax.set_yticks([])

off, on = d["off"], d["on"]
n = min(len(off), len(on), 8)
idx = np.linspace(0, min(len(off), len(on)) - 1, n).astype(int)

fig, axes = plt.subplots(2, n, figsize=(2.0 * n, 4.4))
# shared limits so the two rows are directly comparable
allc = np.array([p for fr in (off + on) for p in fr["center"]])
xpad = (allc[:, 0].max() - allc[:, 0].min()) * 0.1 + 0.05
ypad = (allc[:, 1].max() - allc[:, 1].min()) * 0.1 + 0.05
xlim = (allc[:, 0].min() - xpad, allc[:, 0].max() + xpad)
ylim = (allc[:, 1].min() - ypad, allc[:, 1].max() + ypad)

for j, i in enumerate(idx):
    panel(axes[0, j], off[i], f"OFF  t={off[i]['t']}s", "#c0392b")
    panel(axes[1, j], on[i], f"cone {d['onLimit']}°  t={on[i]['t']}s", "#2471a3")
    for r in (0, 1):
        axes[r, j].set_xlim(*xlim); axes[r, j].set_ylim(*ylim)

axes[0, 0].set_ylabel("base cone OFF\n(old: flops)", fontsize=9)
axes[1, 0].set_ylabel("base cone ON\n(drags behind)", fontsize=9)
fig.suptitle("Tail through a hard turn  —  black square = pinned base, grey dash = body rigid direction", fontsize=10)
fig.tight_layout(rect=[0, 0, 1, 0.96])
fig.savefig(out, dpi=110)
print("wrote", out)
