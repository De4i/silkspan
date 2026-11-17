// SILKSPAN's rules: the run's state machine, the shipments in order, the crates in the air, the
// silk reel and the tally. Everything that decides the game lives here and is stepped at one fixed
// rate, so the same seed and the same inputs always produce the same run. Nothing here touches the
// DOM, the canvas or the clock, which is what lets the headless harness and the screenshot scenes
// drive the real rules.
import { CHUTE, CRATE_INTERVAL, DOCK, PACE, SILK, SPAN } from './config.js';
import { createGulls, stepGulls } from './gulls.js';
import { cablePoint, cableVelocity, clampToGorge, landingOf, makeCrate, stepCrate, strikeSpans, windAccelAt, windReading } from './physics.js';
import { createRandom, shuffled } from './random.js';
import { bestBayChain, scoreOf, verdictOf } from './scoring.js';
import { shipmentAt, SHIPMENTS, isLastShipment } from './shipments.js';
import { stringSpan } from './silk.js';

export const PHASE = { title: 'title', playing: 'playing', paused: 'paused', results: 'results' };

/** The cable's length, so a crate's progress along it is a constant-rate ride. */
const CABLE_RATE = (() => {
  let total = 0;
  let last = cablePoint(0);
  for (let index = 1; index <= 60; index += 1) {
    const point = cablePoint(index / 60);
    total += Math.hypot(point.x - last.x, point.y - last.y);
    last = point;
  }
  return CHUTE.speed / total;
})();

/** Seconds until the crate now riding the cable is thrown, which is when its flight really begins. */
export function secondsToCableEnd(state) {
  return state.chute.active ? Math.max(0, (1 - state.chute.t) / CABLE_RATE) : 0;
}

/** A fresh, idle state: a title screen and nothing else running yet. */
export function createState(seed = 1) {
  return {
    seed,
    random: createRandom(seed),
    phase: PHASE.title,
    time: 0,
    elapsed: 0,
    timeAccumulator: 0,
    shipmentIndex: 0,
    shipment: shipmentAt(0),
    totalShipments: SHIPMENTS.length,
    shipmentTime: 0,
    banner: 0,
    bannerTitle: '',
    bannerLine: '',
    pending: null,
    lives: PACE.slack,
    reel: 0,
    pegs: [],
    bays: [],
    spans: [],
    stringing: null,
    flying: [],
    chute: { type: null, t: 0, active: false },
    queue: [],
    nextCrateIn: CRATE_INTERVAL,
    released: 0,
    deliveries: [],
    cleared: [],
    lost: 0,
    lostBy: { river: 0, cliff: 0, overshoot: 0, cracked: 0, shut: 0, 'ran down': 0 },
    decked: 0,
    chain: 0,
    bestChain: 0,
    bayStacks: { near: 0, mid: 0, far: 0 },
    wind: { base: 0, gust: 0, period: 7, phase: 0 },
    windAccel: 0,
    windReading: 0,
    gulls: [],
    fx: [],
    messages: [],
    shake: 0,
    flash: 0,
    won: false,
    result: null,
    lastSpanHits: 0,
  };
}

/** Start a run on `seed` from the first shipment. */
export function startRun(state, seed = state.seed) {
  state.seed = seed;
  state.random = createRandom(seed);
  Object.assign(state, {
    phase: PHASE.playing,
    time: 0,
    elapsed: 0,
    timeAccumulator: 0,
    lives: PACE.slack,
    flying: [],
    chute: { type: null, t: 0, active: false },
    released: 0,
    deliveries: [],
    cleared: [],
    lost: 0,
    lostBy: { river: 0, cliff: 0, overshoot: 0, cracked: 0, shut: 0, 'ran down': 0 },
    decked: 0,
    chain: 0,
    bestChain: 0,
    gulls: [],
    fx: [],
    messages: [],
    shake: 0,
    flash: 0,
    won: false,
    result: null,
    pending: null,
  });
  beginShipment(state, 0);
  return state;
}

