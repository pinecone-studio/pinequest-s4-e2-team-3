"use client";

import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { LatLng, TravelMode } from "./types";

const svgUrl = (content: string) =>
  "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(content);

const DEST_PIN = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">
  <path d="M11 0C4.925 0 0 4.925 0 11c0 7.333 11 30 11 30s11-22.667 11-30C22 4.925 17.075 0 11 0z" fill="#EF4444"/>
  <circle cx="11" cy="11" r="4.5" fill="white"/>
</svg>`);

const YOU_DOT = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="10" fill="#4F46E5" fill-opacity="0.2"/>
  <circle cx="10" cy="10" r="6" fill="#4F46E5" stroke="white" stroke-width="2"/>
</svg>`);

const POLYLINE_COLOR: Record<TravelMode, string> = {
  walking: "#4F46E5",
  driving: "#3B82F6",
  transit: "#10B981",
};

export function RouteLayer({
  origin,
  destination,
  mode,
  onDuration,
  onDistanceM,
}: {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
  onDuration?: (duration: string) => void;
  onDistanceM?: (meters: number) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const youRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || !routesLib) return;

    const gmMode =
      mode === "driving" ? routesLib.TravelMode.DRIVING
      : mode === "transit" ? routesLib.TravelMode.TRANSIT
      : routesLib.TravelMode.WALKING;

    const polylineOptions: google.maps.PolylineOptions =
      mode === "walking"
        ? {
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: POLYLINE_COLOR.walking,
                  fillOpacity: 1,
                  strokeOpacity: 0,
                  scale: 3.5,
                },
                offset: "0",
                repeat: "14px",
              },
            ],
          }
        : {
            strokeColor: POLYLINE_COLOR[mode],
            strokeWeight: 4,
            strokeOpacity: 0.9,
          };

    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions,
    });

    new routesLib.DirectionsService().route(
      { origin, destination, travelMode: gmMode },
      (result, status) => {
        if (status === "OK" && result) {
          renderer.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg?.duration?.text) onDuration?.(leg.duration.text);
          if (leg?.distance?.value) onDistanceM?.(leg.distance.value);
        }
      },
    );

    new google.maps.Marker({
      position: destination,
      map,
      icon: {
        url: DEST_PIN,
        scaledSize: new google.maps.Size(22, 30),
        anchor: new google.maps.Point(11, 30),
      },
    });

    youRef.current = new google.maps.Marker({
      position: origin,
      map,
      icon: {
        url: YOU_DOT,
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10),
      },
    });

    // Traffic layer — always visible so congestion is clear
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    return () => {
      renderer.setMap(null);
      youRef.current?.setMap(null);
      trafficLayer.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routesLib, mode]);

  useEffect(() => { youRef.current?.setPosition(origin); }, [origin]);

  return null;
}
