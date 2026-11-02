/** Date range like "14–18 липня" (uk) / "Jul 14–18" (en), from ISO dates. */
export function formatRange(locale: string, startIso: string, endIso: string, withYear = false): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat(locale, withYear ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "long", timeZone: "UTC" });
  const text = fmt.formatRange(start, end);
  // Design shows "8–11 серп. 2025", without the Ukrainian "р." year suffix.
  return text.replace(/\s?р\.$/, "");
}

/** Amount in minor units with the trip currency, e.g. "7 200,00 ₴". */
export function formatMoney(locale: string, amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}
