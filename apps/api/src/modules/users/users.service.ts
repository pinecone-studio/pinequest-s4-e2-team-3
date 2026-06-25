import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findOne(id: string) {
    // TODO: implement user lookup
    return this.prisma.profile.findUnique({ where: { id } });
  }

  update(id: string, data: Record<string, unknown>) {
    // TODO: add validation DTO
    return this.prisma.profile.update({ where: { id }, data });
  }
}
