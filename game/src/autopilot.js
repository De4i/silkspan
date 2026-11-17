// The spanhand's own judgment, in code: given a crate about to be let go, which two pegs to string
// and when to throw. It predicts the fall, tries every reachable pair, reflects the crate off each
// candidate span and follows where it lands, then takes the pair that reaches the best bay. The
// screenshot scenes and the headless balance harness both play through this, so the frames they
// produce are frames of a real, competent run.
import { DOCK, PACE, SILK, SPAN, WORLD } from './config.js';
import { bayAt, cablePoint, cableVelocity, stepCrate, windAccelAt } from './physics.js';
import { PHASE, secondsToCableEnd, stringBetween, update } from './state.js';
import { SilkSpan } from './silk.js';

const CANDIDATE_STEPS = 1 / 120;
const MAX_FLIGHT = 2.6;

/**
 * Follow a crate thrown at `x, y` with `vx, vy`, and report where it ends. `windFor` is asked for
 * the air's sideways acceleration `t` seconds into the flight, so a caller who knows the shipment's
 * own gust can predict the throw exactly; `spans` are the lines it may land on.
 */
export function predict(crateType, x, y, vx, vy, windFor, spans, trace = null) {
  const crate = { x, y, vx, vy, radius: crateType.radius, mass: crateType.mass, spin: 0, spinRate: 0, trail: [], cooldown: 0, type: crateType };
  if (trace) trace.push({ x, y });
  for (let time = 0; time < MAX_FLIGHT; time += CANDIDATE_STEPS) {
    stepCrate(crate, CANDIDATE_STEPS, windFor(time));
    if (trace && Math.round(time * 120) % 8 === 0) trace.push({ x: crate.x, y: crate.y });
    if (crate.cooldown <= 0) {
      for (const span of spans) {
        if (span.broken) continue;
        const hit = span.strike(crate);
        if (!hit) continue;
        if (hit.cracked) return { kind: 'cracked', bay: null, x: crate.x, y: crate.y };
        crate.vx = hit.vx;
        crate.vy = hit.vy;
        crate.cooldown = SILK.hitCooldown;
        break;
      }
    }
    if (crate.y + crate.radius >= DOCK.top && crate.x >= DOCK.left) {
      const bay = bayAt(crate.x);
      return bay ? { kind: 'bay', bay, x: crate.x, y: crate.y } : { kind: 'deck', bay: null, x: crate.x, y: crate.y };
    }
    if (crate.y > WORLD.height + 60 || crate.x > WORLD.width + 60) break;
  }
  return { kind: 'river', bay: null, x: crate.x, y: crate.y };
}

/** The bay values an autopilot will take, best first, as the run gets harder. */
function wantedBays(state) {
  return state.bays.filter((bay) => bay.open).slice().sort((a, b) => b.value - a.value);
}

/**
 * Choose a span for the crate waiting on the cable: every reachable pair is tried, and the one
 * whose reflection lands in the most valuable bay wins. `skill` in [0, 1] scales the search: a
 * low-skill hand considers fewer pairs, misjudges the wind and sometimes looks past a bay.
 */
