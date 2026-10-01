import { useCallback, useEffect, useMemo, useState } from 'react';
import { BigButton, Companion } from '../components/common';
import { ISLANDS, startIslandIndex } from '../data/islands';
import { celebrate } from '../engine/effects';
import { INSTRUCTIONS } from '../engine/exercises';
import {
  answerPlacement,
  placementDone,
  placementQuestion,
  placementResult,
  startPlacement,
  TIERS,
} from '../engine/placement';
import { levelLabel } from '../engine/progress';
import { sfx } from '../engine/sound';
import { hasHebrewVoice, speak } from '../engine/speech';
import { Emoji } from '../components/Emoji';
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

  // Young children may not read Hebrew yet – read the instruction aloud (when the device has a Hebrew voice).
  useEffect(() => {
    if (phase !== 'test' || !question || profile.age > 6 || !hasHebrewVoice()) return;
    if (question.kind === 'listen-pick' || question.kind === 'letter-listen' || question.kind === 'listen-sentence') return;
    void speak(INSTRUCTIONS[question.kind], { lang: 'he' });
  }, [phase, question, profile.age]);

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
          message={`היי ${profile.name}! לפני שמתחילים, בואו נשחק משחק קצר כדי שאדע מה כבר יודעים. מתחילים בקל ומתקדמים לאט לאט. זה בסדר גמור לא לדעת — פשוט לוחצים "לא יודע/ת" 😊`}
        />
        <Ladder tier={-1} passed={-1} />
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
    const { level, ability, passed } = placementResult(state);
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
        <Ladder tier={-1} passed={passed} />
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
      <Ladder tier={state.tier} passed={state.passed} />
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

/** The steps of the level test, showing which ones were passed and the current one. */
function Ladder({ tier, passed }: { tier: number; passed: number }) {
  return (
    <div className="ladder" aria-label="שלבי הבדיקה">
      {TIERS.map((t, i) => (
        <div key={i} className={`rung ${i <= passed ? 'passed' : ''} ${i === tier ? 'now' : ''}`} title={t.label}>
          <Emoji char={t.emoji} size={28} />
          <small>{t.label}</small>
        </div>
      ))}
    </div>
  );
}
