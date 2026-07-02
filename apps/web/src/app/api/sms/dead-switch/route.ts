import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface DeadSwitchPingBody {
  contactName?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
}

// Called by the mobile app on an interval while the Dead Man's Switch is
// armed, to text the traveller's live coordinates to their emergency contact.
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

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_CALLER_ID) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const { contactName, contactPhone, latitude, longitude } =
    (await req.json()) as DeadSwitchPingBody;
  if (!contactPhone || typeof latitude !== "number" || typeof longitude !== "number") {
    return Response.json({ ok: false }, { status: 400 });
  }

  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  const name = data.user.user_metadata?.fullName ?? "Your contact";
  const body = contactName
    ? `${name} has their Dead Man's Switch armed. Last known location: ${mapsUrl}`
    : `Dead Man's Switch location update: ${mapsUrl}`;

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({ to: contactPhone, from: TWILIO_CALLER_ID, body });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}
