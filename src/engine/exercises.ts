import type { Letter, Sentence, Skill, Story, StoryQuestion, Word } from '../types';

interface Base {
  /** Unique id inside a lesson. */
  uid: string;
  /** Progress item this exercise trains (word / letter / sentence / story-question id). */
  itemId?: string;
  skill?: Skill;
  /** True for a re-queued exercise after a mistake (shown in an easier form). */
  retry?: boolean;
}

export type Exercise = Base &
  (
    | { kind: 'learn-word'; word: Word }
    | { kind: 'learn-letter'; letter: Letter; word: Word }
    | { kind: 'learn-sentence'; sentence: Sentence }
    | { kind: 'read-story'; story: Story }
    | { kind: 'listen-pick'; word: Word; options: Word[] }
    | { kind: 'word-pick-picture'; word: Word; options: Word[] }
    | { kind: 'picture-pick-word'; word: Word; options: Word[] }
    | { kind: 'translate-pick'; word: Word; options: Word[] }
    | { kind: 'first-letter'; word: Word; options: string[] }
    | { kind: 'letter-listen'; letter: Letter; options: Letter[] }
    | { kind: 'letter-case'; letter: Letter; options: Letter[] }
    | { kind: 'missing-letter'; word: Word; index: number; options: string[] }
    | { kind: 'spell-tiles'; word: Word; tiles: string[]; prefilled: number }
    | { kind: 'spell-type'; word: Word }
    | { kind: 'say-word'; word: Word }
    | { kind: 'say-sentence'; sentence: Sentence }
    | { kind: 'memory'; words: Word[] }
    | { kind: 'sentence-build'; sentence: Sentence; tiles: string[] }
    | { kind: 'sentence-picture'; sentence: Sentence; options: Sentence[] }
    | { kind: 'listen-sentence'; sentence: Sentence; options: Sentence[] }
    | { kind: 'story-question'; story: Story; question: StoryQuestion; options: string[] }
  );

export type ExerciseKind = Exercise['kind'];

export const LEARN_KINDS: ExerciseKind[] = ['learn-word', 'learn-letter', 'learn-sentence', 'read-story'];

export function isGraded(ex: Exercise): boolean {
  return !LEARN_KINDS.includes(ex.kind);
}

/** Hebrew instruction shown (and optionally read aloud) for each exercise kind. */
export const INSTRUCTIONS: Record<ExerciseKind, string> = {
  'learn-word': 'מילה חדשה! הקשיבו וחזרו אחריי',
  'learn-letter': 'אות חדשה! הקשיבו לשם האות',
  'learn-sentence': 'משפט חדש! הקשיבו וקראו',
  'read-story': 'קראו (או הקשיבו) לסיפור',
  'listen-pick': 'הקשיבו ובחרו את התמונה הנכונה',
  'word-pick-picture': 'קראו את המילה ובחרו תמונה',
  'picture-pick-word': 'מה רואים בתמונה?',
  'translate-pick': 'איך אומרים באנגלית?',
  'first-letter': 'באיזו אות מתחילה המילה?',
  'letter-listen': 'הקשיבו ובחרו את האות',
  'letter-case': 'מצאו את האות הקטנה המתאימה',
  'missing-letter': 'איזו אות חסרה?',
  'spell-tiles': 'סדרו את האותיות למילה',
  'spell-type': 'כתבו את המילה באנגלית',
  'say-word': 'אמרו את המילה בקול',
  'say-sentence': 'קראו את המשפט בקול',
  memory: 'משחק זיכרון: מצאו את הזוגות',
  'sentence-build': 'בנו את המשפט',
  'sentence-picture': 'קראו את המשפט ובחרו תמונה',
  'listen-sentence': 'הקשיבו ובחרו את המשפט',
  'story-question': 'ענו על השאלה',
};

/** Correct answer as text – shown to the child after a mistake. */
export function answerText(ex: Exercise): string {
  switch (ex.kind) {
    case 'listen-pick':
    case 'word-pick-picture':
    case 'picture-pick-word':
    case 'translate-pick':
    case 'spell-tiles':
    case 'spell-type':
    case 'say-word':
    case 'missing-letter':
      return ex.word.en;
    case 'first-letter':
      return ex.word.en[0].toUpperCase();
    case 'letter-listen':
      return ex.letter.upper;
    case 'letter-case':
      return `${ex.letter.upper} ${ex.letter.lower}`;
    case 'say-sentence':
    case 'sentence-build':
    case 'sentence-picture':
    case 'listen-sentence':
      return ex.sentence.en;
    case 'story-question':
      return ex.question.answer;
    default:
      return '';
  }
}

function trim<T>(options: T[], isAnswer: (o: T) => boolean, keep: number): T[] {
  const answer = options.filter(isAnswer);
  const others = options.filter((o) => !isAnswer(o)).slice(0, Math.max(0, keep - answer.length));
  // keep original relative order so the layout stays familiar
  return options.filter((o) => answer.includes(o) || others.includes(o));
}

/** A simpler copy of an exercise, used when re-asking after a mistake. */
export function easier(ex: Exercise, uid: string): Exercise {
  const base = { ...ex, uid, retry: true } as Exercise;
  switch (base.kind) {
    case 'listen-pick':
    case 'word-pick-picture':
    case 'picture-pick-word':
    case 'translate-pick': {
      const id = base.word.id;
      return { ...base, options: trim(base.options, (o) => o.id === id, 3) };
    }
    case 'letter-listen':
    case 'letter-case': {
      const id = base.letter.id;
      return { ...base, options: trim(base.options, (o) => o.id === id, 3) };
    }
    case 'first-letter': {
      const a = base.word.en[0].toUpperCase();
      return { ...base, options: trim(base.options, (o) => o === a, 3) };
    }
    case 'missing-letter': {
      const a = base.word.en[base.index];
      return { ...base, options: trim(base.options, (o) => o === a, 2) };
    }
    case 'sentence-picture':
    case 'listen-sentence': {
      const id = base.sentence.id;
      return { ...base, options: trim(base.options, (o) => o.id === id, 2) };
    }
    case 'story-question': {
      const a = base.question.answer;
      return { ...base, options: trim(base.options, (o) => o === a, 2) };
    }
    case 'spell-tiles': {
      const letters = base.word.en.toLowerCase().split('');
      const remaining = letters.slice();
      const tiles = base.tiles.filter((t) => {
        const i = remaining.indexOf(t);
        if (i === -1) return false; // drop distractor tiles
        remaining.splice(i, 1);
        return true;
      });
      return { ...base, tiles, prefilled: Math.max(base.prefilled, 1) };
    }
    case 'spell-type':
      // Typing is hard – fall back to tiles.
      return {
        uid,
        retry: true,
        itemId: base.itemId,
        skill: base.skill,
        kind: 'spell-tiles',
        word: base.word,
        tiles: base.word.en.toLowerCase().split('').reverse(),
        prefilled: 1,
      };
    default:
      return base;
  }
}
