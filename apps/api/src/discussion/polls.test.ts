import { describe, expect, it, vi } from "vitest";
import { pollIsClosed, PollsService, toPollView } from "./polls.service.js";

const options = [
  { id: "o1", label: "A", votes: [{ userId: "u1" }] },
  { id: "o2", label: "B", votes: [] },
];
const poll = (over: Record<string, unknown> = {}) => ({ id: "p1", tripId: "t1", question: "Q", multiChoice: false, closesAt: null, options, ...over });

function service(row: unknown, member = true) {
  const prisma = {
    poll: { findUnique: vi.fn().mockResolvedValue(row), findUniqueOrThrow: vi.fn().mockResolvedValue(row) },
    vote: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const members = { requireRole: vi.fn().mockImplementation(() => (member ? Promise.resolve("EDITOR") : Promise.reject(new Error("no")))) };
  const realtime = { emit: vi.fn() };
  return { prisma, realtime, svc: new PollsService(prisma as never, realtime as never, members as never) };
}

const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;

describe("pollIsClosed / toPollView", () => {
  it("closes once closesAt has passed", () => {
    expect(pollIsClosed(null)).toBe(false);
    expect(pollIsClosed(new Date(Date.now() + 1000))).toBe(false);
    expect(pollIsClosed(new Date(Date.now() - 1000))).toBe(true);
  });
  it("lists voters per option", () => {
    expect(toPollView(poll() as never).options[0]).toEqual({ id: "o1", label: "A", voterIds: ["u1"] });
  });
});

describe("PollsService.vote", () => {
  it("replaces the user's votes and broadcasts", async () => {
    const { svc, prisma, realtime } = service(poll());
    await svc.vote("p1", "u2", { optionIds: ["o2"] });
    expect(prisma.vote.deleteMany).toHaveBeenCalledWith({ where: { userId: "u2", optionId: { in: ["o1", "o2"] } } });
    expect(prisma.vote.createMany).toHaveBeenCalledWith({ data: [{ optionId: "o2", userId: "u2" }] });
    expect(realtime.emit).toHaveBeenCalledWith("t1", "poll:updated", expect.objectContaining({ tripId: "t1" }));
  });
  it("allows withdrawing with an empty list", async () => {
    const { svc, prisma } = service(poll());
    await svc.vote("p1", "u1", { optionIds: [] });
    expect(prisma.vote.createMany).toHaveBeenCalledWith({ data: [] });
  });
  it("rejects two options on a single-choice poll", async () => {
    await expect(service(poll()).svc.vote("p1", "u2", { optionIds: ["o1", "o2"] })).rejects.toSatisfy((e) => code(e) === "OPTION_INVALID");
  });
  it("accepts several options on a multi-choice poll", async () => {
    await expect(service(poll({ multiChoice: true })).svc.vote("p1", "u2", { optionIds: ["o1", "o2"] })).resolves.toBeDefined();
  });
  it("rejects an option from another poll", async () => {
    await expect(service(poll()).svc.vote("p1", "u2", { optionIds: ["x"] })).rejects.toSatisfy((e) => code(e) === "OPTION_INVALID");
  });
  it("rejects votes on a closed poll", async () => {
    await expect(service(poll({ closesAt: new Date(0) })).svc.vote("p1", "u2", { optionIds: ["o1"] })).rejects.toSatisfy((e) => code(e) === "POLL_CLOSED");
  });
  it("hides polls from non-members", async () => {
    await expect(service(poll(), false).svc.vote("p1", "u9", { optionIds: ["o1"] })).rejects.toSatisfy((e) => code(e) === "POLL_NOT_FOUND");
  });
});
