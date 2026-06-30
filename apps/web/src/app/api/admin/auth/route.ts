import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type CookieItem = { name: string; value: string; options?: Record<string, unknown> };

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "И-мэйл болон нууц үг шаардлагатай" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list: CookieItem[]) {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: "И-мэйл эсвэл нууц үг буруу байна" }, { status: 401 });
  }

  // Only the designated admin email may enter
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && data.user.email !== adminEmail) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Энэ бүртгэлд admin эрх байхгүй" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list: CookieItem[]) {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
