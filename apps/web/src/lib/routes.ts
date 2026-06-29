// Pre-authored Nomad AI demo routes for Mongolia — a 3-day guided trip.
//
// Each stop's `narration` is written ahead of time so the Live Guide can speak
// the moment you arrive WITHOUT any network or backend — this is what makes the
// on-stage demo reliable and also backs the app's "offline travel pack" pillar.
// The AI (free-form Q&A) is only used when the traveller actively asks something.
//
// Coordinates are real where confidently known (UB landmarks, Mörön, Hatgal,
// Lake Khövsgöl). A few northern stops are marked `TODO: verify coords` — set
// the exact lat/lng for those, since they drive the map + "open in Google Maps".

import type { DemoRoute } from "@/types";

export const demoRoutes: DemoRoute[] = [
  // ----------------------------------------------------------------------
  // Day 1 — Ulaanbaatar city, then the evening departure north to Selenge
  // ----------------------------------------------------------------------
  {
    id: "ub-day1",
    title: "Day 1 · Ulaanbaatar",
    region: "ulaanbaatar",
    summary: "Land in Mongolia, see the capital, then the evening ride north from Dragon terminal.",
    stops: [
      {
        id: "ub-airport",
        name: "Chinggis Khaan International Airport",
        kind: "Airport",
        latitude: 47.6533,
        longitude: 106.8197,
        arrivalRadius: 400,
        narration:
          "Welcome to Mongolia. You've just landed at Chinggis Khaan International Airport, about 50 kilometres south of Ulaanbaatar. Don't take the first taxi that approaches you inside — step out to the official taxi line, or take the airport bus. We'll head into the city now; our first stop is Sükhbaatar Square, right in the centre.",
        context:
          "The airport sits in the Khushig Valley. There's no metered-taxi culture, so agree the price before you get in.",
        transport: [
          { mode: "taxi", label: "Official taxi to centre · ~50 min · ₮60,000–80,000" },
          { mode: "bus", label: "Airport bus to city centre · ~70 min · ₮1,500" },
        ],
        askLocalPhrases: [
          {
            en: "Can you take me to the city centre?",
            mn: "Намайг хот руу хүргэж өгөх үү?",
            roman: "Namaig khot ruu khürgej ögökh üü?",
          },
          {
            en: "How much is it?",
            mn: "Хэд вэ?",
            roman: "Khed ve?",
          },
        ],
      },
      {
        id: "ub-sukhbaatar-square",
        name: "Sükhbaatar Square",
        kind: "Square",
        latitude: 47.9186,
        longitude: 106.9176,
        arrivalRadius: 150,
        narration:
          "This is Sükhbaatar Square, the heart of Ulaanbaatar — locals also call it Chinggis Square. The giant seated statue ahead is Chinggis Khaan, watching over Parliament. It's the easiest landmark to orient from. We'll spend the day in the city, then catch an evening ride north to Selenge. Next, let's visit Gandan Monastery.",
        context:
          "Named after the revolutionary hero Damdin Sükhbaatar. Government House and the National History Museum frame the square.",
        transport: [{ mode: "walk", label: "Walk west · ~25 min" }],
        askLocalPhrases: [
          {
            en: "Where is Gandan Monastery?",
            mn: "Гандан хийд хаана байна вэ?",
            roman: "Gandan khiid khaana baina ve?",
          },
        ],
      },
      {
        id: "ub-gandan",
        name: "Gandantegchinlen Monastery",
        kind: "Monastery",
        latitude: 47.9214,
        longitude: 106.8945,
        arrivalRadius: 150,
        narration:
          "Welcome to Gandantegchinlen Monastery, the spiritual heart of the city and one of the few that survived the 1930s purges. Inside stands Migjid Janraisig, a 26-metre golden statue. Walk clockwise around the temples, spin the prayer wheels with your right hand, and keep your voice low. After this we'll head south to Zaisan for a view over the whole city.",
        context:
          "Speak softly and walk clockwise. Photography is fine outside but ask before shooting inside the temples.",
        transport: [{ mode: "taxi", label: "Taxi south · ~20 min · ₮8,000–12,000" }],
        askLocalPhrases: [
          {
            en: "Is it OK to take photos here?",
            mn: "Энд зураг авч болох уу?",
            roman: "End zurag avch bolokh uu?",
          },
        ],
      },
      {
        id: "ub-zaisan",
        name: "Zaisan Memorial",
        kind: "Viewpoint · memorial",
        latitude: 47.8866,
        longitude: 106.9148,
        arrivalRadius: 200,
        narration:
          "You've reached the Zaisan Memorial, on the hill at the southern edge of the city. Climb the steps and the whole of Ulaanbaatar opens up below you, with the forested Bogd Khan mountain at your back. It's the best place to understand how the city sits in its valley. Catch your breath — this evening we head to the Dragon terminal to travel north.",
        context:
          "The circular mosaic memorial honours Soviet–Mongolian wartime friendship. Sunset light over the city is the reward for the climb.",
        transport: [{ mode: "taxi", label: "Taxi to Dragon terminal · ~25 min" }],
        askLocalPhrases: [
          {
            en: "Please take me to the Dragon bus terminal.",
            mn: "Намайг Драгон автобусны буудал руу хүргэж өгөөч.",
            roman: "Namaig Dragon avtobusny buudal ruu khürgej ögööch.",
          },
        ],
      },
      {
        id: "ub-dragon",
        name: "Dragon Bus Terminal",
        kind: "Bus terminal",
        // TODO: verify coords — Dragon terminal, west Ulaanbaatar (approximate).
        latitude: 47.9148,
        longitude: 106.827,
        arrivalRadius: 250,
        narration:
          "This is the Dragon terminal on the west side of the city — your departure point for the countryside. Long-distance buses and shared vans to Selenge, Darkhan and the north leave from here, mostly in the late afternoon and evening. Buy your ticket at the counter, keep your bag with you, and confirm the departure time. Settle in — it's a few hours north to Selenge. Get some rest on the road.",
        context:
          "Buy tickets at the counter, not from people in the car park. Departures fill up — arrive with time to spare and keep cash handy.",
        transport: [
          { mode: "bus", label: "Evening bus to Selenge · ~4–5 hr" },
          { mode: "shared-van", label: "Shared van (mikr) · leaves when full" },
        ],
        askLocalPhrases: [
          {
            en: "Does this bus go to Selenge?",
            mn: "Энэ автобус Сэлэнгэ рүү явах уу?",
            roman: "Ene avtobus Selenge ruu yavakh uu?",
          },
          {
            en: "What time does it leave?",
            mn: "Хэдэн цагт хөдлөх вэ?",
            roman: "Kheden tsagt khödlökh ve?",
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------
  // Day 2 — Selenge: arrive, the mountain pass, and the great monastery
  // ----------------------------------------------------------------------
  {
    id: "selenge-day2",
    title: "Day 2 · Selenge",
    region: "selenge",
    summary: "North along the highway — Khutul, Darkhan and the Selenge river town of Sükhbaatar.",
    stops: [
      {
        id: "selenge-khutul",
        name: "Khutul",
        kind: "Town",
        // Real on-highway town — keeps the route on routable roads.
        latitude: 49.0981,
        longitude: 105.5561,
        arrivalRadius: 500,
        narration:
          "You've crossed into the green north. Khutul is a small town on the main northern highway — a good place to stretch and grab something warm before the road carries on. Selenge is Mongolia's river-fed farming country, softer than the steppe down south. Next we follow the highway up to Darkhan.",
        context:
          "This is the paved northern corridor toward Russia, so the road here is good and the driving is easy.",
        transport: [{ mode: "drive", label: "Highway north to Darkhan · ~1 hr · 55 km" }],
        askLocalPhrases: [
          {
            en: "Where can I get something to eat?",
            mn: "Хаана хоол идэж болох вэ?",
            roman: "Khaana khool idej bolokh ve?",
          },
        ],
      },
      {
        id: "selenge-darkhan",
        name: "Darkhan",
        kind: "City · gateway",
        latitude: 49.464,
        longitude: 105.9688,
        arrivalRadius: 600,
        narration:
          "This is Darkhan, Mongolia's second-largest city and the gateway to the far north. Wide planned streets, a couple of museums and the famous Kharagiin monastery. It's the best place to refuel, change money and stock up before the smaller towns. From here it's a straight run north to Sükhbaatar.",
        context:
          "Darkhan has everything you'll need — ATMs, shops, fuel. The last reliable city before the quieter river towns.",
        transport: [{ mode: "drive", label: "Highway north to Sükhbaatar · ~1.5 hr · 101 km" }],
        askLocalPhrases: [
          {
            en: "Where is the nearest ATM?",
            mn: "Хамгийн ойрын банкомат хаана байна вэ?",
            roman: "Khamgiin oiryn bankomat khaana baina ve?",
          },
        ],
      },
      {
        id: "selenge-sukhbaatar",
        name: "Sükhbaatar (Selenge)",
        kind: "Town · province centre",
        latitude: 50.239,
        longitude: 106.2028,
        arrivalRadius: 600,
        narration:
          "You've reached Sükhbaatar, the capital of Selenge province, where the Selenge and Orkhon rivers meet near the Russian border. It's a quiet riverside town — the green heart of the north, and a world away from the desert. Rest up here by the water; tomorrow we head west to Lake Khövsgöl.",
        context:
          "A relaxed river town. Mornings can be cool and damp by the water — bring a light layer.",
        askLocalPhrases: [
          {
            en: "Thank you, this is beautiful.",
            mn: "Баярлалаа, үнэхээр гоё юм байна.",
            roman: "Bayarlalaa, ünekheer goyo yum baina.",
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------
  // Day 3 — Khövsgöl: Mörön to Hatgal to the Blue Pearl
  // ----------------------------------------------------------------------
  {
    id: "khuvsgul-day3",
    title: "Day 3 · Khövsgöl",
    region: "khuvsgul",
    summary: "Mörön to Hatgal to Lake Khövsgöl — the rural leg where maps go quiet.",
    stops: [
      {
        id: "murun",
        name: "Mörön (Murun)",
        kind: "Town · transport hub",
        latitude: 49.6342,
        longitude: 100.1625,
        arrivalRadius: 600,
        narration:
          "You've reached Mörön, capital of Khövsgöl province and your gateway to the lake. There's no scheduled bus to the lake — you'll share a van or jeep that leaves when it's full, usually from the market. Don't wait for a timetable that doesn't exist. Ask around for a shared ride to Hatgal.",
        context:
          "Shared vans (mikr) gather near the central market. Prices are per seat; it leaves once full, which could be 20 minutes or two hours.",
        transport: [
          { mode: "shared-van", label: "Shared van to Hatgal · ~2 hr · ₮20,000–30,000/seat" },
        ],
        askLocalPhrases: [
          {
            en: "Does this van go to Hatgal?",
            mn: "Энэ машин Хатгал руу явах уу?",
            roman: "Ene mashin Hatgal ruu yavakh uu?",
          },
          {
            en: "When does it leave?",
            mn: "Хэдэн цагт хөдлөх вэ?",
            roman: "Kheden tsagt khödlökh ve?",
          },
        ],
      },
      {
        id: "hatgal",
        name: "Hatgal",
        kind: "Lakeside village",
        latitude: 50.43,
        longitude: 100.156,
        arrivalRadius: 500,
        narration:
          "Welcome to Hatgal, the small village at the southern tip of Lake Khövsgöl. This is where you stock up — there are a few shops and simple guanz, but no ATMs you can rely on, so I hope you brought cash from Mörön. Many ger camps are a short drive along the shore. Let's head to the lake itself.",
        context:
          "Hatgal is tiny. Buy snacks and water here before going to a ger camp. Mobile signal fades fast once you leave the village.",
        transport: [
          { mode: "drive", label: "Camp pickup or local driver · 10–40 min along shore" },
        ],
        askLocalPhrases: [
          {
            en: "Where can I buy water and food?",
            mn: "Ус, хоол хаанаас авах вэ?",
            roman: "Us, khool khaanaas avakh ve?",
          },
          {
            en: "Is there a guesthouse near here?",
            mn: "Энд ойролцоо буудал байна уу?",
            roman: "End oiroltsoo buudal baina uu?",
          },
        ],
      },
      {
        id: "khuvsgul-shore",
        name: "Lake Khövsgöl shore",
        kind: "Nature · lake",
        latitude: 50.428,
        longitude: 100.153,
        arrivalRadius: 300,
        narration:
          "Here it is — Lake Khövsgöl, the Blue Pearl of Mongolia. It holds nearly two percent of the world's fresh water, and it's so clear you can see deep below the surface. The water is freezing even in summer. This area is sacred to local Tsaatan and Darkhad people, so don't wash anything with soap in the lake or leave waste. Just breathe it in.",
        context:
          "Respect local customs: the lake is considered sacred. Pack out all rubbish — there's no collection here.",
        askLocalPhrases: [
          {
            en: "Is it safe to swim here?",
            mn: "Энд усанд орж болох уу?",
            roman: "End usand orj bolokh uu?",
          },
        ],
      },
    ],
  },
];

export function getRouteById(id: string): DemoRoute | undefined {
  return demoRoutes.find((r) => r.id === id);
}

// Fetch the journeys from the backend, falling back to the bundled demoRoutes on
// any failure (offline, no network, API error) so the routes are always present.
export async function getRoutes(): Promise<DemoRoute[]> {
  try {
    const res = await fetch("/api/routes");
    if (!res.ok) throw new Error(`routes ${res.status}`);
    const data = (await res.json()) as DemoRoute[];
    return Array.isArray(data) && data.length ? data : demoRoutes;
  } catch {
    return demoRoutes;
  }
}
