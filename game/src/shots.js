// The three scenes behind ?shot=start|play|end, so the entry's screenshots are frames of the real
// rules rather than mock-ups. Each scene is staged from a fixed seed and played by the same
// autopilot the balance harness uses, so the same seed always gives the same frame.
import { PACE } from './config.js';
import { autopilot, chooseSpan } from './autopilot.js';
import { SHIPMENTS } from './shipments.js';

/** The scenes need no sound; this keeps the call shape identical to the game's own. */
function audiofree() {}

import { PHASE, beginShipment, startRun, stringBetween, update } from './state.js';

/** How long the play scene looks for its moment before it settles for whatever it has. */

/** Play a run forward, looking for the frame the play scene wants: a late shipment, gulls up, a
 *  line hanging and a crate in the air. Tries several seeds, because a run can be sunk before it
 *  gets there. Returns true when such a frame was caught. */
function catchLateFrame(state, baseSeed) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    startRun(state, baseSeed + attempt * 31);
    let planned = false;
    const steps = Math.round(260 / PACE.step);
    for (let index = 0; index < steps; index += 1) {
      if (state.phase !== PHASE.playing) break;
      if (!state.chute.active) planned = false;
      if (state.chute.active && !planned && state.chute.t > 0.35 && state.chute.t < 0.95 && !state.pending) {
        const wanted = chooseSpan(state, 1);
        if (wanted) stringBetween(state, wanted.a, wanted.b);
        planned = true;
      }
      update(state, PACE.step);
      const crate = state.flying[0];
      const live = state.spans.filter((span) => !span.broken).length;
      if (crate && live >= 1 && state.gulls.length >= 2 && state.shipmentIndex >= 5 && state.deliveries.length >= 3 && state.banner <= 0 && crate.x > 480 && crate.x < 940) {
        return true;
      }
    }
  }
  return false;
}

/** The stand-in: the first shipment, every bay open, caught with two lines and a crate in the air. */
function catchEarlyFrame(state, seed) {
  startRun(state, seed);
  state.bays = state.bays.map((bay) => ({ ...bay, open: true }));
  for (const [a, b] of [[0, 2], [2, 3]]) stringBetween(state, a, b);
  let planned = false;
  const steps = Math.round(120 / PACE.step);
  for (let index = 0; index < steps; index += 1) {
    if (!state.chute.active) planned = false;
    if (state.chute.active && !planned && state.chute.t > 0.35 && state.chute.t < 0.95 && !state.pending) {
      const wanted = chooseSpan(state, 1);
      if (wanted) stringBetween(state, wanted.a, wanted.b);
      planned = true;
    }
    update(state, PACE.step);
    const crate = state.flying[0];
    const live = state.spans.filter((span) => !span.broken).length;
    if (crate && live >= 2 && state.deliveries.length >= 2 && crate.x > 520 && crate.x < 920 && state.banner <= 0) return true;
  }
  return false;
}

export function stageShot(name, state, seed) {
  startRun(state, seed ?? state.seed);
  if (name !== 'play' && name !== 'end' && name !== 'strike') {
    // The title sits over a dressed gorge with every bay open and nothing running: the picture of
    // the game at its most complete, which is what a cover screenshot should show.
    state.bays = state.bays.map((bay) => ({ ...bay, open: true }));
    state.phase = PHASE.title;
    state.banner = 0;
    state.messages = [];
    return { name: 'start' };
  }
  if (name === 'strike') {
    // The moment a crate meets a line, played out by the autopilot's own plan: the frame is caught
    // just before the strike, with the guide ahead reading an open bay. Several seeds are tried,
    // because a frame like this needs a real throw to line up.
    const base = seed ?? state.seed;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      startRun(state, base + attempt * 13);
      beginShipment(state, 1);
      let planned = false;
      let caught = false;
      for (let step = 0; step < 14000 && !caught; step += 1) {
        if (state.phase !== PHASE.playing) break;
        if (!state.chute.active) planned = false;
        if (state.chute.active && !planned && state.chute.t > 0.35 && state.chute.t < 0.95 && !state.pending) {
          const wanted = chooseSpan(state, 1);
          if (wanted) stringBetween(state, wanted.a, wanted.b);
          planned = true;
        }
        update(state, PACE.step);
        const crate = state.flying[0];
        const live = state.spans.filter((span) => !span.broken);
        if (!crate || live.length < 1 || (state.shipmentDelivered ?? 0) < 2 || state.banner > 0) continue;
        let nearest = Infinity;
        for (const span of live) nearest = Math.min(nearest, span.nearest(crate.x, crate.y).distance);
        if (nearest < 88 && crate.vy > 0 && crate.x > 430) caught = true;
      }
      if (caught) break;
    }
    return { name: 'strike' };
  }
  if (name === 'end') {
    autopilot(state, 900, 1);
    if (state.phase === PHASE.playing) state.phase = PHASE.results;
    return { name: 'end' };
  }
  // The play scene is caught late in a real run: the route strip is well filled, the bays hold
  // stacks, the gulls are up and the crates in the air are of several kinds. A first-shipment
  // frame stands in when no run survives that far.
  const seedForPlay = seed ?? state.seed;
  if (!catchLateFrame(state, seedForPlay)) catchEarlyFrame(state, seedForPlay);
  return { name: 'play' };
}
