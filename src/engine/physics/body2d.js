// body2d.js
// the character as a 2d point mass in viewport pixels. forces come from the
// brain, impulses from collisions/pokes. runs headless.

import { v2 } from "../../utils/math.js";

export function createBody({ x = 400, y = 300, radius = 60, config }) {
  const body = {
    pos: v2.make(x, y),
    prevPos: v2.make(x, y),        // last sim position, for render interpolation
    vel: v2.make(0, 0),
    accel: v2.make(0, 0),          // smoothed, read by pose layers for follow-through
    radius,
    _force: v2.make(0, 0),
    _prevVel: v2.make(0, 0),

    addForce(f) {
      this._force.x += f.x;
      this._force.y += f.y;
    },
    addImpulse(i) {
      this.vel.x += i.x;
      this.vel.y += i.y;
    },

    step(dt, cfg = config) {
      v2.copy(this.prevPos, this.pos);
      v2.copy(this._prevVel, this.vel);

      this.vel.x += this._force.x * dt;
      this.vel.y += this._force.y * dt;
      this._force.x = 0;
      this._force.y = 0;

      // implicit drag: unconditionally stable at any dt
      const speed = v2.len(this.vel);
      const drag = 1 / (1 + (cfg.dragLinear + cfg.dragQuad * speed) * dt);
      this.vel.x *= drag;
      this.vel.y *= drag;

      v2.clampLen(this.vel, this.vel, cfg.maxSpeed);

      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;

      // smoothed acceleration (finite difference would be too noisy for poses)
      const ax = (this.vel.x - this._prevVel.x) / dt;
      const ay = (this.vel.y - this._prevVel.y) / dt;
      const k = 1 - Math.exp(-10 * dt);
      this.accel.x += (ax - this.accel.x) * k;
      this.accel.y += (ay - this.accel.y) * k;
    }
  };
  return body;
}
