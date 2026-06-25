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

// Only one utterance plays at a time — track it so we can stop/replace cleanly.
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

export function stopSpeaking(): void {
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

// Speak text aloud using the natural server voice. Returns true if it played,
// false if it fell back to the browser voice (or couldn't speak at all).
export async function speak(
  text: string,
  opts: NaturalSpeakOptions = {},
): Promise<boolean> {
  if (!text) return false;
  stopSpeaking();

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: opts.lang ?? "en" }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);

    const blob = await res.blob();
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

    await audio.play();
    return true;
  } catch {
    // Network/route/quota failure → don't go silent, use the browser voice.
    browserSpeak(text, {
      lang: opts.lang === "mn" ? "mn-MN" : "en-US",
      onStart: opts.onStart,
      onEnd: opts.onEnd,
    });
    return false;
  }
}
