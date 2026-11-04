"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const THEMES = [
  { value: "system", Icon: Monitor },
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
] as const;

const noop = () => () => {};

/** System / light / dark, styled like the locale switch (DESIGN.md §6.8). */
export function ThemeSwitch() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  // The stored choice is only known in the browser: render nothing as pressed on the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return (
    <div role="group" aria-label={t("label")} className="flex gap-0.5 rounded-md bg-sunken p-[3px]">
      {THEMES.map(({ value, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={t(value)}
            title={t(value)}
            onClick={() => setTheme(value)}
            className={`grid h-7 w-8 place-items-center rounded-sm ${active ? "bg-surface text-fg shadow-[0_1px_2px_rgba(24,33,28,.08)]" : "text-fg-muted"}`}
          >
            <Icon size={16} strokeWidth={1.5} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
