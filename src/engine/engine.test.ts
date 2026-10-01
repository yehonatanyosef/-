import { describe, expect, it } from 'vitest';
import { ALL_STAGES, ISLANDS, STAGES_BY_ID } from '../data/islands';
import { GRAMMAR_BY_ID, grammarSentence } from '../data/grammar';
import { LETTERS_BY_ID } from '../data/letters';
import { SENTENCES_BY_ID } from '../data/sentences';
import { STORIES_BY_ID } from '../data/stories';
import { PHRASES_BY_ID } from '../data/talk';
import { ALL_WORDS, WORDS_BY_ID } from '../data/words';
import type { Profile } from '../types';
import { answerText, easier, isGraded, type Exercise } from './exercises';
import { generatePractice, generateStageLesson, wordOptions, type GenContext } from './lessonGen';
import { answerPlacement, MAX_QUESTIONS, placementDone, placementQuestion, placementResult, startPlacement, startTier } from './placement';
import { applyLesson, applyPlacement, createProfile, currentStage, isStageUnlocked, starsFor } from './progress';
import { seeded } from './random';
import { matchesSpeech } from './speech';
import { isLearned, review } from './srs';

const NOW = new Date('2026-03-10T10:00:00').getTime();
const DAY = 86400000;

function ctx(profile: Profile, seed = 1, speaking = true): GenContext {
  return { profile, speaking, rng: seeded(seed), now: NOW };
}

/** Checks that an exercise is internally consistent (the answer is reachable). */
function assertValid(ex: Exercise) {
  switch (ex.kind) {
    case 'listen-pick':
    case 'word-pick-picture':
    case 'picture-pick-word':
    case 'translate-pick':
      expect(ex.options.filter((o) => o.id === ex.word.id)).toHaveLength(1);
      expect(new Set(ex.options.map((o) => o.en)).size).toBe(ex.options.length);
      expect(new Set(ex.options.map((o) => o.emoji + (o.swatch ?? ''))).size).toBe(ex.options.length);
      break;
    case 'first-letter':
      expect(ex.options).toContain(ex.word.en[0].toUpperCase());
      expect(new Set(ex.options).size).toBe(ex.options.length);
      break;
    case 'letter-listen':
    case 'letter-case':
      expect(ex.options.map((o) => o.id)).toContain(ex.letter.id);
      break;
    case 'missing-letter':
      expect(ex.options).toContain(ex.word.en[ex.index].toLowerCase());
      expect(new Set(ex.options).size).toBe(ex.options.length);
      break;
    case 'spell-tiles': {
      const pool = [...ex.tiles];
      for (const c of ex.word.en.toLowerCase()) {
        const i = pool.indexOf(c);
        expect(i).toBeGreaterThanOrEqual(0);
        pool.splice(i, 1);
      }
      break;
    }
    case 'sentence-build':
      expect([...ex.tiles].sort()).toEqual(ex.sentence.en.split(' ').sort());
      break;
    case 'sentence-picture':
    case 'listen-sentence':
      expect(ex.options.map((o) => o.id)).toContain(ex.sentence.id);
      break;
    case 'story-question':
      expect(ex.options).toContain(ex.question.answer);
      break;
    case 'memory':
      expect(ex.words.length).toBeGreaterThanOrEqual(3);
      break;
    case 'dialog-reply':
      expect(ex.options.filter((o) => o === ex.phrase.reply)).toHaveLength(1);
      expect(new Set(ex.options).size).toBe(ex.options.length);
      break;
    case 'grammar-choice':
      expect(ex.options.filter((o) => o === ex.item.answer)).toHaveLength(1);
      expect(grammarSentence(ex.item)).not.toContain('___');
      break;
  }
  if (isGraded(ex) && ex.kind !== 'memory') expect(answerText(ex)).not.toBe('');
}

