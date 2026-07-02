import { confirmSafe, declineCheckIn } from "@/lib/sosIncidents";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

// No login required (the traveller who owns this incident id may not be
// signed in), so brute-forcing an incident id is bounded by rate limiting
// instead — the id itself is a random UUID, so a few requests per minute
// per IP makes guessing one infeasible.
export async function POST(req: Request) {
  if (!rateLimit(`sos-confirm:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();

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
