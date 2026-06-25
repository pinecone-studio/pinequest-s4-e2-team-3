import { Controller, Get, Query, Param } from "@nestjs/common";
import { PlacesService } from "./places.service";

@Controller("places")
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  findAll(
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radius") radius?: string
  ) {
    return this.placesService.findNearby(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      radius ? parseFloat(radius) : 5000
    );
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.placesService.findOne(id);
  }
}
