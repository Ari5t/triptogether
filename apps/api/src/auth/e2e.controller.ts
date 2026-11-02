import { Body, Controller, HttpCode, Inject, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { ENV, type Env } from "../common/env.js";
import { ZodPipe } from "../common/errors.js";
import { AuthService } from "./auth.service.js";
import { setAuthCookies } from "./cookies.js";
import { Public } from "./public.decorator.js";

const bodySchema = z.object({ email: z.email(), name: z.string().min(1) });

/** Test-only session creation so Playwright can skip Google. Registered only when E2E=true outside production (see AuthModule). */
@Controller("auth")
export class E2eController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Post("e2e-login")
  @HttpCode(204)
  async login(@Body(new ZodPipe(bodySchema)) body: { email: string; name: string }, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.upsertGoogleUser({ googleId: `e2e-${body.email}`, email: body.email, name: body.name, avatarUrl: null });
    const { access, refresh } = await this.auth.issueSession(user.id);
    setAuthCookies(res, this.env, access, refresh);
  }
}
