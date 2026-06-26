"use client";

import { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { ClockIcon, MapPinIcon, StarIcon } from "@/components/icons";
import type { ExploreSpot } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_LAT = 47.9077;
const DEFAULT_LNG = 106.8832;

interface LatLng { lat: number; lng: number }

const svgUrl = (content: string) =>
  "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(content);

const YOU_ICON = {
  url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#4F46E5" fill-opacity="0.2"/>
    <circle cx="10" cy="10" r="6" fill="#4F46E5" stroke="white" stroke-width="2"/>
  </svg>`),
  scaledSize: { width: 20, height: 20 } as google.maps.Size,
  anchor: { x: 10, y: 10 } as google.maps.Point,
};

const DEST_ICON = {
  url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">
    <path d="M11 0C4.925 0 0 4.925 0 11c0 7.333 11 30 11 30s11-22.667 11-30C22 4.925 17.075 0 11 0z" fill="#EF4444"/>
    <circle cx="11" cy="11" r="4.5" fill="white"/>
  </svg>`),
  scaledSize: { width: 22, height: 30 } as google.maps.Size,
  anchor: { x: 11, y: 30 } as google.maps.Point,
};

function RouteLayer({ origin, destination }: { origin: LatLng; destination: LatLng }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const youMarkerRef = useRef<google.maps.Marker | null>(null);

  // Draw route and markers once
  useEffect(() => {
    if (!map || !routesLib) return;

    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#4F46E5", strokeWeight: 4, strokeOpacity: 0.85 },
    });

    new routesLib.DirectionsService().route(
      { origin, destination, travelMode: routesLib.TravelMode.WALKING },
      (result, status) => {
        if (status === "OK" && result) renderer.setDirections(result);
      },
    );

    // Destination pin (red, fixed)
    const destMarker = new google.maps.Marker({
      position: destination,
      map,
      icon: {
        url: DEST_ICON.url,
        scaledSize: new google.maps.Size(DEST_ICON.scaledSize.width, DEST_ICON.scaledSize.height),
        anchor: new google.maps.Point(DEST_ICON.anchor.x, DEST_ICON.anchor.y),
      },
    });

    // "You" dot (blue, will move)
    youMarkerRef.current = new google.maps.Marker({
      position: origin,
      map,
      icon: {
        url: YOU_ICON.url,
        scaledSize: new google.maps.Size(YOU_ICON.scaledSize.width, YOU_ICON.scaledSize.height),
        anchor: new google.maps.Point(YOU_ICON.anchor.x, YOU_ICON.anchor.y),
      },
    });

    return () => {
      renderer.setMap(null);
      destMarker.setMap(null);
      youMarkerRef.current?.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routesLib]);

  // Smoothly update "You" dot as user moves
  useEffect(() => {
    youMarkerRef.current?.setPosition(origin);
  }, [origin]);

  return null;
}

interface Props {
  spot: ExploreSpot;
  onClose: () => void;
}

export function DirectionsSheet({ spot, onClose }: Props) {
  const [origin, setOrigin] = useState<LatLng | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Watch position so the dot moves as user walks
  useEffect(() => {
    if (!navigator.geolocation) {
      setOrigin({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOrigin({ lat: DEFAULT_LAT, lng: DEFAULT_LNG }),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const destination: LatLng | null =
    spot.latitude != null && spot.longitude != null
      ? { lat: spot.latitude, lng: spot.longitude }
      : null;

  const center = destination ?? { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 flex h-[92vh] flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink/20" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink">{spot.title}</h3>
            <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-ink-muted">
              <span className="flex items-center gap-1"><MapPinIcon size={12} /> {spot.distance}</span>
              <span className="flex items-center gap-1"><ClockIcon size={12} /> {spot.walkTime} walk</span>
              <span className="flex items-center gap-1"><StarIcon size={12} /> {spot.rating}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/8 text-sm text-ink-muted hover:bg-ink/15"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden px-4 pb-6">
          <div className="h-full overflow-hidden rounded-2xl">
            {origin && destination ? (
              <APIProvider apiKey={API_KEY}>
                <Map
                  defaultCenter={center}
                  defaultZoom={16}
                  gestureHandling="greedy"
                  mapTypeControl={false}
                  streetViewControl={false}
                  fullscreenControl={false}
                  style={{ width: "100%", height: "100%" }}
                >
                  <RouteLayer origin={origin} destination={destination} />
                </Map>
              </APIProvider>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-sand-100 text-sm text-ink-muted">
                Getting your location…
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
