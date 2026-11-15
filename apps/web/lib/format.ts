/** Date range like "14–18 липня" (uk) / "Jul 14–18" (en), from ISO dates. */
export function formatRange(locale: string, startIso: string, endIso: string, withYear = false): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat(locale, withYear ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "long", timeZone: "UTC" });
  // Node and browsers ship different ICU/CLDR versions, which put different spaces (thin, narrow no-break, regular) around the dash: unify them or SSR and client text differ and hydration fails.
  const text = fmt.formatRange(start, end).replace(/[   ]/g, " ");
  // Design shows "8–11 серп. 2025", without the Ukrainian "р." year suffix.
  return text.replace(/\s?р\.$/, "");
}

const moneyFmt = (locale: string, currency: string, whole: boolean) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });

/** Amount in minor units with the trip currency, e.g. "7 200 ₴" or "1 234,50 ₴". */
export function formatMoney(locale: string, amountMinor: number, currency: string): string {
  return moneyFmt(locale, currency, amountMinor % 100 === 0).format(amountMinor / 100);
}

/** Balances always carry a sign: "+4 280 ₴", "−780 ₴" (true minus, DESIGN.md §3.3). */
export function formatSigned(locale: string, amountMinor: number, currency: string): string {
  const text = formatMoney(locale, Math.abs(amountMinor), currency);
  return `${amountMinor > 0 ? "+" : amountMinor < 0 ? "\u2212" : ""}${text}`;
}

/** "14 лип" / "Jul 14" from an ISO date. */
export function formatShortDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/** "01.11.2026" / "11/01/2026" from an ISO date: rate dates need the year. */
export function formatNumericDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Rate read the natural way, "1 € = 50,04 ₴", flipped when needed so the left side is the stronger currency
 * (never "1 ₴ = 0,0199 €"). Display only: maths uses the stored rate string.
 */
export function formatRateLine(locale: string, rate: string, from: string, to: string): string {
  const r = Number(rate);
  const [one, other, value] = r >= 1 ? [from, to, r] : [to, from, 1 / r];
  const unit = new Intl.NumberFormat(locale, { style: "currency", currency: one, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(1);
  const amount = new Intl.NumberFormat(locale, { style: "currency", currency: other, currencyDisplay: "narrowSymbol", minimumFractionDigits: 2, maximumFractionDigits: value < 10 ? 4 : 2 }).format(value);
  return `${unit} = ${amount}`;
}

/** Pieces of a formatted amount, so the currency symbol can be styled apart from the digits. */
export function moneyParts(locale: string, amountMinor: number, currency: string) {
  return moneyFmt(locale, currency, amountMinor % 100 === 0).formatToParts(amountMinor / 100);
}

/** Destination chips as one line: "Яремче · Говерла · Львів". */
export const destinationsText = (list: { name: string }[]) => list.map((d) => d.name).join(" · ");
