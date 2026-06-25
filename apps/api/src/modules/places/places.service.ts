import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/prisma/prisma.service";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby";

const GOOGLE_TYPES: Record<string, string[]> = {
  all:        ["tourist_attraction", "museum", "restaurant"],
  food:       ["restaurant", "cafe", "bakery"],
  viewpoints: ["tourist_attraction", "observation_deck"],
  culture:    ["museum", "art_gallery", "cultural_center"],
  history:    ["historical_landmark", "monument", "museum"],
  attraction: ["tourist_attraction"],
  restaurant: ["restaurant", "cafe"],
  hotel:      ["lodging", "hotel"],
  museum:     ["museum", "art_gallery"],
  nature:     ["park", "national_park"],
  shopping:   ["shopping_mall", "department_store"],
};

const CATEGORY_TONE: Record<string, string> = {
  all: "blue", food: "amber", viewpoints: "green", culture: "purple",
  history: "blue", attraction: "blue", restaurant: "amber",
  hotel: "purple", museum: "green", nature: "green", shopping: "amber",
};

const CATEGORY_LABEL: Record<string, string> = {
  all: "Attraction", food: "Food", viewpoints: "Viewpoint",
  culture: "Culture", history: "History", attraction: "Attraction",
  restaurant: "Restaurant", hotel: "Hotel", museum: "Museum",
  nature: "Nature", shopping: "Shopping",
};

interface GooglePlace {
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  rating?: number;
  location: { latitude: number; longitude: number };
  photos?: { name: string }[];
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

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findNearby(
    lat = 47.9077,
    lng = 106.8832,
    category = "all",
    limit = 10,
  ) {
    const key = category.toLowerCase();
    const apiKey = this.config.get<string>("google.placesApiKey");
    const types = GOOGLE_TYPES[key] ?? GOOGLE_TYPES.all;

    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.rating,places.photos,places.location,places.formattedAddress",
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 10000,
          },
        },
        languageCode: "en",
      }),
    });

    if (!res.ok) {
      this.logger.error(`Google Places error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as { places?: GooglePlace[]; error?: { message: string } };

    if (data.error) {
      this.logger.error(`Google Places API: ${data.error.message}`);
      return [];
    }

    const places = data.places ?? [];

    return places
      .map((p) => {
        const pLat = p.location.latitude;
        const pLng = p.location.longitude;
        const distKm = haversineKm(lat, lng, pLat, pLng);
        const walkMinutes = Math.max(1, Math.round((distKm * 1000) / 83));

        const photoName = p.photos?.[0]?.name;
        const imageUrl = photoName
          ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${apiKey}`
          : `https://picsum.photos/seed/${p.id.slice(-4)}/600/400`;

        return {
          id: p.id,
          title: p.displayName.text,
          category: CATEGORY_LABEL[key] ?? category,
          categoryTone: CATEGORY_TONE[key] ?? "blue",
          rating: p.rating ?? 4.0,
          distance: `${distKm.toFixed(1)} km`,
          walkTime: `${walkMinutes} min`,
          description: p.formattedAddress ?? "",
          imageUrl,
          latitude: pLat,
          longitude: pLng,
          _distKm: distKm,
        };
      })
      .sort((a, b) => a._distKm - b._distKm)
      .slice(0, limit)
      .map(({ _distKm: _, ...rest }) => rest);
  }

  findOne(id: string) {
    return this.prisma.place.findUnique({ where: { id } });
  }
}
