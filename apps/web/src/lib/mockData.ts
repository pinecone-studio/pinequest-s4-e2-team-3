// Static sample content for the Lumo frontend.
// Everything here is placeholder data so the screens can be built and reviewed
// without a backend. Replace these with real API/store data later.

import type {
  ExploreSpot,
  GuideMessage,
  InterpreterSegment,
  JourneyStop,
  NearbySpot,
  SosOption,
} from "@/types";

// Photos reused from the design (Unsplash).
const PHOTO = {
  alfama:
    "https://images.unsplash.com/photo-1599069158346-684fee0e414a?fm=jpg&q=80&w=1100&auto=format&fit=crop",
  street:
    "https://images.unsplash.com/photo-1591107576521-87091dc07797?fm=jpg&q=80&w=700&auto=format&fit=crop",
  market:
    "https://images.unsplash.com/photo-1687182845783-dc091d25bcc9?fm=jpg&q=80&w=700&auto=format&fit=crop",
  cathedral:
    "https://images.unsplash.com/photo-1701094939188-201b3bec1eff?fm=jpg&q=80&w=700&auto=format&fit=crop",
  tram: "https://images.unsplash.com/photo-1705782713700-831d23a590e1?fm=jpg&q=80&w=700&auto=format&fit=crop",
};

export const guide = {
  name: "Nova",
  status: "Planning your day",
};

export const trip = {
  city: "Lisbon",
  weekday: "Saturday",
  greeting: "Morning, Sara",
  dayLabel: "2 of 4",
};

export const weather = {
  temperature: 24,
  description: "Sunny",
  energy: "Fresh",
};

export const todaysJourney = {
  title: "Old Alfama & the river light",
  subtitle:
    "Not a schedule — a thread of moments. I'll bend it to the weather, crowds and how you feel.",
  imageUrl: PHOTO.alfama,
};

// The guide's live suggestion to reshape the plan (Home).
export const adaptationPrompt = {
  message:
    "It's warming up by noon. Want me to swap the castle climb for the shaded riverside walk?",
  acceptLabel: "Yes, adapt it",
  dismissLabel: "Keep plan",
};

// Home "Right now, near you" cards.
export const nearbySpots: NearbySpot[] = [
  {
    id: "near-1",
    title: "Miradouro de Santa Luzia",
    imageUrl: PHOTO.tram,
    badge: "Quiet now",
    badgeTone: "green",
  },
  {
    id: "near-2",
    title: "Manteigaria",
    imageUrl: PHOTO.market,
    badge: "Local pick",
    badgeTone: "amber",
  },
  {
    id: "near-3",
    title: "Sé Cathedral",
    imageUrl: PHOTO.cathedral,
    badge: "Open now",
    badgeTone: "blue",
  },
];

export const exploreCategories = [
  "All",
  "Food",
  "Viewpoints",
  "Culture",
  "History",
];

export const exploreBanner =
  "24° & clear skies. I pushed sunset viewpoints to the top — golden hour hits at 6:40.";

export const exploreSpots: ExploreSpot[] = [
  {
    id: "spot-1",
    title: "Miradouro da Senhora do Monte",
    category: "Viewpoint",
    categoryTone: "white",
    rating: 4.9,
    distance: "1.2 km",
    walkTime: "30 min",
    description: "Lisbon's highest terrace — the whole city unfurls at golden hour.",
    imageUrl: PHOTO.street,
    highlight: "Perfect right now",
  },
  {
    id: "spot-2",
    title: "Sé Cathedral",
    category: "Culture",
    categoryTone: "blue",
    rating: 4.8,
    distance: "650 m",
    walkTime: "9 min",
    description: "Lisbon's oldest church, Romanesque and calm inside.",
    imageUrl: PHOTO.cathedral,
  },
  {
    id: "spot-3",
    title: "Time Out Market",
    category: "Food",
    categoryTone: "amber",
    rating: 4.6,
    distance: "1.1 km",
    walkTime: "14 min",
    description: "Dozens of local kitchens gathered under one roof.",
    imageUrl: PHOTO.market,
  },
];

