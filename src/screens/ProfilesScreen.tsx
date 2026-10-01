import { useState } from 'react';
import { BigButton, Companion, En } from '../components/common';
import { AVATARS } from '../data/companions';
import { levelLabel } from '../engine/progress';
import type { Profile } from '../types';

export function ProfilesScreen({
  profiles,
  onSelect,
  onNew,
  onParents,
}: {
  profiles: Profile[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onParents: () => void;
}) {
  return (
    <div className="screen profiles">
      <div className="logo">
        <span className="logo-emoji">🏝️</span>
        <h1>
          אי האנגלית
          <En className="logo-en">English Island</En>
        </h1>
      </div>
      <Companion id="owl" message={profiles.length ? 'מי משחק היום?' : 'שלום! אני אולי הינשוף. בואו ניצור שחקן חדש!'} />
      <div className="profile-list">
        {profiles.map((p) => (
          <button key={p.id} type="button" className="profile-card" onClick={() => onSelect(p.id)}>
            <span className="avatar big">{p.avatar}</span>
            <b>{p.name}</b>
            <small>{levelLabel(p.ability).he}</small>
          </button>
        ))}
        <button type="button" className="profile-card add" onClick={onNew}>
          <span className="avatar big">➕</span>
          <b>שחקן חדש</b>
        </button>
      </div>
      <button type="button" className="link-btn" onClick={onParents}>
        👨‍👩‍👧 אזור הורים
      </button>
    </div>
  );
}

export function NewProfileScreen({
  onCreate,
  onBack,
  onParents,
}: {
  onCreate: (name: string, age: number, avatar: string) => void;
  onBack?: () => void;
  /** Shown on a fresh device so a parent can log in and pull existing progress. */
  onParents?: () => void;
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const ok = name.trim().length > 0 && age !== null;
  return (
    <div className="screen new-profile">
      {onBack && (
        <button type="button" className="icon-btn back" onClick={onBack} aria-label="חזרה">
          ➜
        </button>
      )}
      <h1>שחקן חדש ✨</h1>
      <label className="field">
        <span>איך קוראים לך?</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 16))} placeholder="השם שלי" />
      </label>
      <div className="field">
        <span>בן/בת כמה את/ה?</span>
        <div className="age-row">
          {[4, 5, 6, 7, 8, 9, 10, 11].map((a) => (
            <button key={a} type="button" className={`age-btn ${age === a ? 'on' : ''}`} onClick={() => setAge(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>בחרו דמות:</span>
        <div className="avatar-grid">
          {AVATARS.map((a) => (
            <button key={a} type="button" className={`avatar-pick ${avatar === a ? 'on' : ''}`} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <BigButton disabled={!ok} onClick={() => ok && onCreate(name.trim(), age!, avatar)}>
        יוצאים לדרך! 🚀
      </BigButton>
      {onParents && (
        <button type="button" className="link-btn" onClick={onParents}>
          ☁️ כבר שיחקתם במכשיר אחר? התחברות לחשבון הורה
        </button>
      )}
    </div>
  );
}
