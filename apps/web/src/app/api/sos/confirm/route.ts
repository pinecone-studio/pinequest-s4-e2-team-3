import { confirmSafe, declineCheckIn } from "@/lib/sosIncidents";

export async function POST(req: Request) {
  const { id, action } = await req.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  if (action === "decline") {
    const { error } = await declineCheckIn(id);
    if (error) return Response.json({ error }, { status: 500 });
    return Response.json({ ok: true });
  }

  const { error } = await confirmSafe(id);
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ ok: true });
}
