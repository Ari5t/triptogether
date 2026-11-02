import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  changeMemberRoleSchema,
  createTripSchema,
  updateTripSchema,
  type ChangeMemberRoleInput,
  type CreateTripInput,
  type UpdateTripInput,
} from "@triptogether/shared";
import type { AuthedRequest } from "../auth/auth.types.js";
import { ZodPipe } from "../common/errors.js";
import { TripRole, TripRoleGuard, type TripRequest } from "./trip-role.guard.js";
import { TripsService } from "./trips.service.js";

@Controller("trips")
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.trips.listForUser(req.user.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body(new ZodPipe(createTripSchema)) body: CreateTripInput) {
    return this.trips.create(req.user.id, body);
  }

  @Get(":id")
  @UseGuards(TripRoleGuard)
  @TripRole("VIEWER")
  async get(@Param("id") id: string, @Req() req: TripRequest) {
    return { ...(await this.trips.get(id)), role: req.membership.role, currentUserId: req.user.id };
  }

  @Patch(":id")
  @UseGuards(TripRoleGuard)
  @TripRole("OWNER")
  update(@Param("id") id: string, @Body(new ZodPipe(updateTripSchema)) body: UpdateTripInput) {
    return this.trips.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(TripRoleGuard)
  @TripRole("OWNER")
  remove(@Param("id") id: string) {
    return this.trips.remove(id);
  }

  @Patch(":id/members/:userId")
  @UseGuards(TripRoleGuard)
  @TripRole("OWNER")
  changeRole(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body(new ZodPipe(changeMemberRoleSchema)) body: ChangeMemberRoleInput,
  ) {
    return this.trips.changeRole(id, userId, body.role);
  }

  @Delete(":id/members/:userId")
  @HttpCode(204)
  @UseGuards(TripRoleGuard)
  @TripRole("OWNER")
  removeMember(@Param("id") id: string, @Param("userId") userId: string) {
    return this.trips.removeMember(id, userId);
  }
}
