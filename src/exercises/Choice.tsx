import { useState, type ReactNode } from 'react';
import { En, Picture, SpeakButton } from '../components/common';
import { speak } from '../engine/speech';
import type { ExProps } from './types';
import { EmojiScene } from '../components/Emoji';

interface Option {
  key: string;
  content: ReactNode;
  correct: boolean;
  /** English text of the option: read when chosen, and playable from its 🔊 button. */
  say?: string;
}

/** Small 🔊 next to an answer – hear it without choosing it. */
function OptionSpeaker({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      className={`opt-speak ${playing ? 'playing' : ''}`}
      aria-label={`השמע: ${text}`}
      onClick={async () => {
        setPlaying(true);
        await speak(text);
        setPlaying(false);
      }}
    >
      🔊
    </button>
  );
}

export function ChoiceGrid({
  options,
  onAnswer,
  onPick,
  layout = 'grid',
}: {
  options: Option[];
  onAnswer: (correct: boolean) => void;
  /** Called with the chosen option before grading. */
  onPick?: (key: string) => void;
  layout?: 'grid' | 'list' | 'letters';
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const choose = (o: Option) => {
    if (chosen) return;
    setChosen(o.key);
    onPick?.(o.key);
    if (o.say) void speak(o.say);
    onAnswer(o.correct);
  };
  return (
    <div className={`choices choices-${layout} n${options.length}`}>
      {options.map((o) => {
        const state = !chosen ? '' : o.correct ? 'right' : o.key === chosen ? 'wrong' : 'dim';
        return (
          <div key={o.key} className={`choice-cell ${o.say ? 'has-speak' : ''}`}>
            <button type="button" className={`choice ${state}`} onClick={() => choose(o)} disabled={!!chosen}>
              {o.content}
            </button>
            {o.say && <OptionSpeaker text={o.say} />}
          </div>
        );
      })}
    </div>
  );
}

export function ListenPick({ ex, hints, onAnswer }: ExProps<'listen-pick'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <SpeakButton text={ex.word.en} size="lg" auto />
      </div>
      <ChoiceGrid
        onAnswer={onAnswer}
        options={ex.options.map((w) => ({
          key: w.id,
          correct: w.id === ex.word.id,
          content: (
            <>
              <Picture word={w} size={64} />
              {hints.hebrew && <span className="he-hint">{w.he}</span>}
            </>
          ),
        }))}
      />
    </div>
  );
}

export function WordPickPicture({ ex, hints, onAnswer }: ExProps<'word-pick-picture'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <En className="word-big">{ex.word.en}</En>
        <SpeakButton text={ex.word.en} auto={hints.autoAudio} />
      </div>
      <ChoiceGrid
        onAnswer={onAnswer}
        options={ex.options.map((w) => ({ key: w.id, correct: w.id === ex.word.id, content: <Picture word={w} size={64} /> }))}
      />
    </div>
  );
}

export function PicturePickWord({ ex, hints, onAnswer }: ExProps<'picture-pick-word'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <Picture word={ex.word} size={110} />
        {hints.hebrew && <span className="he-hint big">{ex.word.he}</span>}
      </div>
      <ChoiceGrid
        layout="list"
        onAnswer={onAnswer}
        options={ex.options.map((w) => ({
          key: w.id,
          correct: w.id === ex.word.id,
          say: w.en,
          content: <En className="word-opt">{w.en}</En>,
        }))}
      />
    </div>
  );
}

export function TranslatePick({ ex, onAnswer }: ExProps<'translate-pick'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <span className="he-word">{ex.word.he}</span>
      </div>
      <ChoiceGrid
        layout="list"
        onAnswer={onAnswer}
        options={ex.options.map((w) => ({
          key: w.id,
          correct: w.id === ex.word.id,
          say: w.en,
          content: <En className="word-opt">{w.en}</En>,
        }))}
      />
    </div>
  );
}

export function FirstLetter({ ex, hints, onAnswer }: ExProps<'first-letter'>) {
  const answer = ex.word.en[0].toUpperCase();
  return (
    <div className="ex">
      <div className="prompt">
        <Picture word={ex.word} size={110} />
        <SpeakButton text={ex.word.en} auto={hints.autoAudio} />
      </div>
      <div className="word-mask" dir="ltr">
        <span className="slot q">?</span>
        {ex.word.en.slice(1).split('').map((c, i) => (
          <span key={i} className="slot ghost">
            {c}
          </span>
        ))}
      </div>
      <ChoiceGrid
        layout="letters"
        onAnswer={onAnswer}
        options={ex.options.map((l) => ({ key: l, correct: l === answer, content: <En className="letter-opt">{l}</En> }))}
      />
    </div>
  );
}

