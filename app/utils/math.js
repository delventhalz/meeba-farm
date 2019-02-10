import * as settings from '../settings.js';
import { range } from './arrays.js';

export const PI_2 = 2 * Math.PI;

// Cached lookup tables of expensive trig functions
const LUT_RES = 1024;
const HALF_LUT_RES = LUT_RES / 2;
const LOOKUP_TABLES = {
  SIN: range(LUT_RES).map(i => Math.sin(PI_2 * i / LUT_RES)),
  COS: range(LUT_RES).map(i => Math.cos(PI_2 * i / LUT_RES)),
  ASIN: range(LUT_RES + 1).map(i => Math.asin((i - HALF_LUT_RES) / HALF_LUT_RES)),
  ACOS: range(LUT_RES + 1).map(i => Math.acos((i - HALF_LUT_RES) / HALF_LUT_RES)),
};

/**
 * A line segment defined by a pair of x/y coordinates
 *
 * @typedef Line
 * @prop {number} x1
 * @prop {number} y1
 * @prop {number} x2
 * @prop {number} y2
 */

/**
 * Convenience function to square a number
 *
 * @param {number} n
 * @returns {number}
 */
export const sqr = n => n * n;

/**
 * Normalize an angle in turns, rounding it to be between 0 and 1
 *
 * 1 turn = 360°, 2π, one full rotation; 1.5 turns = 180°, 1π, 0.5 turns
 *
 * @param {number} turns - a floating point count of rotations
 * @returns {number} - the same angle normalized between 0 and 1
 */
export const roundAngle = (turns) => {
  if (turns >= 1) {
    return turns % 1;
  }
  if (turns < 0) {
    return turns + Math.ceil(Math.abs(turns));
  }
  return turns;
};

/**
 * Creates a trig function based on a lookup table, accepting an angle in "turns"
 *
 * @param {number[]} lut - A lookup table for a particular trig function
 * @returns {function(number): number} - the trig function
 */
const getTrigFn = (lut) => (turns) => lut[Math.floor(roundAngle(turns) * LUT_RES)];

/**
 * Efficiently gets the sine for an angle in turns
 *
 * @param {number} turns
 * @returns {number}
 */
export const sin = getTrigFn(LOOKUP_TABLES.SIN);

/**
 * Efficiently gets the cosine for an angle in turns
 *
 * @param {number} turns
 * @returns {number}
 */
export const cos = getTrigFn(LOOKUP_TABLES.COS);


/**
 * Creates an inverse trig function based on a lookup table, returning an angle in "turns"
 *
 * @param {number[]} lut - A lookup table for a particular trig function
 * @returns {function(number): number} - the inverse trig function
 */
const getInverseTrigFn = (lut) => (ratio) => {
  const index = Math.floor(ratio * HALF_LUT_RES + HALF_LUT_RES);
  return lut[index] / PI_2;
};

/**
 * Efficiently gets the arcsine for a trigonometric ratio
 *
 * @param {number} ratio - trigonometric ratio between -1 and 1
 * @returns {number} - angle in turns
 */
export const asin = getInverseTrigFn(LOOKUP_TABLES.ASIN);

/**
 * Efficiently gets the arccosine for a trigonometric ratio
 *
 * @param {number} ratio - trigonometric ratio between -1 and 1
 * @returns {number} - angle in turns
 */
export const acos = getInverseTrigFn(LOOKUP_TABLES.ACOS);

/**
 * Efficiently checks if a line is shorter than a distance (no sqrt)
 *
 * @param {Line} line
 * @param {number} distance
 * @returns {boolean}
 */
export const isShorter = ({ x1, y1, x2, y2 }, distance) => (
  sqr(x1 - x2) + sqr(y1 - y2) < sqr(distance)
);

/**
 * Returns the size of the gap between two angles in turns
 *
 * @param {number} angle1
 * @param {number} angle2
 * @returns {number} - the difference between the two angles
 */
export const getGap = (angle1, angle2) => {
  const gap = Math.abs(roundAngle(angle1) - roundAngle(angle2));
  return gap <= 0.5 ? gap : 1 - gap;
};

/**
 * A simple pseudo-random number generator which takes a base36 seed
 * Based on this github gist by @blixit:
 * gist.github.com/blixt/f17b47c62508be59987b
 *
 * @param {string} alphaNumSeed - a base36 string, i.e. [0-9a-z]
 * @returns {function(): number} - a pseudo-random number generation function
 */
const getPrng = (alphaNumSeed) => {
  let seed = parseInt(alphaNumSeed, 36);
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483646;
  };
};

/**
 * Gets a random floating point number between 0 and 1
 *
 * @returns {number}
 */
export const rand = getPrng(settings.seed);

/**
 * Gets a random integer between a specified min and max (non-inclusive)
 *
 * @param {number} min - the minimum random number (inclusive)
 * @param {number} max - the maximum random number (non-inclusive)
 * @returns {number}
 */
export const randInt = (min, max) => min + Math.floor(rand() * (max - min));
