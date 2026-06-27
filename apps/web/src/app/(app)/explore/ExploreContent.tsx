"use client";

import { useState } from "react";
import { GuideBanner } from "./GuideBanner";
import { PlacesList } from "./PlacesList";

interface Props { category: string }

export function ExploreContent({ category }: Props) {
  const [weather, setWeather] = useState<{ code: number; hour: number } | null>(null);

  return (
    <>
      <GuideBanner onWeather={(code, hour) => setWeather({ code, hour })} />
      <PlacesList category={category} weather={weather} />
    </>
  );
}
