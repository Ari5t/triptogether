import { describe, expect, it } from "vitest";
import { UserThrottlerGuard } from "./throttle.js";

describe("UserThrottlerGuard", () => {
  it("counts requests per user id", async () => {
    const guard = Object.create(UserThrottlerGuard.prototype) as { getTracker(req: unknown): Promise<string> };
    expect(await guard.getTracker({ user: { id: "u1" }, ip: "10.0.0.1" })).toBe("u1");
  });
});
