import type { Island, IslandKind, Stage, Word } from '../types';
import { GRAMMAR_ITEMS, GRAMMAR_RULES } from './grammar';
import { LETTERS } from './letters';
import { SENTENCES } from './sentences';
import { STORIES } from './stories';
import { PHRASES } from './talk';
import { ACTIONS, ANIMALS, BODY_CLOTHES, COLORS_NUMBERS, FOOD, HOME, NATURE } from './words';

interface IslandDef {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  kind: IslandKind;
  level: number;
  colors: [string, string];
  itemIds: string[];
  perStage: number;
  /** Explicit stage grouping (otherwise items are chunked by `perStage`). */
  groups?: string[][];
}

const ids = (words: Word[]) => words.map((w) => w.id);

const DEFS: IslandDef[] = [
  { id: 'abc', name: 'חוף האותיות', nameEn: 'Alphabet Beach', emoji: '🔤', kind: 'letters', level: 1, colors: ['#fde68a', '#f59e0b'], itemIds: LETTERS.map((l) => l.id), perStage: 5 },
  { id: 'animals', name: 'ג׳ונגל החיות', nameEn: 'Animal Jungle', emoji: '🦁', kind: 'words', level: 1, colors: ['#86efac', '#16a34a'], itemIds: ids(ANIMALS), perStage: 4 },
  { id: 'colors', name: 'גבעות הקשת', nameEn: 'Rainbow Hills', emoji: '🌈', kind: 'words', level: 2, colors: ['#f9a8d4', '#a855f7'], itemIds: ids(COLORS_NUMBERS), perStage: 4 },
  { id: 'talk', name: 'שכונת השיחות', nameEn: 'Talk Town', emoji: '💬', kind: 'talk', level: 2, colors: ['#fbcfe8', '#db2777'], itemIds: PHRASES.map((p) => p.id), perStage: 4 },
  { id: 'food', name: 'עמק הטעמים', nameEn: 'Yummy Valley', emoji: '🍓', kind: 'words', level: 2, colors: ['#fca5a5', '#ef4444'], itemIds: ids(FOOD), perStage: 4 },
  { id: 'home', name: 'עיר הבית', nameEn: 'Home Town', emoji: '🏠', kind: 'words', level: 2, colors: ['#93c5fd', '#2563eb'], itemIds: ids(HOME), perStage: 4 },
  { id: 'nature', name: 'הגן המואר', nameEn: 'Sunny Garden', emoji: '🌻', kind: 'words', level: 3, colors: ['#bef264', '#65a30d'], itemIds: ids(NATURE), perStage: 4 },
  { id: 'body', name: 'מפרץ התחפושות', nameEn: 'Dress-up Bay', emoji: '👕', kind: 'words', level: 3, colors: ['#67e8f9', '#0891b2'], itemIds: ids(BODY_CLOTHES), perStage: 4 },
  { id: 'actions', name: 'פארק האקשן', nameEn: 'Action Park', emoji: '⚡', kind: 'words', level: 3, colors: ['#fdba74', '#ea580c'], itemIds: ids(ACTIONS), perStage: 4 },
  {
    id: 'grammar',
    name: 'חורשת הדקדוק',
    nameEn: 'Grammar Grove',
    emoji: '🧩',
    kind: 'grammar',
    level: 4,
    colors: ['#a7f3d0', '#059669'],
    itemIds: GRAMMAR_ITEMS.map((g) => g.id),
    perStage: 5,
    groups: GRAMMAR_RULES.map((r) => GRAMMAR_ITEMS.filter((g) => g.rule === r.id).map((g) => g.id)),
  },
  { id: 'sentences', name: 'גשר המשפטים', nameEn: 'Sentence Bridge', emoji: '🌉', kind: 'sentences', level: 4, colors: ['#c4b5fd', '#7c3aed'], itemIds: SENTENCES.map((s) => s.id), perStage: 4 },
  { id: 'stories', name: 'טירת הסיפורים', nameEn: 'Story Castle', emoji: '🏰', kind: 'stories', level: 5, colors: ['#fcd34d', '#b45309'], itemIds: STORIES.map((s) => s.id), perStage: 2 },
];

/** Splits items into chunks of ~`size`, merging a too-small tail into the previous chunk. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  if (out.length > 1 && out[out.length - 1].length < Math.ceil(size / 2)) {
    const tail = out.pop()!;
    out[out.length - 1].push(...tail);
  }
  return out;
}

function buildIsland(def: IslandDef): Island {
  const groups = def.groups ?? chunk(def.itemIds, def.perStage);
  const stages: Stage[] = groups.map((itemIds, index) => ({
    id: `${def.id}-${index}`,
    islandId: def.id,
    index,
    boss: false,
    itemIds,
  }));
  stages.push({
    id: `${def.id}-${groups.length}`,
    islandId: def.id,
    index: groups.length,
    boss: true,
    itemIds: def.itemIds,
  });
  const { perStage: _perStage, groups: _groups, ...rest } = def;
  return { ...rest, stages };
}

export const ISLANDS: Island[] = DEFS.map(buildIsland);

export const ISLANDS_BY_ID: Record<string, Island> = Object.fromEntries(ISLANDS.map((i) => [i.id, i]));

export const ALL_STAGES: Stage[] = ISLANDS.flatMap((i) => i.stages);

export const STAGES_BY_ID: Record<string, Stage> = Object.fromEntries(ALL_STAGES.map((s) => [s.id, s]));

/** Index of the island a child should start at, given their placement level (1–5). */
export function startIslandIndex(level: number): number {
  const start: Record<number, string> = { 1: 'abc', 2: 'animals', 3: 'food', 4: 'actions', 5: 'sentences' };
  return ISLANDS.findIndex((i) => i.id === start[Math.min(5, Math.max(1, level))]);
}
