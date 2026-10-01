import { describe, expect, it } from 'vitest';
import { imageKey } from '../components/Emoji';
import { audioKey } from '../engine/speech';
import audio from './audio-manifest.json';
import images from './image-manifest.json';
import { pictureEmojis } from './pictures';
import { speakableTexts } from './speakable';

// If these fail after changing content, run:
//   npm run audio:texts && python3 scripts/generate-audio.py --model <voice.onnx>
//   npm run images:list && python3 scripts/fetch-images.py
describe('generated assets cover all content', () => {
  it('every phrase the game reads aloud has a natural-voice recording', () => {
    const files = (audio as { files: Record<string, string> }).files;
    const missing = speakableTexts().filter((t) => !files[audioKey(t)]);
    expect(missing).toEqual([]);
  });

  it('every picture emoji has an illustration', () => {
    const files = images as Record<string, string>;
    const missing = pictureEmojis().filter((e) => !files[imageKey(e)]);
    expect(missing).toEqual([]);
  });
});
