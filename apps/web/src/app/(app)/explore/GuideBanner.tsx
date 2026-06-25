"use client";

import { useEffect, useState } from "react";
import { SunIcon } from "@/components/icons";

const DEFAULT_LAT = 47.9077;
const DEFAULT_LNG = 106.8832;

const WMO_DESC: Record<number, string> = {
  0: "clear skies", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
  45: "foggy", 48: "foggy", 51: "light drizzle", 53: "drizzle", 55: "drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain",
  71: "light snow", 73: "snow", 75: "heavy snow",
  80: "showers", 81: "showers", 82: "heavy showers",
  95: "thunderstorm",
};

function getTimeMessage(hour: number, weatherCode: number, temp: number): string {
  const isRainy = [51,53,55,61,63,65,80,81,82,95].includes(weatherCode);
  const isSnowy = [71,73,75].includes(weatherCode);
  const isClear = [0,1].includes(weatherCode);
  const desc = WMO_DESC[weatherCode] ?? "clear skies";

  if (isRainy)
    return `${temp}° & ${desc}. Indoor spots like museums and cafés are highlighted.`;
  if (isSnowy)
    return `${temp}° & ${desc}. I've pushed indoor venues to the top for you.`;

  if (hour < 9)
    return `${temp}° & ${desc}. Early morning — quiet spots and viewpoints are at their best right now.`;
  if (hour < 12)
    return `${temp}° & ${desc}. Great morning to explore — outdoor attractions are highlighted.`;
  if (hour < 15)
    return `${temp}° & ${desc}. Peak hours. I've surfaced the calmer, less crowded spots.`;
  if (hour < 17)
    return `${temp}° & ${desc}. Perfect afternoon for sightseeing — enjoy the city.`;
  if (hour < 19 && isClear) {
    const goldenMinute = (hour >= 17) ? "20" : "40";
    return `${temp}° & ${desc}. I pushed sunset viewpoints to the top — golden hour hits at ${hour + 1}:${goldenMinute}.`;
  }
  if (hour < 21)
    return `${temp}° & ${desc}. Evening mode — restaurants and cultural venues are active.`;

  return `${temp}° & ${desc}. Late night — quiet and relaxing spots are highlighted.`;
}

export function GuideBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function fetchWeather(lat: number, lng: number) {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Asia%2FUlaanbaatar`,
      )
        .then((r) => r.json())
        .then((data) => {
          const temp = Math.round(data?.current?.temperature_2m ?? 20);
          const code = data?.current?.weather_code ?? 0;
          const hour = new Date().getHours();
          setMessage(getTimeMessage(hour, code, temp));
        })
        .catch(() => {
          const hour = new Date().getHours();
          setMessage(getTimeMessage(hour, 0, 20));
        });
    }

    if (!navigator.geolocation) {
      fetchWeather(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(DEFAULT_LAT, DEFAULT_LNG),
      { timeout: 5000, maximumAge: 60000 },
    );
  }, []);

  return (
    <div className="flex items-start gap-3 rounded-3xl bg-primary-50 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
        <SunIcon size={18} />
      </span>
      <p className="text-sm font-medium text-ink">
        {message ?? "Getting your location and current weather…"}
      </p>
    </div>
  );
}
