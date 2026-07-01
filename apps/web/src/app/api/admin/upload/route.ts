import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Only real images — this bucket is public, so anything else (svg/html) would
// be a stored-XSS vector for whoever later views the "place image".
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return Response.json({ error: "Storage not configured" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "file required" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large (max 8MB)." }, { status: 400 });
  }

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
