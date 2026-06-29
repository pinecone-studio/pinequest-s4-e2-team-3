"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { RouteLayer } from "./directions/RouteLayer";
import { PlaceInfoCard } from "./directions/PlaceInfoCard";
import type { LatLng, PlaceDetails, TravelMode } from "./directions/types";
import type { ExploreSpot } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT = { lat: 47.9077, lng: 106.8832 };

const MODES: { mode: TravelMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: "walking",
    label: "Walk",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
        <path d="M9 20l1-5 2 2 2-7"/>
        <path d="M6 9.5l2.5-1.5 3 1 2.5-1"/>
        <path d="M15 20l-1-4"/>
      </svg>
    ),
  },
  {
    mode: "driving",
    label: "Drive",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    ),
  },
  {
    mode: "transit",
    label: "Bus",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="13" rx="2"/>
        <path d="M3 9h18M8 3v4M16 3v4"/>
        <circle cx="7.5" cy="19.5" r="1.5"/><circle cx="16.5" cy="19.5" r="1.5"/>
        <path d="M7.5 18V16h9v2"/>
      </svg>
    ),
  },
];

const GM_MODE: Record<TravelMode, string> = {
  walking: "walking",
  driving: "driving",
  transit: "transit",
};

interface Props { spot: ExploreSpot; onClose: () => void; origin?: LatLng }

export function DirectionsSheet({ spot, onClose, origin: originProp }: Props) {
  const [geoOrigin, setGeoOrigin] = useState<LatLng | null>(null);
  const origin = originProp ?? geoOrigin; // caller's position wins (instant)
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [mode, setMode] = useState<TravelMode>("walking");
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [routeDistanceM, setRouteDistanceM] = useState<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Only fall back to device GPS when the caller didn't supply an origin.
  useEffect(() => {
    if (originProp) return;
    if (!navigator.geolocation) { setGeoOrigin(DEFAULT); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => setGeoOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoOrigin(DEFAULT),
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [originProp]);

  useEffect(() => {
    if (!spot.id || !API_KEY) return;
    fetch(`https://places.googleapis.com/v1/places/${spot.id}`, {
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "currentOpeningHours,regularOpeningHours,reviews,nationalPhoneNumber,websiteUri,userRatingCount",
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDetails(d))
      .catch(() => {});
  }, [spot.id]);

  const destination: LatLng | null =
    spot.latitude != null && spot.longitude != null
      ? { lat: spot.latitude, lng: spot.longitude }
      : null;

  const googleMapsUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=${GM_MODE[mode]}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* Map — top 55% */}
      <div className="relative flex-none bg-sand-100" style={{ height: "55%" }}>
        {origin && destination ? (
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={destination}
              defaultZoom={16}
              mapTypeId="hybrid"
              gestureHandling="greedy"
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              zoomControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              <RouteLayer origin={origin} destination={destination} mode={mode} onDuration={setRouteDuration} onDistanceM={setRouteDistanceM} />
            </Map>
          </APIProvider>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            Getting your location…
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-12 flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        {/* Travel mode selector — floating above info card */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-1.5 backdrop-blur-sm">
          {MODES.map(({ mode: m, label, icon }) => (
            <button
              key={m}
              onClick={() => { setMode(m); setRouteDuration(null); setRouteDistanceM(null); }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === m
                  ? "bg-white text-ink shadow"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <span className={mode === m ? "text-ink" : "text-white/80"}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Info card */}
      <PlaceInfoCard
        spot={spot}
        details={details}
        googleMapsUrl={googleMapsUrl}
        onClose={onClose}
        routeDuration={routeDuration}
        routeDistanceM={routeDistanceM}
        mode={mode}
      />
    </div>
  );
}
