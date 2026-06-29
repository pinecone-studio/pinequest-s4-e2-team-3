import { createServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Per-user AI guide chat history, so the conversation survives a new device.
// chat_messages columns: id, user_id, message (jsonb), created_at.

async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// GET — the signed-in user's messages, oldest first. Empty when signed out so
// the client just keeps its local conversation.
export async function GET() {
  const userId = await currentUserId();
  if (!userId || !supabaseAdmin) return Response.json([]);

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("message")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("list chat history error", error.message);
    return Response.json([], { status: 500 });
  }
  return Response.json((data ?? []).map((r) => r.message));
}

// POST — append one message ({ message }). Fire-and-forget from the client.
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  if (!supabaseAdmin) return Response.json({ ok: false }, { status: 500 });

  const { message } = (await req.json()) as { message?: unknown };
  if (!message) return Response.json({ ok: false, error: "Missing message" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("chat_messages")
    .insert({ user_id: userId, message });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE — clear the user's chat history.
export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  if (!supabaseAdmin) return Response.json({ ok: false }, { status: 500 });

  const { error } = await supabaseAdmin
    .from("chat_messages")
    .delete()
    .eq("user_id", userId);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
