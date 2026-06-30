import { createIncident, type LogIncidentPayload } from "@/lib/sosIncidents";

// Logs an SOS incident with the service-role key (bypasses RLS), so the browser
// never needs an anon insert policy on sos_incidents.
export async function POST(req: Request) {
  const payload = (await req.json()) as LogIncidentPayload;
  if (!payload?.type || !payload?.service_number) {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const id = await createIncident(payload);
  if (!id) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ id });
}
