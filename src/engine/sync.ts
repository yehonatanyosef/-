import type { AppData, DayActivity, ItemProgress, Profile, StageResult } from '../types';

/*
 * Merging two copies of the app data (this device + cloud / a backup file).
 * Progress only ever grows, so most fields can be merged without losing work done
 * on either device; values that can also go down (coins, chosen companion, name…)
 * come from the copy that was changed most recently.
 */

function mergeItems(a: Record<string, ItemProgress>, b: Record<string, ItemProgress>) {
  const out = { ...a };
  for (const [id, p] of Object.entries(b)) {
    const q = out[id];
    if (!q || p.last > q.last || (p.last === q.last && p.seen > q.seen)) out[id] = p;
  }
  return out;
}

function mergeStages(a: Record<string, StageResult>, b: Record<string, StageResult>) {
  const out = { ...a };
  for (const [id, s] of Object.entries(b)) {
    const t = out[id];
    out[id] = t
      ? { stars: Math.max(s.stars, t.stars), bestAccuracy: Math.max(s.bestAccuracy, t.bestAccuracy), plays: Math.max(s.plays, t.plays) }
      : s;
  }
  return out;
}

function mergeActivity(a: Record<string, DayActivity>, b: Record<string, DayActivity>) {
  const out = { ...a };
  for (const [day, x] of Object.entries(b)) {
    const y = out[day];
    out[day] = y ? { xp: Math.max(x.xp, y.xp), seconds: Math.max(x.seconds, y.seconds), lessons: Math.max(x.lessons, y.lessons) } : x;
  }
  return out;
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

export function mergeProfile(local: Profile, remote: Profile): Profile {
  const remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  const [newer, older] = remoteNewer ? [remote, local] : [local, remote];
  // Progress was reset after the older copy was last changed – drop the old progress.
  if ((newer.resetAt ?? 0) > (older.updatedAt ?? 0)) return newer;
  const lastPlayDay = [newer.lastPlayDay, older.lastPlayDay].filter(Boolean).sort().pop() ?? null;
  return {
    ...newer,
    items: mergeItems(older.items, newer.items),
    stages: mergeStages(older.stages, newer.stages),
    activity: mergeActivity(older.activity, newer.activity),
    unlocked: union(newer.unlocked, older.unlocked),
    achievements: union(newer.achievements, older.achievements),
    missionDays: union(newer.missionDays ?? [], older.missionDays ?? []),
    weeklyChests: union(newer.weeklyChests ?? [], older.weeklyChests ?? []),
    // Decorations won on either device are kept; the layout follows the newer copy.
    island: newer.island || older.island ? { slots: newer.island?.slots ?? older.island?.slots ?? [], decor: union(newer.island?.decor ?? [], older.island?.decor ?? []) } : undefined,
    ownedCompanions: union(newer.ownedCompanions, older.ownedCompanions),
    xp: Math.max(newer.xp, older.xp),
    totalSeconds: Math.max(newer.totalSeconds, older.totalSeconds),
    perfectLessons: Math.max(newer.perfectLessons, older.perfectLessons),
    spokenCorrect: Math.max(newer.spokenCorrect, older.spokenCorrect),
    bestStreak: Math.max(newer.bestStreak, older.bestStreak),
    // The streak belongs to whichever copy played most recently.
    streak: lastPlayDay === newer.lastPlayDay ? newer.streak : older.streak,
    lastPlayDay,
    updatedAt: Math.max(newer.updatedAt ?? 0, older.updatedAt ?? 0),
  };
}

/** Merges another copy of the data into the local one. The active child stays this device's choice. */
export function mergeData(local: AppData, remote: AppData): AppData {
  const deleted = union(local.deleted ?? [], remote.deleted ?? []);
  const byId = new Map<string, Profile>();
  for (const p of local.profiles) byId.set(p.id, p);
  for (const p of remote.profiles) {
    const mine = byId.get(p.id);
    byId.set(p.id, mine ? mergeProfile(mine, p) : p);
  }
  const profiles = [...byId.values()].filter((p) => !deleted.includes(p.id)).sort((a, b) => a.createdAt - b.createdAt);
  const remoteSettingsNewer = (remote.settingsUpdatedAt ?? 0) > (local.settingsUpdatedAt ?? 0);
  const active = local.activeProfileId && profiles.some((p) => p.id === local.activeProfileId) ? local.activeProfileId : null;
  return {
    version: 1,
    profiles,
    activeProfileId: active,
    settings: remoteSettingsNewer ? { ...local.settings, ...remote.settings } : local.settings,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt ?? 0, remote.settingsUpdatedAt ?? 0),
    deleted,
  };
}

/** Comparable form that ignores device-only state (the active child). */
export function syncFingerprint(d: AppData): string {
  return JSON.stringify({ p: d.profiles, s: d.settings, x: d.deleted ?? [] });
}
