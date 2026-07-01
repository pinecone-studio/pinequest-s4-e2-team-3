import OpenAI from "openai";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  if (!rateLimit(`tts:${clientIp(req)}`, 30, 60_000)) return rateLimitResponse();

  const { text, lang = "en" } = (await req.json()) as {
    text: string;
    lang?: "mn" | "en";
  };

  // Nothing to say → don't call the provider (empty input 400s on OpenAI).
  if (!text?.trim()) {
    return Response.json({ error: "Empty text" }, { status: 400 });
  }

  if (lang === "en") {
    // OpenAI TTS for English. Wrapped so a provider error (quota, billing, rate
    // limit) returns a clean status instead of an unhandled 500 — the client
    // (lib/tts) then falls back to the browser voice. The logged message is how
    // you see the REAL cause of a failing /api/tts in the server terminal.
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    try {
      const audio = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });
      const buffer = Buffer.from(await audio.arrayBuffer());
      return new Response(buffer, { headers: { "Content-Type": "audio/mpeg" } });
    } catch (err) {
      console.error("TTS (OpenAI) failed:", err instanceof Error ? err.message : err);
      return Response.json({ error: "TTS failed" }, { status: 502 });
    }
  }

  // Chimege TTS for Mongolian
  const token = process.env.CHIMEGE_TTS_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Missing CHIMEGE_TTS_TOKEN" },
      { status: 500 },
    );
  }

  // Chimege only accepts Mongolian Cyrillic + basic punctuation — digits, Latin
  // and symbols make it fail. Strip anything it can't speak so it never errors.
  const clean = text.replace(/[^Ѐ-ӿ\s?!.\-'":,]/g, " ").replace(/\s+/g, " ").trim();

  const res = await fetch("https://api.chimege.com/v1.2/synthesize", {
    method: "POST",
    headers: {
      Token: token,
      "Content-Type": "text/plain",
      "voice-id": "FEMALE4v2",
    },
    body: clean,
  });

  if (!res.ok) {
    return Response.json({ error: await res.text() }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new Response(audio, { headers: { "Content-Type": "audio/x-wav" } });
}
