"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon } from "@/components/icons";
import { GOOGLE_MAPS_KEY, loadGoogleMaps } from "@/lib/googlemaps";
import type { BusLeg, BusRoute, BusStep } from "@/lib/transit";
import type { Coords } from "@/types";
import type { Target } from "../types";

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "");

// Turn a Google transit leg into plain "board bus N at X, get off at Y" steps.
function parseBusSteps(leg: google.maps.DirectionsLeg): BusStep[] {
  return leg.steps.map((s): BusStep => {
    if (s.travel_mode === google.maps.TravelMode.TRANSIT && s.transit) {
      const t = s.transit;
      const line = t.line?.short_name || t.line?.name || "Bus";
      return {
        mode: "transit",
        text: `Bus ${line} toward ${t.headsign ?? t.arrival_stop?.name ?? "destination"}`,
        sub: `Board at ${t.departure_stop?.name ?? "stop"} · ${t.num_stops} stop${t.num_stops === 1 ? "" : "s"} · get off at ${t.arrival_stop?.name ?? "stop"}`,
      };
    }
    return { mode: "walk", text: stripHtml(s.instructions || "Walk"), sub: s.duration?.text };
  });
}

// Asks how to get to the chosen place. Bus → route drawn on the live map + steps;
// car → spoken taxi tip. Both keep the guide line to the target.
export function TransportCard({
  origin,
  target,
  onBus,
  onCar,
  onBack,
}: {
  origin: Coords | null;
  target: Target;
  onBus: (steps: BusStep[], legs?: BusLeg[]) => void;
  onCar: () => void;
  onBack: () => void;
}) {
  // Offer "By bus" only if we have a real route: first the live Hamuga API,
  // else Google transit (most UB legs have neither → taxi instead).
  const [bus, setBus] = useState<"checking" | "yes" | "no">("checking");
  const legRef = useRef<google.maps.DirectionsLeg | null>(null);
  const routeRef = useRef<BusRoute | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (origin) {
        try {
          const res = await fetch(
            `/api/transit?oLat=${origin.latitude}&oLng=${origin.longitude}&dLat=${target.latitude}&dLng=${target.longitude}`,
          );
          const live: BusRoute | null = res.ok ? await res.json() : null;
          if (cancelled) return;
          if (live) {
            routeRef.current = live;
            return setBus("yes");
          }
        } catch {
          /* fall through to Google below */
        }
      }
      if (!origin || !GOOGLE_MAPS_KEY) return setBus("no");
      try {
        const google = await loadGoogleMaps(GOOGLE_MAPS_KEY);
        if (cancelled) return;
        new google.maps.DirectionsService().route(
          {
            origin: { lat: origin.latitude, lng: origin.longitude },
            destination: { lat: target.latitude, lng: target.longitude },
            travelMode: google.maps.TravelMode.TRANSIT,
          },
          (res: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
            if (cancelled) return;
            const leg = res?.routes?.[0]?.legs?.[0];
            // Google often returns a walking-only "route" when it has no bus data
            // (common in UB) — only count it as a bus if there's a real transit step.
            const hasBus = !!leg?.steps?.some(
              (s) => s.travel_mode === google.maps.TravelMode.TRANSIT,
            );
            legRef.current = status === "OK" && hasBus && leg ? leg : null;
            setBus(legRef.current ? "yes" : "no");
          },
        );
      } catch {
        if (!cancelled) setBus("no");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, target.latitude, target.longitude]);

  const primary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-2.5 text-sm font-bold text-white";
  const secondary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-ink/5 py-2.5 text-sm font-bold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15";

  return (
    <div className="pointer-events-auto animate-rise mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
        How do you want to get to {target.name.split(",")[0]}?
      </p>
      <div className="flex flex-col gap-1.5">
        {bus === "checking" && (
          <p className="px-1 pb-1 text-xs font-semibold text-ink-muted dark:text-white/50">
            Checking for buses…
          </p>
        )}
        {bus === "yes" && (
          <button
            onClick={() =>
              routeRef.current
                ? onBus(routeRef.current.steps, routeRef.current.legs)
                : onBus(legRef.current ? parseBusSteps(legRef.current) : [])
            }
            className={primary}
          >
            🚌 By bus
          </button>
        )}
        {bus === "no" && (
          <p className="rounded-xl bg-ink/5 px-3 py-2 text-xs font-semibold text-ink-muted dark:bg-white/10 dark:text-white/60">
            No direct bus here — a taxi is your best option.
          </p>
        )}
        <button onClick={onCar} className={bus === "yes" ? secondary : primary}>
          🚕 By car / taxi
        </button>
        <button
          onClick={onBack}
          className="mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-ink-muted dark:text-white/50"
        >
          <ChevronLeftIcon size={14} /> Back
        </button>
      </div>
    </div>
  );
}
