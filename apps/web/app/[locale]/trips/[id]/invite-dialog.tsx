"use client";

import { Check, Copy, Link as LinkIcon, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { Member } from "@triptogether/shared";
import { Button } from "@/components/button";
import { Select } from "@/components/field";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ClientApiError } from "@/lib/client-api";

type InviteRole = "EDITOR" | "VIEWER";
interface CreatedInvite {
  id: string;
  url: string;
  expiresAt: string;
}

export function InviteDialog({ tripId, members, currentUserId }: { tripId: string; members: Member[]; currentUserId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [role, setRole] = useState<InviteRole>("EDITOR");
  const [days, setDays] = useState(7);
  const [invite, setInvite] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.code : "INTERNAL");
    }
  }

  const create = () =>
    run(async () => {
      if (invite) await apiFetch(`/trips/${tripId}/invites/${invite.id}`, { method: "DELETE" });
      setInvite(await apiFetch<CreatedInvite>(`/trips/${tripId}/invites`, { method: "POST", body: JSON.stringify({ role, expiresInDays: days }) }));
      setCopied(false);
    });

  const copy = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.url);
    setCopied(true);
  };

  const changeRole = (userId: string, next: InviteRole) =>
    run(async () => {
      await apiFetch(`/trips/${tripId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role: next }) });
      router.refresh();
    });

  const remove = (userId: string) =>
    run(async () => {
      await apiFetch(`/trips/${tripId}/members/${userId}`, { method: "DELETE" });
      router.refresh();
    });

  return (
    <>
      <Button onClick={() => dialog.current?.showModal()} size="sm" className="h-9 max-md:size-9 max-md:px-0">
        <UserPlus size={16} strokeWidth={1.5} aria-hidden />
        <span className="max-md:sr-only">{t("invite.button")}</span>
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="invite-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto mt-18 w-[min(560px,100%-32px)] rounded-xl bg-surface-raised p-0 text-fg shadow-lg backdrop:bg-scrim"
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <div>
            <h2 id="invite-title" className="text-h3">
              {t("invite.dialogTitle")}
            </h2>
            <p className="text-body text-fg-secondary">{t("invite.dialogSubtitle")}</p>
          </div>
          <Button variant="ghost" aria-label={t("common.close")} onClick={() => dialog.current?.close()} className="-mr-2 -mt-2 size-10 text-fg-secondary">
            <X size={20} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          {error && (
            <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
              {t(`errors.${error}`)}
            </p>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-small font-medium">{t("invite.roleLegend")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["EDITOR", "VIEWER"] as const).map((r) => (
                <label key={r} className={`flex cursor-pointer gap-2.5 rounded-[10px] border p-3 ${role === r ? "border-primary shadow-[0_0_0_3px_var(--primary-muted)]" : ""}`}>
                  <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="mt-0.5 size-4 accent-primary" />
                  <span className="flex flex-col">
                    <span className="text-body font-semibold">{t(`trips.role.${r}`)}</span>
                    <span className="text-[12px] leading-[17px] text-fg-secondary">{t(`invite.roleDesc.${r}`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-small font-medium">
            {t("invite.expiry")}
            <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 7, 30].map((d) => (
                <option key={d} value={d}>
                  {t("invite.days", { count: d })}
                </option>
              ))}
            </Select>
          </label>

          {invite ? (
            <div className="flex flex-col gap-2">
              <span className="text-small font-medium">{t("invite.link")}</span>
              <div className="flex gap-2">
                <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-border-strong bg-sunken px-3">
                  <LinkIcon size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-fg-muted" />
                  <input readOnly value={invite.url} aria-label={t("invite.link")} className="min-w-0 flex-1 bg-transparent font-mono text-body font-medium" onFocus={(e) => e.currentTarget.select()} />
                </div>
                <Button onClick={copy} size="lg">
                  {copied ? <Check size={16} strokeWidth={1.5} aria-hidden /> : <Copy size={16} strokeWidth={1.5} aria-hidden />}
                  {copied ? t("invite.copied") : t("invite.copy")}
                </Button>
              </div>
              <p className="text-small text-fg-muted">{t("invite.validUntil", { date: new Date(invite.expiresAt).toLocaleString() })}</p>
              <Button variant="danger" onClick={create} className="self-start">
                {t("invite.reset")}
              </Button>
            </div>
          ) : (
            <Button onClick={create} size="lg" className="self-start">
              <LinkIcon size={16} strokeWidth={1.5} aria-hidden />
              {t("invite.create")}
            </Button>
          )}
        </div>

        <div className="border-t px-6 pb-4 pt-4">
          <p className="label mb-2">{t("invite.members", { count: members.length })}</p>
          <ul className="flex flex-col">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-md px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">
                    {m.name}
                    {m.userId === currentUserId && <span className="font-normal text-fg-muted"> · {t("invite.you")}</span>}
                  </p>
                  <p className="truncate text-[12px] text-fg-muted">{m.email}</p>
                </div>
                {m.role === "OWNER" ? (
                  <span className="rounded-sm bg-primary-100 px-2 text-[12px] font-semibold leading-6 text-primary-800">{t("trips.role.OWNER")}</span>
                ) : (
                  <>
                    <select aria-label={t("invite.roleOf", { name: m.name })} value={m.role} onChange={(e) => changeRole(m.userId, e.target.value as InviteRole)} className="h-9 rounded-md bg-transparent px-2 text-small font-medium hover:bg-sunken">
                      <option value="EDITOR">{t("trips.role.EDITOR")}</option>
                      <option value="VIEWER">{t("trips.role.VIEWER")}</option>
                    </select>
                    <Button variant="ghost" size="sm" aria-label={t("invite.remove", { name: m.name })} onClick={() => remove(m.userId)} className="size-9 px-0 text-error-ink">
                      <X size={16} strokeWidth={1.5} aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end rounded-b-xl border-t bg-canvas px-6 py-4">
          <Button variant="secondary" onClick={() => dialog.current?.close()} className="px-[18px]">
            {t("invite.done")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
