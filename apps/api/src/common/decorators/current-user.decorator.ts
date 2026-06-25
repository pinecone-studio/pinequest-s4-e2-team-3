import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// Extracts the Clerk user id that ClerkAuthGuard attached to the request.
// Usage: `me(@CurrentUser() clerkId: string) { ... }`
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth?.userId;
  },
);
