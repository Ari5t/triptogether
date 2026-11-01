import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().default("localhost"),
  GOOGLE_CLIENT_ID: z.string().default("unset"),
  GOOGLE_CLIENT_SECRET: z.string().default("unset"),
  GOOGLE_CALLBACK_URL: z.url(),
});
export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (source === process.env && existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  return envSchema.parse(source);
}

export const ENV = Symbol("ENV");
