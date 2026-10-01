import type { Exercise } from '../engine/exercises';
import { SentenceBuild, SpellTiles, SpellType } from './Build';
import {
  FirstLetter,
  LetterCase,
  LetterListen,
  ListenPick,
  ListenSentence,
  MissingLetter,
  PicturePickWord,
  SentencePicture,
  StoryQuestion,
  TranslatePick,
  WordPickPicture,
} from './Choice';
import { LearnLetter, LearnSentence, LearnWord, ReadStory } from './Learn';
import { Memory } from './Memory';
import { SaySentence, SayWord } from './Speak';
import type { Hints } from './types';

export function ExerciseView(props: { ex: Exercise; hints: Hints; onAnswer: (c: boolean) => void; onSkip: () => void }) {
  const { ex, ...rest } = props;
  switch (ex.kind) {
    case 'learn-word':
      return <LearnWord ex={ex} {...rest} />;
    case 'learn-letter':
      return <LearnLetter ex={ex} {...rest} />;
    case 'learn-sentence':
      return <LearnSentence ex={ex} {...rest} />;
    case 'read-story':
      return <ReadStory ex={ex} {...rest} />;
    case 'listen-pick':
      return <ListenPick ex={ex} {...rest} />;
    case 'word-pick-picture':
      return <WordPickPicture ex={ex} {...rest} />;
    case 'picture-pick-word':
      return <PicturePickWord ex={ex} {...rest} />;
    case 'translate-pick':
      return <TranslatePick ex={ex} {...rest} />;
    case 'first-letter':
      return <FirstLetter ex={ex} {...rest} />;
    case 'letter-listen':
      return <LetterListen ex={ex} {...rest} />;
    case 'letter-case':
      return <LetterCase ex={ex} {...rest} />;
    case 'missing-letter':
      return <MissingLetter ex={ex} {...rest} />;
    case 'spell-tiles':
      return <SpellTiles ex={ex} {...rest} />;
    case 'spell-type':
      return <SpellType ex={ex} {...rest} />;
    case 'say-word':
      return <SayWord ex={ex} {...rest} />;
    case 'say-sentence':
      return <SaySentence ex={ex} {...rest} />;
    case 'memory':
      return <Memory ex={ex} {...rest} />;
    case 'sentence-build':
      return <SentenceBuild ex={ex} {...rest} />;
    case 'sentence-picture':
      return <SentencePicture ex={ex} {...rest} />;
    case 'listen-sentence':
      return <ListenSentence ex={ex} {...rest} />;
    case 'story-question':
      return <StoryQuestion ex={ex} {...rest} />;
  }
}
