import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

@Injectable()
export class AuthService {
  private supabase;

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      this.config.get("supabase.url")!,
      this.config.get("supabase.serviceRoleKey")!,
      { realtime: { transport: ws as any } }
    );
  }

  async signIn(email: string, password: string) {
    // TODO: implement full sign-in with Supabase Auth
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { session: data.session, user: data.user };
  }

  async signUp(email: string, password: string, fullName: string) {
    // TODO: implement full sign-up + create profile record
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName },
      email_confirm: true,
    });
    if (error) throw error;
    return { user: data.user };
  }
}
