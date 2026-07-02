import OpenAI from "openai";
import { toFile } from "openai";
import { chimegeStt } from "@/lib/chimege";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  if (!rateLimit(`stt:${clientIp(req)}`, 30, 60_000)) return rateLimitResponse();

  const formData = await req.formData();
  const audio = formData.get("audio") as Blob;
  const lang  = (formData.get("lang") as string) ?? "en";

  const mimeType = audio.type || "audio/webm";
  const audioBuffer = await audio.arrayBuffer();

  if (lang === "mn") {
    try {
      const text = await chimegeStt(audioBuffer, mimeType);
      return Response.json({ text, lang: "mn" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[stt] Chimege error:", msg);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // Whisper for English — use correct extension so OpenAI accepts the file
  const ext = mimeType.includes("mp4") ? "audio.mp4" : mimeType.includes("ogg") ? "audio.ogg" : "audio.webm";
  const buf  = Buffer.from(audioBuffer);
  const file = await toFile(buf, ext, { type: mimeType });
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
  });

  return Response.json({ text: result as unknown as string, lang: "en" });
}
