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
if (!url || !key) {
  console.error("Missing SUPABASE url/service-role key in apps/web/.env");
  process.exit(1);
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
