import { createServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Full trip plans live in the DB (per user), so a traveller's itinerary +
// progress survives a new device / cleared browser — not just localStorage.
// trip_plans columns: id, user_id, title, summary, stops, places, done_stops, created_at.

interface SaveTripRequest {
  title?: string;
  summary?: string;
  stops?: unknown[];
  places?: unknown[];
}

// Resolve the signed-in user id from the request cookies, or null.
async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Shape DB rows into the SavedPlan shape the Journey UI uses.
function toPlan(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    stops: r.stops ?? [],
    places: r.places ?? [],
    doneStops: r.done_stops ?? [],
    savedAt: r.created_at,
  };
}

// GET — the signed-in user's saved plans (newest first). Empty list when signed
// out so Journey just falls back to its local cache.
export async function GET() {
  const userId = await currentUserId();
  if (!userId || !supabaseAdmin) return Response.json([]);

  const { data, error } = await supabaseAdmin
    .from("trip_plans")
    .select("id, title, summary, stops, places, done_stops, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("list trip plans error", error.message);
    return Response.json([], { status: 500 });
  }
  return Response.json((data ?? []).map(toPlan));
}

// POST — save a full plan (title, summary, stops, places).
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ saved: false, error: "Not signed in" }, { status: 401 });
  if (!supabaseAdmin) {
    return Response.json({ saved: false, error: "Storage is not configured" }, { status: 500 });
  }

  const { title, summary, stops, places } = (await req.json()) as SaveTripRequest;
  if (!title?.trim() || !summary?.trim()) {
    return Response.json({ saved: false, error: "Missing plan title or summary" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("trip_plans")
    .insert({
      user_id: userId,
      title: title.trim(),
      summary: summary.trim(),
      stops: stops ?? [],
      places: places ?? [],
      done_stops: [],
    })
    .select("id")
    .single();
  if (error) {
    console.error("save trip plan error", error.message);
    return Response.json({ saved: false, error: error.message }, { status: 500 });
  }
  return Response.json({ saved: true, id: data.id });
}

// PATCH — update a plan's completion (done_stops) for the owner.
export async function PATCH(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  if (!supabaseAdmin) return Response.json({ ok: false }, { status: 500 });

  const { id, doneStops } = (await req.json()) as { id?: string; doneStops?: string[] };
  if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("trip_plans")
    .update({ done_stops: doneStops ?? [] })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE — remove a plan the user owns (?id=...).
export async function DELETE(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  if (!supabaseAdmin) return Response.json({ ok: false }, { status: 500 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("trip_plans")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
