"use client";

import { ArrowRight, Banknote, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import type { ExpenseCategory, RefreshRatesPreview } from "@triptogether/shared";
import { Avatar, participantColor } from "@/components/avatar";
import { Button } from "@/components/button";
import { Money } from "@/components/money";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";
import { useTripEvents } from "@/lib/use-trip-socket";
import { formatMoney, formatNumericDate, formatRateLine, formatShortDate, formatSigned } from "@/lib/format";
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
  /** Set when paid in another currency; amountMinor is then the converted trip-currency amount. */
  originalCurrency: string | null;
  originalAmountMinor: number | null;
  rate: string | null;
  rateDate: string | null;
  rateManual: boolean;
  splits: { userId: string; amountMinor: number; originalAmountMinor: number | null }[];
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

/**
 * Original amount with the rate in a tooltip on hover, keyboard focus or tap (a native title is slow and missing on touch).
 * It opens above the amount on phones (right-aligned, never off screen) and to the left on desktop, clear of the table's scroll box.
 */
function RateHint({ text, children }: { text: string; children: ReactNode }) {
  const id = useId();
  return (
    <span tabIndex={0} aria-describedby={id} className="group relative inline-block rounded-sm underline decoration-dotted underline-offset-2 outline-offset-2">
      <span className="amount">{children}</span>
      <span role="tooltip" id={id} className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden w-max max-w-[min(260px,calc(100vw-48px))] rounded-md border bg-surface-raised px-3 py-2 text-left font-sans text-[12px] leading-[18px] text-fg shadow-md group-hover:block group-focus:block md:bottom-auto md:right-full md:top-1/2 md:mb-0 md:mr-2 md:-translate-y-1/2">
        {text}
      </span>
    </span>
  );
}

// Row actions stay neutral: green is reserved for primary actions (DESIGN.md).
const iconBtn = "inline-flex size-11 items-center justify-center rounded-md text-fg-muted md:size-10";

// Category bar segments use the primary ramp (DESIGN.md §6.13), biggest first.
const RAMP = ["var(--color-primary-600)", "var(--color-primary-400)", "var(--color-primary-300)", "var(--color-primary-200)"];

export function BudgetView({ trip, expenses, data }: { trip: TripSummary; expenses: ExpenseRow[]; data: BalancesData }) {
  const t = useTranslations("budget");
  const locale = useLocale();
  const router = useRouter();
  // Someone else changed an expense: reload the server data.
  useTripEvents({ "expense:changed": () => router.refresh() });
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
  const refreshable = trip.role === "OWNER" && expenses.some((e) => e.originalCurrency && !e.rateManual);
  const [refreshing, setRefreshing] = useState(false);

  async function remove(e: ExpenseRow) {
    if (!window.confirm(t("dialog.confirmDelete"))) return;
    try {
      await apiFetch(`/trips/${trip.id}/expenses/${e.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "INTERNAL";
      window.alert(t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.INTERNAL"));
    }
  }

  async function refreshRates() {
    setRefreshing(true);
    try {
      const path = `/trips/${trip.id}/expenses/refresh-rates`;
      const preview = await apiFetch<RefreshRatesPreview>(path);
      if (preview.count === 0) window.alert(t("refreshNone"));
      else if (window.confirm(t("refreshConfirm", { count: preview.count, diff: formatSigned(locale, preview.diffMinor, data.currency) }))) {
        await apiFetch(path, { method: "POST" });
        router.refresh();
      }
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "INTERNAL";
      window.alert(t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.INTERNAL"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-content flex-wrap gap-8 px-[clamp(16px,4vw,40px)] pb-12 pt-8">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="label">{t("total")}</p>
            <p className="amount text-amount-lg">{money(data.totalMinor)}</p>
            <p className="text-small text-fg-secondary">{t("summary", { perPerson: text(perPerson), count: data.count, people: trip.members.length })}</p>
          </div>
          <div className="grid w-full auto-cols-fr grid-flow-col gap-2 md:flex md:w-auto">
            {refreshable && (
              <Button variant="secondary" onClick={() => void refreshRates()} disabled={refreshing} className="h-auto min-h-11 whitespace-normal py-2 md:h-10 md:py-0">
                <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
                {t("refreshAll")}
              </Button>
            )}
            {editable && (
              <Button onClick={() => setEditing("new")} className="h-auto min-h-11 whitespace-normal py-2 md:h-10 md:py-0">
                <Plus size={16} strokeWidth={1.5} aria-hidden />
                {t("add")}
              </Button>
            )}
          </div>
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
          <div className="rounded-lg border bg-surface md:overflow-x-auto">
            {/* Below md every row is a card (same markup); the header row stays for screen readers. */}
            <table className="block w-full border-collapse text-left md:table md:min-w-[700px]">
              <thead className="sr-only md:not-sr-only">
                <tr className="border-b text-[12px] font-medium text-fg-muted">
                  <th className="px-4 py-3 font-medium">{t("col.expense")}</th>
                  <th className="px-2 py-3 font-medium">{t("col.paidBy")}</th>
                  <th className="px-2 py-3 font-medium">{t("col.date")}</th>
                  <th className="px-2 py-3 text-right font-medium">{t("col.each")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("col.sum")}</th>
                  {editable && (
                    <th className="w-0 py-3 pr-2">
                      <span className="sr-only">{t("col.actions")}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {expenses.map((e) => (
                  <tr key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 border-b border-sunken px-4 py-3 last:border-b-0 hover:bg-primary-subtle md:table-row md:p-0">
                    <td className="col-span-2 col-start-1 row-start-1 md:table-cell md:px-4 md:py-3">
                      {editable ? (
                        <button type="button" onClick={() => setEditing(e)} className="text-left text-body font-semibold hover:underline">
                          {e.title}
                        </button>
                      ) : (
                        <span className="text-body font-semibold">{e.title}</span>
                      )}
                      <p className="text-[12px] text-fg-muted">{t(`category.${e.category}`)}</p>
                    </td>
                    <td className="col-start-1 row-start-2 md:table-cell md:px-2 md:py-3">
                      <span className="flex items-center gap-2 text-small">
                        {person(e.paidById, 22)}
                        {first(e.paidById)}
                      </span>
                    </td>
                    <td className="col-start-2 row-start-2 whitespace-nowrap text-small tabular-nums text-fg-secondary before:mr-2 before:content-['·'] md:table-cell md:px-2 md:py-3 md:before:content-none">{formatShortDate(locale, e.spentAt)}</td>
                    <td className="amount hidden whitespace-nowrap text-right text-[13px] text-fg-muted md:table-cell md:px-2 md:py-3">{e.splitType === "EQUAL" && e.splits.length ? money(Math.round(e.amountMinor / e.splits.length)) : "—"}</td>
                    <td className="col-start-3 row-start-1 text-right md:table-cell md:px-4 md:py-3">
                      <span className="amount whitespace-nowrap text-amount">
                        {e.originalCurrency && "≈ "}
                        {money(e.amountMinor)}
                      </span>
                      {e.originalCurrency && e.originalAmountMinor !== null && e.rate && (() => {
                        const rateLine = formatRateLine(locale, e.rate, e.originalCurrency, data.currency);
                        const paid = formatMoney(locale, e.originalAmountMinor, e.originalCurrency);
                        const rateText = e.rateManual ? t("rateManualValue", { paid, rate: rateLine }) : t("rateValue", { paid, rate: rateLine, date: formatNumericDate(locale, e.rateDate ?? e.spentAt) });
                        return (
                          <p className="text-[12px] text-fg-muted">
                            <RateHint text={rateText}>
                              <Money minor={e.originalAmountMinor} currency={e.originalCurrency} />
                            </RateHint>
                          </p>
                        );
                      })()}
                    </td>
                    {editable && (
                      <td className="col-start-3 row-start-2 justify-self-end whitespace-nowrap md:table-cell md:py-3 md:pr-2">
                        <span className="flex gap-0.5">
                          <button type="button" aria-label={t("editExpense", { title: e.title })} onClick={() => setEditing(e)} className={`${iconBtn} hover:bg-sunken hover:text-fg`}>
                            <Pencil size={16} strokeWidth={1.5} aria-hidden />
                          </button>
                          <button type="button" aria-label={t("deleteExpense", { title: e.title })} onClick={() => void remove(e)} className={`${iconBtn} hover:bg-error-subtle hover:text-error-ink`}>
                            <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                          </button>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="flex w-full min-w-0 flex-[1_1_360px] flex-col gap-8 md:max-w-[420px]">
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
