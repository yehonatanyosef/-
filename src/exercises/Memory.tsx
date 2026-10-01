import { useMemo, useState } from 'react';
import { En, Picture } from '../components/common';
import { shuffle } from '../engine/random';
import { sfx } from '../engine/sound';
import { speak } from '../engine/speech';
import type { ExProps } from './types';

interface Card {
  key: string;
  wordId: string;
  face: 'word' | 'pic';
}

export function Memory({ ex, onAnswer }: ExProps<'memory'>) {
  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        ex.words.flatMap((w) => [
          { key: `${w.id}-w`, wordId: w.id, face: 'word' as const },
          { key: `${w.id}-p`, wordId: w.id, face: 'pic' as const },
        ]),
      ),
    [ex.words],
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [busy, setBusy] = useState(false);

  const flip = (c: Card) => {
    if (busy || open.includes(c.key) || matched.includes(c.wordId)) return;
    sfx.flip();
    const word = ex.words.find((w) => w.id === c.wordId)!;
    if (c.face === 'word') void speak(word.en);
    const next = [...open, c.key];
    setOpen(next);
    if (next.length === 2) {
      const [a, b] = next.map((k) => cards.find((x) => x.key === k)!);
      if (a.wordId === b.wordId) {
        sfx.correct();
        void speak(word.en);
        const m = [...matched, a.wordId];
        setMatched(m);
        setOpen([]);
        if (m.length === ex.words.length) setTimeout(() => onAnswer(mistakes <= ex.words.length + 1), 500);
      } else {
        setBusy(true);
        setMistakes((x) => x + 1);
        setTimeout(() => {
          setOpen([]);
          setBusy(false);
        }, 900);
      }
    }
  };

  return (
    <div className="ex">
      <div className={`memory-grid n${cards.length}`}>
        {cards.map((c) => {
          const word = ex.words.find((w) => w.id === c.wordId)!;
          const isOpen = open.includes(c.key) || matched.includes(c.wordId);
          return (
            <button
              key={c.key}
              type="button"
              className={`mem-card ${isOpen ? 'open' : ''} ${matched.includes(c.wordId) ? 'matched' : ''}`}
              onClick={() => flip(c)}
            >
              <span className="mem-inner">
                <span className="mem-back">❓</span>
                <span className="mem-front">{c.face === 'pic' ? <Picture word={word} size={44} /> : <En className="mem-word">{word.en}</En>}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
