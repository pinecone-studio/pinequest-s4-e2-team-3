import twilio from "twilio";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

// Mid-call: redirect an in-progress SOS call to speak a new Mongolian phrase to
// the operator (Chimege via <Play>), then hold the line open for the next one —
// so the traveller can keep the conversation going through translation.
export async function POST(req: Request) {
  if (!rateLimit(`voice-say:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return Response.json({ ok: false, error: "twilio_not_configured" }, { status: 503 });
  }

  const { sid, messageMn, incidentId } = (await req.json()) as {
    sid?: string;
    messageMn?: string;
    incidentId?: string;
  };
  if (!sid || !messageMn?.trim()) {
    return Response.json({ ok: false, error: "Missing sid or text" }, { status: 400 });
  }

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = process.env.PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "");

  void incidentId;
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.play(`${origin}/api/voice/sos-audio?text=${encodeURIComponent(messageMn.trim())}`);
  // Resume listening to the operator (keeps the line open too).
  if (origin) {
    twiml.gather({
      input: ["speech"],
      language: "mn-MN",
      speechTimeout: "auto",
      action: `${origin}/api/voice/heard?id=${incidentId ?? ""}`,
      method: "POST",
    });
  } else {
    twiml.pause({ length: 3600 });
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.calls(sid).update({ twiml: twiml.toString() });
    return Response.json({ ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "say_failed";
    return Response.json({ ok: false, error: detail }, { status: 502 });
  }
}
