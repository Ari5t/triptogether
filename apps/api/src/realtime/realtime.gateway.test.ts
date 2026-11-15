import { describe, expect, it, vi } from "vitest";
import { RealtimeGateway } from "./realtime.gateway.js";

function setup() {
  const emit = vi.fn();
  const socket = { data: { userId: "u1" }, rooms: new Set(["trip:t1"]), to: vi.fn(() => ({ emit })) };
  const members = { requireRole: vi.fn().mockResolvedValue("VIEWER") };
  const gateway = new RealtimeGateway({} as never, members as never, {} as never);
  return { gateway, socket, emit, members };
}

describe("RealtimeGateway payloads", () => {
  it("relays typing for a valid payload from a joined socket", () => {
    const { gateway, socket, emit } = setup();
    gateway.typing(socket as never, { tripId: "t1", itemId: null });
    expect(emit).toHaveBeenCalledWith("chat:typing", { tripId: "t1", userId: "u1", itemId: null });
  });

  it.each([{ tripId: 5 }, { tripId: "t1", itemId: {} }, null, "t1"])("ignores typing payload %j", (body) => {
    const { gateway, socket } = setup();
    gateway.typing(socket as never, body);
    expect(socket.to).not.toHaveBeenCalled();
  });

  it("refuses a join with a bad payload without touching the database", async () => {
    const { gateway, socket, members } = setup();
    expect(await gateway.join(socket as never, { tripId: 5 })).toEqual({ ok: false });
    expect(members.requireRole).not.toHaveBeenCalled();
  });
});
