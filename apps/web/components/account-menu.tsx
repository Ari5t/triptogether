"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { apiFetch } from "@/lib/client-api";

/** Header avatar that opens a native popover with the signed-in user and a sign-out button. */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
      window.location.assign(`/${locale}`); // hard navigation drops the router cache of signed-in pages
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        popoverTarget="account-menu"
        aria-label={t("open")}
        aria-haspopup="menu"
        className="grid size-11 [anchor-name:--account] place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar name={name} color="var(--p-blue)" size={36} />
      </button>
      <div
        id="account-menu"
        popover="auto"
        className="fixed inset-auto top-[anchor(bottom)] right-[anchor(right)] m-0 mt-1 [position-anchor:--account] w-[min(260px,calc(100vw-32px))] rounded-[10px] border bg-surface-raised p-1 text-fg shadow-md"
      >
        <div className="flex items-center gap-3 p-2">
          <Avatar name={name} color="var(--p-blue)" size={32} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold break-words">{name}</p>
            <p className="text-[12px] break-words text-fg-muted">{email}</p>
          </div>
        </div>
        <div className="my-1 border-t" />
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-[14px] hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        >
          <LogOut size={16} strokeWidth={1.5} aria-hidden />
          {t("signOut")}
        </button>
        {failed && (
          <p role="alert" className="mt-1 rounded-sm bg-error-subtle p-2 text-[12px] font-medium text-error-ink">
            {t("signOutError")}
          </p>
        )}
      </div>
    </>
  );
}
