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
import { approachPlan, humanDistance, modePhrase } from "@/lib/approach";
import type { Coords, PlaceOption, RouteStop } from "@/types";

// Separates the streamed reply text from the metadata tail — must match /api/chat.
const META_DELIM = "\n\nPINEQUEST_META:";

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

// `demo` (sevo account) preserves the on-stage behaviour where the journey starts
// parked at the first stop and stays silent until the presenter taps play. Normal
// users start away from stop #1 and travel to it, so their genuine arrivals must
// narrate — the arrival effect below branches on this.
export function useLiveGuide(demo = false) {
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

  // Simulated position wins; otherwise the real GPS fix; otherwise null (no fake
  // dot parked on the first stop).
  const effectiveCoords: Coords | null = resolvePosition(simulatedCoords, realCoords);

  // A GENUINE fix (simulated demo position or real GPS) — no first-stop fallback.
  // Arrival detection uses this: otherwise, before a normal user's GPS resolves,
  // the fallback sits exactly on stop #1 and would falsely mark it "reached".
  const genuinePosition = simulatedCoords ?? realCoords;

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

  // A warm welcome the moment a journey loads — and, when the traveller isn't at
  // the first stop yet, how to get there: walk vs taxi/bus + a rough time, matching
  // the approach line drawn on the map. Fires once per route; shows on the card too,
  // so it still greets even if the browser blocks TTS autoplay. Waits for a
  // position fix so the distance is real.
  const welcomedRef = useRef<string | null>(null);
  useEffect(() => {
    const first = activeRoute?.stops[0];
    // Judge distance from a REAL fix (simulated demo position or actual GPS) —
    // not effectiveCoords, which falls back to the first stop before GPS resolves
    // and would wrongly greet an away traveller with "you're right here".
    const pos = simulatedCoords ?? realCoords;
    if (!activeRoute || !first || !pos) return;
    if (welcomedRef.current === activeRoute.id) return;
    welcomedRef.current = activeRoute.id;

    const plan = approachPlan(pos, first);
    const atStart = plan.meters <= (first.arrivalRadius ?? 150);
    const region = activeRoute.region
      ? activeRoute.region.charAt(0).toUpperCase() + activeRoute.region.slice(1)
      : "";
    let text: string;
    if (atStart) {
      text = `Welcome! Your Mongolian adventure starts right here at ${first.name}. I'm Michelle, and I'll guide you the whole way. Tap play whenever you're ready.`;
    } else if (plan.far) {
      // Different city / region / another day's leg — no "head over" or ETA.
      text = `Welcome! This part of your journey begins at ${first.name}${region ? ` in ${region}` : ""}, quite far from where you are now. Make your way there, and I'll be ready to guide you the moment you arrive.`;
    } else {
      text = `Welcome! Your adventure is about to begin. You're about ${humanDistance(plan.meters)} from ${first.name}, your first stop — roughly a ${plan.etaMin}-minute ${modePhrase(plan.mode)} away. Head over and I'll take it from there.`;
    }
    announce(text);
  }, [activeRoute, simulatedCoords, realCoords, announce]);

  // Proactive arrival trigger as the traveller moves. Two modes:
  //  • Demo: scan forward and narrate the FURTHEST reached stop, tolerating skips
  //    (auto-walk / manual "next" jump ahead) — unchanged on-stage behaviour.
  //  • Normal user: STRICT in-order. Only the next stop they haven't reached yet
  //    (the current target) can be arrived at. A double gate — proximity AND
  //    sequence — so being physically near a LATER stop that just happens to be
  //    close by (e.g. standing near stop #3 while heading to stop #1) never reads
  //    that stop's script or skips the ones before it.
  useEffect(() => {
    if (!genuinePosition || stops.length === 0) return;

    if (demo) {
      for (let i = stops.length - 1; i >= currentStopIndex; i--) {
        if (!hasArrived(genuinePosition, stops[i])) continue;

        if (i > currentStopIndex) goToStop(i); // walked ahead → catch up
        const stop = stops[i];
        if (!arrivedStopIds.includes(stop.id)) {
          markArrived(stop.id);
          // First arrival at mount (parked at stop #1) stays silent until play;
          // every arrival after that narrates.
          if (startedRef.current) sayNarration(stop);
          else startedRef.current = true;
          setReturnTarget(null);
        }
        break; // furthest reached stop handled; stop scanning
      }
      return;
    }

    // Normal user: only the next un-reached stop counts, and only when actually near it.
    const targetIndex = stops.findIndex((s) => !arrivedStopIds.includes(s.id));
    if (targetIndex >= 0 && hasArrived(genuinePosition, stops[targetIndex])) {
      const stop = stops[targetIndex];
      if (targetIndex > currentStopIndex) goToStop(targetIndex);
      markArrived(stop.id);
      // A stop already reached at mount ("start here") stays silent until play;
      // any stop the traveller actually walks to and reaches narrates on arrival.
      if (startedRef.current) sayNarration(stop);
      // Newly back on a main stop → drop any "return"/detour guide line.
      setReturnTarget(null);
    }

    // After the first pass with a real position, later arrivals narrate (only a
    // stop already within range at mount was silenced above).
    startedRef.current = true;
  }, [
    demo,
    genuinePosition,
    currentStopIndex,
    stops,
    arrivedStopIds,
    goToStop,
    markArrived,
    sayNarration,
    setReturnTarget,
  ]);

  const replay = useCallback(() => {
    // Speak what the card is actually showing. Before the traveller reaches the
    // stop, that's the welcome / "head to your first stop" guidance held in
    // lastAnswer — NOT the stop's arrival script. Replaying sayNarration here read
    // "Welcome to Gandan Monastery" while they were still 3 km away. Once they
    // arrive, sayNarration clears lastAnswer, so this replays the stop's narration.
    if (lastAnswer) announce(lastAnswer);
    else if (currentStop) sayNarration(currentStop);
  }, [lastAnswer, currentStop, sayNarration, announce]);

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
        // /api/chat streams text/plain with a "\n\nPINEQUEST_META:{…}" tail — not
        // JSON. Split the reply text from the metadata (place cards) the same way
        // the planning page does.
        const body = await res.text();
        const i = body.indexOf(META_DELIM);
        reply = (i >= 0 ? body.slice(0, i) : body).trim() || fallbackAnswer(currentStop);
        let places: PlaceOption[] = [];
        if (i >= 0) {
          try {
            places = (JSON.parse(body.slice(i + META_DELIM.length)).places ?? []) as PlaceOption[];
          } catch { /* keep no suggestions */ }
        }
        // Surface any places Michelle found as selectable buttons/markers.
        setSuggestions(places);
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
