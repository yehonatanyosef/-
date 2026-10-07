#!/usr/bin/env python3
"""
Teaser video builder - capital-gains-tax refund eligibility check.
Vertical 9:16 (1080x1920), <= 40 s, Hebrew narration (TTS), bold highlighted
subtitles, synthesized upbeat background music ducked under the voice.

Usage:  python3 video/build_teaser.py [--out video/teaser.mp4]
Env:    TTS=edge|espeak   force a voice engine (default: edge-tts if reachable,
                          otherwise offline espeak-ng fallback)
"""
import argparse, asyncio, math, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from bidi.algorithm import get_display

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "build")
FONT_PATH = os.path.join(HERE, "assets", "Heebo.ttf")
W, H, FPS, SR = 1080, 1920, 30, 44100
MAX_SECONDS = 40.0

# ----------------------------------------------------------------- palette
PALETTES = {
    # Brand colours sampled from the questionnaire page (yehonatan-yosef.com): deep navy card + warm bronze-gold.
    "brand": dict(label="צבעי המותג", bg=((27, 45, 78), (22, 36, 66), (11, 18, 34)), accent=(214, 172, 116),
                  light=(238, 212, 172), deep=(184, 138, 77), darkest=(105, 72, 30), ink=(35, 26, 5),
                  danger=(232, 100, 94), ok=(96, 196, 146), grey=(150, 162, 186), panel=(30, 48, 82),
                  line=(92, 108, 140), track=(40, 58, 96), box=(9, 15, 30), foot=(176, 186, 206),
                  bokeh=((214, 172, 116), (95, 125, 185), (238, 212, 172))),
    # name: bg top/mid/bottom, accent, accent-light, accent-deep, accent-darkest, ink (text on accent),
    #       danger, ok, grey, panel, panel-line, ring-track, subtitle-box rgb, footer, bokeh colours
    "navy": dict(label="נייבי וזהב", bg=((9, 24, 52), (16, 50, 96), (7, 15, 32)), accent=(255, 200, 61),
                 light=(255, 235, 170), deep=(200, 140, 20), darkest=(120, 80, 0), ink=(10, 24, 50),
                 danger=(255, 90, 95), ok=(40, 190, 130), grey=(120, 138, 168), panel=(18, 40, 78),
                 line=(60, 90, 140), track=(30, 62, 108), box=(5, 12, 28), foot=(150, 170, 205),
                 bokeh=((255, 200, 61), (80, 150, 255), (255, 235, 170))),
    "emerald": dict(label="ירוק וזהב", bg=((4, 32, 30), (10, 78, 66), (3, 18, 18)), accent=(255, 205, 80),
                    light=(255, 238, 180), deep=(200, 145, 30), darkest=(120, 80, 0), ink=(4, 36, 30),
                    danger=(255, 107, 90), ok=(94, 234, 160), grey=(120, 160, 150), panel=(10, 58, 50),
                    line=(50, 130, 110), track=(20, 80, 68), box=(2, 16, 15), foot=(150, 200, 190),
                    bokeh=((255, 205, 80), (80, 220, 170), (255, 238, 180))),
    "burgundy": dict(label="בורדו ושמנת", bg=((40, 8, 22), (92, 20, 48), (22, 4, 12)), accent=(244, 214, 150),
                     light=(255, 240, 210), deep=(190, 140, 70), darkest=(110, 70, 20), ink=(46, 10, 26),
                     danger=(255, 120, 110), ok=(120, 220, 160), grey=(170, 130, 150), panel=(70, 16, 38),
                     line=(150, 70, 100), track=(88, 26, 52), box=(20, 3, 10), foot=(210, 170, 190),
                     bokeh=((244, 214, 150), (230, 110, 150), (255, 240, 210))),
    "contrast": dict(label="שחור וצהוב", bg=((8, 8, 10), (28, 28, 34), (4, 4, 6)), accent=(255, 224, 0),
                     light=(255, 244, 150), deep=(190, 160, 0), darkest=(100, 80, 0), ink=(10, 10, 12),
                     danger=(255, 80, 80), ok=(60, 220, 120), grey=(150, 150, 160), panel=(30, 30, 36),
                     line=(110, 110, 120), track=(52, 52, 60), box=(0, 0, 0), foot=(180, 180, 190),
                     bokeh=((255, 224, 0), (255, 255, 255), (255, 244, 150))),
    "electric": dict(label="כחול וכתום", bg=((6, 20, 70), (20, 70, 190), (4, 12, 44)), accent=(255, 150, 30),
                     light=(255, 215, 150), deep=(200, 100, 10), darkest=(120, 55, 0), ink=(10, 24, 70),
                     danger=(255, 80, 100), ok=(60, 220, 160), grey=(140, 160, 210), panel=(16, 48, 130),
                     line=(80, 130, 230), track=(30, 70, 160), box=(3, 10, 40), foot=(170, 190, 235),
                     bokeh=((255, 150, 30), (120, 190, 255), (255, 215, 150))),
}
WHITE = (255, 255, 255)
PAL_NAME = os.environ.get("PALETTE", "brand")


