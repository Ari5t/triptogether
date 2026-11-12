import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import type { CreateTripInput, DestinationInput, UpdateTripInput } from "@triptogether/shared";
import { AppException, notFound } from "../common/errors.js";
import { CollabClient } from "../collab/collab.client.js";
import { coverSlots, PhotosService } from "../photos/photos.service.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import { PRISMA } from "../prisma/prisma.module.js";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const withDestinations = { destinations: { orderBy: { order: "asc" } } } as const;

@Injectable()
export class TripsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly collab: CollabClient,
    private readonly photos: PhotosService,
    private readonly realtime: RealtimeService,
  ) {}

  private view(t: { id: string; title: string; destinations: { name: string; placeId: string | null }[]; startDate: Date; endDate: Date; currency: string }) {
    const { destinations, startDate, endDate, ...rest } = t;
    return { ...rest, destinations: destinations.map((d) => ({ name: d.name, placeId: d.placeId })), startDate: iso(startDate), endDate: iso(endDate) };
  }

  /** Rows for a nested write, after checking that every placeId is in the Place cache. */
  private async destinationRows(list: DestinationInput[]) {
    const ids = [...new Set(list.flatMap((d) => (d.placeId ? [d.placeId] : [])))];
    if (ids.length && (await this.prisma.place.count({ where: { id: { in: ids } } })) !== ids.length) throw notFound("PLACE_NOT_FOUND");
    return list.map((d, order) => ({ order, name: d.name, placeId: d.placeId ?? null }));
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.tripMember.findMany({
      where: { userId, trip: { deletedAt: null } },
      include: { trip: { include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } }, ...withDestinations } } },
      orderBy: { trip: { startDate: "asc" } },
    });
    const cached = await this.photos.cached(rows.flatMap((r) => r.trip.destinations.slice(0, 4).map((d) => d.name)));
    return rows.map((r) => ({
      ...this.view(r.trip),
      cover: coverSlots(r.trip.destinations.map((d) => d.name), cached),
      role: r.role,
      members: r.trip.members.map((m) => ({ userId: m.userId, name: m.user.name, avatarUrl: m.user.avatarUrl })),
    }));
  }

  async create(userId: string, input: CreateTripInput) {
    const destinations = await this.destinationRows(input.destinations);
    const trip = await this.prisma.trip.create({
      include: withDestinations,
      data: {
        title: input.title,
        destinations: { create: destinations },
        startDate: day(input.startDate),
        endDate: day(input.endDate),
        currency: input.currency,
        createdById: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    void this.photos.ensure(trip.destinations.map((d) => d.name));
    return this.view(trip);
  }

  async get(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } }, ...withDestinations },
    });
    if (!trip || trip.deletedAt) throw notFound("TRIP_NOT_FOUND");
    const stopCount = await this.prisma.itineraryItem.count({ where: { day: { tripId } } });
    return {
      ...this.view(trip),
      stopCount,
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
    if (!current || current.deletedAt) throw notFound("TRIP_NOT_FOUND");
    const start = input.startDate ?? iso(current.startDate);
    const end = input.endDate ?? iso(current.endDate);
    if (end < start) throw new AppException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, [{ path: ["endDate"], message: "END_BEFORE_START" }]);
    const destinations = input.destinations && (await this.destinationRows(input.destinations));
    const datesChanged = input.startDate !== undefined || input.endDate !== undefined;
    const write = (db: Pick<PrismaClient, "trip">) =>
      db.trip.update({
        where: { id: tripId },
        include: withDestinations,
        data: {
          title: input.title,
          destinations: destinations && { deleteMany: {}, create: destinations },
          startDate: input.startDate ? day(input.startDate) : undefined,
          endDate: input.endDate ? day(input.endDate) : undefined,
        },
      });
    // Dates commit only if collab applied them to the doc; otherwise the transaction rolls back.
    const trip = datesChanged
      ? await this.prisma
          .$transaction(
            async (tx) => {
              const t = await write(tx);
              await this.collab.syncDaysStrict(tripId, iso(t.startDate), iso(t.endDate), input.dateMode ?? "calendar");
              return t;
            },
            { timeout: 10_000 },
          )
          .catch((e: unknown) => {
            if (e instanceof AppException) throw e;
            throw new AppException("COLLAB_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
          })
      : await write(this.prisma);
    if (destinations) void this.photos.ensure(trip.destinations.map((d) => d.name));
    this.realtime.emit(tripId, "trip:updated", { tripId });
    return this.view(trip);
  }

  async remove(tripId: string) {
    await this.prisma.trip.update({ where: { id: tripId }, data: { deletedAt: new Date() } });
    this.realtime.emit(tripId, "trip:deleted", { tripId });
    await this.collab.closeConnections(tripId);
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
    await this.prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
    // Everyone reconnects; the removed member is refused by collab because membership is re-checked on connect.
    await this.collab.closeConnections(tripId);
    await this.realtime.kick(tripId, userId);
    this.realtime.emit(tripId, "member:left", { tripId, userId });
  }
}
