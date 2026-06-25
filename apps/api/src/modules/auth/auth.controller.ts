import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ClerkAuthGuard } from "./clerk-auth.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";

// Sign-in / sign-up happen on the client via Clerk. The API only needs to read
// the authenticated user and keep a local Profile in sync.
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Returns the signed-in user's Profile, creating it on first call.
  @UseGuards(ClerkAuthGuard)
  @Get("me")
  me(@CurrentUser() clerkId: string) {
    return this.authService.syncProfile(clerkId);
  }
}
