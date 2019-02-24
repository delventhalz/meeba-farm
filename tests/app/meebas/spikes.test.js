'use strict';

const { expect } = require('chai');
const {
  sin,
  cos,
  asin,
} = require('../utils/math.common.js');
const {
  spawnSpike,
  getSpikeMover,
} = require('./spikes.common.js');

const SPIKE_WIDTH = 8;
const HALF_WIDTH = SPIKE_WIDTH / 2;

const getOffsetAngle = radius => asin(HALF_WIDTH / radius);
const getXOffset = (angle, distance) => Math.floor(cos(angle) * distance);
const getYOffset = (angle, distance) => Math.floor(-sin(angle) * distance);

describe('Spike methods', () => {
  describe('spawnSpike', () => {
    it('should create a new spike of a particular length and angle', () => {
      const spike = spawnSpike(91, 0.875, 50);

      expect(spike.length).to.equal(50);
      expect(spike.fill).to.be.a('string');

      expect(spike.x1).to.be.a('number');
      expect(spike.y1).to.be.a('number');
      expect(spike.x2).to.be.a('number');
      expect(spike.y2).to.be.a('number');
      expect(spike.x3).to.be.a('number');
      expect(spike.y3).to.be.a('number');

      expect(spike.offset).to.be.an('object');
      expect(spike.offset.x1).to.be.closeTo(100, 1);
      expect(spike.offset.y1).to.be.closeTo(100, 1);

      const offsetAngle = getOffsetAngle(91);
      expect(spike.offset.x2).to.be.closeTo(getXOffset(0.875 - offsetAngle, 90), 1);
      expect(spike.offset.y2).to.be.closeTo(getYOffset(0.875 - offsetAngle, 90), 1);
      expect(spike.offset.x3).to.be.closeTo(getXOffset(0.875 + offsetAngle, 90), 1);
      expect(spike.offset.y3).to.be.closeTo(getYOffset(0.875 + offsetAngle, 90), 1);
    });
  });

  describe('getSpikeMover', () => {
    it('should return a function', () => {
      expect(getSpikeMover(0, 0)).to.be.a('function');
    });

    it('should move a spike relative to a meeba center point', () => {
      const moveSpike = getSpikeMover(100, 100);
      const spike = moveSpike({
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        x3: 0,
        y3: 0,
        offset: {
          x1: 10,
          y1: 0,
          x2: 5,
          y2: -5,
          x3: 5,
          y3: 5,
        },
      });

      expect(spike.x1).to.equal(110);
      expect(spike.y1).to.equal(100);
      expect(spike.x2).to.equal(105);
      expect(spike.y2).to.equal(95);
      expect(spike.x3).to.equal(105);
      expect(spike.y3).to.equal(105);

      expect(spike.offset.x1).to.equal(10);
      expect(spike.offset.y1).to.equal(0);
      expect(spike.offset.x2).to.equal(5);
      expect(spike.offset.y2).to.equal(-5);
      expect(spike.offset.x3).to.equal(5);
      expect(spike.offset.y3).to.equal(5);
    });
  });
});
