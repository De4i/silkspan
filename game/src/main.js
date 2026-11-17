// Boot, the one loop, and the player's hand. The game's own rules live in state.js; this file reads
// the controls, feeds the rules a fixed step, and paints what comes back. It also owns the two
// things a screenshot or a test needs: ?shot=start|play|end stages a scene, and window.advanceTime
// steps the simulation without waiting for frames.
import { BEST_KEY, CRATE_TYPES, PACE, SILK, SPAN, WORLD } from './config.js';
import { cablePoint, cableVelocity, windAccelAt } from './physics.js';
import { predict } from './autopilot.js';
import { SilkSpan } from './silk.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { PHASE, cutNearest, createState, releaseEarly, secondsToCableEnd, startRun, stringBetween, textSnapshot, togglePause, update } from './state.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const fixedSeed = Number.isInteger(seedParam) ? seedParam : null;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createState(fixedSeed ?? Math.floor(Math.random() * 4294967296));
const painter = createRenderer(canvas);
const audio = createAudio();
const input = shot ? null : createInput(canvas);

/** A fresh seed for a new run, unless the page was opened with one, so a shot is reproducible. */
function nextSeed() {
  return fixedSeed ?? Math.floor(Math.random() * 4294967296);
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be switched off; the best then lasts this visit only.
  }
}

let best = readBest();

/** The peg under a point, or null; `radius` is generous so pegs are easy to grab. */
function pegUnder(x, y, radius = 30) {
  let found = null;
  let shortest = radius;
  state.pegs.forEach((peg, index) => {
    const distance = Math.hypot(peg.x - x, peg.y - y);
    if (distance < shortest) {
      shortest = distance;
      found = index;
    }
  });
  return found;
}

/** Whether a span between two pegs may be hung, and why not when it may not. */
function spanPlan(a, b) {
  if (a === null || b === null) return { ok: false, reason: 'pick two posts' };
  if (a === b) return { ok: false, reason: 'same post' };
  const A = state.pegs[a];
  const B = state.pegs[b];
  if (!A || !B) return { ok: false, reason: 'no post there' };
  const length = Math.hypot(B.x - A.x, B.y - A.y);
  if (length < SPAN.min) return { ok: false, reason: 'too short a line' };
  if (length > SPAN.max) return { ok: false, reason: 'out of reach' };
  if (state.spans.some((span) => !span.broken && ((span.pegA === A && span.pegB === B) || (span.pegA === B && span.pegB === A)))) {
    return { ok: false, reason: 'already strung' };
  }
  if (state.spans.filter((span) => !span.broken).length >= SPAN.maxLive) return { ok: false, reason: `${SPAN.maxLive} lines is the limit` };
  const cost = Math.ceil(length * SILK.costPerPixel);
  if (cost > state.reel) return { ok: false, reason: 'not enough silk' };
  return { ok: true, length, cost };
}

/** Where the crate now on the cable would end, as a dashed path the player can read. */
function buildGuide(extraSpan) {
  if (state.phase !== PHASE.playing) return null;
  const type = state.chute.active ? state.chute.type : state.queue[0] ?? CRATE_TYPES.standard;
  const point = cablePoint(1);
  const velocity = cableVelocity(1);
  const spans = extraSpan ? [...state.spans, extraSpan] : state.spans;
  const starts = state.time + secondsToCableEnd(state);
  const path = [];
  const landing = predict(type, point.x, point.y, velocity.vx, velocity.vy, (t) => windAccelAt(state.wind, starts + t), spans, path);
  return { path, landing, bayKey: landing.kind === 'bay' ? landing.bay.key : null };
}

/** The pointer's own state: a peg picked up, or a line being dragged out to another peg. */
let pick = null;
let drag = null;

