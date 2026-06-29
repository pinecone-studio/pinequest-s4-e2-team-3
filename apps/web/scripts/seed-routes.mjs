/**
 * Reseeds the Supabase `routes` table from src/lib/routes.ts (the source of
 * truth). Deletes all existing rows, then inserts the current demoRoutes.
 *
 * Usage (from apps/web):  node scripts/seed-routes.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in apps/web/.env
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, "..");

const env = fs.readFileSync(path.join(WEB, ".env"), "utf-8");
const envVal = (k) => (env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1] ?? "").trim();
const url = envVal("NEXT_PUBLIC_SUPABASE_URL");
const key = envVal("SUPABASE_SERVICE_ROLE_KEY");
const gkey = envVal("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
if (!url || !key) {
  console.error("Missing SUPABASE url/service-role key in apps/web/.env");
  process.exit(1);
}

// Resolve a real Google Places photo for a stop (same source as the Explore
// screens), so each stop shows its actual place instead of a random image.
async function photoFor(name, lat, lng) {
  if (!gkey) return undefined;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": gkey,
        "X-Goog-FieldMask": "places.photos",
      },
      body: JSON.stringify({
        textQuery: `${name}, Mongolia`,
        maxResultCount: 1,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } },
      }),
    });
    if (!res.ok) return undefined;
    const place = ((await res.json()).places ?? [])[0];
    const photo = place?.photos?.[0]?.name;
    return photo
      ? `https://places.googleapis.com/v1/${photo}/media?maxWidthPx=800&key=${gkey}`
      : undefined;
  } catch {
    return undefined;
  }
}

// Transpile routes.ts (type-only imports are elided) → temp .mjs → import data.
const src = fs.readFileSync(path.join(WEB, "src/lib/routes.ts"), "utf-8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: "ESNext", target: "ES2020" },
}).outputText;
const tmp = path.join(__dirname, "_routes.tmp.mjs");
fs.writeFileSync(tmp, js);
const { demoRoutes } = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Enrich each stop with a real place photo (skipped gracefully if no Google key).
let withPhoto = 0;
for (const r of demoRoutes) {
  for (const s of r.stops) {
    const img = await photoFor(s.name, s.latitude, s.longitude);
    if (img) {
      s.imageUrl = img;
      withPhoto++;
    }
  }
}
console.log(`Resolved ${withPhoto} stop photos${gkey ? "" : " (no Google key — skipped)"}`);

const del = await supabase.from("routes").delete().neq("id", "");
if (del.error) {
  console.error("delete failed:", del.error.message);
  process.exit(1);
}

const rows = demoRoutes.map((r, i) => ({
  id: r.id,
  title: r.title,
  region: r.region,
  summary: r.summary,
  stops: r.stops,
  sort_order: i,
}));
const up = await supabase.from("routes").upsert(rows);
if (up.error) {
  console.error("upsert failed:", up.error.message);
  process.exit(1);
}
console.log(`Reseeded ${rows.length} routes:`, rows.map((r) => r.id).join(", "));
