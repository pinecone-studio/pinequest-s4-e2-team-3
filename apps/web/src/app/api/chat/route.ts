import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { findNearbyPlaces, lookupPlace, nearestPlace, type NearbyPlace } from "@/lib/places";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

const SYSTEM_PROMPT =
  "You are Michelle, a friendly AI travel guide for Mongolia. Always reply in English. " +
  "KEEP EVERY REPLY SHORT — 2–4 sentences max outside of option lists. " +
  "EXCEPTION: when presenting choices at a planning stage (Stages A–E), you MUST output a numbered list of EXACTLY 5 options — this overrides the short-reply rule. " +
  "Be warm and direct like a local friend texting tips, not a travel brochure. " +

  "NEARBY (live location available): Call find_nearby_places. Show up to 5 options as a numbered list: " +
  "name, rating, walk time, one-line reason. No addresses or postal codes. " +
  "IMPORTANT: When the traveller has already chosen an activity place (via lookup_place), pass that place's " +
  "latitude and longitude to find_nearby_places so food/coffee results are near THAT place, not the traveller's current position. " +

  "AT A PLACE: If the traveller asks about the place they are currently at — its history, " +
  "meaning, 'why is it like this', 'what is this place', 'why so many X here' — EXPLAIN it with " +
  "real facts from your Mongolia knowledge (and any CURRENT PLACE context provided below). Do NOT " +
  "run a nearby search for these, and NEVER say there is no such thing near them or offer to " +
  "recommend a different place instead. " +

  "TRIP PLANNING (no live location): Use your Mongolia knowledge. " +
  "RULE: For EVERY specific place you name in a planning message, call lookup_place for it FIRST " +
  "(all lookups in the same tool-call round), THEN write your text. " +
  "A place name in your text without a prior lookup_place call is an error — the card won't appear. " +

  "GATHERING INFO BEFORE PLANNING — follow this exact order, ONE question at a time: " +
  "Step 1 — city or countryside (if not stated). " +
  "Step 2 — how many days (if not stated). " +
  "Step 2b — MANDATORY follow-up: if the traveller answers 1 day or fewer, OR mentions hours, OR says 'a few hours' / 'half a day', you MUST ask: 'And roughly how many hours do you have? For example, 2 hours, half a day, or a full day?' Do NOT skip this. " +
  "Step 3 — which month or season (SKIP THIS for hours-based / same-day visits — they are clearly already in Mongolia). Only ask for multi-day trips where season affects planning. " +
  "Step 4 — what do they enjoy most? Give 3–4 concrete options: temples & history / nature & hikes / local markets & food / nomadic culture & horse riding. " +
  "Step 5 — food preferences: traditional Mongolian / vegetarian / street food / fine dining? " +
  "Step 6 — what time do you plan to start? Ask this IMMEDIATELY after Step 5, before showing any places. Example: 'What time are you planning to start? e.g. 09:00, 11:00, 14:00'. " +
  "NEVER show activity options or place lists until all required steps are answered. Asking 2 questions at once is forbidden. " +

  "HOURS-BASED STAGE LIMIT — determines how many STOPS end up in the final plan (not how many OPTIONS to show): " +
  "• 1–2 hours → final plan has 1 activity + 1 meal (2 stops total). " +
  "• 2–3 hours → final plan has 1 activity + 1 meal (2 stops). " +
  "• 3–5 hours (half day) → final plan has 2 activities + 1 meal (3 stops). " +
  "• 5+ hours or full day → all stages A→E (5 stops). " +
  "If hours were never mentioned, assume full day. " +
  "TIME CALCULATION — CRITICAL: the total duration of ALL stops MUST fit within the stated hours. " +
  "Activity at a city park or hill = 45–60 min. Meal = 30–45 min. Travel between stops = add actual walk/taxi time. " +
  "Example: 2 hours starting 15:00 → Stop1: 15:00 activity (60 min) → Stop2: 16:00 meal (45 min) → done at 16:45. " +
  "NEVER schedule stops that run past start_time + available_hours. " +

  "INTERACTIVE DAY BUILDING — build each day step by step, waiting for the traveller to pick at each stage. " +
  "CRITICAL: At EVERY stage, show EXACTLY 5 OPTIONS for the traveller to choose from — regardless of how many hours they have. " +
  "Showing 5 options does NOT mean the plan has 5 stops; it means giving 5 choices so they can pick 1. " +
  "Call lookup_place for ALL 5 named places in that stage BEFORE writing your reply, so photo cards appear. " +
  "FORMAT for each suggestion stage — list choices exactly like this (numbered, one per line): " +
  "1. Place Name — one-line reason why\n2. Place Name — one-line reason why\n3. Place Name — one-line reason why\n4. Place Name — one-line reason why\n5. Place Name — one-line reason why\n" +
  "Then ask 'Which would you prefer?' on a new line. " +
  "Stage A: List EXACTLY 5 specific breakfast spots (cafés or restaurants). Call lookup_place for each first. " +
  "Stage B: After breakfast pick — list EXACTLY 5 specific morning sights or activities. Call lookup_place for each first. " +
  "Stage C: After morning pick — list EXACTLY 5 specific lunch restaurants. Call lookup_place for each first. " +
  "Stage D: After lunch pick — list EXACTLY 5 specific afternoon sights or activities. Call lookup_place for each first. " +
  "Stage E: After afternoon pick — list EXACTLY 5 specific dinner restaurants. Call lookup_place for each first. " +
  "Stage F: After all planned picks — compile the FULL plan with exact clock times and one-line notes per stop, " +
  "then ask 'Want to save this to your Journey?' on a new line. " +
  "After the full day summary, ask 'Ready for Day N?' before starting the next day (multi-day trips only). " +

  "SAVING A PLAN — CRITICAL RULES: " +
  "THE ONLY WAY to show 'Yes, save' and 'No, add more' buttons is by calling finalize_trip_plan. " +
  "Writing 'Want to save?' as plain text WITHOUT calling the tool does NOTHING — the buttons will NOT appear. " +
  "(1) SHORT VISIT (hours-based, 1 day or fewer): once the traveller picks their RESTAURANT (last stop), " +
  "    write a 1-sentence summary, then IMMEDIATELY call finalize_trip_plan with day:1 and all chosen stops. " +
  "    Do NOT write 'Want to save?' — calling the tool shows the buttons automatically. " +
  "    This is MANDATORY after every restaurant pick in a short visit — do not skip it. " +
  "(2) MULTI-DAY TRIPS: NEVER call finalize_trip_plan until EVERY requested day is planned. " +
  "    After ALL days are done, write a summary then call finalize_trip_plan with ALL stops. " +
  "(3) When the traveller says 'Yes', 'save', or confirms saving after the buttons appear: " +
  "    they already clicked the button — do NOT call finalize_trip_plan again. " +
  "(4) NEVER write 'Want to save this to your Journey?' as plain text. Just call finalize_trip_plan. " +

  "NEVER invent places. NEVER write more than 4 sentences in one reply.";

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_nearby_places",
      description:
        "Find real places near a location, closest first. " +
        "Use for food, coffee, attractions, shops, AND restful spots to sit/relax. " +
        "When the traveller has already chosen an activity place, pass that place's latitude/longitude " +
        "so results are near THAT place, not the traveller's current position.",
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
              "park, tourist_attraction. Omit it for open-ended searches.",
          },
          latitude: {
            type: "number",
            description:
              "Override search center latitude. Use the selected activity place's latitude " +
              "when searching for food/coffee near that place.",
          },
          longitude: {
            type: "number",
            description:
              "Override search center longitude. Use the selected activity place's longitude " +
              "when searching for food/coffee near that place.",
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
              "EVERY stop of the plan in order. All stops use day: 1 for single-day or hours plans. " +
              "For hours-based short visits: include only the stops actually chosen (1–3 stops with exact clock times). " +
              "For full-day plans: 5–7 stops covering breakfast, morning sight, lunch, afternoon activity, coffee, dinner. " +
              "For multi-day trips: include ALL days, each with 5–7 stops. " +
              "ALWAYS calculate times from the traveller's stated start time (Step 6). " +
              "E.g. start 14:00 + 1.5h activity = next stop at 15:30. Use realistic durations per stop type.",
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

// Separates the streamed reply text from the trailing JSON metadata (place cards
// + any pending plan). A null char never appears in normal model output.
const META_DELIM = "\n\nPINEQUEST_META:";

export async function POST(req: Request) {
  if (!rateLimit(`chat:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  const { messages, location: rawLocation } = (await req.json()) as ChatRequest;
  const openai = new OpenAI({ apiKey });

  // Only use the GPS fix if it's actually in Mongolia; otherwise plan as pre-arrival.
  const location = inMongolia(rawLocation) ? rawLocation : undefined;

  const locationNote = location
    ? "The traveller's live GPS location is available — use find_nearby_places for anything location-based."
    : "The traveller's location is unavailable. They may be planning before arriving in Mongolia, so " +
      "follow the PRE-ARRIVAL PLANNING rule by default. Only ask them to enable location if they clearly " +
      "are already in Mongolia and want something right around them.";

  // Resolve WHERE the traveller is standing so the guide can answer questions
  // about their surroundings with facts, instead of doing a nearby search and
  // offering a different place. Cheap: cached ~10 min per ~110 m.
  const here = location ? await nearestPlace(location.lat, location.lng) : null;
  const currentPlaceNote = here
    ? ` CURRENT PLACE — the traveller is standing at or right next to "${here.name}".` +
      (here.description ? ` About it: ${here.description}` : "") +
      (here.reviews?.[0]?.text ? ` A visitor noted: "${here.reviews[0].text.slice(0, 200)}".` : "") +
      " Use this to answer questions about where they are."
    : "";

  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT} ${locationNote}${currentPlaceNote}` },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Stream the reply text as it's generated, then a metadata tail with the cards.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        const { places, pendingPlan, suggestions } = await streamConversation(openai, conversation, location, send);
        send(META_DELIM + JSON.stringify({ places, pendingPlan, suggestions }));
      } catch (error) {
        console.error("chat route error", error);
        send(META_DELIM + JSON.stringify({ error: true }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Runs the model and resolves any tool calls it makes, looping a few rounds so it
// can look up places and/or finalise a plan before writing its reply. Returns the
// final text PLUS the structured place cards it found and any plan awaiting the
// traveller's Save / Add more decision.
async function streamConversation(
  openai: OpenAI,
  conversation: ChatCompletionMessageParam[],
  location: { lat: number; lng: number } | undefined,
  send: (s: string) => void,
): Promise<{ places: PlaceCard[]; pendingPlan?: PendingPlan; suggestions?: string[] }> {
  const collected: NearbyPlace[] = [];
  let pendingPlan: PendingPlan | undefined;
  let suggestions: string[] | undefined;

  const MAX_ROUNDS = 4;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation,
      tools: TOOLS,
      stream: true,
    });

    let content = "";
    const toolAcc: Record<number, { id: string; name: string; args: string }> = {};
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        send(delta.content);
      }
      for (const tc of delta?.tool_calls ?? []) {
        const acc = (toolAcc[tc.index] ??= { id: "", name: "", args: "" });
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name += tc.function.name;
        if (tc.function?.arguments) acc.args += tc.function.arguments;
      }
    }

    const toolCalls = Object.values(toolAcc);

    // No tool calls → this is the final response
    if (!toolCalls.length) {
      return { places: toCards(collected), pendingPlan, suggestions };
    }

    conversation.push({
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.map((t) => ({
        id: t.id,
        type: "function" as const,
        function: { name: t.name, arguments: t.args },
      })),
    });

    for (const t of toolCalls) {
      const args = safeParse(t.args);
      let result: unknown;

      if (t.name === "finalize_trip_plan") {
        if (args.title && args.summary) {
          pendingPlan = { title: args.title, summary: args.summary, stops: args.stops ?? [] };
        }
        result = { presented: Boolean(pendingPlan) };
      } else if (t.name === "lookup_place") {
        const place = args.name ? await lookupPlace(args.name) : null;
        if (place) collected.push(place);
        result = place
          ? { found: true, name: place.name, rating: place.rating, latitude: place.latitude, longitude: place.longitude }
          : { found: false };
      } else {
        const searchLat = args.latitude ?? location?.lat;
        const searchLng = args.longitude ?? location?.lng;
        const places = searchLat != null && searchLng != null
          ? await findNearbyPlaces(searchLat, searchLng, args.keyword ?? "place", args.type)
          : [];
        collected.push(...places);
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

      conversation.push({ role: "tool", tool_call_id: t.id, content: JSON.stringify(result) });
    }
  }

  return { places: toCards(collected), pendingPlan, suggestions };
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
    .slice(0, 5)
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
  latitude?: number;
  longitude?: number;
  name?: string;
  title?: string;
  summary?: string;
  stops?: PlanStop[];
  replies?: string[];
}

function safeParse(json: string): ToolArgs {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
