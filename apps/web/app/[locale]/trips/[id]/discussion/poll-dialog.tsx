"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { Field, Input } from "@/components/field";
import { apiFetch, ClientApiError } from "@/lib/client-api";

export function PollDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const t = useTranslations("discussion.pollDialog");
  const tc = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multi, setMulti] = useState(false);
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => dialog.current?.showModal(), []);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim() !== "" && filled.length >= 2 && new Set(filled.map((o) => o.toLowerCase())).size === filled.length;

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/trips/${tripId}/polls`, {
        method: "POST",
        // End of the chosen day, local time.
        body: JSON.stringify({ question: question.trim(), options: filled, multiChoice: multi, closesAt: closesAt ? new Date(`${closesAt}T23:59:00`).toISOString() : undefined }),
      });
      dialog.current?.close();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.code : "INTERNAL");
      setPending(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="poll-title" onClose={onClose} onClick={(e) => e.target === dialog.current && dialog.current?.close()} className="m-auto mt-18 w-[min(520px,100%-32px)] rounded-xl bg-surface-raised p-0 text-fg shadow-lg backdrop:bg-scrim">
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <h2 id="poll-title" className="text-h3">
            {t("title")}
          </h2>
          <Button variant="ghost" aria-label={tc("close")} onClick={() => dialog.current?.close()} className="-mr-2 -mt-2 size-10 text-fg-secondary">
            <X size={20} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          {error && (
            <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
              {t("failed")}
            </p>
          )}
          <Field label={t("question")}>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder={t("questionPlaceholder")} autoFocus />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-small font-medium">{t("options")}</legend>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} aria-label={t("option", { n: i + 1 })} onChange={(e) => setOptions((l) => l.map((x, j) => (j === i ? e.target.value : x)))} maxLength={100} placeholder={t("optionPlaceholder", { n: i + 1 })} />
                {options.length > 2 && (
                  <Button variant="ghost" aria-label={t("removeOption", { n: i + 1 })} onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} className="size-10 shrink-0 px-0 text-fg-muted">
                    <X size={16} strokeWidth={1.5} aria-hidden />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button variant="ghost" size="sm" onClick={() => setOptions((l) => [...l, ""])} className="self-start">
                <Plus size={16} strokeWidth={1.5} aria-hidden />
                {t("addOption")}
              </Button>
            )}
          </fieldset>
          <div className="grid grid-cols-2 items-end gap-4">
            <label className="flex h-10 items-center gap-2.5 text-body">
              <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="size-4 accent-primary" />
              {t("multi")}
            </label>
            <Field label={t("closes")}>
              <Input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 rounded-b-xl border-t bg-canvas px-6 py-4">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={!valid || pending}>
            {t("create")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