export function LetterListen({ ex, onAnswer }: ExProps<'letter-listen'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <SpeakButton text={ex.letter.say} size="lg" auto />
      </div>
      <ChoiceGrid
        layout="letters"
        onAnswer={onAnswer}
        options={ex.options.map((l) => ({
          key: l.id,
          correct: l.id === ex.letter.id,
          content: (
            <En className="letter-opt">
              {l.upper}
              <small>{l.lower}</small>
            </En>
          ),
        }))}
      />
    </div>
  );
}

export function LetterCase({ ex, hints, onAnswer }: ExProps<'letter-case'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <En className="letter-huge">{ex.letter.upper}</En>
        <SpeakButton text={ex.letter.say} auto={hints.autoAudio} />
      </div>
      <ChoiceGrid
        layout="letters"
        onAnswer={onAnswer}
        options={ex.options.map((l) => ({ key: l.id, correct: l.id === ex.letter.id, content: <En className="letter-opt">{l.lower}</En> }))}
      />
    </div>
  );
}

export function MissingLetter({ ex, hints, onAnswer }: ExProps<'missing-letter'>) {
  const letters = ex.word.en.toLowerCase().split('');
  const answer = letters[ex.index];
  return (
    <div className="ex">
      <div className="prompt">
        <Picture word={ex.word} size={96} />
        <SpeakButton text={ex.word.en} auto={hints.autoAudio} />
      </div>
      <div className="word-mask" dir="ltr">
        {letters.map((c, i) => (
          <span key={i} className={`slot ${i === ex.index ? 'q' : 'filled'}`}>
            {i === ex.index ? '?' : c}
          </span>
        ))}
      </div>
      <ChoiceGrid
        layout="letters"
        onAnswer={onAnswer}
        options={ex.options.map((l) => ({ key: l, correct: l === answer, content: <En className="letter-opt">{l}</En> }))}
      />
    </div>
  );
}

export function SentencePicture({ ex, hints, onAnswer }: ExProps<'sentence-picture'>) {
  return (
    <div className="ex">
      <div className="prompt column">
        <En className="sentence-big">{ex.sentence.en}</En>
        <SpeakButton text={ex.sentence.en} auto={hints.autoAudio} />
      </div>
      <ChoiceGrid
        onAnswer={onAnswer}
        options={ex.options.map((s) => ({
          key: s.id,
          correct: s.id === ex.sentence.id,
          content: <EmojiScene text={s.emoji} size={48} />,
        }))}
      />
    </div>
  );
}

export function ListenSentence({ ex, hints, onAnswer }: ExProps<'listen-sentence'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <SpeakButton text={ex.sentence.en} size="lg" auto />
      </div>
      <ChoiceGrid
        layout="list"
        onAnswer={onAnswer}
        options={ex.options.map((s) => ({
          key: s.id,
          correct: s.id === ex.sentence.id,
          content: (
            <span className="sentence-opt">
              <En>{s.en}</En>
              {hints.hebrew && <span className="he-hint">{s.he}</span>}
            </span>
          ),
        }))}
      />
    </div>
  );
}

export function StoryQuestion({ ex, hints, onAnswer }: ExProps<'story-question'>) {
  const [showStory, setShowStory] = useState(false);
  return (
    <div className="ex">
      <div className="story-mini">
        <button type="button" className="link-btn" onClick={() => setShowStory((s) => !s)}>
          {ex.story.emoji} {showStory ? 'הסתר את הסיפור' : 'הצג שוב את הסיפור'}
        </button>
        {showStory && (
          <p className="story-text small">
            <En>{ex.story.en}</En>
          </p>
        )}
      </div>
      <div className="prompt column">
        <En className="sentence-big">{ex.question.q}</En>
        <SpeakButton text={ex.question.q} auto={hints.autoAudio} />
        {hints.hebrew && <span className="he-hint">{ex.question.qHe}</span>}
      </div>
      <ChoiceGrid
        layout="list"
        onAnswer={onAnswer}
        options={ex.options.map((o) => ({ key: o, correct: o === ex.question.answer, say: o, content: <En className="word-opt">{o}</En> }))}
      />
    </div>
  );
}
