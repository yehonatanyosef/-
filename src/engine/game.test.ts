import { describe, expect, it } from 'vitest';
import { DECOR, DECOR_BY_ID } from '../data/decor';
import { WORDS_BY_ID } from '../data/words';
import type { ItemProgress, Profile } from '../types';
import { allIslandItems, bagItems, collectedItems, islandSize, islandSlots, placeItem, removeItem, rollChest, ISLAND_SIZES } from './island';
import { missionStatus, nextMissionGame, openChest, weekDays, weekKey, WEEKLY_DAYS } from './mission';
import { applyLesson, applyPlacement, createProfile, dayKey, todayMission } from './progress';
import { seeded } from './random';
import { mergeProfile } from './sync';

const NOW = new Date('2026-03-10T10:00:00').getTime(); // a Tuesday
const DAY = 86400000;
const learned: ItemProgress = { box: 2, seen: 2, correct: 2, wrong: 0, due: NOW + DAY, last: NOW };

function child(over: Partial<Profile> = {}): Profile {
  return { ...applyPlacement(createProfile('t', 8, '🦸', NOW), 2, 2.2, NOW), ...over };
}

function withLearned(p: Profile, ids: string[]): Profile {
  return { ...p, items: { ...p.items, ...Object.fromEntries(ids.map((id) => [id, learned])) } };
}

const animalIds = Object.values(WORDS_BY_ID)
  .filter((w) => w.topic === 'animals')
  .map((w) => w.id);

describe('daily mission', () => {
  it('every finished game counts towards today, and a new day starts again', () => {
    let p = child();
    expect(todayMission(p, NOW).games).toBe(0);
    for (let i = 0; i < 3; i++) p = applyLesson(p, { stageId: 'animals-0', boss: false, answers: [], seconds: 60 }, NOW).profile;
    expect(missionStatus(p, 3, NOW)).toMatchObject({ games: 3, complete: true, dailyClaimed: false });
    expect(todayMission(p, NOW + DAY).games).toBe(0);
  });

  it('a review session is suggested first when many words wait, then the journey', () => {
    const due: ItemProgress = { ...learned, due: NOW - 1 };
    let p = { ...child(), items: Object.fromEntries(animalIds.slice(0, 5).map((id) => [id, due])) };
    expect(nextMissionGame(p, NOW).stageId).toBeNull();
    p = applyLesson(p, { stageId: null, boss: false, answers: [], seconds: 60 }, NOW).profile;
    expect(todayMission(p, NOW).practiced).toBe(true);
    expect(nextMissionGame(p, NOW).stageId).not.toBeNull();
  });

  it('the daily chest opens once a day and gives coins and a new decoration', () => {
    const p = child();
    const { profile, reward } = openChest(p, 'daily', seeded(1), NOW);
    expect(reward.coins).toBeGreaterThan(0);
    expect(DECOR_BY_ID[reward.decor!].rare).toBe(false);
    expect(profile.coins).toBe(p.coins + reward.coins);
    expect(profile.island?.decor).toEqual([reward.decor]);
    expect(missionStatus(profile, 3, NOW).dailyClaimed).toBe(true);
  });

  it('5 mission days in a week (from Sunday) open the weekly chest with a rare decoration', () => {
    expect(weekKey(NOW)).toBe('2026-03-08');
    expect(weekDays(child(), NOW).map((d) => d.day)[0]).toBe('2026-03-08');
    const days = [0, 1, 2, 3].map((i) => dayKey(new Date('2026-03-08T10:00:00').getTime() + i * DAY));
    let p = child({ missionDays: days });
    expect(missionStatus(p, 3, NOW).weeklyReady).toBe(false);
    p = { ...p, missionDays: [...days, '2026-03-12'] };
    expect(missionStatus(p, 3, NOW).weekDone).toBe(WEEKLY_DAYS);
    expect(missionStatus(p, 3, NOW).weeklyReady).toBe(true);
    const out = openChest(p, 'weekly', seeded(2), NOW);
    expect(DECOR_BY_ID[out.reward.decor!].rare).toBe(true);
    expect(missionStatus(out.profile, 3, NOW).weeklyReady).toBe(false);
    // Days of last week don't count for this week.
    expect(missionStatus(child({ missionDays: ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'] }), 3, NOW).weekDone).toBe(0);
  });

  it('chests never repeat a decoration, and give extra coins once every one is owned', () => {
    let p = child();
    const rng = seeded(3);
    for (let i = 0; i < DECOR.length; i++) p = openChest(p, i % 2 ? 'weekly' : 'daily', rng, NOW + i * DAY).profile;
    expect(new Set(p.island!.decor).size).toBe(DECOR.length);
    const last = rollChest(p, 'daily', rng);
    expect(last.decor).toBeNull();
    expect(last.coins).toBeGreaterThan(25);
  });
});

describe('my island', () => {
  it('learned words that can stand on an island are collected (once, even if in two topics)', () => {
    const p = withLearned(child(), [...animalIds.slice(0, 3), 'abc-cat', 'body-eye'].filter((id) => WORDS_BY_ID[id]));
    const ids = collectedItems(p).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('w:eye'); // body parts don't go on the island
    expect(ids.length).toBeGreaterThanOrEqual(3);
    // A word that was only seen once is not collected yet.
    const seen = { ...child(), items: { [animalIds[0]]: { ...learned, box: 1, correct: 1 } } };
    expect(collectedItems(seen)).toHaveLength(0);
  });

  it('places items on free tiles, takes them back to the bag, and never places twice', () => {
    let p = withLearned(child(), animalIds.slice(0, 4));
    const [a, b] = bagItems(p);
    p = placeItem(p, a.id);
    expect(islandSlots(p)[0]).toBe(a.id);
    expect(placeItem(p, a.id)).toBe(p);
    p = placeItem(p, b.id, 5);
    expect(islandSlots(p)[5]).toBe(b.id);
    expect(bagItems(p).map((i) => i.id)).not.toContain(b.id);
    p = removeItem(p, 5);
    expect(islandSlots(p)[5]).toBeNull();
    expect(bagItems(p).map((i) => i.id)).toContain(b.id);
    // Items the child doesn't own can't be placed.
    expect(placeItem(p, 'd:dragon')).toBe(p);
  });

  it('the island grows as the child collects more', () => {
    expect(islandSize(0).tiles).toBe(9);
    expect(islandSize(9).toNext).toBe(1);
    expect(islandSize(10).tiles).toBe(12);
    expect(islandSize(1000).tiles).toBe(ISLAND_SIZES[ISLAND_SIZES.length - 1].tiles);
    expect(islandSize(1000).toNext).toBeNull();
    const p = withLearned(child(), animalIds.slice(0, 12));
    expect(islandSlots(p)).toHaveLength(12);
  });

  it('every island item has a picture and an English name', () => {
    for (const item of allIslandItems()) {
      expect(item.emoji).toBeTruthy();
      expect(item.en).toMatch(/^[a-z][a-z -]*$/);
    }
  });

  it('decorations won on two devices are both kept when syncing', () => {
    const base = child();
    const a = { ...base, island: { slots: ['d:tent'], decor: ['tent'] }, missionDays: ['2026-03-09'], updatedAt: NOW };
    const b = { ...base, island: { slots: [], decor: ['castle'] }, missionDays: ['2026-03-10'], updatedAt: NOW + 1 };
    const m = mergeProfile(a, b);
    expect(m.island?.decor.sort()).toEqual(['castle', 'tent']);
    expect(m.missionDays?.sort()).toEqual(['2026-03-09', '2026-03-10']);
  });
});
