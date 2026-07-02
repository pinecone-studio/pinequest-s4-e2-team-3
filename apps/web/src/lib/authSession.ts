import { createClient } from "@/lib/supabase";

// Sign out AND clear the per-user data cached in this browser (saved plans, the
// itinerary chat snapshots, and the live-guide progress). The DB is already scoped
// per user; this stops the local cache from leaking one account's plans into the
// next account that signs in on the SAME browser (e.g. judges sharing a laptop).
export async function signOutAndClear(): Promise<void> {
  await createClient().auth.signOut();
  try {
    localStorage.removeItem("polaris:saved-plans");
    localStorage.removeItem("lumo:live"); // live-guide route + progress (liveStore)
    localStorage.removeItem("lumo:chat"); // current itinerary chat
    // Per-plan chat snapshots: lumo:chat:<planId>.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("lumo:chat:")) localStorage.removeItem(k);
    }
  } catch {
    /* ignore storage errors (private mode, quota, etc.) */
  }
}
