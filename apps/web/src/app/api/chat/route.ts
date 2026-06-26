import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { findNearbyPlaces } from "@/lib/places";

const SYSTEM_PROMPT =
  "You are Nova, a warm, knowledgeable AI travel guide for Mongolia (the Polaris app). " +
  "The users are international visitors, so ALWAYS reply in English, even if they write " +
  "in another language. You may include a Mongolian word or phrase when it's useful, but " +
  "follow it with the English meaning. " +
  "Keep answers short, practical and conversational — travelers are on the go. " +
  "Read what the traveller actually needs and call find_nearby_places for it: " +
  "if they're hungry → food; if they're tired or want to rest/relax/sit → calm spots " +
  "(parks, squares, plazas, fountains, viewpoints, gardens, or a quiet cafe — include free " +
  "public places, not only shops). " +
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

    const reply = await runConversation(openai, conversation, location);
    return Response.json({ reply });
  } catch (error) {
    console.error("chat route error", error);
    return Response.json({ error: "Failed to get a reply" }, { status: 500 });
  }
}

// Runs the model, resolves any place lookups it requests, then returns the
// final text. One tool round-trip is enough for "find me something nearby".
async function runConversation(
  openai: OpenAI,
  conversation: ChatCompletionMessageParam[],
  location?: { lat: number; lng: number },
): Promise<string> {
  const first = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversation,
    tools: TOOLS,
  });
  const message = first.choices[0]?.message;

  if (!message?.tool_calls?.length) {
    return message?.content ?? "";
  }

  conversation.push(message);
  for (const call of message.tool_calls) {
    if (call.type !== "function") continue;
    const args = safeParse(call.function.arguments);
    const places = location
      ? await findNearbyPlaces(location.lat, location.lng, args.keyword ?? "place", args.type)
      : [];
    console.log(
      `[chat] location=${location ? `${location.lat},${location.lng}` : "NONE"} ` +
        `keyword="${args.keyword}" type="${args.type ?? ""}" → ${places.length} places: ` +
        places.map((p) => p.name).join(", "),
    );
    conversation.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify({
        locationKnown: Boolean(location),
        places,
      }),
    });
  }

  const second = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversation,
  });
  return second.choices[0]?.message.content ?? "";
}

function safeParse(json: string): { keyword?: string; type?: string } {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
