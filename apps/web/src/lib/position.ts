import type { Coords, DemoRoute } from "@/types";

// Resolve which position the Live Guide should show / narrate from:
//   1. a simulated position always wins (demo controls / journey playback),
//   2. else a real GPS fix at ANY distance — the map fits the route and the
//      "far" handling avoids drawing a nonsense approach line, so a distant fix
//      just sits off-screen. (We used to snap far fixes onto the first stop, but
//      that hid the stop-1 pin and pretended the traveller was already there.)
//   3. else, with no fix at all, park at the first stop so the map isn't empty
//      (a guided demo with GPS off still shows a dot on the route).
export function resolvePosition(
  simulated: Coords | null,
  real: Coords | null,
  route: DemoRoute | null,
): Coords | null {
  if (simulated) return simulated;
  if (real) return real;

  const first = route?.stops[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : null;
}
