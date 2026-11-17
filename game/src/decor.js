// The dressing that makes the gorge a place rather than a diagram: cloud banks, haze over the far
// hills, a moored barge, foliage on the cliff, birds, the battened bays, and a frame vignette.
// Pure drawing from constants; it never reads the game state except where a bay says it is shut.
import { CLIFF, DOCK, FONT, PALETTE, WATER_Y, WORLD } from './config.js';

/** A soft cloud bank: overlapping ellipses with a light top and a shaded underside. */
function cloud(ctx, x, y, scale) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#ffffff';
  const lobes = [
    [0, 0, 54], [44, -12, 40], [86, 4, 34], [-38, 8, 34], [26, 14, 40],
  ];
  ctx.beginPath();
  for (const [dx, dy, r] of lobes) {
    ctx.moveTo(x + dx * scale + r * scale, y + dy * scale);
    ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#cfe3ea';
  ctx.beginPath();
  for (const [dx, dy, r] of lobes) {
    ctx.moveTo(x + dx * scale + r * scale, y + dy * scale + r * scale * 0.5);
    ctx.arc(x + dx * scale, y + dy * scale + r * scale * 0.4, r * scale * 0.8, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/** The sky's own furniture, in the order the sky wears it. */
export function drawSkyDecor(ctx) {
  cloud(ctx, 300, 118, 0.85);
  cloud(ctx, 690, 92, 1.05);
  cloud(ctx, 1020, 146, 0.7);
  cloud(ctx, 470, 214, 0.5);
  // A few birds riding the same air the crates do.
  ctx.save();
  ctx.strokeStyle = 'rgba(40,70,80,0.55)';
  ctx.lineWidth = 2;
  for (const [x, y, size] of [[860, 150, 11], [900, 168, 9], [936, 142, 7]]) {
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.quadraticCurveTo(x - size / 2, y - size * 0.7, x, y);
    ctx.quadraticCurveTo(x + size / 2, y - size * 0.7, x + size, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** A band of haze along the waterline, so the far hills sit behind the gorge instead of beside it. */
export function drawHorizonHaze(ctx) {
  const haze = ctx.createLinearGradient(0, WATER_Y - 170, 0, WATER_Y + 10);
  haze.addColorStop(0, 'rgba(226,242,244,0)');
  haze.addColorStop(0.6, 'rgba(226,242,244,0.55)');
  haze.addColorStop(1, 'rgba(226,242,244,0.8)');
  ctx.fillStyle = haze;
  ctx.fillRect(CLIFF.right - 60, WATER_Y - 170, DOCK.left - CLIFF.right + 120, 180);
}

/** The barge waiting at the dock, which is what the whole shipment is for. */
export function drawBarge(ctx) {
  const x = DOCK.right - 236;
  const y = WATER_Y - 6;
  ctx.save();
  ctx.fillStyle = '#8a5a34';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 210, y);
  ctx.lineTo(x + 186, y + 34);
  ctx.lineTo(x + 22, y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a97445';
  ctx.fillRect(x + 10, y - 12, 186, 12);
  ctx.fillStyle = '#6f4c2a';
  ctx.fillRect(x + 96, y - 86, 10, 74);
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.moveTo(x + 106, y - 84);
  ctx.lineTo(x + 156, y - 62);
  ctx.lineTo(x + 106, y - 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x + 4, y + 20, 198, 3);
  ctx.restore();
}

/** Foliage, a couple of crates and a coiled rope, so the crew's own ledge looks worked in. */
export function drawCliffDressing(ctx) {
  const tuft = (x, y, scale, color) => {
    ctx.save();
    ctx.fillStyle = color;
    for (let index = -2; index <= 2; index += 1) {
      ctx.beginPath();
      ctx.moveTo(x + index * 5 * scale, y);
      ctx.quadraticCurveTo(x + index * 9 * scale, y - 22 * scale, x + index * 15 * scale, y - 34 * scale);
      ctx.quadraticCurveTo(x + index * 8 * scale, y - 18 * scale, x + (index + 2) * 4 * scale, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  tuft(64, CLIFF.top - 34, 1.05, PALETTE.grassDark);
  tuft(196, CLIFF.top + 2, 0.9, PALETTE.grass);
  tuft(120, CLIFF.top - 40, 0.8, PALETTE.grass);
  ctx.save();
  ctx.fillStyle = '#c08a52';
  ctx.fillRect(150, CLIFF.top - 34, 34, 26);
  ctx.fillStyle = '#a06a3a';
  ctx.fillRect(150, CLIFF.top - 24, 34, 5);
  ctx.fillRect(150, CLIFF.top - 14, 34, 5);
  ctx.fillStyle = '#8d94a3';
  ctx.beginPath();
  ctx.ellipse(206, CLIFF.top - 12, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a7280';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(206, CLIFF.top - 12, 11, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A bay battened down for this shipment: crossbeams, a hatch and a small tag. */
export function drawShutBay(ctx, bay, label) {
  const width = bay.to - bay.from;
  const x = bay.from + 4;
  const y = DOCK.top + 26;
  ctx.save();
  ctx.fillStyle = 'rgba(60,40,22,0.55)';
  ctx.fillRect(x, y, width - 8, 46);
  ctx.strokeStyle = 'rgba(224,92,74,0.7)';
  ctx.lineWidth = 2;
  for (let offset = -46; offset < width; offset += 14) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + 46);
    ctx.lineTo(x + offset + 46, y);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.dockEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x + width - 8, y + 40);
  ctx.moveTo(x + width - 8, y + 6);
  ctx.lineTo(x, y + 40);
  ctx.stroke();
  ctx.restore();
  label(ctx, 'BATTENED', bay.from + width / 2, DOCK.top + 20, 14, PALETTE.danger, 'center');
}

/** Combed air across the far gorge, leaning the way the gust is pushing a falling crate. */
export function drawWindStreaks(ctx, reading = null) {
  const lean = reading ?? 0;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2.5;
  for (let index = 0; index < 5; index += 1) {
    const y = 250 + index * 46;
    const x = 300 + index * 92 - Math.abs(lean) * 60;
    const length = 60 + index * 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length / 2, y - 8 - lean * 6, x + length, y - lean * 12);
    ctx.stroke();
  }
  ctx.restore();
}

/** A dark frame around the playfield, which gives the bright gorge some weight. */
export function drawVignette(ctx) {
  const vignette = ctx.createRadialGradient(WORLD.width / 2, WORLD.height * 0.45, WORLD.height * 0.45, WORLD.width / 2, WORLD.height * 0.5, WORLD.width * 0.72);
  vignette.addColorStop(0, 'rgba(20,50,58,0)');
  vignette.addColorStop(1, 'rgba(20,50,58,0.30)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

/** Small silk knots drawn on the masts, so a bare post still reads as a place to tie a line. */
export function drawMastDressing(ctx, pegs) {
  ctx.save();
  for (const peg of pegs) {
    if (peg.kind !== 'mast') continue;
    ctx.strokeStyle = 'rgba(243,230,200,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y - 18, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The game's name plate, used on the title screen and nowhere else. */
export function drawNamePlate(ctx, label) {
  ctx.save();
  ctx.font = `800 18px ${FONT}`;
  ctx.fillStyle = PALETTE.ink;
  ctx.restore();
  label(ctx, 'SILKSPAN', 26, 44, 24, PALETTE.ink, 'left', '800');
  label(ctx, 'a silk-line crate game', 26, 66, 15, 'rgba(29,59,63,0.75)', 'left');
}
