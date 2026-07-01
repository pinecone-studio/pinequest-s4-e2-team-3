import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface HeartbeatBody {
  armed?: boolean;
  contactName?: string;
  contactPhone?: string;
}

// Called by the mobile app whenever it's foregrounded while the Dead Man's
// Switch is armed (or on disarm), so the /api/cron/dead-switch-check job can
// tell how long it's been since the traveller was last online.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  if (!token || !supabaseAdmin) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !data.user) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { armed, contactName, contactPhone } = (await req.json()) as HeartbeatBody;

  const { error } = await supabaseAdmin.from("dead_switch_status").upsert({
    user_id: data.user.id,
    armed: armed === true,
    contact_name: contactName ?? null,
    contact_phone: contactPhone ?? null,
    last_heartbeat: new Date().toISOString(),
    // A fresh heartbeat means the traveller is fine again — clear any
    // previous alert so a future 48h gap can re-trigger one.
    alerted_at: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
