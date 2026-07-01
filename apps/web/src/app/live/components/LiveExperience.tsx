"use client";

import { useEffect, useRef, useState } from "react";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { useLiveGuide } from "@/hooks/useLiveGuide";
import { useLiveStore } from "@/stores/liveStore";
import { useOnlineStatus } from "@/context/OnlineStatus";
import type { BusStep } from "@/lib/transit";
import type { Theme, Target } from "../types";
import { useGuideActions } from "../hooks/useGuideActions";
import { useOfflinePack } from "../hooks/useOfflinePack";
import { useRouteSimulation } from "../hooks/useRouteSimulation";
import { LiveHud } from "./LiveHud";
import { ConversationDock } from "./ConversationDock";
import { NarrationFooter } from "./NarrationFooter";

// The working guide once a route is chosen. This is the controller: it owns the
// conversational UI state and the handlers, delegates the simulation/offline-pack
// logic to hooks, and renders the chrome (LiveHud) + bottom cluster (ConversationDock).
export function LiveExperience({
  theme,
  onToggleTheme,
  demo = false,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  // Demo (sevo) account only: reveals the presenter/simulation controls. Normal
  // users get the real GPS + proximity navigation flow with none of that chrome.
  demo?: boolean;
}) {
  const guide = useLiveGuide(demo);
  const {
    arrivedStopIds,
    offlineReadyIds,
    forceOffline,
    returnTarget,
    busLegs,
    currentStopIndex,
    setRoute,
    setSimulated,
    advanceStop,
    goToStop,
    reset,
    setSuggestions,
    setReturnTarget,
    setBusLegs,
    setOfflineReady,
    setForceOffline,
  } = useLiveStore();

  // Offline (real signal loss or the demo toggle): the chat/Places-backed features
  // (nearby suggestions, asking Michelle) can't reach the network, so we hide them.
  const { online } = useOnlineStatus();
  const offline = forceOffline || !online;

  const {
    activeRoute,
    currentStop,
    currentNarration,
    nextStop,
    effectiveCoords,
    isSpeaking,
    listening,
    thinking,
    audioLoading,
    lastAnswer,
    voiceError,
    weather,
    weatherTip,
    suggestions,
    voiceInSupported,
    replay,
    pause,
    ask,
    announce,
    startListening,
  } = guide;

  // Narration shown on the card: the stop's text plus the live weather tip
  // (Michelle speaks the same combination on arrival). An AI answer replaces it.
  const narrationText = lastAnswer ?? [currentNarration, weatherTip].filter(Boolean).join(" ");
  const arrived = currentStop ? arrivedStopIds.includes(currentStop.id) : false;

  // Secondary panels (Local tips + demo controls) are hidden by default so Michelle
  // stays the focus; one button reveals them.
  const [showExtras, setShowExtras] = useState(false);
  // The conversational hub: the "what's next?" decision card, the full-plan list,
  // a chosen target awaiting a transport choice, and the bus-route sheet.
  const [cardOpen, setCardOpen] = useState(false);
  const [fullPlanOpen, setFullPlanOpen] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  // "Somewhere else" first asks what the traveller feels like, before suggesting.
  const [intentOpen, setIntentOpen] = useState(false);
  // True after a side-trip to a nearby place, so we can offer "Back to my route".
  const [detour, setDetour] = useState(false);
  // The bus route's steps (which bus, board/alight stops) once "By bus" is picked.
  const [busPlan, setBusPlan] = useState<BusStep[] | null>(null);

  const { offlineSaved, saving, savingProgress, downloadPack } = useOfflinePack(
    activeRoute,
    offlineReadyIds,
    setOfflineReady,
  );

  const { simulating, simActiveRef, startSimulation, stopSimulation, simulateArrival, walkToNext } =
    useRouteSimulation({
      activeRoute,
      effectiveCoords,
      returnTarget,
      busLegs,
      currentStop,
      nextStop,
      busy: isSpeaking || audioLoading || thinking,
      setSimulated,
      advanceStop,
    });

  const actions = useGuideActions({
    target,
    nextStop,
    announce,
    ask,
    setSuggestions,
    setCardOpen,
    setFullPlanOpen,
    setBusPlan,
    setBusLegs,
    setDetour,
    setReturnTarget,
    setTarget,
    setIntentOpen,
  });

  // A typed/spoken request answers the intent prompt too → close it.
  useEffect(() => {
    if (suggestions.length) setIntentOpen(false);
  }, [suggestions]);

  // When the traveller reaches a stop, Michelle reads it (arrival narration) and
  // the "what's next?" card opens — unless we're mid Auto-walk demo or already
  // mid-decision. ponytail: keyed on the stop id so it fires once per arrival.
  // Skip the clears on the first run after a reload, else a persisted bus/detour
  // route gets wiped on mount and the map falls back to the main route.
  const arrivalMounted = useRef(false);
  useEffect(() => {
    if (arrived && !simulating && !target) {
      if (arrivalMounted.current) {
        setBusPlan(null);
        setBusLegs(null);
        setDetour(false); // reached a plan stop → no longer on a side-trip
      }
      setCardOpen(true);
    }
    arrivalMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived, currentStop?.id]);

  // Refresh (↻) button.
  //  • Demo: exactly the old presenter "reset to start" — jump the simulated marker
  //    back to stop #1 (progress/targets untouched), so the demo is unchanged.
  //  • Normal user: a full fresh restart from their CURRENT real location. setRoute
  //    on the same route wipes progress (index → 0, arrived stops, detours,
  //    suggestions) and clears simulatedCoords, so the marker drops back onto live
  //    GPS and the connector to the first stop redraws; local UI is reset too.
  function restartJourney() {
    stopSimulation();
    if (demo) {
      goToStop(0);
      const first = activeRoute?.stops[0];
      if (first) setSimulated({ latitude: first.latitude, longitude: first.longitude });
      return;
    }
    if (activeRoute) setRoute(activeRoute);
    setCardOpen(false);
    setFullPlanOpen(false);
    setTarget(null);
    setIntentOpen(false);
    setDetour(false);
    setBusPlan(null);
  }

  const narrationFooter = (
    <NarrationFooter
      showExtras={showExtras}
      onToggleExtras={() => setShowExtras(!showExtras)}
      canAdvance={!target && !intentOpen && !cardOpen && suggestions.length === 0 && !busPlan}
      detour={detour}
      onAdvance={() => setCardOpen(true)}
    />
  );

  return (
    <>
      <LiveHud
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBack={reset}
        activeRoute={activeRoute}
        currentStop={currentStop}
        weather={weather}
        currentStopIndex={currentStopIndex}
        nextStop={nextStop}
        simulating={simulating}
        demo={demo}
        onWalkNext={walkToNext}
        onToggleSim={() => {
          simActiveRef.current ? stopSimulation() : void startSimulation();
        }}
        onRestart={restartJourney}
        savingProgress={savingProgress}
        forceOffline={forceOffline}
        offlineSaved={offlineSaved}
      />

      <div className="flex-1" />

      <ConversationDock
        showExtras={showExtras}
        currentStop={currentStop}
        mapsUrl={currentStop ? googleMapsDirectionsUrl(currentStop, effectiveCoords) : ""}
        offlineSaved={offlineSaved}
        saving={saving}
        onDownload={downloadPack}
        target={target}
        effectiveCoords={effectiveCoords}
        onBus={actions.chooseBus}
        onCar={actions.chooseCar}
        onTransportBack={actions.transportBack}
        intentOpen={intentOpen}
        onPickIntent={actions.pickIntent}
        onIntentBack={actions.intentBack}
        cardOpen={cardOpen}
        nextStop={nextStop}
        stops={activeRoute?.stops ?? []}
        currentStopId={currentStop?.id ?? null}
        fullPlanOpen={fullPlanOpen}
        onToggleFullPlan={actions.toggleFullPlan}
        onTakeMeThere={actions.takeMeThere}
        onSomewhereElse={actions.somewhereElse}
        offline={offline}
        onPickStop={actions.pickStopTarget}
        onCardClose={actions.cardClose}
        busPlan={busPlan}
        onCloseBusPlan={actions.closeBusPlan}
        suggestions={suggestions}
        onDismissSuggestions={actions.dismissSuggestions}
        onPickSuggestion={actions.pickSuggestion}
        narration={{
          speaking: isSpeaking,
          thinking,
          audioLoading,
          listening,
          text: narrationText,
          isAnswer: !!lastAnswer,
          voiceError,
          voiceInSupported,
          offline,
          onReplay: replay,
          onPause: pause,
          onMic: startListening,
          onAsk: ask,
        }}
        narrationFooter={narrationFooter}
        presenter={
          // Presenter/simulation strip is demo-only — normal users never see it.
          demo && showExtras
            ? {
                arrived,
                currentName: currentStop?.name ?? "",
                nextName: nextStop?.name,
                offlineSaved,
                offlinePreview: forceOffline,
                simulating,
                onArrive: simulateArrival,
                onWalkNext: walkToNext,
                onToggleSimulate: () => (simActiveRef.current ? stopSimulation() : startSimulation()),
                onTogglePreview: () => setForceOffline(!forceOffline),
                onChangeRoute: reset,
              }
            : null
        }
      />
    </>
  );
}
