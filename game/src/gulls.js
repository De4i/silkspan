// The gulls of the gorge: the one hazard that does not come from the chute. They cruise across the
// gap on their own wind, take an interest in anything flying, and a crate they touch is knocked off
// its line. They are the reason to watch the air as well as the silk, and they are drawn like the
// rest of the world: shapes, no sprites, nothing loaded.
import { GULL, WORLD } from './config.js';

/** How far a gull notices a crate, and how hard it shoves one when it reaches it. */
const NOTICE = 185;
const KNOCK_X = 120;
const KNOCK_Y = 55;

/** The gulls a shipment brings, laid out from the shipment's own data and the run's seed. */
export function createGulls(shipment, random) {
  const gulls = [];
  const count = Math.max(0, shipment.gulls?.count ?? 0);
  for (let index = 0; index < count; index += 1) {
    gulls.push(makeGull(random, index, count, shipment.gulls));
  }
  return gulls;
}

/** One gull: a patrolling band, a phase for its bob, and a cooldown after a strike. */
export function makeGull(random, index, count, settings) {
  const cruise = settings?.speed ?? GULL.cruise;
  const fromLeft = index % 2 === 0;
  return {
    x: fromLeft ? -40 - index * 40 : WORLD.width + 40 + index * 40,
    y: (settings?.height ?? GULL.height) + random.range(-26, 26),
    vx: (fromLeft ? 1 : -1) * cruise * random.range(0.85, 1.15),
    vy: 0,
    phase: random.range(0, Math.PI * 2),
    bob: random.range(0.7, 1.3),
    dive: 0,
    cooldown: random.range(0, 1),
    wing: 0,
  };
}

/**
 * Move every gull one step: cruise across the gorge with a slow bob, dive at a crate that comes
 * close, and shove it sideways when it reaches it. Returns the crates it knocked, so the caller can
 * show the player what happened.
 */
export function stepGulls(gulls, crates, dt) {
  const knocked = [];
  for (const gull of gulls) {
    gull.wing += dt * 7;
    gull.cooldown = Math.max(0, gull.cooldown - dt);
    let target = null;
    if (gull.cooldown <= 0) {
      let best = NOTICE;
      for (const crate of crates) {
        const distance = Math.hypot(crate.x - gull.x, crate.y - gull.y);
        if (distance < best) {
          best = distance;
          target = crate;
        }
      }
    }
    if (target) {
      gull.dive = Math.min(1, gull.dive + dt * 2.4);
      const dx = target.x - gull.x;
      const dy = target.y - gull.y;
      const length = Math.hypot(dx, dy) || 1;
      const speed = GULL.dive;
      gull.vx += ((dx / length) * speed - gull.vx * 0.06) * dt * 3;
      gull.vy += ((dy / length) * speed - gull.vy * 0.06) * dt * 3;
    } else {
      gull.dive = Math.max(0, gull.dive - dt * 1.4);
      const home = (gull.y > GULL.height ? -1 : 1) * 26;
      gull.vx += (Math.sign(gull.vx) * (GULL.cruise - Math.abs(gull.vx))) * dt * 0.9;
      gull.vy += (home - gull.vy) * dt * 1.2;
    }
    gull.x += gull.vx * dt;
    gull.y += gull.vy * dt + Math.sin(gull.wing / 2 + gull.phase) * gull.bob * dt * 14;
    if (target && Math.hypot(target.x - gull.x, target.y - gull.y) < target.radius + 12) {
      knocked.push({ gull, crate: knockCrate(target, gull) });
      gull.cooldown = GULL.cooldown;
      gull.dive = 0;
      gull.vy = -40;
    }
    // Round the gorge: a gull never leaves the playfield for long.
    if (gull.x < -120) gull.x = WORLD.width + 100;
    if (gull.x > WORLD.width + 120) gull.x = -100;
    gull.y = Math.max(120, Math.min(560, gull.y));
  }
  return knocked;
}

/** What a gull does to a crate it reaches: a hard shove across and down, and a spin. */
export function knockCrate(crate, gull) {
  const side = Math.sign(gull.vx) || 1;
  crate.vx += side * KNOCK_X;
  crate.vy += KNOCK_Y;
  crate.spinRate += side * 3.2;
  crate.knocked += 1;
  return { x: gull.x, y: gull.y, side };
}
