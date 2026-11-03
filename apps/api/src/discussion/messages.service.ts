import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import type { MessageView, PollView, SendMessageInput } from "@triptogether/shared";
import { notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import { toPollView } from "./polls.service.js";

export const toMessageView = (m: { id: string; authorId: string; itemId: string | null; pollId: string | null; body: string; createdAt: Date }): MessageView => ({
  id: m.id,
  authorId: m.authorId,
  itemId: m.itemId,
  pollId: m.pollId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});

@Injectable()
export class MessagesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly realtime: RealtimeService,
  ) {}

  /** Newest `limit` messages (oldest first), or the page before message `before`. Polls announced in the page are included. */
  async list(tripId: string, opts: { itemId?: string; before?: string; limit: number }) {
    let cursor: { createdAt: Date; id: string } | undefined;
    if (opts.before) {
      const c = await this.prisma.message.findFirst({ where: { id: opts.before, tripId }, select: { createdAt: true, id: true } });
      if (!c) throw notFound("TRIP_NOT_FOUND");
      cursor = c;
    }
    const rows = await this.prisma.message.findMany({
      where: {
        tripId,
        itemId: opts.itemId ?? null,
        ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
    });
    const hasMore = rows.length > opts.limit;
    const page = rows.slice(0, opts.limit).reverse();
    const pollIds = page.flatMap((m) => (m.pollId ? [m.pollId] : []));
    const polls: PollView[] = pollIds.length
      ? (await this.prisma.poll.findMany({ where: { id: { in: pollIds } }, include: { options: { include: { votes: true }, orderBy: { id: "asc" } } } })).map((p) => toPollView(p))
      : [];
    return { messages: page.map(toMessageView), polls, hasMore };
  }

  async send(tripId: string, userId: string, input: SendMessageInput) {
    const row = await this.prisma.message.create({ data: { tripId, authorId: userId, body: input.body, itemId: input.itemId ?? null } });
    const message = toMessageView(row);
    this.realtime.emit(tripId, "chat:message", { tripId, message });
    return message;
  }

  /** Marks a stop's comment thread as resolved (or reopens it). Idempotent. */
  async setResolved(tripId: string, itemId: string, userId: string, resolved: boolean) {
    if (resolved) {
      await this.prisma.threadState.upsert({ where: { tripId_itemId: { tripId, itemId } }, create: { tripId, itemId, resolvedById: userId }, update: {} });
    } else {
      await this.prisma.threadState.deleteMany({ where: { tripId, itemId } });
    }
    this.realtime.emit(tripId, "thread:updated", { tripId, itemId, resolved });
  }

  /** Every stop of the trip with its comment count, in itinerary order (stops come from the SQL snapshot). */
  async threads(tripId: string) {
    const [days, counts, resolved] = await Promise.all([
      this.prisma.day.findMany({ where: { tripId }, orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } }),
      this.prisma.message.groupBy({ by: ["itemId"], where: { tripId, itemId: { not: null } }, _count: { _all: true } }),
      this.prisma.threadState.findMany({ where: { tripId }, select: { itemId: true } }),
    ]);
    const done = new Set(resolved.map((r) => r.itemId));
    const byItem = new Map(counts.map((c) => [c.itemId, c._count._all]));
    return days.flatMap((d, i) =>
      d.items.map((it) => ({
        id: it.id,
        title: it.title,
        dayNumber: i + 1,
        date: d.date.toISOString().slice(0, 10),
        startTime: it.startTime,
        count: byItem.get(it.id) ?? 0,
        resolved: done.has(it.id),
      })),
    );
  }
}
