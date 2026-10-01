import type { Exercise } from '../engine/exercises';

export interface Hints {
  /** Show Hebrew translations as a helping hand. */
  hebrew: boolean;
  /** Play the target audio automatically when the exercise opens. */
  autoAudio: boolean;
}

export interface ExProps<K extends Exercise['kind'] = Exercise['kind']> {
  ex: Extract<Exercise, { kind: K }>;
  hints: Hints;
  onAnswer: (correct: boolean) => void;
  /** Leave the exercise without grading (e.g. microphone unavailable). */
  onSkip: () => void;
}
