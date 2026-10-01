import { describe, expect, it } from 'vitest';
import type { AppData, Profile } from '../types';
import { createProfile } from './progress';
import { parseBackup, serializeBackup, DEFAULT_SETTINGS } from './storage';
import { mergeData, mergeProfile } from './sync';

const T = new Date('2026-05-01T12:00:00').getTime();

function profile(over: Partial<Profile> = {}): Profile {
  return { ...createProfile('נועה', 7, '🦸', T), id: 'kid1', ...over };
}

function data(profiles: Profile[], over: Partial<AppData> = {}): AppData {
  return { version: 1, profiles, activeProfileId: profiles[0]?.id ?? null, settings: { ...DEFAULT_SETTINGS }, ...over };
}

const item = (last: number, box: number) => ({ box, seen: box, correct: box, wrong: 0, due: last, last });

describe('mergeProfile', () => {
  it('keeps progress made on both devices', () => {
    const phone = profile({
      updatedAt: T + 10,
      xp: 120,
      coins: 30,
      items: { 'animals-cat': item(T + 5, 3) },
      stages: { 'animals-0': { stars: 2, bestAccuracy: 0.8, plays: 1 } },
      achievements: ['first-step'],
    });
    const tablet = profile({
      updatedAt: T + 20,
      xp: 90,
      coins: 10,
      items: { 'animals-dog': item(T + 15, 2), 'animals-cat': item(T + 1, 1) },
      stages: { 'animals-0': { stars: 3, bestAccuracy: 0.7, plays: 2 }, 'animals-1': { stars: 1, bestAccuracy: 0.6, plays: 1 } },
      achievements: ['perfect-1'],
    });
    const m = mergeProfile(phone, tablet);
    expect(Object.keys(m.items).sort()).toEqual(['animals-cat', 'animals-dog']);
    expect(m.items['animals-cat'].box).toBe(3); // the more recent review wins
    expect(m.stages['animals-0']).toEqual({ stars: 3, bestAccuracy: 0.8, plays: 2 });
    expect(m.stages['animals-1'].stars).toBe(1);
    expect(m.achievements.sort()).toEqual(['first-step', 'perfect-1']);
    expect(m.xp).toBe(120);
    expect(m.coins).toBe(10); // coins can be spent – the newest copy decides
    expect(m.updatedAt).toBe(T + 20);
  });

  it('a progress reset is not undone by an older copy', () => {
    const old = profile({ updatedAt: T, xp: 500, stages: { 'abc-0': { stars: 3, bestAccuracy: 1, plays: 1 } } });
    const reset = profile({ updatedAt: T + 100, resetAt: T + 100, xp: 0, stages: {} });
    expect(mergeProfile(old, reset).stages).toEqual({});
    expect(mergeProfile(reset, old).xp).toBe(0);
  });

  it('a retaken placement test stays pending', () => {
    const old = profile({ updatedAt: T, placementDone: true });
    const retake = profile({ updatedAt: T + 5, placementDone: false });
    expect(mergeProfile(old, retake).placementDone).toBe(false);
  });

  it('takes the streak from the copy that played last', () => {
    const a = profile({ updatedAt: T + 50, streak: 1, lastPlayDay: '2026-04-20' });
    const b = profile({ updatedAt: T, streak: 6, lastPlayDay: '2026-05-01' });
    const m = mergeProfile(a, b);
    expect(m.streak).toBe(6);
    expect(m.lastPlayDay).toBe('2026-05-01');
  });
});

describe('mergeData', () => {
  it('adds children from the other device and keeps this device’s active child', () => {
    const a = data([profile({ id: 'kid1' })], { activeProfileId: 'kid1' });
    const b = data([profile({ id: 'kid2', createdAt: T + 1 })], { activeProfileId: 'kid2' });
    const m = mergeData(a, b);
    expect(m.profiles.map((p) => p.id)).toEqual(['kid1', 'kid2']);
    expect(m.activeProfileId).toBe('kid1');
  });

  it('propagates deleted children', () => {
    const a = data([profile({ id: 'kid1' }), profile({ id: 'kid2' })]);
    const b = data([profile({ id: 'kid2' })], { deleted: ['kid1'] });
    const m = mergeData(a, b);
    expect(m.profiles.map((p) => p.id)).toEqual(['kid2']);
    expect(m.deleted).toContain('kid1');
    expect(m.activeProfileId).toBeNull();
  });

  it('uses the most recently changed settings', () => {
    const a = data([], { settings: { ...DEFAULT_SETTINGS, dailyGoal: 40 }, settingsUpdatedAt: T });
    const b = data([], { settings: { ...DEFAULT_SETTINGS, dailyGoal: 80 }, settingsUpdatedAt: T + 1 });
    expect(mergeData(a, b).settings.dailyGoal).toBe(80);
    expect(mergeData(b, a).settings.dailyGoal).toBe(80);
  });

  it('merging is stable when run twice', () => {
    const a = data([profile({ updatedAt: T + 1, items: { x: item(T, 1) } })]);
    const b = data([profile({ updatedAt: T + 2, items: { y: item(T, 2) } })]);
    const once = mergeData(a, b);
    expect(mergeData(once, b)).toEqual(once);
  });
});

describe('backup files', () => {
  it('round-trips through a backup file', () => {
    const d = data([profile({ xp: 42 })]);
    const back = parseBackup(serializeBackup(d));
    expect(back?.profiles[0].xp).toBe(42);
    expect(back?.activeProfileId).toBeNull();
  });

  it('rejects files that are not backups', () => {
    expect(parseBackup('hello')).toBeNull();
    expect(parseBackup('{"version":2,"profiles":[]}')).toBeNull();
    expect(parseBackup('{"version":1,"profiles":[{"name":"x"}]}')).toBeNull();
  });
});
