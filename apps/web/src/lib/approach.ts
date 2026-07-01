import { haversineMeters } from "@/lib/geo";
import type { Coords } from "@/types";

// How the traveller should cover the gap between their real GPS and the
// journey's first stop: a short hop is a walk, anything further is a taxi/bus
// ride. Shared by the map (which line to draw) and the live guide (what Michelle
// says), so the picture and the voice always agree.

export type ApproachMode = "walk" | "drive";

// Below this, walking to the start is reasonable; beyond it, route by road.
const WALK_MAX_METERS = 1200;
// Beyond this the start is effectively a different city / region / another day's
// leg (e.g. UB → Selenge is ~300 km). "Head over, ~N-min taxi" would be nonsense,
// so we don't draw an approach line or quote a time — just tell them to travel
// there and we'll guide them on arrival. Matches resolvePosition's near-route cap.
const APPROACH_MAX_METERS = 50_000;

export interface ApproachPlan {
  meters: number;
  mode: ApproachMode;
  // Rough straight-line estimate (real roads are longer) — always spoken with "about".
  etaMin: number;
  // Too far to "head over" now — the first stop is a different city/region/day.
  far: boolean;
}

export function approachPlan(from: Coords, to: Coords): ApproachPlan {
  const meters = haversineMeters(from, to);
  const mode: ApproachMode = meters <= WALK_MAX_METERS ? "walk" : "drive";
  const speedKmh = mode === "walk" ? 4.8 : 28; // rough on-foot / city-driving speeds
  const etaMin = Math.max(1, Math.round((meters / 1000 / speedKmh) * 60));
  return { meters, mode, etaMin, far: meters > APPROACH_MAX_METERS };
}

export function humanDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters / 10) * 10} m`;
}

// How Michelle refers to the trip to the start in speech.
export function modePhrase(mode: ApproachMode): string {
  return mode === "walk" ? "walk" : "taxi or bus ride";
}
