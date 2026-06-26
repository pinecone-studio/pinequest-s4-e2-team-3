import { haversineMeters } from "@/lib/geo";
import type { Coords, DemoRoute } from "@/types";

// Within this distance of any stop, the real GPS is treated as "on the route".
// Beyond it (e.g. demoing from outside Mongolia) we fall back to the route so
// the marker sits on the journey instead of at the presenter's real location.
const NEAR_ROUTE_METERS = 50_000;

// Resolve which position the Live Guide should show / narrate from:
//   1. a simulated position always wins (demo controls / journey playback),
//   2. else real GPS if it's anywhere near the route,
//   3. else the route's first stop, so a demo run far from Mongolia still
//      appears on the route rather than pointing at the real location.
export function resolvePosition(
  simulated: Coords | null,
  real: Coords | null,
  route: DemoRoute | null,
): Coords | null {
  if (simulated) return simulated;
  if (!route || route.stops.length === 0) return real;

  if (real) {
    const nearest = Math.min(
      ...route.stops.map((s) => haversineMeters(real, s)),
    );
    if (nearest <= NEAR_ROUTE_METERS) return real;
  }

  const first = route.stops[0];
  return { latitude: first.latitude, longitude: first.longitude };
}
