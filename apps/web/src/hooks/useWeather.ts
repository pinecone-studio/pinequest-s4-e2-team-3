"use client";
import { useEffect, useState } from "react";
import type { WeatherNow } from "@/lib/weather";

// Live current weather for a coordinate, via open-meteo (free, no API key).
// Re-fetches whenever the point changes; stays null until the first result so
// the guide degrades gracefully when offline.
export function useWeather(
  point: { latitude: number; longitude: number } | null,
): WeatherNow | null {
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const lat = point?.latitude;
  const lng = point?.longitude;

  useEffect(() => {
    if (lat == null || lng == null) return;
    let cancelled = false;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Asia%2FUlaanbaatar`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const t = d?.current?.temperature_2m;
        const c = d?.current?.weather_code;
        if (typeof t === "number" && typeof c === "number") {
          setWeather({ temperature: Math.round(t), weatherCode: c });
        }
      })
      .catch(() => {
        /* keep last/none — the guide still works without weather */
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return weather;
}
