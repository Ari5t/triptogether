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

/** Phone cycle order: light, dark, system, light... */
const NEXT = { light: "dark", dark: "system", system: "light" } as const;

const noop = () => () => {};

/** System / light / dark, styled like the locale switch (DESIGN.md §6.8). */
export function ThemeSwitch() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  // The stored choice is only known in the browser: render nothing as pressed on the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const current = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const CurrentIcon = THEMES.find((x) => x.value === current)!.Icon;
  return (
    <>
      {/* Below sm: one button showing the current theme; each click moves to the next one. */}
      <button
        type="button"
        aria-label={`${t("label")}: ${t(current)}`}
        title={t(current)}
        onClick={() => setTheme(NEXT[current])}
        className="grid size-9 place-items-center rounded-md bg-sunken text-fg sm:hidden"
      >
        <CurrentIcon size={16} strokeWidth={1.5} aria-hidden />
      </button>
      <div role="group" aria-label={t("label")} className="hidden gap-0.5 rounded-md bg-sunken p-[3px] sm:flex">
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
    </>
  );
}
