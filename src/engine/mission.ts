/*
 * The daily mission: a few short games a day, then a treasure chest. Completing the
 * mission on 5 days of a week opens the weekly chest with a rare decoration.
 */
import type { Profile } from '../types';
import { applyChest, rollChest, type ChestKind, type ChestReward } from './island';
import { currentStage, dayKey, todayMission } from './progress';
import type { Rng } from './random';
import { isDue } from './srs';

const DAY = 24 * 60 * 60 * 1000;
/** Mission days in a week needed for the weekly chest. */
export const WEEKLY_DAYS = 5;
/** Practice is suggested first when at least this many words wait for review. */
const REVIEW_FIRST = 4;

/** dayKey of the Sunday that starts the week of `now` (weeks start on Sunday, as in Israel). */
export function weekKey(now = Date.now()): string {
  const d = new Date(now);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 12).getTime());
}

/** The 7 days of this week (Sunday first) and whether the mission was completed on each. */
export function weekDays(profile: Profile, now = Date.now()): { day: string; done: boolean; today: boolean }[] {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const done = new Set(profile.missionDays ?? []);
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const day = dayKey(start.getTime() + i * DAY);
    return { day, done: done.has(day), today: day === today };
  });
}

export interface MissionStatus {
  games: number;
  goal: number;
  /** All games played – the daily chest can be opened. */
  complete: boolean;
  dailyClaimed: boolean;
  weekDone: number;
  weeklyReady: boolean;
  weeklyClaimed: boolean;
}

export function missionStatus(profile: Profile, goal: number, now = Date.now()): MissionStatus {
  const m = todayMission(profile, now);
  const dailyClaimed = (profile.missionDays ?? []).includes(m.day);
  const weekDone = weekDays(profile, now).filter((d) => d.done).length;
  const weeklyClaimed = (profile.weeklyChests ?? []).includes(weekKey(now));
  return {
    games: Math.min(m.games, goal),
    goal,
    complete: m.games >= goal,
    dailyClaimed,
    weekDone,
    weeklyReady: weekDone >= WEEKLY_DAYS && !weeklyClaimed,
    weeklyClaimed,
  };
}

/** What the mission's play button starts: a review session first when many words wait, otherwise the journey. */
export function nextMissionGame(profile: Profile, now = Date.now()): { stageId: string | null } {
  const due = Object.values(profile.items).filter((p) => isDue(p, now)).length;
  const stage = currentStage(profile);
  if ((!todayMission(profile, now).practiced && due >= REVIEW_FIRST) || !stage) return { stageId: null };
  return { stageId: stage.id };
}

/** Opens a chest: adds its reward and marks the day (or week) as claimed. */
export function openChest(profile: Profile, kind: ChestKind, rng: Rng, now = Date.now()): { profile: Profile; reward: ChestReward } {
  const reward = rollChest(profile, kind, rng);
  const next = applyChest(profile, reward);
  if (kind === 'daily') next.missionDays = [...new Set([...(profile.missionDays ?? []), dayKey(now)])];
  else next.weeklyChests = [...new Set([...(profile.weeklyChests ?? []), weekKey(now)])];
  return { profile: next, reward };
}
