import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return Response.json({ error: "Storage not configured" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "file required" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `places/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Create bucket if it doesn't exist yet
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "place-images")) {
    await supabaseAdmin.storage.createBucket("place-images", { public: true });
  }

  const { error } = await supabaseAdmin.storage
    .from("place-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from("place-images").getPublicUrl(path);
  return Response.json({ url: data.publicUrl });
}
