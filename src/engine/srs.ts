import type { ItemProgress } from '../types';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Waiting time after a correct answer, indexed by the new Leitner box. */
const INTERVALS = [0, 10 * MINUTE, DAY, 3 * DAY, 7 * DAY, 16 * DAY];

export const MAX_BOX = INTERVALS.length - 1;

export function newProgress(now: number): ItemProgress {
  return { box: 0, seen: 0, correct: 0, wrong: 0, due: now, last: 0 };
}

/** Leitner-style update: correct answers move the item up a box, mistakes drop it back down. */
export function review(prev: ItemProgress | undefined, correct: boolean, now: number): ItemProgress {
  const p = prev ?? newProgress(now);
  const box = correct ? Math.min(MAX_BOX, p.box + 1) : Math.max(1, p.box - 2);
  return {
    box,
    seen: p.seen + 1,
    correct: p.correct + (correct ? 1 : 0),
    wrong: p.wrong + (correct ? 0 : 1),
    due: now + (correct ? INTERVALS[box] : MINUTE),
    last: now,
  };
}

export function isLearned(p: ItemProgress | undefined): boolean {
  return !!p && p.box >= 2 && p.correct >= 2;
}

export function isMastered(p: ItemProgress | undefined): boolean {
  return !!p && p.box >= 4;
}

export function isDue(p: ItemProgress | undefined, now: number): boolean {
  return !!p && p.seen > 0 && p.due <= now;
}

/** 0 = weakest. Used to choose items for extra practice. */
export function strength(p: ItemProgress): number {
  const acc = p.seen ? p.correct / p.seen : 0;
  return p.box + acc;
}
