"use client";

import { useLocale } from "next-intl";
import { moneyParts } from "@/lib/format";

/** Amount in mono digits with a smaller sans currency symbol: the symbol glyph of the mono font is far larger than its digits. */
export function Money({ minor, currency, signed = false }: { minor: number; currency: string; signed?: boolean }) {
  const locale = useLocale();
  const sign = signed ? (minor > 0 ? "+" : minor < 0 ? "\u2212" : "") : "";
  return (
    <>
      {sign}
      {moneyParts(locale, Math.abs(minor), currency).map((p, i) =>
        p.type === "currency" ? (
          <span key={i} className="font-sans text-[0.85em] font-medium">
            {p.value}
          </span>
        ) : (
          p.value
        ),
      )}
    </>
  );
}
