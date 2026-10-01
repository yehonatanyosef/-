import { useMemo, useState } from 'react';
import { CloudPanel } from '../components/CloudPanel';
import { BigButton, En, Modal } from '../components/common';
import type { CloudSync } from '../hooks/useCloudSync';
import { ISLANDS } from '../data/islands';
import { WORDS_BY_ID } from '../data/words';
import { dayKey, isIslandUnlocked, levelLabel, stageDone, wordStats } from '../engine/progress';
import { canRecognize, canSpeak } from '../engine/speech';
import { SKILLS, type AppData, type Profile, type Settings, type Skill } from '../types';

const SKILL_NAMES: Record<Skill, string> = {
  vocab: 'אוצר מילים',
  listening: 'הבנת הנשמע',
  speaking: 'דיבור והגייה',
  reading: 'קריאה',
  spelling: 'איות',
  phonics: 'אותיות וצלילים',
};

function ParentGate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const [a] = useState(() => 3 + Math.floor(Math.random() * 6));
  const [b] = useState(() => 4 + Math.floor(Math.random() * 6));
  const [v, setV] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="screen center gate">
      <h1>👨‍👩‍👧 אזור הורים</h1>
      <p>כדי להמשיך, פתרו את התרגיל:</p>
      <form
        className="gate-form"
        dir="ltr"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(v) === a * b) onPass();
          else {
            setErr(true);
            setV('');
          }
        }}
      >
        <span className="gate-q" dir="ltr">
          {a} × {b} =
        </span>
        <input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} autoFocus />
        <BigButton color="blue" submit>
          אישור
        </BigButton>
      </form>
      {err && <p className="err">לא נכון, נסו שוב</p>}
      <button type="button" className="link-btn" onClick={onBack}>
        חזרה למשחק
      </button>
    </div>
  );
}

