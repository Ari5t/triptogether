"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptButton({ token, locale, tripId, alreadyMember }: { token: string; locale: string; tripId: string; alreadyMember: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/invites/${encodeURIComponent(token)}/accept`, { method: "POST", credentials: "include" });
    if (res.ok || res.status === 409) {
      router.push(`/${locale}/trips`);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { code?: string };
    setError(body.code ?? "INTERNAL");
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-lg bg-error-subtle p-3 text-body font-medium text-error-ink">
          {t(`errors.${error}`)}
        </p>
      )}
      <button
        type="button"
        onClick={alreadyMember ? () => router.push(`/${locale}/trips`) : accept}
        disabled={pending}
        data-trip={tripId}
        className="h-11 self-start rounded-md bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:bg-border disabled:text-fg-faint"
      >
        {alreadyMember ? t("invite.open") : t("invite.accept")}
      </button>
    </div>
  );
}
