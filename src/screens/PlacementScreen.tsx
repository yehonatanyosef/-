import { useCallback, useEffect, useMemo, useState } from 'react';
import { BigButton, Companion } from '../components/common';
import { ISLANDS, startIslandIndex } from '../data/islands';
import { celebrate } from '../engine/effects';
import { INSTRUCTIONS } from '../engine/exercises';
import {
  answerPlacement,
  PLACEMENT_QUESTIONS,
  placementDone,
  placementQuestion,
  placementResult,
  startPlacement,
} from '../engine/placement';
import { levelLabel } from '../engine/progress';
import { sfx } from '../engine/sound';
import { ExerciseView } from '../exercises/ExerciseView';
import type { Profile } from '../types';

export function PlacementScreen({
  profile,
  onDone,
  onSkip,
}: {
  profile: Profile;
  onDone: (level: number, ability: number) => void;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'test' | 'result'>('intro');
  const [state, setState] = useState(() => startPlacement(profile.age));
  const [answered, setAnswered] = useState(false);
  const question = useMemo(
    () => (placementDone(state) ? null : placementQuestion(state, profile, Math.random)),
    // a new question only when the number of answered questions changes
    [state.asked],
  );

  const submit = useCallback(
    (correct: boolean) => {
      if (!question || answered) return;
      setAnswered(true);
      sfx.tap();
      // No sounds or retries during the test – it's a friendly check-up, not an exam.
      setTimeout(() => {
        setState((s) => answerPlacement(s, question, correct));
        setAnswered(false);
      }, 700);
    },
    [question, answered],
  );

  useEffect(() => {
    if (phase === 'test' && placementDone(state)) {
      setPhase('result');
      sfx.win();
      celebrate();
    }
  }, [state, phase]);

  if (phase === 'intro') {
    return (
      <div className="screen center placement">
        <Companion
          id={profile.companion}
          message={`היי ${profile.name}! לפני שמתחילים, בואו נשחק משחק קצר כדי שאדע מה כבר יודעים. זה בסדר גמור לא לדעת — פשוט לוחצים "לא יודע/ת" 😊`}
        />
        <BigButton onClick={() => setPhase('test')} className="pulse">
          בואו נתחיל! 🎮
        </BigButton>
        <button type="button" className="link-btn" onClick={onSkip}>
          אני מתחיל/ה מאפס – דלגו על הבדיקה
        </button>
      </div>
    );
  }

  if (phase === 'result') {
    const { level, ability } = placementResult(state);
    const island = ISLANDS[startIslandIndex(level)];
    const label = levelLabel(ability);
    return (
      <div className="screen center placement">
        <h1>סיימנו! 🎉</h1>
        <div className="placement-level pop-in">
          <span className="lvl-num">{level}</span>
          <div>
            <b>הרמה שלך: {label.he}</b>
            <small dir="ltr">{label.cefr}</small>
          </div>
        </div>
        <Companion
          id={profile.companion}
          mood="happy"
          message={`מעולה! בניתי לך מסלול אישי. מתחילים ב${island.name} ${island.emoji}. ככל שתתקדמו, המשחק יתאים את עצמו אליכם!`}
        />
        <BigButton onClick={() => onDone(level, ability)} className="pulse">
          למפת המסע! 🗺️
        </BigButton>
      </div>
    );
  }

  if (!question) return null;
  return (
    <div className="screen lesson placement-test">
      <div className="placement-dots">
        {Array.from({ length: PLACEMENT_QUESTIONS }).map((_, i) => (
          <span key={i} className={i < state.asked ? 'done' : i === state.asked ? 'now' : ''} />
        ))}
      </div>
      <div className="instruction">{INSTRUCTIONS[question.kind]}</div>
      <div className={`exercise-wrap ${answered ? 'fade' : ''}`} key={question.uid}>
        <ExerciseView ex={question} hints={{ hebrew: false, autoAudio: true }} onAnswer={submit} onSkip={() => submit(false)} />
      </div>
      <button type="button" className="dont-know" onClick={() => submit(false)} disabled={answered}>
        🤷 לא יודע/ת
      </button>
    </div>
  );
}
