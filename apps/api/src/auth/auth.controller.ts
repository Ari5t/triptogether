import { Body, Controller, Get, HttpCode, Inject, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { PrismaClient } from "@triptogether/db";
import { updateMeSchema } from "@triptogether/shared";
import type { Request, Response } from "express";
import { ENV, type Env } from "../common/env.js";
import { notFound, ZodPipe } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { AuthService, type GoogleProfile } from "./auth.service.js";
import type { AuthedRequest } from "./auth.types.js";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "./cookies.js";
import { Public } from "./public.decorator.js";

/** Only same-site relative paths may be used as post-login redirect. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}

class GoogleGuard extends AuthGuard("google") {
  getAuthenticateOptions(ctx: import("@nestjs/common").ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    return { session: false, state: safeNext(req.query.next ?? req.query.state) };
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
  @UseGuards(GoogleGuard)
  google() {
    // Passport redirects to Google.
  }

  @Public()
  @Get("auth/google/callback")
  @UseGuards(GoogleGuard)
  async callback(@Req() req: Request & { user: GoogleProfile }, @Res() res: Response, @Query("state") state?: string) {
    const user = await this.auth.upsertGoogleUser(req.user);
    const { access, refresh } = await this.auth.issueSession(user.id);
    setAuthCookies(res, this.env, access, refresh);
    res.redirect(this.env.WEB_ORIGIN + safeNext(state));
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
