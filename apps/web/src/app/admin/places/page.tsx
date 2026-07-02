"use client";

import { useEffect, useState, memo, useCallback } from "react";
import Image from "next/image";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const UB = { lat: 47.9077, lng: 106.8832 };

interface MapPickerProps {
  lat: string;
  lng: string;
  userLocation: { lat: number; lng: number } | null;
  onPick: (lat: string, lng: string) => void;
}

const MapPicker = memo(function MapPicker({ lat, lng, userLocation, onPick }: MapPickerProps) {
  const pin = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
  const center = pin ?? userLocation ?? UB;
  return (
    <APIProvider apiKey={MAPS_KEY}>
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={center}
        defaultZoom={15}
        mapTypeId="hybrid"
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
        onClick={(e) => {
          if (!e.detail.latLng) return;
          onPick(e.detail.latLng.lat.toFixed(6), e.detail.latLng.lng.toFixed(6));
        }}
      >
        {/* Current user location dot */}
        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              background: "#4F46E5", border: "2.5px solid white",
              boxShadow: "0 0 0 4px rgba(79,70,229,0.25)",
            }} />
          </AdvancedMarker>
        )}
        {/* Selected pin */}
        {pin && <AdvancedMarker position={pin} />}
      </Map>
    </APIProvider>
  );
});

interface Place {
  id: string;
  name: string;
  nameEn: string | null;
  nameMn: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  imageUrl: string | null;
  rating: number | null;
}

const CATEGORIES = ["Food", "Coffee", "Culture", "Nightlife", "History", "Nature", "Shopping", "Viewpoints", "Hotels"];

interface FormState {
  id: string; name: string; nameEn: string; nameMn: string; category: string;
  latitude: string; longitude: string; description: string; imageUrl: string; rating: string;
}

