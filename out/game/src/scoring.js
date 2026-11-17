// Scoring, taken from the delivery log every time it is asked for. Nothing is accumulated as the
// game runs, so the number on the results screen cannot drift away from what actually happened,
// and a replay of the same log always gives the same score.
import { PACE } from './config.js';

/** The points one delivery is worth: its bay's value, lifted by a run of deliveries to that bay. */
export function deliveryPoints(deliveries) {
  let total = 0;
  let chain = 0;
  let previous = null;
  for (const delivery of deliveries) {
    chain = delivery.bay === previous ? chain + 1 : 1;
    previous = delivery.bay;
    total += delivery.value * (1 + PACE.chainStep * (chain - 1));
  }
  return total;
}

/** The single bay a run delivered to most often without a miss, and how long that run was. */
export function bestBayChain(deliveries) {
  let best = { bay: null, length: 0 };
  let chain = 0;
  let previous = null;
  for (const delivery of deliveries) {
    chain = delivery.bay === previous ? chain + 1 : 1;
    previous = delivery.bay;
    if (chain > best.length) best = { bay: delivery.bay, length: chain };
  }
  return best;
}

/**
 * The run's score: delivery points, plus the flat pay for every shipment cleared, plus the seconds
 * left on the clock when it was cleared. Read from the log and the clearance list alone.
 */
export function scoreOf(state) {
  let total = deliveryPoints(state.deliveries);
  for (const cleared of state.cleared) {
    total += cleared.need * 5 + Math.round(cleared.secondsLeft * PACE.bonusPerSecond);
  }
  return Math.round(total);
}

/** A short line for the results screen: how the run went, in the crew's own words. */
export function verdictOf(state) {
  if (!state.won) return 'The dock went quiet.';
  const accuracy = state.released > 0 ? state.deliveries.length / state.released : 0;
  if (accuracy >= 0.85) return 'Not one crate in the river.';
  if (accuracy >= 0.7) return 'A clean shipment, mostly.';
  return 'Held the dock, just.';
}
