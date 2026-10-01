/*
 * What each age can be asked. Reading whole sentences and completing letters
 * (missing letter, letter tiles, first letter, typing) fit children from age 8,
 * or age 7 at a good level – younger children get listening, pictures, single
 * words, speaking and memory games.
 */
import type { Island, Profile } from '../types';

export const READING_AGE_LABEL = 'מגיל 7–8';

/** Ready for sentence reading and letter-completion exercises. */
export function canReadSentences(p: Pick<Profile, 'age' | 'ability'>): boolean {
  return p.age >= 8 || (p.age >= 7 && p.ability >= 2.5);
}

/** Islands built on reading sentences (conversation, grammar, sentences, stories). */
export function isSentenceIsland(island: Island): boolean {
  return island.kind === 'talk' || island.kind === 'grammar' || island.kind === 'sentences' || island.kind === 'stories';
}

export function islandSuitsAge(profile: Pick<Profile, 'age' | 'ability'>, island: Island): boolean {
  return !isSentenceIsland(island) || canReadSentences(profile);
}
