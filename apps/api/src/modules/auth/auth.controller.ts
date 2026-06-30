import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";

// Sign-in / sign-up happen on the client via Supabase. The API only needs to
// read the authenticated user and keep a local Profile row in sync.
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Returns the signed-in user's Profile, creating it on first call.
  @UseGuards(SupabaseAuthGuard)
  @Get("me")
  me(@CurrentUser() supabaseId: string) {
    return this.authService.syncProfile(supabaseId);
  }
}
