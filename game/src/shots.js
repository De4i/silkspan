// The three scenes behind ?shot=start|play|end, so the entry's screenshots are frames of the real
// rules rather than mock-ups. Each scene is staged from a fixed seed and played by the same
// autopilot the balance harness uses, so the same seed always gives the same frame.
import { PACE } from './config.js';
import { autopilot, chooseSpan } from './autopilot.js';
import { PHASE, startRun, stringBetween, update } from './state.js';

/** How long the play scene looks for its moment before it settles for whatever it has. */
const PLAY_LIMIT_SECONDS = 100;

export function stageShot(name, state, seed) {
  startRun(state, seed ?? state.seed);
  if (name !== 'play' && name !== 'end') {
    // The title sits over a dressed gorge: a shipment is loaded, but nothing is running yet.
    state.phase = PHASE.title;
    state.banner = 0;
    return { name: 'start' };
  }
  if (name === 'end') {
    autopilot(state, 900, 1);
    if (state.phase === PHASE.playing) state.phase = PHASE.results;
    return { name: 'end' };
  }
  // The play scene waits for a frame worth keeping: a line hanging, a crate in the air over the
  // gorge with its trail behind it, and the dock ahead.
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
    if (crate && live >= 1 && crate.x > 620 && crate.x < 900 && Math.abs(crate.vy) < 320 && state.banner <= 0) break;
  }
  return { name: 'play' };
}
