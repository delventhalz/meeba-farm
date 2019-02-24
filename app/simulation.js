import * as settings from './settings.js';
import {
  createGenome,
  readGenome,
  replicateGenome,
} from './meebas/genome.js';
import {
  spawnSpike,
  getSpikeMover,
} from './meebas/spikes.js';
import {
  initVitals,
  setCalories,
  drainCalories,
} from './meebas/vitals.js';
import {
  toBytes,
  toHex,
} from './utils/arrays.js';
import {
  sqr,
  getGap,
  isShorter,
  rand,
  randInt,
} from './utils/math.js';
import {
  toVector,
  bounceX,
  bounceY,
  collide,
} from './utils/physics.js';

/**
 * @typedef {import('./meebas/spikes.js').Spike} Spike
 */

/**
 * @typedef {import('./meebas/vitals.js').Vitals} Vitals
 */

/**
 * @typedef {import('./utils/physics.js').Velocity} Velocity
 */

/**
 * A body to be simulated and drawn (an extension of physics Body)
 *
 * @typedef Body
 * @prop {string} dna - a hex-string genome
 * @prop {string} fill - a valid color string
 * @prop {number} x - horizontal location
 * @prop {number} y - vertical location
 * @prop {number} mass - measurement of size/mass
 * @prop {number} radius - radius in pixels
 * @prop {Velocity} velocity - speed and direction of body
 * @prop {Vitals} vitals - life-cycle properties of the body
 * @prop {Spike[]} spikes - the spikes of the meeba
 * @prop {object} meta - extra properties specific to the simulation
 *   @prop {number} meta.nextX - body's next horizontal location
 *   @prop {number} meta.nextY - body's next vertical location
 *   @prop {Body|null} meta.lastCollisionBody - last body collided with
 * @prop {boolean} [isInactive] - the body should be removed from the simulation
 */

const MIN_MASS = Math.ceil(Math.PI * sqr(settings.meebas.minRadius));
const MAX_ENERGY = 2 * settings.simulation.energy / settings.simulation.bodies;
const COLOR_RANGE = 256 * 256 * 256;
const MAX_SEPARATION_ATTEMPTS = 10;
const SPIKE_HIGHLIGHT_TIME = 167;
const { width, height } = settings.tank;

/**
 * Generates a new body from dna and default values
 *
 * @param {Uint8Array} dna - dna to init with
 * @returns {Body}
 */
const initBody = (dna) => {
  const dnaCommands = readGenome(dna);
  const mass = MIN_MASS + dnaCommands.size;
  const radius = Math.floor(Math.sqrt(mass / Math.PI));

  const spikes = dnaCommands.spikes
    .map(({ angle, length }) => spawnSpike(radius, angle, length))
    .sort((a, b) => b.length - a.length);

  return {
    dna: toHex(dna),
    fill: 'black',
    x: 0,
    y: 0,
    mass,
    radius,
    velocity: {
      angle: 0,
      speed: 0,
    },
    vitals: initVitals(mass),
    spikes,
    meta: {
      nextX: 0,
      nextY: 0,
      lastCollisionBody: null,
    },
  };
};

/**
 * Creates a new random Body
 *
 * @returns {Body}
 */
export const getRandomBody = () => {
  const body = initBody(createGenome());

  return {
    ...body,
    fill: `#${randInt(0, COLOR_RANGE).toString(16).padStart(6, '0')}`,
    x: randInt(body.radius, width - body.radius),
    y: randInt(body.radius, height - body.radius),
    velocity: {
      angle: rand(),
      speed: randInt(0, MAX_ENERGY / body.mass),
    },
  };
};

/**
 * Generates a "new" body based on an existing parent
 *
 * @param {Body} parent - the parent to base the new body off of
 * @param {number} angle - the angle to launch the new body at
 * @returns {Body}
 */
const replicateParent = (parent, angle) => {
  const dna = replicateGenome(toBytes(parent.dna));
  const body = initBody(dna);

  const relativeLocation = toVector({ angle, speed: 2 * body.radius });
  const x = parent.x + relativeLocation.x;
  const y = parent.y + relativeLocation.y;

  return {
    ...body,
    fill: parent.fill,
    x,
    y,
    velocity: {
      angle,
      speed: parent.velocity.speed,
    },
    vitals: setCalories(body.vitals, Math.floor(parent.vitals.calories / 2)),
    spikes: body.spikes.map(getSpikeMover(x, y)),
  };
};

