import { useRef, useState } from 'react';
import { backupFileName, parseBackup, serializeBackup } from '../engine/storage';
import type { CloudSync } from '../hooks/useCloudSync';
import type { AppData } from '../types';
import { BigButton } from './common';

function timeAgo(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'הרגע';
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  return new Date(t).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' });
}

function CloudAccount({ cloud }: { cloud: CloudSync }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!cloud.configured) {
    return (
      <p className="muted">
        הסנכרון בענן עוד לא הופעל בגרסה הזו של המשחק. אפשר בינתיים לשמור גיבוי לקובץ (למטה). הוראות הפעלה למפתח נמצאות בקובץ README.
      </p>
    );
  }

  if (cloud.user) {
    const statusText =
      cloud.status === 'syncing'
        ? '🔄 מסנכרן...'
        : cloud.status === 'error'
          ? `⚠️ ${cloud.error ?? 'שגיאה בסנכרון'}`
          : cloud.lastSync
            ? `✅ מסונכרן (${timeAgo(cloud.lastSync)})`
            : '✅ מחובר';
    return (
      <div className="cloud-account">
        <p>
          מחובר/ת בתור <b dir="ltr">{cloud.user.email}</b>
        </p>
        <p className={`sync-status ${cloud.status}`}>{statusText}</p>
        <p className="muted">ההתקדמות של כל הילדים נשמרת בחשבון ומתעדכנת אוטומטית בכל מכשיר שמחובר אליו.</p>
        <div className="row wrap">
          <BigButton color="blue" disabled={cloud.status === 'syncing'} onClick={() => void cloud.syncNow()}>
            🔄 סנכרון עכשיו
          </BigButton>
          <BigButton color="gray" onClick={() => void cloud.logout()}>
            התנתקות
          </BigButton>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      setMsg({ ok: false, text: 'הזינו אימייל וסיסמה של 6 תווים לפחות' });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = mode === 'login' ? await cloud.login(email, password) : await cloud.register(email, password);
    setBusy(false);
    if (res === 'confirm') setMsg({ ok: true, text: 'נשלח אליכם אימייל לאישור החשבון. אחרי האישור, חזרו לכאן והתחברו.' });
    else if (res) setMsg({ ok: false, text: res });
  };

  return (
    <form
      className="cloud-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="muted">
        {mode === 'login'
          ? 'התחברו לחשבון ההורה כדי לשמור את ההתקדמות בענן ולהמשיך לשחק מכל מכשיר.'
          : 'צרו חשבון הורה. ההתקדמות של הילדים במכשיר הזה תישמר בו.'}
      </p>
      <input type="email" dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input
        type="password"
        dir="ltr"
        placeholder={mode === 'login' ? 'סיסמה' : 'סיסמה (6 תווים לפחות)'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
      <BigButton color="blue" submit disabled={busy}>
        {busy ? '...' : mode === 'login' ? 'התחברות' : 'יצירת חשבון'}
      </BigButton>
      <button type="button" className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'אין לך חשבון? הרשמה' : 'כבר יש לך חשבון? התחברות'}
      </button>
    </form>
  );
}

export function CloudPanel({ cloud, data, onRestore }: { cloud: CloudSync; data: AppData; onRestore: (d: AppData) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const download = () => {
    const blob = new Blob([serializeBackup(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: 'קובץ הגיבוי נשמר 👍' });
  };

  const restore = async (file: File) => {
    const parsed = parseBackup(await file.text());
    if (!parsed) {
      setMsg({ ok: false, text: 'הקובץ הזה אינו גיבוי תקין של המשחק' });
      return;
    }
    onRestore(parsed);
    setMsg({ ok: true, text: `שוחזרו ${parsed.profiles.length} שחקנים. ההתקדמות אוחדה עם מה שכבר יש במכשיר.` });
  };

  return (
    <section className="card cloud">
      <h3>☁️ גיבוי וסנכרון</h3>
      <CloudAccount cloud={cloud} />
      <hr />
      <h4>גיבוי לקובץ</h4>
      <p className="muted">שמירת כל ההתקדמות לקובץ, ושחזור ממנו במכשיר הזה או במכשיר אחר. השחזור מאחד את ההתקדמות ולא מוחק כלום.</p>
      <div className="row wrap">
        <BigButton color="purple" onClick={download}>
          💾 שמירת גיבוי
        </BigButton>
        <BigButton color="orange" onClick={() => fileRef.current?.click()}>
          📂 שחזור מגיבוי
        </BigButton>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void restore(f);
          e.target.value = '';
        }}
      />
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
    </section>
  );
}
