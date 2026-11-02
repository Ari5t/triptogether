"use client";

import { ArrowRight, Banknote, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { ExpenseCategory } from "@triptogether/shared";
import { Avatar, participantColor } from "@/components/avatar";
import { Button } from "@/components/button";
import { Money } from "@/components/money";
import { formatMoney, formatShortDate } from "@/lib/format";
import { ExpenseDialog } from "./expense-dialog";
import type { TripSummary } from "../trip-header";

export interface ExpenseRow {
  id: string;
  title: string;
  amountMinor: number;
  category: ExpenseCategory;
  paidById: string;
  spentAt: string;
  splitType: "EQUAL" | "EXACT";
  splits: { userId: string; amountMinor: number }[];
}

export interface BalancesData {
  currency: string;
  totalMinor: number;
  count: number;
  byCategory: Record<string, number>;
  people: { id: string; name: string }[];
  balances: { userId: string; paid: number; owed: number; balance: number }[];
  transfers: { from: string; to: string; amountMinor: number }[];
}

// Category bar segments use the primary ramp (DESIGN.md §6.13), biggest first.
const RAMP = ["var(--color-primary-600)", "var(--color-primary-400)", "var(--color-primary-300)", "var(--color-primary-200)"];

export function BudgetView({ trip, expenses, data }: { trip: TripSummary; expenses: ExpenseRow[]; data: BalancesData }) {
  const t = useTranslations("budget");
  const locale = useLocale();
  const [editing, setEditing] = useState<ExpenseRow | "new" | null>(null);
  const editable = trip.role !== "VIEWER";
  const text = (n: number) => formatMoney(locale, n, data.currency); // plain text for aria and translated sentences
  const money = (n: number) => <Money minor={n} currency={data.currency} />;
  const names = new Map(data.people.map((p) => [p.id, p.name]));
  const first = (id: string) => (names.get(id) ?? "?").split(" ")[0]!;
  const color = (id: string) => participantColor(trip.members.findIndex((m) => m.userId === id));
  const person = (id: string, size = 28) => <Avatar name={names.get(id) ?? "?"} color={color(id)} size={size} />;

  const categories = Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]);
  const maxAbs = Math.max(1, ...data.balances.map((b) => Math.abs(b.balance)));
  const perPerson = trip.members.length ? Math.round(data.totalMinor / trip.members.length) : 0;
  const me = trip.currentUserId;

  return (
    <main className="mx-auto flex max-w-content flex-wrap gap-8 px-[clamp(16px,4vw,40px)] pb-12 pt-8">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="label">{t("total")}</p>
            <p className="amount text-amount-lg">{money(data.totalMinor)}</p>
            <p className="text-small text-fg-secondary">{t("summary", { perPerson: text(perPerson), count: data.count, people: trip.members.length })}</p>
          </div>
          {editable && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} strokeWidth={1.5} aria-hidden />
              {t("add")}
            </Button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div role="img" aria-label={categories.map(([c, v]) => `${t(`category.${c}`)} ${text(v)}`).join(", ")} className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              {categories.map(([c, v], i) => (
                <span key={c} style={{ flexGrow: v, backgroundColor: RAMP[Math.min(i, RAMP.length - 1)] }} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-fg-secondary">
              {categories.map(([c, v], i) => (
                <li key={c} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px]" style={{ backgroundColor: RAMP[Math.min(i, RAMP.length - 1)] }} aria-hidden />
                  {t(`category.${c}`)} <span className="amount text-fg">{money(v)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {expenses.length === 0 ? (
          <section className="flex flex-col items-start gap-2.5 rounded-lg border border-dashed border-border-strong p-6">
            <Banknote size={20} strokeWidth={1.5} aria-hidden className="text-fg-muted" />
            <h2 className="text-[16px] font-bold">{t("emptyTitle")}</h2>
            <p className="text-small text-fg-secondary">{t("emptyText")}</p>
            {editable && (
              <Button variant="secondary" size="sm" onClick={() => setEditing("new")}>
                {t("add")}
              </Button>
            )}
          </section>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-surface">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b text-[12px] font-medium text-fg-muted">
                  <th className="px-4 py-3 font-medium">{t("col.expense")}</th>
                  <th className="px-2 py-3 font-medium">{t("col.paidBy")}</th>
                  <th className="px-2 py-3 font-medium">{t("col.date")}</th>
                  <th className="px-2 py-3 text-right font-medium">{t("col.each")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("col.sum")}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-sunken last:border-b-0 hover:bg-primary-subtle">
                    <td className="px-4 py-3">
                      {editable ? (
                        <button type="button" onClick={() => setEditing(e)} className="text-left text-body font-semibold hover:underline">
                          {e.title}
                        </button>
                      ) : (
                        <span className="text-body font-semibold">{e.title}</span>
                      )}
                      <p className="text-[12px] text-fg-muted">{t(`category.${e.category}`)}</p>
                    </td>
                    <td className="px-2 py-3">
                      <span className="flex items-center gap-2 text-small">
                        {person(e.paidById, 22)}
                        {first(e.paidById)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-small tabular-nums text-fg-secondary">{formatShortDate(locale, e.spentAt)}</td>
                    <td className="amount whitespace-nowrap px-2 py-3 text-right text-[13px] text-fg-muted">{e.splitType === "EQUAL" && e.splits.length ? money(Math.round(e.amountMinor / e.splits.length)) : "—"}</td>
                    <td className="amount whitespace-nowrap px-4 py-3 text-right text-amount">{money(e.amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="flex min-w-0 max-w-[420px] flex-[1_1_360px] flex-col gap-8">
        <section className="rounded-lg border bg-surface">
          <div className="px-4 pb-3 pt-4">
            <h2 className="text-h4">{t("whoPays")}</h2>
            <p className="text-small text-fg-muted">{data.transfers.length ? t("transfers", { count: data.transfers.length }) : t("allSettled")}</p>
          </div>
          {[...data.transfers].sort((a, b) => Number(b.from === me) - Number(a.from === me)).map((x, i) => {
            const mine = x.from === me;
            return (
              <div key={i} className={mine ? "mx-2 mb-2 flex items-center gap-3 rounded-[10px] border border-primary-200 bg-primary-subtle p-3" : "flex items-center gap-2.5 border-t px-4 py-3"}>
                {person(x.from)}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-fg-muted" />
                {person(x.to)}
                <span className="min-w-0 flex-1 text-body">
                  {mine ? t("you") : first(x.from)} → {first(x.to)}
                </span>
                <span className="amount text-[15px]">{money(x.amountMinor)}</span>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-h4">{t("balances")}</h2>
            <p className="text-[12px] text-fg-muted">{t("paidShare")}</p>
          </div>
          <ul>
            {data.balances.map((b) => (
              <li key={b.userId} className="grid grid-cols-[28px_1fr_96px] items-center gap-2.5 border-b py-2.5">
                {person(b.userId)}
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">{first(b.userId)}</span>
                    <span className="amount text-[12px] text-fg-muted">
                      {t("paid")} {money(b.paid)}
                    </span>
                  </p>
                  <span className="relative h-1.5 rounded-full bg-sunken" aria-hidden>
                    <span className="absolute -top-0.5 left-1/2 h-2.5 w-px bg-border-strong" />
                    <span
                      className={`absolute h-1.5 rounded-full ${b.balance >= 0 ? "bg-success" : "bg-error"}`}
                      style={{ width: `${(Math.abs(b.balance) / maxAbs) * 50}%`, [b.balance >= 0 ? "left" : "right"]: "50%" }}
                    />
                  </span>
                </div>
                <span className={`amount text-right text-amount ${b.balance > 0 ? "text-success-ink" : b.balance < 0 ? "text-error-ink" : "text-fg-muted"}`}><Money minor={b.balance} currency={data.currency} signed /></span>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-[12px] leading-[18px] text-fg-muted">{t("balanceNote")}</p>
        </section>
      </aside>

      {editing && <ExpenseDialog tripId={trip.id} members={trip.members} currency={data.currency} expense={editing === "new" ? null : editing} currentUserId={trip.currentUserId} onClose={() => setEditing(null)} />}
    </main>
  );
}
