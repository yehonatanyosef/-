/* Every emoji shown as a picture in the game (content, companions, avatars, islands). */
import { AVATARS, COMPANIONS } from './companions';
import { DECOR } from './decor';
import { GRAMMAR_ITEMS } from './grammar';
import { GAME_INTERESTS, TOPIC_INTERESTS } from './interests';
import { ISLANDS } from './islands';
import { SENTENCES } from './sentences';
import { STORIES } from './stories';
import { PHRASES } from './talk';
import { ALL_WORDS } from './words';

/** Splits a string of emoji into single emoji (keeps ZWJ sequences and keycaps together). */
export function splitEmoji(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment).filter((s) => s.trim());
  }
  return Array.from(text).filter((s) => s.trim());
}

export function pictureEmojis(): string[] {
  const out = new Set<string>();
  const add = (t: string) => splitEmoji(t).forEach((e) => out.add(e));
  ALL_WORDS.forEach((w) => w.emoji && add(w.emoji));
  SENTENCES.forEach((s) => add(s.emoji));
  STORIES.forEach((s) => add(s.emoji));
  COMPANIONS.forEach((c) => add(c.emoji));
  AVATARS.forEach(add);
  ISLANDS.forEach((i) => add(i.emoji));
  add('👑'); // boss stages
  add('🧒🙂'); // conversation partners
  PHRASES.forEach((p) => add(p.emoji));
  GRAMMAR_ITEMS.forEach((g) => add(g.emoji));
  [...TOPIC_INTERESTS, ...GAME_INTERESTS].forEach((i) => add(i.emoji));
  add('🎧🔤📖✏️💬🧩'); // level-test steps
  DECOR.forEach((d) => add(d.emoji));
  add('🎯🎁💎'); // daily mission and chests
  return [...out].sort();
}
