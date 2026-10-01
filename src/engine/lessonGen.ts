import { ISLANDS, ISLANDS_BY_ID } from '../data/islands';
import { LETTERS, LETTERS_BY_ID } from '../data/letters';
import { SENTENCES, SENTENCES_BY_ID } from '../data/sentences';
import { STORIES, STORIES_BY_ID } from '../data/stories';
import { ALL_WORDS, ALPHABET_WORDS, WORDS_BY_ID } from '../data/words';
import type { Island, Letter, Profile, Sentence, Stage, Story, Word } from '../types';
import type { Exercise, ExerciseKind } from './exercises';
import { sample, shuffle, weightedPick, type Rng } from './random';
import { isDue, strength } from './srs';

export interface GenContext {
  profile: Profile;
  /** Whether "say it" exercises can be used (browser support + parent setting). */
  speaking: boolean;
  rng: Rng;
  now: number;
}

let uidCounter = 0;
export const nextUid = () => `ex${++uidCounter}`;

/* ---------- Difficulty knobs derived from the ability estimate ---------- */

export function optionCount(ability: number): number {
  return ability < 2 ? 3 : 4;
}

/** Spelling words longer than this is too hard for the current ability. */
function maxSpellLength(ability: number): number {
  if (ability < 2) return 3;
  if (ability < 2.6) return 4;
  if (ability < 3.2) return 6;
  return 12;
}

/* ---------- Distractors ---------- */

function sameLook(a: Word, b: Word) {
  return a.en === b.en || (a.emoji !== '' && a.emoji === b.emoji) || (a.swatch && a.swatch === b.swatch) || a.he === b.he;
}

function wordPool(word: Word): Word[] {
  if (word.topic === 'abc') return ALPHABET_WORDS;
  const island = ISLANDS.find((i) => i.itemIds.includes(word.id));
  const local = island ? island.itemIds.map((id) => WORDS_BY_ID[id]) : [];
  return local.length >= 6 ? local : ALL_WORDS.filter((w) => w.topic !== 'abc');
}

export function wordOptions(word: Word, n: number, rng: Rng): Word[] {
  const distractors: Word[] = [];
  for (const w of shuffle(wordPool(word), rng)) {
    if (distractors.length >= n - 1) break;
    if (sameLook(w, word) || distractors.some((d) => sameLook(d, w))) continue;
    distractors.push(w);
  }
  return shuffle([word, ...distractors], rng);
}

function letterOptions(letter: Letter, n: number, rng: Rng): Letter[] {
  const others = sample(LETTERS.filter((l) => l.id !== letter.id), n - 1, rng);
  return shuffle([letter, ...others], rng);
}

function letterChoices(answer: string, n: number, rng: Rng, upper = true): string[] {
  const abc = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((c) => c !== answer.toLowerCase());
  const pool = sample(abc, n - 1, rng).map((c) => (upper ? c.toUpperCase() : c));
  return shuffle([answer, ...pool], rng);
}

function sentenceOptions(s: Sentence, n: number, rng: Rng): Sentence[] {
  const others = sample(
    SENTENCES.filter((o) => o.id !== s.id && o.emoji !== s.emoji),
    n - 1,
    rng,
  );
  return shuffle([s, ...others], rng);
}

/* ---------- Single-exercise builders ---------- */

const isSpellable = (w: Word) => /^[a-z]+$/i.test(w.en);

function wordKindWeights(word: Word, ctx: GenContext): { value: ExerciseKind; weight: number }[] {
  const a = ctx.profile.ability;
  const age = ctx.profile.age;
  const len = word.en.length;
  const spellable = isSpellable(word);
  return [
    { value: 'listen-pick', weight: a < 2.5 ? 3 : 2 },
    { value: 'word-pick-picture', weight: a >= 1.6 ? 2 : 0.6 },
    { value: 'picture-pick-word', weight: a >= 2 ? 2 : 0 },
    { value: 'translate-pick', weight: a >= 2.5 && age >= 7 ? 1.2 : 0 },
    { value: 'first-letter', weight: spellable ? (a < 3.2 ? 1.5 : 0.4) : 0 },
    { value: 'missing-letter', weight: spellable && a >= 2 && len >= 3 ? 1.8 : 0 },
    { value: 'spell-tiles', weight: spellable && len <= maxSpellLength(a) ? (a >= 2.3 ? 2.2 : 1) : 0 },
    { value: 'spell-type', weight: spellable && a >= 3.8 && age >= 7 ? 1.5 : 0 },
    { value: 'say-word', weight: ctx.speaking ? 1.4 : 0 },
  ];
}

