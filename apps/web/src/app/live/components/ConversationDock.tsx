"use client";

import type { ReactNode } from "react";
import type { BusLeg, BusStep } from "@/lib/transit";
import type { Coords, PlaceOption, RouteStop } from "@/types";
import type { Target } from "../types";
import { LocalTips } from "./LocalTips";
import { TransportCard } from "./TransportCard";
import { IntentCard } from "./IntentCard";
import { NextStepCard } from "./NextStepCard";
import { BusPlanCard } from "./BusPlanCard";
import { SuggestionList } from "./SuggestionList";
import { NarrationCard } from "./NarrationCard";
import { PresenterStrip } from "./PresenterStrip";

// All NarrationCard props except the footer (which the controller builds).
type NarrationProps = {
  speaking: boolean;
  thinking: boolean;
  audioLoading: boolean;
  listening: boolean;
  text: string;
  isAnswer: boolean;
  voiceError: string | null;
  voiceInSupported: boolean;
  offline: boolean;
  onReplay: () => void;
  onPause: () => void;
  onMic: () => void;
  onAsk: (q: string) => void;
};

type PresenterProps = {
  arrived: boolean;
  currentName: string;
  nextName?: string;
  offlineSaved: boolean;
  offlinePreview: boolean;
  simulating: boolean;
  onArrive: () => void;
  onWalkNext: () => void;
  onToggleSimulate: () => void;
  onTogglePreview: () => void;
  onChangeRoute: () => void;
};

// The scrollable bottom cluster: optional Local tips, the conversational hub
// (transport choice → intent → "what's next?" card), an optional bus-route sheet,
// nearby suggestions, the narration card, and (in presenter mode) the demo strip.
// Pure presentation — every decision is made by the controller and passed down.
export function ConversationDock({
  showExtras,
  currentStop,
  mapsUrl,
  offlineSaved,
  saving,
  onDownload,
  target,
  effectiveCoords,
  onBus,
  onCar,
  onTransportBack,
  intentOpen,
  onPickIntent,
  onIntentBack,
  cardOpen,
  nextStop,
  stops,
  currentStopId,
  fullPlanOpen,
  onToggleFullPlan,
  onTakeMeThere,
  onSomewhereElse,
  offline,
  onPickStop,
  onCardClose,
  busPlan,
  onCloseBusPlan,
  suggestions,
  onDismissSuggestions,
  onPickSuggestion,
  narration,
  narrationFooter,
  presenter,
}: {
  showExtras: boolean;
  currentStop: RouteStop | null;
  mapsUrl: string;
  offlineSaved: boolean;
  saving: boolean;
  onDownload: () => void;
  target: Target | null;
  effectiveCoords: Coords | null;
  onBus: (steps: BusStep[], legs?: BusLeg[]) => void;
  onCar: () => void;
  onTransportBack: () => void;
  intentOpen: boolean;
  onPickIntent: (q: string) => void;
  onIntentBack: () => void;
  cardOpen: boolean;
  nextStop: RouteStop | null;
  stops: RouteStop[];
  currentStopId: string | null;
  fullPlanOpen: boolean;
  onToggleFullPlan: () => void;
  onTakeMeThere: () => void;
  onSomewhereElse: () => void;
  offline: boolean;
  onPickStop: (stop: RouteStop) => void;
  onCardClose: () => void;
  busPlan: BusStep[] | null;
  onCloseBusPlan: () => void;
  suggestions: PlaceOption[];
  onDismissSuggestions: () => void;
  onPickSuggestion: (place: PlaceOption) => void;
  narration: NarrationProps;
  narrationFooter: ReactNode;
  presenter: PresenterProps | null;
}) {
  return (
    // Scrollable bottom cluster — keeps the demo controls (Routes, Auto-walk)
    // reachable when suggestions/tips push the stack past the screen.
    <div className="pointer-events-auto flex max-h-[58vh] shrink-0 flex-col overflow-y-auto">
      {showExtras && currentStop && (
        <LocalTips
          stop={currentStop}
          mapsUrl={mapsUrl}
          offlineSaved={offlineSaved}
          saving={saving}
          onDownload={onDownload}
        />
      )}

      {/* The conversational hub. Priority: transport choice → decision card → nearby picks. */}
      {target ? (
        <TransportCard
          origin={effectiveCoords}
          target={target}
          onBus={onBus}
          onCar={onCar}
          onBack={onTransportBack}
        />
      ) : intentOpen ? (
        <IntentCard onPick={onPickIntent} onBack={onIntentBack} />
      ) : cardOpen ? (
        <NextStepCard
          nextStop={nextStop}
          stops={stops}
          currentStopId={currentStopId}
          fullPlanOpen={fullPlanOpen}
          onToggleFullPlan={onToggleFullPlan}
          onTakeMeThere={onTakeMeThere}
          onSomewhereElse={onSomewhereElse}
          offline={offline}
          onPickStop={onPickStop}
          onClose={onCardClose}
        />
      ) : null}

      {busPlan && <BusPlanCard steps={busPlan} onClose={onCloseBusPlan} />}

      {suggestions.length > 0 && (
        <SuggestionList
          suggestions={suggestions}
          userCoords={effectiveCoords}
          onDismiss={onDismissSuggestions}
          onPick={onPickSuggestion}
        />
      )}

      <NarrationCard {...narration} footer={narrationFooter} />

      {presenter && <PresenterStrip {...presenter} />}
    </div>
  );
}
