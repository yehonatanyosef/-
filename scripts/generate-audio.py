#!/usr/bin/env python3
"""Records every phrase in scripts/texts.json with a natural neural voice.

Output: public/audio/<hash>.mp3 and src/data/audio-manifest.json (phrase → file).
Already-recorded phrases are skipped (use --force after changing the voice),
and files no longer needed are removed.

Default voice: Kokoro v1.0 "af_bella" – a clear female U.S. English voice (Apache-2.0),
run with sherpa-onnx. Download and unpack the model once:
  https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2

Usage:
  pip install sherpa-onnx
  npm run audio:texts                      # refresh scripts/texts.json
  python3 scripts/generate-audio.py --kokoro path/to/kokoro-multi-lang-v1_0 [--speaker af_bella]

A Piper voice can be used instead with --piper path/to/voice.onnx (pip install piper-tts).
"""
import argparse, hashlib, io, json, os, struct, subprocess, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTS = os.path.join(ROOT, 'scripts', 'texts.json')
OUT_DIR = os.path.join(ROOT, 'public', 'audio')
MANIFEST = os.path.join(ROOT, 'src', 'data', 'audio-manifest.json')


def audio_key(text: str) -> str:
    # Must match audioKey() in src/engine/speech.ts
    return ' '.join(text.strip().lower().split())


def file_name(key: str) -> str:
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:12] + '.mp3'


def piper_config(model: str) -> str:
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


def kokoro_synth(model_dir: str, speaker: str, speed: float):
    """Returns synth(text) -> (float32 samples, sample_rate) using Kokoro via sherpa-onnx."""
    import sherpa_onnx
    d = model_dir.rstrip('/')
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=f'{d}/model.onnx', voices=f'{d}/voices.bin', tokens=f'{d}/tokens.txt',
                data_dir=f'{d}/espeak-ng-data', lexicon=f'{d}/lexicon-us-en.txt'),
            num_threads=4)))
    names = KOKORO_SPEAKERS
    if speaker not in names:
        sys.exit(f'Unknown Kokoro speaker {speaker!r}; try one of: ' + ', '.join(n for n in names if n.startswith('af_')))
    sid = names.index(speaker)

    def synth(text):
        audio = tts.generate(text, sid=sid, speed=speed)
        return audio.samples, audio.sample_rate
    return synth


def piper_synth(model: str, speed: float):
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(model, config_path=piper_config(model))

    def synth(text):
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as w:
            voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=1 / speed))
        buf.seek(0)
        with wave.open(buf) as w:
            data = w.readframes(w.getnframes())
            return [x / 32768 for x in struct.unpack(f'<{len(data) // 2}h', data)], w.getframerate()
    return synth


# Speaker order inside Kokoro v1.0 voices.bin (sherpa-onnx build).
KOKORO_SPEAKERS = (
    'af_alloy af_aoede af_bella af_heart af_jessica af_kore af_nicole af_nova af_river af_sarah af_sky '
    'am_adam am_echo am_eric am_fenrir am_liam am_michael am_onyx am_puck am_santa '
    'bf_alice bf_emma bf_isabella bf_lily bm_daniel bm_fable bm_george bm_lewis'
).split()


def to_mp3(samples, sample_rate: int, out_path: str):
    pcm = struct.pack(f'<{len(samples)}f', *samples)
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sample_rate), '-ac', '1', '-i', '-',
         # Even loudness only – trimming silence was found to clip the start of words.
         '-af', 'loudnorm=I=-16:TP=-1.5',
         '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out_path],
        input=pcm, check=True)


def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument('--kokoro', help='unpacked kokoro-multi-lang-v1_0 directory')
    src.add_argument('--piper', help='Piper .onnx voice model')
    ap.add_argument('--speaker', default='af_bella', help='Kokoro voice (default: af_bella)')
    ap.add_argument('--speed', type=float, default=0.9, help='<1 is slower (child-friendly)')
    ap.add_argument('--force', action='store_true', help='re-record phrases that already have a file')
    args = ap.parse_args()

    if args.kokoro:
        synth, voice_name = kokoro_synth(args.kokoro, args.speaker, args.speed), f'kokoro-v1.0-{args.speaker}'
    else:
        synth, voice_name = piper_synth(args.piper, args.speed), os.path.basename(args.piper)
    texts = json.load(open(TEXTS, encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)

    files, made = {}, 0
    for i, text in enumerate(texts):
        key = audio_key(text)
        name = file_name(key)
        files[key] = name
        path = os.path.join(OUT_DIR, name)
        if args.force or not os.path.exists(path):
            # A full stop gives single words a natural, finished intonation.
            spoken = text if text[-1:] in '.!?"”' else text + '.'
            samples, sr = synth(spoken)
            to_mp3(samples, sr, path)
            made += 1
            if made % 50 == 0:
                print(f'  {made} new recordings…', file=sys.stderr)

    keep = set(files.values())
    removed = 0
    for f in os.listdir(OUT_DIR):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(OUT_DIR, f))
            removed += 1

    json.dump({'voice': voice_name, 'files': dict(sorted(files.items()))}, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in keep)
    print(f'{len(files)} phrases: {made} recorded, {removed} removed, {size / 1e6:.1f} MB total')


if __name__ == '__main__':
    main()