function handlePointer() {
  if (state.phase !== PHASE.playing) {
    if (input.tappedAny('Space', 'Enter') || input.pointer.down) {
      audio.resume();
      startRun(state, nextSeed());
    }
    return;
  }
  const pointer = input.pointer;
  const released = input.takeRelease();
  const button = input.lastButton();
  const target = pegUnder(pointer.x, pointer.y);

  /** Hang the line the hand is holding, if the two posts allow it. */
  const hangFrom = (indexA, indexB) => {
    const plan = spanPlan(indexA, indexB);
    if (plan.ok && stringBetween(state, indexA, indexB).ok) audio.throwCrate();
  };

  if (released) {
    if (button === 2) {
      if (cutNearest(state, pointer.x, pointer.y)) audio.snapped();
      pick = null;
      drag = null;
      return;
    }
    if (pick && (pick.moved || (target !== null && target !== pick.index))) {
      // A line dragged or a second post clicked: hang it, and let the hand go.
      if (target !== null && target !== pick.index) hangFrom(pick.index, target);
      pick = null;
      drag = null;
      return;
    }
    if (pick) {
      // A click on the post it already holds: keep holding it, so a second click can finish the line.
      drag = null;
      return;
    }
    pick = null;
    drag = null;
    return;
  }

  // A press on a post picks it up; the line then follows the pointer until it is let go.
  if (pointer.down && !pick && target !== null) pick = { index: target, moved: false, x: pointer.x, y: pointer.y };
  if (pointer.down && pick && !pick.moved && Math.hypot(pointer.x - pick.x, pointer.y - pick.y) > 9) pick.moved = true;
  if (pick?.moved) {
    const near = pegUnder(pointer.x, pointer.y, 46);
    const plan = spanPlan(pick.index, near);
    drag = {
      from: pick.index,
      x: near !== null ? state.pegs[near].x : pointer.x,
      y: near !== null ? state.pegs[near].y : pointer.y,
      ok: plan.ok && near !== null,
      reason: plan.reason,
      length: plan.length ?? 0,
      target: near,
    };
  } else {
    drag = null;
  }
}

function handleKeys() {
  const taps = input.takeTaps();
  for (const code of taps) {
    if (code === 'KeyP' || code === 'Escape') {
      if (state.phase === PHASE.playing || state.phase === PHASE.paused) togglePause(state);
      continue;
    }
    if (code === 'Space' || code === 'Enter') {
      audio.resume();
      if (state.phase === PHASE.title || state.phase === PHASE.results) startRun(state, nextSeed());
      else if (state.phase === PHASE.playing) releaseEarly(state);
    }
    if (code === 'KeyR' && state.phase === PHASE.results) startRun(state, nextSeed());
  }
}

/** Paint one frame, with the parts of the view the game state does not own. */
function paint() {
  const dragSpan = drag?.ok && drag.target !== null ? new SilkSpan(state.pegs[drag.from], state.pegs[drag.target], -1) : null;
  painter.draw(state, {
    best,
    drag: drag?.ok ? drag : drag,
    guide: buildGuide(dragSpan),
    pointer: input?.pointer,
    highlightPeg: drag?.ok && drag.target !== null ? state.pegs[drag.target].key : pick ? state.pegs[pick.index].key : null,
  });
}

/** A short line for screen readers, so the page says what is happening without being looked at. */
function announce(text) {
  if (status) status.textContent = text;
}

// Hooks a test or a screenshot harness needs: the state as text, and time without frames.
window.render_game_to_text = () =>
  JSON.stringify({
    ...textSnapshot(state),
    best,
    hand: pick ? { from: state.pegs[pick.index]?.key, moved: pick.moved, over: drag?.target != null ? state.pegs[drag.target].key : null, ok: drag?.ok ?? false, reason: drag?.reason ?? null } : null,
    pointer: input ? { x: Math.round(input.pointer.x), y: Math.round(input.pointer.y), down: input.pointer.down, peg: pegUnder(input.pointer.x, input.pointer.y) !== null ? state.pegs[pegUnder(input.pointer.x, input.pointer.y)].key : null } : null,
    guide: (() => {
      const guide = buildGuide(null);
      return guide ? { landing: guide.landing.kind, bay: guide.bayKey, x: Math.round(guide.landing.x), y: Math.round(guide.landing.y) } : null;
    })(),
    controls: 'mouse drag peg to peg strings silk; right-click cuts; SPACE releases the crate early; P pauses',
  });

window.advanceTime = (milliseconds) => {
  const steps = Math.max(1, Math.round(milliseconds / 1000 / PACE.step));
  for (let index = 0; index < steps; index += 1) update(state, PACE.step);
  paint();
  return state.elapsed;
};

if (shot) {
  // A screenshot scene: staged from the seed, painted twice, then declared ready.
  stageShot(shot, state, fixedSeed ?? 7);
  let painted = 0;
  const clean = () => {
    paint();
    painted += 1;
    if (painted < 2) requestAnimationFrame(clean);
    else window.__shotReady = true;
  };
  requestAnimationFrame(clean);
} else {
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, PACE.maxFrameDt);
    last = now;
    handlePointer();
    handleKeys();
    if (state.phase === PHASE.playing) update(state, dt);
    paint();
    if (state.phase === PHASE.results && !state.reported) {
      state.reported = true;
      if (state.result.score > best) {
        best = state.result.score;
        saveBest(best);
      }
      audio.finished(state.won);
      announce(`${state.won ? 'Run won' : 'Run over'}. Score ${state.result.score}, best ${best}.`);
    } else if (state.phase === PHASE.title) {
      announce('SILKSPAN. Press Space or click to start.');
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === PHASE.playing) togglePause(state);
  });
  announce('SILKSPAN. Press Space or click to start.');
  requestAnimationFrame(frame);
}
