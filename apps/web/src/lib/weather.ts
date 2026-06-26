// Shared weather helpers, keyed on open-meteo's WMO weather codes.
// Used by the Live Guide (condition-based narration) and can back the Explore
// banner too.

export interface WeatherNow {
  temperature: number; // °C, rounded
  weatherCode: number; // WMO code
}

export const WMO_DESC: Record<number, string> = {
  0: "clear skies", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
  45: "foggy", 48: "foggy", 51: "light drizzle", 53: "drizzle", 55: "drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain",
  71: "light snow", 73: "snow", 75: "heavy snow",
  80: "showers", 81: "showers", 82: "heavy showers",
  95: "thunderstorm",
};

const RAINY = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95];
const SNOWY = [71, 73, 75];

export function weatherLabel(code: number): string {
  return WMO_DESC[code] ?? "clear skies";
}

export function weatherEmoji(code: number): string {
  if (RAINY.includes(code)) return "🌧";
  if (SNOWY.includes(code)) return "❄️";
  if ([45, 48].includes(code)) return "🌫";
  if ([2, 3].includes(code)) return "☁️";
  return "☀️";
}

// A short, spoken-friendly line Michelle adds on arrival, adapted to the live
// conditions and whether this stop is mostly outdoors. Kept deterministic (no
// network/AI) so it's instant and works offline.
export function weatherTip(
  code: number,
  temp: number,
  hour: number,
  stopKind?: string,
): string {
  const isRainy = RAINY.includes(code);
  const isSnowy = SNOWY.includes(code);
  const isClear = [0, 1].includes(code);
  const outdoor = /square|nature|lake|canyon|dune|monastery|airport|shore|town|village/i.test(
    stopKind ?? "",
  );

  if (isSnowy)
    return `It's ${temp} degrees and snowing — wrap up warm and watch your footing${
      outdoor ? ", the outdoor stretches will be slippery" : ""
    }.`;
  if (isRainy)
    return outdoor
      ? `It's ${temp} degrees with rain right now, so keep a rain layer handy and take cover where you can.`
      : `It's ${temp} degrees and raining outside — good thing this stop keeps you indoors.`;
  if (temp <= 0)
    return `It's freezing at ${temp} degrees — dress in layers and keep your phone warm so the battery lasts.`;
  if (isClear && hour >= 17 && hour < 21)
    return `It's a clear ${temp}-degree evening — lovely golden light for photos right about now.`;
  if (isClear && temp >= 22)
    return `It's a clear ${temp} degrees — great conditions, just bring water and sun cover.`;
  return `It's ${temp} degrees and ${weatherLabel(code)} right now.`;
}
