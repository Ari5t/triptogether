import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PrismaClient } from "@triptogether/db";
import { ENV, type Env } from "../common/env.js";
import { unauthenticated } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";
import { ACCESS_TTL_S, REFRESH_TTL_S } from "./cookies.js";
import { newToken, sha256 } from "./tokens.js";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtService,
  ) {}

  upsertGoogleUser(p: GoogleProfile) {
    return this.prisma.user.upsert({
      where: { googleId: p.googleId },
      create: p,
      update: { name: p.name, avatarUrl: p.avatarUrl, email: p.email },
    });
  }

  signAccess(userId: string) {
    return this.jwt.signAsync({ sub: userId }, { secret: this.env.JWT_ACCESS_SECRET, expiresIn: ACCESS_TTL_S });
  }

  async verifyAccess(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.env.JWT_ACCESS_SECRET });
      return payload.sub;
    } catch {
      throw unauthenticated();
    }
  }

  async issueSession(userId: string) {
    const refresh = newToken();
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: sha256(refresh), expiresAt: new Date(Date.now() + REFRESH_TTL_S * 1000) },
    });
    return { access: await this.signAccess(userId), refresh };
  }

  /** Rotates the refresh token. A reused (already revoked) token revokes the whole family of the user. */
  async rotate(rawRefresh: string | undefined) {
    if (!rawRefresh) throw unauthenticated();
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawRefresh) } });
    if (!row) throw unauthenticated();
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw unauthenticated();
    }
    if (row.expiresAt < new Date()) throw unauthenticated();
    // Conditional update makes a concurrent double-refresh lose the race.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count !== 1) throw unauthenticated();
    return { userId: row.userId, ...(await this.issueSession(row.userId)) };
  }

  async revoke(rawRefresh: string | undefined) {
    if (!rawRefresh) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawRefresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
