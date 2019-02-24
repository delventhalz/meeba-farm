import { sqr, cos, sin, acos } from './math.js';

/**
 * The speed and directions of a body
 *
 * @typedef Velocity
 * @prop {number} angle - direction of movement in turns
 * @prop {number} speed - speed in pixels/sec
 */

/**
 * Speed and direction defined by a change in x and a change in y
 *
 * @typedef Vector
 * @prop {number} x - change in x
 * @prop {number} y - change in y
 */

/**
 * A physical body in 2D space
 *
 * @typedef Body
 * @prop {number} x - horizontal location
 * @prop {number} y - vertical location
 * @prop {number} mass - measurement of size/mass
 * @prop {Velocity} velocity - speed and direction of body
 */

/**
 * Convert an angle/speed velocity into an x/y vector
 *
 * @param {Velocity} velocity
 * @returns {Vector}
 */
export const toVector = ({ angle, speed }) => ({
  x: cos(angle) * speed,
  y: -sin(angle) * speed,
});

/**
 * Merge an x/y vector into velocity with angle (in turns) and speed
 *
 * @param {Vector} vector
 * @returns {Velocity}
 */
export const toVelocity = ({ x, y }) => {
  const speed = Math.sqrt(sqr(x) + sqr(y));
  const angle = acos(x / speed);

  // ACos always gives northwards angles, check if should be southwards
  return {
    angle: y > 0 ? 1 - angle : angle,
    speed,
  };
};

/**
 * Update a velocity to simulate an elastic collision with a horizontal wall
 *
 * @param {Velocity} velocity - the velocity to bounce
 * @returns {Velocity} - the updated velocity
 */
export const bounceX = (velocity) => {
  const { angle } = velocity;
  return {
    ...velocity,
    angle: angle <= 0.5 ? 0.5 - angle : 1.5 - angle,
  };
};

/**
 * Update a velocity to simulate an elastic collision with a vertical wall
 *
 * @param {Velocity} velocity - the velocity to bounce
 * @returns {Velocity} - the updated velocity
 */
export const bounceY = (velocity) => {
  const { angle } = velocity;
  return {
    ...velocity,
    angle: angle === 0 ? 0 : 1 - angle,
  };
};

/**
 * Elastically collide two bodies, based on math outlined here:
 * http://vobarian.com/collisions/2dcollisions2.pdf
 *
 * @param {Body} body1 - first body to collide
 * @param {Body} body2 - second body to collide
 * @returns {[Body, Body]} - the bodies with updated velocities
 */
export const collide = (body1, body2) => {
  const m1 = body1.mass;
  const m2 = body2.mass;
  const v1 = toVector(body1.velocity);
  const v2 = toVector(body2.velocity);

  // Calculate unit normal vector and unit tangent vector
  const n = { x: body2.x - body1.x, y: body2.y - body1.y };
  const mn = Math.sqrt(sqr(n.x) + sqr(n.y));
  const un = { x: n.x / mn, y: n.y / mn };
  const ut = { x: -un.y, y: un.x };

  // Calculate scalar velocities on the normal and the tangent
  const vn1 = un.x * v1.x + un.y * v1.y;
  const vt1 = ut.x * v1.x + ut.y * v1.y;
  const vn2 = un.x * v2.x + un.y * v2.y;
  const vt2 = ut.x * v2.x + ut.y * v2.y;

  // Calculate final velocities along the normal (tangent will not change)
  const vn1F = (vn1 * (m1 - m2) + 2 * m2 * vn2) / (m1 + m2);
  const vn2F = (vn2 * (m2 - m1) + 2 * m1 * vn1) / (m1 + m2);

  // Convert scalar velocities back into vectors
  const vn1Vec = { x: vn1F * un.x, y: vn1F * un.y };
  const vt1Vec = { x: vt1 * ut.x, y: vt1 * ut.y };
  const vn2Vec = { x: vn2F * un.x, y: vn2F * un.y };
  const vt2Vec = { x: vt2 * ut.x, y: vt2 * ut.y };

  // Calculate final vectors, by adding normal and tangent vectors
  const v1F = { x: vn1Vec.x + vt1Vec.x, y: vn1Vec.y + vt1Vec.y };
  const v2F = { x: vn2Vec.x + vt2Vec.x, y: vn2Vec.y + vt2Vec.y };

  // Convert back to angle (in turns) and magnitude and save to bodies
  const { speed: speed1, angle: angle1 } = toVelocity(v1F);
  const { speed: speed2, angle: angle2 } = toVelocity(v2F);

  return [
    {
      ...body1,
      velocity: {
        angle: angle1,
        speed: speed1,
      },
    },
    {
      ...body2,
      velocity: {
        angle: angle2,
        speed: speed2,
      },
    },
  ];
};
