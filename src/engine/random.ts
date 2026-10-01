export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) – handy for tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function sample<T>(items: readonly T[], n: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, n);
}

export function weightedPick<T>(entries: { value: T; weight: number }[], rng: Rng = Math.random): T | undefined {
  const usable = entries.filter((e) => e.weight > 0);
  const total = usable.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (const e of usable) {
    r -= e.weight;
    if (r <= 0) return e.value;
  }
  return usable[usable.length - 1].value;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
