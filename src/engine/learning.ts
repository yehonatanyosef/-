/*
 * Tracking what the child really learns. Every word goes through three steps:
 *   learning   – met in a lesson, not yet proven
 *   remembered – answered correctly again on a later day (box 3)
 *   mastered   – still remembered days later (box 4+)
 * A word only counts as learned once it was remembered on a later day.
 */
import { WORDS_BY_ID } from '../data/words';
import type { ItemProgress, Profile, Word } from '../types';
import { dayKey } from './progress';
import { isDue, isMastered, isRemembered, isStruggling } from './srs';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export type WordStatus = 'learning' | 'remembered' | 'mastered';

export interface WordProgress {
  word: Word;
  progress: ItemProgress;
  status: WordStatus;
  struggling: boolean;
}

export const STATUS_LABELS: Record<WordStatus, { he: string; emoji: string; desc: string }> = {
  learning: { he: 'בלמידה', emoji: '🌱', desc: 'פגשו את המילה, עוד לא הוכח שזוכרים אותה ביום אחר' },
  remembered: { he: 'זוכרים', emoji: '🧠', desc: 'ענו נכון גם ביום אחר – המילה נלמדה' },
  mastered: { he: 'שולטים', emoji: '👑', desc: 'עדיין זוכרים אחרי כמה ימים – המילה בזיכרון לטווח ארוך' },
};

export function wordStatus(p: ItemProgress): WordStatus {
  return isMastered(p) ? 'mastered' : isRemembered(p) ? 'remembered' : 'learning';
}

/**
 * Every word the child has met, once per English word (the same word can appear in
 * two topics – the better-known copy counts). Words placed by the level test that
 * were never actually practised are left out.
 */
export function wordProgressList(profile: Profile): WordProgress[] {
  const best = new Map<string, WordProgress>();
  for (const [id, prog] of Object.entries(profile.items)) {
    const word = WORDS_BY_ID[id];
    // The level test seeds known words at box 2 after "one" answer – a real single answer only reaches box 1.
    const seededOnly = prog.first === undefined && prog.seen === 1 && prog.box === 2;
    if (!word || prog.seen === 0 || seededOnly) continue;
    const prev = best.get(word.en);
    if (prev && prev.progress.box >= prog.box) continue;
    best.set(word.en, { word, progress: prog, status: wordStatus(prog), struggling: isStruggling(prog) });
  }
  return [...best.values()].sort((a, b) => b.progress.last - a.progress.last);
}

export interface WeekCount {
  start: number;
  label: string;
  met: number;
  remembered: number;
}

export interface LearningReport {
  counts: Record<WordStatus, number>;
  total: number;
  struggling: WordProgress[];
  due: number;
  thisWeek: WeekCount;
  lastWeek: WeekCount;
  weeks: WeekCount[];
  insights: { tone: 'good' | 'tip' | 'warn'; text: string }[];
}

/** Start of the week (Sunday, local midnight) containing `t`. */
function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

export function learningReport(profile: Profile, now = Date.now(), weeksBack = 6): LearningReport {
  const list = wordProgressList(profile);
  const counts: Record<WordStatus, number> = { learning: 0, remembered: 0, mastered: 0 };
  list.forEach((w) => counts[w.status]++);

  const current = weekStart(now);
  const weeks: WeekCount[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    // Step back by whole days from the middle of the week, so clock changes don't shift weeks.
    const start = weekStart(current + 3 * DAY - i * WEEK);
    const end = weekStart(start + 10 * DAY);
    const inWeek = (t?: number) => t !== undefined && t >= start && t < end;
    const d = new Date(start);
    weeks.push({
      start,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      met: list.filter((w) => inWeek(w.progress.first)).length,
      remembered: list.filter((w) => inWeek(w.progress.recalled)).length,
    });
  }
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2] ?? { start: 0, label: '', met: 0, remembered: 0 };
  const struggling = list.filter((w) => w.struggling);
  const due = Object.values(profile.items).filter((p) => isDue(p, now)).length;

  const insights: LearningReport['insights'] = [];
  const lastPlayed = profile.lastPlayDay;
  const idleDays = lastPlayed ? Math.round((new Date(dayKey(now)).getTime() - new Date(lastPlayed).getTime()) / DAY) : null;
  if (!list.length) insights.push({ tone: 'tip', text: 'עוד לא נלמדו מילים. אחרי השלב הראשון יופיע כאן מעקב מלא.' });
  if (thisWeek.remembered > 0)
    insights.push({ tone: 'good', text: `השבוע ${thisWeek.remembered} מילים עברו את בדיקת הזיכרון – ענו עליהן נכון גם ביום אחר 🎉` });
  if (thisWeek.met > 0 && thisWeek.met >= lastWeek.met)
    insights.push({ tone: 'good', text: `השבוע פגשו ${thisWeek.met} מילים חדשות${lastWeek.met ? ` (בשבוע שעבר ${lastWeek.met})` : ''}.` });
  if (idleDays !== null && idleDays >= 3)
    insights.push({ tone: 'warn', text: `לא שיחקו ${idleDays} ימים. מילים נשכחות בלי חזרה – כדאי לשחק את המשימה היומית היום.` });
  else if (list.length && thisWeek.met === 0)
    insights.push({ tone: 'tip', text: 'השבוע עוד לא נלמדו מילים חדשות. המשימה היומית תכלול עכשיו שלב עם מילים חדשות.' });
  if (struggling.length >= 3)
    insights.push({ tone: 'tip', text: `${struggling.length} מילים צריכות חיזוק. המשחק מחזיר אותן לתרגול לפני שמוסיף עוד הרבה מילים חדשות.` });
  if (due >= 10) insights.push({ tone: 'tip', text: `${due} מילים מחכות לחזרה. משחק "תרגול" אחד יחזק את רובן.` });
  if (counts.learning > 0 && counts.remembered + counts.mastered === 0 && list.length >= 4)
    insights.push({ tone: 'tip', text: 'מילה נחשבת "נלמדה" רק כשעונים עליה נכון גם ביום אחר. כדאי לחזור מחר – אז תהיה בדיקת הזיכרון הראשונה.' });

  return { counts, total: list.length, struggling, due, thisWeek, lastWeek, weeks, insights };
}
