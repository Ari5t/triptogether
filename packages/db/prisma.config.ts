import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The single .env lives at the repo root; the CLI would only look in packages/db.
const rootEnv = new URL("../../.env", import.meta.url).pathname;
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
