import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

class SignInDto {
  email!: string;
  password!: string;
}

class SignUpDto {
  email!: string;
  password!: string;
  fullName!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sign-in")
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto.email, dto.password);
  }

  @Post("sign-up")
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto.email, dto.password, dto.fullName);
  }
}
