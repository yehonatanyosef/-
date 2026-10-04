import { useEffect, useState } from 'react';
import { BigButton, Companion, En } from '../components/common';
import { WORDS_BY_ID } from '../data/words';
import { ACHIEVEMENTS_BY_ID } from '../engine/achievements';
import { celebrate, stars as starBurst } from '../engine/effects';
import { newIslandWords } from '../engine/island';
import { levelLabel, todayMission, type LessonRewards } from '../engine/progress';
import { Emoji } from '../components/Emoji';
import { sfx } from '../engine/sound';
import type { Profile } from '../types';

function useCountUp(target: number, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 700);
        setV(Math.round(target * p));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, delay]);
  return v;
}

export function LessonResult({
  rewards,
  profile,
  boss,
  practice,
  goal,
  onContinue,
  onReplay,
}: {
  rewards: LessonRewards;
  profile: Profile;
  boss: boolean;
  practice: boolean;
  goal: number;
  onContinue: () => void;
  onReplay: () => void;
}) {
  const [shown, setShown] = useState(0);
  const xp = useCountUp(rewards.xp, 600);
  const coins = useCountUp(rewards.coins, 900);
  const before = levelLabel(rewards.abilityBefore);
  const after = levelLabel(rewards.abilityAfter);
  const leveledUp = after.cefr !== before.cefr && rewards.abilityAfter > rewards.abilityBefore;

  useEffect(() => {
    sfx.win();
    celebrate();
    const timers = [1, 2, 3].map((n) =>
      setTimeout(() => {
        if (n <= rewards.stars) {
          setShown(n);
          sfx.coin();
          if (n === rewards.stars) starBurst();
        }
      }, 300 + n * 350),
    );
    if (leveledUp) timers.push(setTimeout(() => sfx.levelUp(), 1800));
    return () => timers.forEach(clearTimeout);
  }, [rewards.stars, leveledUp]);

  const pct = Math.round(rewards.accuracy * 100);
  const games = todayMission(profile).games;
  const toIsland = newIslandWords(rewards.learnedNow).length;
  const message =
    rewards.stars === 3 ? 'מושלם! אתם אלופים! 🏆' : rewards.stars === 2 ? 'עבודה מצוינת! עוד קצת ותגיעו ל-3 כוכבים' : 'כל הכבוד שסיימתם! תרגול עושה מושלם 💪';

  return (
    <div className="screen result">
      <h1 className="result-title">{boss ? 'ניצחתם את הבוס! 👑' : practice ? 'סיימתם תרגול! 🎉' : 'השלב הושלם! 🎉'}</h1>
      <div className="stars-row">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`big-star ${n <= shown ? 'on' : ''}`}>
            ★
          </span>
        ))}
      </div>
      <Companion id={profile.companion} mood="happy" message={message} />
      <div className="reward-cards">
        <div className="reward">
          <span>⚡</span>
          <b>+{xp}</b>
          <small>נקודות</small>
        </div>
        <div className="reward">
          <span>🪙</span>
          <b>+{coins}</b>
          <small>מטבעות</small>
        </div>
        <div className="reward">
          <span>🎯</span>
          <b>{pct}%</b>
          <small>דיוק</small>
        </div>
        {rewards.streakIncreased && (
          <div className="reward streak">
            <span>🔥</span>
            <b>{rewards.streak}</b>
            <small>ימים ברצף</small>
          </div>
        )}
      </div>

      <div className={`result-mission ${games >= goal ? 'done' : ''}`}>
        {games === goal
          ? '🎁 השלמתם את המשימה של היום! התיבה מחכה לכם במפה'
          : games > goal
            ? '⭐ משחק בונוס – המשימה של היום כבר הושלמה'
            : `🎯 המשימה של היום: ${games}/${goal} משחקים`}
      </div>

      {leveledUp && (
        <div className="level-up pop-in">
          ⬆️ עליתם רמה! עכשיו אתם ברמת <b>{after.he}</b> ({after.cefr})
        </div>
      )}

      {rewards.learnedNow.length > 0 && (
        <div className="learned">
          <div className="learned-title">{toIsland ? 'מילים שלמדתם – הן מחכות לכם בתיק באי 🏝️' : 'מילים שלמדתם:'}</div>
          <div className="learned-list">
            {rewards.learnedNow.slice(0, 12).map((id) => (
              <span key={id} className="learned-chip">
                {WORDS_BY_ID[id].emoji ? <Emoji char={WORDS_BY_ID[id].emoji} size={26} /> : '🎨'} <En>{WORDS_BY_ID[id].en}</En>
              </span>
            ))}
          </div>
        </div>
      )}

      {rewards.newAchievements.map((id) => (
        <div key={id} className="achievement-pop pop-in">
          <span className="ach-emoji">{ACHIEVEMENTS_BY_ID[id].emoji}</span>
          <div>
            <b>הישג חדש: {ACHIEVEMENTS_BY_ID[id].title}</b>
            <div>{ACHIEVEMENTS_BY_ID[id].desc}</div>
          </div>
        </div>
      ))}

      <div className="row">
        <BigButton onClick={onContinue}>{practice ? 'חזרה למפה' : 'המשך במסע ➜'}</BigButton>
        <BigButton color="blue" onClick={onReplay}>
          🔄 שוב
        </BigButton>
      </div>
    </div>
  );
}
