import { listSosIncidents, resolveIncident } from "@/lib/sosIncidents";

export async function GET() {
  const { incidents, error } = await listSosIncidents();
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ incidents });
}

export async function PATCH(req: Request) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const { error } = await resolveIncident(id);
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ ok: true });
}
