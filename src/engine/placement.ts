/*
 * Level test: a ladder of skill steps, from "listen and point" (no reading at all)
 * up to grammar and stories. Younger children start at the bottom; a step is passed
 * with 2 correct answers and the test stops at the first step the child can't do,
 * so a 4-year-old never sees sentences or reading they cannot manage.
 */
import { GRAMMAR_ITEMS } from '../data/grammar';
import { favouriteWordTopics } from '../data/interests';
import { LETTERS } from '../data/letters';
import { SENTENCES } from '../data/sentences';
import { STORIES } from '../data/stories';
import { PHRASES } from '../data/talk';
import { ALL_WORDS } from '../data/words';
import type { Profile, Word } from '../types';
import type { Exercise } from './exercises';
import { buildWordExercise, nextUid, storyQuestionExercise, wordOptions } from './lessonGen';
import { pick, sample, shuffle, type Rng } from './random';

export interface PlacementTier {
  emoji: string;
  label: string;
}

/** The ladder, easiest first. */
export const TIERS: PlacementTier[] = [
  { emoji: '🎧', label: 'להקשיב ולהצביע' },
  { emoji: '🔤', label: 'אותיות' },
  { emoji: '📖', label: 'לקרוא מילים' },
  { emoji: '✏️', label: 'איות' },
  { emoji: '💬', label: 'משפטים' },
  { emoji: '🧩', label: 'דקדוק וסיפורים' },
];

const TOP = TIERS.length - 1;
const PASS = 2; // correct answers needed to pass a step
const FAIL = 2; // wrong answers that end a step
export const MAX_QUESTIONS = 14;

/** Level (1–5) and starting ability for each highest passed step (-1 = none). */
const RESULTS: Record<number, { level: number; ability: number }> = {
  [-1]: { level: 1, ability: 1.0 },
  0: { level: 1, ability: 1.3 },
  // Knows letters but can't read yet – stay below the reading threshold.
  1: { level: 2, ability: 1.5 },
  2: { level: 2, ability: 2.2 },
  3: { level: 3, ability: 2.9 },
  4: { level: 4, ability: 3.6 },
  5: { level: 5, ability: 4.3 },
};

export interface PlacementState {
  tier: number;
  /** Highest step this age may normally be asked (spelling and sentences fit age 7+). */
  maxTier: number;
  /** Ages ≤ 6: harder steps are only a late bonus for children who answer almost everything. */
  young: boolean;
  correct: number; // at the current step
  wrong: number; // at the current step
  passed: number; // highest step passed (-1 = none)
  asked: number;
  done: boolean;
  history: { tier: number; correct: boolean }[];
  used: string[];
}

export function startTier(age: number): number {
  if (age <= 6) return 0;
  if (age <= 8) return 1;
  return 2;
}

/** Under 7 the test normally stops after reading single words – no letter completion or sentences. */
export function maxTier(age: number): number {
  return age <= 6 ? 2 : TOP;
}

/** Ages ≤ 6: the first questions always stay on listening, letters and single words. */
export const YOUNG_EASY_QUESTIONS = 8;
/** …and only a child with at most this many mistakes goes on to the harder steps afterwards. */
const YOUNG_BONUS_MAX_MISTAKES = 1;

function mistakes(s: PlacementState): number {
  return s.history.filter((h) => !h.correct).length;
}

export function startPlacement(age: number): PlacementState {
  return { tier: startTier(age), maxTier: maxTier(age), young: age <= 6, correct: 0, wrong: 0, passed: -1, asked: 0, done: false, history: [], used: [] };
}

export function answerPlacement(s: PlacementState, ex: Exercise, correct: boolean): PlacementState {
  const next: PlacementState = {
    ...s,
    asked: s.asked + 1,
    correct: s.correct + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
    history: [...s.history, { tier: s.tier, correct }],
    used: ex.itemId ? [...s.used, ex.itemId] : s.used,
  };
  if (next.correct >= PASS) {
    // Step passed – climb one step (never skip).
    next.passed = Math.max(next.passed, s.tier);
    const strong = mistakes(next) <= YOUNG_BONUS_MAX_MISTAKES;
    if (s.tier < s.maxTier) Object.assign(next, { tier: s.tier + 1, correct: 0, wrong: 0 });
    else if (s.tier >= TOP || !s.young || !strong) next.done = true;
    else if (next.asked < YOUNG_EASY_QUESTIONS) {
      // A strong young child: a few more easy questions first, to be sure…
      Object.assign(next, { correct: 0, wrong: 0 });
    } else {
      // …then the harder steps, late in the test, to find a truly high level.
      Object.assign(next, { tier: s.tier + 1, maxTier: TOP, correct: 0, wrong: 0 });
    }
  } else if (next.wrong >= FAIL) {
    // Started too high (older child) and nothing passed below yet – step down and try there.
    if (s.tier > 0 && next.passed < s.tier - 1) Object.assign(next, { tier: s.tier - 1, correct: 0, wrong: 0 });
    else next.done = true;
  }
  if (next.asked >= MAX_QUESTIONS) next.done = true;
  return next;
}

