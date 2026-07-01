import { createClient } from "@supabase/supabase-js";
import type { BrowsePlace } from "@/lib/places";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cached } from "@/lib/cache";

// The browse/search screens fire 5–10 /api/places calls per page load, each of
// which used to re-read the whole `places` table. Load it once and share it for
// a short window so those bursts collapse to a single scan. Kept short (60s) so
// admin edits still show up almost immediately — same data, just not re-fetched
// ten times a second.
const PLACES_TTL_MS = 60_000;

function loadAllPlaces(): Promise<DbPlace[]> {
  return cached("custom-places:all", PLACES_TTL_MS, async () => {
    const { data, error } = await db().from("places").select("*");
    if (error || !data) throw new Error(error?.message ?? "no places");
    return data as DbPlace[];
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Reads use the anon client (places is a public, RLS-readable catalog). Writes
// must use the service-role client so RLS can block direct anon-key inserts.
function db() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DbPlace {
  id: string;
  name: string;
  nameEn: string | null;
  nameMn: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  imageUrl: string | null;
  rating: number | null;
}

const TONE: Record<string, BrowsePlace["categoryTone"]> = {
  Food: "amber", Coffee: "amber", Culture: "purple",
  Nightlife: "purple", History: "blue", Nature: "green",
  Shopping: "amber", Viewpoints: "green", Hotels: "blue",
};

function toSpot(p: DbPlace, userLat: number, userLng: number): BrowsePlace {
  const distKm = haversineKm(userLat, userLng, p.latitude, p.longitude);
  const walkMin = Math.max(1, Math.round((distKm * 1000) / 83));
  const cat = p.category ?? "Food";
  return {
    id: p.id,
    title: p.nameEn ?? p.name,
    category: cat,
    categoryTone: TONE[cat] ?? "blue",
    rating: p.rating ?? 4.2,
    distance: `${distKm.toFixed(1)} km`,
    walkTime: `${walkMin} min`,
    description: p.description ?? (p.nameMn ? `(${p.nameMn})` : ""),
    imageUrl: p.imageUrl ?? `https://picsum.photos/seed/${p.id.slice(-4)}/600/400`,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

// Fetch custom places by category near a point (5 km radius)
export async function fetchNearbyCustomPlaces(
  lat: number,
  lng: number,
  category = "all",
): Promise<BrowsePlace[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  let rows: DbPlace[];
  try {
    rows = await loadAllPlaces();
  } catch {
    return [];
  }

  if (category.toLowerCase() !== "all") {
    rows = rows.filter((p) => p.category === category);
  }

  return rows
    .map((p) => ({ ...toSpot(p, lat, lng), _dist: haversineKm(lat, lng, p.latitude, p.longitude) }))
    .filter((p) => p._dist <= 5)
    .sort((a, b) => a._dist - b._dist)
    .map(({ _dist: _, ...rest }) => rest);
}

// Text search within custom places
export async function searchCustomPlaces(
  lat: number,
  lng: number,
  query: string,
): Promise<BrowsePlace[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !query.trim()) return [];

  let rows: DbPlace[];
  try {
    rows = await loadAllPlaces();
  } catch {
    return [];
  }

  // Same match as the previous SQL: case-insensitive substring on any name field
  // or the description.
  const q = query.trim().toLowerCase();
  const has = (v: string | null) => !!v && v.toLowerCase().includes(q);
  return rows
    .filter((p) => has(p.name) || has(p.nameEn) || has(p.nameMn) || has(p.description))
    .map((p) => toSpot(p, lat, lng));
}

// Admin: list all custom places
export async function listAllPlaces(page = 0, pageSize = 50) {
  const { data, error, count } = await db()
    .from("places")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  return { places: (data ?? []) as DbPlace[], total: count ?? 0, error };
}

// Admin: upsert a place
export async function findSimilarPlace(name: string, lat: number, lng: number, excludeId?: string): Promise<DbPlace | null> {
  const delta = 0.001; // ~100m
  const n = name.trim();

  // 1. Coordinate check — most reliable (catches script differences)
  const { data: nearby } = await db()
    .from("places")
    .select("id,name,nameEn,nameMn,category,latitude,longitude,description,imageUrl,rating")
    .gte("latitude", lat - delta)
    .lte("latitude", lat + delta)
    .gte("longitude", lng - delta)
    .lte("longitude", lng + delta)
    .neq("id", excludeId ?? "")
    .limit(1);
  if (nearby?.[0]) return nearby[0] as DbPlace;

  // 2. Name match across all 3 name fields
  const { data } = await db()
    .from("places")
    .select("id,name,nameEn,nameMn,category,latitude,longitude,description,imageUrl,rating")
    .or(`name.ilike.${n},nameEn.ilike.${n},nameMn.ilike.${n}`)
    .neq("id", excludeId ?? "")
    .limit(1);
  return (data?.[0] as DbPlace) ?? null;
}

export async function upsertPlace(place: {
  id?: string;
  name: string;
  nameEn?: string;
  nameMn?: string;
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
  rating?: number;
}) {
  const now = new Date().toISOString();
  const row = {
    id: place.id ?? crypto.randomUUID(),
    name: place.name,
    nameEn: place.nameEn ?? null,
    nameMn: place.nameMn ?? null,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    description: place.description ?? null,
    imageUrl: place.imageUrl ?? null,
    rating: place.rating ?? 4.2,
    updatedAt: now,
    ...(place.id ? {} : { createdAt: now }),
  };
  if (!supabaseAdmin) return { id: undefined, error: { message: "service role not configured" } };
  const { data, error } = await supabaseAdmin.from("places").upsert(row).select("id").single();
  return { id: data?.id as string | undefined, error };
}

// Admin: delete a place
export async function deletePlace(id: string) {
  if (!supabaseAdmin) return { error: { message: "service role not configured" } };
  const { error } = await supabaseAdmin.from("places").delete().eq("id", id);
  return { error };
}

// RAG: vector similarity search over custom places — runs IN the database via
// pgvector (match_places RPC), so we don't load every embedding into JS.
export async function searchCustomPlacesByVector(
  lat: number,
  lng: number,
  queryVector: number[],
  threshold = 0.3,
): Promise<BrowsePlace[]> {
  const { data, error } = await db().rpc("match_places", {
    query_embedding: JSON.stringify(queryVector), // pgvector text form: "[…]"
    match_threshold: threshold,
    match_count: 15,
  });
  if (error || !data) return [];
  return (data as DbPlace[]).map((p) => toSpot(p, lat, lng));
}
