import { listAllPlaces, upsertPlace, deletePlace, findSimilarPlace } from "@/lib/customPlaces";
import { embed } from "@/lib/embed";
import { saveEmbedding, removeEmbedding } from "@/lib/embeddingStore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const { places, total, error } = await listAllPlaces(page);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ places, total });
}

export async function POST(req: Request) {
  const body = await req.json();

  // Duplicate check for new places (not edits)
  if (!body.id && !body.force) {
    const similar = await findSimilarPlace(body.name, body.latitude, body.longitude);
    if (similar) return Response.json({ duplicate: similar });
  }

  const { id, error } = await upsertPlace(body);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Generate and store embedding asynchronously (don't block the response)
  if (id) {
    const text = [body.name, body.nameEn, body.nameMn, body.description, body.category]
      .filter(Boolean)
      .join(" ");
    embed(text).then((vector) => {
      if (vector) saveEmbedding(id, vector).catch(() => {});
    });
  }

  return Response.json({ id });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { error } = await deletePlace(id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Remove embedding from store
  removeEmbedding(id).catch(() => {});

  return Response.json({ ok: true });
}
