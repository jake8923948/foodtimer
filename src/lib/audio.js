/**
 * Alarm chimes synthesised with the Web Audio API — zero audio assets to
 * download, instant playback, works offline. Different tones per event type.
 */

let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Must be called from a user gesture (e.g. the Start button) to unlock audio. */
export function primeAudio() {
  getCtx();
}

const TONES = {
  add: [880, 1174.66], // bright rising two-note
  action: [987.77, 739.99], // attentive descending pair
  done: [1046.5, 1318.5, 1568], // celebratory triad
};

export function playChime(type = 'action', volume = 0.6) {
  const ac = getCtx();
  if (!ac) return;

  const freqs = TONES[type] || TONES.action;
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume));
  gain.connect(ac.destination);

  freqs.forEach((f, i) => {
    const t = now + i * 0.18;
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

/** Short UI tick for taps/confirmations. */
export function playTick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 660;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(env).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}
