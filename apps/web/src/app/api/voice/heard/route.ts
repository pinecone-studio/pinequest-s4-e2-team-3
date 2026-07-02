import twilio from "twilio";
import OpenAI from "openai";
import { toFile } from "openai";
import { appendOperatorMessage } from "@/lib/sosIncidents";
import { chimegeStt } from "@/lib/chimege";
import { isValidTwilioRequest, formDataToParams } from "@/lib/twilioWebhook";

// Twilio's own speech recognition does NOT support Mongolian (mn-MN is only on its
// deprecated STT model), so <Gather speech> never transcribes the operator. Instead
// the call <Record>s the operator's reply and posts it here — we download the
// recording, transcribe the Mongolian (gpt-4o-transcribe), translate MN→English, and
// save it on the incident (the traveller's screen polls it).
export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const form = await req.formData();
  const recordingUrl = String(form.get("RecordingUrl") ?? "");
  const duration = Number(form.get("RecordingDuration") ?? "0");

  // Transcribe + translate off the request path so Twilio gets its next <Record>
  // instantly — a slow response here trips Twilio's timeout and drops the call.
  // Skip near-silent clips; transcribers hallucinate text on silence.
  // ponytail: fire-and-forget is fine on the long-running dev server; move to a
  // recordingStatusCallback + job if this ever runs on serverless.
  if (id && recordingUrl && duration >= 1) {
    void processReply(id, recordingUrl).catch((e) =>
      console.warn("[voice/heard] transcription failed:", e instanceof Error ? e.message : e),
    );
  }

  const origin =
    process.env.PUBLIC_BASE_URL ||
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`;
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.record({
    action: `${origin}/api/voice/heard?id=${id ?? ""}`,
    method: "POST",
    maxLength: 30,
    timeout: 4,
    playBeep: false,
    trim: "trim-silence",
  });
  return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

async function processReply(id: string, recordingUrl: string): Promise<void> {
  const mn = (await transcribeMn(recordingUrl)).trim();
  if (!mn) return;
  const en = await translateToEn(mn);
  await appendOperatorMessage(id, mn, en).catch(() => {});
}

// Transcribe the operator's Mongolian. Chimege is Mongolian-specialised and
// accurate; if it's unavailable (token suspended/quota) fall back to
// gpt-4o-transcribe (rough on Mongolian, but better than nothing).
async function transcribeMn(recordingUrl: string): Promise<string> {
  const audio = await fetchRecording(recordingUrl);
  if (!audio) return "";

  try {
    const mn = (await chimegeStt(audio, "audio/x-wav")).trim();
    if (mn) return mn;
  } catch (e) {
    console.warn("[voice/heard] Chimege STT failed, falling back:", e instanceof Error ? e.message : e);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = await toFile(Buffer.from(audio), "operator.wav", { type: "audio/wav" });
  const text = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-transcribe",
    prompt: "Энэ бол монгол хэл дээрх яриа.",
    response_format: "text",
  });
  return text as unknown as string;
}

// Download the Twilio recording as WAV (Basic auth). The recording can lag a beat
// behind the callback, so retry briefly.
async function fetchRecording(recordingUrl: string): Promise<ArrayBuffer | null> {
  const auth =
    "Basic " +
    Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${recordingUrl}.wav`, { headers: { Authorization: auth } });
    if (res.ok) return res.arrayBuffer();
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}

async function translateToEn(mn: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const c = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Translate from Mongolian to English. Output only the translation." },
        { role: "user", content: mn },
      ],
    });
    return c.choices[0]?.message.content ?? mn;
  } catch {
    return mn; // keep the Mongolian if translation fails
  }
}
