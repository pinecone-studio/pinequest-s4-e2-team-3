import OpenAI from "openai";
import { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const formData = await req.formData();
  const audio = formData.get("audio") as Blob;
  const lang  = (formData.get("lang") as string) ?? "en";

  const buf  = Buffer.from(await audio.arrayBuffer());
  const file = await toFile(buf, "audio.webm", { type: "audio/webm" });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
    // Passing a Mongolian-script prompt nudges Whisper to transcribe
    // in Cyrillic when the speaker is Mongolian.
    ...(lang === "mn"
      ? { prompt: "Монгол хэлээр ярьж байна. Монгол Кирилл үсгээр бич." }
      : {}),
  });

  return Response.json({ text: result as unknown as string, lang });
}