def set_palette(name):
    """Load palette `name` into module globals (call before rendering frames)."""
    global PAL_NAME, PAL, NAVY_T, NAVY_M, NAVY_B, GOLD, RED, GREY, INK, LIGHT, DEEP, DARKEST, OKC
    global PANEL, LINE, TRACK, BOX, FOOT, BG, BOKEH
    PAL_NAME, PAL = name, PALETTES[name]
    NAVY_T, NAVY_M, NAVY_B = PAL["bg"]
    GOLD, RED, GREY, INK = PAL["accent"], PAL["danger"], PAL["grey"], PAL["ink"]
    LIGHT, DEEP, DARKEST, OKC = PAL["light"], PAL["deep"], PAL["darkest"], PAL["ok"]
    PANEL, LINE, TRACK, BOX, FOOT = PAL["panel"], PAL["line"], PAL["track"], PAL["box"], PAL["foot"]
    BG = make_bg()
    BOKEH = []
    rng = np.random.default_rng(3)
    for k in range(16):
        r = int(rng.integers(70, 190))
        BOKEH.append(dict(sprite=make_disc(r, PAL["bokeh"][k % 3], 0.16 if k % 3 == 0 else 0.13), r=r,
                          x=rng.uniform(0, W), y=rng.uniform(0, H), sp=rng.uniform(18, 55),
                          ph=rng.uniform(0, 6.28), amp=rng.uniform(20, 70)))

# ------------------------------------------------------------------ script
# text: on-screen subtitle, [[...]] = highlighted phrase.
# edge: plain Hebrew for the neural voice.  phon: espeak-ng phoneme string
# (the espeak Hebrew voice cannot read unpointed text, so we feed phonemes).
SCENES = [
    dict(key="hook",
         text="מכרתם נכס ב[[6 השנים האחרונות]]? ושילמתם מס שבח?",
         edge="מכרתם נכס בשש השנים האחרונות? ושילמתם מס שבח?",
         phon="[[makart'em n'exes b'eS haSan'im haaxaR'onot]]? [[veSilamt'em m'as S'evax]]?"),
    dict(key="max",
         text="בעת המכירה, רשות המיסים גובה את המקסימום. כברירת מחדל.",
         edge="בעת המכירה, רשות המיסים גובה את המקסימום. כברירת מחדל.",
         phon="[[b'a.et hamexiR'a]], [[R'aSut hamis'im gov'e et hamaksim'um]]. [[kviR'at maxd'al]]."),
    dict(key="change",
         text="והחישוב הזה קשיח. מי שלא פועל, משאיר את [[העודף שלכם]] בקופה של המדינה.",
         edge="והחישוב הזה קשיח. מי שלא פועל, משאיר את העודף שלכם בקופה של המדינה.",
         phon="[[vehaxiS'uv haz'e kaS'iax]]. [[mi Sel'o po'el]], [[maS'iR et ha'odef Selax'em]] [[bakup'a Sel hamedin'a]]."),
    dict(key="lock",
         text="הכסף שלכם. אבל אפשר למשוך אותו רק עד [[6 שנים אחורה]]. אחרי זה, הכסף אבוד.",
         edge="הכסף שלכם. אבל אפשר למשוך אותו רק עד שש שנים אחורה. אחרי זה, הכסף אבוד.",
         phon="[[hak'esef Selax'em]]. [[av'al efS'aR limS'ox ot'o R'ak 'ad S'eS San'im axoR'a]]. [[axaR'ei z'e]], [[hak'esef av'ud]]."),
    dict(key="free",
         text="הבדיקה אצלנו [[בחינם לגמרי]]. התשלום רק באחוזים מהכסף שחוזר בפועל. [[אפס סיכון]].",
         edge="הבדיקה אצלנו בחינם לגמרי. התשלום רק באחוזים מהכסף שחוזר בפועל. אפס סיכון.",
         phon="[[habdik'a etSel'enu bexin'am legamR'i]]. [[hatiSl'um R'ak ba'axuz'im mehak'esef Sexoz'eR bepo'al]]. [['efes sik'un]]."),
    dict(key="cta",
         text="לחצו על הלינק [[בביו]] ומלאו שאלון זכאות קצר.",
         edge="לחצו על הלינק בַּבִּיאוֹ, ומלאו שאלון זכאות קצר.",
         phon="[[lixts'u 'al halink babiy'o]], [[umil'u Seel'on zexa'ut kats'aR]]."),
]

# ---- Version B (A/B test): curiosity hook ("the state may owe you money") + tighter story.
SCENES_B = [
    dict(key="change",
         text="מכרתם נכס ב[[6 השנים האחרונות]]? ייתכן שהמדינה חייבת לכם כסף.",
         edge="מכרתם נכס בשש השנים האחרונות? ייתכן שהמדינה חייבת לכם כסף.", phon=""),
    dict(key="max",
         text="בעת המכירה רשות המיסים גובה את המקסימום. כברירת מחדל. והחישוב הזה קשיח.",
         edge="בעת המכירה רשות המיסים גובה את המקסימום. כברירת מחדל. והחישוב הזה קשיח.", phon=""),
    dict(key="lock",
         text="מי שלא פועל, משאיר את [[העודף שלכם]] אצל המדינה. ואפשר למשוך רק עד [[6 שנים אחורה]]. אחרי זה, הכסף אבוד.",
         edge="מי שלא פועל, משאיר את העודף שלכם אצל המדינה. ואפשר למשוך רק עד שש שנים אחורה. אחרי זה, הכסף אבוד.", phon=""),
    SCENES[4],
    SCENES[5],
]
VERSION = os.environ.get("SCRIPT", "A").upper()
if VERSION == "B":
    SCENES = SCENES_B
