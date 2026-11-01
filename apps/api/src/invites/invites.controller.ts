import { Body, Controller, Delete, Param, HttpCode, Post, Get, Req, UseGuards } from "@nestjs/common";
import { createInviteSchema, type CreateInviteInput } from "@triptogether/shared";
import type { AuthedRequest } from "../auth/auth.types.js";
import { ZodPipe } from "../common/errors.js";
import { TripRole, TripRoleGuard } from "../trips/trip-role.guard.js";
import { InvitesService } from "./invites.service.js";

@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post("trips/:id/invites")
  @UseGuards(TripRoleGuard)
  @TripRole("OWNER")
  create(@Param("id") id: string, @Body(new ZodPipe(createInviteSchema)) body: CreateInviteInput) {
    return this.invites.create(id, body);
  }

  @Delete("trips/:id/invites/:inviteId")
  @HttpCode(204)
  @UseGuards(TripRoleGuard)
  @TripRole("OWNER")
  revoke(@Param("id") id: string, @Param("inviteId") inviteId: string) {
    return this.invites.revoke(id, inviteId);
  }

  @Get("invites/:token")
  preview(@Param("token") token: string, @Req() req: AuthedRequest) {
    return this.invites.preview(token, req.user.id);
  }

  @Post("invites/:token/accept")
  accept(@Param("token") token: string, @Req() req: AuthedRequest) {
    return this.invites.accept(token, req.user.id);
  }
}
