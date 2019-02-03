'use strict';

const { expect } = require('chai');
const settings = require('./settings.common.js');

const oldWidth = settings.tank.width;
const oldHeight = settings.tank.height;
settings.tank.width = 100;
settings.tank.height = 100;

const {
  spawnBody,
  separateBodies,
  getSimulator,
} = require('./simulation.common.js');

const sqr = n => n * n;
const getCircleArea = radius => Math.floor(2 * Math.PI * radius);

describe('Simulation methods', () => {
  after(() => {
    settings.tank.width = oldWidth;
    settings.tank.height = oldHeight;
  });

  describe('spawnBody', () => {
    it('should create a new body', () => {
      const body = spawnBody();

      expect(body.radius).to.be.a('number');
      expect(body.mass).to.equal(getCircleArea(body.radius));
      expect(body.x).to.be.a('number');
      expect(body.y).to.be.a('number');
      expect(body.fill).to.be.a('string');

      expect(body.velocity).to.be.an('object');
      expect(body.velocity.angle).to.be.a('number');
      expect(body.velocity.speed).to.be.a('number');
    });

    it('should overwrite an existing body', () => {
      const oldBody = spawnBody();
      const oldValues = JSON.parse(JSON.stringify(oldBody));
      const body = spawnBody(oldBody);

      expect(body).to.equal(oldBody);
      expect(body).to.not.deep.equal(oldValues);

      expect(body.radius).to.be.a('number');
      expect(body.mass).to.equal(getCircleArea(body.radius));
      expect(body.x).to.be.a('number');
      expect(body.y).to.be.a('number');
      expect(body.fill).to.be.a('string');

      expect(body.velocity).to.be.an('object');
      expect(body.velocity.angle).to.be.a('number');
      expect(body.velocity.speed).to.be.a('number');
    });
  });

  describe('separateBodies', () => {
    it('should separate overlapping bodies', () => {
      const body1 = spawnBody();
      body1.radius = 10;
      body1.x = 45;
      body1.y = 50;

      const body2 = spawnBody();
      body2.radius = 10;
      body2.x = 55;
      body2.y = 50;

      separateBodies([body1, body2]);

      const separation = Math.sqrt(sqr(body1.x - body2.x) + sqr(body1.y - body2.y));
      expect(separation).to.be.greaterThan(20);
    });

    it('should fail gracefully if no solution is possible', () => {
      const body1 = spawnBody();
      body1.radius = 1000;
      body1.x = 50;
      body1.y = 50;

      const body2 = spawnBody();
      body2.radius = 1000;
      body2.x = 50;
      body2.y = 50;

      expect(() => separateBodies([body1, body2])).to.not.throw();
    });
  });

  describe('getSimulator', () => {
    it('should return a function', () => {
      expect(getSimulator()).to.be.a('function');
    });

    it('should simulate movement over time', () => {
      const body = spawnBody();
      body.radius = 10;
      body.mass = getCircleArea(10);
      body.x = 50;
      body.y = 50;
      body.velocity.angle = 0;
      body.velocity.speed = 10;

      const simulate = getSimulator([body], 0);

      simulate(1000);
      expect(body.x).to.equal(60);
      expect(body.y).to.equal(50);

      simulate(2000);
      simulate(3000);
      expect(body.x).to.equal(80);
      expect(body.y).to.equal(50);
    });

    it('should simulate wall bounces', () => {
      const body = spawnBody();
      body.radius = 10;
      body.mass = getCircleArea(10);
      body.x = 15;
      body.y = 50;
      body.velocity.angle = 0.5;
      body.velocity.speed = 10;

      const simulate = getSimulator([body], 0);
      simulate(1000);

      expect(body.velocity.angle).to.equal(0);
      expect(body.velocity.speed).to.equal(10);
    });

    it('should simulate body collisions', () => {
      const body1 = spawnBody();
      body1.radius = 10;
      body1.mass = getCircleArea(10);
      body1.x = 35;
      body1.y = 50;
      body1.velocity.angle = 0;
      body1.velocity.speed = 10;

      const body2 = spawnBody();
      body2.radius = 10;
      body2.mass = getCircleArea(10);
      body2.x = 65;
      body2.y = 50;
      body2.velocity.angle = 0.5;
      body2.velocity.speed = 10;

      const simulate = getSimulator([body1, body2], 0);
      simulate(1000);

      expect(body1.velocity.angle).to.equal(0.5);
      expect(body1.velocity.speed).to.equal(10);

      expect(body2.velocity.angle).to.equal(0);
      expect(body2.velocity.speed).to.equal(10);
    });
  });
});