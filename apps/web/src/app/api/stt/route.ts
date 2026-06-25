import OpenAI from "openai";
import { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function chimegeStt(audioBuffer: ArrayBuffer): Promise<string> {
  const token = process.env.CHIMEGE_STT_TOKEN!;

  const upload = await fetch("https://api.chimege.com/v1.2/stt-long", {
    method: "POST",
    headers: { Token: token },
    body: audioBuffer,
  });

  const uploadText = await upload.text();
  if (!upload.ok || !uploadText.startsWith("{")) {
    throw new Error(`Chimege STT: ${uploadText}`);
  }

  const { uuid } = JSON.parse(uploadText);

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch("https://api.chimege.com/v1.2/stt-long-transcript", {
      headers: { Token: token, UUID: uuid },
    });
    const result = await poll.json();
    if (result.done) return result.transcription ?? "";
  }
  return "";
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const audio = formData.get("audio") as Blob;
  const lang  = (formData.get("lang") as string) ?? "en";

  const audioBuffer = await audio.arrayBuffer();

  if (lang === "mn") {
    // Chimege STT for Mongolian — handles Cyrillic accurately
    const text = await chimegeStt(audioBuffer);
    return Response.json({ text, lang: "mn" });
  }

  // Whisper for English
  const buf  = Buffer.from(audioBuffer);
  const file = await toFile(buf, "audio.webm", { type: "audio/webm" });
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
  });

  return Response.json({ text: result as unknown as string, lang: "en" });
}
