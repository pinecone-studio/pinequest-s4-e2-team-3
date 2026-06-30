import { getOperatorMessages } from "@/lib/sosIncidents";

// The traveller's call screen polls this for the operator's replies (transcribed
// Mongolian + English translation). Read via service role, so no anon RLS needed.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ messages: [] });
  const messages = await getOperatorMessages(id);
  return Response.json({ messages });
}
