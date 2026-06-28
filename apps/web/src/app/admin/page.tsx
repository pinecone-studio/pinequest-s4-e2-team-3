"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  totalPlaces: number;
  activeSos: number;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? "bg-red-500 text-white" : "bg-white border border-gray-100"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${accent ? "text-red-100" : "text-gray-400"}`}>{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${accent ? "text-white" : "text-gray-900"}`}>{value}</p>
      {sub && <p className={`mt-1 text-xs ${accent ? "text-red-100" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

const NAV = [
  {
    href: "/admin/places",
    label: "Places",
    description: "Нэмэх · засах · устгах",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    color: "text-blue-600 bg-blue-50",
  },
  {
    href: "/admin/sos",
    label: "SOS Monitor",
    description: "Бодит цагийн мониторинг",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
    color: "text-red-500 bg-red-50",
  },
];

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({ totalPlaces: 0, activeSos: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/places?page=0").then((r) => r.json()).catch(() => ({ total: 0 })),
      fetch("/api/admin/sos").then((r) => r.json()).catch(() => ({ incidents: [] })),
    ]).then(([places, sos]) => {
      setStats({
        totalPlaces: places.total ?? 0,
        activeSos: (sos.incidents ?? []).filter((i: { status: string }) => i.status === "active").length,
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Pinequest</p>
            <h1 className="text-xl font-bold text-white mt-0.5">Admin Dashboard</h1>
          </div>
          <div className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Places" value={stats.totalPlaces} sub="Supabase DB" />
          <StatCard
            label="Active SOS"
            value={stats.activeSos}
            sub={stats.activeSos > 0 ? "Requires attention" : "All clear"}
            accent={stats.activeSos > 0}
          />
        </div>

        {/* Nav */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Sections</p>
          <div className="space-y-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${n.color}`}>
                  {n.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{n.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.description}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-300 shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 pb-4">Pinequest Admin · {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
