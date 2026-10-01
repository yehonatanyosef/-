/* Text-to-speech and speech recognition built on the Web Speech API. */

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  const v = speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

const PREFERRED = ['Google US English', 'Samantha', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Daniel'];

function voiceFor(lang: 'en' | 'he'): SpeechSynthesisVoice | undefined {
  const voices = loadVoices();
  if (lang === 'he') return voices.find((v) => v.lang.startsWith('he') || v.lang.startsWith('iw'));
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en'));
}

export function canSpeak(): boolean {
  return typeof speechSynthesis !== 'undefined';
}

export function hasHebrewVoice(): boolean {
  return !!voiceFor('he');
}

let rate = 0.85;
export function setSpeechRate(r: number) {
  rate = r;
}

export function speak(text: string, opts: { lang?: 'en' | 'he'; slow?: boolean } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve();
    const lang = opts.lang ?? 'en';
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = voiceFor(lang);
    if (voice) u.voice = voice;
    u.lang = lang === 'he' ? 'he-IL' : 'en-US';
    u.rate = opts.slow ? Math.max(0.5, rate - 0.3) : rate;
    u.pitch = 1.1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
    // Safety net – some browsers never fire onend.
    setTimeout(resolve, 600 + text.length * 120);
  });
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel();
}

/* ---------- Recognition ---------- */

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecognize(): boolean {
  return typeof window !== 'undefined' && !!recognitionCtor();
}

export interface ListenHandle {
  promise: Promise<string[]>;
  stop: () => void;
}

/** Listens once and resolves with the recognised alternatives (lower-cased). Rejects with an error code. */
export function listen(timeoutMs = 6000): ListenHandle {
  const Ctor = recognitionCtor();
  if (!Ctor) return { promise: Promise.reject(new Error('unsupported')), stop: () => {} };
  stopSpeaking();
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  rec.continuous = false;
  let timer: ReturnType<typeof setTimeout>;
  const promise = new Promise<string[]>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts: string[] = [];
      const first = e.results[0];
      for (let i = 0; i < first.length; i++) alts.push(first[i].transcript.toLowerCase().trim());
      resolve(alts);
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      clearTimeout(timer);
      if (!done) resolve([]);
    };
    try {
      rec.start();
    } catch (err) {
      reject(err as Error);
    }
    timer = setTimeout(() => rec.stop(), timeoutMs);
  });
  return { promise, stop: () => rec.stop() };
}

/* ---------- Matching ---------- */

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

const NUMBER_WORDS: Record<string, string> = {
  '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
};

/** Lenient check whether a recognised phrase matches the target word or sentence. */
export function matchesSpeech(alternatives: string[], target: string): boolean {
  const t = normalize(target);
  const tWords = t.split(' ');
  return alternatives.some((alt) => {
    const words = normalize(alt).split(' ').map((w) => NUMBER_WORDS[w] ?? w);
    const a = words.join(' ');
    if (a === t || a.includes(t)) return true;
    if (tWords.length === 1) {
      const tol = t.length <= 4 ? 1 : 2;
      return words.some((w) => levenshtein(w, t) <= tol);
    }
    const hits = tWords.filter((tw) => words.some((w) => w === tw || (tw.length > 3 && levenshtein(w, tw) <= 1))).length;
    return hits / tWords.length >= 0.7;
  });
}
