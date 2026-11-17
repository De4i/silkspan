// SILKSPAN's seeded generator: gusts, crate types and the delivery order all come from one of
// these, so a seed replays exactly and a screenshot scene can be rebuilt frame for frame.

/** xorshift32: three shifts and three logic ops, stable across engines and plenty for gameplay. */
export function createRandom(seed) {
  let state = (seed | 0) || 0x9e3779b9;

  /** The next value in [0, 1). */
  function next() {
    state ^= state << 13;
    state |= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state |= 0;
    return (state >>> 0) / 4294967296;
  }

  /** The next value in [low, high). */
  function range(low, high) {
    return low + (high - low) * next();
  }

  /** One entry of `list`, chosen by the generator. */
  function pick(list) {
    return list[Math.min(list.length - 1, Math.floor(next() * list.length))];
  }

  /** The generator's own state, for a deterministic replay. */
  function save() {
    return state;
  }

  /** Put the generator back where `save` found it. */
  function restore(value) {
    state = value | 0;
  }

  return { next, range, pick, save, restore };
}

/** A shuffled copy of `list`, so a shipment's crate order can vary without losing its mix. */
export function shuffled(list, random) {
  const out = list.slice();
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random.next() * (index + 1));
    const held = out[index];
    out[index] = out[swap];
    out[swap] = held;
  }
  return out;
}
