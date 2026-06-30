"use client";

import { formatDistance, haversineMeters } from "@/lib/geo";
import type { Coords, PlaceOption } from "@/types";

// Nearby places Michelle found — tap one to head there (then choose transport).
export function SuggestionList({
  suggestions,
  userCoords,
  onPick,
  onDismiss,
}: {
  suggestions: PlaceOption[];
  userCoords: Coords | null;
  onPick: (place: PlaceOption) => void;
  onDismiss: () => void;
}) {
  const transit = suggestions.some((s) => s.kind === "transit");
  return (
    <div className="animate-rise pointer-events-auto mt-3 rounded-3xl bg-white p-3 shadow-sm dark:bg-white/[0.07] dark:shadow-none">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-white/50">
          {suggestions.length} {transit ? "stops" : "places"} nearby — tap to go
        </p>
        <button onClick={onDismiss} className="text-xs font-semibold text-ink-muted dark:text-white/50">
          Hide
        </button>
      </div>
      {/* Numbered + colour-coded to match the map markers, so the traveller can
          tell which dot is which place at a glance. */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((place, i) => {
          const dist = userCoords ? formatDistance(haversineMeters(userCoords, place)) : null;
          const color = place.kind === "transit" ? "#1F9D6B" : "#D9831F";
          return (
            <button
              key={place.id}
              onClick={() => onPick(place)}
              className="flex items-center gap-1.5 rounded-full bg-ink/5 px-2 py-1.5 pr-3 text-xs font-semibold text-ink hover:bg-ink/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              <span className="max-w-[9rem] truncate">{place.name}</span>
              {dist && <span className="text-ink-muted dark:text-white/50">· {dist}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
