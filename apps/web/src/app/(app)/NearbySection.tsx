"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag } from "@/components/Tag";
import type { Tone } from "@/types";

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
}

function parseKm(distance: string): number {
  return parseFloat(distance.replace(" km", "")) || 999;
}

export function NearbySection() {
  const [spots, setSpots] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchNearby(lat: number, lng: number) {
      // Take 5 from each category, then pick the closest non-duplicate ones.
      Promise.all(
        CATEGORIES.map((cat) =>
          fetch(
            `/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=5`,
          )
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [] as NearbyPlace[]),
        ),
      ).then((results) => {
        const seen = new Set<string>();
        const all: NearbyPlace[] = [];

        for (const catPlaces of results) {
          // Find the closest place in this category we haven't used yet.
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
          <div
            key={i}
            className="h-44 w-44 shrink-0 animate-pulse rounded-3xl bg-white/60"
          />
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
  return (
    <Link
      href="/explore"
      className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm"
    >
      <div className="relative h-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spot.imageUrl}
          alt={spot.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <Tag label={spot.category} tone={spot.categoryTone} />
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold text-ink">{spot.title}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {spot.walkTime} · {spot.distance}
        </p>
      </div>
    </Link>
  );
}
