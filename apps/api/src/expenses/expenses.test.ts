import { describe, expect, it } from "vitest";
import { priceExpense, resolveSplits } from "./expenses.service.js";

const base = { title: "x", amountMinor: 1000, category: "FOOD", paidById: "a", spentAt: "2026-07-14" } as const;

describe("resolveSplits", () => {
  it("splits equally with the remainder on the first participants", () => {
    expect(resolveSplits({ ...base, splitType: "EQUAL", participants: ["a", "b", "c"] })).toEqual([
      { userId: "a", amountMinor: 334 },
      { userId: "b", amountMinor: 333 },
      { userId: "c", amountMinor: 333 },
    ]);
  });
  it("ignores duplicate participants", () => {
    expect(resolveSplits({ ...base, splitType: "EQUAL", participants: ["a", "a"] })).toEqual([{ userId: "a", amountMinor: 1000 }]);
  });
  it("accepts exact splits that add up and drops zero parts", () => {
    expect(resolveSplits({ ...base, splitType: "EXACT", splits: [{ userId: "a", amountMinor: 1000 }, { userId: "b", amountMinor: 0 }] })).toEqual([{ userId: "a", amountMinor: 1000 }]);
  });
  it.each([
    ["short", [{ userId: "a", amountMinor: 900 }]],
    ["duplicate user", [{ userId: "a", amountMinor: 500 }, { userId: "a", amountMinor: 500 }]],
  ])("rejects exact splits with %s", (_n, splits) => {
    try {
      resolveSplits({ ...base, splitType: "EXACT", splits });
      throw new Error("did not throw");
    } catch (e) {
      expect((e as { getResponse(): { code: string } }).getResponse().code).toBe("SPLIT_MISMATCH");
    }
  });
});

describe("priceExpense", () => {
  const eur = { ...base, amountMinor: 3500, currency: "EUR", rate: "50.2551", rateDate: "2026-11-01", rateManual: false } as const;
  it("keeps trip-currency expenses as they are", () => {
    const p = priceExpense({ ...base, splitType: "EQUAL", participants: ["a"], rateManual: false }, "UAH");
    expect(p).toMatchObject({ amountMinor: 1000, originalCurrency: null, rate: null });
  });
  it("converts a foreign equal split and re-splits the converted total", () => {
    const p = priceExpense({ ...eur, splitType: "EQUAL", participants: ["a", "b"] }, "UAH");
    expect(p).toMatchObject({ amountMinor: 175893, originalCurrency: "EUR", originalAmountMinor: 3500, rate: "50.2551" });
    expect(p.splits.map((s) => s.amountMinor)).toEqual([87947, 87946]);
  });
  it("converts exact shares and keeps the originals", () => {
    const p = priceExpense({ ...eur, splitType: "EXACT", splits: [{ userId: "a", amountMinor: 2000 }, { userId: "b", amountMinor: 1500 }] }, "UAH");
    expect(p.splits).toEqual([
      { userId: "a", amountMinor: 100511, originalAmountMinor: 2000 },
      { userId: "b", amountMinor: 75382, originalAmountMinor: 1500 },
    ]);
    expect(p.splits.reduce((n, s) => n + s.amountMinor, 0)).toBe(p.amountMinor);
  });
  it("needs a rate for another currency", () => {
    try {
      priceExpense({ ...eur, rate: undefined, splitType: "EQUAL", participants: ["a"] }, "UAH");
      throw new Error("did not throw");
    } catch (e) {
      expect((e as { getResponse(): { code: string } }).getResponse().code).toBe("RATE_REQUIRED");
    }
  });
});
