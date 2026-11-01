import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import type { CreateTripInput, UpdateTripInput } from "@triptogether/shared";
import { AppException, notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class TripsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  private view(t: { id: string; title: string; destination: string | null; startDate: Date; endDate: Date; currency: string; coverUrl: string | null }) {
    return { ...t, startDate: iso(t.startDate), endDate: iso(t.endDate) };
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.tripMember.findMany({
      where: { userId },
      include: { trip: { include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } } } },
      orderBy: { trip: { startDate: "asc" } },
    });
    return rows.map((r) => ({
      ...this.view(r.trip),
      role: r.role,
      members: r.trip.members.map((m) => ({ userId: m.userId, name: m.user.name, avatarUrl: m.user.avatarUrl })),
    }));
  }

  async create(userId: string, input: CreateTripInput) {
    const trip = await this.prisma.trip.create({
      data: {
        title: input.title,
        destination: input.destination,
        startDate: day(input.startDate),
        endDate: day(input.endDate),
        currency: input.currency,
        coverUrl: input.coverUrl,
        createdById: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return this.view(trip);
  }

  async get(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
    });
    if (!trip) throw notFound("TRIP_NOT_FOUND");
    return {
      ...this.view(trip),
      members: trip.members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  async update(tripId: string, input: UpdateTripInput) {
    const current = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!current) throw notFound("TRIP_NOT_FOUND");
    const start = input.startDate ?? iso(current.startDate);
    const end = input.endDate ?? iso(current.endDate);
    if (end < start) throw new AppException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, [{ path: ["endDate"], message: "END_BEFORE_START" }]);
    // shortcut: Yjs `days` are not resynced yet, wire to collab openDirectConnection in phase 2.
    const trip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        title: input.title,
        destination: input.destination,
        coverUrl: input.coverUrl,
        startDate: input.startDate ? day(input.startDate) : undefined,
        endDate: input.endDate ? day(input.endDate) : undefined,
      },
    });
    return this.view(trip);
  }

  async remove(tripId: string) {
    await this.prisma.trip.delete({ where: { id: tripId } });
  }

  async changeRole(tripId: string, userId: string, role: "EDITOR" | "VIEWER") {
    const m = await this.prisma.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
    if (!m) throw notFound("MEMBER_NOT_FOUND");
    if (m.role === "OWNER") throw new AppException("CANNOT_CHANGE_OWNER", HttpStatus.CONFLICT);
    await this.prisma.tripMember.update({ where: { tripId_userId: { tripId, userId } }, data: { role } });
    return { userId, role };
  }

  async removeMember(tripId: string, userId: string) {
    const m = await this.prisma.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
    if (!m) throw notFound("MEMBER_NOT_FOUND");
    if (m.role === "OWNER") throw new AppException("CANNOT_CHANGE_OWNER", HttpStatus.CONFLICT);
    // shortcut: active collab/socket connections are not closed yet, do it when those services exist.
    await this.prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  }
}
