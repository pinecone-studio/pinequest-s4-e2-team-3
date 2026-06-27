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
  latitude?: number;
  longitude?: number;
  highlight?: string;
}

// One stop in the adaptive day journey.
export type JourneyStopStatus = "done" | "current" | "upcoming" | "skipped";

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

// A single day in a multi-day planned trip.
export interface TripDay {
  dayNumber: number;
  label: string;
  stops: JourneyStop[];
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
  // The message prepared for the operator (English) and its Mongolian translation
  // read aloud to the operator during the in-app call, plus the service called.
  message: string;
  messageMn: string;
  service: string;
  serviceNumber: string;
}

// ---------------------------------------------------------------------------
// Live Guide — the location-aware voice companion.
// A route is a fixed sequence of stops; the guide tracks the traveller's
// position and, on arrival at a stop, speaks its narration aloud.
// ---------------------------------------------------------------------------

export interface Coords {
  latitude: number;
  longitude: number;
}

// A place Michelle suggests mid-journey (food spot, bus station, …). Returned by
// /api/chat alongside the text reply so the Live Guide can show it as a
// selectable button and a marker, then route to it on the map.
export interface PlaceOption {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  // What kind of place it is, so the UI can distinguish e.g. a bus station.
  kind?: "food" | "transit" | "place";
}

// How the traveller gets from the previous stop to this one — Nomad AI is an
// advisory layer, so this is "what to do / what to ask", not turn-by-turn.
export interface TransportTip {
  mode: "walk" | "taxi" | "bus" | "shared-van" | "drive";
  label: string; // e.g. "Taxi · ~15 min · ₮8,000–12,000"
}

export interface RouteStop {
  id: string;
  name: string;
  // The traveller-facing place type, e.g. "Airport", "Square", "Guanz".
  kind: string;
  latitude: number;
  longitude: number;
  // Distance (metres) within which we treat the traveller as "arrived".
  arrivalRadius: number;
  // What Michelle says aloud the moment you arrive (pre-written = works offline).
  narration: string;
  // Why this place matters / cultural context (shown under the narration).
  context?: string;
  // Practical "ask a local" phrases for this leg (EN + MN + romanised).
  askLocalPhrases?: LocalPhrase[];
  // How to reach this stop from the previous one.
  transport?: TransportTip[];
  imageUrl?: string;
}

export interface LocalPhrase {
  en: string;
  mn: string;
  // Latin romanisation so a non-Mongolian speaker can attempt to say it.
  roman: string;
}

export type RouteRegion = "ulaanbaatar" | "khuvsgul" | "gobi";

export interface DemoRoute {
  id: string;
  title: string;
  region: RouteRegion;
  // One-line pitch shown in the route picker.
  summary: string;
  stops: RouteStop[];
}
