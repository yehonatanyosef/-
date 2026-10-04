import { useState, type CSSProperties } from 'react';
import { BigButton, Companion, En } from '../components/common';
import { Emoji } from '../components/Emoji';
import { COMPANIONS_BY_ID } from '../data/companions';
import { burst } from '../engine/effects';
import { bagItems, collectedItems, islandItem, islandSize, islandSlots, placeItem, removeItem, type IslandItem } from '../engine/island';
import { sfx } from '../engine/sound';
import { speak } from '../engine/speech';
import type { Profile } from '../types';

/** The child's own island: learned words and chest prizes to place, tap anything to hear its name. */
export function IslandScreen({ profile, onUpdate, onBack, onPlay }: { profile: Profile; onUpdate: (p: Profile) => void; onBack: () => void; onPlay: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [bounce, setBounce] = useState<number | null>(null);
  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const collected = collectedItems(profile);
  const size = islandSize(collected.length);
  const slots = islandSlots(profile);
  const bag = bagItems(profile);
  const placed = slots.filter(Boolean).length;
  const free = slots.indexOf(null);
  const companion = COMPANIONS_BY_ID[profile.companion] ?? COMPANIONS_BY_ID.owl;
  const pickedItem = picked !== null && slots[picked] ? islandItem(slots[picked]!) : null;

  const say = (item: IslandItem) => void speak(item.en);

  const tapTile = (i: number) => {
    const id = slots[i];
    if (!id) {
      setPicked(null);
      return;
    }
    const item = islandItem(id);
    if (!item) return;
    sfx.tap();
    say(item);
    setBounce(i);
    setTimeout(() => setBounce((b) => (b === i ? null : b)), 600);
    setPicked(i);
  };

  const place = (item: IslandItem) => {
    if (free < 0) return;
    sfx.coin();
    say(item);
    onUpdate(placeItem(profile, item.id, free));
    setJustPlaced(free);
    setPicked(null);
    setTimeout(() => setJustPlaced(null), 700);
    burst(0.5, 0.35);
  };

  const message = !collected.length
    ? 'כל מילה שתלמדו תגיע לכאן, ותוכלו לבנות איתה את האי שלכם! שחקו שלב ותחזרו 🙂'
    : bag.length && free >= 0
      ? 'בחרו משהו מהתיק ושימו אותו על האי! לחיצה על כל דבר באי – ותשמעו איך אומרים אותו באנגלית 🔊'
      : bag.length
        ? 'האי מלא! למדו עוד מילים כדי שהאי יגדל 🌱'
        : 'לחצו על כל דבר באי כדי לשמוע איך אומרים אותו באנגלית 🔊';

  return (
    <div className="screen island-screen">
      <header className="sub-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="חזרה">
          ➜
        </button>
        <h1>האי של {profile.name} 🏝️</h1>
        <span className="stat">🧺 {collected.length}</span>
      </header>

      <Companion id={profile.companion} message={message} />

      <div className="isle-sea">
        <div className={`isle size-${size.level}`} style={{ '--cols': size.cols } as CSSProperties}>
          <div className="isle-grid">
            {slots.map((id, i) => {
              const item = id ? islandItem(id) : null;
              return (
                <button
                  key={i}
                  type="button"
                  className={`isle-tile ${item ? 'filled' : 'empty'} ${item?.alive ? 'alive' : ''} ${bounce === i ? 'bounce' : ''} ${justPlaced === i ? 'landed' : ''} ${picked === i ? 'picked' : ''}`}
                  style={{ animationDelay: `${(i % 5) * 0.37}s` } as CSSProperties}
                  onClick={() => tapTile(i)}
                  aria-label={item ? item.en : 'מקום פנוי'}
                >
                  {item ? <Emoji char={item.emoji} size={size.cols >= 5 ? 44 : 54} label={item.en} /> : <span className="isle-tile-dot" />}
                  {item?.rare && <i className="sparkle">✨</i>}
                </button>
              );
            })}
          </div>
          <span className="isle-companion">
            <Emoji char={companion.emoji} size={46} />
          </span>
        </div>
      </div>

      {pickedItem && picked !== null && (
        <div className="item-bubble pop-in">
          <Emoji char={pickedItem.emoji} size={40} />
          <div>
            <En className="bubble-en">{pickedItem.en}</En>
            <span className="bubble-he">{pickedItem.he}</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => say(pickedItem)} aria-label="השמעה">
            🔊
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              sfx.flip();
              onUpdate(removeItem(profile, picked));
              setPicked(null);
            }}
            aria-label="החזרה לתיק"
            title="החזרה לתיק"
          >
            🧺
          </button>
        </div>
      )}

      <div className="isle-progress">
        {size.toNext !== null ? (
          <span>
            🌱 עוד <b>{size.toNext}</b> פריטים והאי יגדל! · {placed}/{slots.length} מקומות
          </span>
        ) : (
          <span>🌟 האי שלכם בגודל המקסימלי! · {placed}/{slots.length} מקומות</span>
        )}
      </div>

      <section className="bag">
        <h2>🧺 התיק שלי {bag.length > 0 && <small>({bag.length})</small>}</h2>
        {bag.length ? (
          <div className="bag-grid">
            {bag.map((item) => (
              <button key={item.id} type="button" className={`bag-item ${item.rare ? 'rare' : ''}`} onClick={() => (free >= 0 ? place(item) : say(item))} disabled={false}>
                <Emoji char={item.emoji} size={46} label={item.en} />
                <En className="bag-en">{item.en}</En>
              </button>
            ))}
          </div>
        ) : collected.length ? (
          <p className="bag-empty">הכול כבר על האי! 🎉 כל מילה חדשה שתלמדו תגיע לתיק.</p>
        ) : (
          <BigButton onClick={onPlay} className="pulse">
            לשחק ולאסוף מילים ▶
          </BigButton>
        )}
      </section>
    </div>
  );
}