export function buildWordExercise(kind: ExerciseKind, word: Word, ctx: GenContext): Exercise {
  const { rng } = ctx;
  const a = ctx.profile.ability;
  const n = optionCount(a);
  const base = { uid: nextUid(), itemId: word.id };
  switch (kind) {
    case 'listen-pick':
      return { ...base, kind, skill: 'listening', word, options: wordOptions(word, n, rng) };
    case 'word-pick-picture':
      return { ...base, kind, skill: 'reading', word, options: wordOptions(word, n, rng) };
    case 'picture-pick-word':
      return { ...base, kind, skill: 'vocab', word, options: wordOptions(word, n, rng) };
    case 'translate-pick':
      return { ...base, kind, skill: 'vocab', word, options: wordOptions(word, n, rng) };
    case 'first-letter':
      return { ...base, kind, skill: 'phonics', word, options: letterChoices(word.en[0].toUpperCase(), n, rng) };
    case 'missing-letter': {
      const letters = word.en.toLowerCase();
      // Prefer hiding a letter that is not the first one once the child is more advanced.
      const start = a >= 2.5 && letters.length > 3 ? 1 : 0;
      const index = start + Math.floor(rng() * (letters.length - start));
      return { ...base, kind, skill: 'spelling', word, index, options: letterChoices(letters[index], n, rng, false) };
    }
    case 'spell-tiles': {
      const letters = word.en.toLowerCase().split('');
      const extra = a >= 3 ? sample('aeioustrnl'.split('').filter((c) => !letters.includes(c)), 2, rng) : [];
      let tiles = shuffle([...letters, ...extra], rng);
      if (tiles.join('') === letters.join('') && letters.length > 1) tiles = [...tiles.slice(1), tiles[0]];
      return { ...base, kind, skill: 'spelling', word, tiles, prefilled: a < 2.5 ? 1 : 0 };
    }
    case 'spell-type':
      return { ...base, kind, skill: 'spelling', word };
    case 'say-word':
      return { ...base, kind, skill: 'speaking', word };
    default:
      return { ...base, kind: 'listen-pick', skill: 'listening', word, options: wordOptions(word, n, rng) };
  }
}

/** Picks `count` different exercise kinds for a word, weighted by ability. */
function wordExercises(word: Word, count: number, ctx: GenContext, avoid: ExerciseKind[] = []): Exercise[] {
  const weights = wordKindWeights(word, ctx);
  const chosen: ExerciseKind[] = [];
  for (let i = 0; i < count; i++) {
    const kind =
      weightedPick(weights.filter((w) => !chosen.includes(w.value) && !avoid.includes(w.value)), ctx.rng) ??
      weightedPick(weights, ctx.rng) ??
      'listen-pick';
    chosen.push(kind);
  }
  return chosen.map((k) => buildWordExercise(k, word, ctx));
}

function letterExercises(letter: Letter, count: number, ctx: GenContext): Exercise[] {
  const a = ctx.profile.ability;
  const n = optionCount(a);
  const word = WORDS_BY_ID[letter.wordId];
  const startsWith = word.en[0].toLowerCase() === letter.lower;
  const kinds = shuffle(
    [
      'letter-listen',
      a >= 1.4 ? 'letter-case' : 'letter-listen',
      startsWith ? 'first-letter' : 'letter-case',
      'listen-pick',
    ] as ExerciseKind[],
    ctx.rng,
  );
  const unique = [...new Set(kinds)].slice(0, count);
  return unique.map((kind): Exercise => {
    const base = { uid: nextUid(), itemId: letter.id };
    if (kind === 'letter-listen') return { ...base, kind, skill: 'phonics', letter, options: letterOptions(letter, n, ctx.rng) };
    if (kind === 'letter-case') return { ...base, kind, skill: 'reading', letter, options: letterOptions(letter, n, ctx.rng) };
    if (kind === 'first-letter')
      return { ...base, kind, skill: 'phonics', word, options: letterChoices(letter.upper, n, ctx.rng) };
    return { ...base, kind: 'listen-pick', skill: 'listening', word, options: wordOptions(word, n, ctx.rng) };
  });
}

