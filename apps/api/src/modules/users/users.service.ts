import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Only the profile's own owner (matched via their Supabase auth id) may
  // read or update it — the route param alone doesn't prove ownership.
  private async requireOwnProfile(id: string, callerSupabaseId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException();
    if (profile.supabaseId !== callerSupabaseId) throw new ForbiddenException();
    return profile;
  }

  async findOne(id: string, callerSupabaseId: string) {
    return this.requireOwnProfile(id, callerSupabaseId);
  }

  async update(id: string, data: UpdateProfileDto, callerSupabaseId: string) {
    await this.requireOwnProfile(id, callerSupabaseId);
    return this.prisma.profile.update({ where: { id }, data });
  }
}