export const journeyStops: JourneyStop[] = [
  {
    id: "stop-1",
    time: "9:30",
    tag: "Landmark",
    tagTone: "blue",
    title: "Sé Cathedral",
    note: "A gentle start, winding down through Alfama's lanes.",
    walk: "8 min walk",
    dwell: "~30 min",
    imageUrl: PHOTO.cathedral,
    status: "current",
  },
  {
    id: "stop-2",
    time: "10:15",
    tag: "Bakery · local pick",
    tagTone: "amber",
    title: "Manteigaria",
    note: "Warm pastéis de nata straight from the oven.",
    walk: "5 min walk",
    dwell: "~20 min",
    imageUrl: PHOTO.market,
    status: "upcoming",
  },
  {
    id: "stop-3",
    time: "11:30",
    tag: "Viewpoint",
    tagTone: "purple",
    title: "Miradouro de Santa Luzia",
    note: "Tiled terrace over the river — the climb I moved earlier.",
    walk: "9 min walk",
    dwell: "~30 min",
    imageUrl: PHOTO.tram,
    status: "upcoming",
  },
  {
    id: "stop-4",
    time: "13:00",
    tag: "Lunch",
    tagTone: "green",
    title: "Shaded riverside café",
    note: "Added a cool break before the warm afternoon.",
    walk: "12 min walk",
    dwell: "~1 hr",
    imageUrl: PHOTO.street,
    status: "upcoming",
  },
];

export const journeyAdaptationNote =
  "Adjusted for today — it'll hit 28°, so I moved the climb earlier and added a shaded café.";

// A short sample chat with the AI guide.
export const aiConversation: GuideMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content:
      "Morning, Sara. The light is great for Alfama right now — want me to start there?",
  },
  {
    id: "msg-2",
    role: "user",
    content: "Yes, but somewhere I can grab coffee first.",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "Café da Garagem is 4 minutes away with a rooftop view. I'll line up the viewpoint right after.",
  },
];

export const aiQuickReplies = [
  "Plan my afternoon",
  "Something quiet",
  "Where to eat?",
];

export const interpreterLanguages = { from: "EN", to: "PT" };

export const interpreterSegments: InterpreterSegment[] = [
  {
    id: "seg-1",
    label: "You said",
    side: "you",
    text: "Could we get a table for two on the terrace?",
    sub: "English",
  },
  {
    id: "seg-2",
    label: "Spoken to them",
    side: "them",
    text: "Podíamos ter uma mesa para dois no terraço?",
    sub: "Portuguese · played aloud",
  },
  {
    id: "seg-3",
    label: "They replied",
    side: "them",
    text: "Claro! Sigam-me, por favor.",
    sub: "Portuguese",
  },
  {
    id: "seg-4",
    label: "For you",
    side: "you",
    text: "Of course! Follow me, please.",
  },
];

// The dark "Live Guide" screen.
export const liveGuide = {
  status: { temperature: "24°", walk: "6 min", crowd: "Quiet" },
  nextStop: "Miradouro das Portas do Sol",
  narration:
    "Good morning. Today we wander Alfama — Lisbon's oldest quarter. We'll start with an easy 8-minute walk down to the Sé Cathedral.",
};

// The Emergency SOS bottom sheet.
export const sos = {
  location: "Lisbon · location ready",
  language: "Portuguese",
  options: [
    {
      id: "sos-1",
      title: "Fell / injured",
      subtitle: "I may be hurt",
      tone: "amber",
    },
    {
      id: "sos-2",
      title: "Got lost",
      subtitle: "Can't find my way",
      tone: "blue",
    },
    {
      id: "sos-3",
      title: "Medical",
      subtitle: "Urgent illness",
      tone: "green",
    },
    {
      id: "sos-4",
      title: "Feel unsafe",
      subtitle: "Need police",
      tone: "purple",
    },
  ] satisfies SosOption[],
};
