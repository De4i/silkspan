// A silk span: the taut line a player strings between two pegs, and everything a crate feels from
// it. The line's resting shape is computed once, from its two pegs and its slack, so the same span
// always hangs the same way in the game and in the search that plans a throw. A strike only pushes
// the line out of that shape; each node then springs back to where it belongs.
import { SILK, SPAN } from './config.js';

/** Clamp a number into [low, high]. */
function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export class SilkSpan {
  constructor(pegA, pegB, id) {
    this.id = id;
    this.pegA = pegA;
    this.pegB = pegB;
    this.length = Math.hypot(pegB.x - pegA.x, pegB.y - pegA.y);
    /** 0 is a tight short line, 1 a long floppy one. */
    this.slack = clamp((this.length - SPAN.min) / (SPAN.max - SPAN.min), 0, 1);
    /** How deep this line hangs at its middle, in pixels. */
    this.sag = SILK.sagSlack * this.slack * this.length;
    this.nodes = [];
    const segments = SILK.nodes + 1;
    for (let index = 0; index < SILK.nodes; index += 1) {
      const t = (index + 1) / segments;
      const rest = {
        x: pegA.x + (pegB.x - pegA.x) * t,
        y: pegA.y + (pegB.y - pegA.y) * t + this.sag * Math.sin(Math.PI * t),
      };
      this.nodes.push({ x: rest.x, y: rest.y, rest, ox: 0, oy: 0, ovx: 0, ovy: 0 });
    }
    this.broken = false;
    this.flash = 0;
    this.strain = 0;
    this.hits = 0;
  }

  /** How tight the line is: 1 a short span, 0 the longest reach allowed. */
  get tension() {
    return 1 - this.slack;
  }

  /** Silk this span costs from the shipment's reel. */
  get cost() {
    return Math.ceil(this.length * SILK.costPerPixel);
  }

  /** Distance from the span to `x, y`, and the segment that is nearest. */
  nearest(x, y) {
    let best = { distance: Infinity, segment: 0, px: x, py: y };
    for (let index = 0; index <= this.nodes.length; index += 1) {
      const from = index === 0 ? this.pegA : this.nodes[index - 1];
      const to = index === this.nodes.length ? this.pegB : this.nodes[index];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const span = dx * dx + dy * dy || 1;
      const t = clamp(((x - from.x) * dx + (y - from.y) * dy) / span, 0, 1);
      const px = from.x + dx * t;
      const py = from.y + dy * t;
      const distance = Math.hypot(x - px, y - py);
      if (distance < best.distance) best = { distance, segment: index, px, py };
    }
    return best;
  }

  /**
   * Advance the line one step of `dt` seconds: each node is pulled back toward the shape it was
   * strung in by its own spring, and the push is spread along the line so a struck span dips like
   * a line rather than nine separate beads.
   */
  step(dt) {
    if (this.broken) return;
    for (const node of this.nodes) {
      node.ovx += (-SILK.springStiffness * node.ox - SILK.springDamping * node.ovx) * dt;
      node.ovy += (-SILK.springStiffness * node.oy - SILK.springDamping * node.ovy) * dt;
      node.ox += node.ovx * dt;
      node.oy += node.ovy * dt;
    }
    const nodes = this.nodes;
    for (let index = 0; index < nodes.length; index += 1) {
      const left = nodes[index - 1] ?? nodes[index];
      const right = nodes[index + 1] ?? nodes[index];
      nodes[index].ox += ((left.ox + right.ox) / 2 - nodes[index].ox) * SILK.deformSpread;
      nodes[index].oy += ((left.oy + right.oy) / 2 - nodes[index].oy) * SILK.deformSpread;
    }
    for (const node of nodes) {
      node.x = node.rest.x + node.ox;
      node.y = node.rest.y + node.oy;
    }
    this.strain = Math.max(0, this.strain - dt * SILK.strainDecay);
    this.flash = Math.max(0, this.flash - dt * 2.6);
  }

  /**
   * Take a crate's landing and sling it off the line. The crate leaves along its own reflected
   * path, scaled by how tight the line is: a short, taut span gives back more than it took and
   * throws the crate on, a long loose one soaks the landing up and drops it short. A crate whose
   * shell cannot take this line's tension cracks here instead. Returns the crate's new velocity,
   * or null when the aim missed the span or the crate is already moving away from it.
   */
  strike(crate) {
    const { x, y, vx, vy, radius, mass } = crate;
    const hit = this.nearest(x, y);
    if (hit.distance > radius || this.broken) return null;
    const dx = x - hit.px;
    const dy = y - hit.py;
    const distance = Math.hypot(dx, dy) || 0.0001;
    const nx = dx / distance;
    const ny = dy / distance;
    const closing = vx * nx + vy * ny;
    if (closing > 0) return null;
    const impulse = Math.abs(closing) * mass;
    this.flash = Math.min(1, this.flash + impulse / 220);
    this.hits += 1;
    this.strain += (impulse * SILK.strainPerImpulse) / (1.15 + this.tension);
    if (this.strain >= SILK.snapStrain * (0.65 + 0.35 * this.tension)) this.broken = true;
    const softAbove = crate.type?.softAbove ?? 1.2;
    if (this.tension > softAbove) {
      return { cracked: true, vx, vy, impulse, spanBroken: this.broken };
    }
    // The crate's own weight changes the bounce, measured against the standard crate: a heavy
    // anvil leaves a line hot, a light wicker crate leaves it soft. That is what makes the type
    // of the crate on the cable part of the choice of line.
    const gainScale = 1 + SILK.gainMassStep * (mass - SILK.gainMassYardstick);
    const gain = (SILK.gainBase + SILK.gainTension * this.tension) * gainScale;
    const kick = SILK.kickTension * this.tension;
    const reflectedX = vx - 2 * closing * nx;
    const reflectedY = vy - 2 * closing * ny;
    let outVx = reflectedX * gain + nx * kick;
    let outVy = reflectedY * gain + ny * kick;
    const outSpeed = Math.hypot(outVx, outVy);
    if (outSpeed > SILK.launchMax) {
      outVx = (outVx / outSpeed) * SILK.launchMax;
      outVy = (outVy / outSpeed) * SILK.launchMax;
    }
    // Show the strike: the nodes near the hit are shoved along the way the crate was travelling.
    const push = (SILK.impulseShare * mass * Math.abs(closing)) / 900;
    for (const node of this.nodes) {
      const falloff = 1 / (1 + Math.hypot(node.x - x, node.y - y) / 80);
      node.ox += vx * push * falloff * 0.06;
      node.oy += (vy * push * falloff * 0.06) + 5 * falloff * mass * 0.2;
      node.ovx += vx * push * falloff * 0.02;
      node.ovy += vy * push * falloff * 0.02;
    }
    return { cracked: false, vx: outVx, vy: outVy, impulse, spanBroken: this.broken };
  }
}

/** Train a new span between two pegs, or null when the pair is out of reach, too short, or the deck is full. */
export function stringSpan(pegs, indexA, indexB, spans) {
  if (indexA === indexB) return null;
  const pegA = pegs[indexA];
  const pegB = pegs[indexB];
  if (!pegA || !pegB) return null;
  const length = Math.hypot(pegB.x - pegA.x, pegB.y - pegA.y);
  if (length < SPAN.min || length > SPAN.max) return null;
  if (spans.some((span) => !span.broken && ((span.pegA === pegA && span.pegB === pegB) || (span.pegA === pegB && span.pegB === pegA)))) {
    return null;
  }
  const live = spans.filter((span) => !span.broken).length;
  if (live >= SPAN.maxLive) return null;
  return new SilkSpan(pegA, pegB, spans.length);
}
