import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { createPollSchema, messagesQuerySchema, sendMessageSchema, voteSchema, type CreatePollInput, type SendMessageInput, type VoteInput } from "@triptogether/shared";
import type { AuthedRequest } from "../auth/auth.types.js";
import { ZodPipe } from "../common/errors.js";
import { TripRole, TripRoleGuard } from "../trips/trip-role.guard.js";
import { MessagesService } from "./messages.service.js";
import { PollsService } from "./polls.service.js";

@Controller()
export class DiscussionController {
  constructor(
    private readonly messages: MessagesService,
    private readonly polls: PollsService,
  ) {}

  @Get("trips/:id/messages")
  @UseGuards(TripRoleGuard)
  @TripRole("VIEWER")
  list(@Param("id") id: string, @Query(new ZodPipe(messagesQuerySchema)) q: { itemId?: string; before?: string; limit: number }) {
    return this.messages.list(id, q);
  }

  /** Viewers may chat and comment (SPEC §7 roles table). */
  @Post("trips/:id/messages")
  @UseGuards(TripRoleGuard)
  @TripRole("VIEWER")
  send(@Param("id") id: string, @Req() req: AuthedRequest, @Body(new ZodPipe(sendMessageSchema)) body: SendMessageInput) {
    return this.messages.send(id, req.user.id, body);
  }

  @Get("trips/:id/threads")
  @UseGuards(TripRoleGuard)
  @TripRole("VIEWER")
  threads(@Param("id") id: string) {
    return this.messages.threads(id);
  }

  @Get("trips/:id/polls")
  @UseGuards(TripRoleGuard)
  @TripRole("VIEWER")
  listPolls(@Param("id") id: string) {
    return this.polls.list(id);
  }

  @Post("trips/:id/polls")
  @UseGuards(TripRoleGuard)
  @TripRole("EDITOR")
  createPoll(@Param("id") id: string, @Req() req: AuthedRequest, @Body(new ZodPipe(createPollSchema)) body: CreatePollInput) {
    return this.polls.create(id, req.user.id, body);
  }

  @Post("polls/:pollId/vote")
  vote(@Param("pollId") pollId: string, @Req() req: AuthedRequest, @Body(new ZodPipe(voteSchema)) body: VoteInput) {
    return this.polls.vote(pollId, req.user.id, body);
  }
}
