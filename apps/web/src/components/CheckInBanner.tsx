"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function CheckInBanner() {
  const [show, setShow] = useState(false);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    const id = localStorage.getItem("sos_incident_id");
    if (!id) return;
    setIncidentId(id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const channel = supabase
      .channel(`checkin_${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_incidents",
        filter: `id=eq.${id}`,
      }, (payload) => {
        const row = payload.new as { check_in_requested?: boolean; status?: string };
        if (row.check_in_requested) setShow(true);
        if (row.status === "resolved") {
          setShow(false);
          localStorage.removeItem("sos_incident_id");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!show || !incidentId) return null;

  async function confirmSafe() {
    setConfirming(true);
    await fetch("/api/sos/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: incidentId }),
    }).catch(() => {});
    setShow(false);
    localStorage.removeItem("sos_incident_id");
    setConfirming(false);
  }

  async function stillNeedHelp() {
    setShow(false);
    await fetch("/api/sos/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: incidentId, action: "decline" }),
    }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <span className="text-3xl">👋</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Are you okay?</h2>
        <p className="mt-2 text-sm text-gray-500">The support team is checking on you</p>
        <button
          onClick={confirmSafe}
          disabled={confirming}
          className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-base font-bold text-white disabled:opacity-50"
        >
          {confirming ? "…" : "Yes, I'm safe ✓"}
        </button>
        <button
          onClick={stillNeedHelp}
          className="mt-3 w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"
        >
          No, I still need help
        </button>
      </div>
    </div>
  );
}
