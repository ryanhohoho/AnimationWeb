// quatSpring.js
// damped rotational spring on a quaternion: tracks angular velocity, so the
// body has real rotational inertia and turns/flips take the shortest arc with
// natural ease-in/out. this is what lets orientation be free instead of three
// clamped euler channels.

import * as THREE from "three";
import { clamp } from "../../utils/math.js";

const _err = new THREE.Quaternion();
const _step = new THREE.Quaternion();
const _axis = new THREE.Vector3();

export class QuatSpring {
  constructor(omega = 6, zeta = 1) {
    this.q = new THREE.Quaternion();
    this.w = new THREE.Vector3(); // angular velocity, world frame, rad/s
    this.omega = omega;
    this.zeta = zeta;
  }

  reset(q) {
    this.q.copy(q);
    this.w.set(0, 0, 0);
  }

  step(target, dt) {
    const maxDt = 1 / 60;
    while (dt > 1e-6) {
      const h = Math.min(dt, maxDt);
      // error rotation, shortest path
      _err.copy(target);
      if (_err.dot(this.q) < 0) {
        _err.set(-_err.x, -_err.y, -_err.z, -_err.w);
      }
      _err.multiply(_step.copy(this.q).invert()); // err = target * q^-1 (world frame)
      let ang = 2 * Math.acos(clamp(_err.w, -1, 1));
      if (ang > Math.PI) ang -= 2 * Math.PI;
      const s = Math.sqrt(Math.max(1 - _err.w * _err.w, 1e-12));
      _axis.set(_err.x / s, _err.y / s, _err.z / s);

      const kp = this.omega * this.omega;
      const kd = 2 * this.zeta * this.omega;
      this.w.x += (_axis.x * ang * kp - kd * this.w.x) * h;
      this.w.y += (_axis.y * ang * kp - kd * this.w.y) * h;
      this.w.z += (_axis.z * ang * kp - kd * this.w.z) * h;

      const wl = this.w.length();
      if (wl > 1e-9) {
        _step.setFromAxisAngle(_axis.copy(this.w).divideScalar(wl), wl * h);
        this.q.premultiply(_step).normalize();
      }
      dt -= h;
    }
    return this.q;
  }
}
