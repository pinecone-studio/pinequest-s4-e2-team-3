import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export interface SosIncident {
  id: string;
  type: string;
  title: string;
  service: string;
  service_number: string;
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  coords: string | null;
  language: string | null;
  battery_level: number | null;
  is_online: boolean | null;
  status: "active" | "resolved";
  check_in_requested: boolean | null;
  check_in_declined: boolean | null;
  created_at: string;
  resolved_at: string | null;
}

export interface LogIncidentPayload {
  type: string;
  title: string;
  service: string;
  service_number: string;
  lat?: number | null;
  lng?: number | null;
  place_name?: string | null;
  coords?: string | null;
  language?: string | null;
  battery_level?: number | null;
  is_online?: boolean | null;
}

// Client-side: log the incident through the server so it's written with the
// service-role key (bypasses RLS — no anon insert policy needed) and can be
// validated/rate-limited server-side. Best-effort; never throws.
export async function logSosIncident(payload: LogIncidentPayload): Promise<string | null> {
  try {
    const res = await fetch("/api/sos/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// Server-side: insert the incident with the service-role client (bypasses RLS).
export async function createIncident(payload: LogIncidentPayload): Promise<string | null> {
  const { data, error } = await adminDb()
    .from("sos_incidents")
    .insert({ ...payload, status: "active" })
    .select("id")
    .single();
  if (error) { console.warn("[sos] insert failed:", error.message); return null; }
  return data?.id ?? null;
}

export interface OperatorMessage {
  mn: string;
  en: string;
  at: string;
}

// Append a transcribed + translated operator reply to an incident.
export async function appendOperatorMessage(id: string, mn: string, en: string): Promise<void> {
  const { data } = await adminDb().from("sos_incidents").select("operator_msgs").eq("id", id).single();
  const msgs: OperatorMessage[] = Array.isArray(data?.operator_msgs) ? data.operator_msgs : [];
  msgs.push({ mn, en, at: new Date().toISOString() });
  await adminDb().from("sos_incidents").update({ operator_msgs: msgs }).eq("id", id);
}

// The operator replies so far, for the traveller's screen to poll.
export async function getOperatorMessages(id: string): Promise<OperatorMessage[]> {
  const { data } = await adminDb().from("sos_incidents").select("operator_msgs").eq("id", id).single();
  return Array.isArray(data?.operator_msgs) ? data.operator_msgs : [];
}

export async function listSosIncidents(): Promise<{ incidents: SosIncident[]; error: string | null }> {
  const { data, error } = await adminDb()
    .from("sos_incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { incidents: [], error: error.message };
  return { incidents: (data ?? []) as SosIncident[], error: null };
}

export async function resolveIncident(id: string): Promise<{ error: string | null }> {
  const { error } = await adminDb()
    .from("sos_incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), check_in_requested: false })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function requestCheckIn(id: string): Promise<{ error: string | null }> {
  const { error } = await adminDb()
    .from("sos_incidents")
    .update({ check_in_requested: true })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function confirmSafe(id: string): Promise<{ error: string | null }> {
  const { error } = await adminDb()
    .from("sos_incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), check_in_requested: false })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function declineCheckIn(id: string): Promise<{ error: string | null }> {
  const { error } = await adminDb()
    .from("sos_incidents")
    .update({ check_in_requested: false, check_in_declined: true })
    .eq("id", id);
  return { error: error?.message ?? null };
}
