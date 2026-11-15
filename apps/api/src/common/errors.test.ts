import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ErrorFilter } from "./errors.js";

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) };
  new ErrorFilter().catch(exception, host as never);
  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

describe("ErrorFilter", () => {
  it("reports an unknown route as NOT_FOUND, not FORBIDDEN", () => {
    expect(run(new NotFoundException())).toEqual({ status: 404, body: { code: "NOT_FOUND" } });
  });
  it("reports other errors as INTERNAL with 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(run(new Error("boom"))).toEqual({ status: 500, body: { code: "INTERNAL" } });
  });
});
