// The motion of the game: the chute cable a crate rides, the wind, gravity and drag on a falling
// crate, the strike of a crate on a silk span, and where a crate ends up (a bay, the deck, the
// cliff face, the river or clean out of the gorge). Pure functions over plain data, so the
// headless balance harness can run all of it with no canvas and no browser.
import { AIR_DRAG, AIR_WIND_SHARE, CHUTE, CLIFF, DOCK, GRAVITY, SILK, WATER_Y, WORLD, WIND } from './config.js';

/** A point on the chute cable at `t` in [0, 1], with the cable's own curve. */
export function cablePoint(t) {
  const u = 1 - t;
  return {
    x: u * u * CHUTE.x0 + 2 * u * t * CHUTE.cx + t * t * CHUTE.x1,
    y: u * u * CHUTE.y0 + 2 * u * t * CHUTE.cy + t * t * CHUTE.y1,
  };
}

/** The velocity a crate has as the cable lets it go at `t`: the curve's tangent, at throw speed. */
export function cableVelocity(t) {
  const u = 1 - t;
  const dx = 2 * u * (CHUTE.cx - CHUTE.x0) + 2 * t * (CHUTE.x1 - CHUTE.cx);
  const dy = 2 * u * (CHUTE.cy - CHUTE.y0) + 2 * t * (CHUTE.y1 - CHUTE.cy);
  const length = Math.hypot(dx, dy) || 1;
  return { vx: (dx / length) * CHUTE.launch, vy: (dy / length) * CHUTE.launch };
}

/**
 * The sideways acceleration of the air at `seconds` into a shipment: a steady drift plus one slow
 * gust, kept inside the wind's ceiling so a crate is always playable.
 */
export function windAccelAt(wind, seconds) {
  const gust = Math.sin((seconds / Math.max(0.5, wind.period)) * Math.PI * 2 + wind.phase);
  const raw = wind.base + wind.gust * gust;
  return Math.max(-WIND.maxAccel, Math.min(WIND.maxAccel, raw));
}

/** The wind as the HUD shows it: a signed strength in [-1, 1]. */
export function windReading(accel) {
  return Math.max(-1, Math.min(1, accel / WIND.maxAccel));
}

/** Make a crate of `type` at `x, y` moving at `vx, vy`. */
export function makeCrate(type, x, y, vx, vy) {
  return {
    type,
    x,
    y,
    vx,
    vy,
    radius: type.radius,
    mass: type.mass,
    spin: 0,
    spinRate: (vx + vy) * 0.004,
    trail: [],
    fate: null,
    bay: null,
    /** Seconds left before this crate will feel another span, so one landing is one launch. */
    cooldown: 0,
  };
}

/** Advance a flying crate by `dt` under gravity, drag and the wind. */
export function stepCrate(crate, dt, windAccel) {
  crate.vy += GRAVITY * dt;
  crate.vx += windAccel * AIR_WIND_SHARE * dt;
  const drag = Math.max(0, 1 - AIR_DRAG * dt);
  crate.vx *= drag;
  crate.vy *= drag;
  crate.x += crate.vx * dt;
  crate.y += crate.vy * dt;
  crate.spin += crate.spinRate * dt;
  if (crate.cooldown > 0) crate.cooldown = Math.max(0, crate.cooldown - dt);
}

/** The bay a crate settles into at `x`, or null when it lands on the deck between the bays. */
export function bayAt(x) {
  for (const bay of DOCK.bays) {
    if (x >= bay.from && x <= bay.to) return bay;
  }
  return null;
}

/**
 * Where a crate at `x, y` of `radius` has arrived, as one of 'bay', 'deck', 'cliff', 'river' or
 * 'overshoot', or null while it is still flying. `impact` is how fast it was going, so a wicker
 * shell can be judged too.
 */
export function landingOf(crate) {
  const { x, y, radius } = crate;
  if (y - radius > WATER_Y && x < DOCK.left) return { kind: 'river', bay: null };
  if (y - radius > WORLD.height + 80) return { kind: 'river', bay: null };
  if (x - radius > WORLD.width + 60) return { kind: 'overshoot', bay: null };
  if (y + radius >= DOCK.top && x >= DOCK.left) {
    if (crate.vy < 0) return null;
    const bay = bayAt(x);
    if (bay) return { kind: 'bay', bay };
    return { kind: 'deck', bay: null };
  }
  if (x + radius >= DOCK.left && y + radius >= DOCK.top && y < DOCK.top + 40) {
    return { kind: 'deck', bay: null };
  }
  if (x - radius <= CLIFF.right && y + radius >= CLIFF.top) return { kind: 'cliff', bay: null };
  return null;
}

/**
 * Let a crate strike every live span it overlaps, oldest first, and return the spans it broke and
 * the hardest impulse the crate took, which is what decides a wicker shell.
 * A boulder of a crate can part a tight line; that is the span's own business (see silk.js).
 */
export function strikeSpans(crate, spans) {
  const broken = [];
  let impulse = 0;
  let cracked = false;
  if (crate.cooldown > 0) return { broken, impulse, cracked };
  for (const span of spans) {
    if (span.broken) continue;
    const result = span.strike(crate);
    if (!result) continue;
    impulse = Math.max(impulse, result.impulse);
    if (result.cracked) {
      cracked = true;
      continue;
    }
    crate.vx = result.vx;
    crate.vy = result.vy;
    crate.spinRate += result.impulse * 0.0006 * Math.sign(crate.vx || 1);
    crate.cooldown = SILK.hitCooldown;
    if (result.spanBroken) broken.push(span);
  }
  return { broken, impulse, cracked };
}

/** Keep a crate inside the gorge's own walls: the world's floor and the playfield's edges. */
export function clampToGorge(crate) {
  if (crate.x < crate.radius) {
    crate.x = crate.radius;
    crate.vx = Math.abs(crate.vx) * 0.4;
  }
  if (crate.x > WORLD.width - crate.radius) {
    crate.x = WORLD.width - crate.radius;
    crate.vx = -Math.abs(crate.vx) * 0.4;
  }
}
