import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALERT_AFTER_MS = 48 * 60 * 60 * 1000;

// Scheduled job (see vercel.json) that alerts a traveller's emergency contact
// when their Dead Man's Switch is armed but no heartbeat has arrived in 48h —
// covering the case where the app is closed rather than just backgrounded.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - ALERT_AFTER_MS).toISOString();
  const { data: overdue, error } = await supabaseAdmin
    .from("dead_switch_status")
    .select("user_id, contact_name, contact_phone")
    .eq("armed", true)
    .is("alerted_at", null)
    .lt("last_heartbeat", cutoff);

  if (error) {
    return Response.json({ ok: false }, { status: 500 });
  }
  if (!overdue?.length) {
    return Response.json({ ok: true, alerted: 0 });
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID) {
    return Response.json({ ok: false }, { status: 503 });
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  let alerted = 0;
  for (const row of overdue) {
    if (!row.contact_phone) continue;
    const greeting = row.contact_name ? `Hi ${row.contact_name}, ` : "";
    try {
      await client.messages.create({
        to: row.contact_phone,
        from: TWILIO_CALLER_ID,
        body: `${greeting}your contact's PineQuest Dead Man's Switch hasn't checked in for 48 hours. Please check on them.`,
      });
      await supabaseAdmin
        .from("dead_switch_status")
        .update({ alerted_at: new Date().toISOString() })
        .eq("user_id", row.user_id);
      alerted++;
    } catch {
      // Leave alerted_at unset so the next run retries this user.
    }
  }

  return Response.json({ ok: true, alerted });
}
