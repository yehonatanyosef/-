/* Grammar: short rules explained in Hebrew, practised as fill-in-the-gap sentences. */

export interface GrammarRule {
  id: string;
  title: string;
  /** Child-friendly explanation in Hebrew. */
  explain: string;
  examples: { en: string; he: string }[];
}

export interface GrammarItem {
  id: string;
  rule: string;
  /** Sentence with "___" where the missing word goes. */
  en: string;
  answer: string;
  options: string[];
  he: string;
  emoji: string;
  level: number;
}

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    id: 'a-an',
    title: 'מתי a ומתי an?',
    explain: 'לפני מילה שמתחילה בצליל של תנועה (a, e, i, o, u) אומרים an. לפני כל השאר אומרים a.',
    examples: [
      { en: 'a cat', he: 'חתול' },
      { en: 'an apple', he: 'תפוח' },
    ],
  },
  {
    id: 'plural',
    title: 'אחד או הרבה',
    explain: 'כשיש יותר מאחד מוסיפים s בסוף המילה. אחרי x, s, ch או sh מוסיפים es.',
    examples: [
      { en: 'one cat, two cats', he: 'חתול אחד, שני חתולים' },
      { en: 'one box, two boxes', he: 'קופסה אחת, שתי קופסאות' },
    ],
  },
  {
    id: 'be',
    title: 'am, is, are',
    explain: 'I הולך עם am. הוא, היא או דבר אחד הולכים עם is. אנחנו, אתם, הם או הרבה דברים הולכים עם are.',
    examples: [
      { en: 'I am happy.', he: 'אני שמח.' },
      { en: 'The dog is big.', he: 'הכלב גדול.' },
      { en: 'We are friends.', he: 'אנחנו חברים.' },
    ],
  },
  {
    id: 'pronouns',
    title: 'he, she, it, they',
    explain: 'he = הוא (בן), she = היא (בת), it = זה (חפץ או חיה), they = הם (כמה).',
    examples: [
      { en: 'Dan is a boy. He is eight.', he: 'דן הוא ילד. הוא בן שמונה.' },
      { en: 'The ball is red. It is big.', he: 'הכדור אדום. הוא גדול.' },
    ],
  },
  {
    id: 'prepositions',
    title: 'in, on, under',
    explain: 'in = בתוך, on = על, under = מתחת.',
    examples: [
      { en: 'The cat is in the box.', he: 'החתול בתוך הקופסה.' },
      { en: 'The book is on the table.', he: 'הספר על השולחן.' },
    ],
  },
  {
    id: 'ing',
    title: 'מה קורה עכשיו? (ing)',
    explain: 'כשמשהו קורה עכשיו אומרים am / is / are ומוסיפים ing לפועל: run → running.',
    examples: [
      { en: 'She is dancing.', he: 'היא רוקדת (עכשיו).' },
      { en: 'They are swimming.', he: 'הם שוחים (עכשיו).' },
    ],
  },
  {
    id: 'have-can',
    title: 'have, has, can',
    explain: 'I / you / we / they הולכים עם have. he / she / it הולכים עם has. can = יכול, ואחריו בא הפועל בלי שינוי.',
    examples: [
      { en: 'I have a dog.', he: 'יש לי כלב.' },
      { en: 'She has a cat.', he: 'יש לה חתול.' },
      { en: 'A fish can swim.', he: 'דג יכול לשחות.' },
    ],
  },
];

type Row = [rule: string, en: string, answer: string, options: string[], he: string, emoji: string, level: number];