/** Load the shipment at `index`: its pegs, its open bays, a full reel and its crate queue. */
export function beginShipment(state, index) {
  const shipment = shipmentAt(index);
  state.shipmentIndex = index;
  state.shipment = shipment;
  state.shipmentTime = shipment.seconds;
  state.pegs = shipment.pegs.map((peg) => ({ ...peg, used: 0 }));
  state.bays = DOCK.bays.map((bay) => ({ ...bay, open: shipment.bays.includes(bay.key) }));
  state.lives = shipment.slack ?? PACE.slack;
  state.reel = SILK.reelPerShipment;
  state.spans = [];
  state.flying = [];
  state.chute = { type: null, t: 0, active: false };
  state.queue = shuffled(shipment.queue, state.random);
  state.gulls = createGulls(shipment, state.random);
  state.nextCrateIn = 0.85;
  state.shipmentDelivered = 0;
  state.shipmentLost = 0;
  state.bayStacks = { near: 0, mid: 0, far: 0 };
  state.wind = { ...shipment.wind, phase: state.random.range(0, Math.PI * 2) };
  state.windAccel = 0;
  state.windReading = 0;
  state.banner = PACE.banner;
  state.bannerTitle = shipment.name;
  state.bannerLine = shipment.brief;
  state.pending = null;
  say(state, `${shipment.name}: ${shipment.need} crates or the load is lost`);
}

/** Push a short line onto the HUD ticker. */
export function say(state, text, tone = 'info') {
  state.messages.unshift({ text, tone, life: 2.6 });
  if (state.messages.length > 4) state.messages.length = 4;
}

/** A live span between two peg indexes, taking its silk off the reel. */
export function stringBetween(state, indexA, indexB) {
  const span = stringSpan(state.pegs, indexA, indexB, state.spans);
  if (!span) return { ok: false, reason: 'reach' };
  if (span.cost > state.reel) return { ok: false, reason: 'silk' };
  state.reel -= span.cost;
  state.spans.push(span);
  state.pegs[indexA].used += 1;
  state.pegs[indexB].used += 1;
  state.fx.push({ kind: 'string', x: (span.pegA.x + span.pegB.x) / 2, y: (span.pegA.y + span.pegB.y) / 2, life: 0.4, max: 0.4 });
  return { ok: true, span };
}

/** Cut the live span nearest `x, y`, refunding part of its silk; null when nothing was close. */
export function cutNearest(state, x, y) {
  let best = null;
  let bestDistance = 30;
  for (const span of state.spans) {
    if (span.broken) continue;
    const hit = span.nearest(x, y);
    if (hit.distance < bestDistance) {
      bestDistance = hit.distance;
      best = span;
    }
  }
  if (!best) return null;
  best.broken = true;
  state.reel += Math.round(best.cost * SILK.cutRefund);
  state.fx.push({ kind: 'cut', x, y, life: 0.35, max: 0.35 });
  return best;
}

/** Let the crate on the cable go early, which is how a player picks the moment to throw. */
export function releaseEarly(state) {
  if (state.phase !== PHASE.playing || !state.chute.active || state.chute.t < 0.12 || state.pending) return false;
  launchFromCable(state);
  return true;
}

/** The crate on the cable leaves it at the cable's own speed. */
function launchFromCable(state) {
  const { type, t } = state.chute;
  const point = cablePoint(t);
  const velocity = cableVelocity(t);
  state.flying.push(makeCrate(type, point.x, point.y, velocity.vx, velocity.vy));
  state.chute = { type: null, t: 0, active: false };
  state.nextCrateIn = state.shipment.interval;
  state.released += 1;
}

/** Pause or resume a run in progress. */
export function togglePause(state) {
  if (state.phase === PHASE.playing) state.phase = PHASE.paused;
  else if (state.phase === PHASE.paused) state.phase = PHASE.playing;
  return state.phase;
}

/** Send the run to its results. `won` false is the dock going quiet. */
function endRun(state, won) {
  state.phase = PHASE.results;
  state.won = won;
  state.result = {
    won,
    reason: state.endReason ?? (won ? 'cleared' : 'clock'),
    score: scoreOf(state),
    delivered: state.deliveries.length,
    lost: state.lost,
    released: state.released,
    bestChain: bestBayChain(state.deliveries),
    cleared: state.cleared.length,
    shipments: SHIPMENTS.length,
    accuracy: state.released > 0 ? state.deliveries.length / state.released : 0,
    seconds: state.elapsed,
    verdict: verdictOf(state),
  };
}

