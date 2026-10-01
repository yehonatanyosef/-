import { useState } from 'react';
import { BigButton, En, Picture, SpeakButton } from '../components/common';
import { chipText, letterIntro, splitStory } from '../data/speakable';
import { speak } from '../engine/speech';
import type { ExProps } from './types';
import { Emoji, EmojiScene } from '../components/Emoji';

export function LearnWord({ ex, onAnswer }: ExProps<'learn-word'>) {
  return (
    <div className="ex learn">
      <div className="learn-card pop-in">
        <span className="badge-new">מילה חדשה ✨</span>
        <Picture word={ex.word} size={130} />
        <En className="word-huge">{ex.word.en}</En>
        <span className="he-word">{ex.word.he}</span>
        <SpeakButton text={ex.word.en} size="lg" auto />
      </div>
      <BigButton onClick={() => onAnswer(true)}>הבנתי! ➜</BigButton>
    </div>
  );
}

export function LearnLetter({ ex, onAnswer }: ExProps<'learn-letter'>) {
  const say = letterIntro(ex.letter.say, ex.letter.upper, ex.word.en);
  return (
    <div className="ex learn">
      <div className="learn-card pop-in">
        <span className="badge-new">אות חדשה ✨</span>
        <En className="letter-huge">
          {ex.letter.upper}
          <span className="lower">{ex.letter.lower}</span>
        </En>
        <div className="letter-example">
          <Picture word={ex.word} size={64} />
          <En className="word-big">
            <b className="hl">{ex.word.en[0]}</b>
            {ex.word.en.slice(1)}
          </En>
        </div>
        <span className="he-hint">{ex.word.he}</span>
        <SpeakButton text={say} size="lg" auto />
      </div>
      <BigButton onClick={() => onAnswer(true)}>הבנתי! ➜</BigButton>
    </div>
  );
}

export function LearnSentence({ ex, onAnswer }: ExProps<'learn-sentence'>) {
  const words = ex.sentence.en.split(' ');
  return (
    <div className="ex learn">
      <div className="learn-card pop-in">
        <span className="badge-new">משפט חדש ✨</span>
        <EmojiScene text={ex.sentence.emoji} />
        <p className="sentence-big" dir="ltr">
          {words.map((w, i) => (
            <button key={i} type="button" className="word-chip" onClick={() => void speak(chipText(w))}>
              {w}
            </button>
          ))}
        </p>
        <span className="he-word">{ex.sentence.he}</span>
        <SpeakButton text={ex.sentence.en} size="lg" auto />
        <span className="tip">טיפ: לחצו על מילה כדי לשמוע אותה</span>
      </div>
      <BigButton onClick={() => onAnswer(true)}>הבנתי! ➜</BigButton>
    </div>
  );
}

export function ReadStory({ ex, hints, onAnswer }: ExProps<'read-story'>) {
  const [showHe, setShowHe] = useState(false);
  const sentences = splitStory(ex.story.en);
  return (
    <div className="ex learn">
      <div className="learn-card story-card pop-in">
        <Emoji char={ex.story.emoji} size={72} />
        <h2 dir="ltr" className="en story-title">
          {ex.story.title}
        </h2>
        <p className="story-text" dir="ltr">
          {sentences.map((s, i) => (
            <span key={i} className="story-sentence" onClick={() => void speak(s.trim())}>
              {s}{' '}
            </span>
          ))}
        </p>
        <div className="row">
          <SpeakButton text={ex.story.en} size="lg" auto={hints.autoAudio} label="הקראת הסיפור" />
          <button type="button" className="link-btn" onClick={() => setShowHe((s) => !s)}>
            {showHe ? 'הסתר תרגום' : '🇮🇱 הצג תרגום'}
          </button>
        </div>
        {showHe && <p className="story-he">{ex.story.he}</p>}
        <span className="tip">טיפ: לחצו על משפט כדי לשמוע אותו</span>
      </div>
      <BigButton onClick={() => onAnswer(true)}>קראתי! לשאלות ➜</BigButton>
    </div>
  );
}