# CTA=ad -> paid-ad flavour: points at the ad's button instead of "link in bio"
AD = os.environ.get("CTA", "bio").lower() == "ad"
if AD:
    SCENES = SCENES[:-1] + [dict(key="cta",
        text="לחצו על [[הכפתור למטה]] ומלאו שאלון זכאות קצר.",
        edge="לחצו על הכפתור למטה, ומלאו שאלון זכאות קצר.", phon="")]

LEAD_IN, GAP, TAIL = 0.35, 0.18, 1.3
SPEED = 1.2  # global tempo of the narration (pitch preserved)


# ------------------------------------------------------------------- utils
def sh(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_back(x):
    x = clamp(x)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * clamp(t)) for i in range(3))


def wav_read(path):
    with wave.open(path) as w:
        n, ch = w.getnframes(), w.getnchannels()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    return a.reshape(-1, ch).mean(axis=1)


def wav_write(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], axis=1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


# --------------------------------------------------------------------- TTS
async def _edge(text, mp3, rate="+12%", pitch="+0Hz", volume="+0%"):
    import edge_tts, ssl, aiohttp
    kw = {}
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:  # sandbox/corporate proxy: route through it and trust its CA bundle
        kw["proxy"] = proxy
        ca = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"
        if os.path.exists(ca):
            kw["connector"] = aiohttp.TCPConnector(ssl=ssl.create_default_context(cafile=ca))
    c = edge_tts.Communicate(text, "he-IL-HilaNeural", rate=rate, pitch=pitch, volume=volume, **kw)
    await asyncio.wait_for(c.save(mp3), timeout=25)


def wav_write_mono(path, x):
    wav_write(path, x)


def trim_silence(a, thr=0.0025, pad=0.09):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    i0, i1 = max(0, idx[0] - int(pad * SR)), min(len(a), idx[-1] + int(pad * SR))
    return a[i0:i1]


def humanize(src, dst):
    """Studio-style polish: warmth, presence, de-ess, gentle compression, tiny room."""
    sh("ffmpeg", "-y", "-i", src, "-af",
       "highpass=f=75,"
       "equalizer=f=180:t=q:w=1:g=2.5,"      # warmth
       "equalizer=f=3200:t=q:w=1.2:g=1.8,"   # presence / clarity
       "deesser=i=0.12:m=0.4:f=0.55,"
       "acompressor=threshold=0.12:ratio=2.2:attack=15:release=180:makeup=1.6,"
       "aecho=0.85:0.9:38|71:0.10|0.05,"     # very light room tone
       "lowpass=f=14000",
       dst)


# Pronunciation hints for the neural voice (niqqud on words it tends to misread).
# Only the spoken text is changed; on-screen subtitles stay unpointed.
PRON = {
    "בביו": "בַּבִּיאוֹ",  # add entries here only for words verified to be misread
}


def pronounce(text):
    import re
    return re.sub(r"[\u05d0-\u05ea]+", lambda m: PRON.get(m.group(0), m.group(0)), text)


