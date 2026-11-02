"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { EXPENSE_CATEGORIES, parseAmount, splitEqual, type ExpenseCategory, type Member } from "@triptogether/shared";
import { Button } from "@/components/button";
import { Field, Input, Select, inputClass } from "@/components/field";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
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

export function ExpenseDialog({ tripId, members, currency, currentUserId, expense, onClose }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState(expense?.title ?? "");
  const [amountText, setAmountText] = useState(expense ? minorToText(expense.amountMinor) : "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "OTHER");
  const [paidById, setPaidById] = useState(expense?.paidById ?? currentUserId);
  const [spentAt, setSpentAt] = useState(expense?.spentAt ?? new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"EQUAL" | "EXACT">(expense?.splitType ?? "EQUAL");
  const [chosen, setChosen] = useState<Set<string>>(new Set(expense ? expense.splits.map((s) => s.userId) : members.map((m) => m.userId)));
  const [exact, setExact] = useState<Record<string, string>>(Object.fromEntries((expense?.splitType === "EXACT" ? expense.splits : []).map((s) => [s.userId, minorToText(s.amountMinor)])));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const amount = parseAmount(amountText);
  const exactParts = useMemo(() => members.map((m) => ({ userId: m.userId, minor: exact[m.userId]?.trim() ? parseAmount(exact[m.userId]!) : 0 })), [members, exact]);
  const exactSum = exactParts.reduce((n, p) => n + (p.minor ?? 0), 0);
  const exactInvalid = exactParts.some((p) => p.minor === null);
  const equalShare = amount && chosen.size ? Object.values(splitEqual(amount, [...chosen]))[0]! : null;

  const valid = title.trim() !== "" && amount !== null && (mode === "EQUAL" ? chosen.size > 0 : !exactInvalid && exactSum === amount);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || amount === null) return;
    const base = { title: title.trim(), amountMinor: amount, category, paidById, spentAt };
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

  return (
    <dialog ref={dialog} aria-labelledby="expense-title" onClose={onClose} onClick={(e) => e.target === dialog.current && dialog.current?.close()} className="m-auto mt-12 max-h-[calc(100dvh-96px)] w-[min(560px,100%-32px)] overflow-y-auto rounded-xl bg-surface-raised p-0 text-fg shadow-lg backdrop:bg-scrim">
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <h2 id="expense-title" className="text-h3">
            {expense ? t("dialog.edit") : t("dialog.new")}
          </h2>
          <Button variant="ghost" aria-label={tc("close")} onClick={() => dialog.current?.close()} className="-mr-2 -mt-2 size-10 text-fg-secondary">
            <X size={20} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {error && (
            <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
              {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.INTERNAL")}
            </p>
          )}
          <Field label={t("dialog.name")}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={t("dialog.namePlaceholder")} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${t("dialog.amount")} (${currency})`} error={amountText && amount === null ? t("dialog.amountInvalid") : undefined}>
              <Input value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="decimal" placeholder="1200" className={`${inputClass} font-mono font-medium`} />
            </Field>
            <Field label={t("dialog.date")}>
              <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
            </Field>
          </div>
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
                  {mode === "EQUAL" && equalShare !== null && chosen.has(m.userId) && <span className="amount text-[13px] text-fg-muted"><Money minor={splitEqual(amount!, [...chosen])[m.userId] ?? 0} currency={currency} /></span>}
                </li>
              ))}
            </ul>
            {mode === "EXACT" && remaining !== null && (
              <p role="status" className={`text-small ${remaining === 0 ? "text-success-ink" : "text-error-ink"}`}>
                {remaining === 0 ? t("dialog.balanced") : t("dialog.remaining", { amount: formatMoney(locale, Math.abs(remaining), currency), sign: remaining > 0 ? "+" : "−" })}
              </p>
            )}
          </fieldset>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-b-xl border-t bg-canvas px-6 py-4">
          {expense ? (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm(t("dialog.confirmDelete"))) void run(() => apiFetch(`/trips/${tripId}/expenses/${expense.id}`, { method: "DELETE" }));
              }}
            >
              {t("dialog.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => dialog.current?.close()}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || pending}>
              {expense ? t("dialog.save") : t("add")}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
