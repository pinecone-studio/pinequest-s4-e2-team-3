"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { haversineMeters, hasArrived } from "@/lib/geo";
import { resolvePosition } from "@/lib/position";
import { speak, stopSpeaking, playBlob } from "@/lib/tts";
import { loadPack, audioKey } from "@/lib/offline";
import { getAudio } from "@/lib/offlineAudio";
import { createListener, ttsSupported, sttSupported } from "@/lib/speech";
import { useWeather } from "@/hooks/useWeather";
import { weatherTip } from "@/lib/weather";
import type { Coords, PlaceOption, RouteStop } from "@/types";

// A short situational prefix so the grounded /api/chat guide knows where the
// traveller currently is. The route itself supplies the full Michelle persona and
// the live place-grounding, so we only add "where I am" here.
function buildContext(current: RouteStop | null, next: RouteStop | null): string {
  if (!current) return "";
  const bits = [`I'm currently at ${current.name} (${current.kind}).`];
  if (current.context) bits.push(current.context);
  if (next) bits.push(`My next stop is ${next.name}.`);
  return bits.join(" ");
}

// Turn a raw SpeechRecognition error code into something the traveller can act
// on — the most common ones are a denied mic permission or an unsupported
// browser, both of which otherwise fail silently.
function friendlyVoiceError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked. Allow mic access, or type your question.";
    case "no-speech":
      return "Didn't catch that — tap the mic and try again.";
    case "audio-capture":
      return "No microphone found. You can type your question instead.";
    case "network":
      return "Network issue with voice. Try again, or type instead.";
    default:
      return "Voice input didn't work — type your question instead.";
  }
}

// Offline / no-backend fallback so the demo never dead-ends on a question.
function fallbackAnswer(current: RouteStop | null): string {
  if (!current) return "I'm here with you. Pick a route to begin your journey.";
  return (
    current.context ??
    `We're at ${current.name}. Take your time here, and let me know when you're ready to move on.`
  );
}

