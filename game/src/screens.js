// The three still screens: the title, and the results that end a run either way. The playing
// screen is the gorge itself with the HUD over it, so nothing is drawn here for that.
import { PALETTE, WORLD } from './config.js';
import { SHIPMENTS } from './shipments.js';
import { scoreOf } from './scoring.js';

/** A panel centred on the gorge, with a heading, some lines and a prompt. */
function panel(ctx, label, { heading, lines, prompt, width = 720, accent = PALETTE.accent }) {
  const height = 168 + lines.length * 30;
  const x = (WORLD.width - width) / 2;
  const y = (WORLD.height - height) / 2 - 40;
  ctx.save();
  ctx.fillStyle = 'rgba(11,42,49,0.94)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  label(ctx, heading, WORLD.width / 2, y + 62, 44, PALETTE.text, 'center');
  lines.forEach((line, index) => label(ctx, line, WORLD.width / 2, y + 110 + index * 30, 21, PALETTE.muted, 'center'));
  label(ctx, prompt, WORLD.width / 2, y + height - 34, 24, accent, 'center');
  ctx.restore();
}

export function drawTitle(ctx, extras) {
  ctx.save();
  ctx.fillStyle = 'rgba(9,28,33,0.42)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();
  panel(ctx, extras.label, {
    heading: 'SILKSPAN',
    lines: [
      'String taut silk between the posts and sling the harvest crates home.',
      'Drag from one peg to another to hang a line. The crate is thrown from the chute',
      'and leaves the line along its own bounce: a short tight span throws it far,',
      'a long loose one drops it short. Guide it into the bays of the loading dock.',
      'Wicker shells crack on a tight line. Anvils leave a line hot.',
      `Clear all ${SHIPMENTS.length} shipments before the barge sails.`,
      extras.best > 0 ? `Best score on this machine: ${extras.best}` : 'No run on this machine yet.',
    ],
    prompt: 'Press SPACE, or click, to start',
  });
}

export function drawResults(ctx, state, extras) {
  const result = extras.result ?? {};
  ctx.save();
  ctx.fillStyle = 'rgba(9,28,33,0.5)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();
  const accuracy = Math.round((result.accuracy ?? 0) * 100);
  panel(ctx, extras.label, {
    heading: result.won ? 'THE BARGE IS LOADED' : 'THE DOCK WENT QUIET',
    accent: result.won ? PALETTE.good : PALETTE.danger,
    lines: [
      result.verdict ?? '',
      `Crates on the dock: ${result.delivered ?? 0}   ·   crates lost: ${result.lost ?? 0}   ·   thrown: ${result.released ?? 0}`,
      `Shipments cleared: ${result.cleared ?? 0} of ${SHIPMENTS.length}   ·   clean landings: ${accuracy}%`,
      `Longest run of crates into one bay: ${result.bestChain?.length ?? 0}`,
      `Score: ${scoreOf(state)}   ·   best on this machine: ${extras.best ?? 0}`,
      result.reason === 'clock' ? 'The clock beat the crew this time.' : result.reason === 'slack' ? 'Too many crates went into the river.' : '',
    ].filter(Boolean),
    prompt: 'Press SPACE, or click, to run it again',
  });
}
