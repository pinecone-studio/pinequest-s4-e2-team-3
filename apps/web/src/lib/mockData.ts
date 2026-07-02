// Static sample content for the Polaris frontend.
// Everything here is placeholder data so the screens can be built and reviewed
// without a backend. Replace these with real API/store data later.

import type {
  ExploreSpot,
  GuideMessage,
  InterpreterSegment,
  JourneyStop,
  NearbySpot,
  SosOption,
  TripDay,
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
  name: "Michelle",
  status: "Your local guide",
};

export const trip = {
  city: "Ulaanbaatar",
  weekday: "Day 1",
  greeting: "Welcome to Mongolia",
  dayLabel: "1 of 7",
};

export const weather = {
  temperature: 18,
  description: "Clear skies",
  energy: "Fresh",
};

export const todaysJourney = {
  title: "Your first hours in Ulaanbaatar",
  subtitle:
    "I'll walk it with you — speaking up when you reach each place, telling you what to ask locals, and what it all means.",
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
    title: "Gandantegchinlen Monastery",
    imageUrl: "",
    badge: "Open now",
    badgeTone: "blue",
  },
  {
    id: "near-2",
    title: "Naran Tuul Market",
    imageUrl: "",
    badge: "Local pick",
    badgeTone: "amber",
  },
  {
    id: "near-3",
    title: "Sükhbaatar Square",
    imageUrl: "",
    badge: "Quiet now",
    badgeTone: "green",
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

// Multi-day trip data. Day 1 is a past day (shows done + skipped stops),
// Day 2 is today (current in progress), Days 3+ are future plans.
export const tripDays: TripDay[] = [
  {
    dayNumber: 1,
    label: "Sun, 22 Jun · Arrival",
    stops: [
      {
        id: "d1-1",
        time: "10:00",
        tag: "Landmark",
        tagTone: "blue",
        title: "Gandantegchinlen Monastery",
        note: "The spiritual heart of UB — golden spire, chanting monks, and resident deer.",
        walk: "12 min walk",
        dwell: "~45 min",
        imageUrl: PHOTO.cathedral,
        status: "done",
      },
      {
        id: "d1-2",
        time: "11:30",
        tag: "Market",
        tagTone: "amber",
        title: "Naran Tuul Market",
        note: "Mongolia's largest open bazaar — planned but the crowds were intense today.",
        walk: "8 min walk",
        dwell: "~1 hr",
        imageUrl: PHOTO.market,
        status: "skipped",
      },
      {
        id: "d1-3",
        time: "13:00",
        tag: "Lunch",
        tagTone: "green",
        title: "Modern Nomads Restaurant",
        note: "Warm buuz dumplings and a bowl of tsuivan noodles.",
        walk: "5 min walk",
        dwell: "~1 hr",
        imageUrl: PHOTO.street,
        status: "done",
      },
      {
        id: "d1-4",
        time: "15:00",
        tag: "Culture",
        tagTone: "purple",
        title: "National Museum of Mongolia",
        note: "Planned a deep-dive into nomadic history — skipped, museum was closed for renovation.",
        walk: "15 min walk",
        dwell: "~1.5 hr",
        imageUrl: PHOTO.tram,
        status: "skipped",
      },
    ],
  },
  {
    dayNumber: 2,
    label: "Mon, 23 Jun · City day",
    stops: [
      {
        id: "d2-1",
        time: "9:30",
        tag: "Landmark",
        tagTone: "blue",
        title: "Sükhbaatar Square",
        note: "The grand centre of UB — Genghis Khan's monument anchors it all.",
        walk: "8 min walk",
        dwell: "~30 min",
        imageUrl: PHOTO.cathedral,
        status: "done",
      },
      {
        id: "d2-2",
        time: "10:15",
        tag: "Bakery · local pick",
        tagTone: "amber",
        title: "Manteigaria Ulaanbaatar",
        note: "Warm milk tea and khuushuur — a local morning ritual worth a detour.",
        walk: "5 min walk",
        dwell: "~20 min",
        imageUrl: PHOTO.market,
        status: "current",
      },
      {
        id: "d2-3",
        time: "11:30",
        tag: "Viewpoint",
        tagTone: "purple",
        title: "Zaisan Memorial",
        note: "Soviet-era hilltop monument with a 360° panorama of the whole valley.",
        walk: "9 min walk",
        dwell: "~30 min",
        imageUrl: PHOTO.tram,
        status: "upcoming",
      },
      {
        id: "d2-4",
        time: "13:00",
        tag: "Lunch",
        tagTone: "green",
        title: "Luna Blanca",
        note: "Cool vegetarian Mongolian fusion — a shaded break before the afternoon heat.",
        walk: "12 min walk",
        dwell: "~1 hr",
        imageUrl: PHOTO.street,
        status: "upcoming",
      },
    ],
  },
  {
    dayNumber: 3,
    label: "Tue, 24 Jun · Nature day",
    stops: [
      {
        id: "d3-1",
        time: "8:00",
        tag: "Nature",
        tagTone: "green",
        title: "Gorkhi-Terelj National Park",
        note: "Day trip into the hills — Turtle Rock, yurt camps, and eagle country.",
        walk: "1.5 hr drive",
        dwell: "~5 hr",
        imageUrl: PHOTO.alfama,
        status: "upcoming",
      },
      {
        id: "d3-2",
        time: "14:00",
        tag: "Culture",
        tagTone: "blue",
        title: "Aryapala Meditation Centre",
        note: "A monastery carved into the hillside — silence and panoramic valley views.",
        walk: "30 min walk",
        dwell: "~1 hr",
        imageUrl: PHOTO.cathedral,
        status: "upcoming",
      },
      {
        id: "d3-3",
        time: "17:30",
        tag: "Dinner",
        tagTone: "amber",
        title: "Evening in Chinggis Square",
        note: "Return to UB for street food and the city lit up at dusk.",
        walk: "1.5 hr drive",
        dwell: "~2 hr",
        imageUrl: PHOTO.market,
        status: "upcoming",
      },
    ],
  },
];

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
  "Plan my 5-day trip",
  "I'm visiting in July",
  "Show me Ulaanbaatar",
  "Take me to the countryside",
  "Best time to visit Mongolia?",
  "What food should I try?",
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
  location: "Ulaanbaatar · location ready",
  language: "Mongolian",
  place: "Sükhbaatar Square, Ulaanbaatar",
  coords: "47.9186° N · 106.9177° E",
  options: [
    {
      id: "sos-1",
      title: "Fell / injured",
      subtitle: "I may be hurt",
      tone: "amber",
      message: "I have fallen and may be injured. I need an ambulance.",
      messageMn: "Би унаж, бэртсэн байж магадгүй. Надад түргэн тусламж хэрэгтэй байна.",
      service: "Ambulance",
      serviceNumber: "103",
    },
    {
      id: "sos-2",
      title: "Got lost",
      subtitle: "Can't find my way",
      tone: "blue",
      message: "I am lost and need help finding my way to safety.",
      messageMn: "Би төөрчихсөн, аюулгүй газар очих замаа олоход тусламж хэрэгтэй байна.",
      service: "Help line",
      serviceNumber: "103",
    },
    {
      id: "sos-3",
      title: "Medical",
      subtitle: "Urgent illness",
      tone: "green",
      message: "I have a medical emergency and need an ambulance.",
      messageMn: "Надад яаралтай эмнэлгийн тусламж буюу түргэн тусламж хэрэгтэй байна.",
      service: "Ambulance",
      serviceNumber: "103",
    },
    {
      id: "sos-4",
      title: "Feel unsafe",
      subtitle: "Need police",
      tone: "purple",
      message: "I feel unsafe and need police assistance.",
      messageMn: "Би аюулгүй биш байна, цагдаагийн тусламж хэрэгтэй байна.",
      service: "Police",
      serviceNumber: "102",
    },
  ] satisfies SosOption[],
};
