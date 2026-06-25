export interface Place {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  imageUrl?: string;
  rating?: number;
}

export type PlaceCategory =
  | "attraction"
  | "restaurant"
  | "hotel"
  | "museum"
  | "nature"
  | "shopping";

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  preferredLanguage: "en" | "mn";
}
