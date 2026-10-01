/* Tiny synthesized sound effects – no audio files needed. */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  tap() {
    tone(660, 0, 0.08, 'triangle', 0.1);
  },
  correct() {
    tone(784, 0, 0.12, 'triangle');
    tone(1047, 0.1, 0.22, 'triangle');
  },
  wrong() {
    tone(300, 0, 0.18, 'sine', 0.14);
    tone(240, 0.14, 0.25, 'sine', 0.12);
  },
  flip() {
    tone(520, 0, 0.06, 'square', 0.05);
  },
  coin() {
    tone(988, 0, 0.08, 'square', 0.07);
    tone(1319, 0.07, 0.2, 'square', 0.07);
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16));
  },
  levelUp() {
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.15));
  },
  combo(n: number) {
    tone(600 + n * 80, 0, 0.12, 'triangle', 0.12);
  },
};