const EMPTY: FormState = {
  id: "", name: "", nameEn: "", nameMn: "", category: "Food",
  latitude: "", longitude: "", description: "", imageUrl: "", rating: "4.2",
};

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<Place | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  async function load(p = page) {
    setLoading(true);
    const res = await fetch(`/api/admin/places?page=${p}`);
    const data = await res.json();
    setPlaces(data.places ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page]); // eslint-disable-line

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim() || !form.latitude || !form.longitude) {
      setMsg({ text: "Нэр, өргөрөг, уртраг шаардлагатай.", ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    const body = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(),
      nameEn: form.nameEn?.trim() || undefined,
      nameMn: form.nameMn?.trim() || undefined,
      category: form.category ?? "Food",
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      description: form.description?.trim() || undefined,
      imageUrl: form.imageUrl?.trim() || undefined,
      rating: parseFloat(form.rating) || 4.2,
    };
    const res = await fetch("/api/admin/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.duplicate) {
      setDuplicate(data.duplicate);
      setSaving(false);
      return;
    }
    if (data.error) {
      setMsg({ text: `Алдаа: ${data.error}`, ok: false });
    } else {
      setMsg({ text: form.id ? "Амжилттай засагдлаа ✓" : "Амжилттай нэмэгдлээ ✓", ok: true });
      setForm({ ...EMPTY });
      setDuplicate(null);
      load(0); setPage(0);
    }
    setSaving(false);
  }

  async function del(id: string, name: string) {
    if (!confirm(`"${name}" устгах уу?`)) return;
    await fetch(`/api/admin/places?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  function edit(p: Place) {
    setForm({
      id: p.id, name: p.name, nameEn: p.nameEn ?? "",
      nameMn: p.nameMn ?? "", category: p.category ?? "Food",
      latitude: String(p.latitude), longitude: String(p.longitude),
      description: p.description ?? "", imageUrl: p.imageUrl ?? "",
      rating: String(p.rating ?? 4.2),
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handlePick = useCallback((lat: string, lng: string) => {
    set("latitude", lat);
    set("longitude", lng);
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) set("imageUrl", data.url);
    else setMsg({ text: `Зураг upload алдаа: ${data.error}`, ok: false });
    setUploading(false);
  }

  const filtered = search
    ? places.filter((p) => [p.name, p.nameEn, p.nameMn].some((n) => n?.toLowerCase().includes(search.toLowerCase())))
    : places;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="sticky top-0 z-10 bg-gray-900 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Admin
            </a>
            <span className="text-gray-700">|</span>
            <h1 className="text-base font-bold text-white">Газрын удирдлага</h1>
          </div>
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300">
            {total} газар
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6">

      {/* ── Form ── */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">
          {form.id ? "✏️ Газар засах" : "＋ Шинэ газар нэмэх"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Нэр (монгол / жинхэнэ) *" value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="col-span-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />

          <input placeholder="Name in English" value={form.nameEn ?? ""}
            onChange={(e) => set("nameEn", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />

          <input placeholder="Монгол нэр (кирилл)" value={form.nameMn ?? ""}
            onChange={(e) => set("nameMn", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />

          <select value={form.category ?? "Food"} onChange={(e) => set("category", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <input placeholder="Үнэлгээ 0–5" value={form.rating} type="number" min="0" max="5" step="0.1"
            onChange={(e) => set("rating", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />

          <input placeholder="Өргөрөг (latitude)  47.91…" value={form.latitude}
            onChange={(e) => set("latitude", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />

          <input placeholder="Уртраг (longitude)  106.9…" value={form.longitude}
            onChange={(e) => set("longitude", e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />

          {/* Map picker */}
          <div className="col-span-full overflow-hidden rounded-xl border border-gray-200" style={{ height: 220 }}>
            <MapPicker lat={form.latitude} lng={form.longitude} userLocation={userLocation} onPick={handlePick} />
          </div>
          <p className="col-span-full -mt-1 text-xs text-gray-400">↑ Map дээр дарж координат бөглөнө</p>

          <div className="col-span-full">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:bg-gray-100">
              {uploading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              }
              <span>{uploading ? "Зураг upload хийж байна…" : "Зураг сонгох (upload)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            {form.imageUrl && (
              <div className="mt-2 flex items-center gap-3">
                <Image
                  src={form.imageUrl}
                  alt="preview"
                  width={96}
                  height={64}
                  className="h-16 w-24 rounded-lg object-cover border border-gray-200"
                />
                <button onClick={() => set("imageUrl", "")} className="text-xs text-red-400 hover:text-red-600">Устгах</button>
              </div>
            )}
          </div>

          <textarea placeholder="Тайлбар (optional)" value={form.description ?? ""} rows={2}
            onChange={(e) => set("description", e.target.value)}
            className="col-span-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
        </div>

        {msg && (
          <p className={`mt-3 text-sm font-medium ${msg.ok ? "text-green-600" : "text-red-500"}`}>
            {msg.text}
          </p>
        )}

        {duplicate && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-amber-800">⚠️ Ижил төстэй газар олдлоо</p>
            <p className="text-xs text-amber-700">
              <span className="font-semibold">{duplicate.nameEn ?? duplicate.name}</span>
              {duplicate.category ? ` · ${duplicate.category}` : ""}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { edit(duplicate); setDuplicate(null); }}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                Байгааг нь засах
              </button>
              <button
                onClick={async () => {
                  setDuplicate(null);
                  setSaving(true);
                  const body = {
                    ...(form.id ? { id: form.id } : {}),
                    force: true,
                    name: form.name.trim(),
                    nameEn: form.nameEn?.trim() || undefined,
                    nameMn: form.nameMn?.trim() || undefined,
                    category: form.category ?? "Food",
                    latitude: parseFloat(form.latitude),
                    longitude: parseFloat(form.longitude),
                    description: form.description?.trim() || undefined,
                    imageUrl: form.imageUrl?.trim() || undefined,
                    rating: parseFloat(form.rating) || 4.2,
                  };
                  const res = await fetch("/api/admin/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                  const data = await res.json();
                  if (data.error) { setMsg({ text: `Алдаа: ${data.error}`, ok: false }); }
                  else { setMsg({ text: "Шинээр нэмэгдлээ ✓", ok: true }); setForm({ ...EMPTY }); load(0); setPage(0); }
                  setSaving(false);
                }}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                Шинэ болгон нэм
              </button>
              <button onClick={() => setDuplicate(null)} className="ml-auto text-xs text-amber-500 hover:underline">
                Хаах
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={save} disabled={saving}
            className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-gray-700">
            {saving ? "Хадгалж байна…" : form.id ? "Хадгалах" : "Нэмэх"}
          </button>
          {form.id && (
            <button onClick={() => { setForm({ ...EMPTY }); setMsg(null); setDuplicate(null); }}
              className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Болих
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="mb-3 flex items-center gap-3">
        <input placeholder="Хайх…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Газар олдсонгүй.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id}
              className="flex items-start justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{p.nameEn ?? p.name}</p>
                {p.nameMn && p.nameMn !== p.name && (
                  <p className="text-xs text-gray-400">{p.nameMn}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                  {p.category && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                      {p.category}
                    </span>
                  )}
                  <span>{p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}</span>
                  {p.rating && <span>★ {p.rating}</span>}
                </div>
              </div>
              <div className="ml-3 flex shrink-0 gap-1.5">
                <button onClick={() => edit(p)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50">
                  Засах
                </button>
                <button onClick={() => del(p.id, p.nameEn ?? p.name)}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
                  Устгах
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {total > 50 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50">
            ← Өмнөх
          </button>
          <span className="text-sm text-gray-400">Хуудас {page + 1} / {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * 50 >= total}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50">
            Дараах →
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
