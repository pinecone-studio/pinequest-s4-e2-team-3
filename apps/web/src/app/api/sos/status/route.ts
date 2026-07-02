import { getIncidentStatus } from "@/lib/sosIncidents";

// The traveller's screen polls this for the operator's replies (transcribed
// Mongolian + English translation), the admin's "Are you okay?" check-in flag,
// and the incident status. Read via service role, so no anon RLS needed.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ messages: [], check_in_requested: false, status: null });
  return Response.json(await getIncidentStatus(id));
}
