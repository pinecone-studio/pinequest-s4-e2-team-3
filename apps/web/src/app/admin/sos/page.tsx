"use client";

import { useEffect, useState, useCallback } from "react";
import type { SosIncident } from "@/lib/sosIncidents";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const TYPE_COLOR: Record<string, { bg: string; dot: string; label: string }> = {
  "sos-1": { bg: "bg-amber-100 text-amber-800",  dot: "bg-amber-400",  label: "Fell / Injured" },
  "sos-2": { bg: "bg-blue-100 text-blue-800",    dot: "bg-blue-400",   label: "Got Lost" },
  "sos-3": { bg: "bg-green-100 text-green-800",  dot: "bg-green-400",  label: "Medical" },
  "sos-4": { bg: "bg-purple-100 text-purple-800",dot: "bg-purple-400", label: "Unsafe" },
};

const MOCK_INCIDENTS: SosIncident[] = [
  {
    id: "mock-1",
    type: "sos-3",
    title: "Medical",
    service: "Ambulance",
    service_number: "103",
    lat: 47.9186,
    lng: 106.9177,
    place_name: "Sükhbaatar Square, Ulaanbaatar",
    coords: "47.9186° N · 106.9177° E",
    language: "en-US",
    battery_level: 18,
    is_online: true,
    status: "active",
    created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    resolved_at: null,
  },
  {
    id: "mock-2",
    type: "sos-4",
    title: "Feel unsafe",
    service: "Police",
    service_number: "102",
    lat: 47.9221,
    lng: 106.9155,
    place_name: "State Department Store, Ulaanbaatar",
    coords: "47.9221° N · 106.9155° E",
    language: "ko-KR",
    battery_level: 64,
    is_online: true,
    status: "active",
    created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    resolved_at: null,
  },
  {
    id: "mock-3",
    type: "sos-2",
    title: "Got lost",
    service: "Help line",
    service_number: "108",
    lat: 47.9108,
    lng: 106.8860,
    place_name: "Gandan Monastery, Ulaanbaatar",
    coords: "47.9108° N · 106.8860° E",
    language: "zh-CN",
    battery_level: 91,
    is_online: true,
    status: "resolved",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

const NEARBY_LINKS = [
  { label: "Hospital",  query: "hospital",         icon: "🏥" },
  { label: "Police",    query: "police+station",    icon: "🚓" },
  { label: "Embassy",   query: "embassy",           icon: "🏛" },
  { label: "Hotel",     query: "hotel",             icon: "🏨" },
];

function elapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function BatteryIcon({ level }: { level: number }) {
  const color = level <= 20 ? "text-red-500" : level <= 50 ? "text-amber-500" : "text-green-600";
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
      <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
        <rect x="0.5" y="0.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="16" y="3" width="2" height="5" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="1.5" y="1.5" width={`${(level / 100) * 13}`} height="8" rx="1.2" fill="currentColor"/>
      </svg>
      {level}%
    </span>
  );
}

function StaticMap({ lat, lng }: { lat: number; lng: number }) {
  if (!MAPS_KEY) return null;
  const src = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x200&scale=2&markers=color:red%7C${lat},${lng}&key=${MAPS_KEY}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Tourist location"
      className="w-full rounded-xl object-cover"
      style={{ height: 160 }}
    />
  );
}

