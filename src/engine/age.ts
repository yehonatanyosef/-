/*
 * What each age can be asked. Letter recognition starts at age 6 – ages 4–5 learn
 * through listening and pictures. Reading whole sentences and completing letters
 * (missing letter, letter tiles, first letter, typing) fit children from age 8,
 * or age 7 at a good level – younger children get listening, pictures, single
 * words, speaking and memory games.
 */
import type { Island, Profile } from '../types';

/** Ages the game is made for. */
export const AGES = [5, 6, 7, 8, 9, 10, 11, 12];

export const READING_AGE_LABEL = 'מגיל 7–8';

/** Letter recognition (the alphabet island, letter questions) starts at this age. */
export const LETTERS_MIN_AGE = 6;

/** Ready for sentence reading and letter-completion exercises. */
export function canReadSentences(p: Pick<Profile, 'age' | 'ability'>): boolean {
  return p.age >= 8 || (p.age >= 7 && p.ability >= 2.5);
}

/** Islands built on reading sentences (conversation, grammar, sentences, stories). */
export function isSentenceIsland(island: Island): boolean {
  return island.kind === 'talk' || island.kind === 'grammar' || island.kind === 'sentences' || island.kind === 'stories';
}

export function islandSuitsAge(profile: Pick<Profile, 'age' | 'ability'>, island: Island): boolean {
  if (island.kind === 'letters') return profile.age >= LETTERS_MIN_AGE;
  return !isSentenceIsland(island) || canReadSentences(profile);
}

/** Why an island is still closed for this age (shown on the map). */
export function islandAgeMessage(island: Island): string {
  return island.kind === 'letters'
    ? `🔤 כאן לומדים אותיות – האי ייפתח מגיל ${LETTERS_MIN_AGE}`
    : `📚 כאן קוראים משפטים – האי ייפתח ${READING_AGE_LABEL}`;
}