export function placementDone(s: PlacementState): boolean {
  return s.done;
}

export function placementResult(s: PlacementState): { level: number; ability: number; passed: number } {
  // Passing a step implies the easier steps below it.
  return { ...RESULTS[s.passed], passed: s.passed };
}

/* ---------- Questions ---------- */

const simple = (w: Word) => /^[a-z]+$/.test(w.en);

/** Fresh words, preferring the child's favourite topics. */
function words(s: PlacementState, profile: Profile, min: number, max: number, maxLen = 12): Word[] {
  const all = ALL_WORDS.filter(
    (w) => w.level >= min && w.level <= max && w.topic !== 'abc' && simple(w) && w.en.length <= maxLen && !s.used.includes(w.id),
  );
  const fav = favouriteWordTopics(profile.interests);
  const liked = all.filter((w) => fav.includes(w.topic));
  return liked.length >= 3 ? liked : all;
}

export function placementQuestion(s: PlacementState, profile: Profile, rng: Rng): Exercise {
  const ctx = { profile: { ...profile, ability: 2.5 }, speaking: false, rng, now: Date.now() };
  switch (s.tier) {
    case 0: {
      // Hear a word, tap its picture – no reading needed.
      const word = pick(words(s, profile, 1, 2, 6), rng);
      return { uid: nextUid(), kind: 'listen-pick', skill: 'listening', itemId: word.id, word, options: wordOptions(word, 3, rng) };
    }
    case 1: {
      const letter = pick(LETTERS.filter((l) => !s.used.includes(l.id)), rng);
      const options = shuffle([letter, ...sample(LETTERS.filter((l) => l.id !== letter.id), 2, rng)], rng);
      return rng() < 0.7
        ? { uid: nextUid(), kind: 'letter-listen', skill: 'phonics', itemId: letter.id, letter, options }
        : { uid: nextUid(), kind: 'letter-case', skill: 'reading', itemId: letter.id, letter, options };
    }
    case 2: {
      // Read a short word and tap its picture.
      const word = pick(words(s, profile, 1, 2, 5), rng);
      return { uid: nextUid(), kind: 'word-pick-picture', skill: 'reading', itemId: word.id, word, options: wordOptions(word, 3, rng) };
    }
    case 3: {
      const word = pick(words(s, profile, 2, 3), rng);
      return buildWordExercise(rng() < 0.5 ? 'picture-pick-word' : 'missing-letter', word, ctx);
    }
    case 4: {
      if (rng() < 0.35) {
        const p = pick(PHRASES.filter((x) => x.level <= 3 && !s.used.includes(x.id)), rng);
        return { uid: nextUid(), kind: 'dialog-reply', skill: 'conversation', itemId: p.id, phrase: p, audioOnly: false, options: shuffle([p.reply, ...p.wrong], rng) };
      }
      const sentence = pick(SENTENCES.filter((x) => x.level <= 4 && !s.used.includes(x.id)), rng);
      const others = sample(SENTENCES.filter((x) => x.id !== sentence.id && x.emoji !== sentence.emoji), 2, rng);
      return { uid: nextUid(), kind: 'sentence-picture', skill: 'reading', itemId: sentence.id, sentence, options: shuffle([sentence, ...others], rng) };
    }
    default: {
      const r = rng();
      if (r < 0.4) {
        const g = pick(GRAMMAR_ITEMS.filter((x) => x.level >= 4 && !s.used.includes(x.id)), rng);
        return { uid: nextUid(), kind: 'grammar-choice', skill: 'grammar', itemId: g.id, item: g, options: shuffle(g.options, rng) };
      }
      if (r < 0.7) {
        const sentence = pick(SENTENCES.filter((x) => x.level >= 4 && !s.used.includes(x.id)), rng);
        const others = sample(SENTENCES.filter((x) => x.id !== sentence.id), 2, rng);
        return { uid: nextUid(), kind: 'listen-sentence', skill: 'listening', itemId: sentence.id, sentence, options: shuffle([sentence, ...others], rng) };
      }
      const story = pick(STORIES.filter((x) => !s.used.includes(x.id)), rng);
      const ex = storyQuestionExercise(story, Math.floor(rng() * story.questions.length), ctx);
      return { ...ex, itemId: story.id };
    }
  }
}
