import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";

// Verifies the Clerk session token sent as `Authorization: Bearer <token>`.
// On success, attaches `{ userId, claims }` to the request so route handlers
// (and the @CurrentUser decorator) can read the authenticated Clerk user.
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const secretKey = this.config.get<string>("clerk.secretKey");
    if (!secretKey) {
      throw new UnauthorizedException("Clerk secret key is not configured");
    }

    try {
      const payload = await verifyToken(token, { secretKey });
      request.auth = { userId: payload.sub, claims: payload };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