describe('curriculum data', () => {
  it('every stage references existing items and each island ends with a boss', () => {
    for (const island of ISLANDS) {
      expect(island.stages.length).toBeGreaterThanOrEqual(3);
      expect(island.stages[island.stages.length - 1].boss).toBe(true);
      for (const stage of island.stages) {
        expect(stage.itemIds.length).toBeGreaterThan(0);
        for (const id of stage.itemIds) {
          expect(WORDS_BY_ID[id] || LETTERS_BY_ID[id] || SENTENCES_BY_ID[id] || STORIES_BY_ID[id] || PHRASES_BY_ID[id] || GRAMMAR_BY_ID[id]).toBeTruthy();
        }
      }
    }
  });

  it('every word has a picture and unique id', () => {
    expect(new Set(ALL_WORDS.map((w) => w.id)).size).toBe(ALL_WORDS.length);
    for (const w of ALL_WORDS) expect(w.emoji || w.swatch).toBeTruthy();
  });

  it('word options contain the answer once and no look-alikes', () => {
    const rng = seeded(7);
    for (const w of ALL_WORDS) {
      const opts = wordOptions(w, 4, rng);
      expect(opts).toHaveLength(4);
      expect(opts.filter((o) => o.id === w.id)).toHaveLength(1);
      expect(opts.filter((o) => o.en === w.en)).toHaveLength(1);
    }
  });
});

describe('lesson generation', () => {
  it('builds valid lessons for every stage across ability levels and ages', () => {
    for (const [age, ability] of [
      [5, 1],
      [7, 2.2],
      [9, 3.3],
      [10, 4.6],
    ]) {
      const profile = { ...createProfile('t', age, '🦸', NOW), ability };
      for (const stage of ALL_STAGES) {
        const lesson = generateStageLesson(stage, ctx(profile, stage.index + 3));
        expect(lesson.length).toBeGreaterThanOrEqual(3);
        expect(lesson.filter(isGraded).length).toBeGreaterThanOrEqual(2);
        lesson.forEach(assertValid);
        lesson.filter(isGraded).forEach((ex, i) => assertValid(easier(ex, `r${i}`)));
      }
    }
  });

  it('beginners get fewer options and no typing; advanced kids get harder exercises', () => {
    const young = { ...createProfile('a', 5, '🦸', NOW), ability: 1 };
    const kinds = new Set<string>();
    for (let s = 0; s < 30; s++) {
      for (const ex of generateStageLesson(STAGES_BY_ID['animals-0'], ctx(young, s))) {
        kinds.add(ex.kind);
        if ('options' in ex && ex.kind !== 'story-question') expect(ex.options.length).toBeLessThanOrEqual(3);
      }
    }
    expect(kinds.has('spell-type')).toBe(false);
    expect(kinds.has('translate-pick')).toBe(false);

    const advanced = { ...createProfile('b', 10, '🦸', NOW), ability: 4.5 };
    const advKinds = new Set<string>();
    for (let s = 0; s < 30; s++) for (const ex of generateStageLesson(STAGES_BY_ID['food-1'], ctx(advanced, s))) advKinds.add(ex.kind);
    expect(advKinds.has('spell-type')).toBe(true);
  });

  it('skips speaking exercises when speech recognition is unavailable', () => {
    const p = { ...createProfile('a', 8, '🦸', NOW), ability: 3 };
    for (let s = 0; s < 20; s++) {
      const lesson = generateStageLesson(STAGES_BY_ID['animals-1'], ctx(p, s, false));
      expect(lesson.some((e) => e.kind === 'say-word' || e.kind === 'say-sentence')).toBe(false);
    }
  });

  it('shows the "new word" card only for words the child does not know yet', () => {
    const p = createProfile('a', 8, '🦸', NOW);
    const first = generateStageLesson(STAGES_BY_ID['animals-0'], ctx(p));
    expect(first.filter((e) => e.kind === 'learn-word')).toHaveLength(4);
    const known = { ...p, items: Object.fromEntries(STAGES_BY_ID['animals-0'].itemIds.map((id) => [id, { box: 3, seen: 3, correct: 3, wrong: 0, due: NOW + DAY, last: NOW }])) };
    expect(generateStageLesson(STAGES_BY_ID['animals-0'], ctx(known)).filter((e) => e.kind === 'learn-word')).toHaveLength(0);
  });

  it('practice uses due items and is empty for a brand-new profile', () => {
    const p = createProfile('a', 8, '🦸', NOW);
    expect(generatePractice(ctx(p))).toHaveLength(0);
    const withItems = { ...p, items: { 'animals-cat': { box: 2, seen: 2, correct: 2, wrong: 0, due: NOW - 1, last: NOW - DAY } } };
    const practice = generatePractice(ctx(withItems));
    expect(practice.some((e) => e.itemId === 'animals-cat')).toBe(true);
  });
});

