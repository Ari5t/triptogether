"use client";

import { dedupeDestinations, MAX_DESTINATIONS, updateTripSchema, type DestinationInput } from "@triptogether/shared";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Button } from "@/components/button";
import { Field, Input } from "@/components/field";
import { Toast } from "@/components/toast";
import { DestinationPicker } from "@/components/trip/destination-picker";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";

interface Props {
  trip: { id: string; title: string; destinations: DestinationInput[]; startDate: string; endDate: string; stopCount: number };
}

export function TripSettingsForm({ trip }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string | null }>({ id: 0, message: null });
  const hideToast = useCallback(() => setToast((x) => ({ ...x, message: null })), []);
  const [pending, setPending] = useState(false);
  const [destinations, setDestinations] = useState(trip.destinations);
  const [draft, setDraft] = useState("");
  const [start, setStart] = useState(trip.startDate);
  const [dateMode, setDateMode] = useState<"shift" | "calendar">("shift");
  // Moving the start only matters for the plan when there are stops to move.
  const askMode = start !== trip.startDate && trip.stopCount > 0;

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const name = draft.trim();
    const all = name && destinations.length < MAX_DESTINATIONS ? dedupeDestinations([...destinations, { name }]) : destinations;
    const changed = {
      ...(raw.title !== trip.title && { title: raw.title }),
      ...(JSON.stringify(all) !== JSON.stringify(trip.destinations) && { destinations: all }),
      ...(raw.startDate !== trip.startDate && { startDate: raw.startDate }),
      ...(raw.endDate !== trip.endDate && { endDate: raw.endDate }),
    };
    // endDate is validated against startDate, so send both when either moved.
    const body = changed.startDate || changed.endDate ? { ...changed, startDate: raw.startDate, endDate: raw.endDate, dateMode: askMode ? dateMode : "calendar" } : changed;
    const parsed = updateTripSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    if (Object.keys(body).length === 0) return;
    setPending(true);
    try {
      await apiFetch(`/trips/${trip.id}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
      setToast((x) => ({ id: x.id + 1, message: t("settings.saved") }));
      router.refresh();
    } catch (err) {
      setFormError(err instanceof ClientApiError ? err.code : "INTERNAL");
    }
    setPending(false);
  }

  const fieldError = (name: string) => (errors[name] ? t(errors[name] === "END_BEFORE_START" ? "newTrip.endBeforeStart" : "newTrip.invalid") : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field label={t("newTrip.name")} error={fieldError("title")}>
        <Input name="title" required maxLength={120} defaultValue={trip.title} />
      </Field>
      <DestinationPicker value={destinations} onChange={setDestinations} draft={draft} onDraftChange={setDraft} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("newTrip.start")} error={fieldError("startDate")}>
          <Input type="date" name="startDate" required defaultValue={trip.startDate} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label={t("newTrip.end")} error={fieldError("endDate")}>
          <Input type="date" name="endDate" required defaultValue={trip.endDate} />
        </Field>
      </div>
      {askMode && (
        <fieldset className="flex flex-col gap-2 rounded-lg border p-4">
          <legend className="px-1 text-small font-medium">{t("settings.dateModeLegend")}</legend>
          {(["shift", "calendar"] as const).map((m) => (
            <label key={m} className="flex items-start gap-2 text-body">
              <input type="radio" name="dateMode" value={m} checked={dateMode === m} onChange={() => setDateMode(m)} className="mt-1" />
              <span>
                <span className="font-medium">{t(`settings.dateMode.${m}`)}</span>
                <span className="block text-small text-fg-muted">{t(`settings.dateMode.${m}Hint`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {formError && (
        <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
          {t(`errors.${formError}`)}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {t("settings.save")}
        </Button>
      </div>
      <Toast message={toast.message} id={toast.id} onDone={hideToast} />
    </form>
  );
}
