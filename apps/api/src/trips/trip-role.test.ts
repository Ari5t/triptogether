import { describe, expect, it } from "vitest";
import { MembershipService } from "./trip-role.guard.js";

const svc = (role: string | null, deletedAt: Date | null = null) =>
  new MembershipService({ tripMember: { findUnique: async () => (role ? { role, trip: { deletedAt } } : null) } } as never);

describe("MembershipService.requireRole", () => {
  it("404 for non-members", async () => {
    await expect(svc(null).requireRole("t", "u", "VIEWER")).rejects.toMatchObject({ status: 404 });
  });
  it("404 for a soft-deleted trip", async () => {
    await expect(svc("OWNER", new Date()).requireRole("t", "u", "VIEWER")).rejects.toMatchObject({ status: 404 });
  });
  it("403 when role too low", async () => {
    await expect(svc("VIEWER").requireRole("t", "u", "EDITOR")).rejects.toMatchObject({ status: 403 });
  });
  it("returns the role when sufficient", async () => {
    await expect(svc("OWNER").requireRole("t", "u", "EDITOR")).resolves.toBe("OWNER");
  });
});
