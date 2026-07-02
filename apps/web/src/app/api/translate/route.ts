import OpenAI from "openai";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANG_NAME: Record<string, string> = {
  mn: "Mongolian",
  en: "English",
};

export async function POST(req: Request) {
  if (!rateLimit(`translate:${clientIp(req)}`, 30, 60_000)) return rateLimitResponse();

  const { text, from, to } = await req.json() as {
    text: string;
    from: "mn" | "en";
    to: "mn" | "en";
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          `You are a professional interpreter. Translate the following text from ${LANG_NAME[from]} to ${LANG_NAME[to]}. ` +
          "Output only the translation — no explanations, no quotes, no extra text.",
      },
      { role: "user", content: text },
    ],
  });

  const translation = completion.choices[0]?.message.content ?? "";
  return Response.json({ translation });
}
