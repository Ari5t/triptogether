import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { unauthenticated } from "../common/errors.js";
import { AuthService } from "./auth.service.js";
import type { AuthedRequest } from "./auth.types.js";
import { ACCESS_COOKIE } from "./cookies.js";
import { IS_PUBLIC } from "./public.decorator.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    // WebSocket messages are authenticated once, by the namespace middleware at connection time.
    if (ctx.getType() !== "http") return true;
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw unauthenticated();
    req.user = { id: await this.auth.verifyAccess(token) };
    return true;
  }
}
