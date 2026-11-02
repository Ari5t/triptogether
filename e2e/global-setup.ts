import { execSync } from "node:child_process";

export default function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://triptogether:triptogether@localhost:5432/triptogether_e2e";
  execSync("pnpm --filter @triptogether/db exec prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
