'use strict';

const { expect } = require('chai');
const {
  toVector,
  toVelocity,
  bounceX,
  bounceY,
  collide,
} = require('./physics.common.js');

// Tolerances for look-up table values being slightly off
const LUT_TOLERANCE = 0.01;

describe('Physics utils', () => {
  describe('toVector', () => {
    it('should return an object with x and y values', () => {
      const vec = toVector({ angle: 1, speed: 1 });

      expect(vec).to.be.an('object');
      expect(vec).to.have.a.property('x').which.is.a('number');
      expect(vec).to.have.a.property('y').which.is.a('number');
    });

    it('should convert an angle/speed velocity into an x/y vector', () => {
      const vec1 = toVector({ angle: 0, speed: 1 });
      expect(vec1.x).to.be.closeTo(1, LUT_TOLERANCE);
      expect(vec1.y).to.be.closeTo(0, LUT_TOLERANCE);

      const vec2 = toVector({ angle: 1, speed: 0 });
      expect(vec2.x).to.be.closeTo(0, LUT_TOLERANCE);
      expect(vec2.y).to.be.closeTo(0, LUT_TOLERANCE);

      const vec3 = toVector({ angle: 0.25, speed: 123 });
      expect(vec3.x).to.be.closeTo(0, LUT_TOLERANCE);
      expect(vec3.y).to.be.closeTo(-123, LUT_TOLERANCE);

      const vec4 = toVector({ angle: 0.625, speed: 141.4124 });
      expect(vec4.x).to.be.closeTo(-100, LUT_TOLERANCE);
      expect(vec4.y).to.be.closeTo(100, LUT_TOLERANCE);
    });
  });

  describe('toVelocity', () => {
    it('should return an object with angle and speed values', () => {
      const velocity = toVelocity({ x: 1, y: 1 });

      expect(velocity).to.be.an('object');
      expect(velocity).to.have.a.property('angle').which.is.a('number');
      expect(velocity).to.have.a.property('speed').which.is.a('number');
    });

    it('should convert an angle/speed velocity into an x/y vector', () => {
      const v1 = toVelocity({ x: 1, y: 0 });
      expect(v1.angle).to.be.closeTo(0, LUT_TOLERANCE);
      expect(v1.speed).to.be.closeTo(1, LUT_TOLERANCE);

      const v2 = toVelocity({ x: 0, y: -123 });
      expect(v2.angle).to.be.closeTo(0.25, LUT_TOLERANCE);
      expect(v2.speed).to.be.closeTo(123, LUT_TOLERANCE);

      const v3 = toVelocity({ x: -100, y: 100 });
      expect(v3.angle).to.be.closeTo(0.625, LUT_TOLERANCE);
      expect(v3.speed).to.be.closeTo(141.4124, LUT_TOLERANCE);
    });
  });

  describe('bounceX', () => {
    it('should bounce a velocity off a right wall', () => {
      const velocity1 = bounceX({ angle: 0, speed: 100 });
      expect(velocity1.angle).to.be.closeTo(0.5, LUT_TOLERANCE);
      expect(velocity1.speed).to.be.closeTo(100, LUT_TOLERANCE);

      const velocity2 = bounceX({ angle: 0.125, speed: 100 });
      expect(velocity2.angle).to.be.closeTo(0.375, LUT_TOLERANCE);
      expect(velocity2.speed).to.be.closeTo(100, LUT_TOLERANCE);
    });

    it('should bounce a velocity off a left wall', () => {
      const velocity1 = bounceX({ angle: 0.5, speed: 100 });
      expect(velocity1.angle).to.be.closeTo(0, LUT_TOLERANCE);
      expect(velocity1.speed).to.be.closeTo(100, LUT_TOLERANCE);

      const velocity2 = bounceX({ angle: 0.625, speed: 100 });
      expect(velocity2.angle).to.be.closeTo(0.875, LUT_TOLERANCE);
      expect(velocity2.speed).to.be.closeTo(100, LUT_TOLERANCE);
    });
  });

  describe('bounceY', () => {
    it('should bounce a velocity off a top wall', () => {
      const velocity1 = bounceY({ angle: 0.25, speed: 100 });
      expect(velocity1.angle).to.be.closeTo(0.75, LUT_TOLERANCE);
      expect(velocity1.speed).to.be.closeTo(100, LUT_TOLERANCE);

      const velocity2 = bounceY({ angle: 0.375, speed: 100 });
      expect(velocity2.angle).to.be.closeTo(0.625, LUT_TOLERANCE);
      expect(velocity2.speed).to.be.closeTo(100, LUT_TOLERANCE);
    });

    it('should bounce a velocity off a bottom wall', () => {
      const velocity1 = bounceY({ angle: 0.75, speed: 100 });
      expect(velocity1.angle).to.be.closeTo(0.25, LUT_TOLERANCE);
      expect(velocity1.speed).to.be.closeTo(100, LUT_TOLERANCE);

      const velocity2 = bounceY({ angle: 0.875, speed: 100 });
      expect(velocity2.angle).to.be.closeTo(0.125, LUT_TOLERANCE);
      expect(velocity2.speed).to.be.closeTo(100, LUT_TOLERANCE);
    });
  });

  describe('collide', () => {
    it('should collide two equally sized bodies at an angle', () => {
      const [body1, body2] = collide(
        { x: 90, y: 100, mass: 10, velocity: { angle: 0.875, speed: 50 } },
        { x: 110, y: 100, mass: 10, velocity: { angle: 0.625, speed: 50 } },
      );

      expect(body1.velocity.angle).to.be.closeTo(0.625, LUT_TOLERANCE);
      expect(body1.velocity.speed).to.be.closeTo(50, LUT_TOLERANCE);
      expect(body2.velocity.angle).to.be.closeTo(0.875, LUT_TOLERANCE);
      expect(body2.velocity.speed).to.be.closeTo(50, LUT_TOLERANCE);
    });

    it('should collide a moving body with a body at rest', () => {
      const [body1, body2] = collide(
        { x: 100, y: 110, mass: 10, velocity: { angle: 0.25, speed: 100 } },
        { x: 100, y: 90, mass: 90, velocity: { angle: 0, speed: 0 } },
      );

      expect(body1.velocity.angle).to.be.closeTo(0.75, LUT_TOLERANCE);
      expect(body1.velocity.speed).to.be.closeTo(80, LUT_TOLERANCE);
      expect(body2.velocity.angle).to.be.closeTo(0.25, LUT_TOLERANCE);
      expect(body2.velocity.speed).to.be.closeTo(20, LUT_TOLERANCE);
    });
  });
});
