import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { placeSearchQuerySchema } from "@triptogether/shared";
import { ZodPipe } from "../common/errors.js";
import { UserThrottlerGuard } from "../common/throttle.js";
import { PlacesService } from "./places.service.js";

@Controller("places")
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  /** Any signed-in user may search; the provider key never leaves the server. */
  @Get("search")
  @UseGuards(UserThrottlerGuard)
  search(@Query(new ZodPipe(placeSearchQuerySchema)) q: { q: string; lat?: number; lng?: number }) {
    return this.places.search(q.q, q.lat, q.lng);
  }
}
