// What the player is holding, where the pointer is, and the one-shot presses since the last frame.
// Nothing here knows the rules: it reports intent, and the game loop decides what intent means.
import { WORLD } from './config.js';

export function createInput(canvas) {
  const held = new Set();
  let taps = [];
  const pointer = { x: WORLD.width / 2, y: WORLD.height / 2, down: false, button: 0, released: false, releasedButton: 0 };
  let lastGesture = 0;

  /** A pointer event in the game's own 1280x720 coordinates, whatever the window is doing. */
  function toWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WORLD.width,
      y: ((event.clientY - rect.top) / rect.height) * WORLD.height,
    };
  }

  canvas.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    taps.push(event.code);
    lastGesture = performance.now();
  });
  canvas.addEventListener('keyup', (event) => held.delete(event.code));
  canvas.addEventListener('mousemove', (event) => {
    const point = toWorld(event);
    pointer.x = point.x;
    pointer.y = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toWorld(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.down = true;
    pointer.button = event.button;
    lastGesture = performance.now();
    canvas.focus?.();
    event.preventDefault();
  });
  window.addEventListener('mouseup', (event) => {
    pointer.released = true;
    pointer.releasedButton = event.button;
    pointer.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  // A window that loses focus never sends keyup, so let go of everything when that happens.
  window.addEventListener('blur', () => held.clear());

  return {
    pointer,
    held: (code) => held.has(code),
    /** Takes the codes pressed since the last call, in order. */
    takeTaps() {
      const taken = taps;
      taps = [];
      return taken;
    },
    /** True when any of `codes` was pressed since the last call, and consumes the batch. */
    tappedAny(...codes) {
      if (!taps.some((code) => codes.includes(code))) return false;
      taps = [];
      return true;
    },
    /** True once for the frame after the mouse button came up, with which button it was. */
    takeRelease() {
      if (!pointer.released) return false;
      pointer.released = false;
      return true;
    },
    lastButton: () => pointer.releasedButton,
    /** Milliseconds since the player last touched a control, which the attract screen watches. */
    sinceGesture: () => (lastGesture ? performance.now() - lastGesture : Infinity),
  };
}
