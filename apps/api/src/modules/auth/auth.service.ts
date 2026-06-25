import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class AuthService {
  private readonly clerk: ClerkClient;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.config.get<string>("clerk.secretKey"),
    });
  }

  // Loads the local Profile for a Clerk user, creating it (or refreshing the
  // cached email/name) from Clerk on each call. This is a lazy sync so no
  // webhook is required to get a Profile row — it appears on first /auth/me.
  async syncProfile(clerkId: string) {
    const user = await this.clerk.users.getUser(clerkId);

    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";

    const metaName = (user.unsafeMetadata?.fullName as string | undefined) ?? "";
    const joinedName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const fullName = metaName || joinedName || null;

    return this.prisma.profile.upsert({
      where: { clerkId },
      create: { clerkId, email, fullName, avatarUrl: user.imageUrl },
      update: { email, fullName, avatarUrl: user.imageUrl },
    });
  }
}
