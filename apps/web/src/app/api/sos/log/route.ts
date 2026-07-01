import { createIncident, type LogIncidentPayload } from "@/lib/sosIncidents";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

// Logs an SOS incident with the service-role key (bypasses RLS), so the browser
// never needs an anon insert policy on sos_incidents. No login is required (a
// traveller in danger may not be signed in), so abuse is bounded with a
// per-IP rate limit instead of auth.
export async function POST(req: Request) {
  if (!rateLimit(`sos-log:${clientIp(req)}`, 5, 60_000)) return rateLimitResponse();

  const payload = (await req.json()) as LogIncidentPayload;
  if (!payload?.type || !payload?.service_number) {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const id = await createIncident(payload);
  if (!id) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ id });
}
