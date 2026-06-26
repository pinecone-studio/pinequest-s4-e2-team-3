"use client";

import { useEffect, useState } from "react";
import { Tag } from "@/components/Tag";
import { DirectionsSheet } from "@/components/DirectionsSheet";
import type { ExploreSpot, Tone } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DEFAULT_LAT = 47.9077;
const DEFAULT_LNG = 106.8832;

const CATEGORIES = ["food", "viewpoints", "culture", "history", "nature"];

interface NearbyPlace {
  id: string;
  title: string;
  category: string;
  categoryTone: Tone;
  walkTime: string;
  distance: string;
  distanceKm: number;
  imageUrl: string;
  rating: number;
  latitude?: number;
  longitude?: number;
}

function parseKm(distance: string): number {
  return parseFloat(distance.replace(" km", "")) || 999;
}

function toSpot(p: NearbyPlace): ExploreSpot {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    categoryTone: p.categoryTone,
    rating: p.rating ?? 4.0,
    distance: p.distance,
    walkTime: p.walkTime,
    description: "",
    imageUrl: p.imageUrl,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

export function NearbySection() {
  const [spots, setSpots] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchNearby(lat: number, lng: number) {
      Promise.all(
        CATEGORIES.map((cat) =>
          fetch(`${API_URL}/api/v1/places?lat=${lat}&lng=${lng}&category=${cat}&limit=5`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [] as NearbyPlace[]),
        ),
      ).then((results) => {
        const seen = new Set<string>();
        const all: NearbyPlace[] = [];

        for (const catPlaces of results) {
          const unique = (catPlaces as NearbyPlace[]).find((p) => !seen.has(p.id));
          if (unique) {
            seen.add(unique.id);
            all.push({ ...unique, distanceKm: parseKm(unique.distance) });
          }
        }

        setSpots(all);
        setLoading(false);
      });
    }

    if (!navigator.geolocation) {
      fetchNearby(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchNearby(pos.coords.latitude, pos.coords.longitude),
      () => fetchNearby(DEFAULT_LAT, DEFAULT_LNG),
      { timeout: 10000, maximumAge: 0 },
    );
  }, []);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 w-44 shrink-0 animate-pulse rounded-3xl bg-white/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {spots.map((spot, i) => (
        <NearbyCard key={`${spot.id}-${i}`} spot={spot} />
      ))}
    </div>
  );
}

function NearbyCard({ spot }: { spot: NearbyPlace }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm text-left active:scale-[0.98] transition-transform"
      >
        <div className="relative h-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={spot.imageUrl} alt={spot.title} className="h-full w-full object-cover" />
          <div className="absolute left-2 top-2">
            <Tag label={spot.category} tone={spot.categoryTone} />
          </div>
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-bold text-ink">{spot.title}</p>
          <p className="mt-1 text-xs text-ink-muted">{spot.walkTime} · {spot.distance}</p>
        </div>
      </button>

      {open && <DirectionsSheet spot={toSpot(spot)} onClose={() => setOpen(false)} />}
    </>
  );
}
