/*
 * Every English phrase the game reads aloud. scripts/collect-texts.ts writes this list
 * to a file and scripts/generate-audio.py records each phrase with the natural voice.
 */
import { GRAMMAR_ITEMS, GRAMMAR_RULES, grammarSentence } from './grammar';
import { LETTERS } from './letters';
import { SENTENCES } from './sentences';
import { STORIES } from './stories';
import { PHRASES } from './talk';
import { ALL_WORDS, WORDS_BY_ID } from './words';

/** Splits a story into sentences (each one can be tapped to hear it). */
export function splitStory(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["”]?/g) ?? [text];
}

/** A single word of a sentence, as read when its chip is tapped. */
export function chipText(word: string): string {
  return word.replace(/[.,!?]/g, '');
}

export function letterIntro(say: string, upper: string, wordEn: string): string {
  return `${say}. ${upper} is for ${wordEn}.`;
}

export function speakableTexts(): string[] {
  const out = new Set<string>();
  const add = (t: string) => t.trim() && out.add(t.trim());
  ALL_WORDS.forEach((w) => add(w.en));
  LETTERS.forEach((l) => {
    add(l.say);
    add(letterIntro(l.say, l.upper, WORDS_BY_ID[l.wordId].en));
  });
  SENTENCES.forEach((s) => {
    add(s.en);
    s.en.split(' ').forEach((w) => add(chipText(w)));
  });
  STORIES.forEach((s) => {
    add(s.en);
    splitStory(s.en).forEach((x) => add(x));
    s.questions.forEach((q) => [q.q, q.answer, ...q.wrong].forEach(add));
  });
  PHRASES.forEach((p) => [p.prompt, p.reply, ...p.wrong].forEach(add));
  GRAMMAR_ITEMS.forEach((g) => {
    add(grammarSentence(g));
    g.options.forEach(add);
  });
  GRAMMAR_RULES.forEach((r) => r.examples.forEach((e) => add(e.en)));
  return [...out].sort();
}
