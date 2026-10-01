import confetti from 'canvas-confetti';

const COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#facc15'];

export function burst(x = 0.5, y = 0.6) {
  void confetti({ particleCount: 40, spread: 70, startVelocity: 35, origin: { x, y }, colors: COLORS, scalar: 0.9 });
}

export function celebrate() {
  const end = Date.now() + 1200;
  const frame = () => {
    void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS });
    void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function stars() {
  void confetti({ particleCount: 30, spread: 100, shapes: ['star'], colors: ['#facc15', '#fde047', '#f59e0b'], scalar: 1.4, origin: { y: 0.4 } });
}
