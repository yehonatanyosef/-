import { useState, type ReactNode } from 'react';
import { BigButton, En, SpeakButton } from '../components/common';
import { Emoji } from '../components/Emoji';
import { speak } from '../engine/speech';
import { ChoiceGrid } from './Choice';
import { SpeakCore } from './Speak';
import type { ExProps } from './types';

/** The other side of the conversation. */
const FRIEND = '🧒';

function Bubble({ who, children, me = false }: { who: string; children: ReactNode; me?: boolean }) {
  return (
    <div className={`chat-row ${me ? 'me' : ''}`}>
      <span className="chat-avatar">
        <Emoji char={who} size={44} />
      </span>
      <div className="chat-bubble">{children}</div>
    </div>
  );
}

export function LearnPhrase({ ex, onAnswer }: ExProps<'learn-phrase'>) {
  const p = ex.phrase;
  const [playing, setPlaying] = useState(false);
  const playBoth = async () => {
    setPlaying(true);
    await speak(p.prompt);
    await new Promise((r) => setTimeout(r, 350));
    await speak(p.reply);
    setPlaying(false);
  };
  return (
    <div className="ex learn">
      <div className="learn-card pop-in">
        <span className="badge-new">שיחה חדשה ✨</span>
        <Emoji char={p.emoji} size={72} />
        <div className="chat">
          <Bubble who={FRIEND}>
            <En className="chat-en">{p.prompt}</En>
            <span className="he-hint">{p.promptHe}</span>
            <SpeakButton text={p.prompt} size="sm" />
          </Bubble>
          <Bubble who="🙂" me>
            <En className="chat-en">{p.reply}</En>
            <span className="he-hint">{p.replyHe}</span>
            <SpeakButton text={p.reply} size="sm" />
          </Bubble>
        </div>
        <button type="button" className={`big-btn btn-blue ${playing ? 'pulse' : ''}`} onClick={() => void playBoth()}>
          🔊 השמעת השיחה
        </button>
      </div>
      <BigButton onClick={() => onAnswer(true)}>הבנתי! ➜</BigButton>
    </div>
  );
}

export function DialogReply({ ex, hints, onAnswer }: ExProps<'dialog-reply'>) {
  const p = ex.phrase;
  return (
    <div className="ex">
      <div className="chat wide">
        <Bubble who={FRIEND}>
          {ex.audioOnly ? <span className="chat-en">🔊 ❓</span> : <En className="chat-en">{p.prompt}</En>}
          {!ex.audioOnly && hints.hebrew && <span className="he-hint">{p.promptHe}</span>}
          <SpeakButton text={p.prompt} size="md" auto />
        </Bubble>
      </div>
      <ChoiceGrid
        layout="list"
        onAnswer={onAnswer}
        options={ex.options.map((o) => ({ key: o, correct: o === p.reply, say: o, content: <En className="word-opt">{o}</En> }))}
      />
    </div>
  );
}

export function SayReply({ ex, hints, onAnswer, onSkip }: ExProps<'say-reply'>) {
  const p = ex.phrase;
  return (
    <SpeakCore target={p.reply} onAnswer={onAnswer} onSkip={onSkip}>
      <div className="chat wide">
        <Bubble who={FRIEND}>
          <En className="chat-en">{p.prompt}</En>
          <SpeakButton text={p.prompt} size="sm" auto={hints.autoAudio} />
        </Bubble>
        <Bubble who="🙂" me>
          <En className="chat-en">{p.reply}</En>
          {hints.hebrew && <span className="he-hint">{p.replyHe}</span>}
          <SpeakButton text={p.reply} size="sm" />
        </Bubble>
      </div>
    </SpeakCore>
  );
}
