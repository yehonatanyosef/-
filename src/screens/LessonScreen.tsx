import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { BigButton, Companion, En, ProgressBar, SpeakButton } from '../components/common';
import { ISLANDS_BY_ID, STAGES_BY_ID } from '../data/islands';
import { burst } from '../engine/effects';
import { answerText, easier, INSTRUCTIONS, isGraded, spokenAnswer, type Exercise } from '../engine/exercises';
import { generatePractice, generateStageLesson, nextUid } from '../engine/lessonGen';
import { applyLesson, type AnswerLog, type LessonRewards } from '../engine/progress';
import { pick } from '../engine/random';
import { sfx } from '../engine/sound';
import { canRecognize, hasHebrewVoice, speak, stopSpeaking } from '../engine/speech';
import { ExerciseView } from '../exercises/ExerciseView';
import type { Profile, Settings } from '../types';
import { LessonResult } from './LessonResult';

const PRAISE = ['כל הכבוד!', 'מעולה!', 'אלוף!', 'וואו!', 'מדהים!', 'יפה מאוד!', 'Great job!', 'Awesome!', 'Super!'];
const ENCOURAGE = ['כמעט! ננסה שוב בהמשך 💪', 'לא נורא, לומדים מטעויות!', 'זה בסדר! נחזור לזה עוד מעט'];

interface Props {
  profile: Profile;
  settings: Settings;
  stageId: string | null; // null = practice
  onFinish: (p: Profile) => void;
  onExit: () => void;
  onReplay: () => void;
}

