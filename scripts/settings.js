// Config settings, and a global state object

var defaults = {
  location: 'meeba-farm.config',
  logStats: true,
  lutLevels: 1024,

  minR: 10,
  spikeW: 0.025,
  lightness: 40,
  spikeColor: '#000000',
  activeSpikeColor: '#ff0000',
  maxSpeed: 10,
  dur: 100,

  gene: {
    rate: 0.1,
    spread: 0.5,
    portion: 10,
    strength: 50,
    odds: {
      size: 20,
      spike: 1
    }
  },

  seed: {
    genes: 100,
    count: 15
  },

  mote: {
    genes: 5,
    rate: 0.4,
    max: 75
  },

  size: {
    cost: 0.005,
    costFixed: false,
    efficiency: 2
  },

  spike: {
    cost: 256,
    costFixed: true,
    damage: 256,
    scale: 1.025
  },

  spawn: {
    cost: 100,
    cooldown: 2500,
    count: 2
  },

  buffer: {
    wall: 40,
    body: 10
  },

  scale: {
    start: 1.5,
    death: 0.5,
    spawn: 2
  }
};

var config = JSON.parse(localStorage.getItem(defaults.location)) || defaults;
config.w = window.innerWidth - 20;
config.h = window.innerHeight - 20;

var state = {
  count: 0,
  minutes: 0,
  stats: [],
  averages: []
};

// Cached lookup tables of expensive trig values
var lut = {
  sin: d3.range(config.lutLevels).map(function(d, i) {
    return Math.sin( 2 * Math.PI * i / config.lutLevels );
  }),

  cos: d3.range(config.lutLevels).map(function(d, i) {
    return Math.cos( 2 * Math.PI * i / config.lutLevels );
  }),

  acos: d3.range(config.lutLevels).map(function(d, i) {
    return Math.acos( (i-(config.lutLevels/2)) / (config.lutLevels/2) );
  })
};