/** The state a HUD, a screenshot or a test needs, as plain numbers. */
export function textSnapshot(state) {
  return {
    mode: state.phase,
    shipment: state.shipment.name,
    shipmentIndex: state.shipmentIndex + 1,
    timeLeft: Math.max(0, state.shipmentTime),
    need: state.shipment.need,
    deliveredThisShipment: state.shipmentDelivered ?? 0,
    deliveredRun: state.deliveries.length,
    lost: state.lost,
    crateSlack: state.lives,
    score: scoreOf(state),
    silkLeft: state.reel,
    wind: Number(state.windReading.toFixed(3)),
    spans: state.spans.map((span) => ({ from: span.pegA.key, to: span.pegB.key, tension: Number(span.tension.toFixed(2)), strain: Number(span.strain.toFixed(2)), broken: span.broken })),
    pegs: state.pegs.map((peg) => ({ key: peg.key, x: peg.x, y: peg.y })),
    bays: state.bays.map((bay) => ({ key: bay.key, open: bay.open, stacks: state.bayStacks[bay.key] ?? 0 })),
    chute: state.chute.active ? { type: state.chute.type.key, progress: Number(state.chute.t.toFixed(2)) } : null,
    crates: state.flying.map((crate) => ({ type: crate.type.key, x: Math.round(crate.x), y: Math.round(crate.y), vx: Math.round(crate.vx), vy: Math.round(crate.vy), fuseLeft: crate.fuseLeft ? Number(crate.fuseLeft.toFixed(1)) : null })),
    gulls: state.gulls.map((gull) => ({ x: Math.round(gull.x), y: Math.round(gull.y), diving: gull.dive > 0.1 })),
    coordinateNote: 'x grows right, y grows down; the dock top is y=452 and the river y=640',
  };
}

/** Advance the run by `dt` seconds in fixed steps, whatever rate the caller drives it at. */
export function update(state, dt) {
  if (state.phase !== PHASE.playing) return;
  state.timeAccumulator += Math.min(dt, PACE.maxFrameDt);
  let guard = 0;
  while (state.timeAccumulator >= PACE.step && guard < 600) {
    stepOnce(state, PACE.step);
    state.timeAccumulator -= PACE.step;
    guard += 1;
  }
}

/** One fixed step of the real rules. */
export function stepOnce(state, dt) {
  state.time += dt;
  state.elapsed += dt;
  state.banner = Math.max(0, state.banner - dt);
  state.shake = Math.max(0, state.shake - dt * 2.2);
  state.flash = Math.max(0, state.flash - dt * 2.4);
  for (const message of state.messages) message.life -= dt;
  state.messages = state.messages.filter((message) => message.life > 0);
  for (const fx of state.fx) fx.life -= dt;
  state.fx = state.fx.filter((fx) => fx.life > 0);

  state.windAccel = windAccelAt(state.wind, state.time);
  state.windReading = windReading(state.windAccel);

  for (const span of state.spans) span.step(dt);

  if (state.pending) {
    state.pending.after -= dt;
    if (state.pending.after <= 0) beginShipment(state, state.pending.index);
    return;
  }

  advanceChute(state, dt);
  const knocked = stepGulls(state.gulls, state.flying, dt);
  for (const event of knocked) {
    state.fx.push({ kind: 'gull', x: event.crate.x, y: event.crate.y, life: 0.5, max: 0.5 });
    say(state, 'A gull knocked that crate off its line', 'warn');
  }
  flyCrates(state, dt);

  if (state.phase !== PHASE.playing) return;

  state.shipmentTime -= dt;
  if (state.shipmentDelivered >= state.shipment.need) {
    completeShipment(state);
    return;
  }
  if (state.shipmentTime <= 0) failShipment(state);
}

/** Move the chute: the crate on the cable rides it, and the next one steps up when it is let go. */
function advanceChute(state, dt) {
  if (state.chute.active) {
    state.chute.t += CABLE_RATE * dt;
    if (state.chute.t >= 1) launchFromCable(state);
    return;
  }
  state.nextCrateIn -= dt;
  if (state.nextCrateIn > 0 || state.queue.length === 0) return;
  state.chute = { type: state.queue.shift(), t: 0, active: true };
}

/** Step every crate in the air and settle the ones that have arrived. */
function flyCrates(state, dt) {
  const settled = [];
  for (const crate of state.flying) {
    crate.trail.push({ x: crate.x, y: crate.y });
    if (crate.trail.length > 14) crate.trail.shift();
    stepCrate(crate, dt, state.windAccel);
    const { broken, impulse, cracked } = strikeSpans(crate, state.spans);
    for (const span of broken) {
      state.fx.push({ kind: 'snap', x: crate.x, y: crate.y, life: 0.5, max: 0.5 });
      say(state, 'A span parted under that load', 'warn');
      state.shake = Math.min(1, state.shake + 0.5);
    }
    if (crate.type.fuse) {
      crate.fuseLeft = (crate.fuseLeft ?? crate.type.fuse) - dt;
      if (crate.fuseLeft <= 0) {
        settle(state, crate, { kind: 'ran down', bay: null });
        settled.push(crate);
        continue;
      }
    }
    if (cracked || impulse / crate.mass > crate.type.crack) {
      settle(state, crate, { kind: 'cracked', bay: null });
      settled.push(crate);
      continue;
    }
    clampToGorge(crate);
    const landing = landingOf(crate);
    if (landing) {
      settle(state, crate, landing);
      settled.push(crate);
    }
  }
  if (settled.length) state.flying = state.flying.filter((crate) => !settled.includes(crate));
}

