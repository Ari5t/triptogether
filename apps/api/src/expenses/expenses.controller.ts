import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { expenseInputSchema, type ExpenseInput } from "@triptogether/shared";
import type { AuthedRequest } from "../auth/auth.types.js";
import { ZodPipe } from "../common/errors.js";
import { TripRole, TripRoleGuard } from "../trips/trip-role.guard.js";
import { ExpensesService } from "./expenses.service.js";

@Controller("trips/:id")
@UseGuards(TripRoleGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get("expenses")
  @TripRole("VIEWER")
  list(@Param("id") id: string) {
    return this.expenses.list(id);
  }

  @Post("expenses")
  @TripRole("EDITOR")
  create(@Param("id") id: string, @Req() req: AuthedRequest, @Body(new ZodPipe(expenseInputSchema)) body: ExpenseInput) {
    return this.expenses.create(id, req.user.id, body);
  }

  @Patch("expenses/:expId")
  @TripRole("EDITOR")
  update(@Param("id") id: string, @Param("expId") expId: string, @Body(new ZodPipe(expenseInputSchema)) body: ExpenseInput) {
    return this.expenses.update(id, expId, body);
  }

  @Delete("expenses/:expId")
  @HttpCode(204)
  @TripRole("EDITOR")
  remove(@Param("id") id: string, @Param("expId") expId: string) {
    return this.expenses.remove(id, expId);
  }

  @Get("balances")
  @TripRole("VIEWER")
  balances(@Param("id") id: string) {
    return this.expenses.balances(id);
  }
}