def edge_scene(i, text):
    text = pronounce(text)
    """Synthesize sentence by sentence: questions rise, endings fall, natural pauses."""
    import re
    sents = [t.strip() for t in re.split(r"(?<=[.?!])\s+", text) if t.strip()]
    parts = []
    for k, t in enumerate(sents):
        last = k == len(sents) - 1
        q = t.endswith("?")
        rate = 12 - (4 if last else 0) - (2 if q else 0)
        pitch = (2 if q else 0) + (-3 if last and not q else 0) + (1 if k == 0 and not q else 0)
        mp3 = os.path.join(WORK, f"vo_{i}_{k}.mp3")
        asyncio.run(_edge(t, mp3, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz"))
        wav = mp3.replace(".mp3", ".wav")
        sh("ffmpeg", "-y", "-i", mp3, "-ar", str(SR), "-ac", "1", wav)
        a = trim_silence(wav_read(wav))
        a = a / (np.abs(a).max() + 1e-9) * 0.9
        parts.append(a)
        if not last:
            pause = 0.38 if q else 0.28 if t.endswith(".") else 0.15
            parts.append(np.zeros(int(pause * SR)))
    joined = np.concatenate(parts)
    tmp_in, tmp_out = os.path.join(WORK, f"j_{i}.wav"), os.path.join(WORK, f"h_{i}.wav")
    wav_write(tmp_in, joined)
    humanize(tmp_in, tmp_out)
    return wav_read(tmp_out)


def external_voice(n):
    """Use narration recorded elsewhere (e.g. ElevenLabs) instead of built-in TTS.
    Option 1: video/voice/1.mp3 ... N.mp3 (one file per scene, any audio format).
    Option 2: a single file video/voice/voice.<ext>; it is split into N scenes at its N-1 longest pauses.
    Returns a list of N float arrays, or None if no external voice is present."""
    import glob
    vdir = os.path.join(HERE, "voice")
    if not os.path.isdir(vdir):
        return None
    def load(f):
        tmp = os.path.join(WORK, "ext_" + os.path.basename(f) + ".wav")
        sh("ffmpeg", "-y", "-i", f, "-ar", str(SR), "-ac", "1", tmp)
        return wav_read(tmp)
    per = [next(iter(glob.glob(os.path.join(vdir, f"{i + 1}.*"))), None) for i in range(n)]
    if all(per):
        return [trim_silence(load(f)) for f in per]
    single = [f for f in glob.glob(os.path.join(vdir, "voice.*"))]
    if not single:
        return None
    a = load(single[0])
    win = int(0.02 * SR)
    env = np.array([np.abs(a[i:i + win]).max() for i in range(0, len(a) - win, win)])
    quiet = env < max(0.004, env.max() * 0.02)
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet):          # ignore leading/trailing silence
                runs.append((j - i, i, j))
            i = j
        else:
            i += 1
    if len(runs) < n - 1:
        raise SystemExit(f"voice.* has only {len(runs)} pauses but {n} scenes are needed: "
                         "leave a clear pause (about 0.5s) between scenes, or provide 1.mp3..N.mp3")
    cuts = sorted(sorted(runs, reverse=True)[: n - 1], key=lambda r: r[1])
    bounds = [0] + [((r[1] + r[2]) // 2) * win for r in cuts] + [len(a)]
    return [trim_silence(a[bounds[k]:bounds[k + 1]]) for k in range(n)]


def tts_all():
    os.makedirs(WORK, exist_ok=True)
    ext = external_voice(len(SCENES))
    if ext is not None:
        print("TTS: external voice from video/voice/")
        return [c / (np.abs(c).max() + 1e-9) * 0.92 for c in ext]
    mode = os.environ.get("TTS", "auto")
    use_edge = mode in ("auto", "edge")
    paths = []
    paths_are_edge = False
    if use_edge:
        try:
            for i, sc in enumerate(SCENES):
                raw = os.path.join(WORK, f"vo_{i}.wav")
                wav_write_mono(raw, edge_scene(i, sc["edge"]))
                paths.append(raw)
            paths_are_edge = True
            print("TTS: edge-tts (he-IL-HilaNeural, female)")
        except Exception as e:
            if mode == "edge":
                raise
            print(f"edge-tts unavailable ({type(e).__name__}); falling back to espeak-ng")
            paths = []
    if not paths:
        print("TTS: espeak-ng Hebrew (offline fallback)")
        for i, s in enumerate(SCENES):
            raw = os.path.join(WORK, f"vo_raw_{i}.wav")
            sh("espeak-ng", "-v", "he", "-s", "172", "-p", "30", "-a", "190", "-g", "2",
               "-w", raw, s["phon"])
            out = os.path.join(WORK, f"vo_{i}.wav")
            sh("ffmpeg", "-y", "-i", raw, "-ar", str(SR), "-ac", "1", "-af",
               "highpass=f=90,lowpass=f=7000,acompressor=threshold=0.1:ratio=3,"
               "silenceremove=start_periods=1:start_threshold=-45dB",
               out)
            paths.append(out)
    # normalise loudness per clip (and speed up by SPEED, pitch preserved)
    clips = []
    for p in paths:
        if not paths_are_edge:  # offline fallback voice only; the neural voice is already paced natively
            fast = p.replace(".wav", "_fast.wav")
            sh("ffmpeg", "-y", "-i", p, "-af", f"atempo={SPEED}", fast)
            p = fast
        a = wav_read(p)
        a = a / (np.abs(a).max() + 1e-9) * 0.92
        clips.append(a)
    return clips


# ------------------------------------------------------------------- music
def synth_music(T):
    n = int(T * SR)
    out = np.zeros(n, dtype=np.float64)
    rng = np.random.default_rng(7)
    beat = 0.5  # 120 bpm

    def add(start, w, g=1.0):
        i = int(start * SR)
        if i >= n:
            return
        j = min(n, i + len(w))
        out[i:j] += w[: j - i] * g

    def tt(d):
        return np.arange(int(d * SR)) / SR

    def kick():
        t = tt(0.28)
        ph = 2 * np.pi * (46 * t + (95 / 28) * (1 - np.exp(-28 * t)))
        return np.sin(ph) * np.exp(-t * 9)

    def clap():
        t = tt(0.22)
        nz = rng.standard_normal(len(t))
        nz = np.diff(nz, prepend=0)
        return nz * (np.exp(-t * 26) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 30) * (t > 0.012))

    def hat(op=0.05):
        t = tt(op)
        return np.diff(rng.standard_normal(len(t)), prepend=0) * np.exp(-t * 90)

    def pluck(f, d=0.3):
        t = tt(d)
        w = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) + 0.2 * np.sin(6 * np.pi * f * t)
        return w * np.exp(-t * 11) * np.minimum(1, t * 400)

    def bass(f, d=0.24):
        t = tt(d)
        return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 7) * np.minimum(1, t * 300)

    def pad(freqs, d):
        t = tt(d)
        env = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
        return sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 1.004 * t) for f in freqs) * env

    # Am - F - C - G
    prog = [
        (110.00, [220.00, 261.63, 329.63, 440.00]),
        (87.31,  [174.61, 261.63, 349.23, 440.00]),
        (130.81, [196.00, 261.63, 329.63, 392.00]),
        (98.00,  [196.00, 246.94, 293.66, 392.00]),
    ]
    bars = int(T / (4 * beat)) + 1
    K, C, Hh = kick(), clap(), hat()
    arp_pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for b in range(bars):
        root, ch = prog[b % 4]
        t0 = b * 4 * beat
        add(t0, pad(ch[:3], 4 * beat), 0.045)
        for k in range(4):
            tb = t0 + k * beat
            if tb >= 0.5:
                add(tb, K, 0.95)
            if k in (1, 3) and tb >= 1.0:
                add(tb, C, 0.30)
            for h in range(2):
                th = tb + h * beat / 2
                if th >= 0.5:
                    add(th, Hh, 0.20 if h else 0.11)
            for e in range(2):
                tb8 = tb + e * beat / 2
                add(tb8, bass(root * (2 if (k + e) % 2 else 1)), 0.55)
            for s in range(4):
                ts = tb + s * beat / 4
                idx = arp_pat[(k * 2 + s) % 8]
                add(ts, pluck(ch[idx] * 2, 0.22), 0.10)
    out = out[:n]
    fade = int(1.4 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    out /= np.abs(out).max() + 1e-9
    return out


def mix_audio(clips, starts, T):
    n = int(T * SR)
    voice = np.zeros(n)
    mask = np.zeros(n)
    for a, s in zip(clips, starts):
        i = int(s * SR)
        voice[i:i + len(a)] += a[: n - i]
        mask[i:i + len(a)] = 1.0
    # smooth ducking envelope: fast attack, slower release
    k_att, k_rel = int(0.08 * SR), int(0.45 * SR)
    env = np.convolve(mask, np.ones(k_att) / k_att, mode="same")
    env = np.maximum(env, np.convolve(mask, np.ones(k_rel) / k_rel, mode="same") * 1.0)
    env = np.clip(env * 1.4, 0, 1)
    music = synth_music(T)
    music = music / (np.sqrt((music ** 2).mean()) + 1e-9) * 0.085   # base RMS
    music *= 1 - 0.58 * env                                          # duck under voice
    mix = voice * 0.95 + music
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    return mix * 0.94


# ------------------------------------------------------------------ visuals
_fcache = {}


def font(size):
    size = int(size)
    if size not in _fcache:
        f = ImageFont.truetype(FONT_PATH, size, layout_engine=ImageFont.Layout.BASIC)
        try:
            f.set_variation_by_axes([900])
        except Exception:
            pass
        _fcache[size] = f
    return _fcache[size]


def disp(w):
    return get_display(w, base_dir="R")


def tw(d, s, f):
    return d.textlength(s, font=f)


def draw_rtl(d, words, cx, y, f, colors, stroke=0, stroke_fill=(0, 0, 0)):
    """words logical order; drawn right-to-left, centred on cx, baseline y."""
    space = tw(d, " ", f) * 1.0 + 6
    ws = [tw(d, disp(w), f) for w in words]
    total = sum(ws) + space * (len(words) - 1)
    x = cx + total / 2
    for w, wd, c in zip(words, ws, colors):
        x -= wd
        d.text((x, y), disp(w), font=f, fill=c, anchor="ls", stroke_width=stroke, stroke_fill=stroke_fill)
        x -= space
    return total


def text_c(d, s, cx, cy, size, fill, rtl=True, stroke=0, stroke_fill=(0, 0, 0)):
    f = font(size)
    s2 = disp(s) if rtl else s
    d.text((cx, cy), s2, font=f, fill=fill, anchor="mm", stroke_width=stroke, stroke_fill=stroke_fill)


def make_bg():
    ys = np.linspace(0, 1, H)[:, None]
    top = np.array(NAVY_T, dtype=np.float32); mid = np.array(NAVY_M, dtype=np.float32); bot = np.array(NAVY_B, dtype=np.float32)
    col = np.where(ys < 0.45, top + (mid - top) * (ys / 0.45), mid + (bot - mid) * ((ys - 0.45) / 0.55))
    img = np.broadcast_to(col[:, None, :], (H, W, 3)).astype(np.uint8)
    return Image.fromarray(img.copy(), "RGB")


def make_disc(r, color, a):
    yy, xx = np.mgrid[-r:r, -r:r]
    rr = np.sqrt(xx ** 2 + yy ** 2) / r
    m = (np.clip(1 - rr, 0, 1) ** 1.6 * a * 255).astype(np.uint8)
    return Image.new("RGB", (2 * r, 2 * r), color), Image.fromarray(m, "L")


set_palette(PAL_NAME)


def draw_background(frame, t):
    frame.paste(BG, (0, 0))
    for b in BOKEH:
        y = (b["y"] - b["sp"] * t) % (H + 2 * b["r"]) - b["r"]
        x = b["x"] + b["amp"] * math.sin(t * 0.6 + b["ph"]) - b["r"]
        img, mask = b["sprite"]
        frame.paste(img, (int(x), int(y) - b["r"]), mask)


def pill(d, cx, cy, w, h, fill, outline=None, ow=0):
    d.rounded_rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), radius=h / 2, fill=fill, outline=outline, width=ow)


