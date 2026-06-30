// Turn one day of a user's saved plan into a live-guide route.
//
// The Live Guide runs `DemoRoute`s — each stop needs real coordinates (to plot,
// detect arrival, draw the line) and narration (what Michelle speaks). A plan
// made in the chat only has place names + notes, so here we resolve coordinates
// (from the plan's saved places, else geocoded via the same Places source as
// Explore) and generate narration (falling back to the stop note). Returns null
// if no stop can be placed on the map.

import type { DemoRoute, RouteStop } from "@/types";

type PlanStop = { day: number; time: string; title: string; note?: string };
type PlanPlace = {
  name: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
};

export interface PlanInput {
  id: string;
  title: string;
  summary?: string;
  stops?: PlanStop[] | string[];
  places?: PlanPlace[];
}

// A plan's stops may be a plain string[] (older shape) or structured PlanStop[].
function structured(stops: PlanInput["stops"]): PlanStop[] {
  if (!stops?.length) return [];
  if (typeof stops[0] === "string") {
    return (stops as string[]).map((title) => ({ day: 1, time: "", title }));
  }
  return stops as PlanStop[];
}

// Match a stop title to one of the plan's saved places (exact, then loose).
function findPlace(title: string, places: PlanPlace[]): PlanPlace | undefined {
  const key = title.toLowerCase().trim();
  return (
    places.find((p) => p.name.toLowerCase().trim() === key) ??
    places.find((p) => {
      const n = p.name.toLowerCase().trim();
      return key.includes(n) || n.includes(key);
    })
  );
}

function slug(title: string, i: number): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  return `${base || "stop"}-${i}`;
}

const hasCoords = (lat?: number, lng?: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng);

// Geocode a title via the same Places source Explore/Journey use.
async function geocode(title: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/places?q=${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const top = data?.[0];
    return top && hasCoords(top.latitude, top.longitude)
      ? { lat: top.latitude, lng: top.longitude }
      : null;
  } catch {
    return null;
  }
}

// Generate narration for all stops in one batched call; missing ones fall back
// to the stop note / a template at the call site.
async function narrate(
  stops: { id: string; name: string; context?: string; lat: number; lng: number }[],
): Promise<Record<string, string>> {
  const byId: Record<string, string> = {};
  try {
    const res = await fetch("/api/offline-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stops: stops.map((s) => ({
          id: s.id, name: s.name, kind: "Place", context: s.context, lat: s.lat, lng: s.lng,
        })),
      }),
    });
    if (res.ok) {
      const { texts } = (await res.json()) as { texts?: { id: string; text: string }[] };
      (texts ?? []).forEach((t) => {
        if (t.text?.trim()) byId[t.id] = t.text.trim();
      });
    }
  } catch {
    /* keep the note/template fallback */
  }
  return byId;
}

export async function planDayToRoute(plan: PlanInput, dayNum: number): Promise<DemoRoute | null> {
  const places = plan.places ?? [];
  const dayStops = structured(plan.stops).filter((s) => s.day === dayNum);
  if (!dayStops.length) return null;

  // Resolve coordinates: saved place coords first, else geocode by title.
  const located = await Promise.all(
    dayStops.map(async (s, i) => {
      const place = findPlace(s.title, places);
      let lat = place?.latitude;
      let lng = place?.longitude;
      if (!hasCoords(lat, lng)) {
        const g = await geocode(s.title);
        if (g) {
          lat = g.lat;
          lng = g.lng;
        }
      }
      return hasCoords(lat, lng)
        ? { id: slug(s.title, i), name: s.title, note: s.note, imageUrl: place?.imageUrl, lat: lat as number, lng: lng as number }
        : null;
    }),
  );
  const stops = located.filter((s): s is NonNullable<typeof s> => s !== null);
  if (!stops.length) return null;

  const texts = await narrate(
    stops.map((s) => ({ id: s.id, name: s.name, context: s.note, lat: s.lat, lng: s.lng })),
  );

  const routeStops: RouteStop[] = stops.map((s) => {
    // Generated narration → the stop note (if non-empty) → a generic template.
    const fallback = s.note?.trim()
      ? s.note
      : `You've arrived at ${s.name}. Take your time here, and let me know when you're ready to move on.`;
    return {
      id: s.id,
      name: s.name,
      kind: "Place",
      latitude: s.lat,
      longitude: s.lng,
      arrivalRadius: 150,
      narration: texts[s.id] ?? fallback,
      context: s.note,
      imageUrl: s.imageUrl,
    };
  });

  return {
    id: `plan:${plan.id}:d${dayNum}`,
    title: plan.title,
    region: "ulaanbaatar", // cosmetic — user plans launch from Journey, not the picker
    summary: plan.summary ?? routeStops.map((s) => s.name).join(" → "),
    stops: routeStops,
  };
}
