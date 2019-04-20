import {
  settings,
  addUpdateListener,
} from '../settings.js';
import {
  map,
  filter,
  range,
  findIndexes,
  chunkBy,
  flatten,
  concatBytes,
} from '../utils/arrays.js';
import {
  rgbToHue,
} from '../utils/colors.js';
import {
  pipe,
} from '../utils/functions.js';
import {
  rand,
  randInt,
} from '../utils/math.js';

/**
 * Instructions for building a meeba
 *
 * @typedef Commands
 * @prop {number} size - the size/area of the meeba
 * @prop {SpikeCommand[]} spikes - the spikes to attach to the meeba
 * @prop {number} hue - the hue of the meeba from 0 to 360
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

/**
 * Dynamically calculated genome settings
 *
 * @typedef DynamicGenomeSettings
 * @prop {number} maxGeneCount
 * @prop {number} maxGeneSize
 * @prop {number} chanceMutateBit
 * @prop {number} chanceDropByte
 * @prop {number} chanceRepeatByte
 * @prop {number} chanceTransposeByte
 * @prop {number} chanceDropGene
 * @prop {number} chanceRepeatGene
 * @prop {number} chanceTransposeGene
 * @prop {{byte: number, maxRoll: number}[]} controlByteRolls
 */

const { core, genome: fixed } = settings;
const dynamic = /** @type {DynamicGenomeSettings} */ ({});
addUpdateListener(() => {
  dynamic.maxGeneCount = 2 * fixed.averageGeneCount;
  dynamic.maxGeneSize = 2 * fixed.averageGeneSize;

  const volatilityAdjustment = core.volatility / 100;
  dynamic.chanceMutateBit = fixed.baseChanceMutateBit * volatilityAdjustment;
  dynamic.chanceDropByte = fixed.baseChanceDropByte * volatilityAdjustment;
  dynamic.chanceRepeatByte = fixed.baseChanceRepeatByte * volatilityAdjustment;
  dynamic.chanceTransposeByte = fixed.baseChanceTransposeByte * volatilityAdjustment;
  dynamic.chanceDropGene = fixed.baseChanceDropGene * volatilityAdjustment;
  dynamic.chanceRepeatGene = fixed.baseChanceRepeatGene * volatilityAdjustment;
  dynamic.chanceTransposeGene = fixed.baseChanceTransposeGene * volatilityAdjustment;

  const {
    percentSpikeGenes,
    percentSizeGenes,
    percentRedGenes,
    percentGreenGenes,
    percentBlueGenes,
  } = fixed;
  const BYTES = [
    { byte: 0xF0, chance: percentSizeGenes },
    { byte: 0xF1, chance: percentSpikeGenes },
    { byte: 0xF2, chance: percentRedGenes },
    { byte: 0xF3, chance: percentGreenGenes },
    { byte: 0xF4, chance: percentBlueGenes },
  ];
  const ratioToOne = 1 / BYTES.reduce((sum, { chance }) => sum + chance, 0);

  // Too clever by half, but will get us an array with "rolls" from 0 - 1
  dynamic.controlByteRolls = BYTES.reduce((rolls, { byte, chance }, i) => {
    const maxRoll = chance * ratioToOne + rolls[i].maxRoll;
    rolls.push({ byte, maxRoll });
    return rolls;
  }, [{ byte: 0, maxRoll: 0 }]).slice(1);
});

/**
 * Returns a random control byte based on the odds in the CONTROL_BYTES array
 *
 * @returns {number}
 */
const randControlByte = () => {
  const { controlByteRolls } = dynamic;
  const roll = rand();
  const matchingByte = controlByteRolls.find(({ maxRoll }) => roll < maxRoll)
    || controlByteRolls[controlByteRolls.length - 1]; // Make TypeScript happy
  return matchingByte.byte;
};

/**
 * Returns a gene with a control byte followed a random number of
 * randomly generated bytes (not yet formatted as a Uint8Array)
 *
 * @returns {number[]}
 */
const randGene = () => {
  const body = range(randInt(1, dynamic.maxGeneSize)).map(() => randInt(0, 256));
  return [randControlByte(), ...body];
};

/**
 * Creates a new random genome encoded as a Uint8Array
 *
 * @returns {Uint8Array}
 */
