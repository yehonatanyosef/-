export type Skill = 'vocab' | 'listening' | 'speaking' | 'reading' | 'spelling' | 'phonics' | 'grammar' | 'conversation';

export const SKILLS: Skill[] = ['vocab', 'listening', 'speaking', 'reading', 'spelling', 'phonics', 'grammar', 'conversation'];

/** A picturable vocabulary item. `level` is 1 (easiest) – 5. */
export interface Word {
  id: string;
  en: string;
  he: string;
  emoji: string;
  /** Optional CSS color – rendered as a color swatch instead of an emoji. */
  swatch?: string;
  level: number;
  topic: string;
}

export interface Letter {
  id: string; // e.g. "letter-a"
  upper: string;
  lower: string;
  /** How the letter name should be pronounced by TTS. */
  say: string;
  wordId: string; // example word starting with this letter
}

export interface Sentence {
  id: string;
  en: string;
  he: string;
  emoji: string;
  level: number;
}

export interface StoryQuestion {
  q: string;
  qHe: string;
  answer: string;
  wrong: string[];
}

export interface Story {
  id: string;
  title: string;
  emoji: string;
  en: string;
  he: string;
  level: number;
  questions: StoryQuestion[];
}

export type IslandKind = 'letters' | 'words' | 'talk' | 'grammar' | 'sentences' | 'stories';

export interface Stage {
  id: string; // `${islandId}-${index}`
  islandId: string;
  index: number;
  boss: boolean;
  /** Ids of the items (letters / words / sentences / stories) introduced in this stage. */
  itemIds: string[];
}

export interface Island {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  kind: IslandKind;
  /** Approximate difficulty band of the island (1–5). */
  level: number;
  colors: [string, string];
  itemIds: string[];
  stages: Stage[];
}

/* ---------- Progress ---------- */

export interface ItemProgress {
  box: number; // Leitner box 0..5 (0 = never seen)
  seen: number;
  correct: number;
  wrong: number;
  due: number; // epoch ms
  last: number; // epoch ms
}

export interface StageResult {
  stars: number; // 0..3 (0 = unlocked by placement but not played)
  bestAccuracy: number;
  plays: number;
}

export interface DayActivity {
  xp: number;
  seconds: number;
  lessons: number;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  avatar: string;
  createdAt: number;
  placementDone: boolean;
  placementLevel: number;
  /** Continuous ability estimate, 1..5 */
  ability: number;
  skill: Record<Skill, number>; // EMA accuracy 0..1
  skillCount: Record<Skill, number>;
  items: Record<string, ItemProgress>;
  stages: Record<string, StageResult>;
  /** Stage ids opened by the placement test (skipped but playable). */
  unlocked: string[];
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
  lastPlayDay: string | null;
  activity: Record<string, DayActivity>;
  achievements: string[];
  companion: string;
  ownedCompanions: string[];
  perfectLessons: number;
  spokenCorrect: number;
  totalSeconds: number;
  /** Last local change (epoch ms) – used to resolve sync conflicts. */
  updatedAt?: number;
  /** Set when a parent resets progress – older copies must not bring it back. */
  resetAt?: number;
}

export interface Settings {
  sound: boolean;
  speaking: boolean;
  speechRate: number;
  dailyGoal: number;
  hebrewHints: boolean;
  /** Use the recorded natural voice (falls back to the device voice). */
  naturalVoice: boolean;
}

export interface AppData {
  version: 1;
  profiles: Profile[];
  activeProfileId: string | null;
  settings: Settings;
  settingsUpdatedAt?: number;
  /** Ids of deleted profiles, so deletions also sync to other devices. */
  deleted?: string[];
}
