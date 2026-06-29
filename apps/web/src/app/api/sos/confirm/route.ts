import { confirmSafe } from "@/lib/sosIncidents";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const { error } = await confirmSafe(id);
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ ok: true });
}
