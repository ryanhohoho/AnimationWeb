// rig.js
// resolves config roles to actual bones and captures the rest pose at load.
// all pose layers work in "char frame" (the model root's space) through the
// helpers here, so nothing outside rigConfig ever hardcodes a bone name or axis.

import * as THREE from "three";

const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

export function buildRig(modelRoot, boneRoles) {
  const byName = new Map();
  modelRoot.traverse((o) => {
    if (o.isBone) byName.set(o.name, o);
  });

  const missing = [];
  const get = (name) => {
    const b = byName.get(name) || null;
    if (!b) missing.push(name);
    return b;
  };

  const bones = {
    root: get(boneRoles.root),
    spine: (boneRoles.spine || []).map(get).filter(Boolean),
    neck: boneRoles.neck ? get(boneRoles.neck) : null,
    head: boneRoles.head ? get(boneRoles.head) : null,
    earL: boneRoles.earL ? get(boneRoles.earL) : null,
    earR: boneRoles.earR ? get(boneRoles.earR) : null,
    armL: boneRoles.armL ? get(boneRoles.armL) : null,
    armR: boneRoles.armR ? get(boneRoles.armR) : null,
    handL: boneRoles.handL ? get(boneRoles.handL) : null,
    handR: boneRoles.handR ? get(boneRoles.handR) : null,
    footL: boneRoles.footL ? get(boneRoles.footL) : null,
    footR: boneRoles.footR ? get(boneRoles.footR) : null,
    tail: (boneRoles.tail || []).map(get).filter(Boolean)
  };
  if (missing.length) {
    console.error("[rig] missing bones for roles:", missing.join(", "),
      "\navailable:", Array.from(byName.keys()).join(", "));
  }

  // capture rest pose relative to the model root
  modelRoot.updateWorldMatrix(true, true);
  const rootInv = modelRoot.matrixWorld.clone().invert();

  const rest = new Map(); // bone -> { localQuat, localPos, charQuat, charPos }
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  byName.forEach((bone) => {
    _m.multiplyMatrices(rootInv, bone.matrixWorld);
    _m.decompose(_p, _q, _s);
    rest.set(bone, {
      localQuat: bone.quaternion.clone(),
      localPos: bone.position.clone(),
      charQuat: _q.clone(),
      charPos: _p.clone()
    });
  });

  // tail rest data: n bones -> n+1 points (heads + an extrapolated tip)
  const tailPoints = bones.tail.map((b) => rest.get(b).charPos.clone());
  if (tailPoints.length >= 2) {
    const last = tailPoints[tailPoints.length - 1];
    const prev = tailPoints[tailPoints.length - 2];
    tailPoints.push(last.clone().add(last.clone().sub(prev)));
  }
  const tailDirs = [];
  const tailLens = [];
  for (let i = 0; i < tailPoints.length - 1; i++) {
    const d = tailPoints[i + 1].clone().sub(tailPoints[i]);
    tailLens.push(d.length());
    tailDirs.push(d.normalize());
  }

  // model bounds for sizing
  const bbox = new THREE.Box3().setFromObject(modelRoot);

  const rig = {
    modelRoot,
    bones,
    rest,
    tailRest: { points: tailPoints, dirs: tailDirs, lens: tailLens },
    bounds: bbox,
    height: bbox.max.y - bbox.min.y,

    // quaternion of a node in char frame, honoring this frame's edits so far.
    // walks up local quats; valid because bone chains carry no meaningful scale.
    charQuatOf(node, out = _q1) {
      out.set(0, 0, 0, 1);
      const chain = [];
      let n = node;
      while (n && n !== modelRoot) {
        chain.push(n);
        n = n.parent;
      }
      for (let i = chain.length - 1; i >= 0; i--) out.multiply(chain[i].quaternion);
      return out;
    },

    // rotate a bone by deltaQuat expressed in char frame (about the bone origin)
    applyCharDelta(bone, deltaQuat) {
      if (!bone) return;
      const wp = bone.parent && bone.parent !== modelRoot
        ? this.charQuatOf(bone.parent, _q2)
        : _q2.set(0, 0, 0, 1);
      // local' = wp^-1 * delta * wp * local
      const q = new THREE.Quaternion().copy(wp).invert()
        .multiply(deltaQuat).multiply(wp).multiply(bone.quaternion);
      bone.quaternion.copy(q);
    },

    resetToRest() {
      rest.forEach((r, bone) => {
        bone.quaternion.copy(r.localQuat);
        bone.position.copy(r.localPos);
        bone.scale.set(1, 1, 1);
      });
    }
  };
  return rig;
}
