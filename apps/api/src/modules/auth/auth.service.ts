import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // Loads the local Profile for a Supabase user, creating it (or refreshing
  // cached fields) from Supabase metadata on each call.
  async syncProfile(supabaseId: string) {
    const supabaseUrl = this.config.get<string>("supabase.url")!;
    const serviceRoleKey = this.config.get<string>("supabase.serviceRoleKey")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.admin.getUserById(supabaseId);
    if (error || !data.user) {
      throw new Error(`Supabase user not found: ${supabaseId}`);
    }

    const user = data.user;
    const email = user.email ?? "";
    const meta = user.user_metadata ?? {};
    const fullName = (meta.fullName as string | undefined) ?? null;
    const avatarUrl = (meta.avatarUrl as string | undefined) ?? null;

    return this.prisma.profile.upsert({
      where: { supabaseId },
      create: { supabaseId, email, fullName, avatarUrl },
      update: { email, fullName, avatarUrl },
    });
  }
}