export function LessonScreen({ profile, settings, stageId, onFinish, onExit, onReplay }: Props) {
  const stage = stageId ? STAGES_BY_ID[stageId] : null;
  const island = stage ? ISLANDS_BY_ID[stage.islandId] : null;

  const initial = useMemo(() => {
    const ctx = { profile, speaking: settings.speaking && canRecognize(), rng: Math.random, now: Date.now() };
    return stage ? generateStageLesson(stage, ctx) : generatePractice(ctx);
    // generated once per lesson
  }, []);

  const [queue, setQueue] = useState<Exercise[]>(initial);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [feedback, setFeedback] = useState<null | { correct: boolean; text: string; answer: string }>(null);
  const [combo, setCombo] = useState(0);
  const [comboToast, setComboToast] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState<null | { rewards: LessonRewards; profile: Profile }>(null);
  const startedAt = useRef(Date.now());

  const ex = queue[index];
  const total = queue.length;

  // Ability-aware hints: lots of support for young / beginning learners, less later.
  const hints = useMemo(
    () => ({
      hebrew: settings.hebrewHints && profile.ability < 2.8,
      autoAudio: profile.age <= 7 || profile.ability < 2.6,
    }),
    [settings.hebrewHints, profile.ability, profile.age],
  );

  // Read instructions aloud in Hebrew for young children (if a Hebrew voice exists).
  useEffect(() => {
    if (!ex || profile.age > 6 || !hasHebrewVoice()) return;
    if (['listen-pick', 'letter-listen', 'listen-sentence', 'learn-word', 'learn-letter', 'learn-sentence', 'read-story', 'learn-phrase', 'learn-rule', 'dialog-reply'].includes(ex.kind)) return;
    void speak(INSTRUCTIONS[ex.kind], { lang: 'he' });
  }, [ex, profile.age]);

  useEffect(() => () => stopSpeaking(), []);

  const finish = useCallback(
    (log: AnswerLog[]) => {
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const out = applyLesson(profile, { stageId, boss: !!stage?.boss, answers: log, seconds });
      setResult(out);
      onFinish(out.profile);
    },
    [profile, stageId, stage, onFinish],
  );

  const advance = useCallback(() => {
    setFeedback(null);
    if (index + 1 >= queue.length) finish(answers);
    else setIndex(index + 1);
  }, [index, queue.length, answers, finish]);

  const onAnswer = useCallback(
    (correct: boolean) => {
      if (!ex) return;
      if (!isGraded(ex)) {
        sfx.tap();
        advance();
        return;
      }
      const log: AnswerLog = { itemId: ex.itemId, skill: ex.skill, correct, first: !ex.retry };
      setAnswers((a) => [...a, log]);
      if (correct) {
        sfx.correct();
        burst(0.5, 0.75);
        const c = combo + 1;
        setCombo(c);
        if (c === 3 || c === 5 || c % 10 === 0) {
          sfx.combo(c);
          setComboToast(c);
          setTimeout(() => setComboToast(null), 1400);
        }
      } else {
        sfx.wrong();
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setCombo(0);
        // Ask again later in an easier form – mistakes are part of learning.
        if (!ex.retry) setQueue((q) => [...q, easier(ex, nextUid())]);
      }
      setFeedback({ correct, text: correct ? pick(PRAISE) : pick(ENCOURAGE), answer: answerText(ex) });
    },
    [ex, combo, advance],
  );

  const onSkip = useCallback(() => {
    // Microphone unavailable – drop speaking exercises for the rest of this lesson.
    const rest = queue.filter((e, i) => i <= index || (e.kind !== 'say-word' && e.kind !== 'say-sentence'));
    setQueue(rest);
    setFeedback(null);
    if (index + 1 >= rest.length) finish(answers);
    else setIndex(index + 1);
  }, [queue, index, answers, finish]);

  if (result) {
    return (
      <LessonResult
        rewards={result.rewards}
        profile={result.profile}
        boss={!!stage?.boss}
        practice={!stage}
        onContinue={onExit}
        onReplay={onReplay}
      />
    );
  }

  if (!ex) {
    return (
      <div className="screen center">
        <Companion id={profile.companion} message="עוד אין מילים לחזור עליהן — שחקו שלב במפה ואז חזרו לכאן!" />
        <BigButton onClick={onExit}>חזרה למפה</BigButton>
      </div>
    );
  }

  const title = stage ? (stage.boss ? `👑 אתגר הבוס – ${island!.name}` : `${island!.emoji} ${island!.name} · שלב ${stage.index + 1}`) : '🔁 חזרה ותרגול';

  return (
    <div className={`screen lesson ${stage?.boss ? 'boss' : ''}`} style={island ? ({ '--island-a': island.colors[0], '--island-b': island.colors[1] } as CSSProperties) : undefined}>
      <div className="lesson-top">
        <button type="button" className="icon-btn" onClick={() => setConfirmExit(true)} aria-label="יציאה">
          ✖
        </button>
        <ProgressBar value={index / total} />
        <span className={`combo ${combo >= 3 ? 'hot' : ''}`}>🔥{combo}</span>
      </div>
      <div className="lesson-title">{title}</div>

      <div className="instruction">
        <span>{INSTRUCTIONS[ex.kind]}</span>
        {ex.retry && <span className="retry-tag">ניסיון נוסף</span>}
      </div>

      <div className={`exercise-wrap ${shake ? 'shake' : ''}`} key={ex.uid}>
        <ExerciseView ex={ex} hints={hints} onAnswer={onAnswer} onSkip={onSkip} />
      </div>

      {comboToast && <div className="combo-toast">🔥 {comboToast} ברצף!</div>}

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'good' : 'bad'}`}>
          <div className="feedback-row">
            <Companion id={profile.companion} mood={feedback.correct ? 'happy' : 'sad'} />
            <div className="feedback-text">
              <strong dir="auto">{feedback.text}</strong>
              {!feedback.correct && feedback.answer && (
                <div className="feedback-answer">
                  התשובה הנכונה: <En>{feedback.answer}</En> <SpeakButton text={spokenAnswer(ex)} size="sm" auto />
                </div>
              )}
            </div>
          </div>
          <BigButton color={feedback.correct ? 'green' : 'orange'} onClick={advance}>
            המשך ➜
          </BigButton>
        </div>
      )}

      {confirmExit && (
        <div className="modal-backdrop" onClick={() => setConfirmExit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <Companion id={profile.companion} mood="sad" message="רגע! אם תצאו עכשיו, ההתקדמות בשלב הזה לא תישמר" />
            <div className="row">
              <BigButton color="green" onClick={() => setConfirmExit(false)}>
                להמשיך לשחק
              </BigButton>
              <BigButton color="gray" onClick={onExit}>
                יציאה
              </BigButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
