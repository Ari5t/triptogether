import { cookies } from "next/headers";
import type { ApiError } from "@triptogether/shared";

const API = process.env.API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiError["code"] | "INTERNAL",
  ) {
    super(code);
  }
}

/** Server-side fetch to the API, forwarding the user's cookies. */
export async function apiGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API}/api/v1${path}`, {
    headers: { cookie: jar.toString() },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw new ApiRequestError(res.status, body.code ?? "INTERNAL");
  }
  return res.json() as Promise<T>;
}
