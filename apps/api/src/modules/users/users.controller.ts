import { Controller, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";

@UseGuards(ClerkAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.usersService.update(id, body);
  }
}
