import { createClient } from "@supabase/supabase-js";
import type { BrowsePlace } from "@/lib/places";
import { cosineSimilarity } from "@/lib/embed";
import { loadEmbeddings } from "@/lib/embeddingStore";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

  let q = db().from("places").select("*");
  if (category.toLowerCase() !== "all") {
    q = q.eq("category", category);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  return (data as DbPlace[])
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

  const { data, error } = await db()
    .from("places")
    .select("*")
    .or(`name.ilike.%${query}%,nameEn.ilike.%${query}%,nameMn.ilike.%${query}%,description.ilike.%${query}%`);

  if (error || !data) return [];
  return (data as DbPlace[]).map((p) => toSpot(p, lat, lng));
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
  const { data, error } = await db().from("places").upsert(row).select("id").single();
  return { id: data?.id as string | undefined, error };
}

// Admin: delete a place
export async function deletePlace(id: string) {
  const { error } = await db().from("places").delete().eq("id", id);
  return { error };
}

// RAG: vector similarity search over custom places
export async function searchCustomPlacesByVector(
  lat: number,
  lng: number,
  queryVector: number[],
  threshold = 0.3,
): Promise<BrowsePlace[]> {
  const embeddings = await loadEmbeddings();
  const entries = Object.entries(embeddings);
  if (!entries.length) return [];

  const scored = entries
    .map(([id, vec]) => ({ id, score: cosineSimilarity(queryVector, vec) }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  if (!scored.length) return [];

  const ids = scored.map((x) => x.id);
  const { data, error } = await db().from("places").select("*").in("id", ids);
  if (error || !data) return [];

  return (data as DbPlace[]).map((p) => toSpot(p, lat, lng));
}
