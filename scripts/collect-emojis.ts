// Writes every emoji used as a picture to scripts/emojis.json (input for fetch-images.py).
import { writeFileSync } from 'node:fs';
import { pictureEmojis } from '../src/data/pictures';

const list = pictureEmojis();
writeFileSync(new URL('./emojis.json', import.meta.url), JSON.stringify(list, null, 1) + '\n');
console.log(`${list.length} emoji → scripts/emojis.json`);
