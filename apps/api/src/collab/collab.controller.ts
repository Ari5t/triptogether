import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import type { AuthedRequest } from "../auth/auth.types.js";
import { ENV, type Env } from "../common/env.js";
import { ZodPipe } from "../common/errors.js";
import { MembershipService } from "../trips/trip-role.guard.js";

const bodySchema = z.object({ tripId: z.string().min(1) });
const COLLAB_TOKEN_TTL_S = 5 * 60;

@Controller("collab")
export class CollabController {
  constructor(
    private readonly members: MembershipService,
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Short-lived token proving identity to the Hocuspocus service, which re-reads the role from the DB. */
  @Post("token")
  async token(@Req() req: AuthedRequest, @Body(new ZodPipe(bodySchema)) body: { tripId: string }) {
    const role = await this.members.requireRole(body.tripId, req.user.id, "VIEWER");
    const token = await this.jwt.signAsync(
      { sub: req.user.id, tripId: body.tripId, role },
      { secret: this.env.COLLAB_JWT_SECRET, expiresIn: COLLAB_TOKEN_TTL_S },
    );
    return { token, role };
  }
}
