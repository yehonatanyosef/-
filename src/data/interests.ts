/* Things a child can say they love – used to personalise lessons, the map and the level test. */

export interface Interest {
  id: string;
  emoji: string;
  label: string;
  /** Islands this topic belongs to. */
  islands?: string[];
  /** Word topics (see words.ts) used to pick familiar words in the level test. */
  wordTopics?: string[];
}

export const TOPIC_INTERESTS: Interest[] = [
  { id: 'animals', emoji: '🐶', label: 'חיות', islands: ['animals'], wordTopics: ['animals'] },
  { id: 'food', emoji: '🍕', label: 'אוכל וממתקים', islands: ['food'], wordTopics: ['food'] },
  { id: 'colors', emoji: '🌈', label: 'צבעים ומספרים', islands: ['colors'], wordTopics: ['colors'] },
  { id: 'family', emoji: '🏠', label: 'בית ומשפחה', islands: ['home'], wordTopics: ['home'] },
  { id: 'nature', emoji: '🌻', label: 'טבע ומזג אוויר', islands: ['nature'], wordTopics: ['nature'] },
  { id: 'dressup', emoji: '👗', label: 'בגדים ותחפושות', islands: ['body'], wordTopics: ['body'] },
  { id: 'sports', emoji: '⚽', label: 'ספורט ותנועה', islands: ['actions'], wordTopics: ['actions'] },
  { id: 'talking', emoji: '💬', label: 'לדבר עם חברים', islands: ['talk'] },
  { id: 'stories', emoji: '📚', label: 'סיפורים', islands: ['stories', 'sentences'] },
];

export const GAME_INTERESTS: Interest[] = [
  { id: 'memory', emoji: '🃏', label: 'משחקי זיכרון' },
  { id: 'listening', emoji: '🎧', label: 'להקשיב ולנחש' },
  { id: 'puzzles', emoji: '🧩', label: 'פאזלים של אותיות ומילים' },
  { id: 'speaking', emoji: '🎤', label: 'לדבר במיקרופון' },
  { id: 'reading', emoji: '📖', label: 'לקרוא לבד' },
];

export const INTERESTS_BY_ID: Record<string, Interest> = Object.fromEntries(
  [...TOPIC_INTERESTS, ...GAME_INTERESTS].map((i) => [i.id, i]),
);

export interface Interests {
  topics: string[];
  games: string[];
}

export const NO_INTERESTS: Interests = { topics: [], games: [] };

/** Islands the child marked as favourite topics. */
export function favouriteIslands(interests: Interests | undefined): string[] {
  return (interests?.topics ?? []).flatMap((t) => INTERESTS_BY_ID[t]?.islands ?? []);
}

/** Word topics (words.ts) the child likes. */
export function favouriteWordTopics(interests: Interests | undefined): string[] {
  return (interests?.topics ?? []).flatMap((t) => INTERESTS_BY_ID[t]?.wordTopics ?? []);
}
