import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function db() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

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

export async function logSosIncident(payload: LogIncidentPayload): Promise<string | null> {
  const { data, error } = await db()
    .from("sos_incidents")
    .insert({ ...payload, status: "active" })
    .select("id")
    .single();
  if (error) { console.error("[sos] log failed", error); return null; }
  return data?.id ?? null;
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
