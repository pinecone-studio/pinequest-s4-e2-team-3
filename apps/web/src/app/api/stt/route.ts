import OpenAI from "openai";
import { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function chimegeStt(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const token = process.env.CHIMEGE_STT_TOKEN!;

  const upload = await fetch("https://api.chimege.com/v1.2/stt-long", {
    method: "POST",
    headers: { Token: token, "Content-Type": mimeType },
    body: audioBuffer,
  });

  const uploadText = await upload.text();
  if (!upload.ok || !uploadText.startsWith("{")) {
    throw new Error(`Chimege STT upload failed: ${uploadText}`);
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
