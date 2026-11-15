import { Body, Controller, ExecutionContext, Get, HttpCode, Inject, Injectable, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { PrismaClient } from "@triptogether/db";
import { updateMeSchema } from "@triptogether/shared";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { ENV, type Env } from "../common/env.js";
import { notFound, ZodPipe } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { AuthService, type GoogleProfile } from "./auth.service.js";
import type { AuthedRequest } from "./auth.types.js";
import { clearAuthCookies, clearOAuthNonce, OAUTH_COOKIE, REFRESH_COOKIE, setAuthCookies, setOAuthNonce } from "./cookies.js";
import { newToken } from "./tokens.js";
import { Public } from "./public.decorator.js";

/** Only same-site relative paths may be used as post-login redirect. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}

/** `state` is "<nonce>.<next path>". Returns the path when the nonce matches the cookie, null otherwise. */
export function checkState(state: unknown, cookie: unknown): string | null {
  if (typeof state !== "string" || typeof cookie !== "string" || !cookie) return null;
  const dot = state.indexOf(".");
  const nonce = state.slice(0, dot);
  if (dot < 0 || nonce.length !== cookie.length || !timingSafeEqual(Buffer.from(nonce), Buffer.from(cookie))) return null;
  return safeNext(state.slice(dot + 1));
}

/** Starts a login: remembers a random nonce in a cookie and sends it to Google as part of `state`. */
@Injectable()
class GoogleStartGuard extends AuthGuard("google") {
  constructor(@Inject(ENV) private readonly env: Env) {
    super();
  }
  getAuthenticateOptions(ctx: ExecutionContext) {
    const http = ctx.switchToHttp();
    const nonce = newToken();
    setOAuthNonce(http.getResponse<Response>(), this.env, nonce);
    return { session: false, state: `${nonce}.${safeNext(http.getRequest<Request>().query.next)}` };
  }
}

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  @Public()
  @Get("auth/google")
  @UseGuards(GoogleStartGuard)
  google() {
    // Passport redirects to Google.
  }

  @Public()
  @Get("auth/google/callback")
  @UseGuards(AuthGuard("google"))
  async callback(@Req() req: Request & { user: GoogleProfile }, @Res() res: Response, @Query("state") state?: string) {
    const next = checkState(state, req.cookies?.[OAUTH_COOKIE]);
    clearOAuthNonce(res, this.env);
    // A callback this browser did not start (login CSRF): no session.
    if (next === null) return res.redirect(this.env.WEB_ORIGIN + "/");
    const user = await this.auth.upsertGoogleUser(req.user);
    const { access, refresh } = await this.auth.issueSession(user.id);
    setAuthCookies(res, this.env, access, refresh);
    res.redirect(this.env.WEB_ORIGIN + next);
  }

  @Public()
  @Post("auth/refresh")
  @HttpCode(204)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { access, refresh } = await this.auth.rotate(req.cookies?.[REFRESH_COOKIE]);
    setAuthCookies(res, this.env, access, refresh);
  }

  @Public()
  @Post("auth/logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revoke(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res, this.env);
  }

  @Get("me")
  async me(@Req() req: AuthedRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw notFound("MEMBER_NOT_FOUND");
    return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, locale: user.locale };
  }

  @Patch("me")
  async updateMe(@Req() req: AuthedRequest, @Body(new ZodPipe(updateMeSchema)) body: { locale: string }) {
    const user = await this.prisma.user.update({ where: { id: req.user.id }, data: { locale: body.locale } });
    return { locale: user.locale };
  }
}
