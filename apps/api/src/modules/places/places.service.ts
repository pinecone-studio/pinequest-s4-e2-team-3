import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  findNearby(lat?: number, lng?: number, radiusMeters = 5000) {
    // TODO: implement PostGIS-based proximity query
    return this.prisma.place.findMany({ take: 20 });
  }

  findOne(id: string) {
    return this.prisma.place.findUnique({ where: { id } });
  }
}
