import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "embeddings";
const FILE = "place-embeddings.json";

type EmbeddingMap = Record<string, number[]>;

// 5-minute in-memory cache — avoids re-fetching on every search request
let cache: { data: EmbeddingMap; at: number } | null = null;
const TTL_MS = 5 * 60_000;

async function ensureBucket() {
  if (!supabaseAdmin) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  }
}

export async function loadEmbeddings(): Promise<EmbeddingMap> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!supabaseAdmin) return {};

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(FILE);
  if (error || !data) return {};

  try {
    const parsed = JSON.parse(await data.text()) as EmbeddingMap;
    cache = { data: parsed, at: Date.now() };
    return parsed;
  } catch {
    return {};
  }
}

async function persist(map: EmbeddingMap) {
  if (!supabaseAdmin) return;
  await ensureBucket();
  const blob = new Blob([JSON.stringify(map)], { type: "application/json" });
  await supabaseAdmin.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  cache = { data: map, at: Date.now() };
}

export async function saveEmbedding(placeId: string, vector: number[]) {
  const map = await loadEmbeddings();
  map[placeId] = vector;
  await persist(map);
}

export async function removeEmbedding(placeId: string) {
  const map = await loadEmbeddings();
  if (!(placeId in map)) return;
  delete map[placeId];
  await persist(map);
}
