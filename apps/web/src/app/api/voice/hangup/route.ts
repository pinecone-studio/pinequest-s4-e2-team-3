import twilio from "twilio";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

// Ends an in-progress server-initiated call (best-effort) when the traveller taps
// "End call". Safe to call even if the call already finished.
export async function POST(req: Request) {
  if (!rateLimit(`voice-hangup:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const { sid } = (await req.json()) as { sid?: string };
  if (!sid) return Response.json({ ok: false }, { status: 400 });

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.calls(sid).update({ status: "completed" });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}
