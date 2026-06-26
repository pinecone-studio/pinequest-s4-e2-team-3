// Thin wrapper around the browser Web Speech API for the Live Guide.
//   - speak():  text-to-speech (Michelle narrating / answering)         [output]
//   - createListener(): speech-to-text (you talking back)           [input]
//
// Everything feature-detects and degrades gracefully so the UI can hide voice
// controls when a browser (notably some iOS/Safari builds) doesn't support it.

export const ttsSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const sttSupported = (): boolean =>
  typeof window !== "undefined" &&
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

export interface SpeakOptions {
  lang?: string; // BCP-47, e.g. "en-US"
  rate?: number; // 0.1–10, default ~1
  pitch?: number; // 0–2, default 1
  onStart?: () => void;
  onEnd?: () => void;
}

// Browser default voices sound robotic. These name hints match the natural /
// neural voices shipped by Chrome (Google …), Edge/Windows (… Natural, Aria,
// Jenny, Guy) and macOS (Samantha, Ava), in rough order of preference.
const NATURAL_VOICE_HINT =
  /natural|neural|google|aria|jenny|guy|libby|sonia|ava|samantha|enhanced|premium/i;

// Pick the best-sounding installed voice for a language, falling back sensibly.
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const base = lang.split("-")[0].toLowerCase();
  const sameLang = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = sameLang.length ? sameLang : voices;

  return (
    pool.find((v) => NATURAL_VOICE_HINT.test(v.name)) ?? // natural/neural voice
    pool.find((v) => v.default) ?? // the OS default for the language
    pool[0] ??
    null
  );
}

// Voices load asynchronously in some browsers — prime them on first import so a
// good voice is ready by the time we narrate.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

// Speak a string aloud. Cancels anything currently being spoken first so the
// guide never talks over itself when stops change quickly.
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!ttsSupported() || !text) return;

  window.speechSynthesis.cancel();

  const lang = opts.lang ?? "en-US";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  // Slightly slower + natural pitch reads as calmer and less robotic.
  utterance.rate = opts.rate ?? 0.95;
  utterance.pitch = opts.pitch ?? 1.05;

  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;

  if (opts.onStart) utterance.onstart = opts.onStart;
  if (opts.onEnd) {
    utterance.onend = opts.onEnd;
    utterance.onerror = opts.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

export interface Listener {
  start: () => void;
  stop: () => void;
}

export interface ListenHandlers {
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
  lang?: string;
}

// Create a one-shot speech recogniser. Returns null if unsupported so callers
// can fall back to the text input.
export function createListener(handlers: ListenHandlers): Listener | null {
  if (!sttSupported()) return null;

  const Ctor =
    (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
      .webkitSpeechRecognition;

  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = handlers.lang ?? "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) handlers.onResult(transcript);
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) =>
    handlers.onError?.(event.error);
  if (handlers.onEnd) recognition.onend = handlers.onEnd;

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}
