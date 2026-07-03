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
    // Chimege is the best Mongolian STT but only accepts WAV; the browser records
    // webm/mp4/ogg, which makes Chimege 500. Try it anyway (works when the caller
    // sends WAV, e.g. Twilio), then fall back to gpt-4o-transcribe, which accepts
    // the browser formats directly (rougher on Mongolian, but no error).
    try {
      const text = (await chimegeStt(audioBuffer, mimeType)).trim();
      if (text) return Response.json({ text, lang: "mn" });
    } catch (err) {
      console.warn("[stt] Chimege failed, falling back:", err instanceof Error ? err.message : err);
    }
    const ext = mimeType.includes("mp4") ? "audio.mp4" : mimeType.includes("ogg") ? "audio.ogg" : mimeType.includes("wav") ? "audio.wav" : "audio.webm";
    const file = await toFile(Buffer.from(audioBuffer), ext, { type: mimeType });
    const text = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-transcribe",
      prompt: "Энэ бол монгол хэл дээрх яриа.",
      response_format: "text",
    });
    return Response.json({ text: text as unknown as string, lang: "mn" });
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