export const createGenome = () => {
  const genes = range(randInt(1, dynamic.maxGeneCount)).map(randGene);
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
 * Find the indexes of any control bytes in a genome
 *
 * @param {Uint8Array|number[]} genome - the full genome
 * @returns {number[]}
 */
const findControlIndexes = genome => findIndexes(Array.from(genome), byte => byte >= 0xF0);

/**
 * Split a full genome into an array of gene objects by control byte
 *
 * @param {Uint8Array} genome - the full genome
 * @returns {Gene[]}
 */
const toGenes = genome => findControlIndexes(genome)
  .map((index, i, indexes) => ({
    type: genome[index],
    location: index / genome.length,
    bytes: genome.slice(index + 1, indexes[i + 1]),
  }));

/**
 * Count up the bits of all genes that match a certain type
 *
 * @param {number} typeByte
 * @param {Gene[]} genes
 * @returns {number}
 */
const countTypeBits = (typeByte, genes) => genes
  .filter(({ type }) => type === typeByte)
  .reduce((sum, { bytes }) => sum + countBits(bytes), 0);

/**
 * Read a spike gene, returning the basic instructions for building a spike object
 *
 * @param {Gene} gene - the spike gene
 * @returns {SpikeCommand}
 */
const readSpikeGene = ({ location, bytes }) => ({
  angle: location,
  length: Math.floor(countBits(bytes) / fixed.bitsPerSpikeLength),
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

  const size = Math.floor(countTypeBits(0xF0, genes) / fixed.bitsPerMass);

  const spikes = genes
    .filter(({ type }) => type === 0xF1)
    .map(readSpikeGene);

  const hue = rgbToHue({
    r: countTypeBits(0xF2, genes),
    g: countTypeBits(0xF3, genes),
    b: countTypeBits(0xF4, genes),
  });

  return { size, spikes, hue };
};

/**
 * Mutates a byte by applying possible single-point mutations to its bits
 *
 * @param {number} byte
 * @returns {number}
 */
const mutateBits = (byte) => {
  const xorMask = parseInt(range(8)
    .map(() => (rand() < dynamic.chanceMutateBit ? '1' : '0'))
    .join(''), 2);

  // eslint-disable-next-line no-bitwise
  return byte ^ xorMask;
};

/**
 * Repeats random items in an array or Uint8array
 *
 * @param {array|Uint8Array} arr
 * @param {number} chance - chance from 0 to 1 an item is repeated
 * @returns {array}
 */
const repeatItems = (arr, chance) => {
  const repeated = [];

  for (let i = 0; i < arr.length; i += 1) {
    repeated.push(arr[i]);
    if (rand() < chance) {
      i -= 1;
    }
  }

  return repeated;
};

/**
 * Shuffle random items in an array or Uint8array
 *
 * @param {array|Uint8Array} arr
 * @param {number} chance - chance from 0 to 1 an item is shuffled
 * @returns {array}
 */
const transposeItems = (arr, chance) => {
  const transposed = [];
  const toTranspose = [];

  for (const item of arr) {
    if (rand() < chance) {
      toTranspose.push(item);
    } else {
      transposed.push(item);
    }
  }

  for (const item of toTranspose) {
    transposed.splice(randInt(0, transposed.length), 0, item);
  }

  return transposed;
};

/**
 * Joins an array of gene bytes into one Uint8Array
 *
 * @param {Uint8Array[]} geneArray
 * @returns {Uint8Array}
 */
const joinGeneArray = geneArray => concatBytes(...geneArray);

/**
 * Creates a mutated copy of an existing genome
 *
 * @param {Uint8Array} genome
 * @returns {Uint8Array}
 */
export const replicateGenome = genome => pipe(genome)
  .into(map, mutateBits)
  .into(filter, () => rand() >= dynamic.chanceDropByte)
  .into(repeatItems, dynamic.chanceRepeatByte)
  .into(transposeItems, dynamic.chanceTransposeByte)
  .into(chunkBy, findControlIndexes)
  .into(filter, () => rand() >= dynamic.chanceDropGene)
  .into(repeatItems, dynamic.chanceRepeatGene)
  .into(transposeItems, dynamic.chanceTransposeGene)
  .into(joinGeneArray)
  .done();
