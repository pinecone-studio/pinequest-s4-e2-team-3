import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Embeddings now live in the places.embedding (pgvector) column — searched
// in-database via the match_places RPC — instead of a JSON file + JS cosine.
// pgvector accepts the bracketed text form, e.g. "[0.1,0.2,…]".
function toVectorLiteral(vector: number[]): string {
  return JSON.stringify(vector);
}

export async function saveEmbedding(placeId: string, vector: number[]) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("places")
    .update({ embedding: toVectorLiteral(vector) })
    .eq("id", placeId);
}

export async function removeEmbedding(placeId: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("places").update({ embedding: null }).eq("id", placeId);
}
