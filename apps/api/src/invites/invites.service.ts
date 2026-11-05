import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import type { CreateInviteInput } from "@triptogether/shared";
import { newToken, sha256 } from "../auth/tokens.js";
import { ENV, type Env } from "../common/env.js";
import { AppException, notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { RealtimeService } from "../realtime/realtime.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface InviteState {
  revokedAt: Date | null;
  expiresAt: Date;
  uses: number;
  maxUses: number | null;
}

/** Throws the matching error code if the invite can no longer be used. */
export function assertInviteUsable(i: InviteState, now = new Date()) {
  if (i.revokedAt) throw new AppException("INVITE_REVOKED", HttpStatus.GONE);
  if (i.expiresAt <= now) throw new AppException("INVITE_EXPIRED", HttpStatus.GONE);
  if (i.maxUses !== null && i.uses >= i.maxUses) throw new AppException("INVITE_EXHAUSTED", HttpStatus.GONE);
}

@Injectable()
export class InvitesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(ENV) private readonly env: Env,
    private readonly realtime: RealtimeService,
  ) {}

  async create(tripId: string, input: CreateInviteInput) {
    const token = newToken();
    const invite = await this.prisma.invite.create({
      data: {
        tripId,
        tokenHash: sha256(token),
        role: input.role,
        maxUses: input.maxUses,
        expiresAt: new Date(Date.now() + input.expiresInDays * DAY_MS),
      },
    });
    // The raw token is only returned here; only its hash is stored.
    return { id: invite.id, token, url: `${this.env.WEB_ORIGIN}/invite/${token}`, role: invite.role, expiresAt: invite.expiresAt };
  }

  async revoke(tripId: string, inviteId: string) {
    const { count } = await this.prisma.invite.updateMany({
      where: { id: inviteId, tripId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw notFound("INVITE_NOT_FOUND");
  }

  private async findByToken(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: sha256(token) },
      include: { trip: { include: { members: { where: { role: "OWNER" }, include: { user: true } }, destinations: { orderBy: { order: "asc" } } } } },
    });
    if (!invite) throw notFound("INVITE_NOT_FOUND");
    return invite;
  }

  async preview(token: string, userId: string) {
    const invite = await this.findByToken(token);
    assertInviteUsable(invite);
    const existing = await this.prisma.tripMember.findUnique({ where: { tripId_userId: { tripId: invite.tripId, userId } } });
    return {
      tripId: invite.tripId,
      title: invite.trip.title,
      destinations: invite.trip.destinations.map((d) => ({ name: d.name, placeId: d.placeId })),
      startDate: invite.trip.startDate.toISOString().slice(0, 10),
      endDate: invite.trip.endDate.toISOString().slice(0, 10),
      role: invite.role,
      expiresAt: invite.expiresAt,
      invitedBy: invite.trip.members[0]?.user.name ?? null,
      alreadyMember: existing !== null,
    };
  }

  async accept(token: string, userId: string) {
    const invite = await this.findByToken(token);
    assertInviteUsable(invite);
    const existing = await this.prisma.tripMember.findUnique({ where: { tripId_userId: { tripId: invite.tripId, userId } } });
    if (existing) throw new AppException("ALREADY_MEMBER", HttpStatus.CONFLICT);

    await this.prisma.$transaction(async (tx) => {
      // Optimistic check on `uses` so concurrent accepts cannot exceed maxUses.
      const { count } = await tx.invite.updateMany({
        where: { id: invite.id, uses: invite.uses, revokedAt: null },
        data: { uses: { increment: 1 } },
      });
      if (count !== 1) throw new AppException("INVITE_EXHAUSTED", HttpStatus.CONFLICT);
      await tx.tripMember.create({ data: { tripId: invite.tripId, userId, role: invite.role } });
    });
    this.realtime.emit(invite.tripId, "member:joined", { tripId: invite.tripId, userId });
    return { tripId: invite.tripId, role: invite.role };
  }
}
