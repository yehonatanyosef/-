import { useEffect, useState, type ReactNode } from 'react';
import { COMPANIONS_BY_ID } from '../data/companions';
import { sfx } from '../engine/sound';
import { speak } from '../engine/speech';
import type { Word } from '../types';

/** Emoji picture (or a color swatch for color words). */
export function Picture({ word, size = 72 }: { word: Word; size?: number }) {
  if (word.swatch) {
    return (
      <span
        className="swatch"
        style={{ background: word.swatch, width: size, height: size }}
        role="img"
        aria-label={word.en}
      />
    );
  }
  return (
    <span className="emoji" style={{ fontSize: size }} role="img" aria-label={word.en}>
      {word.emoji}
    </span>
  );
}

export function SpeakButton({
  text,
  size = 'md',
  auto = false,
  slow = false,
  label,
}: {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  auto?: boolean;
  slow?: boolean;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const play = async (s = slow) => {
    setPlaying(true);
    await speak(text, { slow: s });
    setPlaying(false);
  };
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => void play(), 250);
    return () => clearTimeout(t);
  }, [text, auto]);
  return (
    <span className="speak-group">
      <button
        type="button"
        className={`speak-btn speak-${size} ${playing ? 'playing' : ''}`}
        onClick={() => void play(false)}
        aria-label={label ?? 'השמע'}
      >
        🔊
      </button>
      {size === 'lg' && (
        <button type="button" className="speak-btn speak-sm turtle" onClick={() => void play(true)} aria-label="השמע לאט">
          🐢
        </button>
      )}
    </span>
  );
}

export function En({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span dir="ltr" lang="en" className={`en ${className}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: color }} />
    </div>
  );
}

export function GoalRing({ value, goal, size = 44 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, value / goal);
  return (
    <svg width={size} height={size} className="goal-ring" aria-label={`יעד יומי ${value}/${goal}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="goal-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="goal-fg"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle">
        {p >= 1 ? '✓' : '🎯'}
      </text>
    </svg>
  );
}

export function Companion({ id, message, mood = 'idle' }: { id: string; message?: string; mood?: 'idle' | 'happy' | 'sad' }) {
  const c = COMPANIONS_BY_ID[id] ?? COMPANIONS_BY_ID.owl;
  return (
    <div className={`companion mood-${mood}`}>
      <span className="companion-emoji">{c.emoji}</span>
      {message && <div className="bubble">{message}</div>}
    </div>
  );
}

export function BigButton({
  children,
  onClick,
  color = 'green',
  disabled,
  className = '',
  submit = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: 'green' | 'blue' | 'orange' | 'purple' | 'gray' | 'red';
  disabled?: boolean;
  className?: string;
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={`big-btn btn-${color} ${className}`}
      disabled={disabled}
      onClick={() => {
        sfx.tap();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
