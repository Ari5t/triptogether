import type { CookieOptions, Response } from "express";
import type { Env } from "../common/env.js";

export const ACCESS_COOKIE = "tt_access";
export const REFRESH_COOKIE = "tt_refresh";
export const ACCESS_TTL_S = 15 * 60;
export const REFRESH_TTL_S = 30 * 24 * 60 * 60;

function base(env: Env): CookieOptions {
  const prod = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: prod,
    // Shared parent domain so web and api see the same cookie in production.
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
  };
}

export function setAuthCookies(res: Response, env: Env, access: string, refresh: string) {
  res.cookie(ACCESS_COOKIE, access, { ...base(env), path: "/", maxAge: ACCESS_TTL_S * 1000 });
  res.cookie(REFRESH_COOKIE, refresh, { ...base(env), path: "/api/v1/auth", maxAge: REFRESH_TTL_S * 1000 });
}

export function clearAuthCookies(res: Response, env: Env) {
  res.clearCookie(ACCESS_COOKIE, { ...base(env), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...base(env), path: "/api/v1/auth" });
}
