"use client";

import { createTripSchema, dedupeDestinations, MAX_DESTINATIONS, type DestinationInput } from "@triptogether/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/button";
import { DestinationPicker } from "@/components/trip/destination-picker";
import { Field, Input, Select } from "@/components/field";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";

const CURRENCIES = ["UAH", "EUR", "USD", "PLN"];

export function NewTripForm() {
  const t = useTranslations();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [destinations, setDestinations] = useState<DestinationInput[]>([]);
  const [draft, setDraft] = useState("");

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    // Typed text that was never confirmed with Enter still counts.
    const name = draft.trim();
    const all = name && destinations.length < MAX_DESTINATIONS ? dedupeDestinations([...destinations, { name }]) : destinations;
    const parsed = createTripSchema.safeParse({ ...raw, destinations: all });
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
      <DestinationPicker value={destinations} onChange={setDestinations} draft={draft} onDraftChange={setDraft} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("newTrip.start")} error={fieldError("startDate")}>
          <Input type="date" name="startDate" required />
        </Field>
        <Field label={t("newTrip.end")} error={fieldError("endDate")}>
          <Input type="date" name="endDate" required />
        </Field>
      </div>
      <Field label={t("newTrip.currency")}>
        <Select name="currency" defaultValue="UAH">
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
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
