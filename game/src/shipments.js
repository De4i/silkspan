// The six shipments of the run, as data: where the silk knots stand, which bays are open, what
// comes down the chute, how long the crew has and how the wind behaves. Nothing here reads state;
// the knots follow the crate's own flight, which is why they sit along the falling diagonal.
import { CRATE_TYPES } from './config.js';

/** A knot of silk on a post, a cliff bracket or the dock rail. */
function peg(key, x, y, kind = 'mast') {
  return { key, x, y, kind };
}

/** `mix` is [type, count] pairs; `wind` is a steady drift, a gust swing and its period. */
function shipment(spec) {
  return {
    ...spec,
    queue: spec.mix.flatMap(([type, count]) => Array.from({ length: count }, () => CRATE_TYPES[type])),
  };
}

export const SHIPMENTS = [
  shipment({
    name: 'FIRST LIGHT',
    slack: 3,
    brief: 'String a span under the fall and bounce the crate home.',
    need: 5,
    seconds: 82,
    interval: 1.9,
    bays: ['near', 'mid'],
    pegs: [peg('mast-a', 500, 380), peg('mast-b', 620, 440), peg('mast-c', 740, 440), peg('dock-rail', 826, 440, 'dock')],
    mix: [['standard', 11]],
    wind: { base: 0, gust: 0, period: 7 },
  }),
  shipment({
    name: 'TWO LINES',
    slack: 3,
    brief: 'Every bay is open now: a tight short span throws the crate further.',
    need: 7,
    seconds: 110,
    interval: 1.75,
    bays: ['near', 'mid', 'far'],
    pegs: [
      peg('mast-a-high', 500, 380),
      peg('mast-a-low', 500, 460),
      peg('mast-b', 620, 440),
      peg('mast-c', 740, 440),
      peg('dock-rail', 826, 440, 'dock'),
    ],
    mix: [['standard', 14]],
    wind: { base: 0, gust: 30, period: 6 },
  }),
  shipment({
    name: 'WICKER WORK',
    slack: 4,
    brief: 'Wicker shells crack on a tight line. Give them a long, loose span.',
    need: 6,
    seconds: 116,
    interval: 1.7,
    bays: ['near', 'mid', 'far'],
    pegs: [
      peg('mast-a-high', 500, 380),
      peg('mast-a-low', 500, 460),
      peg('mast-b-high', 620, 440),
      peg('mast-b-low', 620, 500),
      peg('mast-c', 740, 440),
      peg('dock-rail', 826, 440, 'dock'),
    ],
    mix: [['standard', 10], ['wicker', 5], ['glass', 4]],
    wind: { base: 12, gust: 40, period: 5.5 },
  }),
  shipment({
    name: 'ANVIL LOAD',
    slack: 4,
    brief: 'Anvils need a short, tight span. Watch the strain on the line.',
    need: 8,
    seconds: 110,
    interval: 1.6,
    bays: ['near', 'mid', 'far'],
    pegs: [
      peg('cliff-bracket', 230, 420, 'cliff'),
      peg('mast-a-high', 500, 380),
      peg('mast-a-low', 500, 460),
      peg('mast-b-high', 620, 440),
      peg('mast-b-low', 620, 500),
      peg('mast-c', 740, 440),
      peg('dock-rail', 826, 440, 'dock'),
    ],
    mix: [['standard', 11], ['anvil', 5], ['clockwork', 4]],
    wind: { base: -12, gust: 45, period: 6.5 },
  }),
  shipment({
    name: 'GUST FRONT',
    slack: 5,
    brief: 'The wind swings the fall. Read it before you string.',
    need: 8,
    seconds: 116,
    interval: 1.55,
    bays: ['near', 'mid', 'far'],
    pegs: [
      peg('cliff-bracket', 230, 420, 'cliff'),
      peg('mast-a-high', 500, 380),
      peg('mast-a-low', 500, 460),
      peg('mast-b-high', 620, 440),
      peg('mast-b-low', 620, 500),
      peg('mast-c-high', 740, 440),
      peg('mast-c-low', 740, 500),
      peg('dock-rail', 826, 440, 'dock'),
    ],
    mix: [['standard', 11], ['wicker', 5], ['anvil', 4], ['glass', 4], ['clockwork', 3]],
    gulls: { count: 2, height: 250 },
    wind: { base: 18, gust: 75, period: 4.5 },
  }),
  shipment({
    name: 'THE STORM SHIPMENT',
    slack: 5,
    brief: 'The last load, in the worst of it. Hold the dock.',
    need: 10,
    seconds: 130,
    interval: 1.45,
    bays: ['near', 'mid', 'far'],
    pegs: [
      peg('cliff-bracket', 230, 420, 'cliff'),
      peg('mast-a-high', 500, 380),
      peg('mast-a-low', 500, 460),
      peg('mast-b-high', 620, 420),
      peg('mast-b-mid', 620, 470),
      peg('mast-b-low', 620, 500),
      peg('mast-c-high', 740, 440),
      peg('mast-c-low', 740, 500),
      peg('dock-rail', 826, 440, 'dock'),
      peg('dock-rail-low', 826, 520, 'dock'),
    ],
    mix: [['standard', 13], ['wicker', 6], ['anvil', 5], ['glass', 4], ['clockwork', 4]],
    gulls: { count: 3, height: 240, speed: 150 },
    wind: { base: 22, gust: 95, period: 4 },
  }),
  shipment({
    name: 'THE TALL SHIP',
    brief: 'Three monuments for the barge. Heavy lines, a long clock, and every gull in the gorge.',
    need: 3,
    slack: 5,
    seconds: 138,
    interval: 3.1,
    bays: ['near', 'mid', 'far'],
    pegs: [
      peg('cliff-bracket', 230, 420, 'cliff'),
      peg('mast-a-high', 500, 350),
      peg('mast-a-low', 500, 460),
      peg('mast-b-high', 620, 400),
      peg('mast-b-mid', 620, 470),
      peg('mast-b-low', 620, 520),
      peg('mast-c-high', 740, 410),
      peg('mast-c-low', 740, 500),
      peg('dock-rail', 826, 420, 'dock'),
      peg('dock-rail-low', 826, 520, 'dock'),
    ],
    mix: [['monument', 4], ['standard', 8], ['clockwork', 4], ['glass', 3]],
    wind: { base: -18, gust: 60, period: 5 },
    gulls: { count: 4, height: 236, speed: 165 },
  }),
];

/** The shipment at `index`, or the last one when a run goes past the list. */
export function shipmentAt(index) {
  return SHIPMENTS[Math.min(index, SHIPMENTS.length - 1)];
}

/** True when `index` is the last shipment, which is how a run is won. */
export function isLastShipment(index) {
  return index >= SHIPMENTS.length - 1;
}
