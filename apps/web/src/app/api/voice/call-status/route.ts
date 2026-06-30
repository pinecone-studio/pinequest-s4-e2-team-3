import twilio from "twilio";

// Returns the live Twilio call status (queued/ringing/in-progress/completed…) so
// the UI can start its timer only once the operator actually answers.
export async function GET(req: Request) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  const sid = new URL(req.url).searchParams.get("sid");
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !sid) {
    return Response.json({ status: "unknown" });
  }
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const call = await client.calls(sid).fetch();
    return Response.json({ status: call.status });
  } catch {
    return Response.json({ status: "unknown" });
  }
}
