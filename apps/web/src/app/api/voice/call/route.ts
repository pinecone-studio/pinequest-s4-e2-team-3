import twilio from "twilio";

// Places a REAL outbound call straight from the server via Twilio's REST API.
// Unlike the browser Voice SDK, this needs no WebRTC and no public callback URL —
// so it works even when the traveller's network blocks Twilio's signaling.
// Twilio rings TWILIO_SOS_DEMO_NUMBER and reads the SOS message aloud on answer.
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

  const { message } = (await req.json()) as { message?: string };
  const spoken = message?.trim() || "Emergency call from a traveller. Please send help.";

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Read the message twice with a short pause, so the operator catches it.
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ voice: "Polly.Joanna" }, spoken);
  twiml.pause({ length: 1 });
  twiml.say({ voice: "Polly.Joanna" }, spoken);

  try {
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
