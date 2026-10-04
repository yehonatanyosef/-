/*
 * Special island decorations won from treasure chests. Each one is also an English
 * word – tapping it on the island says its name.
 */
export interface Decor {
  id: string;
  en: string;
  he: string;
  emoji: string;
  /** Rare decorations come only from the weekly chest. */
  rare: boolean;
}

export const DECOR: Decor[] = [
  { id: 'palm', en: 'palm tree', he: 'עץ דקל', emoji: '🌴', rare: false },
  { id: 'sunflower', en: 'sunflower', he: 'חמנייה', emoji: '🌻', rare: false },
  { id: 'mushroom', en: 'mushroom', he: 'פטרייה', emoji: '🍄', rare: false },
  { id: 'cactus', en: 'cactus', he: 'קקטוס', emoji: '🌵', rare: false },
  { id: 'tent', en: 'tent', he: 'אוהל', emoji: '⛺', rare: false },
  { id: 'fountain', en: 'fountain', he: 'מזרקה', emoji: '⛲', rare: false },
  { id: 'butterfly', en: 'butterfly', he: 'פרפר', emoji: '🦋', rare: false },
  { id: 'dolphin', en: 'dolphin', he: 'דולפין', emoji: '🐬', rare: false },
  { id: 'turtle', en: 'turtle', he: 'צב', emoji: '🐢', rare: false },
  { id: 'penguin', en: 'penguin', he: 'פינגווין', emoji: '🐧', rare: false },
  { id: 'snowman', en: 'snowman', he: 'איש שלג', emoji: '⛄', rare: false },
  { id: 'balloon', en: 'balloon', he: 'בלון', emoji: '🎈', rare: false },
  { id: 'sailboat', en: 'sailboat', he: 'סירת מפרש', emoji: '⛵', rare: false },
  { id: 'tulip', en: 'tulip', he: 'צבעוני', emoji: '🌷', rare: false },
  { id: 'shell', en: 'shell', he: 'צדף', emoji: '🐚', rare: false },
  { id: 'gift', en: 'gift', he: 'מתנה', emoji: '🎁', rare: false },
  { id: 'castle', en: 'castle', he: 'טירה', emoji: '🏰', rare: true },
  { id: 'unicorn', en: 'unicorn', he: 'חד-קרן', emoji: '🦄', rare: true },
  { id: 'dragon', en: 'dragon', he: 'דרקון', emoji: '🐉', rare: true },
  { id: 'rocket', en: 'rocket', he: 'טיל', emoji: '🚀', rare: true },
  { id: 'volcano', en: 'volcano', he: 'הר געש', emoji: '🌋', rare: true },
  { id: 'ferris-wheel', en: 'ferris wheel', he: 'גלגל ענק', emoji: '🎡', rare: true },
  { id: 'carousel', en: 'carousel', he: 'קרוסלה', emoji: '🎠', rare: true },
  { id: 'whale', en: 'whale', he: 'לווייתן', emoji: '🐳', rare: true },
  { id: 'peacock', en: 'peacock', he: 'טווס', emoji: '🦚', rare: true },
  { id: 'crown', en: 'crown', he: 'כתר', emoji: '👑', rare: true },
];

export const DECOR_BY_ID: Record<string, Decor> = Object.fromEntries(DECOR.map((d) => [d.id, d]));
