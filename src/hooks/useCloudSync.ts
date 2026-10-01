import { useCallback, useEffect, useRef, useState } from 'react';
import {
  authErrorMessage,
  cloudConfigured,
  currentUser,
  onAuthChange,
  pullRemote,
  pushRemote,
  signIn,
  signOut,
  signUp,
  type CloudUser,
} from '../engine/cloud';
import { mergeData, syncFingerprint } from '../engine/sync';
import type { AppData } from '../types';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error';

export interface CloudSync {
  configured: boolean;
  user: CloudUser | null;
  status: SyncStatus;
  lastSync: number | null;
  error: string | null;
  syncNow: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const PUSH_DELAY = 3000;

/** Keeps the local data in sync with the parent's cloud account. */
export function useCloudSync(data: AppData, setData: (fn: (d: AppData) => AppData) => void): CloudSync {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>(cloudConfigured ? 'signed-out' : 'off');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const syncedPrint = useRef<string | null>(null);
  const running = useRef<Promise<void> | null>(null);

  const syncNow = useCallback(async () => {
    if (!user) return;
    if (running.current) return running.current;
    const run = (async () => {
      setStatus('syncing');
      try {
        const remote = await pullRemote(user.id);
        // Merge against the freshest local state (the child may have kept playing meanwhile).
        let merged: AppData = dataRef.current;
        if (remote) merged = mergeData(dataRef.current, remote);
        if (syncFingerprint(merged) !== syncFingerprint(dataRef.current)) {
          const m = merged;
          setData((d) => mergeData(d, m));
        }
        if (!remote || syncFingerprint(merged) !== syncFingerprint(remote)) await pushRemote(user.id, merged);
        syncedPrint.current = syncFingerprint(merged);
        setLastSync(Date.now());
        setError(null);
        setStatus('synced');
      } catch (err) {
        setError(authErrorMessage(err));
        setStatus('error');
      } finally {
        running.current = null;
      }
    })();
    running.current = run;
    return run;
  }, [user, setData]);

  // Restore the session and follow sign-in / sign-out.
  useEffect(() => {
    if (!cloudConfigured) return;
    let unsub = () => {};
    void currentUser().then(setUser).catch(() => setStatus('error'));
    void onAuthChange((u) => setUser(u)).then((fn) => (unsub = fn));
    return () => unsub();
  }, []);

  // First sync right after signing in.
  useEffect(() => {
    if (user) void syncNow();
    else {
      syncedPrint.current = null;
      if (cloudConfigured) setStatus('signed-out');
    }
    // syncNow only changes together with user, so `user` is the real trigger here
  }, [user]);

  // Sync a few seconds after every local change.
  useEffect(() => {
    if (!user || syncFingerprint(data) === syncedPrint.current) return;
    const t = setTimeout(() => void syncNow(), PUSH_DELAY);
    return () => clearTimeout(t);
  }, [data, user, syncNow]);

  // Pick up changes from other devices when coming back to the app.
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [user, syncNow]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signIn(email.trim(), password);
      return null;
    } catch (err) {
      return authErrorMessage(err);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const { needsConfirmation } = await signUp(email.trim(), password);
      return needsConfirmation ? 'confirm' : null;
    } catch (err) {
      return authErrorMessage(err);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setLastSync(null);
  }, []);

  return { configured: cloudConfigured, user, status, lastSync, error, syncNow, login, register, logout };
}
