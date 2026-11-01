import { describe, expect, it } from "vitest";
import { createTripSchema, hasRole } from "./index.js";

describe("hasRole", () => {
  it("orders OWNER > EDITOR > VIEWER", () => {
    expect(hasRole("OWNER", "EDITOR")).toBe(true);
    expect(hasRole("EDITOR", "EDITOR")).toBe(true);
    expect(hasRole("VIEWER", "EDITOR")).toBe(false);
  });
});

describe("createTripSchema", () => {
  const base = { title: "Trip", startDate: "2026-07-14", endDate: "2026-07-18" };
  it("accepts valid dates and defaults currency", () => {
    expect(createTripSchema.parse(base).currency).toBe("UAH");
  });
  it("rejects end before start", () => {
    expect(createTripSchema.safeParse({ ...base, endDate: "2026-07-01" }).success).toBe(false);
  });
});
