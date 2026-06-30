import { NextResponse } from "next/server";

const SECRET = process.env.ADMIN_SECRET ?? "";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!SECRET || password !== SECRET) {
    return NextResponse.json({ error: "Нууц үг буруу байна" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
