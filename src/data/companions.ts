export interface Companion {
  id: string;
  emoji: string;
  name: string;
  cost: number;
}

export const COMPANIONS: Companion[] = [
  { id: 'owl', emoji: '🦉', name: 'אולי הינשוף', cost: 0 },
  { id: 'puppy', emoji: '🐶', name: 'פיפי הכלבלב', cost: 40 },
  { id: 'kitty', emoji: '🐱', name: 'מיצי החתולה', cost: 40 },
  { id: 'fox', emoji: '🦊', name: 'פוקסי השועל', cost: 80 },
  { id: 'panda', emoji: '🐼', name: 'פנדי הפנדה', cost: 120 },
  { id: 'penguin', emoji: '🐧', name: 'פינגו הפינגווין', cost: 160 },
  { id: 'unicorn', emoji: '🦄', name: 'יוני חד-הקרן', cost: 250 },
  { id: 'dino', emoji: '🦖', name: 'דינו הדינוזאור', cost: 300 },
  { id: 'dragon', emoji: '🐉', name: 'דרקי הדרקון', cost: 400 },
  { id: 'robot', emoji: '🤖', name: 'רובי הרובוט', cost: 500 },
  { id: 'alien', emoji: '👽', name: 'זיגי החייזר', cost: 650 },
  { id: 'rocket', emoji: '🚀', name: 'טיל החלל', cost: 800 },
];

export const COMPANIONS_BY_ID: Record<string, Companion> = Object.fromEntries(COMPANIONS.map((c) => [c.id, c]));

export const AVATARS = ['🦁', '🐼', '🦊', '🥷', '👸', '🤴', '🧑‍🚀', '🐸', '🐰', '🐯', '🐵', '🐨'];
