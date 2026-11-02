/** Date range like "14–18 липня" (uk) / "Jul 14–18" (en), from ISO dates. */
export function formatRange(locale: string, startIso: string, endIso: string, withYear = false): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat(locale, withYear ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "long", timeZone: "UTC" });
  const text = fmt.formatRange(start, end);
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

/** Pieces of a formatted amount, so the currency symbol can be styled apart from the digits. */
export function moneyParts(locale: string, amountMinor: number, currency: string) {
  return moneyFmt(locale, currency, amountMinor % 100 === 0).formatToParts(amountMinor / 100);
}
