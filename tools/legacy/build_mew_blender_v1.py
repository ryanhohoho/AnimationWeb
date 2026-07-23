# build_mew.py
# blender headless script that procedurally builds a low-poly mew-like character,
# rigs it, skins it deterministically, and exports a glb.
# run: blender -b --python tools/build_mew.py -- --out public/models/mew.glb
#
# conventions: blender z-up, character faces -Y. gltf exporter converts to y-up,
# so in three.js the character faces +Z (toward camera) with +Y up.

import bpy
import bmesh
import sys
import math
from mathutils import Vector, Matrix, Quaternion

# ---------------------------------------------------------------------------
# args
# ---------------------------------------------------------------------------
argv = sys.argv
out_path = "mew.glb"
if "--" in argv:
    extra = argv[argv.index("--") + 1:]
    if "--out" in extra:
        out_path = extra[extra.index("--out") + 1]

# ---------------------------------------------------------------------------
# scene reset
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def new_object(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return obj


def make_uv_sphere(name, segments, rings, radius, scale, location, rotation=(0, 0, 0)):
    # low segment counts give the faceted look natively, no decimation needed
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    bm.to_mesh(mesh)
    bm.free()
    obj = new_object(name, mesh)
    obj.scale = scale
    obj.rotation_euler = rotation
    obj.location = location
    return obj


def make_cone(name, segments, r1, r2, depth, scale, location, rotation=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=segments,
                          radius1=r1, radius2=r2, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj = new_object(name, mesh)
    obj.scale = scale
    obj.rotation_euler = rotation
    obj.location = location
    return obj


def catmull_rom(pts, t):
    # sample a catmull-rom spline through pts at parameter t in [0, 1]
    n = len(pts) - 1
    seg = min(int(t * n), n - 1)
    lt = t * n - seg
    p0 = pts[max(seg - 1, 0)]
    p1 = pts[seg]
    p2 = pts[seg + 1]
    p3 = pts[min(seg + 2, n)]
    lt2 = lt * lt
    lt3 = lt2 * lt
    return (
        p1 * 2.0
        + (p2 - p0) * lt
        + (p0 * 2.0 - p1 * 5.0 + p2 * 4.0 - p3) * lt2
        + (p3 - p0 + (p1 - p2) * 3.0) * lt3
    ) * 0.5


def resample_arclength(pts, count):
    # dense sample then pick uniform arc-length stations, so bones and rings
    # are evenly spaced regardless of control point spacing
    dense = [catmull_rom(pts, i / 400.0) for i in range(401)]
    lengths = [0.0]
    for i in range(1, len(dense)):
        lengths.append(lengths[-1] + (dense[i] - dense[i - 1]).length)
    total = lengths[-1]
    out = []
    for i in range(count):
        target = total * i / (count - 1)
        # find bracketing sample
        j = 0
        while j < len(lengths) - 2 and lengths[j + 1] < target:
            j += 1
        span = lengths[j + 1] - lengths[j]
        f = 0.0 if span == 0 else (target - lengths[j]) / span
        out.append(dense[j].lerp(dense[j + 1], f))
    return out, total


# ---------------------------------------------------------------------------
# proportions (from turnaround refs: huge head, small egg body, stub arms,
# splayed oval feet with no legs, thick s-curve tail with teardrop tip)
# ---------------------------------------------------------------------------

HEAD_C = Vector((0.0, 0.0, 1.02))
BODY_C = Vector((0.0, 0.03, 0.55))

parts = {}

# head: sphere, slightly wider than deep, gentle crown peak
head = make_uv_sphere("head", 14, 10, 0.42, (1.06, 0.98, 0.96), HEAD_C)
parts["head"] = head

# crown peak: nudge top pole up a touch for the faceted silhouette in the refs
me = head.data
top_idx = max(range(len(me.vertices)), key=lambda i: me.vertices[i].co.z)
me.vertices[top_idx].co.z += 0.05

# eyes: flattened dark spheres set into the face. pure geometry (no textures)
# so the gaze direction actually reads on screen -- the whole head-look system
# is invisible without them
for side, sx in (("L", 1), ("R", -1)):
    eye = make_uv_sphere(
        f"eye.{side}", 10, 8, 0.095,
        scale=(0.8, 0.38, 1.05),
        location=(sx * 0.16, -0.415, 1.04),
        rotation=(0, 0, math.radians(sx * -12)),
    )
    parts[f"eye.{side}"] = eye

# ears: flattened cones, tilted outward and slightly back
for side, sx in (("L", 1), ("R", -1)):
    ear = make_cone(
        f"ear.{side}", 6, 0.20, 0.02, 0.50,
        scale=(1.0, 0.45, 1.0),
        location=(sx * 0.23, 0.04, 1.44),
        rotation=(math.radians(8), math.radians(sx * 38), 0),
    )
    parts[f"ear.{side}"] = ear

# body: small egg, taller than wide
body = make_uv_sphere("body", 12, 9, 0.31, (0.94, 0.90, 1.14), BODY_C)
parts["body"] = body

# arms: elongated ellipsoid + hand nub, pointing down-forward
ARM_LEN = 0.30
for side, sx in (("L", 1), ("R", -1)):
    shoulder = Vector((sx * 0.25, -0.05, 0.74))
    arm_dir = Vector((sx * -0.12, -0.38, -1.0)).normalized()  # down, forward, slightly inward
    arm_c = shoulder + arm_dir * (ARM_LEN * 0.45)
    # orient the elongated sphere's local z along arm_dir
    quat = Vector((0, 0, 1)).rotation_difference(arm_dir)
    arm = make_uv_sphere(f"arm.{side}", 8, 7, 0.072, (1.0, 1.0, 2.4), arm_c,
                         rotation=quat.to_euler())
    parts[f"arm.{side}"] = arm
    hand_c = shoulder + arm_dir * (ARM_LEN * 0.98)
    hand = make_uv_sphere(f"hand.{side}", 8, 6, 0.088, (1.0, 0.95, 0.82), hand_c,
                          rotation=quat.to_euler())
    parts[f"hand.{side}"] = hand

# feet: flat ovals splayed outward, attached straight to the body (no legs)
for side, sx in (("L", 1), ("R", -1)):
    foot = make_uv_sphere(
        f"foot.{side}", 9, 6, 0.155, (0.78, 1.45, 0.55),
        location=(sx * 0.21, -0.13, 0.17),
        rotation=(math.radians(-8), 0, math.radians(sx * -16)),
    )
    parts[f"foot.{side}"] = foot

# ---------------------------------------------------------------------------
# tail: ring tube along a catmull-rom s-curve, teardrop bulge near the tip.
# built manually so every vertex knows its arc-length parameter for skinning.
# ---------------------------------------------------------------------------

TAIL_CTRL = [
    Vector((0.00, 0.24, 0.50)),   # rooted inside the body
    Vector((0.00, 0.52, 0.33)),   # swings down and back
    Vector((0.00, 0.82, 0.36)),
    Vector((0.02, 1.04, 0.56)),   # rises
    Vector((0.03, 1.12, 0.84)),
    Vector((0.01, 1.02, 1.06)),   # curls forward-up near head height
    Vector((0.00, 0.88, 1.20)),
]

TAIL_RINGS = 16          # stations along the curve
TAIL_SIDES = 7           # verts per ring


def tail_radius(s):
    # thick base -> slimmer middle -> teardrop bulge -> point
    if s < 0.55:
        return 0.088 - 0.045 * (s / 0.55)
    if s < 0.80:
        return 0.043 + 0.010 * math.sin((s - 0.55) / 0.25 * math.pi * 0.5)
    if s < 0.95:
        b = (s - 0.80) / 0.15
        return 0.053 + 0.062 * math.sin(b * math.pi)
    return max(0.012, 0.053 * (1.0 - (s - 0.95) / 0.05))


tail_mesh = bpy.data.meshes.new("tail")
tail_bm = bmesh.new()
stations, tail_len = resample_arclength(TAIL_CTRL, TAIL_RINGS)
tail_vert_param = []   # arc-length parameter per vertex, for skinning
prev_ring = None
prev_normal = None
for i, center in enumerate(stations):
    s = i / (TAIL_RINGS - 1)
    # tangent via neighbors
    a = stations[max(i - 1, 0)]
    b = stations[min(i + 1, TAIL_RINGS - 1)]
    tangent = (b - a).normalized()
    # parallel transport the frame to avoid twisting
    if prev_normal is None:
        normal = Vector((1, 0, 0))
        normal = (normal - tangent * normal.dot(tangent)).normalized()
    else:
        normal = (prev_normal - tangent * prev_normal.dot(tangent)).normalized()
    prev_normal = normal
    binorm = tangent.cross(normal)
    r = tail_radius(s)
    ring = []
    for k in range(TAIL_SIDES):
        ang = 2 * math.pi * k / TAIL_SIDES
        co = center + normal * (math.cos(ang) * r) + binorm * (math.sin(ang) * r)
        v = tail_bm.verts.new(co)
        ring.append(v)
        tail_vert_param.append(s)
    if prev_ring is not None:
        for k in range(TAIL_SIDES):
            tail_bm.faces.new((
                prev_ring[k], prev_ring[(k + 1) % TAIL_SIDES],
                ring[(k + 1) % TAIL_SIDES], ring[k],
            ))
    prev_ring = ring

# caps
tail_bm.verts.ensure_lookup_table()
base_ring = [tail_bm.verts[i] for i in range(TAIL_SIDES)]
tail_bm.faces.new(reversed(base_ring))
tip_center = tail_bm.verts.new(stations[-1] + (stations[-1] - stations[-2]).normalized() * 0.02)
tail_vert_param.append(1.0)
last_ring = prev_ring
for k in range(TAIL_SIDES):
    tail_bm.faces.new((last_ring[k], last_ring[(k + 1) % TAIL_SIDES], tip_center))
tail_bm.to_mesh(tail_mesh)
tail_bm.free()
tail_obj = new_object("tail", tail_mesh)
parts["tail"] = tail_obj

# ---------------------------------------------------------------------------
# vertex groups (assigned per part BEFORE joining so they survive the join)
# ---------------------------------------------------------------------------

def assign(obj, groups):
    # groups: list of (name, indices, weight)
    for name, indices, weight in groups:
        vg = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
        vg.add(indices, weight, "ADD")


def all_idx(obj):
    return list(range(len(obj.data.vertices)))


# head: full head bone, tiny neck blend at the bottom so the neck crease flexes
head_low = [i for i, v in enumerate(head.data.vertices) if (head.matrix_world @ v.co).z < 0.72]
head_rest = [i for i in all_idx(head) if i not in head_low]
assign(head, [("head", head_rest, 1.0), ("head", head_low, 0.75), ("neck", head_low, 0.25)])
for side in ("L", "R"):
    assign(parts[f"eye.{side}"], [("head", all_idx(parts[f"eye.{side}"]), 1.0)])

for side in ("L", "R"):
    ear = parts[f"ear.{side}"]
    # blend the ear base into the head so twitches don't crack the surface
    zs = [(ear.matrix_world @ v.co).z for v in ear.data.vertices]
    zmin, zmax = min(zs), max(zs)
    for i, z in enumerate(zs):
        t = (z - zmin) / (zmax - zmin + 1e-9)
        w = min(1.0, t / 0.35)  # fully ear-owned past 35% of its height
        assign(ear, [(f"ear.{side}", [i], 0.25 + 0.75 * w), ("head", [i], 0.75 * (1.0 - w))])

# body: smooth vertical gradient root -> spine -> chest
for i, v in enumerate(body.data.vertices):
    z = (body.matrix_world @ v.co).z
    if z < 0.48:
        assign(body, [("root", [i], 1.0)])
    elif z < 0.62:
        t = (z - 0.48) / 0.14
        assign(body, [("root", [i], 1.0 - t), ("spine", [i], t)])
    elif z < 0.78:
        t = (z - 0.62) / 0.16
        assign(body, [("spine", [i], 1.0 - t), ("chest", [i], t)])
    else:
        assign(body, [("chest", [i], 1.0)])

for side in ("L", "R"):
    arm = parts[f"arm.{side}"]
    # shoulder end blends into chest, rest owned by the arm bone
    ends = [(arm.matrix_world @ v.co) for v in arm.data.vertices]
    zs = [p.z for p in ends]
    zmin, zmax = min(zs), max(zs)
    for i, z in enumerate(zs):
        t = (zmax - z) / (zmax - zmin + 1e-9)  # 0 at shoulder, 1 at wrist
        w = min(1.0, t / 0.30)
        assign(arm, [(f"arm.{side}", [i], 0.2 + 0.8 * w), ("chest", [i], 0.8 * (1.0 - w))])
    assign(parts[f"hand.{side}"], [(f"hand.{side}", all_idx(parts[f"hand.{side}"]), 1.0)])
    assign(parts[f"foot.{side}"], [(f"foot.{side}", all_idx(parts[f"foot.{side}"]), 1.0)])

# tail:每 vertex blends between its two nearest chain bones by arc parameter
TAIL_BONES = 7
for i, s in enumerate(tail_vert_param):
    x = min(s * TAIL_BONES, TAIL_BONES - 1e-4)
    k = int(x)
    f = x - k
    # smoothstep the blend so bone boundaries don't show as creases
    f = f * f * (3 - 2 * f)
    entries = [(f"tail.{k+1:03d}", [i], 1.0 - f)]
    if k + 1 < TAIL_BONES:
        entries.append((f"tail.{k+2:03d}", [i], f))
    else:
        entries[0] = (f"tail.{k+1:03d}", [i], 1.0)
    assign(tail_obj, entries)

# ---------------------------------------------------------------------------
# materials (assigned per part before the join so eyes keep their own slot)
# ---------------------------------------------------------------------------
def flat_mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1.0)
    b.inputs["Roughness"].default_value = 0.9
    return m

pink_mat = flat_mat("MewPink", (0.96, 0.76, 0.84))
eye_mat = flat_mat("MewEyes", (0.13, 0.16, 0.35))
for name, obj in parts.items():
    obj.data.materials.append(eye_mat if name.startswith("eye") else pink_mat)

# ---------------------------------------------------------------------------
# join all parts into one mesh
# ---------------------------------------------------------------------------
bpy.ops.object.select_all(action="DESELECT")
for obj in parts.values():
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts["body"]
bpy.ops.object.join()
mew = bpy.context.view_layer.objects.active
mew.name = "Mew"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# flat shading for the faceted look
for poly in mew.data.polygons:
    poly.use_smooth = False

# ---------------------------------------------------------------------------
# armature
# ---------------------------------------------------------------------------
arm_data = bpy.data.armatures.new("MewRig")
rig = bpy.data.objects.new("MewRig", arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")

def add_bone(name, head, tail, parent=None, connect=False):
    b = arm_data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
        b.use_connect = connect
    return b

add_bone("root", Vector((0, 0.03, 0.42)), Vector((0, 0.03, 0.60)))
add_bone("spine", Vector((0, 0.03, 0.60)), Vector((0, 0.02, 0.78)), "root", True)
add_bone("chest", Vector((0, 0.02, 0.78)), Vector((0, 0.0, 0.92)), "spine", True)
add_bone("neck", Vector((0, 0.0, 0.92)), Vector((0, 0.0, 1.02)), "chest", True)
add_bone("head", Vector((0, 0.0, 1.02)), Vector((0, 0.0, 1.38)), "neck", True)

for side, sx in (("L", 1), ("R", -1)):
    ear_base = Vector((sx * 0.23, 0.04, 1.40))
    ear_dir = Vector((sx * math.sin(math.radians(38)), 0.06, math.cos(math.radians(38)))).normalized()
    add_bone(f"ear.{side}", ear_base, ear_base + ear_dir * 0.46, "head")

    shoulder = Vector((sx * 0.25, -0.05, 0.74))
    arm_dir = Vector((sx * -0.12, -0.38, -1.0)).normalized()
    wrist = shoulder + arm_dir * (ARM_LEN * 0.72)
    hand_tip = shoulder + arm_dir * (ARM_LEN * 1.25)
    add_bone(f"arm.{side}", shoulder, wrist, "chest")
    add_bone(f"hand.{side}", wrist, hand_tip, f"arm.{side}", True)

    foot_c = Vector((sx * 0.21, -0.13, 0.17))
    add_bone(f"foot.{side}", foot_c + Vector((0, 0.14, 0.02)), foot_c + Vector((0, -0.16, -0.02)), "root")

# tail chain along the same curve the mesh used
bone_pts, _ = resample_arclength(TAIL_CTRL, TAIL_BONES + 1)
prev = "root"
for k in range(TAIL_BONES):
    add_bone(f"tail.{k+1:03d}", bone_pts[k], bone_pts[k + 1], prev, connect=(k > 0))
    prev = f"tail.{k+1:03d}"

bpy.ops.object.mode_set(mode="OBJECT")

# bind mesh to rig (groups already carry the weights, so just add the modifier)
mew.parent = rig
mod = mew.modifiers.new("Armature", "ARMATURE")
mod.object = rig

# normalize weights so every vertex sums to exactly 1
bpy.context.view_layer.objects.active = mew
bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------------------
# export
# ---------------------------------------------------------------------------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_skins=True,
    export_animations=False,
    export_morph=False,
)
print(f"EXPORTED {out_path}  tail_len={tail_len:.3f}")