def coin(d, cx, cy, r):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GOLD, outline=DEEP, width=6)
    d.ellipse((cx - r * .74, cy - r * .74, cx + r * .74, cy + r * .74), outline=DEEP, width=4)
    text_c(d, "₪", cx, cy - 2, int(r * 1.0), DARKEST, rtl=False)


def star(d, cx, cy, r, color):
    d.polygon([(cx, cy - r), (cx + r * .25, cy - r * .25), (cx + r, cy), (cx + r * .25, cy + r * .25),
               (cx, cy + r), (cx - r * .25, cy + r * .25), (cx - r, cy), (cx - r * .25, cy - r * .25)], fill=color)


def lock(d, cx, cy, closed, s=1.0, color=None):
    color = color or GOLD
    bw, bh = 240 * s, 190 * s
    sh_r = 80 * s
    lift = 0 if closed else 46 * s
    d.arc((cx - sh_r, cy - bh / 2 - sh_r * 1.5 - lift, cx + sh_r, cy - bh / 2 + sh_r * 0.5 - lift), 180, 360, fill=color, width=int(34 * s))
    d.line((cx - sh_r + 2, cy - bh / 2 - sh_r * .5 - lift, cx - sh_r + 2, cy - bh / 2 + (0 if closed else -lift + 10)), fill=color, width=int(34 * s))
    if closed:
        d.line((cx + sh_r - 2, cy - bh / 2 - sh_r * .5, cx + sh_r - 2, cy - bh / 2), fill=color, width=int(34 * s))
    d.rounded_rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), radius=30 * s, fill=color)
    d.ellipse((cx - 22 * s, cy - 36 * s, cx + 22 * s, cy + 8 * s), fill=INK)
    d.rectangle((cx - 10 * s, cy - 6 * s, cx + 10 * s, cy + 52 * s), fill=INK)


