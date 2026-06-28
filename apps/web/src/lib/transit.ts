import type { Coords } from "@/types";

// One readable step of a bus plan: a walk segment or a bus to board.
export type BusStep = { mode: "walk" | "transit"; text: string; sub?: string };
// One drawable leg: its decoded road geometry + whether it's walk or bus.
export type BusLeg = { mode: "walk" | "transit"; pts: Coords[]; routeName?: string };
export type BusRoute = { steps: BusStep[]; legs: BusLeg[] };

// ---------------------------------------------------------------------------
// Hamuga (gateway.hamuga.mn) OTP-style transit planner — real UB bus data.
// Server-side only (API key + billed calls); apps/web/.env: HAMUGA_API_KEY.
// ---------------------------------------------------------------------------

const HAMUGA_URL = "https://gateway.hamuga.mn/route/routers/default/plan";

type OtpPlace = { name: string; lat: number; lon: number; stopId?: string };
type OtpLeg = {
  mode: string;
  startTime: number;
  endTime: number;
  routeShortName?: string;
  headsign?: string;
  numIntermediateStops?: number;
  from: OtpPlace;
  to: OtpPlace;
  legGeometry?: { points: string };
};
type OtpResponse = {
  plan?: { itineraries?: { legs: OtpLeg[] }[] };
};

// Make Cyrillic UB stop names readable for foreign travellers: translate the
// slash-bracketed compass words, then transliterate the rest to Latin.
const CYR_LAT: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo", Ж: "J", З: "Z",
  И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", Ө: "O", П: "P",
  Р: "R", С: "S", Т: "T", У: "U", Ү: "U", Ф: "F", Х: "Kh", Ц: "Ts", Ч: "Ch",
  Ш: "Sh", Щ: "Sh", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
const DIRECTIONS: Record<string, string> = {
  Зүүн: "East", Баруун: "West", Хойд: "North", Урд: "South", Төв: "Center",
};

function romanize(s?: string): string {
  if (!s) return "";
  const dir = s.replace(/\/([^/]+)\//g, (_, w: string) => `/${DIRECTIONS[w.trim()] ?? w}/`);
  return dir.replace(/[Ѐ-ӿӨөҮү]/g, (ch) => CYR_LAT[ch] ?? ch);
}

// Decodes a Google/OTP encoded polyline string into lat/lng points.
export function decodePolyline(encoded: string): Coords[] {
  const points: Coords[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0, b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// Real transit plan from the Hamuga API, or null if no bus route / unavailable.
// Server-side only — uses HAMUGA_API_KEY, never call from client components.
export async function fetchHamugaRoute(origin: Coords, dest: Coords): Promise<BusRoute | null> {
  const key = process.env.HAMUGA_API_KEY;
  if (!key) return null;

  // OTP needs an explicit date/time in service range — "now" (omitted) yields
  // PATH_NOT_FOUND. Use local UB time; request several so a walk-only itinerary
  // doesn't steal the single slot, then pick the first that actually rides a bus.
  // ponytail: clamp to daytime so the demo still shows buses at night (buses
  // don't run ~22:00–06:00); drop the clamp when departure time should be exact.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const hour = d.getHours();
  const time = hour < 7 || hour >= 22 ? "09:00:00" : `${pad(hour)}:${pad(d.getMinutes())}:00`;
  const url = new URL(HAMUGA_URL);
  url.searchParams.set("fromPlace", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("toPlace", `${dest.latitude},${dest.longitude}`);
  url.searchParams.set("mode", "TRANSIT,WALK");
  url.searchParams.set("date", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  url.searchParams.set("time", time);
  url.searchParams.set("numItineraries", "5");

  try {
    const res = await fetch(url, { headers: { "X-API-KEY": key } });
    if (!res.ok) return null;
    const data: OtpResponse = await res.json();
    const itin = data.plan?.itineraries?.find((it) => it.legs.some((l) => l.mode === "BUS"));
    if (!itin) return null;

    const steps: BusStep[] = itin.legs.map((leg) => {
      const minutes = Math.max(1, Math.round((leg.endTime - leg.startTime) / 60000));
      if (leg.mode === "WALK") {
        return { mode: "walk", text: `Walk to ${romanize(leg.to.name)}`, sub: `~${minutes} min` };
      }
      const stops = leg.numIntermediateStops != null ? `${leg.numIntermediateStops + 1} stops · ` : "";
      const toward = romanize(leg.headsign) || romanize(leg.to.name);
      return {
        mode: "transit",
        text: `Bus ${romanize(leg.routeShortName)} toward ${toward}`,
        sub: `Board at ${romanize(leg.from.name)} · ${stops}~${minutes} min · get off at ${romanize(leg.to.name)}`,
      };
    });
    const legs: BusLeg[] = itin.legs.map((leg) => ({
      mode: leg.mode === "WALK" ? "walk" : "transit",
      routeName: romanize(leg.routeShortName),
      pts: leg.legGeometry ? decodePolyline(leg.legGeometry.points) : [
        { latitude: leg.from.lat, longitude: leg.from.lon },
        { latitude: leg.to.lat, longitude: leg.to.lon },
      ],
    }));
    return { steps, legs };
  } catch {
    return null;
  }
}
