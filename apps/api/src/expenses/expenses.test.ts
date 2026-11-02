import { describe, expect, it } from "vitest";
import { resolveSplits } from "./expenses.service.js";

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
