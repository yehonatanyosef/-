import { useEffect, useState } from 'react';
import { DECOR_BY_ID } from '../data/decor';
import { burst, celebrate } from '../engine/effects';
import type { ChestKind, ChestReward } from '../engine/island';
import { sfx } from '../engine/sound';
import { speak } from '../engine/speech';
import { BigButton, En, Modal } from './common';
import { Emoji } from './Emoji';

/** A treasure chest: tap to open, then the prize pops out (and its English name is said). */
export function ChestModal({
  kind,
  open,
  onClose,
  onIsland,
}: {
  kind: ChestKind;
  /** Opens the chest and returns what was inside. */
  open: () => ChestReward;
  onClose: () => void;
  onIsland: () => void;
}) {
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [shaking, setShaking] = useState(false);
  const decor = reward?.decor ? DECOR_BY_ID[reward.decor] : null;

  useEffect(() => {
    if (!reward) return;
    sfx.win();
    celebrate();
    if (decor) void speak(decor.en);
  }, [reward, decor]);

  const tap = () => {
    if (shaking || reward) return;
    setShaking(true);
    sfx.tap();
    setTimeout(() => {
      burst(0.5, 0.45);
      setReward(open());
    }, 900);
  };

  return (
    <Modal onClose={reward ? onClose : undefined}>
      <div className={`chest-sheet ${kind}`}>
        {!reward ? (
          <>
            <h2>{kind === 'weekly' ? 'התיבה השבועית! 🌟' : 'השלמתם את המשימה! 🎯'}</h2>
            <p>{kind === 'weekly' ? 'שיחקתם 5 ימים השבוע – מחכה לכם פרס נדיר!' : 'לחצו על התיבה כדי לפתוח אותה'}</p>
            <button type="button" className={`chest-btn ${shaking ? 'shake' : 'wiggle'}`} onClick={tap} aria-label="פתיחת התיבה">
              <Emoji char={kind === 'weekly' ? '💎' : '🎁'} size={140} />
            </button>
          </>
        ) : (
          <>
            <h2>מה יש בתיבה? 🎉</h2>
            {decor && (
              <button type="button" className={`chest-prize pop-in ${decor.rare ? 'rare' : ''}`} onClick={() => void speak(decor.en)}>
                <Emoji char={decor.emoji} size={120} />
                <En className="prize-en">{decor.en}</En>
                <span className="prize-he">{decor.he}</span>
                {decor.rare && <span className="rare-tag">✨ נדיר!</span>}
              </button>
            )}
            <div className="chest-coins pop-in">🪙 +{reward.coins}</div>
            {decor ? (
              <>
                <p>אפשר לשים את זה עכשיו באי שלכם 🏝️</p>
                <div className="row">
                  <BigButton onClick={onIsland}>לאי שלי 🏝️</BigButton>
                  <BigButton color="blue" onClick={onClose}>
                    אחר כך
                  </BigButton>
                </div>
              </>
            ) : (
              <BigButton onClick={onClose}>יופי! ➜</BigButton>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
