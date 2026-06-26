// Tiny in-memory TTL cache for server-side route handlers (Next.js API routes).
// Lives for the lifetime of the server process / warm instance — enough to
// collapse the repeated Google Places lookups the Explore screens fire on every
// load, which is the app's biggest per-request cost.
//
// It caches the in-flight PROMISE, so simultaneous identical calls share one
// network request, and it drops the entry if the promise rejects so transient
// failures (or empty error results) are never cached.

interface Entry {
  promise: Promise<unknown>;
  expires: number;
}

const store = new Map<string, Entry>();

export function cached<T>(
  key: string,
  ttlMs: number,
  produce: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.promise as Promise<T>;

  const promise = produce();
  store.set(key, { promise, expires: now + ttlMs });

  // Never cache a failure — drop the entry so the next call retries.
  promise.catch(() => {
    const current = store.get(key);
    if (current && current.promise === promise) store.delete(key);
  });

  return promise;
}
