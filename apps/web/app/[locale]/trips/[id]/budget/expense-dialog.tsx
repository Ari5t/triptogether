"use client";

import { RefreshCw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { convertMinor, CURRENCIES, EXPENSE_CATEGORIES, parseAmount, RATE_PATTERN, splitEqual, type ExpenseCategory, type Member, type RateView } from "@triptogether/shared";
import { Button } from "@/components/button";
import { Field, Input, Select, inputClass } from "@/components/field";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";
import { formatMoney, formatNumericDate } from "@/lib/format";
import { Money } from "@/components/money";
import type { ExpenseRow } from "./budget-view";

interface Props {
  tripId: string;
  members: Member[];
  currency: string;
  currentUserId: string;
  expense: ExpenseRow | null;
  onClose: () => void;
}

const minorToText = (n: number) => (n / 100).toString().replace(".", ",");
const today = () => new Date().toISOString().slice(0, 10);
/** "50,2551" -> "50.2551", or null unless it is a positive rate the API accepts. */
const parseRate = (text: string) => {
  const r = text.trim().replace(",", ".");
  return RATE_PATTERN.test(r) && /[1-9]/.test(r) ? r : null;
};

export function ExpenseDialog({ tripId, members, currency, currentUserId, expense, onClose }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState(expense?.title ?? "");
  // Amounts in the dialog are in the expense currency; the server converts them to the trip currency.
  const [amountText, setAmountText] = useState(expense ? minorToText(expense.originalAmountMinor ?? expense.amountMinor) : "");
  const [expCurrency, setExpCurrency] = useState(expense?.originalCurrency ?? currency);
  const [rateText, setRateText] = useState(expense?.rate?.replace(".", ",") ?? "");
  const [rateDate, setRateDate] = useState(expense?.rateDate ?? null);
  const [rateManual, setRateManual] = useState(expense?.rateManual ?? false);
  const [rateState, setRateState] = useState<"idle" | "loading" | "unavailable">("idle");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "OTHER");
  const [paidById, setPaidById] = useState(expense?.paidById ?? currentUserId);
  const [spentAt, setSpentAt] = useState(expense?.spentAt ?? new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"EQUAL" | "EXACT">(expense?.splitType ?? "EQUAL");
  const [chosen, setChosen] = useState<Set<string>>(new Set(expense ? expense.splits.map((s) => s.userId) : members.map((m) => m.userId)));
  const [exact, setExact] = useState<Record<string, string>>(Object.fromEntries((expense?.splitType === "EXACT" ? expense.splits : []).map((s) => [s.userId, minorToText(s.originalAmountMinor ?? s.amountMinor)])));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const foreign = expCurrency !== currency;
  // Bumped by every request and by typing, so a late answer never overwrites a newer one or a typed rate.
  const rateReq = useRef(0);
  async function loadRate(date?: string) {
    const id = ++rateReq.current;
    setRateState("loading");
    try {
      const q = new URLSearchParams({ from: expCurrency, to: currency, ...(date ? { date } : {}) });
      const r = await apiFetch<RateView>(`/rates?${q}`);
      if (id !== rateReq.current) return;
      setRateText(r.rate.replace(".", ","));
      setRateDate(r.date);
      setRateManual(false);
      setRateState("idle");
    } catch {
      if (id === rateReq.current) setRateState("unavailable");
    }
  }
  // A saved rate is locked: a new one is only suggested when the currency or the date changes.
  const lockedKey = useRef(expense?.originalCurrency ? `${expense.originalCurrency}:${expense.spentAt}` : null);
  useEffect(() => {
    if (!foreign || lockedKey.current === `${expCurrency}:${spentAt}`) return;
    lockedKey.current = null;
    void loadRate(spentAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadRate only reads these two
  }, [expCurrency, spentAt, foreign]);

  const amount = parseAmount(amountText);
  const exactParts = useMemo(() => members.map((m) => ({ userId: m.userId, minor: exact[m.userId]?.trim() ? parseAmount(exact[m.userId]!) : 0 })), [members, exact]);
  const exactSum = exactParts.reduce((n, p) => n + (p.minor ?? 0), 0);
  const exactInvalid = exactParts.some((p) => p.minor === null);
  const equalShare = amount && chosen.size ? Object.values(splitEqual(amount, [...chosen]))[0]! : null;

  const rate = foreign ? parseRate(rateText) : null;
  const converted = amount !== null && rate ? convertMinor(amount, rate) : null;

  const valid = title.trim() !== "" && amount !== null && (!foreign || rate !== null) && (mode === "EQUAL" ? chosen.size > 0 : !exactInvalid && exactSum === amount);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || amount === null) return;
    const base = { title: title.trim(), amountMinor: amount, category, paidById, spentAt, currency: expCurrency, ...(foreign ? { rate, rateDate: rateDate ?? today(), rateManual } : {}) };
    const body =
      mode === "EQUAL"
        ? { ...base, splitType: "EQUAL", participants: members.filter((m) => chosen.has(m.userId)).map((m) => m.userId) }
        : { ...base, splitType: "EXACT", splits: exactParts.filter((p) => (p.minor ?? 0) > 0).map((p) => ({ userId: p.userId, amountMinor: p.minor! })) };
    await run(() => apiFetch(expense ? `/trips/${tripId}/expenses/${expense.id}` : `/trips/${tripId}/expenses`, { method: expense ? "PATCH" : "POST", body: JSON.stringify(body) }));
  }

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      dialog.current?.close();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.code : "INTERNAL");
      setPending(false);
    }
  }

  const remaining = amount === null ? null : amount - exactSum;
  const deleteButton = expense && (
    <Button
      variant="danger"
      onClick={() => {
        if (window.confirm(t("dialog.confirmDelete"))) void run(() => apiFetch(`/trips/${tripId}/expenses/${expense.id}`, { method: "DELETE" }));
      }}
    >
      {t("dialog.delete")}
    </Button>
  );

  return (
    <dialog ref={dialog} aria-labelledby="expense-title" onClose={onClose} onClick={(e) => e.target === dialog.current && dialog.current?.close()} className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-b-none rounded-t-xl bg-surface-raised p-0 text-fg shadow-lg backdrop:bg-scrim open:flex open:flex-col md:m-auto md:mt-12 md:max-h-[calc(100dvh-96px)] md:w-[min(560px,100%-32px)] md:overflow-y-auto md:rounded-xl md:open:block">
      {/* Below md the dialog is a bottom sheet: the body scrolls and the footer stays in reach. */}
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col md:block">
        <div className="flex shrink-0 items-start justify-between gap-4 p-4 pb-0 md:p-6 md:pb-0">
          <h2 id="expense-title" className="text-h3">
            {expense ? t("dialog.edit") : t("dialog.new")}
          </h2>
          <Button variant="ghost" aria-label={tc("close")} onClick={() => dialog.current?.close()} className="-mr-2 -mt-2 size-10 text-fg-secondary">
            <X size={20} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 md:overflow-visible md:px-6">
          {error && (
            <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
              {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.INTERNAL")}
            </p>
          )}
          <Field label={t("dialog.name")}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={t("dialog.namePlaceholder")} autoFocus />
          </Field>
          <div className="grid grid-cols-[1fr_96px] gap-2 md:grid-cols-[1fr_96px_1fr] md:gap-4">
            <Field label={t("dialog.amount")} error={amountText && amount === null ? t("dialog.amountInvalid") : undefined}>
              <Input value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="decimal" placeholder="1200" className={`${inputClass} font-mono font-medium`} />
            </Field>
            <Field label={t("dialog.currency")}>
              <Select value={expCurrency} onChange={(e) => setExpCurrency(e.target.value)} className="font-mono">
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <div className="col-span-2 md:col-span-1">
              <Field label={t("dialog.date")}>
                <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
              </Field>
            </div>
          </div>
          {foreign && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={t("dialog.rate", { from: expCurrency, to: currency })} error={rateText && !rate ? t("dialog.rateInvalid") : undefined}>
                    <Input
                      value={rateText}
                      onChange={(e) => {
                        rateReq.current++;
                        setRateState("idle");
                        setRateText(e.target.value);
                        setRateManual(true);
                        setRateDate(today());
                      }}
                      inputMode="decimal"
                      aria-describedby="rate-note"
                      className={`${inputClass} font-mono tabular-nums`}
                    />
                  </Field>
                </div>
                <Button variant="secondary" aria-label={t("dialog.refreshRate")} onClick={() => void loadRate()} disabled={rateState === "loading"} className="size-11 shrink-0 px-0 md:size-auto md:px-4 md:h-10">
                  <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
                  <span className="hidden md:inline">{t("dialog.refreshRate")}</span>
                </Button>
              </div>
              <p id="rate-note" role="status" className="text-caption text-fg-secondary">
                {rateState === "loading"
                  ? t("dialog.rateLoading")
                  : rateState === "unavailable"
                    ? t("dialog.rateUnavailable")
                    : [converted !== null && `≈ ${formatMoney(locale, converted, currency)}`, rate && (rateManual ? t("rateManual") : rateDate && t("rateFrom", { date: formatNumericDate(locale, rateDate) }))].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("dialog.category")}>
              <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("dialog.paidBy")}>
              <Select value={paidById} onChange={(e) => setPaidById(e.target.value)}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-small font-medium">{t("dialog.split")}</legend>
            <div className="flex gap-0.5 self-start rounded-md bg-sunken p-[3px]">
              {(["EQUAL", "EXACT"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`h-7 rounded-sm px-3 text-[13px] ${mode === m ? "bg-surface font-semibold shadow-[0_1px_2px_rgba(24,33,28,.08)]" : "font-medium text-fg-muted"}`}>
                  {t(`dialog.mode.${m}`)}
                </button>
              ))}
            </div>
            <ul className="flex flex-col gap-1">
              {members.map((m) => (
                <li key={m.userId} className="flex h-10 items-center gap-3">
                  {mode === "EQUAL" ? (
                    <label className="flex flex-1 items-center gap-2.5 text-body">
                      <input
                        type="checkbox"
                        checked={chosen.has(m.userId)}
                        onChange={(e) =>
                          setChosen((s) => {
                            const n = new Set(s);
                            if (e.target.checked) n.add(m.userId);
                            else n.delete(m.userId);
                            return n;
                          })
                        }
                        className="size-4 accent-primary"
                      />
                      {m.name}
                    </label>
                  ) : (
                    <>
                      <label htmlFor={`exact-${m.userId}`} className="flex-1 text-body">
                        {m.name}
                      </label>
                      <input id={`exact-${m.userId}`} value={exact[m.userId] ?? ""} onChange={(e) => setExact((x) => ({ ...x, [m.userId]: e.target.value }))} inputMode="decimal" placeholder="0" className={`${inputClass} w-28 text-right font-mono`} />
                    </>
                  )}
                  {mode === "EQUAL" && equalShare !== null && chosen.has(m.userId) && <span className="amount text-[13px] text-fg-muted"><Money minor={splitEqual(amount!, [...chosen])[m.userId] ?? 0} currency={expCurrency} /></span>}
                </li>
              ))}
            </ul>
            {mode === "EXACT" && remaining !== null && (
              <p role="status" className={`text-small ${remaining === 0 ? "text-success-ink" : "text-error-ink"}`}>
                {remaining === 0 ? t("dialog.balanced") : t("dialog.remaining", { amount: formatMoney(locale, Math.abs(remaining), expCurrency), sign: remaining > 0 ? "+" : "−" })}
              </p>
            )}
          </fieldset>
          {expense && <span className="md:hidden">{deleteButton}</span>}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-canvas px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 md:rounded-b-xl md:px-6">
          <span className="hidden md:block">{expense && deleteButton}</span>
          <div className="flex w-full gap-2 md:w-auto">
            <Button variant="secondary" onClick={() => dialog.current?.close()} className="h-11 flex-1 md:h-10 md:flex-none">
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || pending} className="h-11 flex-1 md:h-10 md:flex-none">
              {expense ? t("dialog.save") : t("add")}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
