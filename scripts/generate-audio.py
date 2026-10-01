#!/usr/bin/env python3
"""Records every phrase in scripts/texts.json with a natural neural voice (Piper).

Output: public/audio/<hash>.mp3 and src/data/audio-manifest.json (phrase → file).
Already-recorded phrases are skipped, and files no longer needed are removed.

Usage:
  pip install piper-tts
  npm run audio:texts                      # refresh scripts/texts.json
  python3 scripts/generate-audio.py --model path/to/voice.onnx

The default voice is Piper "en_US-joe-medium" (CC0). It can be obtained with
`npm pack vowel-lab-voices-float` (the package holds the model as float.onnx).
If the model has no .onnx.json config next to it, the standard Piper English config is created.
"""
import argparse, hashlib, io, json, os, subprocess, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTS = os.path.join(ROOT, 'scripts', 'texts.json')
OUT_DIR = os.path.join(ROOT, 'public', 'audio')
MANIFEST = os.path.join(ROOT, 'src', 'data', 'audio-manifest.json')
VOICE_NAME = 'en_US-joe-medium'


def audio_key(text: str) -> str:
    # Must match audioKey() in src/engine/speech.ts
    return ' '.join(text.strip().lower().split())


def file_name(key: str) -> str:
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:12] + '.mp3'


def ensure_config(model: str) -> str:
    cfg = model + '.json'
    if not os.path.exists(cfg):
        from piper.phoneme_ids import DEFAULT_PHONEME_ID_MAP
        json.dump({
            'audio': {'sample_rate': 22050, 'quality': 'medium'},
            'espeak': {'voice': 'en-us'},
            'inference': {'noise_scale': 0.667, 'length_scale': 1, 'noise_w': 0.8},
            'phoneme_type': 'espeak', 'phoneme_map': {}, 'phoneme_id_map': DEFAULT_PHONEME_ID_MAP,
            'num_symbols': 256, 'num_speakers': 1, 'speaker_id_map': {}, 'language': {'code': 'en_US'},
        }, open(cfg, 'w'))
    return cfg


def synth_mp3(voice, text: str, out_path: str, length_scale: float):
    from piper import SynthesisConfig
    # A full stop gives single words a natural, finished intonation.
    spoken = text if text[-1:] in '.!?"”' else text + '.'
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(spoken, w, syn_config=SynthesisConfig(length_scale=length_scale))
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-i', '-',
         # Even loudness only – trimming silence was found to clip the start of words.
         '-af', 'loudnorm=I=-16:TP=-1.5',
         '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out_path],
        input=buf.getvalue(), check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='Piper .onnx voice model')
    ap.add_argument('--length-scale', type=float, default=1.15, help='>1 is slower (child-friendly)')
    ap.add_argument('--force', action='store_true', help='re-record phrases that already have a file')
    args = ap.parse_args()

    from piper import PiperVoice
    voice = PiperVoice.load(args.model, config_path=ensure_config(args.model))
    texts = json.load(open(TEXTS, encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)

    files, made = {}, 0
    for i, text in enumerate(texts):
        key = audio_key(text)
        name = file_name(key)
        files[key] = name
        path = os.path.join(OUT_DIR, name)
        if args.force or not os.path.exists(path):
            synth_mp3(voice, text, path, args.length_scale)
            made += 1
            if made % 50 == 0:
                print(f'  {made} new recordings…', file=sys.stderr)

    keep = set(files.values())
    removed = 0
    for f in os.listdir(OUT_DIR):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(OUT_DIR, f))
            removed += 1

    json.dump({'voice': VOICE_NAME, 'files': dict(sorted(files.items()))}, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in keep)
    print(f'{len(files)} phrases: {made} recorded, {removed} removed, {size / 1e6:.1f} MB total')


if __name__ == '__main__':
    main()
