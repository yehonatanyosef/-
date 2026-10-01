import type { AppData, Profile, Settings } from '../types';

const KEY = 'english-island-v1';

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  speaking: true,
  speechRate: 0.85,
  dailyGoal: 40,
  hebrewHints: true,
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
