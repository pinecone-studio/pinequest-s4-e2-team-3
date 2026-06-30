import { NextResponse } from "next/server";

// Lightweight reachability probe — the online-status hook sends a HEAD request
// here every 30 s so it can detect "network interface up but no real internet"
// (the case navigator.onLine misses).
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  return new NextResponse(null, { status: 200 });
}