function IncidentCard({
  inc,
  resolving,
  onResolve,
}: {
  inc: SosIncident;
  resolving: string | null;
  onResolve: (id: string) => void;
}) {
  const [open, setOpen] = useState(inc.status === "active");
  const tone = TYPE_COLOR[inc.type] ?? { bg: "bg-gray-100 text-gray-800", dot: "bg-gray-400", label: inc.title };
  const isActive = inc.status === "active";

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${isActive ? "border-red-200 shadow-md" : "border-gray-100"}`}>
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${isActive ? "bg-red-50" : "bg-gray-50"}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isActive && <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${tone.bg}`}>{tone.label}</span>
              <span className="text-sm font-semibold text-gray-700">{inc.service} · {inc.service_number}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5" suppressHydrationWarning>{elapsed(inc.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {!isActive && (
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-lg px-2.5 py-1">Resolved</span>
          )}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {open && <div className="px-5 py-4 space-y-4">
        {/* Resolve button inside expanded area */}
        {isActive && (
          <button
            onClick={() => onResolve(inc.id)}
            disabled={resolving === inc.id}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            {resolving === inc.id ? "…" : "Mark as Resolved"}
          </button>
        )}
        {/* Device info row */}
        <div className="flex flex-wrap items-center gap-3">
          {inc.language && (
            <span className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              {inc.language}
            </span>
          )}
          {inc.battery_level != null && <BatteryIcon level={inc.battery_level} />}
          {inc.is_online != null && (
            <span className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${inc.is_online ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${inc.is_online ? "bg-green-500" : "bg-red-400"}`} />
              {inc.is_online ? "Online" : "Offline"}
            </span>
          )}
        </div>

        {/* Location */}
        {(inc.place_name || inc.coords) && (
          <div className="flex items-start gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 text-gray-400">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <div>
              {inc.place_name && <p className="text-sm font-semibold text-gray-800">{inc.place_name}</p>}
              {inc.coords && <p className="text-xs text-gray-400 mt-0.5">{inc.coords}</p>}
              {inc.lat && inc.lng && (
                <a
                  href={`https://www.google.com/maps?q=${inc.lat},${inc.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 font-semibold mt-1 inline-flex items-center gap-1 hover:underline"
                >
                  Open in Google Maps
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Map */}
        {inc.lat && inc.lng && <StaticMap lat={inc.lat} lng={inc.lng} />}

        {/* Nearby quick links */}
        {inc.lat && inc.lng && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Nearby</p>
            <div className="grid grid-cols-4 gap-2">
              {NEARBY_LINKS.map(({ label, query, icon }) => (
                <a
                  key={label}
                  href={`https://www.google.com/maps/search/${query}/@${inc.lat},${inc.lng},15z`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 py-3 text-center hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs font-semibold text-gray-600">{label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {!isActive && inc.resolved_at && (
          <p className="text-xs text-gray-400" suppressHydrationWarning>Resolved {elapsed(inc.resolved_at)}</p>
        )}
      </div>}
    </div>
  );
}

export default function SosAdminPage() {
  const [incidents, setIncidents] = useState<SosIncident[]>(MOCK_INCIDENTS);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sos");
    const data = await res.json();
    setIncidents(data.incidents ?? []);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    // load();
    // const id = setInterval(load, 15000);
    // return () => clearInterval(id);
  }, [load]);

  async function resolve(id: string) {
    setResolving(id);
    if (id.startsWith("mock-")) {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === id
            ? { ...inc, status: "resolved", resolved_at: new Date().toISOString() }
            : inc
        )
      );
      setResolving(null);
      return;
    }
    await fetch("/api/admin/sos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setResolving(null);
  }

  const active = incidents.filter((i) => i.status === "active");
  const resolved = incidents.filter((i) => i.status === "resolved");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
            <span className="text-gray-200">|</span>
            <h1 className="text-lg font-bold text-gray-900">SOS Monitor</h1>
          </div>
          <div className="flex items-center gap-3">
            {active.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {active.length} active
              </span>
            )}
            <span className="text-xs text-gray-400">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button onClick={load} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <p className="text-center text-gray-400 py-20 text-sm">Loading…</p>
        ) : incidents.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-semibold text-gray-500">No incidents yet</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Active · {active.length}</p>
                <div className="space-y-4">
                  {active.map((inc) => (
                    <IncidentCard key={inc.id} inc={inc} resolving={resolving} onResolve={resolve} />
                  ))}
                </div>
              </section>
            )}
            {resolved.length > 0 && (
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Resolved · {resolved.length}</p>
                <div className="space-y-4">
                  {resolved.map((inc) => (
                    <IncidentCard key={inc.id} inc={inc} resolving={resolving} onResolve={resolve} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
