import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { findNearbyPlaces } from "@/lib/places";
import type { PlaceOption } from "@/types";

function placeKind(keyword = "", type = ""): PlaceOption["kind"] {
  const q = `${keyword} ${type}`.toLowerCase();
  if (/bus|station|transit|stop/.test(q)) return "transit";
  if (/food|restaurant|cafe|coffee|eat|hungry|guanz|buuz|lunch|dinner|bakery/.test(q))
    return "food";
  return "place";
}

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
  "• When they signal they're happy / done → call finalize_trip_plan with a short title and a " +
  "2–4 sentence summary of the stops in order. This does NOT save the plan — it shows the " +
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
  "is useless here). First ask how many days they have, which season/month, and what they're " +
  "after (city culture, countryside, desert, lakes, nomadic life). " +
  "BUILD THE ITINERARY ONE DAY AT A TIME — never dump the whole multi-day plan in one message. " +
  "Propose only Day 1 (real cities/regions like Ulaanbaatar, Kharkhorin, Gorkhi-Terelj, the Gobi, " +
  "Lake Khövsgöl…, with what to do and rough travel times), then ask if it looks good or they'd " +
  "like to adjust before you move on. Once they're happy with a day, recap the days settled so " +
  "far as a short numbered list and propose the NEXT day the same way, so the trip unfolds day by " +
  "day through the conversation. Keep each turn short and warm, and weave in practical tips (when " +
  "to come, how to get around, what to pack) as they become relevant. Only switch to the nearby, " +
  "walk-beside-them flow once they are actually in Mongolia with live location.";

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
        },
        required: ["title", "summary"],
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

interface ToolArgs {
  keyword?: string;
  type?: string;
  title?: string;
  summary?: string;
}

function safeParse(json: string): ToolArgs {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

async function runConversation(
  openai: OpenAI,
  conversation: ChatCompletionMessageParam[],
  location?: { lat: number; lng: number },
): Promise<{ reply: string; places: PlaceOption[]; pendingPlan?: { title: string; summary: string } }> {
  const collected: PlaceOption[] = [];
  let pendingPlan: { title: string; summary: string } | undefined;

  for (let round = 0; round < 3; round++) {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation,
      tools: round < 2 ? TOOLS : undefined,
    });
    const msg = resp.choices[0]?.message;
    if (!msg) break;

    if (!msg.tool_calls?.length) {
      return { reply: msg.content ?? "", places: collected, pendingPlan };
    }

    conversation.push(msg);

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeParse(call.function.arguments);
      let result: unknown;

      if (call.function.name === "finalize_trip_plan") {
        if (args.title && args.summary) pendingPlan = { title: args.title, summary: args.summary };
        result = { presented: Boolean(pendingPlan) };
      } else {
        const found = location
          ? await findNearbyPlaces(location.lat, location.lng, args.keyword ?? "place", args.type)
          : [];
        const kind = placeKind(args.keyword, args.type);
        for (const p of found) {
          collected.push({ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, address: p.address, rating: p.rating, kind });
        }
        console.log(`[chat] keyword="${args.keyword}" → ${found.length} places`);
        result = {
          locationKnown: Boolean(location),
          places: found.map((p) => ({ name: p.name, rating: p.rating, walkMinutes: p.walkMinutes, openNow: p.openNow })),
        };
      }
      conversation.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  const final = await openai.chat.completions.create({ model: "gpt-4o", messages: conversation });
  return { reply: final.choices[0]?.message.content ?? "", places: collected, pendingPlan };
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
    const { messages, location } = (await req.json()) as ChatRequest;
    const openai = new OpenAI({ apiKey });

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
