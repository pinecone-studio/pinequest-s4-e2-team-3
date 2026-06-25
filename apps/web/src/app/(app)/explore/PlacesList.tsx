"use client";

import { useEffect, useState } from "react";
import { ExploreCard } from "@/components/ExploreCard";
import type { ExploreSpot } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
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
      `${API_URL}/api/v1/places?lat=${lat}&lng=${lng}&category=${category}&limit=${limit}`,
    );
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
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

  // All: категори бүрээс 5 газар авч зайгаар эрэмбэлнэ
  const results = await Promise.all(
    ALL_CATEGORIES.map((cat) => fetchCategory(lat, lng, cat, 5)),
  );

  return results
    .flat()
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .sort((a, b) => parseKm(a.distance) - parseKm(b.distance));
}

interface Props {
  category: string;
}

export function PlacesList({ category }: Props) {
  const [spots, setSpots] = useState<ExploreSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSpots([]);

    function load(lat: number, lng: number) {
      fetchPlaces(lat, lng, category).then((data) => {
        setSpots(data);
        setLoading(false);
      });
    }

    if (!navigator.geolocation) {
      load(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(DEFAULT_LAT, DEFAULT_LNG),
      { timeout: 5000, maximumAge: 60000 },
    );
  }, [category]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-3xl bg-white/60" />
        ))}
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        Газар олдсонгүй.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {spots.map((spot) => (
        <ExploreCard key={spot.id} spot={spot} />
      ))}
    </div>
  );
}
