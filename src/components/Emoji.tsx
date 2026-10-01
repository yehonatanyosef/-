import manifest from '../data/image-manifest.json';
import { splitEmoji } from '../data/pictures';

const IMAGES: Record<string, string> = manifest;

/** Lookup key shared with scripts/fetch-images.py (variation selectors are ignored). */
export function imageKey(e: string): string {
  return e.replace(/️/g, '');
}

/** A single emoji drawn as a 3D illustration when one is available, otherwise as text. */
export function Emoji({ char, size = 48, className = '', label }: { char: string; size?: number; className?: string; label?: string }) {
  const file = IMAGES[imageKey(char)];
  if (!file) {
    return (
      <span className={`emoji ${className}`} style={{ fontSize: size }} role="img" aria-label={label ?? char}>
        {char}
      </span>
    );
  }
  return (
    <img
      className={`emoji-img ${className}`}
      src={`${import.meta.env.BASE_URL}img/${file}`}
      width={size}
      height={size}
      alt={label ?? char}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}

/** A short scene made of several emoji (e.g. "👀🐱"). */
export function EmojiScene({ text, size = 56, label }: { text: string; size?: number; label?: string }) {
  return (
    <span className="emoji-scene" role="img" aria-label={label ?? text}>
      {splitEmoji(text).map((e, i) => (
        <Emoji key={i} char={e} size={size} label="" />
      ))}
    </span>
  );
}
