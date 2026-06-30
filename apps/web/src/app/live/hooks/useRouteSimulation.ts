import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_KEY, loadGoogleMaps } from "@/lib/googlemaps";
import { buildRoutePath } from "@/lib/routePath";
import { haversineMeters } from "@/lib/geo";
import type { Coords, DemoRoute, RouteStop } from "@/types";

// Owns the Auto-walk simulation (so arrivals can be demoed without being in
// Mongolia) plus the manual presenter controls (arrive / next / restart). The
// position animates ALONG THE ROAD; the arrival logic narrates each stop as we
// pass it. `busy` holds the marker while Michelle is speaking/preparing so she
// finishes narrating a stop before the marker moves on.
export function useRouteSimulation({
  activeRoute,
  effectiveCoords,
  returnTarget,
  busLegs,
  currentStop,
  nextStop,
  busy,
  setSimulated,
  advanceStop,
  goToStop,
}: {
  activeRoute: DemoRoute | null;
  effectiveCoords: Coords | null;
  returnTarget: Coords | null;
  busLegs: { pts: Coords[] }[] | null;
  currentStop: RouteStop | null;
  nextStop: RouteStop | null;
  busy: boolean;
  setSimulated: (c: Coords) => void;
  advanceStop: () => void;
  goToStop: (index: number) => void;
}) {
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simActiveRef = useRef(false); // survives the async path load / re-renders
  const [simulating, setSimulating] = useState(false);

  // Pause the walk while Michelle is talking/preparing, so she finishes narrating a
  // stop before the marker moves on (otherwise it outruns the voice → overlap).
  const busyRef = useRef(false);
  busyRef.current = busy;

  const STEP_MS = 1100; // a little slow, so the journey is easy to follow

  const stopSimulation = () => {
    simActiveRef.current = false;
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setSimulating(false);
  };

  const startSimulation = async () => {
    if (!activeRoute || activeRoute.stops.length === 0 || simActiveRef.current) return;
    simActiveRef.current = true;
    setSimulating(true);

    // Walk the recommended detour (current position → returnTarget) when one is
    // set, otherwise walk the whole main route. buildRoutePath only reads
    // latitude/longitude, so a 2-point leg is enough for the detour case.
    const anchor = effectiveCoords;
    const detour = returnTarget && anchor;
    const legStops: RouteStop[] = detour
      ? ([
          { latitude: anchor!.latitude, longitude: anchor!.longitude },
          { latitude: returnTarget!.latitude, longitude: returnTarget!.longitude },
        ] as RouteStop[])
      : activeRoute.stops;

    // A detour autowalk takes a FIXED total time regardless of distance, so a
    // long recommended route just moves faster and a short one slower — same
    // duration either way. Fixed step count + a computed interval below gives
    // that. Main routes keep the per-leg equal-time default.
    const stepsPerLeg = detour ? 48 : 14; // detour: enough points for smooth motion

    // A recommended bus route: walk exactly the geometry drawn on the map (walk
    // legs + transit legs), not a straight driving line to returnTarget.
    const busPts: Coords[] | null =
      busLegs && busLegs.length ? busLegs.flatMap((l) => l.pts) : null;

    let pts: Coords[] = [];
    if (busPts && busPts.length > 1) {
      pts = busPts;
    } else {
      // Prefer real road geometry; fall back to straight legs if it can't load.
      try {
        const google = await loadGoogleMaps(GOOGLE_MAPS_KEY);
        pts = (await buildRoutePath(google, legStops, stepsPerLeg)).map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));
      } catch {
        pts = [];
      }
    }
    if (!simActiveRef.current) return; // user stopped while the path loaded

    if (pts.length === 0) {
      for (let i = 0; i < legStops.length - 1; i++) {
        const a = legStops[i];
        const b = legStops[i + 1];
        for (let s = 0; s < stepsPerLeg; s++) {
          const t = s / stepsPerLeg;
          pts.push({
            latitude: a.latitude + (b.latitude - a.latitude) * t,
            longitude: a.longitude + (b.longitude - a.longitude) * t,
          });
        }
      }
      const last = legStops[legStops.length - 1];
      pts.push({ latitude: last.latitude, longitude: last.longitude });
    }
    if (pts.length === 0) {
      stopSimulation();
      return;
    }

    // Resume from the path point nearest the current position, so a refresh (or
    // pressing play mid-route) continues from here instead of jumping to the
    // start. ponytail: O(n) scan, n≈14·stops — fine for a demo route.
    let i = anchor
      ? pts.reduce(
          (best, p, idx) =>
            haversineMeters(anchor, p) < haversineMeters(anchor, pts[best]) ? idx : best,
          0,
        )
      : 0;
    setSimulated(pts[i]);
    // Detour: spread the remaining points over a fixed total time (≈4s) so every
    // recommended route finishes in the same time. ponytail: DETOUR_TOTAL_MS is
    // the knob — smaller = faster. Main routes keep the slower per-step pace.
    const DETOUR_TOTAL_MS = 4000;
    const remaining = Math.max(1, pts.length - i);
    const intervalMs = detour
      ? Math.max(40, Math.round(DETOUR_TOTAL_MS / remaining))
      : STEP_MS;
    simTimerRef.current = setInterval(() => {
      // Hold position while Michelle is speaking / preparing a narration.
      if (busyRef.current) return;
      i += 1;
      if (i >= pts.length) {
        stopSimulation();
        return;
      }
      setSimulated(pts[i]);
    }, intervalMs);
  };

  // --- Manual presenter controls ---
  const simulateArrival = () => {
    if (currentStop)
      setSimulated({
        latitude: currentStop.latitude,
        longitude: currentStop.longitude,
      });
  };
  const walkToNext = () => {
    if (!nextStop) return;
    advanceStop();
    setSimulated({
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    });
  };
  const restartRoute = () => {
    stopSimulation();
    const first = activeRoute?.stops[0];
    if (!first) return;
    goToStop(0);
    setSimulated({ latitude: first.latitude, longitude: first.longitude });
  };

  // Stop the timer if the screen unmounts (e.g. switching routes).
  useEffect(() => {
    return () => {
      simActiveRef.current = false;
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  return {
    simulating,
    simActiveRef,
    startSimulation,
    stopSimulation,
    simulateArrival,
    walkToNext,
    restartRoute,
  };
}
