import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";

// Verifies the Supabase JWT sent as `Authorization: Bearer <token>`.
// On success, attaches `{ userId, user }` to the request object.
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
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

    const supabaseUrl = this.config.get<string>("supabase.url");
    const serviceRoleKey = this.config.get<string>("supabase.serviceRoleKey");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new UnauthorizedException("Supabase is not configured");
    }

    // Use the admin client with service role key to verify the user token
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    request.auth = { userId: data.user.id, user: data.user };
    return true;
  }
}
