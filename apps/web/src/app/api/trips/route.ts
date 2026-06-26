import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface SaveTripRequest {
  title?: string;
  summary?: string;
}

// Saves a finished trip plan once the traveller taps "Yes, save" in the chat.
// Only the plan title + summary lands in the DB; the conversation itself stays
// on the device (localStorage), so this endpoint never sees the chat history.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ saved: false, error: "Not signed in" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return Response.json(
      { saved: false, error: "Storage is not configured" },
      { status: 500 },
    );
  }

  const { title, summary } = (await req.json()) as SaveTripRequest;
  if (!title?.trim() || !summary?.trim()) {
    return Response.json(
      { saved: false, error: "Missing plan title or summary" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("trip_plans").insert({
    user_id: userId,
    title: title.trim(),
    summary: summary.trim(),
  });
  if (error) {
    console.error("save trip plan error", error.message);
    return Response.json({ saved: false, error: error.message }, { status: 500 });
  }

  return Response.json({ saved: true });
}
