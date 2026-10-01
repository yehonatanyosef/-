import type { Story } from '../types';

export const STORIES: Story[] = [
  {
    id: 'story-1',
    title: 'Tom and his Dog',
    emoji: '🐕',
    level: 4,
    en: 'Tom has a dog. The dog is big and brown. Tom and his dog play in the park every day.',
    he: 'לטום יש כלב. הכלב גדול וחום. טום והכלב שלו משחקים בפארק כל יום.',
    questions: [
      { q: 'What does Tom have?', qHe: 'מה יש לטום?', answer: 'a dog', wrong: ['a cat', 'a bike'] },
      { q: 'What color is the dog?', qHe: 'באיזה צבע הכלב?', answer: 'brown', wrong: ['black', 'white'] },
      { q: 'Where do they play?', qHe: 'איפה הם משחקים?', answer: 'in the park', wrong: ['at school', 'in the sea'] },
    ],
  },
  {
    id: 'story-2',
    title: 'A Day at the Beach',
    emoji: '🏖️',
    level: 4,
    en: 'It is a sunny day. Mia goes to the beach with her mom. They swim in the sea and eat ice cream.',
    he: 'זה יום שמשי. מיה הולכת לים עם אמא שלה. הן שוחות בים ואוכלות גלידה.',
    questions: [
      { q: 'Where does Mia go?', qHe: 'לאן מיה הולכת?', answer: 'to the beach', wrong: ['to school', 'to the park'] },
      { q: 'Who goes with Mia?', qHe: 'מי הולך עם מיה?', answer: 'her mom', wrong: ['her dad', 'her teacher'] },
      { q: 'What do they eat?', qHe: 'מה הן אוכלות?', answer: 'ice cream', wrong: ['pizza', 'soup'] },
    ],
  },
  {
    id: 'story-3',
    title: 'Hungry Sam',
    emoji: '🥪',
    level: 4,
    en: 'Sam is hungry. He opens the fridge. He sees milk, eggs and cheese. He makes a big sandwich.',
    he: 'סם רעב. הוא פותח את המקרר. הוא רואה חלב, ביצים וגבינה. הוא מכין כריך גדול.',
    questions: [
      { q: 'How does Sam feel?', qHe: 'איך סם מרגיש?', answer: 'hungry', wrong: ['sad', 'tired'] },
      { q: 'What does Sam make?', qHe: 'מה סם מכין?', answer: 'a sandwich', wrong: ['a cake', 'soup'] },
    ],
  },
  {
    id: 'story-4',
    title: 'The Little Bird',
    emoji: '🐦',
    level: 5,
    en: 'The little bird cannot fly. It is cold and sad. Lily gives the bird some water and bread. Now the bird is happy.',
    he: 'הציפור הקטנה לא יכולה לעוף. קר לה והיא עצובה. לילי נותנת לציפור מים ולחם. עכשיו הציפור שמחה.',
    questions: [
      { q: 'What is wrong with the bird?', qHe: 'מה הבעיה של הציפור?', answer: 'It cannot fly.', wrong: ['It cannot sing.', 'It cannot eat.'] },
      { q: 'What does Lily give the bird?', qHe: 'מה לילי נותנת לציפור?', answer: 'water and bread', wrong: ['milk and cake', 'a toy'] },
      { q: 'How is the bird at the end?', qHe: 'איך הציפור מרגישה בסוף?', answer: 'happy', wrong: ['sad', 'angry'] },
    ],
  },
  {
    id: 'story-5',
    title: 'Ben Loves School',
    emoji: '🏫',
    level: 5,
    en: 'Ben loves school. His favorite day is Friday, because on Friday they draw and sing. His teacher is very nice.',
    he: 'בן אוהב את בית הספר. היום האהוב עליו הוא יום שישי, כי ביום שישי מציירים ושרים. המורה שלו נחמדה מאוד.',
    questions: [
      { q: 'What does Ben love?', qHe: 'מה בן אוהב?', answer: 'school', wrong: ['the beach', 'pizza'] },
      { q: 'What is his favorite day?', qHe: 'מה היום האהוב עליו?', answer: 'Friday', wrong: ['Monday', 'Sunday'] },
      { q: 'What do they do on Friday?', qHe: 'מה עושים ביום שישי?', answer: 'draw and sing', wrong: ['run and swim', 'read and write'] },
    ],
  },
  {
    id: 'story-6',
    title: 'Winter Fun',
    emoji: '⛄',
    level: 5,
    en: 'In winter it is very cold. Noa wears a coat, a hat and gloves. She makes a snowman with her friends.',
    he: 'בחורף קר מאוד. נועה לובשת מעיל, כובע וכפפות. היא בונה איש שלג עם החברים שלה.',
    questions: [
      { q: 'How is the weather in winter?', qHe: 'איך מזג האוויר בחורף?', answer: 'very cold', wrong: ['very hot', 'sunny'] },
      { q: 'What does Noa wear?', qHe: 'מה נועה לובשת?', answer: 'a coat, a hat and gloves', wrong: ['a dress and shoes', 'a shirt and pants'] },
      { q: 'What does she make?', qHe: 'מה היא בונה?', answer: 'a snowman', wrong: ['a cake', 'a house'] },
    ],
  },
  {
    id: 'story-7',
    title: 'The Red Ball',
    emoji: '🔴',
    level: 5,
    en: 'Dan has a red ball. He kicks the ball very hard. The ball goes over the fence! A friendly dog brings the ball back.',
    he: 'לדן יש כדור אדום. הוא בועט בכדור חזק מאוד. הכדור עף מעל הגדר! כלב חברותי מחזיר את הכדור.',
    questions: [
      { q: 'What color is the ball?', qHe: 'באיזה צבע הכדור?', answer: 'red', wrong: ['blue', 'green'] },
      { q: 'Where does the ball go?', qHe: 'לאן הכדור עף?', answer: 'over the fence', wrong: ['into the sea', 'under the bed'] },
      { q: 'Who brings the ball back?', qHe: 'מי מחזיר את הכדור?', answer: 'a dog', wrong: ['a cat', 'Dan’s mom'] },
    ],
  },
  {
    id: 'story-8',
    title: 'Good Night, Moon',
    emoji: '🌙',
    level: 5,
    en: 'At night, the moon and the stars are in the sky. Ella looks out of the window. She says "Good night, moon!" and goes to sleep.',
    he: 'בלילה, הירח והכוכבים בשמיים. אלה מסתכלת מהחלון. היא אומרת "לילה טוב, ירח!" והולכת לישון.',
    questions: [
      { q: 'What is in the sky?', qHe: 'מה יש בשמיים?', answer: 'the moon and the stars', wrong: ['the sun and clouds', 'a rainbow'] },
      { q: 'Where does Ella look?', qHe: 'לאן אלה מסתכלת?', answer: 'out of the window', wrong: ['under the bed', 'at a book'] },
      { q: 'What does Ella do at the end?', qHe: 'מה אלה עושה בסוף?', answer: 'She goes to sleep.', wrong: ['She eats dinner.', 'She goes to school.'] },
    ],
  },
];

export const STORIES_BY_ID: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