export function useLiveGuide() {
  const {
    activeRoute,
    currentStopIndex,
    arrivedStopIds,
    simulatedCoords,
    suggestions,
    selectedPlace,
    offlineReadyIds,
    advanceStop,
    goToStop,
    markArrived,
    setSuggestions,
    selectPlace,
    setReturnTarget,
  } = useLiveStore();
  const realCoords = useLocationStore((s) => s.coordinates);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  // True while the TTS audio is being generated/fetched, before playback starts
  // — "Michelle is preparing to speak". Drives the loading indicator.
  const [audioLoading, setAudioLoading] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Simulated position wins; otherwise real GPS if near the route, else the
  // route's first stop (so demos far from Mongolia still appear on the journey).
  const effectiveCoords: Coords | null = resolvePosition(
    simulatedCoords,
    realCoords,
    activeRoute,
  );

  const stops = activeRoute?.stops ?? [];
  const currentStop = stops[currentStopIndex] ?? null;
  const nextStop = stops[currentStopIndex + 1] ?? null;

  const distanceToCurrent = useMemo(() => {
    if (!effectiveCoords || !currentStop) return null;
    return haversineMeters(effectiveCoords, currentStop);
  }, [effectiveCoords, currentStop]);

  // Live weather for the current stop → a short condition-based tip Michelle adds to
  // the narration. Held in a ref so sayNarration always reads the latest tip
  // without re-running the arrival effect.
  const weather = useWeather(currentStop);
  const tip =
    weather && currentStop
      ? weatherTip(
          weather.weatherCode,
          weather.temperature,
          new Date().getHours(),
          currentStop.kind,
        )
      : null;
  const tipRef = useRef<string | null>(null);
  tipRef.current = tip;

  // The journey starts parked at the first stop, so its arrival fires immediately
  // on route load — we mark it reached but DON'T auto-speak it (the traveller taps
  // play to hear the intro). Every later arrival narrates automatically. Reset per
  // route so each new journey's first stop is silent on load too.
  const startedRef = useRef(false);
  useEffect(() => {
    startedRef.current = false;
  }, [activeRoute?.id]);

  // The offline pack's AI narration text per stop (generated once at save time).
  // Recomputed when the route changes or its pack finishes saving.
  const packTexts = useMemo(() => {
    const pack = activeRoute ? loadPack(activeRoute.id) : null;
    const map: Record<string, string> = {};
    pack?.stops.forEach((s) => (map[s.id] = s.text));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute?.id, offlineReadyIds]);

  // Effective narration for a stop: cached AI text if saved, else the bundled one.
  const currentNarration = currentStop
    ? packTexts[currentStop.id] ?? currentStop.narration
    : "";

  const sayNarration = useCallback(
    (stop: RouteStop) => {
      const text = packTexts[stop.id] ?? stop.narration;
      const tipText = tipRef.current;
      const spoken = tipText ? `${text} ${tipText}` : text;
      setAudioLoading(true); // "preparing…" until playback actually starts
      const opts = {
        lang: "en" as const,
        onStart: () => {
          setAudioLoading(false);
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setAudioLoading(false);
        },
      };
      const routeId = activeRoute?.id;
      // Prefer the cached voice (works offline + skips a TTS fetch online);
      // fall back to live server TTS of the same text.
      void (async () => {
        const blob = routeId ? await getAudio(audioKey(routeId, stop.id)) : null;
        if (blob) void playBlob(blob, opts);
        else void speak(spoken, opts);
      })();
      setLastAnswer(null);
    },
    [packTexts, activeRoute?.id],
  );

  // Speak a one-off line (e.g. confirming a detour) and show it on Michelle's card.
  const announce = useCallback((text: string) => {
    setLastAnswer(text);
    setAudioLoading(true);
    void speak(text, {
      lang: "en",
      onStart: () => {
        setAudioLoading(false);
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setAudioLoading(false);
      },
    });
  }, []);

  // Proactive trigger: as the traveller moves, find the furthest stop they've
  // reached (from the current one onward), advance the guide to it, and narrate
  // it once. Scanning forward — not just checking the current stop — is what
  // lets the guide progress automatically on real GPS as you walk the route,
  // instead of only via the demo's "Walk to next" button. It also tolerates
  // skipping or arriving at a later stop directly.
  useEffect(() => {
    if (!effectiveCoords || stops.length === 0) return;

    for (let i = stops.length - 1; i >= currentStopIndex; i--) {
      if (!hasArrived(effectiveCoords, stops[i])) continue;

      if (i > currentStopIndex) goToStop(i); // walked ahead → catch up
      const stop = stops[i];
      if (!arrivedStopIds.includes(stop.id)) {
        markArrived(stop.id);
        // Skip the very first auto-arrival (route load) — stay silent until the
        // traveller taps play; narrate every arrival after that.
        if (startedRef.current) sayNarration(stop);
        else startedRef.current = true;
      }
      setReturnTarget(null); // back on the route — drop the "return" guide line
      break; // furthest reached stop handled; stop scanning
    }
  }, [
    effectiveCoords,
    currentStopIndex,
    stops,
    arrivedStopIds,
    goToStop,
    markArrived,
    sayNarration,
    setReturnTarget,
  ]);

  const replay = useCallback(() => {
    if (currentStop) sayNarration(currentStop);
  }, [currentStop, sayNarration]);

  const pause = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setAudioLoading(false);
  }, []);

  // Free-form Q&A: send the question (with situational context) to the grounded
  // /api/chat route and speak the reply. Same-origin, so the Clerk session
  // cookie authenticates it — no bearer token to thread through.
  const ask = useCallback(
    async (question: string): Promise<string> => {
      if (!question.trim()) return "";
      setThinking(true);
      stopSpeaking();
      const context = buildContext(currentStop, nextStop);
      const content = context ? `${context}\n\n${question}` : question;
      let reply: string;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content }],
            location: effectiveCoords
              ? { lat: effectiveCoords.latitude, lng: effectiveCoords.longitude }
              : undefined,
          }),
        });
        if (!res.ok) throw new Error(`chat ${res.status}`);
        const data = (await res.json()) as { reply?: string; places?: PlaceOption[] };
        reply = data.reply?.trim() || fallbackAnswer(currentStop);
        // Surface any places Michelle found as selectable buttons/markers.
        setSuggestions(data.places ?? []);
      } catch {
        reply = fallbackAnswer(currentStop);
        setSuggestions([]);
      }
      setThinking(false);
      setLastAnswer(reply);
      setAudioLoading(true);
      void speak(reply, {
        lang: "en",
        onStart: () => {
          setAudioLoading(false);
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setAudioLoading(false);
        },
      });
      return reply;
    },
    [currentStop, nextStop, effectiveCoords, setSuggestions],
  );

  const listenerRef = useRef<ReturnType<typeof createListener>>(null);

  // Tap-to-talk: capture one utterance, then send it through `ask`.
  const startListening = useCallback(() => {
    if (listening) {
      listenerRef.current?.stop();
      return;
    }
    // Don't let the user talk over Michelle — it causes overlap/lag. They must pause
    // her first (the mic button is also disabled while she's busy).
    if (isSpeaking || audioLoading || thinking) return;
    setVoiceError(null);
    const listener = createListener({
      lang: "en-US",
      onResult: (transcript) => {
        setListening(false);
        void ask(transcript);
      },
      onError: (code) => {
        setListening(false);
        setVoiceError(friendlyVoiceError(code));
      },
      onEnd: () => setListening(false),
    });
    if (!listener) {
      // Browser has no SpeechRecognition (e.g. Firefox) — tell the user instead
      // of doing nothing when they tap the mic.
      setVoiceError("Voice input isn't supported here — use Chrome/Edge, or type.");
      return;
    }
    listenerRef.current = listener;
    setListening(true);
    listener.start();
  }, [listening, ask, isSpeaking, audioLoading, thinking]);

  useEffect(() => () => stopSpeaking(), []);

  return {
    activeRoute,
    currentStop,
    currentNarration,
    nextStop,
    currentStopIndex,
    effectiveCoords,
    distanceToCurrent,
    isSpeaking,
    listening,
    thinking,
    audioLoading,
    lastAnswer,
    voiceError,
    weather,
    weatherTip: tip,
    suggestions,
    selectedPlace,
    selectPlace,
    voiceInSupported: sttSupported(),
    voiceOutSupported: ttsSupported(),
    advanceStop,
    replay,
    pause,
    ask,
    announce,
    startListening,
  };
}
