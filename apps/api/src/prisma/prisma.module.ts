import { Global, Module, OnModuleDestroy } from "@nestjs/common";
import { createPrisma, PrismaClient } from "@triptogether/db";
import { Inject } from "@nestjs/common";
import { ENV, type Env } from "../common/env.js";

export const PRISMA = Symbol("PRISMA");

@Global()
@Module({
  providers: [
    { provide: PRISMA, inject: [ENV], useFactory: (env: Env) => createPrisma(env.DATABASE_URL) },
  ],
  exports: [PRISMA],
})
export class PrismaModule implements OnModuleDestroy {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}
  onModuleDestroy() {
    return this.prisma.$disconnect();
  }
}