function sentenceExercises(s: Sentence, count: number, ctx: GenContext): Exercise[] {
  const a = ctx.profile.ability;
  const n = Math.min(3, optionCount(a));
  const weights: { value: ExerciseKind; weight: number }[] = [
    { value: 'sentence-picture', weight: 2 },
    { value: 'listen-sentence', weight: 2 },
    { value: 'sentence-build', weight: a >= 2.5 ? 2.5 : 1 },
    { value: 'say-sentence', weight: ctx.speaking && a >= 2.8 ? 1.2 : 0 },
  ];
  const chosen: ExerciseKind[] = [];
  for (let i = 0; i < count; i++) {
    const k = weightedPick(weights.filter((w) => !chosen.includes(w.value)), ctx.rng);
    if (k) chosen.push(k);
  }
  return chosen.map((kind): Exercise => {
    const base = { uid: nextUid(), itemId: s.id };
    if (kind === 'sentence-picture') return { ...base, kind, skill: 'reading', sentence: s, options: sentenceOptions(s, n, ctx.rng) };
    if (kind === 'listen-sentence') return { ...base, kind, skill: 'listening', sentence: s, options: sentenceOptions(s, n, ctx.rng) };
    if (kind === 'say-sentence') return { ...base, kind, skill: 'speaking', sentence: s };
    const words = s.en.split(' ');
    let tiles = shuffle(words, ctx.rng);
    if (tiles.join(' ') === s.en) tiles = [...tiles.slice(1), tiles[0]];
    return { ...base, kind: 'sentence-build', skill: 'reading', sentence: s, tiles };
  });
}

export function storyQuestionExercise(story: Story, qi: number, ctx: GenContext): Exercise {
  const q = story.questions[qi];
  return {
    uid: nextUid(),
    itemId: `${story.id}-q${qi}`,
    skill: 'reading',
    kind: 'story-question',
    story,
    question: q,
    options: shuffle([q.answer, ...q.wrong], ctx.rng),
  };
}

/** Exercise for an arbitrary progress item id (used by reviews). */
export function reviewExercise(itemId: string, ctx: GenContext): Exercise | null {
  if (WORDS_BY_ID[itemId]) {
    const word = WORDS_BY_ID[itemId];
    return wordExercises(word, 1, ctx, ['say-word'])[0];
  }
  if (LETTERS_BY_ID[itemId]) return letterExercises(LETTERS_BY_ID[itemId], 1, ctx)[0];
  if (SENTENCES_BY_ID[itemId]) return sentenceExercises(SENTENCES_BY_ID[itemId], 1, ctx)[0];
  const m = itemId.match(/^(story-\d+)-q(\d+)$/);
  if (m && STORIES_BY_ID[m[1]]) return storyQuestionExercise(STORIES_BY_ID[m[1]], Number(m[2]), ctx);
  return null;
}

/* ---------- Ordering helpers ---------- */

/** Shuffles while trying to avoid the same item or kind twice in a row. */
function spread(exs: Exercise[], rng: Rng): Exercise[] {
  let best = shuffle(exs, rng);
  const clashes = (list: Exercise[]) =>
    list.reduce((c, e, i) => c + (i > 0 && (list[i - 1].itemId === e.itemId || list[i - 1].kind === e.kind) ? 1 : 0), 0);
  let bestScore = clashes(best);
  for (let i = 0; i < 12 && bestScore > 0; i++) {
    const cand = shuffle(exs, rng);
    const score = clashes(cand);
    if (score < bestScore) {
      best = cand;
      bestScore = score;
    }
  }
  return best;
}

function dueReviews(ctx: GenContext, exclude: string[], max: number): string[] {
  const entries = Object.entries(ctx.profile.items)
    .filter(([id, p]) => !exclude.includes(id) && isDue(p, ctx.now))
    .sort((a, b) => a[1].due - b[1].due);
  return entries.slice(0, max).map(([id]) => id);
}

function memoryExercise(words: Word[], ctx: GenContext): Exercise | null {
  const unique: Word[] = [];
  for (const w of words) if (!unique.some((u) => sameLook(u, w))) unique.push(w);
  if (unique.length < 3) return null;
  return { uid: nextUid(), kind: 'memory', skill: 'vocab', words: sample(unique, Math.min(unique.length, ctx.profile.ability < 2 ? 3 : 4), ctx.rng) };
}

/* ---------- Lesson generation ---------- */

export function generateStageLesson(stage: Stage, ctx: GenContext): Exercise[] {
  const island = ISLANDS_BY_ID[stage.islandId];
  return stage.boss ? bossLesson(island, ctx) : regularLesson(island, stage, ctx);
}

function isNew(ctx: GenContext, id: string) {
  const p = ctx.profile.items[id];
  return !p || p.box < 2;
}