export function chooseSpan(state, skill = 1) {
  const remaining = SPAN.maxLive - state.spans.filter((span) => !span.broken).length;
  if (remaining <= 0) return null;
  // A sure hand reads the shipment's own gust through the whole flight; a hurried one assumes the
  // air keeps blowing the way it blows at the moment of the throw.
  const gust = state.wind;
  // The crate is still riding the cable: its flight starts when the cable lets it go, so the gust
  // the search reads is the one that will be blowing then, not the one blowing now.
  const flightStarts = state.time + secondsToCableEnd(state);
  const steady = state.windAccel * (0.55 + 0.45 * skill);
  const windFor = skill >= 0.9 ? (t) => windAccelAt(gust, flightStarts + t) : () => steady;
  const point = cablePoint(1);
  const velocity = cableVelocity(1);
  const crateType = state.chute.type;
  /**
   * What a landing is worth to the plan: a bay that is open pays its own value, a bay that is
   * battened down pays nothing, and a landing on the deck between the bays still pays a little
   * according to how close it came, so a span that almost works is still worth hanging.
   */
  const worth = (landing) => {
    if (landing.kind === 'bay') {
      const open = state.bays.find((bay) => bay.key === landing.bay.key)?.open;
      return open ? landing.bay.value : 0;
    }
    if (landing.kind !== 'deck') return 0;
    let nearest = Infinity;
    for (const bay of state.bays) {
      if (!bay.open) continue;
      const gap = landing.x < bay.from ? bay.from - landing.x : landing.x > bay.to ? landing.x - bay.to : 0;
      nearest = Math.min(nearest, gap);
    }
    return nearest === Infinity ? 0 : Math.max(0, 8 - nearest / 12);
  };
  // What is already hanging decides the question: if it puts the crate in an open bay, string nothing.
  const current = predict(crateType, point.x, point.y, velocity.vx, velocity.vy, windFor, state.spans);
  if (current.kind === 'bay' && worth(current) > 0) return null;
  const pegs = state.pegs;
  const pairs = [];
  for (let a = 0; a < pegs.length; a += 1) {
    for (let b = a + 1; b < pegs.length; b += 1) {
      const length = Math.hypot(pegs[b].x - pegs[a].x, pegs[b].y - pegs[a].y);
      if (length < SPAN.min || length > SPAN.max) continue;
      if (state.spans.some((span) => !span.broken && ((span.pegA === pegs[a] && span.pegB === pegs[b]) || (span.pegA === pegs[b] && span.pegB === pegs[a])))) continue;
      const span = new SilkSpan(pegs[a], pegs[b], -1);
      if (span.cost > state.reel) continue;
      const landing = predict(crateType, point.x, point.y, velocity.vx, velocity.vy, windFor, [...state.spans, span]);
      // A line this load would part is no line at all: the crate falls through it.
      const value = span.broken ? 0 : worth(landing);
      pairs.push({ a, b, length, value, landing, snapped: span.broken });
    }
  }
  if (!pairs.length) return null;
  // Best landing first, and the shortest line between equals: a tight line costs less silk.
  pairs.sort((left, right) => right.value - left.value || left.length - right.length);
  // A surer hand looks only at the best few pairs; a careless one considers most of the board.
  const considered = Math.max(1, Math.min(pairs.length, Math.round(pairs.length * (1 - 0.6 * skill))));
  const pickIndex = Math.floor(state.random.range(0, considered));
  const best = pairs[Math.min(pickIndex, pairs.length - 1)];
  if (best.value <= 0) return null;
  return best;
}

/**
 * Play the run forward while the rules allow it, stringing a span and letting each crate go as it
 * comes ready: how the screenshot scenes reach their moments. `afterStep` is called with the state
 * and the step index so a scene can watch for the frame it wants. Returns the tally so far.
 */
export function autopilot(state, seconds, skill = 1, afterStep = null) {
  const steps = Math.round(seconds / PACE.step);
  let planned = false;
  for (let index = 0; index < steps; index += 1) {
    if (state.phase !== PHASE.playing) break;
    if (!state.chute.active) planned = false;
    // One decision per crate, made while it is still on the cable, so the crate is thrown from the
    // cable's own end and the flight the search planned is the flight the game then plays out.
    if (state.chute.active && !planned && state.chute.t > 0.35 && state.chute.t < 0.95 && !state.pending) {
      // A hurried hand sometimes lets the crate go on whatever is already hanging.
      const distracted = state.random.next() > 0.75 + 0.25 * skill;
      const wanted = distracted ? null : chooseSpan(state, skill);
      if (wanted) stringBetween(state, wanted.a, wanted.b);
      planned = true;
    }
    update(state, PACE.step);
    if (afterStep) afterStep(state, index);
  }
  return { delivered: state.deliveries.length, lost: state.lost, score: state.result?.score ?? 0 };
}