/** Put a crate where it ended: in a bay, or lost to the deck, the cliff, the river or the sky. */
function settle(state, crate, landing) {
  if (landing.kind === 'bay') {
    const bay = landing.bay;
    if (!state.bays.find((entry) => entry.key === bay.key)?.open) {
      state.lost += 1;
      state.shipmentLost = (state.shipmentLost ?? 0) + 1;
      state.chain = 0;
      state.lives -= 1;
      say(state, `${bay.label} bay is battened down: crate gone, ${state.lives} left`, 'bad');
      state.lostBy.shut += 1;
      state.fx.push({ kind: 'crack', x: crate.x, y: crate.y, life: 0.5, max: 0.5 });
      if (state.lives <= 0 && (state.shipmentDelivered ?? 0) < state.shipment.need) endRun(state, false, 'slack');
      return;
    }
    state.deliveries.push({ bay: bay.key, value: bay.value, at: state.time });
    state.shipmentDelivered = (state.shipmentDelivered ?? 0) + 1;
    state.bayStacks[bay.key] = (state.bayStacks[bay.key] ?? 0) + 1;
    state.chain += 1;
    state.bestChain = Math.max(state.bestChain, state.chain);
    state.flash = Math.min(1, state.flash + 0.35);
    state.fx.push({ kind: 'landed', x: crate.x, y: crate.y, life: 0.6, max: 0.6, label: `${bay.label} +${bay.value}` });
    say(state, `${bay.label} bay takes it: +${bay.value}`, 'good');
    return;
  }
  // A crate that lands on the deck between the bays is not lost: it is simply not delivered, and
  // the shipment has to find its quota from the crates that are still to come.
  if (landing.kind === 'deck') {
    state.decked = (state.decked ?? 0) + 1;
    state.chain = 0;
    state.fx.push({ kind: 'deck', x: crate.x, y: crate.y, life: 0.6, max: 0.6 });
    say(state, 'On the deck, between the bays: no points', 'warn');
    return;
  }
  const reasons = {
    cliff: 'lost to the cliff face',
    river: 'gone into the river',
    overshoot: 'thrown clean past the dock',
    cracked: `${crate.type.key} shell cracked`,
    'ran down': 'movement ran down in mid-air',
  };
  state.lost += 1;
  state.lostBy[landing.kind] = (state.lostBy[landing.kind] ?? 0) + 1;
  state.shipmentLost = (state.shipmentLost ?? 0) + 1;
  state.chain = 0;
  state.lives -= 1;
  state.shake = Math.min(1, state.shake + 0.6);
  state.fx.push({ kind: landing.kind === 'river' ? 'splash' : 'crack', x: crate.x, y: crate.y, life: 0.6, max: 0.6 });
  say(state, `Crate ${reasons[landing.kind] ?? 'lost'}: ${state.lives} left in this shipment`, 'bad');
  // A shipment whose quota is already met is not lost to one crate too many: the clock decides.
  if (state.lives <= 0 && (state.shipmentDelivered ?? 0) < state.shipment.need) endRun(state, false, 'slack');
}

/** The shipment's quota is met: pay it, then move to the next one, or finish the run. */
function completeShipment(state) {
  const secondsLeft = Math.max(0, state.shipmentTime);
  state.cleared.push({ name: state.shipment.name, need: state.shipment.need, secondsLeft });
  state.flash = 1;
  say(state, `${state.shipment.name} cleared with ${Math.round(secondsLeft)}s to spare`, 'good');
  if (isLastShipment(state.shipmentIndex)) {
    endRun(state, true);
    return;
  }
  state.banner = PACE.banner;
  state.bannerTitle = 'LOAD CLEARED';
  state.bannerLine = 'The barge takes it. Next shipment is up.';
  state.flight = [];
  state.flying = [];
  state.chute = { type: null, t: 0, active: false };
  state.pending = { index: state.shipmentIndex + 1, after: PACE.banner };
}

/** The clock ran out before the quota: the barge sails light and the run is over. */
function failShipment(state) {
  state.shake = 1;
  say(state, `${state.shipment.name} lost: the barge sailed light`, 'bad');
  endRun(state, false);
}

/** The silk a fresh reel holds, so the HUD and the harness can show it as a share. */
export const REEL_FULL = SILK.reelPerShipment;
export { SPAN };