function regularLesson(island: Island, stage: Stage, ctx: GenContext): Exercise[] {
  const { rng } = ctx;
  const intro: Exercise[] = [];
  const later: Exercise[] = [];
  const reviewCount = ctx.profile.ability < 2 ? 2 : 3;

  if (island.kind === 'words') {
    const words = stage.itemIds.map((id) => WORDS_BY_ID[id]);
    for (const word of words) {
      if (isNew(ctx, word.id)) intro.push({ uid: nextUid(), kind: 'learn-word', word, itemId: word.id });
      const [first, second] = wordExercises(word, 2, ctx);
      intro.push(first);
      later.push(second);
    }
    const memoryWords = [...words, ...sample(island.itemIds.map((id) => WORDS_BY_ID[id]).filter((w) => !words.includes(w)), 2, rng)];
    const mem = memoryExercise(memoryWords, ctx);
    const reviews = dueReviews(ctx, stage.itemIds, reviewCount)
      .map((id) => reviewExercise(id, ctx))
      .filter((e): e is Exercise => !!e);
    return [...intro, ...spread([...later, ...reviews], rng), ...(mem ? [mem] : [])];
  }

  if (island.kind === 'letters') {
    const letters = stage.itemIds.map((id) => LETTERS_BY_ID[id]);
    for (const letter of letters) {
      if (isNew(ctx, letter.id))
        intro.push({ uid: nextUid(), kind: 'learn-letter', letter, word: WORDS_BY_ID[letter.wordId], itemId: letter.id });
      const [first, second] = letterExercises(letter, 2, ctx);
      intro.push(first);
      if (second) later.push(second);
    }
    const mem = memoryExercise(letters.map((l) => WORDS_BY_ID[l.wordId]), ctx);
    return [...intro, ...spread(later, rng), ...(mem ? [mem] : [])];
  }

  if (island.kind === 'sentences') {
    const sentences = stage.itemIds.map((id) => SENTENCES_BY_ID[id]);
    for (const s of sentences) {
      if (isNew(ctx, s.id)) intro.push({ uid: nextUid(), kind: 'learn-sentence', sentence: s, itemId: s.id });
      const [first, second] = sentenceExercises(s, 2, ctx);
      intro.push(first);
      if (second) later.push(second);
    }
    const reviews = dueReviews(ctx, stage.itemIds, reviewCount)
      .map((id) => reviewExercise(id, ctx))
      .filter((e): e is Exercise => !!e);
    return [...intro, ...spread([...later, ...reviews], rng)];
  }

  // stories: read the story, then answer its questions
  const out: Exercise[] = [];
  for (const id of stage.itemIds) {
    const story = STORIES_BY_ID[id];
    out.push({ uid: nextUid(), kind: 'read-story', story });
    story.questions.forEach((_, qi) => out.push(storyQuestionExercise(story, qi, ctx)));
  }
  return out;
}

function bossLesson(island: Island, ctx: GenContext): Exercise[] {
  const { rng } = ctx;
  const size = ctx.profile.ability < 2 ? 8 : 10;

  if (island.kind === 'words') {
    const words = sample(island.itemIds.map((id) => WORDS_BY_ID[id]), size, rng);
    // The boss leans on the harder exercise types.
    const exs = words.map((w) =>
      wordExercises(w, 1, ctx, ctx.profile.ability >= 2 ? ['listen-pick', 'first-letter'] : [])[0],
    );
    const mem = memoryExercise(sample(island.itemIds.map((id) => WORDS_BY_ID[id]), 6, rng), ctx);
    return [...spread(exs, rng), ...(mem ? [mem] : [])];
  }
  if (island.kind === 'letters') {
    const letters = sample(LETTERS, size, rng);
    return spread(letters.map((l) => letterExercises(l, 1, ctx)[0]), rng);
  }
  if (island.kind === 'sentences') {
    const sentences = sample(island.itemIds.map((id) => SENTENCES_BY_ID[id]), size, rng);
    return spread(sentences.map((s) => sentenceExercises(s, 1, ctx)[0]), rng);
  }
  const stories = sample(STORIES, 3, rng);
  const qs = stories.flatMap((s) => s.questions.map((_, qi) => storyQuestionExercise(s, qi, ctx)));
  const builds = sample(SENTENCES.filter((s) => s.level >= 4), 2, rng).map((s) => sentenceExercises(s, 1, ctx)[0]);
  return [...sample(qs, size - builds.length, rng), ...builds];
}

/** Mixed review session built from due (or weakest) items. */
export function generatePractice(ctx: GenContext, size = 10): Exercise[] {
  const seen = Object.entries(ctx.profile.items).filter(([, p]) => p.seen > 0);
  if (seen.length === 0) return [];
  const due = seen.filter(([, p]) => isDue(p, ctx.now)).sort((a, b) => a[1].due - b[1].due);
  const weak = seen
    .filter(([id]) => !due.some(([d]) => d === id))
    .sort((a, b) => strength(a[1]) - strength(b[1]));
  const ids = [...due, ...weak].slice(0, size).map(([id]) => id);
  const exs = ids.map((id) => reviewExercise(id, ctx)).filter((e): e is Exercise => !!e);
  const words = ids.map((id) => WORDS_BY_ID[id]).filter(Boolean);
  const mem = words.length >= 4 ? memoryExercise(words, ctx) : null;
  return [...spread(exs, ctx.rng), ...(mem ? [mem] : [])];
}

