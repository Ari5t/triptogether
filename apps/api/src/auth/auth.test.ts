import { describe, expect, it, vi } from "vitest";
import { safeNext } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { sha256 } from "./tokens.js";

describe("safeNext", () => {
  it("allows relative paths only", () => {
    expect(safeNext("/invite/abc")).toBe("/invite/abc");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});

function service(row: unknown) {
  const prisma = {
    refreshToken: {
      findUnique: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({}),
    },
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue("access") };
  const env = { JWT_ACCESS_SECRET: "x".repeat(16) };
  return { prisma, svc: new AuthService(prisma as never, env as never, jwt as never) };
}

describe("AuthService.rotate", () => {
  const future = new Date(Date.now() + 60_000);

  it("rejects a missing cookie", async () => {
    await expect(service(null).svc.rotate(undefined)).rejects.toMatchObject({ status: 401 });
  });

  it("rotates a valid token", async () => {
    const { svc, prisma } = service({ id: "r1", userId: "u1", revokedAt: null, expiresAt: future });
    const out = await svc.rotate("raw");
    expect(out.userId).toBe("u1");
    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256("raw") } });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it("revokes all tokens of the user when a revoked token is reused", async () => {
    const { svc, prisma } = service({ id: "r1", userId: "u1", revokedAt: new Date(), expiresAt: future });
    await expect(svc.rotate("raw")).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", revokedAt: null } }),
    );
  });

  it("rejects an expired token", async () => {
    const { svc } = service({ id: "r1", userId: "u1", revokedAt: null, expiresAt: new Date(0) });
    await expect(svc.rotate("raw")).rejects.toMatchObject({ status: 401 });
  });
});
