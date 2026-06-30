import twilio from "twilio";
import OpenAI from "openai";
import { appendOperatorMessage } from "@/lib/sosIncidents";

// Twilio <Gather speech> posts the operator's transcribed Mongolian here. We
// translate it to English, save it on the incident (so the traveller's screen can
// show it), then keep listening for the next reply.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const form = await req.formData();
  const mn = String(form.get("SpeechResult") ?? "").trim();

  if (id && mn) {
    let en = mn;
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const c = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Translate from Mongolian to English. Output only the translation." },
          { role: "user", content: mn },
        ],
      });
      en = c.choices[0]?.message.content ?? mn;
    } catch {
      /* keep the Mongolian text if translation fails */
    }
    await appendOperatorMessage(id, mn, en).catch(() => {});
  }

  // Keep listening for the operator's next reply.
  const origin =
    process.env.PUBLIC_BASE_URL ||
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`;
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.gather({
    input: ["speech"],
    language: "mn-MN",
    speechTimeout: "auto",
    action: `${origin}/api/voice/heard?id=${id ?? ""}`,
    method: "POST",
  });
  return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
