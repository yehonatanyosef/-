/*
 * "My island": every word the child learns becomes something they can place on their
 * own island, and treasure chests add special decorations. Tapping anything on the
 * island says its English name, so the island is a picture of what the child knows.
 */
import { DECOR, DECOR_BY_ID, type Decor } from '../data/decor';
import { ALL_WORDS, WORDS_BY_ID } from '../data/words';
import type { IslandState, Profile } from '../types';
import { pick, type Rng } from './random';
import { isLearned } from './srs';

export interface IslandItem {
  id: string; // "w:<english word>" or "d:<decor id>"
  en: string;
  he: string;
  emoji: string;
  /** Animals bob around; everything else stands still. */
  alive: boolean;
  rare: boolean;
}

/** Word topics whose words can stand on an island (not body parts, actions or colors). */
const PLACEABLE_TOPICS = ['animals', 'food', 'home', 'nature', 'abc'];
const ALIVE = ['animals'];
const ALIVE_DECOR = ['butterfly', 'dolphin', 'turtle', 'penguin', 'unicorn', 'dragon', 'whale', 'peacock'];

const wordItemId = (en: string) => `w:${en}`;

const WORD_ITEMS: Record<string, IslandItem> = {};
for (const w of ALL_WORDS) {
  if (!w.emoji || !PLACEABLE_TOPICS.includes(w.topic)) continue;
  const id = wordItemId(w.en);
  const prev = WORD_ITEMS[id];
  // The same word can appear in two topics (e.g. "cat" in abc and animals) – it is one item.
  WORD_ITEMS[id] = { id, en: w.en, he: w.he, emoji: w.emoji, alive: ALIVE.includes(w.topic) || !!prev?.alive, rare: false };
}

const decorItem = (d: Decor): IslandItem => ({ id: `d:${d.id}`, en: d.en, he: d.he, emoji: d.emoji, alive: ALIVE_DECOR.includes(d.id), rare: d.rare });

export function islandItem(id: string): IslandItem | null {
  if (id.startsWith('d:')) {
    const d = DECOR_BY_ID[id.slice(2)];
    return d ? decorItem(d) : null;
  }
  return WORD_ITEMS[id] ?? null;
}

/** Every island item there is (for tests and the asset lists). */
export function allIslandItems(): IslandItem[] {
  return [...Object.values(WORD_ITEMS), ...DECOR.map(decorItem)];
}

/** Items the child owns: learned words that can stand on the island, plus won decorations. */
export function collectedItems(profile: Profile): IslandItem[] {
  const ids = new Set<string>();
  for (const [id, prog] of Object.entries(profile.items)) {
    const w = WORDS_BY_ID[id];
    if (w && isLearned(prog) && WORD_ITEMS[wordItemId(w.en)]) ids.add(wordItemId(w.en));
  }
  const words = [...ids].map((id) => WORD_ITEMS[id]);
  const decor = (profile.island?.decor ?? []).map((d) => islandItem(`d:${d}`)).filter((x): x is IslandItem => !!x);
  return [...decor, ...words];
}

/** Island word items among the given progress item ids (e.g. words learned in a lesson). */
export function newIslandWords(itemIds: string[]): IslandItem[] {
  const out = new Map<string, IslandItem>();
  for (const id of itemIds) {
    const w = WORDS_BY_ID[id];
    const item = w && WORD_ITEMS[wordItemId(w.en)];
    if (item) out.set(item.id, item);
  }
  return [...out.values()];
}

/* ---------- Size: the island grows as the child collects more ---------- */

/** Tiles and grid columns per island size, and how many items are needed to reach it. */
export const ISLAND_SIZES = [
  { tiles: 9, cols: 3, need: 0 },
  { tiles: 12, cols: 4, need: 10 },
  { tiles: 16, cols: 4, need: 22 },
  { tiles: 20, cols: 5, need: 36 },
  { tiles: 25, cols: 5, need: 55 },
];

export function islandSize(collected: number) {
  let level = 0;
  ISLAND_SIZES.forEach((s, i) => collected >= s.need && (level = i));
  const next = ISLAND_SIZES[level + 1];
  return { level, ...ISLAND_SIZES[level], toNext: next ? next.need - collected : null };
}

/** The island's tiles, grown to the current size and with no item that is no longer owned. */
export function islandSlots(profile: Profile): (string | null)[] {
  const owned = new Set(collectedItems(profile).map((i) => i.id));
  const { tiles } = islandSize(owned.size);
  const slots = (profile.island?.slots ?? []).slice(0, tiles).map((id) => (id && owned.has(id) ? id : null));
  while (slots.length < tiles) slots.push(null);
  return slots;
}

/** Owned items that are not on the island yet. */
export function bagItems(profile: Profile): IslandItem[] {
  const placed = new Set(islandSlots(profile).filter(Boolean));
  return collectedItems(profile).filter((i) => !placed.has(i.id));
}

function withSlots(profile: Profile, slots: (string | null)[]): Profile {
  const island: IslandState = { decor: profile.island?.decor ?? [], slots };
  return { ...profile, island };
}

/** Places an owned item on a free tile (the first free one when no tile is given). */
export function placeItem(profile: Profile, itemId: string, tile?: number): Profile {
  const slots = islandSlots(profile);
  if (slots.includes(itemId) || !collectedItems(profile).some((i) => i.id === itemId)) return profile;
  const at = tile ?? slots.indexOf(null);
  if (at < 0 || at >= slots.length || slots[at]) return profile;
  slots[at] = itemId;
  return withSlots(profile, slots);
}

/** Puts an item from a tile back into the bag. */
export function removeItem(profile: Profile, tile: number): Profile {
  const slots = islandSlots(profile);
  if (!slots[tile]) return profile;
  slots[tile] = null;
  return withSlots(profile, slots);
}

/* ---------- Treasure chests ---------- */

export type ChestKind = 'daily' | 'weekly';

export interface ChestReward {
  coins: number;
  decor: string | null;
}

/** What a chest holds: coins and a decoration the child doesn't have yet (rare ones in the weekly chest). */
export function rollChest(profile: Profile, kind: ChestKind, rng: Rng): ChestReward {
  const owned = new Set(profile.island?.decor ?? []);
  const free = DECOR.filter((d) => !owned.has(d.id));
  const preferred = free.filter((d) => d.rare === (kind === 'weekly'));
  const pool = preferred.length ? preferred : free;
  const decor = pool.length ? pick(pool, rng).id : null;
  const coins = (kind === 'weekly' ? 80 : 25) + (decor ? 0 : 25);
  return { coins, decor };
}

export function applyChest(profile: Profile, reward: ChestReward): Profile {
  const decor = profile.island?.decor ?? [];
  return {
    ...profile,
    coins: profile.coins + reward.coins,
    island: { slots: profile.island?.slots ?? [], decor: reward.decor && !decor.includes(reward.decor) ? [...decor, reward.decor] : decor },
  };
}
