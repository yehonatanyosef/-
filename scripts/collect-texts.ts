// Writes every phrase the game reads aloud to scripts/texts.json (input for generate-audio.py).
import { writeFileSync } from 'node:fs';
import { speakableTexts } from '../src/data/speakable';

const texts = speakableTexts();
writeFileSync(new URL('./texts.json', import.meta.url), JSON.stringify(texts, null, 1) + '\n');
console.log(`${texts.length} phrases → scripts/texts.json`);
