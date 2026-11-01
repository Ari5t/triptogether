import { Global, Module } from "@nestjs/common";
import { MembershipService, TripRoleGuard } from "./trip-role.guard.js";
import { TripsController } from "./trips.controller.js";
import { TripsService } from "./trips.service.js";

@Global()
@Module({
  controllers: [TripsController],
  providers: [TripsService, MembershipService, TripRoleGuard],
  exports: [MembershipService, TripRoleGuard],
})
export class TripsModule {}
