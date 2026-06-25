import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { text, lang = "en" } = (await req.json()) as {
    text: string;
    lang?: "mn" | "en";
  };

  if (lang === "en") {
    // OpenAI TTS for English
    const audio = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
    });
    const buffer = Buffer.from(await audio.arrayBuffer());
    return new Response(buffer, { headers: { "Content-Type": "audio/mpeg" } });
  }

  // Chimege TTS for Mongolian
  const token = process.env.CHIMEGE_TTS_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Missing CHIMEGE_TTS_TOKEN" },
      { status: 500 },
    );
  }

  const res = await fetch("https://api.chimege.com/v1.2/synthesize", {
    method: "POST",
    headers: {
      Token: token,
      "Content-Type": "text/plain",
      "voice-id": "FEMALE4v2",
    },
    body: text,
  });

  if (!res.ok) {
    return Response.json({ error: await res.text() }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new Response(audio, { headers: { "Content-Type": "audio/x-wav" } });
}
