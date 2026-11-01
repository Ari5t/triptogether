import { Global, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ENV, loadEnv } from "./common/env.js";
import { InvitesModule } from "./invites/invites.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { TripsModule } from "./trips/trips.module.js";

@Global()
@Module({ providers: [{ provide: ENV, useFactory: () => loadEnv() }], exports: [ENV] })
class EnvModule {}

@Module({ imports: [EnvModule, PrismaModule, AuthModule, TripsModule, InvitesModule] })
export class AppModule {}
