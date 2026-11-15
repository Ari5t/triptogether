import { describe, expect, it, vi } from "vitest";
import { TripsService } from "./trips.service.js";

function service(role: "OWNER" | "EDITOR" | "VIEWER") {
  const prisma = { tripMember: { findUnique: vi.fn().mockResolvedValue({ role }), update: vi.fn().mockResolvedValue({}) } };
  const collab = { closeConnections: vi.fn().mockResolvedValue(undefined) };
  return { prisma, collab, svc: new TripsService(prisma as never, collab as never, {} as never, {} as never) };
}

describe("TripsService.changeRole", () => {
  it("closes collab connections so the new role applies at once", async () => {
    const { svc, collab } = service("EDITOR");
    await svc.changeRole("t1", "u1", "VIEWER");
    expect(collab.closeConnections).toHaveBeenCalledWith("t1");
  });

  it("does not touch the owner", async () => {
    const { svc, collab } = service("OWNER");
    await expect(svc.changeRole("t1", "u1", "VIEWER")).rejects.toMatchObject({ status: 409 });
    expect(collab.closeConnections).not.toHaveBeenCalled();
  });
});
