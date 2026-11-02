"use client";

import { createTripSchema } from "@triptogether/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/button";
import { Field, Input, inputClass } from "@/components/field";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";

const CURRENCIES = ["UAH", "EUR", "USD", "PLN"];

export function NewTripForm() {
  const t = useTranslations();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = createTripSchema.safeParse({ ...raw, destination: raw.destination || undefined });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      const trip = await apiFetch<{ id: string }>("/trips", { method: "POST", body: JSON.stringify(parsed.data) });
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setFormError(err instanceof ClientApiError ? err.code : "INTERNAL");
      setPending(false);
    }
  }

  const fieldError = (name: string) => (errors[name] ? t(errors[name] === "END_BEFORE_START" ? "newTrip.endBeforeStart" : "newTrip.invalid") : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field label={t("newTrip.name")} error={fieldError("title")}>
        <Input name="title" required maxLength={120} placeholder={t("newTrip.namePlaceholder")} />
      </Field>
      <Field label={t("newTrip.destination")}>
        <Input name="destination" maxLength={160} placeholder={t("newTrip.destinationPlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("newTrip.start")} error={fieldError("startDate")}>
          <Input type="date" name="startDate" required />
        </Field>
        <Field label={t("newTrip.end")} error={fieldError("endDate")}>
          <Input type="date" name="endDate" required />
        </Field>
      </div>
      <Field label={t("newTrip.currency")}>
        <select name="currency" defaultValue="UAH" className={inputClass}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {formError && (
        <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
          {t(`errors.${formError}`)}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {t("newTrip.create")}
        </Button>
        <Link href="/trips" className={buttonClass("secondary")}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
