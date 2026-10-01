import { GRAMMAR_ITEMS } from '../data/grammar';
import { LETTERS } from '../data/letters';
import { SENTENCES } from '../data/sentences';
import { STORIES } from '../data/stories';
import { PHRASES } from '../data/talk';
import { ALL_WORDS } from '../data/words';
import type { Profile } from '../types';
import type { Exercise } from './exercises';
import { buildWordExercise, nextUid, storyQuestionExercise, wordOptions } from './lessonGen';
import { clamp, pick, sample, shuffle, type Rng } from './random';

export const PLACEMENT_QUESTIONS = 10;
const STEPS = [1, 0.8, 0.6, 0.5, 0.5, 0.4, 0.4, 0.3, 0.3, 0.3];

export interface PlacementState {
  ability: number;
  asked: number;
  history: { level: number; correct: boolean }[];
  used: string[];
}

export function startPlacement(age: number): PlacementState {
  return { ability: age <= 6 ? 1.5 : 2.5, asked: 0, history: [], used: [] };
}

export function currentPlacementLevel(s: PlacementState): number {
  return clamp(Math.round(s.ability), 1, 5);
}

/** Builds a question matching the current ability estimate. */
export function placementQuestion(s: PlacementState, profile: Profile, rng: Rng): Exercise {
  const level = currentPlacementLevel(s);
  const ctx = { profile: { ...profile, ability: Math.max(2, level) }, speaking: false, rng, now: Date.now() };
  const freshWords = (min: number, max: number) =>
    ALL_WORDS.filter((w) => w.level >= min && w.level <= max && w.topic !== 'abc' && !s.used.includes(w.id) && /^[a-z]+$/.test(w.en));

  switch (level) {
    case 1: {
      if (rng() < 0.4) {
        const letter = pick(LETTERS.filter((l) => !s.used.includes(l.id)), rng);
        return { uid: nextUid(), kind: 'letter-listen', itemId: letter.id, letter, options: shuffle([letter, ...sample(LETTERS.filter((l) => l.id !== letter.id), 2, rng)], rng) };
      }
      const word = pick(freshWords(1, 1), rng);
      return { uid: nextUid(), kind: 'listen-pick', itemId: word.id, word, options: wordOptions(word, 3, rng) };
    }
    case 2: {
      const word = pick(freshWords(1, 2), rng);
      return buildWordExercise(rng() < 0.5 ? 'listen-pick' : 'word-pick-picture', word, ctx);
    }
    case 3: {
      const r = rng();
      if (r < 0.3) {
        const p = pick(PHRASES.filter((x) => x.level <= 3 && !s.used.includes(x.id)), rng);
        return { uid: nextUid(), kind: 'dialog-reply', itemId: p.id, phrase: p, audioOnly: false, options: shuffle([p.reply, ...p.wrong], rng) };
      }
      const word = pick(freshWords(2, 3), rng);
      return buildWordExercise(r < 0.65 ? 'picture-pick-word' : 'missing-letter', word, ctx);
    }
    case 4: {
      if (rng() < 0.5) {
        const word = pick(freshWords(3, 4), rng);
        return buildWordExercise('spell-tiles', word, { ...ctx, profile: { ...ctx.profile, ability: 3.4 } });
      }
      const sentence = pick(SENTENCES.filter((x) => x.level <= 4 && !s.used.includes(x.id)), rng);
      return { uid: nextUid(), kind: 'sentence-picture', itemId: sentence.id, sentence, options: shuffle([sentence, ...sample(SENTENCES.filter((x) => x.id !== sentence.id && x.emoji !== sentence.emoji), 2, rng)], rng) };
    }
    default: {
      const r = rng();
      if (r < 0.3) {
        const g = pick(GRAMMAR_ITEMS.filter((x) => x.level >= 4 && !s.used.includes(x.id)), rng);
        return { uid: nextUid(), kind: 'grammar-choice', itemId: g.id, item: g, options: shuffle(g.options, rng) };
      }
      if (r < 0.65) {
        const sentence = pick(SENTENCES.filter((x) => x.level >= 4 && !s.used.includes(x.id)), rng);
        return { uid: nextUid(), kind: 'listen-sentence', itemId: sentence.id, sentence, options: shuffle([sentence, ...sample(SENTENCES.filter((x) => x.id !== sentence.id), 2, rng)], rng) };
      }
      const story = pick(STORIES.filter((x) => !s.used.includes(x.id)), rng);
      const ex = storyQuestionExercise(story, Math.floor(rng() * story.questions.length), ctx);
      return { ...ex, itemId: story.id };
    }
  }
}

export function answerPlacement(s: PlacementState, ex: Exercise, correct: boolean): PlacementState {
  const level = currentPlacementLevel(s);
  const step = STEPS[Math.min(s.asked, STEPS.length - 1)];
  return {
    ability: clamp(s.ability + (correct ? step : -step), 0.6, 5.6),
    asked: s.asked + 1,
    history: [...s.history, { level, correct }],
    used: ex.itemId ? [...s.used, ex.itemId] : s.used,
  };
}

export function placementDone(s: PlacementState): boolean {
  return s.asked >= PLACEMENT_QUESTIONS;
}

export function placementResult(s: PlacementState): { level: number; ability: number } {
  const ability = clamp(s.ability, 1, 5);
  return { level: clamp(Math.round(ability), 1, 5), ability: clamp(ability - 0.3, 1, 5) };
}
