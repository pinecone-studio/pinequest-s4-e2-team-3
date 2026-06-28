import twilio from "twilio";

// Mints a short-lived Twilio Voice access token so the browser SOS screen can
// place a real call. Returns 503 (not an error the UI treats as fatal) when
// Twilio isn't configured, so the SOS sheet can fall back gracefully.
export async function GET() {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    TWILIO_TWIML_APP_SID,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
    return Response.json({ error: "twilio_not_configured" }, { status: 503 });
  }

  const AccessToken = twilio.jwt.AccessToken;
  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
    identity: "sos-traveller",
    ttl: 600,
  });
  token.addGrant(
    new AccessToken.VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: false,
    }),
  );

  return Response.json({ token: token.toJwt() });
}
