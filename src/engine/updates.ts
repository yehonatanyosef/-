/*
 * Keeps installed copies of the game up to date. The service worker stores the game for
 * offline play; when a new version is published:
 *  - right after the app is opened (or brought back to the front) it updates immediately;
 *  - otherwise (e.g. in the middle of a lesson) a small "new version" banner is offered.
 */
import { registerSW } from 'virtual:pwa-register';

const FRESH_MS = 15_000;
let lastOpened = Date.now();
let busy = false;
let waiting = false;
let apply: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

function announce() {
  listeners.forEach((l) => l());
}

export function initUpdates() {
  if (!('serviceWorker' in navigator)) return;
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!busy && Date.now() - lastOpened < FRESH_MS) void apply?.(true);
      else {
        waiting = true;
        announce();
      }
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Look for a new version whenever the app comes back to the front, and every 30 minutes.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        lastOpened = Date.now();
        void reg.update();
      });
      setInterval(() => void reg.update(), 30 * 60 * 1000);
    },
  });
}

/** Lessons mark the app as busy so an update never interrupts a child mid-game. */
export function setBusy(value: boolean) {
  busy = value;
}

export function updateWaiting(): boolean {
  return waiting;
}

export function onUpdateWaiting(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function applyUpdate() {
  void apply?.(true);
}

/** Shown in the parent dashboard, e.g. "2026-10-01 · 4838211". */
export const APP_VERSION: string = __APP_VERSION__;
