export interface LatLng { lat: number; lng: number }

export type TravelMode = "walking" | "driving" | "transit";

export interface Review {
  relativePublishTimeDescription: string;
  rating: number;
  text?: { text: string };
  authorAttribution: { displayName: string; photoUri?: string };
}

export interface PlaceDetails {
  currentOpeningHours?: { openNow: boolean; weekdayDescriptions?: string[] };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: Review[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  userRatingCount?: number;
}
