import { useEffect, useRef, useState } from 'react';
import { En, Picture, SpeakButton } from '../components/common';
import { sfx } from '../engine/sound';
import type { ExProps } from './types';

/**
 * Tap tiles to fill the answer slots. Works for letters (spelling) and words (sentence building).
 */
function TileBuilder({
  tiles,
  answer,
  prefilled = 0,
  joiner,
  onAnswer,
  wordTiles = false,
}: {
  tiles: string[];
  answer: string[];
  prefilled?: number;
  joiner: string;
  onAnswer: (correct: boolean) => void;
  wordTiles?: boolean;
}) {
  // Tiles used by the prefilled letters are removed from the pool up front.
  const initialUsed = (() => {
    const used: number[] = [];
    for (let i = 0; i < prefilled; i++) {
      const idx = tiles.findIndex((t, ti) => t === answer[i] && !used.includes(ti));
      if (idx >= 0) used.push(idx);
    }
    return used;
  })();
  const [placed, setPlaced] = useState<number[]>(initialUsed);
  const [result, setResult] = useState<null | boolean>(null);
  const slots = answer.length;

  useEffect(() => {
    if (placed.length === slots && result === null) {
      const attempt = placed.map((i) => tiles[i]).join(joiner);
      const ok = attempt.toLowerCase() === answer.join(joiner).toLowerCase();
      setResult(ok);
      onAnswer(ok);
    }
  }, [placed, slots, tiles, joiner, answer, result, onAnswer]);

  const add = (i: number) => {
    if (result !== null || placed.includes(i) || placed.length >= slots) return;
    sfx.tap();
    setPlaced((p) => [...p, i]);
  };
  const remove = (pos: number) => {
    if (result !== null || pos < prefilled) return;
    setPlaced((p) => p.slice(0, pos));
  };

  return (
    <div className="builder">
      <div className={`slots ${wordTiles ? 'word-slots' : ''} ${result === true ? 'right' : result === false ? 'wrong' : ''}`} dir="ltr">
        {Array.from({ length: slots }).map((_, pos) => {
          const tileIdx = placed[pos];
          const filled = tileIdx !== undefined;
          return (
            <button
              key={pos}
              type="button"
              className={`slot ${filled ? 'filled' : ''} ${pos < prefilled ? 'given' : ''} ${wordTiles ? 'word' : ''}`}
              onClick={() => remove(pos)}
            >
              {filled ? tiles[tileIdx] : ''}
            </button>
          );
        })}
      </div>
      <div className={`tiles ${wordTiles ? 'word-tiles' : ''}`} dir="ltr">
        {tiles.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`tile ${placed.includes(i) ? 'used' : ''}`}
            onClick={() => add(i)}
            disabled={placed.includes(i) || result !== null}
          >
            {t}
          </button>
        ))}
      </div>
      {result === null && placed.length > prefilled && (
        <button type="button" className="link-btn" onClick={() => setPlaced((p) => p.slice(0, -1))}>
          ↩️ מחק אחרון
        </button>
      )}
    </div>
  );
}

export function SpellTiles({ ex, hints, onAnswer }: ExProps<'spell-tiles'>) {
  return (
    <div className="ex">
      <div className="prompt">
        <Picture word={ex.word} size={96} />
        <SpeakButton text={ex.word.en} auto={hints.autoAudio} />
        {hints.hebrew && <span className="he-hint big">{ex.word.he}</span>}
      </div>
      <TileBuilder tiles={ex.tiles} answer={ex.word.en.toLowerCase().split('')} prefilled={ex.prefilled} joiner="" onAnswer={onAnswer} />
    </div>
  );
}

export function SentenceBuild({ ex, hints, onAnswer }: ExProps<'sentence-build'>) {
  return (
    <div className="ex">
      <div className="prompt column">
        <span className="emoji scene">{ex.sentence.emoji}</span>
        <span className="he-hint big">{ex.sentence.he}</span>
        <SpeakButton text={ex.sentence.en} auto={hints.autoAudio} />
      </div>
      <TileBuilder tiles={ex.tiles} answer={ex.sentence.en.split(' ')} joiner=" " onAnswer={onAnswer} wordTiles />
    </div>
  );
}

export function SpellType({ ex, hints, onAnswer }: ExProps<'spell-type'>) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const check = () => {
    if (result !== null || !value.trim()) return;
    const ok = value.trim().toLowerCase() === ex.word.en.toLowerCase();
    setResult(ok);
    onAnswer(ok);
  };
  return (
    <div className="ex">
      <div className="prompt">
        <Picture word={ex.word} size={96} />
        <SpeakButton text={ex.word.en} auto={hints.autoAudio} />
        {hints.hebrew && <span className="he-hint big">{ex.word.he}</span>}
      </div>
      <form
        className="type-form"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          ref={ref}
          dir="ltr"
          className={`type-input ${result === true ? 'right' : result === false ? 'wrong' : ''}`}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z]/g, ''))}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={14}
          disabled={result !== null}
          placeholder={'_ '.repeat(ex.word.en.length).trim()}
        />
        <button type="submit" className="big-btn btn-blue" disabled={result !== null || !value}>
          בדיקה
        </button>
      </form>
      <En className="hint-len">{ex.word.en.length} letters</En>
    </div>
  );
}
