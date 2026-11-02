import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import type { CreatePollInput, PollView, VoteInput } from "@triptogether/shared";
import { AppException, notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import { MembershipService } from "../trips/trip-role.guard.js";
import { toMessageView } from "./messages.service.js";

type PollRow = {
  id: string;
  question: string;
  multiChoice: boolean;
  closesAt: Date | null;
  options: { id: string; label: string; votes: { userId: string }[] }[];
};

export const pollIsClosed = (closesAt: Date | null, now = new Date()) => closesAt !== null && closesAt <= now;

export function toPollView(p: PollRow, now = new Date()): PollView {
  return {
    id: p.id,
    question: p.question,
    multiChoice: p.multiChoice,
    closesAt: p.closesAt?.toISOString() ?? null,
    closed: pollIsClosed(p.closesAt, now),
    options: p.options.map((o) => ({ id: o.id, label: o.label, voterIds: o.votes.map((v) => v.userId) })),
  };
}

const include = { options: { include: { votes: true }, orderBy: { id: "asc" as const } } };

@Injectable()
export class PollsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly members: MembershipService,
  ) {}

  async list(tripId: string) {
    const rows = await this.prisma.poll.findMany({ where: { tripId }, include, orderBy: { id: "desc" } });
    return rows.map((p) => toPollView(p));
  }

  async create(tripId: string, userId: string, input: CreatePollInput) {
    const poll = await this.prisma.poll.create({
      data: {
        tripId,
        question: input.question,
        multiChoice: input.multiChoice,
        closesAt: input.closesAt ? new Date(input.closesAt) : null,
        createdById: userId,
        options: { create: input.options.map((label) => ({ label })) },
        // The poll also appears in the chat stream as a message.
        message: { create: { tripId, authorId: userId, body: input.question } },
      },
      include: { ...include, message: true },
    });
    const view = toPollView(poll);
    this.realtime.emit(tripId, "poll:created", { tripId, poll: view });
    this.realtime.emit(tripId, "chat:message", { tripId, message: toMessageView(poll.message!) });
    return view;
  }

  async vote(pollId: string, userId: string, input: VoteInput) {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId }, include });
    if (!poll) throw notFound("POLL_NOT_FOUND");
    // Non-members get the same answer as a missing poll.
    await this.members.requireRole(poll.tripId, userId, "VIEWER").catch(() => {
      throw notFound("POLL_NOT_FOUND");
    });
    if (pollIsClosed(poll.closesAt)) throw new AppException("POLL_CLOSED", HttpStatus.CONFLICT);
    const ids = [...new Set(input.optionIds)];
    const valid = new Set(poll.options.map((o) => o.id));
    if (ids.some((id) => !valid.has(id)) || (!poll.multiChoice && ids.length > 1)) throw new AppException("OPTION_INVALID", HttpStatus.BAD_REQUEST);

    await this.prisma.$transaction([
      this.prisma.vote.deleteMany({ where: { userId, optionId: { in: [...valid] } } }),
      this.prisma.vote.createMany({ data: ids.map((optionId) => ({ optionId, userId })) }),
    ]);
    const fresh = await this.prisma.poll.findUniqueOrThrow({ where: { id: pollId }, include });
    const view = toPollView(fresh);
    this.realtime.emit(poll.tripId, "poll:updated", { tripId: poll.tripId, poll: view });
    return view;
  }
}