# ---- per-scene illustrations: f(frame, d, lt, dur, ov_d, ov)
def v_hook(fr, d, lt, dur):
    cx, cy, R = 540, 880, 270
    pop = ease_back(lt / 0.5)
    r = R * pop
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=TRACK, width=44)
    sweep = ease_out(lt / (dur * 0.85))
    d.arc((cx - r, cy - r, cx + r, cy + r), -90, -90 + 360 * sweep, fill=GOLD, width=44)
    if pop > 0.3:
        text_c(d, "6", cx, cy - 40, 400, GOLD, rtl=False, stroke=6, stroke_fill=DARKEST)
        text_c(d, "שנים", cx, cy + 160, 84, WHITE)
    # house
    hy = 470 - 20 * (1 - ease_out(lt / 0.6))
    d.polygon([(cx - 135, hy + 60), (cx, hy - 50), (cx + 135, hy + 60)], fill=GOLD)
    d.rectangle((cx - 95, hy + 60, cx + 95, hy + 170), fill=WHITE)
    d.rectangle((cx - 24, hy + 100, cx + 24, hy + 170), fill=NAVY_M)
    d.rectangle((cx + 52, hy + 85, cx + 82, hy + 115), fill=NAVY_M)


def v_max(fr, d, lt, dur):
    e = ease_out(lt / 1.8)
    col = lerp(GOLD, RED, e)
    text_c(d, "מס שבח שנגבה", 540, 560, 70, WHITE)
    text_c(d, f"{int(round(100 * e))}%", 540, 770, 330, col, rtl=False, stroke=6, stroke_fill=(30, 10, 10))
    x0, x1, y0, y1 = 140, 940, 940, 1030
    d.rounded_rectangle((x0, y0, x1, y1), radius=45, fill=PANEL, outline=LINE, width=4)
    if e > 0.02:
        d.rounded_rectangle((x1 - (x1 - x0) * e, y0, x1, y1), radius=45, fill=col)
    if e >= 0.98:
        flash = 0.5 + 0.5 * math.sin(lt * 9)
        pill(d, 540, 1130, 480, 96, lerp(RED, (255, 140, 140), flash * 0.5))
        text_c(d, "מקסימום", 540, 1130, 64, WHITE)


def v_change(fr, d, lt, dur):
    x0, y0, x1, y1 = 170, 600, 910, 1080
    d.rounded_rectangle((x0, y0, x1, y1), radius=60, fill=PANEL, outline=GOLD, width=8)
    text_c(d, "קופת המדינה", 540, 535, 68, WHITE)
    rows = [(5, 1010), (4, 950), (3, 890), (2, 830), (1, 770)]
    pts = []
    for cnt, y in rows:
        for k in range(cnt):
            pts.append((540 + (k - (cnt - 1) / 2) * 118, y))
    n = int(clamp(lt / (dur * 0.7)) * len(pts))
    for i, (px, py) in enumerate(pts[:n]):
        coin(d, px, py, 54)
    for k in range(5):
        a = lt * 1.3 + k * 1.26
        star(d, 540 + 400 * math.cos(a), 840 + 280 * math.sin(a), 20 + 8 * math.sin(lt * 5 + k), LIGHT)
    if lt > dur * 0.35:
        s = ease_back((lt - dur * 0.35) / 0.4)
        bob = 10 * math.sin(lt * 5)
        pill(d, 540, 1230 + bob, 700 * s, 130 * s, GOLD)
        if s > 0.7:
            text_c(d, "העודף שלכם", 540, 1230 + bob, 84, INK)
            d.polygon([(540 - 34, 1156 + bob), (540 + 34, 1156 + bob), (540, 1110 + bob)], fill=GOLD)


def v_lock(fr, d, lt, dur):
    n = 7
    bw, gap = 112, 12
    total = n * bw + (n - 1) * gap
    xr = 540 + total / 2
    y0, y1 = 820, 960
    t_lock = dur * 0.62
    closed = lt >= t_lock
    for i in range(n):
        x1 = xr - i * (bw + gap)
        x0 = x1 - bw
        if i < 6:
            ap = ease_back((lt - 0.12 - i * 0.28) / 0.35)
            if ap <= 0:
                continue
            h = (y1 - y0) * ap
            cy = (y0 + y1) / 2
            d.rounded_rectangle((x0, cy - h / 2, x1, cy + h / 2), radius=22, fill=GOLD)
            if ap > 0.8:
                text_c(d, str(i + 1), (x0 + x1) / 2, cy, 86, INK, rtl=False)
        else:
            ap = ease_out((lt - 0.12 - 6 * 0.28) / 0.3)
            if ap > 0:
                fill = lerp(PANEL, (70, 40, 55), 1 if closed else 0)
                d.rounded_rectangle((x0, y0, x1, y1), radius=22, fill=fill, outline=GREY, width=4)
                text_c(d, "7+", (x0 + x1) / 2, (y0 + y1) / 2, 70, GREY if not closed else RED, rtl=False)
    shake = 8 * math.sin((lt - t_lock) * 50) * max(0, 1 - (lt - t_lock) * 4) if closed else 0
    col = RED if closed else GOLD
    lock(d, 540 + shake, 540, closed, 1.15, col)
    text_c(d, "ניתן למשוך עד 6 שנים", 540, 1080, 64, WHITE)
    if closed:
        s = ease_back((lt - t_lock) / 0.35)
        pill(d, 540, 1190, 380 * s, 100 * s, RED)
        if s > 0.7:
            text_c(d, "אחר כך: אבוד", 540, 1190, 58, WHITE)