/**
 * Gets a function to calculate the next location of a body
 *
 * @param {number} delay - time passed since last move in seconds
 * @returns {function(Body): void} - mutates the nextX and nextY of a body
 */
const getMoveCalculator = (delay) => (body) => {
  const { x, y } = toVector(body.velocity);
  body.meta.nextX = body.x + x * delay;
  body.meta.nextY = body.y + y * delay;
};

/**
 * Updates the x/y of a body based on its previously calculated nextX/nextY
 *
 * @param {Body} body - mutated!
 */
const moveBody = (body) => {
  body.x = body.meta.nextX;
  body.y = body.meta.nextY;

  body.spikes = body.spikes.map(getSpikeMover(body.x, body.y));
};

/**
 * Gets a function to determine if a body should bounce off a wall,
 * and then mutate its velocity appropriately
 *
 * @param {number} delay - time passed since last move in seconds
 * @returns {function(Body): void} - mutates the velocity of the body if needed
 */
const getWallBouncer = (delay) => (body) => {
  const { radius, velocity: { angle }, meta: { nextX, nextY } } = body;

  if (getGap(0, angle) < 0.25 && nextX > width - radius) {
    bounceX(body);
  } else if (getGap(0.25, angle) < 0.25 && nextY < radius) {
    bounceY(body);
  } else if (getGap(0.5, angle) < 0.25 && nextX < radius) {
    bounceX(body);
  } else if (getGap(0.75, angle) < 0.25 && nextY > height - radius) {
    bounceY(body);
  } else {
    return;
  }

  getMoveCalculator(delay)(body);
  body.meta.lastCollisionBody = null;
};

/**
 * Checks if two bodies can possibly interact by checking they are not the same object, and then
 * comparing their distance to the sum of their radii plus the primary's longest spike
 *
 * @param {Body} body - the primary body
 * @param {Body} other
 * @returns {boolean}
 */
const canInteract = (body, other) => {
  if (body === other) {
    return false;
  }

  const spikeLength = body.spikes.length > 0
    ? body.spikes[0].length
    : 0;

  return isShorter({
    x1: body.x,
    y1: body.y,
    x2: other.x,
    y2: other.y,
  }, body.radius + other.radius + spikeLength);
};

/**
 * Checks if two bodies currently overlap by comparing the distance between
 * their centers and the sum of their radii
 *
 * @param {Body} body1
 * @param {Body} body2
 * @returns {boolean}
 */
const isOverlapping = (body1, body2) => isShorter({
  x1: body1.x,
  y1: body1.y,
  x2: body2.x,
  y2: body2.y,
}, body1.radius + body2.radius);

/**
 * Checks if two bodies *will* overlap based on their next positions
 *
 * @param {Body} body1
 * @param {Body} body2
 * @returns {boolean}
 */
const willOverlap = (body1, body2) => isShorter({
  x1: body1.meta.nextX,
  y1: body1.meta.nextY,
  x2: body2.meta.nextX,
  y2: body2.meta.nextY,
}, body1.radius + body2.radius);

/**
 * Checks if a spike's tip is within a body's circumference
 *
 * @param {Spike} spike
 * @param {Body} body
 * @returns {boolean}
 */
const isSpikeOverlapping = (spike, body) => isShorter({
  x1: body.x,
  y1: body.y,
  x2: spike.x1,
  y2: spike.y1,
}, body.radius);

/**
 * Gets a function to check if two bodies should collide, and mutates
 * their position and velocity as needed
 *
 * @param {number} delay - time passed since last move in seconds
 * @returns {function(Body, Body): void} - mutates the bodies as needed
 */
const getBodyCollider = (delay) => (body1, body2) => {
  const justCollided = body1.meta.lastCollisionBody === body2
    && body2.meta.lastCollisionBody === body1;
  const shouldCollide = !justCollided
    && (willOverlap(body1, body2) || isOverlapping(body1, body2));

  if (shouldCollide) {
    collide(body1, body2);
    getMoveCalculator(delay)(body1);
    getMoveCalculator(delay)(body2);
    body1.meta.lastCollisionBody = body2;
    body2.meta.lastCollisionBody = body1;
  }
};

