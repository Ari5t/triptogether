"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = [
  { code: "uk", label: "УКР" },
  { code: "en", label: "EN" },
] as const;

/** Segmented control (DESIGN.md §6.8). */
export function LocaleSwitch() {
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex gap-0.5 rounded-md bg-sunken p-[3px]">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={current === code}
          lang={code}
          onClick={() => router.replace(pathname, { locale: code })}
          className={`h-7 rounded-sm px-2.5 text-[12px] ${current === code ? "bg-surface font-semibold text-fg shadow-[0_1px_2px_rgba(24,33,28,.08)]" : "font-medium text-fg-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
