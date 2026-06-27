const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";

export async function embed(text: string): Promise<number[] | null> {
  if (!OPENAI_KEY || !text.trim()) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.trim() }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.data?.[0]?.embedding as number[]) ?? null;
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
