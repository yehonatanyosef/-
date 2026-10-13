import { describe, expect, it } from 'vitest';
import { STAGES_BY_ID } from '../data/islands';
import { WORDS_BY_ID } from '../data/words';
import type { ItemProgress, Profile } from '../types';
import { learningReport, wordProgressList } from './learning';
import { missionStatus, nextMissionGame, NEW_WORDS_PER_DAY, stageWithNewItems } from './mission';
import { applyLesson, applyPlacement, createProfile, currentStage, todayMission, type AnswerLog } from './progress';
import { review } from './srs';
import { mergeProfile } from './sync';

const NOW = new Date('2026-03-10T10:00:00').getTime(); // a Tuesday
const DAY = 86400000;

function child(over: Partial<Profile> = {}): Profile {
  return { ...applyPlacement(createProfile('t', 8, '🦸', NOW), 2, 2.2, NOW), ...over };
}

const answers = (ids: string[], correct = true): AnswerLog[] => ids.flatMap((itemId) => [{ itemId, correct, first: true }, { itemId, correct, first: false }]);
const play = (p: Profile, ids: string[], at: number, correct = true, stageId: string | null = 'animals-0') =>
  applyLesson(p, { stageId, boss: false, answers: answers(ids, correct), seconds: 60 }, at);

const stage = STAGES_BY_ID['animals-0'];

describe('word learning steps', () => {
  it('a word is only "learned" after it is remembered on a later day', () => {
    let p = child();
    const first = play(p, stage.itemIds, NOW);
    p = first.profile;
    expect(first.rewards.newWords.length).toBe(stage.itemIds.length);
    expect(first.rewards.rememberedNow).toHaveLength(0);
    expect(learningReport(p, NOW).counts).toEqual({ learning: stage.itemIds.length, remembered: 0, mastered: 0 });

    // The next day the words come back and are answered correctly.
    const next = applyLesson(p, { stageId: null, boss: false, answers: stage.itemIds.map((itemId) => ({ itemId, correct: true, first: true })), seconds: 60 }, NOW + DAY);
    expect(next.rewards.rememberedNow.length).toBe(stage.itemIds.length);
    expect(next.rewards.newWords).toHaveLength(0);
    expect(learningReport(next.profile, NOW + DAY).counts.remembered).toBe(stage.itemIds.length);
  });

  it('records when a word was first met and first remembered, and keeps the earliest across devices', () => {
    let prog: ItemProgress | undefined;
    prog = review(prog, true, NOW);
    expect(prog.first).toBe(NOW);
    prog = review(prog, true, NOW + 1000);
    expect(prog.first).toBe(NOW);
    expect(prog.recalled).toBeUndefined();
    prog = review(prog, true, NOW + DAY);
    expect(prog.recalled).toBe(NOW + DAY);
    prog = review(prog, false, NOW + 2 * DAY);
    expect(prog.recalled).toBe(NOW + DAY); // a later mistake doesn't erase the milestone

    const id = stage.itemIds[0];
    const a = child({ items: { [id]: { ...prog, first: NOW - DAY, last: NOW } }, updatedAt: NOW });
    const b = child({ items: { [id]: { ...prog, first: NOW, recalled: NOW - DAY, last: NOW + 5 } }, updatedAt: NOW + 5 });
    const m = mergeProfile(a, b).items[id];
    expect(m.first).toBe(NOW - DAY);
    expect(m.recalled).toBe(NOW - DAY);
    expect(m.last).toBe(NOW + 5);
  });

  it('words placed by the level test are not counted as words the child met', () => {
    const p = child();
    expect(Object.keys(p.items).length).toBeGreaterThan(0);
    expect(wordProgressList(p)).toHaveLength(0);
  });

  it('the same word in two topics counts once', () => {
    const p = play(child(), ['abc-cat', 'animals-cat'].filter((id) => WORDS_BY_ID[id]), NOW).profile;
    expect(wordProgressList(p).filter((w) => w.word.en === 'cat')).toHaveLength(1);
  });

  it('counts new and learned words per week, with tips for the parent', () => {
    let p = play(child(), stage.itemIds, NOW - 7 * DAY).profile; // last week
    p = play(p, STAGES_BY_ID['animals-1'].itemIds, NOW).profile; // this week
    const r = learningReport(p, NOW);
    expect(r.lastWeek.met).toBe(stage.itemIds.length);
    expect(r.thisWeek.met).toBe(STAGES_BY_ID['animals-1'].itemIds.length);
    expect(r.weeks).toHaveLength(6);
    const idle = learningReport({ ...p, lastPlayDay: '2026-03-05' }, NOW);
    expect(idle.insights.some((i) => i.tone === 'warn')).toBe(true);
  });

  it('flags words answered wrongly as needing strengthening', () => {
    const p = play(child(), stage.itemIds.slice(0, 3), NOW, false).profile;
    expect(learningReport(p, NOW).struggling.length).toBe(3);
  });
});

describe('the daily mission makes sure new words are learned', () => {
  it('counts new words met today', () => {
    const p = play(child(), stage.itemIds, NOW).profile;
    expect(todayMission(p, NOW).newWords).toBe(stage.itemIds.length);
    expect(missionStatus(p, 3, NOW).newWords).toBe(stage.itemIds.length);
  });

  it('starts a stage with new words when the next stage only repeats known words', () => {
    // animals-0 is finished; animals-1 is next, but its words were already met (e.g. in practice).
    let p = play(child(), stage.itemIds, NOW - 2 * 3600_000).profile;
    p = play(p, STAGES_BY_ID['animals-1'].itemIds, NOW - 3600_000, true, null).profile;
    expect(nextMissionGame({ ...p, unlocked: [...p.unlocked] }, NOW).stageId).toBe('animals-1'); // nothing else open
    p = { ...p, unlocked: [...p.unlocked, 'colors-0'] };
    expect(stageWithNewItems(p)?.id).toBe('colors-0');
    expect(nextMissionGame(p, NOW).stageId).toBe('colors-0');
    // Once enough new words were met today, the journey continues where it is.
    const enough = { ...p, daily: { ...todayMission(p, NOW), newWords: NEW_WORDS_PER_DAY } };
    expect(nextMissionGame(enough, NOW).stageId).toBe(currentStage(enough)!.id);
  });

  it('strengthens weak words first, then goes back to new words', () => {
    let p = play(child(), stage.itemIds, NOW - DAY, false).profile;
    p = play(p, STAGES_BY_ID['animals-1'].itemIds, NOW - DAY, false).profile;
    expect(nextMissionGame(p, NOW).stageId).toBeNull(); // practice
    p = applyLesson(p, { stageId: null, boss: false, answers: [], seconds: 60 }, NOW).profile;
    const after = nextMissionGame(p, NOW).stageId;
    expect(after).not.toBeNull();
    expect(NEW_WORDS_PER_DAY).toBeGreaterThan(0);
  });
});