def v_free(fr, d, lt, dur):
    cx, cy = 540, 780
    s = ease_back(lt / 0.55)
    R = 255 * s
    d.ellipse((cx - R - 24, cy - R - 24, cx + R + 24, cy + R + 24), outline=LIGHT, width=8)
    d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=GOLD)
    if s > 0.6:
        text_c(d, "₪0", cx, cy - 10, 290, INK, rtl=False)
    for k in range(6):
        a = lt * 1.1 + k * math.pi / 3
        star(d, cx + 360 * math.cos(a), cy + 360 * math.sin(a), 22, LIGHT)
    if lt > 1.3:
        p = ease_back((lt - 1.3) / 0.4)
        pill(d, 540, 1160, 900 * p, 130 * p, WHITE)
        if p > 0.75:
            text_c(d, "תשלום רק באחוזים מההחזר", 540, 1160, 58, INK)
    if lt > dur * 0.78:
        p = ease_back((lt - dur * 0.78) / 0.4)
        pill(d, 540, 1330, 520 * p, 100 * p, OKC)
        if p > 0.75:
            text_c(d, "אפס סיכון", 540, 1330, 62, WHITE)


def v_cta_ad(fr, d, lt, dur, ov):
    pulse = 1 + 0.045 * math.sin(lt * 6)
    bob = 18 * math.sin(lt * 5)
    pill(d, 540, 700, 880 * pulse, 190 * pulse, GOLD)
    text_c(d, "לחצו כאן", 540, 700, int(112 * pulse), INK)
    text_c(d, "שאלון זכאות קצר", 540, 880, 76, WHITE)
    ax, ay = 540, 1090 + bob   # arrow pointing down at the ad button
    d.polygon([(ax, ay + 110), (ax + 110, ay - 20), (ax + 45, ay - 20), (ax + 45, ay - 110),
               (ax - 45, ay - 110), (ax - 45, ay - 20), (ax - 110, ay - 20)], fill=GOLD)


def v_cta(fr, d, lt, dur, ov):
    if AD:
        return v_cta_ad(fr, d, lt, dur, ov)
    return v_cta_bio(fr, d, lt, dur, ov)


def v_cta_bio(fr, d, lt, dur, ov):
    pulse = 1 + 0.045 * math.sin(lt * 6)
    bob = 18 * math.sin(lt * 5)
    ax, ay = 540, 560 + bob
    d.polygon([(ax, ay - 110), (ax + 110, ay + 20), (ax + 45, ay + 20), (ax + 45, ay + 110), (ax - 45, ay + 110), (ax - 45, ay + 20), (ax - 110, ay + 20)], fill=GOLD)
    for k in range(2):
        rp = ((lt * 0.9 + k * 0.5) % 1.0)
        rr = 1 + rp * 0.35
        ov.rounded_rectangle((540 - 440 * rr, 900 - 95 * rr, 540 + 440 * rr, 900 + 95 * rr), radius=95 * rr,
                             outline=GOLD + (int(160 * (1 - rp)),), width=6)
    w, h = 880 * pulse, 190 * pulse
    pill(d, 540, 900, w, h, GOLD)
    text_c(d, "הלינק בביו", 540, 900, int(108 * pulse), INK)
    text_c(d, "שאלון זכאות קצר", 540, 1090, 76, WHITE)


VISUALS = dict(hook=v_hook, max=v_max, change=v_change, lock=v_lock, free=v_free, cta=v_cta)


# --------------------------------------------------------------- subtitles
def parse_words(text):
    """returns [(word, highlighted)] ; supports prefix letters glued to [[...]] (e.g. ב[[6 ...]])."""
    out, hl, buf = [], False, ""
    toks = []
    i = 0
    while i < len(text):
        if text.startswith("[[", i):
            hl = True; i += 2; continue
        if text.startswith("]]", i):
            hl = False; i += 2; continue
        toks.append((text[i], hl)); i += 1
    cur, cur_hl = "", False
    for ch, h in toks:
        if ch == " ":
            if cur:
                out.append((cur, cur_hl)); cur, cur_hl = "", False
            continue
        cur += ch
        cur_hl = cur_hl or h
    if cur:
        out.append((cur, cur_hl))
    # prefix letter glued to a highlighted token -> "ב6": split with hyphen
    fixed = []
    for w, h in out:
        if h and w[0] in "בלכמוה" and len(w) > 1 and w[1].isdigit():
            w = w[0] + "-" + w[1:]
        fixed.append((w, h))
    return fixed


