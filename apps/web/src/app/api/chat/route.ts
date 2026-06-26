import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { findNearbyPlaces } from "@/lib/places";
import type { PlaceOption } from "@/types";

// Classify a lookup so the UI can tell a bus station from a food spot.
function placeKind(keyword = "", type = ""): PlaceOption["kind"] {
  const q = `${keyword} ${type}`.toLowerCase();
  if (/bus|station|transit|stop/.test(q)) return "transit";
  if (/food|restaurant|cafe|coffee|eat|hungry|guanz|buuz|lunch|dinner|bakery/.test(q))
    return "food";
  return "place";
}

const SYSTEM_PROMPT =
  "You are Nova, a warm, knowledgeable AI travel guide for Mongolia (the Lumo app). " +
  "The users are international visitors, so ALWAYS reply in English, even if they write " +
  "in another language. You may include a Mongolian word or phrase when it's useful, but " +
  "follow it with the English meaning. " +
  "Keep answers short, practical and conversational — travelers are on the go. " +
  "Read what the traveller actually needs and call find_nearby_places for it: " +
  "if they're hungry → food; if they're tired or want to rest/relax/sit → calm spots " +
  "(parks, squares, plazas, fountains, viewpoints, gardens, or a quiet cafe — include free " +
  "public places, not only shops). " +
  "TRANSPORT: if the traveller asks how to get somewhere or wants to travel by bus, " +
  "briefly state the realistic options in Mongolia (usually bus or taxi — there's no metro), " +
  "and if they want the bus, call find_nearby_places with keyword 'bus station' (type " +
  "'bus_station') to surface the nearest stop so they can pick it. " +
  "CRITICAL GROUNDING RULES: " +
  "1) Recommend ONLY places returned by find_nearby_places. Never invent a place or name a " +
  "famous landmark from memory — the tool already returns the CLOSEST options first, so " +
  "recommend from the top of that list. " +
  "2) Do NOT require a place to be 'open now'; suggest the closest good options and only " +
  "mention opening hours when the data clearly says so. " +
  "3) If the tool returns no places, or the location is unknown, tell the traveller you " +
  "couldn't find places near them and ask them to enable location — do NOT guess a landmark.";

// Lets the model fetch real places near the traveller when it needs to.
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
];

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: IncomingMessage[];
  location?: { lat: number; lng: number };
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
      : "The traveller's location is unavailable; if they ask for nearby places, ask them to turn on location.";

    const conversation: ChatCompletionMessageParam[] = [
      { role: "system", content: `${SYSTEM_PROMPT} ${locationNote}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const { reply, places } = await runConversation(openai, conversation, location);
    return Response.json({ reply, places });
  } catch (error) {
    console.error("chat route error", error);
    return Response.json({ error: "Failed to get a reply" }, { status: 500 });
  }
}

// Runs the model, resolves any place lookups it requests, then returns the final
// text PLUS the structured places it found — so the Live Guide can show them as
// selectable buttons/markers. One tool round-trip is enough.
async function runConversation(
  openai: OpenAI,
  conversation: ChatCompletionMessageParam[],
  location?: { lat: number; lng: number },
): Promise<{ reply: string; places: PlaceOption[] }> {
  const first = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversation,
    tools: TOOLS,
  });
  const message = first.choices[0]?.message;

  if (!message?.tool_calls?.length) {
    return { reply: message?.content ?? "", places: [] };
  }

  const collected: PlaceOption[] = [];
  conversation.push(message);
  for (const call of message.tool_calls) {
    if (call.type !== "function") continue;
    const args = safeParse(call.function.arguments);
    const found = location
      ? await findNearbyPlaces(location.lat, location.lng, args.keyword ?? "place", args.type)
      : [];
    const kind = placeKind(args.keyword, args.type);
    for (const p of found) {
      collected.push({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address,
        kind,
      });
    }
    console.log(
      `[chat] location=${location ? `${location.lat},${location.lng}` : "NONE"} ` +
        `keyword="${args.keyword}" type="${args.type ?? ""}" → ${found.length} places: ` +
        found.map((p) => p.name).join(", "),
    );
    conversation.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify({
        locationKnown: Boolean(location),
        places: found,
      }),
    });
  }

  const second = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversation,
  });

  // De-dupe by id (the model may look up more than once).
  const places = Array.from(new Map(collected.map((p) => [p.id, p])).values()).slice(0, 5);
  return { reply: second.choices[0]?.message.content ?? "", places };
}

function safeParse(json: string): { keyword?: string; type?: string } {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
