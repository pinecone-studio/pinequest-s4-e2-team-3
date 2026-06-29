/**
 * Populates places.embedding (pgvector) for every place — same text + model as
 * the admin route (OpenAI text-embedding-3-small). Run ONCE after 0002 migration.
 *
 * Usage (from apps/web):  node scripts/migrate-embeddings.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + OPENAI_API_KEY.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.resolve(__dirname, "..", ".env"), "utf-8");
const v = (k) => (env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1] ?? "").trim();

const supabase = createClient(v("NEXT_PUBLIC_SUPABASE_URL"), v("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const OPENAI_KEY = v("OPENAI_API_KEY");
if (!OPENAI_KEY) {
  console.error("Missing OPENAI_API_KEY in apps/web/.env");
  process.exit(1);
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  return (await res.json()).data?.[0]?.embedding ?? null;
}

const { data: places, error } = await supabase
  .from("places")
  .select("id, name, nameEn, nameMn, description, category");
if (error) {
  console.error("fetch places failed:", error.message);
  process.exit(1);
}

let done = 0;
for (const p of places ?? []) {
  const text = [p.name, p.nameEn, p.nameMn, p.description, p.category].filter(Boolean).join(" ");
  if (!text.trim()) continue;
  const vector = await embed(text);
  if (!vector) continue;
  const up = await supabase.from("places").update({ embedding: JSON.stringify(vector) }).eq("id", p.id);
  if (up.error) console.error(`update ${p.id} failed:`, up.error.message);
  else done++;
}
console.log(`Embedded ${done}/${(places ?? []).length} places into places.embedding`);