def build_chunks(starts, durs):
    chunks = []
    for i, s in enumerate(SCENES):
        words = parse_words(s["text"])
        groups, cur = [], []
        for w, h in words:
            cur.append((w, h))
            end_p = w[-1] in ".?,!"
            if len(cur) >= 3 or end_p or sum(len(x) for x, _ in cur) >= 13:
                groups.append(cur); cur = []
        if cur:
            groups.append(cur)
        # merge tiny trailing groups
        merged = []
        for g in groups:
            if merged and len(g) == 1 and len(merged[-1]) < 3 and merged[-1][-1][0][-1] not in ".?":
                merged[-1] += g
            else:
                merged.append(g)
        weights = [sum(len(w) + 2 for w, _ in g) + (2 if g[-1][0][-1] in ".?," else 0) for g in merged]
        tot = sum(weights)
        t = starts[i]
        for g, wgt in zip(merged, weights):
            dd = durs[i] * wgt / tot
            chunks.append((t, t + dd, g))
            t += dd
    return chunks


# --------------------------------------------------------------- frame gen
class Renderer:
    def __init__(self, starts, durs, vis_starts, total, chunks):
        self.starts, self.durs, self.vs, self.total, self.chunks = starts, durs, vis_starts, total, chunks

    def scene_at(self, t):
        idx = 0
        for i, v in enumerate(self.vs):
            if t >= v:
                idx = i
        return idx

    def frame(self, t):
        fr = Image.new("RGB", (W, H))
        draw_background(fr, t)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        # header
        od.rounded_rectangle((90, 100, 990, 210), radius=55, fill=BOX + (175,), outline=GOLD + (255,), width=4)
        fr.paste(ov, (0, 0), ov)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        d = ImageDraw.Draw(fr)
        text_c(d, "בדיקת זכאות להחזר מס שבח", 540, 156, 56, GOLD)
        # scene visual
        i = self.scene_at(t)
        lt = t - self.vs[i]
        end = self.vs[i + 1] if i + 1 < len(self.vs) else self.total
        dur = max(0.5, end - self.vs[i])
        fn = VISUALS[SCENES[i]["key"]]
        if SCENES[i]["key"] == "cta":
            fn(fr, d, lt, dur, od)
        else:
            fn(fr, d, lt, dur)
        # subtitles
        cur = None
        for c in self.chunks:
            if c[0] <= t < c[1] + 0.12:
                cur = c
        if cur is not None:
            t0, t1, g = cur
            sc = 0.86 + 0.14 * ease_back((t - t0) / 0.16)
            size = int(104 * sc)
            f = font(size)
            space = d.textlength(" ", font=f) + 6
            lines, line = [], []
            for w, h in g:
                trial = line + [(w, h)]
                width = sum(d.textlength(disp(x), font=f) for x, _ in trial) + space * (len(trial) - 1)
                if width > 940 and line:
                    lines.append(line); line = [(w, h)]
                else:
                    line = trial
            lines.append(line)
            lh = int(size * 1.28)
            top = 1500 - lh * len(lines) / 2 - 20
            od.rounded_rectangle((40, top, 1040, top + lh * len(lines) + 60), radius=50, fill=BOX + (175,))
            fr.paste(ov, (0, 0), ov)
            d = ImageDraw.Draw(fr)
            y = top + 30 + size
            for ln in lines:
                draw_rtl(d, [w for w, _ in ln], 540, y, f, [GOLD if h else WHITE for _, h in ln], stroke=7)
                y += lh
        else:
            fr.paste(ov, (0, 0), ov)
        d = ImageDraw.Draw(fr)
        # footer
        text_c(d, "*בכפוף לבדיקת זכאות אישית", 540, 1830, 36, FOOT)
        return np.asarray(fr)


# -------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, f"teaser_{VERSION}{'_ad' if AD else ''}.mp4" if (VERSION != "A" or AD) else "teaser.mp4"))
    ap.add_argument("--preview", type=float, default=None, help="render only first N seconds")
    args = ap.parse_args()

    set_palette(PAL_NAME)
    clips = tts_all()
    durs = [len(c) / SR for c in clips]
    gap = GAP
    total_voice = sum(durs)
    total = LEAD_IN + total_voice + gap * (len(clips) - 1) + TAIL
    if total > MAX_SECONDS:
        gap = max(0.12, (MAX_SECONDS - LEAD_IN - total_voice - TAIL) / (len(clips) - 1))
        total = LEAD_IN + total_voice + gap * (len(clips) - 1) + TAIL
    assert total <= MAX_SECONDS + 1e-6, f"video would be {total:.1f}s > {MAX_SECONDS}s: shorten the script"
    starts, t = [], LEAD_IN
    for d_ in durs:
        starts.append(t); t += d_ + gap
    vis_starts = [0.0] + [s - gap * 0.4 for s in starts[1:]]
    print(f"voice {total_voice:.1f}s, total {total:.1f}s, starts {[round(s, 1) for s in starts]}")

    audio = mix_audio(clips, starts, total)
    apath = os.path.join(WORK, "mix.wav")
    wav_write(apath, audio)

    chunks = build_chunks(starts, durs)
    R = Renderer(starts, durs, vis_starts, total, chunks)

    from moviepy import VideoClip, AudioFileClip
    dur = args.preview or total
    vid = VideoClip(lambda tt: R.frame(tt), duration=dur).with_fps(FPS)
    aud = AudioFileClip(apath)
    if args.preview:
        aud = aud.subclipped(0, args.preview)
    vid = vid.with_audio(aud)
    vid.write_videofile(args.out, fps=FPS, codec="libx264", audio_codec="aac", audio_bitrate="192k",
                        preset="medium", bitrate="3500k",
                        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"], logger="bar")
    print("wrote", args.out)


if __name__ == "__main__":
    main()
