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

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  preferredLanguage: "en" | "mn";
}

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

export interface GuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
  timestamp: string;
}
