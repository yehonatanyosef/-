import { ISLANDS } from '../data/islands';
import { WORDS_BY_ID } from '../data/words';
import type { Profile } from '../types';
import { isLearned } from './srs';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  test: (p: Profile) => boolean;
}

function learnedWords(p: Profile): number {
  const en = new Set<string>();
  for (const [id, prog] of Object.entries(p.items)) if (WORDS_BY_ID[id] && isLearned(prog)) en.add(WORDS_BY_ID[id].en);
  return en.size;
}

function bossesDone(p: Profile): number {
  return ISLANDS.filter((i) => (p.stages[i.stages[i.stages.length - 1].id]?.stars ?? 0) > 0).length;
}

const played = (p: Profile) => Object.values(p.stages).filter((s) => s.stars > 0).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', emoji: '👣', title: 'צעד ראשון', desc: 'סיימת שלב ראשון', test: (p) => played(p) >= 1 },
  { id: 'stages-10', emoji: '🧗', title: 'מטפס', desc: 'סיימת 10 שלבים', test: (p) => played(p) >= 10 },
  { id: 'stages-30', emoji: '🏔️', title: 'כובש פסגות', desc: 'סיימת 30 שלבים', test: (p) => played(p) >= 30 },
  { id: 'words-10', emoji: '📗', title: '10 מילים', desc: 'למדת 10 מילים', test: (p) => learnedWords(p) >= 10 },
  { id: 'words-50', emoji: '📘', title: '50 מילים', desc: 'למדת 50 מילים', test: (p) => learnedWords(p) >= 50 },
  { id: 'words-100', emoji: '📚', title: '100 מילים', desc: 'למדת 100 מילים', test: (p) => learnedWords(p) >= 100 },
  { id: 'perfect-1', emoji: '💯', title: 'מושלם!', desc: 'שלב בלי אף טעות', test: (p) => p.perfectLessons >= 1 },
  { id: 'perfect-10', emoji: '🌟', title: 'כוכב-על', desc: '10 שלבים מושלמים', test: (p) => p.perfectLessons >= 10 },
  { id: 'streak-3', emoji: '🔥', title: '3 ימים ברצף', desc: 'שיחקת 3 ימים ברצף', test: (p) => p.bestStreak >= 3 },
  { id: 'streak-7', emoji: '☄️', title: 'שבוע ברצף', desc: 'שיחקת 7 ימים ברצף', test: (p) => p.bestStreak >= 7 },
  { id: 'island-1', emoji: '🏝️', title: 'כובש איים', desc: 'ניצחת את אתגר הבוס הראשון', test: (p) => bossesDone(p) >= 1 },
  { id: 'island-5', emoji: '🗺️', title: 'חוקר גדול', desc: 'ניצחת 5 בוסים', test: (p) => bossesDone(p) >= 5 },
  { id: 'island-all', emoji: '👑', title: 'אלוף האנגלית', desc: 'ניצחת את כל הבוסים', test: (p) => bossesDone(p) >= ISLANDS.length },
  { id: 'speaker-10', emoji: '🎤', title: 'מדבר אנגלית', desc: 'אמרת 10 מילים נכון', test: (p) => p.spokenCorrect >= 10 },
  { id: 'xp-500', emoji: '⚡', title: '500 נקודות', desc: 'צברת 500 נקודות ניסיון', test: (p) => p.xp >= 500 },
  { id: 'friends-3', emoji: '🐾', title: 'אספן חברים', desc: 'יש לך 3 חברים למסע', test: (p) => p.ownedCompanions.length >= 3 },
];

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function checkAchievements(p: Profile): string[] {
  return ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && a.test(p)).map((a) => a.id);
}
