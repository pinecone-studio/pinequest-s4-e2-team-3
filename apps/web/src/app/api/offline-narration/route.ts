import OpenAI from "openai";

// Generates Michelle's on-arrival narration for every stop of a route in ONE
// call, so an offline pack can cache the spoken text (and its audio) once at
// plan-creation time instead of re-generating per visit.

const SYSTEM_PROMPT =
  "You are Michelle, a warm, knowledgeable AI travel guide for Mongolia (the Polaris app). " +
  "For each stop you are given, write the short narration you'd speak the moment the traveller " +
  "arrives there: 2–3 warm, practical sentences in English, spoken directly to the traveller. " +
  "Lead with what makes the place matter and one concrete thing to notice or do. No street " +
  "addresses, Plus codes or khoroo numbers. Return STRICT JSON only.";

interface StopIn {
  id: string;
  name: string;
  kind?: string;
  context?: string;
  lat?: number;
  lng?: number;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const { stops } = (await req.json()) as { stops: StopIn[] };
    if (!Array.isArray(stops) || stops.length === 0) {
      return Response.json({ texts: [] });
    }

    const openai = new OpenAI({ apiKey });
    const list = stops
      .map((s) => `- id: ${s.id} | ${s.name}${s.kind ? ` (${s.kind})` : ""}${s.context ? ` — ${s.context}` : ""}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Write arrival narration for these stops, in order:\n${list}\n\n` +
            `Respond as JSON: {"texts":[{"id":"<stop id>","text":"<narration>"}]} — one entry per stop, ids unchanged.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { texts?: { id: string; text: string }[] };
    return Response.json({ texts: parsed.texts ?? [] });
  } catch (error) {
    console.error("offline-narration route error", error);
    return Response.json({ error: "Failed to generate narration" }, { status: 500 });
  }
}
