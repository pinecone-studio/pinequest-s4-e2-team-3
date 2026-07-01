import { Controller, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@UseGuards(SupabaseAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() supabaseId: string) {
    return this.usersService.findOne(id, supabaseId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: UpdateProfileDto,
    @CurrentUser() supabaseId: string,
  ) {
    return this.usersService.update(id, body, supabaseId);
  }
}
