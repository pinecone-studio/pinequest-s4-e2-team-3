"use client";

import { useEffect, useState } from "react";
import { ExploreCard } from "@/components/ExploreCard";
import { SearchIcon } from "@/components/icons";
import type { ExploreSpot } from "@/types";

const DEFAULT_LAT = 47.9077;
const DEFAULT_LNG = 106.8832;

const ALL_CATEGORIES = ["food", "viewpoints", "culture", "history", "nature"];

function parseKm(distance: string): number {
  return parseFloat(distance.replace(" km", "")) || 999;
}

async function fetchCategory(
  lat: number,
  lng: number,
  category: string,
  limit: number,
): Promise<ExploreSpot[]> {
  try {
    const res = await fetch(
      `/api/places?lat=${lat}&lng=${lng}&category=${category}&limit=${limit}`,
    );
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

function interleaveByCategory(spots: ExploreSpot[]): ExploreSpot[] {
  // Group by category, each group sorted by distance (closest first)
  const groups = new Map<string, ExploreSpot[]>();
  for (const spot of spots) {
    if (!groups.has(spot.category)) groups.set(spot.category, []);
    groups.get(spot.category)!.push(spot);
  }

  // Sort category order by each group's nearest place
  const sorted = Array.from(groups.entries()).sort(
    (a, b) => parseKm(a[1][0].distance) - parseKm(b[1][0].distance),
  );

  // Round-robin: 1 from each category per round
  const result: ExploreSpot[] = [];
  const maxLen = Math.max(...sorted.map(([, g]) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const [, group] of sorted) {
      if (i < group.length) result.push(group[i]);
    }
  }
  return result;
}

async function fetchPlaces(
  lat: number,
  lng: number,
  category: string,
): Promise<ExploreSpot[]> {
  if (category.toLowerCase() !== "all") {
    const places = await fetchCategory(lat, lng, category, 20);
    return places.sort((a, b) => parseKm(a.distance) - parseKm(b.distance));
  }

  // "All": 5 per category → deduplicate → interleave by category (round-robin)
  const results = await Promise.all(
    ALL_CATEGORIES.map((cat) => fetchCategory(lat, lng, cat, 5)),
  );

  const seen = new Set<string>();
  const deduped = results.flat().filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Sort within each category by distance before interleaving
  const byCat = new Map<string, ExploreSpot[]>();
  for (const p of deduped) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }
  for (const g of byCat.values()) g.sort((a, b) => parseKm(a.distance) - parseKm(b.distance));

  return interleaveByCategory([...byCat.values()].flat());
}

interface WeatherCtx { code: number; hour: number }

function applyWeatherBoost(spots: ExploreSpot[], w: WeatherCtx, category: string): ExploreSpot[] {
  if (category.toLowerCase() !== "all") return spots;

  const rainy = [51,53,55,61,63,65,80,81,82,95].includes(w.code);
  const snowy = [71,73,75].includes(w.code);
  const morning = w.hour >= 5 && w.hour < 10;
  const eveningClear = w.hour >= 17 && w.hour < 20 && [0,1].includes(w.code);
  const evening = w.hour >= 18 && w.hour < 22;

  let boostCats: string[] = [];
  let highlight = "";

  if (rainy || snowy) { boostCats = ["Culture", "Coffee"]; highlight = "Good indoor pick"; }
  else if (eveningClear) { boostCats = ["Viewpoint"]; highlight = "Golden hour"; }
  else if (morning) { boostCats = ["Viewpoint", "Nature"]; highlight = "Best in the morning"; }
  else if (evening) { boostCats = ["Food", "Nightlife"]; highlight = "Evening pick"; }

  if (!boostCats.length) return spots;

  const boosted = spots.filter(s => boostCats.includes(s.category)).map(s => ({ ...s, highlight }));
  const rest = spots.filter(s => !boostCats.includes(s.category));
  return [...boosted, ...rest];
}

interface Props {
  category: string;
  weather?: WeatherCtx | null;
}

export function PlacesList({ category, weather }: Props) {
  const [spots, setSpots] = useState<ExploreSpot[]>([]);
  const [searchResults, setSearchResults] = useState<ExploreSpot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [userLatLng, setUserLatLng] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  // Load nearby places by category
  useEffect(() => {
    setLoading(true);
    setSpots([]);
    setSearchResults(null);
    setQuery("");

    function load(lat: number, lng: number) {
      setUserLatLng({ lat, lng });
      fetchPlaces(lat, lng, category).then((data) => {
        setSpots(data);
        setLoading(false);
      });
    }

    if (!navigator.geolocation) { load(DEFAULT_LAT, DEFAULT_LNG); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(DEFAULT_LAT, DEFAULT_LNG),
      { timeout: 5000, maximumAge: 60000 },
    );
  }, [category]);

  // Search: client-side first, fallback to API if < 2 local matches
  useEffect(() => {
    const q = query.trim();
    if (!q) { setSearchResults(null); return; }

    // Instant client-side filter
    const local = spots.filter((s) =>
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      s.category.toLowerCase().includes(q.toLowerCase()) ||
      s.description.toLowerCase().includes(q.toLowerCase()),
    );

    if (local.length >= 2) {
      setSearchResults(local);
      return;
    }

    // Not enough local matches — call API after debounce
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/places?lat=${userLatLng.lat}&lng=${userLatLng.lng}&q=${encodeURIComponent(q)}`)
        .then((r) => r.ok ? r.json() : [])
        .then((data: ExploreSpot[]) => {
          setSearchResults(data.length > 0 ? data : local);
          setSearching(false);
        })
        .catch(() => { setSearchResults(local); setSearching(false); });
    }, 400);
    return () => clearTimeout(t);
  }, [query, spots, userLatLng]);

  const q = query.trim().toLowerCase();
  const filtered = (() => {
    if (q && searchResults !== null) return searchResults;
    const base = weather && !q ? applyWeatherBoost(spots, weather, category) : spots;
    return base;
  })();

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-ink-sm">
        <SearchIcon size={18} className="text-ink-muted shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places, food, events…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        {query && (
          searching
            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink/60 shrink-0" />
            : <button onClick={() => setQuery("")} className="text-ink-muted hover:text-ink shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        [1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-3xl bg-white/60" />
        ))
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          {query ? `No results for "${query}"` : "No places found."}
        </p>
      ) : (
        filtered.map((spot) => <ExploreCard key={spot.id} spot={spot} />)
      )}
    </div>
  );
}
