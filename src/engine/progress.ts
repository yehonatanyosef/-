import { favouriteIslands } from '../data/interests';
import { islandSuitsAge } from './age';
import { ISLANDS, ISLANDS_BY_ID, startIslandIndex } from '../data/islands';
import { LETTERS } from '../data/letters';
import { WORDS_BY_ID } from '../data/words';
import { SKILLS, type Island, type Profile, type Skill, type Stage } from '../types';
import { checkAchievements } from './achievements';
import { clamp } from './random';
import { isLearned, isMastered, review } from './srs';

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createProfile(name: string, age: number, avatar: string, now = Date.now()): Profile {
  const zero = Object.fromEntries(SKILLS.map((s) => [s, 0])) as Record<Skill, number>;
  return {
    id: `p${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name,
    age,
    avatar,
    createdAt: now,
    placementDone: false,
    placementLevel: 1,
    ability: age <= 6 ? 1.2 : 1.8,
    skill: Object.fromEntries(SKILLS.map((s) => [s, 0.7])) as Record<Skill, number>,
    skillCount: zero,
    items: {},
    stages: {},
    unlocked: [],
    xp: 0,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    lastPlayDay: null,
    activity: {},
    achievements: [],
    companion: 'owl',
    ownedCompanions: ['owl'],
    perfectLessons: 0,
    spokenCorrect: 0,
    totalSeconds: 0,
    updatedAt: now,
  };
}

/* ---------- Placement ---------- */

/** Applies a placement result: sets ability, opens earlier islands and seeds their words for review. */
export function applyPlacement(profile: Profile, level: number, ability: number, now = Date.now()): Profile {
  const start = startIslandIndex(level);
  const unlocked = new Set(profile.unlocked);
  const items = { ...profile.items };
  ISLANDS.forEach((island, idx) => {
    if (idx < start) {
      island.stages.forEach((s) => unlocked.add(s.id));
      // Assume earlier material is mostly known – schedule it as light review spread over the next days.
      const seedIds = island.kind === 'letters' ? LETTERS.map((l) => l.id) : island.kind === 'words' ? island.itemIds : [];
      seedIds.forEach((id, i) => {
        if (!items[id]) items[id] = { box: 2, seen: 1, correct: 1, wrong: 0, due: now + (i % 5) * DAY, last: now };
      });
    }
    if (idx === start) unlocked.add(island.stages[0].id);
  });
  return {
    ...profile,
    placementDone: true,
    placementLevel: level,
    ability: clamp(ability, 1, 5),
    unlocked: [...unlocked],
    items,
  };
}

/* ---------- Map / unlocking ---------- */

export function stageDone(profile: Profile, stage: Stage): boolean {
  return (profile.stages[stage.id]?.stars ?? 0) > 0;
}

export function islandDone(profile: Profile, island: Island): boolean {
  return stageDone(profile, island.stages[island.stages.length - 1]);
}

/** A fast learner may challenge the boss before finishing every stage. */
export function canSkipToBoss(profile: Profile, island: Island): boolean {
  return profile.ability >= island.level + 1.2 && isStageUnlocked(profile, island.stages[0]);
}

/** The closest earlier island that suits the child's age (islands that don't are skipped). */
function previousIsland(profile: Profile, islandIdx: number): Island | undefined {
  return ISLANDS.slice(0, islandIdx)
    .reverse()
    .find((i) => islandSuitsAge(profile, i));
}

export function isStageUnlocked(profile: Profile, stage: Stage): boolean {
  const island = ISLANDS_BY_ID[stage.islandId];
  // Sentence-reading islands wait until the child is old enough.
  if (!islandSuitsAge(profile, island)) return false;
  if (profile.unlocked.includes(stage.id)) return true;
  const islandIdx = ISLANDS.indexOf(island);
  if (stage.index === 0) {
    const prev = previousIsland(profile, islandIdx);
    if (!prev || islandDone(profile, prev)) return true;
    // A favourite topic opens early once the child is ready for its level.
    if (isFavouriteOpenEarly(profile, island)) return true;
    // An island added in an update must not lock islands a child has already reached.
    return ISLANDS.slice(islandIdx).some((i) => islandHasProgress(profile, i));
  }
  if (stageDone(profile, island.stages[stage.index - 1])) return true;
  if (stage.boss && profile.ability >= island.level + 1.2 && isStageUnlocked(profile, island.stages[0])) return true;
  return false;
}

/** Favourite islands open as soon as the child's level reaches the island's level. */
export function isFavouriteOpenEarly(profile: Profile, island: Island): boolean {
  return profile.placementDone && favouriteIslands(profile.interests).includes(island.id) && profile.ability >= island.level;
}

function islandHasProgress(profile: Profile, island: Island): boolean {
  return island.stages.some((s) => stageDone(profile, s) || profile.unlocked.includes(s.id));
}

export function isIslandUnlocked(profile: Profile, island: Island): boolean {
  return isStageUnlocked(profile, island.stages[0]);
}

/** The next stage the child should play (first unlocked, not yet completed). */
export function currentStage(profile: Profile): Stage | null {
  for (let i = ISLANDS.length - 1; i >= 0; i--) {
    const island = ISLANDS[i];
    if (!isIslandUnlocked(profile, island)) continue;
    // A favourite island opened early is a bonus – the journey continues on the main path.
    const prev = previousIsland(profile, i);
    const prevDone = !prev || islandDone(profile, prev);
    if (!prevDone && isFavouriteOpenEarly(profile, island) && !islandHasProgress(profile, island)) continue;
    const next = island.stages.find((s) => isStageUnlocked(profile, s) && !stageDone(profile, s));
    if (next) return next;
    if (islandDone(profile, island)) return null;
  }
  return ISLANDS[0].stages[0];
}

/* ---------- Lesson results ---------- */

export interface AnswerLog {
  itemId?: string;
  skill?: string;
  correct: boolean;
  /** First attempt at this exercise (re-queued retries are not first attempts). */
  first: boolean;
}

export interface LessonOutcome {
  stageId: string | null; // null = practice session
  boss: boolean;
  answers: AnswerLog[];
  seconds: number;
}

export interface LessonRewards {
  stars: number;
  accuracy: number;
  xp: number;
  coins: number;
  abilityBefore: number;
  abilityAfter: number;
  newAchievements: string[];
  streak: number;
  streakIncreased: boolean;
  learnedNow: string[];
}

export function starsFor(accuracy: number): number {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

export function applyLesson(profile: Profile, outcome: LessonOutcome, now = Date.now()): { profile: Profile; rewards: LessonRewards } {
  const firsts = outcome.answers.filter((a) => a.first);
  const correctFirst = firsts.filter((a) => a.correct).length;
  const accuracy = firsts.length ? correctFirst / firsts.length : 1;
  const stars = starsFor(accuracy);

  // Spaced repetition + skill stats
  const items = { ...profile.items };
  const skill = { ...profile.skill };
  const skillCount = { ...profile.skillCount };
  const learnedBefore = new Set(Object.keys(items).filter((id) => isLearned(items[id])));
  for (const a of outcome.answers) {
    if (a.itemId) items[a.itemId] = review(items[a.itemId], a.correct, now);
    if (a.first && a.skill && (SKILLS as string[]).includes(a.skill)) {
      const s = a.skill as Skill;
      // Profiles created before a skill existed start it at the default.
      skill[s] = (skill[s] ?? 0.7) * 0.85 + (a.correct ? 1 : 0) * 0.15;
      skillCount[s] = (skillCount[s] ?? 0) + 1;
    }
  }
  const learnedNow = Object.keys(items).filter((id) => isLearned(items[id]) && !learnedBefore.has(id) && WORDS_BY_ID[id]);

  // Ability: nudged by how the lesson went relative to a 75% target.
  const delta = clamp((accuracy - 0.75) * (outcome.boss ? 0.6 : 0.4), -0.2, 0.15);
  const ability = clamp(profile.ability + delta, 1, 5);

  // Rewards
  const perfect = firsts.length > 0 && correctFirst === firsts.length;
  const xp = 10 + stars * 5 + (outcome.boss ? 15 : 0) + (perfect ? 5 : 0);
  const coins = stars * 5 + (outcome.boss ? 20 : 0) + (perfect ? 5 : 0);

  // Streak / daily activity
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY);
  let streak = profile.streak;
  let streakIncreased = false;
  if (profile.lastPlayDay !== today) {
    streak = profile.lastPlayDay === yesterday ? profile.streak + 1 : 1;
    streakIncreased = true;
  }
  const day = profile.activity[today] ?? { xp: 0, seconds: 0, lessons: 0 };

  const stages = { ...profile.stages };
  if (outcome.stageId) {
    const prev = stages[outcome.stageId];
    stages[outcome.stageId] = {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
      plays: (prev?.plays ?? 0) + 1,
    };
  }

  const spoken = outcome.answers.filter((a) => a.skill === 'speaking' && a.correct).length;

  let next: Profile = {
    ...profile,
    items,
    skill,
    skillCount,
    ability,
    stages,
    xp: profile.xp + xp,
    coins: profile.coins + coins,
    streak,
    bestStreak: Math.max(profile.bestStreak, streak),
    lastPlayDay: today,
    activity: { ...profile.activity, [today]: { xp: day.xp + xp, seconds: day.seconds + outcome.seconds, lessons: day.lessons + 1 } },
    perfectLessons: profile.perfectLessons + (perfect ? 1 : 0),
    spokenCorrect: profile.spokenCorrect + spoken,
    totalSeconds: profile.totalSeconds + outcome.seconds,
  };
  const newAchievements = checkAchievements(next);
  if (newAchievements.length) next = { ...next, achievements: [...next.achievements, ...newAchievements] };

  return {
    profile: next,
    rewards: {
      stars,
      accuracy,
      xp,
      coins,
      abilityBefore: profile.ability,
      abilityAfter: ability,
      newAchievements,
      streak,
      streakIncreased,
      learnedNow,
    },
  };
}

/* ---------- Stats for the parent dashboard ---------- */

export function wordStats(profile: Profile) {
  const ids = Object.keys(profile.items).filter((id) => WORDS_BY_ID[id]);
  const learnedEn = new Set<string>();
  const masteredEn = new Set<string>();
  const seenEn = new Set<string>();
  for (const id of ids) {
    const p = profile.items[id];
    const en = WORDS_BY_ID[id].en;
    if (p.seen > 0) seenEn.add(en);
    if (isLearned(p)) learnedEn.add(en);
    if (isMastered(p)) masteredEn.add(en);
  }
  return { seen: seenEn.size, learned: learnedEn.size, mastered: masteredEn.size };
}

export function todayXp(profile: Profile, now = Date.now()): number {
  return profile.activity[dayKey(now)]?.xp ?? 0;
}

/** CEFR-like label for an ability value. */
export function levelLabel(ability: number): { he: string; cefr: string } {
  if (ability < 1.8) return { he: 'מתחילים', cefr: 'Pre-A1' };
  if (ability < 2.6) return { he: 'צעדים ראשונים', cefr: 'Pre-A1+' };
  if (ability < 3.4) return { he: 'בסיסי', cefr: 'A1' };
  if (ability < 4.2) return { he: 'מתקדם', cefr: 'A1+' };
  return { he: 'מתקדם מאוד', cefr: 'A2' };
}
