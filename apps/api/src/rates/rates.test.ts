import { describe, expect, it } from "vitest";
import { pickRate } from "./rates.service.js";

describe("pickRate", () => {
  it("reads one rate from a provider file", () => {
    expect(pickRate({ date: "2026-11-01", eur: { uah: 50.2551, pln: 4.2 } }, "EUR", "UAH")).toEqual({ rate: "50.2551", date: "2026-11-01" });
  });
  it("returns null for a missing currency or a broken body", () => {
    expect(pickRate({ date: "2026-11-01", eur: {} }, "EUR", "UAH")).toBeNull();
    expect(pickRate({ eur: { uah: 1 } }, "EUR", "UAH")).toBeNull();
    expect(pickRate(null, "EUR", "UAH")).toBeNull();
  });
});
