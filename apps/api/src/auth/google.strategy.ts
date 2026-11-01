import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, type VerifyCallback } from "passport-google-oauth20";
import { ENV, type Env } from "../common/env.js";
import type { GoogleProfile } from "./auth.service.js";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(@Inject(ENV) env: Env) {
    super({
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    });
  }

  validate(_at: string, _rt: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error("Google account has no email"));
    const user: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
