"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/field";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";

export function DeleteTripDialog({ tripId, title }: { tripId: string; title: string }) {
  const t = useTranslations();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/trips/${tripId}`, { method: "DELETE" });
      router.replace("/trips");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.code : "INTERNAL");
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => dialog.current?.showModal()}>
        {t("settings.delete")}
      </Button>
      <dialog ref={dialog} aria-labelledby="delete-title" className="m-auto mt-18 w-[min(440px,100%-32px)] rounded-xl bg-surface-raised p-6 text-fg shadow-lg backdrop:bg-scrim">
        <h2 id="delete-title" className="text-h3">
          {t("settings.deleteConfirmTitle")}
        </h2>
        <p className="mt-2 text-body text-fg-secondary">{t("settings.deleteConfirmText", { title })}</p>
        <label className="mt-4 flex flex-col gap-1.5 text-small font-medium">
          {t("settings.deleteTypeLabel", { title })}
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
            {t(`errors.${error}`)}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={typed.trim() !== title || pending} onClick={remove}>
            {t("settings.delete")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
