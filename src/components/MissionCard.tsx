import type { MissionStatus } from '../engine/mission';
import { weekDays } from '../engine/mission';
import type { Profile } from '../types';
import { Emoji } from './Emoji';

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** Today's mission on the map: a few games, then a chest – and the week's progress towards the weekly chest. */
export function MissionCard({
  profile,
  status,
  onPlay,
  onChest,
}: {
  profile: Profile;
  status: MissionStatus;
  onPlay: () => void;
  onChest: (kind: 'daily' | 'weekly') => void;
}) {
  const { games, goal, complete, dailyClaimed, weekDone, weeklyReady } = status;
  const days = weekDays(profile);
  return (
    <section className={`mission ${complete ? 'complete' : ''}`}>
      <div className="mission-head">
        <Emoji char="🎯" size={34} />
        <div>
          <h2>המשימה של היום</h2>
          <small>
            {dailyClaimed ? 'כל הכבוד! המשימה הושלמה – אפשר להמשיך לשחק בשביל הכיף ⭐' : complete ? 'הצלחתם! התיבה מחכה לכם 🎁' : `שחקו ${goal} משחקים וקבלו תיבת אוצר`}
          </small>
        </div>
      </div>
      <div className="mission-steps" aria-label={`${games} מתוך ${goal} משחקים`}>
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={`mission-step ${i < games ? 'done' : ''} ${i === games && !complete ? 'next' : ''}`}>
            {i < games ? '⭐' : i + 1}
          </span>
        ))}
        <span className={`mission-step chest ${dailyClaimed ? 'opened' : complete ? 'ready' : ''}`}>
          <Emoji char="🎁" size={30} />
        </span>
      </div>
      {weeklyReady ? (
        <button type="button" className="mission-btn weekly pulse" onClick={() => onChest('weekly')}>
          💎 פתחו את התיבה השבועית!
        </button>
      ) : complete && !dailyClaimed ? (
        <button type="button" className="mission-btn chest pulse" onClick={() => onChest('daily')}>
          🎁 פתחו את התיבה!
        </button>
      ) : (
        <button type="button" className={`mission-btn ${dailyClaimed ? 'soft' : 'pulse'}`} onClick={onPlay}>
          {dailyClaimed ? 'עוד משחק ▶' : games === 0 ? 'יאללה, מתחילים! ▶' : 'למשחק הבא ▶'}
        </button>
      )}
      <div className="week-row" aria-label={`השבוע: ${weekDone} מתוך 5 ימים`}>
        {days.map((d, i) => (
          <span key={d.day} className={`week-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}>
            <i>{d.done ? '✓' : ''}</i>
            <small>{DAY_LETTERS[i]}</small>
          </span>
        ))}
        <span className="week-chest" title="תיבה שבועית: 5 ימים של משימה">
          <Emoji char="💎" size={24} /> {Math.min(weekDone, 5)}/5
        </span>
      </div>
    </section>
  );
}