/**
 * Gets a function to check if a body's spikes overlaps with another body and
 * drains calories as needed
 *
 * @param {number} delay - the time since the last tick
 * @param {number} tick - the current timestamp
 * @returns {function(Body, Body): void} - mutates bodies and spikes as needed
 */
const getSpikeActivator = (delay, tick) => (body, other) => {
  if (!body.vitals.isDead) {
    for (const spike of body.spikes) {
      if (isSpikeOverlapping(spike, other)) {
        spike.fill = 'red';
        spike.meta.deactivateTime = tick + SPIKE_HIGHLIGHT_TIME;

        const { vitals, drain } = drainCalories(other.vitals, Math.floor(spike.drain * delay));
        other.vitals = vitals;
        body.vitals.calories += drain;
      }
    }
  }
};

/**
 * Gets a function to run all body-to-body interactions, including physics
 * collisions and spike drain
 *
 * This O(n^2) implementation should eventually be replaced by an O(nlogn) quadtree
 *
 * @param {Body[]} bodies - all bodies in the simulation
 * @param {number} delay - the time since the last tick
 * @param {number} tick - the current timestamp
 * @returns {function(Body): void} - mutates bodies as needed
 */
const getBodyInteractor = (bodies, delay, tick) => (body) => {
  const collideBodies = getBodyCollider(delay);
  const activateSpikes = getSpikeActivator(delay, tick);

  for (const other of bodies) {
    if (canInteract(body, other)) {
      collideBodies(body, other);
      activateSpikes(body, other);
    }
  }
};

/**
 * Gets a function which deactivates a body's spikes if their activation time as expired
 *
 * @param {number} tick - the current timestamp
 * @returns {function(Body): void} - mutates any deactivating spikes
 */
const getSpikeDeactivator = (tick) => (body) => {
  for (const spike of body.spikes) {
    const { deactivateTime } = spike.meta;
    if (deactivateTime !== null && deactivateTime < tick) {
      spike.fill = 'black';
      spike.meta.deactivateTime = null;
    }
  }
};

/**
 * Checks life-cycle status of each body, killing, deacativating, or spawning as needed
 *
 * @param {Body[]} bodies - full array of bodies (including inactive)
 * @returns {function(Body): void} - mutates any deactivating spikes
 */
const getVitalChecker = (bodies) => (body) => {
  // Until more complex color handling is implemented, just turn dead meebas black
  if (body.vitals.isDead) {
    body.fill = 'black';
  }

  if (body.vitals.calories <= 0) {
    body.isInactive = true;
  }

  if (body.vitals.calories >= body.vitals.spawnsAt) {
    const child1 = replicateParent(body, body.velocity.angle + 0.125);
    const child2 = replicateParent(body, body.velocity.angle - 0.125);

    bodies.push(child1);
    bodies.push(child2);

    body.isInactive = true;
  }
};

/**
 * Takes an array of bodies and teleports them randomly until none overlap
 *
 * @param {Body[]} bodies - mutated!
 */
export const separateBodies = (bodies) => {
  let attempts = 0;
  let overlapsFound = true;

  while (attempts < MAX_SEPARATION_ATTEMPTS && overlapsFound) {
    attempts += 1;
    overlapsFound = false;

    for (const body of bodies) {
      for (const other of bodies) {
        if (body !== other && isOverlapping(body, other)) {
          overlapsFound = true;
          body.x = randInt(body.radius, width - body.radius);
          body.y = randInt(body.radius, height - body.radius);
        }
      }
    }
  }
};

/**
 * Gets a function to calculate a "frame" of the simulation
 *
 * @param {Body[]} bodies - all the bodies to simulate
 * @param {number} start - the timestamp of the previous frame
 * @param {number} stop - the timestamp of the current frame
 * @returns {Body[]} - new array with inactive bodies removed
 */
export const simulateFrame = (bodies, start, stop) => {
  const delay = (stop - start) / 1000;

  const calcMove = getMoveCalculator(delay);
  const bounceWall = getWallBouncer(delay);
  const interactBodies = getBodyInteractor(bodies, delay, stop);
  const deactivateSpikes = getSpikeDeactivator(stop);
  const checkVitals = getVitalChecker(bodies);

  bodies.forEach(calcMove);
  bodies.forEach(bounceWall);
  bodies.forEach(interactBodies);
  bodies.forEach(deactivateSpikes);
  bodies.forEach(moveBody);
  bodies.forEach(checkVitals);

  return bodies.filter(body => !body.isInactive);
};
