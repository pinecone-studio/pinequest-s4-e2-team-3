import type { Dispatch, SetStateAction } from "react";
import type { BusLeg, BusStep } from "@/lib/transit";
import type { Coords, PlaceOption, RouteStop } from "@/types";
import type { Target } from "../types";

type ReturnMode = "drive" | "transit" | "walk";

// The conversational hub's actions: choosing a target, picking transport, asking
// for somewhere else, side-tripping to a nearby place, plus the small open/close
// wrappers the cards trigger. Kept out of the LiveExperience controller so the
// component stays focused on wiring + render.
export function useGuideActions({
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
}: {
  target: Target | null;
  nextStop: RouteStop | null;
  announce: (text: string) => void;
  ask: (q: string) => void;
  setSuggestions: (places: PlaceOption[]) => void;
  setCardOpen: (v: boolean) => void;
  setFullPlanOpen: Dispatch<SetStateAction<boolean>>;
  setBusPlan: (steps: BusStep[] | null) => void;
  setBusLegs: (legs: BusLeg[] | null) => void;
  setDetour: (v: boolean) => void;
  setReturnTarget: (coords: Coords | null, mode?: ReturnMode) => void;
  setTarget: (t: Target | null) => void;
  setIntentOpen: (v: boolean) => void;
}) {
  // Choose a place to head to → preview the leg on the map → ask transport.
  const pickTarget = (t: Target) => {
    setSuggestions([]);
    setCardOpen(false);
    setFullPlanOpen(false);
    setBusPlan(null);
    setBusLegs(null);
    setDetour(false); // heading to a plan target = back on the route
    setReturnTarget({ latitude: t.latitude, longitude: t.longitude }); // road preview
    setTarget(t);
  };
  const chooseBus = (steps: BusStep[], legs?: BusLeg[]) => {
    if (target) {
      // Redraw the same map's guide line as a transit (bus) route + show steps.
      // legs = real per-leg geometry; without them the map uses Google transit.
      setReturnTarget({ latitude: target.latitude, longitude: target.longitude }, "transit");
      setBusLegs(legs ?? null);
      setBusPlan(steps);
      const firstBus = steps.find((s) => s.mode === "transit");
      announce(
        firstBus
          ? `${firstBus.text}. ${firstBus.sub ?? ""} The full route is below and on the map.`
          : `Here's your bus route to ${target.name.split(",")[0]} on the map.`,
      );
    }
    setTarget(null);
  };
  const chooseCar = () => {
    setBusPlan(null);
    setBusLegs(null);
    if (target)
      announce(
        `For a taxi you can call UBCab, or just raise your hand by the road. I'll guide you to ${target.name.split(",")[0]}.`,
      );
    setTarget(null); // returnTarget stays (road line) → guide line to it
  };
  // Ask the traveller what they feel like first; the answer (a quick chip or a
  // typed/spoken request) drives a tailored nearby recommendation.
  const somewhereElse = () => {
    setCardOpen(false);
    setIntentOpen(true);
    announce("What do you feel like? Grab a bite, see a sight, a coffee, or somewhere to rest?");
  };
  const pickIntent = (q: string) => {
    setIntentOpen(false);
    void ask(q);
  };
  // A nearby suggestion is always close, so skip the bus/taxi choice and just
  // guide there on foot (road line) — no TransportCard.
  const goToNearby = (t: Target) => {
    setSuggestions([]);
    setBusPlan(null);
    setBusLegs(null);
    setReturnTarget({ latitude: t.latitude, longitude: t.longitude }, "walk");
    setDetour(true);
    announce(
      `Heading to ${t.name.split(",")[0]} — it's close, I'll guide you there on foot. When you're done, tap "Back to my route" to keep going.`,
    );
  };

  // Small open/close wrappers the cards trigger.
  const transportBack = () => {
    setTarget(null);
    setReturnTarget(null);
    setBusLegs(null);
    setCardOpen(true);
  };
  const intentBack = () => {
    setIntentOpen(false);
    setCardOpen(true);
  };
  const toggleFullPlan = () => setFullPlanOpen((v) => !v);
  const cardClose = () => setCardOpen(false);
  const closeBusPlan = () => setBusPlan(null);
  const dismissSuggestions = () => setSuggestions([]);
  const takeMeThere = () => {
    if (nextStop)
      pickTarget({ name: nextStop.name, latitude: nextStop.latitude, longitude: nextStop.longitude });
  };
  const pickStopTarget = (s: RouteStop) =>
    pickTarget({ name: s.name, latitude: s.latitude, longitude: s.longitude });
  const pickSuggestion = (place: PlaceOption) =>
    goToNearby({ name: place.name, latitude: place.latitude, longitude: place.longitude });

  return {
    pickTarget,
    chooseBus,
    chooseCar,
    somewhereElse,
    pickIntent,
    goToNearby,
    transportBack,
    intentBack,
    toggleFullPlan,
    cardClose,
    closeBusPlan,
    dismissSuggestions,
    takeMeThere,
    pickStopTarget,
    pickSuggestion,
  };
}
