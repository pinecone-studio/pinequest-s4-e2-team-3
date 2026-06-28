// Natural voice for the Live Guide: streams audio from the server TTS route
// (/api/tts → OpenAI "nova" for English, Chimege for Mongolian) and plays it.
// Falls back to the browser's robotic speechSynthesis if the request fails, so
// the guide always has a voice.

import { speak as browserSpeak, stopSpeaking as stopBrowser } from "@/lib/speech";

export interface NaturalSpeakOptions {
  lang?: "en" | "mn";
  onStart?: () => void;
  onEnd?: () => void;
}

// Only one utterance plays at a time. The token guards against overlap: each
// stopSpeaking() bumps it, so any speak() whose fetch is still in flight when a
// newer one starts will see a stale token and bail instead of playing on top.
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let activeController: AbortController | null = null;
let speakToken = 0;

export function stopSpeaking(): void {
  speakToken += 1; // invalidate any in-flight speak()
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  stopBrowser(); // also cancel any browser-TTS fallback in flight
}

// Play an audio blob with the same anti-overlap + ObjectURL cleanup as speak().
// `myToken` must be the value of speakToken captured right after stopSpeaking().
// Throws if playback can't start (e.g. autoplay blocked) so callers can fall back.
async function playBlobWithToken(
  blob: Blob,
  opts: NaturalSpeakOptions,
  myToken: number,
): Promise<boolean> {
  if (myToken !== speakToken) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentUrl = url;

  const cleanup = () => {
    if (currentUrl === url) {
      URL.revokeObjectURL(url);
      currentUrl = null;
    }
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onplay = () => opts.onStart?.();
  audio.onended = () => {
    opts.onEnd?.();
    cleanup();
  };
  audio.onerror = () => {
    opts.onEnd?.();
    cleanup();
  };

  try {
    await audio.play();
    return true;
  } catch (err) {
    cleanup();
    throw err;
  }
}

// Play a pre-fetched / cached audio blob (offline narration). Works with no
// network. Returns true if it played, false otherwise.
export async function playBlob(
  blob: Blob,
  opts: NaturalSpeakOptions = {},
): Promise<boolean> {
  stopSpeaking();
  const myToken = speakToken;
  try {
    return await playBlobWithToken(blob, opts, myToken);
  } catch {
    opts.onEnd?.();
    return false;
  }
}

// Speak text aloud using the natural server voice. Returns true if it played,
// false if it fell back to the browser voice (or couldn't speak at all).
export async function speak(
  text: string,
  opts: NaturalSpeakOptions = {},
): Promise<boolean> {
  if (!text) return false;
  stopSpeaking(); // bumps the token + aborts/clears whatever was playing
  const myToken = speakToken;
  const controller = new AbortController();
  activeController = controller;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: opts.lang ?? "en" }),
      signal: controller.signal,
    });
    // A newer speak() (or stopSpeaking) superseded us while fetching — bail.
    if (myToken !== speakToken) return false;
    if (!res.ok) throw new Error(`tts ${res.status}`);

    const blob = await res.blob();
    if (myToken !== speakToken) return false;

    return await playBlobWithToken(blob, opts, myToken);
  } catch (err) {
    // Superseded or deliberately aborted → stay silent (no fallback, no onEnd).
    if (myToken !== speakToken) return false;
    if (err instanceof DOMException && err.name === "AbortError") return false;

    // Genuine network/route/quota failure → don't go silent, use browser voice.
    browserSpeak(text, {
      lang: opts.lang === "mn" ? "mn-MN" : "en-US",
      onStart: opts.onStart,
      onEnd: opts.onEnd,
    });
    return false;
  }
}
