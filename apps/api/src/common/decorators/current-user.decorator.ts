import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// Extracts the Supabase user id that SupabaseAuthGuard attached to the request.
// Usage: `me(@CurrentUser() supabaseId: string) { ... }`
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth?.userId;
  },
);
