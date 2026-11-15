/** All amounts are integers in minor units (cents). No floats anywhere. */

export const MAX_AMOUNT_MINOR = 2_000_000_000; // stays inside Postgres Int

/** Equal split. The remainder goes one minor unit each to the first participants, so the parts always sum to the total. */
export function splitEqual(amountMinor: number, userIds: string[]): Record<string, number> {
  const n = userIds.length;
  if (n === 0) throw new Error("no participants");
  const base = Math.floor(amountMinor / n);
  const rest = amountMinor - base * n;
  return Object.fromEntries(userIds.map((id, i) => [id, base + (i < rest ? 1 : 0)]));
}

export interface ExpenseLike {
  paidById: string;
  amountMinor: number;
  splits: { userId: string; amountMinor: number }[];
}

export interface Balance {
  userId: string;
  paid: number;
  owed: number;
  /** paid - owed: positive = others owe you, negative = you owe. */
  balance: number;
}

export function computeBalances(expenses: ExpenseLike[], memberIds: string[]): Balance[] {
  const map = new Map<string, Balance>(memberIds.map((id) => [id, { userId: id, paid: 0, owed: 0, balance: 0 }]));
  const get = (id: string) => map.get(id) ?? map.set(id, { userId: id, paid: 0, owed: 0, balance: 0 }).get(id)!;
  for (const e of expenses) {
    get(e.paidById).paid += e.amountMinor;
    for (const s of e.splits) get(s.userId).owed += s.amountMinor;
  }
  for (const b of map.values()) b.balance = b.paid - b.owed;
  return [...map.values()];
}

export interface Transfer {
  from: string;
  to: string;
  amountMinor: number;
}

/** Greedy matching of the largest debtor with the largest creditor: at most (people - 1) transfers. */
export function settle(balances: Pick<Balance, "userId" | "balance">[]): Transfer[] {
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ id: b.userId, left: -b.balance }));
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ id: b.userId, left: b.balance }));
  const out: Transfer[] = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.left - a.left);
    creditors.sort((a, b) => b.left - a.left);
    const d = debtors[0]!;
    const c = creditors[0]!;
    const amount = Math.min(d.left, c.left);
    out.push({ from: d.id, to: c.id, amountMinor: amount });
    d.left -= amount;
    c.left -= amount;
    if (d.left === 0) debtors.shift();
    if (c.left === 0) creditors.shift();
  }
  return out;
}

/** "1 200,50" / "1200.5" / "7200" -> minor units, or null when invalid, zero or too large. */
export function parseAmount(input: string): number | null {
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.replace(/[\s  ]/g, ""));
  if (!m) return null;
  const minor = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return minor > 0 && minor <= MAX_AMOUNT_MINOR ? minor : null;
}

/**
 * Currencies a trip or an expense can use. Every amount in the app is stored as 1/100 of the unit,
 * including JPY (Intl then prints it without decimals when whole), so conversion never needs per-currency digits.
 */
export const CURRENCIES = ["UAH", "EUR", "USD", "PLN", "GBP", "CHF", "CZK", "HUF", "RON", "BGN", "TRY", "GEL", "MDL", "SEK", "NOK", "DKK", "JPY", "CAD", "AUD", "AED"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Rate as a decimal string: default-currency units per 1 unit of the expense currency, up to 10 decimals (Postgres Decimal(20,10)). */
export const RATE_PATTERN = /^\d{1,10}(\.\d{1,10})?$/;
const RATE_SCALE = 10n ** 10n;

function rateToScaled(rate: string): bigint {
  if (!RATE_PATTERN.test(rate)) throw new Error(`bad rate ${rate}`);
  const [whole, frac = ""] = rate.split(".");
  return BigInt(whole!) * RATE_SCALE + BigInt(frac.padEnd(10, "0"));
}

/** Float from a rates API to a rate string; null when it is not a positive number. */
export function rateFromNumber(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0 || n >= 1e10) return null;
  const s = n.toFixed(10).replace(/\.?0+$/, "");
  return s === "0" ? null : s;
}

/** minor × rate, rounded half up. Integer maths only. */
export function convertMinor(minor: number, rate: string): number {
  return Number((BigInt(minor) * rateToScaled(rate) + RATE_SCALE / 2n) / RATE_SCALE);
}

/**
 * Converts exact shares so they still add up: the total is rounded once, every share is floored,
 * and the leftover minor units go one each to the first shares (same rule as splitEqual).
 */
export function convertShares<T extends { amountMinor: number }>(shares: T[], rate: string): { total: number; shares: (T & { convertedMinor: number })[] } {
  const scaled = rateToScaled(rate);
  const total = convertMinor(shares.reduce((n, s) => n + s.amountMinor, 0), rate);
  const floored = shares.map((s) => Number((BigInt(s.amountMinor) * scaled) / RATE_SCALE));
  let rest = total - floored.reduce((n, v) => n + v, 0);
  return { total, shares: shares.map((s, i) => ({ ...s, convertedMinor: floored[i]! + (rest-- > 0 ? 1 : 0) })) };
}
