/** Date range like "14–18 липня" (uk) / "Jul 14–18" (en), from ISO dates. */
export function formatRange(locale: string, startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const parts = fmt.formatRangeToParts(start, end);
  return parts.map((p) => p.value).join("");
}

/** Amount in minor units with the trip currency, e.g. "7 200,00 ₴". */
export function formatMoney(locale: string, amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}
