// The dockmaster's panel along the bottom of the screen: which shipment is up, how much of the
// quota is on the dock, how long is left, what the reel still holds and what the wind is doing.
// Drawing only; every number is read out of the state or derived from it on the spot.
import { PACE, PALETTE, WORLD } from './config.js';
import { scoreOf } from './scoring.js';
import { SHIPMENTS } from './shipments.js';
import { REEL_FULL } from './state.js';

/** A rounded rectangle path, with a plain rectangle for anything that lacks the roundRect call. */
function bar(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, height / 2);
  else ctx.rect(x, y, width, height);
  ctx.fill();
}

/** A labelled bar: its track, how full it is, and the reading on its right. */
function meter(ctx, drawLabel, text, x, y, width, share, color, reading) {
  const height = 13;
  bar(ctx, x, y, width, height, 'rgba(255,255,255,0.15)');
  bar(ctx, x, y, Math.max(2, Math.max(0, Math.min(1, share)) * width), height, color);
  drawLabel(ctx, reading, x + width, y - 7, 16, PALETTE.text, 'right');
  drawLabel(ctx, text, x, y - 7, 16, PALETTE.muted, 'left');
}

export function drawHud(ctx, state, extras) {
  const label = extras.label;
  const panelHeight = 124;
  const top = WORLD.height - panelHeight;
  ctx.save();
  ctx.fillStyle = 'rgba(11,42,49,0.9)';
  ctx.fillRect(0, top, WORLD.width, panelHeight);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, top, WORLD.width, 3);
  ctx.restore();

  const shipment = state.shipment;
  const delivered = state.shipmentDelivered ?? 0;
  const clock = Math.max(0, state.shipmentTime);
  const clockShare = clock / shipment.seconds;
  const slack = shipment.slack ?? PACE.slack;

  label(ctx, `SHIPMENT ${state.shipmentIndex + 1} / ${SHIPMENTS.length}   ${shipment.name}`, 26, top + 32, 23, PALETTE.accent, 'left');
  label(
    ctx,
    `${delivered} / ${shipment.need} crates on the dock`,
    26,
    top + 62,
    20,
    delivered >= shipment.need ? PALETTE.good : PALETTE.text,
    'left',
  );
  label(
    ctx,
    `crates in hand  ${'●'.repeat(Math.max(0, state.lives))}${'○'.repeat(Math.max(0, slack - state.lives))}`,
    26,
    top + 92,
    19,
    state.lives <= 1 ? PALETTE.danger : PALETTE.text,
    'left',
  );

  meter(ctx, label, 'SILK', 322, top + 74, 170, state.reel / REEL_FULL, PALETTE.silk, `${Math.round(state.reel)} m`);
  meter(ctx, label, 'CLOCK', 534, top + 74, 170, clockShare, clockShare < 0.25 ? PALETTE.danger : PALETTE.good, `${clock.toFixed(0)}s`);

  // The wind: a needle in a track, and the words for what it is doing.
  const wind = state.windReading ?? 0;
  const trackX = 748;
  const trackY = top + 46;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(trackX, trackY, 172, 10);
  ctx.fillStyle = Math.abs(wind) > 0.6 ? PALETTE.danger : PALETTE.accent;
  ctx.fillRect(trackX + 86 + wind * 82 - 3, trackY - 6, 6, 22);
  ctx.restore();
  label(ctx, 'WIND', trackX, trackY - 8, 16, PALETTE.muted, 'left');
  label(ctx, Math.abs(wind) < 0.08 ? 'still' : wind > 0 ? 'downstream' : 'upstream', trackX + 172, trackY - 8, 16, PALETTE.text, 'right');

  label(ctx, `SCORE ${scoreOf(state)}`, WORLD.width - 26, top + 38, 26, PALETTE.text, 'right');
  label(ctx, `best ${extras.best}`, WORLD.width - 26, top + 64, 17, PALETTE.muted, 'right');
  label(ctx, 'drag post to post to string silk  ·  right-click cuts a line  ·  SPACE throws the crate early  ·  P pauses', WORLD.width / 2, top + 114, 15, PALETTE.muted, 'center');
}