const ROWS: Row[] = [
  ['a-an', 'I have ___ apple.', 'an', ['a', 'an'], 'יש לי תפוח.', '🍎', 3],
  ['a-an', 'This is ___ dog.', 'a', ['a', 'an'], 'זה כלב.', '🐶', 3],
  ['a-an', 'She eats ___ egg.', 'an', ['a', 'an'], 'היא אוכלת ביצה.', '🥚', 3],
  ['a-an', 'I see ___ bird.', 'a', ['a', 'an'], 'אני רואה ציפור.', '🐦', 3],
  ['a-an', 'It is ___ umbrella.', 'an', ['a', 'an'], 'זו מטרייה.', '☂️', 3],
  ['plural', 'I have two ___.', 'cats', ['cat', 'cats', 'cates'], 'יש לי שני חתולים.', '🐱🐱', 3],
  ['plural', 'There are three ___.', 'apples', ['apple', 'apples', 'appleses'], 'יש שלושה תפוחים.', '🍎🍎🍎', 3],
  ['plural', 'I see two ___.', 'boxes', ['boxs', 'boxes', 'box'], 'אני רואה שתי קופסאות.', '📦📦', 4],
  ['plural', 'Look at the four ___!', 'stars', ['star', 'stars', 'stares'], 'תראו את ארבעת הכוכבים!', '⭐⭐⭐⭐', 3],
  ['plural', 'We have two ___.', 'dogs', ['dog', 'doges', 'dogs'], 'יש לנו שני כלבים.', '🐶🐶', 3],
  ['be', 'I ___ seven.', 'am', ['am', 'is', 'are'], 'אני בן שבע.', '🎂', 3],
  ['be', 'The cat ___ happy.', 'is', ['am', 'is', 'are'], 'החתול שמח.', '🐱😀', 3],
  ['be', 'The dogs ___ big.', 'are', ['am', 'is', 'are'], 'הכלבים גדולים.', '🐶🐶', 4],
  ['be', 'We ___ friends.', 'are', ['am', 'is', 'are'], 'אנחנו חברים.', '👦👧', 4],
  ['be', 'She ___ my sister.', 'is', ['am', 'is', 'are'], 'היא אחותי.', '👧', 4],
  ['pronouns', 'Dan is a boy. ___ is eight.', 'He', ['He', 'She', 'It'], 'דן הוא ילד. הוא בן שמונה.', '👦', 4],
  ['pronouns', 'Mia is a girl. ___ likes cats.', 'She', ['He', 'She', 'They'], 'מיה היא ילדה. היא אוהבת חתולים.', '👧🐱', 4],
  ['pronouns', 'The ball is red. ___ is big.', 'It', ['He', 'It', 'They'], 'הכדור אדום. הוא גדול.', '⚽', 4],
  ['pronouns', 'Tom and Ben are friends. ___ play together.', 'They', ['She', 'It', 'They'], 'טום ובן חברים. הם משחקים יחד.', '👦👦', 4],
  ['prepositions', 'The cat is ___ the box. (בתוך)', 'in', ['in', 'on', 'under'], 'החתול בתוך הקופסה.', '🐱📦', 4],
  ['prepositions', 'The book is ___ the bed. (על)', 'on', ['in', 'on', 'under'], 'הספר על המיטה.', '📖🛏️', 4],
  ['prepositions', 'The dog is ___ the chair. (מתחת)', 'under', ['in', 'on', 'under'], 'הכלב מתחת לכיסא.', '🐶🪑', 4],
  ['prepositions', 'The fish is ___ the water. (בתוך)', 'in', ['in', 'on', 'under'], 'הדג בתוך המים.', '🐟💧', 4],
  ['ing', 'She is ___.', 'dancing', ['dance', 'dancing', 'dances'], 'היא רוקדת.', '💃', 4],
  ['ing', 'He is ___.', 'running', ['run', 'runs', 'running'], 'הוא רץ.', '🏃', 4],
  ['ing', 'They are ___ in the sea.', 'swimming', ['swim', 'swimming', 'swims'], 'הם שוחים בים.', '🏊🌊', 5],
  ['ing', 'I am ___ a book.', 'reading', ['reading', 'read', 'reads'], 'אני קורא ספר.', '📖', 5],
  ['have-can', 'I ___ a bike.', 'have', ['have', 'has'], 'יש לי אופניים.', '🚲', 4],
  ['have-can', 'She ___ a dog.', 'has', ['have', 'has'], 'יש לה כלב.', '👧🐶', 4],
  ['have-can', 'A fish ___ swim.', 'can', ['can', 'is', 'has'], 'דג יכול לשחות.', '🐟', 5],
  ['have-can', 'A bird can ___.', 'fly', ['fly', 'flies', 'flying'], 'ציפור יכולה לעוף.', '🐦', 5],
];

export const GRAMMAR_ITEMS: GrammarItem[] = ROWS.map(([rule, en, answer, options, he, emoji, level], i) => ({
  id: `gram-${i + 1}`,
  rule,
  en,
  answer,
  options,
  he,
  emoji,
  level,
}));

export const GRAMMAR_BY_ID: Record<string, GrammarItem> = Object.fromEntries(GRAMMAR_ITEMS.map((g) => [g.id, g]));
export const RULES_BY_ID: Record<string, GrammarRule> = Object.fromEntries(GRAMMAR_RULES.map((r) => [r.id, r]));

/** The sentence without the Hebrew position hint, e.g. "The cat is in the box." */
export function grammarSentence(item: GrammarItem, fill = item.answer): string {
  return item.en.replace(/\s*\([^)]*\)\s*$/, '').replace('___', fill);
}

/** The Hebrew hint in parentheses (used for prepositions), if any. */
export function grammarHint(item: GrammarItem): string | null {
  return item.en.match(/\(([^)]*)\)\s*$/)?.[1] ?? null;
}
