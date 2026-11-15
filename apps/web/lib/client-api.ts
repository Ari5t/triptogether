import type { ApiError } from "@triptogether/shared";

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiError["code"] | "INTERNAL",
  ) {
    super(code);
  }
}

async function send(path: string, init: RequestInit) {
  const headers = init.body ? { "content-type": "application/json" } : undefined;
  return fetch(`/api/v1${path}`, { ...init, headers, credentials: "include" });
}

// One refresh at a time per tab: parallel 401s must not spend the same refresh token twice (the server reads that as theft).
let refreshing: Promise<unknown> | null = null;
const refresh = () => (refreshing ??= send("/auth/refresh", { method: "POST" }).finally(() => (refreshing = null)));

/** Browser fetch to the API; on 401 refreshes the session once and retries. */
export async function apiFetch<T = void>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401) {
    // Retry even when our refresh failed: another tab may have rotated the cookies already.
    await refresh();
    res = await send(path, init);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<ApiError>;
    throw new ClientApiError(res.status, body.code ?? "INTERNAL");
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
