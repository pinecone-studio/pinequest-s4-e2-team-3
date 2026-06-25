"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { aiService } from "@/services/ai";
import { useLiveStore } from "@/stores/liveStore";
import { useLocationStore } from "@/stores/locationStore";
import { haversineMeters, hasArrived } from "@/lib/geo";
import { speak, stopSpeaking, createListener, ttsSupported, sttSupported } from "@/lib/speech";
import type { Coords, RouteStop } from "@/types";

// Builds the context the AI needs so a free-form answer is grounded in where
// the traveller is and what's next. Prepended to the user's question because the
// backend currently forwards `message` verbatim.
function buildContext(current: RouteStop | null, next: RouteStop | null): string {
  if (!current) return "You are an AI local travel guide for Mongolia.";
  return [
    "You are Nova, an AI local guide walking a foreign traveller through Mongolia.",
    "Be warm, concise, practical and culturally aware. Two or three sentences.",
    `The traveller is currently at: ${current.name} (${current.kind}).`,
    current.context ? `Context: ${current.context}` : "",
    next ? `Their next stop is: ${next.name}.` : "This is the final stop.",
  ]
    .filter(Boolean)
    .join("\n");
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
    liveOn,
    arrivedStopIds,
    simulatedCoords,
    advanceStop,
    markArrived,
  } = useLiveStore();
  const realCoords = useLocationStore((s) => s.coordinates);
  const { getToken } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  // Simulated position wins over real GPS (the on-stage demo control).
  const effectiveCoords: Coords | null = simulatedCoords ?? realCoords;

  const stops = activeRoute?.stops ?? [];
  const currentStop = stops[currentStopIndex] ?? null;
  const nextStop = stops[currentStopIndex + 1] ?? null;

  const distanceToCurrent = useMemo(() => {
    if (!effectiveCoords || !currentStop) return null;
    return haversineMeters(effectiveCoords, currentStop);
  }, [effectiveCoords, currentStop]);

  const sayNarration = useCallback((stop: RouteStop) => {
    speak(stop.narration, {
      lang: "en-US",
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    setLastAnswer(null);
  }, []);

  // Proactive trigger: when live mode is on and the traveller reaches the
  // current stop, narrate it once.
  useEffect(() => {
    if (!liveOn || !currentStop || !effectiveCoords) return;
    if (arrivedStopIds.includes(currentStop.id)) return;
    if (hasArrived(effectiveCoords, currentStop)) {
      markArrived(currentStop.id);
      sayNarration(currentStop);
    }
  }, [liveOn, currentStop, effectiveCoords, arrivedStopIds, markArrived, sayNarration]);

  const replay = useCallback(() => {
    if (currentStop) sayNarration(currentStop);
  }, [currentStop, sayNarration]);

  const pause = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // Free-form Q&A: send the question (with context) to the AI, speak the reply.
  const ask = useCallback(
    async (question: string): Promise<string> => {
      if (!question.trim()) return "";
      setThinking(true);
      stopSpeaking();
      const message = `${buildContext(currentStop, nextStop)}\n\nThe traveller asks: ${question}`;
      let reply: string;
      try {
        const token = (await getToken()) ?? "";
        const res = await aiService.askGuide(
          {
            message,
            coordinates: effectiveCoords ?? undefined,
            language: "en",
          },
          token,
        );
        reply = res.reply?.trim() || fallbackAnswer(currentStop);
      } catch {
        reply = fallbackAnswer(currentStop);
      }
      setThinking(false);
      setLastAnswer(reply);
      speak(reply, {
        lang: "en-US",
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
      return reply;
    },
    [currentStop, nextStop, effectiveCoords, getToken],
  );

  const listenerRef = useRef<ReturnType<typeof createListener>>(null);

  // Tap-to-talk: capture one utterance, then send it through `ask`.
  const startListening = useCallback(() => {
    if (listening) {
      listenerRef.current?.stop();
      return;
    }
    const listener = createListener({
      lang: "en-US",
      onResult: (transcript) => {
        setListening(false);
        void ask(transcript);
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
    if (!listener) return; // unsupported — UI falls back to text input
    listenerRef.current = listener;
    setListening(true);
    listener.start();
  }, [listening, ask]);

  useEffect(() => () => stopSpeaking(), []);

  return {
    activeRoute,
    currentStop,
    nextStop,
    currentStopIndex,
    effectiveCoords,
    distanceToCurrent,
    isSpeaking,
    listening,
    thinking,
    lastAnswer,
    voiceInSupported: sttSupported(),
    voiceOutSupported: ttsSupported(),
    advanceStop,
    replay,
    pause,
    ask,
    startListening,
  };
}
