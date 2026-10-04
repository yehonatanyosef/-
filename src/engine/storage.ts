import type { AppData, Profile, Settings } from '../types';

const KEY = 'english-island-v1';

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  speaking: true,
  speechRate: 0.85,
  dailyGames: 3,
  hebrewHints: true,
  naturalVoice: true,
};

export function emptyData(): AppData {
  return { version: 1, profiles: [], activeProfileId: null, settings: { ...DEFAULT_SETTINGS } };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as AppData;
    if (parsed?.version !== 1 || !Array.isArray(parsed.profiles)) return emptyData();
    return { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable (private mode) – the game still works for this session */
  }
}

export function activeProfile(data: AppData): Profile | null {
  return data.profiles.find((p) => p.id === data.activeProfileId) ?? null;
}

/* ---------- Backup files ---------- */

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `english-island-backup-${d}.json`;
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ ...data, activeProfileId: null }, null, 2);
}

/** Parses a backup file; returns null when the file is not a valid backup. */
export function parseBackup(text: string): AppData | null {
  try {
    const d = JSON.parse(text) as AppData;
    if (d?.version !== 1 || !Array.isArray(d.profiles)) return null;
    const valid = d.profiles.every(
      (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.items === 'object' && typeof p.stages === 'object',
    );
    if (!valid) return null;
    return { ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings } };
  } catch {
    return null;
  }
}
