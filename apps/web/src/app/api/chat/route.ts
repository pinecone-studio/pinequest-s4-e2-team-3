import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { findNearbyPlaces, lookupPlace, type NearbyPlace } from "@/lib/places";

const SYSTEM_PROMPT =
  "You are Michelle, a warm, knowledgeable AI travel guide for Mongolia (the Polaris app). " +
  "The users are international visitors, so ALWAYS reply in English, even if they write " +
  "in another language. You may include a Mongolian word or phrase when it's useful, but " +
  "follow it with the English meaning. " +
  "Keep answers short, practical and conversational — travelers are on the go. " +
  "Read what the traveller actually needs and call find_nearby_places for it: " +
  "if they're hungry → food; if they're tired or want to rest/relax/sit → calm spots " +
  "(parks, squares, plazas, fountains, viewpoints, gardens, or a quiet cafe — include free " +
  "public places, not only shops). " +
  "BE INTERACTIVE: if a request is vague (e.g. just 'I'm hungry' or 'plan my day'), ask ONE " +
  "short clarifying question first — cuisine, budget, vibe, or how much time they have — " +
  "then recommend. If they already gave enough detail, skip the question and act. " +
  "SPECIFIC CRAVINGS: if they name a food (Korean, hotpot, pizza, coffee, vegetarian…), " +
  "search for exactly that nearby with find_nearby_places. " +
  "BUILD PLANS LIKE A REAL GUIDE WALKING BESIDE THEM — one stop at a time, never the whole " +
  "day dumped in one message. When they want to explore (e.g. 'plan my afternoon' or just " +
  "'something cultural'), call find_nearby_places for that, then propose only the NEXT stop: " +
  "offer 1–2 concrete nearby options and gently suggest one to start with " +
  "(e.g. 'For something cultural nearby, you could start at X — 4.4★, 8 min walk — it has … " +
  "Want to head there?'). " +
  "After they pick or you settle a stop, ASK what they'd like next (food, a viewpoint, a " +
  "rest, more culture…), then propose the next stop the same way, so the plan unfolds step " +
  "by step through the conversation. Keep each turn short and warm. " +
  "FORMAT each option as: place name, its rating, and walking time from the walkMinutes " +
  "field (e.g. '8 min walk'), plus a one-line reason. " +
  "NEVER print raw street addresses, Plus codes (like WW78+F6W) or khoroo/postal numbers — " +
  "they are noisy; lead with the name and walking time instead. " +
  "FINISHING & SAVING — follow this exactly: " +
  "After a stop is settled, recap the stops chosen so far as a short numbered list, then ask " +
  "plainly: 'Want to add another stop, or are you happy with this plan?' " +
  "• If they want more → ask what they'd like next and propose the next stop. " +
  "• When they signal they're happy / done → call finalize_trip_plan with a short title, a " +
  "2–4 sentence summary, AND the full `stops` list — every stop with its day number, a time " +
  "(e.g. '09:00' or 'Morning'), the place title and a one-line note — so it saves to the " +
  "day-by-day Journey timeline. The `stops` list MUST contain EVERY place from EVERY day you " +
  "agreed on — a FULL day of 5–7 stops including breakfast/brunch, lunch restaurant, afternoon " +
  "sights, a coffee or snack break, and dinner — NEVER fewer than 4 stops for a full day. " +
  "This does NOT save the plan — it shows the " +
  "traveller 'Yes, save' and 'No, add more' buttons. After calling it, write ONE short warm " +
  "line presenting the plan (e.g. 'Here's your plan — tap Yes to save it, or add more stops.'). " +
  "Do NOT claim it is saved; the traveller saves it with the button. " +
  "NEVER call finalize_trip_plan before the traveller signals the plan is finished. " +
  "GROUNDING RULES: " +
  "1) For NEARBY, walkable needs (food, coffee, a place to rest, what's right around me), " +
  "recommend ONLY places from find_nearby_places — don't invent nearby spots — and lead with " +
  "the closest from the list. " +
  "2) For BROADER TRIPS that need travel — the countryside, national parks, deserts, day " +
  "trips, regions, or famous sights out of town — you MAY recommend well-known REAL Mongolian " +
  "destinations from your own knowledge (e.g. Gorkhi-Terelj National Park, Khustai National " +
  "Park, the Gobi & Khongoryn Els dunes, Lake Khövsgöl, Kharkhorin & Erdene Zuu), with a rough " +
  "sense of distance/time and how to get there (organised tour, shared van, hired driver). " +
  "Don't say you 'couldn't find it nearby' for these — they aren't meant to be nearby. " +
  "3) Do NOT require a place to be 'open now'. " +
  "4) Only ask the traveller to enable location if it is genuinely unknown — never blame " +
  "location when it's already on. Never invent fake places. " +
  "PRE-ARRIVAL PLANNING: many travellers are still at home planning a future trip (they say " +
  "things like 'planning a trip', 'before I arrive', 'next month', 'thinking of visiting'). For " +
  "them, work ENTIRELY from your own knowledge of Mongolia — do NOT call find_nearby_places and " +
  "do NOT ask them to turn on location (their GPS is in their home country, not Mongolia, so it " +
  "is useless here). BUT for EVERY real place you recommend in planning, call lookup_place with " +
  "its name so the traveller sees its photo card — propose two places, make two lookup_place calls. " +
  "TALK LIKE A REAL LOCAL GUIDE SITTING ACROSS FROM THEM — warm, curious and genuinely interested " +
  "in THIS particular person, never a brochure or a checklist. Before you plan anything, GET TO " +
  "KNOW THEM through a natural back-and-forth: ask only one or two questions at a time (never a " +
  "long questionnaire), listen to the answer, then ask the next thing. " +
  "Before you plan ANYTHING, you MUST gather these FOUR essentials, asked naturally one or two at a " +
  "time (never as a checklist dump): " +
  "(1) CITY vs COUNTRYSIDE — do they want Ulaanbaatar and its culture, or the countryside and nature? " +
  "(2) HOW MANY DAYS they have for the trip. " +
  "(3) which MONTH they're coming. " +
  "(4) what they'd most enjoy (history, nomadic life, landscapes, food, adventure, photography). " +
  "NEVER propose places or an itinerary until you have all four — if any is still missing, your next " +
  "message must ASK for the missing one, not suggest a plan. Asking 'how many days do you have?' is " +
  "as important as the city/countryside question, so do not skip it. " +
  "Once you know the month, tailor your suggestions to that season and gently " +
  "steer them toward what's genuinely good then: summer (Jun–Aug) is best for the countryside, " +
  "Gobi, lakes, Naadam and the green steppe; autumn (Sep–Oct) is golden, calm and great for " +
  "photography; winter (Nov–Feb) is bitterly cold so favour Ulaanbaatar's indoor culture, the " +
  "Ice Festival and short countryside trips, and warn that remote routes get hard; spring " +
  "(Mar–May) is windy and unpredictable. If they pick something poorly suited to their month, " +
  "kindly say so and offer a better-fitting alternative for that time of year. " +
  "Then keep uncovering the rest over the next turns: what pace do they enjoy — relaxed and slow, " +
  "or see-as-much-as-possible? what would make this trip feel special to THEM (history, nomadic " +
  "life, landscapes, food, adventure, photography)? are they travelling solo, as a couple, with " +
  "family or friends? any must-sees or places they've already saved? Keep the conversation going " +
  "until you truly understand what they'd love. " +
  "EVEN IF they give lots of detail up front (days, month, saved places), do NOT jump straight to a " +
  "full itinerary — first reflect it back warmly and ask one or two follow-ups to make it personal. " +
  "BUILD THE ITINERARY ONE DAY AT A TIME — NEVER dump the whole multi-day plan in a single message. " +
  "BEFORE you plan Day 1, ask WHAT TIME their flight lands in Ulaanbaatar (most international flights " +
  "land early morning or late evening — it changes the whole first day). Then SCHEDULE EACH DAY HOUR " +
  "BY HOUR with real clock times: start Day 1 from their landing time (e.g. 'You land at 07:00 — by " +
  "09:00, after checking in, start at X nearby'), and give every stop a time. For each stop say what " +
  "to see/do there, suggest WHERE and WHAT to eat nearby (a real local dish or spot — buuz, khuushuur, " +
  "a good cafe), and tell them HOW to get to the next stop (walk, taxi, bus, or hired driver) with a " +
  "rough travel time. Keep it realistic — leave time for the meal and the travel between stops. " +
  "Propose only the next single day, choosing from the FULL range of real Mongolian destinations " +
  "(Ulaanbaatar, Gorkhi-Terelj, Tsonjin Boldog, Khustai, Kharkhorin & Erdene Zuu, the Gobi & " +
  "Khongoryn Els, Lake Khövsgöl, Orkhon Valley & Tövkhön, Amarbayasgalant, Tsenkher hot springs, " +
  "Bayanzag, Naiman Nuur, the Altai…). These are only examples — pick whatever genuinely fits THIS " +
  "traveller's interests, season and chosen region, and DO NOT default to the same place for " +
  "everyone (in particular, do NOT reach for Gorkhi-Terelj by habit — only suggest it when it " +
  "actually fits). For each place you name in a day, call lookup_place so its card appears. " +
  "PLAN A FULL DAY — every day must include ALL of these: a morning activity (e.g. 09:00), a " +
  "breakfast or brunch spot (e.g. 08:00–09:00), a lunch restaurant with a specific local dish " +
  "(e.g. 12:30), at least one afternoon sight or activity (e.g. 14:00), a coffee or snack break " +
  "(e.g. 16:00), and a dinner restaurant (e.g. 19:00). Aim for 5–7 stops per day total. Give each " +
  "stop a real clock time, say what to do/see/eat there, and say how to get to the next stop. " +
  "Never skip meals — food stops are as important as sights. Keep the pace realistic with enough " +
  "time at each place to actually enjoy it. Tie every suggestion back to what they told you they care " +
  "about. " +
  "RESPECT GEOGRAPHY — Mongolia is huge and the regions are far apart, so NEVER bounce between " +
  "distant areas on back-to-back days (e.g. the Gobi on Day 1 then Arkhangai on Day 2 is wrong — " +
  "that's a punishing full day of driving each way). Instead, settle in ONE region at a time and " +
  "give it the days it deserves: spend the day actually IN the Gobi enjoying whatever they like, " +
  "and tell them the real things to see there (Khongoryn Els dunes, Yolyn Am, the Flaming Cliffs " +
  "of Bayanzag…), letting them pick. Only move to a new region when it's geographically sensible " +
  "and there's time, and group nearby places together. When days are short, suggest fewer regions " +
  "done well rather than a rushed loop. " +
  "Then ask if that day feels right or they'd like to tweak it before you move on. Once they " +
  "are happy with a day, recap the days settled so far as a short numbered list and propose the " +
  "NEXT day the same way, so the trip unfolds together through the conversation. Weave in practical " +
  "tips (weather for their month, how to get around, what to pack) as they naturally come up. Only " +
  "switch to the nearby, walk-beside-them flow once they are actually in Mongolia with live location.";

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_nearby_places",
      description:
        "Find real places near the traveller's current GPS location, closest first. " +
        "Use for food, coffee, attractions, shops, AND restful spots to sit/relax " +
        "(parks, squares, plazas, fountains, viewpoints, gardens).",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description:
              "What to look for, e.g. 'restaurant', 'coffee', 'park', 'square', " +
              "'viewpoint', 'place to sit and rest'.",
          },
          type: {
            type: "string",
            description:
              "Optional Google place type to narrow results, e.g. restaurant, cafe, " +
              "park, tourist_attraction. Omit it for open-ended 'somewhere to rest' searches.",
          },
        },
        required: ["keyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_place",
      description:
        "Look up ONE well-known Mongolian destination BY NAME to show its photo card. " +
        "Use this during trip planning (when there's no live location) for each real place " +
        "you recommend — e.g. 'Gorkhi-Terelj National Park', 'Khongoryn Els', 'Erdene Zuu " +
        "Monastery'. Call it once per place you propose so the traveller sees its card.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The destination's full name, e.g. 'Lake Khövsgöl' or 'Yolyn Am'.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize_trip_plan",
      description:
        "Call ONLY when the traveller signals their plan is complete. This does NOT save the " +
        "plan — it presents the finished plan to the traveller with 'Yes, save' and 'No, add " +
        "more' buttons, so they decide whether to keep it.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title, e.g. 'Afternoon in Ulaanbaatar'.",
          },
          summary: {
            type: "string",
            description: "2–4 sentence summary of the planned stops, in order.",
          },
          stops: {
            type: "array",
            description:
              "EVERY stop of the plan in order, so it can be saved to the day-by-day Journey " +
              "timeline. Include all days you settled with the traveller. Each day MUST have 5–7 " +
              "stops covering the full day: breakfast/brunch, a morning sight, lunch restaurant, " +
              "afternoon activity, coffee break, and dinner — all with specific clock times.",
            items: {
              type: "object",
              properties: {
                day: { type: "integer", description: "Day number, starting at 1." },
                time: { type: "string", description: "Time of day, e.g. '09:00' or 'Morning'." },
                title: { type: "string", description: "Place / activity name." },
                note: {
                  type: "string",
                  description:
                    "One short line: what they'll do there, plus any food tip or how to get to the next stop.",
                },
              },
              required: ["day", "time", "title"],
            },
          },
        },
        required: ["title", "summary", "stops"],
      },
    },
  },
];

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: IncomingMessage[];
  location?: { lat: number; lng: number };
}

