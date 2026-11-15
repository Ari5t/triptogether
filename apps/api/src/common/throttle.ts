import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { AuthedRequest } from "../auth/auth.types.js";

/**
 * Limits per signed-in user, not per IP: behind the Next.js rewrite every request shares one IP.
 * shortcut: counters live in this process, use a Redis storage when the API runs on several instances.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    return (req as unknown as AuthedRequest).user.id;
  }
}
