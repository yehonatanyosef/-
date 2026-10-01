/*
 * Optional cloud sync through Supabase. It is enabled only when the build has
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example and supabase/schema.sql).
 * The client library is loaded lazily, so the game stays small when the cloud is off.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = Boolean(URL && KEY);

const TABLE = 'family_data';

let clientPromise: Promise<SupabaseClient> | null = null;

function client(): Promise<SupabaseClient> {
  if (!cloudConfigured) return Promise.reject(new Error('cloud-not-configured'));
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true } }),
  );
  return clientPromise;
}

export interface CloudUser {
  id: string;
  email: string;
}

export async function currentUser(): Promise<CloudUser | null> {
  if (!cloudConfigured) return null;
  const { data } = await (await client()).auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

export async function onAuthChange(cb: (u: CloudUser | null) => void): Promise<() => void> {
  if (!cloudConfigured) return () => {};
  const { data } = (await client()).auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    cb(u ? { id: u.id, email: u.email ?? '' } : null);
  });
  return () => data.subscription.unsubscribe();
}

/** Returns `needsConfirmation` when the project requires email confirmation before signing in. */
export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await (await client()).auth.signUp({ email, password });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await (await client()).auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await (await client()).auth.signOut();
}

export async function pullRemote(userId: string): Promise<AppData | null> {
  const { data, error } = await (await client()).from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.data as AppData | undefined) ?? null;
}

export async function pushRemote(userId: string, appData: AppData): Promise<void> {
  // The chosen child is per device, so it is not stored in the cloud.
  const payload: AppData = { ...appData, activeProfileId: null };
  const { error } = await (await client())
    .from(TABLE)
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Hebrew message for common auth errors. */
export function authErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? '';
  if (/invalid login credentials/i.test(msg)) return 'האימייל או הסיסמה שגויים';
  if (/already registered|already exists/i.test(msg)) return 'כבר קיים חשבון עם האימייל הזה – נסו להתחבר';
  if (/password/i.test(msg) && /6|short|least/i.test(msg)) return 'הסיסמה צריכה להכיל לפחות 6 תווים';
  if (/email not confirmed/i.test(msg)) return 'צריך לאשר את האימייל (בדקו את תיבת הדואר)';
  if (/invalid.*email|email.*invalid/i.test(msg)) return 'כתובת האימייל לא תקינה';
  if (/fetch|network/i.test(msg)) return 'אין חיבור לאינטרנט';
  return msg || 'משהו השתבש, נסו שוב';
}