export function ParentScreen({
  profiles,
  activeId,
  settings,
  cloud,
  data,
  onRestore,
  onSettings,
  onUpdateProfile,
  onDeleteProfile,
  onRetakePlacement,
  onBack,
}: {
  profiles: Profile[];
  activeId: string | null;
  settings: Settings;
  cloud: CloudSync;
  data: AppData;
  onRestore: (d: AppData) => void;
  onSettings: (s: Settings) => void;
  onUpdateProfile: (p: Profile) => void;
  onDeleteProfile: (id: string) => void;
  onRetakePlacement: (id: string) => void;
  onBack: () => void;
}) {
  const [passed, setPassed] = useState(false);
  const [selId, setSelId] = useState<string | null>(activeId ?? profiles[0]?.id ?? null);
  const [confirm, setConfirm] = useState<null | 'delete' | 'reset'>(null);
  const p = profiles.find((x) => x.id === selId) ?? null;

  const days = useMemo(() => {
    const out: { key: string; label: string; minutes: number; xp: number }[] = [];
    const names = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    for (let i = 13; i >= 0; i--) {
      const t = Date.now() - i * 86400000;
      const k = dayKey(t);
      const a = p?.activity[k];
      out.push({ key: k, label: names[new Date(t).getDay()], minutes: Math.round((a?.seconds ?? 0) / 60), xp: a?.xp ?? 0 });
    }
    return out;
  }, [p]);

  if (!passed) return <ParentGate onPass={() => setPassed(true)} onBack={onBack} />;

  const stats = p ? wordStats(p) : null;
  const level = p ? levelLabel(p.ability) : null;
  const weak = p
    ? Object.entries(p.items)
        .filter(([id, it]) => WORDS_BY_ID[id] && it.wrong > 0)
        .sort((x, y) => y[1].wrong - y[1].correct * 0.5 - (x[1].wrong - x[1].correct * 0.5))
        .slice(0, 10)
    : [];
  const maxMin = Math.max(5, ...days.map((d) => d.minutes));
  const stagesDone = p ? Object.values(p.stages).filter((s) => s.stars > 0).length : 0;
  const totalStages = ISLANDS.reduce((s, i) => s + i.stages.length, 0);

  return (
    <div className="screen parent">
      <header className="sub-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          ➜
        </button>
        <h1>👨‍👩‍👧 לוח הורים</h1>
        <span />
      </header>

      {profiles.length > 1 && (
        <div className="tabs">
          {profiles.map((x) => (
            <button key={x.id} type="button" className={x.id === selId ? 'on' : ''} onClick={() => setSelId(x.id)}>
              {x.avatar} {x.name}
            </button>
          ))}
        </div>
      )}

      {p && stats && level && (
        <>
          <section className="card kpis">
            <div className="kpi">
              <b>{level.he}</b>
              <small>
                רמה נוכחית (<En>{level.cefr}</En>)
              </small>
            </div>
            <div className="kpi">
              <b>{stats.learned}</b>
              <small>מילים שנלמדו</small>
            </div>
            <div className="kpi">
              <b>{stats.mastered}</b>
              <small>מילים בשליטה מלאה</small>
            </div>
            <div className="kpi">
              <b>
                {stagesDone}/{totalStages}
              </b>
              <small>שלבים</small>
            </div>
            <div className="kpi">
              <b>{Math.round(p.totalSeconds / 60)}</b>
              <small>דקות למידה</small>
            </div>
            <div className="kpi">
              <b>{p.streak}</b>
              <small>ימים ברצף (שיא {p.bestStreak})</small>
            </div>
          </section>

          <section className="card">
            <h3>התקדמות ברמה</h3>
            <div className="ability-bar">
              <div className="ability-fill" style={{ width: `${((p.ability - 1) / 4) * 100}%` }} />
              {['Pre-A1', 'Pre-A1+', 'A1', 'A1+', 'A2'].map((l) => (
                <span key={l} dir="ltr">
                  {l}
                </span>
              ))}
            </div>
            <p className="muted">
              רמה בבדיקת הפתיחה: {p.placementDone ? p.placementLevel : '—'} · מדד יכולת נוכחי: {p.ability.toFixed(2)} מתוך 5. המשחק מתאים את רמת
              הקושי (מספר אפשרויות, רמזים בעברית, סוגי תרגילים) לפי המדד הזה.
            </p>
          </section>

          <section className="card">
            <h3>מיומנויות</h3>
            {SKILLS.map((s) => {
              const n = p.skillCount[s] ?? 0;
              const v = p.skill[s];
              return (
                <div key={s} className="skill-row">
                  <span className="skill-name">{SKILL_NAMES[s]}</span>
                  <div className="skill-bar">
                    <div
                      className={`skill-fill ${v >= 0.8 ? 'good' : v >= 0.6 ? 'mid' : 'low'}`}
                      style={{ width: n ? `${Math.round(v * 100)}%` : '0%' }}
                    />
                  </div>
                  <span className="skill-val">{n ? `${Math.round(v * 100)}%` : '—'}</span>
                </div>
              );
            })}
            <p className="muted">דיוק ממוצע אחרון בכל מיומנות (משוקלל לטובת התרגילים האחרונים).</p>
          </section>

          <section className="card">
            <h3>פעילות בשבועיים האחרונים (דקות)</h3>
            <div className="chart">
              {days.map((d) => (
                <div key={d.key} className="bar-col" title={`${d.key}: ${d.minutes} דק׳, ${d.xp} נק׳`}>
                  <div className="bar" style={{ height: `${(d.minutes / maxMin) * 100}%` }}>
                    {d.minutes > 0 && <span>{d.minutes}</span>}
                  </div>
                  <small>{d.label}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>איים</h3>
            <div className="island-progress">
              {ISLANDS.map((i) => {
                const done = i.stages.filter((s) => stageDone(p, s)).length;
                return (
                  <div key={i.id} className={`ip ${isIslandUnlocked(p, i) ? '' : 'locked'}`}>
                    <span>{i.emoji}</span>
                    <span className="ip-name">{i.name}</span>
                    <span className="ip-count">
                      {done}/{i.stages.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h3>מילים שכדאי לחזק</h3>
            {weak.length === 0 ? (
              <p className="muted">אין עדיין מילים מאתגרות במיוחד 👏</p>
            ) : (
              <div className="weak-list">
                {weak.map(([id, it]) => (
                  <span key={id} className="learned-chip">
                    {WORDS_BY_ID[id].emoji || '🎨'} <En>{WORDS_BY_ID[id].en}</En> · {WORDS_BY_ID[id].he}
                    <small>
                      {' '}
                      ({it.correct}✓ {it.wrong}✗)
                    </small>
                  </span>
                ))}
              </div>
            )}
            <p className="muted">מילים אלו חוזרות אוטומטית בתרגול (שיטת חזרה מרווחת).</p>
          </section>

          <section className="card actions">
            <h3>ניהול שחקן</h3>
            <div className="row wrap">
              <BigButton color="blue" onClick={() => onRetakePlacement(p.id)}>
                🔁 בדיקת רמה מחדש
              </BigButton>
              <BigButton color="orange" onClick={() => setConfirm('reset')}>
                ♻️ איפוס התקדמות
              </BigButton>
              <BigButton color="red" onClick={() => setConfirm('delete')}>
                🗑️ מחיקת שחקן
              </BigButton>
            </div>
          </section>
        </>
      )}

      <CloudPanel cloud={cloud} data={data} onRestore={onRestore} />

      <section className="card settings">
        <h3>הגדרות</h3>
        <label className="toggle">
          <input type="checkbox" checked={settings.sound} onChange={(e) => onSettings({ ...settings, sound: e.target.checked })} />
          צלילים ואפקטים
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.hebrewHints} onChange={(e) => onSettings({ ...settings, hebrewHints: e.target.checked })} />
          רמזים בעברית (למתחילים)
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.speaking}
            disabled={!canRecognize()}
            onChange={(e) => onSettings({ ...settings, speaking: e.target.checked })}
          />
          תרגילי דיבור (מיקרופון)
          {!canRecognize() && <small className="muted"> – לא נתמך בדפדפן זה (מומלץ Chrome)</small>}
        </label>
        <label className="range">
          מהירות הקראה: {settings.speechRate.toFixed(2)}
          <input
            type="range"
            min={0.6}
            max={1.1}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => onSettings({ ...settings, speechRate: Number(e.target.value) })}
          />
        </label>
        <label className="range">
          יעד יומי: {settings.dailyGoal} נקודות
          <input
            type="range"
            min={20}
            max={120}
            step={10}
            value={settings.dailyGoal}
            onChange={(e) => onSettings({ ...settings, dailyGoal: Number(e.target.value) })}
          />
        </label>
        {!canSpeak() && <p className="err">הדפדפן לא תומך בהקראה קולית. מומלץ להשתמש ב-Chrome, Edge או Safari.</p>}
        <p className="muted">{cloud.user ? 'הנתונים נשמרים במכשיר ובחשבון הענן.' : 'כל הנתונים נשמרים במכשיר זה בלבד.'}</p>
      </section>

      {confirm && p && (
        <Modal onClose={() => setConfirm(null)}>
          <h2>{confirm === 'delete' ? `למחוק את ${p.name}?` : `לאפס את ההתקדמות של ${p.name}?`}</h2>
          <p>פעולה זו אינה ניתנת לביטול.</p>
          <div className="row">
            <BigButton color="gray" onClick={() => setConfirm(null)}>
              ביטול
            </BigButton>
            <BigButton
              color="red"
              onClick={() => {
                if (confirm === 'delete') {
                  onDeleteProfile(p.id);
                  setSelId(profiles.find((x) => x.id !== p.id)?.id ?? null);
                } else {
                  onUpdateProfile({
                    ...p,
                    items: {},
                    stages: {},
                    unlocked: [],
                    xp: 0,
                    streak: 0,
                    activity: {},
                    achievements: [],
                    placementDone: false,
                    resetAt: Date.now(),
                    ability: p.age <= 6 ? 1.2 : 1.8,
                    perfectLessons: 0,
                    spokenCorrect: 0,
                    totalSeconds: 0,
                  });
                }
                setConfirm(null);
              }}
            >
              כן, בטוח
            </BigButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
