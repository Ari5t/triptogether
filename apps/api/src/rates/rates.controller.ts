import { Controller, Get, Query } from "@nestjs/common";
import { rateQuerySchema, type Currency } from "@triptogether/shared";
import { ZodPipe } from "../common/errors.js";
import { RatesService } from "./rates.service.js";

@Controller("rates")
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  /** Any signed-in user; used to pre-fill the rate in the expense dialog. */
  @Get()
  get(@Query(new ZodPipe(rateQuerySchema)) q: { from: Currency; to: Currency; date?: string }) {
    return this.rates.get(q.from, q.to, q.date);
  }
}
