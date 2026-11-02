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
