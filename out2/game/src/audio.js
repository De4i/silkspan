// The dock's noise, made with the Web Audio API: no files, so the game stays static and offline.
// Nothing is created until the player's first gesture, which is what browsers require.
export function createAudio() {
  let context = null;
  let master = null;

  /** Start the audio graph after a gesture; safe to call on every gesture. */
  function resume() {
    if (!context) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  /** One shaped tone: frequency in hertz, `seconds` long, at `gain`, with a gentle envelope. */
  function tone({ frequency, seconds, gain, type = 'sine', sweep = 0, delay = 0 }) {
    if (!context || !master) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (sweep) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + sweep), start + seconds);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + seconds * 0.12);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  /** Filtered noise, for a splash or a shell cracking. */
  function noise({ seconds, gain, frequency = 900, q = 0.7, type = 'bandpass' }) {
    if (!context || !master) return;
    const frames = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const envelope = context.createGain();
    envelope.gain.value = gain;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start();
  }

  return {
    resume,
    /** The chute letting a crate go. */
    throwCrate() {
      tone({ frequency: 320, seconds: 0.16, gain: 0.16, type: 'triangle', sweep: -120 });
    },
    /** A crate landing on a silk span: the harder the hit, the louder the twang. */
    bounce(strength) {
      const volume = Math.min(0.3, 0.06 + strength * 0.2);
      tone({ frequency: 180 + strength * 90, seconds: 0.22, gain: volume, type: 'triangle', sweep: 120 });
    },
    /** A crate settled into a bay: the nearer bay chimes lower. */
    delivered(value) {
      const base = value >= 50 ? 660 : value >= 25 ? 550 : 440;
      tone({ frequency: base, seconds: 0.18, gain: 0.16, type: 'sine' });
      tone({ frequency: base * 1.5, seconds: 0.26, gain: 0.12, type: 'sine', delay: 0.07 });
    },
    /** A crate that landed on the deck: a dull knock, and no points. */
    decked() {
      tone({ frequency: 150, seconds: 0.14, gain: 0.14, type: 'square', sweep: -60 });
    },
    /** A crate lost: to the river, the cliff, the deck's edge or its own shell. */
    lost(kind) {
      if (kind === 'river') noise({ seconds: 0.4, gain: 0.22, frequency: 700, q: 0.5 });
      else noise({ seconds: 0.24, gain: 0.24, frequency: 260, q: 0.9, type: 'lowpass' });
    },
    /** A span parting under a load. */
    snapped() {
      tone({ frequency: 880, seconds: 0.3, gain: 0.18, type: 'sawtooth', sweep: -600 });
    },
    /** A shipment cleared. */
    cleared() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((frequency, index) => tone({ frequency, seconds: 0.3, gain: 0.14, type: 'triangle', delay: index * 0.1 }));
    },
    /** The run is over, won or lost. */
    finished(won) {
      const notes = won ? [523, 659, 784, 1046, 1318] : [392, 330, 262, 196];
      notes.forEach((frequency, index) => tone({ frequency, seconds: 0.42, gain: 0.16, type: 'triangle', delay: index * 0.16 }));
    },
  };
}
