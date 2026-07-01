import twilio from "twilio";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

// Places a REAL outbound call from the server via Twilio's REST API and, on
// answer, speaks the SOS message to the operator IN MONGOLIAN using Chimege TTS
// (via <Play> of /api/voice/sos-audio) — so the traveller's language barrier is
// bridged. Falls back to an English Polly voice if no Mongolian text is given.
export async function POST(req: Request) {
  // No login required (an SOS caller may not be signed in) — a per-IP limit
  // bounds toll/cost abuse of the real Twilio call this triggers.
  if (!rateLimit(`voice-call:${clientIp(req)}`, 5, 60_000)) return rateLimitResponse();

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_CALLER_ID,
    TWILIO_SOS_DEMO_NUMBER,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID || !TWILIO_SOS_DEMO_NUMBER) {
    return Response.json({ error: "twilio_not_configured" }, { status: 503 });
  }

  const { message, messageMn, incidentId } = (await req.json()) as {
    message?: string;
    messageMn?: string;
    incidentId?: string;
  };

  // Twilio <Play> needs an absolute, public URL it can reach. Prefer an explicit
  // PUBLIC_BASE_URL (the ngrok/Vercel address) so it works even when the app is
  // opened on localhost; otherwise fall back to the request host.
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = process.env.PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "");

  void message;
  const twiml = new twilio.twiml.VoiceResponse();

  // If the traveller pre-wrote a message (the "describe it in your own words"
  // box), read it to the operator once on answer. Otherwise stay silent and let
  // them drive with "Say more". Either way we then listen for the operator.
  if (messageMn?.trim() && origin) {
    twiml.play(`${origin}/api/voice/sos-audio?text=${encodeURIComponent(messageMn.trim())}`);
  }

  // Listen to the operator's reply (transcribe → translate → show via
  // /api/voice/heard), which also keeps the line open for follow-ups.
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
    const call = await client.calls.create({
      to: TWILIO_SOS_DEMO_NUMBER,
      from: TWILIO_CALLER_ID,
      twiml: twiml.toString(),
    });
    return Response.json({ sid: call.sid, status: call.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "call_failed";
    return Response.json({ error: detail }, { status: 502 });
  }
}
