import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import { computeBalances, convertMinor, convertShares, MAX_AMOUNT_MINOR, settle, splitEqual, type Currency, type ExpenseInput, type RefreshRatesPreview } from "@triptogether/shared";
import { AppException, notFound } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { RatesService } from "../rates/rates.service.js";
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

type SplitRow = { userId: string; amountMinor: number; originalAmountMinor: number | null };
interface Priced {
  amountMinor: number;
  originalCurrency: string | null;
  originalAmountMinor: number | null;
  rate: string | null;
  rateDate: Date | null;
  rateManual: boolean;
  splits: SplitRow[];
}

/**
 * Converts a foreign-currency amount and its split to the trip currency. Equal splits are re-split from the converted total;
 * exact shares are converted one by one and keep their original amounts so they can be edited and re-converted later.
 */
export function convertSplit(splitType: "EQUAL" | "EXACT", originalMinor: number, parts: { userId: string; amountMinor: number }[], rate: string) {
  if (splitType === "EQUAL") {
    const amountMinor = convertMinor(originalMinor, rate);
    const splits = Object.entries(splitEqual(amountMinor, parts.map((p) => p.userId))).map(([userId, minor]) => ({ userId, amountMinor: minor, originalAmountMinor: null }));
    return { amountMinor, splits };
  }
  const { total, shares } = convertShares(parts, rate);
  return { amountMinor: total, splits: shares.map((s) => ({ userId: s.userId, amountMinor: s.convertedMinor, originalAmountMinor: s.amountMinor })) };
}

/** Resolves and, for another currency, converts the input. Pure, so it can be tested without a DB. */
export function priceExpense(input: ExpenseInput, tripCurrency: string): Priced {
  const parts = resolveSplits(input);
  if (!input.currency || input.currency === tripCurrency) {
    return { amountMinor: input.amountMinor, originalCurrency: null, originalAmountMinor: null, rate: null, rateDate: null, rateManual: false, splits: parts.map((p) => ({ ...p, originalAmountMinor: null })) };
  }
  if (!input.rate) throw new AppException("RATE_REQUIRED", HttpStatus.UNPROCESSABLE_ENTITY);
  const converted = convertSplit(input.splitType, input.amountMinor, parts, input.rate);
  if (converted.amountMinor <= 0 || converted.amountMinor > MAX_AMOUNT_MINOR) throw new AppException("AMOUNT_TOO_LARGE", HttpStatus.UNPROCESSABLE_ENTITY);
  return {
    ...converted,
    originalCurrency: input.currency,
    originalAmountMinor: input.amountMinor,
    rate: input.rate,
    rateDate: day(input.rateDate ?? new Date().toISOString().slice(0, 10)),
    rateManual: input.rateManual,
  };
}

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly rates: RatesService,
  ) {}

  private view(e: {
    id: string;
    title: string;
    amountMinor: number;
    category: string;
    paidById: string;
    spentAt: Date;
    splitType: string;
    originalCurrency: string | null;
    originalAmountMinor: number | null;
    rate: { toString(): string } | null;
    rateDate: Date | null;
    rateManual: boolean;
    splits: SplitRow[];
  }) {
    return {
      id: e.id,
      title: e.title,
      amountMinor: e.amountMinor,
      category: e.category,
      paidById: e.paidById,
      spentAt: e.spentAt.toISOString().slice(0, 10),
      splitType: e.splitType,
      originalCurrency: e.originalCurrency,
      originalAmountMinor: e.originalAmountMinor,
      // Decimal prints trailing zeros ("50.2551000000"); the UI shows the short form.
      rate: e.rate ? e.rate.toString().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : null,
      rateDate: e.rateDate?.toISOString().slice(0, 10) ?? null,
      rateManual: e.rateManual,
      splits: e.splits.map((s) => ({ userId: s.userId, amountMinor: s.amountMinor, originalAmountMinor: s.originalAmountMinor })),
    };
  }

  private async tripCurrency(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { currency: true } });
    if (!trip) throw notFound("TRIP_NOT_FOUND");
    return trip.currency;
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
    const priced = priceExpense(input, await this.tripCurrency(tripId));
    await this.assertMembers(tripId, [input.paidById, ...priced.splits.map((s) => s.userId)]);
    const { splits, ...money } = priced;
    const row = await this.prisma.expense.create({
      data: {
        tripId,
        title: input.title,
        category: input.category,
        paidById: input.paidById,
        splitType: input.splitType,
        spentAt: day(input.spentAt),
        createdById: userId,
        ...money,
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
    const priced = priceExpense(input, await this.tripCurrency(tripId));
    await this.assertMembers(tripId, [input.paidById, ...priced.splits.map((s) => s.userId)]);
    const { splits, ...money } = priced;
    const [, row] = await this.prisma.$transaction([
      this.prisma.expenseSplit.deleteMany({ where: { expenseId } }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: {
          title: input.title,
          category: input.category,
          paidById: input.paidById,
          splitType: input.splitType,
          spentAt: day(input.spentAt),
          ...money,
          splits: { create: splits },
        },
        include: { splits: true },
      }),
    ]);
    this.realtime.emit(tripId, "expense:changed", { tripId });
    return this.view(row);
  }

  /**
   * Re-converts every foreign expense at the latest rate. Manual rates are kept: they are what the group actually paid.
   * All or nothing: if one currency has no rate, nothing changes.
   */
  private async refreshPlan(tripId: string) {
    const tripCurrency = (await this.tripCurrency(tripId)) as Currency;
    const rows = await this.prisma.expense.findMany({ where: { tripId, originalCurrency: { not: null }, rateManual: false }, include: { splits: true } });
    const latest = new Map<string, { rate: string; date: string }>();
    for (const c of new Set(rows.map((r) => r.originalCurrency!))) latest.set(c, await this.rates.get(c as Currency, tripCurrency));
    return rows.flatMap((r) => {
      const { rate, date } = latest.get(r.originalCurrency!)!;
      const parts = r.splits.map((s) => ({ userId: s.userId, amountMinor: s.originalAmountMinor ?? 0 }));
      const next = convertSplit(r.splitType, r.originalAmountMinor!, parts, rate);
      if (next.amountMinor > MAX_AMOUNT_MINOR) throw new AppException("AMOUNT_TOO_LARGE", HttpStatus.UNPROCESSABLE_ENTITY);
      return [{ id: r.id, before: r.amountMinor, rate, rateDate: day(date), ...next }];
    });
  }

  async previewRefresh(tripId: string): Promise<RefreshRatesPreview> {
    const plan = (await this.refreshPlan(tripId)).filter((p) => p.amountMinor !== p.before);
    return { count: plan.length, diffMinor: plan.reduce((n, p) => n + p.amountMinor - p.before, 0) };
  }

  async applyRefresh(tripId: string): Promise<RefreshRatesPreview> {
    const plan = await this.refreshPlan(tripId);
    await this.prisma.$transaction(
      plan.flatMap((p) => [
        this.prisma.expenseSplit.deleteMany({ where: { expenseId: p.id } }),
        this.prisma.expense.update({ where: { id: p.id }, data: { amountMinor: p.amountMinor, rate: p.rate, rateDate: p.rateDate, splits: { create: p.splits } } }),
      ]),
    );
    this.realtime.emit(tripId, "expense:changed", { tripId });
    const changed = plan.filter((p) => p.amountMinor !== p.before);
    return { count: changed.length, diffMinor: changed.reduce((n, p) => n + p.amountMinor - p.before, 0) };
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
