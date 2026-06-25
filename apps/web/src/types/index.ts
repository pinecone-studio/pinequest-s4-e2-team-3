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

// Accent used by pills, icon chips and timeline dots across the app.
export type Tone = "blue" | "amber" | "green" | "purple" | "white";

// A simple photo card on the Home "Right now, near you" row.
export interface NearbySpot {
  id: string;
  title: string;
  imageUrl: string;
  badge: string;
  badgeTone: Tone;
}

// A featured place on the Explore screen.
export interface ExploreSpot {
  id: string;
  title: string;
  category: string;
  categoryTone: Tone;
  rating: number;
  distance: string;
  walkTime: string;
  description: string;
  imageUrl: string;
  // Optional "Perfect right now" style highlight shown over the photo.
  highlight?: string;
}

// One stop in the adaptive day journey.
export type JourneyStopStatus = "done" | "current" | "upcoming";

export interface JourneyStop {
  id: string;
  time: string;
  tag: string;
  tagTone: Tone;
  title: string;
  note: string;
  walk: string;
  dwell: string;
  imageUrl: string;
  status: JourneyStopStatus;
}

// One labelled segment of the interpreter conversation.
// "you" sits on the right in blue; "them" sits on the left in white.
export interface InterpreterSegment {
  id: string;
  label: string;
  side: "you" | "them";
  text: string;
  sub?: string;
}

// A message in the AI guide chat.
export interface GuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// One emergency category in the SOS sheet.
export interface SosOption {
  id: string;
  title: string;
  subtitle: string;
  tone: Tone;
}
