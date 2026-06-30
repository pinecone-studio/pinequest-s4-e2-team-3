"use client";

import { MapPinIcon } from "@/components/icons";
import { weatherEmoji, type WeatherNow } from "@/lib/weather";

// Compact HUD pill overlaid on the map — current location + weather on one line.
// "Next stop" lives only in NextStepCard to avoid showing the same info twice.
export function JourneyPill({
  currentName,
  weather,
}: {
  currentName: string;
  weather: WeatherNow | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-ink/[0.08] px-2.5 py-1.5 backdrop-blur-sm dark:bg-white/[0.12]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
        <MapPinIcon size={11} />
      </span>
      <p className="max-w-[7rem] truncate text-xs font-bold leading-none">
        <span className="text-ink-muted dark:text-white/50">Now · </span>
        {currentName}
      </p>
      {weather && (
        <p className="shrink-0 text-xs font-semibold leading-none text-ink-muted dark:text-white/60">
          {weatherEmoji(weather.weatherCode)} {weather.temperature}°
        </p>
      )}
    </div>
  );
}
