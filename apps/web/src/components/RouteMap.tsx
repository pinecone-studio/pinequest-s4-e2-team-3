"use client";

import type { ComponentProps } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, MAP_STYLE } from "@/lib/mapbox";
import type { Coords, DemoRoute } from "@/types";

type SourceData = ComponentProps<typeof Source>["data"];

// Interactive Mapbox map for the Live Guide: draws the journey route line,
// numbered stop markers, and the traveller's current position. Rendered only
// when a Mapbox token exists (gated by the caller) and lazily (ssr: false).
export default function RouteMap({
  route,
  currentIndex,
  position,
}: {
  route: DemoRoute;
  currentIndex: number;
  position: Coords | null;
}) {
  const coordinates = route.stops.map(
    (s) => [s.longitude, s.latitude] as [number, number],
  );

  const lineData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      },
    ],
  } as SourceData;

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle={MAP_STYLE.dark}
      initialViewState={{
        longitude: coordinates[0][0],
        latitude: coordinates[0][1],
        zoom: 5,
      }}
      attributionControl={false}
      style={{ width: "100%", height: "100%" }}
      onLoad={(e) => {
        const lons = coordinates.map((c) => c[0]);
        const lats = coordinates.map((c) => c[1]);
        e.target.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 70, duration: 0, maxZoom: 14 },
        );
      }}
    >
      <Source id="route-line" type="geojson" data={lineData}>
        <Layer
          id="route-line-layer"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": "#2f6bff",
            "line-width": 3,
            "line-dasharray": [1, 1.8],
          }}
        />
      </Source>

      {route.stops.map((stop, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;
        return (
          <Marker
            key={stop.id}
            longitude={stop.longitude}
            latitude={stop.latitude}
            anchor="center"
          >
            <span
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-[#0d1422]",
                isCurrent
                  ? "bg-primary-600 text-white"
                  : isPast
                    ? "bg-safety-safe text-white"
                    : "bg-white text-primary-900",
              ].join(" ")}
            >
              {i + 1}
            </span>
          </Marker>
        );
      })}

      {position && (
        <Marker
          longitude={position.longitude}
          latitude={position.latitude}
          anchor="center"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 ring-8 ring-primary-600/20">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
        </Marker>
      )}
    </Map>
  );
}
