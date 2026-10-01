import { useState } from 'react';
import { BigButton, Companion } from '../components/common';
import { COMPANIONS } from '../data/companions';
import { ACHIEVEMENTS, checkAchievements } from '../engine/achievements';
import { burst } from '../engine/effects';
import { sfx } from '../engine/sound';
import type { Profile } from '../types';
import { Emoji } from '../components/Emoji';

export function ShopScreen({ profile, onUpdate, onBack }: { profile: Profile; onUpdate: (p: Profile) => void; onBack: () => void }) {
  const [msg, setMsg] = useState('בחרו חבר למסע! אוספים מטבעות בכל שלב 🪙');

  const buy = (id: string, cost: number, name: string) => {
    if (profile.coins < cost) {
      sfx.wrong();
      setMsg(`חסרים עוד ${cost - profile.coins} מטבעות. ממשיכים לשחק! 💪`);
      return;
    }
    sfx.coin();
    burst();
    let next: Profile = { ...profile, coins: profile.coins - cost, ownedCompanions: [...profile.ownedCompanions, id], companion: id };
    const fresh = checkAchievements(next);
    if (fresh.length) next = { ...next, achievements: [...next.achievements, ...fresh] };
    onUpdate(next);
    setMsg(`יש! ${name} מצטרף/ת למסע! 🎉`);
  };

  return (
    <div className="screen shop">
      <header className="sub-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          ➜
        </button>
        <h1>🛍️ החנות</h1>
        <span className="stat">🪙 {profile.coins}</span>
      </header>
      <Companion id={profile.companion} message={msg} />
      <div className="shop-grid">
        {COMPANIONS.map((c) => {
          const owned = profile.ownedCompanions.includes(c.id);
          const active = profile.companion === c.id;
          return (
            <div key={c.id} className={`shop-item ${active ? 'active' : ''} ${owned ? 'owned' : ''}`}>
              <span className="shop-emoji">
                <Emoji char={c.emoji} size={60} />
              </span>
              <b>{c.name}</b>
              {owned ? (
                <BigButton color={active ? 'gray' : 'blue'} disabled={active} onClick={() => onUpdate({ ...profile, companion: c.id })}>
                  {active ? 'איתי ✓' : 'בחירה'}
                </BigButton>
              ) : (
                <BigButton color={profile.coins >= c.cost ? 'orange' : 'gray'} onClick={() => buy(c.id, c.cost, c.name)}>
                  🪙 {c.cost}
                </BigButton>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AchievementsScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const got = ACHIEVEMENTS.filter((a) => profile.achievements.includes(a.id)).length;
  return (
    <div className="screen achievements">
      <header className="sub-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          ➜
        </button>
        <h1>🏆 ההישגים שלי</h1>
        <span className="stat">
          {got}/{ACHIEVEMENTS.length}
        </span>
      </header>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const has = profile.achievements.includes(a.id);
          return (
            <div key={a.id} className={`ach ${has ? 'has' : ''}`}>
              <span className="ach-emoji">{has ? a.emoji : '🔒'}</span>
              <b>{a.title}</b>
              <small>{a.desc}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