// This is a Mongolia-only guide. A GPS fix outside Mongolia (the traveller is
// still abroad planning) must NOT drive nearby search — otherwise it recommends
// foreign places. Treat anything outside Mongolia's bounding box as no location.
function inMongolia(loc?: { lat: number; lng: number }): boolean {
  if (!loc) return false;
  return loc.lat >= 41.5 && loc.lat <= 52.2 && loc.lng >= 87.7 && loc.lng <= 120;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const { messages, location: rawLocation } = (await req.json()) as ChatRequest;
    const openai = new OpenAI({ apiKey });

    // Only use the GPS fix if it's actually in Mongolia; otherwise plan as pre-arrival.
    const location = inMongolia(rawLocation) ? rawLocation : undefined;

    const locationNote = location
      ? "The traveller's live GPS location is available — use find_nearby_places for anything location-based."
      : "The traveller's location is unavailable. They may be planning before arriving in Mongolia, so " +
        "follow the PRE-ARRIVAL PLANNING rule by default. Only ask them to enable location if they clearly " +
        "are already in Mongolia and want something right around them.";

    const conversation: ChatCompletionMessageParam[] = [
      { role: "system", content: `${SYSTEM_PROMPT} ${locationNote}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const { reply, places, pendingPlan } = await runConversation(openai, conversation, location);
    return Response.json({ reply, places, pendingPlan });
  } catch (error) {
    console.error("chat route error", error);
    return Response.json({ error: "Failed to get a reply" }, { status: 500 });
  }
}

// Runs the model and resolves any tool calls it makes, looping a few rounds so it
// can look up places and/or finalise a plan before writing its reply. Returns the
// final text PLUS the structured place cards it found and any plan awaiting the
// traveller's Save / Add more decision.
async function runConversation(
  openai: OpenAI,
  conversation: ChatCompletionMessageParam[],
  location?: { lat: number; lng: number },
): Promise<{ reply: string; places: PlaceCard[]; pendingPlan?: PendingPlan }> {
  const collected: NearbyPlace[] = [];
  let pendingPlan: PendingPlan | undefined;

  // A handful of rounds is plenty: the model looks things up, we feed the
  // results back, and it writes the reply.
  const MAX_ROUNDS = 4;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation,
      tools: TOOLS,
    });
    const message = completion.choices[0]?.message;
    if (!message) break;

    // No more lookups needed — this is the answer.
    if (!message.tool_calls?.length) {
      return { reply: message.content ?? "", places: toCards(collected), pendingPlan };
    }

    conversation.push(message);
    for (const call of message.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeParse(call.function.arguments);

      let result: unknown;
      if (call.function.name === "finalize_trip_plan") {
        // Don't save here — hand the plan to the UI so the traveller can confirm.
        if (args.title && args.summary) {
          pendingPlan = { title: args.title, summary: args.summary, stops: args.stops ?? [] };
        }
        result = { presented: Boolean(pendingPlan) };
      } else if (call.function.name === "lookup_place") {
        // Planning lookup by name — no live location needed.
        const place = args.name ? await lookupPlace(args.name) : null;
        if (place) collected.push(place);
        result = place
          ? { found: true, name: place.name, rating: place.rating }
          : { found: false };
      } else {
        const places = location
          ? await findNearbyPlaces(location.lat, location.lng, args.keyword ?? "place", args.type)
          : [];
        collected.push(...places);
        console.log(
          `[chat] location=${location ? "yes" : "NONE"} keyword="${args.keyword}" → ` +
            `${places.length} places, ${places.filter((p) => p.imageUrl).length} with photos`,
        );
        // The model only needs names/ratings/walk time to choose and write text.
        result = {
          locationKnown: Boolean(location),
          places: places.map((p) => ({
            name: p.name,
            rating: p.rating,
            walkMinutes: p.walkMinutes,
            openNow: p.openNow,
          })),
        };
      }

      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Hit the round cap — make one final pass without tools to force a text reply.
  const final = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversation,
  });
  return {
    reply: final.choices[0]?.message.content ?? "",
    places: toCards(collected),
    pendingPlan,
  };
}

// One scheduled stop in a finished plan, saved to the day-by-day Journey timeline.
interface PlanStop {
  day: number;
  time: string;
  title: string;
  note?: string;
}

// A finished plan awaiting the traveller's Save / Add more decision in the UI.
interface PendingPlan {
  title: string;
  summary: string;
  stops: PlanStop[];
}

// Cards shown beneath Michelle's reply: the closest few distinct places this turn,
// with their rating, review count and a snippet from the top review.
interface PlaceCard {
  id: string;
  name: string;
  // Coordinates so the Live Guide can drop a map marker on each suggestion.
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
  rating?: number;
  walkMinutes?: number;
  address?: string;
  reviewCount?: number;
  reviews?: { text: string; author?: string; rating?: number }[];
}

function toCards(places: NearbyPlace[]): PlaceCard[] {
  const seen = new Set<string>();
  return places
    .filter((p) => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.walkMinutes ?? 999) - (b.walkMinutes ?? 999))
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      description: p.description,
      imageUrl: p.imageUrl,
      rating: p.rating,
      walkMinutes: p.walkMinutes,
      address: p.address,
      reviewCount: p.reviewCount,
      reviews: p.reviews,
    }));
}

interface ToolArgs {
  keyword?: string;
  type?: string;
  name?: string;
  title?: string;
  summary?: string;
  stops?: PlanStop[];
}

function safeParse(json: string): ToolArgs {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
