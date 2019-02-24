'use strict';

const { expect } = require('chai');
const {
  initVitals,
  setCalories,
  drainCalories,
} = require('./vitals.common.js');

const expectIsValidVitals = (vitals) => {
  expect(vitals).to.be.an('object');
  expect(vitals.calories).to.be.a('number');
  expect(vitals.diesAt).to.be.a('number');
  expect(vitals.spawnsAt).to.be.a('number');
  expect(vitals.isDead).to.equal(vitals.calories < vitals.diesAt);
};

describe('Spike methods', () => {
  describe('initVitals', () => {
    it('should init a vitals object with starting values', () => {
      expectIsValidVitals(initVitals(100));
    });
  });

  describe('setCalories', () => {
    it('should return a new vitals object with a specific calorie level', () => {
      const original = initVitals(100);
      const vitals = setCalories(original, 50);

      expectIsValidVitals(vitals);
      expect(vitals.calories).to.equal(50);
    });

    it('should update isDead as needed', () => {
      const original = initVitals(100);
      original.isDead = 50;
      const vitals = setCalories(original, 49);

      expect(vitals.isDead).to.equal(true);
    });
  });

  describe('drainCalories', () => {
    it('should drain calories from a vitals object', () => {
      const { vitals } = drainCalories({ calories: 100, diesAt: 50, isDead: false }, 25);

      expect(vitals.calories).to.equal(75);
    });

    it('should return the actual amount drained', () => {
      const { drain } = drainCalories({ calories: 100, diesAt: 50, isDead: false }, 200);

      expect(drain).to.equal(100);
    });

    it('should mark vitals as dead if calories drops below threshold', () => {
      const { vitals } = drainCalories({ calories: 100, diesAt: 50, isDead: false }, 75);

      expect(vitals.isDead).to.equal(true);
    });
  });
});