describe('spaced repetition', () => {
  it('moves items up on success and down on mistakes', () => {
    let p = review(undefined, true, NOW);
    expect(p.box).toBe(1);
    p = review(p, true, NOW);
    p = review(p, true, NOW);
    expect(p.box).toBe(3);
    expect(p.due).toBe(NOW + 3 * DAY);
    expect(isLearned(p)).toBe(true);
    p = review(p, false, NOW);
    expect(p.box).toBe(1);
    expect(p.wrong).toBe(1);
  });
});

describe('placement test', () => {
  /** Kinds that need the child to read English text. */
  const READING = ['word-pick-picture', 'picture-pick-word', 'missing-letter', 'spell-tiles', 'sentence-picture', 'listen-sentence', 'dialog-reply', 'grammar-choice', 'story-question', 'letter-case'];

  /** Runs the test; `knows(tier)` says whether the child answers questions of that step correctly. */
  function run(age: number, knows: (tier: number) => boolean, seed = 11, profileOver: Partial<Profile> = {}) {
    const profile = { ...createProfile('t', age, '🦸', NOW), ...profileOver };
    let s = startPlacement(age);
    const rng = seeded(seed);
    const asked: { tier: number; kind: string; ex: Exercise }[] = [];
    while (!placementDone(s)) {
      const q = placementQuestion(s, profile, rng);
      assertValid(q);
      asked.push({ tier: s.tier, kind: q.kind, ex: q });
      s = answerPlacement(s, q, knows(s.tier));
    }
    return { ...placementResult(s), asked, state: s };
  }

  it('young children start with sound-and-picture questions only', () => {
    for (const age of [4, 5, 6]) {
      expect(startTier(age)).toBe(0);
      const { asked } = run(age, () => false);
      expect(asked[0].kind).toBe('listen-pick');
      expect(asked.every((a) => !READING.includes(a.kind))).toBe(true);
    }
  });

  it('a 4-year-old who knows no English gets a short, gentle test and level 1', () => {
    const r = run(4, () => false);
    expect(r.asked.length).toBeLessThanOrEqual(3);
    expect(r.level).toBe(1);
  });

  it('climbs one step at a time and never skips a step', () => {
    const r = run(9, () => true);
    for (let i = 1; i < r.asked.length; i++) expect(r.asked[i].tier - r.asked[i - 1].tier).toBeLessThanOrEqual(1);
    expect(r.level).toBe(5);
  });

  it('stops at the first step the child cannot do', () => {
    // Reads simple words (step 2) but cannot spell (step 3).
    const r = run(8, (t) => t <= 2);
    expect(r.passed).toBe(2);
    expect(r.level).toBe(2);
    expect(r.asked.some((a) => a.tier >= 4)).toBe(false);
  });

  it('a pre-reader who knows letters stays below the reading level', () => {
    const r = run(5, (t) => t <= 1);
    expect(r.passed).toBe(1);
    expect(r.ability).toBeLessThan(1.6);
  });

  it('an older child who knows nothing steps down to the easy questions', () => {
    const r = run(10, () => false);
    expect(r.asked[0].tier).toBe(2);
    expect(r.asked.some((a) => a.tier === 0)).toBe(true);
    expect(r.level).toBe(1);
  });

  it('uses words from the topics the child loves', () => {
    const r = run(5, (t) => t === 0, 3, { interests: { topics: ['animals'], games: [] } });
    const words = r.asked.filter((a) => a.kind === 'listen-pick').map((a) => (a.ex as Extract<Exercise, { kind: 'listen-pick' }>).word);
    expect(words.length).toBeGreaterThan(0);
    expect(words.every((w) => w.topic === 'animals')).toBe(true);
  });

  it('children under 7 are never asked letter completion or sentences, even when they know everything', () => {
    for (const age of [4, 5, 6]) {
      const r = run(age, () => true);
      expect(r.asked.every((a) => a.tier <= 2)).toBe(true);
      expect(r.asked.some((a) => ['missing-letter', 'spell-tiles', 'sentence-picture', 'dialog-reply', 'grammar-choice', 'listen-sentence', 'story-question'].includes(a.kind))).toBe(false);
      expect(r.level).toBe(2);
    }
  });

  it('never runs longer than the maximum', () => {
    let flip = false;
    const r = run(9, () => (flip = !flip));
    expect(r.asked.length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });
});

describe('age-appropriate content', () => {
  const LETTER_WORK = ['missing-letter', 'spell-tiles', 'spell-type', 'first-letter'];
  const SENTENCE_KINDS = ['sentence-picture', 'listen-sentence', 'sentence-build', 'say-sentence', 'dialog-reply', 'say-reply', 'grammar-choice', 'story-question'];
  const wordStages = ALL_STAGES.filter((s) => ['abc', 'animals', 'colors', 'food', 'home', 'nature', 'body', 'actions'].includes(s.islandId));

  it('under 7 (and 7 at a low level) lessons have no letter completion or sentence reading', () => {
    for (const [age, ability] of [
      [5, 2.5],
      [6, 3.5],
      [7, 2.0],
    ]) {
      const p = { ...createProfile('a', age, '🦸', NOW), ability };
      for (const stage of wordStages)
        for (let seed = 0; seed < 4; seed++)
          for (const ex of generateStageLesson(stage, ctx(p, seed))) {
            expect(LETTER_WORK).not.toContain(ex.kind);
            expect(SENTENCE_KINDS).not.toContain(ex.kind);
          }
    }
  });

  it('letter completion is available from 8, or 7 at a good level', () => {
    for (const [age, ability] of [
      [8, 2.2],
      [7, 3],
    ]) {
      const p = { ...createProfile('a', age, '🦸', NOW), ability };
      const kinds = new Set<string>();
      for (let seed = 0; seed < 30; seed++) generateStageLesson(STAGES_BY_ID['food-1'], ctx(p, seed)).forEach((e) => kinds.add(e.kind));
      expect(LETTER_WORK.some((k) => kinds.has(k))).toBe(true);
    }
  });

  it('sentence islands stay closed for young children and the path skips them', () => {
    const done = { stars: 2, bestAccuracy: 0.8, plays: 1 };
    const stages = Object.fromEntries(
      ['abc', 'animals', 'colors'].flatMap((id) => ISLANDS.find((i) => i.id === id)!.stages.map((s) => [s.id, done])),
    );
    const six = { ...createProfile('a', 6, '🦸', NOW), ability: 3, stages };
    expect(isStageUnlocked(six, STAGES_BY_ID['talk-0'])).toBe(false);
    expect(isStageUnlocked(six, STAGES_BY_ID['food-0'])).toBe(true);
    expect(currentStage(six)?.id).toBe('food-0');
    const eight = { ...six, age: 8 };
    expect(isStageUnlocked(eight, STAGES_BY_ID['talk-0'])).toBe(true);
    expect(currentStage(eight)?.id).toBe('talk-0');
  });
});

describe('interests', () => {
  const interests = (topics: string[], games: string[]) => ({ interests: { topics, games } });

  it('a young pre-reader gets no reading exercises in lessons', () => {
    const p = { ...createProfile('a', 4, '🦸', NOW), ability: 1.3 };
    for (let seed = 0; seed < 30; seed++) {
      const lesson = generateStageLesson(STAGES_BY_ID['animals-0'], ctx(p, seed));
      expect(lesson.some((e) => e.kind === 'word-pick-picture' || e.kind === 'spell-tiles')).toBe(false);
    }
  });

  it('memory-game fans get an extra memory game', () => {
    const base = { ...createProfile('a', 7, '🦸', NOW), ability: 2.5 };
    const count = (p: Profile) => generateStageLesson(STAGES_BY_ID['animals-1'], ctx(p, 4)).filter((e) => e.kind === 'memory').length;
    expect(count(base)).toBe(1);
    expect(count({ ...base, ...interests([], ['memory']) })).toBe(2);
  });

  it('favourite kinds of games come up more often', () => {
    const base = { ...createProfile('a', 8, '🦸', NOW), ability: 3 };
    const puzzles = (p: Profile) => {
      let n = 0;
      for (let seed = 0; seed < 40; seed++)
        n += generateStageLesson(STAGES_BY_ID['food-1'], ctx(p, seed, false)).filter((e) => ['spell-tiles', 'missing-letter', 'first-letter'].includes(e.kind)).length;
      return n;
    };
    expect(puzzles({ ...base, ...interests([], ['puzzles']) })).toBeGreaterThan(puzzles(base) * 1.2);
  });

  it('a favourite island opens early once the child is ready, without moving the main path', () => {
    const p = applyPlacement({ ...createProfile('a', 6, '🦸', NOW), ...interests(['animals'], []) }, 1, 1.3, NOW);
    expect(isStageUnlocked(p, STAGES_BY_ID['animals-0'])).toBe(true);
    expect(currentStage(p)?.id).toBe('abc-0');
    // Not ready yet for a level-3 favourite.
    const q = applyPlacement({ ...createProfile('b', 6, '🦸', NOW), ...interests(['sports'], []) }, 1, 1.3, NOW);
    expect(isStageUnlocked(q, STAGES_BY_ID['actions-0'])).toBe(false);
  });

  it('practice leans towards favourite topics', () => {
    const item = { box: 2, seen: 3, correct: 2, wrong: 1, due: NOW + DAY, last: NOW - DAY };
    const items = Object.fromEntries([...ALL_WORDS.filter((w) => w.topic === 'food').slice(0, 10), ...ALL_WORDS.filter((w) => w.topic === 'animals').slice(0, 10)].map((w) => [w.id, item]));
    const p = { ...createProfile('a', 8, '🦸', NOW), ability: 2.5, items, ...interests(['animals'], []) };
    const ids = generatePractice(ctx(p)).map((e) => e.itemId).filter(Boolean) as string[];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith('animals-'))).toBe(true);
  });
});

