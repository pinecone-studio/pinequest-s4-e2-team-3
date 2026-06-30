import twilio from "twilio";

// Places a REAL outbound call from the server via Twilio's REST API and, on
// answer, speaks the SOS message to the operator IN MONGOLIAN using Chimege TTS
// (via <Play> of /api/voice/sos-audio) — so the traveller's language barrier is
// bridged. Falls back to an English Polly voice if no Mongolian text is given.
export async function POST(req: Request) {
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

  const twiml = new twilio.twiml.VoiceResponse();

  if (messageMn?.trim() && origin) {
    // Speak ONLY the traveller's Mongolian SOS message (Chimege), read twice.
    const audioUrl = `${origin}/api/voice/sos-audio?text=${encodeURIComponent(messageMn.trim())}`;
    twiml.play(audioUrl);
    twiml.pause({ length: 1 });
    twiml.play(audioUrl);
  } else {
    // Fallback only when no Mongolian text / public URL is available.
    const spoken = message?.trim() || "A traveller needs emergency help.";
    twiml.say({ voice: "Polly.Joanna" }, spoken);
  }

  // Keep the line open so the traveller can keep sending translated phrases
  // (see /api/voice/say). NOTE: operator-reply transcription via <Gather mn-MN>
  // proved unreliable (Twilio Mongolian support) and dropped the call, so we hold
  // with <Pause> for a rock-solid EN→MN direction instead.
  void incidentId;
  twiml.pause({ length: 3600 });

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
