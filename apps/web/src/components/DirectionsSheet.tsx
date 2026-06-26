"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { RouteLayer } from "./directions/RouteLayer";
import { PlaceInfoCard } from "./directions/PlaceInfoCard";
import type { LatLng, PlaceDetails } from "./directions/types";
import type { ExploreSpot } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT = { lat: 47.9077, lng: 106.8832 };

interface Props { spot: ExploreSpot; onClose: () => void }

export function DirectionsSheet({ spot, onClose }: Props) {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [details, setDetails] = useState<PlaceDetails | null>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Real-time location
  useEffect(() => {
    if (!navigator.geolocation) { setOrigin(DEFAULT); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setOrigin(DEFAULT),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Fetch place details (hours, reviews, phone, website)
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
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=walking`
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
              <RouteLayer origin={origin} destination={destination} />
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
      </div>

      {/* Info card */}
      <PlaceInfoCard
        spot={spot}
        details={details}
        googleMapsUrl={googleMapsUrl}
        onClose={onClose}
      />
    </div>
  );
}
