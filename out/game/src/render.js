// Painting the gorge: sky, water, cliff, masts, dock, and the silk itself. This module draws only
// what the state says is there; it never advances anything. The 1280x720 playfield is scaled to
// fit the window and centred, so a screenshot and a play field are the same picture.
import { CLIFF, DOCK, FONT, PALETTE, SILK, WATER_Y, WORLD } from './config.js';
import { cablePoint, windReading } from './physics.js';
import { drawHud } from './hud.js';
import { drawResults, drawTitle } from './screens.js';

/** A rounded rectangle path, the shape most of this scene is built from. */
function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** A filled polygon from a list of points. */
function polygon(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
  ctx.closePath();
  ctx.fill();
}

/** Text with the game's one font, leaving the context as it found it. */
export function label(ctx, value, x, y, size, color, align = 'left', weight = '600') {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / WORLD.width, height / WORLD.height);
    view.x = (width - WORLD.width * view.scale) / 2;
    view.y = (height - WORLD.height * view.scale) / 2;
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyHorizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    const glow = ctx.createRadialGradient(120, 96, 10, 120, 96, 260);
    glow.addColorStop(0, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255,226,138,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 520, 420);
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(120, 96, 44, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Hills behind the gorge, so the horizon is layered instead of a single line. */
  function drawHills() {
    polygon(ctx, [[0, 300], [0, 250], [140, 196], [300, 236], [430, 200], [560, 248], [700, 214], [860, 258], [1020, 210], [1180, 246], [1280, 224], [1280, 320], [0, 320]], PALETTE.cliffFar);
    polygon(ctx, [[0, 328], [0, 286], [180, 244], [360, 286], [520, 250], [680, 292], [840, 258], [1000, 296], [1160, 262], [1280, 292], [1280, 360], [0, 360]], PALETTE.cliffMid);
  }

  function drawWater() {
    const water = ctx.createLinearGradient(0, WATER_Y - 40, 0, WORLD.height);
    water.addColorStop(0, PALETTE.waterLight);
    water.addColorStop(0.35, PALETTE.water);
    water.addColorStop(1, '#2c7f9d');
    ctx.fillStyle = water;
    ctx.fillRect(CLIFF.right, WATER_Y - 40, DOCK.left - CLIFF.right, WORLD.height - WATER_Y + 40);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PALETTE.foam;
    ctx.lineWidth = 2;
    for (let index = 0; index < 7; index += 1) {
      const y = WATER_Y - 26 + index * 16;
      ctx.beginPath();
      for (let x = CLIFF.right + 12; x < DOCK.left - 8; x += 18) {
        ctx.lineTo(x, y + Math.sin((x + index * 40) / 46) * 3);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The near cliff the tower stands on, its terraces and its bracket. */
  function drawCliff() {
    polygon(ctx, [[0, CLIFF.top - 26], [86, CLIFF.top - 40], [152, CLIFF.top - 18], [CLIFF.right, CLIFF.top], [CLIFF.right, WORLD.height], [0, WORLD.height]], PALETTE.cliffNear);
    ctx.fillStyle = PALETTE.grass;
    ctx.beginPath();
    ctx.moveTo(0, CLIFF.top - 26);
    ctx.lineTo(86, CLIFF.top - 40);
    ctx.lineTo(152, CLIFF.top - 18);
    ctx.lineTo(CLIFF.right, CLIFF.top);
    ctx.lineTo(CLIFF.right, CLIFF.top + 12);
    ctx.lineTo(0, CLIFF.top - 4);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 3;
    for (let index = 0; index < 5; index += 1) {
      const y = CLIFF.top + 46 + index * 52;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CLIFF.right - 30 - index * 12, y - 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The chute: a tower on the cliff and the cable a crate rides to the lip of the gorge. */
  function drawChute(state) {
    const top = cablePoint(0);
    ctx.save();
    ctx.fillStyle = PALETTE.peg;
    ctx.fillRect(top.x - 6, top.y + 10, 12, CLIFF.top - top.y - 18);
    ctx.fillRect(top.x - 34, top.y + 40, 68, 8);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#4d3b28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let index = 0; index <= 24; index += 1) {
      const point = cablePoint(index / 24);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
    // The windsock on the tower leans with whatever the gust is doing, so the wind is visible.
    const lean = state.windReading * 0.9;
    ctx.save();
    ctx.translate(top.x + 30, top.y + 34);
    ctx.rotate(lean);
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(46, -13);
    ctx.lineTo(46, 13);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // The crate riding the cable, mid-flight down the chute.
    if (state.chute.active) {
      const point = cablePoint(state.chute.t);
      drawCrate(ctx, { x: point.x, y: point.y - 12, radius: state.chute.type.radius, type: state.chute.type, spin: 0.1 });
    }
  }

  /** The masts standing in the gorge, each carrying the silk knots the player strings between. */
  function drawMasts(state) {
    const columns = new Map();
    for (const peg of state.pegs) {
      if (peg.kind === 'mast' && !columns.has(peg.x)) columns.set(peg.x, []);
      if (peg.kind === 'mast') columns.get(peg.x).push(peg);
    }
    for (const [x, pegs] of columns) {
      const highest = Math.min(...pegs.map((peg) => peg.y)) - 30;
      ctx.fillStyle = PALETTE.peg;
      ctx.fillRect(x - 9, highest, 18, WATER_Y - highest);
      ctx.fillStyle = '#6f4c2a';
      ctx.fillRect(x - 11, highest + 6, 22, 6);
      ctx.fillStyle = PALETTE.pegKnot;
      ctx.fillRect(x - 3, highest + WATER_Y - highest - 4, 6, 4);
    }
  }

  /** One peg: a knot of rope at a mast, a bracket on the cliff or a rail on the dock. */
  function drawPeg(ctx2, peg, highlighted) {
    ctx2.save();
    if (peg.kind === 'cliff') {
      ctx2.fillStyle = PALETTE.peg;
      ctx2.fillRect(peg.x - 4, peg.y - 8, 34, 12);
      ctx2.beginPath();
      ctx2.moveTo(peg.x + 30, peg.y + 4);
      ctx2.lineTo(peg.x + 8, peg.y + 30);
      ctx2.lineTo(peg.x + 22, peg.y + 30);
      ctx2.closePath();
      ctx2.fill();
    } else if (peg.kind === 'dock') {
      ctx2.fillStyle = PALETTE.peg;
      ctx2.fillRect(peg.x - 6, peg.y - 26, 12, 30);
    }
    ctx2.fillStyle = highlighted ? PALETTE.accent : PALETTE.pegKnot;
    ctx2.beginPath();
    ctx2.arc(peg.x, peg.y, highlighted ? 9 : 7, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx2.lineWidth = 2;
    ctx2.stroke();
    ctx2.restore();
  }

  /** The dock: a plank deck, three marked bays, and the crates already stacked in them. */
  function drawDock(state) {
    ctx.fillStyle = PALETTE.dockDark;
    ctx.fillRect(DOCK.left, DOCK.top + 14, DOCK.right - DOCK.left, 26);
    ctx.fillStyle = PALETTE.dock;
    ctx.fillRect(DOCK.left, DOCK.top, DOCK.right - DOCK.left, 22);
    ctx.fillStyle = PALETTE.dockEdge;
    ctx.fillRect(DOCK.left, DOCK.top, DOCK.right - DOCK.left, 6);
    ctx.fillStyle = PALETTE.dockDark;
    for (let x = DOCK.left + 10; x < DOCK.right; x += 26) ctx.fillRect(x, DOCK.top, 3, 22);
    ctx.fillStyle = PALETTE.dockDark;
    for (let x = DOCK.left + 24; x < DOCK.right - 10; x += 96) ctx.fillRect(x, DOCK.top + 40, 14, WATER_Y - DOCK.top - 40);
    for (const bay of state.bays) {
      const width = bay.to - bay.from;
      ctx.save();
      ctx.strokeStyle = bay.open ? 'rgba(29,59,63,0.55)' : 'rgba(224,92,74,0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash(bay.open ? [] : [12, 9]);
      ctx.strokeRect(bay.from + 4, DOCK.top + 26, width - 8, 46);
      ctx.setLineDash([]);
      label(ctx, bay.open ? bay.label : 'BATTENED', bay.from + width / 2, DOCK.top + 60, 17, bay.open ? PALETTE.ink : PALETTE.danger, 'center');
      label(ctx, bay.open ? `+${bay.value}` : 'shut', bay.from + width / 2, DOCK.top + 84, 15, bay.open ? 'rgba(29,59,63,0.7)' : PALETTE.danger, 'center');
      ctx.restore();
      const stacked = state.bayStacks?.[bay.key] ?? 0;
      for (let index = 0; index < stacked; index += 1) {
        const column = index % 6;
        const row = Math.floor(index / 6);
        drawCrate(ctx, {
          x: bay.from + 22 + column * 17,
          y: DOCK.top - 20 - row * 17,
          radius: 9,
          type: { shell: PALETTE.bayFloor, band: '#5f3d1f' },
          spin: 0,
        });
      }
    }
  }

  /** A crate: a banded box that turns as it flies. */
  function drawCrate(ctx2, crate) {
    const size = crate.radius * 2;
    ctx2.save();
    ctx2.translate(crate.x, crate.y);
    ctx2.rotate(crate.spin ?? 0);
    ctx2.fillStyle = 'rgba(20,40,44,0.16)';
    roundRect(ctx2, -size / 2 + 3, -size / 2 + 5, size, size, 4);
    ctx2.fill();
    ctx2.fillStyle = crate.type.shell;
    roundRect(ctx2, -size / 2, -size / 2, size, size, 4);
    ctx2.fill();
    ctx2.fillStyle = crate.type.band;
    ctx2.fillRect(-size / 2, -size / 6, size, size / 8);
    ctx2.fillRect(-size / 2, size / 4, size, size / 8);
    ctx2.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx2.lineWidth = 2;
    roundRect(ctx2, -size / 2, -size / 2, size, size, 4);
    ctx2.stroke();
    ctx2.restore();
  }

  /** A silk span: a curve through its nodes, hot and warm as it takes load. */
  function drawSpan(state, span, highlighted) {
    const points = [{ x: span.pegA.x, y: span.pegA.y }, ...span.nodes, { x: span.pegB.x, y: span.pegB.y }];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(20,40,44,0.18)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    points.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y + 3) : ctx.moveTo(point.x, point.y + 3)));
    ctx.stroke();
    const load = Math.max(span.strain, span.flash * 0.8);
    ctx.strokeStyle = span.broken ? 'rgba(224,92,74,0.55)' : load > 0.62 ? PALETTE.silkHot : load > 0.28 ? PALETTE.silkWarm : PALETTE.silk;
    ctx.lineWidth = highlighted ? 5 : 3.5;
    ctx.setLineDash(span.broken ? [10, 10] : []);
    ctx.beginPath();
    points.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** Where the silk under the pointer would hang, while a span is being dragged. */
  function drawDrag(state, drag) {
    if (!drag) return;
    const from = state.pegs[drag.from];
    ctx.save();
    ctx.setLineDash([9, 8]);
    ctx.strokeStyle = drag.ok ? PALETTE.silk : PALETTE.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(drag.x, drag.y);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, drag.ok ? `${Math.round(drag.length)} m silk` : drag.reason, drag.x + 12, drag.y - 14, 16, drag.ok ? PALETTE.text : PALETTE.danger, 'left');
    ctx.restore();
  }

  /** The throw the line under the fall would give, so a plan can be read before it is taken. */
  function drawGuide(guide) {
    if (!guide || !guide.path?.length) return;
    ctx.save();
    ctx.setLineDash([7, 9]);
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    guide.path.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = guide.bayKey ? PALETTE.accent : PALETTE.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guide.landing.x, guide.landing.y, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** The bits of motion the state leaves behind: a landing ring, a splash, shards, a parting. */
  function drawFx(state) {
    for (const fx of state.fx) {
      const life = Math.max(0, fx.life / (fx.max ?? 0.5));
      ctx.save();
      ctx.globalAlpha = Math.min(1, life);
      if (fx.kind === 'landed') {
        ctx.strokeStyle = PALETTE.good;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 12 + (1 - life) * 34, 0, Math.PI * 2);
        ctx.stroke();
        if (fx.label) label(ctx, fx.label, fx.x, fx.y - 26 - (1 - life) * 24, 20, PALETTE.good, 'center');
      } else if (fx.kind === 'splash') {
        ctx.strokeStyle = PALETTE.foam;
        ctx.lineWidth = 3;
        for (let index = 0; index < 4; index += 1) {
          const angle = -Math.PI / 2 + (index - 1.5) * 0.4;
          ctx.beginPath();
          ctx.moveTo(fx.x, fx.y);
          ctx.lineTo(fx.x + Math.cos(angle) * 40 * (1 - life), fx.y + Math.sin(angle) * 40 * (1 - life));
          ctx.stroke();
        }
      } else if (fx.kind === 'crack' || fx.kind === 'deck') {
        ctx.fillStyle = fx.kind === 'deck' ? 'rgba(120,90,60,0.85)' : PALETTE.danger;
        for (let index = 0; index < 7; index += 1) {
          const angle = (index / 7) * Math.PI * 2;
          const distance = 14 + (1 - life) * 34;
          ctx.fillRect(fx.x + Math.cos(angle) * distance, fx.y + Math.sin(angle) * distance, 7, 7);
        }
      } else if (fx.kind === 'snap' || fx.kind === 'cut') {
        ctx.strokeStyle = PALETTE.silkHot;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 10 + (1 - life) * 30, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** The crates in the air, with the trail that shows where they came from. */
  function drawAirlines(state) {
    for (const crate of state.flying) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      crate.trail.forEach((point, index) => {
        ctx.fillStyle = crate.type.shell;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2 + index * 0.16, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      const shadowY = Math.min(WORLD.height - 6, crate.y + 120);
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#16323a';
      ctx.beginPath();
      ctx.ellipse(crate.x, shadowY, crate.radius * 0.9, crate.radius * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawCrate(ctx, crate);
    }
  }

  /** The ticker of short lines in the top right. */
  function drawMessages(state) {
    ctx.save();
    state.messages.forEach((message, index) => {
      const color = message.tone === 'good' ? PALETTE.good : message.tone === 'bad' ? PALETTE.danger : message.tone === 'warn' ? PALETTE.accent : PALETTE.text;
      ctx.globalAlpha = Math.min(1, message.life / 0.8);
      label(ctx, message.text, WORLD.width - 26, 116 + index * 24, 17, color, 'right');
    });
    ctx.restore();
  }

  /**
   * Paint one frame. `extras` carries the parts of the view the game state does not own: the drag
   * under the pointer, the throw guide, and the best score on this machine.
   */
  function draw(state, extras = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shake = state.shake ?? 0;
    const offsetX = shake > 0 ? (Math.random() - 0.5) * 9 * shake : 0;
    const offsetY = shake > 0 ? (Math.random() - 0.5) * 9 * shake : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + offsetX, view.y + offsetY);

    drawSky();
    drawHills();
    drawWater();
    drawCliff();
    drawChute(state);
    drawMasts(state);
    drawDock(state);

    for (const span of state.spans) drawSpan(state, span, extrapolated(state, extras));
    for (const peg of state.pegs) drawPeg(ctx, peg, extras.highlightPeg === peg.key);
    drawDrag(state, extras.drag);
    drawGuide(extras.guide);
    drawAirlines(state);
    drawFx(state);

    if (state.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.32, state.flash * 0.3);
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.restore();
    }

    if (state.phase === 'title') {
      drawTitle(ctx, { best: extras.best ?? 0, label });
      return;
    }
    drawHud(ctx, state, { best: extras.best ?? 0, label });
    drawMessages(state);
    if (state.banner > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.banner);
      ctx.fillStyle = 'rgba(18,56,64,0.92)';
      roundRect(ctx, WORLD.width / 2 - 330, 172, 660, 96, 14);
      ctx.fill();
      label(ctx, state.bannerTitle, WORLD.width / 2, 216, 34, PALETTE.accent, 'center');
      label(ctx, state.bannerLine, WORLD.width / 2, 248, 19, PALETTE.text, 'center');
      ctx.restore();
    }
    if (state.phase === 'paused') {
      ctx.save();
      ctx.fillStyle = 'rgba(9,28,33,0.62)';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      label(ctx, 'PAUSED', WORLD.width / 2, 330, 56, PALETTE.text, 'center');
      label(ctx, 'P to resume', WORLD.width / 2, 372, 22, PALETTE.accent, 'center');
      ctx.restore();
    }
    if (state.phase === 'results') {
      drawResults(ctx, state, { best: extras.best ?? 0, label, won: state.won, result: state.result });
    }
  }

  /** A span is highlighted while the pointer is near it, so cutting one is always deliberate. */
  function extrapolated(state, extras) {
    if (!extras.pointer) return false;
    return state.spans.some((span) => !span.broken && span.nearest(extras.pointer.x, extras.pointer.y).distance < 30);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, view };
}

/** The wind as a number between -1 and 1, exported so the HUD and the tower agree. */
export { windReading };
