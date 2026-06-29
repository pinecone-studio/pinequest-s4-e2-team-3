import { listSosIncidents, resolveIncident, requestCheckIn } from "@/lib/sosIncidents";

export async function GET() {
  const { incidents, error } = await listSosIncidents();
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ incidents });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, action } = body;
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  if (action === "check_in") {
    const { error } = await requestCheckIn(id);
    if (error) return Response.json({ error }, { status: 500 });
    return Response.json({ ok: true });
  }

  const { error } = await resolveIncident(id);
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ ok: true });
}
