// The three scenes behind ?shot=start|play|end, so the entry's screenshots are frames of the real
// rules rather than mock-ups. Each scene is staged from a fixed seed and played by the same
// autopilot the balance harness uses, so the same seed always gives the same frame.
import { PACE } from './config.js';
import { autopilot, chooseSpan } from './autopilot.js';

/** The scenes need no sound; this keeps the call shape identical to the game's own. */
function audiofree() {}

import { PHASE, beginShipment, startRun, stringBetween, update } from './state.js';

/** How long the play scene looks for its moment before it settles for whatever it has. */
const PLAY_LIMIT_SECONDS = 100;

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
    // The moment a crate meets a line: a span under load, the crate on it, and the guide ahead.
    beginShipment(state, 1);
    for (const [a, b] of [[0, 2], [2, 3]]) {
      const span = stringBetween(state, a, b);
      if (span.ok) audiofree();
    }
    for (let step = 0; step < 12000; step += 1) {
      const crate = state.flying[0];
      const live = state.spans.filter((span) => !span.broken);
      if (crate && live.length >= 1) {
        const hit = live[0].nearest(crate.x, crate.y);
        if (hit.distance < 46 && crate.vy > 0 && crate.x > 420) break;
      }
      update(state, PACE.step);
    }
    return { name: 'strike' };
  }
  if (name === 'end') {
    autopilot(state, 900, 1);
    if (state.phase === PHASE.playing) state.phase = PHASE.results;
    return { name: 'end' };
  }
  // The play scene is played a little way in before it is caught: every bay is open, some crates
  // are already stacked on the dock and a line is hanging, so the frame shows the game in progress
  // rather than at its very first throw.
  state.bays = state.bays.map((bay) => ({ ...bay, open: true }));
  // Two lines hanging at once, so the frame shows the choice the game is made of.
  for (const [a, b] of [[0, 2], [2, 3]]) stringBetween(state, a, b);
  let planned = false;
  const steps = Math.round(PLAY_LIMIT_SECONDS / PACE.step);
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
    const enough = state.deliveries.length >= 3 && state.spans.filter((span) => !span.broken).length >= 2;
    if (crate && live >= 2 && enough && crate.x > 560 && crate.x < 940 && Math.abs(crate.vy) < 340 && state.banner <= 0) break;
  }
  return { name: 'play' };
}