describe('progress & unlocking', () => {
  it('a new child starts at the first stage of the first island', () => {
    const p = createProfile('a', 6, '🦸', NOW);
    expect(currentStage(p)?.id).toBe('abc-0');
    expect(isStageUnlocked(p, STAGES_BY_ID['abc-1'])).toBe(false);
  });

  it('placement opens earlier islands and starts at the matching island', () => {
    const p = applyPlacement(createProfile('a', 9, '🦸', NOW), 3, 3, NOW);
    expect(currentStage(p)?.id).toBe('food-0');
    expect(isStageUnlocked(p, STAGES_BY_ID['animals-2'])).toBe(true);
    expect(isStageUnlocked(p, STAGES_BY_ID['home-0'])).toBe(false);
    expect(p.items['animals-cat']?.box).toBe(2);
  });

  it('finishing a stage unlocks the next one and gives rewards', () => {
    const p = createProfile('a', 7, '🦸', NOW);
    const { profile, rewards } = applyLesson(
      p,
      {
        stageId: 'abc-0',
        boss: false,
        seconds: 120,
        answers: [
          { itemId: 'letter-a', skill: 'phonics', correct: true, first: true },
          { itemId: 'letter-b', skill: 'phonics', correct: true, first: true },
          { itemId: 'letter-c', skill: 'reading', correct: false, first: true },
          { itemId: 'letter-c', skill: 'reading', correct: true, first: false },
        ],
      },
      NOW,
    );
    expect(rewards.stars).toBe(starsFor(2 / 3));
    expect(rewards.xp).toBeGreaterThan(0);
    expect(profile.coins).toBe(rewards.coins);
    expect(isStageUnlocked(profile, STAGES_BY_ID['abc-1'])).toBe(true);
    expect(profile.streak).toBe(1);
    expect(profile.achievements).toContain('first-step');
    expect(profile.activity['2026-03-10'].seconds).toBe(120);
  });

  it('ability goes up after strong lessons and down after weak ones', () => {
    const p = { ...createProfile('a', 7, '🦸', NOW), ability: 2.5 };
    const all = (correct: boolean) => Array.from({ length: 10 }, () => ({ skill: 'vocab', correct, first: true }));
    expect(applyLesson(p, { stageId: null, boss: false, seconds: 1, answers: all(true) }, NOW).profile.ability).toBeGreaterThan(2.5);
    expect(applyLesson(p, { stageId: null, boss: false, seconds: 1, answers: all(false) }, NOW).profile.ability).toBeLessThan(2.5);
  });

  it('counts streaks over consecutive days and resets after a gap', () => {
    let p = createProfile('a', 7, '🦸', NOW);
    const lesson = { stageId: null, boss: false, seconds: 60, answers: [{ correct: true, first: true }] };
    p = applyLesson(p, lesson, NOW).profile;
    p = applyLesson(p, lesson, NOW + 1000).profile;
    expect(p.streak).toBe(1);
    p = applyLesson(p, lesson, NOW + DAY).profile;
    expect(p.streak).toBe(2);
    p = applyLesson(p, lesson, NOW + 4 * DAY).profile;
    expect(p.streak).toBe(1);
    expect(p.bestStreak).toBe(2);
  });

  it('an island added in an update does not lock islands the child already reached', () => {
    // Child finished "colors" and played "food" before "talk" was added between them.
    const p = createProfile('a', 8, '🦸', NOW);
    const done = { stars: 2, bestAccuracy: 0.8, plays: 1 };
    const stages = Object.fromEntries(
      ['abc', 'animals', 'colors'].flatMap((id) => ISLANDS.find((i) => i.id === id)!.stages.map((s) => [s.id, done])),
    );
    const withFood = { ...p, stages: { ...stages, 'food-0': done } };
    expect(isStageUnlocked(withFood, STAGES_BY_ID['talk-0'])).toBe(true);
    expect(isStageUnlocked(withFood, STAGES_BY_ID['food-1'])).toBe(true);
    expect(currentStage(withFood)?.id).toBe('food-1');
    // A child who has not reached "food" yet must go through "talk" first.
    expect(isStageUnlocked({ ...p, stages }, STAGES_BY_ID['food-0'])).toBe(false);
  });

  it('grammar stages each teach one rule, starting with an explanation', () => {
    const p = { ...createProfile('a', 9, '🦸', NOW), ability: 3.5 };
    const island = ISLANDS.find((i) => i.id === 'grammar')!;
    for (const stage of island.stages.filter((s) => !s.boss)) {
      expect(new Set(stage.itemIds.map((id) => GRAMMAR_BY_ID[id].rule)).size).toBe(1);
      const lesson = generateStageLesson(stage, ctx(p));
      expect(lesson[0].kind).toBe('learn-rule');
    }
  });

  it('a strong learner can challenge the boss early', () => {
    const p = { ...createProfile('a', 9, '🦸', NOW), ability: 2.5 };
    const boss = ISLANDS[0].stages[ISLANDS[0].stages.length - 1];
    expect(isStageUnlocked(p, boss)).toBe(true);
    expect(isStageUnlocked({ ...p, ability: 1.5 }, boss)).toBe(false);
  });
});

describe('speech matching', () => {
  it('accepts close pronunciations and rejects wrong words', () => {
    expect(matchesSpeech(['cat'], 'cat')).toBe(true);
    expect(matchesSpeech(['a cat'], 'cat')).toBe(true);
    expect(matchesSpeech(['elefant'], 'elephant')).toBe(true);
    expect(matchesSpeech(['3'], 'three')).toBe(true);
    expect(matchesSpeech(['banana'], 'cat')).toBe(false);
    expect(matchesSpeech(['the dog can run'], 'The dog can run.')).toBe(true);
    expect(matchesSpeech(['i like pizza'], 'The fish can swim.')).toBe(false);
  });
});
