/* Everyday conversation: someone says something – what is a good reply? */

export interface Phrase {
  id: string;
  emoji: string;
  /** What the other person says. */
  prompt: string;
  promptHe: string;
  reply: string;
  replyHe: string;
  /** Replies that don't fit this situation. */
  wrong: string[];
  level: number;
}

type Row = [emoji: string, prompt: string, promptHe: string, reply: string, replyHe: string, wrong: string[], level: number];

const ROWS: Row[] = [
  ['👋', 'Hello!', 'שלום!', 'Hi! Nice to see you.', 'היי! נעים לראות אותך.', ['Good night!', 'I am seven.'], 2],
  ['🙋', 'What is your name?', 'מה שמך?', 'My name is Tom.', 'קוראים לי טום.', ['I am fine.', 'I like pizza.'], 2],
  ['🎂', 'How old are you?', 'בן כמה אתה?', 'I am seven.', 'אני בן שבע.', ['My name is Tom.', 'It is red.'], 2],
  ['😊', 'How are you?', 'מה שלומך?', 'I am fine, thank you.', 'אני בסדר, תודה.', ['I am seven.', 'It is a dog.'], 2],
  ['🌅', 'Good morning!', 'בוקר טוב!', 'Good morning!', 'בוקר טוב!', ['Good night!', 'See you later!'], 2],
  ['🙏', 'Thank you!', 'תודה!', "You're welcome.", 'בבקשה (על לא דבר).', ['Hello!', 'I am six.'], 2],
  ['🚪', 'Goodbye!', 'להתראות!', 'See you later!', 'נתראה אחר כך!', ['Good morning!', 'My name is Dan.'], 2],
  ['🌙', 'Good night!', 'לילה טוב!', 'Good night! Sleep well.', 'לילה טוב! שינה טובה.', ['Good morning!', 'Here you are.'], 2],
  ['🤝', 'Nice to meet you.', 'נעים להכיר.', 'Nice to meet you too.', 'גם לי נעים להכיר.', ['I am hungry.', 'It is a cat.'], 3],
  ['😔', 'Sorry!', 'סליחה!', "That's okay.", 'זה בסדר.', ['Yes, I do.', 'My name is Ben.'], 3],
  ['🍕', 'Do you like pizza?', 'אתה אוהב פיצה?', 'Yes, I do!', 'כן, אני אוהב!', ['I am fine.', 'Yes, it is.'], 3],
  ['💧', 'Can I have some water, please?', 'אפשר לקבל מים, בבקשה?', 'Here you are.', 'הנה, בבקשה.', ['Good night!', 'I am from Israel.'], 3],
  ['🌍', 'Where are you from?', 'מאיפה אתה?', 'I am from Israel.', 'אני מישראל.', ['I am fine.', 'I like dogs.'], 3],
  ['🎨', 'What is your favorite color?', 'מה הצבע האהוב עליך?', 'My favorite color is blue.', 'הצבע האהוב עליי הוא כחול.', ['I have a dog.', 'I am eight.'], 3],
  ['🐶', 'Do you have a pet?', 'יש לך חיית מחמד?', 'Yes, I have a cat.', 'כן, יש לי חתול.', ['Yes, it is.', 'I am fine.'], 3],
  ['🌧️', 'Is it raining?', 'יורד גשם?', 'Yes, it is. Take an umbrella!', 'כן. קח מטרייה!', ['Yes, I do.', 'I am seven.'], 3],
  ['😋', 'Are you hungry?', 'אתה רעב?', 'Yes, I am.', 'כן, אני רעב.', ['Yes, I do.', 'It is blue.'], 3],
  ['⚽', "Let's play!", 'בוא נשחק!', "Okay, let's go!", 'בסדר, יאללה!', ['I am from Israel.', 'Thank you.'], 3],
  ['⏰', 'What time is it?', 'מה השעה?', "It is three o'clock.", 'השעה שלוש.', ['It is blue.', 'I am three.'], 4],
  ['🍽️', 'What do you like to eat?', 'מה אתה אוהב לאכול?', 'I like to eat pizza.', 'אני אוהב לאכול פיצה.', ['I like to run.', 'I am fine.'], 4],
];

export const PHRASES: Phrase[] = ROWS.map(([emoji, prompt, promptHe, reply, replyHe, wrong, level], i) => ({
  id: `talk-${i + 1}`,
  emoji,
  prompt,
  promptHe,
  reply,
  replyHe,
  wrong,
  level,
}));

export const PHRASES_BY_ID: Record<string, Phrase> = Object.fromEntries(PHRASES.map((p) => [p.id, p]));
