// Pre-authored Nomad AI demo routes for Mongolia.
//
// Each stop's `narration` is written ahead of time so the Live Guide can speak
// the moment you arrive WITHOUT any network or backend — this is what makes the
// on-stage demo reliable and also backs the app's "offline travel pack" pillar.
// The AI (free-form Q&A) is only used when the traveller actively asks something.
//
// Coordinates are real so geolocation / "open in Google Maps" behave correctly.

import type { DemoRoute } from "@/types";

export const demoRoutes: DemoRoute[] = [
  // ----------------------------------------------------------------------
  // 1. Ulaanbaatar — landing & first hours in the city (walkable, easy demo)
  // ----------------------------------------------------------------------
  {
    id: "ub-arrival",
    title: "Landing in Ulaanbaatar",
    region: "ulaanbaatar",
    summary: "From the airport to the heart of the city — your first hours in Mongolia.",
    stops: [
      {
        id: "ub-airport",
        name: "Chinggis Khaan International Airport",
        kind: "Airport",
        latitude: 47.6533,
        longitude: 106.8197,
        arrivalRadius: 400,
        narration:
          "Welcome to Mongolia. You've landed at Chinggis Khaan Airport, about 50 kilometres south of the city. Don't take the first taxi that approaches you inside — step out to the official taxi line, or use the airport bus. Your next stop is Sükhbaatar Square, the centre of Ulaanbaatar.",
        context:
          "The airport sits in the Khushig Valley. There's no metered taxi culture, so agree the price before you get in.",
        transport: [
          { mode: "taxi", label: "Official taxi · ~50 min · ₮60,000–80,000" },
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
          "You're standing in Sükhbaatar Square — locals also call it Chinggis Square. That huge seated statue ahead is Chinggis Khaan, watching over the parliament. This is the easiest landmark to navigate from, so take a moment. When you're ready, we'll walk west to Gandan Monastery, the spiritual heart of the city.",
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
          "This is Gandan Monastery — one of the few that survived the 1930s purges. Inside stands Migjid Janraisig, a 26-metre golden statue. Walk clockwise around the temples, and spin the prayer wheels with your right hand as you pass. Speak softly here. After this, let's find lunch at a local guanz.",
        context:
          "A guanz is a small, family-run Mongolian canteen — cheap, hearty, and where locals actually eat. Try buuz (steamed dumplings) or tsuivan (fried noodles).",
        transport: [{ mode: "walk", label: "Walk · ~10 min to nearby guanz" }],
        askLocalPhrases: [
          {
            en: "Is it OK to take photos here?",
            mn: "Энд зураг авч болох уу?",
            roman: "End zurag avch bolokh uu?",
          },
          {
            en: "Thank you",
            mn: "Баярлалаа",
            roman: "Bayarlalaa",
          },
        ],
      },
      {
        id: "ub-guanz",
        name: "Local guanz (Mongolian canteen)",
        kind: "Guanz",
        latitude: 47.9166,
        longitude: 106.905,
        arrivalRadius: 120,
        narration:
          "Here's a proper guanz — the kind that rarely shows up on Google Maps. No English menu, and that's fine. Point at what looks good, or order buuz. A plate is usually three to five thousand tögrög. Cash is king here, so have small notes ready. Enjoy your first real Mongolian meal.",
        context:
          "Guanz portions are generous and meat-heavy. If you don't eat mutton, learn one phrase below — it saves a lot of confusion.",
        askLocalPhrases: [
          {
            en: "I'll have the buuz, please.",
            mn: "Бууз авъя.",
            roman: "Buuz avya.",
          },
          {
            en: "Do you have a vegetarian dish?",
            mn: "Махгүй хоол байна уу?",
            roman: "Makhgüi khool baina uu?",
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------------
  // 2. Khövsgöl — the rural "last-mile" problem Nomad AI is built for
  // ----------------------------------------------------------------------
  {
    id: "khuvsgul-lake",
    title: "Reaching Lake Khövsgöl",
    region: "khuvsgul",
    summary: "Murun to Hatgal to the Blue Pearl — the rural leg where maps go quiet.",
    stops: [
      {
        id: "murun",
        name: "Mörön (Murun)",
        kind: "Town · transport hub",
        latitude: 49.6342,
        longitude: 100.1625,
        arrivalRadius: 600,
        narration:
          "You've reached Mörön, the capital of Khövsgöl province. This is your jumping-off point. There's no scheduled bus to the lake — you'll share a van or jeep that leaves when it's full, usually from the market. Don't wait for a timetable that doesn't exist. Ask around for a shared ride to Hatgal.",
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

  // ----------------------------------------------------------------------
  // 3. Gobi — desert distances, no signal, plan-ahead travel
  // ----------------------------------------------------------------------
  {
    id: "gobi-south",
    title: "Into the South Gobi",
    region: "gobi",
    summary: "Dalanzadgad to ice canyon to the singing dunes — desert travel, done right.",
    stops: [
      {
        id: "dalanzadgad",
        name: "Dalanzadgad",
        kind: "Town · Gobi gateway",
        latitude: 43.5708,
        longitude: 104.425,
        arrivalRadius: 600,
        narration:
          "You're in Dalanzadgad, the gateway to the South Gobi. Distances out here are huge and roads are often just tracks in the dirt, so nothing happens without a driver and a full fuel tank. Fill up, grab water for the whole day, and confirm your route with your driver now. First stop: Yolyn Am, the valley that keeps its ice into summer.",
        context:
          "Self-driving the Gobi is risky without experience. Most travellers hire a driver-guide with a Russian UAZ van. There's little to no phone signal between sites.",
        transport: [
          { mode: "drive", label: "Hired driver (UAZ van) · ~1.5 hr to Yolyn Am" },
        ],
        askLocalPhrases: [
          {
            en: "Where can I buy fuel and water?",
            mn: "Шатахуун, ус хаанаас авах вэ?",
            roman: "Shatakhuun, us khaanaas avakh ve?",
          },
          {
            en: "How long does it take to get there?",
            mn: "Тийшээ хэр удаж очих вэ?",
            roman: "Tiishee kher udaj ochikh ve?",
          },
        ],
      },
      {
        id: "yolyn-am",
        name: "Yolyn Am (Vulture Valley)",
        kind: "Nature · canyon",
        latitude: 43.4869,
        longitude: 104.076,
        arrivalRadius: 400,
        narration:
          "This is Yolyn Am — a deep, narrow gorge in the Gurvan Saikhan mountains. Strangely for a desert, it stays so cold that sheets of ice survive here into July. It's named after the lammergeier, the bearded vulture you might see overhead. From the car park it's a gentle walk into the canyon. Watch for pikas darting between the rocks.",
        context:
          "Bring a layer — it's noticeably colder in the gorge than out on the steppe. The walk in is easy and mostly flat.",
        transport: [
          { mode: "walk", label: "Walk into the gorge · ~2 km each way" },
          { mode: "drive", label: "Then ~4 hr drive to Khongoryn Els" },
        ],
        askLocalPhrases: [
          {
            en: "How far can we walk in?",
            mn: "Хэр хол явж болох вэ?",
            roman: "Kher khol yavj bolokh ve?",
          },
        ],
      },
      {
        id: "khongoryn-els",
        name: "Khongoryn Els (Singing Dunes)",
        kind: "Nature · sand dunes",
        latitude: 43.7333,
        longitude: 102.3,
        arrivalRadius: 500,
        narration:
          "You've reached Khongoryn Els — the Singing Dunes. They rise up to 300 metres, and when the wind moves the sand it makes a low, humming roar that gives them their name. Climbing the tallest dune is a hard, slow push in soft sand, but the view from the crest at sunset is unforgettable. If a herder offers a camel ride, that's the classic way to arrive at the dunes.",
        context:
          "Start the climb in late afternoon to avoid the heat and catch sunset at the top. Camel rides are run by local herder families — agree the price first.",
        askLocalPhrases: [
          {
            en: "How much for a camel ride?",
            mn: "Тэмээ унах хэд вэ?",
            roman: "Temee unakh khed ve?",
          },
          {
            en: "Thank you, that was wonderful.",
            mn: "Баярлалаа, үнэхээр гайхалтай байлаа.",
            roman: "Bayarlalaa, ünekheer gaikhaltai bailaa.",
          },
        ],
      },
    ],
  },
];

export function getRouteById(id: string): DemoRoute | undefined {
  return demoRoutes.find((r) => r.id === id);
}
