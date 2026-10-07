# Using a recorded / ElevenLabs voice

1. Open a narration text (`narration_A_ad.txt`, ...) and generate the voice (e.g. ElevenLabs, Multilingual v2, a calm female Hebrew voice;
   Stability ~0.40, Similarity ~0.75, Style ~0.15, Speed 1.0-1.1).
2. Either:
   - one file per scene -> `video/voice/1.mp3 ... N.mp3`, or
   - one single take -> `video/voice/voice.mp3`, leaving a clear ~0.5-0.7s pause between scenes (it is split automatically at the N-1 longest pauses).
3. Build: `SCRIPT=A CTA=ad PALETTE=brand python3 video/build_teaser.py --out video/final.mp4`
   (the video length follows the voice; keep it under 40s).
