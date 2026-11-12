import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PrismaClient } from "@triptogether/db";
import { hasRole, type TripRole as Role } from "@triptogether/shared";
import type { AuthedRequest } from "../auth/auth.types.js";
import { forbidden, notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";

const KEY = "tripRole";
/** Minimum role required on `:id` (the trip id route param). */
export const TripRole = (min: Role) => SetMetadata(KEY, min);

export type TripRequest = AuthedRequest & { membership: { role: Role } };

/** Shared by the REST guard, and later the Socket.IO gateway and Hocuspocus auth. */
@Injectable()
export class MembershipService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async requireRole(tripId: string, userId: string, min: Role): Promise<Role> {
    const m = await this.prisma.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } }, include: { trip: { select: { deletedAt: true } } } });
    // Non-members and soft-deleted trips get 404 so trip ids cannot be probed.
    if (!m || m.trip.deletedAt) throw notFound("TRIP_NOT_FOUND");
    if (!hasRole(m.role, min)) throw forbidden();
    return m.role;
  }
}

@Injectable()
export class TripRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly members: MembershipService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const min = this.reflector.getAllAndOverride<Role>(KEY, [ctx.getHandler(), ctx.getClass()]) ?? "VIEWER";
    const req = ctx.switchToHttp().getRequest<TripRequest>();
    const role = await this.members.requireRole(req.params.id as string, req.user.id, min);
    req.membership = { role };
    return true;
  }
}
