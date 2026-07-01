// Minimal in-memory fixed-window rate limiter for API routes that call paid
// third-party services (OpenAI, Twilio, Chimege) or write without auth.
// Per-serverless-instance only — a real production deployment with many
// concurrent instances should back this with Upstash/Redis instead, but this
// still stops single-source scripted abuse at zero infra cost.

const buckets = new Map<string, { count: number; resetAt: number }>();

// Bound memory growth: opportunistically drop expired buckets.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

export function clientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(): Response {
  return Response.json({ error: "Too many requests" }, { status: 429 });
}
