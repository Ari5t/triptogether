import { Global, Module } from "@nestjs/common";
import { CollabClient } from "../collab/collab.client.js";
import { PhotosService } from "../photos/photos.service.js";
import { MembershipService, TripRoleGuard } from "./trip-role.guard.js";
import { TripsController } from "./trips.controller.js";
import { TripsService } from "./trips.service.js";

@Global()
@Module({
  controllers: [TripsController],
  providers: [CollabClient, PhotosService, TripsService, MembershipService, TripRoleGuard],
  exports: [MembershipService, TripRoleGuard],
})
export class TripsModule {}
