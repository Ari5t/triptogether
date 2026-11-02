import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { E2eController } from "./e2e.controller.js";
import { GoogleStrategy } from "./google.strategy.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

const E2E_ENABLED = process.env.E2E === "true" && process.env.NODE_ENV !== "production";

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, ...(E2E_ENABLED ? [E2eController] : [])],
  providers: [AuthService, GoogleStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
