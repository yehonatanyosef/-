# Teaser video (9:16, 39.6s)
`python3 video/build_teaser.py` — builds `video/teaser.mp4`.
Needs: ffmpeg, `pip install moviepy edge-tts python-bidi pillow numpy`, espeak-ng (fallback voice).
Voice: uses edge-tts `he-IL-HilaNeural (female)` (neural, much better) when internet is available;
otherwise falls back to offline espeak-ng (robotic). Force with `TTS=edge` / `TTS=espeak`.
Music is synthesized in code (no licensing issues) and ducked under the voice.
