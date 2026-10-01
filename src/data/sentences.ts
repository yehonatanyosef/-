import type { Sentence } from '../types';

type Row = [en: string, he: string, emoji: string, level: number];

const ROWS: Row[] = [
  ['I see a cat.', 'אני רואה חתול.', '👀🐱', 3],
  ['I am happy.', 'אני שמח.', '😀', 3],
  ['I like apples.', 'אני אוהב תפוחים.', '❤️🍎', 3],
  ['The sun is hot.', 'השמש חמה.', '☀️🥵', 3],
  ['I drink milk.', 'אני שותה חלב.', '🥛', 3],
  ['The dog can run.', 'הכלב יכול לרוץ.', '🐶🏃', 3],
  ['I have two balls.', 'יש לי שני כדורים.', '⚽⚽', 4],
  ['The fish can swim.', 'הדג יכול לשחות.', '🐟🌊', 4],
  ['The baby is sleeping.', 'התינוק ישן.', '👶😴', 4],
  ['It is raining today.', 'יורד גשם היום.', '🌧️☂️', 4],
  ['I eat a banana.', 'אני אוכל בננה.', '🍌😋', 4],
  ['The snow is cold.', 'השלג קר.', '❄️🥶', 4],
  ['My dad has a car.', 'לאבא שלי יש מכונית.', '👨🚗', 4],
  ['The girl has a red hat.', 'לילדה יש כובע אדום.', '👧👒', 4],
  ['The cat is on the bed.', 'החתול על המיטה.', '🐱🛏️', 4],
  ['We go to school.', 'אנחנו הולכים לבית הספר.', '🧒🏫', 4],
  ['The monkey likes bananas.', 'הקוף אוהב בננות.', '🐵🍌', 4],
  ['I can ride a bike.', 'אני יודע לרכוב על אופניים.', '🚴', 4],
  ['The bird is in the tree.', 'הציפור על העץ.', '🐦🌳', 5],
  ['She is reading a book.', 'היא קוראת ספר.', '👧📖', 5],
  ['Mom is cooking soup.', 'אמא מבשלת מרק.', '👩🍲', 5],
  ['There are three stars.', 'יש שלושה כוכבים.', '⭐⭐⭐', 5],
  ['He wears a blue coat.', 'הוא לובש מעיל כחול.', '👦🧥', 5],
  ['The elephant is very big.', 'הפיל גדול מאוד.', '🐘', 5],
];

export const SENTENCES: Sentence[] = ROWS.map(([en, he, emoji, level], i) => ({
  id: `sentence-${i + 1}`,
  en,
  he,
  emoji,
  level,
}));

export const SENTENCES_BY_ID: Record<string, Sentence> = Object.fromEntries(SENTENCES.map((s) => [s.id, s]));
