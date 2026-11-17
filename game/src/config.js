// SILKSPAN's tuning table: the playfield, the crate types, how a silk span behaves, the palette
// and the shared font. Every number the game feels lives here so the other modules stay readable.

/** The logical playfield. The renderer scales it to the window; no rule depends on screen size. */
export const WORLD = { width: 1280, height: 720 };

/** Downward acceleration in pixels per second squared, and the drag a flying crate feels. The
 *  gorge is wide and the throw is shallow, so gravity is light: a crate that misses the dock
 *  sails a long way before it reaches the river, and the flight stays readable. */
export const GRAVITY = 480;
export const AIR_DRAG = 0.05;
/** How much of the air's sideways push a crate actually takes: a loaded crate is heavy, so the
 *  gust nudges a throw rather than carrying it. */
export const AIR_WIND_SHARE = 0.35;

/** The river at the bottom of the gorge: a crate below this line is lost to the current. */
export const WATER_Y = 640;

/** The near cliff, where the chute tower stands. A crate that strikes its face is lost. */
export const CLIFF = { right: 230, top: 300, bottom: 720 };

/** The loading dock on the far side, with three marked bays and the deck between them. */
export const DOCK = {
  left: 830,
  right: 1280,
  top: 524,
  bays: [
    { key: 'near', from: 920, to: 1030, value: 10, label: 'NEAR' },
    { key: 'mid', from: 1038, to: 1140, value: 25, label: 'MID' },
    { key: 'far', from: 1148, to: 1250, value: 50, label: 'FAR' },
  ],
};

/** The canopy chute: a cable that sags from the tower and flattens at the lip, so a crate rides
 *  it slowly and is then thrown across the gorge fast and almost flat. */
export const CHUTE = { x0: 96, y0: 120, cx: 300, cy: 303, x1: 360, y1: 300, speed: 190, launch: 405 };

/** Seconds between crates in an unhurried run, and the seconds one crate takes to traverse the cable. */
export const CRATE_INTERVAL = 1.65;

/** The three crate types: how big, how heavy, the impulse per unit mass that breaks a shell on a
 *  hard landing, and the line tension above which the shell gives way (a wicker crate is woven
 *  and cracks on a tight line; a standard crate and an anvil take any line they meet). */
export const CRATE_TYPES = {
  standard: { key: 'standard', radius: 17, mass: 1.15, crack: 520, softAbove: 1.2, shell: '#d8834a', band: '#a85c2c' },
  wicker: { key: 'wicker', radius: 16, mass: 0.8, crack: 380, softAbove: 0.72, shell: '#e8cf9a', band: '#b98f4d' },
  anvil: { key: 'anvil', radius: 20, mass: 2.6, crack: 700, softAbove: 1.5, shell: '#8d94a3', band: '#5d6472' },
};

/** Silk: how a strung span hangs, how it slings a crate that lands on it, and what a reel pays for. */
export const SILK = {
  nodes: 9,
  /** The middle of the longest, loosest line hangs this share of its length below its pegs. */
  sagSlack: 0.15,
  /** Each node is held in the shape it was strung in by its own spring: stiffness, damping, and
   *  how much of a neighbour's push spreads along the line each step. */
  springStiffness: 120,
  springDamping: 11,
  deformSpread: 0.12,
  /** A crate leaves a span along its own reflected path, scaled by the line's tension: a taut
   *  short line gives back more than the landing carried, a long loose one soaks it up. */
  gainBase: 0.4,
  gainTension: 0.55,
  /** A small extra push along the line's normal, which is what makes a taut line throw on, not back. */
  kickTension: 20,
  /** How the crate's own weight changes the bounce, taking the standard crate as the yardstick:
   *  an anvil is thrown further by the same line, a wicker crate less far. */
  gainMassStep: 0.35,
  gainMassYardstick: 1.15,
  launchMax: 900,
  /** Seconds a crate ignores spans after being slung, so one landing is one launch. */
  hitCooldown: 0.22,
  strainPerImpulse: 0.0007,
  strainDecay: 0.55,
  snapStrain: 1,
  impulseShare: 0.55,
  reelPerShipment: 2100,
  costPerPixel: 1,
  cutRefund: 0.5,
};

/** How far a span may reach, and how many may hang at once. */
export const SPAN = { min: 80, max: 460, maxLive: 3 };

/** Pacing: the fixed step, the clamps, and what finishing a shipment pays. A shipment carries a
 *  slack of crates it may lose; when that runs out, or the clock does, the run is over. */
export const PACE = {
  step: 1 / 120,
  maxFrameDt: 0.05,
  banner: 2.1,
  slack: 4,
  bonusPerSecond: 4,
  chainStep: 0.15,
  screenFade: 0.25,
};

/** The wind a shipment may blow: a steady drift plus a slow gust that swings the falling crate.
 *  Kept light, because a whole bay is only about a hundred pixels apart. */
export const WIND = { maxAccel: 150 };

/** Bright daylight over a terraced orchard gorge: the game's whole palette in one place. */
export const PALETTE = {
  skyTop: '#8fd6ea',
  skyMid: '#cdeaf0',
  skyHorizon: '#f7efd5',
  sun: '#ffe08a',
  sunGlow: 'rgba(255,226,138,0.35)',
  cliffFar: '#7d9f8c',
  cliffMid: '#5f8471',
  cliffFarShade: '#547564',
  cliffNear: '#b07a4e',
  cliffNearShade: '#8d5f39',
  grass: '#7cb85c',
  grassDark: '#5d9445',
  terrace: '#a8825a',
  water: '#3f9fc4',
  waterLight: '#79cbe0',
  foam: '#eaf7f9',
  dock: '#c08a52',
  dockDark: '#946137',
  dockEdge: '#e0b183',
  bayFloor: '#7c5330',
  peg: '#8a6236',
  pegKnot: '#f3e6c8',
  silk: '#fffdf4',
  silkShadow: '#dfd8c4',
  silkWarm: '#ffc266',
  silkHot: '#e05c4a',
  ink: '#1d3b3f',
  panel: '#123840',
  panelEdge: '#1f5560',
  text: '#f2f7f3',
  muted: '#9dc0c0',
  accent: '#ffcf5c',
  danger: '#ff8a6b',
  good: '#8fe08a',
};

/** The one font the game uses, and where a browser keeps the crew's best score. */
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const BEST_KEY = 'silkspan.best';
