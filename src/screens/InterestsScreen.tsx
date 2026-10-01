import { useState } from 'react';
import { BigButton, Companion } from '../components/common';
import { Emoji } from '../components/Emoji';
import { GAME_INTERESTS, TOPIC_INTERESTS, type Interest, type Interests } from '../data/interests';
import { sfx } from '../engine/sound';
import { hasHebrewVoice, speak } from '../engine/speech';
import type { Profile } from '../types';

function Cards({ items, chosen, onToggle }: { items: Interest[]; chosen: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="interest-grid">
      {items.map((i) => {
        const on = chosen.includes(i.id);
        return (
          <button key={i.id} type="button" className={`interest ${on ? 'on' : ''}`} onClick={() => onToggle(i.id)} aria-pressed={on}>
            <Emoji char={i.emoji} size={52} />
            <span>{i.label}</span>
            {on && <i className="heart">💖</i>}
          </button>
        );
      })}
    </div>
  );
}

export function InterestsScreen({
  profile,
  onSave,
  onSkip,
}: {
  profile: Profile;
  onSave: (interests: Interests) => void;
  onSkip: () => void;
}) {
  const [topics, setTopics] = useState<string[]>(profile.interests?.topics ?? []);
  const [games, setGames] = useState<string[]>(profile.interests?.games ?? []);
  const editing = !!profile.interests;

  const toggle = (list: string[], set: (v: string[]) => void, items: Interest[]) => (id: string) => {
    const on = list.includes(id);
    if (on) sfx.tap();
    else sfx.coin();
    set(on ? list.filter((x) => x !== id) : [...list, id]);
    // Pre-readers: hear what they tapped.
    if (!on && hasHebrewVoice()) void speak(items.find((i) => i.id === id)!.label, { lang: 'he' });
  };

  const count = topics.length + games.length;
  return (
    <div className="screen interests">
      <Companion
        id={profile.companion}
        message={`${profile.name}, מה הכי כיף לך? בחרו כמה שרוצים, ואני אתאים את המשחק בשבילכם! 💖`}
      />
      <h2 className="interest-title">על מה אוהבים ללמוד?</h2>
      <Cards items={TOPIC_INTERESTS} chosen={topics} onToggle={toggle(topics, setTopics, TOPIC_INTERESTS)} />
      <h2 className="interest-title">איזה משחקים הכי כיף?</h2>
      <Cards items={GAME_INTERESTS} chosen={games} onToggle={toggle(games, setGames, GAME_INTERESTS)} />
      <div className="interest-actions">
        <BigButton disabled={count === 0} onClick={() => onSave({ topics, games })} className={count ? 'pulse' : ''}>
          {editing ? 'שמירה ✓' : 'זהו, ממשיכים! ➜'}
        </BigButton>
        <button type="button" className="link-btn" onClick={onSkip}>
          {editing ? 'ביטול' : 'אבחר אחר כך'}
        </button>
      </div>
    </div>
  );
}
