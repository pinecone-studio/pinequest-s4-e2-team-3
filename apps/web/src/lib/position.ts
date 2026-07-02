import type { Coords } from "@/types";

// Which position the "you are here" dot / arrival reads from:
//   1. a simulated position always wins (demo controls / journey playback),
//   2. else a real GPS fix at ANY distance,
//   3. else null — NO fake fallback onto the first stop. Faking it made the dot
//      sit exactly on stop #1 whenever we had no genuine fix (e.g. desktop, whose
//      only coarse WiFi fix is rejected), pretending the traveller was already
//      there. With null the dot simply doesn't show; the map still centres on the
//      route via the Map's defaultCenter + FitBounds.
export function resolvePosition(
  simulated: Coords | null,
  real: Coords | null,
): Coords | null {
  return simulated ?? real;
}
