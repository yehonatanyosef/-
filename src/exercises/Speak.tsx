import { useEffect, useRef, useState, type ReactNode } from 'react';
import { En, Picture, SpeakButton } from '../components/common';
import { listen, matchesSpeech, type ListenHandle } from '../engine/speech';
import type { ExProps } from './types';
import { EmojiScene } from '../components/Emoji';

const MAX_TRIES = 3;

type Phase = 'idle' | 'listening' | 'retry' | 'done';

export function SpeakCore({
  target,
  onAnswer,
  onSkip,
  children,
}: {
  target: string;
  onAnswer: (ok: boolean) => void;
  onSkip: () => void;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [tries, setTries] = useState(0);
  const [heard, setHeard] = useState('');
  const handle = useRef<ListenHandle | null>(null);

  useEffect(() => () => handle.current?.stop(), []);

  const start = async () => {
    setPhase('listening');
    setHeard('');
    const h = listen();
    handle.current = h;
    try {
      const alts = await h.promise;
      const ok = matchesSpeech(alts, target);
      const n = tries + 1;
      setTries(n);
      setHeard(alts[0] ?? '');
      if (ok) {
        setPhase('done');
        onAnswer(true);
      } else if (n >= MAX_TRIES) {
        setPhase('done');
        onAnswer(false);
      } else {
        setPhase('retry');
      }
    } catch (err) {
      // Microphone blocked / not available – don't punish the child.
      const code = (err as Error).message;
      if (code === 'no-speech' || code === 'aborted') setPhase('retry');
      else onSkip();
    }
  };

  return (
    <div className="ex">
      {children}
      <div className="mic-area">
        <button
          type="button"
          className={`mic-btn ${phase === 'listening' ? 'listening' : ''}`}
          onClick={() => void start()}
          disabled={phase === 'listening' || phase === 'done'}
          aria-label="דברו"
        >
          🎤
        </button>
        <div className="mic-status">
          {phase === 'idle' && 'לחצו על המיקרופון ואמרו בקול'}
          {phase === 'listening' && 'מקשיב... 👂'}
          {phase === 'retry' && (
            <>
              כמעט! נסו שוב ({MAX_TRIES - tries} ניסיונות)
              {heard && (
                <div className="heard">
                  שמעתי: <En>{heard}</En>
                </div>
              )}
            </>
          )}
        </div>
        {phase !== 'done' && (
          <button type="button" className="link-btn" onClick={onSkip}>
            אני לא יכול לדבר עכשיו ⏭️
          </button>
        )}
      </div>
    </div>
  );
}

export function SayWord({ ex, hints, onAnswer, onSkip }: ExProps<'say-word'>) {
  return (
    <SpeakCore target={ex.word.en} onAnswer={onAnswer} onSkip={onSkip}>
      <div className="prompt column">
        <Picture word={ex.word} size={110} />
        <En className="word-big">{ex.word.en}</En>
        <SpeakButton text={ex.word.en} auto={hints.autoAudio} size="lg" />
      </div>
    </SpeakCore>
  );
}

export function SaySentence({ ex, hints, onAnswer, onSkip }: ExProps<'say-sentence'>) {
  return (
    <SpeakCore target={ex.sentence.en} onAnswer={onAnswer} onSkip={onSkip}>
      <div className="prompt column">
        <EmojiScene text={ex.sentence.emoji} />
        <En className="sentence-big">{ex.sentence.en}</En>
        {hints.hebrew && <span className="he-hint">{ex.sentence.he}</span>}
        <SpeakButton text={ex.sentence.en} auto={hints.autoAudio} size="lg" />
      </div>
    </SpeakCore>
  );
}
