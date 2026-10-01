import type { Letter } from '../types';
import { ALPHABET_WORDS } from './words';

const NAMES: Record<string, string> = {
  A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'eff', G: 'gee', H: 'aitch', I: 'eye',
  J: 'jay', K: 'kay', L: 'el', M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'cue', R: 'are',
  S: 'ess', T: 'tee', U: 'you', V: 'vee', W: 'double you', X: 'ex', Y: 'why', Z: 'zee',
};

export const LETTERS: Letter[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((upper, i) => ({
  id: `letter-${upper.toLowerCase()}`,
  upper,
  lower: upper.toLowerCase(),
  say: NAMES[upper],
  wordId: ALPHABET_WORDS[i].id,
}));

export const LETTERS_BY_ID: Record<string, Letter> = Object.fromEntries(LETTERS.map((l) => [l.id, l]));
