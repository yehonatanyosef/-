/*
 * The daily mission: a few short games a day, then a treasure chest. Completing the
 * mission on 5 days of a week opens the weekly chest with a rare decoration.
 */
import type { Profile } from '../types';
import { applyChest, rollChest, type ChestKind, type ChestReward } from './island';
import { ISLANDS } from '../data/islands';
import type { Stage } from '../types';
import { currentStage, dayKey, isStageUnlocked, todayMission } from './progress';
import type { Rng } from './random';
import { isDue, isStruggling } from './srs';

const DAY = 24 * 60 * 60 * 1000;
/** Mission days in a week needed for the weekly chest. */
export const WEEKLY_DAYS = 5;
/** Practice is suggested first when at least this many words wait for review… */
const REVIEW_FIRST = 4;
/** …or when this many words need strengthening (before adding many more new ones). */
const STRUGGLING_FIRST = 6;
/** The mission makes sure the child meets at least this many new words a day. */
export const NEW_WORDS_PER_DAY = 4;

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
  /** New words met today, and the daily target. */
  newWords: number;
  newWordsGoal: number;
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
    newWords: m.newWords ?? 0,
    newWordsGoal: NEW_WORDS_PER_DAY,
  };
}

const hasUnseen = (profile: Profile, stage: Stage) => stage.itemIds.some((id) => !(profile.items[id]?.seen > 0));

/** An open stage that still has things the child hasn't met – the current one first, then the next islands. */
export function stageWithNewItems(profile: Profile): Stage | null {
  const current = currentStage(profile);
  if (current && !current.boss && hasUnseen(profile, current)) return current;
  const from = current ? ISLANDS.findIndex((i) => i.id === current.islandId) : 0;
  const order = [...ISLANDS.slice(from), ...ISLANDS.slice(0, from).reverse()];
  for (const island of order)
    for (const stage of island.stages) if (!stage.boss && isStageUnlocked(profile, stage) && hasUnseen(profile, stage)) return stage;
  return null;
}

/**
 * What the mission's play button starts:
 * 1. a review session when many words wait for review or need strengthening (once a day),
 * 2. a stage with new words until the child met enough new words today,
 * 3. otherwise the next stage of the journey.
 */
export function nextMissionGame(profile: Profile, now = Date.now()): { stageId: string | null } {
  const mission = todayMission(profile, now);
  const items = Object.values(profile.items);
  const due = items.filter((p) => isDue(p, now)).length;
  const struggling = items.filter(isStruggling).length;
  if (!mission.practiced && (due >= REVIEW_FIRST || struggling >= STRUGGLING_FIRST)) return { stageId: null };
  if ((mission.newWords ?? 0) < NEW_WORDS_PER_DAY) {
    const fresh = stageWithNewItems(profile);
    if (fresh) return { stageId: fresh.id };
  }
  const stage = currentStage(profile);
  return { stageId: stage ? stage.id : null };
}

/** Opens a chest: adds its reward and marks the day (or week) as claimed. */
export function openChest(profile: Profile, kind: ChestKind, rng: Rng, now = Date.now()): { profile: Profile; reward: ChestReward } {
  const reward = rollChest(profile, kind, rng);
  const next = applyChest(profile, reward);
  if (kind === 'daily') next.missionDays = [...new Set([...(profile.missionDays ?? []), dayKey(now)])];
  else next.weeklyChests = [...new Set([...(profile.weeklyChests ?? []), weekKey(now)])];
  return { profile: next, reward };
}
