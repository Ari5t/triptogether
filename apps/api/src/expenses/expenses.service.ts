import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import { computeBalances, settle, splitEqual, type ExpenseInput } from "@triptogether/shared";
import { AppException, notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { RealtimeService } from "../realtime/realtime.service.js";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Resolves the input to concrete per-person parts and checks they add up. Pure, so it can be tested without a DB. */
export function resolveSplits(input: ExpenseInput): { userId: string; amountMinor: number }[] {
  if (input.splitType === "EQUAL") {
    const ids = [...new Set(input.participants)];
    return Object.entries(splitEqual(input.amountMinor, ids)).map(([userId, amountMinor]) => ({ userId, amountMinor }));
  }
  const ids = new Set(input.splits.map((s) => s.userId));
  const total = input.splits.reduce((n, s) => n + s.amountMinor, 0);
  if (ids.size !== input.splits.length || total !== input.amountMinor) throw new AppException("SPLIT_MISMATCH", HttpStatus.UNPROCESSABLE_ENTITY);
  return input.splits.filter((s) => s.amountMinor > 0);
}

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly realtime: RealtimeService,
  ) {}

  private view(e: { id: string; title: string; amountMinor: number; category: string; paidById: string; spentAt: Date; splitType: string; splits: { userId: string; amountMinor: number }[] }) {
    return {
      id: e.id,
      title: e.title,
      amountMinor: e.amountMinor,
      category: e.category,
      paidById: e.paidById,
      spentAt: e.spentAt.toISOString().slice(0, 10),
      splitType: e.splitType,
      splits: e.splits.map((s) => ({ userId: s.userId, amountMinor: s.amountMinor })),
    };
  }

  private async assertMembers(tripId: string, userIds: string[]) {
    const found = await this.prisma.tripMember.count({ where: { tripId, userId: { in: [...new Set(userIds)] } } });
    if (found !== new Set(userIds).size) throw new AppException("NOT_A_MEMBER", HttpStatus.UNPROCESSABLE_ENTITY);
  }

  async list(tripId: string) {
    const rows = await this.prisma.expense.findMany({ where: { tripId }, include: { splits: true }, orderBy: [{ spentAt: "asc" }, { id: "asc" }] });
    return rows.map((e) => this.view(e));
  }

  async create(tripId: string, userId: string, input: ExpenseInput) {
    const splits = resolveSplits(input);
    await this.assertMembers(tripId, [input.paidById, ...splits.map((s) => s.userId)]);
    const row = await this.prisma.expense.create({
      data: {
        tripId,
        title: input.title,
        amountMinor: input.amountMinor,
        category: input.category,
        paidById: input.paidById,
        splitType: input.splitType,
        spentAt: day(input.spentAt),
        createdById: userId,
        splits: { create: splits },
      },
      include: { splits: true },
    });
    this.realtime.emit(tripId, "expense:changed", { tripId });
    return this.view(row);
  }

  async update(tripId: string, expenseId: string, input: ExpenseInput) {
    const existing = await this.prisma.expense.findFirst({ where: { id: expenseId, tripId } });
    if (!existing) throw notFound("EXPENSE_NOT_FOUND");
    const splits = resolveSplits(input);
    await this.assertMembers(tripId, [input.paidById, ...splits.map((s) => s.userId)]);
    const [, row] = await this.prisma.$transaction([
      this.prisma.expenseSplit.deleteMany({ where: { expenseId } }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: {
          title: input.title,
          amountMinor: input.amountMinor,
          category: input.category,
          paidById: input.paidById,
          splitType: input.splitType,
          spentAt: day(input.spentAt),
          splits: { create: splits },
        },
        include: { splits: true },
      }),
    ]);
    this.realtime.emit(tripId, "expense:changed", { tripId });
    return this.view(row);
  }

  async remove(tripId: string, expenseId: string) {
    const { count } = await this.prisma.expense.deleteMany({ where: { id: expenseId, tripId } });
    if (count === 0) throw notFound("EXPENSE_NOT_FOUND");
    this.realtime.emit(tripId, "expense:changed", { tripId });
  }

  async balances(tripId: string) {
    const [trip, expenses, members] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: tripId }, select: { currency: true } }),
      this.prisma.expense.findMany({ where: { tripId }, include: { splits: true } }),
      this.prisma.tripMember.findMany({ where: { tripId }, orderBy: { joinedAt: "asc" } }),
    ]);
    if (!trip) throw notFound("TRIP_NOT_FOUND");
    const balances = computeBalances(expenses, members.map((m) => m.userId));
    const byCategory: Record<string, number> = {};
    for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountMinor;
    // Former members can still appear in old expenses, so names come from User for every id involved.
    const ids = [...new Set([...balances.map((b) => b.userId), ...expenses.map((e) => e.paidById)])];
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return {
      currency: trip.currency,
      totalMinor: expenses.reduce((n, e) => n + e.amountMinor, 0),
      count: expenses.length,
      byCategory,
      people: users,
      balances,
      transfers: settle(balances),
    };
  }
}
