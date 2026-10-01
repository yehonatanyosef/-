import { useState } from 'react';
import { BigButton, En, SpeakButton } from '../components/common';
import { EmojiScene } from '../components/Emoji';
import { grammarHint } from '../data/grammar';
import { ChoiceGrid } from './Choice';
import type { ExProps } from './types';

export function LearnRule({ ex, onAnswer }: ExProps<'learn-rule'>) {
  const r = ex.rule;
  return (
    <div className="ex learn">
      <div className="learn-card rule-card pop-in">
        <span className="badge-new">כלל חדש 🧩</span>
        <h2 className="rule-title">{r.title}</h2>
        <p className="rule-explain">{r.explain}</p>
        <div className="rule-examples">
          {r.examples.map((e) => (
            <div key={e.en} className="rule-example">
              <SpeakButton text={e.en} size="sm" />
              <En className="rule-en">{e.en}</En>
              <span className="he-hint">{e.he}</span>
            </div>
          ))}
        </div>
      </div>
      <BigButton onClick={() => onAnswer(true)}>הבנתי! ➜</BigButton>
    </div>
  );
}

export function GrammarChoice({ ex, hints, onAnswer }: ExProps<'grammar-choice'>) {
  const g = ex.item;
  const [picked, setPicked] = useState<string | null>(null);
  const hint = grammarHint(g);
  const [before, after] = g.en.replace(/\s*\([^)]*\)\s*$/, '').split('___');
  return (
    <div className="ex">
      <div className="prompt column">
        <EmojiScene text={g.emoji} size={64} />
        <p className="sentence-big gap-sentence" dir="ltr">
          {before}
          <span className={`gap ${picked ? (picked === g.answer ? 'right' : 'wrong') : ''}`}>{picked ?? '?'}</span>
          {after}
        </p>
        {hint && <span className="he-hint big">({hint})</span>}
        {hints.hebrew && <span className="he-hint">{g.he}</span>}
      </div>
      <ChoiceGrid
        layout="letters"
        onAnswer={onAnswer}
        onPick={setPicked}
        options={g.options.map((o) => ({ key: o, correct: o === g.answer, content: <En className="word-opt">{o}</En> }))}
      />
    </div>
  );
}
