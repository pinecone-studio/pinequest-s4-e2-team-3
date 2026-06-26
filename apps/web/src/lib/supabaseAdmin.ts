import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Server-only Supabase client that bypasses Row Level Security. We use the
// service-role key because auth is handled by Clerk (not Supabase Auth), so we
// store the Clerk user id ourselves. Null when unconfigured, so callers no-op.
export const supabaseAdmin =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;
