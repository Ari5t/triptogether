"use client";

import { Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** Shown after a trip you were in was deleted; closing it also drops `?deleted=1` so a reload does not bring it back. */
export function DeletedNotice() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <p role="status" className="flex items-center gap-3 rounded-lg bg-sunken p-3 text-body">
      <Info size={20} strokeWidth={1.5} aria-hidden className="shrink-0 text-fg-muted" />
      <span className="flex-1">{t("trips.deletedNotice")}</span>
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => {
          setOpen(false);
          router.replace("/trips");
        }}
        className="grid size-8 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-border"
      >
        <X size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </p>
  );
}
