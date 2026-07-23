"""glbtool.py

minimal glb (binary gltf) read/write, numpy only. no blender, no deps beyond
numpy -- so the whole model pipeline runs headless anywhere and every step is
verifiable in ci.

read side is enough to inspect/render any of our own exports; write side emits
a single-mesh skinned model with optional morph targets.
"""

import json
import struct
import numpy as np

COMP = {5120: "i1", 5121: "u1", 5122: "i2", 5123: "u2", 5125: "u4", 5126: "f4"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


# ---------------------------------------------------------------------------
# read
# ---------------------------------------------------------------------------
class Glb:
    def __init__(self, path):
        d = open(path, "rb").read()
        jlen = struct.unpack("<I", d[12:16])[0]
        self.json = json.loads(d[20:20 + jlen])
        off = 20 + jlen
        blen = struct.unpack("<I", d[off:off + 4])[0]
        self.bin = d[off + 8:off + 8 + blen]

    def accessor(self, i):
        a = self.json["accessors"][i]
        bv = self.json["bufferViews"][a["bufferView"]]
        off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        n = NCOMP[a["type"]]
        arr = np.frombuffer(self.bin, dtype=COMP[a["componentType"]],
                            count=a["count"] * n, offset=off)
        return arr.reshape(a["count"], n) if n > 1 else arr

    def node_matrix(self, n):
        if "matrix" in n:
            return np.array(n["matrix"], dtype=np.float64).reshape(4, 4).T
        t = n.get("translation", [0, 0, 0])
        r = n.get("rotation", [0, 0, 0, 1])
        s = n.get("scale", [1, 1, 1])
        M = np.eye(4)
        M[:3, :3] = quat_to_mat(r) @ np.diag(s)
        M[:3, 3] = t
        return M

    def world_matrices(self):
        nodes = self.json["nodes"]
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get("children", []):
                parent[c] = i
        out = {}

        def walk(i):
            if i in out:
                return out[i]
            M = self.node_matrix(nodes[i])
            if i in parent:
                M = walk(parent[i]) @ M
            out[i] = M
            return M

        for i in range(len(nodes)):
            walk(i)
        return out

    def primitives(self):
        """yields dicts of the decoded attributes of every primitive."""
        for mesh in self.json["meshes"]:
            for p in mesh["primitives"]:
                yield {
                    "name": mesh.get("name", ""),
                    "P": self.accessor(p["attributes"]["POSITION"]).astype(np.float64),
                    "N": (self.accessor(p["attributes"]["NORMAL"]).astype(np.float64)
                          if "NORMAL" in p["attributes"] else None),
                    "J": (self.accessor(p["attributes"]["JOINTS_0"]).astype(np.int32)
                          if "JOINTS_0" in p["attributes"] else None),
                    "W": (self.accessor(p["attributes"]["WEIGHTS_0"]).astype(np.float64)
                          if "WEIGHTS_0" in p["attributes"] else None),
                    "IDX": self.accessor(p["indices"]).astype(np.int64).reshape(-1, 3),
                    "material": p.get("material"),
                }


def quat_to_mat(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def mat_to_quat(M):
    m = M[:3, :3]
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        w = 0.25 * s
        x = (m[2, 1] - m[1, 2]) / s
        y = (m[0, 2] - m[2, 0]) / s
        z = (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w = (m[2, 1] - m[1, 2]) / s
        x = 0.25 * s
        y = (m[0, 1] + m[1, 0]) / s
        z = (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w = (m[0, 2] - m[2, 0]) / s
        x = (m[0, 1] + m[1, 0]) / s
        y = 0.25 * s
        z = (m[1, 2] + m[2, 1]) / s
    else:
        s = np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w = (m[1, 0] - m[0, 1]) / s
        x = (m[0, 2] + m[2, 0]) / s
        y = (m[1, 2] + m[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w])
    return q / np.linalg.norm(q)


# ---------------------------------------------------------------------------
# write
# ---------------------------------------------------------------------------
class GlbWriter:
    def __init__(self):
        self.blob = bytearray()
        self.views = []
        self.accessors = []

    def _view(self, data, target=None):
        while len(self.blob) % 4:
            self.blob.append(0)
        off = len(self.blob)
        self.blob += data
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            v["target"] = target
        self.views.append(v)
        return len(self.views) - 1

    def add(self, arr, atype, ctype, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr, dtype=COMP[ctype])
        vi = self._view(arr.tobytes(), target)
        a = {
            "bufferView": vi,
            "componentType": ctype,
            "count": int(arr.shape[0]),
            "type": atype,
        }
        if normalized:
            a["normalized"] = True
        if minmax:
            flat = arr.reshape(arr.shape[0], -1).astype(np.float64)
            a["min"] = [float(x) for x in flat.min(0)]
            a["max"] = [float(x) for x in flat.max(0)]
        self.accessors.append(a)
        return len(self.accessors) - 1

    def add_sparse(self, arr, atype, ctype, minmax=False):
        """morph deltas are almost all zero (only the face moves), so store
        them as a glTF sparse accessor: indices + values for the nonzero rows
        only. cuts each target from ~55kB to ~2kB."""
        arr = np.ascontiguousarray(arr, dtype=COMP[ctype])
        nz = np.nonzero(np.abs(arr).max(axis=1) > 1e-7)[0].astype(np.uint32)
        a = {
            "componentType": ctype,
            "count": int(arr.shape[0]),
            "type": atype,
        }
        if minmax:
            flat = arr.astype(np.float64)
            a["min"] = [float(x) for x in flat.min(0)]
            a["max"] = [float(x) for x in flat.max(0)]
        if len(nz):
            a["sparse"] = {
                "count": int(len(nz)),
                "indices": {"bufferView": self._view(nz.tobytes()),
                            "byteOffset": 0, "componentType": 5125},
                "values": {"bufferView": self._view(arr[nz].tobytes()),
                           "byteOffset": 0},
            }
        self.accessors.append(a)
        return len(self.accessors) - 1

    def write(self, path, gltf):
        gltf["asset"] = {"version": "2.0", "generator": "AnimationWeb/glbtool"}
        gltf["bufferViews"] = self.views
        gltf["accessors"] = self.accessors
        gltf["buffers"] = [{"byteLength": len(self.blob)}]
        js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        js += b" " * ((4 - len(js) % 4) % 4)
        bl = bytes(self.blob)
        bl += b"\0" * ((4 - len(bl) % 4) % 4)
        total = 12 + 8 + len(js) + 8 + len(bl)
        with open(path, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, total))
            f.write(struct.pack("<II", len(js), 0x4E4F534A))
            f.write(js)
            f.write(struct.pack("<II", len(bl), 0x004E4942))
            f.write(bl)
        return total
