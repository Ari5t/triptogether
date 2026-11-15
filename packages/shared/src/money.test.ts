import { describe, expect, it } from "vitest";
import { computeBalances, convertMinor, convertShares, parseAmount, rateFromNumber, settle, splitEqual } from "./money.js";

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe("splitEqual", () => {
  it("gives the remainder to the first participants and always sums to the total", () => {
    expect(splitEqual(1000, ["a", "b", "c"])).toEqual({ a: 334, b: 333, c: 333 });
    expect(splitEqual(1, ["a", "b", "c"])).toEqual({ a: 1, b: 0, c: 0 });
    for (const [amount, n] of [[100, 7], [999_999, 13], [3, 2]] as const) {
      const parts = splitEqual(amount, Array.from({ length: n }, (_, i) => `u${i}`));
      expect(sum(parts)).toBe(amount);
      expect(Math.max(...Object.values(parts)) - Math.min(...Object.values(parts))).toBeLessThanOrEqual(1);
    }
  });
  it("rejects no participants", () => expect(() => splitEqual(100, [])).toThrow());
});

// Seed data from docs/design/DESIGN.md §7.8, in kopiykas.
const people = ["oksana", "taras", "marta", "andrii"];
const eq = (paidById: string, uah: number) => ({ paidById, amountMinor: uah * 100, splits: Object.entries(splitEqual(uah * 100, people)).map(([userId, amountMinor]) => ({ userId, amountMinor })) });
const expenses = [eq("oksana", 3280), eq("taras", 7200), eq("marta", 2140), eq("taras", 2860), eq("andrii", 1600), eq("marta", 2400), eq("oksana", 1720), eq("andrii", 1920)];

describe("computeBalances + settle (design seed data)", () => {
  const balances = computeBalances(expenses, people);
  const byId = Object.fromEntries(balances.map((b) => [b.userId, b]));

  it("matches the balances in the design", () => {
    expect(byId.oksana!.paid).toBe(500_000);
    expect(byId.oksana!.balance).toBe(-78_000);
    expect(byId.taras!.balance).toBe(428_000);
    expect(byId.marta!.balance).toBe(-124_000);
    expect(byId.andrii!.balance).toBe(-226_000);
    expect(balances.reduce((n, b) => n + b.balance, 0)).toBe(0);
  });

  it("settles with three transfers to Taras", () => {
    const t = settle(balances);
    expect(t).toHaveLength(3);
    expect(t.every((x) => x.to === "taras")).toBe(true);
    expect(Object.fromEntries(t.map((x) => [x.from, x.amountMinor]))).toEqual({ oksana: 78_000, marta: 124_000, andrii: 226_000 });
  });
});

describe("settle", () => {
  it("is empty when everyone is even", () => expect(settle([{ userId: "a", balance: 0 }, { userId: "b", balance: 0 }])).toEqual([]));
  it("uses at most n-1 transfers and zeroes every balance", () => {
    const bal = [{ userId: "a", balance: -500 }, { userId: "b", balance: -300 }, { userId: "c", balance: 600 }, { userId: "d", balance: 200 }];
    const t = settle(bal);
    expect(t.length).toBeLessThanOrEqual(3);
    const after = new Map(bal.map((b) => [b.userId, b.balance]));
    for (const x of t) {
      after.set(x.from, after.get(x.from)! + x.amountMinor);
      after.set(x.to, after.get(x.to)! - x.amountMinor);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
  });
});

describe("parseAmount", () => {
  it.each([
    ["7200", 720_000],
    ["1 200,50", 120_050],
    ["12.5", 1250],
    ["0,05", 5],
    ["7 200", 720_000],
  ])("parses %s", (input, minor) => expect(parseAmount(input)).toBe(minor));
  it.each(["", "abc", "0", "0,00", "-5", "1,234", "99999999999"])("rejects %s", (input) => expect(parseAmount(input)).toBeNull());
});

describe("currency conversion", () => {
  it("converts the design example: 35 EUR at 50.2551 is 1 758,93 UAH", () => {
    expect(convertMinor(3500, "50.2551")).toBe(175893);
  });
  it("rounds half up and handles rates below one", () => {
    expect(convertMinor(1, "0.5")).toBe(1);
    expect(convertMinor(1, "0.4999999999")).toBe(0);
    expect(convertMinor(10000, "0.0243")).toBe(243);
  });
  it("keeps exact shares adding up to the converted total", () => {
    const { total, shares } = convertShares([{ userId: "a", amountMinor: 1 }, { userId: "b", amountMinor: 1 }, { userId: "c", amountMinor: 1 }], "1.5");
    expect(total).toBe(5); // 3 × 1.5 = 4.5 → 5
    expect(shares.map((s) => s.convertedMinor)).toEqual([2, 2, 1]);
    const big = convertShares([{ amountMinor: 2000 }, { amountMinor: 1500 }], "50.2551");
    expect(big.shares.reduce((n, s) => n + s.convertedMinor, 0)).toBe(big.total);
    expect(big.total).toBe(175893);
  });
  it("turns API floats into rate strings", () => {
    expect(rateFromNumber(50.25510000001)).toBe("50.2551");
    expect(rateFromNumber(0)).toBeNull();
    expect(rateFromNumber(Number.NaN)).toBeNull();
  });
});
