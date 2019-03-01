import * as settings from '../settings.js';
import { range, flatten } from '../utils/arrays.js';
import { rand, randInt } from '../utils/math.js';

/**
 * Instructions for building a meeba
 *
 * @typedef Commands
 * @prop {number} size - the size/area of the meeba
 * @prop {SpikeCommand[]} spikes - the spikes to attach to the meeba
 */

/**
 * Parsed representation of a single gene
 *
 * @typedef Gene
 * @prop {number} type - the control-byte for the gene
 * @prop {number} location - where in the gene appears, 0 (start) to 1 (end)
 * @prop {Uint8Array} bytes - remaining bytes of the gene
 */

/**
 * Instructions for building a spike
 *
 * @typedef SpikeCommand
 * @prop {number} length - length of spike in pixels
 * @prop {number} angle - position around meeba circumference (in turns)
 */

const { averageStartingGeneCount, averageStartingGeneSize } = settings.meebas;
const MAX_GENES = 2 * averageStartingGeneCount;
const MAX_BYTES = 2 * averageStartingGeneSize;

const CONTROL_BYTE_FREQUENCY = [0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF1];

const BITS_PER_SIZE_PIXEL = 1;
const BITS_PER_SPIKE_LENGTH = 2;

const MUTATE_BIT_CHANCE = 0.0005;

/**
 * Returns a gene with a control byte followed a random number of
 * randomly generated bytes (not yet formatted as a Uint8Array)
 *
 * @returns {number[]}
 */
const randGene = () => {
  const type = CONTROL_BYTE_FREQUENCY[
    randInt(0, CONTROL_BYTE_FREQUENCY.length)
  ];
  const body = range(randInt(1, MAX_BYTES)).map(() => randInt(0, 256));
  return [type].concat(body);
};

/**
 * Creates a new random genome encoded as a Uint8Array
 *
 * @returns {Uint8Array}
 */
export const createGenome = () => {
  const genes = range(randInt(1, MAX_GENES)).map(randGene);
  return Uint8Array.from(flatten(genes));
};

/**
 * Count the number of 1 bits in series of bytes
 *
 * @param {Uint8Array} bytes
 * @returns {number} - number of 1's
 */
const countBits = bytes => bytes.reduce((count, byte) => (
  count + byte.toString(2).split('').filter(bit => bit === '1').length
), 0);


/**
 * Split a full genome into an array of genes each with a leading control byte
 *
 * @param {Uint8Array} genome - the full genome
 * @returns {Gene[]}
 */
const toGenes = genome => Array.from(genome)
  .map((byte, i) => (byte >= 0xF0 ? i : -1))
  .filter(index => index !== -1)
  .map((index, i, indexes) => ({
    type: genome[index],
    location: index / genome.length,
    bytes: genome.slice(index + 1, indexes[i + 1]),
  }));

/**
 * Read a size gene, returning the number of pixels in size it produces
 *
 * @param {Gene} gene - the size gene
 * @returns {number} - the amount of size this gene contributes
 */
const readSizeGene = ({ bytes }) => Math.floor(countBits(bytes) / BITS_PER_SIZE_PIXEL);

/**
 * Read a spike gene, returning the basic instructions for building a spike object
 *
 * @param {Gene} gene - the spike gene
 * @returns {SpikeCommand}
 */
const readSpikeGene = ({ location, bytes }) => ({
  angle: location,
  length: Math.floor(countBits(bytes) / BITS_PER_SPIKE_LENGTH),
});

/**
 * Interprets a genome, returning a command object with instructions
 * for building a meeba based on the encoded genes
 *
 * @param {Uint8Array} genome
 * @returns {Commands}
 */
export const readGenome = (genome) => {
  const genes = toGenes(genome);

  const size = genes
    .filter(({ type }) => type === 0xF0)
    .reduce((sum, gene) => sum + readSizeGene(gene), 0);

  const spikes = genes
    .filter(({ type }) => type === 0xF1)
    .map(readSpikeGene);

  return { size, spikes };
};

/**
 * Mutates a byte by applying possible single-point mutations to its bits
 *
 * @param {number} byte
 * @returns {number}
 */
const mutateBits = (byte) => {
  const xorMask = parseInt(range(8)
    .map(() => (rand() < MUTATE_BIT_CHANCE ? '1' : '0'))
    .join(''), 2);

  // eslint-disable-next-line no-bitwise
  return byte ^ xorMask;
};

/**
 * Creates a mutated copy of an existing genome
 *
 * @param {Uint8Array} genome
 * @returns {Uint8Array}
 */
export const replicateGenome = genome => genome.map(mutateBits);
