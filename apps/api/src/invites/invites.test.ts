import { describe, expect, it } from "vitest";
import { assertInviteUsable } from "./invites.service.js";

const ok = { revokedAt: null, expiresAt: new Date(Date.now() + 60_000), uses: 0, maxUses: 2 };

describe("assertInviteUsable", () => {
  it("accepts a fresh invite", () => {
    expect(() => assertInviteUsable(ok)).not.toThrow();
  });
  it.each([
    ["revoked", { ...ok, revokedAt: new Date() }, "INVITE_REVOKED"],
    ["expired", { ...ok, expiresAt: new Date(0) }, "INVITE_EXPIRED"],
    ["exhausted", { ...ok, uses: 2 }, "INVITE_EXHAUSTED"],
  ])("rejects %s", (_n, invite, code) => {
    try {
      assertInviteUsable(invite);
      throw new Error("did not throw");
    } catch (e) {
      expect((e as { getResponse(): { code: string } }).getResponse().code).toBe(code);
    }
  });
  it("unlimited uses when maxUses is null", () => {
    expect(() => assertInviteUsable({ ...ok, uses: 999, maxUses: null })).not.toThrow();
  });
});
